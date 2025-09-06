// proto/Tabs.js
import { Proto } from '../core/Proto.js';
import { Tools } from '../core/Tools.js';
import { Roots } from '../core/Roots.js';

/**
 * Simple TabBar: una fila de botones que conmuta la visibilidad/altura
 * de grupos asociados. Diseñado para insertarse con { ontop:true }.
 */
export class Tabs extends Proto {
  constructor(o = {}) {
    o.selectable = false;
    o.name = o.name || '';
    // fuerza una sola línea de alto (igual al control base)
    super(o);

    // altura fija = alto de línea del GUI
    this.lineH = this.isUI ? this.main.size.h : this.h;
    this.h = this.lineH;

    // colección de pestañas
    // item: { label, group, btn, restore:{h,margin}, w }
    this.items = [];
    this.active = -1;

    // contenedor de botones
    this.c[2] = this.dom('div', this.css.basic + 'left:0; top:0; width:100%; height:100%;');
    this.s[2] = this.c[2].style;

    this.init();
  }

  // Crear un botón de pestaña
  _makeButton(label, index) {
    const cc = this.colors;
    const b = this.dom(
      'div',
      // usar botón base + pointer events
      Tools.css.button +
        'position:absolute; pointer-events:auto; cursor:pointer; ' +
        `height:${this.lineH - 2}px; line-height:${this.lineH - 4}px; ` +
        `border:1px solid ${cc.border}; background:${cc.button}; color:${cc.text};`
    );
    b.textContent = label;
    b.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.setActive(index);
    });
    this.c[2].appendChild(b);
    return b;
  }

  // Registrar una pestaña (label + Group de contenido)
  registerTab(label, group) {
    // guardar medidas originales del grupo para restaurar al activar
    const restore = { h: group.h, margin: group.margin };

    // crear botón
    const btn = this._makeButton(label, this.items.length);

    this.items.push({ label, group, btn, restore, w: 0 });

    // si no es la primera, queda colapsada
    if (this.active === -1) {
      this.setActive(0);
    } else {
      this._collapse(group);
    }

    Roots.needReZone = true;
    if (this.isUI && this.main) this.main.calc();
    return this;
  }

  // Activar por índice
  setActive(i) {
    if (i < 0 || i >= this.items.length) return this;
    if (this.active === i) return this;

    const cc = this.colors;
    // colapsar actuales y activar la nueva
    for (let k = 0; k < this.items.length; k++) {
      const it = this.items[k];
      if (k === i) {
        // activar
        this._expand(it.group, it.restore);
        // estado visual activo
        it.btn.style.background = cc.select;
        it.btn.style.color = cc.textSelect;
      } else {
        // desactivar
        this._collapse(it.group);
        // estado visual normal
        it.btn.style.background = cc.button;
        it.btn.style.color = cc.text;
      }
    }

    this.active = i;

    Roots.needReZone = true;
    if (this.isUI && this.main) this.main.calc();
    return this;
  }

  // Activar por etiqueta
  setActiveByLabel(label) {
    const idx = this.items.findIndex((t) => t.label === label);
    if (idx !== -1) this.setActive(idx);
    return this;
  }

  // Colapsar: no cuenta altura en calcUis (h=0, margin=0) y oculta
  _collapse(group) {
    if (!group) return;
    group.display(false); // oculta DOM del group (Proto.display) :contentReference[oaicite:6]{index=6}
    group._tabs_saved = group._tabs_saved || {};
    // guarda si no tenía aún
    if (group._tabs_saved.h === undefined) {
      group._tabs_saved.h = group.h;
      group._tabs_saved.margin = group.margin;
    }
    group.h = 0;
    group.margin = 0;
  }

  // Expandir: restaura altura/margen y muestra
  _expand(group, restore) {
    if (!group) return;
    const h = restore?.h ?? group._tabs_saved?.h ?? group.h;
    const m = restore?.margin ?? group._tabs_saved?.margin ?? group.margin;
    group.h = h;
    group.margin = m;
    group.display(true); // mostrar :contentReference[oaicite:7]{index=7}
  }

  // Layout de la barra (una fila, botones repartidos)
  layoutButtons() {
    const n = this.items.length;
    if (!n) return;

    const padX = 6;
    const w = this.zone.w - padX * 2;
    const cell = Math.max(40, Math.floor(w / n));
    let x = padX;

    for (let i = 0; i < n; i++) {
      const it = this.items[i];
      it.w = cell;
      const s = it.btn.style;
      s.left = x + 'px';
      s.top = '0px';
      s.width = cell - 4 + 'px';
      s.height = (this.lineH - 2) + 'px';
      x += cell;
    }
  }

  // ----- Ciclo de vida / layout del propio control -----

  rSize() {
    // mantener altura de una línea
    this.h = this.lineH;
    this.s[0].height = this.h + 'px';
    this.zone.h = this.h + this.margin;

    this.s[2].height = this.h + 'px';
    this.s[2].width = '100%';

    this.layoutButtons();
  }

  update() {
    this.layoutButtons();
  }

  // Interacciones visuales simples (hover)
  handleEvent(e) {
    if (this.lock) return false;
    const cc = this.colors;

    if (e.type === 'mousemove') {
      // hover por botones
      const mx = e.clientX - this.zone.x;
      const my = e.clientY - this.zone.y;
      for (let i = 0; i < this.items.length; i++) {
        const it = this.items[i];
        const r = it.btn.getBoundingClientRect();
        // usar zonas del control para no depender del DOM global
        const bx = parseInt(it.btn.style.left, 10) || 0;
        const bw = parseInt(it.btn.style.width, 10) || 0;
        const over = mx >= bx && mx <= bx + bw && my >= 0 && my <= this.h;
        if (over && i !== this.active) {
          it.btn.style.background = cc.backgroundOver;
          it.btn.style.color = cc.textOver;
        } else {
          if (i === this.active) {
            it.btn.style.background = cc.select;
            it.btn.style.color = cc.textSelect;
          } else {
            it.btn.style.background = cc.button;
            it.btn.style.color = cc.text;
          }
        }
      }
      return true;
    }

    if (e.type === 'mousedown') return true;
    if (e.type === 'mouseup') return true;

    return false;
  }
}
