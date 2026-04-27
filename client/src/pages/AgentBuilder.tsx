import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AgentCanvas from "../components/builder/AgentCanvas";
import { useAuth } from "../context/AuthContext";
import "../styles/builder.css";

const AgentBuilder = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentWorkflow, setAgentWorkflow] = useState<any>(null);
  
  const hasAutoPromptRunRef = useRef(false);

  useEffect(() => {
    const autoPrompt = location.state?.autoPrompt;
    if (autoPrompt && !hasAutoPromptRunRef.current) {
      hasAutoPromptRunRef.current = true;
      setPrompt(autoPrompt);
      setTimeout(() => {
        handleGenerate(autoPrompt);
      }, 500);
    }
  }, [location.state]);

  const handleGenerate = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;
    setIsGenerating(true);

    try {
      const response = await fetch("/api/agent/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt }),
      });
      const result = await response.json();

      if (result?.success && result.workflow) {
        setAgentWorkflow(result.workflow);
      } else {
        alert("Workflow generation failed: " + (result.error || "Unknown error"));
      }
    } catch (error) {
      console.error(error);
      alert("Workflow generation failed.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="builder-page">
      {/* TOP BAR */}
      <div className="builder-topbar-full">
        <div className="topbar-left">
          <button className="home-btn" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="Home" />
          </button>
          <div className="topbar-prompt" title={prompt}>
            {prompt || "New AI Agent Workflow"}
          </div>
        </div>
        
        <div className="topbar-center desktop-only">
           <div className="topbar-route-pill">
            <span style={{color: '#5ef2e4', fontSize: '14px', fontWeight: 'bold'}}>🤖 Agent Workflow Studio</span>
           </div>
        </div>

        <div className="topbar-right">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=random`} alt="User" style={{ width: 28, height: 28, borderRadius: '50%' }} />
            </div>
          ) : (
            <button onClick={() => navigate("/auth")}>Sign In</button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="builder-root" style={{ flexDirection: 'column' }}>
        {/* Simple prompt bar at top if they want to regenerate */}
        <div style={{ background: '#0b0b0b', padding: '12px', borderBottom: '1px solid #222', display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            value={prompt} 
            onChange={(e) => setPrompt(e.target.value)} 
            placeholder="Describe the agent workflow you want to build..." 
            style={{ flex: 1, background: '#1a192b', color: '#fff', border: '1px solid #333', padding: '10px 14px', borderRadius: '8px', outline: 'none' }}
          />
          <button 
            onClick={() => handleGenerate(prompt)}
            disabled={isGenerating}
            style={{ background: '#5ef2e4', color: '#000', border: 'none', padding: '0 20px', borderRadius: '8px', fontWeight: 'bold', cursor: isGenerating ? 'not-allowed' : 'pointer', opacity: isGenerating ? 0.7 : 1 }}
          >
            {isGenerating ? "Generating..." : "Generate AI Agent"}
          </button>
        </div>

        {/* WORKFLOW CANVAS */}
        <div style={{ flex: 1, position: 'relative' }}>
          {isGenerating ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#5ef2e4' }}>
              <h2>Generating Custom AI Workflow...</h2>
            </div>
          ) : (
            <AgentCanvas workflow={agentWorkflow} />
          )}
        </div>
      </div>
    </section>
  );
};

export default AgentBuilder;
