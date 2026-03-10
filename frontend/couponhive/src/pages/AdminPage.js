import React, { useState, useEffect, useCallback } from 'react';
import { API } from '../api/api';

const fmtDate  = (ts) => new Date(ts).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
const daysLeft = (ts) => Math.ceil((new Date(ts) - Date.now()) / 86400000);

// Modal for editing a user's username / password
function EditCredentialsModal({ target, onClose, onSave, showToast }) {
  const [username, setUsername] = useState(target.username);
  const [newPw,    setNewPw]    = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const save = async () => {
    setError('');
    const payload = {};
    const trimmed = username.trim();
    if (trimmed !== target.username) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmed)) { setError('Username must be 3–20 alphanumeric/underscore characters'); return; }
      payload.username = trimmed;
    }
    if (newPw) {
      if (newPw.length < 6) { setError('Password must be at least 6 characters'); return; }
      if (newPw !== confirm)  { setError('Passwords do not match'); return; }
      payload.newPassword = newPw;
    }
    if (!Object.keys(payload).length) { onClose(); return; }
    setLoading(true);
    try {
      const updated = await API.adminUpdateCredentials(target._id, payload);
      onSave(updated);
      onClose();
      showToast('Credentials updated successfully!', 'success');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth:440 }}>
        <div className="modal-header">
          <div>
            <div className="modal-subtitle">Admin · Edit User</div>
            <div className="modal-title">✏️ {target.username}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">Username <span className="form-label-hint">3–20 chars, a-z/0-9/_</span></label>
            <input className="form-input" maxLength={20} value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:16, marginTop:4 }}>
            <div style={{ fontSize:'0.8rem', color:'var(--muted)', marginBottom:12 }}>Leave password fields blank to keep existing password</div>
            <div className="form-group">
              <label className="form-label">New Password <span className="form-label-hint">min 6 chars</span></label>
              <input className="form-input" type="password" placeholder="••••••••" maxLength={100} value={newPw} onChange={e => setNewPw(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" placeholder="••••••••" maxLength={100} value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && save()} />
            </div>
          </div>
          {error && <div className="form-error" style={{ marginBottom:14 }}>⚠️ {error}</div>}
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary" style={{ flex:1 }} onClick={save} disabled={loading}>{loading ? '⏳ Saving...' : '✓ Save Changes'}</button>
            <button className="btn btn-secondary" style={{ flex:1 }} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage({ user, showToast }) {
  const [section,    setSection]    = useState('overview');
  const [stats,      setStats]      = useState({});
  const [users,      setUsers]      = useState([]);
  const [reported,   setReported]   = useState([]);
  const [allCoupons, setAllCoupons] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [editTarget, setEditTarget] = useState(null); // user being edited

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [s, u, r, c] = await Promise.all([
        API.getAdminStats(), API.getAdminUsers(), API.getReportedCoupons(), API.getAdminCoupons(),
      ]);
      setStats(s); setUsers(u); setReported(r); setAllCoupons(c);
    } catch (err) { showToast('Failed to load admin data: ' + err.message, 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { refresh(); }, [refresh]);

  const blockUser     = async (uid)  => { try { const u = await API.blockUser(uid); setUsers(us => us.map(x => x._id === u._id ? u : x)); showToast(u.blocked ? 'User blocked' : 'User unblocked', 'info'); } catch (err) { showToast(err.message, 'error'); } };
  const removeUser    = async (uid)  => { if (!window.confirm('Delete this user and all their coupons?')) return; try { await API.removeUser(uid); setUsers(us => us.filter(x => x._id !== uid)); setAllCoupons(cs => cs.filter(c => c.uploadedBy !== uid)); showToast('User removed', 'success'); } catch (err) { showToast(err.message, 'error'); } };
  const removeCoupon  = async (id)   => { try { await API.adminDeleteCoupon(id); setReported(r => r.filter(c => c._id !== id)); setAllCoupons(c => c.filter(x => x._id !== id)); showToast('Coupon removed', 'success'); } catch (err) { showToast(err.message, 'error'); } };
  const verifyCoupon  = async (id)   => { try { const updated = await API.verifyCoupon(id); setAllCoupons(cs => cs.map(c => c._id === id ? updated : c)); showToast('Coupon verified ✓', 'success'); } catch (err) { showToast(err.message, 'error'); } };
  const handleCredentialSave = (updatedUser) => setUsers(us => us.map(u => u._id === updatedUser._id ? updatedUser : u));

  const nav = [
    { id:'overview', label:'📊 Overview'                                                 },
    { id:'reports',  label:`🚨 Reports${reported.length > 0 ? ` (${reported.length})` : ''}` },
    { id:'users',    label:'👥 Users'                                                    },
    { id:'coupons',  label:'🎟️ All Coupons'                                             },
  ];

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'var(--muted)' }}>
      ⏳ Loading admin data...
    </div>
  );

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <div className="admin-sidebar">
        <div className="admin-sidebar-title">⚙️ Admin Panel</div>
        {nav.map(n => (
          <div key={n.id} className={`admin-nav-item ${section === n.id ? 'active' : ''}`} onClick={() => setSection(n.id)}>
            {n.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="admin-content">

        {/* OVERVIEW */}
        {section === 'overview' && <>
          <div className="admin-title">📊 Platform Overview</div>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-card-num" style={{ color:'var(--accent)' }}>{stats.totalCoupons||0}</div><div className="stat-card-label">Total Coupons</div></div>
            <div className="stat-card"><div className="stat-card-num" style={{ color:'var(--blue)' }}>{stats.totalUsers||0}</div><div className="stat-card-label">Total Users</div></div>
            <div className="stat-card"><div className="stat-card-num" style={{ color:'var(--red)' }}>{stats.reportedCoupons||0}</div><div className="stat-card-label">Reported</div></div>
            <div className="stat-card"><div className="stat-card-num" style={{ color:'var(--green)' }}>{stats.activeUsers||0}</div><div className="stat-card-label">Active Users</div></div>
            <div className="stat-card"><div className="stat-card-num">{stats.totalCopies||0}</div><div className="stat-card-label">Total Copies</div></div>
            <div className="stat-card"><div className="stat-card-num" style={{ color:'var(--accent2)' }}>{stats.blockedUsers||0}</div><div className="stat-card-label">Blocked Users</div></div>
          </div>
        </>}

        {/* REPORTS */}
        {section === 'reports' && <>
          <div className="admin-title">🚨 Reported Coupons ({reported.length})</div>
          {reported.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">✅</div>
              <div className="empty-title">All clear!</div>
              <div className="empty-sub">No reported coupons at the moment</div>
            </div>
          ) : reported.map(c => (
            <div key={c._id} className="report-card">
              <div className="report-info">
                <h4>{c.title}</h4>
                <p>{c.store} · Code: <strong>{c.code}</strong> · By {c.uploaderName}</p>
              </div>
              <span className="report-count">{c.reports.length} report{c.reports.length > 1 ? 's' : ''}</span>
              <div className="report-actions">
                <button className="btn btn-danger btn-sm" onClick={() => removeCoupon(c._id)}>🗑️ Remove</button>
                <button className="btn btn-secondary btn-sm" onClick={() => blockUser(c.uploadedBy)}>🔒 Block User</button>
              </div>
            </div>
          ))}
        </>}

        {/* USERS */}
        {section === 'users' && <>
          <div className="admin-title">👥 All Users ({users.length})</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u._id}>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:'1.2rem' }}>{u.avatar}</span>
                        <strong>{u.username}</strong>
                      </div>
                    </td>
                    <td style={{ color:'var(--muted)', fontSize:'0.82rem' }}>{u.email}</td>
                    <td><span style={{ color:u.role==='admin'?'var(--accent)':'var(--muted)', fontWeight:600 }}>{u.role}</span></td>
                    <td><span style={{ color:u.blocked?'var(--red)':'var(--green)', fontWeight:600 }}>{u.blocked ? '🔒 Blocked' : '✅ Active'}</span></td>
                    <td style={{ fontSize:'0.8rem', color:'var(--muted)' }}>{fmtDate(u.createdAt)}</td>
                    <td>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditTarget(u)}>✏️ Edit</button>
                        {u.role !== 'admin' && <>
                          <button className="btn btn-secondary btn-sm" onClick={() => blockUser(u._id)}>{u.blocked ? '🔓 Unblock' : '🔒 Block'}</button>
                          <button className="btn btn-danger btn-sm" onClick={() => removeUser(u._id)}>🗑️</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>}

        {/* COUPONS */}
        {section === 'coupons' && <>
          <div className="admin-title">🎟️ All Coupons ({allCoupons.length})</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Title</th><th>Code</th><th>Store</th><th>Uploader</th><th>Uses</th><th>Reports</th><th>Expires</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {allCoupons.map(c => {
                  const days = daysLeft(c.expiresAt);
                  return (
                    <tr key={c._id}>
                      <td>{c.title}</td>
                      <td><code style={{ color:'var(--accent)', fontWeight:700, fontSize:'0.82rem' }}>{c.code}</code></td>
                      <td>{c.store}</td>
                      <td>{c.uploaderName}</td>
                      <td>{c.copies||0}</td>
                      <td>
                        <span style={{ color:(c.reports?.length||0)>0?'var(--red)':'var(--muted)', fontWeight:(c.reports?.length||0)>0?700:400 }}>
                          {c.reports?.length||0}{(c.reports?.length||0)>0?' ⚠️':''}
                        </span>
                      </td>
                      <td style={{ fontSize:'0.8rem', color:days<=0?'var(--red)':'var(--muted)' }}>{fmtDate(c.expiresAt)}</td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          {!c.verified && <button className="btn btn-secondary btn-sm" onClick={() => verifyCoupon(c._id)}>✓ Verify</button>}
                          <button className="btn btn-danger btn-sm" onClick={() => removeCoupon(c._id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>}
      </div>

      {/* Edit credentials modal */}
      {editTarget && (
        <EditCredentialsModal
          target={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleCredentialSave}
          showToast={showToast}
        />
      )}
    </div>
  );
}
