/**
 * Ajuste de tamaño de letra sin medir el DOM: estimamos el ancho de cada palabra (letras × tamaño × k) y
 * simulamos el salto de línea. k es algo mayor que el ancho medio real de las fuentes, así que la estimación
 * siempre se queda corta en líneas disponibles: el texto cabe o sobra sitio, nunca se sale ni se monta.
 */
export const K_DISPLAY = 0.6; // Space Grotesk 700
export const K_BODY = 0.58; // Inter 600-800

export const lineCount = (text: string, width: number, size: number, k: number, gap = 0.26): number => {
  const words = text.split(/\s+/).filter(Boolean);
  let lines = 1;
  let cur = 0;
  for (const w of words) {
    const ww = w.length * size * k;
    if (cur === 0) cur = ww;
    else if (cur + size * gap + ww <= width) cur += size * gap + ww;
    else {
      lines += 1;
      cur = ww;
    }
  }
  return lines;
};

/** El mayor tamaño (entre max y min) con el que el texto ocupa como mucho `maxLines` líneas. */
export const fitSize = (text: string, width: number, max: number, min: number, maxLines: number, k = K_DISPLAY): number => {
  for (let size = max; size > min; size -= 2) {
    if (lineCount(text, width, size, k) <= maxLines) return size;
  }
  return min;
};
