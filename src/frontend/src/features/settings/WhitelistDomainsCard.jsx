import { useState } from "react";

function WhitelistDomainsCard({ whitelist, onAddDomain, onRemoveDomain }) 
{
  const [input, setInput] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    onAddDomain(input);
    setInput("");
  };

  return (
    <section className="card">
      <header className="card__header">
        <h2 className="card__title">Whitelist Domains</h2>
        <p className="card__subtitle">
          Disable detection on written websites
        </p>
      </header>

      <form className="whitelist-form" onSubmit={handleSubmit}>
        <label className="whitelist-form__label">
          Value
          <input
            className="whitelist-form__input"
            placeholder="example.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>
        <button type="submit" className="whitelist-form__button">
          Add
        </button>
      </form>

      {whitelist.length > 0 && (
        <ul className="whitelist-list">
          {whitelist.map((domain) => (
            <li key={domain} className="whitelist-list__item">
              <span>{domain}</span>
              <button
                type="button"
                className="whitelist-list__remove"
                onClick={() => onRemoveDomain(domain)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default WhitelistDomainsCard;
