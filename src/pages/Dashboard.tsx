import Layout from "@/components/Layout";
import TodayPanel from "@/components/TodayPanel";
import StatsOverview from "@/components/StatsOverview";
import RecentActivityEnhanced from "@/components/RecentActivityEnhanced";
import AutoRemovalMonitor from "@/components/AutoRemovalMonitor";
import NegativeResponsesList from "@/components/NegativeResponsesList";
import QueueManagementDialog from "@/components/QueueManagementDialog";
import ResponsePieChart from "@/components/ResponsePieChart";

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your outreach activities</p>
          </div>
          <QueueManagementDialog />
        </div>
        
        <StatsOverview />
        
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <TodayPanel />
          </div>
          <ResponsePieChart />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <AutoRemovalMonitor />
          <NegativeResponsesList />
        </div>

        <RecentActivityEnhanced />
      </div>
    </Layout>
  );
};

export default Dashboard;
