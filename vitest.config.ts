import { defineConfig, mergeConfig } from 'vitest/config'
import path from 'path'
import config from "./electron.vite.config";
export const nodejsPolarsDirnamePlugin = () => {
  const name = 'nodejs-polars-dirname-plugin'
  return {
    name,

    transform(code: string, id: string) {
      // aim for the node_modules/nodejs-polars/bin/native-polars.js file

      if (id.endsWith('.node')) {
        const file = path.basename(id)
        return `
                // create a custom require function to load .node files
                import { createRequire } from 'module';
                const customRequire = createRequire(import.meta.url)

                // load the .node file expecting it to be in the same directory as the output bundle
                const content = customRequire('./${file}')

                // export the content straight back out again
                export default content
                `
      }
      // else return the original code (leave code unrelated to nodejs-polars untouched)
      return code
    },
  }
}
export default mergeConfig(config.main as any, defineConfig({
  test: {
    // ...
  },
  plugins: [
    nodejsPolarsDirnamePlugin()
  ]
}))
