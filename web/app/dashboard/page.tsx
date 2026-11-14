import DashboardWorkspace from "@/components/dashboard-workspace";
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ role?: string; tab?: string }> }) {
  const { role, tab } = await searchParams;
  return <DashboardWorkspace key={(role ?? "") + (tab ?? "")} role={role} tab={tab} />;
}
