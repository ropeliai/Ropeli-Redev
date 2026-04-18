import { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";
import "./style-chat.css";

import { ChatMessage as ChatMessageType, ProjectConfig } from "./chat.types";

type Props = {
  messages: ChatMessageType[];
  projectConfig: ProjectConfig;
  setProjectConfig: React.Dispatch<React.SetStateAction<ProjectConfig>>;
  onConfigSubmit: () => void;
  generationElapsed?: number;
};

export default function ChatPanel({
  messages,
  projectConfig,
  setProjectConfig,
  onConfigSubmit,
  generationElapsed = 0,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="chat-area">
      {messages.map((msg, i) => (
        msg.kind === "thinking" ? (
          <ChatMessage
            key={i}
            message={msg}
            projectConfig={projectConfig}
            setProjectConfig={setProjectConfig}
            onConfigSubmit={onConfigSubmit}
            generationElapsed={generationElapsed}
          />
        ) : (
          <div key={i} className={`chat-bubble ${msg.role}`}>
            <ChatMessage
              message={msg}
              projectConfig={projectConfig}
              setProjectConfig={setProjectConfig}
              onConfigSubmit={onConfigSubmit}
            />
          </div>
        )
      ))}
      <div ref={endRef} />
    </div>
  );
}
