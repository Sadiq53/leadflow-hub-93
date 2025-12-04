import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Calendar, Edit2, Trash2, Save, X } from "lucide-react";
import { format } from "date-fns";
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
}

const QueueManagementDialog = () => {
  const [open, setOpen] = useState(false);
  const [queuedMembers, setQueuedMembers] = useState<QueuedMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editScheduledFor, setEditScheduledFor] = useState("");
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
          supabase.from('pocs').select('id, name, lead_id').in('id', pocIds),
          supabase.from('leads').select('id, company_name').in('id', leadIds),
        ]);

        const pocMap = new Map((pocsData || []).map(p => [p.id, p]));
        const leadMap = new Map((leadsData || []).map(l => [l.id, l.company_name]));

        const formatted = notifications.map(n => {
          const poc = pocMap.get(n.poc_id);
          let day = 1;
          if (n.type === 'send_message_a') day = 2;
          if (n.type === 'send_message_b') day = 3;
          
          return {
            id: n.id,
            poc_id: n.poc_id || '',
            poc_name: poc?.name || 'Unknown',
            company_name: leadMap.get(n.lead_id) || 'Unknown',
            type: n.type,
            scheduled_for: n.scheduled_for,
            lead_id: n.lead_id || '',
            day
          };
        });

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
  };

  const handleSaveEdit = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ scheduled_for: new Date(editScheduledFor).toISOString() })
        .eq('id', memberId);

      if (error) throw error;

      toast({ title: "Updated", description: "Schedule updated successfully" });
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
              <div className="flex items-center gap-2">
                <span className="font-medium">{member.poc_name}</span>
                <Badge variant="outline" className="text-xs">{member.company_name}</Badge>
              </div>
              {editingId === member.id ? (
                <Input
                  type="datetime-local"
                  value={editScheduledFor}
                  onChange={(e) => setEditScheduledFor(e.target.value)}
                  className="mt-2 w-auto"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Scheduled: {format(new Date(member.scheduled_for), 'MMM dd, yyyy h:mm a')}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editingId === member.id ? (
                <>
                  <Button size="sm" variant="ghost" onClick={() => handleSaveEdit(member.id)}>
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
            View and manage all queued members across all follow-up days
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
