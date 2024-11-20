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
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@r': resolve('src/renderer/src'),
        'nodeCan': resolve(__dirname, 'src/main/share'),
      }
    },
    plugins: [vue(),vueJsx(),
      nodePolyfills({
        include:['buffer'],
        globals:{
          Buffer:true
        }
      })

    ]
  }
})
