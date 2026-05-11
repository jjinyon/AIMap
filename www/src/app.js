import { Home } from "./pages/Home.js";

const { useEffect, useState } = window.React;
const h = window.React.createElement;

function App() {
  const [appStatus, setAppStatus] = useState("");
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    registerServiceWorker(setAppStatus);

    const updateNetworkStatus = () => {
      setAppStatus(
        navigator.onLine
          ? ""
          : "오프라인 상태입니다. 이미 불러온 화면은 계속 사용할 수 있습니다."
      );
    };

    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setAppStatus("앱으로 설치되었습니다.");
    };

    updateNetworkStatus();
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return h(Home, {
    appStatus,
    canInstall: Boolean(installPrompt),
    onInstall: installApp,
  });
}

async function registerServiceWorker(setAppStatus) {
  if (!("serviceWorker" in navigator)) return;

  try {
    await navigator.serviceWorker.register("./sw.js");
  } catch {
    setAppStatus("오프라인 앱 기능을 준비하지 못했습니다.");
  }
}

ReactDOM.createRoot(document.querySelector("#root")).render(h(App));
