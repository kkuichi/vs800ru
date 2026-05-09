import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const SettingsContext = createContext(null);

const STORAGE_KEY = "ttd_settings";

const DEFAULT_SETTINGS = {
  enabled: true,
  sensitivity: 100,
  autoBlur: true,
  showConfidence: true,
  inferenceMode: "local",
  categories: {
    toxicity: true,
    insult: true,
    profanity: true,
    threat: true,
    identityAttack: true
  },

  whitelist: []
};

function normalizeDomain(value) {
  const v = String(value || "").trim().toLowerCase();
  if (!v) return "";
  const noProto = v.replace(/^https?:\/\//, "");
  const noPath = noProto.split("/")[0].split("?")[0].split("#")[0];
  return noPath.replace(/^www\./, "");
}
export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!globalThis.chrome?.storage?.sync) {
      setReady(true);
      return;
    }

    chrome.storage.sync.get([STORAGE_KEY], (res) => {
      const saved = res[STORAGE_KEY] || {};
      setSettings({
        ...DEFAULT_SETTINGS,
        ...saved,
        categories: { ...DEFAULT_SETTINGS.categories, ...(saved.categories || {}) },
        whitelist: Array.isArray(saved.whitelist)
          ? saved.whitelist.map(normalizeDomain).filter(Boolean)
          : []
      });
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!globalThis.chrome?.storage?.sync) return;

    chrome.storage.sync.set({ [STORAGE_KEY]: settings });
  }, [settings, ready]);

  const api = useMemo(() => {
    const toggleEnabled = () => setSettings((s) => ({ ...s, enabled: !s.enabled }));

    const setSensitivity = (value) =>
      setSettings((s) => ({ ...s, sensitivity: Math.max(0, Math.min(100, Number(value))) }));

    const toggleAutoBlur = () => setSettings((s) => ({ ...s, autoBlur: !s.autoBlur }));

    const toggleShowConfidence = () =>
      setSettings((s) => ({ ...s, showConfidence: !s.showConfidence }));

    const toggleInferenceMode = () =>
      setSettings((s) => ({
        ...s,
        inferenceMode: s.inferenceMode === "remote" ? "local" : "remote"
      }));

    const toggleCategory = (categoryKey) =>
      setSettings((s) => ({
        ...s,
        categories: { ...s.categories, [categoryKey]: !s.categories[categoryKey] }
      }));

    const addWhitelist = (domainRaw) => {
      const domain = normalizeDomain(domainRaw);
      if (!domain) return;

      setSettings((s) => {
        if (s.whitelist.includes(domain)) return s;
        return { ...s, whitelist: [...s.whitelist, domain] };
      });
    };

    const removeWhitelist = (domainRaw) => {
      const domain = normalizeDomain(domainRaw);

      setSettings((s) => ({
        ...s,
        whitelist: s.whitelist.filter((d) => d !== domain)
      }));
    };

    return {
      settings,
      toggleEnabled,
      setSensitivity,
      toggleAutoBlur,
      toggleShowConfidence,
      toggleInferenceMode,
      toggleCategory,
      addWhitelist,
      removeWhitelist,
      normalizeDomain
    };
  }, [settings]);

  return <SettingsContext.Provider value={api}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside SettingsProvider");
  return ctx;
}