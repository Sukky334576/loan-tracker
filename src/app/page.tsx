import { getDashboardData } from "@/lib/data";
import { DashboardClient } from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { loans, metrics } = await getDashboardData();

  return (
    <DashboardClient
      initialLoans={loans}
      initialMetrics={metrics}
    />
  );
}
