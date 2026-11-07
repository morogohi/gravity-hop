#!/usr/bin/env node
/*
 * Applies release-config.json to every project file in one go.
 * Safe to re-run: the current app ID is read from capacitor.config.json and replaced.
 *
 *   node tools/configure.js            (or double-click configure.bat on Windows)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const p = (...a) => path.join(ROOT, ...a);
const read = f => fs.readFileSync(p(f), 'utf8');
const write = (f, s) => fs.writeFileSync(p(f), s);
const exists = f => fs.existsSync(p(f));

const cfg = JSON.parse(read('release-config.json'));
const errors = [], warnings = [], changed = [];

// ---------- validate ----------
const APP_ID_RE = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*){2,}$/;
const ADMOB_APP_RE = /^ca-app-pub-\d{16}~\d{10}$/;
const ADMOB_UNIT_RE = /^ca-app-pub-\d{16}\/\d{10}$/;
const PUB_RE = /^pub-\d{16}$/;

if (!APP_ID_RE.test(cfg.appId || '')) errors.push(`appId "${cfg.appId}" 형식 오류 (예: com.mydomain.orbithop)`);
if (cfg.appId === 'com.orbithop.game') warnings.push('appId가 아직 임시값(com.orbithop.game)입니다. 출시 후에는 바꿀 수 없습니다.');
if (!/^\d+(\.\d+){0,2}$/.test(String(cfg.versionName))) errors.push(`versionName "${cfg.versionName}" 형식 오류 (예: 1.1)`);
if (!Number.isInteger(cfg.versionCode) || cfg.versionCode < 1) errors.push('versionCode는 1 이상의 정수여야 합니다.');

const ad = cfg.admob || {};
const units = ['androidRewarded', 'androidInterstitial', 'iosRewarded', 'iosInterstitial'];
const anyAd = ['androidAppId', 'iosAppId', 'publisherId', ...units].some(k => ad[k]);
const allAd = ['androidAppId', 'iosAppId', ...units].every(k => ad[k]);
if (anyAd){
  if (ad.androidAppId && !ADMOB_APP_RE.test(ad.androidAppId)) errors.push('admob.androidAppId 형식 오류 (ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY)');
  if (ad.iosAppId && !ADMOB_APP_RE.test(ad.iosAppId)) errors.push('admob.iosAppId 형식 오류 (ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY)');
  for (const k of units) if (ad[k] && !ADMOB_UNIT_RE.test(ad[k])) errors.push(`admob.${k} 형식 오류 (ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY)`);
  if (ad.publisherId && !PUB_RE.test(ad.publisherId)) errors.push('admob.publisherId 형식 오류 (pub-XXXXXXXXXXXXXXXX)');
  if (!allAd) warnings.push('AdMob ID가 일부만 입력돼 있어 테스트 광고 모드를 유지합니다. 7개 모두 채우면 실제 광고로 전환됩니다.');
} else warnings.push('AdMob ID가 비어 있어 테스트 광고 모드를 유지합니다.');
if (!cfg.developerName || !cfg.contactEmail) warnings.push('developerName/contactEmail이 비어 있어 개인정보처리방침에 반영하지 않았습니다.');

if (errors.length){
  console.error('\n[오류] release-config.json을 고쳐 주세요:\n - ' + errors.join('\n - '));
  process.exit(1);
}

// ---------- apply ----------
function edit(file, fn){
  if (!exists(file)) return;
  const before = read(file), after = fn(before);
  if (after !== before){ write(file, after); changed.push(file); }
}
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const oldId = JSON.parse(read('capacitor.config.json')).appId;
const newId = cfg.appId;
const swapId = s => s.split(oldId).join(newId);

// app ID everywhere
edit('capacitor.config.json', s => swapId(s));
edit('android/app/build.gradle', s => swapId(s)
  .replace(/versionCode \d+/, `versionCode ${cfg.versionCode}`)
  .replace(/versionName "[^"]*"/, `versionName "${cfg.versionName}"`));
edit('android/app/src/main/res/values/strings.xml', s => swapId(s));
edit('ios/App/App.xcodeproj/project.pbxproj', s => swapId(s)
  .replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${cfg.versionName};`)
  .replace(/CURRENT_PROJECT_VERSION = [^;]+;/g, `CURRENT_PROJECT_VERSION = ${cfg.versionCode};`));
edit('codemagic.yaml', s => swapId(s));
edit('build-android.bat', s => swapId(s));
edit('package.json', s => s.replace(/"version": "[^"]*"/, `"version": "${cfg.versionName.split('.').concat(['0','0']).slice(0,3).join('.')}"`));

// Android: MainActivity must live in a folder that matches the package name
if (oldId !== newId){
  const oldDir = p('android/app/src/main/java', ...oldId.split('.'));
  const newDir = p('android/app/src/main/java', ...newId.split('.'));
  const oldFile = path.join(oldDir, 'MainActivity.java');
  if (fs.existsSync(oldFile)){
    fs.mkdirSync(newDir, { recursive: true });
    const src = fs.readFileSync(oldFile, 'utf8').replace(new RegExp(`^package ${esc(oldId)};`, 'm'), `package ${newId};`);
    fs.writeFileSync(path.join(newDir, 'MainActivity.java'), src);
    try { fs.unlinkSync(oldFile); } catch(e){ warnings.push(`기존 ${path.relative(ROOT, oldFile)} 를 지우지 못했습니다. 직접 삭제하세요.`); }
    // remove now-empty parent folders
    let d = oldDir; const javaRoot = p('android/app/src/main/java');
    while (d.startsWith(javaRoot) && d !== javaRoot){ try { fs.rmdirSync(d); } catch(e){ break; } d = path.dirname(d); }
    changed.push(path.relative(ROOT, path.join(newDir, 'MainActivity.java')));
  }
}

// AdMob
if (ad.androidAppId) edit('android/app/src/main/res/values/strings.xml', s =>
  s.replace(/(<string name="admob_app_id">)[^<]*(<\/string>)/, `$1${ad.androidAppId}$2`));
if (ad.iosAppId) edit('ios/App/App/Info.plist', s =>
  s.replace(/(<key>GADApplicationIdentifier<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${ad.iosAppId}$2`));
if (allAd) edit('www/ads.js', s => s
  .replace(/const TESTING = (true|false);/, 'const TESTING = false;')
  .replace(/(android: \{\s*rewarded:\s*')[^']*(')/, `$1${ad.androidRewarded}$2`)
  .replace(/(android: \{[\s\S]*?interstitial:\s*')[^']*(')/, `$1${ad.androidInterstitial}$2`)
  .replace(/(ios: \{\s*rewarded:\s*')[^']*(')/, `$1${ad.iosRewarded}$2`)
  .replace(/(ios: \{[\s\S]*?interstitial:\s*')[^']*(')/, `$1${ad.iosInterstitial}$2`));
if (ad.publisherId) edit('docs/app-ads.txt', s => s.replace(/^(google\.com, )pub-[X\d]{16}/m, `$1${ad.publisherId}`));

// privacy policy
if (cfg.developerName && cfg.contactEmail) edit('docs/privacy-policy.html', s => s
  .split('[개발자명]').join(cfg.developerName).split('[Developer name]').join(cfg.developerName)
  .split('[연락처 이메일]').join(cfg.contactEmail).split('[contact email]').join(cfg.contactEmail));

// web copies used by GitHub Pages
if (exists('docs/ads.js')) fs.copyFileSync(p('www/ads.js'), p('docs/ads.js'));

// ---------- report ----------
console.log('\n=== 그래비티 홉 출시 설정 적용 ===');
console.log(` 앱 ID     : ${oldId === newId ? newId : oldId + ' → ' + newId}`);
console.log(` 버전      : ${cfg.versionName} (Android versionCode / iOS Build ${cfg.versionCode})`);
console.log(` 광고 모드 : ${allAd ? '실제 광고' : '테스트 광고'}`);
console.log(` 바뀐 파일 : ${changed.length ? '\n   - ' + [...new Set(changed)].join('\n   - ') : '없음'}`);
if (warnings.length) console.log('\n[확인 필요]\n - ' + warnings.join('\n - '));
console.log('\n다음: npx cap sync  (configure.bat는 자동으로 실행합니다)\n');
