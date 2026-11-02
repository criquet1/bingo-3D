// Textes du jeu en anglais (langue par défaut) et en français.
const CLE = 'bingo-langue';

const TEXTES = {
  en: {
    titre: '3D Bingo Cage – Free Online Bingo Ball Draw',
    invite: '👆 Click the cage to draw a ball',
    auto: '⏱️ Auto draw',
    autoOui: '⏱️ Auto: on',
    son: '🔊 Sound',
    sonOff: '🔇 Sound',
    voixNon: '🗣️ Voice: off',
    voixOui: '🗣️ Voice: on',
    reset: '↺ Restart',
    autreLangue: '🌐 Français',
    aide: 'Click the cage (or the ball) to draw · drag to rotate · scroll to zoom · space bar to draw · M key to hide or show this menu',
    fini: '🎉 All the balls have been drawn! 🎉',
    progres: n => `${n} ball${n === 1 ? '' : 's'} drawn out of 75`,
    question1: 'Start a new game?',
    oui: 'Yes',
    non: 'No',
    question2: 'Are you sure? The current game will be erased.',
    oui2: 'Yes, erase everything',
    non2: 'No, keep my game',
  },
  fr: {
    titre: 'Boulier de bingo 3D – Tirage de boules en ligne',
    invite: '👆 Clique sur le boulier pour tirer une boule',
    auto: '⏱️ Tirage auto',
    autoOui: '⏱️ Auto : oui',
    son: '🔊 Son',
    sonOff: '🔇 Son',
    voixNon: '🗣️ Voix : non',
    voixOui: '🗣️ Voix : oui',
    reset: '↺ Recommencer',
    autreLangue: '🌐 English',
    aide: "Clique sur le boulier (ou sur la boule) pour tirer · glisse la souris pour tourner autour · molette pour zoomer · barre d'espace pour tirer · touche M pour cacher ou montrer ce menu",
    fini: '🎉 Toutes les boules sont sorties! 🎉',
    progres: n => `${n} boule${n > 1 ? 's' : ''} tirée${n > 1 ? 's' : ''} sur 75`,
    question1: 'Recommencer une nouvelle partie?',
    oui: 'Oui',
    non: 'Non',
    question2: 'Êtes-vous certain? La partie en cours sera effacée.',
    oui2: 'Oui, tout effacer',
    non2: 'Non, garder ma partie',
  },
};

// L'anglais est la langue par défaut ; le choix de la personne est gardé d'une visite à l'autre.
let actuelle = 'en';
try {
  const gardee = localStorage.getItem(CLE);
  if (gardee === 'fr' || gardee === 'en') actuelle = gardee;
} catch (e) { /* pas de stockage : on reste en anglais */ }

export const langue = () => actuelle;

export function setLangue(l) {
  actuelle = l;
  try { localStorage.setItem(CLE, l); } catch (e) { /* tant pis */ }
}

export function t(cle, ...args) {
  const v = TEXTES[actuelle][cle];
  return typeof v === 'function' ? v(...args) : v;
}

// langue de la voix qui annonce les boules
export const langueVoix = () => (actuelle === 'fr' ? 'fr-CA' : 'en-US');
