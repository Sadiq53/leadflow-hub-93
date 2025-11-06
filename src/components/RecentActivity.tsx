import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Activity as ActivityIcon, MessageSquare, UserCheck, CheckCircle2 } from "lucide-react";

interface Activity {
  id: string;
  action: string;
  created_at: string;
  profiles: {
    name: string;
  };
  leads?: {
    company_name: string;
  };
  pocs?: {
    name: string;
  };
}

const RecentActivity = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('activities')
        .select(`
          id,
          action,
          created_at,
          profiles!activities_user_id_fkey(name),
          leads(company_name),
          pocs(name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (data) setActivities(data as any);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('message')) return MessageSquare;
    if (action.includes('invite')) return UserCheck;
    if (action.includes('response')) return CheckCircle2;
    return ActivityIcon;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ActivityIcon className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Your latest outreach actions</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4 text-muted-foreground">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No activity yet</div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.action);
              return (
                <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b last:border-0">
                  <Icon className="h-4 w-4 text-muted-foreground mt-1" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">
                      {activity.action.replace(/_/g, ' ').charAt(0).toUpperCase() + activity.action.slice(1).replace(/_/g, ' ')}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {activity.leads && <span>{activity.leads.company_name}</span>}
                      {activity.pocs && <span>• {activity.pocs.name}</span>}
                      <span>• {format(new Date(activity.created_at), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
