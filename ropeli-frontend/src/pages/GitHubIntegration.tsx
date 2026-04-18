import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/GitHubIntegration.css";

export default function GitHubIntegration() {
  return (
    <>
      <Navbar />

      <section className="github-page">
        {/* HERO */}
        <div className="github-hero">
          <h1>Ropeli AI GitHub Integration</h1>
          <p>
            Push AI-generated code from Developers Playground directly to GitHub.
            Turn collaborative no-code sessions into production-ready repositories.
          </p>
        </div>

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
