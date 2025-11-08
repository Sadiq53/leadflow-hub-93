import Layout from "@/components/Layout";
import SystemHealthCheck from "@/components/SystemHealthCheck";
import { Activity } from "lucide-react";

const SystemHealth = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-8 w-8" />
            System Health Monitor
          </h1>
          <p className="text-muted-foreground">
            Comprehensive system diagnostics and functionality checks
          </p>
        </div>
        
        <SystemHealthCheck />
      </div>
    </Layout>
  );
};

export default SystemHealth;
