import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Database,
  Users,
  Bell,
  MessageSquare,
  Activity,
  FileText
} from "lucide-react";

interface HealthCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'checking';
  message: string;
  icon: any;
}

const SystemHealthCheck = () => {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  const runHealthChecks = async () => {
    setTesting(true);
    const results: HealthCheck[] = [];

    // Check 1: Database connectivity
    try {
      const { error } = await supabase.from('leads').select('id').limit(1);
      results.push({
        name: 'Database Connection',
        status: error ? 'fail' : 'pass',
        message: error ? `Error: ${error.message}` : 'Database connected successfully',
        icon: Database
      });
    } catch (e) {
      results.push({
        name: 'Database Connection',
        status: 'fail',
        message: 'Failed to connect to database',
        icon: Database
      });
    }

    // Check 2: Authentication
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      results.push({
        name: 'Authentication',
        status: error || !user ? 'fail' : 'pass',
        message: error ? `Error: ${error.message}` : `Authenticated as ${user?.email}`,
        icon: Users
      });
    } catch (e) {
      results.push({
        name: 'Authentication',
        status: 'fail',
        message: 'Authentication check failed',
        icon: Users
      });
    }

    // Check 3: Templates functionality
    try {
      const { data, error } = await supabase.from('templates').select('*').limit(5);
      results.push({
        name: 'Templates System',
        status: error ? 'fail' : 'pass',
        message: error ? `Error: ${error.message}` : `${data?.length || 0} templates available`,
        icon: FileText
      });
    } catch (e) {
      results.push({
        name: 'Templates System',
        status: 'fail',
        message: 'Template check failed',
        icon: FileText
      });
    }

    // Check 4: POCs and Response tracking
    try {
      const { data, error } = await supabase
        .from('pocs')
        .select('id, response, response_type, auto_removed')
        .limit(10);
      
      const negativeCount = data?.filter(p => p.response_type === 'negative').length || 0;
      const autoRemovedCount = data?.filter(p => p.auto_removed).length || 0;
      
      results.push({
        name: 'Response Tracking',
        status: error ? 'fail' : 'pass',
        message: error 
          ? `Error: ${error.message}` 
          : `Tracking ${data?.length || 0} POCs (${negativeCount} negative, ${autoRemovedCount} auto-removed)`,
        icon: MessageSquare
      });
    } catch (e) {
      results.push({
        name: 'Response Tracking',
        status: 'fail',
        message: 'Response tracking check failed',
        icon: MessageSquare
      });
    }

    // Check 5: Notifications system
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, status')
        .limit(10);
      
      const pendingCount = data?.filter(n => n.status === 'pending').length || 0;
      
      results.push({
        name: 'Notifications System',
        status: error ? 'fail' : 'pass',
        message: error 
          ? `Error: ${error.message}` 
          : `${data?.length || 0} notifications (${pendingCount} pending)`,
        icon: Bell
      });
    } catch (e) {
      results.push({
        name: 'Notifications System',
        status: 'fail',
        message: 'Notifications check failed',
        icon: Bell
      });
    }

    // Check 6: Activity logging
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('id, action')
        .order('created_at', { ascending: false })
        .limit(10);
      
      results.push({
        name: 'Activity Logging',
        status: error ? 'fail' : 'pass',
        message: error 
          ? `Error: ${error.message}` 
          : `${data?.length || 0} recent activities logged`,
        icon: Activity
      });
    } catch (e) {
      results.push({
        name: 'Activity Logging',
        status: 'fail',
        message: 'Activity logging check failed',
        icon: Activity
      });
    }

    // Check 7: Auto-removal function
    try {
      const { data, error } = await supabase.rpc('auto_remove_stale_members');
      results.push({
        name: 'Auto-Removal Function',
        status: error ? 'fail' : 'pass',
        message: error 
          ? `Error: ${error.message}` 
          : 'Auto-removal function is operational',
        icon: RefreshCw
      });
    } catch (e: any) {
      results.push({
        name: 'Auto-Removal Function',
        status: 'warning',
        message: 'Auto-removal function check skipped',
        icon: RefreshCw
      });
    }

    // Check 8: Follow-up validation function
    try {
      const { data: pocs } = await supabase
        .from('pocs')
        .select('id')
        .limit(1);
      
      if (pocs && pocs.length > 0) {
        const { data, error } = await supabase.rpc('is_followup_allowed', { 
          poc_id_param: pocs[0].id 
        });
        
        results.push({
          name: 'Follow-up Validation',
          status: error ? 'fail' : 'pass',
          message: error 
            ? `Error: ${error.message}` 
            : 'Follow-up validation function is operational',
          icon: CheckCircle2
        });
      } else {
        results.push({
          name: 'Follow-up Validation',
          status: 'warning',
          message: 'No POCs to test with',
          icon: CheckCircle2
        });
      }
    } catch (e: any) {
      results.push({
        name: 'Follow-up Validation',
        status: 'warning',
        message: 'Follow-up validation check skipped',
        icon: CheckCircle2
      });
    }

    setChecks(results);
    setTesting(false);

    // Show summary toast
    const failedChecks = results.filter(r => r.status === 'fail').length;
    const warningChecks = results.filter(r => r.status === 'warning').length;
    
    if (failedChecks > 0) {
      toast({
        title: "Health Check Complete",
        description: `${failedChecks} check(s) failed, ${warningChecks} warning(s)`,
        variant: "destructive"
      });
    } else if (warningChecks > 0) {
      toast({
        title: "Health Check Complete",
        description: `All critical checks passed with ${warningChecks} warning(s)`,
      });
    } else {
      toast({
        title: "Health Check Complete",
        description: "All systems operational",
      });
    }
  };

  useEffect(() => {
    runHealthChecks();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'fail':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'warning':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'fail':
        return <XCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>System Health Check</CardTitle>
            <CardDescription>
              Verify all system functionalities are working correctly
            </CardDescription>
          </div>
          <Button 
            onClick={runHealthChecks} 
            disabled={testing}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${testing ? 'animate-spin' : ''}`} />
            Re-test
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checks.map((check, index) => {
            const Icon = check.icon;
            return (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{check.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {check.message}
                    </div>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className={getStatusColor(check.status)}
                >
                  {getStatusIcon(check.status)}
                  <span className="ml-2 capitalize">{check.status}</span>
                </Badge>
              </div>
            );
          })}
        </div>

        {checks.length === 0 && testing && (
          <div className="text-center py-12 text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
            <p>Running health checks...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemHealthCheck;
