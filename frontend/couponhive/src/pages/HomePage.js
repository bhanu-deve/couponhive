import React,{useState,useEffect,useCallback} from 'react';
import {API} from '../api/api';
import CouponCard from '../components/CouponCard';
import CouponDetailModal from '../components/CouponDetailModal';
import UploadModal from '../components/UploadModal';
const CATEGORIES=['All','Shopping','Food','Electronics','Fashion','Travel','Beauty','Shipping','Other'];
function CopyEffect({x,y,onDone}){useEffect(()=>{const t=setTimeout(onDone,1000);return()=>clearTimeout(t);},[onDone]);return <div className="copy-effect" style={{left:x,top:y}}>🎟️</div>;}
export default function HomePage({user,showToast,onNeedAuth}){
  const [coupons,setCoupons]=useState([]);
  const [search,setSearch]=useState('');
  const [category,setCategory]=useState('All');
  const [sort,setSort]=useState('newest');
  const [detail,setDetail]=useState(null);
  const [edit,setEdit]=useState(null);
  const [effects,setEffects]=useState([]);
  const [loading,setLoading]=useState(true);
  const [stats,setStats]=useState({coupons:0,users:0});
  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const data=await API.getCoupons({search:search.trim(),category,sort});
      setCoupons(data);
    }catch(err){showToast('Failed to load coupons','error');}
    finally{setLoading(false);}
  },[category,search,sort,showToast]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{
    // Get rough stats from coupons length
    API.getCoupons({}).then(all=>setStats(s=>({...s,coupons:all.length}))).catch(()=>{});
  },[]);
  const handleCopy=(e,code)=>{
    const id=Date.now()+Math.random();
    setEffects(ef=>[...ef,{id,x:e.clientX,y:e.clientY}]);
    showToast(`"${code}" copied! 🎉`,'success');
  };
  const handleUpdate=(updated)=>{
    setCoupons(c=>c.map(x=>(x._id===updated._id?updated:x)));
    if(detail?._id===updated._id)setDetail(updated);
  };
  const handleDelete=async(id)=>{
    try{await API.deleteCoupon(id);setCoupons(c=>c.filter(x=>x._id!==id));showToast('Coupon removed','info');}
    catch(err){showToast(err.message,'error');}
  };
  const handleSaveEdit=async(data)=>{
    try{const updated=await API.updateCoupon(edit._id,data);handleUpdate(updated);setEdit(null);showToast('Coupon updated!','success');}
    catch(err){showToast(err.message,'error');}
  };
  return(
    <div>
      <div className="hero">
        <div className="hero-tag">🔥 {stats.coupons}+ Active Deals Today</div>
        <h1 className="hero-title">Save More With <span className="accent">Every Purchase</span></h1>
        <p className="hero-sub">Community-powered coupons & deals. Copy, share, and discover the best discounts across hundreds of stores.</p>
        <div className="hero-search">
          <input placeholder="🔍 Search coupons, stores, codes..." value={search} maxLength={100} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()}/>
          <button onClick={load}>Search</button>
        </div>
        <div className="hero-stats">
          <div className="stat"><div className="stat-num">{stats.coupons}+</div><div className="stat-label">Live Deals</div></div>
          <div className="stat"><div className="stat-num">1K+</div><div className="stat-label">Members</div></div>
          <div className="stat"><div className="stat-num">$50K+</div><div className="stat-label">Saved</div></div>
        </div>
      </div>
      <div className="filters">
        {CATEGORIES.map(cat=><button key={cat} className={`filter-chip ${category===cat?'active':''}`} onClick={()=>setCategory(cat)}>{cat}</button>)}
        <select className="sort-select" value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="newest">🕐 Newest</option>
          <option value="popular">🔥 Most Used</option>
          <option value="expiring">⚡ Expiring Soon</option>
        </select>
      </div>
      {loading?<div style={{textAlign:'center',padding:'60px',color:'var(--muted)'}}>⏳ Loading coupons...</div>:
       coupons.length===0?<div className="empty"><div className="empty-icon">🔍</div><div className="empty-title">No coupons found</div><div className="empty-sub">Try a different search term or category</div></div>:
       <div className="grid">{coupons.map((c,i)=><CouponCard key={c._id} coupon={c} user={user} onCopy={handleCopy} onClick={()=>setDetail(c)} onUpdate={handleUpdate} onEdit={setEdit} onDelete={handleDelete} showToast={showToast} style={{animationDelay:`${i*0.04}s`}}/>)}</div>}
      {detail&&<CouponDetailModal coupon={detail} user={user} onClose={()=>setDetail(null)} onUpdate={handleUpdate} showToast={showToast}/>}
      {edit&&user&&<UploadModal onClose={()=>setEdit(null)} onSave={handleSaveEdit} editData={edit}/>}
      {effects.map(ef=><CopyEffect key={ef.id} x={ef.x} y={ef.y} onDone={()=>setEffects(es=>es.filter(e=>e.id!==ef.id))}/>)}
    </div>
  );
}
