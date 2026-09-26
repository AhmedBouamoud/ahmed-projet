/* Daftr Qismi v2.1 extension */
db.studentPhotos ||= {};
db.participation ||= [];
db.alertPrefs ||= {absences:3, lowAverage:10, fallingTrend:-2, missingHomework:2, negativeNotes:2};
saveDB();

const v21style=document.createElement('style');
v21style.textContent=`
.student-photo{width:78px;height:78px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.85);box-shadow:0 4px 18px rgba(0,0,0,.18)}
.profile-photo-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:9px}
.timeline{position:relative;padding-right:18px}.timeline:before{content:"";position:absolute;right:5px;top:4px;bottom:4px;width:2px;background:#e2e8f0}
.timeline-item{position:relative;padding:0 18px 14px 0}.timeline-item:before{content:"";position:absolute;right:-1px;top:5px;width:12px;height:12px;border-radius:50%;background:#245f9c;border:3px solid #fff;box-shadow:0 0 0 1px #b8c7d8}.timeline-date{font-size:11px;color:#64748b}.timeline-title{font-weight:800;margin-top:2px}.timeline-text{font-size:13px;color:#475569;margin-top:2px}
.alert-list{display:flex;flex-direction:column;gap:8px}.alert-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid #e5eaf0;border-radius:12px;background:#fff}.alert-row.warn{border-right:4px solid #d58b00}.alert-row.danger{border-right:4px solid #c23b31}.alert-row.info{border-right:4px solid #2c6aa0}.alert-row .meta{font-size:12px;color:#64748b;margin-top:3px}
.part-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px}.part-card{border:1px solid #e1e8ef;border-radius:13px;background:#fff;padding:12px}.part-top{display:flex;justify-content:space-between;gap:10px;align-items:center}.part-score{font-size:26px;font-weight:900;color:#123f73}.part-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:10px}.part-plus{background:#e9f8f0;color:#16794d;border:1px solid #b8e2ca;border-radius:9px;padding:8px;cursor:pointer}.part-minus{background:#fff0ef;color:#b42318;border:1px solid #f1c2be;border-radius:9px;padding:8px;cursor:pointer}
.report-btn{background:#fff;color:#123f73;border:1px solid rgba(255,255,255,.7);border-radius:9px;padding:8px 12px;cursor:pointer}
.photo-input{display:none}
@media(max-width:600px){.alert-row{flex-direction:column}.profile-photo-actions{justify-content:center}}
`;
document.head.appendChild(v21style);

function participationScore(sid){
  return db.participation.filter(p=>p.studentId===sid).reduce((n,p)=>n+Number(p.value||0),0);
}
function participationToday(sid){
  return db.participation.filter(p=>p.studentId===sid&&p.date===today()).reduce((n,p)=>n+Number(p.value||0),0);
}
function addParticipation(sid,value,label=''){
  db.participation.push({id:uid('part'),studentId:sid,classId:currentClassId,date:today(),value:Number(value),label});
  saveDB();
}
function getStudentAlerts(s){
  const out=[], av=avgForStudent(s.id), tr=trendForStudent(s.id), abs=studentAbs(s.id,'A'), miss=studentMissingHomework(s.id), neg=noteCount(s.id,'negative');
  const p=db.alertPrefs;
  if(abs>=p.absences) out.push({type:'danger',title:`${abs} غيابات مسجلة`,meta:'يستحسن التحقق من انتظام الحضور.'});
  if(av!=null&&av<p.lowAverage) out.push({type:'warn',title:`المعدل ${av.toFixed(2)}/20`,meta:'أقل من عتبة المتابعة المحددة.'});
  if(tr!=null&&tr<=p.fallingTrend) out.push({type:'danger',title:`تراجع النتائج ${tr.toFixed(1)} نقطة`,meta:'مقارنة بين أول وآخر تقويم متاح.'});
  if(miss>=p.missingHomework) out.push({type:'warn',title:`${miss} واجبات غير منجزة`,meta:'قد يحتاج متابعة في إنجاز الواجبات.'});
  if(neg>=p.negativeNotes) out.push({type:'info',title:`${neg} ملاحظات تحتاج متابعة`,meta:'راجع سجل السلوك والملاحظات.'});
  return out;
}
function allClassAlerts(){
  return students().flatMap(s=>getStudentAlerts(s).map(a=>({...a,student:s})));
}
function studentTimeline(sid){
  const events=[];
  db.attendance.filter(a=>a.studentId===sid).forEach(a=>events.push({date:a.date,title:'الحضور',text:({P:'حاضر',A:'غائب',L:'متأخر',E:'غياب معذور'})[a.status]||a.status,kind:'attendance'}));
  db.notes.filter(n=>n.studentId===sid).forEach(n=>events.push({date:n.date,title:n.type==='positive'?'ملاحظة إيجابية':n.type==='negative'?'ملاحظة متابعة':'ملاحظة',text:n.text,kind:'note'}));
  db.remediation.filter(r=>r.studentId===sid).forEach(r=>events.push({date:r.date||'',title:'دعم فردي',text:`${r.title}${r.done?' — منجز':''}`,kind:'remediation'}));
  db.participation.filter(p=>p.studentId===sid).forEach(p=>events.push({date:p.date,title:p.value>0?'مشاركة إيجابية':'مشاركة تحتاج تحسين',text:p.label||(`القيمة: ${p.value>0?'+':''}${p.value}`),kind:'participation'}));
  db.homeworkStatus.filter(x=>x.studentId===sid).forEach(x=>{const h=db.homework.find(h=>h.id===x.homeworkId);if(h)events.push({date:h.dueDate||'',title:'واجب منزلي',text:`${h.title}: ${x.status==='done'?'منجز':x.status==='missing'?'غير منجز':'معذور'}`,kind:'homework'})});
  db.assessments.filter(a=>a.classId===currentClassId).forEach(a=>{const g=db.grades.find(x=>x.assessmentId===a.id&&x.studentId===sid);if(g&&g.score!==''&&g.score!=null)events.push({date:a.date||'',title:'تقويم / فرض',text:`${a.title}: ${g.score}/${a.max}`,kind:'grade'})});
  return events.sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,80);
}
function photoFor(sid){return db.studentPhotos[sid]||''}
async function compressPhoto(file){
  const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file)});
  const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=data});
  const max=420,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale));
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(img,0,0,w,h);
  return canvas.toDataURL('image/jpeg',.76);
}
function printStudentReport(sid){
  const s=db.students.find(x=>x.id===sid); if(!s)return;
  const av=avgForStudent(s.id), alerts=getStudentAlerts(s), ass=db.assessments.filter(a=>a.classId===s.classId), tl=studentTimeline(s.id).slice(0,15);
  const grades=ass.map(a=>{const g=db.grades.find(x=>x.assessmentId===a.id&&x.studentId===s.id);return g&&g.score!==''?`<tr><td>${esc(a.title)}</td><td>${a.date||''}</td><td>${g.score}/${a.max}</td></tr>`:''}).join('');
  const w=window.open('','_blank');
  if(!w){toast('اسمح بفتح النوافذ لطباعة التقرير');return}
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تقرير ${esc(s.name)}</title><style>
  body{font-family:Arial,Tahoma,sans-serif;color:#172333;margin:28px;line-height:1.7}h1,h2{color:#123f73}.head{display:flex;justify-content:space-between;gap:20px;border-bottom:3px solid #123f73;padding-bottom:12px}.meta{color:#64748b}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:18px 0}.card{border:1px solid #dfe7ef;border-radius:10px;padding:10px}.card b{display:block;font-size:20px}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{border:1px solid #dfe7ef;padding:7px;text-align:right}th{background:#f4f7fb}.alert{border-right:4px solid #d58b00;padding:6px 10px;margin:6px 0;background:#fffaf0}.timeline{margin-top:8px}.event{border-bottom:1px solid #e8edf3;padding:7px 0}.footer{margin-top:30px;text-align:left;color:#64748b}.print{position:fixed;left:15px;top:15px;padding:10px 14px}@media print{.print{display:none}.cards{grid-template-columns:repeat(4,1fr)}body{margin:12mm}}</style></head><body>
  <button class="print" onclick="window.print()">طباعة / حفظ PDF</button>
  <div class="head"><div><h1>تقرير فردي للتلميذ(ة)</h1><h2>${esc(s.name)}</h2><div class="meta">${esc(cls()?.name||'')} • ${esc(cls()?.school||'')} • الرقم ${s.number||'—'}</div></div><div class="meta">التاريخ: ${new Date().toLocaleDateString('ar-MA')}</div></div>
  <div class="cards"><div class="card">المعدل<b>${av==null?'—':av.toFixed(2)+'/20'}</b></div><div class="card">الغياب<b>${studentAbs(s.id,'A')}</b></div><div class="card">التأخر<b>${studentAbs(s.id,'L')}</b></div><div class="card">المشاركة<b>${participationScore(s.id)}</b></div></div>
  <h2>التنبيهات</h2>${alerts.length?alerts.map(a=>`<div class="alert"><b>${esc(a.title)}</b><div>${esc(a.meta)}</div></div>`).join(''):'<p>لا توجد تنبيهات حالية.</p>'}
  <h2>النقط</h2><table><thead><tr><th>التقويم</th><th>التاريخ</th><th>النقطة</th></tr></thead><tbody>${grades||'<tr><td colspan="3">لا توجد نقط.</td></tr>'}</tbody></table>
  <h2>آخر الأحداث</h2><div class="timeline">${tl.map(e=>`<div class="event"><b>${esc(e.date||'')} — ${esc(e.title)}</b><div>${esc(e.text)}</div></div>`).join('')||'لا توجد أحداث.'}</div>
  <div class="footer">الأستاذ: ${esc(db.settings.teacher||'الأستاذ أحمد بوعمود')}</div>
  <script>setTimeout(()=>window.print(),500)<\/script></body></html>`);
  w.document.close();
}

const v20Profile=renderers.profile;
renderers.profile=function(){
  const s=db.students.find(x=>x.id===currentStudentId);
  if(!s)return v20Profile();
  const av=avgForStudent(s.id), abs=studentAbs(s.id,'A'), late=studentAbs(s.id,'L'), miss=studentMissingHomework(s.id), score=participationScore(s.id), alerts=getStudentAlerts(s), tl=studentTimeline(s.id);
  const ass=db.assessments.filter(a=>a.classId===s.classId).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const notes=db.notes.filter(n=>n.studentId===s.id).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,10);
  const rem=db.remediation.filter(r=>r.studentId===s.id).sort((a,b)=>Number(a.done)-Number(b.done));
  const initials=s.name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join(''), photo=photoFor(s.id);
  return `
  ${viewHead('الملف الفردي للتلميذ','متابعة شاملة مع سجل زمني وتنبيهات تلقائية','<button class="ghost" data-act="back-students">العودة للتلاميذ</button>')}
  <div class="profile-hero">
    <div>${photo?`<img class="student-photo" src="${photo}" alt="">`:`<div class="profile-avatar">${esc(initials||'ت')}</div>`}</div>
    <div><h2>${esc(s.name)}</h2><p>${esc(cls()?.name||'')} • الرقم: ${s.number||'—'}</p>
      <div class="profile-photo-actions"><label class="report-btn">📷 صورة<input class="photo-input profile-photo-input" type="file" accept="image/*" data-sid="${s.id}"></label>${photo?'<button class="report-btn" data-act="delete-photo" data-id="'+s.id+'">حذف الصورة</button>':''}<button class="report-btn" data-act="print-student-report" data-id="${s.id}">تقرير PDF</button></div>
    </div>
  </div>
  <div class="metric-grid"><div class="metric"><small>المعدل /20</small><b>${av==null?'—':av.toFixed(2)}</b></div><div class="metric"><small>الغيابات</small><b>${abs}</b></div><div class="metric"><small>التأخر</small><b>${late}</b></div><div class="metric"><small>المشاركة</small><b>${score>0?'+':''}${score}</b></div></div>
  ${alerts.length?`<div class="card"><div class="section-title"><h3>تنبيهات المتابعة</h3><span class="badge warn">${alerts.length}</span></div><div class="alert-list">${alerts.map(a=>`<div class="alert-row ${a.type}"><div><strong>${esc(a.title)}</strong><div class="meta">${esc(a.meta)}</div></div></div>`).join('')}</div></div>`:''}
  <div class="grid two">
    <div class="card"><div class="section-title"><h3>السجل الزمني</h3></div>${tl.length?`<div class="timeline">${tl.slice(0,30).map(e=>`<div class="timeline-item"><div class="timeline-date">${esc(e.date||'')}</div><div class="timeline-title">${esc(e.title)}</div><div class="timeline-text">${esc(e.text)}</div></div>`).join('')}</div>`:empty('لا توجد أحداث بعد.')}</div>
    <div class="card"><div class="section-title"><h3>النقط الأخيرة</h3></div>${ass.length?`<div class="mini-list">${ass.slice(0,8).map(a=>{const g=db.grades.find(x=>x.assessmentId===a.id&&x.studentId===s.id);const n=g&&g.score!==''?(Number(g.score)/Number(a.max||20)*20):null;return `<div class="mini-row"><span>${esc(a.title)} <small>${a.date||''}</small></span><strong>${n==null?'—':n.toFixed(2)+'/20'}</strong></div>`}).join('')}</div>`:empty('لا توجد نقط بعد.')}</div>
    <div class="card"><div class="section-title"><h3>الملاحظات والسلوك</h3><button class="soft" data-act="profile-note">+ ملاحظة</button></div>${notes.length?notes.map(n=>`<div class="note-item ${n.type}"><strong>${n.date}</strong><div>${esc(n.text)}</div></div>`).join(''):empty('لا توجد ملاحظات.')}</div>
    <div class="card"><div class="section-title"><h3>خطة الدعم</h3><button class="soft" data-act="add-remediation">+ دعم</button></div>${rem.length?rem.map(r=>`<div class="remed-item ${r.done?'done':''}"><div><strong>${esc(r.title)}</strong><div class="small">${esc(r.details||'')}</div></div><button class="ghost" data-act="toggle-remediation" data-id="${r.id}">${r.done?'إعادة فتح':'تم'}</button></div>`).join(''):empty('لم تُسجل إجراءات دعم بعد.')}</div>
  </div>`;
};

renderers.participation=function(){
  const ss=students();
  return `${viewHead('دفتر المشاركة','سجل سريع للمشاركة الصفية الإيجابية أو التي تحتاج تحسين',db.classes.length?classSelector():'')}
  <div class="card"><div class="small" style="margin-bottom:12px">يمكن تسجيل أكثر من مشاركة في اليوم. الرصيد تراكمي ويظهر في الملف الفردي والتقرير.</div>
  ${ss.length?`<div class="part-grid">${ss.map(s=>`<div class="part-card"><div class="part-top"><div><button class="profile-link" data-act="student-profile" data-id="${s.id}">${esc(s.name)}</button><div class="small">اليوم: ${participationToday(s.id)>0?'+':''}${participationToday(s.id)}</div></div><div class="part-score">${participationScore(s.id)>0?'+':''}${participationScore(s.id)}</div></div><div class="part-actions"><button class="part-plus" data-act="part-plus" data-id="${s.id}">+ مشاركة</button><button class="part-minus" data-act="part-minus" data-id="${s.id}">− متابعة</button></div></div>`).join('')}</div>`:empty('أضف التلاميذ أولًا.')}</div>`;
};

const v20Dash=renderers.dashboard;
renderers.dashboard=function(){
  const html=v20Dash(), alerts=allClassAlerts().slice(0,12);
  const extra=`<div class="card" style="margin-top:16px"><div class="section-title"><h3>تنبيهات تلقائية</h3><span class="badge ${alerts.length?'warn':'ok'}">${alerts.length}</span></div>${alerts.length?`<div class="alert-list">${alerts.map(a=>`<div class="alert-row ${a.type}"><div><button class="profile-link" data-act="student-profile" data-id="${a.student.id}">${esc(a.student.name)}</button><div><strong>${esc(a.title)}</strong></div><div class="meta">${esc(a.meta)}</div></div><button class="soft" data-act="student-profile" data-id="${a.student.id}">فتح الملف</button></div>`).join('')}</div>`:empty('لا توجد تنبيهات متابعة حاليًا.')}</div>`;
  return html+extra;
};

const v20Analytics=renderers.analytics;
renderers.analytics=function(){
  const html=v20Analytics(), alerts=allClassAlerts();
  return html+`<div class="card" style="margin-top:16px"><div class="section-title"><h3>قائمة المتابعة ذات الأولوية</h3><span class="badge warn">${alerts.length}</span></div>${alerts.length?`<div class="alert-list">${alerts.map(a=>`<div class="alert-row ${a.type}"><div><button class="profile-link" data-act="student-profile" data-id="${a.student.id}">${esc(a.student.name)}</button><div><strong>${esc(a.title)}</strong></div><div class="meta">${esc(a.meta)}</div></div></div>`).join('')}</div>`:empty('لا توجد حالات تتجاوز العتبات الحالية.')}</div>`;
};

const v20Action=action;
action=function(act,id){
  if(act==='part-plus'){addParticipation(id,1,'مشاركة صفية إيجابية');render();toast('تم تسجيل المشاركة');return}
  if(act==='part-minus'){addParticipation(id,-1,'تحتاج تحسين المشاركة أو الانضباط');render();toast('تم تسجيل المتابعة');return}
  if(act==='delete-photo'){delete db.studentPhotos[id];saveDB();render();return}
  if(act==='print-student-report'){printStudentReport(id);return}
  return v20Action(act,id);
};

const v20Bind=bindDynamic;
bindDynamic=function(){
  v20Bind();
  $$('.profile-photo-input').forEach(inp=>inp.onchange=async()=>{
    const file=inp.files?.[0];if(!file)return;
    if(file.size>8*1024*1024){toast('الصورة كبيرة جدًا');return}
    try{db.studentPhotos[inp.dataset.sid]=await compressPhoto(file);saveDB();render();toast('تم حفظ الصورة على هذا الجهاز')}catch(e){console.error(e);toast('تعذر معالجة الصورة')}
  });
};

render();
