import React from 'react';
import '../App.css';

export default function Navbar({ user, onLogin, onSignup, onLogout, onUpload, onProfile, onAdmin, onHome }) {
  return (
    <nav className="nav">
      <div className="nav-logo" onClick={onHome}>
        <span>🎟️</span>
        <span><span className="accent">Coupon</span>Hive</span>
      </div>

      <div className="nav-links">
        {user ? (
          <>
            <button className="nav-btn nav-btn-primary" onClick={onUpload}>
              + Upload Coupon
            </button>
            {user.role === 'admin' && (
              <button className="nav-btn nav-btn-ghost" onClick={onAdmin}>
                ⚙️ Admin
              </button>
            )}
            <div className="nav-avatar" onClick={onProfile} title={user.username}>
              {user.avatar}
            </div>
          </>
        ) : (
          <>
            <button className="nav-btn nav-btn-outline" onClick={onLogin}>Login</button>
            <button className="nav-btn nav-btn-primary" onClick={onSignup}>Sign Up</button>
          </>
        )}
      </div>
    </nav>
  );
}
