import { Proto } from '../core/Proto.js';
import { Roots } from '../core/Roots.js';
import { Empty } from './Empty.js';

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

        this.baseMargin = this.margin;
        this.baseH = 0;

        this.spaceY = new Empty({ h: this.margin });

        this.useFlex = true;

        this.c[1] = this.dom( 'div', this.css.basic + 'position:relative; width:100%; left:0; top:0; height:auto; background:none;' );

        this.init();

        this.c[2] = this.dom( 'div', this.css.basic + ( this.useFlex ? 'display:flex; flex-flow: row wrap;' : '' ) + 'position:relative; width:100%; left:0; top:0; height:auto; background:none;', null, this.c[1] );
        this.s[2] = this.c[2].style;

        this.s[0].overflow = 'hidden';
        this.s[1] = this.c[1].style;
        this.s[1].pointerEvents = 'none';
        this.s[2].pointerEvents = 'auto';
        this.s[2].display = 'none';

        this.close( true );

        this.setBG( o.bg );

        this.tabButton = null;

    }

    setBG ( bg ) {

        const cc = this.colors;

        if ( bg !== undefined ) cc.groups = bg;
        if ( cc.groups === 'none' ) cc.groups = cc.background;

        cc.background = 'none';

        this.s[1].background = cc.groups;
        this.s[2].background = 'none';

        if ( cc.gborder !== 'none' ) {
            this.s[1].border = cc.borderSize + 'px solid ' + cc.gborder;
        }

        if ( this.radius !== 0 ) {
            this.s[1].borderRadius = this.radius + 'px';
        }

    }

    testZone ( e ) {

        if ( !this.isOpen ) return '';

        const l = this.local;
        if ( l.x === -1 && l.y === -1 ) return '';

        return 'content';

    }

    clearTarget () {

        if ( this.current === -1 ) return false;
        if ( this.proto && this.proto.s ) {
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

        if ( !this.isOpen ) return;

        let change = false;
        let protoChange = false;

        const name = this.testZone( e );
        if ( !name ) return;

        switch ( name ) {
            case 'content':
                if ( Roots.isMobile && e.type === 'mousedown' ) this.getNext( e, change );
                if ( this.proto ) protoChange = this.proto.handleEvent( e );
                if ( !Roots.lock ) this.getNext( e, change );
                break;
        }

        if ( protoChange ) change = true;
        return change;

    }

    getNext ( e, change ) {

        const next = Roots.findTarget( this.uis, e );

        if ( next !== this.current ) {
            this.clearTarget();
            this.current = next;
            change = true;
        }

        if ( next !== -1 ) {
            this.proto = this.uis[ this.current ];
            this.proto.uiover();
        }

    }

    add () {

        let a = arguments;

        if ( typeof a[1] === 'object' ) {
            a[1].isUI = this.isUI;
            a[1].target = this.c[2];
            a[1].main = this.main;
            a[1].group = this;
        } else if ( typeof a[1] === 'string' ) {
            if ( a[2] === undefined ) [].push.call( a, { isUI: true, target: this.c[2], main: this.main, group: this } );
            else {
                a[2].isUI = true;
                a[2].target = this.c[2];
                a[2].main = this.main;
                a[2].group = this;
            }
        }

        const u = this.ADD.apply( this, a );

        if ( u && u.isGroup ) u.dx = 8;

        Roots.forceZone = true;

        if ( u ) {
            this.uis.push( u );
            this.isEmpty = false;
            if ( this.isOpen ) this.calc();
        }

        return u;

    }

    remove ( n ) {

        if ( n.dispose ) n.dispose();

    }

    dispose () {

        this.clear();
        if ( this.main && this.main.unregisterTab ) this.main.unregisterTab( this );
        super.dispose();

    }

    clear () {

        this.empty();

    }

    empty () {

        this.close();

        let i = this.uis.length;
        while ( i-- ) {
            const item = this.uis.pop();
            if ( item && item.c && item.c[0] && this.c[2].contains( item.c[0] ) ) {
                this.c[2].removeChild( item.c[0] );
            }
            if ( item ) item.clear( true );
        }

        this.isEmpty = true;
        this.h = 0;

    }

    clearOne ( n ) {

        const id = this.uis.indexOf( n );

        if ( id !== -1 ) {
            if ( this.c[2] && this.uis[ id ] && this.uis[ id ].c && this.uis[ id ].c[0] && this.c[2].contains( this.uis[ id ].c[0] ) ) {
                this.c[2].removeChild( this.uis[ id ].c[0] );
            }
            this.uis.splice( id, 1 );
            if ( this.uis.length === 0 ) {
                this.isEmpty = true;
                this.close();
            } else if ( this.isOpen ) {
                this.calc();
            }
        }

    }

    open () {

        if ( this.isOpen ) return;

        super.open();

        this.margin = this.baseMargin;
        this.s[0].display = '';
        this.s[2].display = '';
        if ( this.spaceY ) {
            this.spaceY.h = this.baseMargin;
            if ( this.spaceY.s ) this.spaceY.s[0].height = this.baseMargin + 'px';
        }

        this.calc();

    }

    close ( silent = false ) {

        if ( !silent && !this.isOpen ) return;

        if ( !silent ) super.close();

        this.isOpen = false;
        this.margin = 0;
        this.h = 0;
        this.s[0].height = '0px';
        this.s[0].display = 'none';
        this.s[1].height = '0px';
        this.s[2].display = 'none';
        this.zone.h = 0;
        if ( this.spaceY ) {
            this.spaceY.h = 0;
            if ( this.spaceY.s ) this.spaceY.s[0].height = '0px';
        }

    }

    calc () {

        if ( !this.isOpen ) return;

        this.calcUis();

        this.s[0].height = this.h + 'px';
        this.s[1].height = this.h + 'px';

        if ( this.isUI ) this.main.calc();

    }

    calcUis () {

        if ( !this.isOpen || this.isEmpty ) this.h = 0;
        else this.h = Roots.calcUis( [ ...this.uis, this.spaceY ], this.zone, this.zone.y + this.margin, true );

        this.zone.h = this.h;

    }

    rSizeContent () {

        let i = this.uis.length;
        while ( i-- ) {
            this.uis[ i ].setSize( this.w );
            this.uis[ i ].rSize();
        }

    }

    rSize () {

        super.rSize();

        if ( this.isOpen ) this.rSizeContent();

    }

    rename ( s ) {

        this.txt = s;
        this.name = s;

        if ( this.tabButton ) this.tabButton.textContent = s;

    }

}
