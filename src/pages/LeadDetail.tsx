import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Building2, Globe, Tag, User, Mail, Linkedin, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

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
  profiles: {
    name: string;
  };
}

interface Lead {
  id: string;
  company_name: string;
  company_website: string | null;
  campaign: string | null;
  source: string | null;
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
  const [lead, setLead] = useState<Lead | null>(null);
  const [pocs, setPocs] = useState<POC[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchLeadDetails(id);
    }
  }, [id]);

  const fetchLeadDetails = async (leadId: string) => {
    try {
      const [leadResult, pocsResult, activitiesResult] = await Promise.all([
        supabase
          .from('leads')
          .select('*, profiles!leads_created_by_fkey(name)')
          .eq('id', leadId)
          .single(),
        supabase
          .from('pocs')
          .select('*')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: true }),
        supabase
          .from('activities')
          .select('id, action, created_at, profiles!activities_user_id_fkey(name)')
          .eq('lead_id', leadId)
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      if (leadResult.data) setLead(leadResult.data as any);
      if (pocsResult.data) setPocs(pocsResult.data);
      if (activitiesResult.data) setActivities(activitiesResult.data as any);
    } catch (error) {
      console.error('Error fetching lead details:', error);
    } finally {
      setLoading(false);
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
                        </h4>
                        {poc.title && <p className="text-sm text-muted-foreground">{poc.title}</p>}
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
                            by {activity.profiles?.name} • {format(new Date(activity.created_at), 'MMM d, h:mm a')}
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
      </div>
    </Layout>
  );
};

export default LeadDetail;
