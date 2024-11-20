import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "EcuBus-Pro",
  description: "A VitePress Site",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
   
  
    sidebar: [
      {
        text: 'About',
        items: [
          { text: 'Introduce', link: '/' },
          { text: 'Install', link: '/docs/about/install' },
          { text: 'CLI', link: '/docs/about/cli' },
          { text: 'Sponsor ❤️', link: '/docs/about/sponsor' },
          { text: 'Contact', link: '/docs/about/contact' }
        ]
      },
      {
        text: 'User Manual',
        items: [
          { text: 'Concept', link: '/docs/um/concept' },
        ]
      },
      {
        text: 'Developer Manual',
        items: [
          { text: 'Arch', link: '/docs/dev/arch' },
          { text: 'Setup', link: '/docs/dev/setup' },
          { text: 'Test', link: '/docs/dev/test' },
          { text: 'Addon', link: '/docs/dev/addon' },
          { text: 'Releases Note', link: '/docs/dev/releases_note' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ecubus/EcuBus-Pro' }
    ],
    
  },
  rewrites: {
    'README.md': 'index.md',
  },
})
