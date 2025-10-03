// proto/Tabs.js
import { Roots } from "../core/Roots.js";
import { Proto } from "../core/Proto.js";

export class Tabs extends Proto {
  constructor(o = {}) {
    super(o);

    // Contenedor tipo "grupo"
    this.isGroup = true;

    // add() real del sistema (inyectado por add.js)
    this.ADD = o.add;

    // Lista de tabs y activo (para header + páginas)
    this._tabData = this._normalizeTabConfig(o.tabs);
    this.tabNames = this._tabData.map((tab) => tab.label);
    this.active = Math.min(
      Math.max(0, o.active | 0 || 0),
      this.tabNames.length - 1
    );

    // Colores de tabs (override opcional)
    this.activeBg = o.activeBg || "#888888";
    this.inactiveBg = o.inactiveBg || "#555555";

    // NEW: mapa de colores por tab
    const __tabBgMap = this._buildTabBgMap(o);
    this._tabBaseBg = __tabBgMap.base;    // color base (inactivo + contenido)
    this._tabActiveBg = __tabBgMap.active; // color activo aclarado para header


    // Altura del header
    this.baseH = this.h;

    // Estructuras por página
    this._pages = []; // <div> por tab dentro de c[3]
    this._uisByPage = []; // lista de controles por tab
    this._tabEls = []; // elementos del header
    this.uis = []; // alias a la lista del tab activo (para compatibilidad)
    this.current = -1; // índice de control activo DENTRO de la lista visible
    this.proto = null;

    // Estado
    this.isEmpty = true;

    // Header y área de contenido
    const cc = this.colors;
    const flexibleRow =
      "display:flex; flex-flow: row nowrap; align-items:center;";

    this.c[2] = this.dom(
      "div",
      this.css.basic +
        flexibleRow +
        `width:100%; left:0; top:0; height:${this.baseH}px; overflow:hidden;`
    );

    this.c[3] = this.dom(
      "div",
      this.css.basic +
        `width:100%; left:0; top:${this.baseH}px; overflow:hidden;`
    );

    this.c[4] = this.dom(
      "div",
      this.css.basic +
        `width:100%; left:0; height:1px; top:${this.baseH}px; background:${
          cc.gborder !== "none" ? cc.gborder : cc.background
        };`
    );

    // Crear botones del header
    for (let i = 0; i < this.tabNames.length; i++) {
      const heightPx = this.baseH - 4;
      const t = this.dom(
        "div",
        this.css.txt +
          "position:relative; display:inline-flex; align-items:center; " +
          "white-space:nowrap; margin-left:4px; margin-right:4px; border-radius:2px 2px 0 0;" +
          `height:${heightPx}px; line-height:${heightPx}px; ` +
          // inicial: inactivo; luego _renderTabsActive() ajusta el activo
          `padding:0 10px; background:${(this._tabBaseBg[i]||this.inactiveBg)}; color:${cc.text};`
      );
      const tabInfo = this._tabData[i] || {};
      const labelText = tabInfo.label || this.tabNames[i];
      const iconHTML = tabInfo.icon;

      if (iconHTML) {
        const iconWrapper = document.createElement("span");
        iconWrapper.className = "uil-tab-icon";
        iconWrapper.innerHTML = iconHTML;
        iconWrapper.style.display = "inline-flex";
        iconWrapper.style.alignItems = "center";
        iconWrapper.style.marginRight = "6px";
        iconWrapper.style.lineHeight = "1";
        iconWrapper.style.pointerEvents = "none";
        t.appendChild(iconWrapper);

        const labelSpan = document.createElement("span");
        labelSpan.className = "uil-tab-label";
        labelSpan.textContent = labelText;
        labelSpan.style.display = "inline-block";
        labelSpan.style.pointerEvents = "none";
        t.appendChild(labelSpan);
      } else {
        t.textContent = labelText;
      }
      this.c[2].appendChild(t);
      this._tabEls.push(t);
    }

    // Crear un "page" por tab (todos absolutos superpuestos; se muestra 1)
    for (let i = 0; i < this.tabNames.length; i++) {
      const page = this.dom(
        "div",
        this.css.basic + "width:100%; left:0; top:0;"
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

  setHeaderHeight(h) {
    this.baseH = Math.max(16, h | 0);
    // header
    this.c[2].style.height = this.baseH + "px";
    // recolocar contenido y línea inferior
    this.s[3].top = this.baseH + this.mtop + "px";
    this.s[4].top = this.baseH + this.mtop + "px";
    // ajustar cada “chip” de tab (alto y centrado vertical)
    const heightPx = this.baseH - 4; // si querés más aire, cambia este -4
    for (let i = 0; i < this._tabEls.length; i++) {
      const el = this._tabEls[i];
      el.style.height = heightPx + "px";
      el.style.lineHeight = heightPx + "px";
    }
    // recalcular layout
    this.calc();
  }

  // ---------- Apariencia base ----------
  setBG(bg) {
    const cc = this.colors;

    if (bg !== undefined) cc.groups = bg;
    if (cc.groups === "none") cc.groups = cc.background;

    this.s[0].background = "none";
    this.c[2].style.background = cc.groups;
    // NEW: si no hay colores por tab, usar color de grupo; si hay, fondo gestionado por páginas
    if (!this._tabBaseBg || this._tabBaseBg.every(v => !v)) {
      this.c[3].style.background = cc.groups;
    } else {
      this.c[3].style.background = 'transparent';
    }

    if (cc.gborder !== "none") {
      this.c[2].style.border = `${cc.borderSize}px solid ${cc.gborder}`;
      this.c[4].style.background = cc.gborder;
    }

    if (this.radius !== 0) {
      this.c[2].style.borderRadius = `${this.radius}px`; // si querés solo arriba: `${this.radius}px ${this.radius}px 0 0`
    }
  }

  // ---------- Utilidades internas ----------
  _applyLayout() {
    this.s[3].top = this.baseH + this.mtop + "px";
    this.s[4].top = this.baseH + this.mtop + "px";
    this.calcUis();
  }

  _renderTabsActive() {
    const cc = this.colors;
    for (let i = 0; i < this._tabEls.length; i++) {
      const el = this._tabEls[i];
      const isActive = i === this.active;
      const baseCol = (this._tabBaseBg && this._tabBaseBg[i]) ? this._tabBaseBg[i] : this.inactiveBg;
      const actCol  = (this._tabActiveBg && this._tabActiveBg[i]) ? this._tabActiveBg[i] : this.activeBg;
      el.style.background = isActive ? actCol : baseCol;
      el.style.color = isActive ? cc.textOver : cc.text;
      el.style.fontWeight = isActive ? "600" : "400";
      el.style.opacity = isActive ? "1" : "0.9";
      el.style.cursor = "pointer";
    }
  }

  _showOnly(index) {
    // Mostrar solo el page activo
    for (let i = 0; i < this._pages.length; i++) {
      const p = this._pages[i];
      p.style.display = i === index ? "block" : "none";
    }
    // Alias de la lista visible
    this.uis = this._uisByPage[index];
    // Vaciar selección de control
    this.clearTarget();
    // Recalcular alturas/zonas en base al contenido visible
    Roots.forceZone = true;
    this._updateIsEmpty();

    // 1) Asegurar tamaños/alturas de hijos visibles (primero)
    this._rsizeActiveChildren(); // incluye u.rSize()
    for (let k = 0; k < this.uis.length; k++) {
      const u = this.uis[k];
      if (u.isGroup && u.isOpen && typeof u.calcUis === "function") u.calcUis(); // altura real del group
    }
    // 2) Ahora sí medir/calcular altura del Tabs
    this.calcUis();
    // 3) Propagar hacia arriba (actualiza GUI contenedor)
    this.parentHeight();
    // NEW: aplicar fondo del contenido según tab
    this._applyContentBackground(index);
  }

  _rsizeActiveChildren() {
    const arr = this.uis;
    let i = arr.length;
    while (i--) {
      const u = arr[i];
      u.setSize(this.w);
      u.rSize();
      // Si es un Group abierto, asegurar altura fresca ANTES de que el Tabs calcule la suya
      if (u.isGroup && u.isOpen && typeof u.calcUis === "function") u.calcUis();
    }
  }

  _updateIsEmpty() {
    // Vacío si la página visible no tiene hijos
    this.isEmpty = this.uis.length === 0;
  }

  _resolveAddTabIndex(options) {
    // Permite targetear tab por índice o por nombre; por defecto, el activo
    if (options) {
      if (typeof options.tabIndex === "number") {
        const idx = Math.min(
          Math.max(0, options.tabIndex | 0),
          this.tabNames.length - 1
        );
        return idx;
      }
      if (typeof options.tab === "string") {
        const idx = this.tabNames.indexOf(options.tab);
        if (idx !== -1) return idx;
      }
      if (typeof options.tab === "number") {
        const idx = Math.min(
          Math.max(0, options.tab | 0),
          this.tabNames.length - 1
        );
        return idx;
      }
    }
    return this.active;
  }

  // ---------- Zonas / selección de control ----------
  testZone(e) {
    const l = this.local;
    if (l.x === -1 && l.y === -1) return "";
    if (l.y < this.baseH) return "header";
    if (this.isOpen) return "content";
    return "";
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
        if (Roots.onZone(list[i], e.clientX, e.clientY)) {
          next = i;
          break;
        }
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
      case "content": {
        if (Roots.isMobile && type === "mousedown") this.getNext(e, change);
        if (this.proto) protoChange = this.proto.handleEvent(e);
        if (!Roots.lock) this.getNext(e, change);
        break;
      }
      case "header": {
        this.cursor("pointer");
        if (type === "mousedown") {
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

  // ---------- Agregar controles (modo clásico: tab/tabIndex) ----------
  add() {
    const a = arguments;

    // Detectar objeto de opciones
    const opts =
      typeof a[1] === "object" ? a[1] : typeof a[2] === "object" ? a[2] : null;

    const pageIndex = this._resolveAddTabIndex(opts);
    const page = this._pages[pageIndex];

    // Redirigir el target al page correspondiente
    if (typeof a[1] === "object") {
      a[1].isUI = this.isUI;
      a[1].target = page;
      a[1].main = this.main;
      a[1].group = this;
    } else if (typeof a[1] === "string") {
      if (a[2] === undefined)
        [].push.call(a, {
          isUI: true,
          target: page,
          main: this.main,
          group: this,
        });
      else {
        a[2].isUI = true;
        a[2].target = page;
        a[2].main = this.main;
        a[2].group = this;
      }
    }

    const u = this.ADD.apply(this, a);

    // Ajuste típico para sub-groups (si tu build lo necesita)
    // if (u && u.isGroup) u.dx = 8;

    Roots.forceZone = true;

    // Guardar el control en la página adecuada
    if (u) {
      this._uisByPage[pageIndex].push(u);
      // Si agregamos en la página visible, refrescar layout
      if (pageIndex === this.active) {
        this.uis = this._uisByPage[this.active];
        this.isEmpty = false;
        // Re-size inmediato del nuevo hijo visible
        u.setSize(this.w);
        u.rSize();
        if (u.isGroup && u.isOpen && typeof u.calcUis === "function")
          u.calcUis();
        // Actualizar alto del contenedor del tab y propagar
        this.calc();
      }
    }

    // Si ninguna página visible tenía hijos, revisar estado vacío
    this._updateIsEmpty();

    return u;
  }

  // ---------- Handlers de tab ----------
  _makeTabHandle(index) {
    const tabs = this;
    const name = this.tabNames[index];
    const page = this._pages[index];

    // Handler liviano con add() fijado al page y utilidades
    return {
      index,
      name,
      setActive() {
        tabs.setActive(index);
      },
      add() {
        const a = arguments;

        // Redirigir el target al page de este handler
        if (typeof a[1] === "object") {
          a[1].isUI = tabs.isUI;
          a[1].target = page;
          a[1].main = tabs.main;
          a[1].group = tabs;
        } else if (typeof a[1] === "string") {
          if (a[2] === undefined)
            [].push.call(a, {
              isUI: true,
              target: page,
              main: tabs.main,
              group: tabs,
            });
          else {
            a[2].isUI = true;
            a[2].target = page;
            a[2].main = tabs.main;
            a[2].group = tabs;
          }
        }

        const u = tabs.ADD.apply(tabs, a);

        Roots.forceZone = true;

        if (u) {
          tabs._uisByPage[index].push(u);
          // Si este handler apunta al tab activo, refrescar layout ya
          if (index === tabs.active) {
            tabs.uis = tabs._uisByPage[tabs.active];
            tabs.isEmpty = false;
            u.setSize(tabs.w);
            u.rSize();
            if (u.isGroup && u.isOpen && typeof u.calcUis === "function")
              u.calcUis();
            tabs.calc();
          } else {
            // En tab inactivo, al menos mantener estado vacío consistente
            tabs._updateIsEmpty();
          }
        }
        return u;
      },
      // NUEVO: quitar controles de este tab
      remove(target) {
        const arr = tabs._uisByPage[index];
        if (!arr || !arr.length) return false;

        let id = -1;
        let u = null;

        if (typeof target === "number") {
          // por índice
          id = Math.max(0, Math.min(arr.length - 1, target | 0));
          u = arr[id];
        } else if (target && typeof target === "object") {
          // por referencia
          id = arr.indexOf(target);
          if (id !== -1) u = target;
        } else if (typeof target === "string") {
          // por nombre (best effort)
          for (let i = 0; i < arr.length; i++) {
            const it = arr[i];
            const itName =
              (it && (it.name || (it.o && it.o.name))) ||
              (it && it.c && it.c[1] && it.c[1].textContent);
            if (itName === target) {
              id = i;
              u = it;
              break;
            }
          }
        }

        if (id === -1 || !u) return false;

        // quitar del DOM y limpiar
        try {
          tabs._pages[index].removeChild(u.c[0]);
        } catch (_e) {}
        arr.splice(id, 1);
        if (typeof u.clear === "function") u.clear(true);
        else if (typeof u.dispose === "function") u.dispose();

        // actualizar layout
        if (index === tabs.active) {
          tabs.uis = tabs._uisByPage[tabs.active];
          tabs._updateIsEmpty();
          tabs.calc(); // recalcula alto del Tabs y propaga
        } else {
          tabs._updateIsEmpty();
        }
        return true;
      },
    };
  }

  getTab(index) {
    const i = Math.min(Math.max(0, index | 0), this.tabNames.length - 1);
    return this._makeTabHandle(i);
  }

  getTabByName(name) {
    const i = this.tabNames.indexOf(name);
    if (i === -1) return null;
    return this._makeTabHandle(i);
  }

  
  // ---------- Colores por tab (NEW) ----------
  // Mezcla con blanco para aclarar el color activo
  _blendWithWhite(hex, alpha = 0.22) {
    const c = this._hexToRgb(hex);
    if (!c) return hex;
    const r = Math.round((1 - alpha) * c.r + alpha * 255);
    const g = Math.round((1 - alpha) * c.g + alpha * 255);
    const b = Math.round((1 - alpha) * c.b + alpha * 255);
    return `rgb(${r}, ${g}, ${b})`;
  }

  _hexToRgb(hex) {
    if (!hex) return null;
    let h = ('' + hex).trim();
    if (h.startsWith('rgb')) {
      const m = h.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
      return m ? { r: +m[1], g: +m[2], b: +m[3] } : null;
    }
    if (h[0] === '#') h = h.slice(1);
    if (h.length === 3) h = h.split('').map(x => x + x).join('');
    const n = parseInt(h, 16);
    if (Number.isNaN(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  _buildTabBgMap(o) {
    const names = this.tabNames || [];
    const base = new Array(names.length).fill(null);
    const active = new Array(names.length).fill(null);
    const data = this._tabData || [];
    const src = o.tabBg ?? o.tabColors ?? null;
    const getLegacyColor = (i, name) => {
      if (!src) return null;
      if (typeof src === 'string') return src;
      if (Array.isArray(src)) return src[i] ?? null;
      if (typeof src === 'object') return src[name] ?? null;
      return null;
    };

    for (let i = 0; i < names.length; i++) {
      const tabInfo = data[i] || {};
      const c = tabInfo.background ?? getLegacyColor(i, names[i]);
      base[i] = c || null;
      active[i] = c ? this._blendWithWhite(c, 0.22) : null;
    }
    return { base, active };
  }

  _normalizeTabConfig(tabsInput) {
    if (!Array.isArray(tabsInput) || tabsInput.length === 0) {
      return [
        { label: "Tab 1", icon: null, background: null },
        { label: "Tab 2", icon: null, background: null },
      ];
    }

    return tabsInput.map((entry, idx) => {
      if (typeof entry === 'string') {
        return { label: entry, icon: null, background: null };
      }
      if (entry && typeof entry === 'object') {
        const normalized = { ...entry };
        const label = entry.label ?? entry.name ?? `Tab ${idx + 1}`;
        const icon = entry.icon ?? null;
        const background = entry.background ?? entry.bg ?? null;
        normalized.label = label;
        normalized.icon = icon;
        normalized.background = background;
        return normalized;
      }
      return { label: `Tab ${idx + 1}`, icon: null, background: null };
    });
  }

  setTabColor(indexOrName, color) {
    let i = -1;
    if (typeof indexOrName === 'number') {
      i = Math.min(Math.max(0, indexOrName | 0), (this.tabNames?.length || 1) - 1);
    } else if (typeof indexOrName === 'string') {
      i = (this.tabNames || []).indexOf(indexOrName);
    }
    if (i === -1) return false;
    this._tabBaseBg[i] = color;
    this._tabActiveBg[i] = color ? this._blendWithWhite(color, 0.22) : null;
    if (this._tabData && this._tabData[i]) this._tabData[i].background = color;
    this._renderTabsActive();
    if (i === this.active) this._applyContentBackground(i);
    return true;
  }

  _applyContentBackground(activeIndex) {
    const cc = this.colors;
    for (let i = 0; i < this._pages.length; i++) {
      const page = this._pages[i];
      const bg = (this._tabBaseBg && this._tabBaseBg[i]) ? this._tabBaseBg[i] : cc.groups;
      page.style.background = (i === activeIndex) ? bg : 'transparent';
      page.style.opacity = (i === activeIndex) ? '1' : '0.9999'; // evita parpadeos
    }
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
        const topRel = u.zone.y - zoneTop; // top relativo dentro del área de contenido
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
    this.s[0].height = this.h + "px";
    this.s[3].height = this.h - this.baseH + "px";
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
      if (u && u.isGroup && u.isOpen && typeof u.calcUis === "function")
        u.calcUis();
    }
    // 2) Luego, calculá el alto del Tabs en base al contenido visible
    this.calcUis();
    // 3) Aplicá alturas
    this.s[0].height = this.h + "px";
    this.s[3].height = this.h - this.baseH + "px";
    // 4) Finalmente, propagá hacia arriba (GUI) para refrescar zonas/vecinos
    if (this.isUI && this.main) this.main.calc(y);
  }

  rSize() {
    super.rSize();
    this.c[2].style.width = this.w + "px";
    this.c[3].style.width = this.w + "px";
    this.c[3].style.top = this.baseH + this.mtop + "px";
    this.c[4].style.top = this.baseH + this.mtop + "px";

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
