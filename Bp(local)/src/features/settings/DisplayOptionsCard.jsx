import ToggleRow from "../../components/ToggleRow.jsx";

function DisplayOptionsCard({ displayOptions, onToggleDisplayOption }) {
  const remoteOn = displayOptions.inferenceMode === "remote";

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Display options</h2>
        <p className="card__subtitle">
          Customize how extension will show toxic content
        </p>
      </header>

      {/* NEW: Local vs Remote switch */}
      <ToggleRow
        title="Use remote API (opt-in)"
        description={
          remoteOn
            ? "Remote mode enabled — text is sent to your server for inference"
            : "Local mode enabled — inference runs in the browser (privacy-by-default)"
        }
        checked={remoteOn}
        onChange={() => onToggleDisplayOption("inferenceMode")}
      />

      <ToggleRow
        title="Auto-blur toxic content"
        description="Automatically blur detected toxic text"
        checked={displayOptions.autoBlur}
        onChange={() => onToggleDisplayOption("autoBlur")}
      />

      <ToggleRow
        title="Show confidence scores"
        description="Display detection confidence percentages"
        checked={displayOptions.showConfidence}
        onChange={() => onToggleDisplayOption("showConfidence")}
      />
    </section>
  );
}

export default DisplayOptionsCard;