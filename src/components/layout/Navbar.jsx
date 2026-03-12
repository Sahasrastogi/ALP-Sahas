import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Check, ChevronDown, LogIn, LogOut, Menu, MessageSquare, Shirt, UserPlus, Users } from 'lucide-react';
import './Navbar.css';

const themeOptions = [
  { id: 'light', label: 'Light' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'dark', label: 'Dark' },
];

const ThemeMenu = ({ uiTheme, onThemeChange, isOpen, onToggle, onClose }) => {
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!wrapperRef.current) {
        return;
      }

      if (!wrapperRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => document.removeEventListener('pointerdown', handlePointerDown, true);
  }, [isOpen, onClose]);

  const activeLabel = useMemo(
    () => themeOptions.find((option) => option.id === uiTheme)?.label || 'Theme',
    [uiTheme],
  );

  return (
    <div className="theme-menu" ref={wrapperRef}>
      <button
        type="button"
        className="theme-trigger"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="theme-trigger-label">{activeLabel}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>

      {isOpen && (
        <div className="theme-popover glass-panel" role="listbox" aria-label="Theme">
          {themeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`theme-option ${uiTheme === option.id ? 'is-active' : ''}`}
              onClick={() => {
                onThemeChange(option.id);
                onClose();
              }}
              role="option"
              aria-selected={uiTheme === option.id}
            >
              <span>{option.label}</span>
              {uiTheme === option.id && <Check size={16} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const Navbar = ({ currentUser, onLogout, uiTheme, onThemeChange }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  const isMember = Boolean(currentUser && !currentUser.isAnonymous);

  const navLinks = useMemo(() => [
    ...(isMember ? [{ path: '/desk', icon: <BookOpen size={18} />, label: 'The Desk' }] : []),
    { path: '/meet', icon: <Users size={18} />, label: 'Meet' },
    { path: '/threads', icon: <MessageSquare size={18} />, label: 'Threads' },
    { path: '/merch', icon: <Shirt size={18} />, label: 'Studio' },
  ], [isMember]);

  const displayName = currentUser?.isAnonymous
    ? currentUser.anonymousId
    : currentUser?.name || currentUser?.email || 'Reader';

  const handleLogout = () => {
    onLogout();
    setIsMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className="navbar glass-panel">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" aria-label="After The Last Page">
          <BookOpen className="logo-icon" size={18} />
          <div className="logo-copy">
            <span className="logo-text font-serif">After The Last Page</span>
            <span className="logo-tagline">Where books become conversations</span>
          </div>
        </Link>

        <div className="navbar-links" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname.startsWith(link.path) ? 'active' : ''}`}
              aria-label={link.label}
            >
              {link.icon}
              <span className="nav-link-label">{link.label}</span>
            </Link>
          ))}
        </div>

        <div className="navbar-auth">
          <ThemeMenu
            uiTheme={uiTheme}
            onThemeChange={onThemeChange}
            isOpen={isThemeOpen}
            onToggle={() => setIsThemeOpen((open) => !open)}
            onClose={() => setIsThemeOpen(false)}
          />

          {currentUser ? (
            <>
              <div className={`auth-chip ${currentUser.isAnonymous ? 'guest' : 'member'}`} aria-label={currentUser.isAnonymous ? 'Guest session' : 'Member session'}>
                <span className="auth-chip-dot" aria-hidden="true" />
                <span className="auth-chip-name">{displayName}</span>
                <span className="auth-chip-role">{currentUser.isAnonymous ? 'Guest' : 'Member'}</span>
              </div>

              {!currentUser.isAnonymous && (
                <button type="button" className="auth-link" onClick={handleLogout} aria-label="Log out">
                  <LogOut size={18} />
                  <span>Log out</span>
                </button>
              )}

              {currentUser.isAnonymous && (
                <Link to="/auth" className="auth-link auth-link-primary">
                  <UserPlus size={18} />
                  <span>Sign in</span>
                </Link>
              )}
            </>
          ) : (
            <Link to="/auth" className="auth-link auth-link-primary">
              <LogIn size={18} />
              <span>Sign in</span>
            </Link>
          )}
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => {
            setIsMenuOpen((open) => !open);
            setIsThemeOpen(false);
          }}
          type="button"
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>
      </div>

      {isMenuOpen && (
        <div className="mobile-menu glass-panel">
          <div className="mobile-menu-row">
            <span className="mobile-menu-label">Theme</span>
            <div className="mobile-theme-select">
              {themeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`mobile-theme-option ${uiTheme === option.id ? 'active' : ''}`}
                  onClick={() => onThemeChange(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`mobile-nav-link ${location.pathname.startsWith(link.path) ? 'active' : ''}`}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}

          {currentUser?.isAnonymous && (
            <Link to="/auth" className="mobile-nav-link highlight" onClick={() => setIsMenuOpen(false)}>
              Sign in
            </Link>
          )}

          {!currentUser?.isAnonymous && currentUser && (
            <button type="button" className="mobile-nav-link button-reset" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
