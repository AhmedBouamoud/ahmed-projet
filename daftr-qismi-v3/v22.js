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
