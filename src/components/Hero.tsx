import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/hero.css";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import TubesCursor from "https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js";

const PLACEHOLDER_TEXT =
  "Build a fun app I can play with my friends.";

const Hero = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const starCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tubesCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [listening, setListening] = useState(false);


  /*------------ NAVIGATE TO BUILDER -----------*/


  const navigate = useNavigate();

const handleBuild = () => {
  if (!text.trim()) {
    console.warn("Prompt is empty");
    return;
  }

  navigate("/Builder", {
    state: {
      prompt: text
    }
  });
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
          <br />
          <span>Custom-Built Apps</span>
        </h1>

        <div className="prompt-container">
          <div className="prompt-card">
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

            <div className="prompt-footer">
              <div className="prompt-left">
                <button className="icon-btn" onClick={() => fileInputRef.current?.click()}  >
                  +
                  {/*<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>*/}
                </button>
                <input  ref={fileInputRef}  type="file"  multiple  className="hidden-file-input"/>
              </div>

              {/*<button className={`icon-btn ${listening ? "active" : ""}`} type="button"  aria-label="Microphone"onClick={toggleMic}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 14 0h-2zm-5 9a7.002 7.002 0 0 0  " />
                </svg>
              </button>

              {/*<button className="build-btn-metal" type="button" aria-label="Build it">
                <svg data-name="1-Arrow Up" xmlns="http://www.w3.org/2000/svg"  viewBox="0 0 32 32">
                  <path d="m26.71 10.29-10-10a1 1 0 0 0-1.41 0l-10 10 1.41 1.41L15 3.41V32h2V3.41l8.29 8.29z" />
                </svg>
              </button>*/}

              <button className="build-btn-metal" type="button" aria-label="Build it" onClick={handleBuild} >
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
                 <path d="m26.71 10.29-10-10a1 1 0 0 0-1.41 0l-10 10 1.41 1.41L15 3.41V32h2V3.41l8.29 8.29z" />
               </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
