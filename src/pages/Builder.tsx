import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  "Turn prompts into products",
];







type FigmaState = "idle" | "loading" | "success" | "error";

export default function Builder() {
  const location = useLocation();
  const navigate = useNavigate();

const fileInputRef = useRef<HTMLInputElement | null>(null);
const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files) {
    setAttachedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    e.target.value = "";
  } 
};

  /* ===== INITIAL DATA FROM HERO ===== */
  const initialPrompt = location.state?.prompt || "";
  const initialDesign = location.state?.design || null;

  /* ===== CHAT STATE ===== */
  const [messages, setMessages] = useState<any[]>([]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [attachedDesign, setAttachedDesign] = useState<any>(initialDesign);

  /* ===== UI STATE ===== */
  const [previewOpen, setPreviewOpen] = useState(true);
  const [textIndex, setTextIndex] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  /* ===== FIGMA STATE ===== */
  const [figmaOpen, setFigmaOpen] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaState, setFigmaState] = useState<FigmaState>("idle");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const previewLink = "https://preview.ropeli.ai/generated-app";

  /* ===== INITIALIZE CHAT (FROM HERO) ===== */
  useEffect(() => {
    if (!initialPrompt) return;

    const userMessage: any = {
      role: "user",
      content: initialPrompt,
    };

    if (initialDesign) {
      userMessage.design = initialDesign;
    }

    setMessages([
      userMessage,
      { role: "assistant", content: DEFAULT_ASSISTANT_MESSAGE },
    ]);
  }, [initialPrompt, initialDesign]);

  /* ===== AUTO SCROLL ===== */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ===== PREVIEW TEXT ANIMATION ===== */
  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % ANIMATED_TEXTS.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  /* ===== SEND MESSAGE ===== */
  const handleSend = () => {
    if (!prompt.trim()) return;

 setMessages((prev) => [
  ...prev,
  {
    role: "user",
    content: prompt,
    design: attachedDesign,
    files: attachedFiles,
  },
]);

setAttachedFiles([]);

    setPrompt("");
  };

  /* ===== FIGMA IMPORT FLOW ===== */
  const startFigmaImport = () => {
    if (!figmaUrl.trim()) return;

    const isValid =
      figmaUrl.includes("figma.com/file/") ||
      figmaUrl.includes("figma.com/design/");

    if (!isValid) {
      setFigmaState("error");
      return;
    }

    setFigmaState("loading");

    // frontend mock (backend later)
    setTimeout(() => {
      const design = {
        type: "figma",
        url: figmaUrl,
        importedAt: Date.now(),
      };

      setAttachedDesign(design);
      setFigmaState("success");
      setFigmaUrl("");

      setTimeout(() => {
        setFigmaOpen(false);
        setFigmaState("idle");
      }, 1000);
    }, 1500);
  };

  return (
    <section className="builder-page">
      {/* ===== TOP BAR ===== */}
      <div className="builder-topbar-full">
        <div className="topbar-left">
          <button className="home-btn" onClick={() => navigate("/")}>
            <img src="/logo.svg" alt="Home" />
          </button>

          <div className="builder-top-tabs">
            <button>Code</button>
            <button className="active">Preview</button>
            <button>Deploy</button>
          </div>
        </div>

        <div className="topbar-right">
          <button onClick={() => setInviteOpen(true)}>Invite</button>
          <button onClick={() => setShareOpen(true)}>Share</button>
        </div>
      </div>

      {/* ===== MAIN ===== */}
      <div className="builder-root">
        {/* LEFT */}
        <div className="builder-left">
          <div className="chat-area">
            {messages.map((msg, i) => (
  <div key={i} className={`chat-bubble ${msg.role}`}>
    {/* Figma attachment */}
    {msg.design && (
      <div className="chat-design-attachment">
        🎨 Figma design attached
        <a
          href={msg.design.url}
          target="_blank"
          rel="noreferrer"
        >
          Open in Figma
        </a>
      </div>
    )}

    {/* File attachments */}
    {msg.files && msg.files.length > 0 && (
      <div className="chat-file-attachments">
        {msg.files.map((file: File, idx: number) => (
          <div key={idx} className="chat-file">
            📎 {file.name}
          </div>
        ))}
      </div>
    )}

    {/* Message text */}
    <div>{msg.content}</div>
  </div>
))}

            <div ref={chatEndRef} />
          </div>

          {/* ===== PROMPT ===== */}
          <div className="builder-prompt">
            {attachedDesign && (
              <div className="design-badge">
                🎨 Figma design attached
                <button onClick={() => setAttachedDesign(null)}>×</button>
              </div>
            )}
            {attachedFiles.length > 0 && (
  <div className="file-attachments">
    {attachedFiles.map((file, i) => (
      <div key={i} className="file-chip">
        📎 {file.name}
        <button
          onClick={() =>
            setAttachedFiles((prev) =>
              prev.filter((_, idx) => idx !== i)
            )
          }
        >
          ×
        </button>
      </div>
    ))}
  </div>
)}


            <textarea
              className="builder-textarea"
              placeholder="Describe what you want to build…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />

            <div className="builder-prompt-footer">
              <div className="prompt-footer-left">
                <button className="icon-btn" onClick={() => fileInputRef.current?.click()}>
                  +
                </button>
                <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileSelect}/>


                <button
                  className="figma-btn"
                  onClick={() => setFigmaOpen(true)}
                >
                  <img src="/figma.png" alt="Figma" />
                </button>
              </div>

              <div className="prompt-footer-right">
                <button className="icon-btn mic-btn">🎤</button>
                <button className="send-btn" onClick={handleSend}>
                  ↑
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="builder-right">
          {previewOpen && (
            <div className="preview-panel">
              <div className="preview-header">
                <span>App Preview</span>
                <button onClick={() => setPreviewOpen(false)}>✕</button>
              </div>

              <div className="preview-content">
                <p className="preview-animated">
                  {ANIMATED_TEXTS[textIndex]}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>


      
      {/* ===== INVITE MODAL ===== */}
      {inviteOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <span>Invite collaborator</span>
              <button onClick={() => setInviteOpen(false)}>✕</button>
            </div>
            <input type="email" placeholder="Enter email address" />
            <button className="primary">Send Invite</button>
          </div>
        </div>
      )}


      {/* ===== SHARE MODAL ===== */}
      {shareOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <span>Share preview</span>
              <button onClick={() => setShareOpen(false)}>✕</button>
            </div>

            <div className="share-link">
              <input value={previewLink} readOnly />
              <button
                onClick={() => navigator.clipboard.writeText(previewLink)}
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ===== FIGMA MODAL ===== */}
      {figmaOpen && (
        <div
          className="figma-modal-overlay"
          onClick={() => setFigmaOpen(false)}
        >
          <div
            className="figma-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="figma-close"
              onClick={() => setFigmaOpen(false)}
            >
              ×
            </button>

            <div className="figma-logo">
              <img src="/figma.png" alt="Figma" />
            </div>

            <h3>Figma frame or file import</h3>

            {figmaState === "idle" && (
              <>
                <input
                  placeholder="Paste Figma file or frame URL"
                  value={figmaUrl}
                  onChange={(e) => setFigmaUrl(e.target.value)}
                />
                <button
                  className="figma-import-btn"
                  onClick={startFigmaImport}
                >
                  Import
                </button>
              </>
            )}

            {figmaState === "loading" && (
              <div className="figma-loading">
                ⏳ Importing design…
              </div>
            )}

            {figmaState === "success" && (
              <div className="figma-success">
                ✅ Design attached successfully
              </div>
            )}

            {figmaState === "error" && (
              <div className="figma-error">
                ❌ Please enter a valid Figma URL
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
