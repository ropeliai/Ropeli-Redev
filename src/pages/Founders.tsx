import Footer from "../components/Footer";
import Navbar from "../components/Navbar";
import StarfieldCanvas from "../components/StarfieldCanvas";
import "../styles/founders.css";

const Founders = () => {
  return (
    <>
      
<Navbar />
      {/* ⭐ Stars + content wrapper */}
      <section className="founders">
        {/* Stars background */}
        <StarfieldCanvas className="founders-stars" />

        {/* Centered content (like pricing-grid) */}
        <div className="founders-container">
          <div className="founder-glass-card">
            {/* Founder Image */}
            <div className="founder-image-wrapper">
              <img
                src="/Daanish.jpg"
                alt="Founder"
                className="founder-image"
              />
            </div>

            {/* Header */}
            <div className="founder-header">
              <div>
                <h2>Daanish Ilahi Sumkesula</h2>
                <p className="founder-role">Founder & CEO</p>
              </div>

              <a
                href="https://www.linkedin.com/in/daanish-sumkesula-81aa11285/"
                target="_blank"
                rel="noopener noreferrer"
                className="linkedin-btn"
              >
                <span>in</span>
                LinkedIn profile
              </a>
            </div>

            {/* Content */}
            <div className="founder-description">
              <p>Fueled by a passion for fast, effective coding, I interned at eight startups and delivered projects for international clients during college. Those years deep in code taught me one thing clearly: speed matters.
               I’ve built with global clients. I’ve shipped. I’ve broken things and fixed them. and Along the way, I spotted the real flaw.</p>
              <p>Building apps takes too much time, too much effort and it shuts out people with powerful ideas but no technical background. Long dev cycles and constant technical friction kill momentum. </p>
                <p>Great ideas don’t fail. Slow execution kills them.</p>
                <p>That’s why I built Ropeli AI.With Ropeli AI, you describe what you want in natural language, and it turns into a fully functional, enterprise-scale app or website complete with essential integrations. No long dev cycles. No technical roadblocks. Just execution.</p>
                <p>Too many ideas die before they ever launch. </p>
                <p>Ropeli AI is here to change that.
                This is just the first release. The real build starts now.</p>
            </div>
          </div>
        </div>
      </section>

     <Footer />
    </>
  );
};

export default Founders;
