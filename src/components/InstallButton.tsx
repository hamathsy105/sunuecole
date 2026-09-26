import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [showTuto, setShowTuto] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(/iphone|ipad|ipod/i.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1));
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || (!deferred && !isIOS)) return null;

  async function click() {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } else setShowTuto(true);
  }

  return (
    <>
      <button
        onClick={click}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-xl"
      >
        📲 Installer l'App
      </button>
      {showTuto && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4" onClick={() => setShowTuto(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 text-center space-y-3" onClick={(e) => e.stopPropagation()}>
            <img src="/icon-192.png" alt="SunuÉcole" width={64} height={64} className="mx-auto rounded-2xl" />
            <h2 className="text-lg font-bold text-primary">Installer SunuÉcole sur iPhone</h2>
            <ol className="text-left text-sm text-foreground space-y-2">
              <li>1. Ouvrez cette page dans <b>Safari</b></li>
              <li>2. Cliquez sur <b>Partager</b> (carré avec flèche ⬆️)</li>
              <li>3. Choisissez <b>« Sur l'écran d'accueil »</b></li>
              <li>4. Appuyez sur <b>Ajouter</b></li>
            </ol>
            <button onClick={() => setShowTuto(false)} className="w-full rounded-xl bg-primary py-2.5 font-semibold text-primary-foreground">
              Compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
