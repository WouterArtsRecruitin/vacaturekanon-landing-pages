---
noteId: "731db8903b0c11f1ae456f923689b5c8"
tags: []
---

# Score Vacature

Deze pagina is een speelbare Meta-campagne landingspage voor de game **Score Vacature**.
Het idee: werkgevers moeten 8 tech-talenten raken in 25 seconden, terwijl HR/recuiter-ruis in de weg zit.
De pay-off is: **"Schiet jij je vacature raak?"**

## Waarom deze page

- Deze page dient als brand experience en lead-gen touchpoint binnen de vacaturekanon-campagne.
- Het spel is bewust moeilijker gemaakt dan de oorspronkelijke prototype-versie, zodat de boodschap ondersteuning krijgt: tech-talent scoren is niet zomaar een makkie.

## Waar aanpassingen staan

- `pages/score-vacature/game.jsx` bevat gameplay, doel, timers en de Facebook Pixel stub.
- `pages/score-vacature/index.html` laadt React, Babel en het spel.
- `pages/score-vacature/assets/logo-recruitin.png` is de logo asset die in het spel wordt gebruikt.

## Aanpassen

- `FACEBOOK_PIXEL_ID` en event hooks staan bovenin `pages/score-vacature/game.jsx`.
- De `discountCode` staat in `pages/score-vacature/game.jsx` en wordt in het win-scherm getoond.

## Lokaal testen

Gebruik een statische server vanuit de repo root:

```bash
cd /Users/wouterarts/vacaturekanon-landing-pages
python3 -m http.server 8080
```

Open dan:

```text
http://localhost:8080/pages/score-vacature/
```
