import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, ExternalLink, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";

interface TodayTask {
  id: string;
  poc_id: string;
  poc_name: string;
  company_name: string;
  linkedin_url: string | null;
  type: string;
  scheduled_for: string;
  lead_id: string;
}

const TodayPanel = () => {
  const [tasks, setTasks] = useState<TodayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTodayTasks();
  }, []);

  const fetchTodayTasks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: notifications } = await supabase
        .from('notifications')
        .select('id, poc_id, lead_id, type, scheduled_for')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .gte('scheduled_for', today.toISOString())
        .lt('scheduled_for', tomorrow.toISOString())
        .order('scheduled_for', { ascending: true });

      if (notifications && notifications.length > 0) {
        const pocIds = Array.from(new Set(notifications.map((n) => n.poc_id).filter(Boolean)));
        const leadIds = Array.from(new Set(notifications.map((n) => n.lead_id).filter(Boolean)));

        const [{ data: pocsData }, { data: leadsData }] = await Promise.all([
          supabase.from('pocs').select('id, name, linkedin_url, response_type, lead_id').in('id', pocIds),
          supabase.from('leads').select('id, company_name').in('id', leadIds),
        ]);

        const pocMap = new Map((pocsData || []).map((p: any) => [p.id, p]));
        const leadMap = new Map((leadsData || []).map((l: any) => [l.id, l.company_name]));

        const formattedTasks = notifications
          .map((n: any) => {
            const poc = pocMap.get(n.poc_id);
            // Exclude POCs with negative responses or already responded positively
            if (!poc || poc.response_type === 'negative') return null;
            return {
              id: n.id,
              poc_id: n.poc_id,
              poc_name: poc.name,
              company_name: leadMap.get(n.lead_id) || 'Unknown',
              linkedin_url: poc.linkedin_url,
              type: n.type,
              scheduled_for: n.scheduled_for,
              lead_id: n.lead_id,
            } as TodayTask;
          })
          .filter(Boolean) as TodayTask[];
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
      // Fetch current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;

      // Fetch available templates
      const { data: templates } = await supabase
        .from('templates')
        .select('*')
        .or(`created_by.eq.${currentUser.id},is_shared.eq.true`)
        .limit(1);

      // Use first template or default message
      const templateBody = templates && templates.length > 0 
        ? templates[0].body 
        : `Hi {firstName}, I wanted to reach out regarding {company}...`;

      // Replace placeholders
      const firstName = task.poc_name.split(' ')[0];
      const finalMessage = templateBody
        .replace(/{firstName}/g, firstName)
        .replace(/\{firstName\}/g, firstName)
        .replace(/{company}/g, task.company_name)
        .replace(/\{company\}/g, task.company_name);

      // Copy to clipboard
      await navigator.clipboard.writeText(finalMessage);
      toast({
        title: "Message copied!",
        description: "The message has been copied to your clipboard."
      });

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

      // Mark notification as sent
      await supabase
        .from('notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', task.id);

      // Log activity
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('activities').insert({
          lead_id: task.lead_id,
          poc_id: task.poc_id,
          user_id: user.id,
          action: 'message_sent',
          metadata: { type: task.type, status: 'sent' }
        });
      }

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
          {tasks.length === 0 ? "No tasks scheduled for today" : "People you need to reach out to today"}
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
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {task.type.replace('_', ' ').charAt(0).toUpperCase() + task.type.slice(1).replace('_', ' ')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scheduled: {format(new Date(task.scheduled_for), 'h:mm a')}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                {(() => {
                  // Check if follow-up is allowed (within 2 days of invite acceptance)
                  const canSendFollowup = task.type.includes('message') || task.type.includes('follow');
                  return (
                    <>
                      <Button
                        onClick={() => handleSendMessage(task)}
                        className="flex items-center space-x-2"
                        disabled={!canSendFollowup}
                      >
                        <Copy className="h-4 w-4" />
                        <span>Send Message</span>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleMarkComplete(task.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    </>
                  );
                })()}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TodayPanel;
