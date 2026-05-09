import React from "react";
import ReactDOM from "react-dom/client";
import SettingsLayout from "./features/settings/SettingsLayout.jsx";
import { SettingsProvider } from "./state/SettingsContext.jsx";

import "./styles/base.css";
import "./index.css";
import "./features/settings/settings.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SettingsProvider>
      <SettingsLayout />
    </SettingsProvider>
  </React.StrictMode>
);