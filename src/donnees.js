export const LETTRES = ['B', 'I', 'N', 'G', 'O'];

export const COULEURS = {
  B: '#2e86de',
  I: '#e74c3c',
  N: '#8e9aaf',
  G: '#27ae60',
  O: '#f39c12',
};

export const lettrePour = n => LETTRES[Math.floor((n - 1) / 15)];
