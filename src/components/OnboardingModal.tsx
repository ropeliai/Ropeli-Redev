import { useState } from "react";
import { supabase } from "../lib/supabase";
import "../styles/onboarding.css";

type Props = {
  onComplete: () => void;
};

const OnboardingModal = ({ onComplete }: Props) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    expertise: "",
    goal: "",
    source: "",
  });

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const submitOnboarding = async () => {
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("User not authenticated");
      setLoading(false);
      return;
    }

    const { error } = await supabase.from("user_onboarding").insert({
      user_id: user.id,
      expertise: form.expertise,
      goal: form.goal,
      source: form.source,
    });

    if (error) {
      console.error("Failed to save onboarding:", error);
      setLoading(false);
      return;
    }

    setLoading(false);
    onComplete();
  };

  const optionsStep1 = [
    "I’m a beginner ",
    "I’m an intermediate ",
    "I’m an experienced ",
    "I don’t know how to code",
  ];

  const optionsStep2 = [
    "Indie/personal project — exploring or prototyping",
    "Launch a business app",
    "Prepare to publish soon",
    "Learning only",
    "Other",
  ];

  const optionsStep3 = [
    "Google / Search Engine",
    "Article",
    "A friend / referral",
    "X / Twitter",
    "Instagram",
  ];

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-modal">
        <h2 style={{ margin: "0px" }}>Let’s get Started</h2>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <h3>What’s your technical expertise?</h3>
            {optionsStep1.map((v) => (
              <label
                key={v}
                className={`option ${form.expertise === v ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  checked={form.expertise === v}
                  onChange={() => updateForm("expertise", v)}
                />
                <span>{v}</span>
              </label>
            ))}
            <button disabled={!form.expertise} onClick={next}>
              Next
            </button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <h3>What’s your primary goal for the next 0–4 weeks?</h3>
            {optionsStep2.map((v) => (
              <label
                key={v}
                className={`option ${form.goal === v ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  checked={form.goal === v}
                  onChange={() => updateForm("goal", v)}
                />
                <span>{v}</span>
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
            {optionsStep3.map((v) => (
              <label
                key={v}
                className={`option ${form.source === v ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  checked={form.source === v}
                  onChange={() => updateForm("source", v)}
                />
                <span>{v}</span>
              </label>
            ))}
            <div className="actions">
              <button onClick={back}>Back</button>
              <button
                disabled={!form.source || loading}
                onClick={submitOnboarding}
              >
                {loading ? "Saving..." : "Done"}
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
