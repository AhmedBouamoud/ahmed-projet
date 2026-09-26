/* Daftr Qismi — Al Hanane importer v21 */
(function(){
  db.hananeControls ||= [];
  db.curriculum ||= [];
  db.plannerEvents ||= [];

  const css=document.createElement('style');
  css.textContent=`
  .hanane-hero{background:linear-gradient(135deg,#eef2ff,#ecfeff);border:1px solid #c7d2fe;border-radius:16px;padding:15px;margin-bottom:14px}
  .hanane-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:14px}
  .hanane-paste{min-height:280px;font-family:inherit;line-height:1.7;direction:auto}
  .hanane-preview{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .hanane-kv{background:#f8fafc;border:1px solid #e2e8f0;border-radius:11px;padding:9px}
  .hanane-kv small{display:block;color:#64748b;margin-bottom:3px}.hanane-kv b{display:block;overflow-wrap:anywhere}
  .hanane-lessons{display:flex;flex-direction:column;gap:6px;margin-top:10px}
  .hanane-lesson{padding:8px 10px;border:1px solid #dbeafe;background:#fff;border-radius:10px}
  .hanane-lesson code{direction:ltr;display:inline-block;background:#eef2ff;padding:2px 6px;border-radius:6px;margin-left:6px}
  .hanane-imported{border-right:4px solid #4f46e5}.hanane-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
  .hanane-checks{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px}.hanane-checks label{display:flex;align-items:center;gap:5px;font-size:12px}
  @media(max-width:850px){.hanane-grid{grid-template-columns:1fr}.hanane-preview{grid-template-columns:1fr 1fr}}
  @media(max-width:520px){.hanane-preview{grid-template-columns:1fr}.hanane-actions button{flex:1 1 140px}}
  `;
  document.head.appendChild(css);

  let parsedCache=null;

  function clean(v=''){return String(v).replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim()}
  function normText(text=''){
    return String(text)
      .replace(/\r/g,'')
      .replace(/\u00a0/g,' ')
      .replace(/[ \t]+/g,' ')
      .replace(/\n{3,}/g,'\n\n')
      .trim();
  }
  function lineAfter(lines,labelRx){
    for(let i=0;i<lines.length;i++){
      if(labelRx.test(lines[i])){
        const same=lines[i].replace(labelRx,'').replace(/^\s*[:：.-]?\s*/,'').trim();
        if(same)return same;
        for(let j=i+1;j<Math.min(lines.length,i+4);j++) if(lines[j].trim()) return lines[j].trim();
      }
    }
    return '';
  }
  function isoDate(d,m,y){return y+'-'+m.padStart(2,'0')+'-'+d.padStart(2,'0')}
  function parseHanane(text){
    const raw=normText(text),lines=raw.split('\n').map(clean).filter(Boolean);
    const joined=lines.join('\n');

    let institution=lineAfter(lines,/^(?:ÉTABL\.?|ETABL\.?|ETABLISSEMENT|ÉTABLISSEMENT)\s*/i);
    let level=lineAfter(lines,/^(?:NIVEAU)\s*/i);
    let semester=lineAfter(lines,/^(?:SEM\.?|SEMESTRE)\s*/i);
    let noteType=lineAfter(lines,/^(?:TYPE\s*NOTE)\s*/i);

    const dt=joined.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})\b(?:\s+(\d{1,2}:\d{2}))?/);
    const date=dt?isoDate(dt[1],dt[2],dt[3]):'';
    const time=dt?.[4]||'';

    let classLabel='';
    for(const line of lines){
      const m=line.match(/\b(\d+\s*(?:AC|BAC|TC)(?:\s*\/\s*[A-Z0-9]+)?)\b/i);
      if(m && !/NIVEAU/i.test(line)){classLabel=clean(m[1].replace(/\s*\/\s*/g,'/')); if(line.match(/\//))break}
    }
    if(!classLabel){
      const m=joined.match(/\b(\d+\s*(?:AC|BAC|TC)(?:\s*\/\s*[A-Z0-9]+)?)\b/i);
      classLabel=m?clean(m[1].replace(/\s*\/\s*/g,'/')):'';
    }

    const ctrl=joined.match(/\bCtrl\s*:?\s*(\d+)\b/i);
    const controlNo=ctrl?ctrl[1].padStart(2,'0'):'';

    let discipline='';
    const discLine=lines.find(l=>/Disciplines?\s+Sociales?/i.test(l)||/الاجتماعيات/.test(l));
    if(discLine)discipline=discLine.replace(/^(?:DISCIPLINE\s*:?\s*)/i,'').trim();

    const lessons=[];
    const codeRx=/\b(U\d{2}\s*-\s*L\d{2})\b/i;
    for(const line of lines){
      const m=line.match(codeRx); if(!m)continue;
      const code=m[1].replace(/\s/g,'').toUpperCase();
      let title=line.replace(m[0],'').replace(/^[\s•·\-–—:]+|[\s•·\-–—:]+$/g,'').trim();
      title=title.replace(/^(?:[-–—]\s*)+/,'').trim();
      if(!lessons.some(x=>x.code===code))lessons.push({code,title:title||code});
    }

    if(!lessons.length){
      const rx=/\b(U\d{2}-L\d{2})\b\s*[-–—:]?\s*([^\n]{2,100})/gi; let m;
      while((m=rx.exec(joined))){const code=m[1].toUpperCase(),title=clean(m[2]);if(!lessons.some(x=>x.code===code))lessons.push({code,title})}
    }

    institution=institution.replace(/^:\s*/,'');
    level=level.replace(/^:\s*/,'');
    semester=semester.replace(/^:\s*/,'');
    noteType=noteType.replace(/^:\s*/,'');

    const sourceKey=[institution,classLabel||level,semester,date,time,controlNo,noteType].map(x=>clean(x).toLowerCase()).join('|');
    return {institution,level,semester,noteType,date,time,classLabel,controlNo,discipline,lessons,sourceKey,raw};
  }

  function previewHtml(p){
    if(!p)return '<div class="empty">الصق نص صفحة الفرض ثم اضغط «تحليل النص».</div>';
    const fields=[
      ['المؤسسة',p.institution||'—'],['المستوى',p.level||'—'],['الدورة',p.semester||'—'],
      ['نوع الفرض',p.noteType||'—'],['القسم',p.classLabel||'—'],['رقم الفرض',p.controlNo||'—'],
      ['التاريخ',p.date||'—'],['الوقت',p.time||'—'],['المادة',p.discipline||'—']
    ];
    return '<div class="hanane-preview">'+fields.map(([k,v])=>'<div class="hanane-kv"><small>'+esc(k)+'</small><b>'+esc(v)+'</b></div>').join('')+'</div>'+
      '<div class="hanane-lessons"><h4 style="margin:8px 0 2px">الدروس الداخلة في الفرض ('+p.lessons.length+')</h4>'+
      (p.lessons.length?p.lessons.map(x=>'<div class="hanane-lesson"><code>'+esc(x.code)+'</code>'+esc(x.title)+'</div>').join(''):'<div class="small">لم أتعرف على رموز الدروس. تأكد من أن النص المنسوخ يتضمن U01-L01…</div>')+'</div>';
  }

  function classOptions(){
    return db.classes.map(c=>'<option value="'+c.id+'" '+(c.id===currentClassId?'selected':'')+'>'+esc(c.name)+' — '+esc(c.school||'')+'</option>').join('');
  }
  function controlTitle(p){return 'الفرض '+(p.controlNo||'')+(p.noteType?' — '+p.noteType:'')}
  function detailsText(p){
    const ls=p.lessons.map(x=>x.code+' — '+x.title).join('\n');
    return ['المؤسسة: '+(p.institution||''),'القسم: '+(p.classLabel||p.level||''),'الدورة: '+(p.semester||''),ls?('الدروس:\n'+ls):''].filter(Boolean).join('\n');
  }
  function findControl(p,classId){
    return db.hananeControls.find(x=>x.classId===classId && x.sourceKey===p.sourceKey);
  }
  function importParsed(p,classId,opts={}){
    if(!p||!p.date)throw new Error('لم أتعرف على تاريخ الفرض');
    if(!classId)throw new Error('اختر القسم داخل دفتر القسم');
    const c=db.classes.find(x=>x.id===classId); if(!c)throw new Error('القسم المختار غير موجود');

    const addPlanner=opts.addPlanner!==false;
    const addCurriculum=opts.addCurriculum!==false;
    const markDone=opts.markDone===true;

    let ctrl=findControl(p,classId), createdControl=false;
    if(!ctrl){
      ctrl={id:uid('hc'),classId,sourceKey:p.sourceKey,source:'hanane',importedAt:new Date().toISOString()};
      db.hananeControls.push(ctrl);createdControl=true;
    }
    Object.assign(ctrl,{
      institution:p.institution,level:p.level,semester:p.semester,noteType:p.noteType,date:p.date,time:p.time,
      classLabel:p.classLabel,controlNo:p.controlNo,discipline:p.discipline,lessons:p.lessons,raw:p.raw,
      updatedAt:new Date().toISOString()
    });

    let assessment=db.assessments.find(a=>a.hananeControlId===ctrl.id);
    if(!assessment){
      assessment={id:uid('a'),classId,title:controlTitle(p),date:p.date,max:20,coef:1,hananeControlId:ctrl.id,source:'hanane'};
      db.assessments.push(assessment);
    }else{
      assessment.title=controlTitle(p);assessment.date=p.date;assessment.classId=classId;
    }
    ctrl.assessmentId=assessment.id;

    let planner=null;
    if(addPlanner){
      planner=db.plannerEvents.find(e=>e.hananeControlId===ctrl.id);
      if(!planner){
        planner={id:uid('evt'),classId,date:p.date,time:p.time||'',title:controlTitle(p),type:'assessment',details:detailsText(p),hananeControlId:ctrl.id,source:'hanane'};
        db.plannerEvents.push(planner);
      }else{
        Object.assign(planner,{classId,date:p.date,time:p.time||'',title:controlTitle(p),type:'assessment',details:detailsText(p)});
      }
      ctrl.plannerEventId=planner.id;
    }

    const curriculumIds=[];
    if(addCurriculum){
      p.lessons.forEach((lesson,idx)=>{
        let item=db.curriculum.find(x=>x.classId===classId && x.hananeCode===lesson.code);
        if(!item){
          item={id:uid('cur'),classId,title:lesson.title||lesson.code,unit:lesson.code,order:(db.curriculum.filter(x=>x.classId===classId).length+idx+1),plannedDate:p.date,status:markDone?'done':'inprogress',hananeCode:lesson.code,source:'hanane'};
          if(markDone)item.completedDate=p.date;
          db.curriculum.push(item);
        }else{
          if(lesson.title)item.title=lesson.title;
          item.unit=lesson.code;item.hananeCode=lesson.code;item.source=item.source||'hanane';
          if(markDone){item.status='done';item.completedDate=item.completedDate||p.date}
        }
        curriculumIds.push(item.id);
      });
    }
    ctrl.curriculumIds=curriculumIds;
    currentClassId=classId;
    saveDB();
    return {control:ctrl,assessment,planner,curriculumIds,createdControl};
  }

  renderers.hanane=function(){
    const controls=db.hananeControls.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const sampleHint='من منصة الحنان: افتح Tableau des contrôles، حدّد نص الصفحة (أو النص الخاص بالفرض) ثم «نسخ»، والصقه هنا.';
    return viewHead('الحنان','استيراد الفروض والدروس من فضاء الأستاذ دون إعادة الكتابة')+
    '<div class="hanane-hero"><strong>🏫 جسر الحنان</strong><div class="small" style="margin-top:5px">'+esc(sampleHint)+'</div></div>'+
    '<div class="hanane-grid">'+
      '<div class="card"><h3>1. الصق نص صفحة الفرض</h3><textarea id="hananePaste" class="hanane-paste" placeholder="ÉTABL. : H2&#10;NIVEAU : 1 AC&#10;SEM. : S1&#10;TYPE NOTE : Contrôle Classe&#10;30-10-2026 08:30&#10;1 AC/C&#10;Ctrl : 01&#10;U01-L01 - التاريخ: حضارة بلاد الرافدين&#10;..."></textarea>'+
        '<div class="hanane-actions"><button class="primary" data-act="hanane-parse">🔎 تحليل النص</button><button class="ghost" data-act="hanane-clear">مسح</button></div></div>'+
      '<div class="card"><h3>2. المعاينة</h3><div id="hananePreview">'+previewHtml(parsedCache)+'</div>'+
        '<div style="margin-top:12px"><label class="small">ربط الفرض بالقسم داخل دفتر القسم</label><select id="hananeClass">'+classOptions()+'</select></div>'+
        '<div class="hanane-checks"><label><input type="checkbox" id="hananePlanner" checked> إضافة للمفكرة</label><label><input type="checkbox" id="hananeCurriculum" checked> إضافة الدروس لتقدم المقرر</label><label><input type="checkbox" id="hananeDone"> اعتبار الدروس منجزة</label></div>'+
        '<div class="hanane-actions"><button class="primary" data-act="hanane-import" '+(parsedCache?'':'disabled')+'>✓ استيراد الفرض</button></div></div>'+
    '</div>'+
    '<div class="card" style="margin-top:14px"><div class="section-title"><h3>الفروض المستوردة من الحنان</h3><span class="badge">'+controls.length+'</span></div>'+
      (controls.length?controls.map(x=>{const c=db.classes.find(k=>k.id===x.classId);return '<div class="lesson-card hanane-imported"><div class="lesson-head"><div><strong>'+esc(controlTitle(x))+'</strong><div class="small">'+esc(x.date||'')+(x.time?' • '+esc(x.time):'')+' • '+esc(c?.name||x.classLabel||'')+' • '+esc(x.institution||'')+'</div></div><span class="badge ok">'+(x.lessons?.length||0)+' دروس</span></div><div class="small" style="margin-top:7px">'+(x.lessons||[]).map(l=>'<span class="chip">'+esc(l.code)+'</span>').join(' ')+'</div></div>'}).join(''):empty('لم تستورد أي فرض من الحنان بعد.'))+
    '</div>';
  };

  const oldAction=action;
  action=function(act,id){
    if(act==='hanane-parse'){
      const text=$('#hananePaste')?.value||'';
      parsedCache=parseHanane(text);
      const host=$('#hananePreview');if(host)host.innerHTML=previewHtml(parsedCache);
      const btn=$('[data-act="hanane-import"]');if(btn)btn.disabled=!parsedCache?.date;
      toast(parsedCache.date?'تم تحليل بيانات الفرض':'لم أتعرف على تاريخ الفرض');
      return;
    }
    if(act==='hanane-clear'){
      parsedCache=null;const ta=$('#hananePaste');if(ta)ta.value='';const host=$('#hananePreview');if(host)host.innerHTML=previewHtml(null);const btn=$('[data-act="hanane-import"]');if(btn)btn.disabled=true;return;
    }
    if(act==='hanane-import'){
      if(!parsedCache){toast('حلل النص أولًا');return}
      try{
        const res=importParsed(parsedCache,$('#hananeClass')?.value||currentClassId,{
          addPlanner:$('#hananePlanner')?.checked!==false,
          addCurriculum:$('#hananeCurriculum')?.checked!==false,
          markDone:$('#hananeDone')?.checked===true
        });
        toast(res.createdControl?'تم استيراد الفرض وربطه':'تم تحديث الفرض الموجود دون تكرار');
        parsedCache=null;render();
      }catch(e){console.warn(e);toast(e.message||'تعذر الاستيراد')}
      return;
    }
    return oldAction(act,id);
  };

  window.__dqHananeTest={parse:parseHanane,importParsed,controlTitle,detailsText};
  window.__dqHananeReady=true;
  render();
})();