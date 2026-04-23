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
    name: "",
    role: "",
    customRole: "",
    source: "",
  });

  const next = () => setStep((s) => s + 1);
  const back = () => setStep((s) => s - 1);

  const updateForm = (
    key: keyof typeof form,
    value: string
  ) => {
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
      name: form.name,
      role: form.role === "Other" ? form.customRole : form.role,
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

  const roleOptions = [
    "Founder",
    "Engineer",
    "Designer",
    "Marketing",
    "Other",
  ];

  const sourceOptions = [
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

        {/* STEP 1 — NAME */}
        {step === 1 && (
          <>
            <h3>What should we call you?</h3>

            <input
              type="text"
              placeholder="Enter your name"
              value={form.name}
              onChange={(e) =>
                updateForm("name", e.target.value)
              }
              style={{
                width: "90%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #444",
                background: "#111",
                color: "#fff",
                marginTop: "12px",
              }}
            />

            <button
              disabled={!form.name.trim()}
              onClick={next}
            >
              Next
            </button>
          </>
        )}

        {/* STEP 2 — ROLE */}
        {step === 2 && (
          <>
            <h3>Which role suits you best?</h3>

            {roleOptions.map((v) => (
              <label
                key={v}
                className={`option ${
                  form.role === v ? "selected" : ""
                }`}
              >
                <input
                  type="radio"
                  checked={form.role === v}
                  onChange={() =>
                    updateForm("role", v)
                  }
                />
                <span>{v}</span>
              </label>
            ))}

            {form.role === "Other" && (
              <input
                type="text"
                placeholder="Please specify your role"
                value={form.customRole}
                onChange={(e) =>
                  updateForm(
                    "customRole",
                    e.target.value
                  )
                }
                style={{
                  width: "90%",
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #444",
                  background: "#111",
                  color: "#fff",
                  marginTop: "12px",
                }}
              />
            )}

            <div className="actions">
              <button onClick={back}>Back</button>
              <button
                disabled={
                  !form.role ||
                  (form.role === "Other" &&
                    !form.customRole.trim())
                }
                onClick={next}
              >
                Next
              </button>
            </div>
          </>
        )}

        {/* STEP 3 — SOURCE */}
        {step === 3 && (
          <>
            <h3>Where did you hear about us?</h3>

            {sourceOptions.map((v) => (
              <label
                key={v}
                className={`option ${
                  form.source === v
                    ? "selected"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  checked={form.source === v}
                  onChange={() =>
                    updateForm("source", v)
                  }
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

        <span className="step-indicator">
          {step} of 3
        </span>
      </div>
    </div>
  );
};

export default OnboardingModal;
