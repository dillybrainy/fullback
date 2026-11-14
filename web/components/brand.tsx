import Image from "next/image";
import Link from "next/link";
export function Brand({ light = false }: { light?: boolean }) {
  return <Link className={"wordmark" + (light ? " light" : "")} href="/" aria-label="FULLBACK home"><Image src={"/images/" + (light ? "imgLogoGoalFrame1" : "imgLogoGoalFrame") + ".svg"} width={28} height={28} alt="" /><span>fullback</span></Link>;
}
