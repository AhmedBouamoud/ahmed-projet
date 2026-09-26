# Daftr Qismi Release Checklist

Development branch: `daftr-qismi-dev`
Production branch: `gh-pages`
Production path: `/daftr-qismi-v3/`

A change MUST NOT be promoted to production until all checks below pass.

## 1. Static checks
- JavaScript syntax check for the complete bundle.
- Service Worker syntax check.
- Manifest JSON validation.
- All referenced files exist.
- No HTML response is referenced as JavaScript/CSS.
- No stale version query remains in index.html.

## 2. Startup checks
- App loads with no startup error.
- No console-level module warning is expected.
- Dashboard renders.
- Existing localStorage remains readable.

## 3. Mobile navigation checks
- Menu opens from hamburger.
- Menu closes after selecting an item.
- Menu closes when tapping outside.
- Menu closes on Escape/back behavior where available.
- Page scrolling is restored after closing.
- Overlay does not block the app when hidden.

## 4. PWA / cache checks
- Service Worker cache version is changed for a release.
- Only successful responses are cached.
- JS requests never fall back to index.html.
- Offline shell contains the current bundle/styles/manifest.
- Old caches are deleted during activate.

## 5. Feature smoke tests
- Create class.
- Add student.
- Attendance save.
- Grade save.
- Note save.
- Homework save.
- Student profile opens.
- Planner opens.
- Backup export works.
- Cloud page opens without blocking startup.

## 6. Release rule
Only after all checks pass:
1. Promote tested commit to `gh-pages`.
2. Wait for GitHub Pages deployment conclusion = success.
3. Verify production files and version markers.
4. Then send the production link to the user.
