"use client";
import { useState, useSyncExternalStore } from "react";

const query = "(max-width: 700px)";
function subscribe(listener: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}
export function FaqList({ questions }: { questions: string[][] }) {
  const mobile = useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
  const [expanded, setExpanded] = useState<number | null>(0);
  return <div className="faq-list">{questions.map(([question, answer], index) => <article key={question}>
    <h3>{mobile ? <button className="faq-question" aria-expanded={expanded === index} aria-controls={"faq-answer-" + index} onClick={() => setExpanded(expanded === index ? null : index)}>{question}<svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d={expanded === index ? "M4 10h12" : "M4 10h12M10 4v12"} stroke="currentColor" strokeWidth="1.3" /></svg></button> : question}</h3>
    <div id={"faq-answer-" + index} hidden={mobile && expanded !== index} className="faq-answer"><p>{answer}</p></div>
  </article>)}</div>;
}
