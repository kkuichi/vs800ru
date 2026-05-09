function Toggle({ checked, onChange }) 
{
  return (
    <button
      type="button"
      className={`toggle ${checked ? "toggle--on" : ""}`}
      onClick={onChange}
      aria-pressed={checked}
    >
      <span className="toggle__thumb" />
    </button>
  );
}

function ToggleRow({ title, description, checked, onChange }) 
{
  return (
    <div className="toggle-row">
      <div className="toggle-row__text">
        <span className="toggle-row__title">{title}</span>
        <span className="toggle-row__description">{description}</span>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default ToggleRow;
export { Toggle };
