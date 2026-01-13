import { useState } from "react";
import { supabase } from "../lib/supabase";

interface Props {
  onSuccess: () => void;
}

const AuthModalContent = ({ onSuccess }: Props) => {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetMessages = () => {
    setError(null);
    setMessage(null);
  };

  /* ---------- EMAIL / PASSWORD ---------- */

  const signUp = async () => {
    resetMessages();

    if (!email || !password) return setError("Email and password are required.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) setError(error.message);
    else setMessage("Check your email to verify your account.");
  };

  const signIn = async () => {
    resetMessages();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) setError(error.message);
    else onSuccess();
  };

  /* ---------- OAUTH ---------- */

  const signInWithGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    setLoading(false);
  };

  const signInWithGithub = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });
    setLoading(false);
  };

  return (
  <div className="auth-content">
    {/* OAuth */}
    <button className="google-btn" onClick={signInWithGoogle} disabled={loading}>
      Continue with Google
    </button>

    <button className="github-btn" onClick={signInWithGithub} disabled={loading}>
      Continue with GitHub
    </button>

    <div className="divider">OR</div>

    {/* Email */}
    <input
      className="signin-inputs"
      type="email"
      placeholder="Email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
    />

    {/* Password */}
    <input
      className="signin-inputs"
      type="password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
    />

    {/* Confirm password */}
    {mode === "signup" && (
      <input
        className="signin-inputs"
        type="password"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />
    )}

    {/* Errors */}
    {error && <p className="auth-error">{error}</p>}
    {message && <p className="auth-success">{message}</p>}

    {/*  PRIMARY CTA */}
    <button className="primary-btn" onClick={mode === "login" ? signIn : signUp} disabled={loading}>
      {loading
        ? "Please wait..."
        : mode === "login"
        ? "Sign in"
        : "Create account"}
    </button>

    {/* TOGGLE LINE */}
    <p className="auth-toggle">
      {mode === "login" ? (
        <>
          Don’t have an account?{" "}
          <span onClick={() => setMode("signup")}>Create one</span>
        </>
      ) : (
        <>
          Already have an account?{" "}
          <span onClick={() => setMode("login")}>Sign in</span>
        </>
      )}
    </p>
  </div>
);

};

export default AuthModalContent;
