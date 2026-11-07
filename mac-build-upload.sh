#!/bin/bash
# One-command iOS archive + App Store Connect upload (run on the cloud Mac).
#   bash mac-build-upload.sh
# Needs: Xcode 26+, ios-upload.env, AuthKey_<KEYID>.p8 in this folder,
#        and the app record already created in App Store Connect.
set -euo pipefail
cd "$(dirname "$0")"

say(){ printf '\n\033[1;35m▶ %s\033[0m\n' "$*"; }
die(){ printf '\n\033[1;31m✖ %s\033[0m\n' "$*"; exit 1; }

[ -f ios-upload.env ] || die "ios-upload.env 가 없습니다."
# shellcheck disable=SC1091
source ./ios-upload.env
for v in TEAM_ID ASC_KEY_ID ASC_ISSUER_ID; do
  [ -n "${!v:-}" ] && [[ "${!v}" != *XXXX* ]] || die "ios-upload.env 의 $v 를 채워 주세요."
done
KEY_PATH="$PWD/AuthKey_${ASC_KEY_ID}.p8"
[ -f "$KEY_PATH" ] || die "API 키 파일 AuthKey_${ASC_KEY_ID}.p8 이 없습니다."

say "Xcode 버전 확인"
XV=$(xcodebuild -version | head -1 | awk '{print $2}')
echo "Xcode $XV"
[ "${XV%%.*}" -ge 26 ] || die "Xcode 26 이상이 필요합니다 (2026-04-28부터 App Store 업로드 필수). App Store 에서 Xcode 를 업데이트하세요."

AUTH=(-allowProvisioningUpdates
      -authenticationKeyPath "$KEY_PATH"
      -authenticationKeyID "$ASC_KEY_ID"
      -authenticationKeyIssuerID "$ASC_ISSUER_ID")

BUILD_NUMBER=$(date +%y%m%d%H%M)   # always increases, never reused
VERSION=$(grep -m1 'MARKETING_VERSION' ios/App/App.xcodeproj/project.pbxproj | sed 's/.*= \(.*\);/\1/')
BUNDLE_ID=$(grep -m1 'PRODUCT_BUNDLE_IDENTIFIER' ios/App/App.xcodeproj/project.pbxproj | sed 's/.*= \(.*\);/\1/')
echo "App: $BUNDLE_ID  Version: $VERSION  Build: $BUILD_NUMBER"

rm -rf build && mkdir -p build

say "1/2 Archive (서명 인증서·프로파일은 Apple 에서 자동 생성)"
xcodebuild archive \
  -project ios/App/App.xcodeproj \
  -scheme App \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath build/App.xcarchive \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CODE_SIGN_STYLE=Automatic \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  "${AUTH[@]}" | tee build/archive.log | grep -E '^(\*\*|error:|warning: .*sign)' || true
[ -d build/App.xcarchive ] || die "Archive 실패 — build/archive.log 를 확인하세요."

cat > build/ExportOptions.plist <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>teamID</key><string>${TEAM_ID}</string>
  <key>signingStyle</key><string>automatic</string>
  <key>uploadSymbols</key><true/>
  <key>manageAppVersionAndBuildNumber</key><false/>
</dict></plist>
PLIST

say "2/2 App Store Connect 업로드"
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportOptionsPlist build/ExportOptions.plist \
  -exportPath build/export \
  "${AUTH[@]}" | tee build/upload.log | grep -E '^(\*\*|error:)|Upload|upload' || true
grep -q "EXPORT SUCCEEDED" build/upload.log || die "업로드 실패 — build/upload.log 를 확인하세요."

say "완료! 버전 $VERSION ($BUILD_NUMBER) 업로드됨"
echo "10~30분 뒤 App Store Connect > TestFlight 에 빌드가 나타납니다."
echo "작업이 끝나면 이 Mac 에서 파일을 지우고 서버를 삭제하세요:  rm -rf \"$PWD\""
