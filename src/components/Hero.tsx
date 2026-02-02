import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/hero.css";
import { v4 as uuid } from "uuid";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import TubesCursor from "https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js";

const PLACEHOLDER_TEXT =
  "Build a social media scheduler app ";

type FigmaState = "idle" | "loading" | "success" | "error";


const Hero = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const starCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tubesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const modelRef = useRef<HTMLDivElement | null>(null);

  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

/* ================= AUTH CONTEXT for disabling button for guest user ================= */
const { user, setAuthModalOpen } = useAuth();
const isGuest = !user;


  /* ---------- FILE SELECT ---------- */

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (!e.target.files) return;

  setAttachedFiles((prev) => [
    ...prev,
    ...Array.from(e.target.files!),
  ]);

  e.target.value = ""; // allow re-selecting same file
};



  /* ---------- Spanized placeholder ---------- */
  const spanizedPlaceholder = useMemo(
    () =>
      PLACEHOLDER_TEXT.split("").map((char, i) => (
        <span key={i} style={{ animationDelay: `${i * 0.04}s` }}>
          {char === " " ? "\u00A0" : char}
        </span>
      )),
    []
  );

  /* ---------- IMAGE COPY–PASTE ---------- */
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;

    for (const item of items) {
      if (item.type.startsWith("image")) {
        const file = item.getAsFile();
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
          setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };



  /*---FIGMA---*/
const handleFigmaClick = () => {
  setFigmaOpen(true);
};



  /* ================= FIGMA STATE ================= */
  const [figmaOpen, setFigmaOpen] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState("");
  const [figmaState, setFigmaState] = useState<FigmaState>("idle");
  const [figmaDesign, setFigmaDesign] = useState<any>(null);

  const navigate = useNavigate();



  /* ================= navigate to builder ================= */
  const handleBuild = () => {
    const id = uuid();
    if (!text.trim()) return;

    navigate("/Builder", {
  state: {
    prompt: text,
    design: figmaDesign,
    files: attachedFiles,
  },
});

  };

  /* ================= FIGMA FLOW ================= */
  const startFigmaImport = () => {
  if (!figmaUrl.trim()) return;

  //  Validate first
  if (!figmaUrl.includes("figma.com")) {
    setFigmaState("error");
    return;
  }

  //  Then go to loading
  setFigmaState("loading");

    //frontend mock (backend later)
    setTimeout(() => {
      setFigmaDesign({
        type: "figma",
        url: figmaUrl,
        importedAt: Date.now(),
      });

      setFigmaState("success");
      setFigmaUrl("");
      // auto close modal after success
      setTimeout(() => {
        setFigmaOpen(false);
        setFigmaState("idle");
      }, 1200);
    }, 1800);
  };






  const QUICK_SUGGESTIONS = [
  {
    label: "Clone Spotify",
    //icon: "https://emergent-website-migrate.s3.us-west-2.amazonaws.com/website/spotify.svg",
    prompt: "Build a Spotify clone with playlists, auth, and music player",
  },
  {
  label: "Personal Portfolio",
  prompt: "Create a personal portfolio website with projects, skills, and contact section",
},
{
  label: "CRM Tool",
  prompt: "Build a CRM tool to manage leads, customers, and sales pipelines",
},

];

const SURPRISE_PROMPTS = [
  "Build a YouTube clone with video upload and comments",
  "Create an AI-powered note taking app",
  "Design a fitness coaching mobile app",
  "Build a SaaS dashboard with analytics",
  "Create a real-time chat application",
  "Build a productivity timer app",
  "Design a food delivery app",
  "Create a learning management system",
  "Build a crypto price tracker",
  "Design a travel planning app",
  "Create a portfolio builder",
  "Build a job board platform",
  "Design a meditation app",
  "Create an event booking system",
  "Design a finance tracking app",
  "Create a music recommendation app",
  "Build a blogging platform",
  "Design a stock watchlist app",
  "Create a multiplayer quiz app",
];


const [surpriseIndex, setSurpriseIndex] = useState(0);

const handleSurpriseMe = () => {
  const next = (surpriseIndex + 1) % SURPRISE_PROMPTS.length;
  setSurpriseIndex(next);
  setText(SURPRISE_PROMPTS[next]);
};






  /*---Models---*/

const MODELS = [
  {
    id: "claude-sonnet",
    name: "Claude 4.5 Sonnet",
    desc: "200k Context",
    icon: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Claude_AI_symbol.svg",
  },
  {
    id: "claude-opus",
    name: "Claude 4.5 Opus",
    desc: "Anthropic’s most advanced model",
    icon: "https://upload.wikimedia.org/wikipedia/commons/b/b0/Claude_AI_symbol.svg",
  },
  {
    id: "gemini",
    name: "Gemini Flash 2.5",
    desc: "Google’s fast multimodal model",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Google_Gemini_icon_2025.svg/640px-Google_Gemini_icon_2025.svg.png",
  },
  {
    id: "gpt",
    name: "GPT 5 Turbo",
    desc: "OpenAI’s latest model",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Tabler-icons_brand-openai.svg/640px-Tabler-icons_brand-openai.svg.png",
  },
];

const [selectedModel, setSelectedModel] = useState(MODELS[0]);

//const [selectedModel, setSelectedModel] = useState("Claude 4.5 Sonnet");
const [modelOpen, setModelOpen] = useState(false);

// Close model dropdown on outside click
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (
      modelOpen &&
      modelRef.current &&
      !modelRef.current.contains(event.target as Node)
    ) {
      setModelOpen(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, [modelOpen]);


  /* ---------- MICROPHONE ---------- */
  const toggleMic = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onresult = (e: any) => {
      setText((prev) => prev + " " + e.results[0][0].transcript);
    };

    recognition.onend = () => setListening(false);

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  };


  
  /* ================= TUBES CURSOR ================= */
  useEffect(() => {
    if (!tubesCanvasRef.current) return;

    const app = TubesCursor(tubesCanvasRef.current, {
      tubes: {
        colors: ["#f967fb", "#53bc28", "#6958d5"],
        lights: {
          intensity: 100,
          colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"]
        }
      }
    });

    const randomColors = (count: number) =>
      Array.from({ length: count }, () =>
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")
      );

    const onClick = () => {
      app.tubes.setColors(randomColors(3));
      app.tubes.setLightsColors(randomColors(4));
    };

    document.querySelector(".hero")?.addEventListener("click", onClick);
    return () =>
      document.querySelector(".hero")?.removeEventListener("click", onClick);
  }, []);

  /* ================= STARFIELD ================= */
  useEffect(() => {
    if (!starCanvasRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.002);

    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    camera.position.set(0, 8, 28);

    const renderer = new THREE.WebGLRenderer({
      canvas: starCanvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const count = 8000;
    const pos: number[] = [];
    const col: number[] = [];
    const size: number[] = [];

    for (let i = 0; i < count; i++) {
      const r = THREE.MathUtils.randFloat(50, 150);
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);

      pos.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      Math.random() < 0.7 ? col.push(1, 1, 1) : col.push(0.7, 0.85, 1);
      size.push(THREE.MathUtils.randFloat(0.1, 0.3));
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute("size", new THREE.Float32BufferAttribute(size, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          if (length(c) > 0.5) discard;
          gl_FragColor = vec4(vColor, 0.8);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const stars = new THREE.Points(geo, mat);
    scene.add(stars);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,
        0.4,
        0.85
      )
    );
    composer.addPass(new OutputPass());

    const clock = new THREE.Clock();
    const animate = () => {
      mat.uniforms.uTime.value = clock.getElapsedTime();
      controls.update();
      composer.render();
      requestAnimationFrame(animate);
    };
    animate();

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      renderer.dispose();
    };
  }, []);

  

  return (
    <section className="hero">
      <canvas ref={tubesCanvasRef} className="hero-tubes-canvas" />
      <canvas ref={starCanvasRef} className="hero-canvas" />

      <div className="hero-content">
        <h1>
          Turn Your Ideas Into
          <br/>
          <span>Custom-Built Apps</span>
        </h1>

        <div className="prompt-container">
          <div className="prompt-card">
    




   {/* ========== figma ATTACHMENTS ========== */}
            {figmaDesign && (
  <div className="design-badge ">
    Figma design attached
    <button onClick={() => setFigmaDesign(null)}>×</button>
  </div>
)}


{/* ========== FILE ATTACHMENTS ========== */}
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





            <div className="prompt-textarea-wrapper">
              {!text && (
                <div className="prompt-transmission">
                  {spanizedPlaceholder}
                </div>
              )}

              <textarea  className="prompt-textarea" value={text} onChange={(e) => setText(e.target.value)} onPaste={handlePaste}/>
            </div>

            {imagePreview && (
              <div className="prompt-image-preview">
                <img src={imagePreview} alt="preview" />
                <button onClick={() => setImagePreview(null)}>×</button>
              </div>
            )}

           <div className="prompt-footer single-row">
  {/* LEFT SIDE */}
  <div className="prompt-left">
    {/* + */}
   

    <button
  className={`icon-btn ${isGuest ? "disabled-btn" : ""}`}
  aria-disabled={isGuest}
  onClick={() => {
    if (isGuest) {
      setAuthModalOpen(true);
      return;
    }
    fileInputRef.current?.click();
  }}
>
  +
</button>


    {/* hidden file input */}
    <input ref={fileInputRef} type="file" multiple className="hidden-file-input" onChange={handleFileSelect}/>

    {/* Figma */}
    <button
  className={`figma-btn ${isGuest ? "disabled-btn" : ""}`}
  aria-disabled={isGuest}
  onClick={() => {
    if (isGuest) {
      setAuthModalOpen(true);
      return;
    }
    handleFigmaClick();
  }}
>
      <img src="/figma.png" alt="Figma" />
    </button>

    {/* MODEL SELECTOR */}
    <div className="model-selector" ref={modelRef}>
      <button className="model-btn" onClick={() => setModelOpen((v) => !v)}>
        <div className="model-icon-img"><img src={selectedModel.icon} alt="" className="model-icon" /></div>
         {selectedModel.name}
        <span className="chevron">▾</span>
      </button>


      {modelOpen && (
        <div className="model-dropdown">
          {MODELS.map((model) => (
             <div key={model.id} className={`model-item ${  model.id === selectedModel.id ? "active" : "" }`}
              onClick={() => {
                setSelectedModel(model);
                setModelOpen(false);
              }}
             >
               <img src={model.icon} alt="" className="model-icon" />

                <div className="model-text">
                <div className="model-name">{model.name}</div>
                <div className="model-desc">{model.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>

  {/* RIGHT SIDE */}
  <div className="prompt-right">
    {/* MIC */}
     {/*<button 
     className={`figma-btn ${isGuest ? "disabled-btn" : ""}`}
     aria-disabled={isGuest}
     onClick={() => {
       if (isGuest) {
         setAuthModalOpen(true);
         return;
        }
       toggleMic();
       }}>
      <img src="/mic.svg" alt="mic" />
    </button>

    {/* SEND */}
    <button  className={`build-btn-metal ${isGuest ? "disabled-btn" : ""}`}
    aria-disabled={isGuest}
    onClick={() =>{
     if (isGuest){
       setAuthModalOpen(true);
       return;
     }
     handleBuild();
     }}>
      <svg viewBox="0 0 32 32">
        <path d="m26.71 10.29-10-10a1 1 0 0 0-1.41 0l-10 10 1.41 1.41L15 3.41V32h2V3.41l8.29 8.29z" />
      </svg>
    </button>
  </div>
</div>
          </div>
       </div>

                       {/* ========== QUICK SUGGESTIONS ========== */}
<div className="quick-suggestions">
  {QUICK_SUGGESTIONS.map((item) => (
    <button
      key={item.label}
      className="quick-pill"
      onClick={() => setText(item.prompt)}
    >
      {/*<img src={item.icon} alt="" />*/}
      {item.label}
    </button>
  ))}

  <button
    className="quick-pill surprise"
    onClick={handleSurpriseMe}
  >
     Surprise Me ✨
  </button>
</div>
      </div>

      {figmaOpen && (
  <div className="figma-modal-overlay" onClick={() => setFigmaOpen(false)}>
    <div
      className="figma-modal"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Close */}
      <button
        className="figma-close"
        onClick={() => setFigmaOpen(false)}
      >
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
    <input
      type="text"
      placeholder="Paste Figma file or frame URL"
      value={figmaUrl}
      onChange={(e) => setFigmaUrl(e.target.value)}
    />
    <button
      className="figma-import-btn"
      onClick={startFigmaImport} >
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

      {/* Info */}
      <div className="figma-info">
         Figma has recently introduced API rate limits based on your
        subscription plan. Your request may be impacted due to this rate limit.
      </div>
    </div>
  </div>
)}

    </section>
  );
};

export default Hero;
