/* Daftr Qismi v2.3 — Teacher Command Center */
db.plannerEvents ||= [];
db.curriculum ||= [];
db.settings ||= {};
db.settings.reminderDays ??= 4;
db.settings.lastBackup ||= '';
saveDB();

let plannerWeekOffset=0;
let plannerSelectedDate=today();
let monthlyReportMonth=today().slice(0,7);

const v23style=document.createElement('style');
v23style.textContent=`
.command-grid{display:grid;grid-template-columns:1.25fr .75fr;gap:14px;margin-bottom:16px}
.today-card{background:linear-gradient(135deg,#0f3158,#0f766e);color:#fff;border-radius:18px;padding:19px;box-shadow:0 14px 34px rgba(18,58,104,.18)}
.today-card h2{margin:0 0 5px;font-size:25px}.today-card p{margin:0;opacity:.82}
.today-date{font-size:13px;opacity:.76;margin-bottom:14px}.quick-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}.quick-actions button{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.25);color:#fff;border-radius:10px;padding:9px 12px;cursor:pointer}
.focus-card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:16px}.focus-card h3{margin-top:0}.focus-num{font-size:35px;font-weight:900;color:#123f73}
.due-stack{display:flex;flex-direction:column;gap:8px}.due-item{display:flex;gap:10px;align-items:flex-start;border:1px solid #e2e8f0;border-radius:12px;padding:10px;background:#fff}.due-dot{width:10px;height:10px;border-radius:50%;margin-top:6px;flex:0 0 auto}.due-dot.today{background:#c23b31}.due-dot.soon{background:#d58b00}.due-dot.normal{background:#2c6aa0}.due-item.overdue{background:#fff7f6;border-color:#f2c6c2}.due-meta{font-size:11px;color:#64748b}.due-title{font-weight:800}
.week-toolbar{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}.week-nav{display:flex;gap:6px}.week-grid{display:grid;grid-template-columns:repeat(7,minmax(150px,1fr));gap:8px;overflow-x:auto;padding-bottom:7px}.day-col{min-height:260px;background:#f8fafc;border:1px solid #e1e8ef;border-radius:13px;padding:9px}.day-col.today{border:2px solid #1c6b9c;background:#f2f9ff}.day-head{display:flex;justify-content:space-between;gap:6px;align-items:center;border-bottom:1px solid #e5eaf0;padding-bottom:7px;margin-bottom:8px}.day-name{font-weight:900}.day-date{font-size:11px;color:#64748b}.event-chip{border-right:4px solid #245f9c;background:#fff;border-radius:9px;padding:7px;margin-bottom:6px;box-shadow:0 2px 8px rgba(15,35,60,.04);cursor:pointer}.event-chip.assessment{border-right-color:#8b5cf6}.event-chip.homework{border-right-color:#d58b00}.event-chip.lesson{border-right-color:#0f766e}.event-chip.meeting{border-right-color:#c23b31}.event-chip.note{border-right-color:#64748b}.event-time{font-size:10px;color:#64748b}.event-title{font-size:12px;font-weight:800}.curriculum-list{display:flex;flex-direction:column;gap:8px}.curriculum-item{display:grid;grid-template-columns:36px 1fr auto;gap:10px;align-items:center;border:1px solid #e1e8ef;border-radius:12px;padding:10px;background:#fff}.curriculum-order{width:34px;height:34px;border-radius:10px;background:#eef4fb;color:#164e83;display:grid;place-items:center;font-weight:900}.curriculum-item.done .curriculum-order{background:#e7f7ee;color:#16794d}.curriculum-item.inprogress .curriculum-order{background:#fff5df;color:#8a5600}.curriculum-progress-ring{width:92px;height:92px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#0f766e var(--p),#e8edf3 0);position:relative}.curriculum-progress-ring:after{content:"";position:absolute;width:70px;height:70px;border-radius:50%;background:#fff}.curriculum-progress-ring strong{position:relative;z-index:1;font-size:20px}.progress-layout{display:grid;grid-template-columns:110px 1fr;gap:16px;align-items:start}
.month-pick{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.monthly-hero{background:linear-gradient(135deg,#123f73,#245f9c);color:#fff;border-radius:16px;padding:17px;margin-bottom:14px}.monthly-hero h2{margin:0 0 4px}.monthly-metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:12px 0}.monthly-metric{background:#fff;border:1px solid #e1e8ef;border-radius:12px;padding:10px}.monthly-metric small{color:#64748b;display:block}.monthly-metric b{font-size:20px}
.health-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid #eef2f6}.health-row:last-child{border-bottom:0}.health-ok{color:#16794d}.health-warn{color:#9a6700}.health-bad{color:#b42318}
.notification-banner{display:flex;align-items:center;justify-content:space-between;gap:10px;border:1px solid #bed5ea;background:#f3f9ff;border-radius:12px;padding:10px 12px;margin:12px 0}
@media(max-width:900px){.command-grid{grid-template-columns:1fr}.monthly-metrics{grid-template-columns:1fr 1fr}.progress-layout{grid-template-columns:1fr}.curriculum-progress-ring{margin:auto}}
@media(max-width:520px){.monthly-metrics{grid-template-columns:1fr 1fr}.today-card h2{font-size:22px}}
`;
document.head.appendChild(v23style);

function addDays(date,n){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+n);return d.toISOString().slice(0,10)}
function dateDiff(a,b){const A=new Date(a+'T12:00:00'),B=new Date(b+'T12:00:00');return Math.round((A-B)/86400000)}
function weekStart(offset=0){const d=new Date();d.setHours(12,0,0,0);const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day+offset*7);return d.toISOString().slice(0,10)}
function dateLabel(d){return new Date(d+'T12:00:00').toLocaleDateString('ar-MA',{weekday:'long',day:'numeric',month:'short'})}
function dayShort(d){return new Date(d+'T12:00:00').toLocaleDateString('ar-MA',{weekday:'short'})}
function classPlannerEvents(){return db.plannerEvents.filter(e=>!e.classId||e.classId===currentClassId)}
function dueItems(days=7){
  const t=today(),end=addDays(t,days),items=[];
  db.plannerEvents.filter(e=>(!e.classId||e.classId===currentClassId)&&e.date<=end).forEach(e=>items.push({id:e.id,date:e.date,time:e.time||'',title:e.title,type:e.type||'note',source:'planner',details:e.details||''}));
  db.assessments.filter(a=>a.classId===currentClassId&&a.date&&a.date<=end).forEach(a=>items.push({id:a.id,date:a.date,title:a.title,type:'assessment',source:'assessment',details:'فرض / تقويم'}));
  db.homework.filter(h=>h.classId===currentClassId&&h.dueDate&&h.dueDate<=end).forEach(h=>items.push({id:h.id,date:h.dueDate,title:h.title,type:'homework',source:'homework',details:h.details||''}));
  return items.filter(x=>x.date>=addDays(t,-30)).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||''));
}
function dueClass(item){const d=dateDiff(item.date,today());return d<0?'overdue':d===0?'today':d<=Number(db.settings.reminderDays||4)?'soon':'normal'}
function dueLabel(item){const d=dateDiff(item.date,today());if(d<0)return 'متأخر '+Math.abs(d)+' يوم';if(d===0)return 'اليوم';if(d===1)return 'غدًا';return 'بعد '+d+' أيام'}
function curriculumItems(){return db.curriculum.filter(x=>x.classId===currentClassId).sort((a,b)=>(a.order||0)-(b.order||0))}
function curriculumPercent(){const xs=curriculumItems();if(!xs.length)return 0;return Math.round(xs.filter(x=>x.status==='done').length/xs.length*100)}
function curriculumDelayed(){const t=today();return curriculumItems().filter(x=>x.status!=='done'&&x.plannedDate&&x.plannedDate<t)}
function monthlyRange(month){const start=month+'-01',d=new Date(start+'T12:00:00');d.setMonth(d.getMonth()+1);const end=d.toISOString().slice(0,10);return {start,end}}
function inMonth(date,month){return !!date&&date.startsWith(month)}
function monthlyStats(month){
  const ss=students(),attendance=db.attendance.filter(a=>a.classId===currentClassId&&inMonth(a.date,month)),ass=db.assessments.filter(a=>a.classId===currentClassId&&inMonth(a.date,month)),lessons=db.lessonLogs.filter(l=>l.classId===currentClassId&&inMonth(l.date,month)),notes=db.notes.filter(n=>n.classId===currentClassId&&inMonth(n.date,month)),parts=db.participation.filter(p=>p.classId===currentClassId&&inMonth(p.date,month)),hw=db.homework.filter(h=>h.classId===currentClassId&&inMonth(h.dueDate,month));
  const abs=attendance.filter(a=>a.status==='A').length,late=attendance.filter(a=>a.status==='L').length,present=attendance.filter(a=>['P','L','E'].includes(a.status)).length,rate=attendance.length?present/attendance.length*100:null;
  const avgs=ss.map(s=>avgForStudent(s.id)).filter(v=>v!=null),avg=avgs.length?avgs.reduce((a,b)=>a+b,0)/avgs.length:null;
  const doneLessons=lessons.filter(l=>l.status==='done').length;
  const hwStatuses=db.homeworkStatus.filter(x=>hw.some(h=>h.id===x.homeworkId)),hwDone=hwStatuses.filter(x=>x.status==='done').length,hwRate=hwStatuses.length?hwDone/hwStatuses.length*100:null;
  return {students:ss.length,attendance:attendance.length,abs,late,rate,assessments:ass.length,average:avg,lessons:lessons.length,doneLessons,notes:notes.length,participation:parts.reduce((n,p)=>n+Number(p.value||0),0),homeworks:hw.length,hwRate};
}
function nextActionText(){
  const due=dueItems(7).filter(x=>dateDiff(x.date,today())>=0)[0];
  if(due)return `${dueLabel(due)}: ${due.title}`;
  const delayed=curriculumDelayed()[0];if(delayed)return `استدراك: ${delayed.title}`;
  return 'لا توجد استحقاقات قريبة';
}
function notifyDue(){
  if(!('Notification'in window)){toast('الإشعارات غير مدعومة في هذا المتصفح');return}
  const fire=async()=>{const xs=dueItems(Number(db.settings.reminderDays||4)).filter(x=>dateDiff(x.date,today())>=0);if(!xs.length){toast('لا توجد استحقاقات قريبة');return}const body=`${xs.length} استحقاق قريب. ${xs[0].title} — ${dueLabel(xs[0])}`;try{if('serviceWorker'in navigator){const reg=await navigator.serviceWorker.ready;await reg.showNotification('دفتر القسم الذكي',{body,icon:'icon-192.svg',badge:'icon-192.svg',tag:'daftr-due'});}else new Notification('دفتر القسم الذكي',{body,icon:'icon-192.svg'});}catch(e){console.error(e);toast('تعذر إظهار التنبيه')}}; 
  if(Notification.permission==='granted')fire();else Notification.requestPermission().then(p=>{if(p==='granted')fire();else toast('لم يتم السماح بالإشعارات')});
}

renderers.command=function(){
  const due=dueItems(7),alerts=allClassAlerts(),delayed=curriculumDelayed(),cp=curriculumPercent(),rate=classAttendanceRate(),ca=classAverageV2();
  return `${viewHead('مركز القيادة','كل ما يحتاج انتباهك في شاشة واحدة',db.classes.length?classSelector():'')}
  <div class="command-grid">
    <div class="today-card"><div class="today-date">${dateLabel(today())}</div><h2>صباح العمل المنظم</h2><p>${esc(nextActionText())}</p><div class="quick-actions"><button data-act="quick-attendance">الحضور الآن</button><button data-act="quick-journal">سجل الحصة</button><button data-act="quick-planner">أضف موعدًا</button><button data-act="notify-due">تنبيه الاستحقاقات</button></div></div>
    <div class="focus-card"><h3>مؤشر المتابعة</h3><div class="focus-num">${alerts.length+delayed.length}</div><div class="small">حالات تلاميذ + عناصر مقرر تحتاج متابعة</div><div style="margin-top:12px"><div class="kpi"><span>تقدم المقرر</span><strong>${cp}%</strong></div><div class="kpi"><span>الحضور</span><strong>${rate==null?'—':rate.toFixed(0)+'%'}</strong></div><div class="kpi"><span>معدل القسم</span><strong>${ca==null?'—':ca.toFixed(2)}</strong></div></div></div>
  </div>
  <div class="grid two">
    <div class="card"><div class="section-title"><h3>القادم خلال 7 أيام</h3><button class="soft" data-act="open-planner">المفكرة</button></div>${due.length?`<div class="due-stack">${due.slice(0,10).map(x=>`<div class="due-item ${dueClass(x)==='overdue'?'overdue':''}"><span class="due-dot ${dueClass(x)}"></span><div><div class="due-title">${esc(x.title)}</div><div class="due-meta">${dueLabel(x)} • ${x.date} ${x.time?'• '+x.time:''} • ${x.type==='assessment'?'فرض':x.type==='homework'?'واجب':x.type==='lesson'?'حصة':x.type==='meeting'?'اجتماع':'ملاحظة'}</div></div></div>`).join('')}</div>`:empty('لا توجد مواعيد قريبة.')}</div>
    <div class="card"><div class="section-title"><h3>تقدم المقرر</h3><button class="soft" data-act="open-curriculum">فتح المقرر</button></div><div class="progress-layout"><div class="curriculum-progress-ring" style="--p:${cp}%"><strong>${cp}%</strong></div><div><div class="kpi"><span>عناصر المقرر</span><strong>${curriculumItems().length}</strong></div><div class="kpi"><span>متأخرة عن الموعد</span><strong>${delayed.length}</strong></div><div class="kpi"><span>منجزة</span><strong>${curriculumItems().filter(x=>x.status==='done').length}</strong></div></div></div></div>
  </div>`;
};

renderers.planner=function(){
  const start=weekStart(plannerWeekOffset),days=Array.from({length:7},(_,i)=>addDays(start,i)),events=classPlannerEvents();
  const range=`${dateLabel(days[0])} — ${dateLabel(days[6])}`;
  return `${viewHead('المفكرة الأسبوعية','برمجة الحصص والفروض والواجبات والاجتماعات','<button class="primary" data-act="add-planner-event">+ موعد</button>')}
  <div class="card"><div class="week-toolbar"><div class="week-nav"><button class="ghost" data-act="week-prev">← الأسبوع السابق</button><button class="ghost" data-act="week-today">هذا الأسبوع</button><button class="ghost" data-act="week-next">الأسبوع التالي →</button></div><strong>${range}</strong></div>
  <div class="week-grid">${days.map(d=>`<div class="day-col ${d===today()?'today':''}"><div class="day-head"><div><div class="day-name">${dayShort(d)}</div><div class="day-date">${d.slice(5)}</div></div><button class="icon-btn" data-act="add-day-event" data-date="${d}">+</button></div>${events.filter(e=>e.date===d).sort((a,b)=>(a.time||'').localeCompare(b.time||'')).map(e=>`<div class="event-chip ${e.type||'note'}" data-act="edit-planner-event" data-id="${e.id}"><div class="event-time">${e.time||'بدون توقيت'}</div><div class="event-title">${esc(e.title)}</div><div class="due-meta">${e.type==='assessment'?'فرض':e.type==='homework'?'واجب':e.type==='lesson'?'حصة':e.type==='meeting'?'اجتماع':'ملاحظة'}</div></div>`).join('')}</div>`).join('')}</div></div>`;
};

renderers.curriculum=function(){
  const xs=curriculumItems(),p=curriculumPercent(),delayed=curriculumDelayed();
  return `${viewHead('تقدم المقرر','خطط للدروس وتابع الإنجاز والاستدراك',db.classes.length?`${classSelector()} <button class="primary" data-act="add-curriculum">+ عنصر مقرر</button>`:'')}
  <div class="card"><div class="progress-layout"><div class="curriculum-progress-ring" style="--p:${p}%"><strong>${p}%</strong></div><div><h3 style="margin-top:0">حالة المقرر</h3><div class="kpi"><span>الإجمالي</span><strong>${xs.length}</strong></div><div class="kpi"><span>منجز</span><strong>${xs.filter(x=>x.status==='done').length}</strong></div><div class="kpi"><span>يحتاج استدراكًا</span><strong>${delayed.length}</strong></div></div></div></div>
  <div class="card" style="margin-top:14px">${xs.length?`<div class="curriculum-list">${xs.map((x,i)=>`<div class="curriculum-item ${x.status}"><div class="curriculum-order">${x.order||i+1}</div><div><strong>${esc(x.title)}</strong><div class="small">${esc(x.unit||'')} ${x.plannedDate?'• مخطط '+x.plannedDate:''} ${x.completedDate?'• أنجز '+x.completedDate:''}</div></div><div class="row-actions"><select class="status-select curriculum-status" data-id="${x.id}"><option value="planned" ${x.status==='planned'?'selected':''}>مبرمج</option><option value="inprogress" ${x.status==='inprogress'?'selected':''}>قيد الإنجاز</option><option value="done" ${x.status==='done'?'selected':''}>منجز</option></select><button class="ghost" data-act="edit-curriculum" data-id="${x.id}">تعديل</button><button class="danger" data-act="delete-curriculum" data-id="${x.id}">حذف</button></div></div>`).join('')}</div>`:empty('أضف وحدات أو دروس المقرر بالترتيب لتظهر نسبة الإنجاز.')}</div>`;
};

renderers.monthly=function(){
  const st=monthlyStats(monthlyReportMonth);
  const monthName=new Date(monthlyReportMonth+'-01T12:00:00').toLocaleDateString('ar-MA',{month:'long',year:'numeric'});
  return `${viewHead('التقرير الشهري','ملخص آلي للقسم قابل للطباعة والحفظ PDF',`<button class="primary" data-act="print-monthly">طباعة / PDF</button>`)}
  <div class="card"><div class="month-pick">${db.classes.length?classSelector():''}<label>الشهر <input id="monthlyMonth" type="month" value="${monthlyReportMonth}"></label></div></div>
  <div id="monthlyReportBody">
    <div class="monthly-hero"><h2>${esc(cls()?.name||'القسم')} — ${monthName}</h2><div>${esc(cls()?.school||'')} • ${esc(db.settings.teacher||'')}</div></div>
    <div class="monthly-metrics"><div class="monthly-metric"><small>التلاميذ</small><b>${st.students}</b></div><div class="monthly-metric"><small>نسبة الحضور</small><b>${st.rate==null?'—':st.rate.toFixed(0)+'%'}</b></div><div class="monthly-metric"><small>الغيابات</small><b>${st.abs}</b></div><div class="monthly-metric"><small>التأخر</small><b>${st.late}</b></div><div class="monthly-metric"><small>معدل القسم</small><b>${st.average==null?'—':st.average.toFixed(2)}</b></div></div>
    <div class="grid two"><div class="card"><h3>النشاط البيداغوجي</h3><div class="kpi"><span>الحصص المسجلة</span><strong>${st.lessons}</strong></div><div class="kpi"><span>الحصص المنجزة</span><strong>${st.doneLessons}</strong></div><div class="kpi"><span>الفروض/التقويمات</span><strong>${st.assessments}</strong></div><div class="kpi"><span>الواجبات</span><strong>${st.homeworks}</strong></div><div class="kpi"><span>إنجاز الواجبات</span><strong>${st.hwRate==null?'—':st.hwRate.toFixed(0)+'%'}</strong></div></div><div class="card"><h3>المتابعة</h3><div class="kpi"><span>الملاحظات</span><strong>${st.notes}</strong></div><div class="kpi"><span>رصيد المشاركة</span><strong>${st.participation>0?'+':''}${st.participation}</strong></div><div class="kpi"><span>تقدم المقرر</span><strong>${curriculumPercent()}%</strong></div><div class="kpi"><span>عناصر متأخرة</span><strong>${curriculumDelayed().length}</strong></div><div class="kpi"><span>تنبيهات تلاميذ</span><strong>${allClassAlerts().length}</strong></div></div></div>
  </div>`;
};

renderers.health=function(){
  const classes=db.classes.length,studentsN=db.students.length,backup=db.settings.lastBackup||'',storageOk=typeof localStorage!=='undefined',notif=('Notification'in window)?Notification.permission:'غير مدعوم';
  const photoCount=Object.keys(db.studentPhotos||{}).length;
  return `${viewHead('سلامة البيانات','مؤشرات سريعة لحماية دفتر الأستاذ')}
  <div class="grid two"><div class="card"><h3>حالة البيانات</h3><div class="health-row"><span>التخزين المحلي</span><strong class="${storageOk?'health-ok':'health-bad'}">${storageOk?'يعمل':'مشكلة'}</strong></div><div class="health-row"><span>الأقسام</span><strong>${classes}</strong></div><div class="health-row"><span>التلاميذ</span><strong>${studentsN}</strong></div><div class="health-row"><span>صور التلاميذ</span><strong>${photoCount}</strong></div><div class="health-row"><span>آخر نسخة احتياطية</span><strong class="${backup?'health-ok':'health-warn'}">${backup||'لم تسجل بعد'}</strong></div></div><div class="card"><h3>التذكيرات</h3><div class="health-row"><span>الإشعارات</span><strong>${notif}</strong></div><div class="health-row"><span>التنبيه قبل الموعد</span><strong>${db.settings.reminderDays||4} أيام</strong></div><button class="ghost" data-act="notify-due" style="margin-top:10px">اختبار تنبيه الاستحقاقات</button><p class="small">التنبيهات تظهر عند فتح التطبيق أو عند طلبها. الهاتف لا يسمح لهذا التطبيق بجدولة تنبيه مستقل وهو مغلق دون خدمة Push خارجية.</p></div></div>`;
};

function plannerModal(existing=null,presetDate=''){
  const e=existing||{};
  modal(existing?'تعديل الموعد':'إضافة موعد',`<div class="form-grid"><div class="field"><label>التاريخ *</label><input id="mDate" type="date" value="${e.date||presetDate||today()}"></div><div class="field"><label>الوقت</label><input id="mTime" type="time" value="${e.time||''}"></div><div class="field full"><label>العنوان *</label><input id="mTitle" value="${esc(e.title||'')}"></div><div class="field"><label>النوع</label><select id="mType"><option value="lesson" ${e.type==='lesson'?'selected':''}>حصة</option><option value="assessment" ${e.type==='assessment'?'selected':''}>فرض / تقويم</option><option value="homework" ${e.type==='homework'?'selected':''}>واجب</option><option value="meeting" ${e.type==='meeting'?'selected':''}>اجتماع</option><option value="note" ${!e.type||e.type==='note'?'selected':''}>ملاحظة</option></select></div><div class="field"><label>القسم</label><select id="mClass"><option value="">عام</option>${db.classes.map(c=>`<option value="${c.id}" ${e.classId===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field full"><label>تفاصيل</label><textarea id="mDetails">${esc(e.details||'')}</textarea></div>${existing?'<div class="field full"><button type="button" class="danger" id="deletePlannerInside">حذف الموعد</button></div>':''}</div>`,()=>{
    const title=$('#mTitle').value.trim(),date=$('#mDate').value;if(!title||!date)return false;
    const obj={id:e.id||uid('evt'),date,time:$('#mTime').value,title,type:$('#mType').value,classId:$('#mClass').value,details:$('#mDetails').value.trim()};
    if(existing)Object.assign(existing,obj);else db.plannerEvents.push(obj);saveDB();render();return true
  });
  if(existing){setTimeout(()=>{const b=$('#deletePlannerInside');if(b)b.onclick=()=>{if(confirm('حذف هذا الموعد؟')){db.plannerEvents=db.plannerEvents.filter(x=>x.id!==existing.id);saveDB();$('#modal').close();render()}}},0)}
}
function curriculumModal(existing=null){
  const x=existing||{};
  modal(existing?'تعديل عنصر المقرر':'إضافة عنصر للمقرر',`<div class="form-grid"><div class="field"><label>الترتيب</label><input id="mOrder" type="number" min="1" value="${x.order||curriculumItems().length+1}"></div><div class="field"><label>الوحدة / المحور</label><input id="mUnit" value="${esc(x.unit||'')}"></div><div class="field full"><label>عنوان الدرس *</label><input id="mTitle" value="${esc(x.title||'')}"></div><div class="field"><label>التاريخ المخطط</label><input id="mPlanned" type="date" value="${x.plannedDate||''}"></div><div class="field"><label>الحالة</label><select id="mStatus"><option value="planned" ${x.status==='planned'?'selected':''}>مبرمج</option><option value="inprogress" ${x.status==='inprogress'?'selected':''}>قيد الإنجاز</option><option value="done" ${x.status==='done'?'selected':''}>منجز</option></select></div><div class="field full"><label>ملاحظات</label><textarea id="mDetails">${esc(x.details||'')}</textarea></div></div>`,()=>{
    const title=$('#mTitle').value.trim();if(!title)return false;const status=$('#mStatus').value;const obj={id:x.id||uid('cur'),classId:currentClassId,order:Number($('#mOrder').value)||1,unit:$('#mUnit').value.trim(),title,plannedDate:$('#mPlanned').value,status,details:$('#mDetails').value.trim(),completedDate:status==='done'?(x.completedDate||today()):''};if(existing)Object.assign(existing,obj);else db.curriculum.push(obj);saveDB();render()
  });
}
function printMonthlyReport(){
  const body=$('#monthlyReportBody');if(!body)return;const w=window.open('','_blank');if(!w){toast('اسمح بفتح النوافذ لطباعة التقرير');return}
  w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>التقرير الشهري</title><style>body{font-family:Arial,Tahoma,sans-serif;color:#172333;margin:24px;line-height:1.7}.monthly-hero{background:#123f73;color:#fff;padding:16px;border-radius:12px}.monthly-hero h2{margin:0}.monthly-metrics{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin:12px 0}.monthly-metric,.card{border:1px solid #dfe7ef;border-radius:10px;padding:10px}.monthly-metric small{display:block;color:#64748b}.monthly-metric b{font-size:19px}.grid.two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.kpi{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:7px 0}.print{position:fixed;left:15px;top:15px;padding:9px}@media print{.print{display:none}body{margin:10mm}}</style></head><body><button class="print" onclick="window.print()">طباعة / حفظ PDF</button>${body.outerHTML}<div style="margin-top:25px;text-align:left">الأستاذ: ${esc(db.settings.teacher||'الأستاذ أحمد بوعمود')}</div><script>setTimeout(()=>window.print(),500)<\/script></body></html>`);w.document.close()
}

const v22Action=action;
action=function(act,id){
  if(act==='quick-attendance'){currentView='attendance';render();return}
  if(act==='quick-journal'){currentView='journal';render();setTimeout(()=>action('add-lesson-log'),50);return}
  if(act==='quick-planner'||act==='add-planner-event'){plannerModal();return}
  if(act==='notify-due'){notifyDue();return}
  if(act==='open-planner'){currentView='planner';render();return}
  if(act==='open-curriculum'){currentView='curriculum';render();return}
  if(act==='week-prev'){plannerWeekOffset--;render();return}
  if(act==='week-next'){plannerWeekOffset++;render();return}
  if(act==='week-today'){plannerWeekOffset=0;render();return}
  if(act==='add-day-event'){plannerModal(null,plannerSelectedDate||today());return}
  if(act==='edit-planner-event'){const e=db.plannerEvents.find(x=>x.id===id);if(e)plannerModal(e);return}
  if(act==='add-curriculum'){curriculumModal();return}
  if(act==='edit-curriculum'){const x=db.curriculum.find(y=>y.id===id);if(x)curriculumModal(x);return}
  if(act==='delete-curriculum'){if(confirm('حذف هذا العنصر من المقرر؟')){db.curriculum=db.curriculum.filter(x=>x.id!==id);saveDB();render()}return}
  if(act==='print-monthly'){printMonthlyReport();return}
  if(act==='save-reminder-days'){db.settings.reminderDays=Math.max(1,Math.min(14,Number($('#reminderDaysSetting')?.value)||4));saveDB();toast('تم حفظ إعداد التذكير');render();return}
  return v22Action(act,id);
};

const v22Bind=bindDynamic;
bindDynamic=function(){
  v22Bind();
  $$('.curriculum-status').forEach(sel=>sel.onchange=()=>{const x=db.curriculum.find(y=>y.id===sel.dataset.id);if(x){x.status=sel.value;x.completedDate=sel.value==='done'?(x.completedDate||today()):'';saveDB();render()}});
  $('.day-head [data-act="add-day-event"]').forEach(btn=>btn.onclick=()=>{plannerSelectedDate=btn.dataset.date||today();plannerModal(null,plannerSelectedDate)});
  const mm=$('#monthlyMonth');if(mm)mm.onchange=()=>{monthlyReportMonth=mm.value||today().slice(0,7);render()};
};

const originalDownloadBackup=downloadBackup;
downloadBackup=function(){
  db.settings.lastBackup=new Date().toLocaleString('ar-MA');saveDB();originalDownloadBackup();
};
if($('#backupBtn'))$('#backupBtn').onclick=downloadBackup;

const v22Settings=renderers.settings;
renderers.settings=function(){
  const base=v22Settings();
  return base+`<div class="card" style="margin-top:14px"><h3>التذكير الذكي</h3><div class="form-grid"><div class="field"><label>نبهني قبل الموعد بـ</label><input id="reminderDaysSetting" type="number" min="1" max="14" value="${db.settings.reminderDays||4}"></div></div><button class="primary" data-act="save-reminder-days" style="margin-top:10px">حفظ إعداد التذكير</button><p class="small">يستخدم في مركز القيادة وتنبيهات الفروض والواجبات والمواعيد القريبة.</p></div>`;
};
const v22Dashboard=renderers.dashboard;
renderers.dashboard=function(){return renderers.command()};

render();
