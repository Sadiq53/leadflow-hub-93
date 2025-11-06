import Layout from "@/components/Layout";
import TodayPanel from "@/components/TodayPanel";
import StatsOverview from "@/components/StatsOverview";
import RecentActivity from "@/components/RecentActivity";

const Dashboard = () => {
  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your outreach overview.
          </p>
        </div>

        <StatsOverview />

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2">
            <TodayPanel />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
