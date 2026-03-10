import React, { useState } from 'react';
import { API } from '../api/api';

const daysLeft=(ts)=>Math.ceil((new Date(ts)-Date.now())/86400000);

export default function CouponCard({coupon,user,onCopy,onClick,onUpdate,onEdit,onDelete,showToast,style}){
  const [copied,setCopied]=useState(false);
  const days=daysLeft(coupon.expiresAt);
  const isExpired=days<=0;
  const liked=user&&coupon.likes?.some(id=>String(id)===String(user._id||user.id));
  const isOwn=user&&String(coupon.uploadedBy)===String(user._id||user.id);

  const copy=async(e)=>{
    e.stopPropagation();
    navigator.clipboard?.writeText(coupon.code).catch(()=>{});
    try{await API.incrementCopies(coupon._id||coupon.id);}catch{}
    setCopied(true);
    onCopy&&onCopy(e,coupon.code);
    setTimeout(()=>setCopied(false),2000);
  };
  const like=async(e)=>{
    e.stopPropagation();
    if(!user){showToast('Login to like coupons','info');return;}
    if(isOwn){showToast("You can't like your own coupon",'info');return;}
    try{const updated=await API.toggleLike(coupon._id||coupon.id);onUpdate(updated);}
    catch(err){showToast(err.message,'error');}
  };
  const handleDelete=(e)=>{
    e.stopPropagation();
    if(!window.confirm('Delete this coupon? This cannot be undone.'))return;
    onDelete&&onDelete(coupon._id||coupon.id);
  };
  return(
    <div className="card" style={style} onClick={onClick}>
      <div className="card-header">
        <span className="card-store">{coupon.store}</span>
        <div className="card-badges">
          {coupon.verified&&<span className="badge badge-verified">✓ Verified</span>}
          {!isExpired&&days<=3&&<span className="badge badge-expiring">⚡ Soon</span>}
          {isExpired&&<span className="badge badge-expired">Expired</span>}
        </div>
      </div>
      <div className="card-title">{coupon.title}</div>
      <div className="card-desc">{coupon.description||'Use this code at checkout to save.'}</div>
      <div className="card-code-wrap" onClick={e=>e.stopPropagation()}>
        <span className="card-code">{coupon.code}</span>
        <button className={`copy-btn ${copied?'copied':''}`} onClick={copy}>{copied?'✓ Copied!':'Copy Code'}</button>
      </div>
      <div className="card-footer">
        <div className="card-actions">
          <button className={`action-btn ${liked?'liked':''}`} onClick={like} disabled={isOwn} title={isOwn?"Can't like own coupon":''}>
            {liked?'❤️':'🤍'} {coupon.likes?.length||0}
          </button>
          <button className="action-btn" onClick={e=>{e.stopPropagation();onClick();}}>💬 {coupon.comments?.length||0}</button>
          {coupon.discount&&<span className="discount-tag">{coupon.discount}</span>}
          {isOwn&&onEdit&&<button className="action-btn" onClick={e=>{e.stopPropagation();onEdit(coupon);}}>✏️</button>}
          {isOwn&&onDelete&&<button className="action-btn" onClick={handleDelete} style={{color:'var(--red)'}}>🗑️</button>}
        </div>
        <span className={`expiry ${isExpired?'expired':days<=3?'soon':''}`}>
          {isExpired?'⛔ Expired':`⏱️ ${days}d left`}
        </span>
      </div>
    </div>
  );
}
