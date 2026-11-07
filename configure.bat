@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem release-config.json 내용을 프로젝트 전체에 반영합니다.
where node >nul 2>nul || (echo [오류] Node.js가 없습니다. https://nodejs.org 에서 LTS 설치 후 다시 실행하세요. & pause & exit /b 1)
if not exist node_modules call npm install
node tools\configure.js || (pause & exit /b 1)
call npx cap sync
echo.
echo [완료] 설정이 반영되었습니다.
pause
