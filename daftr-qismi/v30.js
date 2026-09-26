/* Daftr Qismi v3.0 — secure multi-device cloud handoff */
db.cloud ||= {};
db.cloud.profile ||= {email:'',displayName:db.settings?.teacher||''};
let savedDeviceId='';
try{savedDeviceId=localStorage.getItem('daftr_qismi_device_id')||''}catch(e){}
const newDeviceId='dev_'+(globalThis.crypto?.randomUUID?globalThis.crypto.randomUUID():Date.now().toString(36)+'_'+Math.random().toString(36).slice(2));
db.cloud.deviceId ||= savedDeviceId || newDeviceId;
db.cloud.deviceName ||= navigator.userAgent.includes('Android')?'هاتف Android':'هذا الجهاز';
db.cloud.lastExport ||= '';
db.cloud.lastImport ||= '';
try{localStorage.setItem('daftr_qismi_device_id',db.cloud.deviceId)}catch(e){console.warn('device id storage',e)}
try{saveDB()}catch(e){console.warn('cloud metadata storage',e)}

const CLOUD_SNAP_KEY='daftr_qismi_snapshots_v3';
const CLOUD_FILE_EXT='.dqcloud';

const v30style=document.createElement('style');
v30style.textContent=`
.cloud-hero{background:linear-gradient(135deg,#0b315a,#0f766e);color:#fff;border-radius:18px;padding:20px;margin-bottom:15px;display:grid;grid-template-columns:1fr auto;gap:15px;align-items:center}
.cloud-hero h2{margin:0 0 5px}.cloud-hero p{margin:0;opacity:.84}.cloud-icon{width:72px;height:72px;border-radius:22px;background:rgba(255,255,255,.14);display:grid;place-items:center;font-size:36px}
.cloud-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.cloud-stat{background:#fff;border:1px solid #e1e8ef;border-radius:13px;padding:12px}.cloud-stat small{display:block;color:#64748b}.cloud-stat b{font-size:16px;display:block;margin-top:4px;word-break:break-word}
.cloud-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cloud-action{border:1px solid #dce6ef;border-radius:14px;padding:15px;background:#fff}.cloud-action h3{margin:0 0 6px}.cloud-action p{font-size:12px;color:#64748b;min-height:38px}
.sync-primary{width:100%;background:#123f73;color:#fff;border:0;border-radius:10px;padding:10px;cursor:pointer}.sync-secondary{width:100%;background:#f8fafc;color:#123f73;border:1px solid #ccd9e6;border-radius:10px;padding:10px;cursor:pointer}
.snapshot-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #edf2f7}.snapshot-row:last-child{border-bottom:0}.snapshot-meta{font-size:11px;color:#64748b}
.device-badge{display:inline-flex;align-items:center;gap:6px;background:#eef6ff;color:#164e83;padding:5px 9px;border-radius:999px;font-size:12px}
.security-note{border-right:4px solid #0f766e;background:#f0fbf8;border-radius:10px;padding:10px 12px;font-size:12px;color:#355}
.restore-preview{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.restore-preview div{background:#f8fafc;border-radius:9px;padding:9px;text-align:center}.restore-preview b{display:block;font-size:19px}
.pass-wrap{display:grid;gap:8px}.pass-wrap .small{line-height:1.6}
@media(max-width:760px){.cloud-grid{grid-template-columns:1fr}.cloud-actions{grid-template-columns:1fr}.cloud-hero{grid-template-columns:1fr}.cloud-icon{display:none}.restore-preview{grid-template-columns:1fr 1fr}}
`;
document.head.appendChild(v30style);

function bytesToB64(bytes){let s='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)s+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(s)}
function b64ToBytes(s){const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
async function deriveCloudKey(pass,salt,usage){const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:120000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,usage)}
function backupPayload(){
  return {
    format:'daftr-qismi-cloud',
    version:3,
    exportedAt:new Date().toISOString(),
    device:{id:db.cloud.deviceId,name:db.cloud.deviceName},
    profile:{displayName:db.cloud.profile.displayName||db.settings.teacher||'',email:db.cloud.profile.email||''},
    data:db
  };
}
async function encryptBackup(payload,pass){
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await deriveCloudKey(pass,salt,['encrypt']);
  const clear=new TextEncoder().encode(JSON.stringify(payload)),cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,clear));
  return {format:'daftr-qismi-cloud-encrypted',version:1,kdf:'PBKDF2-SHA256-120000',cipher:'AES-GCM',salt:bytesToB64(salt),iv:bytesToB64(iv),data:bytesToB64(cipher)};
}
async function decryptBackup(envelope,pass){
  if(envelope?.format==='daftr-qismi-cloud')return envelope;
  if(envelope?.classes&&envelope?.students)return {format:'daftr-qismi-cloud',version:2,exportedAt:'',device:{name:'نسخة قديمة'},profile:{displayName:envelope.settings?.teacher||''},data:envelope};
  if(envelope?.format!=='daftr-qismi-cloud-encrypted')throw new Error('صيغة النسخة غير معروفة');
  const salt=b64ToBytes(envelope.salt),iv=b64ToBytes(envelope.iv),cipher=b64ToBytes(envelope.data),key=await deriveCloudKey(pass,salt,['decrypt']);
  const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);
  return JSON.parse(new TextDecoder().decode(clear));
}
function cloudFileName(){const name=(db.cloud.profile.displayName||db.settings.teacher||'teacher').replace(/[^\p{L}\p{N}_-]+/gu,'-').slice(0,35)||'teacher';return `daftr-qismi-${name}-${today()}${CLOUD_FILE_EXT}`}
function snapshots(){try{return JSON.parse(localStorage.getItem(CLOUD_SNAP_KEY)||'[]')}catch{return []}}
function saveSnapshots(xs){try{localStorage.setItem(CLOUD_SNAP_KEY,JSON.stringify(xs.slice(0,3)));return true}catch(e){console.warn('snapshot storage full',e);return false}}
function clonePlain(x){return JSON.parse(JSON.stringify(x))}
function snapshotData(){const d=clonePlain(db);d.studentPhotos={};return d}
function createLocalSnapshot(label='نسخة تلقائية'){
  try{const xs=snapshots(),snap={id:uid('snap'),createdAt:new Date().toISOString(),label,deviceName:db.cloud.deviceName,data:snapshotData()};xs.unshift(snap);if(!saveSnapshots(xs))return null;return snap}catch(e){console.warn('snapshot failed',e);return null}
}
function restoreSnapshot(id){
  const snap=snapshots().find(s=>s.id===id);if(!snap)return;
  if(confirm('سيتم استبدال البيانات الحالية بهذه النسخة المحلية. متابعة؟')){createLocalSnapshot('قبل استرجاع نسخة محلية');const keepPhotos=db.studentPhotos||{};db=clonePlain(snap.data);db.studentPhotos={...keepPhotos,...(db.studentPhotos||{})};saveDB();currentClassId=db.classes?.[0]?.id||'';render();toast('تم استرجاع النسخة المحلية')}
}
function deleteSnapshot(id){saveSnapshots(snapshots().filter(s=>s.id!==id));render()}
function mergeArrays(local=[],remote=[]){
  const map=new Map();local.forEach(x=>map.set(x.id||JSON.stringify(x),x));remote.forEach(x=>map.set(x.id||JSON.stringify(x),x));return [...map.values()]
}
function mergeDatabases(local,remote){
  const out={...local,...remote};
  const arrayKeys=['classes','students','attendance','assessments','grades','notes','homework','homeworkStatus','remediation','participation','lessonLogs','skills','skillSupport','studentGroups','groupMembers','plannerEvents','curriculum'];
  arrayKeys.forEach(k=>out[k]=mergeArrays(local[k]||[],remote[k]||[]));
  out.studentPhotos={...(local.studentPhotos||{}),...(remote.studentPhotos||{})};
  out.seating={...(local.seating||{}),...(remote.seating||{})};
  out.settings={...(local.settings||{}),...(remote.settings||{})};
  out.cloud={...(local.cloud||{}),...(remote.cloud||{}),deviceId:local.cloud?.deviceId||remote.cloud?.deviceId,deviceName:local.cloud?.deviceName||remote.cloud?.deviceName,lastImport:new Date().toISOString()};
  return out;
}
function restoreSummary(payload){
  const d=payload.data||{};return {classes:d.classes?.length||0,students:d.students?.length||0,grades:d.grades?.length||0,date:payload.exportedAt||'',device:payload.device?.name||'غير معروف',teacher:payload.profile?.displayName||''}
}
async function shareCloudBackup(pass){
  if(!pass||pass.length<4){toast('استعمل رمز حماية من 4 أحرف على الأقل');return}
  createLocalSnapshot('قبل النسخ السحابي');
  const envelope=await encryptBackup(backupPayload(),pass),file=new File([JSON.stringify(envelope)],cloudFileName(),{type:'application/json'});
  db.cloud.lastExport=new Date().toISOString();saveDB();
  if(navigator.canShare?.({files:[file]})&&navigator.share){
    try{await navigator.share({title:'نسخة دفتر القسم الذكي',text:'احفظ هذه النسخة في Google Drive الخاص بك.',files:[file]});toast('اختر Google Drive لحفظ النسخة');return}catch(e){if(e.name==='AbortError')return}
  }
  const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('تم تنزيل النسخة؛ ارفعها إلى Google Drive');
}
function openCloudRestorePicker(){const i=$('#cloudRestoreInput');if(i)i.click()}
async function readCloudBackupFile(file,pass){
  const envelope=JSON.parse(await file.text());
  return decryptBackup(envelope,pass);
}
function showRestoreChoice(payload){
  const s=restoreSummary(payload);
  modal('معاينة النسخة السحابية',`<div class="restore-preview"><div><small>الأقسام</small><b>${s.classes}</b></div><div><small>التلاميذ</small><b>${s.students}</b></div><div><small>النقط</small><b>${s.grades}</b></div></div><div class="small" style="margin-top:12px">الأستاذ: ${esc(s.teacher||'—')}<br>الجهاز: ${esc(s.device)}<br>تاريخ النسخة: ${esc(s.date)}</div><div class="security-note" style="margin-top:12px">يمكنك الاستبدال الكامل، أو الدمج الذكي مع بيانات هذا الجهاز. قبل أي عملية ينشئ التطبيق نسخة رجوع محلية تلقائيًا.</div><div class="cloud-actions" style="margin-top:12px"><button type="button" class="sync-secondary" id="mergeCloudBackup">دمج ذكي</button><button type="button" class="sync-primary" id="replaceCloudBackup">استبدال كامل</button></div>`,()=>false);
  setTimeout(()=>{
    $('#mergeCloudBackup').onclick=()=>{createLocalSnapshot('قبل الدمج السحابي');db=mergeDatabases(db,payload.data||{});db.cloud.lastImport=new Date().toISOString();saveDB();$('#modal').close();render();toast('تم دمج النسخة السحابية')};
    $('#replaceCloudBackup').onclick=()=>{if(!confirm('استبدال جميع بيانات هذا الجهاز بالنسخة السحابية؟'))return;createLocalSnapshot('قبل الاستبدال السحابي');const localDevice={id:db.cloud.deviceId,name:db.cloud.deviceName};db=clonePlain(payload.data||defaultDB);db.cloud||={};db.cloud.deviceId=localDevice.id;db.cloud.deviceName=localDevice.name;db.cloud.lastImport=new Date().toISOString();saveDB();currentClassId=db.classes?.[0]?.id||'';$('#modal').close();render();toast('تم استرجاع النسخة السحابية')};
  },0);
}
function cloudDate(v){return v?new Date(v).toLocaleString('ar-MA'):'—'}

renderers.cloud=function(){
  const ss=snapshots();
  return `${viewHead('السحابة والأجهزة','نقل آمن للبيانات بين الهاتف والحاسوب عبر Google Drive')}
  <div class="cloud-hero"><div><h2>دفتر القسم — Cloud 3.0</h2><p>بياناتك تبقى محلية، وأنت تختار متى ترسل نسخة مشفرة إلى Drive ومتى تسترجعها.</p></div><div class="cloud-icon">☁</div></div>
  <div class="cloud-grid"><div class="cloud-stat"><small>الجهاز الحالي</small><b>${esc(db.cloud.deviceName)}</b></div><div class="cloud-stat"><small>آخر إرسال للسحابة</small><b>${cloudDate(db.cloud.lastExport)}</b></div><div class="cloud-stat"><small>آخر استرجاع</small><b>${cloudDate(db.cloud.lastImport)}</b></div></div>
  <div class="notification-banner"><div><strong>🔐 النسخ السحابية مشفرة</strong><div class="small">اختر رمز حماية لا تنساه؛ لا يُحفظ الرمز داخل التطبيق.</div></div><span class="device-badge">ID: ${esc(db.cloud.deviceId.slice(-8))}</span></div>
  <div class="cloud-actions">
    <div class="cloud-action"><h3>1. نسخ إلى Google Drive</h3><p>ينشئ ملفًا مشفرًا ثم يفتح قائمة المشاركة. اختر Google Drive الخاص بك.</p><button class="sync-primary" data-act="cloud-backup">نسخ مشفر إلى Drive</button></div>
    <div class="cloud-action"><h3>2. استرجاع من Drive</h3><p>اختر ملف .dqcloud من Google Drive، ثم اختر الدمج أو الاستبدال بعد المعاينة.</p><button class="sync-secondary" data-act="cloud-restore">اختيار نسخة من Drive</button></div>
  </div>
  <div class="grid two" style="margin-top:14px">
    <div class="card"><h3>هوية الأستاذ والجهاز</h3><div class="form-grid"><div class="field"><label>اسم الأستاذ</label><input id="cloudTeacherName" value="${esc(db.cloud.profile.displayName||db.settings.teacher||'')}"></div><div class="field"><label>البريد (اختياري)</label><input id="cloudTeacherEmail" type="email" value="${esc(db.cloud.profile.email||'')}"></div><div class="field full"><label>اسم هذا الجهاز</label><input id="cloudDeviceName" value="${esc(db.cloud.deviceName)}"></div></div><button class="primary" data-act="save-cloud-profile" style="margin-top:10px">حفظ</button></div>
    <div class="card"><div class="section-title"><h3>نسخ الرجوع المحلية</h3><button class="soft" data-act="create-snapshot">+ لقطة الآن</button></div>${ss.length?ss.map(s=>`<div class="snapshot-row"><div><strong>${esc(s.label)}</strong><div class="snapshot-meta">${cloudDate(s.createdAt)} • ${esc(s.deviceName||'')}</div></div><div class="row-actions"><button class="ghost" data-act="restore-snapshot" data-id="${s.id}">استرجاع</button><button class="danger" data-act="delete-snapshot" data-id="${s.id}">حذف</button></div></div>`).join(''):empty('لا توجد لقطات محلية بعد.')}</div>
  </div>
  <div class="security-note" style="margin-top:14px"><strong>للعمل على هاتف وحاسوب:</strong> من الجهاز الأول اختر «نسخ مشفر إلى Drive». من الجهاز الثاني افتح التطبيق ثم «استرجاع من Drive». اختر «دمج ذكي» إذا كان الجهازان يحتويان بيانات تريد الاحتفاظ بها.</div>
  <input id="cloudRestoreInput" type="file" accept=".dqcloud,application/json" hidden>`;
};

const v23Settings=renderers.settings;
renderers.settings=function(){
  return v23Settings()+`<div class="card" style="margin-top:14px"><h3>السحابة والأجهزة</h3><p class="small">اضبط هوية الأستاذ واسم الجهاز، ثم استخدم صفحة السحابة لنقل البيانات بين أجهزتك.</p><button class="ghost" data-act="open-cloud">فتح Cloud 3.0</button></div>`;
};

const v23Action=action;
action=function(act,id){
  if(act==='open-cloud'){currentView='cloud';render();return}
  if(act==='save-cloud-profile'){db.cloud.profile.displayName=$('#cloudTeacherName')?.value.trim()||'';db.cloud.profile.email=$('#cloudTeacherEmail')?.value.trim()||'';db.cloud.deviceName=$('#cloudDeviceName')?.value.trim()||'هذا الجهاز';if(db.cloud.profile.displayName)db.settings.teacher=db.cloud.profile.displayName;saveDB();toast('تم حفظ هوية الجهاز');render();return}
  if(act==='cloud-backup'){
    modal('حماية النسخة السحابية',`<div class="pass-wrap"><label>رمز الحماية</label><input id="cloudPass" type="password" autocomplete="new-password" minlength="4" placeholder="4 أحرف أو أكثر"><div class="small">ستحتاج الرمز نفسه عند الاسترجاع. لا يُرسل الرمز ولا يُحفظ في التطبيق.</div></div>`,()=>{const pass=$('#cloudPass').value;if(pass.length<4){toast('الرمز قصير');return false}setTimeout(()=>shareCloudBackup(pass),0);return true});return
  }
  if(act==='cloud-restore'){openCloudRestorePicker();return}
  if(act==='create-snapshot'){createLocalSnapshot('لقطة يدوية');render();toast('تم إنشاء لقطة محلية');return}
  if(act==='restore-snapshot'){restoreSnapshot(id);return}
  if(act==='delete-snapshot'){deleteSnapshot(id);return}
  return v23Action(act,id);
};

const v23Bind=bindDynamic;
bindDynamic=function(){
  v23Bind();
  const inp=$('#cloudRestoreInput');
  if(inp)inp.onchange=()=>{
    const file=inp.files?.[0];if(!file)return;
    modal('فك حماية النسخة',`<div class="pass-wrap"><label>رمز الحماية</label><input id="cloudRestorePass" type="password" autocomplete="current-password"><div class="small">إذا كانت النسخة قديمة غير مشفرة، اترك الحقل فارغًا.</div></div>`,()=>{const pass=$('#cloudRestorePass').value;setTimeout(async()=>{try{const payload=await readCloudBackupFile(file,pass);showRestoreChoice(payload)}catch(e){console.error(e);alert('تعذر فتح النسخة. تحقق من رمز الحماية والملف.')}finally{inp.value=''}},0);return true});
  };
};

try{
  const stamp=localStorage.getItem('daftr_qismi_snapshot_stamp')||'';
  if(stamp!==today()){
    createLocalSnapshot(stamp?'نسخة يومية تلقائية':'بداية Cloud 3.0');
    localStorage.setItem('daftr_qismi_snapshot_stamp',today());
  }
}catch(e){console.warn('automatic snapshot skipped',e)}

render();
