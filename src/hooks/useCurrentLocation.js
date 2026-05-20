import { defaultLocation } from "../services/mapService.js";

const { useCallback, useEffect, useRef, useState } = window.React;

export function useCurrentLocation() {
  const watchIdRef = useRef(null);
  const [location, setLocation] = useState(defaultLocation);
  const [status, setStatus] = useState({
    tone: "loading",
    message: "현재 위치를 확인하는 중입니다.",
  });

  const applyPosition = useCallback((position) => {
    setLocation({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      label: "현재 위치",
    });
    setStatus({
      tone: "ready",
      message: "현재 위치를 실시간으로 지도에 표시합니다.",
    });
  }, []);

  const handleLocationError = useCallback(() => {
    setLocation(defaultLocation);
    setStatus({
      tone: "warning",
      message: "위치 권한이 없어 기본 위치를 표시합니다.",
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

    navigator.geolocation.getCurrentPosition(
      applyPosition,
      handleLocationError,
      getLocationOptions()
    );
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
