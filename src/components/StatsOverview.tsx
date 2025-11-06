import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, MessageSquare, TrendingUp, Target, CheckCircle2 } from "lucide-react";

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

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
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
  };

  const statCards = [
    {
      title: "Companies",
      value: stats.totalLeads,
      icon: Building2,
      description: "In your pipeline",
      color: "text-blue-600"
    },
    {
      title: "Contacts",
      value: stats.totalPocs,
      icon: Users,
      description: "Total people",
      color: "text-purple-600"
    },
    {
      title: "Accepted Invites",
      value: stats.acceptedInvites,
      icon: CheckCircle2,
      description: "LinkedIn connections",
      color: "text-green-600"
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      icon: MessageSquare,
      description: "Messages to send",
      color: "text-orange-600"
    },
    {
      title: "Responses",
      value: stats.responsesReceived,
      icon: TrendingUp,
      description: "Positive engagement",
      color: "text-emerald-600"
    },
    {
      title: "Response Rate",
      value: `${stats.responseRate}%`,
      icon: Target,
      description: "Conversion rate",
      color: "text-indigo-600"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
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
