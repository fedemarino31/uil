
import { Bool } from '../proto/Bool.js';
import { Button } from '../proto/Button.js';
import { Circular } from '../proto/Circular.js';
import { Color } from '../proto/Color.js';
import { Fps } from '../proto/Fps.js';
import { Graph } from '../proto/Graph.js';
import { Group  } from '../proto/Group.js';
import { Joystick } from '../proto/Joystick.js';
import { Knob } from '../proto/Knob.js';
import { List } from '../proto/List.js';
import { Numeric } from '../proto/Numeric.js';
import { Slide } from '../proto/Slide.js';
import { TextInput } from '../proto/TextInput.js';
import { Title } from '../proto/Title.js';
import { Select } from '../proto/Select.js';
import { Bitmap } from '../proto/Bitmap.js';
import { Selector } from '../proto/Selector.js';
import { Empty } from '../proto/Empty.js';
import { Item } from '../proto/Item.js';
import { Grid } from '../proto/Grid.js';
import { Pad2D } from '../proto/Pad2D.js';
import { Roots } from './Roots.js';
import { TreeList } from '../proto/TreeList.js';
import { Tabs } from '../proto/Tabs.js';

export const add = function () {

        let a = arguments; 

        let type, o, ref = false, n = null;

        if( typeof a[0] === 'string' ){ 

            type = a[0];
            o = a[1] || {};

        } else if ( typeof a[0] === 'object' ){ // like dat gui

            ref = true;
            if( a[2] === undefined ) [].push.call(a, {});
                
            type = a[2].type ? a[2].type : autoType( a[0][a[1]], a[2] );

            o = a[2];
            o.name = a[1];
            if (o.hasOwnProperty("displayName")) o.name = o.displayName;

            if( type === 'list' && !o.list ){ o.list = a[0][a[1]]; }
            else o.value = a[0][a[1]];

        }

        let name = type.toLowerCase();

        if( name === 'group' ){ 
            o.add = add;
            //o.dx = 8
        }

        switch( name ){

            case 'bool': case 'boolean': n = new Bool(o); break;
            case 'button': n = new Button(o); break;
            case 'circular': n = new Circular(o); break;
            case 'color': n = new Color(o); break;
            case 'fps': n = new Fps(o); break;
            case 'graph': n = new Graph(o); break;
            case 'group': n = new Group(o); break;
            case 'joystick': n = new Joystick(o); break;
            case 'knob': n = new Knob(o); break;
            case 'list': n = new List(o); break;
            case 'numeric': case 'number': n = new Numeric(o); break;
            case 'slide': n = new Slide(o); break;
            case 'textInput': case 'string': n = new TextInput(o); break;
            case 'title': case 'text': n = new Title(o); break;
            case 'select': n = new Select(o); break;
            case 'bitmap': n = new Bitmap(o); break;
            case 'selector': n = new Selector(o); break;
            case 'empty': case 'space': n = new Empty(o); break;
            case 'item': n = new Item(o); break;
            case 'grid': n = new Grid(o); break;
            case 'pad2d': case 'pad': n = new Pad2D(o); break;
            case 'treelist': n = new TreeList(o); break;
            case 'tab': {
                // Host donde anclar tabs: si se llama desde gui.add(), host = this (Gui)
                // si se llamara desde dentro de un Group, subimos a this.main (Gui)
                const host = this.isGui ? this : this.main;

                // 1) Crear (o reutilizar) una sola barra de tabs en la PRIMERA FILA
                if (!host._tabsBar) {
                    const to = {
                        name: '',
                        ontop: true,    // rinde al comienzo
                        isUI: true,
                        main: host
                    };
                    const bar = new Tabs(to);
                    host._tabsBar = bar;
                    // aseguro que forme parte del layout del gui (primero)
                    if (Array.isArray(host.uis)) host.uis.unshift(bar);
                }

                // 2) Crear el contenedor (Group) de la pestaña, SIN cabecera
                const label = o.displayName || o.name || `Tab ${host._tabsBar.items.length + 1}`;
                const go = {
                    ...o,
                    type: 'group',
                    name: label,
                    simple: true,        // Proto no crea columna de título (header)  :contentReference[oaicite:5]{index=5}
                    open: true,
                    isTabContent: true,
                    add: add,            // factory para que group.add(...) funcione  :contentReference[oaicite:6]{index=6}
                    isUI: true,
                    target: host.inner,
                    main: host
                };
                const grp = new Group(go);

                // 3) Registrar en barra y colapsar/expandir según activo
                host._tabsBar.registerTab(label, grp);

                // 4) Asegurar que participe del layout del gui
                if (Array.isArray(host.uis)) host.uis.push(grp);

                n = grp;
            } break;

        }

        

        if( n !== null ){

            Roots.needResize = true

            if( ref ) n.setReferency( a[0], a[1] );
            return n;

        }

}

export const autoType = function ( v, o ) {

    let type = 'slide'

    if( typeof v === 'boolean' ) type = 'bool' 
    else if( typeof v === 'string' ){ 

        if( v.substring(0,1) === '#' ) type = 'color'
        else type = 'string' 

    } else if( typeof v === 'number' ){ 

        if( o.ctype ) type = 'color'
        else type = 'slide'

    } else if( typeof v === 'array' && v instanceof Array ){

        if( typeof v[0] === 'number' ) type = 'number'
        else if( typeof v[0] === 'string' ) type = 'list'

    } else if( typeof v === 'object' && v instanceof Object ){

        if( v.x !== undefined ) type = 'number'
        else type = 'list'

    }

    return type

}