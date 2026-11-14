import { ResponsivePhoto } from "@/components/responsive-photo";
import { Brand } from "@/components/brand";
import { SignInForm } from "@/components/signin-form";
export default function SignIn(){return <div className="signin-layout">
    <section className="signin-photo"><ResponsivePhoto name="imgHero" alt="A football pitch at sunrise" priority sizes="(max-width:700px) 100vw, 55vw"  /><Brand /><div className="signin-caption"><h2>Every club that develops a player deserves to be paid for it.</h2><p>Transfers, installments and academy royalties, settled on NEAR.</p></div></section>
<SignInForm /></div>;}
