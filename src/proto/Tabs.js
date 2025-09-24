// proto/Tabs.js
import { Roots } from '../core/Roots.js';
import { Proto } from '../core/Proto.js';

export class Tabs extends Proto {
  constructor(o = {}) {
    super(o);

    // Contenedor tipo "grupo"
    this.isGroup = true;

    // add() real del sistema (inyectado por add.js)
    this.ADD = o.add;

    // Lista de tabs y activo (para header + páginas)
    this.tabNames = Array.isArray(o.tabs) && o.tabs.length ? o.tabs : ['Tab 1', 'Tab 2'];
    this.active = Math.min(Math.max(0, o.active | 0 || 0), this.tabNames.length - 1);

    // Colores de tabs (permiten override por opciones)
    this.activeBg   = o.activeBg   || this.colors.select;
    this.inactiveBg = o.inactiveBg || '#555555';

    // Altura del header
    this.baseH = this.h;

    // Estructuras por página
    this._pages = [];                 // <div> por tab dentro de c[3]
    this._uisByPage = [];             // lista de controles por tab
    this._tabEls = [];                // elementos del header
    this.uis = [];                    // alias a la lista del tab activo (para compatibilidad)
    this.current = -1;                // índice de control activo DENTRO de la lista visible
    this.proto = null;

    // Estado
    this.isEmpty = true;

    // Header y área de contenido
    const cc = this.colors;
    const flexibleRow = 'display:flex; flex-flow: row nowrap; align-items:center;';

    this.c[2] = this.dom(
      'div',
      this.css.basic +
        flexibleRow +
        `width:100%; left:0; top:0; height:${this.baseH}px; overflow:hidden;`
    );

    this.c[3] = this.dom(
      'div',
      this.css.basic +
        `width:100%; left:0; top:${this.baseH}px; overflow:hidden;`
    );

    this.c[4] = this.dom(
      'div',
      this.css.basic +
        `width:100%; left:0; height:1px; top:${this.baseH}px; background:${cc.gborder !== 'none' ? cc.gborder : cc.background};`
    );

    // Crear botones del header
    for (let i = 0; i < this.tabNames.length; i++) {
      const heightPx = this.baseH - 4;
      const t = this.dom(
        'div',
        this.css.txt +
          'position:relative; display:inline-flex; align-items:center; ' +
          'white-space:nowrap; margin-left:4px; margin-right:4px; border-radius:4px 4px 0 0;' +
          `height:${heightPx}px; line-height:${heightPx}px; ` +
          // inicial: color de inactivo; luego _renderTabsActive() ajusta el activo
          `padding:0 10px; background:${this.inactiveBg}; color:${cc.text};`
      );
      t.textContent = this.tabNames[i];
      this.c[2].appendChild(t);
      this._tabEls.push(t);
    }

    // Crear un "page" por tab (todos absolutos superpuestos; se muestra 1)
    for (let i = 0; i < this.tabNames.length; i++) {
      const page = this.dom(
        'div',
        this.css.basic + 'width:100%; left:0; top:0;'
      );
      this.c[3].appendChild(page);
      this._pages.push(page);
      this._uisByPage.push([]);
    }

    // Inserta en DOM
    this.init();
    this.setBG(o.bg);

    // Siempre abierto
    this.isOpen = true;
    this._applyLayout();

    // Mostrar activo y pintar header
    this._showOnly(this.active);
    this._renderTabsActive();
  }

  // ---------- Apariencia base (similar a Group.setBG) ----------
  setBG(bg) {
    const cc = this.colors;

    if (bg !== undefined) cc.groups = bg;
    if (cc.groups === 'none') cc.groups = cc.background;

    this.s[0].background = 'none';
    this.c[2].style.background = cc.groups;
    this.c[3].style.background = cc.groups;

    if (cc.gborder !== 'none') {
      this.c[2].style.border = `${cc.borderSize}px solid ${cc.gborder}`;
      this.c[4].style.background = cc.gborder;
    }

    if (this.radius !== 0) {
      this.c[2].style.borderRadius = `${this.radius}px`;
    }
  }

  // ---------- Utilidades internas ----------
  _applyLayout() {
    this.s[3].top = (this.baseH + this.mtop) + 'px';
    this.s[4].top = (this.baseH + this.mtop) + 'px';
    this.calcUis();
  }

  _renderTabsActive() {
    const cc = this.colors;
    for (let i = 0; i < this._tabEls.length; i++) {
      const el = this._tabEls[i];
      const isActive = i === this.active;
      el.style.background = isActive ? this.activeBg : this.inactiveBg;
      el.style.color = isActive ? cc.textOver : cc.text;
      el.style.fontWeight = isActive ? '600' : '400';
      el.style.opacity = isActive ? '1' : '0.9';
      el.style.cursor = 'pointer';
      // Ejemplo: quitar redondeo solo en activo (opcional)
      // el.style.borderRadius = isActive ? '0px' : '6px';
    }
  }

  _showOnly(index) {
    // Mostrar solo el page activo
    for (let i = 0; i < this._pages.length; i++) {
      const p = this._pages[i];
      p.style.display = i === index ? 'block' : 'none';
    }
    // Alias de la lista visible
    this.uis = this._uisByPage[index];
    // Vaciar selección de control
    this.clearTarget();
    // Recalcular alturas/zonas en base al contenido visible
    Roots.forceZone = true;
    this._updateIsEmpty();

    // 1) Asegurar tamaños/alturas de hijos visibles (primero)
    this._rsizeActiveChildren();   // incluye u.rSize()
    for (let k = 0; k < this.uis.length; k++) {
      const u = this.uis[k];
      if (u.isGroup && u.isOpen && typeof u.calcUis === 'function') u.calcUis(); // altura real del group
    }
    // 2) Ahora sí medir/calcular altura del Tabs
    this.calcUis();
    // 3) Propagar hacia arriba (actualiza GUI contenedor)
    this.parentHeight();
  }

  _rsizeActiveChildren() {
    const arr = this.uis;
    let i = arr.length;
    while (i--) {
      //arr[i].setSize(this.w);
      //arr[i].rSize();
      const u = arr[i];
     u.setSize(this.w);
     u.rSize();
     // Si es un Group abierto, asegurar altura fresca ANTES de que el Tabs calcule la suya
     if (u.isGroup && u.isOpen && typeof u.calcUis === 'function') u.calcUis();
    }
  }

  _updateIsEmpty() {
    // Vacío si la página visible no tiene hijos
    this.isEmpty = (this.uis.length === 0);
  }

  _resolveAddTabIndex(options) {
    // Permite targetear tab por índice o por nombre; por defecto, el activo
    if (options) {
      if (typeof options.tabIndex === 'number') {
        const idx = Math.min(Math.max(0, options.tabIndex | 0), this.tabNames.length - 1);
        return idx;
      }
      if (typeof options.tab === 'string') {
        const idx = this.tabNames.indexOf(options.tab);
        if (idx !== -1) return idx;
      }
      if (typeof options.tab === 'number') {
        const idx = Math.min(Math.max(0, options.tab | 0), this.tabNames.length - 1);
        return idx;
      }
    }
    return this.active;
  }

  // ---------- Zonas / selección de control ----------
  testZone(e) {
    const l = this.local;
    if (l.x === -1 && l.y === -1) return '';
    if (l.y < this.baseH) return 'header';
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

  getNext(e, change) {
    const list = this.uis; // sólo los del tab visible
    let next = -1;

    if (list && list.length) {
      let i = list.length;
      while (i--) {
        if (Roots.onZone(list[i], e.clientX, e.clientY)) { next = i; break; }
      }
    }

    if (next !== this.current) {
      this.clearTarget();
      this.current = next;
      change = true;
    }

    if (next !== -1) {
      this.proto = list[this.current];
      this.proto.uiover();
    }
  }

  // ---------- Eventos ----------
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

  setActive(index) {
    const clamped = Math.min(Math.max(0, index | 0), this._tabEls.length - 1);
    if (clamped === this.active) return;
    this.active = clamped;
    this._renderTabsActive();
    this._showOnly(this.active);
  }

  // ---------- Agregar controles (ahora por página) ----------
  add() {
    const a = arguments;

    // Detectar objeto de opciones
    const opts = (typeof a[1] === 'object') ? a[1] :
                 (typeof a[2] === 'object' ? a[2] : null);

    const pageIndex = this._resolveAddTabIndex(opts);
    const page = this._pages[pageIndex];

    // Redirigir el target al page correspondiente
    if (typeof a[1] === 'object') {
      a[1].isUI = this.isUI;
      a[1].target = page;
      a[1].main = this.main;
      a[1].group = this;
    } else if (typeof a[1] === 'string') {
      if (a[2] === undefined) [].push.call(a, { isUI: true, target: page, main: this.main, group: this });
      else {
        a[2].isUI = true;
        a[2].target = page;
        a[2].main = this.main;
        a[2].group = this;
      }
    }

    const u = this.ADD.apply(this, a);

    // Ajuste típico para sub-groups
    if (u && u.isGroup) u.dx = 8;

    Roots.forceZone = true;

    // Guardar el control en la página adecuada
    if (u) {
      this._uisByPage[pageIndex].push(u);
      // Si agregamos en la página visible, refrescar layout
      if (pageIndex === this.active) {
        this.uis = this._uisByPage[this.active];
        this.isEmpty = false;
        //this.parentHeight();        
        //u.setSize(this.w);
        //u.rSize();
        // Re-size inmediato del nuevo hijo visible        
        u.setSize(this.w);
        u.rSize();
        if (u.isGroup && u.isOpen && typeof u.calcUis === 'function') u.calcUis();
        // Actualizar alto del contenedor del tab y propagar
        this.calc(); // ← llama internamente a calcUis() y luego a main.calc()
      }
    }

    // Si ninguna página visible tenía hijos, revisar estado vacío
    this._updateIsEmpty();

    return u;
  }

  // ---------- Layout & tamaño ----------
  calcUis() {
    const visibleList = this.uis;
    if (!this.isOpen || !visibleList || visibleList.length === 0) {
      this.h = this.baseH;
    } else {
      // (A) Suma tradicional por Roots
      const sumA = Roots.calcUis(
        visibleList,
        this.zone,
        this.zone.y + this.baseH + this.margin,
        true
      );

      // (B) Medición geométrica del "bottom" efectivo de los hijos
      let sumB = 0;
      const zoneTop = (this.zone ? this.zone.y : 0) + this.baseH; // inicio del área de contenido
      for (let i = 0; i < visibleList.length; i++) {
        const u = visibleList[i];
        if (!u || !u.zone) continue;
        const topRel = u.zone.y - zoneTop;   // top relativo dentro del área de contenido
        const bottom = topRel + (u.h || 0);
        if (bottom > sumB) sumB = bottom;
      }

      // (C) Respaldo DOM por si hay absolutos raros
      const page = this._pages[this.active];
      const sumC = page ? page.scrollHeight : 0;

      const contentH = Math.max(sumA, sumB, sumC);
      this.h = this.baseH + contentH;
    }
    // Aplicar alturas al contenedor del Tabs y a su área de contenido
    this.s[0].height = this.h + 'px';
    this.s[3].height = (this.h - this.baseH) + 'px';
  }

  parentHeight(t) {
    if (this.group !== null) this.group.calc(t);
    else if (this.isUI) this.main.calc(t);
  }

  calc(y) {
    if (!this.isOpen) return;
    // 1) Primero, garantizá altura correcta de los Group abiertos de la página visible
    for (let i = 0; i < this.uis.length; i++) {
      const u = this.uis[i];
      if (u && u.isGroup && u.isOpen && typeof u.calcUis === 'function') u.calcUis();
   }
    // 2) Luego, calculá el alto del Tabs en base al contenido visible
    this.calcUis();
    // 3) Aplicá alturas
    this.s[0].height = this.h + 'px';
    this.s[3].height = (this.h - this.baseH) + 'px';
    // 4) Finalmente, propagá hacia arriba (GUI) para refrescar zonas/vecinos
    if (this.isUI && this.main) this.main.calc(y);
  }

  rSize() {
    super.rSize();
    this.c[2].style.width = this.w + 'px';
    this.c[3].style.width = this.w + 'px';
    this.c[3].style.top = (this.baseH + this.mtop) + 'px';
    this.c[4].style.top = (this.baseH + this.mtop) + 'px';

    // Sólo la página visible
    this._rsizeActiveChildren();
  }

  // ---------- Limpieza ----------
  dispose() {
    this.clear();
    if (this.isUI) this.main.calc();
    super.dispose();
  }

  clear() {
    this.empty();
  }

  empty() {
    // Eliminar todas las páginas y sus hijos
    for (let i = 0; i < this._uisByPage.length; i++) {
      let arr = this._uisByPage[i];
      let k = arr.length;
      while (k--) {
        const item = arr.pop();
        this._pages[i].removeChild(item.c[0]);
        item.clear(true);
      }
    }
    this.isEmpty = true;
    this.h = this.baseH;
  }

  clearOne(n) {
    // Buscar y remover un control específico en cualquier página
    for (let i = 0; i < this._uisByPage.length; i++) {
      const arr = this._uisByPage[i];
      const id = arr.indexOf(n);
      if (id !== -1) {
        this.calc(-(arr[id].h + this.margin));
        this._pages[i].removeChild(arr[id].c[0]);
        arr.splice(id, 1);
        break;
      }
    }
    // Re-evaluar estado vacío y layout visible
    this._updateIsEmpty();
    this.parentHeight();
  }
}
