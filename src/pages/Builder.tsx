import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/builder.css";
{/*import { getWebContainer } from '../compiler/webcontainer';
import { mountFiles } from '../compiler/filesystem';
import { runProject } from '../compiler/runner';
import { attachPreview } from '../compiler/preview';*/}
import MonacoEditor from "../components/builder/MonacoEditor";
import { compile } from "../compiler/esbuild";
import { iframeHtml } from "../compiler/iframeRuntime";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";



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

const SETUP_STEPS = [
  "Setting up project",
  "Customizing configuration",
  "Creating folders & files",
  "Loading assets & images",
  "Finalizing environment",
];








type FigmaState = "idle" | "loading" | "success" | "error";

export default function Builder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
 



  const [code, setCode] = useState(`
const root = document.getElementById("root");
root.innerHTML = "<h1>Hello from Ropeli </h1>";
`);

const [compiled, setCompiled] = useState("");
const [compileError, setCompileError] = useState("");
const [isCompiling, setIsCompiling] = useState(false);



const handleRun = async () => {
  setIsCompiling(true);
  setCompileError("");

  // UX delay (matches your builder animation style)
  await new Promise((r) => setTimeout(r, 2000));

  const res = await compile(code);

  if (res.error) {
    setCompileError(res.error);
  } else {
    setCompiled(res.js);
    setActiveTab("preview");
  }

  setIsCompiling(false);
};

{/*
  // Preview and logs state
  const [previewUrl, setPreviewUrl] = useState('');
  const [logs, setLogs] = useState('');

// Function to run generated code in WebContainer
  // Function to run generated code in WebContainer
async function runGeneratedCode(files: Record<string, any>) {
  console.log("🔥 runGeneratedCode called");

  const container = await getWebContainer();
  console.log("✅ WebContainer instance received");

  console.log("📦 Mounting files:", files);
  await mountFiles(container, files);
  console.log("📁 Files mounted successfully");

  attachPreview(container, (url: string) => {
    console.log("🌍 Preview server ready at:", url);
    setPreviewUrl(url);
  });

  setLogs("");
  console.log("▶️ Starting project (npm install + npm run dev)");

  await runProject(container, (data: string) => {
    console.log("🧾", data);
    setLogs((prev) => prev + data);
  });
}

*/}


const [setupStep, setSetupStep] = useState(0);
const [isBuilderLoading, setIsBuilderLoading] = useState(true);


// Mobile view state
type MobileView = "chat" | "code" | "preview";
const [mobileView, setMobileView] = useState<MobileView>("chat");


// Preview size state
type PreviewSize = "desktop" | "tablet" | "mobile";
const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");

// File attachments state  
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


// AUTO HIDE BUILDER LOADING AFTER 10s
useEffect(() => {
  const timer = setTimeout(() => {
    setIsBuilderLoading(false);
  }, 10000); // 10 seconds

  return () => clearTimeout(timer);
}, []);


// CYCLE SETUP STEPS WHILE LOADING
useEffect(() => {
  if (!isBuilderLoading) return;

  const interval = setInterval(() => {
    setSetupStep((prev) => (prev + 1) % SETUP_STEPS.length);
  }, 2000);

  return () => clearInterval(interval);
}, [isBuilderLoading]);



  /* ===== INITIAL DATA FROM HERO ===== */
  const initialPrompt = location.state?.prompt || "";
  const initialDesign = location.state?.design || null;


  /* ===== CHAT STATE ===== */
  const [messages, setMessages] = useState<any[]>([]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [attachedDesign, setAttachedDesign] = useState<any>(initialDesign);
  const [isThinking, setIsThinking] = useState(false);



  /* ===== UI STATE ===== */
  const [previewOpen, setPreviewOpen] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);


  /* ===== FIGMA STATE ===== */
  const [figmaOpen, setFigmaOpen] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaState, setFigmaState] = useState<FigmaState>("idle");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const previewLink = "https://preview.ropeli.ai/generated-app";


  /* ===== INITIALIZE CHAT (FROM HERO) ===== */
 // 1️⃣ Initialize chat
const hasSavedRef = useRef(false);

useEffect(() => {
  if (!initialPrompt || !user || hasSavedRef.current) return;

  hasSavedRef.current = true;

  const saveProject = async () => {
    const { data } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        prompt: initialPrompt,
        status: "recent",
      })
      .select()
      .single();

    if (data) setProjectId(data.id);
  };

  saveProject();
}, [initialPrompt, user]);


useEffect(() => {
  if (!initialPrompt && initialFiles.length === 0 && !initialDesign) return;

  setMessages([
    {
      role: "user",
      content: initialPrompt,
      files: initialFiles,
      design: initialDesign,
    },
    { role: "assistant", content: DEFAULT_ASSISTANT_MESSAGE },
  ]);
}, [initialPrompt, initialDesign]);



  //  clear prompt attachments after first send








  /* ===== AUTO SCROLL ===== */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  

  /* ===== SEND MESSAGE ===== */
  const handleSend = () => {
  if (!prompt.trim() && attachedFiles.length === 0) return;

  const userMessage = {
    role: "user",
    content: prompt,
    files: attachedFiles,
    design: attachedDesign,
  };

  setMessages((prev) => [...prev, userMessage]);
  setPrompt("");
  setAttachedFiles([]);
  setIsThinking(true);

  setTimeout(async () => {
  setMessages((prev) => [
    ...prev,
    {
      role: "assistant",
      content: "I’m building this for you now…",
    },
  ]);

  setIsThinking(false);

  // 🔥 TEMP: mock generated project files
 {/*const files = {
  "package.json": {
    file: {
      contents: `{
        ...
      }`,
    },
  },

  "index.html": {
    file: {
      contents: `<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>`,
    },
  },

  "src/main.tsx": {
    file: {
      contents: `
        import React from "react";
        ...
      `,
    },
  },
};


  // 🚀 Run inside WebContainer
  await runGeneratedCode(files);
  // 🔓 FORCE UI TO SHOW PREVIEW
setIsBuilderLoading(false);
setActiveTab("preview");*/}

}, Math.random() * 3000 + 2000);
 // 2–5 sec
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
              <img src="/desktop.svg" />
            </button>

            <button
              className={`device-btn ${previewSize === "tablet" ? "active" : ""}`}
              onClick={() => setPreviewSize("tablet")}
            >
              <img src="/tablet.svg"/>
            </button>

            <button
              className={`device-btn ${previewSize === "mobile" ? "active" : ""}`}
              onClick={() => setPreviewSize("mobile")}
            >
              <img src="/mobile.svg"/>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="topbar-right">
        <button className="desktop-only" onClick={() => setInviteOpen(true)}>Invite</button>
        <button className="desktop-only" onClick={() => setShareOpen(true)}>Share</button>
        <button
  className="desktop-only deploy-btn"
  onClick={async () => {
    if (!projectId) return;

    await supabase
      .from("projects")
      .update({
        status: "deployed",
        deployed_url: "https://your-deployed-url",
        updated_at: new Date(),
      })
      .eq("id", projectId);
  }}
>
  Deploy
</button>


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
          {isThinking && (
  <div className="chat-bubble assistant thinking">
    <span className="dot">.</span>
    <span className="dot">.</span>
    <span className="dot">.</span>
  </div>
)}

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
      {isBuilderLoading ? (
    <div className="builder-setup-loader">
      <div className="setup-spinner"></div>

      <div className="setup-step">
        {SETUP_STEPS[setupStep]}
      </div>

      {/*<div className="setup-icons">
        📁 ⚙️ 🖼️ 📄
      </div>*/}

    </div>
  ) : (
    <>
        {activeTab === "preview" && (
  <div className={`preview-panel ${previewSize}`}>
    {/*{previewUrl ? (
      <iframe
  src={previewUrl}
  className="preview-iframe"
  sandbox="allow-scripts allow-same-origin allow-forms"
  allow="cross-origin-isolated"
/>

    ) : (*/}
      <div className="preview-content">
        {/*<p className="preview-animated">
          {ANIMATED_TEXTS[textIndex]}
        </p>*/}
     {compiled && (
  <iframe
    className="preview-iframe"
    sandbox="allow-scripts"
    srcDoc={iframeHtml(compiled)}
  />
)}



      </div>
    {/*)}*/}
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
              {/*<pre className="editor-content">
{`export default function App() {
  return <div>Hello Ropeli</div>;
}`}
              </pre>*/}
<MonacoEditor value={code} onChange={setCode} />

<button className="run-btn" onClick={handleRun}>
  {isCompiling ? "Compiling…" : "Run"}
</button>

{compileError && (
  <div className="compiler-error">
    <pre>{compileError}</pre>
  </div>
)}
            </div>
          </div>
        )}
    </>
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
              <p className="preview-empty">Run the project to see preview</p>
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



  