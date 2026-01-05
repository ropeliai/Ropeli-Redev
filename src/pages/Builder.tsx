{/*import { useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";

type BuilderState = {
  prompt?: string;
  image?: string | null;
};

const Builder = () => {
  const location = useLocation();
  const state = location.state as BuilderState | null;

  // Guard: prevent direct access
  if (!state?.prompt) {
    return <Navigate to="/" replace />;
  }

  const { prompt, image } = state;

  useEffect(() => {
    // This is where you will later:
    // 1. Save prompt to Supabase
    // 2. Trigger AI generation
    // 3. Redirect to /workspace/:id
    console.log("Prompt received:", prompt);
  }, [prompt]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "white",
        padding: "4rem 2rem"
      }}
    >
      <h1 style={{ fontSize: "2rem" }}>Building your app…</h1>

      <p style={{ marginTop: "1rem", opacity: 0.7 }}>
        Prompt received
      </p>

      <div
        style={{
          marginTop: "1rem",
          padding: "1rem",
          borderRadius: "12px",
          background: "rgba(255,255,255,0.08)",
          maxWidth: "800px"
        }}
      >
        {prompt}
      </div>

      {image && (
        <img
          src={image}
          alt="prompt input"
          style={{
            marginTop: "1.5rem",
            maxWidth: "300px",
            borderRadius: "12px"
          }}
        />
      )}

      <div style={{ marginTop: "2rem", opacity: 0.6 }}>
        Generating architecture, UI, and logic…
      </div>
    </div>
  );
};

export default Builder;

{/*}
*/}
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import "../styles/builder.css";

const DEFAULT_ASSISTANT_MESSAGE = `
Welcome to Ropeli - your single destination to build and deploy production-ready applications!
It looks like you're aiming to create a delightful landing page for a home baking service, complete with all the sweet details like delicious photos, pricing, and a smooth ordering process.
I'll make sure your vision for this warm and inviting space comes to life, so customers can easily browse and add their favorite treats to their cart.
I'll start building this now.
`;

const ANIMATED_TEXTS = [
  "Ship ideas to live apps in minutes",
  "Create mobile apps from scratch",
  "Design, build, and deploy faster",
  "Turn prompts into products"
];

export default function Builder() {
  const location = useLocation();
  const initialPrompt = location.state?.prompt || "";

  const [messages, setMessages] = useState<any[]>([]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [textIndex, setTextIndex] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);

  /* Initialize messages */
  useEffect(() => {
    if (initialPrompt) {
      setMessages([
        { role: "user", content: initialPrompt },
        { role: "assistant", content: DEFAULT_ASSISTANT_MESSAGE }
      ]);
    }
  }, [initialPrompt]);

  /* Auto scroll chat */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* Animated text */
  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % ANIMATED_TEXTS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleSend = () => {
    if (!prompt.trim()) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: prompt }
    ]);
    setPrompt("");
  };

  return (
    <div className="builder-root">
      {/* LEFT SIDE */}
      <div className="builder-left">
        <div className="chat-area">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`chat-bubble ${msg.role}`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* PROMPT BOX (same UX as Hero) */}
        <div className="builder-prompt">
          <textarea
            placeholder="Describe what you want to build..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <button onClick={handleSend}>↑</button>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className={`builder-right ${previewOpen ? "open" : "closed"}`}>
        {/* TOP CONTROLS */}
        <div className="builder-top-tabs">
          <button>Code</button>
          <button
            className={!previewOpen ? "active" : ""}
            onClick={() => setPreviewOpen(true)}
          >
            Preview
          </button>
          <button>Deploy</button>
        </div>

        {/* PREVIEW */}
        {previewOpen && (
          <div className="preview-panel">
            <div className="preview-header">
              <span>App Preview</span>
              <button onClick={() => setPreviewOpen(false)}>✕</button>
            </div>

            <div className="preview-content">
              <img src="/public/logo.svg" className="preview-logo" alt="logo"/>
              <p className="preview-animated">
                {ANIMATED_TEXTS[textIndex]}
              </p>

              {/*<button className="preview-cta">
                Let’s make something incredible!
              </button>*/}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
