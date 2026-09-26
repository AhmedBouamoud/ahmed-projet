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
for (const path of ['manifest.webmanifest','bundle.js?v=16-drawer-qa','styles.css?v=15-mobile-nav','sw.js']) {
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

console.log('PASS: Daftr Qismi mobile smoke test');
await browser.close();
