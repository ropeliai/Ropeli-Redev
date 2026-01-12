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


type MobileView = "chat" | "code" | "preview";
const [mobileView, setMobileView] = useState<MobileView>("chat");




  type PreviewSize = "desktop" | "tablet" | "mobile";
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");

  
const fileInputRef = useRef<HTMLInputElement | null>(null);
const initialFiles = location.state?.files || [];
const [attachedFiles, setAttachedFiles] = useState<File[]>(initialFiles);

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files) return;
  const newFiles = Array.from(e.target.files);
  setAttachedFiles((prev) => [...prev, ...newFiles]);
  // 🔥 force focus back to textarea so UI updates before Enter
  requestAnimationFrame(() => {
    document.querySelector<HTMLTextAreaElement>(".builder-textarea")?.focus();
  });

  e.target.value = "";
};


const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
const [selectedFile, setSelectedFile] = useState<string>("src/pages/Index.tsx");




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
  if (!initialPrompt && initialFiles.length === 0 && !initialDesign) return;

  const userMessage: any = {
    role: "user",
    content: initialPrompt,
    files: initialFiles,
    design: initialDesign,
  };

  setMessages([
    userMessage,
    { role: "assistant", content: DEFAULT_ASSISTANT_MESSAGE },
  ]);

/* ===== SAVE RECENT TASK ===== */
const recentTask = {
  id: Date.now().toString(),
  prompt: initialPrompt,
  createdAt: new Date().toISOString(),
};

const existing = JSON.parse(
  localStorage.getItem("recentTasks") || "[]"
);

localStorage.setItem(
  "recentTasks",
  JSON.stringify([recentTask, ...existing])
);



  // 🔥 clear prompt attachments after first send
  setAttachedFiles([]);
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
  files: attachedFiles,
  design: attachedDesign,
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
    {/* ================= TOP BAR ================= */}
    <div className="builder-topbar-full">
      {/* LEFT */}
      <div className="topbar-left">
        <button className="home-btn" onClick={() => navigate("/")}>
          <img src="/back1.png" alt="Home" />
        </button>

        {initialPrompt && (
          <div className="topbar-prompt" title={initialPrompt}>
            {initialPrompt}
          </div>
        )}
      </div>

      {/* CENTER (DESKTOP ONLY) */}
      <div className="topbar-center desktop-only">
        <div className="builder-top-tabs">
          <button
            className={activeTab === "code" ? "active" : ""}
            onClick={() => setActiveTab("code")}
          >
            Code
          </button>
          <button
            className={activeTab === "preview" ? "active" : ""}
            onClick={() => setActiveTab("preview")}
          >
            Preview
          </button>
        </div>

        <div className="topbar-route-pill">
          <div className="route-devices">
            <button
              className={`device-btn ${previewSize === "desktop" ? "active" : ""}`}
              onClick={() => setPreviewSize("desktop")}
            >
              <img src="https://static.vecteezy.com/system/resources/previews/025/916/231/non_2x/laptop-illustration-notebook-flat-icon-pc-symbol-simple-business-concept-pictogram-on-isolated-background-vector.jpg" />
            </button>

            <button
              className={`device-btn ${previewSize === "tablet" ? "active" : ""}`}
              onClick={() => setPreviewSize("tablet")}
            >
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTnE4ctehpHevnAKSkv-Bz1R4EA7Qk8ohWXcw&s" />
            </button>

            <button
              className={`device-btn ${previewSize === "mobile" ? "active" : ""}`}
              onClick={() => setPreviewSize("mobile")}
            >
              <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRXZ_r3QX3Ui_h9sf0MP7RM52jMNdZyfuyzTg&s" />
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="topbar-right">
        <button className="desktop-only" onClick={() => setInviteOpen(true)}>Invite</button>
        <button className="desktop-only" onClick={() => setShareOpen(true)}>Share</button>
        <button className="desktop-only deploy-btn">Deploy</button>

        {/* Mobile 3-dots */}
        <button className="mobile-only mobile-menu-btn" onClick={() => setShareOpen(true)}>
          ⋮
        </button>
      </div>
    </div>

    {/* ================= DESKTOP BUILDER ================= */}
    <div className="builder-root desktop-only">
      {/* CHAT */}
      <div className="builder-left">
        <div className="chat-area">
          {messages.map((msg, i) => (
            <div key={i} className={`chat-bubble ${msg.role}`}>
              {msg.design && (
                <div className="chat-design-attachment">
                  Figma design attached
                  <a href={msg.design.url} target="_blank" rel="noreferrer">
                    Open in Figma
                  </a>
                </div>
              )}

              {msg.files && msg.files.length > 0 && (
                <div className="chat-file-attachments">
                  {msg.files.map((file: File, idx: number) => (
                    <div key={idx} className="chat-file">
                      {file.name}
                    </div>
                  ))}
                </div>
              )}

              <div>{msg.content}</div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* PROMPT */}
        <div className="builder-prompt">
          {attachedDesign && (
            <div className="design-badge">
              Figma design attached
              <button onClick={() => setAttachedDesign(null)}>×</button>
            </div>
          )}

          {attachedFiles.length > 0 && (
            <div className="design-badge">
              {attachedFiles.map((file, i) => (
                <div key={i} className="file-chip">
                  {file.name}
                  <button onClick={() =>
                    setAttachedFiles(prev => prev.filter((_, idx) => idx !== i))
                  }>×</button>
                </div>
              ))}
            </div>
          )}

          <textarea
            className="builder-textarea"
            placeholder="Describe what you want to build…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (prompt.trim() || attachedFiles.length > 0) handleSend();
              }
            }}
          />

          <div className="builder-prompt-footer">
            <div className="prompt-footer-left">
              <button className="icon-btn" onClick={() => fileInputRef.current?.click()}>+</button>
              <input ref={fileInputRef} type="file" hidden multiple onChange={handleFileSelect} />

              <button className="figma-btn" onClick={() => setFigmaOpen(true)}>
                <img src="/figma.png" />
              </button>
            </div>

            <div className="prompt-footer-right">
              <button className="send-btn" onClick={handleSend}>↑</button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="builder-right">
        {activeTab === "preview" && (
          <div className={`preview-panel ${previewSize}`}>
            <div className="preview-content">
              <p className="preview-animated">{ANIMATED_TEXTS[textIndex]}</p>
            </div>
          </div>
        )}

        {activeTab === "code" && (
          <div className="code-panel">
            <div className="code-explorer">
              <div className="explorer-header">Files</div>
              <div className="file-tree">
                <div className="folder">src</div>
                <div className="file active">Index.tsx</div>
              </div>
            </div>

            <div className="code-editor">
              <div className="editor-header">{selectedFile}</div>
              <pre className="editor-content">
{`export default function App() {
  return <div>Hello Ropeli</div>;
}`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* ================= MOBILE BUILDER ================= */}
    <div className="builder-root mobile-only">
      {mobileView === "chat" && (
  <div className="builder-left">
    <div className="chat-area">
      {messages.map((msg, i) => (
        <div key={i} className={`chat-bubble ${msg.role}`}>
          {msg.design && (
            <div className="chat-design-attachment">
              Figma design attached
              <a href={msg.design.url} target="_blank" rel="noreferrer">
                Open in Figma
              </a>
            </div>
          )}

          {msg.files && msg.files.length > 0 && (
            <div className="chat-file-attachments">
              {msg.files.map((file: File, idx: number) => (
                <div key={idx} className="chat-file">
                  {file.name}
                </div>
              ))}
            </div>
          )}

          <div>{msg.content}</div>
        </div>
      ))}
      <div ref={chatEndRef} />
    </div>

    {/* PROMPT */}
    <div className="builder-prompt">
      {attachedDesign && (
        <div className="design-badge">
          Figma design attached
          <button onClick={() => setAttachedDesign(null)}>×</button>
        </div>
      )}

      {attachedFiles.length > 0 && (
        <div className="design-badge">
          {attachedFiles.map((file, i) => (
            <div key={i} className="file-chip">
              {file.name}
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
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (prompt.trim() || attachedFiles.length > 0) {
              handleSend();
            }
          }
        }}
      />

      <div className="builder-prompt-footer">
        <div className="prompt-footer-left">
          <button
            className="icon-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            +
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={handleFileSelect}
          />

          <button className="figma-btn" onClick={() => setFigmaOpen(true)}>
            <img src="/figma.png" alt="Figma" />
          </button>
        </div>

        <div className="prompt-footer-right">
          <button className="send-btn" onClick={handleSend}>
            ↑
          </button>
        </div>
      </div>
    </div>
  </div>
)}


      {mobileView === "preview" && (
        <div className="builder-right">
          <div className={`preview-panel ${previewSize}`}>
            <div className="preview-content">
              <p className="preview-animated">{ANIMATED_TEXTS[textIndex]}</p>
            </div>
          </div>
        </div>
      )}

      {mobileView === "code" && (
        <div className="builder-right">
          <div className="code-panel">
            <div className="code-editor">
              <pre className="editor-content">Mobile code view</pre>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* ================= MOBILE BOTTOM NAV ================= */}
    <div className="builder-mobile-nav mobile-only">
      <button className={mobileView === "chat" ? "active" : ""} onClick={() => setMobileView("chat")}>Chat</button>
      <button className={mobileView === "code" ? "active" : ""} onClick={() => setMobileView("code")}>Code</button>
      <button className={mobileView === "preview" ? "active" : ""} onClick={() => setMobileView("preview")}>Preview</button>
    </div>

    {/* ================= MODALS ================= */}
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

    {shareOpen && (
      <div className="modal-backdrop">
        <div className="modal">
          <div className="modal-header">
            <span>Share preview</span>
            <button onClick={() => setShareOpen(false)}>✕</button>
          </div>
          <div className="share-link">
            <input value={previewLink} readOnly />
            <button onClick={() => navigator.clipboard.writeText(previewLink)} className="copy-button">Copy</button>
          </div>
        </div>
      </div>
    )}
    {figmaOpen && (
  <div className="figma-modal-overlay" onClick={() => setFigmaOpen(false)}>
    <div className="figma-modal" onClick={(e) => e.stopPropagation()} >
      {/* Close */}
      <button className="figma-close" onClick={() => setFigmaOpen(false)}>
        ×
      </button>

      {/* Logo */}
      <div className="figma-logo">
        <img src="/figma.png" alt="Figma" />
      </div>

      {/* Title */}
      <h3>Figma frame or file import</h3>

      {/* Input */}
    {figmaState === "idle" && (
      <>
      <input type="text" placeholder="Paste Figma file or frame URL" value={figmaUrl} onChange={(e) => setFigmaUrl(e.target.value)}/>
        <button className="figma-import-btn" onClick={startFigmaImport} >
         Import
        </button>
      </>
    )}

    {figmaState === "loading" && (
       <div className="figma-loading">
          Importing design…
       </div>
   )}

    {figmaState === "success" && (
      <div className="figma-success">
        Design attached successfully
      </div>
   )}


      {/* Links */}
      <div className="figma-links">
        <a href="#">How to get URL?</a>
        
      </div>

      {/* Info 
      <div className="figma-info">
         Figma has recently introduced API rate limits based on your
        subscription plan. Your request may be impacted due to this rate limit.
      </div>*/}
    </div>
  </div>
)}
  </section>
);

}



  