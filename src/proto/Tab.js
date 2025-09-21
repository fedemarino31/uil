import { Proto } from '../core/Proto.js';
import { Roots } from '../core/Roots.js';

export class Tab extends Proto {

    constructor( o = {} ) {

        o.simple = true;
        super( o );

        this.isGroup = true;
        this.isTab = true;

        this.ADD = o.add;

        this.autoHeight = true;
        this.uis = [];
        this.proto = null;
        this.current = -1;
        this.isActive = false;
        this.tabBg = o.bg !== undefined ? o.bg : null;

        this.defaultMargin = this.margin;
        this.margin = 0;

        this.useFlex = true;
        let flexible = this.useFlex ? 'display:flex; flex-flow: row wrap;' : '';

        this.bodyDisplay = this.useFlex ? 'flex' : 'block';

        this.c[1] = this.dom( 'div', this.css.basic + flexible + 'width:100%; left:0; top:0;');

        this.init();

        this.baseDisplay = this.s[0].display;

        this.s[0].background = 'none';
        this.s[0].border = 'none';
        this.s[0].height = '0px';
        this.s[0].padding = '0px';
        this.s[0].overflow = 'hidden';
        this.s[0].pointerEvents = 'none';
        this.s[0].display = 'none';

        this.s[1] = this.c[1].style;
        this.s[1].display = 'none';
        this.s[1].top = '0px';
        this.s[1].pointerEvents = 'none';

        this.createTabButton();

        if( this.tabBg ) this.setBG( this.tabBg );

        this.main.registerTab( this );

    }

    createTabButton () {

        const cc = this.colors;

        this.tabButton = document.createElement('div');
        this.tabButton.className = 'uil-tab-button';
        this.tabButton.style.display = 'flex';
        this.tabButton.style.alignItems = 'center';
        this.tabButton.style.justifyContent = 'center';
        this.tabButton.style.cursor = 'pointer';
        this.tabButton.style.padding = '0 ' + (cc.sx * 2) + 'px';
        this.tabButton.style.height = this.main.size.h + 'px';
        this.tabButton.style.border = cc.borderSize + 'px solid ' + cc.border;
        this.tabButton.style.borderRadius = this.radius + 'px';
        this.tabButton.style.background = cc.button;
        this.tabButton.style.color = cc.text;
        this.tabButton.style.fontFamily = cc.fontFamily;
        this.tabButton.style.fontSize = cc.fontSize + 'px';
        this.tabButton.style.fontWeight = cc.fontWeight;
        this.tabButton.style.textShadow = cc.fontShadow;
        this.tabButton.style.pointerEvents = 'auto';
        this.tabButton.style.marginRight = cc.sx + 'px';
        this.tabButton.textContent = this.txt;

        this.tabButton.addEventListener( 'click', ( e ) => {
            e.preventDefault();
            this.main.activateTab( this );
        });

        this.updateButtonState();

    }

    updateButtonState () {

        if( !this.tabButton ) return;

        const cc = this.colors;
        if( this.isActive ){
            this.tabButton.style.background = cc.select;
            this.tabButton.style.color = cc.textSelect;
            this.tabButton.style.borderColor = cc.select;
        } else {
            this.tabButton.style.background = cc.button;
            this.tabButton.style.color = cc.text;
            this.tabButton.style.borderColor = cc.border;
        }

    }

    setBG ( bg ) {

        if( bg !== undefined ) this.tabBg = bg;
        if( !this.isActive ) return;

        this.s[0].background = this.tabBg ? this.tabBg : 'none';
        this.s[1].background = this.tabBg ? this.tabBg : 'none';

    }

    testZone () {

        if( !this.isActive ) return '';
        let l = this.local;
        if( l.x === -1 && l.y === -1 ) return '';
        return 'content';

    }

    clearTarget () {

        if( this.current === -1 ) return false;
        if( this.proto && this.proto.s ){
            this.proto.uiout();
            this.proto.reset();
        }
        this.proto = null;
        this.current = -1;
        this.cursor();
        return true;

    }

    reset () {

        this.clearTarget();

    }

    handleEvent ( e ) {

        if( !this.isActive ) return false;

        let type = e.type;
        let change = false;
        let protoChange = false;

        let name = this.testZone( e );
        if( !name ) return false;

        switch( name ){

            case 'content':
                if( Roots.isMobile && type === 'mousedown' ) this.getNext( e, change );
                if( this.proto ) protoChange = this.proto.handleEvent( e );
                if( !Roots.lock ) this.getNext( e, change );
            break;

        }

        if( this.isDown ) change = true;
        if( protoChange ) change = true;

        return change;

    }

    getNext ( e, change ) {

        let next = Roots.findTarget( this.uis, e );

        if( next !== this.current ){
            this.clearTarget();
            this.current = next;
            change = true;
        }

        if( next !== -1 ){
            this.proto = this.uis[ this.current ];
            this.proto.uiover();
        }

    }

    add () {

        let a = arguments;

        if( typeof a[1] === 'object' ){
            a[1].isUI = this.isUI;
            a[1].target = this.c[1];
            a[1].main = this.main;
            a[1].group = this;
        } else if( typeof a[1] === 'string' ){
            if( a[2] === undefined ) [].push.call( a, { isUI:true, target:this.c[1], main:this.main, group:this });
            else{
                a[2].isUI = true;
                a[2].target = this.c[1];
                a[2].main = this.main;
                a[2].group = this;
            }
        }

        let u = this.ADD.apply( this, a );

        if( u === null ) return u;

        if( u.isGroup ) u.dx = 8;

        Roots.forceZone = true;

        this.uis.push( u );

        if( this.isActive ) this.main.calc();

        return u;

    }

    calcUis () {

        if( !this.isActive || this.uis.length === 0 ){
            this.h = 0;
            this.s[0].height = '0px';
            this.zone.h = this.margin;
            return;
        }

        this.h = Roots.calcUis( this.uis, this.zone, this.zone.y, true );
        this.s[0].height = this.h + 'px';
        this.zone.h = this.h + this.margin;

    }

    activate () {

        if( this.isActive ) return;
        this.isActive = true;
        this.margin = this.defaultMargin;
        this.s[0].display = this.baseDisplay;
        this.s[0].pointerEvents = 'auto';
        this.s[1].display = this.bodyDisplay;
        this.s[1].pointerEvents = 'auto';
        this.updateButtonState();
        if( this.tabBg ) this.setBG();
        this.calcUis();
        Roots.needResize = true;
        Roots.forceZone = true;

    }

    deactivate () {

        if( !this.isActive ) return;
        this.clearTarget();
        this.isActive = false;
        this.margin = 0;
        this.h = 0;
        this.zone.h = 0;
        this.s[0].height = '0px';
        this.s[0].display = 'none';
        this.s[0].pointerEvents = 'none';
        this.s[1].display = 'none';
        this.s[1].pointerEvents = 'none';
        this.updateButtonState();
        Roots.needResize = true;
        Roots.forceZone = true;

    }

    dispose () {

        if( this.main ) this.main.unregisterTab( this );
        this.clear();
        super.dispose();

    }

    clear () {

        this.empty();

    }

    empty () {

        let i = this.uis.length, item;

        while( i-- ){
            item = this.uis.pop();
            if( this.c[1] && item.c ) this.c[1].removeChild( item.c[0] );
            item.clear( true );
        }

        this.h = 0;
        this.zone.h = 0;
        this.margin = 0;

        Roots.needResize = true;
        Roots.forceZone = true;

    }

}
