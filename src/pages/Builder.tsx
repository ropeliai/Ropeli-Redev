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


import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import "../styles/builder.css";

const Builder = () => {
  const [searchParams] = useSearchParams();
  const initialPrompt = searchParams.get("prompt") || "";

  const [prompt, setPrompt] = useState(initialPrompt);

  return (
    <div className="builder-layout">
      {/* LEFT PANEL */}
      <div className="builder-left">
        <h1>Building your app...</h1>

        <p className="section-label">Prompt</p>
        <textarea
          className="prompt-editor"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        <p className="section-label">Agent Status</p>
        <div className="agent-log">
          Generating architecture, UI, and logic...
        </div>

        <div className="builder-actions">
          <button className="btn deploy">Deploy</button>
          <button className="btn preview">Preview</button>
        </div>

        <div className="agent-finished">
          <span className="dot" />
          Agent Finished
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="builder-right">
        <div className="preview-header">
          <span>App Preview</span>
          <div className="preview-actions">
            <button>Share</button>
            <button>⟳</button>
            <button>⤢</button>
            <button>✕</button>
          </div>
        </div>

        <div className="preview-canvas">
          {/* Placeholder for now */}
          <div className="preview-placeholder">
            Live preview will appear here
          </div>
        </div>

        <div className="preview-footer">
          <span className="dot green" />
          This is a view-only mode. Wake the agent to interact.
        </div>
      </div>
    </div>
  );
};

export default Builder;
