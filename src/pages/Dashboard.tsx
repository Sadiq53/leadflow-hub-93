import Layout from "@/components/Layout";
import TodayPanel from "@/components/TodayPanel";
import StatsOverview from "@/components/StatsOverview";
import RecentActivityEnhanced from "@/components/RecentActivityEnhanced";
import AutoRemovalMonitor from "@/components/AutoRemovalMonitor";
import NegativeResponsesList from "@/components/NegativeResponsesList";

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your outreach activities</p>
        </div>
        
        <StatsOverview />
        
        <div className="grid gap-6 md:grid-cols-2">
          <TodayPanel />
          <AutoRemovalMonitor />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <RecentActivityEnhanced />
          <NegativeResponsesList />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
