import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Search } from "lucide-react";

interface Member {
  id: string;
  name: string;
  email: string | null;
  linkedin_url: string | null;
  title: string | null;
  lead_id: string;
  company_name: string;
  response: string | null;
  linkedin_invite_accepted: boolean;
}

const Members = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('pocs')
        .select(`id, name, email, linkedin_url, title, response, linkedin_invite_accepted, lead_id, leads(company_name)`)  
        .order('created_at', { ascending: false });
      if (error) throw error;
      const formatted = (data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        email: p.email,
        linkedin_url: p.linkedin_url,
        title: p.title,
        lead_id: p.lead_id,
        response: p.response,
        linkedin_invite_accepted: p.linkedin_invite_accepted,
        company_name: p.leads?.company_name || ""
      }));
      setMembers(formatted);
    } catch (e) {
      console.error('Error fetching members', e);
    } finally {
      setLoading(false);
    }
  };

  const scheduleSequenceForPoc = async (member: Member) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const day2 = new Date(now); day2.setDate(day2.getDate() + 1);

    const notifications = [
      {
        user_id: user.id,
        lead_id: member.lead_id,
        poc_id: member.id,
        type: 'send_message_a',
        scheduled_for: now.toISOString(),
        status: 'pending'
      },
      {
        user_id: user.id,
        lead_id: member.lead_id,
        poc_id: member.id,
        type: 'send_message_b',
        scheduled_for: day2.toISOString(),
        status: 'pending'
      }
    ];
    await supabase.from('notifications').insert(notifications);
  };

  const handleToggleInvite = async (member: Member, accepted: boolean) => {
    try {
      await supabase
        .from('pocs')
        .update({ linkedin_invite_accepted: accepted })
        .eq('id', member.id);

      if (accepted) {
        await scheduleSequenceForPoc(member);
        toast({ title: 'Invite acknowledged', description: 'Message sequence scheduled.' });
      } else {
        await supabase
          .from('notifications')
          .update({ status: 'cancelled' })
          .eq('poc_id', member.id)
          .eq('status', 'pending');
        toast({ title: 'Invite unacknowledged', description: 'Pending messages cancelled for this contact.' });
      }

      fetchMembers();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update invite status.', variant: 'destructive' });
    }
  };

  const handleAcknowledgeResponse = async (member: Member) => {
    try {
      await supabase
        .from('pocs')
        .update({ response: 'Responded' })
        .eq('id', member.id);

      await supabase
        .from('notifications')
        .update({ status: 'cancelled' })
        .eq('lead_id', member.lead_id)
        .eq('status', 'pending');

      toast({ title: 'Response acknowledged', description: 'Removed all company contacts from the queue.' });
      fetchMembers();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to acknowledge response.', variant: 'destructive' });
    }
  };

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.company_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground">Manage all people and acknowledgements</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Input placeholder="Search by name or company..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              All Members <Badge variant="secondary">{filtered.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading members...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Invite Accepted</TableHead>
                    <TableHead>Responded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <div className="font-medium">{m.name}</div>
                        {m.title && <div className="text-xs text-muted-foreground">{m.title}</div>}
                      </TableCell>
                      <TableCell>
                        <div>{m.company_name}</div>
                        {m.linkedin_url && (
                          <a href={m.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">LinkedIn</a>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch checked={m.linkedin_invite_accepted} onCheckedChange={(v) => handleToggleInvite(m, v)} />
                      </TableCell>
                      <TableCell>
                        {m.response ? (
                          <Badge className="inline-flex items-center"><CheckCircle2 className="h-3 w-3 mr-1" />Responded</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!m.response && (
                          <Button size="sm" onClick={() => handleAcknowledgeResponse(m)}>
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Acknowledge Response
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Members;