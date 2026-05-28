# Toxic Text Detector

Toxic Text Detector je projekt záverečnej práce zameraný na návrh, implementáciu a vyhodnotenie rozšírenia webového prehliadača na detekciu potenciálne toxického textu na webových stránkach.

Rozšírenie je implementované podľa Chrome Manifest V3 a podporuje dva režimy spracovania:

- lokálnu inferenciu priamo v prehliadači,
- vzdialenú inferenciu prostredníctvom backendového API.

Tento súbor slúži ako úvodný prehľad repozitára a CD média. Podrobné technické informácie sú uvedené v systémovej príručke.

---

## Dokumentácia

Hlavná dokumentácia sa nachádza v priečinku `doc/`.

```text
doc/
├── thesis.pdf
├── README.md
├── USER_MANUAL.md
└── screenshots/
```

- `doc/thesis.pdf` – záverečná práca v čitateľnom PDF formáte,
- `doc/README.md` – systémová príručka a technický opis projektu,
- `doc/USER_MANUAL.md` – používateľská príručka k rozšíreniu,
- `doc/screenshots/` – obrázky použité v príručkách.

---

## Štruktúra repozitára / CD média

```text
CD medium/
├── README.md
├── .gitignore
├── .vscode/
├── doc/
│   ├── thesis.pdf
│   ├── README.md
│   ├── USER_MANUAL.md
│   └── screenshots/
├── tex/
├── src/
│   ├── frontend/
│   └── backend/
└── bin/
    └── dist/
```

Význam hlavných priečinkov a súborov:

- `README.md` – úvodný prehľad repozitára a odkaz na úplnú dokumentáciu,
- `.gitignore` – pravidlá pre vynechanie dočasných, generovaných a vývojových súborov z repozitára,
- `.vscode/` – pomocné nastavenia pracovného prostredia Visual Studio Code,
- `doc/` – záverečná práca, systémová príručka, používateľská príručka a obrázky,
- `tex/` – zdrojové súbory záverečnej práce,
- `src/frontend/` – zdrojový kód rozšírenia prehliadača Chrome,
- `src/backend/` – zdrojový kód backendového API pre vzdialenú inferenciu,
- `bin/dist/` – zostavená verzia rozšírenia pripravená na načítanie do prehliadača.

---