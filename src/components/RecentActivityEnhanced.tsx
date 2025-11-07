import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { MessageSquare, UserPlus, Reply, Clock, Filter, X } from "lucide-react";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: string;
  action: string;
  created_at: string;
  metadata: any;
  user_id: string;
  leads?: { company_name: string } | null;
  pocs?: { name: string } | null;
}

const RecentActivityEnhanced = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [responseFilter, setResponseFilter] = useState<string>("all");

  useEffect(() => {
    fetchActivities();
  }, [dateFilter, statusFilter, responseFilter]);

  const fetchActivities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from('activities')
        .select('id, action, created_at, metadata, user_id, leads(company_name), pocs(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply date filter
      if (dateFilter !== "all") {
        const daysAgo = parseInt(dateFilter);
        const filterDate = subDays(new Date(), daysAgo).toISOString();
        query = query.gte('created_at', filterDate);
      }

      // Apply status filter
      if (statusFilter !== "all") {
        query = query.contains('metadata', { status: statusFilter });
      }

      // Apply response filter
      if (responseFilter !== "all") {
        query = query.contains('metadata', { response_type: responseFilter });
      }

      query = query.limit(50);

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'message_sent':
      case 'follow_up_sent':
        return <MessageSquare className="h-4 w-4" />;
      case 'invite_sent':
        return <UserPlus className="h-4 w-4" />;
      case 'response_received':
      case 'negative_response':
        return <Reply className="h-4 w-4" />;
      case 'auto_removed':
        return <X className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'response_received':
        return 'text-green-500';
      case 'negative_response':
        return 'text-red-500';
      case 'auto_removed':
        return 'text-orange-500';
      default:
        return 'text-blue-500';
    }
  };

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const clearFilters = () => {
    setDateFilter("all");
    setStatusFilter("all");
    setResponseFilter("all");
  };

  const hasActiveFilters = dateFilter !== "all" || statusFilter !== "all" || responseFilter !== "all";

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Loading activities...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Recent Activity</span>
            </CardTitle>
            <CardDescription>Track all your outreach activities</CardDescription>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 mt-4">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="1">Last 24 Hours</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          <Select value={responseFilter} onValueChange={setResponseFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Response" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Responses</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="no_response">No Response</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No activities found matching your filters
            </p>
          ) : (
            activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className={`mt-1 ${getActivityColor(activity.action)}`}>
                  {getActivityIcon(activity.action)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{formatAction(activity.action)}</p>
                    {activity.metadata?.response_type && (
                      <Badge variant={activity.metadata.response_type === 'negative' ? 'destructive' : 'default'}>
                        {activity.metadata.response_type}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {activity.leads?.company_name && (
                      <span className="font-medium">{activity.leads.company_name}</span>
                    )}
                    {activity.pocs?.name && (
                      <span> • {activity.pocs.name}</span>
                    )}
                  </div>
                  {activity.metadata?.reason && (
                    <p className="text-xs text-muted-foreground italic">
                      {activity.metadata.reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(activity.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivityEnhanced;
