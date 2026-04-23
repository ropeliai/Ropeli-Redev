import { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useGitHub } from "../context/GitHubContext";
import AuthModal from "./AuthModal";
import GitHubModal from "./GitHubModal";
import "../styles/navbar.css";

const Navbar = () => {
  const {
    user,
    signOut,
    authModalOpen,
    setAuthModalOpen,
  } = useAuth();
  const { isConnected, modalOpen, setModalOpen } = useGitHub();
  const isGuest = !user;
  const navigate = useNavigate();


  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  /* Close profile dropdown on outside click (desktop only) */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        open &&
        profileRef.current &&
        !profileRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const avatarLetter = displayName.charAt(0).toUpperCase();

// Disable body scroll when mobile menu is open
  useEffect(() => {
  if (menuOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }

  return () => {
    document.body.style.overflow = "";
  };
}, [menuOpen]);


  return (
    <>
      {/* ================= NAVBAR ================= */}
      <header className="navbar">
        <div className="navbar-inner">
          {/* LOGO */}
          <div className="logo">
            <NavLink to="/">
              <span>ROPELI AI</span>
            </NavLink>
          </div>

          {/* DESKTOP LINKS */}
          <ul className="nav-links">
            <li><NavLink to="/templates">Templates</NavLink></li>
            <li><NavLink to="/developers-playground">Developer's Playground</NavLink></li>
            <li><NavLink to="/careers">Careers</NavLink></li>
            <li><NavLink to="/pricing">Pricing</NavLink></li>
          </ul>

          {/* RIGHT SIDE */}
          <div className="nav-right">
            <div className="nav-icons">
              <button 
                className={`nav-icon-btn ${isGuest ? "disabled-btn" : ""} ${isConnected ? "connected" : ""}`} 
                aria-disabled={isGuest}
                title={isConnected ? "GitHub Connected ✓" : "Connect GitHub"}
                onClick={() => {
                  if (isGuest) {
                    setAuthModalOpen(true);
                    return;
                  }
                  navigate("/github");
                }}
              >
                <img 
                  src="https://cdn.simpleicons.org/github" 
                  alt="GitHub" 
                  style={isConnected ? { filter: "brightness(0) saturate(100%) invert(80%) sepia(50%) saturate(1000%) hue-rotate(120deg)" } : {}}
                />
              </button>
              
              <button className="nav-icon-offer relative bg-[#80FFF9]/10 rounded-full h-8 w-8 flex items-center justify-center" 
              onClick={()=> navigate("/pricing")} data-testid="referral-gift-icon-button" title="40% OFF "><svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.4 10H3.6L3.6 16.4C3.6 16.8243 3.76857 17.2313 4.06863 17.5314C4.36869 17.8314 4.77565 18 5.2 18H9.2V10H4.4ZM14.8 10H10.8V18H14.8C15.2243 18 15.6313 17.8314 15.9314 17.5314C16.2314 17.2313 16.4 16.8243 16.4 16.4V10H14.8ZM15.4328 6C15.5491 5.61081 15.6055 5.20617 15.6 4.8C15.6 3.256 14.344 2 12.8 2C11.5024 2 10.636 3.1856 10.0768 4.468C9.5256 3.256 8.6152 2 7.2 2C5.656 2 4.4 3.256 4.4 4.8C4.4 5.2768 4.4632 5.6712 4.5672 6H2L2 9.2H9.2V7.6H10.8V9.2H18V6H15.4328ZM6 4.8C6 4.1384 6.5384 3.6 7.2 3.6C7.9104 3.6 8.5712 4.82 8.9584 6H6.8C6.5008 6 6 6 6 4.8ZM12.8 3.6C13.4616 3.6 14 4.1384 14 4.8C14 6 13.4992 6 13.2 6H11.2184C11.6264 4.7392 12.2192 3.6 12.8 3.6Z" fill="#80FFF9"></path></svg></button>

            </div>

            {/* DESKTOP PROFILE ONLY */}

            {!user && (
              <button
                className="signup-btn desktop-only"
                onClick={() => setAuthModalOpen(true)}
              >
                GET STARTED
              </button>
            )}

            
            {user && (
              <div className="profile-wrapper desktop-only" ref={profileRef}>
                <button
                  ref={buttonRef}
                  className="profile-btn"
                  onClick={() => setOpen((prev) => !prev)}
                >
                  <div className="avatar-circle">{avatarLetter}</div>
                </button>

                {open && (
                  <div className="profile-dropdown">
                    <div className="profile-header">
                      <div className="avatar-lg">{avatarLetter}</div>
                      <div className="profile-info">
                        <p className="profile-name">{displayName}</p>
                        <span className="plan">Free</span>
                      </div>
                    </div>

                    <ul className="profile-links">
                      <li>Account Settings</li>
                      <li onClick={() => window.open("https://discord.gg/95RzDeYU", "_blank")}>Join Discord</li>
                    </ul>

                    <button className="logout-btn" onClick={signOut}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}




            

            {/* HAMBURGER (MOBILE) */}
           <button className="hamburger" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <img src="/hamburger.svg" alt="Menu" className="hamburger-img"/>
            </button>
            {/*<button
              className="hamburger"
              onClick={() => setMenuOpen(true)}
            >
              <span> ☰</span> 
              
            </button>*/}
          </div>
        </div>
      </header>

      {/* ================= MOBILE MENU ================= */}
      {menuOpen && (
  <div className="mobile-menu slide-in">
    {/* ===== HEADER ===== */}
    <div className="mobile-menu-header">
      <span className="mobile-menu-logo">ROPELI AI</span>
      <button
        className="mobile-close"
        onClick={() => setMenuOpen(false)}
      >
        ✕
      </button>
    </div>

    {/* ===== NAV LINKS ===== */}
    <div className="mobile-menu-links">
      <NavLink to="/templates" onClick={() => setMenuOpen(false)} className="mobile-link">
        <img src="https://img.icons8.com/ios-filled/24/ffffff/grid-2.png" />
        <span>Templates</span>
      </NavLink>

      <NavLink to="/developers-playground" onClick={() => setMenuOpen(false)} className="mobile-link">
        <img src="https://img.icons8.com/ios-filled/24/ffffff/source-code.png" />
        <span>Developer’s Playground</span>
      </NavLink>

      <NavLink to="/Integrations" onClick={() => setMenuOpen(false)} className="mobile-link">
        <img src="https://img.icons8.com/ios-filled/24/ffffff/layers.png" />
        <span>Integrations</span>
      </NavLink>

      <NavLink to="/careers" onClick={() => setMenuOpen(false)} className="mobile-link">
        <img src="https://img.icons8.com/ios-filled/24/ffffff/briefcase.png" />
        <span>Careers</span>
      </NavLink>

      <NavLink to="/pricing" onClick={() => setMenuOpen(false)} className="mobile-link">
        <img src="https://img.icons8.com/ios-filled/24/ffffff/price-tag.png" />
        <span>Pricing</span>
      </NavLink>
    </div>

    {/* ===== BOTTOM (FIXED) ===== */}
    <div className="mobile-menu-bottom">
      {user && (
        <>
          <div className="mobile-profile-header">
            <div className="avatar-circle">{avatarLetter}</div>
            <span>{displayName}</span>
          </div>

          <button
            className="mobile-auth-btn logout"
            onClick={() => {
              signOut();
              setMenuOpen(false);
            }}
          >
            Logout
          </button>
        </>
      )}

      {!user && (
        <button
          className="mobile-auth-btn primary"
          onClick={() => {
            setAuthModalOpen(true);
            setMenuOpen(false);
          }}
        >
          Get started
        </button>
      )}
    </div>
  </div>
)}


      {/* ================= AUTH MODAL ================= */}
<AuthModal
  open={authModalOpen}
  onClose={() => setAuthModalOpen(false)}
/>
    </>
  );
};

export default Navbar;
