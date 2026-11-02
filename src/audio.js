import { lettrePour } from './donnees.js';
import { langueVoix } from './langues.js';

export const reglages = { son: true, voix: false };

let ac = null;

export function audio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* pas de son */ }
  }
  if (ac && ac.state === 'suspended') ac.resume();
  return ac;
}

export function note(freq, dur, type = 'sine', vol = 0.15, delai = 0, freqFin) {
  if (!reglages.son) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delai;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (freqFin) o.frequency.exponentialRampToValueAtTime(freqFin, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

// pause (en millisecondes) entre la lettre et le chiffre
const DELAI_VOIX = 500;
let jetonVoix = 0;
let timerVoix = null;

// attente = délai (ms) avant de commencer à parler, pour laisser finir le petit jingle
export function parler(n, attente = 0) {
  if (!reglages.voix || !('speechSynthesis' in window)) return;
  taisezVous();
  const jeton = jetonVoix;
  const dire = (texte, quandFini) => {
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = langueVoix();
    u.rate = 0.9;
    if (quandFini) u.onend = quandFini;
    speechSynthesis.speak(u);
  };
  timerVoix = setTimeout(() => {
    if (jeton !== jetonVoix) return;
    // d'abord la lettre, une petite pause, puis le chiffre
    dire(lettrePour(n), () => {
      if (jeton !== jetonVoix) return;
      timerVoix = setTimeout(() => {
        if (jeton === jetonVoix) dire(String(n));
      }, DELAI_VOIX);
    });
  }, attente);
}

export function taisezVous() {
  jetonVoix++;
  clearTimeout(timerVoix);
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
