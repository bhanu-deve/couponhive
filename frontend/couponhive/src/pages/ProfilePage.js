import React, { useState, useEffect } from 'react';
import { API } from '../api/api';
import CouponCard from '../components/CouponCard';
import CouponDetailModal from '../components/CouponDetailModal';
import UploadModal from '../components/UploadModal';

const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });

export default function ProfilePage({ user, setUser, onLogout, showToast }) {
  const [tab,        setTab]        = useState('coupons');
  const [coupons,    setCoupons]    = useState([]);
  const [allCoupons, setAllCoupons] = useState([]);
  const [editBio,    setEditBio]    = useState(false);
  const [bio,        setBio]        = useState(user.bio || '');
  const [editCoupon, setEditCoupon] = useState(null);
  const [detail,     setDetail]     = useState(null);
  const [loading,    setLoading]    = useState(true);

  // Password change state
  const [showPwForm,  setShowPwForm]  = useState(false);
  const [pwForm,      setPwForm]      = useState({ current:'', newPw:'', confirm:'' });
  const [pwError,     setPwError]     = useState('');
  const [pwLoading,   setPwLoading]   = useState(false);

  const uid = user._id || user.id;

  useEffect(() => {
    (async () => {
      try {
        const [mine, all] = await Promise.all([API.getCoupons({ userId: uid }), API.getCoupons({})]);
        setCoupons(mine); setAllCoupons(all);
      } catch (err) { showToast('Failed to load coupons', 'error'); }
      finally { setLoading(false); }
    })();
  }, [uid, showToast]);

  const saveBio = async () => {
    try {
      const updated = await API.updateMe({ bio });
      setUser({ ...user, bio: updated.bio });
      setEditBio(false);
      showToast('Bio updated!', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const changePassword = async () => {
    setPwError('');
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) { setPwError('All fields required'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    if (pwForm.newPw.length < 6) { setPwError('Password must be at least 6 characters'); return; }
    setPwLoading(true);
    try {
      await API.changePassword(pwForm.current, pwForm.newPw);
      setShowPwForm(false);
      setPwForm({ current:'', newPw:'', confirm:'' });
      showToast('Password updated successfully! 🔒', 'success');
    } catch (err) { setPwError(err.message); }
    finally { setPwLoading(false); }
  };

  const handleUpdate = (updated) => {
    setCoupons(c => c.map(x => x._id === updated._id ? updated : x));
    setAllCoupons(c => c.map(x => x._id === updated._id ? updated : x));
    if (detail?._id === updated._id) setDetail(updated);
  };
  const handleDelete = async (id) => {
    try { await API.deleteCoupon(id); setCoupons(c => c.filter(x => x._id !== id)); showToast('Coupon deleted', 'info'); }
    catch (err) { showToast(err.message, 'error'); }
  };
  const handleSaveEdit = async (data) => {
    try { const u = await API.updateCoupon(editCoupon._id, data); handleUpdate(u); setEditCoupon(null); showToast('Updated!', 'success'); }
    catch (err) { showToast(err.message, 'error'); }
  };

  const likedCoupons  = allCoupons.filter(c => c.likes?.some(id => String(id) === String(uid)));
  const totalLikes    = coupons.reduce((s, c) => s + (c.likes?.length || 0), 0);
  const totalCopies   = coupons.reduce((s, c) => s + (c.copies || 0), 0);
  const displayed     = tab === 'coupons' ? coupons : likedCoupons;

  return (
    <div>
      {/* Hero */}
      <div className="profile-hero">
        <div className="profile-container">
          <div className="profile-top">
            <div className="profile-avatar-big">{user.avatar}</div>
            <div className="profile-info">
              <div className="profile-name">
                {user.username}
                {user.role === 'admin' && <span className="admin-badge">Admin</span>}
              </div>

              {/* Bio */}
              {editBio ? (
                <div style={{ display:'flex', gap:8, marginTop:8, flexWrap:'wrap' }}>
                  <input className="form-input" style={{ flex:1, minWidth:200 }} value={bio} maxLength={200} onChange={e => setBio(e.target.value)} placeholder="Your bio..." />
                  <button className="btn btn-primary" style={{ width:'auto', padding:'10px 16px' }} onClick={saveBio}>✓ Save</button>
                  <button className="btn btn-secondary" style={{ width:'auto', padding:'10px 16px' }} onClick={() => setEditBio(false)}>Cancel</button>
                </div>
              ) : (
                <div className="profile-bio">
                  {user.bio || <em>No bio yet</em>}
                  {' '}
                  <button onClick={() => setEditBio(true)} style={{ background:'none', border:'none', color:'var(--accent)', cursor:'pointer', fontSize:'0.85rem' }}>✏️ Edit</button>
                </div>
              )}

              <div className="profile-meta">
                <div className="profile-meta-item">📅 Joined {fmtDate(user.createdAt || user.joinedAt)}</div>
                <div className="profile-meta-item">📧 {user.email}</div>
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <button className="btn btn-secondary" style={{ width:'auto', padding:'10px 20px' }} onClick={() => { setShowPwForm(p => !p); setPwError(''); }}>
                🔒 Change Password
              </button>
              <button className="btn btn-danger" style={{ width:'auto', padding:'10px 20px' }} onClick={onLogout}>
                🚪 Logout
              </button>
            </div>
          </div>

          {/* Change password inline form */}
          {showPwForm && (
            <div style={{ marginTop:24, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:14, padding:20, maxWidth:420 }}>
              <div style={{ fontFamily:'Syne', fontWeight:700, marginBottom:16 }}>🔒 Change Password</div>
              <div className="form-group">
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" placeholder="••••••••" maxLength={100}
                  value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current:e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">New Password <span className="form-label-hint">min 6 chars</span></label>
                <input className="form-input" type="password" placeholder="••••••••" maxLength={100}
                  value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw:e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <input className="form-input" type="password" placeholder="••••••••" maxLength={100}
                  value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm:e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && changePassword()} />
              </div>
              {pwError && <div className="form-error" style={{ marginBottom:12 }}>⚠️ {pwError}</div>}
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={changePassword} disabled={pwLoading}>
                  {pwLoading ? '⏳ Saving...' : 'Update Password'}
                </button>
                <button className="btn btn-secondary" style={{ flex:1 }} onClick={() => { setShowPwForm(false); setPwError(''); }}>Cancel</button>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="profile-stats">
            <div className="profile-stat"><div className="profile-stat-num">{coupons.length}</div><div className="profile-stat-label">Uploaded</div></div>
            <div className="profile-stat"><div className="profile-stat-num">{totalCopies}</div><div className="profile-stat-label">Total Uses</div></div>
            <div className="profile-stat"><div className="profile-stat-num">{totalLikes}</div><div className="profile-stat-label">Total Likes</div></div>
            <div className="profile-stat"><div className="profile-stat-num">{likedCoupons.length}</div><div className="profile-stat-label">Liked</div></div>
          </div>
        </div>
      </div>

      {/* Coupons */}
      <div className="profile-content">
        <div className="profile-tabs">
          <button className={`filter-chip ${tab==='coupons'?'active':''}`} onClick={() => setTab('coupons')}>🎟️ My Coupons ({coupons.length})</button>
          <button className={`filter-chip ${tab==='liked'?'active':''}`} onClick={() => setTab('liked')}>❤️ Liked ({likedCoupons.length})</button>
        </div>
        {loading ? <div style={{ textAlign:'center', padding:'60px', color:'var(--muted)' }}>⏳ Loading...</div> :
          displayed.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">{tab === 'coupons' ? '🎟️' : '❤️'}</div>
              <div className="empty-title">{tab === 'coupons' ? 'No coupons yet' : 'No liked coupons yet'}</div>
              <div className="empty-sub">{tab === 'coupons' ? 'Upload your first coupon!' : 'Like coupons on the home page'}</div>
            </div>
          ) : (
            <div className="grid" style={{ padding:0 }}>
              {displayed.map(c => (
                <CouponCard key={c._id} coupon={c} user={user} onCopy={() => showToast('Copied! 🎉','success')}
                  onClick={() => setDetail(c)} onUpdate={handleUpdate}
                  onEdit={tab==='coupons' ? setEditCoupon : undefined}
                  onDelete={tab==='coupons' ? handleDelete : undefined}
                  showToast={showToast} />
              ))}
            </div>
          )
        }
      </div>

      {detail     && <CouponDetailModal coupon={detail} user={user} onClose={() => setDetail(null)} onUpdate={handleUpdate} showToast={showToast} />}
      {editCoupon && <UploadModal onClose={() => setEditCoupon(null)} onSave={handleSaveEdit} editData={editCoupon} />}
    </div>
  );
}
