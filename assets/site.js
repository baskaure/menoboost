/* ============================================================================
   MENOBOOST — script commun a toutes les pages
   ============================================================================

   >>> SEUL ENDROIT A MODIFIER POUR BRANCHER CALENDLY <<<
   « appel » est branche sur l'evenement « Diagnostic offert ».
   « masterclass » attend encore son lien : tant qu'il reste vide, la section
   Inscription affiche le bloc « Calendrier d'inscription bientot en ligne »
   au lieu d'un embed casse. Collez simplement l'URL pour l'activer.
   ========================================================================== */
const CALENDLY = {
  // Pour l'instant les deux pointent vers le meme evenement « Diagnostic offert ».
  // Des que vous creez un evenement dedie a la masterclass, remplacez la 1re ligne.
  masterclass: "https://calendly.com/d/dvny-hqr-dhq/diagnostic-offert",
  appel:       "https://calendly.com/d/dvny-hqr-dhq/diagnostic-offert"
};

/* Personnalisation des couleurs de l'embed : reservee aux offres payantes Calendly.
   Laissez false si vous etes sur l'offre gratuite, sinon le widget peut refuser de
   se charger. Passez a true une fois sur une offre Standard ou superieure. */
const CALENDLY_BRANDING = false;

/* Date et heure de la prochaine masterclass (format ISO, heure de Paris).
   Sert au compte a rebours ET au schema.org Event de la page masterclass.
   Pensez a mettre a jour aussi les dates affichees dans masterclass.html. */
const MASTERCLASS_DATE = "2026-10-08T19:00:00+02:00";

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

/* Embeds inline : <div class="cal-embed" data-cal="masterclass"></div>
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
const cd = document.getElementById('countdown');
if (cd) {
  const target = new Date(cd.dataset.date || MASTERCLASS_DATE).getTime();
  const units = [['j', 864e5], ['h', 36e5], ['min', 6e4], ['s', 1e3]];
  const tick = () => {
    let left = target - Date.now();
    if (left <= 0) {
      cd.innerHTML = '<div class="cd-over">La prochaine session vient de demarrer — inscrivez-vous pour la suivante.</div>';
      clearInterval(timer);
      return;
    }
    cd.innerHTML = units.map(([label, ms]) => {
      const n = Math.floor(left / ms);
      left -= n * ms;
      return `<div class="cd-unit"><div class="n">${String(n).padStart(2, '0')}</div><div class="l">${label}</div></div>`;
    }).join('');
  };
  tick();
  const timer = setInterval(tick, 1000);
}

/* ---------------------------------------------------------- formulaires */
/* Chaque <form class="mb-form" data-cal-target="masterclass|appel"> est valide
   cote client puis transmis a Calendly en pre-remplissage :
     name / email  -> champs standard Calendly
     a1, a2, a3…   -> reponses aux questions personnalisees, dans l'ordre ou
                      vous les avez creees dans l'evenement Calendly.
   Les champs concernes portent l'attribut data-cal-answer="a1", "a2", etc. */
document.querySelectorAll('form.mb-form').forEach(form => {
  const fields = [...form.querySelectorAll('.field')];

  const clearError = f => f.classList.remove('err');
  form.querySelectorAll('input,select,textarea').forEach(i => {
    i.addEventListener('input', () => { const f = i.closest('.field'); if (f) clearError(f); });
    i.addEventListener('change', () => { const f = i.closest('.field'); if (f) clearError(f); });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let firstBad = null;

    fields.forEach(f => {
      clearError(f);
      const inputs = [...f.querySelectorAll('input,select,textarea')];
      const required = inputs.some(i => i.required);
      if (!required) return;

      let ok;
      if (inputs.some(i => i.type === 'checkbox' || i.type === 'radio')) {
        // groupe de cases/boutons radio : au moins un coche
        ok = inputs.some(i => i.checked);
      } else {
        ok = inputs.every(i => !i.required || (i.value.trim() !== '' && i.checkValidity()));
      }
      if (!ok) { f.classList.add('err'); firstBad = firstBad || f; }
    });

    if (firstBad) {
      firstBad.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable = firstBad.querySelector('input,select,textarea');
      if (focusable) focusable.focus({ preventScroll: true });
      return;
    }

    // Regroupe les reponses par question Calendly (a1, a2, …)
    const prefill = {};
    const name = [form.querySelector('[name=prenom]')?.value, form.querySelector('[name=nom]')?.value]
      .filter(Boolean).join(' ').trim();
    if (name) prefill.name = name;
    const email = form.querySelector('[name=email]')?.value?.trim();
    if (email) prefill.email = email;

    form.querySelectorAll('[data-cal-answer]').forEach(el => {
      const key = el.dataset.calAnswer;
      let val = '';
      if (el.type === 'checkbox' || el.type === 'radio') {
        if (!el.checked) return;
        val = el.dataset.label || el.value;
        prefill[key] = prefill[key] ? prefill[key] + ', ' + val : val;
        return;
      }
      val = (el.value || '').trim();
      if (val) prefill[key] = val;
    });

    const opened = openCalendly(form.dataset.calTarget, prefill);
    form.classList.add('sent');
    const done = form.querySelector('.f-done p');
    if (done) {
      done.textContent = opened
        ? "Votre demande est prete. Choisissez maintenant votre creneau dans le calendrier qui vient de s'ouvrir — vous recevrez la confirmation par e-mail."
        : "Le calendrier de reservation n'est pas encore en ligne. Ecrivez-nous a contact@menoboost.fr et Celine vous recontacte sous 48 h.";
    }
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  // bouton « recommencer » du message de confirmation
  const again = form.querySelector('[data-form-reset]');
  if (again) again.addEventListener('click', e => {
    e.preventDefault();
    form.reset();
    form.classList.remove('sent');
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
