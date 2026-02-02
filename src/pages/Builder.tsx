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
import ChatPanel from "../components/builder/chat/ChatPanel";
import { ProjectConfig } from "../components/builder/chat/chat.types";




const DEFAULT_ASSISTANT_MESSAGE = `
Welcome to Ropeli - your single destination to build and deploy production-ready applications!
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
 
const [builderState, setBuilderState] = useState<any>({})

const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);





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
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
  buildTypes: [],
  integrations: [],
});
const [configLocked, setConfigLocked] = useState(true);


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

const hasSavedRef = useRef(false);

useEffect(() => {
  if (!initialPrompt || !user || hasSavedRef.current) return;

  hasSavedRef.current = true;

  const createProject = async () => {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        prompt: initialPrompt,
        status: "draft", // ✅ FIXED
        chat_history: [],        // ✅ initialize
        code_history: [],
        builder_state: {},
      })
      .select()
      .single();

    if (error) {
      console.error("Project creation failed:", error);
      return;
    }

    setProjectId(data.id);
  };

  createProject();
}, [initialPrompt, user]);




useEffect(() => {
  if (!initialPrompt && initialFiles.length === 0 && !initialDesign) return;

  setMessages([
  {
    kind: "text",
    role: "user",
    content: initialPrompt,
  },
  {
    kind: "text",
    role: "assistant",
    content: DEFAULT_ASSISTANT_MESSAGE,
  },
  {
    kind: "typing",
    role: "assistant",
  },
]);


  // show typing first
  setMessages((prev) => [
    ...prev,
    { kind: "typing", role: "assistant" },
  ]);


  
  // after 2s, replace typing with config form
  const timer = setTimeout(() => {
    setMessages((prev) => [
      ...prev.filter((m) => m.kind !== "typing"),
      { kind: "config_form", role: "assistant" },
    ]);
  }, 2000);

  // cleanup (important for React strict mode)
  return () => clearTimeout(timer);
}, [initialPrompt, initialDesign, initialFiles]);



  //  clear prompt attachments after first send



  /* ===== AUTO SCROLL ===== */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  
/* ===== SEND MESSAGE ===== */
const handleSend = () => {
  if (
    !prompt.trim() &&
    attachedFiles.length === 0 &&
    !attachedDesign
  ) {
    return;
  }

  // ONE combined message
  setMessages(prev => [
    ...prev,
    {
      kind: "user_input",
      role: "user",
      content: prompt || undefined,
      files: attachedFiles.length > 0 ? attachedFiles : undefined,
      design: attachedDesign || undefined,
    },
  ]);

  // reset
  setPrompt("");
  setAttachedFiles([]);
  setAttachedDesign(null);

  // typing
  setMessages(prev => [
    ...prev,
    { kind: "typing", role: "assistant" },
  ]);

  setTimeout(() => {
    setMessages(prev => [
      ...prev.filter(m => m.kind !== "typing"),
      {
        kind: "text",
        role: "assistant",
        content: "I’m building this for you now…",
      },
    ]);
  }, 2000);
};



const handleConfigSubmit = async () => {
  setConfigLocked(false);

  const buildTypes = projectConfig.buildTypes;
  const integrations = projectConfig.integrations;

  // Build ONE summary message 🧱🔌
  const summaryLines: string[] = [];

  if (buildTypes.length > 0) {
    summaryLines.push(
      ` Build type:\n${buildTypes.map(b => `• ${b}`).join("\n")}`
    );
  }

  if (integrations.length > 0) {
    summaryLines.push(
      ` Integrations:\n${integrations.map(i => `• ${i}`).join("\n")}`
    );
  }

  const summaryMessage = summaryLines.join("\n\n");

  setMessages(prev => [
    ...prev,
    {
      kind: "text",
      role: "assistant",
      content: summaryMessage,
    },
  ]);

  // Optional follow-up
  setMessages(prev => [
    ...prev,
    {
      kind: "text",
      role: "assistant",
      content: "I’m building this for you now…",
    },
  ]);
};


//save all history in supabase
const handleSaveProject = async () => {
  if (!projectId || !user) return;

  const { error } = await supabase
    .from("projects")
    .update({
      chat_history: messages,
      code_history: {
        file: selectedFile,
        code,
      },
      builder_state: {
        projectConfig,
      },
      status: "saved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Save failed:", error);
  }
};


//Auto-save every X seconds
//Status = "draft"
useEffect(() => {
  const interval = setInterval(() => {
    supabase.from("projects").upsert({
      id: projectId,
      chat_history: messages,
      
      status: "draft",
    })
  }, 5000)

  return () => clearInterval(interval)
}, [messages])

//Navigation protection (VERY IMPORTANT for history loss)
//if user does not click save and tries to leave
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      e.returnValue = ""
    }
  }

  window.addEventListener("beforeunload", handler)
  return () => window.removeEventListener("beforeunload", handler)
}, [hasUnsavedChanges])



//You rehydrate builder on page load (commonly missed)
//When opening /builder/:id, you MUST load saved data:
useEffect(() => {
  if (!projectId || !user) return;

  supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single()
    .then(({ data, error }) => {
      if (error || !data) return;

      setMessages(data.chat_history ?? []);

      if (data.code_history?.code) {
        setCode(data.code_history.code);
      }

      if (data.builder_state?.projectConfig) {
        setProjectConfig(data.builder_state.projectConfig);
      }
    });
}, [projectId, user]);



//AUTO-MARK UNSAVED CHANGES (SAFE)
useEffect(() => {
  if (projectId) {
    // optional future use
  }
}, [messages, code, projectConfig]);







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
    
    {/* ===== GLOBAL FILE INPUT (DO NOT MOVE) ===== */}
    <input
  ref={fileInputRef}
  type="file"
  multiple
  className="file-input-hidden"
  onChange={handleFileSelect}
/>

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
<button
  className="desktop-only save-btn"
  onClick={handleSaveProject}
>
  Save
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
        <ChatPanel
  messages={messages}
  projectConfig={projectConfig}
  setProjectConfig={setProjectConfig}
  onConfigSubmit={handleConfigSubmit}
/>

        {/*<div className="chat-area">
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
        </div>*/}

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
  disabled={configLocked}
  placeholder={
    configLocked
      ? "Complete setup to continue…"
      : "Describe what you want to build…"
  }
  value={prompt}
  onChange={(e) => setPrompt(e.target.value)}
  onKeyDown={(e) => {
    if (configLocked) return;

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
              <button className="send-btn" disabled={configLocked} onClick={() => !configLocked && handleSend()}>
                 ↑
              </button>

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

  {/* ===== CHAT VIEW ===== */}
  {mobileView === "chat" && (
    <div className="builder-left">

      {/* CHAT PANEL (same as desktop) */}
      <ChatPanel
        messages={messages}
        projectConfig={projectConfig}
        setProjectConfig={setProjectConfig}
        onConfigSubmit={handleConfigSubmit}
      />

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
          disabled={configLocked}
          placeholder={
            configLocked
              ? "Complete setup to continue…"
              : "Describe what you want to build…"
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (configLocked) return;

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
              disabled={configLocked}
            >
              +
            </button>

            <button
              className="figma-btn"
              disabled={configLocked}
              onClick={() => setFigmaOpen(true)}
            >
              <img src="/figma.png" alt="Figma" />
            </button>
          </div>

          <div className="prompt-footer-right">
            <button
              className="send-btn"
              disabled={configLocked}
              onClick={() => !configLocked && handleSend()}
            >
              ↑
            </button>
          </div>
        </div>
      </div>
    </div>
  )}

  {/* ===== PREVIEW VIEW ===== */}
  {mobileView === "preview" && (
    <div className="builder-right">
      <div className={`preview-panel ${previewSize}`}>
        <div className="preview-content">
          {compiled ? (
            <iframe
              className="preview-iframe"
              sandbox="allow-scripts"
              srcDoc={iframeHtml(compiled)}
            />
          ) : (
            <p className="preview-empty">Run the project to see preview</p>
          )}
        </div>
      </div>
    </div>
  )}

  {/* ===== CODE VIEW ===== */}
  {mobileView === "code" && (
    <div className="builder-right">
      <div className="code-panel">
        <div className="code-editor">
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



  