/* Daftr Qismi Google Calendar Live Sync v19 */
(function(){
  db.googleCalendar ||= {};
  db.googleCalendar.clientId ||= '';
  db.googleCalendar.calendarId ||= 'primary';
  db.googleCalendar.autoSync ??= true;
  db.googleCalendar.syncMinutes ||= 15;
  db.googleCalendar.lastSync ||= '';
  db.googleCalendar.tombstones ||= [];
  db.googleCalendar.windowPastDays ||= 30;
  db.googleCalendar.windowFutureDays ||= 180;
  saveDB();

  let googleToken='';
  let googleTokenExpiresAt=0;
  let syncTimer=null;
  let syncInFlight=false;
  let tokenClient=null;

  const GC_SCOPE='https://www.googleapis.com/auth/calendar.events';
  const API='https://www.googleapis.com/calendar/v3';
  const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';

  const style=document.createElement('style');
  style.textContent=`
    .gcal-panel{border:1px solid #dbe7f1;border-radius:14px;padding:13px;background:linear-gradient(180deg,#fff,#f8fbff);margin-bottom:12px}
    .gcal-head{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
    .gcal-title{display:flex;align-items:center;gap:8px;font-weight:900}.gcal-dot{width:10px;height:10px;border-radius:50%;background:#94a3b8}.gcal-dot.on{background:#22c55e;box-shadow:0 0 0 4px #dcfce7}
    .gcal-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.gcal-meta{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}.gcal-meta span{font-size:11px;background:#fff;border:1px solid #e2e8f0;border-radius:999px;padding:4px 8px}
    .gcal-setup{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px}.gcal-setup input{min-width:0}.gcal-help{font-size:11px;color:#64748b;line-height:1.6;margin-top:8px}
    .sync-conflict{background:#fff7ed!important;border-color:#fdba74!important}.sync-conflict:after{content:"تعارض مزامنة";display:inline-flex;font-size:9px;background:#ffedd5;color:#9a3412;padding:2px 6px;border-radius:999px;margin-top:4px}
    @media(max-width:620px){.gcal-setup{grid-template-columns:1fr}.gcal-actions button{flex:1 1 140px}}
  `;
  document.head.appendChild(style);

  function isTokenValid(){return !!googleToken && Date.now()<googleTokenExpiresAt-30000}
  function tokenStatus(){return isTokenValid()?'متصل':'غير متصل'}
  function hashData(v){
    const s=JSON.stringify(v);
    let h=2166136261;
    for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
    return (h>>>0).toString(16);
  }
  function localShape(e){return {title:e.title||'',date:e.date||'',time:e.time||'',details:e.details||'',type:e.type||'note'}}
  function localHash(e){return hashData(localShape(e))}
  function dateOnly(d){return d.toISOString().slice(0,10)}
  function plusDays(date,n){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return dateOnly(d)}
  function inSyncWindow(date){
    if(!date)return false;
    const min=plusDays(today(),-Number(db.googleCalendar.windowPastDays||30));
    const max=plusDays(today(), Number(db.googleCalendar.windowFutureDays||180));
    return date>=min&&date<=max;
  }
  function dateTimeParts(v){
    const d=new Date(v);
    const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0'),h=String(d.getHours()).padStart(2,'0'),mi=String(d.getMinutes()).padStart(2,'0');
    return {date:`${y}-${m}-${day}`,time:`${h}:${mi}`};
  }
  function googleShape(item){
    const allDay=!!item.start?.date;
    const p=allDay?{date:item.start.date,time:''}:dateTimeParts(item.start?.dateTime||item.start?.date);
    return {title:item.summary||'موعد',date:p.date,time:p.time,details:item.description||'',type:item.extendedProperties?.private?.daftrQismiType||'note'};
  }
  function googleHash(item){return hashData(googleShape(item))}
  function durationEnd(e){
    if(!e.time)return {date:plusDays(e.date,1)};
    const start=new Date(`${e.date}T${e.time}:00`);
    const end=new Date(start.getTime()+60*60000);
    return {dateTime:end.toISOString(),timeZone:tz};
  }
  function googleBody(e){
    const start=e.time?{dateTime:new Date(`${e.date}T${e.time}:00`).toISOString(),timeZone:tz}:{date:e.date};
    return {
      summary:e.title||'موعد',
      description:e.details||'',
      start,
      end:durationEnd(e),
      extendedProperties:{private:{daftrQismiId:e.id,daftrQismiType:e.type||'note',daftrQismiVersion:'19'}}
    };
  }
  function applyGoogleToLocal(local,item){
    const s=googleShape(item);
    local.title=s.title;local.date=s.date;local.time=s.time;local.details=s.details;local.type=s.type;
    local.googleEventId=item.id;local.googleUpdatedAt=item.updated||'';local.googleSyncedHash=googleHash(item);local.googleHtmlLink=item.htmlLink||'';
    local.syncConflict=false;local.source='app-google-sync';local.personal=false;
  }
  function importPersonalGoogle(item){
    const s=googleShape(item);
    let e=db.plannerEvents.find(x=>x.googleEventId===item.id);
    if(!e){
      e={id:uid('evt'),date:s.date,time:s.time,title:s.title,type:'personal',classId:'',details:s.details,personal:true,source:'google-calendar',googleEventId:item.id,calendarUid:item.iCalUID||'',googleHtmlLink:item.htmlLink||'',googleUpdatedAt:item.updated||'',googleSyncedHash:googleHash(item)};
      db.plannerEvents.push(e);
    }else{
      e.date=s.date;e.time=s.time;e.title=s.title;e.details=s.details;e.googleHtmlLink=item.htmlLink||e.googleHtmlLink;e.googleUpdatedAt=item.updated||'';e.googleSyncedHash=googleHash(item);e.personal=true;e.source='google-calendar';
    }
    return e;
  }
  function applyRemoteEvents(items){
    const stats={imported:0,updated:0,conflicts:0,deleted:0};
    for(const item of items||[]){
      const appId=item.extendedProperties?.private?.daftrQismiId;
      if(item.status==='cancelled'){
        if(appId){
          const local=db.plannerEvents.find(x=>x.id===appId||x.googleEventId===item.id);
          if(local){
            if(local.googleSyncedHash && localHash(local)===local.googleSyncedHash){db.plannerEvents=db.plannerEvents.filter(x=>x.id!==local.id);stats.deleted++}
            else{local.syncConflict=true;stats.conflicts++}
          }
        }else{
          const before=db.plannerEvents.length;
          db.plannerEvents=db.plannerEvents.filter(x=>x.googleEventId!==item.id);
          if(db.plannerEvents.length<before)stats.deleted++;
        }
        continue;
      }
      if(!item.start)continue;
      if(appId){
        const local=db.plannerEvents.find(x=>x.id===appId||x.googleEventId===item.id);
        if(!local)continue;
        const synced=local.googleSyncedHash||'';
        const lh=localHash(local),gh=googleHash(item);
        if(synced && lh!==synced && gh!==synced){local.syncConflict=true;stats.conflicts++;continue}
        if(!synced || gh!==synced){applyGoogleToLocal(local,item);stats.updated++}
        else{local.googleEventId=item.id;local.googleUpdatedAt=item.updated||local.googleUpdatedAt;local.googleHtmlLink=item.htmlLink||local.googleHtmlLink}
      }else{
        const existed=db.plannerEvents.some(x=>x.googleEventId===item.id);
        importPersonalGoogle(item);
        existed?stats.updated++:stats.imported++;
      }
    }
    saveDB();
    return stats;
  }

  async function loadGis(){
    if(window.google?.accounts?.oauth2)return;
    await new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-dq-gis]');
      if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
      const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.async=true;s.defer=true;s.dataset.dqGis='1';s.onload=resolve;s.onerror=()=>reject(new Error('تعذر تحميل Google Identity Services'));document.head.appendChild(s);
    });
  }
  async function connectGoogle(prompt='consent'){
    const clientId=(db.googleCalendar.clientId||'').trim();
    if(!clientId||!clientId.endsWith('.apps.googleusercontent.com'))throw new Error('أدخل Google OAuth Client ID صحيحًا');
    await loadGis();
    return new Promise((resolve,reject)=>{
      tokenClient=google.accounts.oauth2.initTokenClient({
        client_id:clientId,scope:GC_SCOPE,
        callback:(resp)=>{
          if(resp.error){reject(new Error(resp.error));return}
          googleToken=resp.access_token||'';googleTokenExpiresAt=Date.now()+Number(resp.expires_in||3600)*1000;
          scheduleAutoSync();render();resolve(resp);
        }
      });
      tokenClient.requestAccessToken({prompt});
    });
  }
  async function api(path,opts={}){
    if(!isTokenValid())throw new Error('GOOGLE_AUTH_REQUIRED');
    const headers={...(opts.headers||{}),Authorization:'Bearer '+googleToken};
    if(opts.body&&!headers['Content-Type'])headers['Content-Type']='application/json';
    const r=await fetch(API+path,{...opts,headers});
    if(r.status===401){googleToken='';googleTokenExpiresAt=0;throw new Error('GOOGLE_AUTH_REQUIRED')}
    if(r.status===204)return null;
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(data?.error?.message||('Google API '+r.status));
    return data;
  }
  async function listRemote(){
    const cal=encodeURIComponent(db.googleCalendar.calendarId||'primary');
    const min=new Date(plusDays(today(),-Number(db.googleCalendar.windowPastDays||30))+'T00:00:00').toISOString();
    const max=new Date(plusDays(today(), Number(db.googleCalendar.windowFutureDays||180))+'T23:59:59').toISOString();
    let token='',out=[];
    do{
      const q=new URLSearchParams({timeMin:min,timeMax:max,singleEvents:'true',showDeleted:'true',maxResults:'2500'});
      if(token)q.set('pageToken',token);
      const data=await api(`/calendars/${cal}/events?${q}`);
      out.push(...(data.items||[]));token=data.nextPageToken||'';
    }while(token);
    return out;
  }
  async function createRemote(e){
    const cal=encodeURIComponent(db.googleCalendar.calendarId||'primary');
    const item=await api(`/calendars/${cal}/events?sendUpdates=none`,{method:'POST',body:JSON.stringify(googleBody(e))});
    e.googleEventId=item.id;e.googleHtmlLink=item.htmlLink||'';e.googleUpdatedAt=item.updated||'';e.googleSyncedHash=localHash(e);e.syncConflict=false;
    return item;
  }
  async function updateRemote(e){
    const cal=encodeURIComponent(db.googleCalendar.calendarId||'primary'),id=encodeURIComponent(e.googleEventId);
    const item=await api(`/calendars/${cal}/events/${id}?sendUpdates=none`,{method:'PATCH',body:JSON.stringify(googleBody(e))});
    e.googleUpdatedAt=item.updated||'';e.googleHtmlLink=item.htmlLink||e.googleHtmlLink;e.googleSyncedHash=localHash(e);e.syncConflict=false;
    return item;
  }
  async function deleteRemote(id){
    const cal=encodeURIComponent(db.googleCalendar.calendarId||'primary');
    await api(`/calendars/${cal}/events/${encodeURIComponent(id)}?sendUpdates=none`,{method:'DELETE'});
  }
  async function pushLocal(){
    const stats={created:0,updated:0,deleted:0,conflicts:0};
    const tomb=[...(db.googleCalendar.tombstones||[])];
    for(const t of tomb){
      try{await deleteRemote(t.googleEventId);stats.deleted++;db.googleCalendar.tombstones=db.googleCalendar.tombstones.filter(x=>x.googleEventId!==t.googleEventId)}
      catch(e){if(!/not found|404/i.test(e.message))throw e;db.googleCalendar.tombstones=db.googleCalendar.tombstones.filter(x=>x.googleEventId!==t.googleEventId)}
    }
    for(const e of db.plannerEvents){
      if(e.personal||e.source==='google-calendar'||e.source==='personal-calendar'||!inSyncWindow(e.date))continue;
      if(e.syncConflict){stats.conflicts++;continue}
      if(!e.googleEventId){await createRemote(e);stats.created++;continue}
      if(localHash(e)!==(e.googleSyncedHash||'')){await updateRemote(e);stats.updated++}
    }
    saveDB();return stats;
  }
  async function syncGoogle(silent=false){
    if(syncInFlight)return null;
    if(!navigator.onLine){if(!silent)toast('لا يوجد اتصال بالإنترنت');return null}
    if(!isTokenValid()){if(!silent)throw new Error('GOOGLE_AUTH_REQUIRED');return null}
    syncInFlight=true;
    try{
      const remote=await listRemote();
      const pull=applyRemoteEvents(remote);
      const push=await pushLocal();
      db.googleCalendar.lastSync=new Date().toISOString();saveDB();render();
      if(!silent)toast(`Google: +${pull.imported} شخصي، ↑${push.created+push.updated} من التطبيق${pull.conflicts+push.conflicts?'، تعارض '+(pull.conflicts+push.conflicts):''}`);
      return {pull,push};
    }finally{syncInFlight=false}
  }
  function scheduleAutoSync(){
    if(syncTimer)clearInterval(syncTimer);
    if(!db.googleCalendar.autoSync)return;
    syncTimer=setInterval(()=>{if(isTokenValid())syncGoogle(true).catch(console.warn)},Math.max(5,Number(db.googleCalendar.syncMinutes||15))*60000);
    if(isTokenValid())setTimeout(()=>syncGoogle(true).catch(console.warn),1200);
  }
  function setupModal(){
    modal('ربط Google Calendar',`
      <div class="form-grid">
        <div class="field full"><label>Google OAuth Client ID</label><input id="gcalClientId" dir="ltr" placeholder="...apps.googleusercontent.com" value="${esc(db.googleCalendar.clientId||'')}"></div>
        <div class="field"><label>المزامنة التلقائية</label><select id="gcalAuto"><option value="1" ${db.googleCalendar.autoSync?'selected':''}>مفعلة</option><option value="0" ${!db.googleCalendar.autoSync?'selected':''}>متوقفة</option></select></div>
        <div class="field"><label>كل كم دقيقة؟</label><input id="gcalMinutes" type="number" min="5" max="120" value="${db.googleCalendar.syncMinutes||15}"></div>
      </div>
      <div class="security-note" style="margin-top:10px"><b>الإعداد مرة واحدة:</b> في Google Cloud فعّل Calendar API، أنشئ OAuth Client ID من نوع Web application، وأضف <code>https://ahmedbouamoud.github.io</code> إلى Authorized JavaScript origins. الـClient ID ليس سرًا؛ لا تضع Client Secret داخل التطبيق.</div>
    `,()=>{
      const id=$('#gcalClientId').value.trim();if(id&&!id.endsWith('.apps.googleusercontent.com')){toast('Client ID غير صحيح');return false}
      db.googleCalendar.clientId=id;db.googleCalendar.autoSync=$('#gcalAuto').value==='1';db.googleCalendar.syncMinutes=Math.max(5,Math.min(120,Number($('#gcalMinutes').value)||15));saveDB();scheduleAutoSync();render();return true
    });
  }

  const prevPlanner=renderers.planner;
  renderers.planner=function(){
    const base=prevPlanner();
    const connected=isTokenValid();
    const panel=`<div class="gcal-panel">
      <div class="gcal-head"><div class="gcal-title"><span class="gcal-dot ${connected?'on':''}"></span>Google Calendar — مزامنة مباشرة</div><span class="badge">${tokenStatus()}</span></div>
      ${db.googleCalendar.clientId?'' : '<div class="gcal-help">أدخل OAuth Client ID مرة واحدة لبدء الربط المباشر.</div>'}
      <div class="gcal-actions">
        <button class="primary" data-act="gcal-connect">${connected?'إعادة الاتصال':'ربط Google'}</button>
        <button class="ghost" data-act="gcal-sync" ${connected?'':'disabled'}>↻ مزامنة الآن</button>
        <button class="ghost" data-act="gcal-setup">⚙ إعداد الربط</button>
      </div>
      <div class="gcal-meta"><span>تلقائي: <b>${db.googleCalendar.autoSync?'نعم':'لا'}</b></span><span>كل <b>${db.googleCalendar.syncMinutes||15}</b> دقيقة</span><span>آخر مزامنة: <b>${db.googleCalendar.lastSync?new Date(db.googleCalendar.lastSync).toLocaleString('ar-MA'):'—'}</b></span></div>
      <div class="gcal-help">المزامنة التلقائية تعمل أثناء فتح التطبيق واتصاله بالإنترنت. عند انتهاء جلسة Google سيطلب التطبيق إعادة الربط؛ لا يتم حفظ Access Token على الجهاز.</div>
    </div>`;
    return base.replace(/(<div class="card" style="margin-bottom:12px">)/,panel+'$1');
  };

  const prevAction=action;
  action=function(act,id){
    if(act==='gcal-setup'){setupModal();return}
    if(act==='gcal-connect'){
      connectGoogle('consent').then(()=>syncGoogle(false)).catch(e=>{console.warn(e);toast(e.message==='GOOGLE_AUTH_REQUIRED'?'أعد ربط Google':e.message)});
      return
    }
    if(act==='gcal-sync'){
      syncGoogle(false).catch(e=>{
        if(e.message==='GOOGLE_AUTH_REQUIRED')connectGoogle('').then(()=>syncGoogle(false)).catch(x=>toast(x.message));
        else toast(e.message);
      });return
    }
    return prevAction(act,id);
  };

  const prevRender=render;
  render=function(){
    prevRender();
    if(currentView==='planner'){
      document.querySelectorAll('.event-chip').forEach(el=>{
        const e=db.plannerEvents.find(x=>x.id===el.dataset.id);
        if(e?.syncConflict)el.classList.add('sync-conflict');
      });
    }
  };

  scheduleAutoSync();
  render();

  window.__dqGoogleSyncTest={
    localHash,googleHash,googleBody,applyRemoteEvents,
    setLocalToken:(t='test',seconds=3600)=>{googleToken=t;googleTokenExpiresAt=Date.now()+seconds*1000},
    clearToken:()=>{googleToken='';googleTokenExpiresAt=0},
    tokenValid:isTokenValid
  };
  window.__dqGoogleSyncReady=true;
})();