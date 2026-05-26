import { useEffect, useState } from "react";
import { useSettings } from "../../state/SettingsContext.jsx";

const TOKEN_KEY = "ttd_remote_token";
const SENSITIVITY_MARKS = [25, 50, 75];
const THUMB_PX = 18;

const CATEGORY_ITEMS = [
  { id: "toxicity", title: "Toxicity", desc: "Rude, disrespectful, or unreasonable comments" },
  { id: "insult", title: "Insult", desc: "Insulting or negative comments about someone" },
  { id: "profanity", title: "Profanity", desc: "Swear words or obscene language" },
  { id: "threat", title: "Threat", desc: "Threatening language or intimidation" },
  { id: "identityAttack", title: "Identity attack", desc: "Attacks based on identity or demographics" }
];

const markLeft = (p) => {
  const offset = THUMB_PX / 2 - (THUMB_PX * p) / 100;
  return `calc(${p}% + ${offset}px)`;
};

function SettingsLayout({ onBack }) 
{
  const {
    settings,
    setSensitivity,
    toggleAutoBlur,
    toggleShowConfidence,
    toggleInferenceMode,
    toggleCategory,
    addWhitelist,
    removeWhitelist
  } = useSettings();

  const [domainInput, setDomainInput] = useState("");
  const [remoteToken, setRemoteToken] = useState("");
  const [tokenSaved, setTokenSaved] = useState(true);
  useEffect(() => {
    if (!chrome?.storage?.sync) return;

    chrome.storage.sync.get([TOKEN_KEY], (res) => {
      const t = res?.[TOKEN_KEY];
      setRemoteToken(typeof t === "string" ? t : "");
      setTokenSaved(true);
    });
  }, []);

  const pingRescan = () => {
    if (!chrome?.runtime?.sendMessage) return;
    chrome.runtime.sendMessage({ type: "TTD_RESCAN_ACTIVE_TAB" }, (resp) => {
      const err = chrome.runtime.lastError;
      if (err) 
      {
        console.warn("[TTD] rescan message failed:", err.message);
        return;
      }

      if (!resp?.ok)
      {
        console.warn("[TTD] rescan failed:", resp?.error);
      }
    });
  };

  const saveToken = () => {
    if (!chrome?.storage?.sync) return;
    chrome.storage.sync.set({ [TOKEN_KEY]: String(remoteToken || "").trim() }, () => {
      setTokenSaved(true);
      pingRescan();
      alert("Remote token saved.");
    });
  };

  const handleAdd = (e) => {
    e.preventDefault();
    addWhitelist(domainInput);
    setDomainInput("");
    pingRescan();
  };

  const resetToDefaults = () => {
    const ok = confirm("Reset all settings to defaults?");
    if (!ok) return;
    if (chrome?.storage?.sync) 
    {
      chrome.storage.sync.remove(["ttd_settings", TOKEN_KEY], () => location.reload());
    } 
    else 
    {
      location.reload();
    }
  };

  const exportSettings = () => {
    const data = JSON.stringify(settings, null, 2);
    navigator.clipboard?.writeText?.(data).catch(() => {});
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ttd-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = async (file) => {
    if (!file) return;
    try 
    {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (chrome?.storage?.sync) 
      {
        chrome.storage.sync.set({ ttd_settings: parsed }, () => location.reload());
      } 
      else 
      {
        alert("chrome.storage.sync is not available.");
      }
    } 
    catch 
    {
      alert("Invalid JSON file.");
    }
  };

  const isRemote = settings.inferenceMode === "remote";
  return (
    <div className="settings-screen">
      {onBack && (
        <div className="settings-screen__top">
          <button type="button" className="settings-back-btn" onClick={onBack}>
            <span className="settings-back-btn__icon">←</span>
            <span>Return</span>
          </button>
        </div>
      )}

      <div className="settings-layout">
        <div className="card card--primary">
          <div className="card__header">
            <div className="card__title-wrap">
              <div className="card__icon" />
              <div>
                <h2 className="card__title">Detection settings</h2>
                <p className="card__subtitle">Configure how toxic content is detected</p>
              </div>
            </div>
          </div>

          <div className="section">
            <div className="section__header" style={{ alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="section__title">Sensitivity level</div>
                <div className="section__value">{settings.sensitivity}%</div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
                <div className="section__title" style={{ opacity: 0.8 }}>Inference</div>

                <button
                  type="button"
                  className={"toggle" + (isRemote ? " toggle--on" : "")}
                  onClick={() => {
                    toggleInferenceMode();
                    pingRescan();
                  }}
                  aria-pressed={isRemote}
                  aria-label="Toggle inference mode (local/remote)"
                  title={isRemote ? "Remote mode: sends text to server" : "Local mode: runs in browser"}
                >
                  <span className="toggle__thumb" />
                </button>

                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {isRemote ? "Remote" : "Local"}
                </div>
              </div>
            </div>

            <div className="sensitivity">
              <div className="sensitivity__track">
                <input
                  className="sensitivity__slider"
                  type="range"
                  min="0"
                  max="100"
                  value={settings.sensitivity}
                  onChange={(e) => {
                    setSensitivity(Number(e.target.value));
                    pingRescan();
                  }}
                />
              </div>

              <div className="sensitivity__legend" aria-hidden="true">
                <span className="sensitivity__label">Less Strict</span>
                <span className="sensitivity__label">More Strict</span>

                <div className="sensitivity__marksOverlay">
                  {SENSITIVITY_MARKS.map((p) => (
                    <span
                      key={p}
                      className="dot dot--mark"
                      style={{ left: markLeft(p) }}
                      title={`${p}%`}
                    />
                  ))}
                </div>
              </div>
            </div>

            {isRemote && (
              <div className="section section--spaced">
                <div className="section__title">Remote API token</div>
                <p className="section__subtitle" style={{ marginTop: 6 }}>
                  Stored in <code>chrome.storage.sync</code> as <code>{TOKEN_KEY}</code>
                </p>

                <label className="whitelist-form__label" style={{ marginTop: 10 }}>
                  Bearer token
                  <input
                    className="whitelist-form__input"
                    value={remoteToken}
                    placeholder="SOME_LONG_RANDOM_TOKEN"
                    onChange={(e) => {
                      setRemoteToken(e.target.value);
                      setTokenSaved(false);
                    }}
                  />
                </label>

                <button
                  type="button"
                  className="whitelist-form__button"
                  onClick={saveToken}
                  disabled={tokenSaved}
                  style={{ marginTop: 10 }}
                >
                  Save token
                </button>
              </div>
            )}
          </div>

          <hr />

          <div className="section section--spaced">
            <div className="section__title">Toxicity category</div>

            {CATEGORY_ITEMS.map(({ id, title, desc }) => (
              <div
                className="toggle-row toggle-row--category"
                key={id}
                onClick={() => {
                  toggleCategory(id);
                  pingRescan();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    toggleCategory(id);
                    pingRescan();
                  }
                }}
              >
                <div className="toggle-row__text">
                  <span className="toggle-row__title">{title}</span>
                  <span className="toggle-row__description">{desc}</span>
                </div>

                <button
                  type="button"
                  className={"toggle" + (settings.categories?.[id] ? " toggle--on" : "")}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCategory(id);
                    pingRescan();
                  }}
                  aria-pressed={!!settings.categories?.[id]}
                  aria-label={`Toggle ${title}`}
                >
                  <span className="toggle__thumb" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-layout__right">
          <div className="card">
            <div className="card__header">
              <h2 className="card__title">Display options</h2>
              <p className="card__subtitle">Customize how extension will show toxic content</p>
            </div>

            <div
              className="toggle-row toggle-row--category"
              role="button"
              tabIndex={0}
              onClick={() => {
                toggleAutoBlur();
                pingRescan();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  toggleAutoBlur();
                  pingRescan();
                }
              }}
            >
              <div className="toggle-row__text">
                <span className="toggle-row__title">Auto-blur toxic content</span>
                <span className="toggle-row__description">
                  Automatically blur detected toxic text
                </span>
              </div>

              <button
                type="button"
                className={"toggle" + (settings.autoBlur ? " toggle--on" : "")}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAutoBlur();
                  pingRescan();
                }}
                aria-pressed={!!settings.autoBlur}
                aria-label="Toggle auto-blur toxic content"
              >
                <span className="toggle__thumb" />
              </button>
            </div>

            <div
              className="toggle-row toggle-row--category"
              role="button"
              tabIndex={0}
              onClick={() => {
                toggleShowConfidence();
                pingRescan();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  toggleShowConfidence();
                  pingRescan();
                }
              }}
            >
              <div className="toggle-row__text">
                <span className="toggle-row__title">Show confidence scores</span>
                <span className="toggle-row__description">
                  Display detection confidence percentages
                </span>
              </div>

              <button
                type="button"
                className={"toggle" + (settings.showConfidence ? " toggle--on" : "")}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleShowConfidence();
                  pingRescan();
                }}
                aria-pressed={!!settings.showConfidence}
                aria-label="Toggle show confidence scores"
              >
                <span className="toggle__thumb" />
              </button>
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <h2 className="card__title">Whitelist Domains</h2>
              <p className="card__subtitle">Disable detection on written websites</p>
            </div>

            <form className="whitelist-form" onSubmit={handleAdd}>
              <label className="whitelist-form__label">
                Value
                <input
                  className="whitelist-form__input"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="example.com"
                />
              </label>

              <button className="whitelist-form__button" type="submit">
                Add
              </button>
            </form>

            <ul className="whitelist-list">
              {(settings.whitelist || []).map((d) => (
                <li key={d} className="whitelist-list__item">
                  <span>{d}</span>
                  <button
                    type="button"
                    className="whitelist-list__remove"
                    onClick={() => {
                      removeWhitelist(d);
                      pingRescan();
                    }}
                    aria-label={`Remove ${d}`}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="settings-bottom">
        <section className="card">
          <header className="card__header">
            <h2 className="card__title">Actions</h2>
            <p className="card__subtitle">Quick tools for managing your settings</p>
          </header>

          <div className="actions-grid">
            <button type="button" className="action-btn" onClick={resetToDefaults}>
              Reset to defaults
            </button>

            <button type="button" className="action-btn" onClick={exportSettings}>
              Export settings (JSON)
            </button>

            <label className="action-file">
              Import settings (JSON)
              <input
                type="file"
                accept="application/json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  await importSettings(file);
                  e.target.value = "";
                }}
              />
            </label>

            <button
              type="button"
              className="action-btn"
              onClick={() => {
                pingRescan();
                alert("Rescan requested for the active tab.");
              }}
            >
              Rescan active tab
            </button>
          </div>

          <div className="actions-divider" />

          <div className="about">
            <div className="about__row">
              <span className="about__label">Extension</span>
              <span className="about__value">Toxic Text Detector</span>
            </div>

            <div className="about__row">
              <span className="about__label">Storage</span>
              <span className="about__value">chrome.storage.sync</span>
            </div>

            <div className="about__row">
              <span className="about__label">Quick tip</span>
              <span className="about__value">
                Add domains like <code>example.com</code> (no https, no paths).
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default SettingsLayout;