import { useState, useRef, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthModal from "./AuthModal";
import "../styles/navbar.css";

const Navbar = () => {
  const { user, signOut } = useAuth();

  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  /* 🔹 Close profile dropdown on outside click */
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
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  /* 🔹 Dynamic user name */
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* ================= NAVBAR ================= */}
      <header className="navbar">
        <div className="navbar-inner">
          {/* LOGO */}
          <div className="logo">
            <NavLink to="/">
              <img src="/logo.svg" alt="Ropeli AI" className="logo-img" />
              <span>ROPELI AI</span>
            </NavLink>
          </div>

          {/* DESKTOP LINKS */}
          <ul className="nav-links">
            <li>
              <NavLink to="/dev-house">DEV HOUSE</NavLink>
            </li>
            <li>
              <NavLink to="/pricing">PRICING</NavLink>
            </li>
          </ul>

          {/* RIGHT SIDE */}
          <div className="nav-right">
            {!user ? (
              <button className="signup-btn" onClick={() => setAuthOpen(true)}>
                GET STARTED
              </button>
            ) : (
              <div className="profile-wrapper" ref={profileRef}>
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
                      <li>Join Discord</li>
                    </ul>

                    <button className="logout-btn" onClick={signOut}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 🔹 HAMBURGER (MOBILE) */}
            <button
              className="hamburger"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>
      </header>

      {/* ================= MOBILE MENU ================= */}
      {menuOpen && (
        <div className="mobile-menu">
          <NavLink to="/dev-house" onClick={() => setMenuOpen(false)}>
            Dev House
          </NavLink>

          <NavLink to="/pricing" onClick={() => setMenuOpen(false)}>
            Pricing
          </NavLink>

          {!user ? (
            <button
              className="mobile-auth-btn"
              onClick={() => {
                setAuthOpen(true);
                setMenuOpen(false);
              }}
            >
              Get Started
            </button>
          ) : (
            <button
              className="mobile-auth-btn logout"
              onClick={() => {
                signOut();
                setMenuOpen(false);
              }}
            >
              Logout
            </button>
          )}
        </div>
      )}

      {/* ================= AUTH MODAL ================= */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
};

export default Navbar;
