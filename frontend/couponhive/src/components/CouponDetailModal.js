import React,{useState} from 'react';
import {API} from '../api/api';
const timeAgo=(ts)=>{const s=Math.floor((Date.now()-new Date(ts))/1000);if(s<60)return 'just now';if(s<3600)return Math.floor(s/60)+'m ago';if(s<86400)return Math.floor(s/3600)+'h ago';return Math.floor(s/86400)+'d ago';};
const daysLeft=(ts)=>Math.ceil((new Date(ts)-Date.now())/86400000);
const fmtDate=(ts)=>new Date(ts).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
export default function CouponDetailModal({coupon:init,user,onClose,onUpdate,showToast}){
  const [coupon,setCoupon]=useState(init);
  const [comment,setComment]=useState('');
  const [copied,setCopied]=useState(false);
  const days=daysLeft(coupon.expiresAt);
  const isExpired=days<=0;
  const uid=user?._id||user?.id;
  const liked=user&&coupon.likes?.some(id=>String(id)===String(uid));
  const reported=user&&coupon.reports?.some(id=>String(id)===String(uid));
  const isOwn=user&&String(coupon.uploadedBy)===String(uid);
  const push=(updated)=>{setCoupon(updated);onUpdate(updated);};
  const copy=async()=>{
    navigator.clipboard?.writeText(coupon.code).catch(()=>{});
    try{await API.incrementCopies(coupon._id);setCoupon(prev=>({...prev,copies:(prev.copies||0)+1}));}catch{}
    setCopied(true);showToast('Code copied! 🎉','success');setTimeout(()=>setCopied(false),2000);
  };
  const like=async()=>{
    if(!user){showToast('Login to like coupons','info');return;}
    if(isOwn){showToast("You can't like your own coupon",'info');return;}
    try{push(await API.toggleLike(coupon._id));}catch(err){showToast(err.message,'error');}
  };
  const report=async()=>{
    if(!user){showToast('Login to report','info');return;}
    if(isOwn){showToast("You can't report your own coupon",'info');return;}
    if(reported){showToast('Already reported','info');return;}
    try{push(await API.reportCoupon(coupon._id));showToast('Reported to admin. Thank you!','info');}
    catch(err){showToast(err.message,'error');}
  };
  const postComment=async()=>{
    if(!user){showToast('Login to comment','info');return;}
    const text=comment.trim();
    if(!text)return;
    try{push(await API.addComment(coupon._id,text));setComment('');}
    catch(err){showToast(err.message,'error');}
  };
  return(
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal" style={{maxWidth:620}}>
        <div className="modal-header">
          <div><div className="modal-subtitle">{coupon.store} · {coupon.category}</div><div className="modal-title">{coupon.title}</div></div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="code-box">
            <div><div className="code-box-label">COUPON CODE</div><div className="code-box-value">{coupon.code}</div></div>
            <button className={`copy-btn ${copied?'copied':''}`} style={{padding:'10px 24px',fontSize:'0.95rem'}} onClick={copy}>{copied?'✓ Copied!':'📋 Copy Code'}</button>
          </div>
          <div className="info-grid">
            <div className="info-cell"><div className="info-cell-val" style={{color:'var(--accent)'}}>{coupon.discount||'—'}</div><div className="info-cell-lbl">Discount</div></div>
            <div className="info-cell"><div className="info-cell-val" style={{color:isExpired?'var(--red)':days<=3?'var(--accent)':'var(--green)'}}>{isExpired?'Expired':`${days}d`}</div><div className="info-cell-lbl">Time Left</div></div>
            <div className="info-cell"><div className="info-cell-val">{coupon.copies||0}</div><div className="info-cell-lbl">Times Used</div></div>
          </div>
          {coupon.description&&<p style={{color:'var(--muted)',marginBottom:16,lineHeight:1.7,fontSize:'0.92rem'}}>{coupon.description}</p>}
          <div style={{fontSize:'0.82rem',color:'var(--muted)',marginBottom:16}}>📅 Expires: <strong>{fmtDate(coupon.expiresAt)}</strong></div>
          <div className="uploader-row">
            <span style={{fontSize:'1.5rem'}}>{coupon.uploaderAvatar}</span>
            <div className="uploader-meta"><small>Uploaded by</small><strong>{coupon.uploaderName}</strong></div>
            <span style={{marginLeft:'auto',fontSize:'0.8rem',color:'var(--muted)'}}>{timeAgo(coupon.createdAt||coupon.uploadedAt)}</span>
          </div>
          <div className="action-row">
            <button className={`action-row-btn ${liked?'liked':''}`} onClick={like} disabled={isOwn}>{liked?'❤️':'🤍'} {coupon.likes?.length||0} Likes</button>
            <button className="action-row-btn">💬 {coupon.comments?.length||0} Comments</button>
            <button className={`action-row-btn ${reported?'reported':''}`} onClick={report} disabled={isOwn||reported}>🚩 {reported?'Reported':'Report'}</button>
          </div>
          <div className="comments-section">
            <div style={{fontWeight:700,marginBottom:16,fontFamily:'Syne'}}>💬 Comments ({coupon.comments?.length||0})</div>
            {(coupon.comments||[]).length===0&&<div style={{color:'var(--muted)',fontSize:'0.9rem',marginBottom:12}}>No comments yet. Be the first!</div>}
            {(coupon.comments||[]).map(c=>(
              <div key={c._id||c.id} className="comment">
                <div className="comment-avatar">{c.avatar}</div>
                <div className="comment-body">
                  <div className="comment-meta"><span className="comment-username">{c.username}</span><span className="comment-time">{timeAgo(c.createdAt)}</span></div>
                  <div className="comment-text">{c.text}</div>
                </div>
              </div>
            ))}
            <div className="comment-input-wrap">
              <input className="comment-input" placeholder={user?'Write a comment... (max 500 chars)':'Login to comment'} disabled={!user} maxLength={500} value={comment} onChange={e=>setComment(e.target.value)} onKeyDown={e=>e.key==='Enter'&&postComment()}/>
              <button className="comment-submit" onClick={postComment} disabled={!user||!comment.trim()}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}