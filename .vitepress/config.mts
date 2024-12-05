import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "EcuBus-Pro",
  description: "A VitePress Site",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
   
    search: {
      provider: 'algolia',
      options: {
        appId: 'KXFLA7UAD8',
        apiKey: '67edbcb2f3c63548c4bf738d61602a03',
        indexName: 'app-whyengineer'
      }
    },
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
        text: 'Example',
        
        items: [
          { text: 'NXP UDS Bootloader', link: '/examples/nxp_bootloader/readme' },
          { text: 'Secure Access dll', link: '/examples/secure_access_dll/readme' },
          { text: 'DoIP Tester', link: '/examples/doip/readme' },
          { text: 'DoIP Simulate Entity', link: '/examples/doip_sim_entity/readme' },
        ]
      },
      {
        text: 'Developer Manual',
        collapsed:true,
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
    'resources/examples/:pkg/:slug*': 'examples/:pkg/:slug*'
  },
  sitemap:{
    hostname: 'https://app.whyengineer.com'
  }
  
})
