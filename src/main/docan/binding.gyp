{
    'targets': [
        # {   
        #     'target_name': 'zlg',
        #     'conditions': [
        #         ['OS=="win"', {
        #             'include_dirs': [
        #                 './zlg/inc',
        #                 "<!@(node -p \"require('node-addon-api').include\")"
        #             ],
        #             'configurations': { },
        #             'defines': [
        #                 '__EXCEPTIONS'
        #             ],
        #             'sources': [
        #                 './zlg/swig/zlg_wrap.cxx',
        #                 './zlg/swig/tsfn.cxx'
        #             ],
        #             'cflags': [ ],
        #             'cflags_cc': [ ],
        #             'libraries': ['<(module_root_dir)/zlg/lib/zlgcan.lib'],
        #             'defines': [ 'DELAYLOAD_HOOK' ],
        #             'msvs_settings': {
        #                 'VCCLCompilerTool': {
        #                     'AdditionalOptions': [ '/DELAYLOAD:zlgcan.dll','/DELAYLOAD:msvcp120.dll','/DELAYLOAD:msvcr120.dll' ],
        #                     'ExceptionHandling':1
        #                 }
        #             },
        #             'link_settings': {
        #                 'libraries': [ '-DELAYLOAD:zlgcan.dll','-DELAYLOAD:msvcp120.dll','-DELAYLOAD:msvcr120.dll' ]
        #             }
        #         },'OS=="linux"', {
        #             'include_dirs': [
        #                 "<!@(node -p \"require('node-addon-api').include\")"
        #             ],
        #             'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
        #             'cflags!': [ '-fno-exceptions' ],
        #             'cflags_cc!': [ '-fno-exceptions' ],
        #             'sources': [ './fake_linux.cxx' ],
        #             'cflags': [ '-fexceptions' ],
        #             'cflags_cc': [ '-fexceptions' ]
        #         },'OS=="mac"', {
        #             'include_dirs': [
        #                 "<!@(node -p \"require('node-addon-api').include\")"
        #             ],
        #             'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
        #             'cflags!': [ '-fno-exceptions' ],
        #             'cflags_cc!': [ '-fno-exceptions' ],
        #             'sources': [ './fake_mac.cxx' ],
        #             'xcode_settings': {
        #                 'GCC_ENABLE_CPP_EXCEPTIONS': 'YES'
        #             }
        #         }]
        #     ]
        # },
          {   
            'target_name': 'vector',
            'conditions': [
                ['OS=="win"', {
                    'include_dirs': [
                        './vector/inc',
                        "<!@(node -p \"require('node-addon-api').include\")"
                    ],
                    'configurations': { },
                    'defines': [
                        '__EXCEPTIONS'
                    ],
                    'sources': [
                        './vector/swig/vector_wrap.cxx',
                        './vector/swig/tsfn.cxx'
                    ],
                    'cflags': [ ],
                    'cflags_cc': [ ],
                    'libraries': ['<(module_root_dir)/vector/lib/vxlapi64.lib'],
                    'defines': [ 'DELAYLOAD_HOOK' ],
                    'msvs_settings': {
                        'VCCLCompilerTool': {
                            'AdditionalOptions': [ '/DELAYLOAD:vxlapi64.dll' ],
                            'ExceptionHandling':1
                        }
                    },
                    'link_settings': {
                        'libraries': [ '-DELAYLOAD:vxlapi64.dll' ]
                    }
                },'OS=="linux"', {
                    'include_dirs': [
                        "<!@(node -p \"require('node-addon-api').include\")"
                    ],
                    'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
                    'cflags!': [ '-fno-exceptions' ],
                    'cflags_cc!': [ '-fno-exceptions' ],
                    'sources': [ './fake_linux.cxx' ],
                    'cflags': [ '-fexceptions' ],
                    'cflags_cc': [ '-fexceptions' ]
                },'OS=="mac"', {
                    'include_dirs': [
                        "<!@(node -p \"require('node-addon-api').include\")"
                    ],
                    'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
                    'cflags!': [ '-fno-exceptions' ],
                    'cflags_cc!': [ '-fno-exceptions' ],
                    'sources': [ './fake_mac.cxx' ],
                    'xcode_settings': {
                        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES'
                    }
                }]
            ]
        },
    ]
}