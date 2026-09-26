import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  locale: 'ar-MA',
});
const page = await context.newPage();

const pageErrors = [];
page.on('pageerror', err => pageErrors.push(String(err)));
page.on('console', msg => {
  if (msg.type() === 'error') pageErrors.push('console: ' + msg.text());
});

await page.goto('http://127.0.0.1:8080/', { waitUntil: 'networkidle' });
await page.waitForSelector('#view', { state: 'visible' });
await page.waitForFunction(() => window.__dqMobileNavReady === true);
await page.waitForFunction(() => window.__dqCalendarBridgeReady === true);
await page.waitForFunction(() => window.__dqGoogleSyncReady === true);
await page.waitForFunction(() => window.__dqTextbookLinkReady === true);
await page.waitForFunction(() => window.__dqHananeReady === true);
await page.waitForFunction(() => window.__dqHananeDirectReady === true);
await page.waitForTimeout(100);
assert.equal(pageErrors.length, 0, 'Startup runtime errors: ' + pageErrors.join(' | '));

const viewText = await page.locator('#view').innerText();
assert(!viewText.includes('تعذر تحميل التطبيق'), 'Startup failure message is visible');

// Mobile drawer opens.
await page.click('#menuBtn');
assert.equal(await page.locator('#sidebar').evaluate(el => el.classList.contains('open')), true, 'Sidebar did not open');
assert.equal(await page.locator('body').evaluate(el => el.classList.contains('sidebar-open')), true, 'Body was not locked');

// Drawer closes after selecting a nav item.
await page.click('#nav [data-view="classes"]');
await page.waitForTimeout(100);
assert.equal(await page.locator('#sidebar').evaluate(el => el.classList.contains('open')), false, 'Sidebar did not close after navigation');

// Drawer closes by overlay.
await page.click('#menuBtn');
await page.waitForSelector('#sidebarOverlay', { state: 'visible' });
await page.click('#sidebarOverlay', { position: { x: 10, y: 10 } });
await page.waitForTimeout(100);
assert.equal(await page.locator('#sidebar').evaluate(el => el.classList.contains('open')), false, 'Sidebar did not close from overlay');

// Create a test class.
await page.click('[data-act="add-class"]');
await page.fill('#mName', 'قسم اختبار QA');
if (await page.locator('#mLevel').count()) await page.fill('#mLevel', 'الثالثة إعدادي');
await page.click('#modalSave');
await page.waitForTimeout(150);
assert((await page.locator('#view').innerText()).includes('قسم اختبار QA'), 'Test class was not created');

// Navigate to students and add one.
await page.click('#menuBtn');
await page.click('#nav [data-view="students"]');
await page.click('[data-act="add-student"]');
await page.fill('#mName', 'تلميذ اختبار');
if (await page.locator('#mNum').count()) await page.fill('#mNum', '1');
await page.click('#modalSave');
await page.waitForTimeout(150);
assert((await page.locator('#view').innerText()).includes('تلميذ اختبار'), 'Test student was not created');

// Verify persistence.
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('daftr_qismi_v1') || '{}'));
assert.equal(stored.classes?.some(c => c.name === 'قسم اختبار QA'), true, 'Class not persisted');
assert.equal(stored.students?.some(s => s.name === 'تلميذ اختبار'), true, 'Student not persisted');

// Verify key PWA assets are reachable.
for (const path of ['manifest.webmanifest','bundle.js?v=17-qa','mobile-nav.js?v=17-qa','calendar-sync.js?v=18-qa','google-sync.js?v=19-qa','textbook-link.js?v=20-qa','hanane-import.js?v=21-qa','hanane-direct.js?v=22-qa','textbook/index.html','styles.css?v=15-mobile-nav','sw.js']) {
  const res = await page.request.get('http://127.0.0.1:8080/' + path);
  assert.equal(res.ok(), true, path + ' returned HTTP ' + res.status());
}

// Service worker should be registrable on localhost.
await page.waitForFunction(async () => {
  if (!('serviceWorker' in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!reg;
}, null, { timeout: 10000 });

assert.equal(pageErrors.length, 0, 'Runtime errors: ' + pageErrors.join(' | '));



// rerun after planner selector fix




// Calendar bridge tests
await page.click('#menuBtn');
await page.click('#nav [data-view="planner"]');
await page.waitForSelector('[data-act="calendar-import"]');
await page.waitForSelector('[data-act="calendar-export"]');

const qaDate = new Date().toISOString().slice(0,10);
const qaIcsDate = qaDate.replace(/-/g,'') + 'T143000';
const ics = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VEVENT',
  'UID:qa-personal-1',
  'DTSTART:' + qaIcsDate,
  'SUMMARY:موعد شخصي للاختبار',
  'DESCRIPTION:اختبار الربط',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');

const parsed = await page.evaluate(text => window.__dqCalendarBridgeTest.parseIcs(text), ics);
assert.equal(parsed.length, 1, 'ICS parser did not return one event');
assert.equal(parsed[0].title, 'موعد شخصي للاختبار', 'ICS title mismatch');
assert.equal(parsed[0].date, qaDate, 'ICS date mismatch');
assert.equal(parsed[0].time, '14:30', 'ICS time mismatch');

const firstImport = await page.evaluate(text => window.__dqCalendarBridgeTest.importText(text), ics);
assert.equal(firstImport.filter(e => e.uid === 'qa-personal-1').length, 1, 'Personal event was not imported');
await page.waitForTimeout(120);
assert((await page.locator('#view').innerText()).includes('موعد شخصي للاختبار'), 'Imported personal event is not visible in planner');

const secondImport = await page.evaluate(text => window.__dqCalendarBridgeTest.importText(text), ics);
assert.equal(secondImport.filter(e => e.uid === 'qa-personal-1').length, 1, 'Duplicate ICS event was imported');

const exported = await page.evaluate(() => window.__dqCalendarBridgeTest.buildIcs(window.__dqCalendarBridgeTest.plannerExportEvents()));
assert(exported.includes('BEGIN:VCALENDAR'), 'ICS export is invalid');
assert(!exported.includes('qa-personal-1'), 'Imported personal events must not loop back into app export');

const calAsset = await page.request.get('http://127.0.0.1:8080/calendar-sync.js?v=18-qa');
assert.equal(calAsset.ok(), true, 'calendar-sync.js not reachable');

// Google live-sync merge tests (no real OAuth/network in CI)
const googleTest = await page.evaluate(() => {
  const stored=JSON.parse(localStorage.getItem('daftr_qismi_v1')||'{}');
  const local=(stored.plannerEvents||[]).find(e=>!e.personal);
  return {hasHooks:!!window.__dqGoogleSyncTest,localId:local?.id||''};
});
assert.equal(googleTest.hasHooks,true,'Google sync test hooks missing');

const googleImported = await page.evaluate(() => {
  const item={
    id:'google-personal-qa',
    status:'confirmed',
    summary:'Google شخصي QA',
    description:'اختبار مزامنة',
    updated:new Date().toISOString(),
    htmlLink:'https://calendar.google.com/',
    iCalUID:'google-personal-qa@google.com',
    start:{dateTime:new Date().toISOString()},
    end:{dateTime:new Date(Date.now()+3600000).toISOString()}
  };
  const stats=window.__dqGoogleSyncTest.applyRemoteEvents([item]);
  const dbx=JSON.parse(localStorage.getItem('daftr_qismi_v1')||'{}');
  return {stats,count:(dbx.plannerEvents||[]).filter(e=>e.googleEventId==='google-personal-qa').length};
});
assert.equal(googleImported.count,1,'Google personal event was not imported');
assert.equal(googleImported.stats.imported,1,'Google import stats mismatch');

const googleImportedAgain = await page.evaluate(() => {
  const item={
    id:'google-personal-qa',
    status:'confirmed',
    summary:'Google شخصي QA',
    description:'اختبار مزامنة',
    updated:new Date().toISOString(),
    htmlLink:'https://calendar.google.com/',
    iCalUID:'google-personal-qa@google.com',
    start:{dateTime:new Date().toISOString()},
    end:{dateTime:new Date(Date.now()+3600000).toISOString()}
  };
  window.__dqGoogleSyncTest.applyRemoteEvents([item]);
  const dbx=JSON.parse(localStorage.getItem('daftr_qismi_v1')||'{}');
  return (dbx.plannerEvents||[]).filter(e=>e.googleEventId==='google-personal-qa').length;
});
assert.equal(googleImportedAgain,1,'Google event duplicated on second pull');

const googleBodyOk = await page.evaluate(() => {
  const e={id:'qa-app-event',date:new Date().toISOString().slice(0,10),time:'10:00',title:'موعد من التطبيق',details:'QA',type:'lesson'};
  const body=window.__dqGoogleSyncTest.googleBody(e);
  return body?.extendedProperties?.private?.daftrQismiId===e.id
    && body?.extendedProperties?.private?.daftrQismiType==='lesson'
    && !!body.start?.dateTime && !!body.end?.dateTime;
});
assert.equal(googleBodyOk,true,'Google push body is missing app marker');



// Linked textbook end-to-end test
await page.bringToFront();
await page.click('#menuBtn');
await page.click('#nav [data-view="journal"]');
await page.waitForSelector('[data-act="add-lesson-log"]');
await page.click('[data-act="add-lesson-log"]');
await page.fill('#mDate', qaDate);
await page.fill('#mDuration', '45 دقيقة');
await page.fill('#mTitle', 'حصة الربط QA');
if (await page.locator('#mObjectives').count()) await page.fill('#mObjectives', 'هدف الربط');
if (await page.locator('#mContent').count()) await page.fill('#mContent', 'محتوى الربط');
if (await page.locator('#mHomework').count()) await page.fill('#mHomework', 'واجب أولي');
await page.click('#modalSave');
await page.waitForTimeout(250);
assert((await page.locator('#view').innerText()).includes('حصة الربط QA'), 'Linked lesson log was not created');

const linkedClassId = await page.evaluate(() => {
  const d=JSON.parse(localStorage.getItem('daftr_qismi_v1')||'{}');
  return d.classes?.find(c=>c.name==='قسم اختبار QA')?.id || d.classes?.[0]?.id || '';
});
assert(linkedClassId, 'No class id for textbook link');

await page.waitForFunction((cid)=>{
  const b=JSON.parse(localStorage.getItem('dq_textbook_bridge_v1')||'{}');
  return !!b.classes?.[cid]?.sessions?.some(s=>s.title==='حصة الربط QA');
}, linkedClassId);

const textbookErrors=[];
const textbookPage=await context.newPage();
textbookPage.on('pageerror',e=>textbookErrors.push(String(e)));
textbookPage.on('console',m=>{if(m.type()==='error')textbookErrors.push('console: '+m.text())});
await textbookPage.goto('http://127.0.0.1:8080/textbook/?class='+encodeURIComponent(linkedClassId),{waitUntil:'networkidle'});
await textbookPage.waitForFunction(()=>window.__dqTextbookLinkedReady===true);
await textbookPage.waitForTimeout(250);
assert((await textbookPage.locator('body').innerText()).includes('حصة الربط QA'), 'Linked textbook did not import the lesson');

const textbookChanged=await textbookPage.evaluate(()=>{
  const b=window.__dqTextbookLinkedTest.read();
  const cid=new URLSearchParams(location.search).get('class');
  const rec=b.classes?.[cid]?.sessions?.find(x=>x.title==='حصة الربط QA');
  if(!rec)return false;
  const f=window.__dqTextbookLinkedTest.find(rec.id);
  if(!f)return false;
  f.s.homework='واجب معدل من دفتر النصوص';
  if(f.s.elements?.length)f.s.elements[f.s.elements.length-1].text='محتوى معدل من دفتر النصوص';
  saveState();
  return true;
});
assert.equal(textbookChanged,true,'Could not edit linked textbook session');
await textbookPage.waitForTimeout(250);

await page.bringToFront();
await page.evaluate(()=>window.__dqTextbookLinkTest.pull(false));
await page.waitForTimeout(120);
const roundTrip=await page.evaluate(()=>{
  const d=JSON.parse(localStorage.getItem('daftr_qismi_v1')||'{}');
  const l=(d.lessonLogs||[]).find(x=>x.title==='حصة الربط QA');
  return l?{homework:l.homework,content:l.content}:null;
});
assert(roundTrip,'Round-trip lesson missing in class app');
assert.equal(roundTrip.homework,'واجب معدل من دفتر النصوص','Homework did not return from linked textbook');
assert(roundTrip.content.includes('محتوى معدل من دفتر النصوص'),'Content did not return from linked textbook');
assert.equal(textbookErrors.length,0,'Linked textbook runtime errors: '+textbookErrors.join(' | '));
await textbookPage.close();

const textbookAsset=await page.request.get('http://127.0.0.1:8080/textbook-link.js?v=20-qa');
assert.equal(textbookAsset.ok(),true,'textbook-link.js not reachable');
const linkedHtml=await page.request.get('http://127.0.0.1:8080/textbook/');
assert.equal(linkedHtml.ok(),true,'linked textbook page not reachable');



// Al Hanane import test
const hananeSample = [
  'ÉTABL. : H2',
  'NIVEAU : 1 AC',
  'SEM. : S1',
  'TYPE NOTE : Contrôle Classe',
  'CONTRÔLES',
  'Disciplines Sociales',
  '30-10-2026 08:30',
  '1 AC/C',
  'Salle : ...',
  'Ctrl : 01',
  'U01-L01 - التاريخ: حضارة بلاد الرافدين',
  'U01-L02 - التاريخ: حضارة مصر القديمة',
  'U03-L01 - الجغرافيا: الأرض شكلها وتمثيلها',
  'U03-L02 - الجغرافيا: التدرب على رسم الإحداثيات',
  'U05-L01 - التربية على المواطنة: الكرامة',
  'U05-L02 - التربية على المواطنة: الحرية'
].join('\n');

const hananeParsed = await page.evaluate(text => window.__dqHananeTest.parse(text), hananeSample);
assert.equal(hananeParsed.institution,'H2','Hanane institution parse failed');
assert.equal(hananeParsed.level,'1 AC','Hanane level parse failed');
assert.equal(hananeParsed.semester,'S1','Hanane semester parse failed');
assert.equal(hananeParsed.noteType,'Contrôle Classe','Hanane note type parse failed');
assert.equal(hananeParsed.date,'2026-10-30','Hanane date parse failed');
assert.equal(hananeParsed.time,'08:30','Hanane time parse failed');
assert.equal(hananeParsed.classLabel,'1 AC/C','Hanane class parse failed');
assert.equal(hananeParsed.controlNo,'01','Hanane control number parse failed');
assert.equal(hananeParsed.lessons.length,6,'Hanane lesson count parse failed');

const hananeImport = await page.evaluate((text) => {
  const p=window.__dqHananeTest.parse(text);
  const dbx=JSON.parse(localStorage.getItem('daftr_qismi_v1')||'{}');
  const cid=dbx.classes?.find(c=>c.name==='قسم اختبار QA')?.id || dbx.classes?.[0]?.id;
  const first=window.__dqHananeTest.importParsed(p,cid,{addPlanner:true,addCurriculum:true,markDone:false});
  const second=window.__dqHananeTest.importParsed(p,cid,{addPlanner:true,addCurriculum:true,markDone:false});
  const after=JSON.parse(localStorage.getItem('daftr_qismi_v1')||'{}');
  return {
    cid,
    created:first.createdControl,
    duplicateCreated:second.createdControl,
    controls:(after.hananeControls||[]).filter(x=>x.classId===cid&&x.sourceKey===p.sourceKey).length,
    assessments:(after.assessments||[]).filter(x=>x.hananeControlId===first.control.id).length,
    planner:(after.plannerEvents||[]).filter(x=>x.hananeControlId===first.control.id).length,
    curriculum:(after.curriculum||[]).filter(x=>x.classId===cid&&x.source==='hanane').length
  };
}, hananeSample);
assert.equal(hananeImport.created,true,'Hanane first import did not create control');
assert.equal(hananeImport.duplicateCreated,false,'Hanane duplicate import created a second control');
assert.equal(hananeImport.controls,1,'Hanane control duplicated');
assert.equal(hananeImport.assessments,1,'Hanane assessment not linked exactly once');
assert.equal(hananeImport.planner,1,'Hanane planner event not linked exactly once');
assert.equal(hananeImport.curriculum,6,'Hanane curriculum lessons not imported');

await page.evaluate(()=>{currentView='hanane';render()});
await page.waitForSelector('#hananePaste');
assert((await page.locator('#view').innerText()).includes('جسر الحنان'),'Hanane view did not render');
assert((await page.locator('#view').innerText()).includes('2026-10-30'),'Imported Hanane control not visible');

const hananeAsset=await page.request.get('http://127.0.0.1:8080/hanane-import.js?v=21-qa');
assert.equal(hananeAsset.ok(),true,'hanane-import.js not reachable');


// Hanane direct-import test
const fakeHananeHtml = [
  '<html><body>',
  '<header>Espace Enseignant BOUMAOUD</header>',
  '<div class="filters">ÉTABL. : H2 NIVEAU : 1 AC SEM. : S1 TYPE NOTE : Contrôle Classe</div>',
  '<section class="controls"><div class="control-card">',
  '<div>Disciplines Sociales</div>',
  '<div>30-10-2026 08:30</div>',
  '<div>1 AC/C</div>',
  '<div>Ctrl : 01</div>',
  '<ul>',
  '<li>U01-L01 - التاريخ: حضارة بلاد الرافدين</li>',
  '<li>U01-L02 - التاريخ: حضارة مصر القديمة</li>',
  '<li>U03-L01 - الجغرافيا: الأرض شكلها وتمثيلها</li>',
  '<li>U03-L02 - الجغرافيا: التدرب على رسم الإحداثيات</li>',
  '<li>U05-L01 - التربية على المواطنة: الكرامة</li>',
  '<li>U05-L02 - التربية على المواطنة: الحرية</li>',
  '</ul></div></section>',
  '<footer>معلومات أخرى غير مطلوبة</footer>',
  '</body></html>'
].join('');

const directExtract = await page.evaluate(html => {
  const t=window.__dqHananeDirectTest.extractFromHtml(html);
  const p=window.__dqHananeTest.parse(t);
  const enc=window.__dqHananeDirectTest.toB64Url(t);
  const dec=window.__dqHananeDirectTest.fromB64Url(enc);
  const bm=window.__dqHananeDirectTest.bookmarklet('http://127.0.0.1:8080/');
  return {text:t,parsed:p,roundtrip:t===dec,bookmarklet:bm};
}, fakeHananeHtml);
assert(directExtract.text.includes('Ctrl : 01'),'Direct extractor missed control card');
assert(!directExtract.text.includes('معلومات أخرى غير مطلوبة'),'Direct extractor captured unrelated page text');
assert.equal(directExtract.parsed.institution,'H2','Direct extractor institution parse failed');
assert.equal(directExtract.parsed.level,'1 AC','Direct extractor level parse failed');
assert.equal(directExtract.parsed.noteType,'Contrôle Classe','Direct extractor note type parse failed');
assert.equal(directExtract.parsed.semester,'S1','Direct extractor semester parse failed');
assert.equal(directExtract.parsed.classLabel,'1 AC/C','Direct extractor class parse failed');
assert.equal(directExtract.parsed.date,'2026-10-30','Direct extractor date parse failed');
assert.equal(directExtract.parsed.lessons.length,6,'Direct extractor lesson parse failed');
assert.equal(directExtract.roundtrip,true,'Direct payload encoding round-trip failed');
assert(directExtract.bookmarklet.startsWith('javascript:'),'Direct bookmarklet was not generated');

const directPayload = await page.evaluate(text => window.__dqHananeDirectTest.toB64Url(text), directExtract.text);
await page.goto('http://127.0.0.1:8080/#hanane64='+directPayload,{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.__dqHananeReady===true && window.__dqHananeDirectReady===true);
await page.waitForSelector('#hananePaste');
await page.waitForTimeout(150);
assert.equal(await page.locator('#hananePaste').inputValue(),directExtract.text,'Incoming Hanane payload was not placed in textarea');
assert((await page.locator('#hananePreview').innerText()).includes('2026-10-30'),'Incoming Hanane payload was not parsed automatically');
assert.equal(await page.evaluate(()=>location.hash),'','Hanane payload hash was not cleared after receipt');

const directAsset=await page.request.get('http://127.0.0.1:8080/hanane-direct.js?v=22-qa');
assert.equal(directAsset.ok(),true,'hanane-direct.js not reachable');


assert.equal(pageErrors.length, 0, 'Runtime errors after calendar tests: ' + pageErrors.join(' | '));
console.log('PASS: Daftr Qismi mobile + calendar + linked textbook + Hanane direct QA');
await browser.close();
