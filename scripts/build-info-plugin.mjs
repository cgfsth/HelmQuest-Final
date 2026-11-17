import { execFileSync } from 'node:child_process';

export function buildInfoPlugin() {
  return {
    name: 'helmquest-build-info', apply: 'build',
    generateBundle() {
      let revision = 'unknown';
      let sourceDirty = null;
      try {
        revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim();
        sourceDirty = !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8', windowsHide: true }).trim();
      } catch { /* Source archives may not include Git. */ }
      this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify({ revision, sourceDirty, builtAt: new Date().toISOString() }) });
    }
  };
}
