import * as THREE from 'three';

const extrude = (shape: THREE.Shape | THREE.Shape[], depth = 0.18, bevel = 0.04) =>
  new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 24,
  }).center();

/** Estrella de 4 puntas ("novedad"). */
export const sparkleGeo = (r = 0.5) => {
  const s = new THREE.Shape();
  const k = r * 0.22;
  s.moveTo(0, r);
  s.quadraticCurveTo(k, k, r, 0);
  s.quadraticCurveTo(k, -k, 0, -r);
  s.quadraticCurveTo(-k, -k, -r, 0);
  s.quadraticCurveTo(-k, k, 0, r);
  return extrude(s, 0.14, 0.03);
};

/** Rayo ("truco"). */
export const boltGeo = (h = 1) => {
  const s = new THREE.Shape();
  const p = (x: number, y: number) => [x * h, y * h] as const;
  s.moveTo(...p(0.12, 0.5));
  s.lineTo(...p(-0.26, -0.04));
  s.lineTo(...p(-0.02, -0.04));
  s.lineTo(...p(-0.12, -0.5));
  s.lineTo(...p(0.26, 0.06));
  s.lineTo(...p(0.02, 0.06));
  s.closePath();
  return extrude(s, 0.16, 0.03);
};

/** Flecha en diagonal hacia arriba ("tendencia"). */
export const arrowGeo = (h = 1) => {
  const s = new THREE.Shape();
  const p = (x: number, y: number) => [x * h, y * h] as const;
  s.moveTo(...p(-0.4, -0.3));
  s.lineTo(...p(0.05, 0.15));
  s.lineTo(...p(-0.08, 0.28));
  s.lineTo(...p(0.4, 0.4));
  s.lineTo(...p(0.28, -0.08));
  s.lineTo(...p(0.15, 0.05));
  s.lineTo(...p(-0.3, -0.4));
  s.closePath();
  return extrude(s, 0.16, 0.03);
};

/** Barras ascendentes ("el dato"). */
export const barsShapes = (h = 1) =>
  [0.35, 0.6, 0.9].map((v, i) => {
    const s = new THREE.Shape();
    const x = (i - 1) * 0.3 * h;
    const w = 0.11 * h;
    s.moveTo(x - w, -0.45 * h);
    s.lineTo(x + w, -0.45 * h);
    s.lineTo(x + w, (-0.45 + v) * h);
    s.lineTo(x - w, (-0.45 + v) * h);
    s.closePath();
    return s;
  });
export const barsGeo = (h = 1) => extrude(barsShapes(h), 0.16, 0.03);

/** Bocadillo de chat ("prompt"). */
export const bubbleGeo = (w = 1, h = 0.7) => {
  const r = Math.min(w, h) * 0.3;
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, -h / 2);
  s.lineTo(-w * 0.18, -h / 2);
  s.lineTo(-w * 0.34, -h / 2 - h * 0.32);
  s.lineTo(-w * 0.02, -h / 2);
  s.lineTo(w / 2 - r, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  s.lineTo(w / 2, h / 2 - r);
  s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  s.lineTo(-w / 2 + r, h / 2);
  s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  s.lineTo(-w / 2, -h / 2 + r);
  s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return extrude(s, 0.16, 0.04);
};

/** Doble flecha ("antes vs ahora"). */
export const swapGeo = (h = 1) => {
  const arrow = (dir: 1 | -1, y: number) => {
    const s = new THREE.Shape();
    const t = 0.07 * h;
    s.moveTo(-0.34 * h * dir, y - t);
    s.lineTo(0.14 * h * dir, y - t);
    s.lineTo(0.14 * h * dir, y - t * 2.6);
    s.lineTo(0.38 * h * dir, y);
    s.lineTo(0.14 * h * dir, y + t * 2.6);
    s.lineTo(0.14 * h * dir, y + t);
    s.lineTo(-0.34 * h * dir, y + t);
    s.closePath();
    return s;
  };
  return extrude([arrow(1, 0.17 * h), arrow(-1, -0.17 * h)], 0.16, 0.03);
};
