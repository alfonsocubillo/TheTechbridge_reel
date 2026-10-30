// Renderizador por lotes del estudio local: empaqueta el proyecto UNA vez y renderiza todos los trabajos.
//   node studio-render.mjs trabajos.json
// trabajos.json = [{composition, props, out, kind: "still" | "video", frame?, scale?, crf?}]
// En local usa la tarjeta gráfica (gl=angle); se puede cambiar con RENDER_GL.
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf-8'));
const gl = process.env.RENDER_GL || 'angle';
const concurrency = Number(process.env.RENDER_CONCURRENCY || 8);

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), onProgress: () => undefined});
let failed = 0;
for (const [i, job] of jobs.entries()) {
  const t0 = Date.now();
  try {
    const composition = await selectComposition({serveUrl, id: job.composition, inputProps: job.props, chromiumOptions: {gl}, timeoutInMilliseconds: 120000});
    fs.mkdirSync(path.dirname(job.out), {recursive: true});
    if (job.kind === 'still') {
      await renderStill({
        serveUrl, composition, inputProps: job.props, output: job.out, frame: job.frame ?? 0, scale: job.scale ?? 1,
        imageFormat: job.out.endsWith('.png') ? 'png' : 'jpeg', jpegQuality: 93, chromiumOptions: {gl}, timeoutInMilliseconds: 120000,
      });
    } else {
      await renderMedia({
        serveUrl, composition, inputProps: job.props, outputLocation: job.out, codec: 'h264', crf: job.crf ?? 18,
        audioCodec: 'aac', audioBitrate: '192k', concurrency, chromiumOptions: {gl}, imageFormat: 'jpeg', jpegQuality: 92, timeoutInMilliseconds: 120000,
      });
    }
    console.log(`OK ${i + 1}/${jobs.length} ${job.composition} → ${path.basename(job.out)} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  } catch (e) {
    failed += 1;
    console.log(`ERROR ${i + 1}/${jobs.length} ${job.composition} → ${job.out}: ${e.message?.split('\n')[0]}`);
  }
}
process.exit(failed ? 1 : 0);
