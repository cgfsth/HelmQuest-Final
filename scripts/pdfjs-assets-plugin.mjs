import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

// PDF.js workers fetch fonts, CMaps and image decoders from our own origin.
// Preserve their published filenames in development and in the Vite build.
export function pdfjsAssetsPlugin() {
  const require = createRequire(import.meta.url);
  const root = dirname(require.resolve('pdfjs-dist/package.json'));
  const assets = new Map();
  for (const directory of ['cmaps', 'standard_fonts', 'wasm', 'iccs']) {
    for (const file of readdirSync(join(root, directory))) assets.set(`pdfjs-assets/${directory}/${file}`, join(root, directory, file));
  }
  return {
    name: 'helmquest-pdfjs-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const key = req.url?.split('?')[0]?.replace(/^\//, '');
        if (!assets.has(key)) return next();
        res.setHeader('Content-Type', key.endsWith('.wasm') ? 'application/wasm' : key.endsWith('.js') ? 'text/javascript' : 'application/octet-stream');
        res.end(readFileSync(assets.get(key)));
      });
    },
    generateBundle() { for (const [fileName, path] of assets) this.emitFile({ type: 'asset', fileName, source: readFileSync(path) }); },
  };
}
