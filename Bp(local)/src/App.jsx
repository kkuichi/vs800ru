import { useCallback, useMemo, useState } from "react";
import HeaderBar from "./components/HeaderBar.jsx";
import SettingsLayout from "./features/settings/SettingsLayout.jsx";
import DetectionExamples from "./features/examples/DetectionExamples.jsx";
import ExtensionPopup from "./features/popup/ExtensionPopup.jsx";
import { useSettings } from "./state/SettingsContext.jsx";
import exampleComments from "./features/examples/exampleComments.js";

const DEMO_DOMAIN = "example.com";

function App() 
{
  const { settings } = useSettings();
  const [popupOpen, setPopupOpen] = useState(false);
  const [view, setView] = useState("examples");
  const [protectionEnabled, setProtectionEnabled] = useState(true);
  const isSettingsView = view === "settings";
  const openPopup = useCallback(() => setPopupOpen(true), []);
  const closePopup = useCallback(() => setPopupOpen(false), []);
  const goToSettings = useCallback(() => {
    setView("settings");
    setPopupOpen(false);
  }, []);

  const goToExamples = useCallback(() => {
    setView("examples");
    setPopupOpen(false);
  }, []);

  const toggleProtection = useCallback(() => {
    setProtectionEnabled((prev) => !prev);
  }, []);

  const isWhitelisted = useMemo(() => {
    const wl = settings?.whitelist;
    return Array.isArray(wl) && wl.includes(DEMO_DOMAIN);
  }, [settings?.whitelist]);

  const effectiveProtection = protectionEnabled && !isWhitelisted;
  const activeCategoryCount = useMemo(() => {
    const cats = settings?.categories;
    if (!cats || typeof cats !== "object") return 0;
    return Object.values(cats).filter(Boolean).length;
  }, [settings?.categories]);

  const detectedCount = useMemo(() => {
    if (!effectiveProtection) return 0;
    const cats = settings?.categories || {};
    return exampleComments.filter(
      (c) => c.category && (cats?.[c.category] ?? true)
    ).length;
  }, [effectiveProtection, settings?.categories]);

  const blockedCount = useMemo(() => {
    return effectiveProtection && !!settings?.autoBlur ? detectedCount : 0;
  }, [effectiveProtection, settings?.autoBlur, detectedCount]);

  return (
    <div className="app">
      {isSettingsView && <HeaderBar />}

      <main className="app__content">
        <div className="app__content-inner">
          {isSettingsView ? (
            <SettingsLayout onBack={goToExamples} />
          ) : (
            <DetectionExamples
              onShowPopup={openPopup}
              onOpenSettings={goToSettings}
              showNonBlurredColumn={false}
              protectionEnabled={protectionEnabled}
            />
          )}
        </div>
      </main>

      <ExtensionPopup
        floating
        open={!isSettingsView && popupOpen}
        onClose={closePopup}
        onOpenSettings={goToSettings}
        protectionEnabled={protectionEnabled}
        onToggleProtection={toggleProtection}
        activeCategoryCount={activeCategoryCount}
        detectedCount={detectedCount}
        blockedCount={blockedCount}
      />
    </div>
  );
}

export default App;