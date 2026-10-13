import { defineConfig, loadEnv } from 'vite';

// GitHub Pages（本番・PR プレビュー）では VITE_BASE_PATH でサブパスを指定する。
// 未指定時は相対パスにして、任意のディレクトリに置いても動くようにする。
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: env.VITE_BASE_PATH || './',
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
