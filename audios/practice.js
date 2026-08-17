/* The Practice tracker.
   Counts a listen only after 30s of real playback, so a stray tap never counts.
   Everything lives in this browser. Nothing is sent anywhere. */
(function(){
  const KEY='clarkitect-practice';
  const QUALIFY=30; // seconds of playback before it counts

  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || {plays:{},days:[],total:0} }
    catch(e){ return {plays:{},days:[],total:0} }
  }
  function save(d){ localStorage.setItem(KEY,JSON.stringify(d)) }
  function today(){ const n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0') }
  function dayKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0') }

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
      run = ((cur-prev)/86400000===1) ? run+1 : 1;
      if(run>b) b=run;
    }
    return b;
  }

  function record(id){
    const d=load();
    d.plays[id]=(d.plays[id]||0)+1;
    d.total=(d.total||0)+1;
    const t=today();
    if(!d.days.includes(t)) d.days.push(t);
    d.last=t;
    save(d); render();
  }

  function render(){
    const d=load(), mount=document.getElementById('practice');
    if(!mount) return;
    const cur=streak(d.days), bst=best(d.days), nights=d.days.length;

    // last 30 nights grid, oldest to newest
    let grid='';
    const set=new Set(d.days);
    for(let i=29;i>=0;i--){
      const day=new Date(); day.setDate(day.getDate()-i);
      const k=dayKey(day), on=set.has(k);
      grid+='<i class="'+(on?'on':'')+'" title="'+k+'"></i>';
    }

    const pct=Math.min(100, Math.round((nights/30)*100));
    mount.innerHTML =
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
        : nights+' of 30 nights toward the protocol. Kept in this browser only.')+'</div>';

    // per-track counts
    document.querySelectorAll('.track[data-id]').forEach(t=>{
      const c=t.querySelector('.p-count'); if(!c) return;
      const n=d.plays[t.dataset.id]||0;
      c.textContent = n===0 ? 'not yet played' : (n===1 ? 'played once' : 'played '+n+' times');
    });
  }

  function wire(){
    document.querySelectorAll('.track[data-id]').forEach(t=>{
      const a=t.querySelector('audio'); if(!a) return;
      let acc=0, last=null, done=false;
      a.addEventListener('timeupdate',()=>{
        if(done) return;
        if(last!==null && a.currentTime>last && a.currentTime-last<1.5) acc+=a.currentTime-last;
        last=a.currentTime;
        if(acc>=QUALIFY){ done=true; record(t.dataset.id) }
      });
      a.addEventListener('ended',()=>{ if(!done){ done=true; record(t.dataset.id) } });
      a.addEventListener('play',()=>{ last=null });
    });
    render();
  }

  window.practiceReset=function(){
    if(confirm('Clear your practice history? This cannot be undone.')){ localStorage.removeItem(KEY); render() }
  };

  document.addEventListener('DOMContentLoaded',wire);
  if(document.readyState!=='loading') wire();
})();
