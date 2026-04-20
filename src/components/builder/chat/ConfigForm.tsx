//styling in style-chat.css file

import { BuildType, Integration, ProjectConfig } from "./chat.types";
import { useState } from "react";


type Props = {
  projectConfig: ProjectConfig;
  setProjectConfig: React.Dispatch<React.SetStateAction<ProjectConfig>>;
  onSubmit: () => void;
};

export default function ConfigForm({
  projectConfig,
  setProjectConfig,
  onSubmit,
}: Props) {
  const [submitted, setSubmitted] = useState(false);

  const canContinue =
    projectConfig.buildTypes.length > 0 ||
    projectConfig.integrations.length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    setSubmitted(true);
    onSubmit();
  };

  return (
    <div className="config-card">
      <h3 className="config-title">What do you want to build?</h3>

      <div className="config-group">
        {["website", "webapp", "mobile"].map((type) => (
          <label key={type} className="checkbox-item">
            <input
              type="checkbox"
              disabled={submitted}
              checked={projectConfig.buildTypes.includes(type as BuildType)}
              onChange={(e) =>
                setProjectConfig((prev) => ({
                  ...prev,
                  buildTypes: e.target.checked
                    ? [...prev.buildTypes, type as BuildType]
                    : prev.buildTypes.filter((t) => t !== type),
                }))
              }
            />
            <span className="checkbox-ui" />
            <span className="checkbox-label">
              {type === "webapp" ? "Web Application" : type}
            </span>
          </label>
        ))}
      </div>

      <h3 className="config-title">Integrations</h3>

      <div className="config-group">
        {[
          "backend",
          "auth",
          "supabase",
          "admin",
          "payments",
          "notifications",
          "deployment",
          "logs",
        ].map((intg) => (
          <label key={intg} className="checkbox-item">
            <input
              type="checkbox"
              disabled={submitted}
              checked={projectConfig.integrations.includes(intg as Integration)}
              onChange={(e) =>
                setProjectConfig((prev) => ({
                  ...prev,
                  integrations: e.target.checked
                    ? [...prev.integrations, intg as Integration]
                    : prev.integrations.filter((i) => i !== intg),
                }))
              }
            />
            <span className="checkbox-ui" />
            <span className="checkbox-label">{intg}</span>
          </label>
        ))}
      </div>

      <button
        className="config-continue-btn"
        disabled={!canContinue || submitted}
        onClick={handleContinue}
      >
        {submitted ? "Setting up…" : "Continue"}
      </button>
    </div>
  );
}
