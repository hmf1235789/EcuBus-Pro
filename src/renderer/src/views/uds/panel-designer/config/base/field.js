export default function field({t}) {
    return [
        {
            type: 'FieldInput',
            field: 'field',
            value: '',
            title: t('form.field'),
            warning: t('warning.field'),
        }, {
            type: 'LanguageInput',
            field: 'title',
            value: '',
            title: t('form.title'),
        }, {
            type: 'LanguageInput',
            field: 'info',
            value: '',
            title: t('form.info'),
        }, {
            type: 'SizeInput',
            field: 'formCreateWrap>labelWidth',
            value: '',
            title: t('form.labelWidth'),
        },
        {
            type: 'Signal',
            field: 'signal',
            title: t('signal.title'),
            warning: 'When both signal and variable are set, only variable will take effect',
        },
        {
            type: 'Variable',
            field: 'variable',
            warning: 'When both signal and variable are set, only variable will take effect',
            title: t('variable.title'),
        },
        // {
        //     type: 'Struct',
        //     field: '_control',
        //     name: 'control',
        //     value: [],
        //     title: t('form.control'),
        //     warning: t('form.controlDocument', {doc: '<a target="_blank" href="https://form-create.com/v3/guide/control" style="color: inherit;text-decoration: underline;">' + t('form.document') + '</a>'}),
        //     props: {
        //         defaultValue: [],
        //         validate(val) {
        //             if (!Array.isArray(val)) return false;
        //             if (!val.length) return true;
        //             return !val.some(({rule}) => {
        //                 return !Array.isArray(rule);
        //             });
        //         }
        //     }
        // },
    ];
}
