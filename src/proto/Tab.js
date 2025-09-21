import { Proto } from '../core/Proto.js';
import { Roots } from '../core/Roots.js';

export class Tab extends Proto {

    constructor( o = {} ) {

        o.simple = true;

        super( o );

        this.isTab = true;
        this.isGroup = true;

        this.ADD = o.add;

        this.autoHeight = true;

        this.uis = [];
        this.current = -1;
        this.proto = null;
        this.isEmpty = true;

        this.isActive = false;
        this.isHover = false;

        if( this.isUI && this.main ){
            this.main.ensureTabContainers();
            this.target = this.main.tabContent;
        }

        this.useFlex = true;
        const flexible = this.useFlex ? 'display:flex; flex-flow: row wrap;' : '';

        this.c[1] = this.dom( 'div', this.css.basic + flexible + 'width:100%; left:0; top:0; pointer-events:auto;' );

        this.init();

        this.container = this.c[1];
        this.sc = this.c[1].style;

        this.s[0].background = 'none';
        this.s[0].height = '0px';
        this.s[0].display = 'none';
        this.s[0].pointerEvents = 'none';

        this.sc.background = 'none';

        this.createButton();

        this.setBG( o.bg );

        if( this.isUI && this.main ){
            this.main.registerTab( this );
            if( o.active || o.open ) this.main.setActiveTab( this );
        }

    }

    createButton () {

        if( !this.isUI || !this.main ) return;

        const cc = this.colors;
        const h = this.main.size.h;
        const buttonCss = this.css.txt + this.css.button +
            'position:relative; pointer-events:auto; cursor:pointer; width:auto; padding:0 12px; height:' + (h-2) + 'px; line-height:' + (h-4) + 'px; border:' + cc.borderSize + 'px solid ' + cc.border + '; border-radius:' + this.radius + 'px;';

        this.tabButton = this.dom( 'div', buttonCss );
        this.tabButton.textContent = this.txt;
        this.tabButton.style.marginRight = this.margin + 'px';
        this.tabButton.style.background = cc.button;
        this.tabButton.style.color = cc.text;

        this._bindDown = this.onButtonDown.bind( this );
        this._bindOver = this.onButtonOver.bind( this );
        this._bindOut = this.onButtonOut.bind( this );

        this.tabButton.addEventListener( 'pointerdown', this._bindDown );
        this.tabButton.addEventListener( 'pointerenter', this._bindOver );
        this.tabButton.addEventListener( 'pointerleave', this._bindOut );

        this.main.tabBar.appendChild( this.tabButton );

        this.updateButtonState();

    }

    onButtonDown ( e ) {

        e.preventDefault();
        e.stopPropagation();

        if( this.main ) this.main.setActiveTab( this );

    }

    onButtonOver () {

        this.isHover = true;
        this.updateButtonState();

    }

    onButtonOut () {

        this.isHover = false;
        this.updateButtonState();

    }

    updateButtonState () {

        if( !this.tabButton ) return;

        const cc = this.colors;

        if( this.isActive ){
            this.tabButton.style.background = cc.select;
            this.tabButton.style.color = cc.textSelect;
            this.tabButton.style.borderColor = cc.select;
        } else if( this.isHover ) {
            this.tabButton.style.background = cc.overoff;
            this.tabButton.style.color = cc.textOver;
            this.tabButton.style.borderColor = cc.border;
        } else {
            this.tabButton.style.background = cc.button;
            this.tabButton.style.color = cc.text;
            this.tabButton.style.borderColor = cc.border;
        }

    }

    setBG ( bg ) {

        const cc = this.colors;

        if( bg !== undefined ) cc.groups = bg;
        if( cc.groups === 'none' ) cc.groups = cc.background;

        this.sc.background = cc.groups;

        if( this.radius ) this.sc.borderRadius = this.radius + 'px';

    }

    testZone ( e ) {

        if( !this.isActive ) return '';

        const l = this.local;
        if( l.x === -1 && l.y === -1 ) return '';

        if( l.y >= 0 && l.y <= this.h ) return 'content';

        return '';

    }

    handleEvent ( e ) {

        if( !this.isActive ) return;

        const type = e.type;

        let change = false;
        let protoChange = false;

        const name = this.testZone( e );

        if( !name ) return;

        if( name === 'content' ){

            if( Roots.isMobile && type === 'mousedown' ) this.getNext( e, change );
            if( this.proto ) protoChange = this.proto.handleEvent( e );
            if( !Roots.lock ) this.getNext( e, change );

        }

        if( this.isDown ) change = true;
        if( protoChange ) change = true;

        return change;

    }

    getNext ( e, change ) {

        const next = Roots.findTarget( this.uis, e );

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

    add () {

        const a = arguments;

        if( typeof a[1] === 'object' ){
            a[1].isUI = this.isUI;
            a[1].target = this.container;
            a[1].main = this.main;
            a[1].group = this;
        } else if( typeof a[1] === 'string' ){
            if( a[2] === undefined ) [].push.call( a, { isUI:true, target:this.container, main:this.main, group:this } );
            else {
                a[2].isUI = true;
                a[2].target = this.container;
                a[2].main = this.main;
                a[2].group = this;
            }
        }

        const u = this.ADD.apply( this, a );

        if( !u ) return null;

        if( u.isGroup ) u.dx = 8;

        Roots.forceZone = true;

        this.uis.push( u );
        this.isEmpty = false;

        if( this.isActive ) this.calcUis();
        if( this.isActive ) this.notifyParent();

        return u;

    }

    calcUis () {

        if( !this.isActive || this.isEmpty ) this.h = 0;
        else this.h = Roots.calcUis( this.uis, this.zone, this.zone.y, true );

        this.s[0].height = this.h + 'px';
        this.zone.h = this.h + this.margin;

    }

    setActive ( active, silent = false ) {

        if( this.isActive === active ){
            this.updateButtonState();
            return;
        }

        this.isActive = active;

        if( this.isActive ){
            this.s[0].display = '';
            this.s[0].pointerEvents = 'auto';
            this.calcUis();
        } else {
            this.clearTarget();
            this.s[0].display = 'none';
            this.s[0].pointerEvents = 'none';
            this.h = 0;
            this.zone.h = this.margin;
            this.s[0].height = '0px';
        }

        this.updateButtonState();

        if( !silent ){
            Roots.forceZone = true;
            this.notifyParent();
        }

    }

    notifyParent () {

        if( this.group !== null ) this.group.calc();
        else if( this.isUI && this.main ) this.main.calc();

    }

    dispose () {

        this.removeButton();

        if( this.isUI && this.main ) this.main.unregisterTab( this );

        const parent = this.c[0] ? this.c[0].parentNode : null;
        if( parent ) parent.removeChild( this.c[0] );

        this.target = null;

        super.dispose();

    }

    removeButton () {

        if( !this.tabButton ) return;

        this.tabButton.removeEventListener( 'pointerdown', this._bindDown );
        this.tabButton.removeEventListener( 'pointerenter', this._bindOver );
        this.tabButton.removeEventListener( 'pointerleave', this._bindOut );

        if( this.tabButton.parentNode ) this.tabButton.parentNode.removeChild( this.tabButton );

        this.tabButton = null;
        this._bindDown = null;
        this._bindOver = null;
        this._bindOut = null;

    }

}
