import { useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  initialValue?: string;
  buttonLabel: string;
  onSubmit: (value: string) => void;
  loading?: boolean;
}

const GitHubActionModal = ({ open, onClose, title, placeholder, initialValue = "", buttonLabel, onSubmit, loading }: Props) => {
  const [value, setValue] = useState(initialValue);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 999999, backdropFilter: "blur(8px)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(400px, 90vw)", background: "#111", border: "1px solid #333",
          borderRadius: "20px", padding: "30px", color: "white",
          boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 10px", fontSize: "1.2rem" }}>{title}</h3>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%", padding: "12px", background: "#000", border: "1px solid #333",
            borderRadius: "10px", color: "white", marginBottom: "20px", outline: "none"
          }}
          autoFocus
        />
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: "12px", background: "transparent", border: "1px solid #333", color: "white", borderRadius: "10px", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSubmit(value)}
            disabled={loading || !value}
            style={{ 
              flex: 1, padding: "12px", background: "#00f5a0", color: "black", 
              border: "none", borderRadius: "10px", fontWeight: "bold", 
              cursor: "pointer", opacity: (loading || !value) ? 0.6 : 1 
            }}
          >
            {loading ? "Processing..." : buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GitHubActionModal;
