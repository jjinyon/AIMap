import { defaultLocation } from "../services/mapService.js";

const { useCallback, useEffect, useState } = window.React;

export function useCurrentLocation() {
  const [location, setLocation] = useState(defaultLocation);
  const [status, setStatus] = useState({
    tone: "loading",
    message: "현재 위치를 확인하는 중입니다.",
  });

  const locate = useCallback(() => {
    setStatus({
      tone: "loading",
      message: "현재 위치를 확인하는 중입니다.",
    });

    if (!navigator.geolocation) {
      setLocation(defaultLocation);
      setStatus({
        tone: "warning",
        message: "브라우저가 위치 기능을 지원하지 않아 기본 위치를 표시합니다.",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "현재 위치",
        });
        setStatus({
          tone: "ready",
          message: "현재 위치를 기준으로 지도를 표시합니다.",
        });
      },
      () => {
        setLocation(defaultLocation);
        setStatus({
          tone: "warning",
          message: "위치 권한이 없어 기본 위치를 표시합니다.",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 9000,
        maximumAge: 300000,
      }
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  return { location, status, locate };
}
