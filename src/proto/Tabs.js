// proto/Tabs.js
import { Roots } from '../core/Roots.js';
import { Proto } from '../core/Proto.js';

export class Tabs extends Proto {
  constructor(o = {}) {
    super(o);

    // Es un contenedor tipo "grupo" (para que Roots.calcUis lo trate como tal)
    this.isGroup = true;

    // add() real del sistema (inyectado por add.js)
    this.ADD = o.add;

    
    // Lista de nombres de tabs
    this.tabNames = Array.isArray(o.tabs) && o.tabs.length ? o.tabs : ['Tab 1', 'Tab 2'];
    // Índice activo (solo visual en etapa 1)
    this.active = Math.min(Math.max(0, o.active | 0 || 0), this.tabNames.length - 1);

    // Altura base del header de tabs (usa la h del Proto)
    this.baseH = this.h;

    // Estado interno
    this.uis = [];
    this.current = -1;
    this.proto = null;
    this.isEmpty = true;

    // Elementos DOM
    const cc = this.colors;
    this.useFlex = true;
    const flexibleRow = this.useFlex ? 'display:flex; flex-flow: row nowrap; align-items:center;' : '';

    // Barra de tabs (header)
    this.c[2] = this.dom(
      'div',
      this.css.basic +
        flexibleRow +
        `width:100%; left:0; top:0; height:${this.baseH}px; overflow:hidden;`
    );

    // Contenedor de contenido (área donde irán los hijos agregados con add())
    // Se posiciona debajo del header
    this.c[3] = this.dom(
      'div',
      this.css.basic +
        `width:100%; left:0; top:${this.baseH}px; overflow:hidden;`
    );

    // Línea/borde inferior del header (opcional)
    this.c[4] = this.dom(
      'div',
      this.css.basic +
        `width:100%; left:0; height:1px; top:${this.baseH}px; background:${cc.gborder !== 'none' ? cc.gborder : cc.background};`
    );

    // Crear los "botoncitos" de tabs (estáticos en etapa 1)
    this._tabEls = [];
    for (let i = 0; i < this.tabNames.length; i++) {
        const heightPx = this.baseH - 6; // altura visual del chip
      const t = this.dom(
        'div',
        this.css.txt +
          'position:relative; ' +
          'display:inline-flex; align-items:center; ' + // centra vertical con flex
          'white-space:nowrap; ' +
          'margin-left:8px; margin-right:8px; ' +
          `height:${heightPx}px; line-height:${heightPx}px; ` + // line-height = height
          `padding:0 10px; background:${cc.background}; color:${cc.text};`
      );
      t.textContent = this.tabNames[i];
      this.c[2].appendChild(t);
      this._tabEls.push(t);
    }

    // Inserta en el DOM y calcula tamaños
    this.init();

    // Colores/fondos de header y content, coherente con Group
    this.setBG(o.bg);

    // Este componente siempre está "abierto"
    this.isOpen = true;
    this._applyLayout();
    this._renderTabsActive();
  }

  // Estilo de fondo similar a Group.setBG
  setBG(bg) {
    const cc = this.colors;
    const s = this.s;

    if (bg !== undefined) cc.groups = bg;
    if (cc.groups === 'none') cc.groups = cc.background;

    // El contenedor base (c[0]) lo dejamos sin fondo; usamos las secciones internas
    s[0].background = 'none';
    // c[1] (título del Proto) existe pero no lo usamos como header textual
    // Usamos c[2] como header visual de tabs:
    this.c[2].style.background = cc.groups;
    // Área de contenido (c[3]) sin fondo para heredar
    this.c[3].style.background = cc.groups;

    // Borde del header si está configurado
    if (cc.gborder !== 'none') {
      this.c[2].style.border = `${cc.borderSize}px solid ${cc.gborder}`;
      // Para que el borde no duplique con la línea inferior
      this.c[4].style.background = cc.gborder;
    }

    // Redondeo similar a Group
    if (this.radius !== 0) {
      this.c[2].style.borderRadius = `${this.radius}px`;
    }
  }

  // ---------- Zonas ----------
  testZone(e) {
    const l = this.local;
    if (l.x === -1 && l.y === -1) return '';
    if (l.y < this.baseH) return 'header';
    // Solo hay contenido si hay hijos
    if (this.isOpen) return 'content';
    return '';
  }

  clearTarget() {
    if (this.current === -1) return false;
    if (this.proto && this.proto.s) {
      this.proto.uiout();
      this.proto.reset();
    }
    this.proto = null;
    this.current = -1;
    this.cursor();
    return true;
  }

  reset() {
    this.clearTarget();
  }

  // ---------- Eventos (etapa 1: el header no cambia estado) ----------
  handleEvent(e) {
    const type = e.type;
    let change = false;
    let protoChange = false;

    const name = this.testZone(e);
    if (!name) return;

    switch (name) {
      case 'content': {
        if (Roots.isMobile && type === 'mousedown') this.getNext(e, change);
        if (this.proto) protoChange = this.proto.handleEvent(e);
        if (!Roots.lock) this.getNext(e, change);
        break;
      }
      case 'header': {
        this.cursor('pointer');
        if (type === 'mousedown') {
          const idx = this._hitTestTab(e);
          if (idx !== -1) this.setActive(idx);
        }
        break;
      }
    }

    if (this.isDown) change = true;
    if (protoChange) change = true;

    return change;
  }

  getNext(e, change) {
    const next = Roots.findTarget(this.uis, e);

    if (next !== this.current) {
      this.clearTarget();
      this.current = next;
      change = true;
    }

    if (next !== -1) {
      this.proto = this.uis[this.current];
      this.proto.uiover();
    }
  }


  // -------- Highlight del activo --------
  _renderTabsActive() {
    const cc = this.colors;
    for (let i = 0; i < this._tabEls.length; i++) {
      const el = this._tabEls[i];
      const isActive = i === this.active;
      el.style.background = isActive ? cc.select : cc.background;
      el.style.color = isActive ? cc.textOver : cc.text;      
      el.style.fontWeight = isActive ? '600' : '400';
      el.style.opacity = isActive ? '1' : '0.9';
      el.style.cursor = 'pointer';
    }
  }

  setActive(index) {
    const clamped = Math.min(Math.max(0, index | 0), this._tabEls.length - 1);
    if (clamped === this.active) return;
    this.active = clamped;
    this._renderTabsActive();
  }

  _hitTestTab(e) {
    const ex = e.clientX;
    const ey = e.clientY;
    for (let i = 0; i < this._tabEls.length; i++) {
      const r = this._tabEls[i].getBoundingClientRect();
      if (ex >= r.left && ex <= r.right && ey >= r.top && ey <= r.bottom) {
        return i;
      }
    }
    return -1;
  }


  // ---------- API de agregado de controles dentro del área de contenido ----------
  add() {
    const a = arguments;

    // Redirige hijos al contenedor de contenido (c[3]), como hace Group
    if (typeof a[1] === 'object') {
      a[1].isUI = this.isUI;
      a[1].target = this.c[3];
      a[1].main = this.main;
      a[1].group = this; // para layout anidado
    } else if (typeof a[1] === 'string') {
      if (a[2] === undefined) [].push.call(a, { isUI: true, target: this.c[3], main: this.main, group: this });
      else {
        a[2].isUI = true;
        a[2].target = this.c[3];
        a[2].main = this.main;
        a[2].group = this;
      }
    }

    const u = this.ADD.apply(this, a);
    // Si el hijo también es grupo, compensamos desplazamiento interno
    if (u.isGroup) {
      u.dx = 8;
    }

    // Forzar recálculo de zonas tras agregar
    Roots.forceZone = true;

    this.uis.push(u);
    this.isEmpty = false;

    // Recalcular alturas
    this.parentHeight();

    return u;
  }

  // ---------- Layout & tamaño ----------
  _applyLayout() {
    // Posiciona content y línea inferior en base al header
    this.s[3].top = (this.baseH + this.mtop) + 'px';
    this.s[4].top = (this.baseH + this.mtop) + 'px';
    this.calcUis();
  }

  calcUis() {
    if (!this.isOpen || this.isEmpty) {
      this.h = this.baseH;
    } else {
      // Igual a Group: suma el alto de sus hijos + header
      this.h = Roots.calcUis(this.uis, this.zone, this.zone.y + this.baseH + this.margin, true) + this.baseH;
    }

    // Alturas de contenedor principal y de contenido
    this.s[0].height = this.h + 'px';
    this.s[3].height = (this.h - this.baseH) + 'px';
  }

  parentHeight(t) {
    if (this.group !== null) this.group.calc(t);
    else if (this.isUI) this.main.calc(t);
  }

  calc(y) {
    if (!this.isOpen) return;
    if (this.isUI) this.main.calc();
    else this.calcUis();
    this.s[0].height = this.h + 'px';
    this.s[3].height = (this.h - this.baseH) + 'px';
  }

  rSize() {
    super.rSize();
    // Anchos del header y contenido
    this.c[2].style.width = this.w + 'px';
    this.c[3].style.width = this.w + 'px';

    // Reposicionar content por si cambió top por márgenes
    this.c[3].style.top = (this.baseH + this.mtop) + 'px';
    this.c[4].style.top = (this.baseH + this.mtop) + 'px';

    // Recalcular hijos si está "abierto"
    if (this.isOpen) {
      let i = this.uis.length;
      while (i--) {
        this.uis[i].setSize(this.w);
        this.uis[i].rSize();
      }
    }
  }

  dispose() {
    this.clear();
    if (this.isUI) this.main.calc();
    super.dispose();
  }

  clear() {
    this.empty();
  }

  empty() {
    let i = this.uis.length, item;
    while (i--) {
      item = this.uis.pop();
      this.c[3].removeChild(item.c[0]);
      item.clear(true);
    }
    this.isEmpty = true;
    this.h = this.baseH;
  }

  clearOne(n) {
    const id = this.uis.indexOf(n);
    if (id !== -1) {
      this.calc(-(this.uis[id].h + this.margin));
      this.c[3].removeChild(this.uis[id].c[0]);
      this.uis.splice(id, 1);
      if (this.uis.length === 0) {
        this.isEmpty = true;
      }
    }
  }
}
