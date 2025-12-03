import Layout from "@/components/Layout";
import NegativeResponsesList from "@/components/NegativeResponsesList";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Users, MessageSquare, Target, CheckCircle2, XCircle, MinusCircle, Clock, UserCheck } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Stats {
  total_members: number;
  positive_responses: number;
  negative_responses: number;
  neutral_responses: number;
  no_response: number;
  auto_removed: number;
  invites_accepted: number;
  invites_pending: number;
  messages_sent: number;
  avg_response_time_days: number;
}

const Analytics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [pocsResult, notificationsResult] = await Promise.all([
        supabase.from('pocs').select('response_type, auto_removed, linkedin_invite_accepted, invite_accepted_at, created_at'),
        supabase.from('notifications').select('status, type').eq('status', 'completed')
      ]);

      if (pocsResult.error) throw pocsResult.error;

      const pocs = pocsResult.data || [];
      const notifications = notificationsResult.data || [];

      // Calculate average response time for those who responded
      const respondedPocs = pocs.filter(p => p.response_type && p.response_type !== 'no_response' && p.invite_accepted_at);
      let avgResponseDays = 0;
      if (respondedPocs.length > 0) {
        const totalDays = respondedPocs.reduce((acc, p) => {
          const acceptedDate = new Date(p.invite_accepted_at!);
          const now = new Date();
          return acc + Math.floor((now.getTime() - acceptedDate.getTime()) / (1000 * 60 * 60 * 24));
        }, 0);
        avgResponseDays = Math.round(totalDays / respondedPocs.length);
      }

      const stats: Stats = {
        total_members: pocs.length,
        positive_responses: pocs.filter(p => p.response_type === 'positive').length,
        negative_responses: pocs.filter(p => p.response_type === 'negative').length,
        neutral_responses: pocs.filter(p => p.response_type === 'neutral').length,
        no_response: pocs.filter(p => p.response_type === 'no_response' && !p.auto_removed).length,
        auto_removed: pocs.filter(p => p.auto_removed).length,
        invites_accepted: pocs.filter(p => p.linkedin_invite_accepted).length,
        invites_pending: pocs.filter(p => !p.linkedin_invite_accepted).length,
        messages_sent: notifications.filter(n => n.type?.startsWith('send_message')).length,
        avg_response_time_days: avgResponseDays
      };

      setStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalWithResponse = stats ? (stats.positive_responses + stats.negative_responses + stats.neutral_responses) : 0;
  const positiveRate = stats && stats.total_members > 0 
    ? ((stats.positive_responses / stats.total_members) * 100).toFixed(1) : "0";
  const negativeRate = stats && stats.total_members > 0 
    ? ((stats.negative_responses / stats.total_members) * 100).toFixed(1) : "0";
  const neutralRate = stats && stats.total_members > 0 
    ? ((stats.neutral_responses / stats.total_members) * 100).toFixed(1) : "0";
  const overallResponseRate = stats && stats.total_members > 0
    ? ((totalWithResponse / stats.total_members) * 100).toFixed(1) : "0";
  const acceptanceRate = stats && stats.total_members > 0
    ? ((stats.invites_accepted / stats.total_members) * 100).toFixed(1) : "0";
  const conversionRate = stats && stats.invites_accepted > 0
    ? ((stats.positive_responses / stats.invites_accepted) * 100).toFixed(1) : "0";

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics & Insights</h1>
          <p className="text-muted-foreground">
            Track your outreach performance and response metrics
          </p>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading analytics...</div>
        ) : stats && (
          <>
            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total_members}</div>
                  <p className="text-xs text-muted-foreground">All contacts in system</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Invites Accepted</CardTitle>
                  <UserCheck className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.invites_accepted}</div>
                  <p className="text-xs text-muted-foreground">{acceptanceRate}% acceptance rate</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Overall Response Rate</CardTitle>
                  <Target className="h-4 w-4 text-indigo-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{overallResponseRate}%</div>
                  <p className="text-xs text-muted-foreground">{totalWithResponse} total responses</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{conversionRate}%</div>
                  <p className="text-xs text-muted-foreground">Positive from accepted</p>
                </CardContent>
              </Card>
            </div>

            {/* Response Breakdown */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Positive Responses</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.positive_responses}</div>
                  <Progress value={parseFloat(positiveRate)} className="mt-2 h-2" />
                  <p className="text-xs text-muted-foreground mt-1">{positiveRate}% of all contacts</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-destructive">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Negative Responses</CardTitle>
                  <XCircle className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{stats.negative_responses}</div>
                  <Progress value={parseFloat(negativeRate)} className="mt-2 h-2 [&>div]:bg-destructive" />
                  <p className="text-xs text-muted-foreground mt-1">{negativeRate}% decline rate</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-yellow-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Neutral Responses</CardTitle>
                  <MinusCircle className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.neutral_responses}</div>
                  <Progress value={parseFloat(neutralRate)} className="mt-2 h-2 [&>div]:bg-yellow-500" />
                  <p className="text-xs text-muted-foreground mt-1">{neutralRate}% neutral rate</p>
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-orange-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Auto-Removed</CardTitle>
                  <Clock className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{stats.auto_removed}</div>
                  <p className="text-xs text-muted-foreground mt-3">No response after 3 days</p>
                </CardContent>
              </Card>
            </div>

            {/* Funnel Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Outreach Funnel</CardTitle>
                <CardDescription>Conversion at each stage of the outreach process</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Contacts</span>
                    <span className="font-medium">{stats.total_members}</span>
                  </div>
                  <Progress value={100} className="h-3" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Invites Accepted</span>
                    <span className="font-medium">{stats.invites_accepted} ({acceptanceRate}%)</span>
                  </div>
                  <Progress value={parseFloat(acceptanceRate)} className="h-3 [&>div]:bg-blue-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Responded</span>
                    <span className="font-medium">{totalWithResponse} ({overallResponseRate}%)</span>
                  </div>
                  <Progress value={parseFloat(overallResponseRate)} className="h-3 [&>div]:bg-purple-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Positive Response</span>
                    <span className="font-medium">{stats.positive_responses} ({positiveRate}%)</span>
                  </div>
                  <Progress value={parseFloat(positiveRate)} className="h-3 [&>div]:bg-green-500" />
                </div>
              </CardContent>
            </Card>

            {/* Additional Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.messages_sent}</div>
                  <p className="text-xs text-muted-foreground">Follow-up messages delivered</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.invites_pending}</div>
                  <p className="text-xs text-muted-foreground">Awaiting acceptance</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">No Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.no_response}</div>
                  <p className="text-xs text-muted-foreground">Still in follow-up queue</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <NegativeResponsesList />
      </div>
    </Layout>
  );
};

export default Analytics;