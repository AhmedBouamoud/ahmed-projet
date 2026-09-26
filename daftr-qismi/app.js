(async()=>{
  const parts=['app-01.b64','app-02.b64','app-03.b64','app-04.b64','app-05.b64','app-06.b64'];
  const safeText=async(name)=>{try{const r=await fetch(name+'?v=11',{cache:'no-store'});if(!r.ok)throw new Error(name+' '+r.status);return await r.text()}catch(e){console.warn('Module fetch skipped:',name,e);return ''}};
  const chunks=await Promise.all(parts.map(async p=>{const r=await fetch(p+'?v=11',{cache:'no-store'});if(!r.ok)throw new Error('Failed to load '+p+' ('+r.status+')');return (await r.text()).replace(/\\s+/g,'')}));
  const bin=atob(chunks.join(''));
  const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
  const base=new TextDecoder('utf-8').decode(bytes);
  try{(0,eval)(base)}catch(e){throw new Error('CORE: '+(e&&e.message||e))}
  const mods=['v2.js','v21.js','v22.js','v23.js','v30.js'];
  const failed=[];
  for(const name of mods){
    const src=await safeText(name);if(!src)continue;
    try{(0,eval)(src)}catch(e){console.error('Module failed:',name,e);failed.push(name+': '+(e&&e.message||e));}
  }
  if(failed.length){
    const note=document.createElement('div');
    note.style.cssText='position:fixed;bottom:12px;left:12px;right:12px;z-index:9999;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;padding:10px 12px;border-radius:10px;font:12px system-ui;direction:ltr;box-shadow:0 5px 22px rgba(0,0,0,.12)';
    note.textContent='Loaded with module warning — '+failed.join(' | ');
    document.body.appendChild(note);
  }
})().catch(e=>{
  console.error('Daftr Qismi startup error',e);
  const v=document.getElementById('view');
  if(v)v.innerHTML='<div class="empty"><strong>تعذر تحميل التطبيق.</strong><div style="margin-top:8px;font-size:12px;direction:ltr">'+String(e&&e.message||e).replace(/[<>&]/g,'')+'</div><button onclick="location.reload()" style="margin-top:14px;padding:9px 14px">إعادة المحاولة</button></div>';
});