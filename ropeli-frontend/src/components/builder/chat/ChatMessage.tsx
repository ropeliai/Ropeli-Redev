import ConfigForm from "./ConfigForm";
import { ChatMessage as ChatMessageType, ProjectConfig } from "./chat.types";

type Props = {
  message: ChatMessageType;
  projectConfig: ProjectConfig;
  setProjectConfig: React.Dispatch<React.SetStateAction<ProjectConfig>>;
  onConfigSubmit: () => void;
  generationElapsed?: number;
};

export default function ChatMessage({
  message,
  projectConfig,
  setProjectConfig,
  onConfigSubmit,
  generationElapsed = 0,
}: Props) {
  // ✅ CONFIG FORM MESSAGE
  if (message.kind === "config_form") {
    return (
      <ConfigForm
        projectConfig={projectConfig}
        setProjectConfig={setProjectConfig}
        onSubmit={onConfigSubmit}
      />
    );
  }

  // typing animation
if (message.kind === "typing") {
  return (
    <div className="thinking">
      <span className="dot"></span>
      <span className="dot"></span>
      <span className="dot"></span>
    </div>
  );
}

if (message.kind === "thinking") {
  const mins = Math.floor(generationElapsed / 60);
  const secs = generationElapsed % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;
  const statusText =
    generationElapsed >= 120
      ? "Almost ready..."
      : generationElapsed >= 60
        ? "Taking longer than usual, please wait..."
        : `Generating... ${timeStr}`;

  return (
    <div className="chat-bubble assistant thinking-bubble">
      <div className="thinking-dots">
        <span className="dot">•</span>
        <span className="dot">•</span>
        <span className="dot">•</span>
      </div>
      <div className="thinking-timer">{statusText}</div>
    </div>
  );
}

if (message.kind === "user_input") {
  return (
    <div className="user-input-bubble">
      {message.design && (
        <div className="design-chip">
          Figma design attached
        </div>
      )}

      {message.files && (
        <div className="file-list">
          {message.files.map((f, i) => (
            <div key={i} className="file-chip">
              {f.name}
            </div>
          ))}
        </div>
      )}

      {message.content && (
        <div className="user-text">
          {message.content}
        </div>
      )}
    </div>
  );
}


  // ✅ TEXT MESSAGE (safe access)
  return <div>{message.content}</div>;
}
