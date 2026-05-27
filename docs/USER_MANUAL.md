# Toxic Text Detector – používateľská príručka

Toxic Text Detector je rozšírenie webového prehliadača, ktoré pomáha používateľovi identifikovať a vizuálne obmedziť kontakt s potenciálne toxickým textom na webových stránkach. Rozšírenie dokáže text označiť alebo rozmazať a zobraziť základnú informáciu o kategórii toxicity a skóre spoľahlivosti.

Výsledky rozšírenia sú automatické predikcie modelu. Nemajú sa chápať ako konečné rozhodnutie, ale ako pomocný signál pre používateľa.

---

## 1. Požiadavky

Na používanie rozšírenia je potrebný prehliadač Google Chrome alebo iný prehliadač založený na Chromiu.

Pri bežnom používaní v lokálnom režime nie je potrebné spúšťať backendové API. Vzdialený režim vyžaduje dostupné nakonfigurované API.

---

## 2. Inštalácia

Rozšírenie je publikované v Chrome Web Store, ale nie je verejne vyhľadateľné. Pre potreby projektu je dostupné cez súkromný/nezverejnený odkaz:

```text
https://chromewebstore.google.com/detail/toxic-text-detector-hybri/jankcpfaihpjhecegklglapdokjljkfn?authuser=0&hl=en
```

Postup inštalácie:

1. Otvorte poskytnutý odkaz.
2. Kliknite na **Add to Chrome**.
3. Potvrďte inštaláciu.
4. V prípade potreby pripnite rozšírenie na panel nástrojov prehliadača.

![Inštalácia rozšírenia z Chrome Web Store](screenshots/chrome-webstore-install.png)

Alternatívne je možné rozšírenie načítať manuálne z pripraveného priečinka `dist/` pomocou stránky `chrome://extensions/` a možnosti **Load unpacked**. Tento spôsob je určený najmä na demonštráciu alebo kontrolu projektu.

---

## 3. Základné používanie

Po nainštalovaní otvorte webovú stránku s textovým obsahom, napríklad článok, fórum, diskusiu alebo sekciu komentárov.

Základný postup:

1. Kliknite na ikonu rozšírenia Toxic Text Detector.
2. Skontrolujte, či je ochrana zapnutá.
3. V prípade potreby otvorte nastavenia.
4. Prehliadajte stránku bežným spôsobom.
5. Ak je detegovaný potenciálne toxický text, rozšírenie ho označí alebo rozmaže podľa aktuálnych nastavení.
6. Rozmazaný text je možné podľa potreby znovu zobraziť.

Účelom rozšírenia nie je trvalo odstrániť obsah zo stránky, ale znížiť nechcené vystavenie potenciálne toxickému textu.

---

## 4. Popup okno

Popup okno sa otvorí kliknutím na ikonu rozšírenia v paneli nástrojov prehliadača.

Zobrazuje najmä:

- stav ochrany,
- prepínač zapnutia alebo vypnutia ochrany,
- počet detegovaných textových úsekov,
- počet rozmazaných alebo označených úsekov,
- tlačidlo na otvorenie nastavení.

Ak je ochrana vypnutá, rozšírenie prestane aktívne skenovať a označovať nový obsah.

![Popup okno rozšírenia](screenshots/popup.png)

---

## 5. Nastavenia

Stránka nastavení umožňuje upraviť správanie rozšírenia. Otvára sa z popup okna.

Hlavné nastavenia:

- **citlivosť detekcie** – určuje, ako prísne bude rozšírenie označovať text,
- **režim spracovania** – lokálny alebo vzdialený režim,
- **kategórie toxicity** – výber kategórií, ktoré sa majú detegovať,
- **Auto-blur** – automatické rozmazanie detegovaného textu,
- **Show confidence scores** – zobrazenie skóre spoľahlivosti,
- **whitelist domén** – zoznam stránok, na ktorých sa detekcia vypne,
- **export/import nastavení** – uloženie alebo obnovenie konfigurácie, ak je táto možnosť dostupná.

![Stránka nastavení rozšírenia](screenshots/settings-page.png)

---

## 6. Citlivosť detekcie

Vyššia citlivosť znamená, že rozšírenie označí viac textov ako potenciálne toxické.  
Nižšia citlivosť znamená konzervatívnejšie správanie a menej označených textov.

Odporúčanie:

- vyššiu citlivosť použite pri požiadavke na silnejšiu ochranu,
- nižšiu citlivosť použite vtedy, keď je označovaných príliš veľa neškodných textov.

Citlivosť mení rozhodovanie modelu, ale nezaručuje dokonalú detekciu.

---

## 7. Režimy spracovania

Rozšírenie podporuje dva režimy spracovania.

### Lokálny režim

V lokálnom režime sa text spracúva priamo v prehliadači.

Výhody:

- text sa nemusí odosielať na server,
- lepšia ochrana súkromia,
- rýchla odozva,
- fungovanie bez backendového API.

Lokálny režim je odporúčaný na bežné prehliadanie. Môže však byť menej presný pri náročnejších kategóriách toxicity.

### Vzdialený režim

Vo vzdialenom režime sa text odosiela na nakonfigurovaný API server, ktorý vykoná klasifikáciu.

Výhody:

- možnosť použiť výkonnejší backendový model,
- v niektorých prípadoch presnejšia detekcia,
- vhodné na testovanie alebo porovnanie.

Vzdialený režim používajte iba vtedy, keď rozumiete tomu, že analyzovaný text sa odosiela na API server, a súhlasíte s týmto správaním.

Technické nastavenie API je opísané v systémovej príručke `README.md`.

---

## 8. Kategórie toxicity

Rozšírenie podporuje viacero kategórií toxicity:

- Toxicity,
- Insult,
- Profanity,
- Threat,
- Identity attack.

Každú kategóriu je možné zapnúť alebo vypnúť samostatne. Ak je kategória vypnutá, nebude použitá pri označovaní alebo rozmazávaní textu.

---

## 9. Automatické rozmazanie a zobrazenie textu

Možnosť **Auto-blur** určuje, či sa detegovaný toxický text automaticky rozmaže.

Ak je Auto-blur zapnutý, detegovaný text bude vizuálne rozmazaný.  
Ak je vypnutý, rozšírenie môže text iba označiť bez jeho skrytia.

Rozmazaný text je možné podľa potreby zobraziť. Používateľ tak zostáva v kontrole nad tým, či chce pôvodný obsah vidieť.

![Príklad rozmazaného toxického textu](screenshots/blurred-text-example.png)

---

## 10. Skóre spoľahlivosti

Možnosť **Show confidence scores** určuje, či sa pri výsledku zobrazí percentuálne skóre.

Skóre pomáha používateľovi lepšie pochopiť výsledok modelu, ale nemá sa interpretovať ako absolútna pravda. Ide o výstup modelu pri aktuálnom nastavení citlivosti, kategórií a prahov.

---

## 11. Whitelist domén

Whitelist slúži na vypnutie detekcie na vybraných webových stránkach.

Postup:

1. Otvorte nastavenia.
2. Nájdite sekciu **Whitelist Domains**.
3. Zadajte doménu, napríklad:

```text
example.com
```

4. Kliknite na **Add**.

Po pridaní domény rozšírenie nebude na tejto stránke skenovať ani označovať obsah.

---

## 12. Odporúčané nastavenia

Pre bežné používanie sa odporúča:

- ochrana zapnutá,
- lokálny režim,
- Auto-blur zapnutý,
- skóre spoľahlivosti podľa preferencie používateľa,
- zapnuté iba relevantné kategórie toxicity,
- whitelist pre dôveryhodné stránky, kde detekcia nie je potrebná.

Pre demonštráciu alebo testovanie je vhodné zapnúť skóre spoľahlivosti a podľa potreby upraviť citlivosť.

---

## 13. Súkromie

V lokálnom režime sa analyzovaný text spracúva priamo v prehliadači a nemusí sa odosielať na server.

Vo vzdialenom režime sa analyzovaný text odosiela na nakonfigurovaný API server. Tento režim používajte iba vtedy, keď s týmto spracovaním súhlasíte.

Rozšírenie môže ukladať nastavenia, napríklad citlivosť, zapnuté kategórie, zvolený režim, Auto-blur, zobrazovanie skóre a whitelist domén.

---

## 14. Obmedzenia

Toxic Text Detector používa automatické predikcie modelov. Rozšírenie môže pomôcť znížiť vystavenie toxickému textu, ale nedokáže úplne pochopiť každý kontext ľudskej komunikácie.

Známe obmedzenia:

- možný falošne pozitívny výsledok, keď je neškodný text označený ako toxický,
- možný falošne negatívny výsledok, keď toxický text nie je detegovaný,
- slabší výkon pri zriedkavých alebo náročných kategóriách,
- obmedzená spoľahlivosť pri implicitnej, sarkastickej, kontextovej alebo viacjazyčnej toxicite,
- pomalšie spracovanie na veľmi veľkých stránkach.

Rozšírenie nenahrádza ľudský úsudok ani moderovanie. Slúži ako pomocný nástroj pri prehliadaní webu.

---

## 15. Riešenie problémov

### Rozšírenie sa nezobrazuje

Skontrolujte, či je rozšírenie nainštalované, zapnuté a prípadne pripnuté na panel nástrojov.

### Text nie je detegovaný

Možné príčiny:

- ochrana je vypnutá,
- stránka je vo whiteliste,
- relevantné kategórie sú vypnuté,
- text je príliš krátky,
- stránka nebola po zmene nastavení opätovne preskenovaná,
- model nevyhodnotil text ako toxický pri aktuálnom nastavení.

### Text je detegovaný, ale nie je rozmazaný

Skontrolujte, či je zapnutá možnosť **Auto-blur**.

### Skóre spoľahlivosti nie je viditeľné

Skontrolujte, či je zapnutá možnosť **Show confidence scores**.

### Vzdialený režim nefunguje

Skontrolujte, či je dostupné nakonfigurované API a či je vzdialený režim zapnutý. Technické nastavenie API je opísané v systémovej príručke `README.md`.

### Stránka je pomalšia

Veľké stránky s veľkým množstvom textu môžu vyžadovať viac spracovania. V takom prípade použite whitelist pre stránky, kde detekcia nie je potrebná, alebo vypnite nepotrebné kategórie.