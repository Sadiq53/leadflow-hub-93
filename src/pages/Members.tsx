import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Search, ThumbsUp, ThumbsDown, Minus, AlertCircle, Trash2, Send } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  response_type: string;
  auto_removed: boolean;
  invite_accepted_at: string | null;
}

const Members = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkAction, setBulkAction] = useState<'remove' | 'followup' | 'status' | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('pocs')
        .select(`id, name, email, linkedin_url, title, response, linkedin_invite_accepted, lead_id, response_type, auto_removed, invite_accepted_at, leads(company_name)`)  
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
        response_type: p.response_type,
        auto_removed: p.auto_removed,
        invite_accepted_at: p.invite_accepted_at,
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
        .update({ 
          linkedin_invite_accepted: accepted,
          invite_accepted_at: accepted ? new Date().toISOString() : null
        })
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

  const handleAcknowledgeResponse = async (member: Member, responseType: 'positive' | 'negative' | 'neutral') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Mark this POC with response type
      await supabase
        .from('pocs')
        .update({ 
          response: 'Responded',
          response_type: responseType
        })
        .eq('id', member.id);

      // Cancel ALL pending notifications for this entire company (lead_id)
      await supabase
        .from('notifications')
        .update({ status: 'cancelled' })
        .eq('lead_id', member.lead_id)
        .eq('status', 'pending');

      // Log the activity
      await supabase.from('activities').insert({
        lead_id: member.lead_id,
        poc_id: member.id,
        user_id: user.id,
        action: responseType === 'negative' ? 'negative_response' : 'response_received',
        metadata: { 
          company: member.company_name,
          response_type: responseType
        }
      });

      toast({ 
        title: 'Response acknowledged', 
        description: `Marked as ${responseType}. Removed all ${member.company_name} contacts from the queue.` 
      });
      fetchMembers();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to acknowledge response.', variant: 'destructive' });
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(m => m.id)));
    }
  };

  const handleBulkRemove = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const selectedMembers = members.filter(m => selectedIds.has(m.id));
      
      await supabase
        .from('pocs')
        .update({ 
          auto_removed: true,
          auto_removed_at: new Date().toISOString(),
          auto_removed_reason: 'Bulk removal'
        })
        .in('id', Array.from(selectedIds));

      // Cancel pending notifications
      await supabase
        .from('notifications')
        .update({ status: 'cancelled' })
        .in('poc_id', Array.from(selectedIds))
        .eq('status', 'pending');

      // Log activities
      for (const member of selectedMembers) {
        await supabase.from('activities').insert({
          lead_id: member.lead_id,
          poc_id: member.id,
          user_id: user.id,
          action: 'bulk_removed',
          metadata: { company: member.company_name }
        });
      }

      toast({ 
        title: 'Bulk removal complete', 
        description: `Removed ${selectedIds.size} member(s) from queue.` 
      });
      
      setSelectedIds(new Set());
      setShowBulkDialog(false);
      fetchMembers();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to remove members.', variant: 'destructive' });
    }
  };

  const handleBulkFollowup = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const selectedMembers = members.filter(m => selectedIds.has(m.id));
      let scheduledCount = 0;

      for (const member of selectedMembers) {
        // Check if follow-up is allowed
        const { data: isAllowed } = await supabase.rpc('is_followup_allowed', { 
          poc_id_param: member.id 
        });

        if (isAllowed) {
          await scheduleSequenceForPoc(member);
          scheduledCount++;
        }
      }

      toast({ 
        title: 'Bulk follow-up scheduled', 
        description: `Scheduled follow-ups for ${scheduledCount} member(s). ${selectedIds.size - scheduledCount} skipped (outside 2-day window or auto-removed).` 
      });
      
      setSelectedIds(new Set());
      setShowBulkDialog(false);
      fetchMembers();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to schedule follow-ups.', variant: 'destructive' });
    }
  };

  const handleBulkStatusChange = async (responseType: 'positive' | 'negative' | 'neutral') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const selectedMembers = members.filter(m => selectedIds.has(m.id));

      // Update all selected POCs
      await supabase
        .from('pocs')
        .update({ 
          response: 'Responded',
          response_type: responseType
        })
        .in('id', Array.from(selectedIds));

      // Get unique lead_ids
      const leadIds = [...new Set(selectedMembers.map(m => m.lead_id))];

      // Cancel pending notifications for all affected leads
      await supabase
        .from('notifications')
        .update({ status: 'cancelled' })
        .in('lead_id', leadIds)
        .eq('status', 'pending');

      // Log activities
      for (const member of selectedMembers) {
        await supabase.from('activities').insert({
          lead_id: member.lead_id,
          poc_id: member.id,
          user_id: user.id,
          action: responseType === 'negative' ? 'negative_response' : 'response_received',
          metadata: { 
            company: member.company_name,
            response_type: responseType,
            bulk_action: true
          }
        });
      }

      toast({ 
        title: 'Bulk status update complete', 
        description: `Updated ${selectedIds.size} member(s) to ${responseType} status.` 
      });
      
      setSelectedIds(new Set());
      setShowBulkDialog(false);
      fetchMembers();
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to update status.', variant: 'destructive' });
    }
  };

  const executeBulkAction = () => {
    if (bulkAction === 'remove') {
      handleBulkRemove();
    } else if (bulkAction === 'followup') {
      handleBulkFollowup();
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

        {selectedIds.size > 0 && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedIds.size} selected</Badge>
                  <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                    Clear Selection
                  </Button>
                </div>
                <div className="flex gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Bulk Status Change
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange('positive')}>
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        Mark as Positive
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange('neutral')}>
                        <Minus className="h-4 w-4 mr-2" />
                        Mark as Neutral
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleBulkStatusChange('negative')}>
                        <ThumbsDown className="h-4 w-4 mr-2" />
                        Mark as Negative
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setBulkAction('followup');
                      setShowBulkDialog(true);
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Bulk Follow-up
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => {
                      setBulkAction('remove');
                      setShowBulkDialog(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Bulk Remove
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                    <TableHead className="w-12">
                      <Checkbox 
                        checked={selectedIds.size === filtered.length && filtered.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
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
                        <Checkbox 
                          checked={selectedIds.has(m.id)}
                          onCheckedChange={() => toggleSelection(m.id)}
                        />
                      </TableCell>
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
                          <Badge 
                            variant={m.response_type === 'negative' ? 'destructive' : 'default'}
                            className="inline-flex items-center"
                          >
                            {m.response_type === 'positive' && <ThumbsUp className="h-3 w-3 mr-1" />}
                            {m.response_type === 'negative' && <ThumbsDown className="h-3 w-3 mr-1" />}
                            {m.response_type === 'neutral' && <Minus className="h-3 w-3 mr-1" />}
                            {m.response_type === 'positive' ? 'Positive' : m.response_type === 'negative' ? 'Negative' : 'Neutral'}
                          </Badge>
                        ) : m.auto_removed ? (
                          <Badge variant="outline" className="inline-flex items-center">
                            <AlertCircle className="h-3 w-3 mr-1" />Auto-Removed
                          </Badge>
                        ) : (
                          <Badge variant="outline">No Response</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!m.response && !m.auto_removed && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm">
                                <CheckCircle2 className="h-4 w-4 mr-2" /> Mark Response
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleAcknowledgeResponse(m, 'positive')}>
                                <ThumbsUp className="h-4 w-4 mr-2" />
                                Positive Response
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAcknowledgeResponse(m, 'neutral')}>
                                <Minus className="h-4 w-4 mr-2" />
                                Neutral Response
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleAcknowledgeResponse(m, 'negative')}>
                                <ThumbsDown className="h-4 w-4 mr-2" />
                                Negative Response
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      <AlertDialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === 'remove' && 'Confirm Bulk Removal'}
              {bulkAction === 'followup' && 'Confirm Bulk Follow-up'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === 'remove' && `You are about to remove ${selectedIds.size} member(s) from the queue. This will cancel all pending notifications for these members.`}
              {bulkAction === 'followup' && `You are about to schedule follow-ups for ${selectedIds.size} member(s). Only members within the 2-day window will be scheduled.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkAction}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Members;