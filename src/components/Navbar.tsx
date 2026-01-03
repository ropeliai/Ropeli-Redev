/*import { useAuth } from "../context/AuthContext";
import { NavLink } from "react-router-dom";
// import logo from "../assets/logo.png";
import "../styles/navbar.css";


const Navbar = () => {
  const { user, signOut } = useAuth();
  return (
    <header className="navbar">
      <div className="navbar-inner">
         
        <div className="logo">
          <NavLink to="/" className="logo-link">
            <span>Ropeli AI</span>
          </NavLink>
        </div>


        <ul className="nav-links">
          <li><NavLink to="/templates">Templates</NavLink></li>
          <li><NavLink to="/community">Community</NavLink></li>
          <li><NavLink to="/dev-house">Dev House</NavLink></li>
          <li><NavLink to="/resources">Pricing</NavLink></li>
        </ul>

          <div>
          {user ? (
            <button onClick={signOut}>Logout</button>
          ) : (
            <NavLink to="/auth">
              <button className="signup-btn">Sign up</button>
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

*/import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthModal from "./AuthModal";
import "../styles/navbar.css";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <>
      <header className="navbar">
        <div className="navbar-inner">
          <div className="logo">
            <NavLink to="/">
             <img src="/logo.svg" alt="Ropeli AI" className="logo-img" />
              <span>ROPELI AI</span>
            </NavLink>
          </div>

          <ul className="nav-links">
            {/*<li><NavLink to="/templates">TEMPLATES</NavLink></li>
            <li><NavLink to="/community">COMMUNITY</NavLink></li>*/}
            <li><NavLink to="/dev-house">DEV HOUSE</NavLink></li>
            <li><NavLink to="/pricing">PRICING</NavLink></li>
          </ul>

          <div className="nav-right">
            {!user ? (
              <button
                className="signup-btn"
                onClick={() => setAuthOpen(true)}
              >
                GET STARTED
              </button>
            ) : (
              <div className="profile-wrapper">
                <button className="profile-btn" onClick={() => setOpen(!open)}>
                  <div className="avatar">
                    {user.email?.[0].toUpperCase()}
                  </div>
                </button>

                {open && (
  <div className="profile-dropdown advanced">
    <div className="profile-header">
      <div className="avatar-lg">
        {user.email?.[0].toUpperCase()}
      </div>
      <div>
        <p className="profile-name">Pallavi Korlagunta</p>
        <span className="plan">Free</span>
      </div>
      <span className="status-dot" />
    </div>

     {/*<button className="workspace-btn">+ New Workspace</button>

    <div className="credits">
      <span>Credits</span>
      <strong>6.34</strong>
    </div>

    {/*<button className="upgrade-btn">Upgrade ✨</button>*/}

    <ul className="profile-links">
      <li>Account Settings</li>
      <li>Join Discord</li>
    </ul>

    <button className="logout-btn" onClick={signOut}>
      Logout
    </button>
  </div>
)}

              </div>
            )}

            <button
              className="hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* AUTH POPUP */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default Navbar;
