/* Daftr Qismi mobile navigation v17 */
(function(){
  const sidebar=document.getElementById('sidebar');
  const menuBtn=document.getElementById('menuBtn');
  const overlay=document.getElementById('sidebarOverlay');
  if(!sidebar||!menuBtn) return;

  const mq=window.matchMedia('(max-width:900px)');
  const isMobile=()=>mq.matches;

  function sync(){
    const open=isMobile() && sidebar.classList.contains('open');
    document.body.classList.toggle('sidebar-open',open);
    menuBtn.setAttribute('aria-expanded',open?'true':'false');
    menuBtn.setAttribute('aria-controls','sidebar');
    if(overlay){
      overlay.hidden=!open;
      overlay.setAttribute('aria-hidden',open?'false':'true');
    }
  }
  function open(){ if(isMobile()){ sidebar.classList.add('open'); sync(); } }
  function close(){ sidebar.classList.remove('open'); sync(); }
  function toggle(){ sidebar.classList.contains('open')?close():open(); }

  menuBtn.onclick=null;
  menuBtn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();toggle()});

  overlay?.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();close()});

  document.querySelectorAll('#nav .nav-item').forEach(btn=>{
    btn.addEventListener('click',()=>close(),{capture:true});
  });

  document.addEventListener('click',e=>{
    if(!isMobile()||!sidebar.classList.contains('open')) return;
    if(!sidebar.contains(e.target)&&!menuBtn.contains(e.target)) close();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  window.addEventListener('popstate',close);
  mq.addEventListener?.('change',()=>{if(!isMobile())close();else sync()});
  new MutationObserver(sync).observe(sidebar,{attributes:true,attributeFilter:['class']});

  close();
  window.__dqMobileNavReady=true;
})();