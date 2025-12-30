import { useEffect, useRef } from "react";
import "../styles/BrandingSection.css";

const BrandingSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let particles: Particle[] = [];
    const COUNT = 36;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    class Particle {
      x!: number;
      y!: number;
      vx!: number;
      vy!: number;
      size!: number;
      alpha!: number;
      maxAlpha!: number;

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y =
          Math.random() > 0.5
            ? Math.random() * canvas.height * 0.25
            : canvas.height - Math.random() * canvas.height * 0.25;

        this.vx = (Math.random() - 0.5) * 0.25;
        this.vy = (Math.random() - 0.5) * 0.15;
        this.size = Math.random() * 320 + 200;
        this.alpha = 0;
        this.maxAlpha = Math.random() * 0.06 + 0.02;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.alpha < this.maxAlpha) this.alpha += 0.0008;

        if (
          this.x < -400 ||
          this.x > canvas.width + 400 ||
          this.y < -400 ||
          this.y > canvas.height + 400
        ) {
          this.reset();
        }
      }

      draw() {
        if (!ctx) return;

        const g = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.size
        );

        g.addColorStop(0, `rgba(70,70,70,${this.alpha})`);
        g.addColorStop(1, "rgba(0,0,0,0)");

        ctx.beginPath();
        ctx.fillStyle = g;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < COUNT; i++) particles.push(new Particle());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      requestAnimationFrame(animate);
    };

    animate();
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <section className="branding-section">
      <canvas ref={canvasRef} className="smoke-canvas" />

      <div className="branding-content">
        <h1 className="brand-name">ROPELI AI</h1>
      </div>

      <div className="grain-overlay" />
    </section>
  );
};

export default BrandingSection;
