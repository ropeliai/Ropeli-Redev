import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useGitHub } from "../context/GitHubContext";
import "../styles/GitHubIntegration.css";

export default function GitHubIntegration() {
  const { isConnected, username: currentUsername, connect, disconnect, repos, fetchRepos } = useGitHub();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);

  const handleConnect = async () => {
    if (!username || !token) {
      alert("Please enter both your GitHub username and Personal Access Token.");
      return;
    }
    connect(username, token);
    setLoadingRepos(true);
    await fetchRepos();
    setLoadingRepos(false);
    alert("GitHub account linked successfully!");
  };

  return (
    <>
      <Navbar />

      <section className="github-page">
        {/* HERO */}
        <div className="github-hero">
          <h1>GitHub Integration</h1>
          <p>
            Push AI-generated code directly to your repositories or import existing projects.
          </p>
        </div>

        {/* CONNECTION CARD */}
        <div style={{ maxWidth: "600px", margin: "0 auto 4rem", background: "#0c0c0c", border: "1px solid #222", borderRadius: "16px", padding: "2rem" }}>
          <h2 style={{ fontSize: "1.4rem", marginBottom: "1.5rem", textAlign: "center" }}>
            {isConnected ? "Account Connected ✓" : "Link Your GitHub Account"}
          </h2>

          {!isConnected ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", color: "#80FFF9", display: "block", marginBottom: "8px" }}>GITHUB USERNAME</label>
                <input
                  type="text"
                  placeholder="e.g. Daanish2709g"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: "100%", padding: "12px", background: "#000", border: "1px solid #333", borderRadius: "8px", color: "white", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", color: "#80FFF9", display: "block", marginBottom: "8px" }}>PERSONAL ACCESS TOKEN</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showToken ? "text" : "password"}
                    placeholder="ghp_..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    style={{ width: "100%", padding: "12px", background: "#000", border: "1px solid #333", borderRadius: "8px", color: "white", boxSizing: "border-box" }}
                  />
                  <button
                    onClick={() => setShowToken(!showToken)}
                    style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#80FFF9", cursor: "pointer", fontSize: "0.7rem", fontWeight: "bold" }}
                  >
                    {showToken ? "HIDE" : "SHOW"}
                  </button>
                </div>
              </div>

              <button
                onClick={handleConnect}
                style={{ marginTop: "10px", padding: "14px", background: "#80FFF9", color: "black", border: "none", borderRadius: "10px", fontWeight: "700", cursor: "pointer", fontSize: "1rem" }}
              >
                Connect to GitHub
              </button>

              <p style={{ fontSize: "0.75rem", color: "#666", textAlign: "center", marginTop: "10px" }}>
                Generate a token at Settings → Developer Settings → PAT (classic) with 'repo' scope.
              </p>
            </div>
          ) : (
            <div style={{ textAlign: "center" }}>
              <div style={{ padding: "1.5rem", background: "#111", borderRadius: "12px", border: "1px solid #00f5a022", marginBottom: "1.5rem" }}>
                <p style={{ color: "#00f5a0", margin: 0, fontWeight: "600", fontSize: "1.1rem" }}>
                  Connected as {currentUsername}
                </p>
              </div>
              <button
                onClick={disconnect}
                style={{ background: "none", border: "1px solid #333", color: "#ff4d4d", padding: "10px 20px", borderRadius: "8px", cursor: "pointer" }}
              >
                Disconnect Account
              </button>
            </div>
          )}
        </div>

        {/* REPOSITORY LIST */}
        {isConnected && (
          <div style={{ maxWidth: "1100px", margin: "0 auto 4rem" }}>
            <h2 style={{ fontSize: "1.6rem", marginBottom: "1.5rem" }}>Your Repositories ({repos.length})</h2>
            
            {loadingRepos ? (
               <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>Loading repositories...</div>
            ) : repos.length === 0 ? (
               <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>No public repositories found.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
                {repos.map((repo: any) => (
                  <div key={repo.id} style={{ background: "#0c0c0c", border: "1px solid #222", borderRadius: "12px", padding: "1.5rem", transition: "transform 0.2s", cursor: "default" }}>
                    <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                      <img src="https://cdn.simpleicons.org/github" alt="" style={{ width: "16px", filter: "invert(1)" }} />
                      {repo.name}
                    </h3>
                    <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "#888", height: "40px", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {repo.description || "No description provided."}
                    </p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                      <span style={{ fontSize: "0.75rem", color: "#555" }}>
                        ★ {repo.stargazers_count} | ⑂ {repo.forks_count}
                      </span>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <a 
                          href={repo.html_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          style={{ fontSize: "0.8rem", color: "#888", textDecoration: "none", padding: "6px 12px", border: "1px solid #333", borderRadius: "6px" }}
                        >
                          GitHub →
                        </a>
                        <button
                          onClick={() => navigate(`/builder?importRepoUrl=${encodeURIComponent(repo.html_url)}`)}
                          style={{ fontSize: "0.8rem", color: "#000", background: "#80FFF9", textDecoration: "none", padding: "6px 12px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                        >
                          Import to Builder
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CONTENT */}
        <div className="github-content">
          <section>
            <h2>Overview</h2>
            <p>
              Ropeli AI’s GitHub integration bridges collaborative app building
              with professional development workflows. Pair-edited prompts,
              merged code, and session metadata are auto-saved as clean,
              production-ready commits.
            </p>
          </section>

          <section>
            <h2>Key Benefits</h2>
            <ul>
              <li>Auto-generate repositories with code + collaboration context</li>
              <li>Track pair-programming changes with rich metadata</li>
              <li>Enable CI/CD pipelines from day-one prototypes</li>
              <li>Continue development in VS Code or GitHub Codespaces</li>
            </ul>
          </section>

          <section>
            <h2>Prerequisites</h2>
            <ul>
              <li>Ropeli AI account (Free tier supported)</li>
              <li>GitHub account with repo create & push permissions</li>
              <li>Completed Playground session with merged code</li>
            </ul>
          </section>

          <section>
            <h2>Setup</h2>
            <ol>
              <li>
                In Playground, click <strong>Connect GitHub</strong> (top-right)
                and authorize Ropeli (one-time).
              </li>
              <li>
                Verify connection via{" "}
                <strong>Profile → Integrations → GitHub</strong>.
              </li>
            </ol>

            <pre className="code-block">
              Profile → Integrations → GitHub → "Connect Account"
              → Redirects to GitHub OAuth
              → Back to Ropeli: "Connected as yourusername ✓"
            </pre>
          </section>

          <section>
            <h2>Export Workflows</h2>

            <h3>1. New Repository Creation (Recommended)</h3>
            <pre className="code-block">
              Session complete → "Push to GitHub" → "Create New Repo"
              ├── Repo: ropeli-[appname]-[sessionid]
              ├── Branch: main
              ├── Commit: "Ropeli Playground MVP v1.0"
              └── Files pushed instantly
            </pre>

            <h3>2. Push to Existing Repository</h3>
            <pre className="code-block">
              "Push to GitHub" → Select repo → Choose branch
              → Creates Pull Request
              → Auto-generated session summary
            </pre>

            <h3>3. Branch per Session</h3>
            <pre className="code-block">
              Enable: Playground Settings → "Auto-branch sessions"
              → Each session = new feature branch
              → Merge via GitHub PR
            </pre>
          </section>

          <section>
            <h2>What Gets Pushed</h2>
            <pre className="code-block">
              ropeli-spyc-mvp-abc123/
              ├── src/
              │   ├── app.py
              │   ├── components/
              │   └── package.json
              ├── .ropeli-meta.json
              ├── PROMPTS.md
              ├── README.md
              ├── docker-compose.yml
              └── .github/workflows/
            </pre>
          </section>

          <section>
            <h2>Advanced Features</h2>

            <h3>Bidirectional Sync</h3>
            <ul>
              <li>GitHub → Ropeli: PR updates refresh Playground preview</li>
              <li>Ropeli → GitHub: Live commits during extended sessions</li>
            </ul>

            <h3>Session Metadata</h3>
            <pre className="code-block">
              {`{
  "session_id": "abc123",
  "collaborators": ["founder@startup.com", "designer@team.com"],
  "merge_conflicts_resolved": 3,
  "live_demo": "https://ropeli.app/preview/spyc-abc123"
}`}
            </pre>
          </section>

          <section>
            <h2>Auto-Generated README</h2>
            <pre className="code-block">
              # Spotify Clone MVP – Ropeli Playground

              docker-compose up
              npm install && npm run dev

              Built collaboratively.
              Prompts: PROMPTS.md
              Session: .ropeli-meta.json
            </pre>
          </section>

          <section>
            <h2>User Commands (Slash Menu)</h2>
            <pre className="code-block">
              /github-new [reponame]
              /github-push
              /github-branch [name]
              /github-pr
              /sync-github
            </pre>
          </section>
        </div>
      </section>

      <Footer />
    </>
  );
}
