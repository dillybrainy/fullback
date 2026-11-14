// Separate native mobile disclosures preserve desktop semantics without hydration.
export function FaqList({ questions }: { questions: string[][] }) {
  return <div className="faq-list"><div className="faq-desktop">{questions.map(([question, answer]) => <article key={question}><h3>{question}</h3><p>{answer}</p></article>)}</div><div className="faq-mobile">{questions.map(([question, answer], index) =>
    <details name="faq" key={question} open={index === 0}>
      <summary><h3>{question}</h3><span className="faq-indicator" aria-hidden="true" /></summary>
      <div className="faq-answer"><p>{answer}</p></div>
    </details>)}</div></div>;
}
