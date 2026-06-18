import { defaultLocation } from "../services/mapService.js";

const { useCallback, useEffect, useRef, useState } = window.React;

export function useCurrentLocation() {
  const watchIdRef = useRef(null);
  const hasResolvedLocationRef = useRef(false);
  const lastLocationRef = useRef(null);
  const statusToneRef = useRef("loading");
  const [location, setLocation] = useState({ ...defaultLocation, isFallback: true });
  const [status, setStatus] = useState({
    tone: "loading",
    message: "현재 위치를 확인하는 중입니다.",
  });

  const applyPosition = useCallback((position) => {
    const nextLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
      label: "현재 위치",
      isFallback: false,
    };
    const previousLocation = lastLocationRef.current;
    const movedMeters = previousLocation ? getDistanceMeters(previousLocation, nextLocation) : Infinity;
    const accuracyChanged = Math.abs(Number(previousLocation?.accuracy || 0) - Number(nextLocation.accuracy || 0)) >= 15;
    const shouldUpdateLocation = !previousLocation || movedMeters >= 8 || accuracyChanged;

    hasResolvedLocationRef.current = true;
    if (shouldUpdateLocation) {
      lastLocationRef.current = nextLocation;
      setLocation(nextLocation);
    }
    if (statusToneRef.current !== "ready") {
      statusToneRef.current = "ready";
      setStatus({
        tone: "ready",
        message: "현재 위치를 기준으로 주변 장소를 추천합니다.",
      });
    }
  }, []);

  const handleLocationError = useCallback(() => {
    if (!hasResolvedLocationRef.current) {
      setLocation({ ...defaultLocation, isFallback: true });
    }
    setStatus({
      tone: "warning",
      message: "위치 권한이 필요합니다. 현재 위치를 허용해야 주변 추천을 볼 수 있습니다.",
    });
    statusToneRef.current = "warning";
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
    statusToneRef.current = "loading";

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
    statusToneRef.current = "loading";

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

function getDistanceMeters(a, b) {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(Number(b.lat) - Number(a.lat));
  const dLng = toRadians(Number(b.lng) - Number(a.lng));
  const lat1 = toRadians(Number(a.lat));
  const lat2 = toRadians(Number(b.lat));
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(h));
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function getLocationOptions() {
  return {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000,
  };
}
