const cv = document.getElementById('confetti');
const cg = cv.getContext('2d');
let parts = [];
let enCours = false;

function redim() {
  cv.width = innerWidth;
  cv.height = innerHeight;
}
addEventListener('resize', redim);
redim();

export function confettis(x, y, nb = 90, force = 1) {
  const cols = ['#f5b301', '#e74c3c', '#2e86de', '#27ae60', '#ff6fb5', '#ffffff'];
  for (let i = 0; i < nb; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = (4 + Math.random() * 9) * force;
    parts.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 5,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 6,
      c: cols[i % cols.length],
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.4,
      vie: 1,
    });
  }
  if (!enCours) {
    enCours = true;
    requestAnimationFrame(boucle);
  }
}

function boucle() {
  cg.clearRect(0, 0, cv.width, cv.height);
  parts = parts.filter(p => p.vie > 0 && p.y < cv.height + 30);
  for (const p of parts) {
    p.vy += 0.28;
    p.vx *= 0.99;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.vie -= 0.006;
    cg.save();
    cg.globalAlpha = Math.max(0, Math.min(1, p.vie * 1.5));
    cg.translate(p.x, p.y);
    cg.rotate(p.rot);
    cg.fillStyle = p.c;
    cg.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    cg.restore();
  }
  if (parts.length) requestAnimationFrame(boucle);
  else {
    enCours = false;
    cg.clearRect(0, 0, cv.width, cv.height);
  }
}
