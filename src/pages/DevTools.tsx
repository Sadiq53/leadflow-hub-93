import Layout from "@/components/Layout";
import SystemHealthCheck from "@/components/SystemHealthCheck";
import AutoRemovalMonitor from "@/components/AutoRemovalMonitor";
import FollowupQueueMonitor from "@/components/FollowupQueueMonitor";
import { Settings } from "lucide-react";

const DevTools = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Developer Tools
          </h1>
          <p className="text-muted-foreground">
            System monitoring, diagnostics, and queue management
          </p>
        </div>

        <div className="grid gap-6">
          <SystemHealthCheck />
          <AutoRemovalMonitor />
          <FollowupQueueMonitor />
        </div>
      </div>
    </Layout>
  );
};

export default DevTools;
