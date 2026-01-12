import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import "../styles/docs.css";


const Docs = () => {
  return (
    <><Navbar />
    <div className="docs-layout">
      {/* Sidebar */}
      <aside className="docs-sidebar">
        <div className="docs-logo">Ropeli Docs</div>

        <nav>
          <h4>Documents</h4>
          <a href="#introduction">Introduction</a>
          <a href="#why-ropeli">Why Ropeli</a>
          <a href="#ideal-users">Ideal Users</a>
          <a href="#advantages">Advantages</a>

          <h4>Usage</h4>
          <a href="#credits">Credits & Usage</a>

          <h4>Architecture</h4>
          <a href="#project-structure">Project Structure</a>
          <a href="#key-folders">Key Folders</a>

          <h4>Integrations</h4>
          <a href="#supabase">Supabase</a>
          <a href="#auth">Authentication</a>
          <a href="#edge-functions">Edge Functions</a>

          <h4>Help</h4>
          <a href="#troubleshooting">Troubleshooting</a>
          <a href="#next-steps">Next Steps</a>
        </nav>
      </aside>

      {/* Content */}
      <main className="docs-content">
        {/* Introduction */}
        <section id="introduction">
          <h1>Ropeli AI: 2-mins prototype solution</h1>

          <p>
            Discover Ropeli documentation to create AI-driven full-stack
            applications and SaaS platforms through intelligent no-code
            generation. Master prompting techniques, integration setups,
            workflow automation, and instant deployment strategies.
          </p>

          <p>
            Ropeli AI represents a breakthrough in LLM-driven application
            development, crafted by an innovative Indian startup team for
            developers, indie makers, technical PMs, and serial entrepreneurs.
            It converts natural language descriptions into fully functional,
            production-grade web applications within 2 minutes.
          </p>

          <p>
            Produce exportable, editable codebases featuring React frontends,
            Tailwind styling, Supabase backends, Firebase services, and
            additional components ready for any deployment environment.
          </p>

          <p>
            Ropeli stands apart from conventional no-code platforms with their
            restrictive visual editors and ecosystem lock-in. This
            developer-centric approach grants complete code ownership,
            seamless integration with preferred tools like Stripe payments,
            Razorpay gateways, Slack notifications, GPT models, and beyond.
          </p>

          <p>
            Whether constructing SaaS control panels, online retail solutions,
            virtual fitting experiences, or travel booking systems, Ropeli
            materializes concepts as operational products immediately.
          </p>
        </section>

        {/* Why Ropeli */}
        <section id="why-ropeli">
          <h2>Why Ropeli Delivers Impact</h2>
          <p>
            Contemporary software creation requires velocity paired with
            architectural freedom. Manual development burdens teams with
            repetitive scaffolding, whereas typical no-code solutions constrain
            growth potential.
          </p>
          <p>
            Ropeli fuses advanced language model capabilities with precise
            specification matching to produce robust, enterprise-caliber
            applications tailored to unique requirements.
          </p>
        </section>

        {/* Ideal Users */}
        <section id="ideal-users">
          <h2>Ideal Ropeli Users</h2>
          <p>
            Ropeli's 2-minute application generator equips rapid builders who
            demand total codebase sovereignty:
          </p>

          <ul>
            <li>
              Developers and solo creators fast-tracking MVPs through Supabase
              databases, FastAPI services, and LLM pipelines.
            </li>
            <li>
              Startup operators managing projects like DVYB virtual try-on,
              Klar booking platforms, and Learnova learning systems for swift
              validation.
            </li>
            <li>
              Product squads prototyping payment flows via Stripe, messaging
              via Twilio, or data sync with Airtable.
            </li>
            <li>
              Research-driven founders balancing IEEE publications with
              market-ready deliverables.
            </li>
          </ul>

          <p>
            For those emphasizing velocity, extensibility, and codebase mastery
            in AI/ML initiatives, Ropeli provides unmatched capability.
          </p>
        </section>

        {/* Advantages */}
        <section id="advantages">
          <h2>Ropeli Advantages (Compared to No-Code Alternatives)</h2>
          <ul>
            <li>
              <strong>LLM-Powered Generation:</strong> Crafts complete
              applications from conversational prompts leveraging GPT, Claude,
              Gemini, or Perplexity models.
            </li>
            <li>
              <strong>Conversational Refinement:</strong> Enhance interfaces,
              implement authentication, connect payment processors, or resolve
              issues through interactive chat.
            </li>
            <li>
              <strong>Complete Code Sovereignty:</strong> Download pristine
              React and Python implementations compatible with GitHub, VS Code,
              or Docker containers.
            </li>
            <li>
              <strong>Seamless Deployment:</strong> Single-command publishing
              to Vercel or Netlify alongside Supabase or Firebase infrastructure.
            </li>
            <li>
              <strong>Ready-Made Components:</strong> Built-in authentication,
              payments (Stripe/Razorpay), analytics dashboards, virtual try-on,
              and multi-tenant SaaS architectures.
            </li>
            <li>
              <strong>Comprehensive Connectivity:</strong> Supabase, Firebase,
              Slack, Twilio, Resend, Google services, Airtable, AdSense with open
              API extensibility.
            </li>
          </ul>
        </section>

        {/* Credits */}
        <section id="credits">
          <h2>Credits & Usage</h2>
          <p>
            Credits represent AI tokens consumed when generating React Native
            apps and previews in Ropeli AI.
          </p>

          <ul>
            <li>1 credit = 1,000 AI tokens processed</li>
            <li>Used during app generation and previews</li>
            <li>Unused credits do not roll over</li>
            <li>Credits reset each billing cycle</li>
          </ul>
        </section>

        {/* Project Structure */}
        <section id="project-structure">
          <h2>Project Structure</h2>
          <pre>{`my-project/
├── src/
│   ├── components/
│   ├── pages/
│   ├── App.jsx
│   └── index.jsx
├── package.json
├── tailwind.config.js
└── vite.config.js`}</pre>
        </section>

        {/* Supabase */}
        <section id="supabase">
          <h2>Supabase Integration Guide</h2>
          <p>
            Ropeli projects use Supabase Postgres by default for scalable
            database operations with authentication, edge functions, and
            realtime subscriptions.
          </p>
        </section>

        {/* Edge Functions */}
        <section id="edge-functions">
          <h2>Edge Functions</h2>
          <ul>
            <li>stripe-webhook.ts</li>
            <li>twilio-sms.ts</li>
            <li>ai-chat.ts</li>
            <li>slack-notify.ts</li>
          </ul>
        </section>

        {/* Troubleshooting */}
        <section id="troubleshooting">
          <h2>Troubleshooting</h2>
          <ul>
            <li>Verify anon and service_role keys</li>
            <li>Check project permissions</li>
            <li>Clear Next.js cache</li>
          </ul>
        </section>

        {/* Next Steps */}
        <section id="next-steps">
          <h2>Next Steps</h2>
          <ul>
            <li>Generate SaaS prototype live demo</li>
            <li>Review Supabase API reference</li>
            <li>Explore enterprise features</li>
          </ul>
        </section>
      </main>
    </div>
    <Footer />
    </>
  );
};

export default Docs;
