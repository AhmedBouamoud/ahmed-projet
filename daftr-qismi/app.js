(async()=>{
  const parts=['app-01.b64','app-02.b64','app-03.b64','app-04.b64','app-05.b64','app-06.b64'];
  const safeText=async(name)=>{try{const r=await fetch(name,{cache:'no-store'});if(!r.ok)throw new Error(name+' '+r.status);return await r.text()}catch(e){console.warn('Optional module skipped:',name,e);return ''}};
  const chunks=await Promise.all(parts.map(async p=>{const r=await fetch(p,{cache:'no-store'});if(!r.ok)throw new Error('Failed to load '+p+' ('+r.status+')');return (await r.text()).replace(/\\s+/g,'')}));
  const [v2,v21,v22,v23,v30]=await Promise.all(['v2.js','v21.js','v22.js','v23.js','v30.js'].map(safeText));
  const bin=atob(chunks.join(''));
  const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
  const code=new TextDecoder('utf-8').decode(bytes);
  const extensions=[v2,v21,v22,v23,v30].filter(Boolean).join('\\n');
  (0,eval)(code+'\\n'+extensions);
})().catch(e=>{
  console.error('Daftr Qismi startup error',e);
  const v=document.getElementById('view');
  if(v)v.innerHTML='<div class="empty"><strong>تعذر تحميل التطبيق.</strong><div style="margin-top:8px;font-size:12px;direction:ltr">'+String(e&&e.message||e).replace(/[<>&]/g,'')+'</div><button onclick="location.reload()" style="margin-top:14px;padding:9px 14px">إعادة المحاولة</button></div>';
});