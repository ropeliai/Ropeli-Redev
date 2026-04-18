import { X } from "lucide-react";
import AuthModalContent from "../components/AuthModalContent";
import StarfieldCanvas from "../components/StarfieldCanvas";
import "../styles/authModal.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

const AuthModal = ({ open, onClose }: Props) => {
  if (!open) return null;

  return (
    <div className="auth-overlay">
      <div className="auth-modal">
        {/* left stars with Ropeliai name */}
        <div className="auth-left">
          <StarfieldCanvas className="auth-starfield" />
          <div className="auth-brand">
            <h1>ROPELI AI</h1>
            </div>
        </div>

        {/* RIGHT CONTENT */}
        <div className="auth-right">
          <button className="close-btnn" onClick={onClose}>
            <X size={18} />
          </button>

          {/*  HEADER */}
  <div className="auth-header">
    <h2>Sign in / Sign up</h2>
    <p className="subtitle">
      We’ll sign you in or create an account if you don’t have one yet
    </p>
  </div>
          <AuthModalContent onSuccess={onClose} />

          <p className="terms">
            By continuing, you agree to our{" "}
            <a href="/terms" className="terms-a">Terms</a> and <a href="/privacy"  className="terms-a">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
