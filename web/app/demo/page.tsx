import type { Metadata } from "next";
import { JudgeDemo } from "@/components/judge-demo";

export const metadata: Metadata = { title: "Judge demo · FULLBACK" };

export default function DemoPage() {
  return <JudgeDemo />;
}
