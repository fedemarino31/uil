import { Proto } from '../core/Proto.js';

// Hierarchical tree selector component
export class TreeList extends Proto {

    constructor(o = {}) {
        super(o);

        this.tree = o.tree || {};
        this.value = o.value || [];
        this.focused = o.focused || false;
        this.focusPath = o.focusPath || [];
        this.focusLevel = o.focusLevel || 0;
        this.tabIndex = o.tabIndex || 0;
        this.itemIndex = o.itemIndex || 0;
        this.onChange = o.onChange || function () {};

        this.maxLeaf = computeMaxLeaf(this.tree);

        this.c[2] = this.dom('div', this.css.basic + 'top:0; left:0; width:100%;');
        this.c[2].style.pointerEvents = 'auto';

        this.init();
        this.build();
    }

    setTree(tree) {
        this.tree = tree;
        this.maxLeaf = computeMaxLeaf(tree);
        this.build();
    }

    setValue(v) {
        this.value = v || [];
        this.build();
    }

    setFocus(path, level) {
        this.focusPath = path || [];
        this.focusLevel = level || 0;
        this.build();
    }

    build() {
        while (this.c[2].firstChild) this.c[2].removeChild(this.c[2].firstChild);

        let node = this.tree;
        let path = this.focused ? this.focusPath : this.value;
        let level = 0;
        let total = 0;

        while (node) {
            const isLeaf = Array.isArray(node);
            const options = isLeaf ? node : Object.keys(node);
            const rowHeight = isLeaf ? this.maxLeaf * this.h : this.h;
            const container = this.dom('div', 'position:absolute; display:flex;' + (isLeaf ? 'flex-direction:column;' : 'flex-direction:row;'));
            container.style.top = total + 'px';
            container.style.height = rowHeight + 'px';
            container.style.pointerEvents = 'auto';

            options.forEach(opt => {
                const optDiv = this.dom('div', this.css.item + 'margin:1px; line-height:' + (this.h - 4) + 'px;');
                optDiv.style.height = (this.h - 2) + 'px';
                optDiv.style.pointerEvents = 'auto';
                optDiv.textContent = opt;
                if (this.value[level] === opt) optDiv.style.background = this.colors.select;
                if (this.focused && this.focusLevel === level && this.focusPath[level] === opt) {
                    optDiv.style.border = '1px solid ' + this.colors.text;
                } else {
                    optDiv.style.border = '1px solid ' + this.colors.border;
                }
                optDiv.addEventListener('click', () => this.select(level, opt));
                container.appendChild(optDiv);
            });

            if (isLeaf) {
                const diff = this.maxLeaf - options.length;
                for (let i = 0; i < diff; i++) {
                    const spacer = this.dom('div', this.css.basic + 'height:' + (this.h - 2) + 'px;');
                    spacer.style.pointerEvents = 'none';
                    container.appendChild(spacer);
                }
            }

            this.c[2].appendChild(container);
            total += rowHeight;

            if (isLeaf) break;

            const nextKey = path[level];
            if (nextKey !== undefined && node.hasOwnProperty(nextKey)) {
                node = node[nextKey];
                level++;
            } else {
                break;
            }
        }

        this.h = total;
        this.s[0].height = total + 'px';
        this.s[2].height = total + 'px';
        this.zone.h = total + this.margin;
        this.rSize();
    }

    select(level, option) {
        let newPath = this.value.slice(0, level);
        newPath[level] = option;

        let node = this.tree;
        for (let i = 0; i <= level; i++) {
            if (Array.isArray(node)) { node = null; break; }
            node = node[newPath[i]];
        }
        while (node && !Array.isArray(node)) {
            const keys = Object.keys(node);
            if (!keys.length) break;
            newPath.push(keys[0]);
            node = node[keys[0]];
        }
        this.onChange(this.tabIndex, this.itemIndex, newPath);
        this.setValue(newPath);
    }

    rSize() {
        super.rSize();
        this.s[2].left = this.sa + 'px';
        this.s[2].width = this.sb + 'px';
    }
}

function computeMaxLeaf(tree) {
    let max = 0;
    (function traverse(n) {
        if (Array.isArray(n)) {
            if (n.length > max) max = n.length;
        } else if (n && typeof n === 'object') {
            Object.keys(n).forEach(k => traverse(n[k]));
        }
    })(tree);
    return max;
}

