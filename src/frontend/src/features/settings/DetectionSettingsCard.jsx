import ToggleRow from "../../components/ToggleRow.jsx";

function DetectionSettingsCard({
  sensitivity,
  onSensitivityChange,
  categories,
  onToggleCategory,
}) 
{
  return (
    <section className="card card--primary">
      <header className="card__header">
        <div className="card__title-wrap">
          <div className="card__icon card__icon--shield" />
          <div>
            <h1 className="card__title">Detection settings</h1>
            <p className="card__subtitle">
              Configure how toxic content is detected
            </p>
          </div>
        </div>
      </header>

      <section className="section">
        <div className="section__header">
          <span className="section__title">Sensitivity level</span>
          <span className="section__value">{sensitivity}%</span>
        </div>
        <div className="sensitivity">
          <input
            type="range"
            min="0"
            max="100"
            value={sensitivity}
            onChange={(e) => onSensitivityChange(Number(e.target.value))}
            className="sensitivity__slider"
          />
          <div className="sensitivity__ticks">
            <span className="sensitivity__label">Less Strict</span>
            <div className="sensitivity__dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
            <span className="sensitivity__label">More Strict</span>
          </div>
        </div>
      </section>

      <section className="section section--spaced">
        <h2 className="section__title">Toxicity category</h2>

        <ToggleRow
          title="Toxicity"
          description="Rude, disrespectful, or unreasonable comments"
          checked={categories.toxicity}
          onChange={() => onToggleCategory("toxicity")}
        />
        <ToggleRow
          title="Insult"
          description="Insulting or negative comments about someone"
          checked={categories.insult}
          onChange={() => onToggleCategory("insult")}
        />
        <ToggleRow
          title="Profanity"
          description="Swear words or obscene language"
          checked={categories.profanity}
          onChange={() => onToggleCategory("profanity")}
        />
        <ToggleRow
          title="Threat"
          description="Threatening language or intimidation"
          checked={categories.threat}
          onChange={() => onToggleCategory("threat")}
        />
        <ToggleRow
          title="Identity attack"
          description="Attacks based on identity or demographics"
          checked={categories.identityAttack}
          onChange={() => onToggleCategory("identityAttack")}
        />
      </section>
    </section>
  );
}

export default DetectionSettingsCard;
