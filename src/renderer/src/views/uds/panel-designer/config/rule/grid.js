import {localeProps} from '../../utils';

const label = 'Grid';
const name = 'Grid';

export default {
    menu: 'layout',
    icon: 'icon-table',
    label,
    name,
    inside: false,
    mask: false,
    rule() {
        return {
            type: name,
            props: {
                rule: {
                    row: 3,
                    col: 4,
                   
                    layout: []
                }
            },
            children: []
        };
    },
    props(_, {t}) {
        return localeProps(t, name + '.props', [
            {type: 'switch', field: 'border', value: true},
            {type: 'ColorInput', field: 'borderColor'},
            {type: 'input', field: 'borderWidth'},
            {type: 'button',title:'Add' },
        ]);
    }
};
