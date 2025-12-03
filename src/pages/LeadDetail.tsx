import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Building2, Globe, Tag, User, Mail, Linkedin, Clock, Edit, Trash2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface POC {
  id: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  title: string | null;
  outreach_day_1_status: string;
  outreach_day_2_status: string;
  outreach_day_3_status: string;
  response: string | null;
  last_contacted_at: string | null;
}

interface Activity {
  id: string;
  action: string;
  created_at: string;
  user_id?: string;
  profiles?: {
    name: string;
  };
}

interface Lead {
  id: string;
  company_name: string;
  company_website: string | null;
  campaign: string | null;
  source: string | null;
  source_link: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
  profiles: {
    name: string;
  };
}

const LeadDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lead, setLead] = useState<Lead | null>(null);
  const [pocs, setPocs] = useState<POC[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    company_name: "",
    company_website: "",
    campaign: "",
    source: "",
    source_link: "",
    notes: ""
  });

  useEffect(() => {
    if (id) {
      fetchLeadDetails(id);
    }
  }, [id]);

  const fetchLeadDetails = async (leadId: string) => {
    try {
      const { data: leadData } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .maybeSingle();

      const [pocsResult, activitiesResult] = await Promise.all([
        supabase
          .from('pocs')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: true }),
        supabase
          .from('activities')
          .select('id, action, created_at, user_id')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (leadData) {
        // Fetch creator profile name separately (no FK configured)
        let creatorName = 'Unknown';
        if ((leadData as any).created_by) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', (leadData as any).created_by)
            .maybeSingle();
          creatorName = profile?.name || 'Unknown';
        }

        setLead({ ...(leadData as any), profiles: { name: creatorName } });
        setEditForm({
          company_name: leadData.company_name,
          company_website: leadData.company_website || "",
          campaign: leadData.campaign || "",
          source: leadData.source || "",
          source_link: (leadData as any).source_link || "",
          notes: leadData.notes || ""
        });
      }
      if (pocsResult.data) setPocs(pocsResult.data);
      
      // Fetch user names for activities
      if (activitiesResult.data) {
        const userIds = Array.from(new Set(activitiesResult.data.map((a: any) => a.user_id).filter(Boolean)));
        let userMap: Record<string, string> = {};
        if (userIds.length > 0) {
          const { data: usersData } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', userIds);
          userMap = Object.fromEntries((usersData || []).map((u: any) => [u.id, u.name]));
        }
        const withProfiles = activitiesResult.data.map((a: any) => ({
          ...a,
          profiles: { name: userMap[a.user_id] || 'Unknown' }
        }));
        setActivities(withProfiles);
      }
    } catch (error) {
      console.error('Error fetching lead details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkResponse = async (pocId: string, hasResponse: boolean) => {
    try {
      const responseText = hasResponse ? "Responded" : null;
      
      await supabase
        .from('pocs')
        .update({ response: responseText })
        .eq('id', pocId);

      if (hasResponse) {
        // Cancel all pending notifications for this lead
        const { data: { user } } = await supabase.auth.getUser();
        if (user && id) {
          await supabase
            .from('notifications')
            .update({ status: 'cancelled' })
            .eq('lead_id', id)
            .eq('status', 'pending');
        }
      }

      toast({
        title: hasResponse ? "Response marked" : "Response cleared",
        description: hasResponse ? "All notifications for this company have been cancelled." : "Contact marked as no response."
      });

      fetchLeadDetails(id!);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update response status.",
        variant: "destructive"
      });
    }
  };

  const handleEditLead = async () => {
    try {
      await supabase
        .from('leads')
        .update(editForm)
        .eq('id', id!);

      toast({
        title: "Lead updated",
        description: "Lead information has been updated successfully."
      });

      setEditDialogOpen(false);
      fetchLeadDetails(id!);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lead.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteLead = async () => {
    try {
      await supabase
        .from('leads')
        .delete()
        .eq('id', id!);

      toast({
        title: "Lead deleted",
        description: "Lead has been deleted successfully."
      });

      navigate('/leads');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete lead.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Loading lead details...</div>
      </Layout>
    );
  }

  if (!lead) {
    return (
      <Layout>
        <div className="text-center py-12">Lead not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/leads")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">{lead.company_name}</h1>
              <p className="text-muted-foreground">
                Added by {lead.profiles?.name} on {format(new Date(lead.created_at), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Company Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  {lead.company_website && (
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={lead.company_website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {lead.company_website}
                      </a>
                    </div>
                  )}
                  {lead.campaign && (
                    <div className="flex items-center space-x-2">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span>Campaign: <Badge variant="outline">{lead.campaign}</Badge></span>
                    </div>
                  )}
                  {lead.source && (
                    <div className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>Source: {lead.source}</span>
                      {lead.source_link && (
                        <a
                          href={lead.source_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          (View Link)
                        </a>
                      )}
                    </div>
                  )}
                </div>
                {lead.notes && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Points of Contact ({pocs.length})</CardTitle>
                <CardDescription>People at this company</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pocs.map((poc) => (
                  <div key={poc.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{poc.name}</span>
                          {poc.response && (
                            <Badge variant="default" className="ml-2">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Responded
                            </Badge>
                          )}
                        </h4>
                        {poc.title && <p className="text-sm text-muted-foreground">{poc.title}</p>}
                      </div>
                      <div className="flex items-center space-x-2">
                        {poc.response ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkResponse(poc.id, false)}
                          >
                            Clear Response
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleMarkResponse(poc.id, true)}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Mark Responded
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {poc.email && (
                        <a href={`mailto:${poc.email}`} className="text-sm flex items-center space-x-1 text-primary hover:underline">
                          <Mail className="h-3 w-3" />
                          <span>{poc.email}</span>
                        </a>
                      )}
                      {poc.linkedin_url && (
                        <a
                          href={poc.linkedin_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm flex items-center space-x-1 text-primary hover:underline"
                        >
                          <Linkedin className="h-3 w-3" />
                          <span>LinkedIn</span>
                        </a>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant={poc.outreach_day_1_status === 'not_contacted' ? 'outline' : 'default'}>
                        Day 1: {poc.outreach_day_1_status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={poc.outreach_day_2_status === 'not_contacted' ? 'outline' : 'default'}>
                        Day 2: {poc.outreach_day_2_status.replace('_', ' ')}
                      </Badge>
                      <Badge variant={poc.outreach_day_3_status === 'not_contacted' ? 'outline' : 'default'}>
                        Day 3: {poc.outreach_day_3_status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {poc.response && (
                      <div className="bg-muted/50 p-2 rounded text-sm">
                        <strong>Response:</strong> {poc.response}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Activity Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3">
                        <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">
                            {activity.action.replace('_', ' ').charAt(0).toUpperCase() + activity.action.slice(1).replace('_', ' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {activity.profiles?.name ?? "Unknown"} • {format(new Date(activity.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Edit Lead</DialogTitle>
              <DialogDescription>Update the lead information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={editForm.company_name}
                  onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_website">Company Website</Label>
                <Input
                  id="company_website"
                  value={editForm.company_website}
                  onChange={(e) => setEditForm({ ...editForm, company_website: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign">Campaign</Label>
                  <Input
                    id="campaign"
                    value={editForm.campaign}
                    onChange={(e) => setEditForm({ ...editForm, campaign: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={editForm.source}
                    onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source_link">Source Link</Label>
                <Input
                  id="source_link"
                  type="url"
                  value={editForm.source_link}
                  onChange={(e) => setEditForm({ ...editForm, source_link: e.target.value })}
                  placeholder="https://linkedin.com/sales/..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditLead}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Lead</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this lead? This action cannot be undone and will also delete all associated POCs and activities.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteLead}>
                Delete Lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default LeadDetail;
