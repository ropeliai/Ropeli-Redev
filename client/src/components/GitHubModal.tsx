import { useState } from "react";
import { useGitHub } from "../context/GitHubContext";

interface Props {
  open: boolean;
  onClose: () => void;
}

const GitHubModal = ({ open, onClose }: Props) => {
  const { connect, disconnect, isConnected, username: currentUsername } = useGitHub();
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(true);

  if (!open) return null;

  const handleConnect = () => {
    if (!username || !token) {
      alert("Please enter both your GitHub username and Personal Access Token.");
      return;
    }
    connect(username, token);
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        zIndex: 999999, backdropFilter: "blur(15px)",
        overflowY: "auto", padding: "40px 10px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(480px, 95vw)", background: "#080808", border: "2px solid #333",
          borderRadius: "28px", padding: "40px", position: "relative",
          color: "white", boxShadow: "0 0 40px rgba(0,0,0,0.8)",
          margin: "auto 0" /* Keep it centered if it fits, but flex-start handles overflow */
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{ position: "absolute", top: "20px", right: "20px", background: "#1a1a1a", border: "1px solid #333", color: "white", width: "32px", height: "32px", borderRadius: "50%", cursor: "pointer", fontSize: "1.2rem" }}
        >
          ×
        </button>

        <div style={{ textAlign: "center", marginBottom: "35px" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: "1.8rem", color: "#fff", fontWeight: "700" }}>Link GitHub</h2>
          <p style={{ margin: 0, fontSize: "1rem", color: "#666" }}>Sync your code with repositories</p>
        </div>

        {!isConnected ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "25px" }}>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontSize: "0.85rem", color: "#80FFF9", fontWeight: "bold", letterSpacing: "0.5px" }}>GITHUB USERNAME</label>
              <input
                type="text"
                placeholder="e.g. Daanish2709g"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: "100%", padding: "15px", background: "#000", border: "1px solid #444",
                  borderRadius: "14px", color: "white", fontSize: "1rem", outline: "none",
                  boxSizing: "border-box"
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <label style={{ fontSize: "0.85rem", color: "#80FFF9", fontWeight: "bold", letterSpacing: "0.5px" }}>PERSONAL ACCESS TOKEN</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showToken ? "text" : "password"}
                  placeholder="ghp_..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  style={{
                    width: "100%", padding: "15px", background: "#000", border: "1px solid #444",
                    borderRadius: "14px", color: "white", fontSize: "1rem", outline: "none",
                    boxSizing: "border-box"
                  }}
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  style={{ position: "absolute", right: "15px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#80FFF9", cursor: "pointer", fontSize: "0.7rem", fontWeight: "800" }}
                >
                  {showToken ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            <button
              onClick={handleConnect}
              style={{
                marginTop: "15px", padding: "18px", background: "#80FFF9", color: "black",
                border: "none", borderRadius: "16px", fontWeight: "900", cursor: "pointer",
                fontSize: "1.1rem", boxSizing: "border-box"
              }}
            >
              Connect Now
            </button>
          </div>
        ) : (
          <div style={{ textAlign: "center" }}>
            <div style={{ padding: "25px", background: "#111", borderRadius: "20px", border: "1px solid #00f5a033", marginBottom: "30px" }}>
              <p style={{ color: "#00f5a0", margin: 0, fontWeight: "700", fontSize: "1.2rem" }}>✓ Linked: {currentUsername}</p>
            </div>
            <button
              onClick={disconnect}
              style={{ background: "none", border: "1px solid #333", color: "#ff4d4d", padding: "14px 30px", borderRadius: "12px", cursor: "pointer", fontWeight: "600" }}
            >
              Disconnect Account
            </button>
          </div>
        )}

        <div style={{ marginTop: "30px", fontSize: "0.75rem", color: "#333", textAlign: "center" }}>
          Saved securely to your account.
        </div>
      </div>
    </div>
  );
};

export default GitHubModal;
