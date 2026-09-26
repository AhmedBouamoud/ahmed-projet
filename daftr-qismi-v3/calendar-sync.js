/* Daftr Qismi personal calendar bridge v18 */
(function(){
  db.plannerEvents ||= [];

  const css=document.createElement('style');
  css.textContent=`
  .calendar-bridge{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
  .calendar-bridge .bridge-note{font-size:11px;color:#64748b;flex:1 1 220px}
  .event-chip.personal{border-right-color:#7c3aed;background:#faf7ff}
  .event-source{display:inline-flex;align-items:center;gap:4px;font-size:10px;padding:2px 6px;border-radius:999px;background:#f3e8ff;color:#6b21a8;margin-top:4px}
  .calendar-sync-stats{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 12px}
  .calendar-sync-stats span{font-size:11px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:999px;padding:4px 8px}
  `;
  document.head.appendChild(css);

  function icsEscape(v=''){
    return String(v).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  }
  function icsUnescape(v=''){
    return String(v).replace(/\\n/gi,'\n').replace(/\\,/g,',').replace(/\\;/g,';').replace(/\\\\/g,'\\');
  }
  function pad(n){return String(n).padStart(2,'0')}
  function toIcsLocal(date,time=''){
    const d=(date||today()).replace(/-/g,'');
    return time?d+'T'+time.replace(':','')+'00':d;
  }
  function fromIcsDate(raw=''){
    const v=raw.trim();
    if(/^\d{8}$/.test(v))return {date:`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`,time:''};
    const m=v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
    if(m)return {date:`${m[1]}-${m[2]}-${m[3]}`,time:`${m[4]}:${m[5]}`};
    return {date:'',time:''};
  }
  function eventUid(e){
    return e.calendarUid || `dq-${e.id}@daftr-qismi`;
  }
  function plannerExportEvents(){
    const out=[];
    db.plannerEvents.filter(e=>!(e.personal||e.source==='personal-calendar')).forEach(e=>{
      out.push({
        uid:eventUid(e),date:e.date,time:e.time||'',title:e.title||'موعد',
        details:[e.details||'',e.classId?(db.classes.find(c=>c.id===e.classId)?.name||''):''].filter(Boolean).join(' — '),
        type:e.type||'note'
      });
    });
    db.assessments.filter(a=>a.date).forEach(a=>out.push({
      uid:`assessment-${a.id}@daftr-qismi`,date:a.date,time:'',title:'فرض / تقويم: '+a.title,
      details:db.classes.find(c=>c.id===a.classId)?.name||'',type:'assessment'
    }));
    db.homework.filter(h=>h.dueDate).forEach(h=>out.push({
      uid:`homework-${h.id}@daftr-qismi`,date:h.dueDate,time:'',title:'واجب: '+h.title,
      details:[db.classes.find(c=>c.id===h.classId)?.name||'',h.details||''].filter(Boolean).join(' — '),type:'homework'
    }));
    return out;
  }
  function buildIcs(events){
    const now=new Date();
    const stamp=`${now.getUTCFullYear()}${pad(now.getUTCMonth()+1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Daftr Qismi//AR','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:دفتر القسم الذكي'];
    events.forEach(e=>{
      lines.push('BEGIN:VEVENT');
      lines.push('UID:'+icsEscape(e.uid));
      lines.push('DTSTAMP:'+stamp);
      lines.push((e.time?'DTSTART:':'DTSTART;VALUE=DATE:')+toIcsLocal(e.date,e.time));
      lines.push('SUMMARY:'+icsEscape(e.title));
      if(e.details)lines.push('DESCRIPTION:'+icsEscape(e.details));
      lines.push('CATEGORIES:'+icsEscape(e.type||'note'));
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
  function downloadIcs(){
    const events=plannerExportEvents();
    if(!events.length){toast('لا توجد مواعيد لتصديرها');return}
    const blob=new Blob([buildIcs(events)],{type:'text/calendar;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='daftr-qismi-calendar.ics';
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast('تم تجهيز مفكرة التطبيق للمفكرة الشخصية');
  }
  function parseIcs(text){
    const unfolded=String(text).replace(/\r?\n[ \t]/g,'');
    const blocks=unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g)||[];
    return blocks.map(block=>{
      const rows=block.split(/\r?\n/);
      const get=(name)=>{
        const row=rows.find(r=>r===name||r.startsWith(name+':')||r.startsWith(name+';'));
        return row?row.slice(row.indexOf(':')+1):'';
      };
      const dt=get('DTSTART'),parsed=fromIcsDate(dt);
      return {
        uid:icsUnescape(get('UID'))||'ics-'+Math.random().toString(36).slice(2),
        date:parsed.date,time:parsed.time,
        title:icsUnescape(get('SUMMARY'))||'موعد شخصي',
        details:icsUnescape(get('DESCRIPTION')),
        rawCategory:icsUnescape(get('CATEGORIES'))
      };
    }).filter(e=>e.date);
  }
  async function importIcsFile(file){
    const text=await file.text();
    const parsed=parseIcs(text);
    if(!parsed.length){toast('لم أجد مواعيد صالحة في الملف');return}
    const existing=new Set(db.plannerEvents.map(e=>e.calendarUid).filter(Boolean));
    let added=0,skipped=0;
    parsed.forEach(e=>{
      if(existing.has(e.uid)){skipped++;return}
      db.plannerEvents.push({
        id:uid('evt'),date:e.date,time:e.time,title:e.title,type:'personal',
        classId:'',details:e.details||'',personal:true,source:'personal-calendar',calendarUid:e.uid
      });
      existing.add(e.uid);added++;
    });
    saveDB();render();
    toast(`تم استيراد ${added} موعد شخصي${skipped?'، وتجاوز '+skipped+' مكرر':''}`);
  }
  function chooseIcs(){
    let input=document.getElementById('calendarIcsInput');
    if(!input){
      input=document.createElement('input');
      input.type='file';input.accept='.ics,text/calendar';input.id='calendarIcsInput';input.hidden=true;
      input.onchange=async()=>{const f=input.files?.[0];if(f)await importIcsFile(f);input.value=''};
      document.body.appendChild(input);
    }
    input.click();
  }
  function googleLinkForEvent(e){
    const start=toIcsLocal(e.date,e.time);
    const dates=e.time?start+'/'+start:(start+'/'+start);
    const q=new URLSearchParams({action:'TEMPLATE',text:e.title||'موعد',dates,details:e.details||''});
    return 'https://calendar.google.com/calendar/render?'+q.toString();
  }

  const oldPlanner=renderers.planner;
  renderers.planner=function(){
    const personal=db.plannerEvents.filter(e=>e.personal||e.source==='personal-calendar').length;
    const base=oldPlanner();
    const bridge=`<div class="card" style="margin-bottom:12px">
      <div class="calendar-bridge">
        <button class="primary" data-act="calendar-import">📥 استيراد من مفكرتي</button>
        <button class="ghost" data-act="calendar-export">📤 تصدير إلى مفكرتي</button>
        <span class="bridge-note">يعمل مع Google Calendar وتقويم الهاتف عبر ملف ICS. المواعيد الشخصية تبقى محفوظة محليًا على جهازك.</span>
      </div>
      <div class="calendar-sync-stats"><span>المواعيد الشخصية: <b>${personal}</b></span><span>مواعيد التطبيق: <b>${plannerExportEvents().length}</b></span></div>
    </div>`;
    return base.replace(/(<div class="card"><div class="week-toolbar">)/,bridge+'$1')
      .replace(/event-chip personal/g,'event-chip personal');
  };

  const oldAction=action;
  action=function(act,id){
    if(act==='calendar-import'){chooseIcs();return}
    if(act==='calendar-export'){downloadIcs();return}
    if(act==='calendar-google'){
      const e=db.plannerEvents.find(x=>x.id===id);
      if(e)window.open(googleLinkForEvent(e),'_blank','noopener');
      return
    }
    return oldAction(act,id);
  };

  const oldPlannerModal=plannerModal;
  plannerModal=function(existing=null,presetDate=''){
    oldPlannerModal(existing,presetDate);
    if(existing){
      setTimeout(()=>{
        const host=document.querySelector('#modal .modal-body, #modal form, #modal .form-grid')||document.querySelector('#modal');
        if(!host||document.getElementById('calendarGoogleBtn'))return;
        const wrap=document.createElement('div');wrap.className='field full';
        wrap.innerHTML='<button type="button" class="ghost" id="calendarGoogleBtn">فتح هذا الموعد في Google Calendar</button>';
        host.appendChild(wrap);
        document.getElementById('calendarGoogleBtn').onclick=()=>window.open(googleLinkForEvent(existing),'_blank','noopener');
      },0);
    }
  };

  const oldRender=render;
  render=function(){
    oldRender();
    if(currentView==='planner'){
      document.querySelectorAll('.event-chip').forEach(el=>{
        const id=el.dataset.id;
        const e=db.plannerEvents.find(x=>x.id===id);
        if(e&&(e.personal||e.source==='personal-calendar')){
          el.classList.add('personal');
          if(!el.querySelector('.event-source')){
            const tag=document.createElement('div');tag.className='event-source';tag.textContent='مفكرتي الشخصية';el.appendChild(tag);
          }
        }
      });
    }
  };

  render();
  window.__dqCalendarBridgeTest={
    parseIcs,
    buildIcs,
    plannerExportEvents,
    importText:async(text)=>{
      const file=new File([text],'calendar-test.ics',{type:'text/calendar'});
      await importIcsFile(file);
      return db.plannerEvents.filter(e=>e.personal||e.source==='personal-calendar').map(e=>({uid:e.calendarUid,title:e.title,date:e.date,time:e.time}));
    }
  };
  window.__dqCalendarBridgeReady=true;
})();