"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";

export function RoyaltyNotification() {
  const receipt = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = receipt.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      animation = element.animate(
        [{ opacity: .4, transform: "translateY(18px) scale(.98)" }, { opacity: 1, transform: "none" }],
        { duration: 540, easing: "cubic-bezier(.16,1,.3,1)" },
      );
      observer.disconnect();
    }, { threshold: .7 });
    observer.observe(element);
    return () => { observer.disconnect(); animation?.cancel(); };
  }, []);
  return <div className="royalty-notification" ref={receipt}><span className="notification-icon"><Image src="/images/imgLogoGoalFrame1.svg" alt="" width={28} height={28} /></span><div><div className="notification-top"><strong>FULLBACK</strong><span>now</span></div><strong>Academy royalty received</strong><p>100,000 fEUR · installment 1 of 4</p></div></div>;
}
