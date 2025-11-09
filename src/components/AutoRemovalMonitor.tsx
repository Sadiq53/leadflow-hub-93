import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StaleCheck {
  total_stale: number;
  members: Array<{
    id: string;
    name: string;
    company_name: string;
    last_contacted_at: string;
    days_since_contact: number;
  }>;
}

const AutoRemovalMonitor = () => {
  const [staleMembers, setStaleMembers] = useState<StaleCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkStaleMembers();
    
    // Auto-check every 5 minutes
    const interval = setInterval(checkStaleMembers, 5 * 60 * 1000);
    
    // Set up realtime subscription for instant updates
    const channel = supabase
      .channel('stale-members-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pocs'
        },
        () => {
          checkStaleMembers();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  const checkStaleMembers = async () => {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const { data, error } = await supabase
        .from('pocs')
        .select('id, name, last_contacted_at, lead_id, leads(company_name)')
        .eq('auto_removed', false)
        .eq('linkedin_invite_accepted', true)
        .is('response', null)
        .lt('last_contacted_at', threeDaysAgo.toISOString());

      if (error) throw error;

      const membersWithDays = (data || []).map((poc: any) => {
        const daysSince = Math.floor(
          (Date.now() - new Date(poc.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          id: poc.id,
          name: poc.name,
          company_name: poc.leads?.company_name || 'Unknown',
          last_contacted_at: poc.last_contacted_at,
          days_since_contact: daysSince,
        };
      });

      setStaleMembers({
        total_stale: membersWithDays.length,
        members: membersWithDays,
      });
    } catch (error) {
      console.error('Error checking stale members:', error);
    }
  };

  const runAutoRemoval = async () => {
    setLoading(true);
    try {
      // Call the auto-removal function
      const { error: fnError } = await supabase.rpc('auto_remove_stale_members');

      if (fnError) throw fnError;

      // Log the activity for each removed member
      const { data: { user } } = await supabase.auth.getUser();
      if (user && staleMembers && staleMembers.members.length > 0) {
        const activities = staleMembers.members.map(member => ({
          user_id: user.id,
          poc_id: member.id,
          action: 'auto_removed',
          metadata: {
            reason: 'No response after 3 days',
            days_since_contact: member.days_since_contact,
            removed_at: new Date().toISOString(),
          },
        }));

        await supabase.from('activities').insert(activities);
      }

      toast({
        title: "Auto-removal completed",
        description: `${staleMembers?.total_stale || 0} member(s) removed from queue`,
      });

      // Refresh the check
      await checkStaleMembers();
    } catch (error) {
      console.error('Error running auto-removal:', error);
      toast({
        title: "Error",
        description: "Failed to run auto-removal process",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>Auto-Removal Monitor</span>
            </CardTitle>
            <CardDescription>
              Members with no response after 3 days
            </CardDescription>
          </div>
          <Badge variant={staleMembers && staleMembers.total_stale > 0 ? "destructive" : "secondary"}>
            {staleMembers?.total_stale || 0} Stale
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {staleMembers && staleMembers.total_stale > 0 ? (
          <>
            <div className="space-y-2">
              {staleMembers.members.slice(0, 5).map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.company_name}</p>
                  </div>
                  <Badge variant="outline">
                    {member.days_since_contact} days
                  </Badge>
                </div>
              ))}
              {staleMembers.members.length > 5 && (
                <p className="text-xs text-muted-foreground text-center">
                  +{staleMembers.members.length - 5} more
                </p>
              )}
            </div>
            
            <Button 
              onClick={runAutoRemoval} 
              disabled={loading}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Run Auto-Removal Now
            </Button>
          </>
        ) : (
          <div className="text-center py-6">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              All members are within the 3-day window
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">Auto-check every 5 minutes</p>
          <Button variant="ghost" size="sm" onClick={checkStaleMembers}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AutoRemovalMonitor;
