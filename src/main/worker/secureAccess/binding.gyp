{
    'targets': [
        {   
            'target_name': 'sa',
            'include_dirs': [
                '.',
                "<!@(node -p \"require('node-addon-api').include\")"
            ],
            'configurations': {
                
            },
            'defines': [
               '__EXCEPTIONS'
            ],
            'sources': [
                './sa.cpp', './sa_wrap.cxx', 
            ],
            'conditions': [
                ['OS=="win"', {
                    'cflags': [
                        
                    ],
                    'cflags_cc': [
                       
                    ],
                    'libraries': [],
                    'defines': [ 'DELAYLOAD_HOOK',],
                    'msvs_settings': {
                        'VCCLCompilerTool': {
                        'AdditionalOptions': [],
                        'ExceptionHandling':1
                        }
                    },
                    'link_settings': {
                        'libraries': []
                    }
                }
                
                ]
            ],
        },
    ]
}