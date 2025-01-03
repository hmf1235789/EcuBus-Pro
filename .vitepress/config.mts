import { createRequire } from 'module'
import { defineConfig, type DefaultTheme } from 'vitepress'
const require = createRequire(import.meta.url)
const pkg = require('../package.json')
function nav(): DefaultTheme.NavItem[] {
  return [

    {
      text: pkg.version,
      items: [
        {
          text: 'Changelog',
          link: 'https://github.com/ecubus/EcuBus-Pro/blob/master/docs/dev/releases_note.md'
        },

      ]
    }
  ]
}
// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "EcuBus-Pro",
  ignoreDeadLinks: true,
  description: 'A powerful automotive ECU development tool',
  head: [
    ['link', { rel: 'icon', type: 'image/png', href: 'https://ecubus.oss-cn-chengdu.aliyuncs.com/img/logo256.png' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:locale', content: 'en' }],
    ['meta', { property: 'og:title', content: 'EcuBus-Pro | A powerful automotive ECU development tool' }],
    ['meta', { property: 'og:site_name', content: 'EcuBus-Pro' }],
    ['meta', { property: 'og:image', content: 'https://ecubus.oss-cn-chengdu.aliyuncs.com/img/logo256.png' }],
    ['meta', { property: 'og:url', content: 'https://app.whyengineer.com' }],
  ],
  lastUpdated: true,

  themeConfig: {
    nav: nav(),
    // https://vitepress.dev/reference/default-theme-config
    outline: {
      level: [2, 3]
    },
    editLink: {
      pattern: 'https://github.com/ecubus/EcuBus-Pro/edit/master/:path',
      text: 'Edit this page on GitHub'
    },
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
        
          { text: 'Sponsor ❤️', link: '/docs/about/sponsor' },
          { text: 'Contact', link: '/docs/about/contact' }
        ]
      },
      {
        text: 'User Manual',
        link: '/docs/um/concept',
        items: [
          { text: 'CLI', link: '/docs/um/cli' },
          { text: 'Script', link: '/docs/um/script',items:[
            { text: 'Use External Package', link: '/docs/um/scriptSerialPort' },
          ]},
          { text: 'Database', link: '/docs/um/database',items:[
            { text: 'LIN LDF', link: '/docs/um/ldf' },
          ]},
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
        collapsed: true,
        items: [
          { text: 'Arch', link: '/docs/dev/arch' },
          { text: 'Setup', link: '/docs/dev/setup',
            items:[
              {
                  text:'Learning Resources',link:'/docs/dev/jslearn'
              }
             
            ]
          },
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
  sitemap: {
    hostname: 'https://app.whyengineer.com'
  }

})
