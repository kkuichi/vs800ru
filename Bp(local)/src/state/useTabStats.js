import { useEffect, useState } from "react";

export function useTabStats(pollMs = 800) {
  const [stats, setStats] = useState({
    detectedCount: 0,
    blockedCount: 0,
    activeCategoryCount: 0
  });

  const refresh = () => {
    if (!chrome?.runtime?.sendMessage) return;
    chrome.runtime.sendMessage({ type: "TTD_GET_STATS" }, (res) => {
      if (res?.ok && res.payload) setStats(res.payload);
    });
  };

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, pollMs);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { stats, refresh };
}