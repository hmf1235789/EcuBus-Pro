{
    'targets': [

        {
            'target_name': 'peakLin',
            'include_dirs': [
                './peak/inc',
                "<!@(node -p \"require('node-addon-api').include\")"
            ],
            'configurations': {

            },
            'defines': [
                '__EXCEPTIONS'
            ],
            'sources': [
                './peak/swig/lin_wrap.cxx', './peak/swig/lifn.cxx',
            ],
            'conditions': [
                ['OS=="win"', {
                    'cflags': [

                    ],
                    'cflags_cc': [

                    ],
                    'libraries': ['<(module_root_dir)/peak/lib/PLinApi.lib'],
                    'defines': ['DELAYLOAD_HOOK',],
                    'msvs_settings': {
                        'VCCLCompilerTool': {
                            'AdditionalOptions': ['/DELAYLOAD:PLinApi.dll'],
                            'ExceptionHandling': 1
                        }
                    },
                    'link_settings': {
                        'libraries': ['-DELAYLOAD:PLinApi.dll']
                    }
                }

                ]
            ],
        },
        {
            'target_name': 'delay',
            'include_dirs': [
                './delay',
                "<!@(node -p \"require('node-addon-api').include\")"
            ],
            'configurations': {

            },
            'defines': [
                '__EXCEPTIONS'
            ],
            'sources': [
                './delay/delay.cpp'
            ],
            'conditions': [
                ['OS=="win"', {
                    'cflags': [

                    ],
                    'cflags_cc': [

                    ],
                  
                    'msvs_settings': {
                        'VCCLCompilerTool': {
                            'AdditionalOptions': [],
                            'ExceptionHandling': 1
                        }
                    },
                    'link_settings': {
                        'libraries': []
                    }
                }

                ]
            ],
        }
    ]
}
