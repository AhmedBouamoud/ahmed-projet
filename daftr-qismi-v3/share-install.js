/* Sharing always uses the public app URL, never imported data or backups. */
(() => {
  'use strict';
  const appURL = new URL('./', document.baseURI).href;
  const dialog = document.getElementById('appShareDialog');
  const status = document.getElementById('appShareStatus');
  const urlField = document.getElementById('appShareURL');
  const installButtons = [...document.querySelectorAll('[data-install-app]')];
  const standalone = window.matchMedia('(display-mode: standalone)');
  let installPrompt = null;
  let opener;
  const isInstalled = () => standalone.matches || navigator.standalone === true;
  const message = 'دفتر القسم الذكي للأساتذة: الأقسام، الحضور والغياب، النقط، دفتر النصوص والمفكرة. افتح الرابط في متصفح هاتفك، ثم اختر «تثبيت التطبيق». يبدأ كل أستاذ ببياناته الخاصة على جهازه.';

  function updateInstallButtons() {
    installButtons.forEach(button => {
      button.hidden = false;
      button.textContent = isInstalled() ? 'دليل التطبيق' : 'تثبيت التطبيق';
    });
    document.getElementById('appInstallNow').hidden = !installPrompt || isInstalled();
    document.getElementById('appInstalledNotice').hidden = !isInstalled();
  }

  function openGuide() {
    opener = document.activeElement;
    status.textContent = '';
    updateInstallButtons();
    if (!dialog.open) dialog.showModal();
  }

  async function install() {
    if (!installPrompt || isInstalled()) { openGuide(); return; }
    const prompt = installPrompt;
    installPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome !== 'accepted') openGuide();
    } catch (_) {
      openGuide();
      status.textContent = 'يمكنك التثبيت من قائمة المتصفح باتباع الخطوات أدناه.';
    }
    updateInstallButtons();
  }

  urlField.value = appURL;
  document.getElementById('appWhatsApp').href = 'https://wa.me/?text=' + encodeURIComponent(message + '\n' + appURL);
  document.querySelectorAll('[data-share-app]').forEach(button => button.addEventListener('click', openGuide));
  installButtons.forEach(button => { button.onclick = install; });
  document.getElementById('appInstallNow').addEventListener('click', install);
  document.getElementById('appShareClose').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => opener?.focus());
  document.getElementById('appNativeShare').addEventListener('click', async () => {
    if (!navigator.share) {
      status.textContent = 'انسخ الرابط أو اختر المشاركة عبر واتساب.';
      urlField.focus(); urlField.select();
      return;
    }
    try { await navigator.share({title: 'دفتر القسم الذكي', text: message, url: appURL}); }
    catch (error) {
      if (error.name !== 'AbortError') status.textContent = 'تعذرت المشاركة. يمكنك نسخ الرابط أدناه.';
    }
  });
  document.getElementById('appCopyLink').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(appURL);
      status.textContent = 'تم نسخ رابط التطبيق. يمكنك إرساله إلى زملائك.';
    } catch (_) {
      urlField.focus(); urlField.select();
      status.textContent = 'اضغط مطولًا على الرابط المحدد واختر «نسخ».';
    }
  });
  document.getElementById('appStartClasses').addEventListener('click', () => {
    dialog.close();
    document.querySelector('#nav [data-view="classes"]')?.click();
    document.querySelector('#view h2')?.setAttribute('tabindex', '-1');
    document.querySelector('#view h2')?.focus();
  });
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    updateInstallButtons();
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    updateInstallButtons();
    status.textContent = 'تم تثبيت التطبيق. ستجده على شاشة جهازك.';
  });
  standalone.addEventListener?.('change', updateInstallButtons);
  updateInstallButtons();
})();
