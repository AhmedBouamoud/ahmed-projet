/* Daftr Qismi — Student Cards & Name Memory v24 */
(() => {
  if (typeof db === 'undefined' || typeof renderers === 'undefined') return;

  db.studentDetails ||= {};
  db.nameMemory ||= {};
  saveDB();

  let cardsMode = 'cards';
  let memoryCurrentId = '';
  let memoryRevealed = false;
  let memoryWeakOnly = false;
  let quizAnswered = false;

  const style = document.createElement('style');
  style.textContent = `
  .sc-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}.sc-toolbar .grow{flex:1;min-width:180px}
  .sc-search{width:100%;border:1px solid #d9e2ec;border-radius:11px;padding:10px 12px;background:#fff}
  .sc-tabs{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.sc-tab{border:1px solid #cfdbe7;background:#fff;color:#17324f;border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer}.sc-tab.active{background:#123f73;color:#fff;border-color:#123f73}
  .sc-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:10px 0 14px}.sc-summary .metric{margin:0}
  .sc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
  .sc-card{position:relative;display:grid;grid-template-columns:92px 1fr;min-height:150px;border:1px solid #dfe7ef;border-radius:16px;background:#fff;overflow:hidden;box-shadow:0 3px 14px rgba(15,23,42,.05)}
  .sc-photo{width:92px;height:150px;object-fit:cover;background:#e8edf3;display:block}.sc-avatar{width:92px;height:150px;background:linear-gradient(145deg,#dfeaf5,#eef4fb);display:grid;place-items:center;font-size:27px;font-weight:900;color:#164e83}
  .sc-main{padding:11px 11px 10px;min-width:0}.sc-name{font-weight:900;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sc-meta{font-size:11px;color:#64748b;margin-top:2px}.sc-kpis{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:8px}.sc-kpi{border:1px solid #e3e9ef;background:#f8fafc;border-radius:9px;padding:5px 4px;text-align:center;font-size:10px;color:#64748b}.sc-kpi b{display:block;color:#172333;font-size:12px;margin-top:1px}
  .sc-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.sc-actions button,.sc-photo-label{border:1px solid #d7e1eb;background:#fff;border-radius:8px;padding:6px 8px;font-size:10px;cursor:pointer;color:#17324f}.sc-actions .primary{background:#123f73;color:#fff;border-color:#123f73}.sc-photo-input{display:none}
  .sc-info{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:10px}.sc-info div{border:1px solid #e4e9ef;border-radius:9px;padding:7px;background:#fbfdff;font-size:11px}.sc-info span{display:block;color:#64748b;font-size:9px;margin-bottom:2px}.sc-info b{word-break:break-word}
  .memory-wrap{max-width:760px;margin:0 auto}.memory-card{border:1px solid #dbe5ee;border-radius:22px;background:#fff;padding:16px;text-align:center;box-shadow:0 8px 28px rgba(15,23,42,.07)}
  .memory-photo{width:min(280px,80vw);height:330px;object-fit:cover;border-radius:18px;background:#edf2f7;border:1px solid #d9e2ec}.memory-avatar{width:min(280px,80vw);height:330px;margin:auto;border-radius:18px;background:linear-gradient(145deg,#dce8f4,#f3f7fb);display:grid;place-items:center;font-size:70px;font-weight:900;color:#164e83}
  .memory-prompt{font-size:14px;color:#64748b;margin:10px 0 5px}.memory-name{font-size:25px;font-weight:900;color:#123f73;margin:5px 0 12px}.memory-hidden{filter:blur(11px);user-select:none}.memory-buttons{display:flex;justify-content:center;gap:8px;flex-wrap:wrap}.memory-buttons button{min-width:130px;padding:10px 12px;border-radius:11px;border:1px solid #d8e1ea;background:#fff;font-weight:850}.memory-buttons .yes{background:#eaf8f0;color:#16794d;border-color:#bee4cf}.memory-buttons .no{background:#fff0ef;color:#b42318;border-color:#f0c3bf}
  .memory-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:12px 0}.memory-progress div{border:1px solid #e2e8f0;background:#fff;border-radius:11px;padding:8px;text-align:center}.memory-progress b{display:block;font-size:18px;color:#123f73}.memory-progress span{font-size:10px;color:#64748b}
  .quiz-options{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.quiz-options button{padding:11px;border-radius:11px;border:1px solid #d8e1ea;background:#fff;font-weight:800}.quiz-options button.correct{background:#eaf8f0;color:#16794d;border-color:#9ed4b5}.quiz-options button.wrong{background:#fff0ef;color:#b42318;border-color:#efb3ad}
  .sc-empty-photo{padding:10px;border:1px dashed #cbd5e1;border-radius:11px;background:#f8fafc;color:#64748b;font-size:12px;margin-bottom:10px}
  @media(max-width:720px){.sc-summary,.memory-progress{grid-template-columns:repeat(2,1fr)}.sc-info{grid-template-columns:1fr}.quiz-options{grid-template-columns:1fr}.sc-card{grid-template-columns:82px 1fr}.sc-photo,.sc-avatar{width:82px;height:145px}}
  `;
  document.head.appendChild(style);

  function details(sid){
    return db.studentDetails[sid] ||= {massar:'',birth:'',guardian:'',phone:'',email:'',address:'',info:''};
  }
  function mem(sid){return db.nameMemory[sid] ||= {right:0,wrong:0,streak:0,last:''}}
  function initials(name=''){
    return name.trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase() || 'ت';
  }
  function mastered(sid){const r=mem(sid),total=r.right+r.wrong;return r.right>=3 && r.streak>=2 && (!total || r.right/total>=.7)}
  function imgFor(s){return (typeof photoFor==='function' && photoFor(s.id)) || ''}
  function absCount(sid){return typeof studentAbs==='function'?studentAbs(sid,'A'):db.attendance.filter(a=>a.studentId===sid&&a.status==='A').length}
  function lateCount(sid){return typeof studentAbs==='function'?studentAbs(sid,'L'):db.attendance.filter(a=>a.studentId===sid&&a.status==='L').length}
  function partScore(sid){return typeof participationScore==='function'?participationScore(sid):(db.participation||[]).filter(p=>p.studentId===sid).reduce((n,p)=>n+Number(p.value||0),0)}
  function missingHw(sid){return typeof studentMissingHomework==='function'?studentMissingHomework(sid):(db.homeworkStatus||[]).filter(x=>x.studentId===sid&&x.status==='missing').length}
  function studentNotes(sid){return db.notes.filter(n=>n.studentId===sid).length}
  function currentStudents(){return students(currentClassId)}
  function escapeAttr(v=''){return esc(v).replace(/`/g,'&#96;')}

  function renderCard(s){
    const d=details(s.id),photo=imgFor(s),av=avgForStudent(s.id),cl=db.classes.find(c=>c.id===s.classId);
    return `<article class="sc-card" data-sc-name="${escapeAttr((s.name||'').toLowerCase())}">
      <div>${photo?`<img class="sc-photo" src="${photo}" alt="${esc(s.name)}">`:`<div class="sc-avatar">${esc(initials(s.name))}</div>`}</div>
      <div class="sc-main">
        <div class="sc-name">${esc(s.name)}</div><div class="sc-meta">#${s.number||'—'} • ${esc(cl?.name||'')} ${cl?.school?'• '+esc(cl.school):''}</div>
        <div class="sc-kpis"><div class="sc-kpi">المعدل<b>${av==null?'—':av.toFixed(2)}</b></div><div class="sc-kpi">الغياب<b>${absCount(s.id)}</b></div><div class="sc-kpi">المشاركة<b>${partScore(s.id)>0?'+':''}${partScore(s.id)}</b></div></div>
        <div class="sc-actions"><button class="primary" data-act="student-profile" data-id="${s.id}">الملف</button><button data-act="sc-edit-details" data-id="${s.id}">كل المعلومات</button><label class="sc-photo-label">📷 صورة<input class="sc-photo-input sc-upload" type="file" accept="image/*" data-sid="${s.id}"></label><button data-act="sc-print-card" data-id="${s.id}">طباعة البطاقة</button></div>
      </div>
    </article>`;
  }

  function renderCardsView(){
    const ss=currentStudents(),withPhotos=ss.filter(s=>imgFor(s)).length,masteredN=ss.filter(s=>mastered(s.id)).length;
    return `${viewHead('بطاقات التلاميذ وحفظ الأسماء','صورة + معلومات التلميذ + تدريب بصري على ربط الوجه بالاسم',db.classes.length?classSelector():'')}
      <div class="sc-tabs"><button class="sc-tab ${cardsMode==='cards'?'active':''}" data-act="sc-mode" data-id="cards">🪪 البطاقات</button><button class="sc-tab ${cardsMode==='memory'?'active':''}" data-act="sc-mode" data-id="memory">🧠 تذكّر الاسم</button><button class="sc-tab ${cardsMode==='quiz'?'active':''}" data-act="sc-mode" data-id="quiz">🎯 اختبار 4 أسماء</button></div>
      <div class="sc-summary"><div class="metric"><small>تلاميذ القسم</small><b>${ss.length}</b></div><div class="metric"><small>بصور</small><b>${withPhotos}</b></div><div class="metric"><small>تم حفظ أسمائهم</small><b>${masteredN}</b></div><div class="metric"><small>تحتاج مراجعة</small><b>${Math.max(0,ss.length-masteredN)}</b></div></div>
      ${cardsMode==='cards'?renderCards(ss):cardsMode==='quiz'?renderMemory(true):renderMemory(false)}`;
  }

  function renderCards(ss){
    if(!db.classes.length) return empty('أنشئ قسمًا أولاً ثم أضف التلاميذ.');
    if(!ss.length) return empty('لا يوجد تلاميذ في هذا القسم.');
    return `<div class="sc-toolbar"><div class="grow"><input id="scSearch" class="sc-search" placeholder="ابحث بالاسم أو الرقم..."></div><button class="ghost" data-act="sc-random-profile">اختيار عشوائي</button></div><div class="sc-grid" id="scGrid">${ss.map(renderCard).join('')}</div>`;
  }

  function memoryPool(){
    let ss=currentStudents().filter(s=>imgFor(s));
    if(memoryWeakOnly) ss=ss.filter(s=>!mastered(s.id));
    return ss;
  }
  function ensureMemoryStudent(){
    const pool=memoryPool();
    if(!pool.length){memoryCurrentId='';return null}
    if(!pool.some(s=>s.id===memoryCurrentId)) memoryCurrentId=pool[Math.floor(Math.random()*pool.length)].id;
    return pool.find(s=>s.id===memoryCurrentId)||pool[0];
  }
  function pickNextMemory(exclude=''){
    const pool=memoryPool().filter(s=>s.id!==exclude);
    memoryCurrentId=(pool.length?pool:memoryPool())[Math.floor(Math.random()*Math.max(1,(pool.length?pool:memoryPool()).length))]?.id||'';
    memoryRevealed=false;quizAnswered=false;
  }
  function renderMemory(quiz=false){
    const all=currentStudents(),photos=all.filter(s=>imgFor(s));
    if(!all.length) return empty('أضف التلاميذ أولاً.');
    if(!photos.length) return `<div class="sc-empty-photo">للبدء في حفظ الأسماء، أضف صورة لكل تلميذ من بطاقته أو من «الملف الفردي».</div>${renderCards(all)}`;
    const s=ensureMemoryStudent(); if(!s) return empty('لا توجد صور مناسبة للوضع الحالي. ألغِ «الأسماء الصعبة فقط» أو أضف صورًا.');
    const photo=imgFor(s),r=mem(s.id),masteredN=all.filter(x=>mastered(x.id)).length,total=all.reduce((n,x)=>n+mem(x.id).right+mem(x.id).wrong,0),right=all.reduce((n,x)=>n+mem(x.id).right,0);
    const progress=`<div class="memory-progress"><div><b>${masteredN}/${all.length}</b><span>أسماء محفوظة</span></div><div><b>${right}</b><span>إجابات صحيحة</span></div><div><b>${Math.max(0,total-right)}</b><span>لم أتذكر</span></div><div><b>${r.streak||0}</b><span>سلسلة هذا الاسم</span></div></div>`;
    return `<div class="memory-wrap"><div class="sc-toolbar"><label><input id="scWeakOnly" type="checkbox" ${memoryWeakOnly?'checked':''}> الأسماء الصعبة فقط</label><button class="ghost" data-act="sc-reset-memory">إعادة ضبط تقدم الحفظ</button></div>${progress}<div class="memory-card"><img class="memory-photo" src="${photo}" alt="صورة تلميذ"><div class="memory-prompt">${quiz?'اختر الاسم الصحيح لهذه الصورة':'حاول تذكر الاسم قبل كشفه'}</div>${quiz?renderQuizOptions(s):`<div class="memory-name ${memoryRevealed?'':'memory-hidden'}">${esc(s.name)}</div><div class="memory-buttons">${!memoryRevealed?'<button class="primary" data-act="sc-reveal">كشف الاسم</button>':`<button class="yes" data-act="sc-memory-answer" data-id="1">✓ تذكرت الاسم</button><button class="no" data-act="sc-memory-answer" data-id="0">✕ لم أتذكره</button>`}<button class="ghost" data-act="sc-memory-next">اسم آخر</button></div>`}</div></div>`;
  }

  function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
  function renderQuizOptions(correct){
    const other=shuffle(currentStudents().filter(s=>s.id!==correct.id)).slice(0,3);
    const opts=shuffle([correct,...other]);
    return `<div class="quiz-options">${opts.map(s=>`<button data-act="sc-quiz-answer" data-id="${s.id}" ${quizAnswered?'disabled':''}>${esc(s.name)}</button>`).join('')}</div><div class="memory-buttons" style="margin-top:10px"><button class="ghost" data-act="sc-memory-next">سؤال آخر</button></div>`;
  }

  renderers.studentCards = renderCardsView;

  function detailsModal(sid){
    const s=db.students.find(x=>x.id===sid); if(!s)return;
    const d=details(sid),cl=db.classes.find(c=>c.id===s.classId),av=avgForStudent(s.id);
    modal('بطاقة التلميذ الكاملة',`<div class="profile-hero"><div>${imgFor(s)?`<img class="student-photo" src="${imgFor(s)}" alt="">`:`<div class="profile-avatar">${esc(initials(s.name))}</div>`}</div><div><h2>${esc(s.name)}</h2><p>${esc(cl?.name||'')} • الرقم ${s.number||'—'} • المعدل ${av==null?'—':av.toFixed(2)}/20</p></div></div>
      <div class="form-grid" style="margin-top:12px"><div class="field"><label>رمز مسار</label><input id="scMassar" value="${escapeAttr(d.massar)}"></div><div class="field"><label>تاريخ الميلاد</label><input id="scBirth" type="date" value="${escapeAttr(d.birth)}"></div><div class="field"><label>ولي الأمر</label><input id="scGuardian" value="${escapeAttr(d.guardian)}"></div><div class="field"><label>هاتف ولي الأمر</label><input id="scPhone" inputmode="tel" value="${escapeAttr(d.phone)}"></div><div class="field"><label>البريد الإلكتروني</label><input id="scEmail" type="email" value="${escapeAttr(d.email)}"></div><div class="field"><label>العنوان</label><input id="scAddress" value="${escapeAttr(d.address)}"></div><div class="field full"><label>معلومات تربوية إضافية</label><textarea id="scInfo">${esc(d.info)}</textarea></div></div>
      <div class="sc-info"><div><span>الغيابات</span><b>${absCount(s.id)}</b></div><div><span>التأخر</span><b>${lateCount(s.id)}</b></div><div><span>المشاركة</span><b>${partScore(s.id)}</b></div><div><span>واجبات ناقصة</span><b>${missingHw(s.id)}</b></div><div><span>الملاحظات</span><b>${studentNotes(s.id)}</b></div><div><span>حفظ الاسم</span><b>${mastered(s.id)?'محفوظ':'قيد المراجعة'}</b></div></div>`,()=>{
      Object.assign(d,{massar:$('#scMassar').value.trim(),birth:$('#scBirth').value,guardian:$('#scGuardian').value.trim(),phone:$('#scPhone').value.trim(),email:$('#scEmail').value.trim(),address:$('#scAddress').value.trim(),info:$('#scInfo').value.trim()});saveDB();render();toast('تم حفظ معلومات البطاقة');
    });
  }

  function printCard(sid){
    const s=db.students.find(x=>x.id===sid); if(!s)return; const d=details(sid),cl=db.classes.find(c=>c.id===s.classId),av=avgForStudent(s.id),photo=imgFor(s);
    const w=window.open('','_blank'); if(!w){toast('اسمح بفتح نافذة الطباعة');return}
    const info=[['القسم',cl?.name||''],['المؤسسة',cl?.school||''],['الرقم',s.number||'—'],['رمز مسار',d.massar||'—'],['تاريخ الميلاد',d.birth||'—'],['ولي الأمر',d.guardian||'—'],['هاتف ولي الأمر',d.phone||'—'],['البريد الإلكتروني',d.email||'—'],['العنوان',d.address||'—'],['المعدل /20',av==null?'—':av.toFixed(2)],['الغيابات',absCount(s.id)],['التأخر',lateCount(s.id)],['المشاركة',partScore(s.id)],['واجبات ناقصة',missingHw(s.id)],['عدد الملاحظات',studentNotes(s.id)]];
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>بطاقة ${esc(s.name)}</title><style>body{font-family:Tahoma,Arial,sans-serif;margin:24px;color:#172333}.sheet{max-width:760px;margin:auto;border:2px solid #123f73;border-radius:18px;padding:20px}.head{display:grid;grid-template-columns:150px 1fr;gap:18px;align-items:center;border-bottom:2px solid #d9e2ec;padding-bottom:14px}.photo{width:150px;height:185px;object-fit:cover;border-radius:14px;background:#edf2f7}.avatar{width:150px;height:185px;border-radius:14px;background:#edf2f7;display:grid;place-items:center;font-size:54px;font-weight:bold;color:#164e83}h1{margin:0;color:#123f73}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.item{border:1px solid #dfe7ef;border-radius:9px;padding:8px}.item span{display:block;font-size:11px;color:#64748b}.note{margin-top:12px;border:1px solid #dfe7ef;border-radius:9px;padding:10px;white-space:pre-wrap}.print{position:fixed;left:12px;top:12px}@media print{.print{display:none}body{margin:8mm}}</style></head><body><button class="print" onclick="window.print()">طباعة</button><div class="sheet"><div class="head">${photo?`<img class="photo" src="${photo}">`:`<div class="avatar">${esc(initials(s.name))}</div>`}<div><h1>${esc(s.name)}</h1><p>${esc(cl?.name||'')} • السنة ${esc(db.settings.schoolYear||'')}</p></div></div><div class="grid">${info.map(([k,v])=>`<div class="item"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>${d.info?`<div class="note"><b>معلومات تربوية إضافية</b><br>${esc(d.info)}</div>`:''}</div></body></html>`);w.document.close();
  }

  const previousAction = action;
  action = function(act,id){
    if(act==='sc-mode'){cardsMode=id;memoryRevealed=false;quizAnswered=false;pickNextMemory();render();return}
    if(act==='sc-edit-details'){detailsModal(id);return}
    if(act==='sc-print-card'){printCard(id);return}
    if(act==='sc-random-profile'){const ss=currentStudents();if(ss.length) previousAction('student-profile',ss[Math.floor(Math.random()*ss.length)].id);return}
    if(act==='sc-reveal'){memoryRevealed=true;render();return}
    if(act==='sc-memory-next'){pickNextMemory(memoryCurrentId);render();return}
    if(act==='sc-memory-answer'){
      const s=ensureMemoryStudent();if(!s)return;const r=mem(s.id),ok=id==='1';if(ok){r.right++;r.streak++}else{r.wrong++;r.streak=0}r.last=new Date().toISOString();saveDB();pickNextMemory(s.id);render();return;
    }
    if(act==='sc-quiz-answer'){
      const s=ensureMemoryStudent();if(!s||quizAnswered)return;const ok=id===s.id,r=mem(s.id);if(ok){r.right++;r.streak++}else{r.wrong++;r.streak=0}r.last=new Date().toISOString();saveDB();quizAnswered=true;$$('.quiz-options button').forEach(b=>{if(b.dataset.id===s.id)b.classList.add('correct');else if(b.dataset.id===id&&!ok)b.classList.add('wrong')});setTimeout(()=>{pickNextMemory(s.id);render()},700);return;
    }
    if(act==='sc-reset-memory'){if(confirm('إعادة ضبط تقدم حفظ الأسماء لهذا القسم؟')){currentStudents().forEach(s=>delete db.nameMemory[s.id]);saveDB();memoryCurrentId='';render();toast('تمت إعادة ضبط تقدم الحفظ')}return}
    return previousAction(act,id);
  };

  const previousBind = bindDynamic;
  bindDynamic = function(){
    previousBind();
    const search=$('#scSearch'); if(search) search.oninput=e=>{const q=e.target.value.trim().toLowerCase();$$('[data-sc-name]').forEach(card=>card.hidden=!card.dataset.scName.includes(q))};
    const weak=$('#scWeakOnly'); if(weak) weak.onchange=e=>{memoryWeakOnly=e.target.checked;memoryCurrentId='';memoryRevealed=false;quizAnswered=false;render()};
    $$('.sc-upload').forEach(inp=>inp.onchange=async()=>{const file=inp.files?.[0];if(!file)return;if(file.size>8*1024*1024){toast('الصورة كبيرة جدًا');return}try{db.studentPhotos ||= {};db.studentPhotos[inp.dataset.sid]=await compressPhoto(file);saveDB();render();toast('تم حفظ الصورة')}catch(e){console.error(e);toast('تعذر معالجة الصورة')}});
  };

  render();
})();
