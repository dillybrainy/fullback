import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(ScrollTrigger, CustomEase);
const settle = CustomEase.create("fullback-settle", ".16,1,.3,1");

/** Home-only choreography. Copy and data remain visible without this module.
 * @param {HTMLElement} root
 */
export function installHomeMotion(root) {
  const media = gsap.matchMedia();
  media.add("(prefers-reduced-motion: no-preference)", () => {
    const select = gsap.utils.selector(root);
    const events = [];
    const listen = (element, event, handler) => {
      element.addEventListener(event, handler);
      events.push(() => element.removeEventListener(event, handler));
    };
    let disposed = false;
    let refreshFrame = 0;
    const refresh = () => {
      cancelAnimationFrame(refreshFrame);
      refreshFrame = requestAnimationFrame(() => { if (!disposed) ScrollTrigger.refresh(); });
    };

    // Kick-off: a short pass cues two headline beats; links never move.
    const hero = gsap.timeline({
      id: "fullback-hero", defaults: { ease: settle },
      scrollTrigger: { trigger: select(".hero")[0], start: "top 85%", once: true },
    });
    hero.addLabel("kickoff", 0)
      .fromTo(select(".hero-kickoff"), { x: 0, rotation: 0, opacity: 0 }, { opacity: 1, duration: .12 }, "kickoff")
      .to(select(".hero-kickoff"), { x: 96, rotation: 270, duration: .55 }, "kickoff")
      .to(select(".hero-kickoff"), { opacity: 0, duration: .16 }, "kickoff+=.4")
      .addLabel("headline", .12)
      .fromTo(select(".hero-line > span"), { yPercent: 65, opacity: .6 },
        { yPercent: 0, opacity: 1, duration: .8, stagger: .13, clearProps: "transform,opacity" }, "headline")
      .fromTo(select(".hero-photo"), { scale: 1.035 },
        { scale: 1, duration: 1.3, clearProps: "transform" }, "kickoff");

    // A touchline connects numbered stops. Text and layout stay still.
    const journey = select(".process-journey")[0];
    const numbers = select(".step-number");
    const route = select(".process-route")[0];
    const fill = route.querySelector("i");
    const marker = route.querySelector("b");
    const position = number => number.parentElement.offsetTop + number.offsetTop;
    const distanceTo = index => position(numbers[index]) - position(numbers[0]);
    const distance = () => distanceTo(numbers.length - 1);
    const placeRoute = () => {
      gsap.set(route, {
        display: "block", height: distance(),
        top: position(numbers[0]) + numbers[0].offsetHeight / 2,
        left: numbers[0].offsetWidth / 2,
      });
    };
    placeRoute();
    const process = gsap.timeline({
      id: "fullback-process", defaults: { ease: "none" },
      scrollTrigger: {
        id: "fullback-process", trigger: numbers[0], endTrigger: numbers.at(-1),
        start: "top 78%", end: "top 45%", scrub: .15,
        invalidateOnRefresh: true, onRefresh: placeRoute,
      },
    });
    process.set(fill, { scaleY: 0 }, 0).set(marker, { y: 0 }, 0);
    numbers.slice(1).forEach((_, index) => {
      process.to(fill, { scaleY: () => distanceTo(index + 1) / distance(), duration: 1 }, index)
        .to(marker, { y: () => distanceTo(index + 1), duration: 1 }, index);
    });
    numbers.forEach((number, index) => {
      process.addLabel("step-" + (index + 1), index)
        .to(number, { backgroundColor: "#ffd60a", borderColor: "#13235b", scale: 1.08, duration: .14 }, "step-" + (index + 1))
        .to(number, {
          backgroundColor: () => getComputedStyle(journey).getPropertyValue("--step-surface"),
          borderColor: () => getComputedStyle(journey).getPropertyValue("--step-border"),
          scale: 1, duration: .26,
        }, "step-" + (index + 1) + "+=.18");
    });
    process.fromTo(select(".royalty-notification"), { x: 12 },
      { x: 0, duration: .35, ease: settle }, "step-4");

    // One incoming payment branches to four recipients. Values never move/count.
    const panel = select(".split-panel")[0];
    const diagram = select(".split-choreography")[0];
    const bar = select(".split-bar")[0];
    const ball = select(".payment-ball");
    const paths = select(".payment-routes path");
    const packets = select(".payment-routes circle");
    const swatches = select(".split-rows .swatch");
    const svg = select(".payment-routes")[0];
    let destinations = [];
    const measurePayment = () => {
      const box = diagram.getBoundingClientRect();
      destinations = swatches.map(swatch => {
        const rect = swatch.getBoundingClientRect();
        return { x: rect.left - box.left + 12 + rect.width / 2, y: rect.top - box.top + rect.height / 2 };
      });
      // The routing gutter stays beside labels, never across text or amounts.
      paths.forEach((path, index) => {
        const { x, y } = destinations[index];
        path.setAttribute("d", `M 18 5 Q 6 5 6 17 L 6 ${y - 10} Q 6 ${y} ${x} ${y}`);
      });
      svg.setAttribute("viewBox", `0 0 ${box.width + 12} ${box.height}`);
    };
    measurePayment();
    const replay = select(".split-replay")[0];
    const payment = gsap.timeline({
      id: "fullback-payment", paused: true, defaults: { ease: settle },
      onStart: () => replay.setAttribute("aria-disabled", "true"),
      onComplete: () => replay.setAttribute("aria-disabled", "false"),
    });
    payment.addLabel("receive", 0)
      .fromTo(ball, { x: () => bar.offsetWidth * .6, y: -16, rotation: 0, opacity: 0 },
        { x: 0, y: -1, rotation: -360, opacity: 1, duration: .5 }, "receive")
      .to(ball, { opacity: 0, duration: .12 }, "receive+=.45")
      .addLabel("distribute", .5)
      .fromTo(paths, { opacity: 0 }, { opacity: .3, duration: .18 }, "distribute");
    packets.forEach((packet, index) => {
      const position = .5 + index * .09;
      payment.fromTo(packet, { attr: { cx: 18, cy: 5 }, opacity: 0 },
        { opacity: 1, duration: .08 }, position)
        .to(packet, { attr: { cx: 6, cy: 17 }, duration: .1 }, position)
        .to(packet, { attr: { cy: () => destinations[index].y }, duration: .45, ease: "power1.inOut" }, position + .1)
        .to(packet, { attr: { cx: () => destinations[index].x }, duration: .12 }, position + .55)
        .to(packet, { opacity: 0, duration: .12 }, position + .67)
        .fromTo(swatches[index], { scale: 1 }, { scale: 1.5, duration: .14 }, position + .6)
        .to(swatches[index], { scale: 1, duration: .24 }, position + .74);
    });
    payment.to(paths, { opacity: 0, duration: .2 }, "distribute+=1.05");
    replay.hidden = false;
    const playPayment = () => {
      if (payment.isActive() || document.hidden) return;
      measurePayment();
      payment.invalidate().restart();
    };
    ScrollTrigger.create({
      id: "fullback-payment", trigger: panel, start: "top 72%", once: true,
      onEnter: playPayment,
    });
    listen(replay, "click", playPayment);
    listen(document, "visibilitychange", () => {
      if (document.hidden) { hero.progress(1); payment.progress(1).pause(); }
    });
    // Native accordion, fonts, and late photos can change trigger positions.
    root.querySelectorAll("details").forEach(details => listen(details, "toggle", refresh));
    root.querySelectorAll("img").forEach(img => { if (!img.complete) listen(img, "load", refresh); });
    document.fonts.ready.then(() => { if (!disposed) refresh(); });
    listen(window, "resize", measurePayment);
    return () => {
      disposed = true;
      cancelAnimationFrame(refreshFrame);
      events.forEach(remove => remove());
      replay.hidden = true;
      replay.removeAttribute("aria-disabled");
      route.removeAttribute("style");
      paths.forEach(path => path.removeAttribute("d"));
      svg.removeAttribute("viewBox");
    };
  }, root);
  return () => media.revert();
}
