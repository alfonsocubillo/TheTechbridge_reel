import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ARCH, BRAND, Grain, Hi, INTER, MONO, SERIF, SERIF_I, UNB, fit, theme} from '../kit';

/**
 * Fotos de historias (1080x1920). Cada modelo tiene su propio carácter y ninguno usa el lenguaje del feed.
 * Zona segura: Instagram tapa arriba (~250 px) y abajo (desde ~1650 px).
 *   HF01 Titular       → noticia rápida            {kicker?, title, highlight?, body, source}
 *   HF02 Sabías que    → curiosidad                {big, fact, detail?, source?}
 *   HF03 Atajo         → atajo de teclado          {keys: [], title, what, os?: [], app?}
 *   HF04 Prompt exprés → prompt corto              {app, prompt, result: [], tip?}
 *   HF05 Mito/Realidad → desmontar un mito         {myth, reality, note?}
 *   HF06 Herramienta   → herramienta descubierta   {name, category, what, features: [], price, where}
 */
/** data.app (excel, teams…) usa el color de esa aplicación; sin app, la paleta de la marca. */
export type StoryStillProps = {model: string; data: Record<string, any>};

export const StoryStill: React.FC<StoryStillProps> = ({model, data}) => {
  const Comp = {HF01: Titular, HF02: SabiasQue, HF03: Atajo, HF04: PromptExpres, HF05: Mito, HF06: Herramienta}[model] ?? Titular;
  return <Comp d={data} />;
};

type M = React.FC<{d: Record<string, any>}>;

const Handle: React.FC<{color: string; y?: number; font?: string}> = ({color, y = 1560, font = INTER}) => (
  <div style={{position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center', fontFamily: font, fontWeight: 700, fontSize: 30, letterSpacing: 2, color}}>@thetechbridgesolution</div>
);

// ───────────────────────── HF01 · Titular ─────────────────────────
const Titular: M = ({d}) => {
  const t = theme(d.app);
  const RED = d.app ? t.deep : BRAND.blue;
  const ticker = Array(8).fill(d.kicker ?? 'NOVEDAD').join('  ●  ');
  const size = fit(String(d.title), 900, 116, 72, 4, 0.62);
  return (
    <AbsoluteFill style={{background: '#04101F', overflow: 'hidden'}}>
      {/* Anillos y puntos: "señal" de última hora */}
      <svg style={{position: 'absolute', right: -260, top: 1100}} width={900} height={900}>
        {[120, 220, 320, 420].map((r) => <circle key={r} cx={450} cy={450} r={r} fill="none" stroke={t.accent} strokeOpacity={0.5 - r / 1000} strokeWidth={4} />)}
        <circle cx={450} cy={450} r={40} fill={RED} />
      </svg>
      <AbsoluteFill style={{backgroundImage: 'radial-gradient(#ffffff22 2px, transparent 2px)', backgroundSize: '36px 36px', maskImage: 'linear-gradient(180deg, transparent 0%, #000 60%, transparent 100%)'}} />
      <div style={{position: 'absolute', left: -60, right: -60, top: 300, height: 92, background: RED, transform: 'rotate(-5deg)', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden'}}>
        <div style={{fontFamily: ARCH, fontWeight: 900, fontSize: 52, color: '#fff', letterSpacing: 2}}>{ticker}</div>
      </div>
      <div style={{position: 'absolute', left: 80, top: 520, width: 920, display: 'flex', flexDirection: 'column', gap: 40}}>
        <div style={{fontFamily: ARCH, fontWeight: 900, fontSize: size, lineHeight: 0.98, letterSpacing: -size * 0.02, color: '#fff', textTransform: 'uppercase'}}>
          <Hi text={String(d.title)} highlight={d.highlight} color={t.accent} />
        </div>
        <div style={{fontFamily: INTER, fontWeight: 500, fontSize: fit(String(d.body ?? ''), 900, 46, 36, 5, 0.52), lineHeight: 1.35, color: '#C6D3E6'}}>{d.body}</div>
        {d.source && (
          <div style={{alignSelf: 'flex-start', padding: '14px 22px', border: '2px solid #ffffff40', borderRadius: 10, fontFamily: MONO, fontWeight: 500, fontSize: 26, color: '#9EA2B4'}}>FUENTE · {d.source}</div>
        )}
      </div>
      <Handle color="#ffffff70" y={1610} />
      <Grain opacity={0.08} />
    </AbsoluteFill>
  );
};

// ───────────────────────── HF02 · ¿Sabías que? ─────────────────────────
const SabiasQue: M = ({d}) => {
  const t = theme(d.app);
  const CORAL = t.deep;
  const INK = '#0A1F3D';
  const big = String(d.big ?? '?');
  return (
    <AbsoluteFill style={{background: '#EEF5FC', overflow: 'hidden'}}>
      <div style={{position: 'absolute', right: -180, top: 160, width: 640, height: 640, borderRadius: '50%', background: d.app ? `${t.accent}40` : '#CFE4F8'}} />
      <div style={{position: 'absolute', left: -120, bottom: 160, width: 380, height: 380, borderRadius: '50%', border: `6px solid ${CORAL}55`}} />
      <div style={{position: 'absolute', left: 90, top: 300, fontFamily: SERIF_I, fontWeight: 800, fontSize: 92, color: INK, lineHeight: 1}}>¿Sabías que…</div>
      <div style={{position: 'absolute', left: 80, top: 450, width: 920, fontFamily: SERIF, fontWeight: 900, fontSize: fit(big, 920, 330, 120, 1, 0.8), color: CORAL, letterSpacing: -8, lineHeight: 1}}>{big}</div>
      <div style={{position: 'absolute', left: 90, top: 860, width: 900, display: 'flex', flexDirection: 'column', gap: 36}}>
        <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: fit(String(d.fact), 900, 64, 46, 5, 0.5), lineHeight: 1.18, color: INK}}>{d.fact}</div>
        {d.detail && <div style={{fontFamily: INTER, fontWeight: 500, fontSize: 38, lineHeight: 1.4, color: '#4A5A70'}}>{d.detail}</div>}
        {d.source && <div style={{fontFamily: INTER, fontWeight: 600, fontSize: 26, color: '#7A8AA0'}}>Fuente: {d.source}</div>}
      </div>
      <Handle color="#7A8AA0" font={INTER} />
      <Grain opacity={0.1} />
    </AbsoluteFill>
  );
};

// ───────────────────────── HF03 · Atajo ─────────────────────────
export const Keycap: React.FC<{label: string; w?: number; press?: number; accent?: string}> = ({label, w, press = 0, accent = BRAND.light}) => {
  const width = w ?? Math.max(170, label.length * 52 + 90);
  return (
    <div style={{position: 'relative', width, height: 190, transform: `translateY(${press * 16}px)`}}>
      <div style={{position: 'absolute', inset: 0, top: 22, borderRadius: 34, background: '#1B1E26', boxShadow: `0 ${30 - press * 16}px 50px rgba(0,0,0,0.6)`}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: press * 16, height: 168 - press * 16, borderRadius: 32, background: 'linear-gradient(180deg, #3A3F4D 0%, #2A2E39 100%)', border: '3px solid #4A5062', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: press > 0.5 ? `0 0 40px ${accent}66` : 'none'}}>
        <div style={{fontFamily: UNB, fontWeight: 700, fontSize: label.length > 5 ? 44 : /^[^\p{L}\p{N}]$/u.test(label) ? 110 : 60, lineHeight: 1, color: press > 0.5 ? accent : '#F2F4F8'}}>{label}</div>
      </div>
    </div>
  );
};

const Atajo: M = ({d}) => {
  const LIME = theme(d.app).accent;
  const keys: string[] = d.keys ?? ['Ctrl', 'C'];
  const total = keys.reduce((a, k) => a + Math.max(170, k.length * 52 + 90), 0) + (keys.length - 1) * 200;
  const scale = Math.min(1, 940 / total);
  return (
    <AbsoluteFill style={{background: '#061326', overflow: 'hidden'}}>
      {/* Suelo en perspectiva */}
      <div style={{position: 'absolute', left: -600, right: -600, top: 900, height: 1400, transform: 'perspective(900px) rotateX(64deg)', transformOrigin: 'top', backgroundImage: `linear-gradient(${LIME}30 2px, transparent 2px), linear-gradient(90deg, ${LIME}30 2px, transparent 2px)`, backgroundSize: '120px 120px', maskImage: 'linear-gradient(180deg, #000, transparent 75%)'}} />
      <div style={{position: 'absolute', left: 0, right: 0, top: 560, height: 500, background: `radial-gradient(ellipse at center, ${LIME}22, transparent 65%)`}} />
      <div style={{position: 'absolute', left: 90, top: 290, display: 'flex', alignItems: 'center', gap: 20}}>
        <div style={{padding: '12px 24px', borderRadius: 999, background: LIME, fontFamily: UNB, fontWeight: 700, fontSize: 30, color: '#061326'}}>ATAJO</div>
        {d.app_name && <div style={{fontFamily: UNB, fontWeight: 500, fontSize: 30, color: "#C8CCD6"}}>{d.app_name}</div>}
      </div>
      <div style={{position: 'absolute', left: 90, top: 380, width: 900, fontFamily: UNB, fontWeight: 900, fontSize: fit(String(d.title), 900, 84, 54, 3, 0.78), lineHeight: 1.08, color: '#fff'}}>{d.title}</div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 760, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 70 * scale, transform: `scale(${scale})`}}>
        {keys.map((k, i) => (
          <React.Fragment key={i}>
            {i > 0 && <div style={{fontFamily: UNB, fontWeight: 900, fontSize: 70, color: LIME}}>+</div>}
            <Keycap label={k} press={i === keys.length - 1 ? 1 : 0} accent={LIME} />
          </React.Fragment>
        ))}
      </div>
      <div style={{position: 'absolute', left: 90, top: 1100, width: 900, fontFamily: INTER, fontWeight: 600, fontSize: fit(String(d.what), 900, 50, 38, 4, 0.52), lineHeight: 1.35, color: '#E3E6EE'}}>{d.what}</div>
      {d.os && (
        <div style={{position: 'absolute', left: 90, top: 1440, display: 'flex', gap: 16}}>
          {(d.os as string[]).map((o) => <div key={o} style={{padding: '10px 22px', borderRadius: 12, border: '2px solid #ffffff30', fontFamily: MONO, fontSize: 26, color: '#AEB4C2'}}>{o}</div>)}
        </div>
      )}
      <Handle color="#ffffff60" y={1570} />
      <Grain opacity={0.07} />
    </AbsoluteFill>
  );
};

// ───────────────────────── HF04 · Prompt exprés ─────────────────────────
const PromptExpres: M = ({d}) => {
  const result: string[] = d.result ?? [];
  const t = theme(d.app);
  return (
    <AbsoluteFill style={{background: `linear-gradient(160deg, ${BRAND.navy} 0%, ${t.grad[0]} 50%, ${t.grad[1]} 100%)`, overflow: 'hidden'}}>
      <div style={{position: 'absolute', left: -200, top: -100, width: 800, height: 800, borderRadius: '50%', background: d.app ? t.accent : BRAND.violet, filter: 'blur(160px)', opacity: 0.45}} />
      <div style={{position: 'absolute', left: 80, top: 280, fontFamily: UNB, fontWeight: 900, fontSize: 76, color: '#fff', lineHeight: 1}}>PROMPT<br />EXPRÉS</div>
      <div style={{position: 'absolute', right: 80, top: 300, padding: '12px 22px', borderRadius: 999, background: '#ffffff26', border: '2px solid #ffffff55', fontFamily: INTER, fontWeight: 700, fontSize: 30, color: '#fff'}}>{d.app_name ?? "Copilot · ChatGPT"}</div>
      <div style={{position: 'absolute', left: 80, right: 80, top: 520, display: 'flex', flexDirection: 'column', gap: 30}}>
        <div style={{alignSelf: 'flex-end', maxWidth: 820, padding: '34px 38px', borderRadius: '44px 44px 10px 44px', background: '#fff', fontFamily: INTER, fontWeight: 600, fontSize: fit(String(d.prompt), 740, 58, 40, 7, 0.53), lineHeight: 1.35, color: '#0A1F3D', boxShadow: '0 30px 60px rgba(3,19,42,0.4)'}}>
          {d.prompt}
        </div>
        <div style={{alignSelf: 'flex-start', maxWidth: 780, padding: '30px 36px', borderRadius: '44px 44px 44px 10px', background: '#03132Acc', border: '2px solid #ffffff30', display: 'flex', flexDirection: 'column', gap: 16}}>
          <div style={{display: 'flex', gap: 10}}>{[0, 1, 2].map((i) => <div key={i} style={{width: 14, height: 14, borderRadius: '50%', background: '#A9D4F7', opacity: 0.5 + i * 0.25}} />)}</div>
          {result.slice(0, 4).map((r, i) => <div key={i} style={{fontFamily: INTER, fontWeight: 600, fontSize: 42, color: '#E6F1FC', lineHeight: 1.3}}>✓ {r}</div>)}
        </div>
      </div>
      {d.tip && (
        <div style={{position: 'absolute', left: 80, right: 80, top: 1420, padding: '26px 32px', borderRadius: 24, background: '#FFFFFF', transform: 'rotate(-2deg)', fontFamily: INTER, fontWeight: 700, fontSize: 34, color: t.deep, lineHeight: 1.3}}>
          ✂ Cópialo · {d.tip}
        </div>
      )}
      <Handle color="#ffffffaa" y={1580} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};

// ───────────────────────── HF05 · Mito o realidad ─────────────────────────
const Mito: M = ({d}) => {
  const t = theme(d.app);
  return (
  <AbsoluteFill style={{overflow: 'hidden', background: '#111'}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 1000, background: BRAND.charcoal, clipPath: 'polygon(0 0, 100% 0, 100% 88%, 0 100%)'}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: 870, bottom: 0, background: d.app ? t.deep : BRAND.blue, clipPath: 'polygon(0 13%, 100% 0, 100% 100%, 0 100%)'}} />
    <div style={{position: 'absolute', left: 90, top: 290, fontFamily: UNB, fontWeight: 900, fontSize: 120, color: '#8C96A3', letterSpacing: -2}}>MITO</div>
    <div style={{position: 'absolute', left: 90, top: 450, width: 900, fontFamily: INTER, fontWeight: 800, fontSize: fit(String(d.myth), 900, 96, 56, 4, 0.56), lineHeight: 1.2, color: '#fff'}}>
      <span style={{textDecoration: 'line-through', textDecorationThickness: 8, textDecorationColor: '#5AAEEE'}}>“{d.myth}”</span>
    </div>
    <div style={{position: 'absolute', left: 90, top: 1030, fontFamily: UNB, fontWeight: 900, fontSize: 110, color: '#03132A', letterSpacing: -2}}>REALIDAD</div>
    <div style={{position: 'absolute', left: 90, top: 1180, width: 900, fontFamily: INTER, fontWeight: 700, fontSize: fit(String(d.reality), 900, 62, 42, 6, 0.53), lineHeight: 1.28, color: '#fff'}}>{d.reality}</div>
    {d.note && <div style={{position: 'absolute', left: 90, top: 1560, width: 900, fontFamily: INTER, fontWeight: 700, fontSize: 30, color: '#DCEBFA'}}>{d.note}</div>}
    <Grain opacity={0.08} />
  </AbsoluteFill>
  );
};

// ───────────────────────── HF06 · Herramienta ─────────────────────────
const Herramienta: M = ({d}) => {
  const features: string[] = d.features ?? [];
  const t = theme(d.app);
  const mono = String(d.name ?? '?').replace(/[^A-Za-z0-9]/g, '').slice(0, 2);
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg, #071C36 0%, #03132A 100%)', overflow: 'hidden'}}>
      <AbsoluteFill style={{backgroundImage: `linear-gradient(${t.accent}14 2px, transparent 2px), linear-gradient(90deg, ${t.accent}14 2px, transparent 2px)`, backgroundSize: '90px 90px'}} />
      <div style={{position: 'absolute', left: 90, top: 280, fontFamily: MONO, fontWeight: 700, fontSize: 32, letterSpacing: 4, color: t.accent}}>// HERRAMIENTA DESCUBIERTA</div>
      <div style={{position: 'absolute', left: 70, right: 70, top: 400, padding: 60, borderRadius: 48, background: '#F7FBFF', boxShadow: '0 50px 120px rgba(0,0,0,0.6)'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 34}}>
          <div style={{width: 170, height: 170, borderRadius: 44, background: `linear-gradient(135deg, ${t.grad[0]}, ${t.grad[1]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: UNB, fontWeight: 900, fontSize: 72, color: '#fff', flexShrink: 0}}>{mono}</div>
          <div>
            <div style={{fontFamily: UNB, fontWeight: 900, fontSize: fit(String(d.name), 560, 70, 42, 2, 0.8), color: '#0A1F3D', lineHeight: 1.05}}>{d.name}</div>
            <div style={{fontFamily: INTER, fontWeight: 600, fontSize: 32, color: '#4A5F7A', marginTop: 10}}>{d.category}</div>
          </div>
        </div>
        <div style={{marginTop: 44, fontFamily: INTER, fontWeight: 600, fontSize: fit(String(d.what), 840, 52, 38, 5, 0.52), lineHeight: 1.35, color: '#0A1F3D'}}>{d.what}</div>
        <div style={{marginTop: 44, display: 'flex', flexDirection: 'column', gap: 28}}>
          {features.slice(0, 3).map((f, i) => (
            <div key={i} style={{display: 'flex', gap: 18, alignItems: 'flex-start', fontFamily: INTER, fontWeight: 500, fontSize: 42, color: '#2A3F5C', lineHeight: 1.3}}>
              <div style={{width: 34, height: 34, borderRadius: 10, background: `${t.deep}22`, color: t.deep, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 24, flexShrink: 0, marginTop: 4}}>✓</div>
              {f}
            </div>
          ))}
        </div>
        <div style={{marginTop: 44, display: 'flex', gap: 16}}>
          <div style={{padding: '14px 26px', borderRadius: 999, background: '#0A1F3D', color: '#A9D4F7', fontFamily: INTER, fontWeight: 700, fontSize: 36}}>{d.price}</div>
          <div style={{padding: '14px 26px', borderRadius: 999, border: '3px solid #0A1F3D', color: '#0A1F3D', fontFamily: INTER, fontWeight: 700, fontSize: 36}}>{d.where}</div>
        </div>
      </div>
      <Handle color={`${t.accent}99`} y={1580} font={MONO} />
      <Grain opacity={0.06} />
    </AbsoluteFill>
  );
};
