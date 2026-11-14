"use client";
import { useSearchParams } from "next/navigation";
import DashboardWorkspace from "./dashboard-workspace";
export function DashboardRoute() {
  const params = useSearchParams();
  const role = params.get("role") === "academy" ? "academy" : undefined;
  const tab = params.get("tab") === "buying" ? "buying" : undefined;
  return <DashboardWorkspace key={(role ?? "") + (tab ?? "")} role={role} tab={tab} />;
}
