import Layout from "@/components/Layout";
import SystemHealthCheck from "@/components/SystemHealthCheck";
import AutoRemovalMonitor from "@/components/AutoRemovalMonitor";
import FollowupQueueMonitor from "@/components/FollowupQueueMonitor";
import { Settings, Activity, AlertCircle, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const DevTools = () => {
  return (
    <Layout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="h-8 w-8 text-primary" />
              </div>
              Dev Mode
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Centralized system monitoring, diagnostics, and queue management hub
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Live Monitoring
          </Badge>
        </div>

        <Separator />

        {/* System Health Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">System Health</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time health checks and service status monitoring
          </p>
          <SystemHealthCheck />
        </div>

        <Separator />

        {/* Auto-Removal Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Auto-Removal Monitor</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Automated tracking of stale members and removal actions
          </p>
          <AutoRemovalMonitor />
        </div>

        <Separator />

        {/* Queue Management Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold">Follow-Up Queue Management</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Monitor and manage members in the outreach queue with manual controls
          </p>
          <FollowupQueueMonitor />
        </div>
      </div>
    </Layout>
  );
};

export default DevTools;
