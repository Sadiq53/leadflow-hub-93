import Layout from "@/components/Layout";
import NegativeResponsesList from "@/components/NegativeResponsesList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Users, MessageSquare } from "lucide-react";

interface Stats {
  total_members: number;
  positive_responses: number;
  negative_responses: number;
  no_response: number;
  auto_removed: number;
}

const Analytics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: pocs, error } = await supabase
        .from('pocs')
        .select('response_type, auto_removed');

      if (error) throw error;

      const stats = {
        total_members: pocs?.length || 0,
        positive_responses: pocs?.filter(p => p.response_type === 'positive').length || 0,
        negative_responses: pocs?.filter(p => p.response_type === 'negative').length || 0,
        no_response: pocs?.filter(p => p.response_type === 'no_response' && !p.auto_removed).length || 0,
        auto_removed: pocs?.filter(p => p.auto_removed).length || 0,
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const responseRate = stats 
    ? ((stats.positive_responses / stats.total_members) * 100).toFixed(1)
    : 0;

  const negativeRate = stats
    ? ((stats.negative_responses / stats.total_members) * 100).toFixed(1)
    : 0;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Insights</h1>
          <p className="text-muted-foreground">
            Track your outreach performance and response metrics
          </p>
        </div>

        {!loading && stats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total_members}</div>
                <p className="text-xs text-muted-foreground">
                  All contacts in system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Positive Responses</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.positive_responses}</div>
                <p className="text-xs text-muted-foreground">
                  {responseRate}% response rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Negative Responses</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.negative_responses}</div>
                <p className="text-xs text-muted-foreground">
                  {negativeRate}% decline rate
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Auto-Removed</CardTitle>
                <MessageSquare className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.auto_removed}</div>
                <p className="text-xs text-muted-foreground">
                  No response after 3 days
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <NegativeResponsesList />
      </div>
    </Layout>
  );
};

export default Analytics;
