(async()=>{
  const parts=['app-01.b64','app-02.b64','app-03.b64','app-04.b64','app-05.b64','app-06.b64'];
  const [chunks,v2,v21]=await Promise.all([
    Promise.all(parts.map(async p=>{const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw new Error('Failed to load '+p);return (await r.text()).replace(/\\s+/g,'')})),
    fetch('v2.js',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Failed to load v2.js');return r.text()}),
    fetch('v21.js',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('Failed to load v21.js');return r.text()})
  ]);
  const bin=atob(chunks.join(''));
  const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
  const code=new TextDecoder('utf-8').decode(bytes);
  (0,eval)(code+'\\n'+v2+'\\n'+v21);
})().catch(e=>{
  console.error(e);
  document.getElementById('view').innerHTML='<div class="empty">تعذر تحميل التطبيق. أعد فتح الصفحة.</div>';
});