import { Group } from './Group.js';

export class Tab extends Group {

    constructor( o = {} ) {
        o.open = true; // tab content always open
        super( o );

        this.isTab = true;

        // store margin to restore when active
        this.baseMargin = this.margin;

        // hide group header and arrow
        this.baseH = 0;
        this.h = 0;
        this.isOpen = true;

        const s = this.s;

        if( this.c[1] ) s[1].display = 'none';
        if( this.c[3] ) s[3].display = 'none';
        if( this.c[4] ) s[4].display = 'none';

        s[2].top = '0px';
        s[0].height = '0px';
        s[1].height = '0px';
        s[1].border = 'none';
        s[2].border = 'none';

        // register to gui tab system
        if( this.main ) this.main.addTab( this );
    }

    testZone ( e ) {
        let l = this.local;
        if( l.x === -1 && l.y === -1 ) return '';
        if( !this.isOpen ) return '';
        return 'content';
    }

    show(){
        this.c[0].style.display = 'block';
        this.margin = this.baseMargin;
        this.calcUis();
    }

    hide(){
        this.c[0].style.display = 'none';
        this.margin = 0;
        this.h = 0;
        this.zone.h = 0;
    }

}
