import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * ビルド後の dist/sw.js に、プリキャッシュするファイル一覧とバージョンを埋め込むプラグイン。
 * バージョンは成果物の内容から計算するため、中身が変わったときだけ Service Worker が更新される。
 */
function precacheManifest(): Plugin {
  let outDir = '';
  return {
    name: 'standby-precache-manifest',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    async closeBundle() {
      const files = (await readdir(outDir, { recursive: true, withFileTypes: true }))
        .filter((d) => d.isFile())
        .map((d) => path.relative(outDir, path.join(d.parentPath, d.name)).split(path.sep).join('/'))
        .filter((f) => f !== 'sw.js')
        .sort();
      const hash = createHash('sha256');
      for (const f of files) {
        hash.update(f);
        hash.update(await readFile(path.join(outDir, f)));
      }
      const assets = files.map((f) => (f === 'index.html' ? './' : `./${f}`));
      const manifest = { version: hash.digest('hex').slice(0, 12), assets };

      const swPath = path.join(outDir, 'sw.js');
      const source = await readFile(swPath, 'utf8');
      const marker = /\/\* __PRECACHE_MANIFEST__ \*\/ \{[^}]*\}/;
      if (!marker.test(source)) throw new Error('sw.js にプリキャッシュ一覧の埋め込み位置が見つかりません');
      await writeFile(swPath, source.replace(marker, JSON.stringify(manifest)));
    },
  };
}

// GitHub Pages（本番・PR プレビュー）では VITE_BASE_PATH でサブパスを指定する。
// 未指定時は相対パスにして、任意のディレクトリに置いても動くようにする。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE_PATH || './',
    plugins: [precacheManifest()],
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
