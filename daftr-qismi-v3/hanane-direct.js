/* Daftr Qismi — one-click Al Hanane bridge v22 */
(function directModule(){
  const APP='https://ahmedbouamoud.github.io/ahmed-projet/daftr-qismi-v3/';

  function toB64Url(text){
    const bytes=new TextEncoder().encode(String(text||''));
    let bin='';
    for(const b of bytes)bin+=String.fromCharCode(b);
    return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function fromB64Url(v){
    let s=String(v||'').replace(/-/g,'+').replace(/_/g,'/');
    while(s.length%4)s+='=';
    const bin=atob(s),bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++)bytes[i]=bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function relevantText(doc=document){
    const all=[...doc.querySelectorAll('body *')];
    const raw=el=>String(el.innerText||el.textContent||'').trim();
    const flat=el=>raw(el).replace(/\s+/g,' ').trim();
    const rows=all.map(el=>({el,text:flat(el)})).filter(x=>x.text);
    const cards=rows
      .filter(x=>x.text.length>=30&&x.text.length<=16000&&/U\d{2}\s*-\s*L\d{2}/i.test(x.text)&&/Ctrl\s*:?\s*\d+/i.test(x.text)&&/\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/.test(x.text))
      .sort((a,b)=>a.text.length-b.text.length);
    const card=cards[0]?.text||'';
    const page=flat(doc.body||doc.documentElement);
    const inst=page.match(/(?:ÉTABL\.?|ETABL\.?|ÉTABLISSEMENT|ETABLISSEMENT)\s*:?\s*([A-Z0-9-]+)/i)?.[1]||'';
    const level=page.match(/NIVEAU\s*:?\s*(\d+\s*(?:AC|BAC|TC)(?:\s*\/\s*[A-Z0-9]+)?)/i)?.[1]||'';
    const sem=page.match(/(?:SEM\.?|SEMESTRE)\s*:?\s*(S\d+)/i)?.[1]||'';
    const type=page.match(/TYPE\s*NOTE\s*:?\s*(.{2,60}?)(?=\s+(?:CONTRÔLES?|Disciplines?|\d{1,2}[-\/]\d{1,2}[-\/]\d{4}|Ctrl\s*:)|$)/i)?.[1]?.trim()||'';
    const meta=[];
    if(inst)meta.push('ÉTABL. : '+inst);
    if(level)meta.push('NIVEAU : '+level);
    if(sem)meta.push('SEM. : '+sem);
    if(type)meta.push('TYPE NOTE : '+type);
    let text=[...meta,card].filter(Boolean).join('\n').trim();
    if(!text)text=raw(doc.body||doc.documentElement).slice(0,16000);
    return text.slice(0,16000);
  }
  function bookmarklet(appUrl=APP){
    const code="(()=>{try{const A="+JSON.stringify(appUrl)+";const F=e=>String(e.innerText||e.textContent||'').replace(/\\s+/g,' ').trim();const R=[...document.querySelectorAll('body *')].map(e=>({e,t:F(e)})).filter(x=>x.t);const E=R.filter(x=>x.t.length>=30&&x.t.length<=16000&&/U\\d{2}\\s*-\\s*L\\d{2}/i.test(x.t)&&/Ctrl\\s*:?\\s*\\d+/i.test(x.t)&&/\\d{1,2}[-\\/]\\d{1,2}[-\\/]\\d{4}/.test(x.t)).sort((a,b)=>a.t.length-b.t.length);const C=E[0]?.t||'';const P=F(document.body);const I=P.match(/(?:ÉTABL\\.?|ETABL\\.?|ÉTABLISSEMENT|ETABLISSEMENT)\\s*:?\\s*([A-Z0-9-]+)/i)?.[1]||'';const L=P.match(/NIVEAU\\s*:?\\s*(\\d+\\s*(?:AC|BAC|TC)(?:\\s*\\/\\s*[A-Z0-9]+)?)/i)?.[1]||'';const M=P.match(/(?:SEM\\.?|SEMESTRE)\\s*:?\\s*(S\\d+)/i)?.[1]||'';const N=P.match(/TYPE\\s*NOTE\\s*:?\\s*(.{2,60}?)(?=\\s+(?:CONTRÔLES?|Disciplines?|\\d{1,2}[-\\/]\\d{1,2}[-\\/]\\d{4}|Ctrl\\s*:)|$)/i)?.[1]?.trim()||'';const H=[];if(I)H.push('ÉTABL. : '+I);if(L)H.push('NIVEAU : '+L);if(M)H.push('SEM. : '+M);if(N)H.push('TYPE NOTE : '+N);let T=[...H,C].filter(Boolean).join('\\n').trim();if(!T)T=String(document.body.innerText||document.body.textContent||'').trim().slice(0,16000);if(!T)throw new Error('لم أجد بيانات الفرض');const B=new TextEncoder().encode(T);let S='';for(const b of B)S+=String.fromCharCode(b);const Z=btoa(S).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');location.href=A+'#hanane64='+Z}catch(e){alert('تعذر إرسال الفرض: '+e.message)}})()";
    return 'javascript:'+code;
  }
  async function copyBookmarklet(){
    const code=bookmarklet();
    try{
      await navigator.clipboard.writeText(code);
      toast('تم نسخ اختصار الاستيراد');
    }catch{
      const ta=document.createElement('textarea');
      ta.value=code;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();
      toast('تم نسخ اختصار الاستيراد');
    }
  }
  function help(){
    modal('الاستيراد المباشر من الحنان',
      '<div class="security-note"><b>إعداد مرة واحدة فقط.</b> الاختصار يعمل داخل صفحة الحنان بعد تسجيل دخولك العادي، ولا يعرف كلمة المرور ولا يخزنها.</div>'+
      '<ol style="line-height:1.9;margin:12px 0;padding-right:22px">'+
      '<li>اضغط <b>نسخ كود الاختصار</b>.</li>'+
      '<li>في Chrome أنشئ أي إشارة مرجعية (Bookmark) وسمِّها: <b>إرسال إلى دفتر القسم</b>.</li>'+
      '<li>حرّر رابط الإشارة المرجعية والصق مكانه الكود المنسوخ الذي يبدأ بـ <code>javascript:</code>.</li>'+
      '<li>افتح صفحة <b>Tableau des contrôles</b> في الحنان.</li>'+
      '<li>شغّل الإشارة المرجعية <b>إرسال إلى دفتر القسم</b>. سيفتح دفتر القسم على معاينة الفرض مباشرة.</li>'+
      '</ol>'+
      '<div class="small">على Android Chrome: بعد إنشاء الإشارة، افتح صفحة الحنان ثم اكتب اسم الإشارة «إرسال إلى دفتر القسم» في شريط العنوان واخترها من الاقتراحات.</div>'+
      '<div class="hanane-actions" style="margin-top:12px"><button type="button" class="primary" id="copyHananeBookmarklet">نسخ كود الاختصار</button></div>',
      ()=>true
    );
    setTimeout(()=>{const b=document.getElementById('copyHananeBookmarklet');if(b)b.onclick=copyBookmarklet},0);
  }
  function setupCard(){
    const code=bookmarklet();
    return '<div class="hanane-hero" style="margin-bottom:14px">'+
      '<div class="section-title"><div><strong>⚡ الاستيراد المباشر</strong><div class="small" style="margin-top:4px">بعد إعداد اختصار المتصفح مرة واحدة، أرسل الفرض من صفحة الحنان إلى هنا بضغطة واحدة.</div></div><span class="badge ok">بدون كلمة مرور</span></div>'+
      '<div class="hanane-actions">'+
      '<button class="primary" data-act="hanane-direct-copy">📋 نسخ اختصار الاستيراد</button>'+
      '<button class="ghost" data-act="hanane-direct-help">طريقة الإعداد على الهاتف</button>'+
      '</div>'+
      '<div class="small" style="margin-top:8px">البيانات تمر في الجزء <code>#</code> من الرابط، فلا تُرسل إلى الخادم. <a href="'+esc(code)+'" title="على الحاسوب يمكن سحب هذا الرابط إلى شريط الإشارات">إرسال إلى دفتر القسم</a></div>'+
      '</div>';
  }

  const oldHanane=renderers.hanane;
  renderers.hanane=function(){return setupCard()+oldHanane()};

  const oldAction=action;
  action=function(act,id){
    if(act==='hanane-direct-copy'){copyBookmarklet();return}
    if(act==='hanane-direct-help'){help();return}
    return oldAction(act,id);
  };

  function receiveHash(){
    const m=location.hash.match(/^#hanane64=([A-Za-z0-9_-]+)$/);
    if(!m)return false;
    let text='';
    try{text=fromB64Url(m[1])}catch(e){console.warn(e);return false}
    if(!text.trim())return false;
    currentView='hanane';
    render();
    const ta=document.getElementById('hananePaste');
    if(ta)ta.value=text;
    const parseBtn=document.querySelector('[data-act="hanane-parse"]');
    if(parseBtn)parseBtn.click();
    history.replaceState(null,'',location.pathname+location.search);
    toast('وصلت بيانات الفرض من منصة الحنان');
    return true;
  }

  window.__dqHananeDirectTest={
    toB64Url,fromB64Url,relevantText,
    extractFromHtml(html){
      const doc=new DOMParser().parseFromString(html,'text/html');
      return relevantText(doc);
    },
    bookmarklet
  };
  window.__dqHananeDirectReady=true;
  setTimeout(receiveHash,0);
})();