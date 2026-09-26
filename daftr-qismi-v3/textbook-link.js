
/* Daftr Qismi ↔ Linked Textbook bridge v20 */
(function(){
  const KEY='dq_textbook_bridge_v1', CHANNEL='dq_textbook_bridge';
  db.textbookLink ||= {enabled:true,lastSync:'',lastPull:'',lastPush:''};
  let applying=false,pushTimer=null;
  const bc=('BroadcastChannel' in window)?new BroadcastChannel(CHANNEL):null;
  const now=()=>new Date().toISOString();
  function hash(v){const s=JSON.stringify(v);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
  function read(){try{const b=JSON.parse(localStorage.getItem(KEY)||'{}');b.version=1;b.classes||={};return b}catch{return {version:1,classes:{}}}}
  function write(b,announce=true){b.version=1;b.updatedAt=now();localStorage.setItem(KEY,JSON.stringify(b));if(announce){try{bc?.postMessage({type:'bridge-updated',updatedAt:b.updatedAt})}catch{}}}
  function cls0(){return db.classes.find(c=>c.id===currentClassId)||null}
  function norm(l){return {title:l.title||'',date:l.date||'',duration:l.duration||'45 دقيقة',objectives:l.objectives||'',content:l.content||'',homework:l.homework||'',status:l.status||'done'}}
  function logs(){return db.lessonLogs.filter(l=>l.classId===currentClassId)}
  function meta(c){return {classId:c.id,className:c.name||'',level:c.level||'',subject:c.subject||'الاجتماعيات',school:c.school||'',year:db.settings?.schoolYear||'',teacher:db.settings?.teacher||''}}
  function push(silent=true){
    const c=cls0();if(!c)return {changed:0,total:0};
    const bridge=read(),bucket=bridge.classes[c.id]||{...meta(c),sessions:[],createdAt:now()};
    Object.assign(bucket,meta(c));const old=new Map((bucket.sessions||[]).map(r=>[r.id,r]));const next=[];let changed=0;
    for(const l of logs()){const n=norm(l),h=hash(n);let r=old.get(l.id)||{id:l.id,classId:c.id,createdAt:now(),textbookHash:''};if(r.classHash!==h){r={...r,...n,id:l.id,classId:c.id,classHash:h,updatedAt:now(),source:'class'};changed++}next.push(r)}
    for(const r of (bucket.sessions||[]))if(!next.some(x=>x.id===r.id)&&r.source==='textbook')next.push(r);
    bucket.sessions=next;bucket.updatedAt=now();bridge.classes[c.id]=bucket;write(bridge,changed>0);db.textbookLink.lastSync=bucket.updatedAt;db.textbookLink.lastPush=bucket.updatedAt;
    if(!silent&&typeof toast==='function')toast(changed?('أرسلت '+changed+' تحديثًا إلى دفتر النصوص'):'دفتر النصوص متزامن');
    return {changed,total:next.length,bucket};
  }
  function pull(silent=true){
    const c=cls0();if(!c)return {changed:0,total:0};const bridge=read(),bucket=bridge.classes?.[c.id];if(!bucket)return {changed:0,total:0};
    let changed=0,touched=false;applying=true;
    for(const r of (bucket.sessions||[])){let l=db.lessonLogs.find(x=>x.id===r.id&&x.classId===c.id);if(!l){l={id:r.id,classId:c.id,date:r.date||'',duration:r.duration||'45 دقيقة',title:r.title||'حصة',objectives:r.objectives||'',content:r.content||'',status:r.status||'done',homework:r.homework||'',bridgeUpdatedAt:r.updatedAt||''};db.lessonLogs.push(l);changed++}else if(r.source==='textbook'&&String(r.updatedAt||'')>String(l.bridgeUpdatedAt||'')){Object.assign(l,{date:r.date||'',duration:r.duration||'45 دقيقة',title:r.title||'',objectives:r.objectives||'',content:r.content||'',homework:r.homework||'',status:r.status||l.status||'done',bridgeUpdatedAt:r.updatedAt||''});changed++}const h=hash(norm(l));if(r.classHash!==h){r.classHash=h;touched=true}}
    if(touched){bucket.updatedAt=now();bridge.classes[c.id]=bucket;write(bridge,false)}if(changed)_origSave();applying=false;db.textbookLink.lastSync=now();db.textbookLink.lastPull=db.textbookLink.lastSync;
    if(!silent&&typeof toast==='function')toast(changed?('استقبلت '+changed+' تحديثًا من دفتر النصوص'):'لا توجد تعديلات جديدة');
    return {changed,total:(bucket.sessions||[]).length,bucket};
  }
  function sync(silent=true){const a=pull(true),b=push(true);if(!silent&&typeof toast==='function')toast((a.changed||b.changed)?('المزامنة: '+a.changed+' وارد، '+b.changed+' صادر'):'التطبيقان متزامنان');return {pull:a,push:b}}
  function url(){const c=cls0();return c?('./textbook/?class='+encodeURIComponent(c.id)):'./textbook/'}
  const style=document.createElement('style');style.textContent='.textbook-link-card{border:1px solid #bfdbfe;background:linear-gradient(135deg,#eff6ff,#ecfdf5);border-radius:15px;padding:13px;margin-bottom:12px}.textbook-link-head{display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}.textbook-link-title{font-weight:900;color:#123f73;display:flex;gap:8px;align-items:center}.textbook-link-dot{width:10px;height:10px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px #dcfce7}.textbook-link-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.textbook-link-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.textbook-link-meta span{font-size:11px;background:#fff;border:1px solid #dbeafe;border-radius:999px;padding:4px 8px}@media(max-width:680px){.textbook-link-actions button{flex:1 1 140px}}';document.head.appendChild(style);
  const oldJournal=renderers.journal;
  renderers.journal=function(){const c=cls0();if(c&&!applying)push(true);const b=read(),bucket=c?b.classes?.[c.id]:null,linked=(bucket?.sessions||[]).length;const panel='<div class="textbook-link-card"><div class="textbook-link-head"><div class="textbook-link-title"><span class="textbook-link-dot"></span>دفتر النصوص المرتبط</div><span class="badge ok">نفس الجهاز • مزامنة مباشرة</span></div><div class="textbook-link-actions"><button class="primary" data-act="textbook-open">فتح دفتر النصوص الكامل</button><button class="ghost" data-act="textbook-sync">↻ مزامنة الآن</button><button class="ghost" data-act="textbook-pull">↓ جلب التعديلات</button></div><div class="textbook-link-meta"><span>القسم: <b>'+(c?esc(c.name):'—')+'</b></span><span>الحصص المرتبطة: <b>'+linked+'</b></span><span>آخر مزامنة: <b>'+(bucket?.updatedAt?new Date(bucket.updatedAt).toLocaleString('ar-MA'):'—')+'</b></span></div><div class="small" style="margin-top:7px">الحصص المسجلة هنا تظهر في دفتر النصوص الكامل، والتعديلات هناك تعود إلى هذا السجل.</div></div>';return panel+oldJournal()};
  const oldAction=action;
  action=function(act,id){if(act==='textbook-open'){if(!cls0()){toast('أنشئ قسمًا أولًا');return}push(true);window.open(url(),'dqLinkedTextbook');return}if(act==='textbook-sync'){sync(false);render();return}if(act==='textbook-pull'){pull(false);render();return}return oldAction(act,id)};
  const _origSave=saveDB;
  saveDB=function(){_origSave();if(!applying){clearTimeout(pushTimer);pushTimer=setTimeout(()=>{try{push(true)}catch(e){console.warn('textbook bridge push',e)}},50)}};
  function remote(){if(applying)return;try{const r=pull(true);if(r.changed&&currentView==='journal')render()}catch(e){console.warn('textbook bridge pull',e)}}
  window.addEventListener('storage',e=>{if(e.key===KEY)remote()});bc?.addEventListener('message',remote);
  const vp=new URLSearchParams(location.search).get('view');if(vp&&renderers[vp]){currentView=vp;setTimeout(()=>render(),0)}
  setTimeout(()=>{try{sync(true);if(currentView==='journal')render()}catch(e){console.warn(e)}},80);
  window.__dqTextbookLinkTest={read,push,pull,sync,normalize:norm,hash,linkedUrl:url};
  window.__dqTextbookLinkReady=true;
})();
