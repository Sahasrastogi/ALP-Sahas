import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  LibraryBig,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Moon,
  PenLine,
  Sun,
  User,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import './Navbar.css';

const useCloseOnPointerDownOutside = (isOpen, wrapperRef, onClose) => {
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
  }, [isOpen, onClose, wrapperRef]);
};

const useCloseOnEscape = (isOpen, onClose) => {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
};

const ThemeMenu = ({ uiTheme, onThemeChange, className = '' }) => {
  const isDark = uiTheme === 'dark';
  const ThemeIcon = isDark ? Moon : Sun;

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`.trim()}
      onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        <ThemeIcon size={16} strokeWidth={2.1} />
      </span>
    </button>
  );
};

const MoreMenu = ({ isOpen, isActive, onToggle, onClose }) => {
  const wrapperRef = useRef(null);
  useCloseOnPointerDownOutside(isOpen, wrapperRef, onClose);

  return (
    <div className="more-menu" ref={wrapperRef}>
      <button
        type="button"
        className={`more-trigger ${isActive ? 'active' : ''}`.trim()}
        onClick={() => {
          onToggle();
        }}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MoreHorizontal size={18} strokeWidth={2.1} aria-hidden="true" />
        <span className="sr-only">More</span>
      </button>

      {isOpen && (
        <div className="more-popover glass-panel" role="menu" aria-label="More">
          <Link to="/merch" className={`menu-item ${isActive ? 'is-active' : ''}`.trim()} role="menuitem" onClick={onClose}>
            <PenLine size={18} strokeWidth={2.1} aria-hidden="true" />
            <span>Studio</span>
          </Link>
        </div>
      )}
    </div>
  );
};

const ProfileMenu = ({ displayName, onLogout, isOpen, onToggle, onClose }) => {
  const wrapperRef = useRef(null);
  useCloseOnPointerDownOutside(isOpen, wrapperRef, onClose);
  useCloseOnEscape(isOpen, onClose);
  const initials = useMemo(() => {
    const base = (displayName || 'Reader').trim();
    return base ? base[0].toUpperCase() : 'R';
  }, [displayName]);
  const menuId = 'profile-menu-popover';

  return (
    <div className="profile-menu" ref={wrapperRef}>
      <button
        type="button"
        className={`profile-avatar-btn ${isOpen ? 'is-open' : ''}`.trim()}
        onClick={onToggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        <span className="profile-avatar" aria-hidden="true">{initials}</span>
        <span className="sr-only">Open profile menu</span>
      </button>

      {isOpen && (
        <div id={menuId} className="profile-popover glass-panel" role="menu" aria-label="Profile">
          <Link to="/profile" className="menu-item" role="menuitem" onClick={onClose}>
            <User size={18} strokeWidth={2.1} aria-hidden="true" />
            <span>Profile</span>
          </Link>

          <button type="button" className="menu-item menu-item-danger" role="menuitem" onClick={onLogout}>
            <LogOut size={18} strokeWidth={2.1} aria-hidden="true" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  );
};

const Navbar = ({ currentUser, onLogout, uiTheme, onThemeChange }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const isMember = Boolean(currentUser && !currentUser.isAnonymous);
  const navIconProps = useMemo(() => ({ size: 18, strokeWidth: 2.1 }), []);

  const primaryNavLinks = useMemo(
    () => [
      ...(isMember ? [
        { path: '/desk', icon: <LibraryBig {...navIconProps} />, label: 'Your Desk' },
        { path: '/library', icon: <BookOpen {...navIconProps} />, label: 'Library' }
      ] : []),
      { path: '/meet', icon: <UsersRound {...navIconProps} />, label: 'Meet' },
      { path: '/threads', icon: <MessageCircle {...navIconProps} />, label: 'Threads' },
    ],
    [isMember, navIconProps],
  );

  const studioNavLink = useMemo(
    () => ({ path: '/merch', icon: <PenLine {...navIconProps} />, label: 'Studio' }),
    [navIconProps],
  );

  const displayName = currentUser?.isAnonymous
    ? currentUser.anonymousId
    : currentUser?.name || currentUser?.email || 'Reader';

  const handleLogout = () => {
    onLogout();
    setIsMenuOpen(false);
    setIsMoreOpen(false);
    setIsProfileOpen(false);
    navigate('/');
  };

  return (
    <nav className="navbar navbar-capsule">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" aria-label="After The Last Page">
          <BookOpen className="logo-icon" size={18} strokeWidth={2.1} />
          <div className="logo-copy">
            <span className="logo-text font-serif">After The Last Page</span>
            <span className="logo-tagline">Where books become conversations</span>
          </div>
        </Link>

        <div className="nav-links-group" aria-label="Primary">
          <div className="navbar-links">
            {primaryNavLinks.map((link) => (
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

            <Link
              key={studioNavLink.path}
              to={studioNavLink.path}
              className={`nav-link nav-link-secondary ${location.pathname.startsWith(studioNavLink.path) ? 'active' : ''}`}
              aria-label={studioNavLink.label}
            >
              {studioNavLink.icon}
              <span className="nav-link-label">{studioNavLink.label}</span>
            </Link>

            <MoreMenu
              isOpen={isMoreOpen}
              isActive={location.pathname.startsWith(studioNavLink.path)}
              onToggle={() => {
                setIsMoreOpen((open) => !open);
                setIsProfileOpen(false);
              }}
              onClose={() => setIsMoreOpen(false)}
            />
          </div>
        </div>

        <div className="navbar-user-capsule">
          <ThemeMenu
            uiTheme={uiTheme}
            onThemeChange={onThemeChange}
            className="is-primary"
          />

          {currentUser ? (
            <>
              {!currentUser.isAnonymous && (
                <ProfileMenu
                  displayName={displayName}
                  onLogout={handleLogout}
                  isOpen={isProfileOpen}
                  onToggle={() => {
                    setIsProfileOpen((open) => !open);
                    setIsMoreOpen(false);
                  }}
                  onClose={() => setIsProfileOpen(false)}
                />
              )}

              {currentUser.isAnonymous && (
                <>
                  <div className="auth-chip guest" aria-label="Guest session">
                    <span className="auth-chip-dot" aria-hidden="true" />
                    <span className="auth-chip-name">{displayName}</span>
                    <span className="auth-chip-role">Guest</span>
                  </div>

                  <Link to="/auth" className="auth-link auth-link-primary">
                    <UserPlus size={18} strokeWidth={2.1} />
                    <span>Sign in</span>
                  </Link>
                </>
              )}
            </>
          ) : (
            <Link to="/auth" className="auth-link auth-link-primary">
              <LogIn size={18} strokeWidth={2.1} />
              <span>Sign in</span>
            </Link>
          )}
        </div>

        <button
          className="mobile-menu-btn"
          onClick={() => {
            setIsMenuOpen((open) => !open);
            setIsMoreOpen(false);
            setIsProfileOpen(false);
          }}
          type="button"
          aria-label="Open menu"
        >
          <Menu size={22} strokeWidth={2.1} />
        </button>
      </div>

      {isMenuOpen && (
        <div className="mobile-menu glass-panel">
          <div className="mobile-menu-row">
            <span className="mobile-menu-label">Theme</span>
            <button
              type="button"
              className="mobile-theme-toggle"
              onClick={() => onThemeChange(uiTheme === 'dark' ? 'light' : 'dark')}
            >
              {uiTheme === 'dark' ? (
                <>
                  <Moon size={16} strokeWidth={2.1} aria-hidden="true" />
                  <span>Dark</span>
                </>
              ) : (
                <>
                  <Sun size={16} strokeWidth={2.1} aria-hidden="true" />
                  <span>Light</span>
                </>
              )}
            </button>
          </div>

          {[...primaryNavLinks, studioNavLink].map((link) => (
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
