const faqs = [
  {
    q: "How does Ropeli work?",
    a: "You enter a prompt, and Ropeli generates a live web or mobile app instantly.",
  },
  {
    q: "Can I edit apps after generation?",
    a: "Yes, you can chat and iterate on your app in real time.",
  },
  {
    q: "Is coding required?",
    a: "No coding required. Everything is prompt-driven.",
  },
];

export default function FAQs() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-20">
      <h2 className="text-3xl font-bold text-white text-center mb-10">
        Frequently Asked Questions
      </h2>

      <div className="space-y-4">
        {faqs.map((faq, i) => (
          <details
            key={i}
            className="group bg-white/5 border border-white/10 rounded-xl p-5"
          >
            <summary className="cursor-pointer text-white font-medium flex justify-between">
              {faq.q}
              <span className="group-open:rotate-180 transition">⌄</span>
            </summary>
            <p className="text-gray-400 mt-3">{faq.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
