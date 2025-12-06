import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, CheckCircle2, Clock, Calendar } from "lucide-react";
import { format, differenceInDays, differenceInMilliseconds } from "date-fns";

interface TodayTask {
  id: string;
  poc_id: string;
  poc_name: string;
  company_name: string;
  linkedin_url: string | null;
  type: string;
  scheduled_for: string;
  lead_id: string;
  invite_accepted_at: string;
  followup_day: number; // 1, 2, or 3
}

const TodayPanel = () => {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTodayTasks();

    // Set up realtime subscriptions for automatic updates
    const channel = supabase
      .channel('today-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchTodayTasks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pocs'
        },
        () => {
          fetchTodayTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTodayTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();

      // Fetch all pending notifications for the user
      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, poc_id, lead_id, type, scheduled_for')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true });

      if (notifications && notifications.length > 0) {
        const pocIds = Array.from(new Set(notifications.map((n) => n.poc_id).filter(Boolean)));
        const leadIds = Array.from(new Set(notifications.map((n) => n.lead_id).filter(Boolean)));

        const [{ data: pocsData }, { data: leadsData }] = await Promise.all([
          supabase.from('pocs').select('id, name, linkedin_url, response_type, lead_id, invite_accepted_at, auto_removed').in('id', pocIds),
          supabase.from('leads').select('id, company_name').in('id', leadIds),
        ]);

        const pocMap = new Map((pocsData || []).map((p: any) => [p.id, p]));
        const leadMap = new Map((leadsData || []).map((l: any) => [l.id, l.company_name]));

        const formattedTasks: TodayTask[] = [];

        for (const n of notifications) {
          const poc = pocMap.get(n.poc_id);
          
          // Skip if POC not found, has negative response, or is auto-removed
          if (!poc || poc.response_type === 'negative' || poc.auto_removed) continue;
          
          // POC must have invite_accepted_at to be in queue
          if (!poc.invite_accepted_at) continue;

          const inviteAcceptedAt = new Date(poc.invite_accepted_at);
          const scheduledFor = new Date(n.scheduled_for);
          
          // Determine follow-up day from notification type
          let followupDay = 1;
          if (n.type === 'followup_day_1' || n.type === 'send_message_day_1') {
            followupDay = 1;
          } else if (n.type === 'followup_day_2' || n.type === 'send_message_a') {
            followupDay = 2;
          } else if (n.type === 'followup_day_3' || n.type === 'send_message_b') {
            followupDay = 3;
          }

          // Check if the queue period (3 days from acknowledgment) includes today
          const queueEndTime = new Date(inviteAcceptedAt);
          queueEndTime.setDate(queueEndTime.getDate() + 3);
          
          if (now > queueEndTime) {
            // Queue expired - skip this task
            continue;
          }

          // Check if current time has passed the scheduled time for today
          // The task should only appear when current time >= scheduled time
          if (now < scheduledFor) {
            // Not yet time for this task today
            continue;
          }

          formattedTasks.push({
            id: n.id,
            poc_id: n.poc_id,
            poc_name: poc.name,
            company_name: leadMap.get(n.lead_id) || 'Unknown',
            linkedin_url: poc.linkedin_url,
            type: n.type,
            scheduled_for: n.scheduled_for,
            lead_id: n.lead_id,
            invite_accepted_at: poc.invite_accepted_at,
            followup_day: followupDay,
          });
        }

        setTasks(formattedTasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (task: TodayTask) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Use the calculated followup_day from the task
      const followupDay = task.followup_day;

      // Fetch templates matching this followup day
      const { data: templates } = await supabase
        .from('templates')
        .select('*')
        .or(`created_by.eq.${currentUser.id},is_shared.eq.true`)
        .eq('followup_day', followupDay)
        .limit(1);

      // Use first template or default message
      const templateBody = templates && templates.length > 0 
        ? templates[0].body 
        : `Hi {firstName}, I wanted to follow up on my previous message regarding {company}...`;

      // Replace placeholders
      const firstName = task.poc_name.split(' ')[0];
      const finalMessage = templateBody
        .replace(/{firstName}/g, firstName)
        .replace(/\{firstName\}/g, firstName)
        .replace(/{company}/g, task.company_name)
        .replace(/\{company\}/g, task.company_name);

      // Copy to clipboard with fallback
      let copySuccess = false;
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(finalMessage);
          copySuccess = true;
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement('textarea');
          textArea.value = finalMessage;
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const success = document.execCommand('copy');
          textArea.remove();
          copySuccess = success;
        }
      } catch (clipboardError) {
        console.error('Clipboard error:', clipboardError);
      }

      if (copySuccess) {
        toast({
          title: `Day ${followupDay} message copied!`,
          description: templates && templates.length > 0 
            ? `Using template: ${templates[0].name}`
            : "Using default template (no Day " + followupDay + " template found)"
        });
      } else {
        // Show message in toast as last resort
        toast({
          title: "Copy manually",
          description: finalMessage,
          duration: 10000
        });
      }

      // Open LinkedIn
      if (task.linkedin_url) {
        window.open(task.linkedin_url, '_blank');
      } else {
        window.open('https://www.linkedin.com/messaging/', '_blank');
      }

      // Update POC last contacted time
      await supabase
        .from('pocs')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', task.poc_id);

      // Mark this notification as sent (removes from Today's Task)
      await supabase
        .from('notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', task.id);

      // Log activity
      await supabase.from('activities').insert({
        lead_id: task.lead_id,
        poc_id: task.poc_id,
        user_id: currentUser.id,
        action: 'message_sent',
        metadata: { 
          type: task.type, 
          status: 'sent',
          followup_day: followupDay
        }
      });

      fetchTodayTasks();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleMarkComplete = async (taskId: string) => {
    await supabase
      .from('notifications')
      .update({ status: 'completed', sent_at: new Date().toISOString() })
      .eq('id', taskId);

    toast({
      title: "Task completed",
      description: "The task has been marked as complete."
    });

    fetchTodayTasks();
  };

  const getDayBadgeVariant = (day: number) => {
    switch (day) {
      case 1: return 'default';
      case 2: return 'secondary';
      case 3: return 'outline';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Tasks</CardTitle>
          <CardDescription>Loading your tasks...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="h-5 w-5" />
          <span>Today's Tasks</span>
          <Badge variant="secondary">{tasks.length}</Badge>
        </CardTitle>
        <CardDescription>
          {tasks.length === 0 ? "No tasks scheduled for now" : "People you need to reach out to today"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold">{task.poc_name}</h4>
                  <Badge variant="outline">{task.company_name}</Badge>
                  <Badge variant={getDayBadgeVariant(task.followup_day)}>
                    <Calendar className="h-3 w-3 mr-1" />
                    Day {task.followup_day}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {task.followup_day === 1 ? 'Day 1 Follow-up' :
                   task.followup_day === 2 ? 'Day 2 Follow-up' :
                   task.followup_day === 3 ? 'Day 3 Follow-up' :
                   task.type.replace(/_/g, ' ')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scheduled: {format(new Date(task.scheduled_for), 'MMM dd, h:mm a')}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleSendMessage(task)}
                  className="flex items-center space-x-2"
                >
                  <Copy className="h-4 w-4" />
                  <span>Send Day {task.followup_day}</span>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleMarkComplete(task.id)}
                  title="Mark as complete without sending"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TodayPanel;
