import { useState } from "react";
import "../styles/faq.css";

const faqs = [
  {
    question: "How does Ropeli AI turn business ideas into MVPs instantly?",
    answer:
      "Ropeli AI builds complete apps and websites from simple prompts in minutes. No more ideas slipping away. Just say travel booking app and get a working prototype ready to test. Build fast, beat the competition, validate today.",
  },
  {
    question: "What are the daily credit limit for free and starter plan?",
    answer:
      "The daily credit limit resets every 24 hours, typically aligned with a rolling daily cycle. Once you reach your plan's daily limit, you won’t be able to use additional credits until the limit resets.",
  },
  {
    question: "What’s included in the Free plan?",
    answer:
      "The Free plan includes limited features, 1 million tokens per month limit with maximum of 2 projects. It’s a great way to try out Ropeli AI before upgrading.",
  },
  {
    question: "Can I export project to offline files or zip?",
    answer:
      "Yes, you can export projects if you are on the Root, Breeze, Peak and Sail. ",
  },
  {    question: "Can I upgrade to a higher plan?",
    answer:
      "Absolutely. You can upgrade anytime, and your usage limits will increase instantly. No data or progress will be lost.",      
  },  {
    question: "Can I purchase additional credits?",
    answer:
      "Yes, you can buy extra credits at any time from your dashboard. Purchased credits are added instantly with your current plan and can be used alongside your existing plan.",  
  },
  {    question: "Does premium plans include support?",
    answer:
      "Yes, all premium plans include dedicated support to assist you whenever needed while working on your projects. You can also share your issue on our Discord server, and our team will respond as soon as possible.",
  },  {
    question: "How can I cancel my plan anytime?",
    answer:
      "You can cancel your plan anytime from your account settings. Once canceled, your subscription will remain active until the end of the current billing cycle, and you won’t be charged again.",
  },
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="faq-section">
      <h2 className="faq-title">Frequently Asked Questions</h2>
      <p className="faq-subtitle">
        Curious minds, meet Ropeli AI. <br /> Let’s dive into the details.
      </p>

      <div className="faq-list">
        {faqs.map((faq, index) => (
          <div key={index} className="faq-item">
            <button
              className="faq-question"
              onClick={() => toggleFAQ(index)}
            >
              <span>{faq.question}</span>
              <span className="faq-icon">
                {openIndex === index ? "−" : "+"}
              </span>
            </button>

            {openIndex === index && (
              <div className="faq-answer">{faq.answer}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default FAQSection;
