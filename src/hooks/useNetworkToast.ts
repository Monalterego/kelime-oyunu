import { useEffect, useRef } from "react";
import { ToastAndroid, Platform, Alert } from "react-native";
import NetInfo from "@react-native-community/netinfo";

export function useNetworkToast() {
  const wasConnected = useRef<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected && state.isInternetReachable !== false;

      if (wasConnected.current === null) {
        wasConnected.current = isConnected;
        return;
      }

      if (!isConnected && wasConnected.current) {
        if (Platform.OS === "android") {
          ToastAndroid.show("İnternet bağlantısı yok", ToastAndroid.LONG);
        } else {
          Alert.alert("Bağlantı Yok", "İnternet bağlantısı olmadan skorlar kaydedilemez ve liderboard görüntülenemez.");
        }
      }

      wasConnected.current = isConnected;
    });

    return unsubscribe;
  }, []);
}
