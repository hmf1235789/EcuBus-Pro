import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import ConditionalCompile from "vite-plugin-conditional-compiler";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(),ConditionalCompile(),
      ],
      resolve:{
        // src
        alias: {
          'src': resolve(__dirname, 'src'),
        }
      },
      build: {
        rollupOptions: {
          input: {
            index: resolve(__dirname, 'src/cli/index.ts'),
            fake: resolve(__dirname, 'src/cli/fake.ts'),
          },
          output:{
            entryFileNames: 'index.js',
            format: 'cjs',
            dir: resolve(__dirname, 'out/cli')
          }
        }
      }
  },
})
