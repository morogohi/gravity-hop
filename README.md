# 그래비티 홉 · GRAVITY HOP (v2.0) — iOS/Android 앱 프로젝트

> v2.0에서 「궤도 점프」를 차별화해 이름을 바꿨습니다. 중력으로 휘는 비행, 예상 궤적 표시, 블랙홀 슬링샷, 웜홀, 소행성, 특수 행성(역회전·펄서·거대 행성), 비행 중 부스트, 하이퍼드라이브(PERFECT 5연속), 데일리 챌린지(전원 같은 맵 + 내 최고 기록 고스트), 일일 미션 3종을 넣었습니다.
> `store/` 스크린샷은 v1 화면이라 출시 전에 다시 만들어야 합니다.

원탭 하이퍼캐주얼 게임을 Capacitor 8로 감싼 앱 프로젝트입니다. AdMob 광고(보상형·전면)가 붙어 있습니다.

| 항목 | 값 |
|---|---|
| 앱 ID(번들 ID) | `com.orbithop.game` ← **출시 전에 본인 도메인으로 바꾸세요** |
| 프레임워크 | Capacitor 8.6 (iOS 15+, Android API 24+) |
| 광고 | `@capacitor-community/admob` 8.3 (Google Mobile Ads SDK 포함) |
| 화면 | 세로 고정 |

## 폴더 구조

```
www/            게임 본체 (index.html) + 광고 모듈 (ads.js)
android/        Android Studio 프로젝트
ios/            Xcode 프로젝트 (Swift Package Manager 사용, CocoaPods 불필요)
assets/         아이콘·스플래시 원본 (1024 / 2732px)
capacitor.config.json
```

## 자동화 스크립트 요약

| 파일 | 하는 일 |
|---|---|
| `release-config.json` + `configure.bat` | 앱 ID, 버전, AdMob ID 7개, 개발자명·이메일을 입력하면 Android/iOS/웹/개인정보처리방침 전체 파일에 반영(앱 ID를 바꾸면 Android 패키지 폴더도 이동). 다시 실행해도 안전 |
| `make-keystore.bat` | Play 업로드 키 생성(최초 1회) |
| `build-android.bat` / `build-android.bat release` | 디버그 APK(폰 자동 설치) / Play 업로드용 AAB |
| `prepare-ios.bat` | 클라우드 Mac으로 옮길 `orbit-hop-ios.zip` 생성(iOS 프로젝트 + AdMob 플러그인 + 업로드 스크립트 + API 키) |
| `mac-build-upload.sh` | 클라우드 Mac 터미널에서 `bash mac-build-upload.sh` 한 줄로 Xcode 버전 확인, Archive, 자동 서명, App Store Connect 업로드 |
| `codemagic.yaml` | (선택) Mac 없이 Codemagic에서 빌드·TestFlight 업로드 |

iOS 업로드에는 App Store Connect API 키(**Admin** 권한, `AuthKey_XXXX.p8`)와 `ios-upload.env`(Team ID, Key ID, Issuer ID; `ios-upload.env.example` 복사)가 필요합니다.

## 0. 가장 빠른 길 (Windows)

1. Android Studio를 한 번 실행해 SDK 설치를 끝냅니다(이미 했다면 생략).
2. 폰에서 개발자 옵션 → **USB 디버깅**을 켜고 PC에 연결합니다.
3. **`build-android.bat`를 더블클릭**합니다. SDK/JDK 자동 탐색 → 설치 → 빌드 → `orbit-hop-debug.apk` 생성 → 폰에 자동 설치·실행까지 진행됩니다.

Play 스토어 업로드용 AAB가 필요하면:

1. `make-keystore.bat`로 업로드 키를 만듭니다(한 번만 하고 **.jks 파일과 비밀번호는 꼭 백업**하세요).
2. `android\keystore.properties`에 비밀번호를 넣습니다.
3. 명령창에서 `build-android.bat release`를 실행하면 `orbit-hop-release.aab`가 만들어집니다.

## 0-1. PC 없이 클라우드 빌드 (GitHub Actions)

`.github/workflows/android.yml`이 들어 있어서, GitHub에 push만 하면 자동으로 빌드됩니다.

```bash
git init && git add . && git commit -m "ORBIT HOP v1.0"
gh repo create orbit-hop --private --source . --push
```

- 매 push마다 Actions 탭 → 실행 결과 → Artifacts에서 **debug APK**를 받을 수 있습니다.
- 저장소 Secrets에 `ORBIT_KEYSTORE_BASE64`(jks 파일을 base64로 인코딩한 값), `ORBIT_KEYSTORE_PASSWORD`, `ORBIT_KEY_ALIAS`, `ORBIT_KEY_PASSWORD`를 등록하면 **서명된 release AAB**도 같이 나옵니다.

## 0-2. 스토어 등록 자료 (store/, docs/)

| 파일 | 용도 |
|---|---|
| `store/screenshots/ios-6.9/*.png` (1290×2796, 5장) | App Store 6.9" iPhone 스크린샷 |
| `store/screenshots/play-phone/*.png` (1080×1920, 5장) | Google Play 휴대전화 스크린샷 |
| `store/feature-graphic-1024x500.png` | Google Play 그래픽 이미지(필수) |
| `store/play-icon-512.png`, `store/icon-1024.png` | Play 아이콘 / App Store 아이콘 |
| `docs/privacy-policy.html` | 개인정보처리방침(한/영). `[개발자명]`, `[연락처 이메일]`을 채워 쓰세요 |
| `docs/index.html`, `docs/play.html` | 소개 페이지와 웹 플레이 버전 |
| `docs/app-ads.txt` | AdMob 판매자 인증용. **개발자 웹사이트 도메인의 루트**에 올려야 합니다 |

GitHub 저장소 Settings → Pages → Branch `main` / 폴더 `/docs`로 설정하면 `https://<아이디>.github.io/orbit-hop/privacy-policy.html`이 개인정보처리방침 URL이 됩니다.

## 1. 처음 설치

```bash
npm install
npx cap sync
```

## 2. 실행

**Android** — Android Studio(최신) 필요

```bash
npm run android        # Android Studio가 열림 → ▶ Run
```

**iOS** — macOS + Xcode 16 이상 필요

```bash
npm run ios            # Xcode가 열림 → Signing & Capabilities에서 Team 선택 → ▶ Run
```

지금은 **Google 테스트 광고 ID**가 들어 있어서, 실기기에서 "Test Ad" 표시가 붙은 광고가 나오면 정상입니다.

게임 코드(`www/`)를 고친 뒤에는 `npx cap sync`를 실행해야 앱에 반영됩니다.

## 2-1. 사운드 & 저장 (v1.1)

- **배경음악**: 음원 파일 없이 Web Audio로 실시간 합성합니다(A단조 Am–F–C–G, 96 BPM). 메뉴에서는 패드와 베이스만 깔리고, 플레이를 시작하면 아르페지오가, 10점부터는 드럼이 더해지고, 30점부터는 아르페지오가 16분음표로 빨라집니다. 저작권 문제가 없고 앱 용량도 늘지 않습니다.
- **효과음**: 발사, 착지, PERFECT 벨(콤보마다 음이 올라감), SKIP, 코인, 콤보 5·10 달성, 25점 돌파, 신기록, 사망, 부활, 구매, 버튼 클릭. 모두 배경음악과 같은 조(A단조 펜타토닉)라 겹쳐도 어울립니다.
- **화면 이펙트**: 착지 충격파 링, 마일스톤 화면 플래시, AMAZING/UNSTOPPABLE 텍스트, 신기록 축하 파티클.
- 우측 상단 🎵/🔊 버튼으로 음악과 효과음을 따로 켜고 끕니다(설정은 저장됨).
- **중간저장**: 행성에 착지할 때마다 자동 저장됩니다. ⏸ 버튼, 홈으로 나가기, 앱 종료 때도 저장되고, 다음 실행 때 메뉴에 "이어서 하기"가 뜹니다. 사망하면 저장이 지워져서, 이어하기를 무료로 쓰는 우회는 막혀 있습니다.

## 3. 광고 구조

| 광고 | 언제 | 위치 |
|---|---|---|
| 보상형(Rewarded) | 게임오버 화면의 "광고 보고 이어하기" (판당 1회) | `www/ads.js` → `Ads.showRewarded()` |
| 전면(Interstitial) | "다시 하기"를 3번 누를 때마다 1회. 그 판에서 보상형 광고를 이미 봤다면 건너뜀 | `Ads.showInterstitial()` |

- 시작할 때 iOS는 ATT(추적 허용) 팝업을, EU·영국 사용자는 Google UMP 동의 화면을 띄운 뒤 SDK를 초기화합니다.
- 광고는 미리 로드해 두고, 한 번 보여 주면 바로 다음 광고를 다시 로드합니다.
- 웹 브라우저에서 실행하면 광고 대신 3초짜리 데모 화면이 나옵니다.

## 4. 출시 전 체크리스트

### AdMob
- [ ] [AdMob 콘솔](https://admob.google.com)에서 앱 2개(Android/iOS)를 등록하고 **App ID**를 받습니다.
- [ ] 광고 단위 4개(플랫폼별 보상형 1개, 전면 1개)를 만듭니다.
- [ ] `www/ads.js` 맨 위의 `UNITS`에 내 광고 단위 ID를 넣고 `TESTING = false`로 바꿉니다.
- [ ] `android/app/src/main/res/values/strings.xml`의 `admob_app_id`를 내 Android App ID로 바꿉니다.
- [ ] `ios/App/App/Info.plist`의 `GADApplicationIdentifier`를 내 iOS App ID로 바꿉니다.
- [ ] `Info.plist`의 `SKAdNetworkItems`를 [Google 최신 목록](https://developers.google.com/admob/ios/quick-start#update_your_infoplist)과 대조합니다.
- [ ] AdMob 콘솔 → 개인정보 보호 및 메시지에서 **GDPR 동의 메시지**를 만듭니다. 만들지 않으면 EU에서 광고가 나오지 않습니다.
- [ ] 웹사이트 루트에 `app-ads.txt`를 올립니다(스토어에 등록한 개발자 웹사이트).

### 공통
- [ ] `capacitor.config.json`의 `appId`를 바꾼 뒤 `npx cap sync`를 실행합니다. Android는 `android/app/build.gradle`의 `applicationId`와 `namespace`, iOS는 Xcode의 Bundle Identifier도 같이 바꿉니다.
- [ ] 버전을 올립니다. Android는 `versionCode`/`versionName`, iOS는 Version/Build입니다.
- [ ] 개인정보처리방침 URL을 준비합니다(광고 SDK를 쓰면 필수). 수집 항목은 광고 ID, 기기 정보, 대략적 위치입니다.

### Google Play
- [ ] 업로드 키스토어로 서명한 **AAB**를 빌드합니다(Android Studio → Build → Generate Signed Bundle).
- [ ] 데이터 보안 양식에서 "광고 ID 수집 – 광고 목적"을 표시합니다.
- [ ] 콘텐츠 등급 설문을 작성하고, 광고 포함 여부를 "예"로 표시합니다.
- [ ] 신규 개인 개발자 계정은 **비공개 테스트(테스터 12명, 14일)**를 거쳐야 프로덕션에 출시할 수 있습니다.

### App Store
- [ ] Apple Developer Program에 가입합니다(연 $99).
- [ ] App Privacy에서 "식별자(기기 ID) – 제3자 광고, 추적에 사용"을 표시합니다.
- [ ] Xcode → Product → Archive → App Store Connect에 업로드합니다.
- [ ] 스크린샷을 준비합니다. 6.9" iPhone 화면이 필수입니다.

## 5. 스토어 등록 문구(초안)

**제목:** 궤도 점프 - 원탭 우주 점프 게임
**짧은 설명:** 탭 한 번으로 행성에서 행성으로! 궤도 한가운데로 꽂혀 PERFECT 콤보를 노려 보세요.
**키워드:** 원탭, 하이퍼캐주얼, 우주, 행성, 점프, 타이밍, 아케이드, 중독성, 오프라인, 간단한 게임

## 6. 다음 단계(성장)

1. **CPI 테스트**: 15~30초짜리 플레이 영상으로 Meta/TikTok 광고를 소액(10~20만 원) 집행합니다. 목표 CPI는 $0.3 이하입니다.
2. **분석 도구**: Firebase Analytics를 붙여 D1/D7 리텐션과 평균 플레이 시간, 광고 시청률을 측정합니다.
3. **광고 미디에이션**: AppLovin MAX나 AdMob 미디에이션으로 eCPM을 끌어올립니다.
4. **퍼블리셔 제안**: 지표가 좋으면 Voodoo, Homa, Supersonic의 퍼블리싱 프로그램에 빌드를 제출합니다.
