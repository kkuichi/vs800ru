import React from "react";
import iconOn from "../../assets/popup-icon-on.png";
import iconOff from "../../assets/popup-icon-off.png";

function ExtensionPopup({
  floating = false,
  open = true,
  protectionEnabled = true,
  onToggleProtection,
  onClose,
  onOpenSettings,
  activeCategoryCount = 0,
  detectedCount = 0,
  blockedCount = 0,
}) {
  if (!open) return null;

  const handleOverlayClick = () => {
    if (!floating) return;
    onClose && onClose();
  };

  const stop = (e) => e.stopPropagation();
  const handleSettingsClick = () => {
    if (onOpenSettings) onOpenSettings();
  };

  const enabled = protectionEnabled;
  const statusTitle = enabled ? "Currently protected" : "Currently unprotected";

  const statusSubtitle = enabled
    ? `Monitoring ${activeCategoryCount} toxicity categories`
    : "Enable protection to start detecting toxic content";

  const statusIcon = enabled ? "✓" : "!";
  const statusClassName =
    "popup-status" + (enabled ? "" : " popup-status--off");

  const card = (
    <div className="popup-card">
      <div className="popup-card__header">
        <div className="popup-card__header-left">
          <img
            className={"popup-card__icon" + (enabled ? "" : " popup-card__icon--off")}
            src={enabled ? iconOn : iconOff}
            alt=""
          />
          <span className="popup-card__title">Toxic Text Detector</span>
        </div>

        <button
          type="button"
          className={"popup-toggle" + (enabled ? " popup-toggle--on" : "")}
          onClick={onToggleProtection}
          aria-pressed={enabled}
        >
          <span className="popup-toggle__thumb" />
        </button>
      </div>

      <div className={statusClassName}>
        <div className="popup-status__icon">{statusIcon}</div>
        <div className="popup-status__text">
          <div className="popup-status__title">{statusTitle}</div>
          <div className="popup-status__subtitle">{statusSubtitle}</div>
        </div>
      </div>

      <div className="popup-activity">
        <div className="popup-activity__item">
          <div className="popup-activity__label">Detected</div>
          <div className="popup-activity__value">{detectedCount}</div>
        </div>

        <div className="popup-activity__item">
          <div className="popup-activity__label">Blocked</div>
          <div className="popup-activity__value">{blockedCount}</div>
        </div>
      </div>

      <button type="button" className="popup-settings-btn" onClick={handleSettingsClick}>
        <span className="popup-settings-btn__icon">⚙</span>
        <span>Settings</span>
      </button>
    </div>
  );

  if (floating) {
    return (
      <div className="popup-floating-overlay" onClick={handleOverlayClick}>
        <div className="popup-floating-inner" onClick={stop}>
          {card}
        </div>
      </div>
    );
  }

  return <div className="popup-root">{card}</div>;
}

export default ExtensionPopup;