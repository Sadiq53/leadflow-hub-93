import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, MessageSquare, TrendingUp, Target, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  totalLeads: number;
  totalPocs: number;
  pendingTasks: number;
  responsesReceived: number;
  acceptedInvites: number;
  responseRate: number;
}

const StatsOverview = () => {
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    totalPocs: 0,
    pendingTasks: 0,
    responsesReceived: 0,
    acceptedInvites: 0,
    responseRate: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [leadsResult, pocsResult, notificationsResult, responsesResult, invitesResult] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }),
        supabase.from('pocs').select('id', { count: 'exact', head: true }),
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('pocs')
          .select('id', { count: 'exact', head: true })
          .not('response', 'is', null),
        supabase
          .from('pocs')
          .select('id', { count: 'exact', head: true })
          .eq('linkedin_invite_accepted', true)
      ]);

      const totalContacted = invitesResult.count || 0;
      const totalResponses = responsesResult.count || 0;
      const responseRate = totalContacted > 0 ? Math.round((totalResponses / totalContacted) * 100) : 0;

      setStats({
        totalLeads: leadsResult.count || 0,
        totalPocs: pocsResult.count || 0,
        pendingTasks: notificationsResult.count || 0,
        responsesReceived: totalResponses,
        acceptedInvites: totalContacted,
        responseRate
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    // Set up realtime subscriptions
    const channel = supabase
      .channel('stats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pocs' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  const statCards = [
    {
      title: "Companies",
      value: stats.totalLeads,
      icon: Building2,
      description: "In your pipeline",
      colorClass: "text-primary"
    },
    {
      title: "Contacts",
      value: stats.totalPocs,
      icon: Users,
      description: "Total people",
      colorClass: "text-accent"
    },
    {
      title: "Accepted Invites",
      value: stats.acceptedInvites,
      icon: CheckCircle2,
      description: "LinkedIn connections",
      colorClass: "text-success"
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      icon: MessageSquare,
      description: "Messages to send",
      colorClass: "text-warning"
    },
    {
      title: "Responses",
      value: stats.responsesReceived,
      icon: TrendingUp,
      description: "Positive engagement",
      colorClass: "text-success"
    },
    {
      title: "Response Rate",
      value: `${stats.responseRate}%`,
      icon: Target,
      description: "Conversion rate",
      colorClass: "text-primary"
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat) => (
        <Card key={stat.title} className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.colorClass}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsOverview;
