import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Shirt, Menu, LogIn, LogOut, UserPlus, MessageSquare, Users } from 'lucide-react';
import './Navbar.css';

const themeOptions = [
  { id: 'light', label: 'Light' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'dark', label: 'Dark' },
];

const Navbar = ({ currentUser, onLogout, uiTheme, onThemeChange }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navLinks = [
    { path: '/books', icon: <BookOpen size={18} />, label: 'Library' },
    { path: '/meet', icon: <Users size={18} />, label: 'Meet' },
    { path: '/threads', icon: <MessageSquare size={18} />, label: 'Threads' },
    { path: '/merch', icon: <Shirt size={18} />, label: 'Studio' },
  ];

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
        <Link to="/" className="navbar-logo">
          <BookOpen className="logo-icon" size={18} />
          <div className="logo-copy">
            <span className="logo-overline">After The Last Page</span>
            <span className="logo-text font-serif">A quiet reading instrument</span>
          </div>
        </Link>

        <div className="navbar-links">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname.startsWith(link.path) ? 'active' : ''}`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        <div className="navbar-auth">
          <div className="theme-switcher" role="group" aria-label="Reading theme">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                className={`theme-pill ${uiTheme === option.id ? 'active' : ''}`}
                onClick={() => onThemeChange(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          {currentUser ? (
            <>
              <div className={`auth-chip ${currentUser.isAnonymous ? 'guest' : 'member'}`}>
                <span className="auth-chip-label">{currentUser.isAnonymous ? 'Guest' : 'Member'}</span>
                <span className="auth-chip-name">{displayName}</span>
              </div>
              {!currentUser.isAnonymous && (
                <button className="auth-link" onClick={handleLogout}>
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

        <button className="mobile-menu-btn" onClick={() => setIsMenuOpen((open) => !open)} type="button" aria-label="Open menu">
          <Menu size={24} />
        </button>
      </div>

      {isMenuOpen && (
        <div className="mobile-menu glass-panel">
          <div className="mobile-theme-switcher" role="group" aria-label="Reading theme">
            {themeOptions.map((option) => (
              <button
                key={option.id}
                className={`theme-pill ${uiTheme === option.id ? 'active' : ''}`}
                onClick={() => onThemeChange(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
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
            <button className="mobile-nav-link button-reset" onClick={handleLogout}>
              Logout
            </button>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
