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
