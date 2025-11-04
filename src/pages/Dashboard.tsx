import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import TodayPanel from "@/components/TodayPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Building2, MessageSquare, TrendingUp } from "lucide-react";

interface Stats {
  totalLeads: number;
  totalPocs: number;
  pendingTasks: number;
  responsesReceived: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    totalPocs: 0,
    pendingTasks: 0,
    responsesReceived: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [leadsResult, pocsResult, notificationsResult, responsesResult] = await Promise.all([
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
        .not('response', 'is', null)
    ]);

    setStats({
      totalLeads: leadsResult.count || 0,
      totalPocs: pocsResult.count || 0,
      pendingTasks: notificationsResult.count || 0,
      responsesReceived: responsesResult.count || 0
    });
  };

  const statCards = [
    {
      title: "Total Leads",
      value: stats.totalLeads,
      icon: Building2,
      description: "Companies in your pipeline"
    },
    {
      title: "Points of Contact",
      value: stats.totalPocs,
      icon: Users,
      description: "People you're reaching out to"
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks,
      icon: MessageSquare,
      description: "Outreach actions needed"
    },
    {
      title: "Responses",
      value: stats.responsesReceived,
      icon: TrendingUp,
      description: "Positive engagement"
    }
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your outreach overview.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <TodayPanel />
      </div>
    </Layout>
  );
};

export default Dashboard;
