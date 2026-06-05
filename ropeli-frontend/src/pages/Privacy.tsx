import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/legal.css";

const LAST_UPDATED = "May 2026";
const CONTACT_EMAIL = "privacy@ropeli.ai";
const COMPANY_NAME = "Ropeli";

export default function Privacy() {
  return (
    <>
      <Navbar />
      <div className="legal-page">
        <div className="legal-container">
          <Link to="/" className="legal-back">
            ← Back to Ropeli
          </Link>

          <h1>Privacy Policy</h1>
          <p className="legal-updated">Last updated: {LAST_UPDATED}</p>

          <section>
            <h2>1. Who We Are</h2>
            <p>
              {COMPANY_NAME} is an AI-powered mobile app builder. We help users generate React
              Native applications from plain-English prompts. Our service is operated by{" "}
              {COMPANY_NAME} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
            </p>
          </section>

          <section>
            <h2>2. What Data We Collect</h2>
            <h3>Account data</h3>
            <p>
              When you create an account: your email address and a hashed password. We use
              Supabase Auth for authentication — your password is never stored in plain text.
            </p>
            <h3>Usage data</h3>
            <p>
              The prompts you type to generate apps, the apps you generate (source code and
              project names), and the timestamp of each generation. This is stored to provide your
              session history and enable the service.
            </p>
            <h3>Technical data</h3>
            <p>
              Standard server logs including IP address, browser type, and request timestamps.
              These are used for debugging and security monitoring only.
            </p>
          </section>

          <section>
            <h2>3. How We Use Your Data</h2>
            <ul>
              <li>
                To generate your app: your prompt is sent to Groq (an AI provider) to generate
                source code. Groq processes your prompt according to their own privacy policy.
              </li>
              <li>
                To provide session history: your generated apps are stored so you can return and
                continue working on them.
              </li>
              <li>
                To enforce usage limits: we count your generations per day to apply free and paid
                tier limits.
              </li>
              <li>
                To prevent abuse: we log suspicious activity patterns to protect the service.
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Third Parties We Share Data With</h2>
            <table className="legal-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>What they receive</th>
                  <th>Why</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Groq (groq.com)</td>
                  <td>Your app-building prompts</td>
                  <td>AI code generation</td>
                </tr>
                <tr>
                  <td>Supabase (supabase.com)</td>
                  <td>Your account data and generated projects</td>
                  <td>Database and authentication</td>
                </tr>
                <tr>
                  <td>Expo (expo.dev)</td>
                  <td>Generated source code</td>
                  <td>Mobile app preview and APK building</td>
                </tr>
                <tr>
                  <td>Render (render.com)</td>
                  <td>Server logs</td>
                  <td>Backend hosting</td>
                </tr>
                <tr>
                  <td>Vercel (vercel.com)</td>
                  <td>Page visit logs</td>
                  <td>Frontend hosting</td>
                </tr>
              </tbody>
            </table>
            <p>
              We do not sell your data to any third party. We do not use your data for advertising.
            </p>
          </section>

          <section>
            <h2>5. Data Retention</h2>
            <p>
              Your generated projects are stored indefinitely until you delete them or close your
              account. Generation logs (used for rate limiting) are retained for 90 days. Server
              logs are retained for 30 days.
            </p>
          </section>

          <section>
            <h2>6. Your Rights</h2>
            <p>
              You can request deletion of your account and all associated data at any time by
              emailing {CONTACT_EMAIL}. We will process deletion requests within 30 days.
            </p>
            <p>
              If you are in the EU or UK, you have additional rights under GDPR including the right
              to access, rectify, and port your data. Contact us to exercise these rights.
            </p>
          </section>

          <section>
            <h2>7. Security</h2>
            <p>
              We use industry-standard security practices: HTTPS on all connections, hashed
              passwords, JWT authentication with automatic expiry, and row-level security on all
              database tables. No system is 100% secure — if you discover a vulnerability, please
              report it to {CONTACT_EMAIL}.
            </p>
          </section>

          <section>
            <h2>8. Children</h2>
            <p>
              Ropeli is not directed at children under 13. We do not knowingly collect data from
              children under 13. If you believe we have collected such data, contact us immediately.
            </p>
          </section>

          <section>
            <h2>9. Changes to This Policy</h2>
            <p>
              We will notify registered users by email of any material changes to this policy at
              least 7 days before they take effect.
            </p>
          </section>

          <section>
            <h2>10. Contact</h2>
            <p>
              For any privacy questions:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
}
