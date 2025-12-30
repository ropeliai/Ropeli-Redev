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

*/

import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/navbar.css";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Left */}
        <div className="logo">
          <NavLink to="/">
            <img src="/logo.png" alt="Ropeli AI" />
            <span>ROPELI AI</span>
          </NavLink>
        </div>

        {/* Center links */}
        <ul className="nav-links">
          <li><NavLink to="/templates">TEMPLATES</NavLink></li>
          <li><NavLink to="/community">COMMUNITY</NavLink></li>
          <li><NavLink to="/dev-house">DEV HOUSE</NavLink></li>
          <li><NavLink to="/pricing">PRICING</NavLink></li>
        </ul>

        {/* Right */}
        {!user ? (
          <NavLink to="/auth">
            <button className="signup-btn">TRY ROPELI</button>
          </NavLink>
        ) : (
          <div className="profile-wrapper">
            <button className="profile-btn" onClick={() => setOpen(!open)}>
              <div className="avatar">
                {user.email?.[0].toUpperCase()}
              </div>
            </button>

            {open && (
              <div className="profile-dropdown">
                <div className="profile-header">
                  <div className="avatar large">
                    {user.email?.[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="name">
                      {user.user_metadata?.full_name || user.email}
                    </p>
                    <span className="plan">Free</span>
                  </div>
                  <span className="status-dot" />
                </div>

                {/*<div className="credits">
                  <span>Credits</span>
                  <strong>6.34</strong>
                </div>

                <button className="upgrade-btn">
                  Upgrade ✨
                </button>*/}

                <ul className="profile-links">
                  <li>Account Settings</li>
                  
                  <li>Help Center</li>
                  <li>Join Discord</li>
                </ul>

                <button className="logout-btn" onClick={signOut}>
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

