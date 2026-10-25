import { defineConfig } from '@vben/vite-config';

import ElementPlus from 'unplugin-element-plus/vite';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      build: {
        // aurora-admin 和 aurora-admin 需放在同级目录
        outDir: '../../../aurora-admin/assets/web/dist',
        emptyOutDir: true,
      },
      plugins: [
        ElementPlus({
          format: 'esm',
        }),
      ],
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // mock代理目标地址
            target: 'http://127.0.0.1:5800/api',
            // target: 'http://localhost:5320/api',
            ws: true,
          },
        },
      },
    },
  };
});
