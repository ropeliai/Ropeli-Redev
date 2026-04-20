import React from "react";
import { Link } from "react-router-dom";
import { Github, MessageSquare, Globe } from "lucide-react";
import "../styles/privacy.css";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const sections = [
  { id: "introduction", label: "Introduction" },
  { id: "information-we-collect", label: "Information We Collect" },
  { id: "how-we-use-your-information", label: "How We Use Your Information" },
  { id: "how-we-share-your-information", label: "How We Share Your Information" },
  { id: "your-rights-and-choices", label: "Your Rights and Choices" },
  { id: "security", label: "Security" },
  { id: "desktop-application-specifics", label: "Desktop Application Specifics" },
  { id: "data-retention", label: "Data Retention" },
  { id: "third-party-connections", label: "Third-Party Connections" },
  { id: "ai-features-and-code-analysis", label: "AI Features and Code Analysis" },
  { id: "childrens-privacy", label: "Children’s Privacy" },
  { id: "international-data-transfers", label: "International Data Transfers" },
  { id: "state-specific-rights", label: "State-Specific Rights" },
  { id: "legal-framework", label: "Legal Framework" },
  { id: "changes-to-this-privacy-policy", label: "Changes to This Privacy Policy" },
  { id: "contact-us", label: "Contact Us" },
];

export default function Privacy() {
  return (
    <>
    <Navbar />
    <div className="privacy-page">
      {/* Header */}
      <header className="privacy-header">
        <h1>Ropeli AI Privacy Policy</h1>
        <p>Last updated: 20 May 2025</p>

        {/*<Link to="/" className="back-home">
          ← Return to Home
        </Link>*/}
      </header>

      {/* Layout */}
      <div className="privacy-layout">
        {/* Sidebar */}
        <aside className="privacy-sidebar">
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.label}
            </a>
          ))}
        </aside>

        {/* Content */}
        <main className="privacy-content">
          <section id="introduction">
            <h2>Introduction</h2>
            <p>
              Ropeli AI (“we,” “our,” or “us”) values your privacy. This Privacy
              Policy explains how we collect, use, and protect your information
              when you use our site and related services (collectively, our
              “Services”). This Privacy Policy is incorporated into and subject
              to our Terms of Service.
            </p>
          </section>

          <section id="information-we-collect">
            <h2>Information We Collect</h2>

            <h3>Information You Provide to Us</h3>
            <ul>
              <li>
                <strong>Account Information:</strong> Name, email address,
                password, GitHub/other credentials, payment info (for paid
                plans), optional professional info.
              </li>
              <li>
                <strong>User Content:</strong> Code/projects, files, commands,
                configs, repository metadata, builds, test data.
              </li>
              <li>
                <strong>Communications:</strong> Support requests, feedback,
                surveys, bug reports, feature requests.
              </li>
            </ul>

            <h3>Information We Collect Automatically</h3>
            <ul>
              <li>
                <strong>Device Info:</strong> Device identifiers, OS details,
                IP/geolocation, hardware specs, clipboard (only when used).
              </li>
              <li>
                <strong>Usage Info:</strong> Features/tools used, logs, metrics,
                errors, duration, code patterns, builds.
              </li>
              <li>
                <strong>Analytics:</strong> Application usage, feature adoption,
                errors, user flows, AI agent effectiveness.
              </li>
            </ul>

            <h3>Analytics and Tracking</h3>
            <p>
              We use tools like PostHog for application analytics. You can manage
              analytics participation in app settings.
            </p>
          </section>

          <section id="how-we-use-your-information">
            <h2>How We Use Your Information</h2>
            <ul>
              <li>
                <strong>To Provide and Improve Services:</strong> Authenticate,
                deliver features, process transactions, execute code, fix bugs,
                develop features, optimize performance.
              </li>
              <li>
                <strong>Communications:</strong> Respond to requests, send
                announcements, updates, marketing (with consent).
              </li>
              <li>
                <strong>Security and Compliance:</strong> Detect fraud, prevent
                abuse, scan code, comply with regulations.
              </li>
              <li>
                <strong>Analytics/Research:</strong> Understand usage, improve
                UX, enhance AI, optimize workflows.
              </li>
            </ul>
          </section>

          <section id="how-we-share-your-information">
            <h2>How We Share Your Information</h2>
            <ul>
              <li>
                <strong>Service Providers:</strong> Payments, hosting,
                analytics, ML, database, and security providers.
              </li>
              <li>
                <strong>Connected Services:</strong> Only when you connect
                third-party services (e.g., GitHub), limited tokens/data shared.
              </li>
              <li>
                <strong>Legal Purposes:</strong> As required by law, to protect
                users or enforce Terms.
              </li>
              <li>
                <strong>Business Transfers:</strong> Data may transfer in
                acquisition/merger with prior notice.
              </li>
              <li>
                <strong>With Your Consent:</strong> Explicit consent required
                for sharing.
              </li>
              <li>
                <strong>Enterprise Users:</strong> Enhanced data protection, no
                AI training without consent.
              </li>
            </ul>
          </section>

          <section id="your-rights-and-choices">
            <h2>Your Rights and Choices</h2>
            <ul>
              <li>Review, update, or delete account (some data retained as required).</li>
              <li>Control local/cloud data via settings.</li>
              <li>Manage communications or unsubscribe.</li>
              <li>Control visibility, sharing, AI/data options, analytics.</li>
              <li>Request data access/export in standard formats.</li>
              <li>
                Contact{" "}
                <a href="mailto:privacy@ropeli.ai">privacy@ropeli.ai</a> for data
                or privacy requests (response within 7 business days).
              </li>
            </ul>
          </section>

          <section id="security">
            <h2>Security</h2>
            <p>
              Secure transit/storage encryption, secure development practices,
              access controls, and vulnerability management. While we strive to
              protect your data, no method is 100% secure.
            </p>
          </section>

          <section id="desktop-application-specifics">
            <h2>Desktop Application Specifics</h2>
            <ul>
              <li>Some code/config stays local; updates may auto-download.</li>
              <li>System integration may access dev tools for functionality.</li>
              <li>CPU, memory, and disk usage are optimized and user-configurable.</li>
            </ul>
          </section>

          <section id="data-retention">
            <h2>Data Retention</h2>
            <p>
              Data retained only as needed — account info (while active), usage
              data (up to 24 months), backups per policy, payment info per legal
              requirements.
            </p>
          </section>

          <section id="third-party-connections">
            <h2>Third-Party Connections</h2>
            <p>
              If you connect external services, data such as tokens and
              repository info may sync. Review their privacy policies.
            </p>
          </section>

          <section id="ai-features-and-code-analysis">
            <h2>AI Features and Code Analysis</h2>
            <p>
              AI may analyze code to suggest improvements, troubleshoot, or
              automate tasks. Proprietary code is not used for model training
              without consent.
            </p>
          </section>

          <section id="childrens-privacy">
            <h2>Children’s Privacy</h2>
            <p>
              Not intended for users under 13. Contact{" "}
              <a href="mailto:privacy@ropeli.ai">privacy@ropeli.ai</a> to resolve
              any inadvertent collection.
            </p>
          </section>

          <section id="international-data-transfers">
            <h2>International Data Transfers</h2>
            <p>
              Ropeli AI operates servers in the USA and India. Data may transfer
              internationally with appropriate safeguards. Using our services
              implies consent to transfer.
            </p>
          </section>

          <section id="state-specific-rights">
            <h2>State-Specific Rights</h2>
            <ul>
              <li>
                <strong>California (CCPA):</strong> Right to know, delete, opt
                out (we don’t sell data), non-discrimination.
              </li>
              <li>
                <strong>Other US States:</strong> Similar rights for CO, CT, UT,
                VA. Contact privacy@ropeli.ai to exercise.
              </li>
            </ul>
          </section>

          <section id="legal-framework">
            <h2>Legal Framework</h2>
            <p>
              This Privacy Policy is incorporated into the Ropeli AI Terms of
              Service. In case of conflict, Terms of Service prevails.
            </p>
          </section>

          <section id="changes-to-this-privacy-policy">
            <h2>Changes to This Privacy Policy</h2>
            <p>
              Updates are posted on our site. Significant changes will be
              notified 30 days in advance via app or email. Continued use means
              acceptance.
            </p>
          </section>

          <section id="contact-us">
            <h2>Contact Us</h2>
            <p>
              Questions or concerns:
              <br />
              Email: <a href="mailto:support@ropeli.ai">support@ropeli.ai</a>
              <br />
              Address: [Update to your HQ address]
              <br />
              For urgent issues, include “PRIVACY URGENT” in your subject.
            </p>
          </section>
        </main>
      </div>
    </div>
    <Footer />
    </>
  );
}