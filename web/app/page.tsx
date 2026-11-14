import { ResponsivePhoto } from "@/components/responsive-photo";
import Link from "next/link";
import { StaticIcon as Image } from "@/components/static-icon";
import { Brand } from "@/components/brand";
import { RoyaltyNotification } from "@/components/royalty-notification";
import { FaqList } from "@/components/faq-list";
import { HomeMotion } from "@/components/home-motion";
import { signInHref } from "@/lib/access-policy.mjs";

const steps = [
  ["Upload the agreement", "AI reads the PDF and quotes the clause behind every number. Both clubs confirm before anything goes on-chain."],
  ["Lock the collateral", "The buying club deposits collateral before the deal goes live."],
  ["Installments collect themselves", "Late payment? The collector agent settles it from collateral within seconds."],
  ["Everyone gets their cut", "Seller, academies and sell-on holders are paid in one transaction."],
];
const roles = [
  ["Selling clubs", "Sell on installments without the fear of chasing payments. Collateral covers anything late.", "Protected installments", "imgPhotoClubDirectorInAnEmptyStadium"],
  ["Buying clubs", "Spread a fee over years and prove you are good for it with on-chain collateral.", "Credible payment plans", "imgPhotoNewSigningHoldingAScarf"],
  ["Academies & SSBs", "Get your royalty from every transfer of every player you trained, automatically.", "Academy royalties", "imgPhotoGrassrootsAcademyKidsTraining"],
  ["Sell-on holders", "Your sell-on clause pays out the moment the player is sold again.", "Sell-on, enforced", "imgPhotoPackedStadiumOnMatchDay"],
 ] as const;
const questions = [
  ["Does this really happen to clubs?", "Yes. Botafogo still owed Ludogorets €8M and was hit with a three-window FIFA transfer ban in April 2026. Smaller clubs usually just wait."],
  ["Can FIFA or a national federation see this?", "Yes. Federations get a read-only view of every deal: what was promised, what was paid, what was covered by collateral, and how much reached academies. They watch; they can’t move money."],
  ["What if the buying club pays late?", "Anyone can call settle_due. The contract pays the installment from collateral and asks the buyer to top up. No collateral left means the deal defaults, in public."],
  ["How are academy royalties calculated?", "From the player’s registration history: 0.25% per year at ages 12–15 and 0.5% per year at ages 16–23, capped at 5%. Code calculates it, the contract checks it."],
  ["Can the AI agent run off with the money?", "No. Its key can only call settle_due, so the blockchain rejects any transfer it tries to make."],
  ["Is this real money?", "Not yet. Everything runs on NEAR testnet with fEUR play money, where 1 fEUR stands for €1."],
];
export default function Home() {
  return <div className="home">
    <HomeMotion />
    <section className="hero" aria-labelledby="headline" data-node-id="13:3">
      <ResponsivePhoto className="hero-photo" name="imgHero" alt="A misty football pitch at daybreak" priority sizes="100vw"  />
      <div className="hero-wash" />
      <div className="hero-content">
        <span className="hero-kickoff" aria-hidden="true" />
        <h1 id="headline"><span className="hero-line"><span>Sell on installments.</span></span><span className="hero-line"><span>Never chase a payment again.</span></span></h1>
        <p>FULLBACK turns a transfer agreement into a NEAR contract. It holds the buyer’s collateral, collects every installment on time, and pays the academies that raised the player.</p>
        <div className="actions"><Link className="button" href="/signin">Create a deal</Link><a className="button secondary" href="#how-it-works">See how it works</a></div>
      </div>
    </section>
    <section className="home-section get-paid" aria-labelledby="get-paid-title">
      <h2 id="get-paid-title">Sign the deal.<br />The contract collects.</h2>
      <p className="section-copy">Selling clubs stop waiting years for the money they were promised. Every installment is enforced by code, not by lawyers.</p>
      <div className="photo-bento">
        <figure className="academy-photo photo-frame"><ResponsivePhoto name="imgPhotoYouthAcademyTrainingKidsInBibsOnAMuddyPitch" alt="Young academy players training together" sizes="(max-width: 700px) 100vw, 60vw"  /><figcaption>Academies are paid from every installment</figcaption></figure>
        <div className="bento-side"><figure className="signing-photo photo-frame"><ResponsivePhoto desktopOnly name="imgPhotoTwoClubOfficialsSigningATransferContract" alt="Club officials signing a transfer agreement" sizes="(max-width: 700px) 100vw, 30vw"  /><figcaption>Every agreement fingerprinted on-chain</figcaption></figure><article className="royalty-card"><strong>5%</strong><p>Academy royalties, paid automatically on every transfer. Same share as FIFA’s solidarity mechanism.</p></article></div>
      </div>
      <ul className="mobile-features">{["Academies are paid from every installment", "Every agreement fingerprinted on-chain"].map(text => <li key={text}><Image src="/images/mobile-check.svg" width={20} height={20} alt="" />{text}</li>)}</ul>
    </section>
    <section className="home-section how-it-works" id="how-it-works" aria-labelledby="steps-title">
      <div><h2 id="steps-title">One transfer.<br />Four steps.</h2><div className="process-journey"><span className="process-route" aria-hidden="true"><i /><b /></span><ol className="transfer-steps">{steps.map(([title, copy], i) => <li key={title}><span className="step-number">{i + 1}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol></div></div>
      <div className="stadium-photo photo-frame"><ResponsivePhoto desktopOnly name="imgPhotoStadiumStandsAtNightUnderFloodlights" alt="Football stadium under floodlights" sizes="(max-width: 700px) 100vw, 50vw"  /><RoyaltyNotification /></div>
    </section>
    <section className="home-section for-clubs" id="for-clubs" aria-labelledby="clubs-title"><h2 id="clubs-title">Built for every club in the chain.</h2><p className="section-copy">From the academy that trained a ten-year-old to the club that sells him years later, everyone owed money gets it on time. Federations can watch it all happen.</p><div className="role-grid">{roles.map(([title, copy, tag, photo]) => <article className="role-card" key={title}><div className="role-photo"><ResponsivePhoto name={photo} alt={title} desktopOnly sizes="25vw" /></div><div className="role-copy"><h3>{title}</h3><p>{copy}</p><span>{tag}</span></div></article>)}</div></section>
    <section className="home-section split-section"><div className="split-panel"><div><h2>One payment.<br />Every club paid.</h2><p>When a player is sold again, the sell-on holder and every academy are paid in the same transaction as the selling club. Example: a 20,000,000 fEUR resale.</p></div><div className="split-choreography"><button className="split-replay" type="button" hidden aria-label="Replay example payment split"><svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 7a6 6 0 1 1 0 6M4 3v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>Replay</button><span className="payment-ball" aria-hidden="true" /><svg className="payment-routes" aria-hidden="true">{[0, 1, 2, 3].map(index => <g key={index}><path /><circle cx="18" cy="5" r="3.5" /></g>)}</svg><div className="split-bar"><span /><span /><span /><span /></div><dl className="split-rows">{[["Selling club", "Remainder", "16,000,000"], ["Previous club", "Sell-on 15%", "3,000,000"], ["Academy, ages 16–23", "Royalty 4%", "800,000"], ["Academy, ages 12–15", "Royalty 1%", "200,000"]].map(([name, type, amount], i) => <div key={name}><i className={"swatch swatch-" + i} /><dt>{name}</dt><dd className="split-type">{type}</dd><dd>{amount} fEUR</dd></div>)}</dl></div></div></section>
    <section className="home-section faq" id="faq"><h2>Fair questions.</h2><FaqList questions={questions} /></section>
    <section className="home-section closing"><div className="closing-photo photo-frame"><ResponsivePhoto name="imgPhotoKidsCelebratingAGoalAtALocalAcademyGoldenHour" alt="Young footballers celebrating together at sunset" sizes="100vw"  /><div><h2>The club that raised him<br />gets paid. Every time.</h2><Link className="button" href="/signin">Create your first deal</Link></div></div></section>
    <footer className="home-footer"><div className="footer-top"><div><Brand light /><p>Transfer fees that collect and split themselves.</p></div><div className="footer-links"><div><h3>Product</h3><Link href={signInHref("/dashboard")}>Dashboard</Link><Link href={signInHref("/deals/new")}>Create a deal</Link><Link href="/verify">Verify a PDF</Link><Link href={signInHref("/federation")}>Federation view</Link></div><div><h3>Follow</h3><a href="https://x.com/NEARProtocol">X</a><a href="https://github.com/dillybrainy/fullback">GitHub</a><a href="https://testnet.nearblocks.io">NearBlocks</a></div></div></div><div className="footer-bottom"><span>© 2026 FULLBACK · Built at NEAR HACKATHON · MIT License</span><span>NEAR testnet only · fEUR is play money</span></div></footer>
  </div>;
}

