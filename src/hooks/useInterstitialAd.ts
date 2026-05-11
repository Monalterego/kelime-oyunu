import { useEffect, useRef } from "react";

let InterstitialAd: any, AdEventType: any, TestIds: any;
try {
  const ads = require("react-native-google-mobile-ads");
  InterstitialAd = ads.InterstitialAd;
  AdEventType = ads.AdEventType;
  TestIds = ads.TestIds;
} catch {
  // Native module not available (Expo Go)
}

export function useInterstitialAd(adUnitId: string) {
  const adRef = useRef<InterstitialAd | null>(null);
  const loadedRef = useRef(false);
  const dismissUnsubRef = useRef<(() => void) | null>(null);

  const id = (__DEV__ && TestIds) ? TestIds.INTERSTITIAL : adUnitId;

  useEffect(() => {
    if (!InterstitialAd) return;
    const ad = InterstitialAd.createForAdRequest(id, { requestNonPersonalizedAdsOnly: true });
    adRef.current = ad;

    const unsubLoaded = ad.addAdEventListener(AdEventType.LOADED, () => {
      loadedRef.current = true;
    });
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      loadedRef.current = false;
      ad.load();
    });
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      loadedRef.current = false;
    });

    ad.load();

    return () => {
      unsubLoaded();
      unsubClosed();
      unsubError();
      dismissUnsubRef.current?.();
    };
  }, [id]);

  const showAd = (onDismiss?: () => void) => {
    if (!loadedRef.current || !adRef.current) {
      onDismiss?.();
      return;
    }
    // Clean up any previous dismiss listener before adding new one
    dismissUnsubRef.current?.();
    dismissUnsubRef.current = null;

    if (onDismiss) {
      dismissUnsubRef.current = adRef.current.addAdEventListener(AdEventType.CLOSED, () => {
        dismissUnsubRef.current?.();
        dismissUnsubRef.current = null;
        onDismiss();
      });
    }
    adRef.current.show();
  };

  return { showAd };
}
