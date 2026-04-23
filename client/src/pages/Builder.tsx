import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Sandpack } from "@codesandbox/sandpack-react";
import { QRCodeSVG } from "qrcode.react";
import "../styles/builder.css";
import { getWebContainer } from "../compiler/webcontainer";
import { mountFiles } from "../compiler/filesystem";
import { installDependencies, startDevServer } from "../compiler/runner";
import MonacoEditor, { getLanguage } from "../components/builder/MonacoEditor";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import ChatPanel from "../components/builder/chat/ChatPanel";
import { Terminal } from "../components/builder/Terminal";
import { ChatMessage as ChatMessageType, ProjectConfig } from "../components/builder/chat/chat.types";
import { useGitHub } from "../context/GitHubContext";
import GitHubModal from "../components/GitHubModal";
import GitHubActionModal from "../components/GitHubActionModal";




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

type GeneratedFile = { path: string; content: string };

const slugify = (text: string) =>
  text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "") || "generated-project";

export default function Builder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isConnected, exportToGitHub, importFromGitHub, modalOpen, setModalOpen } = useGitHub();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [ghRepoName, setGhRepoName] = useState("");
  const [ghImportUrl, setGhImportUrl] = useState("");
  const [ghStatus, setGhStatus] = useState<{ type: "idle" | "loading" | "success" | "error"; message?: string; url?: string }>({ type: "idle" });
  const [ghActionModal, setGhActionModal] = useState<{ open: boolean; type: "export" | "import" }>({ open: false, type: "export" });
 
const [builderState, setBuilderState] = useState<any>({})

const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

const { projectId: routeProjectId } = useParams<{ projectId: string }>();

useEffect(() => {
  if (routeProjectId) {
    setProjectId(routeProjectId);
  }
}, [routeProjectId]);




  const [code, setCode] = useState(`
const root = document.getElementById("root");
root.innerHTML = "<h1>Hello from Ropeli </h1>";
`);

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


const [activeTab, setActiveTab] = useState<"preview" | "code" | "terminal">("preview");
const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
const [webContainerInstance, setWebContainerInstance] = useState<any>(null);
const [shellProcess, setShellProcess] = useState<any>(null);
const [hasCodeEdits, setHasCodeEdits] = useState(false);
const [isRunningOnDevice, setIsRunningOnDevice] = useState(false);


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
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [expoQrUrl, setExpoQrUrl] = useState("");
  const [expoLoading, setExpoLoading] = useState(false);
  const [expoMetroReady, setExpoMetroReady] = useState(false);
  const [buildType, setBuildType] = useState<"mobile" | "web">("mobile");
  const [generationElapsed, setGenerationElapsed] = useState(0);
  const generationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [generatedProjectName, setGeneratedProjectName] = useState("");
  const [existingGeneratedProjectId, setExistingGeneratedProjectId] = useState<string | null>(
    location.state?.generatedProjectId ? String(location.state.generatedProjectId) : null
  );
  const [projectConfig, setProjectConfig] = useState<ProjectConfig>({
  buildTypes: [],
  integrations: [],
});
const [configLocked, setConfigLocked] = useState(true);


  const [prompt, setPrompt] = useState(initialPrompt);
  const [attachedDesign, setAttachedDesign] = useState<any>(initialDesign);
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
const hasAutoPromptRunRef = useRef(false);
const hasInitialChatSeededRef = useRef(false);

useEffect(() => {
  // Warmup generation endpoint
  fetch("/api/generate/warmup", { method: "POST" }).catch(() => {});

  const autoPrompt = location.state?.autoPrompt;
  const existingId = location.state?.generatedProjectId;
  const existingFiles = location.state?.files;

  if (autoPrompt && !hasAutoPromptRunRef.current) {
    hasAutoPromptRunRef.current = true;
    const seedPrompt = String(autoPrompt).trim();
    setPrompt(seedPrompt);
    setConfigLocked(false);
    setTimeout(() => {
      handleSend(seedPrompt);
    }, 500);
  }

  if (existingId) {
    setExistingGeneratedProjectId(String(existingId));
    setConfigLocked(false);
    if (Array.isArray(existingFiles) && existingFiles.length > 0) {
      const preparedFiles = existingFiles.map((f: any) => ({ path: f.path, content: f.content || "" }));
      setGeneratedFiles(preparedFiles);
      setSelectedFile(preparedFiles[0]?.path || "");
      setCode(preparedFiles[0]?.content || "");
    } else {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(existingId));
      if (isUUID) {
        (async () => {
          const { data, error } = await supabase
            .from("generated_projects")
            .select("project_name,prompt,files")
            .eq("id", existingId)
            .single();
          if (!error && data) {
            setGeneratedProjectName(data.project_name || "");
            setPrompt(data.prompt || "");
            if (Array.isArray(data.files)) {
              setGeneratedFiles(data.files);
              setSelectedFile(data.files[0]?.path || "");
              setCode(data.files[0]?.content || "");
            }
          }
        })();
      } else {
        console.warn("Invalid UUID for generatedProjectId:", existingId);
      }
    }
  }

  if (routeProjectId) return; //
  if (!initialPrompt || !user || hasSavedRef.current) return;

  hasSavedRef.current = true;

  const createProject = async () => {
    if (!user || !user.id) {
      console.error("Cannot create project: no authenticated user");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          prompt: initialPrompt,
          status: "draft",
          chat_history: [],
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
    } catch (err) {
      console.error("Unexpected error creating project:", err);
    }
  };

  createProject();
}, [initialPrompt, user]);




useEffect(() => {
  const hasAutoPrompt = Boolean(location.state?.autoPrompt);
  const hasExistingProject = Boolean(location.state?.generatedProjectId);
  if (hasAutoPrompt || hasExistingProject || hasInitialChatSeededRef.current) return;
  if (!initialPrompt && initialFiles.length === 0 && !initialDesign) return;
  hasInitialChatSeededRef.current = true;

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


  
  // after 2s, replace typing with config form
  const timer = setTimeout(() => {
    setMessages((prev) => [
      ...prev.filter((m) => m.kind !== "typing"),
      { kind: "config_form", role: "assistant" },
    ]);
  }, 2000);

  // cleanup (important for React strict mode)
  return () => clearTimeout(timer);
}, [initialPrompt, initialDesign, initialFiles, location.state]);



  //  clear prompt attachments after first send



  /* ===== AUTO SCROLL ===== */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  
/* ===== SEND MESSAGE ===== */
const handleSend = async (overridePrompt?: string) => {
  if (isGenerating) return;
  const userPrompt = (overridePrompt ?? prompt).trim();
  if (!userPrompt) return;
  setMessages((prev) => [
    ...prev,
    { kind: "user_input", role: "user", content: userPrompt },
    { kind: "thinking", role: "assistant" },
  ]);
  setIsGenerating(true);
  setGenerationElapsed(0);
  generationTimerRef.current = setInterval(() => {
    setGenerationElapsed((prev) => prev + 1);
  }, 1000);
  if (!overridePrompt) setPrompt("");

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: userPrompt,
        type: buildType,
        existingFiles: generatedFiles.length ? generatedFiles : undefined,
      }),
    });

    const result = await response.json();
    if (result?.success) {
      const files = Array.isArray(result.files)
        ? result.files.map((f: any) => ({ path: f.path, content: f.content }))
        : [];

      setGeneratedFiles(files);
      setSelectedFile(files[0]?.path || "");
      setCode(files[0]?.content || "");
      setHasCodeEdits(false);
      setGeneratedProjectName(result.project_name || slugify(userPrompt));

      const projectIdToUse = existingGeneratedProjectId || slugify(userPrompt);

      if (buildType === "mobile") {
        setExpoLoading(true);
        setExpoMetroReady(false);
        setExpoQrUrl("");
        const expoResponse = await fetch("/api/expo/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectIdToUse, files }),
        });
        const expoResult = await expoResponse.json();
        if (expoResult?.success && expoResult.qr_url) {
          setExpoQrUrl(expoResult.qr_url);
          if (expoResult.metroReachable) {
            setExpoMetroReady(true);
          } else {
            const pollId = setInterval(async () => {
              try {
                const sr = await fetch(`/api/expo/status/${encodeURIComponent(projectIdToUse)}`);
                const st = await sr.json();
                if (st.metroReachable) {
                  setExpoMetroReady(true);
                  clearInterval(pollId);
                }
              } catch {}
            }, 3000);
            setTimeout(() => clearInterval(pollId), 120000);
          }
        }
        setExpoLoading(false);
      }

      if (user) {
        const saveData = {
          user_id: user.id,
          project_name: result.project_name || slugify(userPrompt),
          prompt: userPrompt,
          files,
          build_type: buildType,
          updated_at: new Date().toISOString(),
        };

        if (existingGeneratedProjectId) {
          console.log("SAVING: UPDATE path", existingGeneratedProjectId);
          await supabase
            .from("generated_projects")
            .update({
              project_name: saveData.project_name,
              files: saveData.files,
              updated_at: saveData.updated_at,
            })
            .eq("id", existingGeneratedProjectId)
            .eq("user_id", user.id);
        } else {
          console.log("SAVING: INSERT path");
          const { data, error } = await supabase
            .from("generated_projects")
            .insert({ ...saveData, created_at: new Date().toISOString() })
            .select("id")
            .single();

          if (!error && data?.id) {
            setExistingGeneratedProjectId(data.id);
          }
        }
      }

      setMessages((prev) => [
        ...prev.filter((m) => m.kind !== "thinking"),
        {
          kind: "text",
          role: "assistant",
          content: `✅ App generated: ${result.project_name || slugify(userPrompt)}. Scan the QR code to preview.`,
        },
      ]);
    } else {
      setMessages((prev) => [
        ...prev.filter((m) => m.kind !== "thinking"),
        { kind: "text", role: "assistant", content: "❌ Generation failed. Please try again." },
      ]);
    }
  } catch (error) {
    console.error(error);
    setMessages((prev) => [
      ...prev.filter((m) => m.kind !== "thinking"),
      { kind: "text", role: "assistant", content: "❌ Generation failed. Please try again." },
    ]);
  } finally {
    setIsGenerating(false);
    if (generationTimerRef.current) {
      clearInterval(generationTimerRef.current);
      generationTimerRef.current = null;
    }
    setGenerationElapsed(0);
  }
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


/* ===== RUN ON DEVICE (after code edits) ===== */
const handleRunOnDevice = async () => {
  if (isRunningOnDevice) return;
  setIsRunningOnDevice(true);
  setExpoLoading(true);
  setExpoMetroReady(false);
  setExpoQrUrl("");
  setActiveTab("preview");

  const projectIdToUse = existingGeneratedProjectId || slugify(prompt);
  try {
    const expoResponse = await fetch("/api/expo/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectIdToUse, files: generatedFiles }),
    });
    const expoResult = await expoResponse.json();
    if (expoResult?.success && expoResult.qr_url) {
      setExpoQrUrl(expoResult.qr_url);
      if (expoResult.metroReachable) {
        setExpoMetroReady(true);
      } else {
        const pollId = setInterval(async () => {
          try {
            const sr = await fetch(`/api/expo/status/${encodeURIComponent(projectIdToUse)}`);
            const st = await sr.json();
            if (st.metroReachable) {
              setExpoMetroReady(true);
              clearInterval(pollId);
            }
          } catch {}
        }, 3000);
        setTimeout(() => clearInterval(pollId), 120000);
      }
    }
  } catch (e) {
    console.error("Run on device failed:", e);
  } finally {
    setExpoLoading(false);
    setIsRunningOnDevice(false);
    setHasCodeEdits(false);
  }
};

//save all history in supabase
  const handleTerminalReady = async (xterm: any) => {
    try {
      const wc = await getWebContainer();
      setWebContainerInstance(wc);
      
      // Mount files if they exist
      if (generatedFiles.length > 0) {
        await mountFiles(wc, generatedFiles);
      }
      
      // Start a shell
      const shell = await wc.spawn("jsh", {
        terminal: {
          cols: xterm.cols,
          rows: xterm.rows,
        },
      });
      
      setShellProcess(shell);
      
      // Pipe shell output to xterm
      shell.output.pipeTo(new WritableStream({
        write(data) {
          xterm.write(data);
        }
      }));
      
      // Pipe xterm input to shell
      const input = shell.input.getWriter();
      xterm.onData((data: string) => {
        input.write(data);
      });

      // Handle server-ready event for preview
      wc.on("server-ready", (port, url) => {
        xterm.write(`\r\n\x1b[32m[WebContainer] Server ready at ${url}\x1b[0m\r\n`);
      });

    } catch (err: any) {
      xterm.write(`\r\n\x1b[31mError booting terminal: ${err.message}\x1b[0m\r\n`);
    }
  };

  const handleStartTerminal = async () => {
    // This is now handled by handleTerminalReady
    setActiveTab("terminal");
  };

  useEffect(() => {
    if (activeTab === "terminal" && !webContainerInstance && generatedFiles.length > 0) {
      handleStartTerminal();
    }
  }, [activeTab, generatedFiles]);

  const handleSaveProject = async () => {
  if (!projectId || !user) {
    console.warn("Save skipped: missing projectId or user");
    return;
  }

  try {
    const { error, data } = await supabase
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
      .eq("user_id", user.id)
      .select();

    if (error) {
      console.error("Save failed:", error);
    } else {
      console.log("Project saved", data);
    }
  } catch (err) {
    console.error("Unexpected error during save:", err);
  }
};


//Auto-save every X seconds
//Status = "draft"
useEffect(() => {
  // Only run autosave when we have a valid project and authenticated user
  if (!projectId || !user) return;

  const interval = setInterval(async () => {
    try {
      const { data, error } = await supabase.from("projects").upsert({
        id: projectId,
        user_id: user.id,
        chat_history: messages,
        status: "draft",
      });

      if (error) {
        console.error("Auto-save upsert failed:", error);
      }
    } catch (err) {
      console.error("Auto-save error:", err);
    }
  }, 5000);

  return () => clearInterval(interval);
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

  const loadProject = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .eq("user_id", user.id) // 🔐 important for RLS
        .single();

      if (error || !data) {
        console.error("Failed to load project:", error);
        return;
      }

      // 🔁 REHYDRATE BUILDER STATE
      setMessages(data.chat_history ?? []);

      if (data.code_history?.code) {
        setCode(data.code_history.code);
      }

      if (data.builder_state?.projectConfig) {
        setProjectConfig(data.builder_state.projectConfig);
      }
    } catch (err) {
      console.error("Unexpected error loading project:", err);
    }
  };

  loadProject();
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

  const groupedFiles = Object.entries(
    generatedFiles.reduce<Record<string, GeneratedFile[]>>((acc, file) => {
      const parts = file.path.split("/");
      const folder = parts.length > 1 ? parts[0] : "";
      if (!acc[folder]) acc[folder] = [];
      acc[folder].push(file);
      return acc;
    }, {})
  ).map(([folder, files]) => ({ folder, files }));

  const sandpackFiles = generatedFiles.reduce((acc, f) => {
    acc[`/${f.path}`] = { code: f.content };
    return acc;
  }, {} as Record<string, { code: string }>);
  if (!sandpackFiles["/index.js"]) {
    sandpackFiles["/index.js"] = {
      code: "import React from 'react'; import { createRoot } from 'react-dom/client'; import App from './App'; createRoot(document.getElementById('root')).render(<App />);",
    };
  }

 return (
  <>
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
          <button
            className={activeTab === "terminal" ? "active" : ""}
            onClick={() => setActiveTab("terminal")}
          >
            Terminal
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
        <button onClick={() => setBuildType("mobile")} className={buildType === "mobile" ? "active" : ""}>Mobile</button>
        <button onClick={() => setBuildType("web")} className={buildType === "web" ? "active" : ""}>Web</button>

        <input
          className="project-name-input"
          value={generatedProjectName}
          onChange={(e) => setGeneratedProjectName(e.target.value)}
          placeholder="Project name"
        />

        <button onClick={() => {
          const zip = new JSZip();
          generatedFiles.forEach((f) => zip.file(f.path, f.content));
          zip.generateAsync({ type: "blob" }).then((blob) => saveAs(blob, `${generatedProjectName || "project"}.zip`));
        }}
        disabled={generatedFiles.length === 0}
        >
          Download ZIP
        </button>

        <button onClick={() => {
          if (!user) return;
          supabase.from("generated_projects").upsert({
            id: existingGeneratedProjectId,
            user_id: user.id,
            project_name: generatedProjectName || slugify(prompt),
            prompt,
            files: generatedFiles,
            build_type: buildType,
            updated_at: new Date().toISOString(),
            created_at: existingGeneratedProjectId ? undefined : new Date().toISOString(),
          }).then(({ error, data }) => {
            if (error) return console.error(error);
            if (!existingGeneratedProjectId && data?.[0]?.id) setExistingGeneratedProjectId(data[0].id);
          });
        }}
        disabled={!generatedFiles.length}
        >
          Save
        </button>

        {/* GITHUB ACTIONS */}
        <div className="github-actions-container" style={{ display: "flex", gap: "8px", position: "relative", alignItems: "center" }}>
          {!isConnected ? (
            <button 
              className="gh-connect-btn" 
              onClick={() => setModalOpen(true)} // Open connection modal
              style={{ 
                background: "linear-gradient(135deg, #24292e 0%, #1a1a1a 100%)", 
                color: "white", 
                padding: "8px 16px", 
                borderRadius: "10px", 
                fontSize: "0.85rem", 
                display: "flex", 
                alignItems: "center", 
                gap: "8px",
                border: "1px solid #333",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <img src="https://cdn.simpleicons.org/github" alt="" style={{ width: "16px", filter: "invert(1)" }} />
              Connect GitHub
            </button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button 
                className="gh-action-btn export" 
                disabled={ghStatus.type === "loading" || !generatedFiles.length}
                onClick={() => setGhActionModal({ open: true, type: "export" })}
                style={{ 
                  background: "#24292e", 
                  color: "white", 
                  padding: "8px 14px", 
                  borderRadius: "10px", 
                  fontSize: "0.85rem", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "8px",
                  border: "1px solid #444",
                  cursor: "pointer",
                  opacity: (ghStatus.type === "loading" || !generatedFiles.length) ? 0.6 : 1
                }}
              >
                <img src="https://cdn.simpleicons.org/github" alt="" style={{ width: "16px", filter: "invert(1)" }} />
                {ghStatus.type === "loading" ? "Exporting..." : "Export"}
              </button>

              <button 
                className="gh-action-btn import" 
                disabled={ghStatus.type === "loading"}
                onClick={() => setGhActionModal({ open: true, type: "import" })}
                style={{ 
                  background: "transparent", 
                  border: "1px solid #333", 
                  color: "#ccc", 
                  padding: "8px 14px", 
                  borderRadius: "10px", 
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                Import
              </button>
            </div>
          )}

          {ghStatus.message && (
            <div 
              className={`gh-toast ${ghStatus.type}`} 
              onClick={() => ghStatus.url && window.open(ghStatus.url, "_blank")}
              style={{ 
                position: "fixed", /* Fixed instead of absolute to be visible */
                bottom: "30px", 
                right: "30px", 
                padding: "12px 20px", 
                borderRadius: "14px", 
                background: ghStatus.type === "error" ? "#ff4d4d" : "linear-gradient(135deg, #00f5a0 0%, #00d9f5 100%)", 
                color: "black", 
                fontSize: "0.9rem", 
                fontWeight: "600",
                whiteSpace: "nowrap", 
                zIndex: 10000,
                boxShadow: "0 15px 40px rgba(0,0,0,0.6)",
                cursor: ghStatus.url ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                animation: "slideInUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
              }}
            >
              {ghStatus.message}
              {ghStatus.url && <span style={{ fontSize: '1.2rem' }}>↗</span>}
            </div>
          )}
        </div>

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
  generationElapsed={generationElapsed}
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
  disabled={configLocked || isGenerating}
  placeholder={
    configLocked
      ? "Complete setup to continue…"
      : "Describe what you want to build…"
  }
  value={prompt}
  onChange={(e) => setPrompt(e.target.value)}
  onKeyDown={(e) => {
    if (configLocked || isGenerating) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (prompt.trim() || attachedFiles.length > 0) handleSend();
    }
  }}
/>


          <div className="builder-prompt-footer">
            <div className="prompt-footer-left">
              <button className="icon-btn" disabled={isGenerating} onClick={() => fileInputRef.current?.click()}>+</button>
              <button className="figma-btn" disabled={isGenerating} onClick={() => setFigmaOpen(true)}>
                <img src="/figma.png" />
              </button>
            </div>

            <div className="prompt-footer-right">
              <button className="send-btn" disabled={configLocked || isGenerating} onClick={() => !configLocked && !isGenerating && handleSend()}>
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
      <div className="preview-content" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        
        {/* MOBILE FRAME (iPhone) */}
        {previewSize === "mobile" && (
          <div className="phone-frame-preview">
            <div className="phone-island"></div>
            <div className="phone-frame-inner">
              {buildType === "mobile" ? (
                <>
                  {expoLoading ? (
                    <div className="setup-spinner"></div>
                  ) : expoQrUrl && expoMetroReady ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <div style={{ background: '#fff', padding: '12px', borderRadius: '12px' }}>
                        <QRCodeSVG value={expoQrUrl} size={180} />
                      </div>
                      <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', padding: '0 20px' }}>Scan with Expo Go to preview on your device</p>
                    </div>
                  ) : (
                    <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>{expoQrUrl && !expoMetroReady ? "Connecting to Metro..." : "Generate code to see preview"}</p>
                  )}
                </>
              ) : (
                <div style={{ width: '100%', height: '100%' }}>
                  <Sandpack template="react" files={sandpackFiles} options={{ showNavigator: false, showTabs: false, editorHeight: '100%' }} theme="dark" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TABLET FRAME (iPad) */}
        {previewSize === "tablet" && (
          <div className="tablet-frame-preview">
            <div className="tablet-frame-inner">
              <Sandpack template="react" files={sandpackFiles} options={{ showNavigator: false, showTabs: false, editorHeight: '100%' }} theme="dark" />
            </div>
          </div>
        )}

        {/* DESKTOP FRAME (Web Browser) */}
        {previewSize === "desktop" && (
          <div className="web-frame-preview">
            <div className="web-browser-header">
              <div className="browser-dots">
                <div className="browser-dot dot-red"></div>
                <div className="browser-dot dot-yellow"></div>
                <div className="browser-dot dot-green"></div>
              </div>
              <div className="browser-address-bar">
                <span>localhost:3000</span>
              </div>
            </div>
            <div className="web-frame-inner">
              <Sandpack template="react" files={sandpackFiles} options={{ showNavigator: false, showTabs: false, editorHeight: '100%' }} theme="dark" />
            </div>
          </div>
        )}

      </div>
  </div>
)}


        {activeTab === "code" && (
          <div className="code-panel">
            <div className="code-explorer">
              <div className="explorer-header">Files</div>
              <div className="file-tree-vertical">
                {generatedFiles.length === 0 && <div className="file-empty">No files yet</div>}
                {groupedFiles.map(({ folder, files }) => (
                  <div key={folder || "root"}>
                    {folder && <div className="file-folder-row">📁 {folder}</div>}
                    {files.map((file) => (
                      <button
                        key={file.path}
                        className={`file-row ${file.path === selectedFile ? "active" : ""}`}
                        onClick={() => {
                          setSelectedFile(file.path);
                          setCode(file.content);
                        }}
                      >
                        <span className="file-icon">📄</span>
                        <span className="file-name">{file.path.split("/").pop()}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="code-editor">
              <div className="editor-header">
                <div className="editor-header-left">
                  <span className="editor-filename">{selectedFile || "No file selected"}</span>
                  {selectedFile && (
                    <span className="editor-lang-badge">{getLanguage(selectedFile).toUpperCase()}</span>
                  )}
                  {hasCodeEdits && <span className="editor-unsaved-dot" title="Unsaved edits" />}
                </div>
                <div className="editor-header-right">
                  {hasCodeEdits && buildType === "mobile" && generatedFiles.length > 0 && (
                    <button
                      className="run-on-device-btn"
                      onClick={handleRunOnDevice}
                      disabled={isRunningOnDevice}
                    >
                      {isRunningOnDevice ? "Running…" : "▶ Run on Device"}
                    </button>
                  )}
                  {buildType === "web" && generatedFiles.length > 0 && (
                    <span className="editor-live-badge">● Live Preview</span>
                  )}
                </div>
              </div>
              <MonacoEditor
                value={code}
                filePath={selectedFile}
                onChange={(value) => {
                  setCode(value);
                  setGeneratedFiles((prev) =>
                    prev.map((f) =>
                      f.path === selectedFile ? { ...f, content: value } : f
                    )
                  );
                  setHasCodeEdits(true);
                }}
              />
            </div>
          </div>
        )}

        {activeTab === "terminal" && (
          <div className="terminal-panel" style={{ background: "#1e1e1e", padding: "10px", height: "100%" }}>
            <Terminal onTerminalReady={handleTerminalReady} />
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
        generationElapsed={generationElapsed}
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
          disabled={configLocked || isGenerating}
          placeholder={
            configLocked
              ? "Complete setup to continue…"
              : "Describe what you want to build…"
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (configLocked || isGenerating) return;

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
              disabled={configLocked || isGenerating}
            >
              +
            </button>

            <button
              className="figma-btn"
              disabled={configLocked || isGenerating}
              onClick={() => setFigmaOpen(true)}
            >
              <img src="/figma.png" alt="Figma" />
            </button>
          </div>

          <div className="prompt-footer-right">
            <button
              className="send-btn"
              disabled={configLocked || isGenerating}
              onClick={() => !configLocked && !isGenerating && handleSend()}
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
    <div className="builder-right" style={{ width: '100%', padding: '10px' }}>
      <div className={`preview-panel ${previewSize}`} style={{ width: '100%', height: '100%', margin: 0 }}>
        
        {/* MOBILE FRAME (iPhone) */}
        {previewSize === "mobile" && (
          <div className="phone-frame-preview" style={{ width: '100%', height: '100%' }}>
            <div className="phone-island"></div>
            <div className="phone-frame-inner">
              {buildType === "mobile" ? (
                <>
                  {expoLoading ? (
                    <div className="setup-spinner"></div>
                  ) : expoQrUrl && expoMetroReady ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <div style={{ background: '#fff', padding: '12px', borderRadius: '12px' }}>
                        <QRCodeSVG value={expoQrUrl} size={180} />
                      </div>
                      <p style={{ fontSize: '12px', color: '#888', textAlign: 'center', padding: '0 20px' }}>Scan with Expo Go to preview</p>
                    </div>
                  ) : (
                    <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>{expoQrUrl && !expoMetroReady ? "Connecting to Metro..." : "No preview available"}</p>
                  )}
                </>
              ) : (
                <div style={{ width: '100%', height: '100%' }}>
                  <Sandpack template="react" files={sandpackFiles} options={{ showNavigator: false, showTabs: false, editorHeight: '100%' }} theme="dark" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TABLET/DESKTOP on mobile view (simplified) */}
        {previewSize !== "mobile" && (
          <div className="web-frame-preview" style={{ width: '100%', height: '100%' }}>
            <div className="web-frame-inner">
              <Sandpack template="react" files={sandpackFiles} options={{ showNavigator: false, showTabs: false, editorHeight: '100%' }} theme="dark" />
            </div>
          </div>
        )}

      </div>
    </div>
  )}

  {/* ===== CODE VIEW ===== */}
  {mobileView === "code" && (
    <div className="builder-right">
      <div className="code-panel">
        <div className="code-editor">
          <div className="editor-header">
            <div className="editor-header-left">
              <span className="editor-filename">{selectedFile || "No file selected"}</span>
              {selectedFile && (
                <span className="editor-lang-badge">{getLanguage(selectedFile).toUpperCase()}</span>
              )}
              {hasCodeEdits && <span className="editor-unsaved-dot" title="Unsaved edits" />}
            </div>
            <div className="editor-header-right">
              {hasCodeEdits && buildType === "mobile" && generatedFiles.length > 0 && (
                <button
                  className="run-on-device-btn"
                  onClick={handleRunOnDevice}
                  disabled={isRunningOnDevice}
                >
                  {isRunningOnDevice ? "Running…" : "▶ Run"}
                </button>
              )}
            </div>
          </div>
          <MonacoEditor
            value={code}
            filePath={selectedFile}
            onChange={(value) => {
              setCode(value);
              setGeneratedFiles((prev) =>
                prev.map((f) =>
                  f.path === selectedFile ? { ...f, content: value } : f
                )
              );
              setHasCodeEdits(true);
            }}
          />
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

  {modalOpen && <GitHubModal open={modalOpen} onClose={() => setModalOpen(false)} />}

  {ghActionModal.open && (
    <GitHubActionModal
      open={ghActionModal.open}
      onClose={() => setGhActionModal({ ...ghActionModal, open: false })}
      title={ghActionModal.type === "export" ? "Export to GitHub" : "Import from GitHub"}
      placeholder={ghActionModal.type === "export" ? "Repository name" : "https://github.com/user/repo"}
      initialValue={ghActionModal.type === "export" ? (generatedProjectName || "ropeli-app") : ""}
      buttonLabel={ghActionModal.type === "export" ? "Create Repo & Push" : "Fetch Repository"}
      loading={ghStatus.type === "loading"}
      onSubmit={async (value) => {
        if (ghActionModal.type === "export") {
          setGhStatus({ type: "loading" });
          const res = await exportToGitHub(value, generatedFiles);
          if (res.success) {
            setGhStatus({ type: "success", message: `Exported! Click to view`, url: res.url });
            setGhActionModal({ ...ghActionModal, open: false });
            setTimeout(() => setGhStatus({ type: "idle" }), 5000);
          } else {
            setGhStatus({ type: "error", message: res.message });
          }
        } else {
          setGhStatus({ type: "loading" });
          const res = await importFromGitHub(value);
          if (res.success && res.files) {
            setGeneratedFiles(res.files);
            if (res.files.length > 0) {
              setSelectedFile(res.files[0].path);
              setCode(res.files[0].content);
            }
            setGhStatus({ type: "success", message: "Imported successfully!" });
            setGhActionModal({ ...ghActionModal, open: false });
            setTimeout(() => setGhStatus({ type: "idle" }), 3000);
          } else {
            setGhStatus({ type: "error", message: res.message });
          }
        }
      }}
    />
  )}
</>
);

}



  