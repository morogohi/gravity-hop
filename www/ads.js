/*
 * Ads.js — AdMob wrapper for ORBIT HOP (Capacitor + @capacitor-community/admob v8)
 *
 * - In the browser (no native runtime) every call is a no-op and Ads.isNative is false,
 *   so the game falls back to its built-in demo ad screen.
 * - In the iOS/Android app it handles: ATT prompt (iOS) → UMP consent (GDPR) → SDK init
 *   → preload rewarded + interstitial → show on demand → preload the next one.
 *
 * BEFORE RELEASE: replace the TEST ad unit IDs below with your own from the AdMob console
 * and set TESTING = false. (App IDs go in AndroidManifest/strings.xml and Info.plist.)
 */
(function () {
  const TESTING = true;

  // Google's official demo ad unit IDs (safe to use during development).
  const UNITS = {
    android: {
      rewarded:     'ca-app-pub-3940256099942544/5224354917',
      interstitial: 'ca-app-pub-3940256099942544/1033173712'
    },
    ios: {
      rewarded:     'ca-app-pub-3940256099942544/1712485313',
      interstitial: 'ca-app-pub-3940256099942544/4411468910'
    }
  };

  // Requires capacitor.js (Capacitor core) to be loaded first: it provides Capacitor.registerPlugin.
  const Cap = window.Capacitor;
  let isNative = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const platform = isNative ? Cap.getPlatform() : 'web';
  let AdMob = null, lastError = '';
  if (isNative){
    try {
      AdMob = typeof Cap.registerPlugin === 'function' ? Cap.registerPlugin('AdMob') : (Cap.Plugins && Cap.Plugins.AdMob);
      if (!AdMob) throw new Error('AdMob plugin not found');
    } catch (e){ lastError = String(e && e.message || e); console.error('[Ads] plugin unavailable', e); isNative = false; }
  }
  const ids = UNITS[platform] || {};

  let ready = false, canRequest = true;
  let rewardedLoaded = false, interLoaded = false;
  let rewardEarned = false, rewardResolve = null;

  async function preloadRewarded() {
    if (!ready || !canRequest || rewardedLoaded) return;
    try { await AdMob.prepareRewardVideoAd({ adId: ids.rewarded, isTesting: TESTING }); rewardedLoaded = true; }
    catch (e) { rewardedLoaded = false; lastError = 'rewarded: ' + (e && e.message || e); setTimeout(preloadRewarded, 30000); }
  }
  async function preloadInterstitial() {
    if (!ready || !canRequest || interLoaded) return;
    try { await AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting: TESTING }); interLoaded = true; }
    catch (e) { interLoaded = false; lastError = 'interstitial: ' + (e && e.message || e); setTimeout(preloadInterstitial, 30000); }
  }

  async function init() {
    if (!isNative || ready) return Promise.resolve();
    try {
      // iOS 14.5+: App Tracking Transparency prompt (must come before ad requests)
      if (platform === 'ios') {
        try {
          const st = await AdMob.trackingAuthorizationStatus();
          if (st.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
        } catch (e) {}
      }
      // Google UMP consent (EEA/UK users). Not required elsewhere — form only shows when needed.
      try {
        let info = await AdMob.requestConsentInfo();
        if (info.status === 'REQUIRED' && info.isConsentFormAvailable) info = await AdMob.showConsentForm();
        canRequest = info.canRequestAds !== false;
      } catch (e) {}

      await AdMob.initialize({ initializeForTesting: TESTING });
      ready = true;

      AdMob.addListener('onRewardedVideoAdReward', () => { rewardEarned = true; });
      AdMob.addListener('onRewardedVideoAdDismissed', () => {
        rewardedLoaded = false;
        if (rewardResolve) { rewardResolve(rewardEarned); rewardResolve = null; }
        preloadRewarded();
      });
      AdMob.addListener('onRewardedVideoAdFailedToShow', () => {
        rewardedLoaded = false;
        if (rewardResolve) { rewardResolve(false); rewardResolve = null; }
        preloadRewarded();
      });
      AdMob.addListener('onInterstitialAdDismissed', () => { interLoaded = false; preloadInterstitial(); });
      AdMob.addListener('onInterstitialAdFailedToShow', () => { interLoaded = false; preloadInterstitial(); });

      preloadRewarded(); preloadInterstitial();
    } catch (e) {
      console.warn('[Ads] init failed', e);
    }
  }

  /** Shows a rewarded ad. Resolves true only if the user earned the reward. */
  function showRewarded() {
    if (!isNative || !ready || !rewardedLoaded) { preloadRewarded(); return Promise.resolve(false); }
    rewardEarned = false;
    return new Promise(resolve => {
      rewardResolve = resolve;
      AdMob.showRewardVideoAd().catch(() => {
        if (rewardResolve) { rewardResolve(false); rewardResolve = null; }
        rewardedLoaded = false; preloadRewarded();
      });
    });
  }

  /** Shows an interstitial if one is loaded. Resolves when it is closed (or immediately if none). */
  function showInterstitial() {
    if (!isNative || !ready || !interLoaded) { preloadInterstitial(); return Promise.resolve(false); }
    return new Promise(resolve => {
      let done = false;
      const finish = v => { if (!done) { done = true; resolve(v); } };
      AdMob.addListener('onInterstitialAdDismissed', () => finish(true)).then(h => setTimeout(() => h.remove(), 120000));
      AdMob.showInterstitial().catch(() => finish(false));
      setTimeout(() => finish(false), 60000);
    });
  }

  function status(){
    if (!isNative) return lastError ? '연결 실패 (' + lastError + ')' : '웹 데모';
    if (!ready) return lastError ? '초기화 실패 (' + lastError + ')' : '초기화 중…';
    return `${TESTING ? '테스트 광고' : '실제 광고'} · 보상형 ${rewardedLoaded ? '준비됨' : '로딩 중'} · 전면 ${interLoaded ? '준비됨' : '로딩 중'}` + (lastError ? ` · 오류: ${lastError}` : '');
  }

  window.Ads = {
    isNative, platform, init, showRewarded, showInterstitial, status,
    rewardedReady: () => isNative && ready && rewardedLoaded
  };
})();
