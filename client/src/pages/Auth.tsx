import { useState } from "react";
import { supabase } from "../lib/supabase";

const Auth = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetMessages = () => {
    setError(null);
    setMessage(null);
  };

  /* ---------------- EMAIL / PASSWORD ---------------- */

  const signUp = async () => {
    resetMessages();

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Check your email to verify your account.");
    }
  };

  const signIn = async () => {
    resetMessages();

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) setError(error.message);
  };

  const resetPassword = async () => {
    resetMessages();

    if (!email) {
      setError("Enter your email to reset password.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Password reset email sent.");
    }
  };

  /* ---------------- OAUTH ---------------- */

  const signInWithGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({ provider: "google" });
    setLoading(false);
  };

  const signInWithGithub = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({ provider: "github" });
    setLoading(false);
  };

  /* ---------------- UI ---------------- */

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "black",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          color: "white",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <h1>{mode === "login" ? "Login" : "Sign up"}</h1>

        {/* OAuth */}
        <button onClick={signInWithGoogle} disabled={loading}>
          Continue with Google
        </button>
        <button onClick={signInWithGithub} disabled={loading}>
          Continue with GitHub
        </button>

        <div style={{ opacity: 0.6, margin: "1rem 0" }}>or</div>

        {/* Email */}
        <label>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        {/* Password */}
        <label>Password</label>
        <div style={{ position: "relative" }}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{ width: "100%" }}
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              cursor: "pointer",
              opacity: 0.7,
            }}
          >
            {showPassword ? "Hide" : "Show"}
          </span>
        </div>

        {/* Confirm Password */}
        {mode === "signup" && (
          <>
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </>
        )}

        {/* Errors / Messages */}
        {error && <div style={{ color: "#ff6b6b" }}>{error}</div>}
        {message && <div style={{ color: "#4ade80" }}>{message}</div>}

        {/* Actions */}
        {mode === "login" ? (
          <>
            <button onClick={signIn} disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </button>

            <button
              onClick={resetPassword}
              style={{ background: "transparent", opacity: 0.7 }}
            >
              Forgot password?
            </button>
          </>
        ) : (
          <button onClick={signUp} disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </button>
        )}

        {/* Mode Toggle */}
        <div style={{ opacity: 0.7 }}>
          {mode === "login" ? (
            <>
              New here?{" "}
              <span
                style={{ cursor: "pointer", textDecoration: "underline" }}
                onClick={() => setMode("signup")}
              >
                Sign up
              </span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span
                style={{ cursor: "pointer", textDecoration: "underline" }}
                onClick={() => setMode("login")}
              >
                Login
              </span>
            </>
          )}
        </div>

        {/* Legal */}
        <p style={{ fontSize: "12px", opacity: 0.5, marginTop: "1rem" }}>
          By continuing, you agree to our{" "}
          <span style={{ textDecoration: "underline" }}>Terms</span> &{" "}
          <span style={{ textDecoration: "underline" }}>Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
};

export default Auth;
