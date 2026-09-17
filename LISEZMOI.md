# Ménoboost — notes de maintenance

## 1. Brancher Calendly (à faire dès réception des liens)

Tout se règle dans **`assets/site.js`**, tout en haut du fichier :

```js
const CALENDLY = {
  masterclass: "https://calendly.com/d/dvny-hqr-dhq/diagnostic-offert",
  appel:       "https://calendly.com/d/dvny-hqr-dhq/diagnostic-offert"
};
```

**État actuel :** les deux clés pointent vers le même événement, « Diagnostic offert ».
La section Inscription affiche donc l'embed Calendly, et le formulaire de candidature
ouvre ce même événement en pop-up pré-rempli.

Dès que vous créez un événement Calendly dédié à la masterclass (webinaire, places
multiples), remplacez la première ligne : c'est la seule modification à faire.

> Si vous avez la page ouverte dans le navigateur, faites un rechargement forcé
> (**Ctrl + Maj + R**) après chaque modification de `site.js` — sinon le navigateur
> sert l'ancienne version depuis son cache.

`CALENDLY_BRANDING` est à `false` : les paramètres de couleur de l'embed sont une
option payante chez Calendly et peuvent empêcher le widget de se charger sur l'offre
gratuite. Passez-le à `true` si vous êtes sur une offre Standard ou supérieure.

## 2. Questions personnalisées Calendly (événement « appel découverte »)

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

## 3. Changer la date de la masterclass

Trois endroits, à garder cohérents :
1. `assets/site.js` → `MASTERCLASS_DATE` (et l'attribut `data-date` du compte à rebours) ;
2. `masterclass.html` → la carte « Jeudi 8 octobre » dans `.mc-facts` ;
3. `masterclass.html` → le bloc JSON-LD en bas de page (`startDate`, `endDate`).

## 4. Structure

```
index.html              accueil
masterclass.html        inscription masterclass + formulaire de candidature
blog/index.html         liste des articles
blog/*.html             4 articles SEO
assets/style.css        feuille de style commune à toutes les pages
assets/site.js          script commun (menu, Calendly, formulaire, compte à rebours)
assets/icons.sprite.html  source du sprite d'icônes (non chargé par le site)
sitemap.xml, robots.txt
```

Le sprite SVG est recopié en haut du `<body>` de chaque page. Si vous ajoutez une
icône, modifiez `assets/icons.sprite.html` puis reportez le bloc dans les pages
concernées.

## 5. Avant la mise en ligne

- [ ] Renseigner les deux liens Calendly.
- [ ] Vérifier le domaine : les balises `canonical`, Open Graph, le `sitemap.xml` et
      le `robots.txt` utilisent `https://www.menoboost.fr` — à remplacer si besoin.
- [ ] Soumettre `sitemap.xml` dans la Google Search Console.
- [ ] Créer les pages Mentions légales / CGV / Confidentialité (liens présents en
      pied de page mais encore inactifs).
- [ ] Ajouter une image Open Graph dédiée (1200 × 630) pour la masterclass.
