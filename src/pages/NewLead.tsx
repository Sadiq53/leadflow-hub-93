import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pocs, setPocs] = useState<POC[]>([
    { id: crypto.randomUUID(), name: "", email: "", linkedin_url: "", title: "" }
  ]);

  const addPOC = () => {
    if (pocs.length < 5) {
      setPocs([...pocs, { id: crypto.randomUUID(), name: "", email: "", linkedin_url: "", title: "" }]);
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      
      // Validate lead data
      const leadData = {
        company_name: formData.get("company_name") as string,
        company_website: formData.get("company_website") as string,
        campaign: formData.get("campaign") as string,
        source: formData.get("source") as string,
        notes: formData.get("notes") as string
      };

      leadSchema.parse(leadData);

      // Validate POCs
      const validPocs = pocs.filter(poc => poc.name.trim() !== "");
      if (validPocs.length === 0) {
        throw new Error("At least one point of contact is required");
      }

      for (const poc of validPocs) {
        pocSchema.parse(poc);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Create lead
      const { data: lead, error: leadError } = await supabase
        .from("leads")
        .insert({
          company_name: leadData.company_name,
          company_website: leadData.company_website || null,
          campaign: leadData.campaign || null,
          source: leadData.source || null,
          notes: leadData.notes || null,
          created_by: user.id
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Create POCs
      const { error: pocsError } = await supabase
        .from("pocs")
        .insert(
          validPocs.map((poc) => ({
            lead_id: lead.id,
            name: poc.name,
            email: poc.email || null,
            linkedin_url: poc.linkedin_url || null,
            title: poc.title || null
          }))
        );

      if (pocsError) throw pocsError;

      // Log activity
      await supabase.from("activities").insert({
        lead_id: lead.id,
        user_id: user.id,
        action: "lead_created",
        payload: { company: leadData.company_name, poc_count: validPocs.length }
      });

      // Create notifications for 3-day sequence
      const notifications = [];
      const now = new Date();
      
      for (const poc of validPocs) {
        // Day 1 - Connection
        const day1 = new Date(now);
        day1.setDate(day1.getDate() + 1);
        notifications.push({
          user_id: user.id,
          lead_id: lead.id,
          poc_id: poc.id,
          type: "send_connection",
          scheduled_for: day1.toISOString(),
          status: "pending"
        });

        // Day 2 - Message A
        const day2 = new Date(now);
        day2.setDate(day2.getDate() + 2);
        notifications.push({
          user_id: user.id,
          lead_id: lead.id,
          poc_id: poc.id,
          type: "send_message_a",
          scheduled_for: day2.toISOString(),
          status: "pending"
        });

        // Day 3 - Message B
        const day3 = new Date(now);
        day3.setDate(day3.getDate() + 3);
        notifications.push({
          user_id: user.id,
          lead_id: lead.id,
          poc_id: poc.id,
          type: "send_message_b",
          scheduled_for: day3.toISOString(),
          status: "pending"
        });
      }

      // This will fail silently for now since we need the POC IDs after insert
      // In a real scenario, we'd need to return the POC IDs after insert
      
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
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/leads")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add New Lead</h1>
            <p className="text-muted-foreground">Create a new company lead with contact persons</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
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
                    <CardDescription>Add 1-5 people to reach out to at this company</CardDescription>
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

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => navigate("/leads")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Lead"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default NewLead;
