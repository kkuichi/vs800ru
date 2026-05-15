import React from "react";
import ReactDOM from "react-dom/client";
import ExtensionPopup from "./features/popup/ExtensionPopup.jsx";
import { SettingsProvider, useSettings } from "./state/SettingsContext.jsx";
import { useTabStats } from "./state/useTabStats.js";

import "./styles/base.css";
import "./index.css";
import "./features/popup/popup.css";

function PopupRoot() {
  const { settings, toggleEnabled } = useSettings();
  const { stats, refresh } = useTabStats(700);
  const activeCategoryCount = Object.values(settings.categories || {}).filter(Boolean).length;
  return (
    <ExtensionPopup
      floating={false}        
      open={true}              
      protectionEnabled={!!settings.enabled}
      onToggleProtection={() => {
        toggleEnabled();
        chrome.runtime.sendMessage({ type: "TTD_RESCAN_ACTIVE_TAB" }, () => {
          setTimeout(refresh, 500);
        });
      }}
      onOpenSettings={() => chrome.runtime.openOptionsPage()}
      activeCategoryCount={activeCategoryCount}
      detectedCount={stats.detectedCount}
      blockedCount={stats.blockedCount}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SettingsProvider>
      <PopupRoot />
    </SettingsProvider>
  </React.StrictMode>
);