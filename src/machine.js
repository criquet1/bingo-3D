import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import * as CANNON from 'cannon-es';
import { COULEURS, lettrePour } from './donnees.js';

const R = 2.7;      // rayon du globe
const RB = 0.4;     // rayon d'une boule
const NB = 75;      // nombre de boules

const ease = p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const easeIn = p => p * p;

/* ---------- Texture d'une boule (couleur + deux pastilles blanches avec le numéro) ---------- */
const cacheTex = new Map();

function textureBoule(n, W = 256, cache = true) {
  const cle = n + ':' + W;
  if (cache && cacheTex.has(cle)) return cacheTex.get(cle);

  const H = W / 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const col = COULEURS[lettrePour(n)];

  g.fillStyle = col;
  g.fillRect(0, 0, W, H);

  // sur une sphère, les pastilles à 25% et 75% de la largeur sont vues de face depuis +Z et -Z
  for (const px of [W * 0.25, W * 0.75]) {
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(px, H / 2, W * 0.115, 0, 7); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = col;
    g.font = `bold ${W * 0.05}px Arial`;
    g.fillText(lettrePour(n), px, H / 2 - W * 0.065);
    g.fillStyle = '#222';
    g.font = `bold ${W * 0.095}px Arial`;
    g.fillText(String(n), px, H / 2 + W * 0.02);
    if (/[69]/.test(String(n))) {
      g.fillRect(px - W * 0.03, H / 2 + W * 0.075, W * 0.06, Math.max(1.5, W * 0.006));
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (cache) cacheTex.set(cle, tex);
  return tex;
}

function textureRadiale(rgb, alpha) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  gr.addColorStop(0, `rgba(${rgb},${alpha})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ====================================================================== */
export function creerMachine(conteneur, surClic) {
  /* ---------- Rendu ---------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NoToneMapping;
  conteneur.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 2.4, 14.5);

  const controles = new OrbitControls(camera, renderer.domElement);
  controles.target.set(0, 0.1, 0);
  controles.enableDamping = true;
  controles.enablePan = false;
  controles.minDistance = 6;
  controles.maxDistance = 22;
  controles.maxPolarAngle = Math.PI * 0.56;
  controles.update();

  const soleil = new THREE.DirectionalLight(0xffffff, 1.6);
  soleil.position.set(5, 9, 7);
  scene.add(soleil);

  function redim() {
    const w = conteneur.clientWidth || 640;
    const h = conteneur.clientHeight || 520;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // la caméra s'approche ou s'éloigne pour que le boulier remplisse bien la scène
    const demi = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const dV = 9.7 / (2 * demi);
    const dH = 6.8 / (2 * demi * camera.aspect);
    camera.position.sub(controles.target).setLength(Math.max(dV, dH)).add(controles.target);
  }
  new ResizeObserver(redim).observe(conteneur);
  redim();

  /* ---------- Le boulier (verre, tube, anneaux, socle) ---------- */
  const verre = new THREE.MeshPhysicalMaterial({
    color: 0xcfe8ff, transparent: true, opacity: 0.07,
    roughness: 0.02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0,
    side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.6,
  });
  const or = new THREE.MeshStandardMaterial({ color: 0xf5b301, metalness: 1, roughness: 0.25 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, metalness: 0.8, roughness: 0.35 });

  const globe = new THREE.Mesh(new THREE.SphereGeometry(R + 0.03, 64, 48), verre);
  globe.renderOrder = 2;
  scene.add(globe);

  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 2.0, 40, 1, true), verre);
  tube.position.y = R + 0.75;
  tube.renderOrder = 2;
  scene.add(tube);

  const bagueHaut = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.05, 16, 40), or);
  bagueHaut.rotation.x = Math.PI / 2;
  bagueHaut.position.y = R + 1.75;
  scene.add(bagueHaut);
  const bagueBas = bagueHaut.clone();
  bagueBas.position.y = R + 0.2;
  scene.add(bagueBas);

  // anneaux dorés à tenons qui tournent pendant le mélange
  const anneaux = new THREE.Group();
  for (const lat of [0, 0.7, -0.7]) {
    const y = R * lat;
    const rayon = Math.sqrt(R * R - y * y) + 0.06;
    const tor = new THREE.Mesh(new THREE.TorusGeometry(rayon, 0.035, 12, 96), or);
    tor.rotation.x = Math.PI / 2;
    tor.position.y = y;
    anneaux.add(tor);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const tenon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), or);
      tenon.position.set(Math.cos(a) * rayon, y, Math.sin(a) * rayon);
      anneaux.add(tenon);
    }
  }
  scene.add(anneaux);

  const piedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.6, 1.0, 40), metal);
  piedestal.position.y = -R - 0.4;
  scene.add(piedestal);
  const socle = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.25, 48), metal);
  socle.position.y = -R - 1.025;
  scene.add(socle);
  const liseret = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.04, 12, 64), or);
  liseret.rotation.x = Math.PI / 2;
  liseret.position.y = -R - 0.9;
  scene.add(liseret);

  const ombre = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshBasicMaterial({ map: textureRadiale('0,0,0', 0.55), transparent: true, depthWrite: false }),
  );
  ombre.rotation.x = -Math.PI / 2;
  ombre.position.y = -R - 1.16;
  scene.add(ombre);

  /* ---------- Physique ---------- */
  const monde = new CANNON.World({ gravity: new CANNON.Vec3(0, -14, 0) });
  monde.allowSleep = false;
  monde.solver.iterations = 8;
  monde.defaultContactMaterial.restitution = 0.55;
  monde.defaultContactMaterial.friction = 0.05;

  const geoBoule = new THREE.SphereGeometry(RB, 32, 24);
  const boules = [];   // { n, body, mesh }
  let melange = false;

  function ajouterBoule(n, pos) {
    const body = new CANNON.Body({
      mass: 1,
      shape: new CANNON.Sphere(RB),
      position: new CANNON.Vec3(pos.x, pos.y, pos.z),
      linearDamping: 0.12,
      angularDamping: 0.3,
    });
    body.velocity.set((Math.random() - 0.5) * 3, -Math.random() * 2, (Math.random() - 0.5) * 3);
    monde.addBody(body);
    const mesh = new THREE.Mesh(geoBoule, new THREE.MeshPhysicalMaterial({
      map: textureBoule(n), roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08,
    }));
    mesh.position.copy(pos);
    scene.add(mesh);
    boules.push({ n, body, mesh });
  }

  // la boule actuellement présentée devant la caméra (reste là jusqu'au prochain tirage)
  let affichee = null;
  const vTmp = new THREE.Vector3();

  function nettoyer(a) {
    scene.remove(a.mesh);
    a.mesh.material.dispose();
    a.grande.dispose();
    scene.remove(a.halo);
    a.halo.material.map.dispose();
    a.halo.material.dispose();
  }

  // fait disparaître la boule affichée (en rapetissant)
  async function ranger() {
    const a = affichee;
    if (!a) return;
    affichee = null;
    await tween(450, p => {
      a.mesh.scale.setScalar(Math.max(0.001, a.SF * (1 - easeIn(p))));
      a.halo.material.opacity = 0.5 * (1 - p);
    });
    nettoyer(a);
  }

  function reset() {
    if (affichee) { nettoyer(affichee); affichee = null; }
    for (const b of boules) {
      monde.removeBody(b.body);
      scene.remove(b.mesh);
      b.mesh.material.dispose();
    }
    boules.length = 0;
    const pts = [];
    for (let n = 1; n <= NB; n++) {
      let p;
      for (let k = 0; k < 80; k++) {
        p = new THREE.Vector3((Math.random() * 2 - 1) * 2, 0.2 + Math.random() * 1.9, (Math.random() * 2 - 1) * 2);
        if (p.length() > R - RB - 0.1) continue;
        if (pts.every(q => q.distanceTo(p) > RB * 2.1)) break;
      }
      pts.push(p);
      ajouterBoule(n, p);
    }
  }

  function simuler(dt) {
    const t = performance.now();
    if (melange) {
      const sens = Math.sin(t / 500) > 0 ? 1 : -1;
      for (const b of boules) {
        const p = b.body.position, f = b.body.force;
        const h = Math.hypot(p.x, p.z) || 1;
        if (p.y < 0.6 && h < 1.9) f.y += 120 * (1 - h / 1.9) + 20;      // jet d'air vers le haut
        f.x += (-p.z / h) * 22 * sens;                                   // tourbillon
        f.z += (p.x / h) * 22 * sens;
        f.x += (Math.random() - 0.5) * 14;
        f.y += (Math.random() - 0.5) * 14;
        f.z += (Math.random() - 0.5) * 14;
      }
    }
    monde.step(1 / 60, dt, 3);

    const lim = R - RB;
    for (const b of boules) {
      const p = b.body.position, v = b.body.velocity, w = b.body.angularVelocity;
      const d = Math.hypot(p.x, p.y, p.z);
      if (d > lim) {                      // la paroi du globe
        const nx = p.x / d, ny = p.y / d, nz = p.z / d;
        p.set(nx * lim, ny * lim, nz * lim);
        const vn = v.x * nx + v.y * ny + v.z * nz;
        if (vn > 0) { v.x -= 1.5 * vn * nx; v.y -= 1.5 * vn * ny; v.z -= 1.5 * vn * nz; }
        // la boule roule sur la paroi
        const tx = (v.y * nz - v.z * ny) / RB;
        const ty = (v.z * nx - v.x * nz) / RB;
        const tz = (v.x * ny - v.y * nx) / RB;
        w.x += (tx - w.x) * 0.2; w.y += (ty - w.y) * 0.2; w.z += (tz - w.z) * 0.2;
      }
      b.mesh.position.copy(p);
      b.mesh.quaternion.copy(b.body.quaternion);
    }
  }

  /* ---------- Animations (interpolations) ---------- */
  const tweens = [];
  function tween(ms, fn) {
    return new Promise(res => tweens.push({ t0: performance.now(), ms, fn, res }));
  }

  let vitesseAnneaux = 0.004;

  let dernier = performance.now();
  function boucle(t) {
    const dt = Math.min(0.05, (t - dernier) / 1000);
    dernier = t;
    simuler(dt);

    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const p = Math.min(1, (t - tw.t0) / tw.ms);
      tw.fn(p);
      if (p >= 1) { tweens.splice(i, 1); tw.res(); }
    }

    const cible = melange ? 0.09 : 0.004;
    vitesseAnneaux += (cible - vitesseAnneaux) * 0.05;
    anneaux.rotation.y += vitesseAnneaux;

    if (affichee) {                       // la boule reste face à la caméra et flotte doucement
      const sec = t / 1000;
      camera.getWorldDirection(vTmp);
      affichee.mesh.position.copy(camera.position).addScaledVector(vTmp, 5.4);
      affichee.mesh.position.y += Math.sin(sec * 2.2) * 0.07;
      affichee.mesh.lookAt(camera.position);
      affichee.halo.position.copy(camera.position).addScaledVector(vTmp, 6.1);
      affichee.halo.scale.setScalar(5.5 + Math.sin(sec * 3) * 0.4);
      affichee.halo.material.rotation += 0.01;
    }

    controles.update();
    renderer.render(scene, camera);
    requestAnimationFrame(boucle);
  }

  /* ---------- Éjection d'une boule jusque devant la caméra ---------- */
  async function ejecter(n, quandArrive) {
    const i = boules.findIndex(b => b.n === n);
    const b = boules.splice(i, 1)[0];
    monde.removeBody(b.body);
    const mesh = b.mesh;

    const grande = textureBoule(n, 1024, false);
    mesh.material.map = grande;
    mesh.material.needsUpdate = true;
    // pas de reflets brillants sur la boule : le numéro reste bien lisible
    mesh.material.clearcoat = 0;
    mesh.material.roughness = 0.75;
    mesh.material.envMapIntensity = 0.35;
    mesh.material.specularIntensity = 0;

    const axe = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    const hautDedans = new THREE.Vector3(0, R - RB - 0.03, 0);
    const hautTube = new THREE.Vector3(0, R + 1.45, 0);

    // 1) la boule monte jusqu'à l'ouverture du globe
    const p0 = mesh.position.clone();
    await tween(750, p => {
      mesh.position.lerpVectors(p0, hautDedans, ease(p));
      mesh.rotateOnAxis(axe, 0.18);
    });
    // 2) elle monte dans le tube
    await tween(700, p => {
      mesh.position.lerpVectors(hautDedans, hautTube, ease(p));
      mesh.scale.setScalar(1 + 0.25 * ease(p));
      mesh.rotateOnAxis(axe, 0.18);
    });

    // 3) elle vole vers la caméra et se présente de face
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const pd = camera.position.clone().addScaledVector(dir, 5.4);
    const dummy = new THREE.Object3D();
    dummy.position.copy(pd);
    dummy.lookAt(camera.position);
    const qFin = dummy.quaternion.clone();
    const q0 = mesh.quaternion.clone();
    const p1 = mesh.position.clone();
    const s1 = mesh.scale.x;
    const SF = 2.5;

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textureRadiale('255,215,100', 0.9), transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    halo.position.copy(pd).addScaledVector(dir, 0.7);
    halo.scale.setScalar(0.01);
    scene.add(halo);

    await tween(950, p => {
      const e = ease(p);
      mesh.position.lerpVectors(p1, pd, e);
      mesh.position.y += Math.sin(p * Math.PI) * 1.3;
      mesh.quaternion.copy(q0).slerp(qFin, e);
      mesh.scale.setScalar(s1 + (SF - s1) * e);
      halo.scale.setScalar(0.01 + 5.5 * e);
      halo.material.opacity = 0.5 * e;
    });

    // 4) la boule reste affichée jusqu'au prochain tirage (voir ranger())
    affichee = { mesh, halo, grande, SF };
    quandArrive();
  }

  /* ---------- Clic sur le boulier (ou sur la boule affichée) ---------- */
  const rayon = new THREE.Raycaster();
  const souris = new THREE.Vector2();
  function surBoulier(e) {
    const r = renderer.domElement.getBoundingClientRect();
    souris.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayon.setFromCamera(souris, camera);
    const cibles = [globe, tube, piedestal, socle, ...boules.map(b => b.mesh)];
    if (affichee) cibles.push(affichee.mesh);
    return rayon.intersectObjects(cibles, false).length > 0;
  }

  const cv = renderer.domElement;
  let depart = null;
  cv.addEventListener('pointerdown', e => { depart = { x: e.clientX, y: e.clientY }; });
  cv.addEventListener('pointerup', e => {
    if (!depart) return;
    const deplacement = Math.hypot(e.clientX - depart.x, e.clientY - depart.y);
    depart = null;
    // un vrai clic (pas un glissement pour tourner la caméra) sur le boulier
    if (deplacement < 6 && surBoulier(e) && surClic) surClic();
  });
  let curseurEnAttente = false;
  cv.addEventListener('pointermove', e => {
    if (curseurEnAttente || e.buttons) return;
    curseurEnAttente = true;
    requestAnimationFrame(() => {
      curseurEnAttente = false;
      cv.style.cursor = surBoulier(e) ? 'pointer' : 'grab';
    });
  });

  reset();
  requestAnimationFrame(boucle);

  return {
    reset,
    ejecter,
    ranger,
    melanger(oui) { melange = oui; },
    camera,
    renderer,
    nbBoules: () => boules.length,
  };
}
