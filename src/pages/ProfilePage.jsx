import React, { useMemo } from 'react';
import { CalendarDays, LogOut, Mail, ShieldCheck, Sparkles, User, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser } from '../utils/auth';
import { getAllBookAccessStates } from '../utils/readingAccess';
import './ProfilePage.css';

const formatMemberSince = (user) => {
  const rawDate = user?.createdAt || user?.joinedAt || user?.updatedAt || null;
  if (!rawDate) {
    return 'March 2026';
  }

  const parsedDate = new Date(rawDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return 'March 2026';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(parsedDate);
};

const ProfilePage = ({ currentUser, onLogout }) => {
  const navigate = useNavigate();

  const user = useMemo(() => {
    if (currentUser && !currentUser.isAnonymous) {
      return currentUser;
    }
    return getStoredUser();
  }, [currentUser]);

  const readingSnapshot = useMemo(() => {
    const accessStates = getAllBookAccessStates();
    const entries = Object.values(accessStates || {});

    return {
      memberSince: formatMemberSince(user),
      booksFinished: entries.filter((entry) => entry?.isRead).length,
      roomsUnlocked: entries.filter((entry) => entry?.isRead && entry?.quizPassed).length,
    };
  }, [user]);

  const displayName = user?.name || user?.email || 'Reader';
  const email = user?.email || '--';

  const handleLogout = async () => {
    if (typeof onLogout === 'function') {
      await onLogout();
    }
    navigate('/');
  };

  return (
    <div className="profile-page animate-fade-in">
      <header className="profile-head">
        <h1 className="font-serif">Profile</h1>
        <p>Your account details and reading identity.</p>
      </header>

      <section className="profile-card glass-panel" aria-label="Account details">
        <div className="profile-section-head">
          <h2 className="font-serif">Account basics</h2>
        </div>

        <div className="profile-row">
          <div className="profile-label">
            <User size={16} aria-hidden="true" />
            <span>Name</span>
          </div>
          <div className="profile-value">{displayName}</div>
        </div>

        <div className="profile-row">
          <div className="profile-label">
            <Mail size={16} aria-hidden="true" />
            <span>Email</span>
          </div>
          <div className="profile-value">{email}</div>
        </div>

        <div className="profile-row">
          <div className="profile-label">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>Status</span>
          </div>
          <div className="profile-value">Member</div>
        </div>
      </section>

      <section className="profile-card glass-panel" aria-label="Reading activity">
        <div className="profile-section-head">
          <h2 className="font-serif">Reading activity</h2>
          <p>A quiet snapshot of how your reading life is taking shape.</p>
        </div>

        <div className="profile-row">
          <div className="profile-label">
            <CalendarDays size={16} aria-hidden="true" />
            <span>Member since</span>
          </div>
          <div className="profile-value">{readingSnapshot.memberSince}</div>
        </div>

        <div className="profile-row">
          <div className="profile-label">
            <Sparkles size={16} aria-hidden="true" />
            <span>Books finished</span>
          </div>
          <div className="profile-value">{readingSnapshot.booksFinished}</div>
        </div>

        <div className="profile-row">
          <div className="profile-label">
            <Users size={16} aria-hidden="true" />
            <span>Rooms unlocked</span>
          </div>
          <div className="profile-value">{readingSnapshot.roomsUnlocked}</div>
        </div>
      </section>

      <div className="profile-actions">
        <button type="button" className="btn-secondary profile-logout" onClick={handleLogout}>
          <LogOut size={16} aria-hidden="true" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
