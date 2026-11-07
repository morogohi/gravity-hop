@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
rem 클라우드 Mac으로 옮길 iOS 빌드 패키지(orbit-hop-ios.zip)를 만듭니다.
where node >nul 2>nul || (echo [오류] Node.js가 없습니다. & pause & exit /b 1)
if not exist ios-upload.env (echo [오류] ios-upload.env 가 없습니다. ios-upload.env.example 을 복사해 채우세요. & pause & exit /b 1)
set "P8="
for %%f in (AuthKey_*.p8) do set "P8=%%f"
if not defined P8 (echo [오류] App Store Connect API 키 파일 AuthKey_XXXX.p8 을 이 폴더에 넣어 주세요. & pause & exit /b 1)
call npm install || (pause & exit /b 1)
node tools\configure.js || (pause & exit /b 1)
call npx cap sync ios || (pause & exit /b 1)
if exist orbit-hop-ios.zip del orbit-hop-ios.zip
tar -a -c -f orbit-hop-ios.zip ios node_modules/@capacitor-community mac-build-upload.sh ios-upload.env %P8% || (echo [오류] 압축 실패 & pause & exit /b 1)
echo.
echo [완료] orbit-hop-ios.zip 생성
echo  1) 이 파일을 Google Drive/Dropbox 에 올리고
echo  2) 클라우드 Mac 에서 내려받아 압축을 푼 뒤
echo  3) 터미널에서:  cd ~/Downloads/orbit-hop-ios ^&^& bash mac-build-upload.sh
echo.
echo  주의: zip 안에 API 키(.p8)가 들어 있으니 업로드 후 클라우드 링크는 삭제하세요.
pause
