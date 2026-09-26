/* Daftr Qismi Unified Bundle v14 */
const DB_KEY='daftr_qismi_v1';
const defaultDB={settings:{teacher:'',schoolYear:'2026-2027'},classes:[],students:[],attendance:[],assessments:[],grades:[],notes:[]};
let db=loadDB(); let currentView='dashboard'; let currentClassId=db.classes[0]?.id||''; let deferredPrompt=null;
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
function uid(p='x'){return p+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,7)}
function loadDB(){try{return {...structuredClone(defaultDB),...JSON.parse(localStorage.getItem(DB_KEY)||'{}')}}catch(e){return structuredClone(defaultDB)}}
function saveDB(){localStorage.setItem(DB_KEY,JSON.stringify(db));}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800)}
function cls(){return db.classes.find(c=>c.id===currentClassId)||db.classes[0]}
function students(cid=currentClassId){return db.students.filter(s=>s.classId===cid).sort((a,b)=>(a.number||999)-(b.number||999)||a.name.localeCompare(b.name,'ar'))}
function classSelector(){return `<select id="classFilter">${db.classes.map(c=>`<option value="${c.id}" ${c.id===currentClassId?'selected':''}>${esc(c.name)}${c.level?' — '+esc(c.level):''}</option>`).join('')}</select>`}
function viewHead(title,desc='',actions=''){return `<div class="view-head"><div><h2>${title}</h2><p>${desc}</p></div><div class="actions">${actions}</div></div>`}
function empty(msg,action=''){return `<div class="empty">${msg}${action?`<div style="margin-top:12px">${action}</div>`:''}</div>`}
function today(){return new Date().toISOString().slice(0,10)}
function avgForStudent(sid,cid=currentClassId){const ass=db.assessments.filter(a=>a.classId===cid);let sum=0,w=0;ass.forEach(a=>{const g=db.grades.find(x=>x.assessmentId===a.id&&x.studentId===sid);if(g&&g.score!==''&&g.score!=null){const n=(Number(g.score)/Number(a.max||20))*20,coef=Number(a.coef||1);sum+=n*coef;w+=coef}});return w?sum/w:null}
function attStatus(sid,date,cid=currentClassId){return db.attendance.find(a=>a.studentId===sid&&a.classId===cid&&a.date===date)?.status||'P'}
function setAttendance(sid,date,status){const i=db.attendance.findIndex(a=>a.studentId===sid&&a.classId===currentClassId&&a.date===date);if(i>=0)db.attendance[i].status=status;else db.attendance.push({id:uid('att'),studentId:sid,classId:currentClassId,date,status});saveDB()}
function noteCount(sid,type){return db.notes.filter(n=>n.studentId===sid&&(!type||n.type===type)).length}

const renderers={
 dashboard(){const ss=students();const date=today();const abs=ss.filter(s=>attStatus(s.id,date)==='A').length;const late=ss.filter(s=>attStatus(s.id,date)==='L').length;const avgs=ss.map(s=>avgForStudent(s.id)).filter(x=>x!=null);const classAvg=avgs.length?avgs.reduce((a,b)=>a+b,0)/avgs.length:null;return `<div class="hero"><div><h2>مرحبًا بك في دفتر القسم الذكي</h2><p>كل ما تحتاجه لضبط القسم في شاشة واحدة، مع حفظ محلي للبيانات.</p></div><div class="hero-tag">السنة الدراسية ${esc(db.settings.schoolYear||'')}</div></div>${viewHead('لوحة القيادة','نظرة سريعة على القسم الحالي',db.classes.length?classSelector():'')}<div class="grid stats"><div class="stat"><div class="label">الأقسام</div><div class="num">${db.classes.length}</div><div class="sub">كل الأقسام المسجلة</div></div><div class="stat"><div class="label">تلاميذ القسم</div><div class="num">${ss.length}</div><div class="sub">${cls()?esc(cls().name):'لا يوجد قسم'}</div></div><div class="stat"><div class="label">غياب / تأخر اليوم</div><div class="num">${abs} / ${late}</div><div class="sub">بتاريخ ${date}</div></div><div class="stat"><div class="label">معدل القسم</div><div class="num">${classAvg==null?'—':classAvg.toFixed(2)}</div><div class="sub">محسوب على /20</div></div></div><div class="grid two"><div class="card"><h3>وضعية التلاميذ</h3>${ss.length?`<div class="table-wrap"><table><thead><tr><th>#</th><th>التلميذ(ة)</th><th>المعدل</th><th>الغياب</th><th>ملاحظات</th></tr></thead><tbody>${ss.slice(0,12).map(s=>{const a=db.attendance.filter(x=>x.studentId===s.id&&x.status==='A').length;const av=avgForStudent(s.id);return `<tr><td>${s.number||'—'}</td><td>${esc(s.name)}</td><td>${av==null?'—':av.toFixed(2)}</td><td>${a}</td><td>${noteCount(s.id)}</td></tr>`}).join('')}</tbody></table></div>`:empty('أضف قسمًا وتلاميذ لتظهر المؤشرات هنا.')}</div><div class="card"><h3>تنبيهات مفيدة</h3><div class="mini-list"><div class="mini-row"><span>تلاميذ دون أي نقطة</span><strong>${ss.filter(s=>avgForStudent(s.id)==null).length}</strong></div><div class="mini-row"><span>3 غيابات أو أكثر</span><strong>${ss.filter(s=>db.attendance.filter(a=>a.studentId===s.id&&a.status==='A').length>=3).length}</strong></div><div class="mini-row"><span>ملاحظات سلبية</span><strong>${db.notes.filter(n=>n.classId===currentClassId&&n.type==='negative').length}</strong></div></div></div></div>`},
 classes(){return `${viewHead('الأقسام','أنشئ أقسامك ومؤسساتك الدراسية','<button class="primary" data-act="add-class">+ قسم جديد</button>')}<div class="grid two"><div class="card"><h3>الأقسام المسجلة</h3>${db.classes.length?`<div class="mini-list">${db.classes.map(c=>`<div class="mini-row"><div><strong>${esc(c.name)}</strong><div class="small">${esc(c.level||'')} ${c.subject?'• '+esc(c.subject):''} ${c.school?'• '+esc(c.school):''}</div></div><div class="row-actions"><button class="ghost" data-act="select-class" data-id="${c.id}">${c.id===currentClassId?'الحالي':'فتح'}</button><button class="danger" data-act="delete-class" data-id="${c.id}">حذف</button></div></div>`).join('')}</div>`:empty('لا توجد أقسام بعد.')} </div><div class="card"><h3>اقتراح تنظيم</h3><p class="small">سمِّ القسم بطريقة ثابتة مثل: <b>3AC-1</b> أو <b>1BAC-ECO</b>، وحدد المؤسسة والمادة. بهذه الطريقة تبقى التقارير والنسخ الاحتياطية واضحة.</p></div></div>`},
 students(){const ss=students();return `${viewHead('التلاميذ','لائحة القسم، الإضافة الفردية والجماعية',db.classes.length?`${classSelector()} <button class="ghost" data-act="bulk-students">لصق لائحة</button><button class="primary" data-act="add-student">+ تلميذ</button>`:'<button class="primary" data-act="add-class">+ أنشئ قسمًا أولًا</button>')}<div class="card"><div class="toolbar"><input class="grow" id="studentSearch" placeholder="ابحث بالاسم..." /></div>${ss.length?`<div class="table-wrap"><table><thead><tr><th>الرقم</th><th>الاسم الكامل</th><th>المعدل</th><th>الغيابات</th><th>التأخرات</th><th>إجراءات</th></tr></thead><tbody id="studentRows">${ss.map(s=>studentRow(s)).join('')}</tbody></table></div>`:empty('لم تُضف أي تلميذ في هذا القسم.')}</div>`},
 attendance(){const ss=students();const date=today();return `${viewHead('الحضور والغياب','تسجيل سريع: حاضر، غائب، متأخر، غياب مبرر',db.classes.length?classSelector():'')}<div class="card"><div class="toolbar"><label>التاريخ <input type="date" id="attDate" value="${date}"></label><button class="ghost" data-act="all-present">اعتبار الجميع حاضرًا</button></div><div id="attGrid">${attendanceGrid(date,ss)}</div></div>`},
 grades(){const ss=students(),ass=db.assessments.filter(a=>a.classId===currentClassId).sort((a,b)=>a.date.localeCompare(b.date));return `${viewHead('النقط والفروض','فروض بمعاملات مختلفة، مع حساب تلقائي للمعدل على /20',db.classes.length?`${classSelector()} <button class="primary" data-act="add-assessment">+ فرض/نشاط</button>`:'')}<div class="card">${ass.length&&ss.length?`<div class="table-wrap"><table><thead><tr><th>التلميذ(ة)</th>${ass.map(a=>`<th>${esc(a.title)}<div class="small">/${a.max} • ×${a.coef}</div></th>`).join('')}<th>المعدل /20</th></tr></thead><tbody>${ss.map(s=>`<tr><td><strong>${esc(s.name)}</strong></td>${ass.map(a=>{const g=db.grades.find(x=>x.assessmentId===a.id&&x.studentId===s.id);return `<td><input class="grade-input" data-ass="${a.id}" data-sid="${s.id}" type="number" min="0" max="${a.max}" step="0.25" value="${g?.score??''}" style="width:78px"></td>`}).join('')}<td><strong>${avgForStudent(s.id)?.toFixed(2)??'—'}</strong></td></tr>`).join('')}</tbody></table></div><div style="margin-top:12px" class="chips">${ass.map(a=>`<button class="chip" data-act="delete-assessment" data-id="${a.id}">حذف ${esc(a.title)}</button>`).join('')}</div>`:empty(!ss.length?'أضف تلاميذ أولًا.':'أنشئ فرضًا أو نشاطًا للبدء في إدخال النقط.')}</div>`},
 notes(){const ss=students();const notes=db.notes.filter(n=>n.classId===currentClassId).sort((a,b)=>b.date.localeCompare(a.date));return `${viewHead('الملاحظات والسلوك','سجل تربوي مختصر: مشاركة، واجب، سلوك، متابعة',db.classes.length?`${classSelector()} <button class="primary" data-act="add-note">+ ملاحظة</button>`:'')}<div class="grid two"><div class="card"><h3>آخر الملاحظات</h3>${notes.length?notes.slice(0,30).map(n=>{const s=db.students.find(x=>x.id===n.studentId);return `<div class="note-item ${n.type}"><div><strong>${esc(s?.name||'')}</strong> <span class="badge ${n.type==='positive'?'ok':n.type==='negative'?'danger':''}">${n.type==='positive'?'إيجابية':n.type==='negative'?'تحتاج متابعة':'عادية'}</span></div><div style="margin-top:5px">${esc(n.text)}</div><div class="small">${n.date}</div></div>`}).join(''):empty('لا توجد ملاحظات بعد.')}</div><div class="card"><h3>مؤشرات المتابعة</h3>${ss.length?ss.map(s=>`<div class="kpi"><span>${esc(s.name)}</span><span><b>${noteCount(s.id,'positive')}</b> + / <b>${noteCount(s.id,'negative')}</b> −</span></div>`).join(''):empty('لا يوجد تلاميذ.')}</div></div>`},
 classroom(){const ss=students();return `${viewHead('أدوات القسم','اختيار عشوائي سريع ومساعدة في تنشيط المشاركة',db.classes.length?classSelector():'')}<div class="grid two"><div class="card picker"><div><div class="small">اختيار عشوائي من التل٧ميذ الحاضرين اليوم</div><div class="picker-name" id="pickerName">—</div><button class="primary" data-act="pick-student" ${ss.length?'':'disabled'}>اختر تلميذًا</button></div></div><div class="card"><h3>ملخص الحضور اليوم</h3>${ss.length?`<div class="mini-list">${['P','A','L','E'].map(st=>{const labels={P:'حاضر',A:'غائب',L:'متأخر',E:'مبرر'};const count=ss.filter(s=>attStatus(s.id,today())===st).length;return `<div class="mini-row"><span>${labels[st]}</span><strong>${count}</strong></div>`}).join('')}</div>`:empty('لا يوجد تلاميذ.')}</div></div>`},
 reports(){const ss=students();return `${viewHead('التقارير','ملخص قابل للطباعة والتصدير','<button class="ghost" data-act="export-csv">تصدير CSV</button><button class="primary" onclick="window.print()">طباعة</button>')}<div class="report-box"><h2 style="margin-top:0">تقرير القسم: ${esc(cls()?.name||'—')}</h2><div class="small">${esc(cls()?.school||'')} • ${esc(cls()?.level||'')} • ${new Date().toLocaleDateString('ar-MA')}</div>${ss.length?`<div class="table-wrap" style="margin-top:14px"><table><thead><tr><th>#</th><th>التلميذ(ة)</th><th>المعدل /20</th><th>الغياب</th><th>التأخر</th><th>ملاحظات +</th><th>ملاحظات −</th></tr></thead><tbody>${ss.map(s=>`<tr><td>${s.number||''}</td><td>${esc(s.name)}</td><td>${avgForStudent(s.id)?.toFixed(2)??'—'}</td><td>${db.attendance.filter(a=>a.studentId===s.id&&a.status==='A').length}</td><td>${db.attendance.filter(a=>a.studentId===s.id&&a.status==='L').length}</td><td>${noteCount(s.id,'positive')}</td><td>${noteCount(s.id,'negative')}</td></tr>`).join('')}</tbody></table></div>`:empty('لا توجد بيانات للتقرير.')}</div>`},
 settings(){return `${viewHead('الإعدادات','البيانات الأساسية والنسخ الاحتياطي')}<div class="grid two"><div class="card"><h3>بيانات الأستاذ</h3><div class="form-grid"><div class="field"><label>اسم الأستاذ</label><input id="teacherName" value="${esc(db.settings.teacher||'')}"></div><div class="field"><label>السنة الدراسية</label><input id="schoolYear" value="${esc(db.settings.schoolYear||'')}"></div></div><button class="primary" style="margin-top:12px" data-act="save-settings">حفظ</button></div><div class="card"><h3>البيانات</h3><p class="small">يمكنك تنزيل نسخة JSON كاملة واستعادتها على جهاز آخر. احفظها في مكان آمن لأنها قد تتضمن أسماء ونقط التلاميذ.</p><div class="actions"><button class="ghost" data-act="download-backup">تنزيل نسخة</button><button class="ghost" data-act="restore-backup">استعادة نسخة</button><button class="danger" data-act="reset-db">مسح جميع البيانات</button></div></div></div>`}
};
function studentRow(s){const av=avgForStudent(s.id);return `<tr data-name="${esc(s.name.toLowerCase())}"><td>${s.number||'—'}</td><td><strong>${esc(s.name)}</strong></td><td>${av==null?'—':av.toFixed(2)}</td><td>${db.attendance.filter(a=>a.studentId===s.id&&a.status==='A').length}</td><td>${db.attendance.filter(a=>a.studentId===s.id&&a.status==='L').length}</td><td><div class="row-actions"><button class="ghost" data-act="edit-student" data-id="${s.id}">تعديل</button><button class="danger" data-act="delete-student" data-id="${s.id}">حذف</button></div></td></tr>`}
function attendanceGrid(date,ss){return ss.length?`<div class="attendance-grid">${ss.map(s=>{const st=attStatus(s.id,date);return `<div class="student-att"><strong>${s.number?`${s.number}. `:''}${esc(s.name)}</strong><div class="att-actions">${[['P','حاضر'],['A','غائب'],['L','متأخر'],['E','مبرر']].map(([k,l])=>`<button class="att-btn ${st===k?'active':''}" data-status="${k}" data-sid="${s.id}">${l}</button>`).join('')}</div></div>`}).join('')}</div>`:empty('أضف تلاميذ أولًا.')}
function render(){if(!currentClassId&&db.classes[0])currentClassId=db.classes[0].id;$('#view').innerHTML=renderers[currentView]();$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===currentView));$('#mobileTitle').textContent=$$('.nav-item').find(b=>b.dataset.view===currentView)?.innerText.trim()||'دفتر القسم';bindDynamic()}
function bindDynamic(){const cf=$('#classFilter');if(cf)cf.onchange=e=>{currentClassId=e.target.value;render()};const search=$('#studentSearch');if(search)search.oninput=e=>{$$('#studentRows tr').forEach(r=>r.hidden=!r.dataset.name.includes(e.target.value.trim().toLowerCase()))};const d=$('#attDate');if(d)d.onchange=e=>{$('#attGrid').innerHTML=attendanceGrid(e.target.value,students());bindDynamic()};$$('.att-btn').forEach(b=>b.onclick=()=>{const date=$('#attDate')?.value||today();setAttendance(b.dataset.sid,date,b.dataset.status);$('#attGrid').innerHTML=attendanceGrid(date,students());bindDynamic();toast('تم تحديث الحضور')});$$('.grade-input').forEach(inp=>inp.onchange=()=>{const max=Number(db.assessments.find(a=>a.id===inp.dataset.ass)?.max||20);let val=inp.value===''?'':Math.max(0,Math.min(max,Number(inp.value)));const i=db.grades.findIndex(g=>g.assessmentId===inp.dataset.ass&&g.studentId===inp.dataset.sid);if(i>=0)db.grades[i].score=val;else db.grades.push({id:uid('g'),assessmentId:inp.dataset.ass,studentId:inp.dataset.sid,score:val});saveDB();render()});$$('[data-act]').forEach(b=>b.onclick=()=>action(b.dataset.act,b.dataset.id));}
function modal(title,html,onSave){$('#modalTitle').textContent=title;$('#modalBody').innerHTML=html;const m=$('#modal');const save=$('#modalSave');const fn=e=>{e.preventDefault();if(onSave()!==false)m.close()};$('#modalForm').onsubmit=fn;save.onclick=fn;m.showModal()}
function action(act,id){
 if(act==='add-class')modal('قسم جديد',`<div class="form-grid"><div class="field"><label>اسم القسم *</label><input id="mName" placeholder="مثال: 3AC-1" required></div><div class="field"><label>المستوى</label><input id="mLevel" placeholder="الثالثة إعدادي"></div><div class="field"><label>المادة</label><input id="mSubject" value="الاجتماعيات"></div><div class="field"><label>المؤسسة</label><input id="mSchool"></div></div>`,()=>{const name=$('#mName').value.trim();if(!name)return false;const c={id:uid('c'),name,level:$('#mLevel').value.trim(),subject:$('#mSubject').value.trim(),school:$('#mSchool').value.trim()};db.classes.push(c);currentClassId=c.id;saveDB();render();toast('تم إنشاء القسم')});
 if(act==='select-class'){currentClassId=id;currentView='dashboard';render()}
 if(act==='delete-class'){if(confirm('سيتم حذف القسم وكل بيانات تلاميذه ونقطهم وغياباتهم. متابعة؟')){const ids=db.students.filter(s=>s.classId===id).map(s=>s.id);const aids=db.assessments.filter(a=>a.classId===id).map(a=>a.id);db.classes=db.classes.filter(c=>c.id!==id);db.students=db.students.filter(s=>s.classId!==id);db.attendance=db.attendance.filter(a=>a.classId!==id);db.assessments=db.assessments.filter(a=>a.classId!==id);db.grades=db.grades.filter(g=>!ids.includes(g.studentId)&&!aids.includes(g.assessmentId));db.notes=db.notes.filter(n=>n.classId!==id);currentClassId=db.classes[0]?.id||'';saveDB();render()}}
 if(act==='add-student')modal('إضافة تلميذ',`<div class="form-grid"><div class="field"><label>الرقم</label><input type="number" id="mNum"></div><div class="field"><label>الاسم الكامل *</label><input id="mName" required></div></div>`,()=>{const name=$('#mName').value.trim();if(!name)return false;db.students.push({id:uid('s'),classId:currentClassId,name,number:Number($('#mNum').value)||''});saveDB();render();toast('تمت إضافة التلميذ')});
 if(act==='edit-student'){const s=db.students.find(x=>x.id===id);modal('تعديل بيانات التلميذ',`<div class="form-grid"><div class="field"><label>الرقم</label><input type="number" id="mNum" value="${s.number||''}"></div><div class="field"><label>الاسم الكامل *</label><input id="mName" value="${esc(s.name)}"></div></div>`,()=>{s.name=$('#mName').value.trim();s.number=Number($('#mNum').value)||'';saveDB();render()})}
 if(act==='delete-student'){if(confirm('حذف التلميذ وكل سجلاته؟')){db.students=db.students.filter(s=>s.id!==id);db.attendance=db.attendance.filter(a=>a.studentId!==id);db.grades=db.grades.filter(g=>g.studentId!==id);db.notes=db.notes.filter(n=>n.studentId!==id);saveDB();render()}}
 if(act==='bulk-students')modal('لصق لائحة التلاميذ',`<div class="field"><label>الصق الأسماء: اسم واحد في كل سطر. ويمكن كتابة: 1; الاسم</label><textarea id="mBulk" placeholder="1; محمد أمين\n2; سلمى العلوي\n3; ياسين..."></textarea></div>`,()=>{const lines=$('#mBulk').value.split(/\n/).map(x=>x.trim()).filter(Boolean);lines.forEach((line,i)=>{let num='',name=line;if(line.includes(';')){const p=line.split(';');num=Number(p.shift().trim())||'';name=p.join(';').trim()}db.students.push({id:uid('s'),classId:currentClassId,name,number:num||students().length+i+1})});saveDB();render();toast(`تمت إضافة ${lines.length} تلميذًا`)})
 if(act==='all-present'){const date=$('#attDate').value;students().forEach(s=>setAttendance(s.id,date,'P'));$('#attGrid').innerHTML=attendanceGrid(date,students());bindDynamic();toast('تم تسجيل الجميع حاضرًا')}
 if(act==='add-assessment')modal('فرض أو نشاط جديد',`<div class="form-grid"><div class="field"><label>العنوان *</label><input id="mTitle" placeholder="الفرض 1"></div><div class="field"><label>التاريخ</label><input type="date" id="mDate" value="${today()}"></div><div class="field"><label>النقطة القصوى</label><input type="number" id="mMax" value="20" min="1"></div><div class="field"><label>المعامل</label><input type="number" id="mCoef" value="1" min="0.1" step="0.1"></div></div>`,()=>{const title=$('#mTitle').value.trim();if(!title)return false;db.assessments.push({id:uid('a'),classId:currentClassId,title,date:$('#mDate').value,max:Number($('#mMax').value)||20,coef:Number($('#mCoef').value)||1});saveDB();render();toast('تم إنشاء خانة التقويم')})
 if(act==='delete-assessment'){if(confirm('حذف هذا التقويم ونقطه؟')){db.assessments=db.assessments.filter(a=>a.id!==id);db.grades=db.grades.filter(g=>g.assessmentId!==id);saveDB();render()}}
 if(act==='add-note'){const ss=students();modal('ملاحظة جديدة',`<div class="form-grid"><div class="field full"><label>التلميذ(ة)</label><select id="mStudent">${ss.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>النوع</label><select id="mType"><option value="neutral">عادية</option><option value="positive">إيجابية / مشاركة</option><option value="negative">تحتاج متابعة</option></select></div><div class="field"><label>التاريخ</label><input type="date" id="mDate" value="${today()}"></div><div class="field full"><label>الملاحظة *</label><textarea id="mText" placeholder="مثال: لم ينجز الواجب / مشاركة ممتازة..."></textarea></div></div>`,()=>{const text=$('#mText').value.trim();if(!text)return false;db.notes.push({id:uid('n'),classId:currentClassId,studentId:$('#mStudent').value,type:$('#mType').value,date:$('#mDate').value,text});saveDB();render();toast('تم حفظ الملاحظة')})}
 if(act==='pick-student'){const date=today();let pool=students().filter(s=>attStatus(s.id,date)!=='A');if(!pool.length)pool=students();const s=pool[Math.floor(Math.random()*pool.length)];$('#pickerName').textContent=s?.name||'—'}
 if(act==='export-csv')exportCSV();
 if(act==='save-settings'){db.settings.teacher=$('#teacherName').value.trim();db.settings.schoolYear=$('#schoolYear').value.trim();saveDB();toast('تم حفظ الإعدادات')}
 if(act==='download-backup')downloadBackup();
 if(act==='restore-backup')$('#restoreInput').click();
 if(act==='reset-db'){if(confirm('هل تريد فعلاً مسح جميع البيانات؟ لا يمكن التراجع.')){db=structuredClone(defaultDB);currentClassId='';saveDB();render();toast('تم مسح البيانات')}}
}
function downloadBackup(){const blob=new Blob([JSON.stringify(db,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`daftr-qismi-backup-${today()}.json`;a.click();URL.revokeObjectURL(a.href)}
function exportCSV(){const rows=[['الرقم','الاسم','القسم','المعدل /20','الغياب','التأخر','ملاحظات إيجابية','ملاحظات متابعة']];students().forEach(s=>rows.push([s.number||'',s.name,cls()?.name||'',avgForStudent(s.id)?.toFixed(2)||'',db.attendance.filter(a=>a.studentId===s.id&&a.status==='A').length,db.attendance.filter(a=>a.studentId===s.id&&a.status==='L').length,noteCount(s.id,'positive'),noteCount(s.id,'negative')]));const csv='\uFEFF'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${cls()?.name||'class'}-${today()}.csv`;a.click();URL.revokeObjectURL(a.href)}
$$('.nav-item').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;render();$('#sidebar').classList.remove('open')});$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');$('#backupBtn').onclick=downloadBackup;$('#restoreInput').onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{db={...structuredClone(defaultDB),...JSON.parse(r.result)};currentClassId=db.classes[0]?.id||'';saveDB();render();toast('تمت استعادة النسخة')}catch{alert('ملف النسخة غير صالح')}};r.readAsText(f)};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('#installBtn').hidden=false});$('#installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('#installBtn').hidden=true}};
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
render();

/* v2 */
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

/* v2.1 */
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

/* v2.2 */
/* Daftr Qismi v2.2 extension */
db.lessonLogs ||= [];
db.skills ||= [];
db.skillSupport ||= [];
db.studentGroups ||= [];
db.groupMembers ||= [];
saveDB();

const v22style=document.createElement('style');
v22style.textContent=`
.lesson-card,.skill-card,.group-card{border:1px solid #e1e8ef;border-radius:13px;background:#fff;padding:13px;margin-bottom:9px}
.lesson-head,.skill-head,.group-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.lesson-status{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800}
.lesson-status.done{background:#e9f8f0;color:#16794d}.lesson-status.partial{background:#fff5df;color:#8a5600}.lesson-status.planned{background:#eef4fb;color:#245f9c}
.skill-progress{margin-top:9px}.skill-progress .bar{height:9px}.group-members{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.member-chip{background:#eef4fb;color:#164e83;border-radius:999px;padding:5px 9px;font-size:12px}
.import-box{border:2px dashed #bfd0e2;border-radius:15px;padding:20px;text-align:center;background:#fbfdff}.import-box input{margin-top:10px}
.import-preview{max-height:340px;overflow:auto;margin-top:12px}
.skill-level{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.skill-level button{border:1px solid #d7e1eb;background:#fff;border-radius:8px;padding:6px;cursor:pointer}.skill-level button.active{background:#123f73;color:#fff;border-color:#123f73}
@media(max-width:680px){.skill-level{grid-template-columns:1fr}.lesson-head,.skill-head,.group-head{flex-direction:column}}
`;
document.head.appendChild(v22style);

function classLessons(){return db.lessonLogs.filter(x=>x.classId===currentClassId).sort((a,b)=>(b.date||'').localeCompare(a.date||''))}
function classSkills(){return db.skills.filter(x=>x.classId===currentClassId).sort((a,b)=>a.name.localeCompare(b.name,'ar'))}
function classGroups(){return db.studentGroups.filter(x=>x.classId===currentClassId)}
function groupMemberIds(gid){return db.groupMembers.filter(x=>x.groupId===gid).map(x=>x.studentId)}
function skillRecord(skillId,studentId){return db.skillSupport.find(x=>x.skillId===skillId&&x.studentId===studentId)}
function setSkillLevel(skillId,studentId,level){
  const i=db.skillSupport.findIndex(x=>x.skillId===skillId&&x.studentId===studentId);
  if(i>=0)db.skillSupport[i].level=level;else db.skillSupport.push({id:uid('skst'),skillId,studentId,classId:currentClassId,level,date:today()});
  saveDB();
}
function lessonStatusLabel(s){return s==='done'?'منجز':s==='partial'?'منجز جزئيًا':'مبرمج'}
function skillLevelLabel(l){return l==='mastered'?'متحكم':l==='developing'?'قيد الاكتساب':l==='support'?'يحتاج دعم':'—'}
function skillRate(skillId){
  const ss=students(); if(!ss.length)return null;
  const mastered=ss.filter(s=>skillRecord(skillId,s.id)?.level==='mastered').length;
  return mastered/ss.length*100;
}
function escapeCsvCell(v){return '"'+String(v??'').replace(/"/g,'""')+'"'}
function parseDelimited(text){
  text=String(text||'').replace(/^\uFEFF/,'');
  const first=text.split(/\r?\n/).find(x=>x.trim())||'';
  const sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',';
  const rows=[];let row=[],cell='',q=false;
  for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
    if(c==='"'){if(q&&n==='"'){cell+='"';i++}else q=!q}
    else if(c===sep&&!q){row.push(cell.trim());cell=''}
    else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell.trim());cell='';if(row.some(x=>x!==''))rows.push(row);row=[]}
    else cell+=c;
  }
  row.push(cell.trim()); if(row.some(x=>x!==''))rows.push(row);
  return rows;
}
async function unzipEntry(buffer,entry){
  const dv=new DataView(buffer), off=entry.localOffset;
  if(dv.getUint32(off,true)!==0x04034b50)throw new Error('Bad local header');
  const nameLen=dv.getUint16(off+26,true),extraLen=dv.getUint16(off+28,true),start=off+30+nameLen+extraLen;
  const data=buffer.slice(start,start+entry.compSize);
  if(entry.method===0)return new Uint8Array(data);
  if(entry.method===8){
    const ds=new DecompressionStream('deflate-raw');
    const out=await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(out);
  }
  throw new Error('Unsupported compression');
}
function zipEntries(buffer){
  const dv=new DataView(buffer);let eocd=-1;
  for(let i=buffer.byteLength-22;i>=Math.max(0,buffer.byteLength-65557);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break}}
  if(eocd<0)throw new Error('ZIP directory not found');
  const cdSize=dv.getUint32(eocd+12,true),cdOffset=dv.getUint32(eocd+16,true),dec=new TextDecoder(),map={};let p=cdOffset,end=cdOffset+cdSize;
  while(p<end&&dv.getUint32(p,true)===0x02014b50){
    const method=dv.getUint16(p+10,true),compSize=dv.getUint32(p+20,true),nameLen=dv.getUint16(p+28,true),extraLen=dv.getUint16(p+30,true),commentLen=dv.getUint16(p+32,true),localOffset=dv.getUint32(p+42,true);
    const name=dec.decode(new Uint8Array(buffer,p+46,nameLen));map[name]={name,method,compSize,localOffset};p+=46+nameLen+extraLen+commentLen;
  }
  return map;
}
async function parseXlsx(file){
  const buffer=await file.arrayBuffer(),entries=zipEntries(buffer),dec=new TextDecoder();
  const xml=async name=>entries[name]?dec.decode(await unzipEntry(buffer,entries[name])):'';
  const sharedXml=await xml('xl/sharedStrings.xml');const shared=[];
  if(sharedXml){const doc=new DOMParser().parseFromString(sharedXml,'application/xml');doc.querySelectorAll('si').forEach(si=>shared.push([...si.querySelectorAll('t')].map(t=>t.textContent||'').join('')))}
  const workbook=await xml('xl/workbook.xml'),rels=await xml('xl/_rels/workbook.xml.rels');
  let sheetPath='xl/worksheets/sheet1.xml';
  if(workbook&&rels){const wd=new DOMParser().parseFromString(workbook,'application/xml'),rd=new DOMParser().parseFromString(rels,'application/xml'),first=wd.querySelector('sheet');const rid=first?.getAttribute('r:id')||first?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');const rel=[...rd.querySelectorAll('Relationship')].find(r=>r.getAttribute('Id')===rid);if(rel){let target=rel.getAttribute('Target')||'';sheetPath=target.startsWith('/')?target.slice(1):('xl/'+target.replace(/^\.\//,''));sheetPath=sheetPath.replace(/xl\/\.\.\//g,'')}}
  const sheetXml=await xml(sheetPath);if(!sheetXml)throw new Error('Worksheet not found');
  const doc=new DOMParser().parseFromString(sheetXml,'application/xml'),rows=[];
  doc.querySelectorAll('sheetData row').forEach(r=>{const vals=[];r.querySelectorAll('c').forEach(c=>{const ref=c.getAttribute('r')||'',col=(ref.match(/[A-Z]+/)||['A'])[0];let idx=0;for(const ch of col)idx=idx*26+(ch.charCodeAt(0)-64);idx--;const type=c.getAttribute('t')||'';let val='';if(type==='inlineStr')val=[...c.querySelectorAll('is t')].map(t=>t.textContent||'').join('');else{const v=c.querySelector('v')?.textContent||'';val=type==='s'?shared[Number(v)]??'':v}vals[idx]=val});while(vals.length&&vals[vals.length-1]===undefined)vals.pop();rows.push(vals.map(v=>v??''))});
  return rows;
}
function inferStudentRows(rows){
  if(!rows.length)return [];
  const header=rows[0].map(x=>String(x).trim().toLowerCase());
  const nameWords=['الاسم','الإسم','الاسم الكامل','nom','name','full name'];
  const numWords=['الرقم','رقم','n°','no','numero','numéro','number'];
  let nameIdx=header.findIndex(h=>nameWords.some(w=>h.includes(w))),numIdx=header.findIndex(h=>numWords.some(w=>h.includes(w)));
  let start=1;
  if(nameIdx<0){nameIdx=header.length>1?1:0;numIdx=header.length>1?0:-1;start=0}
  return rows.slice(start).map((r,i)=>({name:String(r[nameIdx]??'').trim(),number:numIdx>=0?(Number(String(r[numIdx]??'').replace(/\D/g,''))||''):(i+1)})).filter(x=>x.name);
}

renderers.journal=function(){
  const logs=classLessons();
  return `${viewHead('دفتر نصوص الحصص','سجل تاريخ الحصص ومحتواها ومدى إنجاز الدرس',db.classes.length?`${classSelector()} <button class="primary" data-act="add-lesson-log">+ تسجيل حصة</button>`:'')}
  <div class="card">${logs.length?logs.map(l=>`<div class="lesson-card"><div class="lesson-head"><div><strong>${esc(l.title)}</strong><div class="small">${l.date||''} • ${esc(l.duration||'')}</div></div><span class="lesson-status ${l.status}">${lessonStatusLabel(l.status)}</span></div>${l.objectives?`<div style="margin-top:7px"><b>الأهداف:</b> ${esc(l.objectives)}</div>`:''}${l.content?`<div class="small" style="margin-top:5px"><b>المحتوى المنجز:</b> ${esc(l.content)}</div>`:''}${l.homework?`<div class="small"><b>الواجب:</b> ${esc(l.homework)}</div>`:''}<div class="row-actions" style="margin-top:8px"><button class="ghost" data-act="edit-lesson-log" data-id="${l.id}">تعديل</button><button class="danger" data-act="delete-lesson-log" data-id="${l.id}">حذف</button></div></div>`).join(''):empty('لم يتم تسجيل حصص بعد.')}</div>`;
};
renderers.skills=function(){
  const sk=classSkills(),ss=students();
  return `${viewHead('تتبع المهارات والدعم','حدد مهارات التعلم وسجل مستوى كل تلميذ',db.classes.length?`${classSelector()} <button class="primary" data-act="add-skill">+ مهارة</button>`:'')}
  <div class="card">${sk.length?sk.map(k=>{const rate=skillRate(k.id);return `<div class="skill-card"><div class="skill-head"><div><strong>${esc(k.name)}</strong><div class="small">${esc(k.category||'')} ${k.details?'• '+esc(k.details):''}</div></div><div class="row-actions"><span class="badge">${rate==null?'—':rate.toFixed(0)+'% متحكم'}</span><button class="danger" data-act="delete-skill" data-id="${k.id}">حذف</button></div></div><div class="skill-progress"><div class="bar"><i style="width:${rate||0}%"></i></div></div>${ss.length?`<div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>التلميذ(ة)</th><th>المستوى</th></tr></thead><tbody>${ss.map(s=>{const lv=skillRecord(k.id,s.id)?.level||'';return `<tr><td><button class="profile-link" data-act="student-profile" data-id="${s.id}">${esc(s.name)}</button></td><td><div class="skill-level">${[['mastered','متحكم'],['developing','قيد الاكتساب'],['support','يحتاج دعم']].map(([v,l])=>`<button class="${lv===v?'active':''}" data-act="skill-level" data-skill="${k.id}" data-id="${s.id}" data-level="${v}">${l}</button>`).join('')}</div></td></tr>`}).join('')}</tbody></table></div>`:''}</div>`}).join(''):empty('أنشئ مهارة أولًا، مثل: قراءة الخريطة أو بناء خط زمني.')}</div>`;
};
renderers.groups=function(){
  const gs=classGroups(),ss=students();
  return `${viewHead('مجموعات التلاميذ','أنشئ مجموعات للعمل التعاوني أو الدعم أو المشاريع',db.classes.length?`${classSelector()} <button class="primary" data-act="add-group">+ مجموعة</button><button class="ghost" data-act="auto-groups">تقسيم تلقائي</button>`:'')}
  <div class="grid two">${gs.length?gs.map(g=>{const ids=groupMemberIds(g.id);return `<div class="group-card"><div class="group-head"><div><strong>${esc(g.name)}</strong><div class="small">${esc(g.purpose||'')}</div></div><div class="row-actions"><button class="soft" data-act="edit-group-members" data-id="${g.id}">الأعضاء</button><button class="danger" data-act="delete-group" data-id="${g.id}">حذف</button></div></div><div class="group-members">${ids.length?ids.map(id=>{const s=db.students.find(x=>x.id===id);return s?`<span class="member-chip">${esc(s.name)}</span>`:''}).join(''):'<span class="small">لا أعضاء بعد</span>'}</div></div>`}).join(''):empty('لا توجد مجموعات بعد.')}</div>`;
};
renderers.importStudents=function(){
  return `${viewHead('استيراد لائحة التلاميذ','استيراد مباشر من CSV أو Excel XLSX',db.classes.length?classSelector():'')}
  <div class="card"><div class="import-box"><h3>اختر ملف اللائحة</h3><p class="small">يدعم CSV و XLSX. يفضّل وجود عمود للاسم وعمود للرقم. في Excel تُقرأ الورقة الأولى.</p><input id="studentImportFile" type="file" accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></div><div id="importPreview" class="import-preview"></div></div>`;
};

const v21Action=action;
action=function(act,id){
  if(act==='add-lesson-log'||act==='edit-lesson-log'){
    const l=act==='edit-lesson-log'?db.lessonLogs.find(x=>x.id===id):null;
    modal(l?'تعديل الحصة':'تسجيل حصة',`<div class="form-grid"><div class="field"><label>التاريخ</label><input id="mDate" type="date" value="${l?.date||today()}"></div><div class="field"><label>المدة</label><input id="mDuration" value="${esc(l?.duration||'45 دقيقة')}"></div><div class="field full"><label>عنوان الدرس / الحصة *</label><input id="mTitle" value="${esc(l?.title||'')}"></div><div class="field full"><label>الأهداف</label><textarea id="mObjectives">${esc(l?.objectives||'')}</textarea></div><div class="field full"><label>المحتوى المنجز</label><textarea id="mContent">${esc(l?.content||'')}</textarea></div><div class="field"><label>حالة الإنجاز</label><select id="mStatus"><option value="planned" ${l?.status==='planned'?'selected':''}>مبرمج</option><option value="partial" ${l?.status==='partial'?'selected':''}>منجز جزئيًا</option><option value="done" ${l?.status==='done'?'selected':''}>منجز</option></select></div><div class="field"><label>واجب منزلي</label><input id="mHomework" value="${esc(l?.homework||'')}"></div></div>`,()=>{const title=$('#mTitle').value.trim();if(!title)return false;const obj={id:l?.id||uid('lesson'),classId:currentClassId,date:$('#mDate').value,duration:$('#mDuration').value.trim(),title,objectives:$('#mObjectives').value.trim(),content:$('#mContent').value.trim(),status:$('#mStatus').value,homework:$('#mHomework').value.trim()};if(l)Object.assign(l,obj);else db.lessonLogs.push(obj);saveDB();render()});return
  }
  if(act==='delete-lesson-log'){if(confirm('حذف سجل هذه الحصة؟')){db.lessonLogs=db.lessonLogs.filter(x=>x.id!==id);saveDB();render()}return}
  if(act==='add-skill'){
    modal('إضافة مهارة',`<div class="form-grid"><div class="field full"><label>اسم المهارة *</label><input id="mName" placeholder="مثال: قراءة خريطة تاريخية"></div><div class="field"><label>المجال</label><input id="mCategory" placeholder="تاريخ / جغرافيا / مواطنة"></div><div class="field full"><label>تفاصيل</label><textarea id="mDetails"></textarea></div></div>`,()=>{const name=$('#mName').value.trim();if(!name)return false;db.skills.push({id:uid('skill'),classId:currentClassId,name,category:$('#mCategory').value.trim(),details:$('#mDetails').value.trim()});saveDB();render()});return
  }
  if(act==='delete-skill'){if(confirm('حذف المهارة وكل سجلات تتبعها؟')){db.skills=db.skills.filter(x=>x.id!==id);db.skillSupport=db.skillSupport.filter(x=>x.skillId!==id);saveDB();render()}return}
  if(act==='skill-level'){const btn=event?.currentTarget;setSkillLevel(btn?.dataset.skill,id,btn?.dataset.level);render();return}
  if(act==='add-group'){
    modal('إنشاء مجموعة',`<div class="form-grid"><div class="field full"><label>اسم المجموعة *</label><input id="mName" placeholder="المجموعة 1"></div><div class="field full"><label>الغاية</label><input id="mPurpose" placeholder="عمل تعاوني / دعم / مشروع"></div></div>`,()=>{const name=$('#mName').value.trim();if(!name)return false;db.studentGroups.push({id:uid('grp'),classId:currentClassId,name,purpose:$('#mPurpose').value.trim()});saveDB();render()});return
  }
  if(act==='edit-group-members'){
    const g=db.studentGroups.find(x=>x.id===id),ids=new Set(groupMemberIds(id));
    modal('أعضاء '+(g?.name||'المجموعة'),`<div style="max-height:360px;overflow:auto">${students().map(s=>`<label style="display:flex;gap:8px;align-items:center;padding:7px 0;border-bottom:1px solid #eef2f6"><input type="checkbox" class="grp-check" value="${s.id}" ${ids.has(s.id)?'checked':''}> ${esc(s.name)}</label>`).join('')}</div>`,()=>{db.groupMembers=db.groupMembers.filter(x=>x.groupId!==id);$$('.grp-check:checked').forEach(c=>db.groupMembers.push({id:uid('gm'),groupId:id,studentId:c.value}));saveDB();render()});return
  }
  if(act==='delete-group'){db.studentGroups=db.studentGroups.filter(x=>x.id!==id);db.groupMembers=db.groupMembers.filter(x=>x.groupId!==id);saveDB();render();return}
  if(act==='auto-groups'){
    const ss=students().map(s=>s.id).sort(()=>Math.random()-.5);if(!ss.length)return;
    const n=Math.min(4,Math.max(2,Math.ceil(ss.length/6)));const existing=classGroups().map(g=>g.id);db.groupMembers=db.groupMembers.filter(x=>!existing.includes(x.groupId));db.studentGroups=db.studentGroups.filter(x=>x.classId!==currentClassId);
    const gs=Array.from({length:n},(_,i)=>({id:uid('grp'),classId:currentClassId,name:`المجموعة ${i+1}`,purpose:'تقسيم تلقائي'}));db.studentGroups.push(...gs);ss.forEach((sid,i)=>db.groupMembers.push({id:uid('gm'),groupId:gs[i%n].id,studentId:sid}));saveDB();render();toast('تم إنشاء المجموعات');return
  }
  return v21Action(act,id);
};

const v21Bind=bindDynamic;
bindDynamic=function(){
  v21Bind();
  const imp=$('#studentImportFile');
  if(imp)imp.onchange=async()=>{
    const file=imp.files?.[0];if(!file)return;const box=$('#importPreview');box.innerHTML='<div class="small">جارٍ قراءة الملف…</div>';
    try{
      let rows;if(file.name.toLowerCase().endsWith('.xlsx'))rows=await parseXlsx(file);else rows=parseDelimited(await file.text());
      const list=inferStudentRows(rows);
      if(!list.length){box.innerHTML='<div class="empty">لم أتعرف على أسماء التلاميذ في الملف.</div>';return}
      box.innerHTML=`<div class="card"><div class="section-title"><h3>معاينة الاستيراد</h3><span class="badge">${list.length} تلميذًا</span></div><div class="table-wrap"><table><thead><tr><th>الرقم</th><th>الاسم</th></tr></thead><tbody>${list.slice(0,100).map(s=>`<tr><td>${s.number||''}</td><td>${esc(s.name)}</td></tr>`).join('')}</tbody></table></div><button id="confirmImportStudents" class="primary" style="margin-top:12px">استيراد إلى القسم الحالي</button></div>`;
      $('#confirmImportStudents').onclick=()=>{let added=0;const existing=new Set(students().map(s=>s.name.trim().toLowerCase()));list.forEach(s=>{if(!existing.has(s.name.toLowerCase())){db.students.push({id:uid('s'),classId:currentClassId,name:s.name,number:s.number||students().length+added+1});existing.add(s.name.toLowerCase());added++}});saveDB();render();toast(`تم استيراد ${added} تلميذًا`);currentView='students';render()};
    }catch(e){console.error(e);box.innerHTML='<div class="empty">تعذر قراءة الملف. جرّب CSV أو ملف XLSX قياسيًا من Excel.</div>'}
  };
  $$('.skill-level button').forEach(btn=>btn.onclick=()=>{setSkillLevel(btn.dataset.skill,btn.dataset.id,btn.dataset.level);render()});
};

render();

/* v2.3 */
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
  $$('.day-head [data-act="add-day-event"]').forEach(btn=>btn.onclick=()=>{plannerSelectedDate=btn.dataset.date||today();plannerModal(null,plannerSelectedDate)});
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

/* v3.0 */
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



