const CATEGORY_LINES = 
{
  Insult: [
    "This comment was flagged under the “Insult” category.",
    "It contains offensive or disparaging statements about a person.",
  ],
  Profanity: [
    "This comment was flagged under the “Profanity” category.",
    "It contains swear words or other inappropriate expressions.",
  ],
  Thread: [
    "This comment was flagged under the “Threat” category.",
    "It comes across as threatening or intimidating to someone.",
  ],
  Toxicity: [
    "This comment was flagged under the “Toxicity” category.",
    "The overall tone of the comment may feel aggressive or hostile.",
  ],
  "Identity attack": [
    "This comment was flagged under the “Identity attack” category.",
    "It targets someone’s identity (for example origin, belief, orientation).",
  ],
};

function buildLines(comment) 
{
  if (!comment) 
  {
    return ["Žiadny komentár nie je vybraný."];
  }

  const linesFromCategory = CATEGORY_LINES[comment.category];

  if (!comment.category || !linesFromCategory) 
  {
    return 
    [
      "Tento komentár nebol označený ako toxický.",
      "Detektor v ňom nenašiel prvky, ktoré by spadali do sledovaných kategórií.",
    ];
  }

  return linesFromCategory;
}

function FeedbackModal({ open, onClose, onOpenSettings, comment }) 
{
  if (!open) return null;
  const lines = buildLines(comment);
  const handleOverlayClick = () => {
    onClose && onClose();
  };

  const stopPropagation = (e) => e.stopPropagation();
  const handleSettingsClick = () => {
    if (onOpenSettings) {
      onOpenSettings();
    }
    onClose && onClose();
  };

  return (
    <div className="feedback-modal-overlay" onClick={handleOverlayClick}>
      <div className="feedback-modal-wrapper" onClick={stopPropagation}>
        <div className="feedback-modal-caption">
          Mini-modálne okno spätnej väzby
        </div>

        <div className="feedback-modal">
          <header className="feedback-modal__header">
            <h3 className="feedback-modal__title">
              Nejaký dôvod, prečo
            </h3>
            <button
              type="button"
              className="feedback-modal__gear"
              aria-label="Feedback settings"
              onClick={handleSettingsClick}
            >
              ⚙
            </button>
          </header>

          <div className="feedback-modal__body">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="feedback-modal__row feedback-modal__row--text"
              >
                <span className="feedback-modal__line-text">{line}</span>
              </div>
            ))}
          </div>

          <div className="feedback-modal__actions">
            <button
              type="button"
              className="feedback-modal__btn feedback-modal__btn--good"
              onClick={onClose}
            >
              Good
            </button>
            <button
              type="button"
              className="feedback-modal__btn feedback-modal__btn--bad"
              onClick={onClose}
            >
              Bad
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeedbackModal;
