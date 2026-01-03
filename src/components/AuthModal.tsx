import { X } from "lucide-react";
import AuthModalContent from "../components/AuthModalContent";
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
        {/* LEFT IMAGE */}
        <div className="auth-left" />

        {/* RIGHT CONTENT */}
        <div className="auth-right">
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>

          {/* ✅ HEADER */}
  <div className="auth-header">
    <h2>Sign in / Sign up</h2>
    <p className="subtitle">
      We’ll sign you in or create an account if you don’t have one yet
    </p>
  </div>
          <AuthModalContent onSuccess={onClose} />

          <p className="terms">
            By continuing, you agree to our{" "}
            <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
