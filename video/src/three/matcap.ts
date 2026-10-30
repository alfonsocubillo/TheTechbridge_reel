import * as THREE from 'three';

/**
 * Matcaps generados por código: una esfera "fotografiada en estudio" pintada en un canvas de 256 px.
 * Dan el aspecto de plástico/cristal brillante de un render de producto, pero cuestan una sola lectura
 * de textura por píxel. Sin tarjeta gráfica (GitHub Actions) es lo que permite que el 3D quepa en tiempo.
 */
const cache = new Map<string, THREE.CanvasTexture>();

const shade = (hex: string, amt: number) => {
  const c = new THREE.Color(hex);
  const hsl = {h: 0, s: 0, l: 0};
  c.getHSL(hsl);
  c.setHSL(hsl.h, Math.min(1, hsl.s * (amt > 0 ? 0.92 : 1.05)), Math.max(0, Math.min(1, hsl.l + amt)));
  return `#${c.getHexString()}`;
};

export const matcap = (color: string, rough = 0.22, glow = 0): THREE.CanvasTexture => {
  const key = `${color}|${rough.toFixed(2)}|${glow.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S;
  cv.height = S;
  const g = cv.getContext('2d')!;
  const R = S / 2;

  // Cuerpo: luz principal arriba a la izquierda y sombra abajo a la derecha
  const lift = 0.18 + glow * 0.25;
  const body = g.createRadialGradient(R * 0.78, R * 0.66, R * 0.05, R, R, R);
  body.addColorStop(0, shade(color, lift));
  body.addColorStop(0.55, shade(color, glow * 0.12));
  body.addColorStop(0.88, shade(color, -0.22 + glow * 0.1));
  body.addColorStop(1, shade(color, -0.32 + glow * 0.1));
  g.fillStyle = body;
  g.fillRect(0, 0, S, S);

  // Rebote del suelo: media luna clara abajo
  const bounce = g.createRadialGradient(R, R * 2.15, R * 0.4, R, R * 2.15, R * 1.25);
  bounce.addColorStop(0, 'rgba(255,255,255,0.28)');
  bounce.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = bounce;
  g.fillRect(0, 0, S, S);

  // Luz de contorno (rim) fría
  const rim = g.createRadialGradient(R, R, R * 0.82, R, R, R);
  rim.addColorStop(0, 'rgba(190,220,255,0)');
  rim.addColorStop(0.92, 'rgba(190,220,255,0.18)');
  rim.addColorStop(1, 'rgba(230,245,255,0.55)');
  g.fillStyle = rim;
  g.fillRect(0, 0, S, S);

  // Reflejo de la ventana de luz (softbox) en la parte alta
  const sharp = 1 - Math.min(rough / 0.6, 0.85);
  g.save();
  g.filter = `blur(${2 + rough * 14}px)`;
  g.fillStyle = `rgba(255,255,255,${0.22 + sharp * 0.35})`;
  g.beginPath();
  g.ellipse(R * 0.95, R * 0.42, R * 0.55, R * 0.09, -0.12, 0, Math.PI * 2);
  g.fill();
  // Brillo especular principal
  g.fillStyle = `rgba(255,255,255,${0.55 + sharp * 0.45})`;
  g.beginPath();
  g.ellipse(R * 0.62, R * 0.58, R * (0.07 + rough * 0.18), R * (0.05 + rough * 0.12), -0.6, 0, Math.PI * 2);
  g.fill();
  g.restore();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  cache.set(key, tex);
  return tex;
};
