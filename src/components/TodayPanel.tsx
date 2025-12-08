import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, CheckCircle2, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useTodayTasks } from "@/hooks/useNotifications";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { EmptyState } from "@/components/EmptyState";

const TodayPanel = () => {
  const { tasks, isLoading, sendMessage, isSending, markComplete, isMarkingComplete } = useTodayTasks();

  const getDayBadgeVariant = (day: number) => {
    switch (day) {
      case 1: return 'default';
      case 2: return 'secondary';
      case 3: return 'outline';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Tasks</CardTitle>
          <CardDescription>Loading your tasks...</CardDescription>
        </CardHeader>
        <CardContent>
          <LoadingSpinner text="Loading tasks..." />
        </CardContent>
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
        {tasks.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up!"
            description="No follow-up tasks are due right now. Check back later."
          />
        ) : (
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
                    onClick={() => sendMessage(task)}
                    disabled={isSending}
                    className="flex items-center space-x-2"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Send Day {task.followup_day}</span>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => markComplete(task.id)}
                    disabled={isMarkingComplete}
                    title="Mark as complete without sending"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayPanel;
