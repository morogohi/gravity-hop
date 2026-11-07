@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Google Play 업로드 키 생성 (한 번만). 생성된 .jks 파일과 비밀번호는 절대 잃어버리면 안 됩니다 - 백업하세요.
set "KT=keytool"
if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\keytool.exe" set "KT=%ProgramFiles%\Android\Android Studio\jbr\bin\keytool.exe"
if exist orbit-hop-upload.jks (echo 이미 orbit-hop-upload.jks 가 있습니다. & pause & exit /b 0)
"%KT%" -genkeypair -v -keystore orbit-hop-upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
if errorlevel 1 (pause & exit /b 1)
copy /y android\keystore.properties.example android\keystore.properties >nul
echo.
echo 생성 완료. android\keystore.properties 를 열어 CHANGE_ME 두 곳에 방금 입력한 비밀번호를 넣은 뒤
echo build-android.bat release 를 실행하면 Play 업로드용 AAB가 만들어집니다.
pause
