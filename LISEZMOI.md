# Ménoboost — notes de maintenance

## 1. Brancher les formulaires (à faire avant la mise en ligne)

La page `masterclass.html` porte **deux** formulaires maison :

| Section | Ce qu'elle demande | Clé `form` envoyée |
|---------|--------------------|--------------------|
| « Inscription » | prénom, nom, e-mail, téléphone — et rien d'autre | `masterclass` |
| « Groupe privé · MénoBoost+ » | le questionnaire en 2 pages, puis les coordonnées | `whatsapp` |

Les deux envoient vers le **même webhook** ; c'est la clé `form` du JSON qui dit
lequel a été rempli, à vous d'aiguiller ensuite (liste d'inscrites d'un côté,
invitations WhatsApp de l'autre). L'adresse du webhook se règle tout en haut de
**`assets/site.js`** :

```js
const INSCRIPTION_ENDPOINT = "";
```

**État actuel :** vide. Les formulaires fonctionnent (validation, navigation entre
les pages, message de confirmation) mais **n'envoient rien** : ils affichent à la
place « … pas encore branché. Écrivez-nous à contact@menoboost.fr… ». Collez
l'URL du webhook pour les activer. Les deux messages de confirmation se modifient
dans la constante `MESSAGES` de `assets/site.js`.

N'importe quel outil capable de recevoir un POST fait l'affaire : un scénario Make,
un Zap, un workflow n8n, une automatisation Brevo, un script Google Apps Script
relié à une feuille de calcul. **Ne collez jamais une clé d'API ici** : le fichier
est public, un webhook suffit.

Une inscription à la masterclass arrive sous cette forme :

```json
{
  "form": "masterclass",
  "session": "2026-10-08T17:00:00.000Z",
  "sessionLabel": "jeudi 8 octobre",
  "prenom": "Marie", "nom": "Durand",
  "email": "marie@exemple.fr", "tel": "06 12 34 56 78",
  "page": "https://www.menoboost.fr/masterclass.html",
  "date": "2026-10-01T09:12:44.000Z"
}
```

Une demande d'accès au groupe WhatsApp ajoute les réponses du questionnaire :

```json
{
  "form": "whatsapp",
  "prenom": "Marie", "nom": "Durand",
  "email": "marie@exemple.fr", "tel": "06 12 34 56 78",
  "age": "52", "pays": "France",
  "essais": ["Naturopathie", "Compléments alimentaires"],
  "adaptation": "…", "situation": "…", "accompagnement": "…",
  "budget": "…", "connaissance": "…", "achat": "…",
  "session": "…", "sessionLabel": "…", "page": "…", "date": "…"
}
```

`session` est la date de la prochaine masterclass au moment de l'envoi : c'est elle
qui dit à quelle session inscrire la personne.

L'envoi se fait en mode `no-cors`, pour que le webhook n'ait aucun en-tête CORS à
configurer. Contrepartie : le navigateur ne peut pas lire la réponse, donc la page
affiche la confirmation sans pouvoir vérifier que le webhook a bien répondu.
**Faites un test réel après avoir collé l'URL** — c'est le seul moyen de s'assurer
que les inscriptions arrivent.

> Après chaque modification de `site.js`, rechargez la page avec **Ctrl + Maj + R**,
> sinon le navigateur sert l'ancienne version depuis son cache.

## 2. Changer le jour ou l'heure de la masterclass

La masterclass a lieu **toutes les semaines, le jeudi à 19 h 00 (heure de Paris)**.
La date affichée sur le site et le compte à rebours se calculent tout seuls : il n'y
a **aucune date à mettre à jour à la main**. Pour changer de créneau, un seul
endroit, dans `assets/site.js` :

```js
const MASTERCLASS = { jour: 4, heure: 19, minute: 0, duree: 90 };
```

- `jour` : 0 = dimanche, 1 = lundi … 4 = jeudi … 6 = samedi
- `heure` / `minute` : heure de Paris (le passage heure d'été / heure d'hiver est géré)
- `duree` : en minutes — sert à savoir si la session est en cours

Si vous changez de jour, pensez aussi aux textes qui disent « tous les jeudis »
(`masterclass.html` : le panneau `.mc-next` de l'en-tête, le titre de la section
Inscription, la section WhatsApp et la FAQ ; `index.html` : bloc Masterclass) et au bloc JSON-LD en bas de `masterclass.html`
(`eventSchedule` → `byDay`, `startTime`, `endTime`). Les dates `startDate` /
`endDate` de ce bloc bornent la période de récurrence : allongez-les avant fin 2027.

**Session exceptionnelle à une autre date ?** Ajoutez un attribut `data-date` sur
le compte à rebours de `masterclass.html` :

```html
<div id="countdown" class="countdown" data-date="2026-12-18T19:00:00+01:00"></div>
```

Retirez-le pour revenir au rythme hebdomadaire.

**Afficher la prochaine date dans un texte :** mettez `data-mc-date` sur n'importe
quelle balise, son contenu est remplacé par « jeudi 8 octobre ».

```html
La prochaine, c'est <b data-mc-date>jeudi soir</b>.
```

## 3. Brancher Calendly (formulaire de candidature au programme)

Tout se règle dans `assets/site.js` :

```js
const CALENDLY = {
  appel: "https://calendly.com/d/dvny-hqr-dhq/diagnostic-offert"
};
```

Le formulaire de candidature (section « Candidature » de `masterclass.html`) ouvre
cet événement en pop-up, pré-rempli avec les réponses.

`CALENDLY_BRANDING` est à `false` : les paramètres de couleur de l'embed sont une
option payante chez Calendly et peuvent empêcher le widget de se charger sur l'offre
gratuite. Passez-le à `true` si vous êtes sur une offre Standard ou supérieure.

### Questions personnalisées Calendly (événement « appel découverte »)

Le formulaire de candidature transmet ses réponses via les paramètres `a1`…`a7`.
Calendly numérote ces paramètres **dans l'ordre de création des questions**. Créez-les
donc exactement dans cet ordre :

| Ordre | Question à créer dans Calendly | Champ du formulaire |
|-------|-------------------------------|---------------------|
| a1 | Votre téléphone | Téléphone |
| a2 | Votre tranche d'âge | Tranche d'âge |
| a3 | Où en êtes-vous ? | Péri-ménopause / ménopause / … |
| a4 | Qu'est-ce qui vous pèse le plus ? | Symptômes (réponses multiples) |
| a5 | Bilan sanguin de moins de 6 mois ? | Bilan sanguin |
| a6 | Format souhaité | Présentiel / en ligne |
| a7 | Objectif à 3 mois | Zone de texte |

Les champs *Prénom*, *Nom* et *E-mail* alimentent les champs standard `name` et `email`.

Si l'ordre change côté Calendly, ajustez les attributs `data-cal-answer="aN"` dans
`masterclass.html`.

## 4. Modifier les questions du questionnaire WhatsApp

Chaque question est un `<div class="field">` dans `masterclass.html`, section
`<!-- GROUPE WHATSAPP -->`, entre `<!-- PAGE 1 : le questionnaire -->` et
`<!-- PAGE 2 : les coordonnees -->`.
Le nom envoyé au webhook est l'attribut `name` du champ : `name="essais"` arrive
dans le JSON sous la clé `essais`. Ajouter `required` sur un champ (ou sur la
première case d'un groupe de cases à cocher) le rend obligatoire.

Pour supprimer une question, effacez son `<div class="field">` en entier —
rien d'autre à faire. Pour déplacer une question d'une page à l'autre, déplacez ce
même bloc dans l'autre `<div class="f-page">`.

Ajouter une troisième page : créez un `<div class="f-page">` supplémentaire avec sa
barre `<div class="f-nav">` (bouton `data-prev` et bouton `data-next`). Le
compteur « Page 1 sur 2 » et la barre de progression s'ajustent tout seuls.

## 5. Le fond de l'en-tête masterclass

L'en-tête de `masterclass.html` reprend le procédé de la hero d'accueil : la même
photo `images/hero.avif` est posée deux fois, une fois en plein cadre (floutee par le
panneau de verre marine) et une fois cadrée dans la bande de droite pour que le
visage y soit centré. Le navigateur ne la télécharge qu'une fois.

Pour changer de photo, remplacez les **deux** `src` dans le bloc `<div class="page-hero">`
de `masterclass.html`. La largeur du panneau de verre se règle avec une seule variable
dans `assets/style.css` :

```css
:root{--ph-glass:min(100%,max(62%,880px))}
```

Le `880px` est un plancher : il garantit que la colonne de texte reste toujours sur
le verre, même sur un écran étroit. En dessous de 1060 px de large, le verre occupe
toute la largeur et la bande photo disparaît.

## 6. Structure

```
index.html              accueil
masterclass.html        inscription masterclass + groupe WhatsApp + candidature
blog/index.html         liste des articles
blog/*.html             4 articles SEO
assets/style.css        feuille de style commune à toutes les pages
assets/site.js          script commun (menu, dates, formulaires, Calendly, compte à rebours)
assets/icons.sprite.html  source du sprite d'icônes (non chargé par le site)
sitemap.xml, robots.txt
```

Le sprite SVG est recopié en haut du `<body>` de chaque page. Si vous ajoutez une
icône, modifiez `assets/icons.sprite.html` puis reportez le bloc dans les pages
concernées.

## 7. Avant la mise en ligne

- [ ] Renseigner `INSCRIPTION_ENDPOINT`, puis faire un test de bout en bout des
      **deux** formulaires (inscription et groupe WhatsApp).
- [ ] Décider si la section « Groupe privé · MénoBoost+ » reste sur cette page :
      c'est le bloc `<!-- GROUPE WHATSAPP -->`, supprimable d'un seul tenant.
- [ ] Vérifier le lien Calendly de l'appel découverte.
- [ ] Vérifier le domaine : les balises `canonical`, Open Graph, le `sitemap.xml` et
      le `robots.txt` utilisent `https://www.menoboost.fr` — à remplacer si besoin.
- [ ] Soumettre `sitemap.xml` dans la Google Search Console.
- [ ] Créer les pages Mentions légales / CGV / Confidentialité (liens présents en
      pied de page mais encore inactifs).
- [ ] Ajouter une image Open Graph dédiée (1200 × 630) pour la masterclass.
