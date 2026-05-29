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
  const [agentWorkflowId, setAgentWorkflowId] = useState<string | null>(
    location.state?.workflowId ? String(location.state.workflowId) : null
  );
  const [error, setError] = useState<string | null>(null);
  
  const hasAutoPromptRunRef = useRef(false);

  useEffect(() => {
    const autoPrompt = location.state?.autoPrompt;
    if (autoPrompt && !hasAutoPromptRunRef.current) {
      hasAutoPromptRunRef.current = true;
      setPrompt(autoPrompt);
      handleGenerate(autoPrompt);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleGenerate = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setAgentWorkflow(null);

    try {
      const response = await fetch("/api/agent/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: userPrompt }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();

      if (result?.success && result.workflow && result.workflow.nodes?.length > 0) {
        setAgentWorkflow(result.workflow);
        const resolvedWorkflowId = String(result.workflow?.id || result.workflow?.workflowId || result.workflow?.workflow?.id || '').trim();
        const effectiveWorkflowId = resolvedWorkflowId && !resolvedWorkflowId.startsWith('generated-')
          ? resolvedWorkflowId
          : `workflow_${Date.now().toString(36)}_${Math.random().toString(16).slice(2)}`;

        console.warn('[Trigger] Using workflowId:', effectiveWorkflowId);
        setAgentWorkflowId(effectiveWorkflowId);
        setError(null);
      } else {
        setError(result.error || "Workflow generation returned empty results. Please try a more descriptive prompt.");
      }
    } catch (err: any) {
      console.error("Agent generation error:", err);
      setError(err.message || "Failed to connect to the server. Make sure the backend is running.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="builder-page">
      {/* TOP BAR */}
      <div className="builder-topbar-full" style={{ background: '#0a0a0f', borderBottom: '1px solid #1e1e2e', boxShadow: '0 4px 20px rgba(0,0,0,0.4)', zIndex: 20, position: 'relative' }}>
        <div className="topbar-left">
          <button className="home-btn" onClick={() => navigate("/")} style={{ background: '#14141f', border: '1px solid #2a2a40', padding: '6px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <img src="/logo.png" alt="Home" style={{ width: '28px', height: '28px', borderRadius: '4px' }} />
          </button>
          <div className="topbar-prompt" title={prompt} style={{ color: '#e0e0e0', fontWeight: 500, fontSize: '15px' }}>
            {prompt || "New AI Agent Workflow"}
          </div>
        </div>
        
        <div className="topbar-center desktop-only">
           <div className="topbar-route-pill" style={{ background: 'rgba(94, 242, 228, 0.1)', border: '1px solid rgba(94, 242, 228, 0.2)', padding: '6px 16px', borderRadius: '20px' }}>
            <span style={{color: '#5ef2e4', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase'}}>🤖 Agent Studio</span>
           </div>
        </div>

        <div className="topbar-right">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <img src={user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=random`} alt="User" style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #2a2a40' }} />
            </div>
          ) : (
            <button onClick={() => navigate("/auth")} style={{ background: '#1a192b', color: '#fff', border: '1px solid #3a395b', padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>Sign In</button>
          )}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="builder-root" style={{ flexDirection: 'column' }}>
        {/* PROMPT BAR */}
        <div style={{ 
          background: 'rgba(11, 11, 15, 0.7)', 
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          padding: '16px 24px', 
          borderBottom: '1px solid rgba(94, 242, 228, 0.1)', 
          display: 'flex', 
          gap: '16px', 
          flexShrink: 0,
          boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
          zIndex: 10
        }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <div style={{ position: 'absolute', left: '16px', color: '#5ef2e4', opacity: 0.8, fontSize: '18px' }}>✨</div>
            <input 
              type="text" 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)} 
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isGenerating) {
                  handleGenerate(prompt);
                }
              }}
              placeholder="Describe the magical AI agent you want to build today..." 
              style={{ 
                flex: 1, 
                background: 'rgba(26, 25, 43, 0.6)', 
                color: '#fff', 
                border: '1px solid rgba(94, 242, 228, 0.2)', 
                padding: '14px 14px 14px 44px', 
                borderRadius: '12px', 
                outline: 'none',
                fontSize: '15px',
                transition: 'all 0.3s ease',
                boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)'
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(94, 242, 228, 0.6)'; e.currentTarget.style.boxShadow = '0 0 15px rgba(94, 242, 228, 0.1), inset 0 2px 10px rgba(0,0,0,0.2)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(94, 242, 228, 0.2)'; e.currentTarget.style.boxShadow = 'inset 0 2px 10px rgba(0,0,0,0.2)'; }}
            />
          </div>
          <button 
            onClick={() => handleGenerate(prompt)}
            disabled={isGenerating}
            style={{ 
              background: 'linear-gradient(135deg, #5ef2e4 0%, #3bbdb1 100%)', 
              color: '#0a0a0f', 
              border: 'none', 
              padding: '0 28px', 
              borderRadius: '12px', 
              fontWeight: 'bold', 
              fontSize: '15px',
              cursor: isGenerating ? 'not-allowed' : 'pointer', 
              opacity: isGenerating ? 0.7 : 1,
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(94, 242, 228, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => { if(!isGenerating) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(94, 242, 228, 0.5)'; } }}
            onMouseOut={(e) => { if(!isGenerating) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(94, 242, 228, 0.3)'; } }}
          >
            {isGenerating ? (
              <>
                <div style={{ width: '16px', height: '16px', border: '2px solid rgba(10,10,15,0.3)', borderTopColor: '#0a0a0f', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Crafting...
              </>
            ) : "Generate AI Agent"}
          </button>
        </div>

        {/* WORKFLOW CANVAS */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {isGenerating ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050508', color: '#5ef2e4', gap: '20px' }}>
              <div style={{ 
                position: 'relative',
                width: '80px', height: '80px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  borderRadius: '50%',
                  border: '3px solid rgba(94, 242, 228, 0.1)',
                  borderTopColor: '#5ef2e4',
                  animation: 'spin 1s ease-in-out infinite',
                  boxShadow: '0 0 20px rgba(94, 242, 228, 0.2)'
                }} />
                <span style={{ fontSize: '24px' }}>✨</span>
              </div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: 700, background: 'linear-gradient(90deg, #fff, #5ef2e4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Architecting Your Agent
                </h2>
                <p style={{ color: '#888', margin: 0, fontSize: '15px' }}>Translating your ideas into an actionable workflow...</p>
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : error ? (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#050508', color: '#ff6b6b', gap: '16px', padding: '20px' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(255, 107, 107, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', border: '1px solid rgba(255, 107, 107, 0.2)' }}>
                ⚠️
              </div>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '22px' }}>Generation Interrupted</h3>
                <p style={{ margin: 0, maxWidth: '400px', color: '#aaa', fontSize: '15px', lineHeight: 1.5 }}>{error}</p>
              </div>
              <button 
                onClick={() => handleGenerate(prompt)}
                style={{ 
                  marginTop: '16px', 
                  background: 'rgba(255, 107, 107, 0.1)', 
                  color: '#ff6b6b', 
                  border: '1px solid rgba(255, 107, 107, 0.3)', 
                  padding: '12px 28px', 
                  borderRadius: '8px', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '14px'
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255, 107, 107, 0.2)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)' }}
              >
                Try Again
              </button>
            </div>
          ) : (
            <AgentCanvas workflow={agentWorkflow} workflowId={agentWorkflowId || agentWorkflow?.id || 'unknown'} />
          )}
        </div>
      </div>
    </section>
  );
};

export default AgentBuilder;
