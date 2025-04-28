import { localeOptions, localeProps } from '../../utils';

const label = 'Progress';
const name = 'elProgress';

export default {
    menu: 'aide',
    icon: 'icon-time-range',
    label,
    name,
    rule({ t }) {
        return {
            type: name,
            props: {
                percentage: 15,
                strokeWidth: 20,
                textInside: true,
                status: '',
                showText: true,
                color: '#409EFF',
            },
        };
    },
    props(_, { t }) {
        return localeProps(t, name + '.props', [
          
            {
                type: 'number',
                field: 'strokeWidth',
                title: 'Stroke Width'
            },
            {
                type: 'select',
                field: 'type',
                title: 'Type',
                options: localeOptions(t, [
                    { label: 'line', value: 'line' }, 
                    { label: 'circle', value: 'circle' },
                    { label: 'dashboard', value: 'dashboard' }
                ])
            },
            
            { 
                type: 'switch', 
                field: 'textInside', 
                title: 'Text Inside' 
            },
            { 
                type: 'switch', 
                field: 'showText', 
                title: 'Show Text' 
            },
            { 
                type: 'ColorPicker', 
                field: 'color', 
                title: 'Color' 
            },
          
          
        ]);
    }
}; 