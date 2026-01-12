import { useState } from "react";
import "../styles/onboarding.css";

type Props = {
  onComplete: (data: any) => void;
};

const OnboardingModal = ({ onComplete }: Props) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    expertise: "",
    goal: "",
    source: "",
  });

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <h2>Let’s get Started</h2>
        <p>Answer a few quick questions to personalize your experience</p>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <h3>What’s your technical expertise?</h3>
            {[
              "I’m a beginner coder",
              "I’m an intermediate coder",
              "I’m an experienced coder",
              "I don’t know how to code",
            ].map((v) => (
              <label key={v} className="option">
                <input
                  type="radio"
                  name="expertise"
                  value={v}
                  onChange={() => setForm({ ...form, expertise: v })}
                />
                {v}
              </label>
            ))}
            {/* button styling need to be changed */}
            <button disabled={!form.expertise} onClick={next}>
              Next
            </button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <h3>What’s your primary goal for the next 0–4 weeks?</h3>
            {[
              "Indie/personal project — exploring or prototyping",
              "Launch a business app",
              "Prepare to publish soon",
              "Learning only",
              "Launch a client’s app",
              "Other",
            ].map((v) => (
              <label key={v} className="option">
                <input
                  type="radio"
                  name="goal"
                  value={v}
                  onChange={() => setForm({ ...form, goal: v })}
                />
                {v}
              </label>
            ))}

            <div className="actions">
              <button onClick={back}>Back</button>
              <button disabled={!form.goal} onClick={next}>
                Next
              </button>
            </div>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <h3>How did you hear about us?</h3>
            {[
              "Google / Search Engine",
              "Article",
              "A friend / referral",
              "TikTok",
              "X / Twitter",
              "Instagram",
            ].map((v) => (
              <label key={v} className="option">
                <input
                  type="radio"
                  name="source"
                  value={v}
                  onChange={() => setForm({ ...form, source: v })}
                />
                {v}
              </label>
            ))}

            <div className="actions">
              <button onClick={back}>Back</button>
              <button
                disabled={!form.source}
                onClick={() => onComplete(form)}
              >
                Done
              </button>
            </div>
          </>
        )}

        <span className="step-indicator">{step} of 3</span>
      </div>
    </div>
  );
};

export default OnboardingModal;
