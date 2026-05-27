# Toxic Text Detector

Toxic Text Detector je projekt záverečnej práce zameraný na návrh, implementáciu a vyhodnotenie rozšírenia webového prehliadača na detekciu potenciálne toxického textu na webových stránkach.

Systém je implementovaný ako rozšírenie prehliadača podľa Chrome Manifest V3 a podporuje dva režimy inferencie:

- lokálnu inferenciu priamo v prehliadači,
- vzdialenú inferenciu prostredníctvom backendového API.

Cieľom projektu je poskytnúť praktický nástroj integrovaný do prehliadača, ktorý dokáže detegovať potenciálne toxický text, vizuálne ho označiť alebo rozmazať a umožniť používateľovi nastaviť citlivosť detekcie, kategórie toxicity, režim spracovania, zobrazovanie skóre spoľahlivosti a whitelist domén.

Projekt zároveň vyhodnocuje praktický kompromis medzi lokálnou inferenciou zachovávajúcou súkromie a presnejšou alebo jednoduchšie vymeniteľnou vzdialenou inferenciou.

---

## Štruktúra CD média

CD médium je organizované nasledovne:

```text
CD medium/
├── docs/
│   ├── README.md
│   ├── USER_MANUAL.md
│   └── screenshots/
├── tex/
├── src/
│   ├── frontend/
│   └── backend/
└── dist/
```

Priečinok `docs` obsahuje systémovú príručku (`README.md`), používateľskú príručku (`USER_MANUAL.md`) a obrázky použité v príručkách.  
Priečinok `tex` obsahuje zdrojové súbory záverečnej práce.  
Priečinok `src/frontend` obsahuje zdrojový kód rozšírenia prehliadača Chrome.  
Priečinok `src/backend` obsahuje voliteľné backendové API pre vzdialenú inferenciu toxicity.  
Priečinok `dist` obsahuje zostavenú verziu rozšírenia pripravenú na načítanie do prehliadača Chrome.

---

## Frontend – rozšírenie prehliadača Chrome

Frontend je implementovaný pomocou technológií Vite, React, Chrome Manifest V3 a TensorFlow.js.

Hlavná štruktúra frontendu:

```text
src/frontend/
├── artifacts/
│   └── test_metrics.json
├── public/
│   ├── local_char_model/
│   ├── background.js
│   ├── contentScript.js
│   ├── manifest.json
│   └── toxicityContract.global.js
├── scripts/
│   └── evaluate-local-model.js
├── src/
│   ├── assets/
│   ├── components/
│   ├── features/
│   ├── state/
│   ├── styles/
│   ├── App.jsx
│   ├── index.css
│   ├── main.jsx
│   ├── optionsMain.jsx
│   └── popupMain.jsx
├── val/
│   ├── cpu/
│   ├── old-tfjs-toxicity/
│   └── wasm/
├── options.html
├── popup.html
├── package.json
├── package-lock.json
└── vite.config.js
```

### Dôležité frontendové súbory

- `src/frontend/public/manifest.json` – konfigurácia rozšírenia podľa Chrome Manifest V3.
- `src/frontend/public/background.js` – service worker, centrálne akcie rozšírenia, komunikácia s aktívnou kartou a spracovanie vzdialeného API.
- `src/frontend/public/contentScript.js` – skenuje text stránky, spúšťa klasifikáciu a označuje alebo rozmazáva detegovaný toxický obsah.
- `src/frontend/public/toxicityContract.global.js` – normalizuje výstupy modelu, štítky, prahy, nastavenia prísnosti a výsledný verdikt.
- `src/frontend/public/local_char_model/` – súbory lokálneho TensorFlow.js modelu potrebné pre inferenciu v prehliadači.
- `src/frontend/src/state/SettingsContext.jsx` – spravuje nastavenia rozšírenia a ukladá ich do úložiska prehliadača Chrome.
- `src/frontend/src/popupMain.jsx` – vstupný bod popup okna rozšírenia.
- `src/frontend/src/optionsMain.jsx` – vstupný bod stránky nastavení.
- `src/frontend/scripts/evaluate-local-model.js` – skript na vyhodnotenie optimalizovaného lokálneho TensorFlow.js modelu.
- `src/frontend/val/` – vybrané výstupy lokálneho vyhodnotenia pre experimenty s lokálnym modelom.
- `src/frontend/artifacts/test_metrics.json` – vybrané testovacie metriky vygenerované počas lokálneho vyhodnotenia.

---

## Backend – API pre vzdialenú inferenciu

Backend poskytuje voliteľné API pre vzdialenú inferenciu. Používa sa vtedy, keď je rozšírenie prepnuté do vzdialeného režimu.

Hlavná štruktúra backendu:

```text
src/backend/
├── api/
│   ├── app.py
│   ├── thresholds.json
│   ├── thresholds_product_v2_1.json
│   ├── thresholds_tuned_v2_1.json
│   ├── thresholds_v2_1.json
│   └── thresholds_v2.json
├── train/
├── reports/
├── models/
│   └── xlmr-toxic-v2_1/
├── Dockerfile
└── requirements.txt
```

### Dôležité backendové súbory

- `src/backend/api/app.py` – hlavná aplikácia FastAPI.
- `src/backend/api/thresholds_product_v2_1.json` – produktová konfigurácia prahov používaná API.
- `src/backend/train/` – skripty na prípravu datasetov, trénovanie vzdialeného modelu, vyhodnotenie a ladenie prahov.
- `src/backend/reports/` – vybrané výstupy experimentov a výsledky vyhodnotenia modelov.
- `src/backend/models/xlmr-toxic-v2_1/` – natrénovaný XLM-R model používaný nakonfigurovaným vzdialeným API.
- `src/backend/requirements.txt` – Python závislosti potrebné na spustenie backendu.
- `src/backend/Dockerfile` – voliteľná kontajnerová konfigurácia pre nasadenie.

---

## Použité technológie

### Frontend

- Node.js
- npm
- Vite
- React
- Chrome Manifest V3
- TensorFlow.js
- TensorFlow.js WASM backend
- TensorFlow.js CPU backend

### Backend

- Python 3.11
- FastAPI
- Uvicorn
- PyTorch
- Transformers
- scikit-learn
- NumPy
- Pandas

---

## Modely

Projekt používa dve modelové časti:

1. lokálny model v prehliadači,
2. vzdialený backendový model.

### Lokálny model v prehliadači

Lokálny model v prehliadači sa očakáva v priečinku:

```text
src/frontend/public/local_char_model/
```

Tento model používa priamo rozšírenie prehliadača Chrome. Umožňuje klasifikovať text lokálne bez odosielania textu na server.

Lokálny model je určený ako rýchly variant spracovania na strane prehliadača so zachovaním súkromia. V náročnejších alebo menej zastúpených kategóriách toxicity však môže byť menej presný ako backendový model.

Súbory lokálneho modelu musia byť dostupné pred zostavením alebo spustením rozšírenia s lokálnou inferenciou.

### Vzdialený backendový model

Vzdialený backendový model sa očakáva v priečinku:

```text
src/backend/models/xlmr-toxic-v2_1/
```

Tento model používa backendové API pre vzdialenú inferenciu. Z dôvodu veľkosti nie je súbor `model.safetensors` súčasťou CD média. Ak má byť backendové API spustené lokálne, tento súbor musí byť doplnený samostatne alebo obnovený pomocou Git LFS.

Očakávaná štruktúra backendového modelu po doplnení modelového súboru:

```text
src/backend/models/xlmr-toxic-v2_1/
├── config.json
├── model.safetensors
├── tokenizer.json
├── tokenizer_config.json
├── training_args.bin
└── training_meta.json
```

---

## Inštalácia Git LFS

Git LFS je potrebný v prípade, že backendové modelové súbory sú uložené pomocou Git LFS.

Inštalácia a inicializácia Git LFS:

```bash
git lfs install
```

Po naklonovaní repozitára sa LFS súbory stiahnu príkazom:

```bash
git lfs pull
```

---

## Inštalácia a zostavenie frontendu

Prejdite do priečinka so zdrojovým kódom frontendu:

```bash
cd src/frontend
```

Nainštalujte závislosti:

```bash
npm install
```

Vytvorte produkčné zostavenie:

```bash
npm run build
```

Po úspešnom zostavení má byť zostavená verzia rozšírenia umiestnená v koreňovom priečinku `dist` na CD médiu:

```text
dist/
```

Ak sa výstup zostavenia vytvorí v priečinku `src/frontend/dist/`, skopírujte jeho obsah do koreňového priečinka `dist/` pred načítaním rozšírenia do prehliadača Chrome.

---

## Inštalácia alebo načítanie rozšírenia v prehliadači Chrome

Rozšírenie je možné použiť dvoma spôsobmi:

- nainštalovať z Chrome Web Store pomocou súkromného projektového odkazu,
- načítať manuálne ako rozbalené rozšírenie z priečinka `dist`.

### Inštalácia pomocou odkazu z Chrome Web Store

Rozšírenie je publikované v Chrome Web Store, ale nie je verejne vyhľadateľné. Pre potreby tohto projektu je distribuované pomocou priameho súkromného/nezverejneného odkazu:

```text
https://chromewebstore.google.com/detail/toxic-text-detector-hybri/jankcpfaihpjhecegklglapdokjljkfn?authuser=0&hl=en
```

Postup inštalácie:

1. Otvorte poskytnutý odkaz na Chrome Web Store.
2. Kliknite na **Add to Chrome**.
3. Potvrďte inštaláciu.
4. V prípade potreby pripnite rozšírenie na panel nástrojov.

Tento spôsob je odporúčaný pre bežné použitie a hodnotenie projektu.

### Manuálne načítanie rozbaleného rozšírenia

Pre vývoj, testovanie alebo demonštráciu záverečnej práce je možné rozšírenie načítať aj manuálne.

1. Otvorte Google Chrome.
2. Prejdite na adresu:

```text
chrome://extensions/
```

3. Zapnite **Developer mode**.
4. Kliknite na **Load unpacked**.
5. Vyberte priečinok:

```text
dist/
```

6. Rozšírenie sa zobrazí v zozname nainštalovaných rozšírení.

---

## Spustenie backendového API lokálne

Backendové API je možné spustiť lokálne, ak je natrénovaný XLM-R model dostupný v priečinku:

```text
src/backend/models/xlmr-toxic-v2_1/
```

Na spustenie backendového API je potrebný aj súbor `model.safetensors`. Ak tento súbor nie je prítomný, backendový zdrojový kód a konfigurácia sú dostupné, ale API nebude možné plnohodnotne spustiť.

Nasledujúce príkazy sú určené pre Windows Command Prompt a majú sa spúšťať z priečinka `src/backend`.

```cmd
set "HF_MODEL_PATH=.\models\xlmr-toxic-v2_1"
set "THRESHOLDS_PATH=.\api\thresholds_product_v2_1.json"
set "MODEL_ID=xlmr-toxic-v2_1"
set "THRESHOLD_SET=product_v2_1"

set "MAX_TOKENS=96"
set "MAX_BATCH=32"
set "ENABLE_INT8=1"
set "TORCH_THREADS=4"
set "OMP_NUM_THREADS=4"
set "MKL_NUM_THREADS=4"

py -m uvicorn api.app:app --host 127.0.0.1 --port 8000
```

Po úspešnom spustení je API dostupné na adrese:

```text
http://127.0.0.1:8000
```

Interaktívna dokumentácia FastAPI je po spustení backendu dostupná na adrese:

```text
http://127.0.0.1:8000/docs
```

---

## Premenné prostredia backendu

| Premenná | Význam |
|---|---|
| `HF_MODEL_PATH` | Cesta k lokálnemu natrénovanému XLM-R modelu |
| `THRESHOLDS_PATH` | Cesta ku konfigurácii prahov |
| `MODEL_ID` | Identifikátor modelu používaného API |
| `THRESHOLD_SET` | Názov sady prahov používanej API |
| `MAX_TOKENS` | Maximálny počet tokenov spracovaných modelom |
| `MAX_BATCH` | Maximálna veľkosť dávky prijatá API |
| `ENABLE_INT8` | Zapína INT8 optimalizáciu, ak je podporovaná |
| `TORCH_THREADS` | Počet CPU vlákien pre Torch |
| `OMP_NUM_THREADS` | Počet OpenMP vlákien |
| `MKL_NUM_THREADS` | Počet MKL vlákien |

---

## Prepínanie medzi cloud API a lokálnym API

Rozšírenie môže používať nakonfigurované cloud API alebo lokálne spustené API. Nasledujúce príkazy sú určené pre vývoj a testovanie. Spúšťajú sa v konzole prehliadača z kontextu rozšírenia, napríklad zo stránky nastavení rozšírenia.

### Prepnutie na nakonfigurované cloud API

```javascript
chrome.runtime.sendMessage(
  {
    type: "TTD_SET_REMOTE_ADMIN_CONFIG",
    payload: {
      apiUrl: "https://api-m3jhrljqsq-ew.a.run.app",
      token: ""
    }
  },
  console.log
);
```

### Prepnutie na lokálne API

```javascript
chrome.runtime.sendMessage(
  {
    type: "TTD_SET_REMOTE_ADMIN_CONFIG",
    payload: {
      apiUrl: "http://127.0.0.1:8000",
      token: ""
    }
  },
  console.log
);
```

### Obnovenie predvolenej konfigurácie API

```javascript
chrome.runtime.sendMessage(
  { type: "TTD_RESET_REMOTE_ADMIN_CONFIG" },
  console.log
);
```

### Kontrola aktuálnej konfigurácie API

```javascript
chrome.runtime.sendMessage(
  { type: "TTD_GET_REMOTE_ADMIN_CONFIG" },
  console.log
);
```

### Otestovanie aktuálneho API

```javascript
chrome.runtime.sendMessage(
  { type: "TTD_TEST_REMOTE_API" },
  console.log
);
```

### Opätovné skenovanie aktívnej karty po zmene API

```javascript
chrome.runtime.sendMessage(
  { type: "TTD_RESCAN_ACTIVE_TAB" },
  console.log
);
```

Bežný používateľ tieto príkazy nemusí spúšťať manuálne.

---

## Evaluačné skripty a výstupy

Optimalizovaný lokálny model v prehliadači je možné vyhodnotiť pomocou:

```bash
cd src/frontend
node scripts/evaluate-local-model.js
```

Vybrané výstupy lokálneho vyhodnotenia sú uložené v priečinku:

```text
src/frontend/val/
```

Evaluačný skript pri opätovnom spustení očakáva, že potrebné validačné dáta sú dostupné lokálne. Datasetové súbory nie sú súčasťou CD média.

Backendové tréningové a evaluačné skripty sú umiestnené v priečinku:

```text
src/backend/train/
```

Tieto skripty boli použité na prípravu datasetov, trénovanie vzdialeného modelu, vyhodnotenie a ladenie prahov.

Vyhodnotenie nebolo navrhnuté ako jeden identický benchmark pre všetky modely. Vzdialený model bol vyhodnotený podrobnejšie z hľadiska klasifikačnej kvality, nerovnováhy tried a rozhodovacích prahov. Pôvodný lokálny TF.js model bol testovaný ako počiatočný baseline, zatiaľ čo optimalizovaný lokálny TensorFlow.js model bol vyhodnotený samostatne ako praktické riešenie na strane prehliadača.

---

## Poznámky k datasetom

Pôvodné datasety Jigsaw a veľké surové archívy nie sú súčasťou CD média. Boli použité počas trénovania a vyhodnotenia, ale nie sú potrebné na bežné používanie rozšírenia.

Vybrané lokálne výstupy vyhodnotenia sú zahrnuté v priečinku `src/frontend/val/`, ale surové validačné datasetové súbory nie sú súčasťou CD média.

CD médium obsahuje zdrojový kód, konfiguráciu modelov, vybrané reporty, lokálny model v prehliadači alebo jeho očakávané umiestnenie a backendový model alebo jeho očakávané umiestnenie potrebné na spustenie API.

---

## Hlavná funkcionalita

Implementovaný systém podporuje:

- detekciu potenciálne toxického textu na webových stránkach,
- lokálnu inferenciu priamo v prehliadači,
- voliteľnú vzdialenú inferenciu cez API,
- automatické rozmazanie detegovaného toxického textu,
- zobrazovanie skóre spoľahlivosti,
- výber kategórií toxicity,
- zmenu úrovne citlivosti,
- whitelist domén,
- štatistiky v popup okne,
- export a import nastavení rozšírenia, ak sú dostupné na stránke nastavení,
- vývojárske príkazy na testovanie konfigurácie vzdialenej inferencie.

Spätná väzba používateľa pri nesprávnej klasifikácii bola zvažovaná počas UX prototypovania, ale nie je súčasťou finálnej implementovanej funkcionality rozšírenia.

---

## Rozsah a obmedzenia

Toxic Text Detector je pomocný nástroj založený na automatických predikciách modelu. Môže pomôcť detegovať a vizuálne znížiť vystavenie používateľa potenciálne toxickému textu, ale nenahrádza ľudský úsudok ani moderovanie.

Medzi známe obmedzenia patria:

- možné falošne pozitívne výsledky, keď je neškodný text označený ako toxický,
- možné falošne negatívne výsledky, keď toxický text nie je detegovaný,
- slabší výkon pri zriedkavých alebo náročných kategóriách toxicity,
- obmedzená spoľahlivosť pri implicitnej, sarkastickej, kontextovej alebo viacjazyčnej toxicite,
- možný vplyv na výkon pri veľmi veľkých stránkach s veľkým množstvom textových prvkov,
- rozdiely medzi lokálnou a vzdialenou inferenciou spôsobené architektúrou modelu, prostredím nasadenia a nastavením prahov.

Lokálna inferencia zachováva súkromie a je rýchla, pretože text sa spracúva priamo v prehliadači. Vzdialená inferencia môže poskytnúť presnejšie výsledky v závislosti od backendového modelu, ale vyžaduje odoslanie analyzovaného textu na API server.

---

## Účel CD média

Toto CD médium obsahuje systémovú príručku, používateľskú príručku, zdrojový kód, zostavenú verziu rozšírenia a zdrojové súbory záverečnej práce.

Táto príručka opisuje technickú štruktúru CD média a zdrojový kód projektu Toxic Text Detector.