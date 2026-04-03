import { PageMotionWrapper } from "@/components/common/PageMotionWrapper";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";

export default function HomeDashboard() {
  return (
    <PageMotionWrapper testId="home-dashboard-page">
      <DashboardOverview />
    </PageMotionWrapper>
  );
}
