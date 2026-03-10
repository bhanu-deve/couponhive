import React,{useState} from 'react';
const CATEGORIES=['Shopping','Food','Electronics','Fashion','Travel','Beauty','Shipping','Other'];
const todayISO=()=>new Date().toISOString().split('T')[0];
const sanitizeCode=(s)=>String(s||'').toUpperCase().replace(/[^A-Z0-9\-_]/g,'').slice(0,30);
export default function UploadModal({onClose,onSave,editData}){
  const [form,setForm]=useState(editData?{...editData,expiresAt:editData.expiresAt?new Date(editData.expiresAt).toISOString().split('T')[0]:''}:{title:'',code:'',description:'',store:'',category:'Shopping',discount:'',expiresAt:''});
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  const submit=()=>{
    const title=(form.title||'').trim().slice(0,100);
    const code=sanitizeCode(form.code);
    const store=(form.store||'').trim().slice(0,60);
    if(!title){setError('Title is required');return;}
    if(!code){setError('Coupon code is required (letters, numbers, dashes only)');return;}
    if(!store){setError('Store name is required');return;}
    setLoading(true);
    const expiresAt=form.expiresAt?new Date(form.expiresAt).toISOString():new Date(Date.now()+86400000*30).toISOString();
    onSave({...form,title,code,store,expiresAt});
    setLoading(false);
  };
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{editData?'✏️ Edit Coupon':'🎁 Upload Coupon'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group"><label className="form-label">Coupon Title * <span className="form-label-hint">{form.title.length}/100</span></label><input className="form-input" placeholder="20% Off Everything" maxLength={100} value={form.title} onChange={e=>set('title',e.target.value)}/></div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Code * <span className="form-label-hint">A-Z 0-9 -_</span></label><input className="form-input" placeholder="SAVE20" maxLength={30} value={form.code} onChange={e=>set('code',sanitizeCode(e.target.value))}/></div>
            <div className="form-group"><label className="form-label">Store *</label><input className="form-input" placeholder="Amazon" maxLength={60} value={form.store} onChange={e=>set('store',e.target.value)}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Category</label><select className="form-input" value={form.category} onChange={e=>set('category',e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Discount</label><input className="form-input" placeholder="20% / $10 / BOGO" maxLength={30} value={form.discount} onChange={e=>set('discount',e.target.value)}/></div>
          </div>
          <div className="form-group"><label className="form-label">Expiry Date <span className="form-label-hint">Leave blank = 30 days</span></label><input className="form-input" type="date" min={todayISO()} value={form.expiresAt||''} onChange={e=>set('expiresAt',e.target.value)}/></div>
          <div className="form-group"><label className="form-label">Description <span className="form-label-hint">{(form.description||'').length}/500</span></label><textarea className="form-input" placeholder="How to use this coupon..." maxLength={500} value={form.description||''} onChange={e=>set('description',e.target.value)}/></div>
          {error&&<div className="form-error" style={{marginBottom:16}}>⚠️ {error}</div>}
          <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading?'⏳ Saving...':editData?'Save Changes':'🚀 Upload Coupon'}</button>
        </div>
      </div>
    </div>
  );
}
