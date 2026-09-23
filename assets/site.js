/* ============================================================================
   MENOBOOST — script commun a toutes les pages
   ============================================================================

   >>> 1. OU ARRIVENT LES INSCRIPTIONS A LA MASTERCLASS <<<
   Collez ci-dessous l'URL du webhook qui recoit les inscriptions (Make, Zapier,
   n8n, Brevo Automation, Google Apps Script...). Tant qu'elle reste vide, le
   formulaire fonctionne mais n'envoie rien : il affiche un message invitant a
   ecrire a contact@menoboost.fr. Ne mettez JAMAIS une cle d'API ici : le
   fichier est public. Un webhook, c'est tout ce qu'il faut.

   Le webhook recoit un POST avec un corps JSON :
     { form:"masterclass", session:"2026-10-08T19:00:00.000Z",
       sessionLabel:"jeudi 8 octobre", prenom, nom, email, tel, age, pays,
       essais:[...], adaptation, situation, accompagnement, budget,
       connaissance, achat, page, date }
   ========================================================================== */
const INSCRIPTION_ENDPOINT = "";

/* ---------------------------------------------------------------------------
   >>> 2. RENDEZ-VOUS CALENDLY (formulaire de candidature au programme) <<<
   « appel » est branche sur l'evenement « Diagnostic offert ».
   ------------------------------------------------------------------------- */
const CALENDLY = {
  appel: "https://calendly.com/d/dvny-hqr-dhq/diagnostic-offert"
};

/* Personnalisation des couleurs de l'embed : reservee aux offres payantes Calendly.
   Laissez false si vous etes sur l'offre gratuite, sinon le widget peut refuser de
   se charger. Passez a true une fois sur une offre Standard ou superieure. */
const CALENDLY_BRANDING = false;

/* ---------------------------------------------------------------------------
   >>> 3. HORAIRE DE LA MASTERCLASS <<<
   La masterclass a lieu toutes les semaines, le meme soir. La date affichee et
   le compte a rebours se calculent tout seuls : aucune date a mettre a jour a
   la main. Pour changer de jour ou d'heure, modifiez seulement ce bloc.
     jour  : 0 = dimanche, 1 = lundi ... 4 = jeudi ... 6 = samedi
     heure / minute : heure de Paris
     duree : en minutes (sert a savoir si la session est en cours)
   ------------------------------------------------------------------------- */
const MASTERCLASS = { jour: 4, heure: 19, minute: 0, duree: 90 };

/* ---------------------------------------------------------------- reveal */
const io = new IntersectionObserver(
  es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
  { threshold: .1 }
);
document.querySelectorAll('.rv').forEach(el => io.observe(el));

/* ------------------------------------------------------------ menu mobile */
const burger = document.getElementById('burger'), mnav = document.getElementById('mobile-menu');
if (burger && mnav) {
  const setMenu = o => {
    burger.setAttribute('aria-expanded', o);
    burger.setAttribute('aria-label', o ? 'Fermer le menu' : 'Ouvrir le menu');
    mnav.classList.toggle('open', o);
    mnav.setAttribute('aria-hidden', !o);
    document.body.classList.toggle('no-scroll', o);
  };
  burger.addEventListener('click', e => { e.stopPropagation(); setMenu(burger.getAttribute('aria-expanded') !== 'true'); });
  mnav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', e => { if (!e.target.closest('header')) setMenu(false); });
  matchMedia('(min-width:1061px)').addEventListener('change', e => { if (e.matches) setMenu(false); });
}

/* ================================================ date de la prochaine session
   Tout est calcule en heure de Paris, quel que soit le fuseau du visiteur
   (une inscrite depuis Montreal ou La Reunion voit la bonne date).
   ========================================================================== */
const TZ = 'Europe/Paris';

/** Decalage horaire de Paris (en ms) a l'instant donne — gere l'heure d'ete. */
function tzOffsetMs(date) {
  const p = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(date).forEach(({ type, value }) => { p[type] = value; });
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour % 24, p.minute, p.second);
  return asUTC - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convertit une date/heure « de Paris » en timestamp universel. */
function parisToTimestamp(y, m, d, h, min) {
  const naive = Date.UTC(y, m - 1, d, h, min);
  let ts = naive;
  for (let i = 0; i < 2; i++) ts = naive - tzOffsetMs(new Date(ts));
  return ts;
}

/** Composantes calendaires de la date, lues a Paris. */
function parisParts(date) {
  const p = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false, weekday: 'short',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).forEach(({ type, value }) => { p[type] = value; });
  const jours = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { y: +p.year, m: +p.month, d: +p.day, jour: jours[p.weekday] };
}

/** Prochaine masterclass : { debut, fin, enCours } en timestamps. */
function prochaineMasterclass(from = Date.now()) {
  const dureeMs = MASTERCLASS.duree * 6e4;
  for (let i = 0; i <= 8; i++) {
    const { y, m, d, jour } = parisParts(new Date(from + i * 864e5));
    if (jour !== MASTERCLASS.jour) continue;
    const debut = parisToTimestamp(y, m, d, MASTERCLASS.heure, MASTERCLASS.minute);
    if (from < debut + dureeMs) return { debut, fin: debut + dureeMs, enCours: from >= debut };
  }
  return null;
}

/** « jeudi 8 octobre » — le jour de la semaine et la date, en francais. */
function libelleSession(ts) {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long'
  }).format(new Date(ts));
}

/* Remplit tous les <span data-mc-date> de la page. */
function majDatesAffichees() {
  const s = prochaineMasterclass();
  if (!s) return;
  document.querySelectorAll('[data-mc-date]').forEach(el => { el.textContent = libelleSession(s.debut); });
}
majDatesAffichees();

/* -------------------------------------------------------------- Calendly */
let calendlyAsked = false;
/** Charge widget.js une seule fois, uniquement si un lien est configure. */
function loadCalendly() {
  if (calendlyAsked) return;
  calendlyAsked = true;
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = 'https://assets.calendly.com/assets/external/widget.css';
  document.head.appendChild(css);
  const s = document.createElement('script');
  s.src = 'https://assets.calendly.com/assets/external/widget.js';
  s.async = true;
  document.head.appendChild(s);
}

/** Construit l'URL Calendly avec pre-remplissage (nom, email, reponses). */
function calendlyUrl(base, prefill) {
  const u = new URL(base);
  u.searchParams.set('hide_gdpr_banner', '1');
  if (CALENDLY_BRANDING) {
    u.searchParams.set('background_color', 'ffffff');
    u.searchParams.set('text_color', '16262f');
    u.searchParams.set('primary_color', '4c7539');
  }
  Object.entries(prefill || {}).forEach(([k, v]) => { if (v) u.searchParams.set(k, v); });
  return u.toString();
}

/* Embeds inline : <div class="cal-embed" data-cal="appel"></div>
   Le bloc .cal-todo frere reste visible tant qu'aucun lien n'est configure. */
document.querySelectorAll('[data-cal]').forEach(el => {
  const url = CALENDLY[el.dataset.cal];
  if (!url) return;                       // pas de lien : on garde le bloc « a venir »
  const todo = el.parentElement.querySelector('.cal-todo');
  if (todo) todo.remove();
  el.classList.add('calendly-inline-widget');
  el.setAttribute('data-url', calendlyUrl(url, {}));
  loadCalendly();
});

/* Boutons qui ouvrent Calendly en popup : <a data-cal-popup="appel"> */
document.querySelectorAll('[data-cal-popup]').forEach(a => {
  const key = a.dataset.calPopup;
  if (!CALENDLY[key]) return;             // sans lien, le href de repli reste actif
  loadCalendly();
  a.addEventListener('click', e => {
    e.preventDefault();
    openCalendly(key, {});
  });
});

/** Ouvre le popup Calendly, ou bascule sur un nouvel onglet si le widget n'a pas charge. */
function openCalendly(key, prefill) {
  const base = CALENDLY[key];
  if (!base) return false;
  const url = calendlyUrl(base, prefill);
  if (window.Calendly && typeof window.Calendly.initPopupWidget === 'function') {
    window.Calendly.initPopupWidget({ url });
  } else {
    window.open(url, '_blank', 'noopener');
  }
  return true;
}

/* ------------------------------------------------------- compte a rebours */
/* <div id="countdown" class="countdown"> se cale seul sur la prochaine session.
   Un attribut data-date="2026-10-08T19:00:00+02:00" force une date unique
   (session exceptionnelle) ; sans lui, c'est le rythme hebdomadaire. */
const cd = document.getElementById('countdown');
if (cd) {
  const dateFixe = cd.dataset.date ? new Date(cd.dataset.date).getTime() : null;
  const units = [['j', 864e5], ['h', 36e5], ['min', 6e4], ['s', 1e3]];
  const tick = () => {
    const now = Date.now();
    const session = dateFixe
      ? { debut: dateFixe, fin: dateFixe + MASTERCLASS.duree * 6e4, enCours: now >= dateFixe }
      : prochaineMasterclass(now);

    if (!session || now >= session.fin) {
      cd.innerHTML = '<div class="cd-over">La prochaine date sera annoncée très vite — laissez vos coordonnées juste en dessous.</div>';
      return;
    }
    if (session.enCours) {
      cd.innerHTML = '<div class="cd-over">La session est en cours — inscrivez-vous pour la prochaine.</div>';
      return;
    }
    let left = session.debut - now;
    cd.innerHTML = units.map(([label, ms]) => {
      const n = Math.floor(left / ms);
      left -= n * ms;
      return `<div class="cd-unit"><div class="n">${String(n).padStart(2, '0')}</div><div class="l">${label}</div></div>`;
    }).join('');
    majDatesAffichees();
  };
  tick();
  setInterval(tick, 1000);
}

/* ============================================================== formulaires
   Deux comportements, choisis par les attributs du <form> :

   a) <form class="mb-form" data-cal-target="appel">
      Candidature au programme. Les reponses pre-remplissent Calendly :
        name / email  -> champs standard
        a1, a2, a3...  -> questions personnalisees, dans l'ordre de creation
                          (attribut data-cal-answer sur le champ concerne).

   b) <form class="mb-form" data-post="masterclass">
      Inscription masterclass. Les reponses partent en JSON vers
      INSCRIPTION_ENDPOINT (voir tout en haut du fichier).

   Dans les deux cas, ajouter data-steps sur le <form> active la navigation
   par etapes : chaque etape est un <div class="f-page">, et la validation ne
   porte que sur l'etape affichee.
   ========================================================================== */
/* Message de confirmation, par type de formulaire. « ok » quand l'envoi est parti,
   « ko » tant qu'INSCRIPTION_ENDPOINT est vide. */
const MESSAGES = {
  masterclass: {
    ok: "Votre place est réservée. Vous recevez le lien de connexion par e-mail dans quelques minutes — pensez à regarder vos spams — puis un rappel la veille et une heure avant.",
    ko: "Les inscriptions en ligne ne sont pas encore branchées. Écrivez-nous à contact@menoboost.fr et Céline vous envoie le lien de la prochaine session."
  },
  whatsapp: {
    ok: "C'est enregistré. Céline vous envoie l'invitation au groupe sur votre numéro WhatsApp dans la journée.",
    ko: "Le questionnaire n'est pas encore branché. Écrivez-nous à contact@menoboost.fr et Céline vous ajoute au groupe."
  }
};

document.querySelectorAll('form.mb-form').forEach(form => {

  /* ------------------------------------------------------ validation */
  const clearError = f => f.classList.remove('err');
  form.querySelectorAll('input,select,textarea').forEach(i => {
    const reset = () => { const f = i.closest('.field'); if (f) clearError(f); };
    i.addEventListener('input', reset);
    i.addEventListener('change', reset);
  });

  /** Valide les champs contenus dans « scope ». Renvoie le 1er champ fautif. */
  function valider(scope) {
    let firstBad = null;
    scope.querySelectorAll('.field').forEach(f => {
      clearError(f);
      const inputs = [...f.querySelectorAll('input,select,textarea')];
      if (!inputs.some(i => i.required)) return;

      const ok = inputs.some(i => i.type === 'checkbox' || i.type === 'radio')
        // groupe de cases/boutons radio : au moins un coche
        ? inputs.some(i => i.checked)
        : inputs.every(i => !i.required || (i.value.trim() !== '' && i.checkValidity()));

      if (!ok) { f.classList.add('err'); firstBad = firstBad || f; }
    });
    return firstBad;
  }

  function signaler(field) {
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = field.querySelector('input,select,textarea');
    if (focusable) focusable.focus({ preventScroll: true });
  }

  /* ------------------------------------------------ navigation par etapes */
  const pages = [...form.querySelectorAll('.f-page')];
  let courante = 0;
  let retourDebut = () => {};

  if (pages.length > 1) {
    form.classList.add('stepped');
    const compteur = form.querySelector('[data-step-count]');
    const barre = form.querySelector('.f-prog span');

    const afficher = n => {
      courante = n;
      pages.forEach((p, i) => p.classList.toggle('on', i === n));
      if (compteur) compteur.textContent = `Page ${n + 1} sur ${pages.length}`;
      if (barre) barre.style.width = ((n + 1) / pages.length * 100) + '%';
    };

    form.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault();
      const bad = valider(pages[courante]);
      if (bad) return signaler(bad);
      afficher(Math.min(courante + 1, pages.length - 1));
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

    form.querySelectorAll('[data-prev]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault();
      afficher(Math.max(courante - 1, 0));
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

    retourDebut = () => afficher(0);
    afficher(0);
  }

  /* ------------------------------------------------------------ envoi */
  /** Toutes les reponses du formulaire, regroupees par nom de champ. */
  function reponses() {
    const out = {};
    form.querySelectorAll('input,select,textarea').forEach(el => {
      const key = el.name;
      if (!key || key === 'rgpd') return;
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (!el.checked) return;
        const val = el.dataset.label || el.value;
        if (el.type === 'checkbox') (out[key] = out[key] || []).push(val);
        else out[key] = val;
        return;
      }
      const val = (el.value || '').trim();
      if (val) out[key] = val;
    });
    return out;
  }

  /** Pre-remplissage Calendly : name / email + reponses a1, a2... */
  function prefillCalendly() {
    const prefill = {};
    const name = [form.querySelector('[name=prenom]')?.value, form.querySelector('[name=nom]')?.value]
      .filter(Boolean).join(' ').trim();
    if (name) prefill.name = name;
    const email = form.querySelector('[name=email]')?.value?.trim();
    if (email) prefill.email = email;

    form.querySelectorAll('[data-cal-answer]').forEach(el => {
      const key = el.dataset.calAnswer;
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (!el.checked) return;
        const val = el.dataset.label || el.value;
        prefill[key] = prefill[key] ? prefill[key] + ', ' + val : val;
        return;
      }
      const val = (el.value || '').trim();
      if (val) prefill[key] = val;
    });
    return prefill;
  }

  /** Envoie l'inscription au webhook. Renvoie false si aucun n'est configure.
      Le mode no-cors evite d'avoir a configurer les en-tetes CORS cote webhook :
      la requete part bien, mais on ne peut pas lire la reponse. */
  function envoyerInscription() {
    if (!INSCRIPTION_ENDPOINT) return false;
    const session = prochaineMasterclass();
    const payload = Object.assign({
      form: form.dataset.post,
      session: session ? new Date(session.debut).toISOString() : null,
      sessionLabel: session ? libelleSession(session.debut) : null,
      page: location.href,
      date: new Date().toISOString()
    }, reponses());

    try {
      fetch(INSCRIPTION_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    } catch (_) { /* le formulaire reste utilisable meme si l'envoi echoue */ }
    return true;
  }

  form.addEventListener('submit', e => {
    e.preventDefault();

    // sur un formulaire en plusieurs pages, on ne valide que la derniere
    const scope = pages.length > 1 ? pages[courante] : form;
    const bad = valider(scope);
    if (bad) return signaler(bad);

    let message;
    if (form.dataset.post) {
      const m = MESSAGES[form.dataset.post] || MESSAGES.masterclass;
      message = envoyerInscription() ? m.ok : m.ko;
    } else {
      message = openCalendly(form.dataset.calTarget, prefillCalendly())
        ? "Votre demande est prête. Choisissez maintenant votre créneau dans le calendrier qui vient de s'ouvrir — vous recevrez la confirmation par e-mail."
        : "Le calendrier de réservation n'est pas encore en ligne. Écrivez-nous à contact@menoboost.fr et Céline vous recontacte sous 48 h.";
    }

    form.classList.add('sent');
    const done = form.querySelector('.f-done p');
    if (done) done.textContent = message;
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // bouton « recommencer » du message de confirmation
  const again = form.querySelector('[data-form-reset]');
  if (again) again.addEventListener('click', e => {
    e.preventDefault();
    form.reset();
    form.classList.remove('sent');
    retourDebut();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ------------------------------------------------- sommaire des articles */
const toc = document.querySelector('.toc');
if (toc) {
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const heads = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
  if (heads.length) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + en.target.id));
      });
    }, { rootMargin: '-120px 0px -70% 0px', threshold: 0 });
    heads.forEach(h => spy.observe(h));
  }
}
