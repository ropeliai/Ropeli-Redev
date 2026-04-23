import { useEffect, useRef } from "react";
import StarfieldCanvas from "../components/StarfieldCanvas";
import "../styles/BrandingSection.css";

const BrandingSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // 🔥 your existing smoke logic remains unchanged
  }, []);

  return (
    <section className="branding-section">
      {/* ⭐ STARFIELD */}
      <StarfieldCanvas className="branding-stars" />

      {/* 🌫 SMOKE */}
      <canvas ref={canvasRef} className="smoke-canvas" />

      <div className="branding-content">
        <h1 className="brand-name">ROPELI AI</h1>
      </div>

      <div className="grain-overlay" />
    </section>
  );
};

export default BrandingSection;
