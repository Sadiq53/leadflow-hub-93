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
        .select(`
          id,
          poc_id,
          lead_id,
          type,
          scheduled_for,
          pocs (
            id,
            name,
            linkedin_url,
            response,
            linkedin_invite_accepted,
            leads (
              company_name
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .gte('scheduled_for', today.toISOString())
        .lt('scheduled_for', tomorrow.toISOString())
        .order('scheduled_for', { ascending: true });

      if (notifications) {
        // Filter out POCs that have already responded OR whose company has any responder
        const formattedTasks = notifications
          .filter((n: any) => {
            // Must have accepted invite and not responded themselves
            if (!n.pocs.linkedin_invite_accepted || n.pocs.response) return false;
            return true;
          })
          .map((n: any) => ({
            id: n.id,
            poc_id: n.poc_id,
            poc_name: n.pocs.name,
            company_name: n.pocs.leads.company_name,
            linkedin_url: n.pocs.linkedin_url,
            type: n.type,
            scheduled_for: n.scheduled_for,
            lead_id: n.lead_id
          }));
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (task: TodayTask) => {
    // Get a template and replace tokens
    const message = `Hi {{firstName}}, I wanted to reach out regarding {{company}}...`;
    const firstName = task.poc_name.split(' ')[0];
    const finalMessage = message
      .replace('{{firstName}}', firstName)
      .replace('{{company}}', task.company_name);

    // Copy to clipboard
    try {
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
          payload: { type: task.type }
        });
      }

      fetchTodayTasks();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy message. Please try again.",
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
                <Button
                  onClick={() => handleSendMessage(task)}
                  className="flex items-center space-x-2"
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
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default TodayPanel;
