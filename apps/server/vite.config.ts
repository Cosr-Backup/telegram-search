import { resolve } from 'node:path'

import DrizzleORMMigrations from '@proj-airi/unplugin-drizzle-orm-migrations/vite'
import { defineConfig } from 'vite'

// NOTE: Since the alias for the core package has been set,
// the packaged code cannot be used directly,
// and the plugin needs to be reconfigured.
export default defineConfig({
    build: {
    // 指定输出目录为 dist
    outDir: 'dist',
    // 开启 SSR (服务器端渲染) 模式
    ssr: true,
    // 关闭代码压缩，方便调试 (可选)
    minify: false,
    rollupOptions: {
      // 指定入口文件
      input: 'src/app.ts'
    }
  },
      
  plugins: [
    DrizzleORMMigrations({
      root: '../..',
    }),
  ],

  resolve: {
    alias: {
      '@tg-search/core': resolve(import.meta.dirname, '../../packages/core/dist'),
      '@tg-search/common': resolve(import.meta.dirname, '../../packages/common/src'),
    },
  },

  optimizeDeps: {
    include: ['@tg-search/core', '@tg-search/common'],
  },
})
