import { defaultLocation } from "../services/mapService.js";

const { useCallback, useEffect, useRef, useState } = window.React;

export function useCurrentLocation() {
  const watchIdRef = useRef(null);
  const hasResolvedLocationRef = useRef(false);
  const [location, setLocation] = useState({ ...defaultLocation, isFallback: true });
  const [status, setStatus] = useState({
    tone: "loading",
    message: "현재 위치를 확인하는 중입니다.",
  });

  const applyPosition = useCallback((position) => {
    hasResolvedLocationRef.current = true;
    setLocation({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      label: "현재 위치",
      isFallback: false,
    });
    setStatus({
      tone: "ready",
      message: "현재 위치를 기준으로 주변 장소를 추천합니다.",
    });
  }, []);

  const handleLocationError = useCallback(() => {
    if (!hasResolvedLocationRef.current) {
      setLocation({ ...defaultLocation, isFallback: true });
    }
    setStatus({
      tone: "warning",
      message: "위치 권한이 필요합니다. 현재 위치를 허용해야 주변 추천을 볼 수 있습니다.",
    });
  }, []);

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      handleLocationError();
      return;
    }

    setStatus({
      tone: "loading",
      message: "현재 위치를 확인하는 중입니다.",
    });

    navigator.geolocation.getCurrentPosition(applyPosition, handleLocationError, getLocationOptions());
  }, [applyPosition, handleLocationError]);

  useEffect(() => {
    if (!navigator.geolocation) {
      handleLocationError();
      return undefined;
    }

    setStatus({
      tone: "loading",
      message: "현재 위치를 확인하는 중입니다.",
    });

    watchIdRef.current = navigator.geolocation.watchPosition(
      applyPosition,
      handleLocationError,
      getLocationOptions()
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [applyPosition, handleLocationError]);

  return { location, status, locate };
}

function getLocationOptions() {
  return {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
  };
}
