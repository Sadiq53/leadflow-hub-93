import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ArrowLeft, Keyboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Kbd } from "@/components/ui/kbd";

const pocSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  linkedin_url: z.string().url("Invalid URL").optional().or(z.literal("")),
  title: z.string().max(100).optional()
});

const leadSchema = z.object({
  company_name: z.string().min(1, "Company name is required").max(200),
  company_website: z.string().url("Invalid URL").optional().or(z.literal("")),
  campaign: z.string().max(100).optional(),
  source: z.string().max(100).optional(),
  source_link: z.string().url("Invalid URL").optional().or(z.literal("")),
  notes: z.string().max(1000).optional()
});

interface POC {
  id: string;
  name: string;
  email: string;
  linkedin_url: string;
  title: string;
}

const NewLead = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pocs, setPocs] = useState<POC[]>([
    { id: crypto.randomUUID(), name: "", email: "", linkedin_url: "", title: "" }
  ]);

  const addPOC = () => {
    if (pocs.length < 5) {
      setPocs([...pocs, { id: crypto.randomUUID(), name: "", email: "", linkedin_url: "", title: "" }]);
      toast({
        title: "POC Added",
        description: `Contact ${pocs.length + 1} added. Fill in the details.`,
      });
    }
  };

  const removePOC = (id: string) => {
    if (pocs.length > 1) {
      setPocs(pocs.filter((poc) => poc.id !== id));
    }
  };

  const updatePOC = (id: string, field: keyof POC, value: string) => {
    setPocs(pocs.map((poc) => (poc.id === id ? { ...poc, [field]: value } : poc)));
  };

  // Keyboard shortcuts for the form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+P: Add new POC
      if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        addPOC();
        return;
      }

      // Ctrl+S or Alt+S: Submit form
      if ((e.ctrlKey && e.key.toLowerCase() === "s") || (e.altKey && e.key.toLowerCase() === "s")) {
        e.preventDefault();
        formRef.current?.requestSubmit();
        return;
      }

      // Ctrl+Enter: Submit and stay
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        formRef.current?.requestSubmit();
        return;
      }

      // Escape: Go back
      if (e.key === "Escape") {
        const target = e.target as HTMLElement;
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          navigate("/leads");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pocs.length]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      const leadData = {
        company_name: formData.get("company_name") as string,
        company_website: formData.get("company_website") as string,
        campaign: formData.get("campaign") as string,
        source: formData.get("source") as string,
        source_link: formData.get("source_link") as string,
        notes: formData.get("notes") as string
      };

      leadSchema.parse(leadData);

      const validPocs = pocs.filter(poc => poc.name.trim() !== "");
      if (validPocs.length === 0) {
        throw new Error("At least one point of contact is required");
      }

      for (const poc of validPocs) {
        pocSchema.parse(poc);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          company_name: leadData.company_name,
          company_website: leadData.company_website || null,
          campaign: leadData.campaign || null,
          source: leadData.source || null,
          source_link: leadData.source_link || null,
          notes: leadData.notes || null,
          created_by: user.id
        })
        .select()
        .single();

      if (leadError) throw leadError;

      const { data: createdPocs, error: pocsError } = await supabase
        .from("pocs")
        .insert(
          validPocs.map((poc) => ({
            lead_id: lead.id,
            name: poc.name,
            email: poc.email || null,
            linkedin_url: poc.linkedin_url || null,
            title: poc.title || null
          }))
        )
        .select();

      if (pocsError) throw pocsError;

      await supabase.from("activities").insert({
        lead_id: lead.id,
        user_id: user.id,
        action: "lead_created",
        payload: { company: leadData.company_name, poc_count: validPocs.length }
      });

      const notifications = [];
      const now = new Date();
      
      for (const poc of createdPocs || []) {
        const day1 = new Date(now);
        notifications.push({
          user_id: user.id,
          lead_id: lead.id,
          poc_id: poc.id,
          type: "send_connection",
          scheduled_for: day1.toISOString(),
          status: "pending"
        });
      }

      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }
      
      toast({
        title: "Lead created!",
        description: `${leadData.company_name} with ${validPocs.length} contact(s) added successfully.`
      });

      navigate(`/leads/${lead.id}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive"
        });
      } else if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive"
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/leads")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Add New Lead</h1>
              <p className="text-muted-foreground">Create a new company lead with contact persons</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
            <Keyboard className="h-3.5 w-3.5" />
            <span>Shortcuts:</span>
            <span className="flex items-center gap-1"><Kbd>Alt</Kbd>+<Kbd>P</Kbd> Add POC</span>
            <span className="text-muted-foreground/50">|</span>
            <span className="flex items-center gap-1"><Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> Save</span>
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>Basic details about the company</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input id="company_name" name="company_name" placeholder="Acme Corp" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_website">Website</Label>
                    <Input id="company_website" name="company_website" type="url" placeholder="https://acmecorp.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="campaign">Campaign</Label>
                    <Input id="campaign" name="campaign" placeholder="Q1 2024 Outreach" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Input id="source" name="source" placeholder="LinkedIn, Referral, Event" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source_link">Source Link</Label>
                    <Input id="source_link" name="source_link" type="url" placeholder="https://linkedin.com/sales/..." />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" placeholder="Additional information about this lead..." rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Points of Contact</CardTitle>
                    <CardDescription>
                      Add 1-5 people to reach out to at this company
                      <span className="ml-2 text-xs">(<Kbd>Alt</Kbd>+<Kbd>P</Kbd> to add)</span>
                    </CardDescription>
                  </div>
                  {pocs.length < 5 && (
                    <Button type="button" variant="outline" size="sm" onClick={addPOC}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add POC
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {pocs.map((poc, index) => (
                  <div key={poc.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">Contact {index + 1}</h4>
                        {pocs.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePOC(poc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={poc.name}
                            onChange={(e) => updatePOC(poc.id, "name", e.target.value)}
                            placeholder="John Doe"
                            required={index === 0}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={poc.email}
                            onChange={(e) => updatePOC(poc.id, "email", e.target.value)}
                            placeholder="john@company.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>LinkedIn URL</Label>
                          <Input
                            type="url"
                            value={poc.linkedin_url}
                            onChange={(e) => updatePOC(poc.id, "linkedin_url", e.target.value)}
                            placeholder="https://linkedin.com/in/johndoe"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Title/Role</Label>
                          <Input
                            value={poc.title}
                            onChange={(e) => updatePOC(poc.id, "title", e.target.value)}
                            placeholder="CEO, Product Manager"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <p className="text-xs text-muted-foreground hidden md:block">
                <Kbd>Esc</Kbd> to cancel • <Kbd>Ctrl</Kbd>+<Kbd>S</Kbd> to save
              </p>
              <div className="flex justify-end space-x-4 ml-auto">
                <Button type="button" variant="outline" onClick={() => navigate("/leads")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Lead"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default NewLead;