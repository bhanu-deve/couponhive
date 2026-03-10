import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import './App.css';
import { API, getToken, clearToken } from './api/api';
import { useToast } from './hooks/useToast';
import Navbar from './components/Navbar';
import Toast from './components/Toast';
import AuthModal from './components/AuthModal';
import UploadModal from './components/UploadModal';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import AdminPage from './pages/AdminPage';

function AppInner() {
  const navigate = useNavigate();
  const [user,        setUser]       = useState(null);
  const [authLoading, setAuthLoading]= useState(true);
  const [authModal,   setAuthModal]  = useState(null);
  const [uploadOpen,  setUploadOpen] = useState(false);
  const [uploadKey,   setUploadKey]  = useState(0);
  const { toasts, showToast } = useToast();

  useEffect(() => {
    const restore = async () => {
      if (!getToken()) { setAuthLoading(false); return; }
      try { const u = await API.getMe(); setUser(u); }
      catch { clearToken(); }
      finally { setAuthLoading(false); }
    };
    restore();
  }, []);

  useEffect(() => {
    if (!user) return;
    const id = setInterval(async () => {
      try { await API.getMe(); }
      catch { clearToken(); setUser(null); navigate('/'); showToast('Session expired. Please log in again.', 'info'); }
    }, 30000);
    return () => clearInterval(id);
  }, [user, navigate, showToast]);

  const handleAuth = useCallback((u) => {
    setUser(u); setAuthModal(null);
    showToast(`Welcome ${u.username}! 👋`, 'success');
  }, [showToast]);

  const handleLogout = useCallback(() => {
    API.logout(); setUser(null); navigate('/');
    showToast('Logged out successfully', 'info');
  }, [navigate, showToast]);

  const handleUpload = useCallback(async (data) => {
    try {
      await API.createCoupon(data);
      setUploadOpen(false); setUploadKey(k => k + 1); navigate('/');
      showToast('Coupon uploaded! 🎉', 'success');
    } catch (err) { showToast(err.message, 'error'); }
  }, [navigate, showToast]);

  if (authLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:'3rem', marginBottom:16 }}>🎟️</div>
        <div style={{ fontFamily:'Syne', fontSize:'1.5rem', fontWeight:800, color:'var(--accent)' }}>CouponHive</div>
        <div style={{ color:'var(--muted)', marginTop:8 }}>Connecting to database...</div>
      </div>
    </div>
  );

  return (
    <div className="app">
      <Navbar user={user} onLogin={() => setAuthModal('login')} onSignup={() => setAuthModal('signup')}
        onLogout={handleLogout} onUpload={() => user ? setUploadOpen(true) : setAuthModal('login')}
        onProfile={() => navigate('/profile')} onAdmin={() => navigate('/admin')} onHome={() => navigate('/')} />
      <Routes>
        <Route path="/" element={<HomePage key={uploadKey} user={user} showToast={showToast} onNeedAuth={() => setAuthModal('login')} />} />
        <Route path="/profile" element={user ? <ProfilePage user={user} setUser={setUser} onLogout={handleLogout} showToast={showToast} /> : <Navigate to="/" />} />
        <Route path="/admin" element={user?.role === 'admin' ? <AdminPage user={user} showToast={showToast} /> : <Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      {authModal && <AuthModal mode={authModal} onClose={() => setAuthModal(null)} onAuth={handleAuth} onSwitchMode={setAuthModal} />}
      {uploadOpen && user && <UploadModal onClose={() => setUploadOpen(false)} onSave={handleUpload} />}
      <Toast toasts={toasts} />
    </div>
  );
}

export default function App() {
  return <BrowserRouter><AppInner /></BrowserRouter>;
}
