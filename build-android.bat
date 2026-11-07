@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"
echo.
echo  ===  궤도 점프 Android 빌드  ===
echo.

rem ---- 1. Node.js ----
where node >nul 2>nul || (echo [오류] Node.js가 없습니다. https://nodejs.org 에서 LTS 설치 후 다시 실행하세요. & pause & exit /b 1)

rem ---- 2. Android SDK ----
set "SDK=%ANDROID_HOME%"
if not defined SDK if exist "%LOCALAPPDATA%\Android\Sdk" set "SDK=%LOCALAPPDATA%\Android\Sdk"
if not defined SDK if exist "%USERPROFILE%\Android\Sdk" set "SDK=%USERPROFILE%\Android\Sdk"
if not defined SDK if exist "%USERPROFILE%\Android" if exist "%USERPROFILE%\Android\platform-tools" set "SDK=%USERPROFILE%\Android"
if not defined SDK (echo [오류] Android SDK를 찾지 못했습니다. Android Studio를 한 번 실행해 SDK를 설치하세요. & pause & exit /b 1)
echo  SDK : %SDK%
set "SDKF=%SDK:\=/%"
> android\local.properties echo sdk.dir=%SDKF%

rem ---- 3. Java: full JDK 21~24 (Capacitor 8 needs 21+, Gradle 8.14 runs on <=24) ----
call :findjdk
if not defined JDK21 (
  echo.
  echo  빌드에 필요한 JDK 21 이 없습니다 ^(IDE 내장 런타임은 jlink 가 없어 사용 불가^). JDK 21 ^(Temurin^)을 지금 설치할까요?
  choice /c YN /m " 설치"
  if errorlevel 2 (echo  설치 명령: winget install EclipseAdoptium.Temurin.21.JDK & pause & exit /b 1)
  winget install --id EclipseAdoptium.Temurin.21.JDK -e --accept-package-agreements --accept-source-agreements
  call :findjdk
)
if not defined JDK21 (echo [오류] JDK 21 을 찾지 못했습니다. 설치 후 새 명령창에서 다시 실행하세요. & pause & exit /b 1)
set "JAVA_HOME=%JDK21%"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo  사용할 JAVA: %JAVA_HOME%
echo.
rem 다른 Java 로 떠 있던 Gradle 데몬 정리
if exist android\gradlew.bat (pushd android & call gradlew.bat --stop >nul 2>nul & popd)

rem ---- 4. 의존성 + 동기화 ----
call npm install || (echo [오류] npm install 실패 & pause & exit /b 1)
call npx cap sync android || (echo [오류] cap sync 실패 & pause & exit /b 1)

rem ---- 5. 빌드 ----
cd android
set "TASK=assembleDebug"
if /i "%1"=="release" set "TASK=bundleRelease"
call gradlew.bat %TASK% "-Dorg.gradle.java.home=%JAVA_HOME%" || (echo [오류] Gradle 빌드 실패 - 위 로그를 확인하세요. & cd .. & pause & exit /b 1)
cd ..

if /i "%1"=="release" (
  copy /y android\app\build\outputs\bundle\release\app-release.aab orbit-hop-release.aab >nul
  echo.
  echo  [완료] orbit-hop-release.aab  ^(Google Play Console에 업로드^)
) else (
  copy /y android\app\build\outputs\apk\debug\app-debug.apk orbit-hop-debug.apk >nul
  echo.
  echo  [완료] orbit-hop-debug.apk
  rem ---- 6. 폰이 USB 디버깅으로 연결돼 있으면 바로 설치 ----
  if exist "%SDK%\platform-tools\adb.exe" (
    for /f "skip=1 tokens=1,2" %%a in ('"%SDK%\platform-tools\adb.exe" devices') do if "%%b"=="device" set "PHONE=%%a"
    if defined PHONE (
      echo  폰^(!PHONE!^)에 설치 중...
      "%SDK%\platform-tools\adb.exe" install -r orbit-hop-debug.apk && "%SDK%\platform-tools\adb.exe" shell monkey -p com.orbithop.game 1 >nul
    ) else (
      echo  폰 미연결: APK 파일을 폰으로 옮겨 설치하거나, USB 디버깅을 켜고 다시 실행하세요.
    )
  )
)
echo.
pause
goto :eof

:findjdk
set "JDK21="
for /f "usebackq delims=" %%j in (`node tools\find-jdk.js`) do set "JDK21=%%j"
exit /b 0
