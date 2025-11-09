import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, RefreshCw, Trash2, AlertCircle } from "lucide-react";
import { format } from "date-fns";
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

interface QueueMember {
  id: string;
  name: string;
  company_name: string;
  linkedin_invite_accepted: boolean;
  invite_accepted_at: string | null;
  last_contacted_at: string | null;
  response_type: string;
  auto_removed: boolean;
  pending_notifications: number;
}

const FollowupQueueMonitor = () => {
  const [queueMembers, setQueueMembers] = useState<QueueMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<QueueMember | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchQueueMembers();

    // Set up realtime subscriptions for instant updates
    const channel = supabase
      .channel('queue-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pocs'
        },
        () => {
          fetchQueueMembers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchQueueMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchQueueMembers = async () => {
    setLoading(true);
    try {
      const { data: pocs } = await supabase
        .from('pocs')
        .select(`
          id,
          name,
          linkedin_invite_accepted,
          invite_accepted_at,
          last_contacted_at,
          response_type,
          auto_removed,
          lead_id,
          leads(company_name)
        `)
        .eq('auto_removed', false)
        .order('created_at', { ascending: false });

      if (pocs) {
        const pocsWithNotifications = await Promise.all(
          pocs.map(async (poc: any) => {
            const { count } = await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('poc_id', poc.id)
              .eq('status', 'pending');

            return {
              id: poc.id,
              name: poc.name,
              company_name: poc.leads?.company_name || 'Unknown',
              linkedin_invite_accepted: poc.linkedin_invite_accepted,
              invite_accepted_at: poc.invite_accepted_at,
              last_contacted_at: poc.last_contacted_at,
              response_type: poc.response_type,
              auto_removed: poc.auto_removed,
              pending_notifications: count || 0,
            };
          })
        );

        setQueueMembers(pocsWithNotifications);
      }
    } catch (error) {
      console.error('Error fetching queue members:', error);
      toast({
        title: "Error",
        description: "Failed to fetch queue members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (member: QueueMember) => {
    setSelectedMember(member);
    setShowDialog(true);
  };

  const confirmRemoval = async () => {
    if (!selectedMember) return;
    
    setRemoving(selectedMember.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Update POC to mark as auto-removed
      await supabase
        .from('pocs')
        .update({
          auto_removed: true,
          auto_removed_at: new Date().toISOString(),
          auto_removed_reason: 'Manually removed from queue',
        })
        .eq('id', selectedMember.id);

      // Cancel all pending notifications
      await supabase
        .from('notifications')
        .update({ status: 'cancelled' })
        .eq('poc_id', selectedMember.id)
        .eq('status', 'pending');

      // Log activity
      await supabase.from('activities').insert({
        user_id: user.id,
        poc_id: selectedMember.id,
        action: 'manual_removal',
        metadata: {
          reason: 'Manually removed from queue',
          removed_at: new Date().toISOString(),
        },
      });

      toast({
        title: "Member removed",
        description: `${selectedMember.name} has been removed from the queue`,
      });

      await fetchQueueMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: "Failed to remove member from queue",
        variant: "destructive",
      });
    } finally {
      setRemoving(null);
      setShowDialog(false);
      setSelectedMember(null);
    }
  };

  const getStatusBadge = (member: QueueMember) => {
    if (member.response_type === 'positive') {
      return <Badge variant="default" className="bg-green-500">Positive</Badge>;
    }
    if (member.response_type === 'negative') {
      return <Badge variant="destructive">Negative</Badge>;
    }
    if (member.response_type === 'neutral') {
      return <Badge variant="secondary">Neutral</Badge>;
    }
    if (!member.linkedin_invite_accepted) {
      return <Badge variant="outline">Invite Pending</Badge>;
    }
    return <Badge variant="secondary">No Response</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Follow-up Queue</span>
              </CardTitle>
              <CardDescription>
                Members in the outreach queue with pending follow-ups
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">{queueMembers.length} Members</Badge>
              <Button variant="ghost" size="sm" onClick={fetchQueueMembers} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {queueMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No members in queue</p>
              </div>
            ) : (
              queueMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-semibold text-sm">{member.name}</h4>
                      <Badge variant="outline" className="text-xs">{member.company_name}</Badge>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                      {member.linkedin_invite_accepted && member.invite_accepted_at && (
                        <span>Accepted: {format(new Date(member.invite_accepted_at), 'MMM d')}</span>
                      )}
                      {member.last_contacted_at && (
                        <span>Last Contact: {format(new Date(member.last_contacted_at), 'MMM d')}</span>
                      )}
                      <span className="flex items-center space-x-1">
                        <AlertCircle className="h-3 w-3" />
                        <span>{member.pending_notifications} pending</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(member)}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member)}
                      disabled={removing === member.id}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Queue?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{selectedMember?.name}</strong> from the follow-up queue?
              This will cancel all pending notifications for this member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoval}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FollowupQueueMonitor;
