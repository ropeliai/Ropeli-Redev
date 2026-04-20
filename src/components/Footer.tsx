import { NavLink } from "react-router-dom";
import "../styles/footer.css";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import ContactUsModal from "../components/ContactUsModal";


const Footer = () => {
    const [openContact, setOpenContact] = useState(false);

    
/* ================= AUTH CONTEXT for disabling button for guest user ================= */
const { user, setAuthModalOpen } = useAuth();
const isGuest = !user;


  return (
    <>
    <footer className="footer">
      <div className="footer-inner">
     
        <div className="footer-grid">
          
          <div className="footer-brand">
            <h3>ROPELI AI</h3>
            <p>AI-designed.<br />Human-inspired.</p>
          </div>

        
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><NavLink to="/developers-playground">Developer's Playground</NavLink></li>
              <li><NavLink to="/Integrations">Integrations</NavLink></li>
              <li><NavLink to="/Templates">Templates</NavLink></li>
              <li><NavLink to="/pricing">Pricing</NavLink></li>
              {/*<li><NavLink to="/dev-house">DEV HOUSE</NavLink></li>
            <li><NavLink to="/pricing">PRICING</NavLink></li>*/}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li><NavLink to="/docs">Docs</NavLink></li>
               <li><NavLink to="/blog">Blog</NavLink></li>
              <li><NavLink to="/careers">Careers</NavLink></li>
              <li><NavLink to="/founders">Founder</NavLink></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><NavLink to="/privacy">Privacy Policy</NavLink></li>
              <li><NavLink to="/terms">Terms of Service</NavLink></li>
              {/* ✅ Contact Us opens popup */}
                <li>
                  <button
                    className={`footer-link-btn ${isGuest ? "disabled-btn" : ""}`}
                    onClick={() => {
                      if(isGuest){
                        setAuthModalOpen(true);
                        return;}
                        setOpenContact(true);
                      }}
                  >
                    Contact Us
                  </button>
                </li>
            </ul>
          </div>
        </div>

        <div className="footer-divider" />

        <div className="footer-bottom">
          <span>© 2025 Ropeli AI. All rights reserved.</span>

          {/*<div className="footer-icons">
            <span>🐙</span>
            <span>💬</span>
            <span>🌐</span>
          </div>*/}
        </div>
      </div>
    </footer>
    <ContactUsModal
        open={openContact}
        onClose={() => setOpenContact(false)}
      />
    </>
  );
};

export default Footer;
