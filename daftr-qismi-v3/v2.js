/* Daftr Qismi v2 extension */
db.homework ||= [];
db.homeworkStatus ||= [];
db.seating ||= {};
db.remediation ||= [];
let currentStudentId = '';
let currentHomeworkId = db.homework.find(h=>h.classId===currentClassId)?.id || '';

const v2style=document.createElement('style');
v2style.textContent=`
.profile-hero{display:grid;grid-template-columns:auto 1fr;gap:14px;align-items:center;background:linear-gradient(135deg,#123f73,#0f766e);color:#fff;border-radius:17px;padding:18px;margin-bottom:16px}
.profile-avatar{width:70px;height:70px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#123f73;font-size:30px;font-weight:900}
.profile-hero h2{margin:0 0 4px}.profile-hero p{margin:0;opacity:.85}
.metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:14px 0}
.metric{background:#fff;border:1px solid #e4eaf1;border-radius:13px;padding:13px}.metric b{font-size:22px;display:block}.metric small{color:#64748b}
.seat-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.seat{background:#fff;border:1px solid #dfe7ef;border-radius:13px;padding:10px;min-height:96px}.seat-num{font-size:11px;color:#64748b;margin-bottom:6px}.seat select{width:100%;padding:8px;border:1px solid #ccd6e2;border-radius:8px;background:#fff}.seat .small{margin-top:6px}
.hw-card{border:1px solid #e1e8ef;border-radius:12px;padding:12px;background:#fff;margin-bottom:8px}.hw-card.active{border-color:#2c6aa0;box-shadow:0 0 0 2px #e7f1fb inset}.hw-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.status-select{padding:7px;border:1px solid #ccd6e2;border-radius:8px;background:#fff}
.bar{height:8px;border-radius:99px;background:#e9eef4;overflow:hidden;min-width:90px}.bar i{display:block;height:100%;background:#245f9c}
.trend-up{color:#16794d}.trend-down{color:#b42318}.trend-flat{color:#64748b}
.profile-link{font-weight:800;color:#164e83;text-decoration:none;border:0;background:transparent;cursor:pointer;padding:0}
.remed-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid #eef2f6}.remed-item.done{opacity:.6;text-decoration:line-through}
.section-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px}
@media(max-width:760px){.metric-grid{grid-template-columns:1fr 1fr}.seat-grid{grid-template-columns:1fr 1fr}.profile-hero{grid-template-columns:1fr;text-align:center}.profile-avatar{margin:auto}}
`;
document.head.appendChild(v2style);

function classHomework(){ return db.homework.filter(h=>h.classId===currentClassId).sort((a,b)=>(b.dueDate||'').localeCompare(a.dueDate||'')); }
function hwStatus(homeworkId,studentId){ return db.homeworkStatus.find(x=>x.homeworkId===homeworkId&&x.studentId===studentId)?.status || ''; }
function setHwStatus(homeworkId,studentId,status){
  const i=db.homeworkStatus.findIndex(x=>x.homeworkId===homeworkId&&x.studentId===studentId);
  if(i>=0){ if(status) db.homeworkStatus[i].status=status; else db.homeworkStatus.splice(i,1); }
  else if(status) db.homeworkStatus.push({id:uid('hwst'),homeworkId,studentId,status});
  saveDB();
}
function studentMissingHomework(sid){
  return classHomework().filter(h=>hwStatus(h.id,sid)==='missing').length;
}
function studentDoneHomework(sid){
  return classHomework().filter(h=>hwStatus(h.id,sid)==='done').length;
}
function classAttendanceRate(){
  const ss=students(); if(!ss.length) return null;
  const rec=db.attendance.filter(a=>a.classId===currentClassId);
  if(!rec.length) return null;
  const present=rec.filter(a=>a.status==='P'||a.status==='L'||a.status==='E').length;
  return present/rec.length*100;
}
function classAverageV2(){
  const vals=students().map(s=>avgForStudent(s.id)).filter(v=>v!=null);
  return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
}
function trendForStudent(sid){
  const ass=db.assessments.filter(a=>a.classId===currentClassId).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const pts=ass.map(a=>{const g=db.grades.find(x=>x.assessmentId===a.id&&x.studentId===sid);return g&&g.score!==''?Number(g.score)/Number(a.max||20)*20:null}).filter(v=>v!=null);
  if(pts.length<2)return null;
  return pts[pts.length-1]-pts[0];
}
function studentAbs(sid,status='A'){ return db.attendance.filter(a=>a.studentId===sid&&a.status===status).length; }

const oldStudentRow=studentRow;
studentRow=function(s){
  const av=avgForStudent(s.id);
  return `<tr data-name="${esc(s.name.toLowerCase())}"><td>${s.number||'—'}</td><td><button class="profile-link" data-act="student-profile" data-id="${s.id}">${esc(s.name)}</button></td><td>${av==null?'—':av.toFixed(2)}</td><td>${studentAbs(s.id,'A')}</td><td>${studentAbs(s.id,'L')}</td><td><div class="row-actions"><button class="soft" data-act="student-profile" data-id="${s.id}">الملف</button><button class="ghost" data-act="edit-student" data-id="${s.id}">تعديل</button><button class="danger" data-act="delete-student" data-id="${s.id}">حذف</button></div></td></tr>`;
};

renderers.profile=function(){
  const s=db.students.find(x=>x.id===currentStudentId);
  if(!s){ currentView='students'; return renderers.students(); }
  const av=avgForStudent(s.id), abs=studentAbs(s.id,'A'), late=studentAbs(s.id,'L'), pos=noteCount(s.id,'positive'), neg=noteCount(s.id,'negative'), miss=studentMissingHomework(s.id);
  const ass=db.assessments.filter(a=>a.classId===s.classId).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const notes=db.notes.filter(n=>n.studentId===s.id).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,12);
  const rem=db.remediation.filter(r=>r.studentId===s.id).sort((a,b)=>Number(a.done)-Number(b.done));
  const initials=s.name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('');
  return `
    ${viewHead('الملف الفردي للتلميذ','متابعة شاملة للتعلم والحضور والسلوك','<button class="ghost" data-act="back-students">العودة للتلاميذ</button>')}
    <div class="profile-hero"><div class="profile-avatar">${esc(initials||'ت')}</div><div><h2>${esc(s.name)}</h2><p>${esc(cls()?.name||'')} • الرقم: ${s.number||'—'}</p></div></div>
    <div class="metric-grid">
      <div class="metric"><small>المعدل /20</small><b>${av==null?'—':av.toFixed(2)}</b></div>
      <div class="metric"><small>الغيابات</small><b>${abs}</b></div>
      <div class="metric"><small>التأخر</small><b>${late}</b></div>
      <div class="metric"><small>واجبات ناقصة</small><b>${miss}</b></div>
    </div>
    <div class="grid two">
      <div class="card"><div class="section-title"><h3>النقط الأخيرة</h3></div>
        ${ass.length?`<div class="mini-list">${ass.slice(0,8).map(a=>{const g=db.grades.find(x=>x.assessmentId===a.id&&x.studentId===s.id);const n=g&&g.score!==''?(Number(g.score)/Number(a.max||20)*20):null;return `<div class="mini-row"><span>${esc(a.title)} <small>${a.date||''}</small></span><strong>${n==null?'—':n.toFixed(2)+'/20'}</strong></div>`}).join('')}</div>`:empty('لا توجد نقط بعد.')}</div>
      <div class="card"><div class="section-title"><h3>السلوك والملاحظات</h3><button class="soft" data-act="profile-note">+ ملاحظة</button></div>
        <div class="kpi"><span>إيجابي</span><strong>${pos}</strong></div><div class="kpi"><span>يحتاج متابعة</span><strong>${neg}</strong></div>
        ${notes.length?notes.map(n=>`<div class="note-item ${n.type}"><strong>${n.date}</strong><div>${esc(n.text)}</div></div>`).join(''):empty('لا توجد ملاحظات.')}</div>
      <div class="card"><div class="section-title"><h3>خطة الدعم</h3><button class="soft" data-act="add-remediation">+ دعم</button></div>
        ${rem.length?rem.map(r=>`<div class="remed-item ${r.done?'done':''}"><div><strong>${esc(r.title)}</strong><div class="small">${esc(r.details||'')}</div></div><button class="ghost" data-act="toggle-remediation" data-id="${r.id}">${r.done?'إعادة فتح':'تم'}</button></div>`).join(''):empty('لم تُسجل إجراءات دعم بعد.')}</div>
      <div class="card"><div class="section-title"><h3>الواجبات المنزلية</h3></div>
        ${classHomework().length?`<div class="mini-list">${classHomework().slice(0,8).map(h=>{const st=hwStatus(h.id,s.id);return `<div class="mini-row"><span>${esc(h.title)} <small>${h.dueDate||''}</small></span><span class="badge ${st==='done'?'ok':st==='missing'?'danger':''}">${st==='done'?'منجز':st==='missing'?'غير منجز':st==='excused'?'معذور':'—'}</span></div>`}).join('')}</div>`:empty('لا توجد واجبات.')}</div>
    </div>`;
};

renderers.seating=function(){
  const ss=students(), map=db.seating[currentClassId]||{}, count=Math.max(16,Math.ceil(Math.max(ss.length,1)/4)*4);
  const options=(selected)=>`<option value="">— مقعد فارغ —</option>${ss.map(s=>`<option value="${s.id}" ${selected===s.id?'selected':''}>${s.number?s.number+'. ':''}${esc(s.name)}</option>`).join('')}`;
  return `${viewHead('مخطط جلوس القسم','وزّع التلاميذ على المقاعد واستعمله كمرجع سريع',db.classes.length?`${classSelector()} <button class="ghost" data-act="random-seating">توزيع عشوائي</button><button class="ghost" data-act="clear-seating">تفريغ</button>`:'')}
  <div class="card"><div class="small" style="margin-bottom:12px">السبورة / مقدمة القسم</div>
  ${ss.length?`<div class="seat-grid">${Array.from({length:count},(_,i)=>{const sid=map[i]||'';return `<div class="seat"><div class="seat-num">المقعد ${i+1}</div><select class="seat-select" data-seat="${i}">${options(sid)}</select>${sid?`<div class="small">اليوم: ${({P:'حاضر',A:'غائب',L:'متأخر',E:'معذور'})[attStatus(sid,today())]}</div>`:''}</div>`}).join('')}</div>`:empty('أضف التلاميذ أولًا.')}</div>`;
};

renderers.homework=function(){
  const hw=classHomework(); if(!currentHomeworkId||!hw.some(h=>h.id===currentHomeworkId)) currentHomeworkId=hw[0]?.id||'';
  const selected=hw.find(h=>h.id===currentHomeworkId), ss=students();
  return `${viewHead('الواجبات المنزلية','أنشئ الواجب وتتبع الإنجاز لكل تلميذ',db.classes.length?`${classSelector()} <button class="primary" data-act="add-homework">+ واجب جديد</button>`:'')}
  <div class="grid two">
    <div class="card"><h3>الواجبات</h3>${hw.length?hw.map(h=>{const done=ss.filter(s=>hwStatus(h.id,s.id)==='done').length,missing=ss.filter(s=>hwStatus(h.id,s.id)==='missing').length;return `<div class="hw-card ${h.id===currentHomeworkId?'active':''}"><div class="hw-title"><div><strong>${esc(h.title)}</strong><div class="small">التسليم: ${h.dueDate||'—'} • منجز ${done} • ناقص ${missing}</div></div><div class="row-actions"><button class="soft" data-act="select-homework" data-id="${h.id}">تتبع</button><button class="danger" data-act="delete-homework" data-id="${h.id}">حذف</button></div></div>${h.details?`<div class="small" style="margin-top:6px">${esc(h.details)}</div>`:''}</div>`}).join(''):empty('لا توجد واجبات بعد.')}</div>
    <div class="card"><h3>${selected?'تتبع: '+esc(selected.title):'تتبع الإنجاز'}</h3>
      ${selected&&ss.length?`<div class="table-wrap"><table><thead><tr><th>التلميذ(ة)</th><th>الحالة</th></tr></thead><tbody>${ss.map(s=>`<tr><td><button class="profile-link" data-act="student-profile" data-id="${s.id}">${esc(s.name)}</button></td><td><select class="status-select hw-status" data-hw="${selected.id}" data-sid="${s.id}"><option value="" ${!hwStatus(selected.id,s.id)?'selected':''}>—</option><option value="done" ${hwStatus(selected.id,s.id)==='done'?'selected':''}>منجز</option><option value="missing" ${hwStatus(selected.id,s.id)==='missing'?'selected':''}>غير منجز</option><option value="excused" ${hwStatus(selected.id,s.id)==='excused'?'selected':''}>معذور</option></select></td></tr>`).join('')}</tbody></table></div>`:empty(selected?'لا يوجد تلاميذ في القسم.':'اختر واجبًا أو أنشئ واجبًا جديدًا.')}</div>
  </div>`;
};

renderers.analytics=function(){
  const ss=students(), ca=classAverageV2(), rate=classAttendanceRate();
  const below=ss.filter(s=>{const a=avgForStudent(s.id);return a!=null&&a<10}).length;
  const hw=classHomework(); let total=0,done=0; hw.forEach(h=>ss.forEach(s=>{const st=hwStatus(h.id,s.id);if(st){total++;if(st==='done')done++;}}));
  const hwRate=total?done/total*100:null;
  return `${viewHead('التحليلات','مؤشرات تساعدك على اكتشاف الحاجة إلى الدعم بسرعة',db.classes.length?classSelector():'')}
    <div class="metric-grid">
      <div class="metric"><small>معدل القسم</small><b>${ca==null?'—':ca.toFixed(2)}</b></div>
      <div class="metric"><small>نسبة الحضور</small><b>${rate==null?'—':rate.toFixed(0)+'%'}</b></div>
      <div class="metric"><small>أقل من 10/20</small><b>${below}</b></div>
      <div class="metric"><small>إنجاز الواجبات</small><b>${hwRate==null?'—':hwRate.toFixed(0)+'%'}</b></div>
    </div>
    <div class="card"><h3>مؤشرات التلاميذ</h3>
      ${ss.length?`<div class="table-wrap"><table><thead><tr><th>التلميذ(ة)</th><th>المعدل</th><th>الاتجاه</th><th>الغياب</th><th>واجبات ناقصة</th><th>الدعم</th></tr></thead><tbody>${ss.map(s=>{const av=avgForStudent(s.id),tr=trendForStudent(s.id),rem=db.remediation.filter(r=>r.studentId===s.id&&!r.done).length;return `<tr><td><button class="profile-link" data-act="student-profile" data-id="${s.id}">${esc(s.name)}</button></td><td>${av==null?'—':av.toFixed(2)}</td><td class="${tr==null?'trend-flat':tr>0.5?'trend-up':tr<-.5?'trend-down':'trend-flat'}">${tr==null?'—':(tr>0?'+':'')+tr.toFixed(1)}</td><td>${studentAbs(s.id,'A')}</td><td>${studentMissingHomework(s.id)}</td><td>${rem}</td></tr>`}).join('')}</tbody></table></div>`:empty('لا توجد بيانات كافية بعد.')}</div>`;
};

const baseAction=action;
action=function(act,id){
  if(act==='student-profile'){currentStudentId=id;currentView='profile';render();return}
  if(act==='back-students'){currentView='students';render();return}
  if(act==='profile-note'){
    const s=db.students.find(x=>x.id===currentStudentId); if(!s)return;
    modal('ملاحظة للتلميذ',`<div class="form-grid"><div class="field"><label>النوع</label><select id="mType"><option value="neutral">عادية</option><option value="positive">إيجابية / مشاركة</option><option value="negative">تحتاج متابعة</option></select></div><div class="field"><label>التاريخ</label><input id="mDate" type="date" value="${today()}"></div><div class="field full"><label>الملاحظة *</label><textarea id="mText"></textarea></div></div>`,()=>{const text=$('#mText').value.trim();if(!text)return false;db.notes.push({id:uid('n'),classId:currentClassId,studentId:s.id,type:$('#mType').value,date:$('#mDate').value,text});saveDB();render()});return
  }
  if(act==='add-remediation'){
    const s=db.students.find(x=>x.id===currentStudentId); if(!s)return;
    modal('إجراء دعم',`<div class="form-grid"><div class="field full"><label>عنوان الدعم *</label><input id="mTitle" placeholder="مثال: مراجعة قراءة الخريطة"></div><div class="field full"><label>تفاصيل</label><textarea id="mDetails"></textarea></div></div>`,()=>{const title=$('#mTitle').value.trim();if(!title)return false;db.remediation.push({id:uid('rem'),studentId:s.id,classId:currentClassId,title,details:$('#mDetails').value.trim(),done:false,date:today()});saveDB();render()});return
  }
  if(act==='toggle-remediation'){const r=db.remediation.find(x=>x.id===id);if(r){r.done=!r.done;saveDB();render()}return}
  if(act==='random-seating'){
    const ids=students().map(s=>s.id).sort(()=>Math.random()-.5);db.seating[currentClassId]={};ids.forEach((sid,i)=>db.seating[currentClassId][i]=sid);saveDB();render();toast('تم توزيع المقاعد عشوائيًا');return
  }
  if(act==='clear-seating'){db.seating[currentClassId]={};saveDB();render();return}
  if(act==='add-homework'){
    modal('واجب منزلي جديد',`<div class="form-grid"><div class="field full"><label>عنوان الواجب *</label><input id="mTitle"></div><div class="field"><label>تاريخ التسليم</label><input id="mDue" type="date" value="${today()}"></div><div class="field full"><label>التعليمات</label><textarea id="mDetails"></textarea></div></div>`,()=>{const title=$('#mTitle').value.trim();if(!title)return false;const h={id:uid('hw'),classId:currentClassId,title,dueDate:$('#mDue').value,details:$('#mDetails').value.trim()};db.homework.push(h);currentHomeworkId=h.id;saveDB();render()});return
  }
  if(act==='select-homework'){currentHomeworkId=id;render();return}
  if(act==='delete-homework'){if(confirm('حذف هذا الواجب ونتائج تتبعه؟')){db.homework=db.homework.filter(h=>h.id!==id);db.homeworkStatus=db.homeworkStatus.filter(s=>s.homeworkId!==id);if(currentHomeworkId===id)currentHomeworkId='';saveDB();render()}return}
  return baseAction(act,id);
};

const baseBindDynamic=bindDynamic;
bindDynamic=function(){
  baseBindDynamic();
  $$('.seat-select').forEach(sel=>sel.onchange=()=>{db.seating[currentClassId] ||= {};const seat=sel.dataset.seat;if(sel.value)db.seating[currentClassId][seat]=sel.value;else delete db.seating[currentClassId][seat];saveDB();render()});
  $$('.hw-status').forEach(sel=>sel.onchange=()=>{setHwStatus(sel.dataset.hw,sel.dataset.sid,sel.value);toast('تم تحديث الواجب')});
};

const baseRender=render;
render=function(){
  if(!renderers[currentView]) currentView='dashboard';
  baseRender();
};

saveDB();
render();
