
import "../styles/footer.css";

const Footer = () => {
  return (
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
              <li>Features</li>
              <li>Pricing</li>
              <li>Templates</li>
              <li>Developers Playground</li>
              <li>Integrations</li>
              {/*<li><NavLink to="/dev-house">DEV HOUSE</NavLink></li>
            <li><NavLink to="/pricing">PRICING</NavLink></li>*/}
            </ul>
          </div>

          <div className="footer-col">
            <h4>Company</h4>
            <ul>
              <li>About</li>
              <li>Blog</li>
              <li>Careers</li>
              <li>FAQ's</li>
              <li>Founders</li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li>Privacy</li>
              <li>Terms</li>
              <li>Contact</li>
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
  );
};

export default Footer;
