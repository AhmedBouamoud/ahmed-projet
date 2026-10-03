# OSTAD — بوابة الأستاذ الذكية (v0.4.4)

تطبيق ويب قابل للتثبيت على الهاتف، يعمل دون إنترنت بعد أول فتح.

## محتوى المجلد

| الملف | دوره |
|---|---|
| `index.html` | التطبيق كاملًا |
| `manifest.webmanifest` | الاسم والأيقونة للتثبيت على الشاشة الرئيسية |
| `sw.js` | العمل دون إنترنت |
| `icons/` | أيقونات التطبيق |

---

## الرابط

التطبيق منشور على GitHub Pages داخل مستودع `ahmed-projet` (فرع `gh-pages`، مجلد `ostad/`):

**https://ahmedbouamoud.github.io/ahmed-projet/ostad/**

افتح الرابط على هاتفك ← زر **📲 تثبيت** أعلى الصفحة (أو قائمة Chrome ← «إضافة إلى الشاشة الرئيسية»).

## الخطوة 1 — نقل بياناتك من النسخة القديمة ⚠️

النسخة المنشورة لا ترى بيانات الملف الذي كنت تفتحه على الهاتف (لكل منهما ذاكرة منفصلة):

1. افتح **الملف القديم** (v0.4.2 أو أحدث) ← الإعدادات ← **⬇ تصدير نسخة كاملة**.
2. افتح **النسخة المنشورة** ← الإعدادات ← **⬆ استيراد نسخة** واختر الملف.

إذا كانت بياناتك في النسخة v0.4.1، افتح أولًا الملف v0.4.4 في نفس المتصفح (ينقل البيانات تلقائيًا)، ثم صدّر منه.

## الخطوة 2 — ربط Google Drive (مرة واحدة)

1. ادخل إلى console.cloud.google.com ← أنشئ مشروعًا باسم `OSTAD`.
2. **APIs & Services ← Library** ← ابحث عن **Google Drive API** ← **Enable**.
3. **OAuth consent screen**:
   - User type: **External**
   - App name: `OSTAD`، وبريدك في الخانات المطلوبة
   - في **Test users** أضف: `ahmedbouamoud@gmail.com`
4. **Credentials ← Create credentials ← OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: `https://ahmedbouamoud.github.io` (بدون `/ahmed-projet` وبدون `/` في الآخر)
5. انسخ **Client ID** (ينتهي بـ `.apps.googleusercontent.com`).
6. في OSTAD: الإعدادات ← ☁️ Google Drive ← الصق Client ID ← **حفظ** ← **ربط Drive**.

عند أول ربط ستظهر رسالة «Google hasn't verified this app»: هذا طبيعي لأنه تطبيقك الشخصي في وضع الاختبار ← **Continue**.

الصلاحية المطلوبة **قراءة فقط**: OSTAD يبحث في وثائقك ويفتحها، ولا يعدّل أو يحذف شيئًا.

---

## عند كل تحديث لاحق

1. استبدل `ostad/index.html` في فرع `gh-pages` بالنسخة الجديدة.
2. في `ostad/sw.js` غيّر رقم النسخة في السطر الثاني، مثلًا:
   `const CACHE = 'ostad-v0.4.5';`
3. Commit ← GitHub Pages ينشر تلقائيًا خلال دقيقة، والهاتف يأخذ النسخة الجديدة عند الفتح التالي.

---

ذ. أحمد بوعمود — مؤسسة الحنان الخاصة | 2026-2027
