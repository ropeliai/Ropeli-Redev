import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

type Props = {
  className?: string;
};

const StarfieldCanvas: React.FC<Props> = ({ className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    /* ---------------- SCENE ---------------- */
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.002);

    const camera = new THREE.PerspectiveCamera(65, 1, 0.1, 10000);
    camera.position.set(0, 8, 28);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    /* ---------------- STAR GEOMETRY ---------------- */
    const STAR_COUNT = 8000;
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    for (let i = 0; i < STAR_COUNT; i++) {
      const r = THREE.MathUtils.randFloat(50, 150);
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);

      positions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );

      Math.random() < 0.7
        ? colors.push(1, 1, 1)
        : colors.push(0.7, 0.85, 1);

      sizes.push(THREE.MathUtils.randFloat(0.1, 0.3));
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3)
    );
    geometry.setAttribute(
      "size",
      new THREE.Float32BufferAttribute(sizes, 1)
    );

    const material = new THREE.ShaderMaterial({
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
          gl_FragColor = vec4(vColor, 0.85);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(geometry, material);
    scene.add(stars);

    /* ---------------- CONTROLS ---------------- */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.2;

    /* ---------------- POST PROCESSING ---------------- */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(1, 1),
        1.4,
        0.4,
        0.85
      )
    );
    composer.addPass(new OutputPass());

    /* ---------------- RESIZE (SECTION-BASED ✅) ---------------- */
    const resize = () => {
      const parent = canvasRef.current?.parentElement;
      if (!parent) return;

      const width = parent.clientWidth;
      const height = parent.clientHeight;

      renderer.setSize(width, height, false);
      composer.setSize(width, height);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener("resize", resize);

    /* ---------------- ANIMATION LOOP ---------------- */
    const animate = () => {
      controls.update();
      composer.render();
      requestAnimationFrame(animate);
    };
    animate();

    /* ---------------- CLEANUP ---------------- */
    return () => {
      window.removeEventListener("resize", resize);
      controls.dispose();
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} />;
};

export default StarfieldCanvas;
