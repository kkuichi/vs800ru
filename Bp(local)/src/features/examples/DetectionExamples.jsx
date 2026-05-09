import { useState } from "react";
import exampleComments from "./exampleComments.js";
import CommentCard from "./CommentCard.jsx";
import FeedbackModal from "../feedback/FeedbackModal.jsx";
import { useSettings } from "../../state/SettingsContext.jsx";

function DetectionExamples({ onShowPopup, onOpenSettings, showNonBlurredColumn = false, protectionEnabled = true }) 
{
  const { settings } = useSettings();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackComment, setFeedbackComment] = useState(null);
  const currentDomain = "example.com";
  const isWhitelisted = settings.whitelist.includes(currentDomain);
  const effectiveProtection = protectionEnabled && !isWhitelisted;

  const handleInfoClick = (comment) => {
    setFeedbackComment(comment);
    setFeedbackOpen(true);
  };

  const handleCloseFeedback = () => {
    setFeedbackOpen(false);
    setFeedbackComment(null);
  };

  return (
    <>
      <section className="examples">
        <div className="examples__column">
          <div className="examples__column-header">
            <h2 className="examples__title">
              Príklad detekcie (automatické rozostrenie zapnuté)
            </h2>

            {onShowPopup && (
              <button type="button" className="examples__popup-trigger" onClick={onShowPopup}>
                Show extension popup
              </button>
            )}
          </div>

          {exampleComments.map((c) => (
            <CommentCard
              key={c.id}
              comment={c}
              autoBlurMode={settings.autoBlur}
              protectionEnabled={effectiveProtection}
              enabledCategories={settings.categories}
              showConfidence={settings.showConfidence}
              onInfoClick={handleInfoClick}
            />
          ))}
        </div>

        {showNonBlurredColumn && <div className="examples__column" />}
      </section>

      <FeedbackModal
        open={feedbackOpen}
        onClose={handleCloseFeedback}
        onOpenSettings={onOpenSettings}
        comment={feedbackComment}
      />
    </>
  );
}

export default DetectionExamples;
