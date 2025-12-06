import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Calendar, Edit2, Trash2, Save, X, AlertTriangle } from "lucide-react";
import { format, differenceInHours, addDays } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QueuedMember {
  id: string;
  poc_id: string;
  poc_name: string;
  company_name: string;
  type: string;
  scheduled_for: string;
  lead_id: string;
  day: number;
  invite_accepted_at: string;
  queue_expires_at: string;
  hours_remaining: number;
}

const QueueManagementDialog = () => {
  const [open, setOpen] = useState(false);
  const [queuedMembers, setQueuedMembers] = useState<QueuedMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScheduledFor, setEditScheduledFor] = useState("");
  const [editDay, setEditDay] = useState<string>("");
  const { toast } = useToast();

  // Fetch on mount to show correct badge count
  useEffect(() => {
    fetchQueuedMembers();
  }, []);

  // Refetch when dialog opens
  useEffect(() => {
    if (open) {
      fetchQueuedMembers();
    }
  }, [open]);

  const fetchQueuedMembers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, poc_id, lead_id, type, scheduled_for')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true });

      if (notifications && notifications.length > 0) {
        const pocIds = Array.from(new Set(notifications.map(n => n.poc_id).filter(Boolean)));
        const leadIds = Array.from(new Set(notifications.map(n => n.lead_id).filter(Boolean)));

        const [{ data: pocsData }, { data: leadsData }] = await Promise.all([
          supabase.from('pocs').select('id, name, lead_id, invite_accepted_at, auto_removed, response_type').in('id', pocIds),
          supabase.from('leads').select('id, company_name').in('id', leadIds),
        ]);

        const pocMap = new Map((pocsData || []).map(p => [p.id, p]));
        const leadMap = new Map((leadsData || []).map(l => [l.id, l.company_name]));

        const now = new Date();
        const formatted: QueuedMember[] = [];

        for (const n of notifications) {
          const poc = pocMap.get(n.poc_id);
          if (!poc || poc.auto_removed || poc.response_type === 'negative') continue;
          if (!poc.invite_accepted_at) continue;

          const inviteAcceptedAt = new Date(poc.invite_accepted_at);
          const scheduledFor = new Date(n.scheduled_for);
          const queueExpiresAt = addDays(inviteAcceptedAt, 3);
          
          // Skip if queue has expired
          if (now > queueExpiresAt) continue;

          // Calculate day based on scheduled time relative to acceptance
          const msSinceAccepted = scheduledFor.getTime() - inviteAcceptedAt.getTime();
          const daysSinceAccepted = Math.floor(msSinceAccepted / (1000 * 60 * 60 * 24));
          let day = daysSinceAccepted + 1;
          if (day < 1) day = 1;
          if (day > 3) day = 3;

          const hoursRemaining = Math.max(0, differenceInHours(queueExpiresAt, now));
          
          formatted.push({
            id: n.id,
            poc_id: n.poc_id || '',
            poc_name: poc?.name || 'Unknown',
            company_name: leadMap.get(n.lead_id) || 'Unknown',
            type: n.type,
            scheduled_for: n.scheduled_for,
            lead_id: n.lead_id || '',
            day,
            invite_accepted_at: poc.invite_accepted_at,
            queue_expires_at: queueExpiresAt.toISOString(),
            hours_remaining: hoursRemaining
          });
        }

        setQueuedMembers(formatted);
      } else {
        setQueuedMembers([]);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (member: QueuedMember) => {
    setEditingId(member.id);
    setEditScheduledFor(format(new Date(member.scheduled_for), "yyyy-MM-dd'T'HH:mm"));
    setEditDay(member.day.toString());
  };

  const handleSaveEdit = async (member: QueuedMember) => {
    try {
      // Calculate new scheduled_for based on new day selection
      const inviteAcceptedAt = new Date(member.invite_accepted_at);
      const newDay = parseInt(editDay);
      
      // Create new scheduled time: invite_accepted_at + (day - 1) days, keeping the time from editScheduledFor
      const editTime = new Date(editScheduledFor);
      const newScheduledFor = new Date(inviteAcceptedAt);
      newScheduledFor.setDate(newScheduledFor.getDate() + (newDay - 1));
      newScheduledFor.setHours(editTime.getHours(), editTime.getMinutes(), 0, 0);

      // Update notification type based on day
      let newType = 'send_message_day_1';
      if (newDay === 2) newType = 'send_message_a';
      if (newDay === 3) newType = 'send_message_b';

      const { error } = await supabase
        .from('notifications')
        .update({ 
          scheduled_for: newScheduledFor.toISOString(),
          type: newType
        })
        .eq('id', member.id);

      if (error) throw error;

      toast({ title: "Updated", description: `Moved to Day ${newDay} at ${format(newScheduledFor, 'h:mm a')}` });
      setEditingId(null);
      fetchQueuedMembers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to update schedule", variant: "destructive" });
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'cancelled' })
        .eq('id', memberId);

      if (error) throw error;

      toast({ title: "Removed", description: "Member removed from queue" });
      fetchQueuedMembers();
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove from queue", variant: "destructive" });
    }
  };

  const getMembersByDay = (day: number) => queuedMembers.filter(m => m.day === day);

  const renderMemberList = (members: QueuedMember[]) => (
    <div className="space-y-3">
      {members.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">No members in this queue</p>
      ) : (
        members.map(member => (
          <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{member.poc_name}</span>
                <Badge variant="outline" className="text-xs">{member.company_name}</Badge>
                <Badge variant={member.hours_remaining < 24 ? "destructive" : "secondary"} className="text-xs">
                  {member.hours_remaining < 24 && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {member.hours_remaining}h left
                </Badge>
              </div>
              {editingId === member.id ? (
                <div className="mt-2 flex gap-2 flex-wrap">
                  <Select value={editDay} onValueChange={setEditDay}>
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Day 1</SelectItem>
                      <SelectItem value="2">Day 2</SelectItem>
                      <SelectItem value="3">Day 3</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="datetime-local"
                    value={editScheduledFor}
                    onChange={(e) => setEditScheduledFor(e.target.value)}
                    className="w-auto"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Day {member.day} • {format(new Date(member.scheduled_for), 'MMM dd, h:mm a')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editingId === member.id ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(member)}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(member)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemove(member.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>View Queue</span>
          <Badge variant="secondary">{queuedMembers.length}</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Follow-up Queue Management
          </DialogTitle>
          <DialogDescription>
            View and manage your queued members. Each member is in queue for 3 days from when you acknowledged their invite.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading queue...</div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All ({queuedMembers.length})</TabsTrigger>
              <TabsTrigger value="day1">Day 1 ({getMembersByDay(1).length})</TabsTrigger>
              <TabsTrigger value="day2">Day 2 ({getMembersByDay(2).length})</TabsTrigger>
              <TabsTrigger value="day3">Day 3 ({getMembersByDay(3).length})</TabsTrigger>
            </TabsList>
            <ScrollArea className="h-[400px] mt-4">
              <TabsContent value="all" className="mt-0">
                {renderMemberList(queuedMembers)}
              </TabsContent>
              <TabsContent value="day1" className="mt-0">
                {renderMemberList(getMembersByDay(1))}
              </TabsContent>
              <TabsContent value="day2" className="mt-0">
                {renderMemberList(getMembersByDay(2))}
              </TabsContent>
              <TabsContent value="day3" className="mt-0">
                {renderMemberList(getMembersByDay(3))}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QueueManagementDialog;
