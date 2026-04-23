import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/DevelopersPlayground.css";

export default function DevelopersPlayground() {
  return (
    <>
      <Navbar />

      <section className="dev-playground">
        {/* HERO */}
        <div className="dev-hero">
          <h1>Ropeli Developers Playground</h1>
          <p>
            Collaborate in real-time on prompts and AI-generated code.
            Build MVPs together in minutes with AI-assisted pair programming.
          </p>
        </div>

        {/* CONTENT */}
        <div className="dev-content">
          {/* SECTION */}
          <div className="dev-section">
            <h2>What is Developers Playground?</h2>
            <p>
              Ropeli’s Developers Playground enables seamless collaboration
              between two or more users on prompts and generated code.
              It supports real-time joint editing, AI-assisted merges,
              and rapid app prototyping in a unified environment.
            </p>
            <p>
              Designed for startup founders and developers who want to
              build MVPs faster using invite-driven pair programming workflows.
            </p>
          </div>

          {/* FEATURES */}
          <div className="dev-section">
            <h2>Core Features</h2>
            <ul>
              <li><strong>Invite-Based Collaboration:</strong> Instantly invite users into shared prompt and code sessions.</li>
              <li><strong>Dual Editing Modes:</strong> Edit LLM prompts and generated code side-by-side with live previews.</li>
              <li><strong>AI Pair Assistance:</strong> Real-time suggestions, conflict detection, and auto-merges powered by LLMs.</li>
              <li><strong>MVP Integration:</strong> One-click deployment of collaborated prototypes to production.</li>
            </ul>
          </div>

          {/* GETTING STARTED */}
          <div className="dev-section">
            <h2>Getting Started</h2>
            <ol>
              <li>Log into the Ropeli AI dashboard and open <strong>Developers Playground</strong>.</li>
              <li>Start a new session by describing your app idea.</li>
              <li>Click <strong>Invite Collaborator</strong> and add an email or username.</li>
              <li>Use the split view to edit prompts (left) and code/output (right).</li>
            </ol>
          </div>

          {/* ROLES */}
          <div className="dev-section">
            <h2>User Roles & Permissions</h2>
            <ul>
              <li><strong>Session Owner:</strong> Full control, invites, deployment, session management.</li>
              <li><strong>Collaborator:</strong> Edit prompts and code, view AI suggestions, request merges.</li>
              <li><strong>Viewer:</strong> Read-only access for feedback or mentorship.</li>
            </ul>
          </div>

          {/* WORKFLOW */}
          <div className="dev-section">
            <h2>Collaboration Workflow</h2>
            <ul>
              <li><strong>Prompt Refinement:</strong> Edit prompts together with AI optimization suggestions.</li>
              <li><strong>Code Adjustment:</strong> Modify React, Python, or Flutter code in real-time.</li>
              <li><strong>AI Mediation:</strong> Resolve conflicts with AI-proposed merges.</li>
              <li><strong>Preview & Test:</strong> Live preview updates with integrated testing agents.</li>
              <li><strong>Export & Deploy:</strong> Merge final version and deploy as a shareable MVP.</li>
            </ul>
          </div>

          {/* TECH */}
          <div className="dev-section">
            <h2>Technical Details</h2>
            <ul>
              <li><strong>Real-Time Sync:</strong> WebSockets + Operational Transforms.</li>
              <li><strong>LLM Integration:</strong> HybridForge prompt-code fusion.</li>
              <li><strong>Version Control:</strong> Auto-saved snapshots with restore support.</li>
              <li><strong>Integrations:</strong> Supabase, Razorpay, Docker.</li>
              <li><strong>Scalability:</strong> Up to 5 users per session (enterprise supports more).</li>
            </ul>
          </div>

          {/* EXAMPLE */}
          <div className="dev-section dev-example">
            <h2>Example Session</h2>
            <pre>
User A invites User B: "Build Klar travel OTA"
Prompt Edit: Multi-city search + Razorpay booking
Code Tweak: React frontend + FastAPI backend
AI Merge: Integrated search & payment flows
Deploy: ropeli.app/klar-demo
            </pre>
          </div>

          {/* BEST PRACTICES */}
          <div className="dev-section">
            <h2>Best Practices</h2>
            <ul>
              <li>Define roles early (UX vs logic).</li>
              <li>Leverage AI slash commands for faster iteration.</li>
              <li>Use session replays for async reviews.</li>
              <li>Create shared Spaces for teams.</li>
            </ul>
          </div>

          {/* TROUBLESHOOT */}
          <div className="dev-section">
            <h2>Troubleshooting</h2>
            <ul>
              <li><strong>Sync Lag:</strong> Refresh browser and check connectivity.</li>
              <li><strong>Invite Issues:</strong> Verify collaborator account status.</li>
              <li><strong>Merge Conflicts:</strong> Use AI resolver or manual override.</li>
              <li><strong>Support:</strong> info@ropeli.ai</li>
            </ul>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
