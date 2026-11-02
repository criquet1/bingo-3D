import './style.css';
import { LETTRES, COULEURS, lettrePour } from './donnees.js';
import { audio, note, parler, taisezVous, reglages } from './audio.js';
import { confettis } from './confettis.js';
import { creerMachine } from './machine.js';

const $ = id => document.getElementById(id);
const attendre = ms => new Promise(r => setTimeout(r, ms));

/* ========== Décor : bulles ========== */
for (let i = 0; i < 14; i++) {
  const b = document.createElement('div');
  const t = 30 + Math.random() * 90;
  b.className = 'bulle';
  b.style.cssText =
    `width:${t}px;height:${t}px;left:${Math.random() * 100}%;` +
    `animation-duration:${14 + Math.random() * 18}s;animation-delay:${-Math.random() * 25}s`;
  document.body.appendChild(b);
}

/* ========== État du jeu ========== */
const machine = creerMachine($('scene'), () => tirer());   // un clic sur le boulier lance le tirage
let restantes = [];
let tirees = [];
let occupe = false;
let bouleAffichee = false;   // une boule est présentée devant la caméra
let auto = false;
let timerAuto = null;
let ticks = null;

/* ========== Tableau, compteur, historique ========== */
function construireTableau() {
  const tab = $('tableau');
  tab.innerHTML = '';
  const grille = document.createElement('div');
  grille.className = 'grille';

  // ligne du haut : les 5 boules B I N G O (le titre du jeu)
  LETTRES.forEach((lettre, i) => {
    const l = document.createElement('div');
    l.className = 'lettre-rangee';
    l.id = 'lettre-' + lettre;
    l.textContent = lettre;
    l.style.setProperty('--c', COULEURS[lettre]);
    l.style.setProperty('--i', i);
    grille.appendChild(l);
  });

  // en dessous : 15 lignes de 5 numéros (un par colonne)
  for (let r = 0; r < 15; r++) {
    for (let col = 0; col < 5; col++) {
      const n = col * 15 + r + 1;
      const c = document.createElement('div');
      c.className = 'case entree';
      c.id = 'case-' + n;
      c.innerHTML = '<b>' + n + '</b>';
      c.style.setProperty('--c', COULEURS[LETTRES[col]]);
      c.style.setProperty('--k', r * 5 + col);
      c.addEventListener('animationend', e => {
        if (e.animationName === 'apparait') c.classList.remove('entree');
      });
      grille.appendChild(c);
    }
  }
  tab.appendChild(grille);
}

function majCompteur(anime) {
  const n = tirees.length;
  const fini = restantes.length === 0 && n > 0;
  $('compteur').textContent = fini ? '🎉 Toutes les boules sont sorties! 🎉' : '';
  $('progres').title = n + ' boule' + (n > 1 ? 's' : '') + ' tirée' + (n > 1 ? 's' : '') + ' sur 75';
  $('progres').firstElementChild.style.height = (n / 75) * 100 + '%';
  if (anime && fini) {
    $('compteur').classList.remove('bump');
    void $('compteur').offsetWidth;
    $('compteur').classList.add('bump');
  }
}

function majBoutons() {
  document.body.classList.toggle('occupe', occupe);
  document.body.classList.toggle('termine', restantes.length === 0);
  $('btn-reset').disabled = occupe;
}

/* ========== Le tirage ========== */
async function tirer() {
  if (occupe || restantes.length === 0) return;
  clearTimeout(timerAuto);
  occupe = true;
  majBoutons();
  if (bouleAffichee) {           // on range la boule précédente
    bouleAffichee = false;
    await machine.ranger();
  }
  document.body.classList.add('melange');
  audio();
  machine.melanger(true);
  ticks = setInterval(() => note(160 + Math.random() * 140, 0.04, 'square', 0.035), 70);

  await attendre(2600);

  clearInterval(ticks);
  machine.melanger(false);
  document.body.classList.remove('melange');

  const i = Math.floor(Math.random() * restantes.length);
  const n = restantes.splice(i, 1)[0];

  await machine.ejecter(n, () => reveler(n));

  bouleAffichee = true;       // elle reste là jusqu'au prochain clic sur « Tirer une boule »
  occupe = false;
  majBoutons();
  if (auto && restantes.length) timerAuto = setTimeout(tirer, 4500);
}

function reveler(n) {
  tirees.push(n);
  majCompteur(true);
  parler(n);

  const c = $('case-' + n);
  document.querySelectorAll('.case.derniere').forEach(x => x.classList.remove('derniere'));
  c.classList.add('sortie', 'derniere', 'pop');
  c.addEventListener('animationend', function f(e) {
    if (e.animationName === 'pop') {
      c.classList.remove('pop');
      c.removeEventListener('animationend', f);
    }
  });
  const lt = $('lettre-' + lettrePour(n));
  lt.classList.remove('flash');
  void lt.offsetWidth;
  lt.classList.add('flash');

  // confettis depuis le centre de la scène 3D
  const r = $('scene').getBoundingClientRect();
  confettis(r.left + r.width / 2, r.top + r.height / 2, 110, 1.1);

  if (restantes.length === 0) {
    auto = false;
    $('btn-auto').classList.remove('actif');
    $('btn-auto').textContent = '⏱️ Tirage auto';
    for (let k = 0; k < 6; k++) {
      setTimeout(() => confettis(Math.random() * innerWidth, innerHeight * 0.3, 120, 1.3), k * 350);
    }
    [523, 659, 784, 1046, 1318].forEach((f, k) => note(f, 0.4, 'triangle', 0.15, 0.5 + k * 0.13));
  }
}

function recommencer() {
  clearTimeout(timerAuto);
  clearInterval(ticks);
  document.body.classList.remove('melange');
  restantes = [];
  for (let n = 1; n <= 75; n++) restantes.push(n);
  tirees = [];
  bouleAffichee = false;
  machine.reset();            // les boules retombent dans le globe
  construireTableau();
  majCompteur(false);
  majBoutons();
  note(300, 0.5, 'sine', 0.1, 0, 700);
}

/* ========== Boutons et clavier ========== */

/* ---------- Boîte de confirmation maison (on peut en choisir la place et l'ordre des boutons) ---------- */
function demander({ message, oui, non, ouiAGauche, rouge = false, dy = '0' }) {
  return new Promise(resolve => {
    const fond = document.createElement('div');
    fond.className = 'fond-dialogue';
    const boite = document.createElement('div');
    boite.className = 'boite-dialogue';
    boite.setAttribute('role', 'alertdialog');
    boite.style.setProperty('--dy', dy);
    const p = document.createElement('p');
    p.textContent = message;
    const rangee = document.createElement('div');
    rangee.className = 'boutons-dialogue';
    const btnOui = document.createElement('button');
    btnOui.className = 'oui' + (rouge ? ' rouge' : '');
    btnOui.textContent = oui;
    const btnNon = document.createElement('button');
    btnNon.className = 'non';
    btnNon.textContent = non;
    if (ouiAGauche) rangee.append(btnOui, btnNon);
    else rangee.append(btnNon, btnOui);
    boite.append(p, rangee);
    fond.appendChild(boite);
    document.body.appendChild(fond);

    const fermer = reponse => {
      removeEventListener('keydown', touche, true);
      fond.remove();
      resolve(reponse);
    };
    const touche = e => {
      if (e.key === 'Escape') { e.preventDefault(); fermer(false); }
    };
    addEventListener('keydown', touche, true);
    btnOui.addEventListener('click', () => fermer(true));
    btnNon.addEventListener('click', () => fermer(false));
    fond.addEventListener('click', e => { if (e.target === fond) fermer(false); });
    btnNon.focus();                    // par défaut, Entrée = « Non »
  });
}

$('btn-reset').addEventListener('click', async () => {
  if (tirees.length === 0) { recommencer(); return; }
  // 1re boîte : en haut, « Oui » à gauche
  const premiere = await demander({
    message: 'Recommencer une nouvelle partie?',
    oui: 'Oui', non: 'Non', ouiAGauche: true, dy: '-20vh',
  });
  if (!premiere) return;
  // 2e boîte : plus bas, « Oui » à droite et en rouge, pour qu'on ne clique pas par réflexe
  const seconde = await demander({
    message: 'Êtes-vous certain? La partie en cours sera effacée.',
    oui: 'Oui, tout effacer', non: 'Non, garder ma partie', ouiAGauche: false, rouge: true, dy: '20vh',
  });
  if (seconde) recommencer();
});

$('btn-auto').addEventListener('click', e => {
  auto = !auto;
  e.currentTarget.classList.toggle('actif', auto);
  e.currentTarget.textContent = auto ? '⏱️ Auto : oui' : '⏱️ Tirage auto';
  clearTimeout(timerAuto);
  if (auto && !occupe) tirer();
});

$('btn-son').addEventListener('click', e => {
  reglages.son = !reglages.son;
  e.currentTarget.textContent = reglages.son ? '🔊 Son' : '🔇 Son';
});

$('btn-voix').addEventListener('click', e => {
  reglages.voix = !reglages.voix;
  e.currentTarget.textContent = '🗣️ Voix : ' + (reglages.voix ? 'oui' : 'non');
  e.currentTarget.classList.toggle('actif', reglages.voix);
  if (!reglages.voix) taisezVous();
});

// touche M : cache ou montre le petit menu du bas et le texte d'aide
addEventListener('keydown', e => {
  if (e.key.toLowerCase() !== 'm' || e.ctrlKey || e.altKey || e.metaKey) return;
  if (document.querySelector('.fond-dialogue')) return;   // pas pendant une boîte de confirmation
  document.body.classList.toggle('menu-cache');
});

addEventListener('keydown', e => {
  if (e.code === 'Space' && e.target.tagName !== 'BUTTON') {
    e.preventDefault();
    tirer();
  }
});

// pour les tests et le débogage dans la console du navigateur
window.__bingo = { machine, tirer };

recommencer();
