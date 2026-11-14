import { ClosedWorkspace } from "@/components/closed-workspace";
import { notFound } from "next/navigation";
import { sampleDeal } from "@/lib/mock";
export const dynamicParams = false;
export function generateStaticParams() { return [{ id: sampleDeal.id }]; }
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== sampleDeal.id) notFound();
  return <ClosedWorkspace path={"/deals/" + id + "/resale"} />;
}
