/* The Practice tracker.
   Counts a listen only after 30s of real playback, so a stray tap never counts.
   Works offline from localStorage. If a sync endpoint and code are set, history
   is merged across every device you listen on and survives a cleared cache. */
(function(){
  const KEY='clarkitect-practice';
  const CFG='clarkitect-practice-sync';
  const QUALIFY=30;

  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || {plays:{},days:[],total:0} }
    catch(e){ return {plays:{},days:[],total:0} }
  }
  function save(d){ localStorage.setItem(KEY,JSON.stringify(d)) }
  function cfg(){
    try{ return JSON.parse(localStorage.getItem(CFG)) || {} }catch(e){ return {} }
  }
  function setCfg(c){ localStorage.setItem(CFG,JSON.stringify(c)) }
  function dayKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0') }
  function today(){ return dayKey(new Date()) }

  function merge(a,b){
    const days=[...new Set([...(a.days||[]),...(b.days||[])])].sort();
    const plays={...(a.plays||{})};
    for(const [k,v] of Object.entries(b.plays||{})) plays[k]=Math.max(plays[k]||0,v||0);
    const total=Object.values(plays).reduce((x,y)=>x+y,0);
    return {plays,days,total};
  }

  function streak(days){
    if(!days.length) return 0;
    const set=new Set(days); let n=0; const d=new Date();
    if(!set.has(dayKey(d))){ d.setDate(d.getDate()-1); if(!set.has(dayKey(d))) return 0 }
    while(set.has(dayKey(d))){ n++; d.setDate(d.getDate()-1) }
    return n;
  }
  function best(days){
    if(!days.length) return 0;
    const s=[...days].sort(); let b=1,run=1;
    for(let i=1;i<s.length;i++){
      const prev=new Date(s[i-1]+'T00:00'), cur=new Date(s[i]+'T00:00');
      run=((cur-prev)/86400000===1)?run+1:1;
      if(run>b) b=run;
    }
    return b;
  }

  /* ---------- sync ---------- */
  let pushTimer=null;
  function endpoint(){ const c=cfg(); return (c.url&&c.code)?c.url.replace(/\/+$/,'')+'?key='+encodeURIComponent(c.code):null }

  async function pull(){
    const url=endpoint(); if(!url) return;
    try{
      const r=await fetch(url,{cache:'no-store'}); if(!r.ok) throw 0;
      const remote=await r.json();
      const merged=merge(load(),remote);
      save(merged); render(); status('synced');
      return merged;
    }catch(e){ status('offline') }
  }
  function push(){
    const url=endpoint(); if(!url) return;
    clearTimeout(pushTimer);
    pushTimer=setTimeout(async()=>{
      try{
        const r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(load())});
        if(!r.ok) throw 0;
        const merged=await r.json();
        save(merge(load(),merged)); render(); status('synced');
      }catch(e){ status('offline') }
    },800);
  }
  function status(s){
    const el=document.getElementById('syncstatus'); if(!el) return;
    const c=cfg();
    if(!c.url||!c.code){ el.textContent='this device only'; el.className='s-off'; return }
    el.textContent = s==='synced' ? 'syncing across your devices' : 'saved here, will sync when reachable';
    el.className = s==='synced' ? 's-on' : 's-warn';
  }

  function record(id){
    const d=load();
    d.plays[id]=(d.plays[id]||0)+1;
    d.total=Object.values(d.plays).reduce((a,b)=>a+b,0);
    const t=today();
    if(!d.days.includes(t)) d.days.push(t);
    d.last=t;
    save(d); render(); push();
  }

  function render(){
    const d=load(), mount=document.getElementById('practice');
    if(!mount) return;
    const cur=streak(d.days), bst=best(d.days), nights=d.days.length;
    let grid=''; const set=new Set(d.days);
    for(let i=29;i>=0;i--){
      const day=new Date(); day.setDate(day.getDate()-i);
      const k=dayKey(day);
      grid+='<i class="'+(set.has(k)?'on':'')+'" title="'+k+'"></i>';
    }
    const pct=Math.min(100,Math.round((nights/30)*100));
    mount.innerHTML=
      '<div class="p-row">'+
        '<div class="p-stat"><b>'+cur+'</b><span>night streak</span></div>'+
        '<div class="p-stat"><b>'+nights+'</b><span>nights practiced</span></div>'+
        '<div class="p-stat"><b>'+(d.total||0)+'</b><span>total sessions</span></div>'+
        '<div class="p-stat"><b>'+bst+'</b><span>best streak</span></div>'+
      '</div>'+
      '<div class="p-grid">'+grid+'</div>'+
      '<div class="p-bar"><span style="width:'+pct+'%"></span></div>'+
      '<div class="p-note">'+(nights>=30
        ? 'Thirty nights complete. The protocol says you may cut a new version now.'
        : nights===0 ? 'Press play on any track. A session counts after thirty seconds.'
        : nights+' of 30 nights toward the protocol.')+'</div>';
    document.querySelectorAll('.track[data-id]').forEach(t=>{
      const c=t.querySelector('.p-count'); if(!c) return;
      const n=d.plays[t.dataset.id]||0;
      c.textContent = n===0?'not yet played':(n===1?'played once':'played '+n+' times');
    });
  }

  function wire(){
    document.querySelectorAll('.track[data-id]').forEach(t=>{
      const a=t.querySelector('audio'); if(!a) return;
      let acc=0,last=null,done=false;
      a.addEventListener('timeupdate',()=>{
        if(done) return;
        if(last!==null && a.currentTime>last && a.currentTime-last<1.5) acc+=a.currentTime-last;
        last=a.currentTime;
        if(acc>=QUALIFY){ done=true; record(t.dataset.id) }
      });
      a.addEventListener('ended',()=>{ if(!done){ done=true; record(t.dataset.id) } });
      a.addEventListener('play',()=>{ last=null });
    });
    // sync form
    const c=cfg();
    const u=document.getElementById('syncurl'), k=document.getElementById('synccode');
    if(u) u.value=c.url||'';
    if(k) k.value=c.code||'';
    render(); status(); pull();
  }

  window.practiceSave=function(){
    const u=document.getElementById('syncurl').value.trim();
    let k=document.getElementById('synccode').value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-');
    if(u&&!k){ k='practice-'+Math.random().toString(36).slice(2,10); document.getElementById('synccode').value=k }
    setCfg({url:u,code:k}); status(); pull(); push();
  };
  window.practiceNewCode=function(){
    const k='practice-'+Math.random().toString(36).slice(2,10);
    document.getElementById('synccode').value=k; window.practiceSave();
  };
  window.practiceReset=function(){
    if(confirm('Clear practice history on THIS device? If sync is on, it will come back from your other devices.')){
      localStorage.removeItem(KEY); render(); pull();
    }
  };

  document.addEventListener('DOMContentLoaded',wire);
  if(document.readyState!=='loading') wire();
})();
