import { useEffect, useRef, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Sandpack } from "@codesandbox/sandpack-react";
import { QRCodeSVG } from "qrcode.react";
import "../styles/builder.css";
{/*import { getWebContainer } from '../compiler/webcontainer';
import { mountFiles } from '../compiler/filesystem';
import { runProject } from '../compiler/runner';
import { attachPreview } from '../compiler/preview';*/}
import MonacoEditor, { getLanguage } from "../components/builder/MonacoEditor";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import ChatPanel from "../components/builder/chat/ChatPanel";
import { ChatMessage as ChatMessageType, ProjectConfig } from "../components/builder/chat/chat.types";




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

// Returns the build type the user *probably* meant, or null when ambiguous.
// Only used as a soft suggestion on the very first generation. The user's
// explicit Mobile/Web toggle always takes precedence.
const detectBuildTypeFromPrompt = (text: string): "mobile" | "web" | null => {
  const t = text.toLowerCase();
  const webHits = [
    "website",
    "web app",
    "web-app",
    "webapp",
    "landing page",
    "dashboard",
    "browser",
    "next.js",
    "nextjs",
    "react web",
  ].some((kw) => t.includes(kw));
  const mobileHits = [
    "mobile app",
    "mobile-app",
    "android app",
    "ios app",
    "iphone app",
    "expo",
    "react native",
    "react-native",
    "phone app",
    "play store",
    "app store",
    "apk",
  ].some((kw) => t.includes(kw));
  if (webHits && !mobileHits) return "web";
  if (mobileHits && !webHits) return "mobile";
  return null;
};

export default function Builder() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<string | null>(null);
 
const [builderState, setBuilderState] = useState<any>({})

const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

const { projectId: routeProjectId } = useParams<{ projectId: string }>();

// Returns Authorization header if a Supabase session exists, otherwise {}.
// Always merge with Content-Type at the call site.
const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
};

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


const [activeTab, setActiveTab] = useState<"preview" | "code">("preview");
const [hasCodeEdits, setHasCodeEdits] = useState(false);
const [isRunningOnDevice, setIsRunningOnDevice] = useState(false);
const [fileSearch, setFileSearch] = useState("");


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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [sessionResumed, setSessionResumed] = useState(false);

  useEffect(() => {
    if (routeProjectId) {
      setProjectId(routeProjectId);
      setExistingGeneratedProjectId(routeProjectId);
    }
  }, [routeProjectId]);

  // ── APK build state ──────────────────────────────────────────────────────
  type ApkStatus = "idle" | "building" | "finished" | "errored";
  const [apkStatus, setApkStatus] = useState<ApkStatus>("idle");
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  const [apkBuildId, setApkBuildId] = useState<string | null>(null);
  const apkPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount so we never leak intervals between sessions.
  useEffect(() => {
    return () => {
      if (apkPollRef.current) clearInterval(apkPollRef.current);
    };
  }, []);

  // Restore APK download URL from Supabase when revisiting a previously-built
  // project. generated_projects.apk_url is written by build-status when EAS
  // reports "finished".
  useEffect(() => {
    if (!existingGeneratedProjectId || apkStatus !== "idle") return;
    supabase
      .from("generated_projects")
      .select("apk_url")
      .eq("id", existingGeneratedProjectId)
      .single()
      .then(({ data }) => {
        if (data?.apk_url) {
          setApkUrl(data.apk_url);
          setApkStatus("finished");
        }
      });
  }, [existingGeneratedProjectId, apkStatus]);

  // Restore full session when reopening a saved generated project.
  useEffect(() => {
    if (!existingGeneratedProjectId || generatedFiles.length > 0) return;

    supabase
      .from("generated_projects")
      .select("project_name, files, prompt, session_state, apk_url, build_type")
      .eq("id", existingGeneratedProjectId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;

        if (data.files) {
          const parsedFiles =
            typeof data.files === "string" ? JSON.parse(data.files) : data.files;
          if (Array.isArray(parsedFiles) && parsedFiles.length > 0) {
            setGeneratedFiles(parsedFiles);
            setSelectedFile(parsedFiles[0]?.path || "");
            setCode(parsedFiles[0]?.content || "");
          }
        }

        if (data.project_name) setGeneratedProjectName(data.project_name);
        if (data.prompt) setPrompt(data.prompt);
        if (data.build_type === "web" || data.build_type === "mobile") {
          setBuildType(data.build_type);
        }
        if (data.apk_url) {
          setApkUrl(data.apk_url);
          setApkStatus("finished");
        }

        setSessionResumed(true);
      });
  }, [existingGeneratedProjectId, generatedFiles.length]);

  const handleBuildAPK = async () => {
    if (!existingGeneratedProjectId || apkStatus === "building") return;
    setApkStatus("building");
    setApkUrl(null);

    const authHeaders = await getAuthHeaders();
    let res: Response;
    try {
      res = await fetch("/api/expo/build", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ project_id: existingGeneratedProjectId }),
      });
    } catch {
      setApkStatus("errored");
      return;
    }

    const data = await res.json().catch(() => ({} as any));
    if (!res.ok || !data?.build_id) {
      setApkStatus("errored");
      return;
    }
    setApkBuildId(data.build_id);

    // Poll every 30 s. We never await this — the interval is the loop.
    if (apkPollRef.current) clearInterval(apkPollRef.current);
    apkPollRef.current = setInterval(async () => {
      try {
        const hdrs = await getAuthHeaders();
        const pr = await fetch(
          `/api/expo/build-status/${encodeURIComponent(data.build_id)}`,
          { headers: hdrs }
        );
        const poll = await pr.json().catch(() => ({} as any));
        if (poll.status === "finished" && poll.apk_url) {
          if (apkPollRef.current) clearInterval(apkPollRef.current);
          setApkUrl(poll.apk_url);
          setApkStatus("finished");
        } else if (poll.status === "errored") {
          if (apkPollRef.current) clearInterval(apkPollRef.current);
          setApkStatus("errored");
        }
      } catch {
        // Network blip — keep polling.
      }
    }, 30_000);
  };

  // Switch between Mobile and Web. If there are already generated files, ask
  // the user to confirm a conversion and re-run /api/generate with the files
  // as `existingFiles` and the new target type. With no files, this is a
  // plain toggle — identical to the previous setBuildType behaviour.
  const handleSwitchBuildType = async (target: "mobile" | "web") => {
    if (target === buildType) return;
    if (isGenerating) return;

    if (generatedFiles.length === 0) {
      setBuildType(target);
      return;
    }

    const ok = window.confirm(
      target === "web"
        ? "Convert this mobile app into a web app? This will use one of your daily generations."
        : "Convert this web app into a mobile app? This will use one of your daily generations."
    );
    if (!ok) return;

    setBuildType(target);
    setIsGenerating(true);
    setGenerationElapsed(0);
    generationTimerRef.current = setInterval(() => {
      setGenerationElapsed((prev) => prev + 1);
    }, 1000);

    const conversionInstruction =
      target === "web"
        ? "Convert this React Native / Expo app into a React web app. Use only standard HTML elements (div, button, input, etc.) and inline styles. Remove all react-native and Expo imports. Keep the same features and structure."
        : "Convert this React web app into an Expo React Native mobile app. Replace HTML elements with React Native components (View, Text, TouchableOpacity, FlatList, etc.). Replace localStorage with AsyncStorage. Keep the same features and structure.";

    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          prompt: conversionInstruction,
          type: target,
          existingFiles: generatedFiles,
          existingProjectId: existingGeneratedProjectId || null,
        }),
      });

      if (response.status === 401) {
        setMessages((prev) => [
          ...prev,
          { kind: "text", role: "assistant", content: "🔒 Please log in to convert apps." },
        ]);
        return;
      }
      if (response.status === 429) {
        const err = await response.json().catch(() => ({} as any));
        if (err?.upgrade_required) {
          setShowUpgradeModal(true);
          return;
        }
        setMessages((prev) => [
          ...prev,
          {
            kind: "text",
            role: "assistant",
            content: err?.message || "Daily limit reached. Resets at midnight UTC.",
          },
        ]);
        return;
      }

      const result = await response.json();
      if (!result?.success || !Array.isArray(result.files)) {
        setMessages((prev) => [
          ...prev,
          { kind: "text", role: "assistant", content: "❌ Conversion failed. Please try again." },
        ]);
        return;
      }

      const files = result.files.map((f: any) => ({ path: f.path, content: f.content }));
      setGeneratedFiles(files);
      setSelectedFile(files[0]?.path || "");
      setCode(files[0]?.content || "");
      setHasCodeEdits(false);

      if (result.generated_project_id && !existingGeneratedProjectId) {
        setExistingGeneratedProjectId(result.generated_project_id);
      }

      const projectIdToUse =
        existingGeneratedProjectId ||
        result.generated_project_id ||
        slugify(generatedProjectName || "app");

      if (target === "mobile") {
        setExpoLoading(true);
        setExpoMetroReady(false);
        setExpoQrUrl("");
        const expoResponse = await fetch("/api/expo/start", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ project_id: projectIdToUse, files }),
        });
        const expoResult = await expoResponse.json().catch(() => ({} as any));
        if (expoResult?.success && expoResult.qr_url) {
          setExpoQrUrl(expoResult.qr_url);
          if (expoResult.metroReachable) {
            setExpoMetroReady(true);
          }
        }
        setExpoLoading(false);
      }

      if (user && existingGeneratedProjectId) {
        await supabase
          .from("generated_projects")
          .update({
            files,
            build_type: target,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingGeneratedProjectId)
          .eq("user_id", user.id);
      }

      setMessages((prev) => [
        ...prev,
        {
          kind: "text",
          role: "assistant",
          content:
            target === "web"
              ? "✅ Converted to a web app. Live preview is ready."
              : "✅ Converted to a mobile app. Scan the QR code to preview.",
        },
      ]);
    } catch (err) {
      console.error("[switch-build-type] failed:", err);
      setMessages((prev) => [
        ...prev,
        { kind: "text", role: "assistant", content: "❌ Conversion failed. Please try again." },
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
    }
  }

  if (routeProjectId) return; //
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

  // Soft auto-detect from prompt text. Applied ONLY on the first generation
  // (no existing files yet) so follow-up prompts can't flip mode unexpectedly.
  // The user's manual toggle always wins when no signal is found.
  let resolvedBuildType: "mobile" | "web" = buildType;
  if (generatedFiles.length === 0) {
    const detected = detectBuildTypeFromPrompt(userPrompt);
    if (detected && detected !== buildType) {
      resolvedBuildType = detected;
      setBuildType(detected);
    }
  }

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
    const authHeaders = await getAuthHeaders();
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        prompt: userPrompt,
        type: resolvedBuildType,
        existingFiles: generatedFiles.length > 0 ? generatedFiles : undefined,
        existingProjectId: existingGeneratedProjectId || null,
      }),
    });

    if (response.status === 401) {
      setMessages((prev) => [
        ...prev.filter((m) => m.kind !== "thinking"),
        { kind: "text", role: "assistant", content: "🔒 Please log in to generate apps." },
      ]);
      return;
    }
    if (response.status === 429) {
      const err = await response.json().catch(() => ({}));
      if (err?.upgrade_required) {
        setShowUpgradeModal(true);
        return;
      }
      setMessages((prev) => [
        ...prev.filter((m) => m.kind !== "thinking"),
        {
          kind: "text",
          role: "assistant",
          content: err?.message || "You've used all your daily generations. Resets at midnight UTC.",
        },
      ]);
      return;
    }

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

      if (result.generated_project_id && !existingGeneratedProjectId) {
        setExistingGeneratedProjectId(result.generated_project_id);
      }

      const projectIdToUse =
        existingGeneratedProjectId || result.generated_project_id || slugify(userPrompt);

      if (resolvedBuildType === "mobile") {
        setExpoLoading(true);
        setExpoMetroReady(false);
        setExpoQrUrl("");
        const expoResponse = await fetch("/api/expo/start", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
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
                const sr = await fetch(`/api/expo/status/${encodeURIComponent(projectIdToUse)}`, {
                  headers: authHeaders,
                });
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
          build_type: resolvedBuildType,
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
    const authHeaders = await getAuthHeaders();
    const expoResponse = await fetch("/api/expo/start", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
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
            const sr = await fetch(`/api/expo/status/${encodeURIComponent(projectIdToUse)}`, {
              headers: authHeaders,
            });
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

  const loadProject = async () => {
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

  const filteredGroupedFiles = groupedFiles
    .map(({ folder, files }) => ({
      folder,
      files: files.filter((file) =>
        file.path.toLowerCase().includes(fileSearch.toLowerCase())
      ),
    }))
    .filter(({ files }) => files.length > 0);

  const sandpackFiles = generatedFiles.reduce((acc, f) => {
    acc[`/${f.path}`] = { code: f.content };
    return acc;
  }, {} as Record<string, { code: string }>);
  if (!sandpackFiles["/index.js"]) {
    sandpackFiles["/index.js"] = {
      code: "import React from 'react'; import { createRoot } from 'react-dom/client'; import App from './App'; createRoot(document.getElementById('root')).render(<App />);",
    };
  }

  // Reused below in both desktop and mobile-layout QR previews.
  const apkSection = buildType === "mobile" && existingGeneratedProjectId ? (
    <div className="apk-section">
      {apkStatus === "idle" && (
        <button onClick={handleBuildAPK} className="btn-secondary apk-build-btn">
          Build Android APK
        </button>
      )}
      {apkStatus === "building" && (
        <div className="apk-building">
          <div className="spinner" />
          <p>Building APK… this usually takes 5–15 minutes.</p>
          <p className="apk-hint">You can close this tab — we'll email you when it's ready.</p>
        </div>
      )}
      {apkStatus === "finished" && apkUrl && (
        <div className="apk-ready">
          <p className="apk-ready-title">✅ APK Ready</p>
          <a href={apkUrl} download className="btn-primary apk-download-btn">
            Download APK
          </a>
          <p className="apk-install-note">
            On your Android phone: Settings → Security → enable <em>Install unknown apps</em> → tap the link above.
          </p>
        </div>
      )}
      {apkStatus === "errored" && (
        <div className="apk-error">
          <p>
            Build failed.{" "}
            <button className="apk-retry-btn" onClick={() => setApkStatus("idle")}>
              Try again
            </button>
          </p>
        </div>
      )}
    </div>
  ) : null;

 return (
  <section className="builder-page">
    {sessionResumed && (
      <div className="session-resumed-banner">
        ↩️ Session restored — your previous app is loaded
        <button type="button" onClick={() => setSessionResumed(false)} aria-label="Dismiss">
          ×
        </button>
      </div>
    )}
    {showUpgradeModal && (
      <div className="upgrade-modal-overlay" onClick={() => setShowUpgradeModal(false)}>
        <div className="upgrade-modal" onClick={(e) => e.stopPropagation()}>
          <div className="upgrade-modal-icon">🚀</div>
          <h2>You've used your free generations</h2>
          <p>Free accounts get 2 app generations per day.</p>
          <p>Upgrade to Pro for 50 generations per day, session history, and priority generation.</p>
          <div className="upgrade-modal-actions">
            <button className="btn-primary" onClick={() => navigate("/pricing")}>
              Upgrade to Pro
            </button>
            <button className="btn-secondary" onClick={() => setShowUpgradeModal(false)}>
              Come back tomorrow
            </button>
          </div>
          <p className="upgrade-modal-reset">Your free generations reset at midnight UTC.</p>
        </div>
      </div>
    )}
    
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
        <button
          onClick={() => handleSwitchBuildType("mobile")}
          disabled={isGenerating}
          className={buildType === "mobile" ? "active" : ""}
        >
          Mobile
        </button>
        <button
          onClick={() => handleSwitchBuildType("web")}
          disabled={isGenerating}
          className={buildType === "web" ? "active" : ""}
        >
          Web
        </button>

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
      <div className={`preview-content ${buildType === "mobile" ? "preview-mobile-layout" : "preview-web-layout"}`}>
        {buildType === "mobile" ? (
          <div className="mobile-qr-preview phone-frame-preview">
            {expoLoading ? (
              <p>Starting Expo server...</p>
            ) : expoQrUrl && expoMetroReady ? (
              <div className="phone-frame-inner">
                <div className="qr-card">
                  <QRCodeSVG value={expoQrUrl} size={200} />
                </div>
                <p className="qr-helper-text">Scan with Expo Go on your phone</p>
              </div>
            ) : expoQrUrl && !expoMetroReady ? (
              <div className="phone-frame-inner">
                <p>Waiting for Metro...</p>
              </div>
            ) : (
              <p>Run generation to start Expo and get QR link</p>
            )}
            {apkSection}
          </div>
        ) : (
          <div className="web-frame-preview">
            <div className="web-frame-inner">
            <Sandpack
              template="react"
              files={sandpackFiles}
              options={{ showNavigator: false, showTabs: false, editorHeight: 0 }}
              theme="dark"
            />
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
              <div className="explorer-toolbar">
                <input
                  className="explorer-search"
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  placeholder="Search files..."
                />
              </div>
              <div className="file-tree-vertical">
                {generatedFiles.length === 0 && <div className="file-empty">No files yet</div>}
                {filteredGroupedFiles.map(({ folder, files }) => (
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
    <div className="builder-right">
      <div className={`preview-panel ${previewSize}`}>
        <div className={`preview-content ${buildType === "mobile" ? "preview-mobile-layout" : "preview-web-layout"}`}>
          {buildType === "mobile" ? (
            <div className="mobile-qr-preview phone-frame-preview">
              {expoLoading ? (
                <p>Starting Expo server...</p>
              ) : expoQrUrl && expoMetroReady ? (
                <div className="phone-frame-inner">
                  <div className="qr-card">
                    <QRCodeSVG value={expoQrUrl} size={200} />
                  </div>
                  <p className="qr-helper-text">Scan with Expo Go on your phone</p>
                </div>
              ) : expoQrUrl && !expoMetroReady ? (
                <div className="phone-frame-inner">
                  <p>Waiting for Metro...</p>
                </div>
              ) : (
                <p>Run generation to start Expo and get QR link</p>
              )}
              {apkSection}
            </div>
          ) : (
            <div className="web-frame-preview">
              <div className="web-frame-inner">
              <Sandpack
                template="react"
                files={sandpackFiles}
                options={{ showNavigator: false, showTabs: false, editorHeight: 0 }}
                theme="dark"
              />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )}

  {/* ===== CODE VIEW ===== */}
  {mobileView === "code" && (
    <div className="builder-right">
      <div className="code-panel">
        <div className="code-explorer mobile-code-explorer">
          <div className="explorer-header">Files</div>
          <div className="explorer-toolbar">
            <input
              className="explorer-search"
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Search files..."
            />
          </div>
          <div className="file-tree-vertical">
            {generatedFiles.length === 0 && <div className="file-empty">No files yet</div>}
            {filteredGroupedFiles.map(({ folder, files }) => (
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
                    <span className="file-name">{file.path}</span>
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
);

}



  