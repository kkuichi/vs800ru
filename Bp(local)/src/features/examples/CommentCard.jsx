import { useEffect, useRef, useState } from "react";

function CommentCard({
  comment,
  autoBlurMode,
  protectionEnabled = true,
  enabledCategories,
  onInfoClick,
  showConfidence = false,
}) 
{
  const categoryPresent = Boolean(comment.category);
  const categoryEnabled = categoryPresent
    ? (enabledCategories?.[comment.category] ?? true)
    : false;
  const detectionActive = protectionEnabled && categoryPresent && categoryEnabled;
  const [visible, setVisible] = useState(autoBlurMode ? !detectionActive : true);
  const prevAutoBlur = useRef(autoBlurMode);
  useEffect(() => {
    const wasAutoBlur = prevAutoBlur.current;
    prevAutoBlur.current = autoBlurMode;

    if (!detectionActive) 
    {
      setVisible(true);
      return;
    }

    if (autoBlurMode) 
    {
      setVisible(false);
      return;
    }

    if (wasAutoBlur && !autoBlurMode) 
      {
      setVisible(true);
    }
  }, [autoBlurMode, detectionActive]);

  const isBlurred = detectionActive && !visible;
  const actionLabel = visible ? "Hide" : "Show";
  const actionIconClass = visible
    ? "comment-card__action-icon comment-card__action-icon--visible"
    : "comment-card__action-icon comment-card__action-icon--hidden";

  const handleInfo = () => {
    if (!detectionActive) return;
    if (onInfoClick) onInfoClick(comment);
  };

  return (
    <article className="comment-card">
      <div className="comment-card__top">
        <div className="comment-card__avatar" />
        <div className="comment-card__main">
          <div className="comment-card__header-row">
            <div className="comment-card__user-meta">
              <div className="comment-card__user">{comment.user}</div>
              <div className="comment-card__meta">{comment.timeAgo}</div>
            </div>

            {detectionActive && (
              <div className="comment-card__controls">
                <div className="comment-card__chip">
                  <span className="comment-card__chip-label">{comment.category}</span>

                  {showConfidence && typeof comment.confidence === "number" && (
                    <span className="comment-card__chip-score">{comment.confidence}%</span>
                  )}

                  <button
                    type="button"
                    className="comment-card__chip-info"
                    onClick={handleInfo}
                    aria-label="Why this was detected"
                  >
                    i
                  </button>
                </div>

                <button
                  type="button"
                  className="comment-card__action"
                  onClick={() => setVisible((v) => !v)}
                >
                  <span className={actionIconClass} aria-hidden="true" />
                  <span>{actionLabel}</span>
                </button>
              </div>
            )}
          </div>

          <p
            className={
              "comment-card__body" + (isBlurred ? " comment-card__body--blurred" : "")
            }
          >
            {comment.text}
          </p>
        </div>
      </div>
    </article>
  );
}

export default CommentCard;
