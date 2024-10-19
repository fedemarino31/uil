(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.UIL = {}));
})(this, (function (exports) { 'use strict';

	/**
	 * @author lth / https://github.com/lo-th
	 */

	const REVISION = "4.3.0";

	// INTENAL FUNCTION

	const R = {
	  ui: [],

	  dom: null,

	  ID: null,
	  lock: false,
	  wlock: false,
	  current: -1,

	  needReZone: true,
	  needResize: false,
	  forceZone: false,
	  isEventsInit: false,
	  isLeave: false,
	  addDOMEventListeners: true,

	  downTime: 0,
	  prevTime: 0,

	  //prevDefault: ['contextmenu', 'wheel'],
	  prevDefault: ["contextmenu"],
	  pointerEvent: ["pointerdown", "pointermove", "pointerup"],
	  eventOut: ["pointercancel", "pointerout", "pointerleave"],

	  xmlserializer: null,
	  tmpTime: null,
	  tmpImage: null,

	  oldCursor: "auto",

	  input: null,
	  parent: null,
	  firstImput: true,

	  hiddenImput: null,
	  hiddenSizer: null,
	  hasFocus: false,
	  startInput: false,
	  inputRange: [0, 0],
	  cursorId: 0,
	  str: "",
	  pos: 0,
	  startX: -1,
	  moveX: -1,

	  debugInput: false,

	  isLoop: false,
	  listens: [],

	  e: {
	    type: null,
	    clientX: 0,
	    clientY: 0,
	    keyCode: NaN,
	    key: null,
	    delta: 0,
	  },

	  isMobile: false,

	  now: null,
	  needsUpdate: false,

	  getTime: function () {
	    return self.performance && self.performance.now
	      ? self.performance.now.bind(performance)
	      : Date.now;
	  },

	  add: function (o) {
	    // R.ui[0] is de GUI object that is added first by the constructor
	    R.ui.push(o);
	    R.getZone(o);

	    if (!R.isEventsInit) R.initEvents();
	  },

	  testMobile: function () {
	    let n = navigator.userAgent;
	    if (
	      n.match(/Android/i) ||
	      n.match(/webOS/i) ||
	      n.match(/iPhone/i) ||
	      n.match(/iPad/i) ||
	      n.match(/iPod/i) ||
	      n.match(/BlackBerry/i) ||
	      n.match(/Windows Phone/i)
	    )
	      return true;
	    else return false;
	  },

	  remove: function (o) {
	    let i = R.ui.indexOf(o);

	    if (i !== -1) {
	      R.removeListen(o);
	      R.ui.splice(i, 1);
	    }

	    if (R.ui.length === 0) {
	      R.removeEvents();
	    }
	  },

	  // ----------------------
	  //   EVENTS
	  // ----------------------

	  initEvents: function () {
	    if (R.isEventsInit) return;

	    let dom = document.body;

	    R.isMobile = R.testMobile();
	    R.now = R.getTime();

	    if (!R.isMobile) {
	      dom.addEventListener("wheel", R, { passive: false });
	    } else {
	      dom.style.touchAction = "none";
	    }

	    console.log("R.addDOMEventListeners " + R.addDOMEventListeners);
	    if (R.addDOMEventListeners) {
	      dom.addEventListener("pointercancel", R);
	      dom.addEventListener("pointerleave", R);
	      //dom.addEventListener( 'pointerout', R )

	      dom.addEventListener("pointermove", R);
	      dom.addEventListener("pointerdown", R);
	      dom.addEventListener("pointerup", R);

	      dom.addEventListener("keydown", R, false);
	      dom.addEventListener("keyup", R, false);
	    }
	    window.addEventListener("resize", R.resize, false);

	    //window.onblur = R.out;
	    //window.onfocus = R.in;

	    R.isEventsInit = true;
	    R.dom = dom;
	  },

	  removeEvents: function () {
	    if (!R.isEventsInit) return;

	    let dom = document.body;

	    if (!R.isMobile) {
	      dom.removeEventListener("wheel", R);
	    }

	    if (R.addDOMEventListeners) {
	      dom.removeEventListener("pointercancel", R);
	      dom.removeEventListener("pointerleave", R);
	      //dom.removeEventListener( 'pointerout', R );

	      dom.removeEventListener("pointermove", R);
	      dom.removeEventListener("pointerdown", R);
	      dom.removeEventListener("pointerup", R);

	      dom.removeEventListener("keydown", R);
	      dom.removeEventListener("keyup", R);
	    }
	    window.removeEventListener("resize", R.resize);

	    R.isEventsInit = false;
	  },

	  resize: function () {
	    let i = R.ui.length,
	      u;

	    while (i--) {
	      u = R.ui[i];
	      if (u.isGui && !u.isCanvasOnly && u.autoResize) u.calc();
	    }

	    R.needReZone = true;
	    R.needResize = false;
	  },

	  out: function () {
	    console.log("im am out");
	    R.clearOldID();
	  },

	  in: function () {
	    console.log("im am in");
	    //  R.clearOldID();
	  },

	  // ----------------------
	  //   HANDLE EVENTS
	  // ----------------------

	  fakeUp: function () {
	    this.handleEvent({ type: "pointerup" });
	  },

	  handleEvent: function (event) {
	    //console.log("Roots.handleEvent "+event.type)
	    //if(!event.type) return;

	    if (R.prevDefault.indexOf(event.type) !== -1) event.preventDefault();

	    if (R.needResize) R.resize();

	    R.findZone(R.forceZone);

	    let e = R.e;
	    let leave = false;

	    if (event.type === "keydown") R.keydown(event);
	    if (event.type === "keyup") R.keyup(event);

	    if (event.type === "wheel") e.delta = event.deltaY > 0 ? 1 : -1;
	    else e.delta = 0;

	    let ptype = event.pointerType; // mouse, pen, touch

	    e.clientX = (ptype === "touch" ? event.pageX : event.clientX) || 0;
	    e.clientY = (ptype === "touch" ? event.pageY : event.clientY) || 0;

	    e.type = event.type;

	    if (R.eventOut.indexOf(event.type) !== -1) {
	      leave = true;
	      e.type = "mouseup";
	    }

	    if (event.type === "pointerleave") R.isLeave = true;

	    if (event.type === "pointerdown") e.type = "mousedown";
	    if (event.type === "pointerup") e.type = "mouseup";
	    if (event.type === "pointermove") {
	      if (R.isLeave) {
	        // if user resize outside this document
	        R.isLeave = false;
	        R.resize();
	      }
	      e.type = "mousemove";
	    }

	    // double click test
	    if (e.type === "mousedown") {
	      R.downTime = R.now();
	      let time = R.downTime - R.prevTime;

	      // double click on imput
	      if (time < 200) {
	        R.selectAll();
	        return false;
	      }

	      R.prevTime = R.downTime;
	      R.forceZone = false;
	    }

	    // for imput
	    if (e.type === "mousedown") R.clearInput();

	    // mouse lock
	    if (e.type === "mousedown") R.lock = true;
	    if (e.type === "mouseup") R.lock = false;

	    //if( R.current !== null && R.current.neverlock ) R.lock = false;

	    /*if( e.type === 'mousedown' && event.button === 1){
	            R.cursor()
	            e.preventDefault();
	            e.stopPropagation();
	        }*/

	    //console.log("p4 "+R.isMobile+" "+e.type+" "+R.lock)

	    if (R.isMobile && e.type === "mousedown") R.findID(e);
	    if (e.type === "mousemove" && !R.lock) R.findID(e);

	    if (R.ID !== null) {
	      if (R.ID.isCanvasOnly) {
	        e.clientX = R.ID.mouse.x;
	        e.clientY = R.ID.mouse.y;
	      }

	      //if( R.ID.marginDiv ) e.clientY -= R.ID.margin * 0.5

	      R.ID.handleEvent(e);
	    }

	    if (R.isMobile && e.type === "mouseup") R.clearOldID();
	    if (leave) R.clearOldID();
	  },

	  // ----------------------
	  //   ID
	  // ----------------------

	  findID: function (e) {
	    let i = R.ui.length,
	      next = -1,
	      u,
	      x,
	      y;

	    while (i--) {
	      u = R.ui[i];

	      if (u.isCanvasOnly) {
	        x = u.mouse.x;
	        y = u.mouse.y;
	      } else {
	        x = e.clientX;
	        y = e.clientY;
	      }

	      if (R.onZone(u, x, y)) {
	        next = i;

	        if (next !== R.current) {
	          R.clearOldID();
	          R.current = next;
	          R.ID = u;
	        }
	        break;
	      }
	    }

	    if (next === -1) R.clearOldID();
	  },

	  clearOldID: function () {
	    if (!R.ID) return;
	    R.current = -1;
	    R.ID.reset();
	    R.ID = null;
	    R.cursor();
	  },

	  // ----------------------
	  //   GUI / GROUP FUNCTION
	  // ----------------------

	  calcUis: (uis, zone, py, group = false) => {
	    //console.log('calc_uis')

	    let i = uis.length,
	      u,
	      px = 0,
	      n = 0,
	      tw,
	      m;

	    let height = 0;

	    while (i--) {
	      u = uis[n];
	      n++;

	      if (!group && u.isGroup) u.calcUis();

	      m = u.margin;
	      //div = u.marginDiv

	      u.zone.w = u.w;
	      u.zone.h = u.h + m;

	      if (!u.autoWidth) {
	        if (px === 0) height += u.h + m;

	        u.zone.x = zone.x + px;
	        u.zone.y = py; // + u.mtop
	        //if(div) u.zone.y += m * 0.5

	        tw = R.getWidth(u);
	        if (tw) u.zone.w = u.w = tw;
	        else if (u.fw) u.zone.w = u.w = u.fw;

	        px += u.zone.w;

	        if (px >= zone.w) {
	          py += u.h + m;
	          //if(div) py += m * 0.5
	          px = 0;
	        }
	      } else {
	        px = 0;

	        u.zone.x = zone.x + u.dx;
	        u.zone.y = py;
	        py += u.h + m;

	        height += u.h + m;
	      }
	    }

	    return height;
	  },

	  findTarget: function (uis, e) {
	    let i = uis.length;

	    while (i--) {
	      if (R.onZone(uis[i], e.clientX, e.clientY)) return i;
	    }

	    return -1;
	  },

	  // ----------------------
	  //   ZONE
	  // ----------------------

	  findZone: function (force) {
	    if (!R.needReZone && !force) return;

	    var i = R.ui.length,
	      u;

	    while (i--) {
	      u = R.ui[i];
	      R.getZone(u);
	      if (u.isGui) u.calcUis();
	    }

	    R.needReZone = false;
	  },

	  onZone: function (o, x, y) {
	    if (x === undefined || y === undefined) return false;

	    let z = o.zone;
	    let mx = x - z.x; // - o.dx;
	    let my = y - z.y;

	    //if( this.marginDiv ) e.clientY -= this.margin * 0.5
	    //if( o.group && o.group.marginDiv ) my += o.group.margin * 0.5
	    //if( o.group !== null ) mx -= o.dx

	    let over = mx >= 0 && my >= 0 && mx <= z.w && my <= z.h;

	    //if( o.marginDiv ) my -= o.margin * 0.5

	    if (over) o.local.set(mx, my);
	    else o.local.neg();

	    return over;
	  },

	  getWidth: function (o) {
	    //return o.getDom().offsetWidth
	    return o.getDom().clientWidth;

	    //let r = o.getDom().getBoundingClientRect();
	    //return (r.width)
	    //return Math.floor(r.width)
	  },

	  getZone: function (o) {
	    if (o.isCanvasOnly) return;
	    let r = o.getDom().getBoundingClientRect();

	    //if( !r.width ) return
	    //o.zone = { x:Math.floor(r.left), y:Math.floor(r.top), w:Math.floor(r.width), h:Math.floor(r.height) };
	    //o.zone = { x:Math.round(r.left), y:Math.round(r.top), w:Math.round(r.width), h:Math.round(r.height) };
	    o.zone = { x: r.left, y: r.top, w: r.width, h: r.height };

	    //console.log(o.name, o.zone)
	  },

	  // ----------------------
	  //   CURSOR
	  // ----------------------

	  cursor: function (name) {
	    name = name ? name : "auto";
	    if (name !== R.oldCursor) {
	      document.body.style.cursor = name;
	      R.oldCursor = name;
	    }
	  },

	  // ----------------------
	  //   CANVAS
	  // ----------------------

	  toCanvas: function (o, w, h, force) {
	    if (!R.xmlserializer) R.xmlserializer = new XMLSerializer();

	    // prevent exesive redraw

	    if (force && R.tmpTime !== null) {
	      clearTimeout(R.tmpTime);
	      R.tmpTime = null;
	    }

	    if (R.tmpTime !== null) return;

	    if (R.lock)
	      R.tmpTime = setTimeout(function () {
	        R.tmpTime = null;
	      }, 10);

	    ///

	    let isNewSize = false;
	    if (w !== o.canvas.width || h !== o.canvas.height) isNewSize = true;

	    if (R.tmpImage === null) R.tmpImage = new Image();

	    let img = R.tmpImage; //new Image();

	    let htmlString = R.xmlserializer.serializeToString(o.content);

	    let svg =
	      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
	      w +
	      '" height="' +
	      h +
	      '"><foreignObject style="pointer-events: none; left:0;" width="100%" height="100%">' +
	      htmlString +
	      "</foreignObject></svg>";

	    img.onload = function () {
	      let ctx = o.canvas.getContext("2d");

	      if (isNewSize) {
	        o.canvas.width = w;
	        o.canvas.height = h;
	      } else {
	        ctx.clearRect(0, 0, w, h);
	      }
	      ctx.drawImage(this, 0, 0);

	      o.onDraw();
	    };

	    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
	    //img.src = 'data:image/svg+xml;base64,'+ window.btoa( svg );
	    img.crossOrigin = "";
	    R.needsUpdate = false;
	  },

	  // ----------------------
	  //   INPUT
	  // ----------------------

	  setHidden: function () {
	    if (R.hiddenImput === null) {
	      //let css = R.parent.css.txtselect + 'padding:0; width:auto; height:auto; '
	      //let css = R.parent.css.txt + 'padding:0; width:auto; height:auto; text-shadow:none;'
	      //css += 'left:10px; top:auto; border:none; color:#FFF; background:#000;' + hide;

	      R.hiddenImput = document.createElement("input");
	      R.hiddenImput.type = "text";
	      //R.hiddenImput.style.cssText = css + 'bottom:30px;' + (R.debugInput ? '' : 'transform:scale(0);');

	      R.hiddenSizer = document.createElement("div");
	      //R.hiddenSizer.style.cssText = css + 'bottom:60px;';

	      document.body.appendChild(R.hiddenImput);
	      document.body.appendChild(R.hiddenSizer);
	    }

	    let hide = R.debugInput ? "" : "opacity:0; zIndex:0;";
	    let css =
	      R.parent.css.txtselect +
	      "padding:0; width:auto; height:auto; left:10px; top:auto; color:#FFF; background:#000;" +
	      hide;
	    R.hiddenImput.style.cssText =
	      css + "bottom:10px;" + (R.debugInput ? "" : "transform:scale(0);");
	    R.hiddenSizer.style.cssText = css + "bottom:40px;";

	    R.hiddenImput.style.width = R.input.clientWidth + "px";
	    R.hiddenImput.value = R.str;
	    R.hiddenSizer.innerHTML = R.str;

	    R.hasFocus = true;
	  },

	  clearHidden: function (p) {
	    if (R.hiddenImput === null) return;
	    R.hasFocus = false;
	  },

	  clickPos: function (x) {
	    let i = R.str.length,
	      l = 0,
	      n = 0;
	    while (i--) {
	      l += R.textWidth(R.str[n]);
	      if (l >= x) break;
	      n++;
	    }
	    return n;
	  },

	  upInput: function (x, down) {
	    if (R.parent === null) return false;

	    let up = false;

	    if (down) {
	      let id = R.clickPos(x);

	      R.moveX = id;

	      if (R.startX === -1) {
	        R.startX = id;
	        R.cursorId = id;
	        R.inputRange = [R.startX, R.startX];
	      } else {
	        let isSelection = R.moveX !== R.startX;

	        if (isSelection) {
	          if (R.startX > R.moveX) R.inputRange = [R.moveX, R.startX];
	          else R.inputRange = [R.startX, R.moveX];
	        }
	      }

	      up = true;
	    } else {
	      if (R.startX !== -1) {
	        R.hasFocus = true;
	        R.hiddenImput.focus();
	        R.hiddenImput.selectionStart = R.inputRange[0];
	        R.hiddenImput.selectionEnd = R.inputRange[1];
	        R.startX = -1;

	        up = true;
	      }
	    }

	    if (up) R.selectParent();

	    return up;
	  },

	  selectAll: function () {
	    if (!R.parent) return;

	    R.str = R.input.textContent;
	    R.inputRange = [0, R.str.length];
	    R.hasFocus = true;
	    R.hiddenImput.focus();
	    R.hiddenImput.selectionStart = R.inputRange[0];
	    R.hiddenImput.selectionEnd = R.inputRange[1];
	    R.cursorId = R.inputRange[1];
	    R.selectParent();
	  },

	  selectParent: function () {
	    var c = R.textWidth(R.str.substring(0, R.cursorId));
	    var e = R.textWidth(R.str.substring(0, R.inputRange[0]));
	    var s = R.textWidth(R.str.substring(R.inputRange[0], R.inputRange[1]));

	    R.parent.select(c, e, s, R.hiddenSizer.innerHTML);
	  },

	  textWidth: function (text) {
	    if (R.hiddenSizer === null) return 0;
	    text = text.replace(/ /g, "&nbsp;");
	    R.hiddenSizer.innerHTML = text;
	    return R.hiddenSizer.clientWidth;
	  },

	  clearInput: function () {
	    if (R.parent === null) return;
	    if (!R.firstImput) R.parent.validate(true);

	    R.clearHidden();
	    R.parent.unselect();

	    //R.input.style.background = 'none';
	    R.input.style.background = R.parent.colors.back;
	    R.input.style.borderColor = R.parent.colors.border;
	    //R.input.style.color = R.parent.colors.text;
	    R.parent.isEdit = false;

	    R.input = null;
	    R.parent = null;
	    (R.str = ""), (R.firstImput = true);
	  },

	  setInput: function (Input, parent) {
	    R.clearInput();

	    R.input = Input;
	    R.parent = parent;

	    R.input.style.background = R.parent.colors.backoff;
	    R.input.style.borderColor = R.parent.colors.select;
	    //R.input.style.color = R.parent.colors.textSelect;
	    R.str = R.input.textContent;

	    R.setHidden();
	  },

	  keydown: function (e) {
	    if (R.parent === null) return;

	    let keyCode = e.which;
	      e.shiftKey;

	    //console.log( keyCode )

	    R.firstImput = false;

	    if (R.hasFocus) {
	      // hack to fix touch event bug in iOS Safari
	      window.focus();
	      R.hiddenImput.focus();
	    }

	    R.parent.isEdit = true;

	    // e.preventDefault();

	    // add support for Ctrl/Cmd+A selection
	    //if ( keyCode === 65 && (e.ctrlKey || e.metaKey )) {
	    //R.selectText();
	    //e.preventDefault();
	    //return self.render();
	    //}

	    if (keyCode === 13) {
	      //enter

	      R.clearInput();

	      //} else if( keyCode === 9 ){ //tab key

	      // R.input.textContent = '';
	    } else {
	      if (R.input.isNum) {
	        if (
	          (e.keyCode > 47 && e.keyCode < 58) ||
	          (e.keyCode > 95 && e.keyCode < 106) ||
	          e.keyCode === 190 ||
	          e.keyCode === 110 ||
	          e.keyCode === 8 ||
	          e.keyCode === 109
	        ) {
	          R.hiddenImput.readOnly = false;
	        } else {
	          R.hiddenImput.readOnly = true;
	        }
	      } else {
	        R.hiddenImput.readOnly = false;
	      }
	    }
	  },

	  keyup: function (e) {
	    if (R.parent === null) return;

	    R.str = R.hiddenImput.value;

	    if (R.parent.allEqual) R.parent.sameStr(R.str); // numeric samùe value
	    else R.input.textContent = R.str;

	    R.cursorId = R.hiddenImput.selectionStart;
	    R.inputRange = [R.hiddenImput.selectionStart, R.hiddenImput.selectionEnd];

	    R.selectParent();

	    //if( R.parent.allway )
	    R.parent.validate();
	  },

	  // ----------------------
	  //
	  //   LISTENING
	  //
	  // ----------------------

	  loop: function () {
	    // modified by Fedemarino
	    if (R.isLoop) requestAnimationFrame(R.loop);
	    R.needsUpdate = R.update();
	    // if there is a change in a value generated externally, the GUI needs to be redrawn
	    if (R.ui[0]) R.ui[0].draw();
	  },

	  update: function () {
	    // modified by Fedemarino
	    let i = R.listens.length;
	    let needsUpdate = false;
	    while (i--) {
	      //check if the value of the object has changed
	      let hasChanged = R.listens[i].listening();
	      if (hasChanged) needsUpdate = true;
	    }
	    return needsUpdate;
	  },

	  removeListen: function (proto) {
	    let id = R.listens.indexOf(proto);
	    if (id !== -1) R.listens.splice(id, 1);
	    if (R.listens.length === 0) R.isLoop = false;
	  },

	  addListen: function (proto) {
	    let id = R.listens.indexOf(proto);

	    if (id !== -1) return false;

	    R.listens.push(proto);

	    if (!R.isLoop) {
	      R.isLoop = true;
	      R.loop();
	    }

	    return true;
	  },
	};

	const Roots = R;

	/**
	 * @author lth / https://github.com/lo-th
	 */

	const T = {

	    transition: 0.2,

	    frag: document.createDocumentFragment(),

	    colorRing: null,
	    joystick_0: null,
	    joystick_1: null,
	    circular: null,
	    knob: null,
	    pad2d: null,

	    svgns: "http://www.w3.org/2000/svg",
	    links: "http://www.w3.org/1999/xlink",
	    htmls: "http://www.w3.org/1999/xhtml",

	    DOM_SIZE: [ 'height', 'width', 'top', 'left', 'bottom', 'right', 'margin-left', 'margin-right', 'margin-top', 'margin-bottom'],
	    SVG_TYPE_D: [ 'pattern', 'defs', 'transform', 'stop', 'animate', 'radialGradient', 'linearGradient', 'animateMotion', 'use', 'filter', 'feColorMatrix' ],
	    SVG_TYPE_G: [ 'svg', 'rect', 'circle', 'path', 'polygon', 'text', 'g', 'line', 'foreignObject' ],

	    PI: Math.PI,
	    TwoPI: Math.PI*2,
	    pi90: Math.PI * 0.5,
	    pi60: Math.PI/3,
	    
	    torad: Math.PI / 180,
	    todeg: 180 / Math.PI,

	    clamp: ( v, min, max ) => {

	        v = v < min ? min : v;
	        v = v > max ? max : v;
	        return v;

	    },

	    isDivid: ( v ) => ( v*0.5 === Math.floor(v*0.5) ),

	    size: {  w: 240, h: 20, p: 30, s: 8 },

	    // ----------------------
	    //   COLOR
	    // ----------------------

	    defineColor: ( o, cc = T.colors ) => {

	        let color = { ...cc };

	        let textChange = ['fontFamily', 'fontWeight', 'fontShadow', 'fontSize' ];
	        let changeText = false;

	        if( o.font ) o.fontFamily = o.font;
	        if( o.shadow ) o.fontShadow = o.shadow;
	        if( o.weight ) o.fontWeight = o.weight;

	        if( o.fontColor ) o.text = o.fontColor;
	        if( o.color ) o.text = o.color;

	        if( o.text ){
	            color.text = o.text;
	            if( !o.fontColor && !o.color ){ 
	                color.title = T.ColorLuma( o.text, -0.25 );
	                color.titleoff = T.ColorLuma( o.text, -0.5 );
	            }
	            color.textOver = T.ColorLuma( o.text, 0.25 );
	            color.textSelect = T.ColorLuma( o.text, 0.5 );
	        }

	        if( o.button ){
	            color.button = o.button;
	            color.border = T.ColorLuma( o.button, 0.1 );
	            color.overoff = T.ColorLuma( o.button, 0.2 );
	        }

	        if( o.select ){
	            color.select = o.select;
	            color.over = T.ColorLuma( o.select, -0.1 );
	        }

	        if( o.itemBg ) o.back = o.itemBg;

	        if( o.back ){
	            color.back = o.back;
	            color.backoff = T.ColorLuma( o.back, -0.1 );
	        }

	        if( o.fontSelect ) color.textSelect = o.fontSelect;
	        if( o.groupBorder ) color.gborder = o.groupBorder;

	        //if( o.transparent ) o.bg = 'none'
	        //if( o.bg ) color.background = color.backgroundOver = o.bg
	        if( o.bgOver ) color.backgroundOver = o.bgOver;

	        for( let m in color ){
	            if(o[m]!==undefined) color[m] = o[m];
	        }

	        for( let m in o ){
	            if( textChange.indexOf(m) !== -1 ) changeText = true; 
	        }

	        if( changeText ) T.defineText( color );

	        return color

	    },

	    colors: {

	        sx: 4,//4
	        sy: 2,//2
	        radius:2,

	        showOver : 1,
	        //groupOver : 1,

	        content:'none',
	        background: 'rgba(50,50,50,0.15)',
	        backgroundOver: 'rgba(50,50,50,0.3)',

	        title : '#CCC',
	        titleoff : '#BBB',
	        text : '#DDD',
	        textOver : '#EEE',
	        textSelect : '#FFF',
	        
	        back:'rgba(0,0,0,0.2)',
	        backoff:'rgba(0,0,0,0.3)',

	        // input and button border
	        border : '#4c4c4c',
	        borderSize : 1,

	        gborder : 'none',
	        groups : 'none',
	        

	        button : '#3c3c3c',
	        overoff : '#5c5c5c',
	        over : '#024699',
	        select : '#308AFF',
	        action: '#FF3300',
	        
	        //fontFamily: 'Tahoma',
	        fontFamily: 'Consolas, monospace',
	        //fontFamily: "'Roboto Mono', 'Source Code Pro', Menlo, Courier, monospace",
	        fontWeight: 'normal',
	        fontShadow: 'none',//'#000',
	        fontSize:12,

	        joyOver:'rgba(48,138,255,0.25)',
	        joyOut: 'rgba(100,100,100,0.5)',
	        joySelect: '#308AFF',

	        
	        hide: 'rgba(0,0,0,0)',

	    },

	    // style css

	    css : {

	        basic: 'position:absolute; pointer-events:none; box-sizing:border-box; margin:0; padding:0; overflow:hidden; ' + '-o-user-select:none; -ms-user-select:none; -khtml-user-select:none; -webkit-user-select:none; -moz-user-select:none;',
	        button:'display:flex; align-items:center; justify-content:center; text-align:center;',
	        middle:'display:flex; align-items:center; justify-content:left; text-align:left; flex-direction: row-reverse;'
	    },

	    // svg path

	    svgs: {

	        g1:'M 6 4 L 0 4 0 6 6 6 6 4 M 6 0 L 0 0 0 2 6 2 6 0 Z',
	        g2:'M 6 0 L 4 0 4 6 6 6 6 0 M 2 0 L 0 0 0 6 2 6 2 0 Z',

	        group:'M 7 7 L 7 8 8 8 8 7 7 7 M 5 7 L 5 8 6 8 6 7 5 7 M 3 7 L 3 8 4 8 4 7 3 7 M 7 5 L 7 6 8 6 8 5 7 5 M 6 6 L 6 5 5 5 5 6 6 6 M 7 3 L 7 4 8 4 8 3 7 3 M 6 4 L 6 3 5 3 5 4 6 4 M 3 5 L 3 6 4 6 4 5 3 5 M 3 3 L 3 4 4 4 4 3 3 3 Z',
	        arrow:'M 3 8 L 8 5 3 2 3 8 Z',

	        arrowDown:'M 5 8 L 8 3 2 3 5 8 Z',
	        arrowUp:'M 5 2 L 2 7 8 7 5 2 Z',

	        solid:'M 13 10 L 13 1 4 1 1 4 1 13 10 13 13 10 M 11 3 L 11 9 9 11 3 11 3 5 5 3 11 3 Z',
	        body:'M 13 10 L 13 1 4 1 1 4 1 13 10 13 13 10 M 11 3 L 11 9 9 11 3 11 3 5 5 3 11 3 M 5 4 L 4 5 4 10 9 10 10 9 10 4 5 4 Z',
	        vehicle:'M 13 6 L 11 1 3 1 1 6 1 13 3 13 3 11 11 11 11 13 13 13 13 6 M 2.4 6 L 4 2 10 2 11.6 6 2.4 6 M 12 8 L 12 10 10 10 10 8 12 8 M 4 8 L 4 10 2 10 2 8 4 8 Z',
	        articulation:'M 13 9 L 12 9 9 2 9 1 5 1 5 2 2 9 1 9 1 13 5 13 5 9 4 9 6 5 8 5 10 9 9 9 9 13 13 13 13 9 Z',
	        character:'M 13 4 L 12 3 9 4 5 4 2 3 1 4 5 6 5 8 4 13 6 13 7 9 8 13 10 13 9 8 9 6 13 4 M 6 1 L 6 3 8 3 8 1 6 1 Z',
	        terrain:'M 13 8 L 12 7 Q 9.06 -3.67 5.95 4.85 4.04 3.27 2 7 L 1 8 7 13 13 8 M 3 8 Q 3.78 5.420 5.4 6.6 5.20 7.25 5 8 L 7 8 Q 8.39 -0.16 11 8 L 7 11 3 8 Z',
	        joint:'M 7.7 7.7 Q 8 7.45 8 7 8 6.6 7.7 6.3 7.45 6 7 6 6.6 6 6.3 6.3 6 6.6 6 7 6 7.45 6.3 7.7 6.6 8 7 8 7.45 8 7.7 7.7 M 3.35 8.65 L 1 11 3 13 5.35 10.65 Q 6.1 11 7 11 8.28 11 9.25 10.25 L 7.8 8.8 Q 7.45 9 7 9 6.15 9 5.55 8.4 5 7.85 5 7 5 6.54 5.15 6.15 L 3.7 4.7 Q 3 5.712 3 7 3 7.9 3.35 8.65 M 10.25 9.25 Q 11 8.28 11 7 11 6.1 10.65 5.35 L 13 3 11 1 8.65 3.35 Q 7.9 3 7 3 5.7 3 4.7 3.7 L 6.15 5.15 Q 6.54 5 7 5 7.85 5 8.4 5.55 9 6.15 9 7 9 7.45 8.8 7.8 L 10.25 9.25 Z',
	        ray:'M 9 11 L 5 11 5 12 9 12 9 11 M 12 5 L 11 5 11 9 12 9 12 5 M 11.5 10 Q 10.9 10 10.45 10.45 10 10.9 10 11.5 10 12.2 10.45 12.55 10.9 13 11.5 13 12.2 13 12.55 12.55 13 12.2 13 11.5 13 10.9 12.55 10.45 12.2 10 11.5 10 M 9 10 L 10 9 2 1 1 2 9 10 Z',
	        collision:'M 11 12 L 13 10 10 7 13 4 11 2 7.5 5.5 9 7 7.5 8.5 11 12 M 3 2 L 1 4 4 7 1 10 3 12 8 7 3 2 Z',
	        map:'M 13 1 L 1 1 1 13 13 13 13 1 M 12 2 L 12 7 7 7 7 12 2 12 2 7 7 7 7 2 12 2 Z',
	        material:'M 13 1 L 1 1 1 13 13 13 13 1 M 12 2 L 12 7 7 7 7 12 2 12 2 7 7 7 7 2 12 2 Z',
	        texture:'M 13 4 L 13 1 1 1 1 4 5 4 5 13 9 13 9 4 13 4 Z',
	        object:'M 10 1 L 7 4 4 1 1 1 1 13 4 13 4 5 7 8 10 5 10 13 13 13 13 1 10 1 Z',
	        none:'M 9 5 L 5 5 5 9 9 9 9 5 Z',
	        cursor:'M 4 7 L 1 10 1 12 2 13 4 13 7 10 9 14 14 0 0 5 4 7 Z',
	        load:'M 13 8 L 11.5 6.5 9 9 9 3 5 3 5 9 2.5 6.5 1 8 7 14 13 8 M 9 2 L 9 0 5 0 5 2 9 2 Z',
	        save:'M 9 12 L 5 12 5 14 9 14 9 12 M 11.5 7.5 L 13 6 7 0 1 6 2.5 7.5 5 5 5 11 9 11 9 5 11.5 7.5 Z',
	        extern:'M 14 14 L 14 0 0 0 0 14 14 14 M 12 6 L 12 12 2 12 2 6 12 6 M 12 2 L 12 4 2 4 2 2 12 2 Z',

	    },

	    rezone () {
	        Roots.needReZone = true;
	    },

	    getImput: function(){

	        return Roots.input ? true : false

	    },

	    setStyle : function ( data ){

	        for ( var o in data ){
	            if( T.colors[o] ) T.colors[o] = data[o];
	        }

	        T.setText();

	    },

	    // ----------------------
	    // custom text
	    // ----------------------

	    defineText: function( o ){

	        T.setText( o.fontSize, o.text, o.fontFamily, o.fontShadow, o.fontWeight );

	    },

	    setText: function( size, color, font, shadow, weight ){

	        let cc = T.colors;

	        if( font === undefined ) font = cc.fontFamily;
	        if( size === undefined ) size = cc.fontSize;
	        if( shadow === undefined ) shadow = cc.fontShadow;
	        if( weight === undefined ) weight = cc.fontWeight;
	        if( color === undefined ) color = cc.text;

	        if( isNaN(size) ){ if( size.search('em')===-1 ) size += 'px';}
	        else size += 'px';
	        

	        //let align = 'display:flex; justify-content:left; align-items:center; text-align:left;'

	        T.css.txt = T.css.basic + T.css.middle + ' font-family:'+ font +'; font-weight:'+weight+'; font-size:'+size+'; color:'+cc.text+'; padding:0px 8px; left:0; top:2px; height:16px; width:100px; overflow:hidden; white-space: nowrap; letter-spacing: normal;';
	        if( shadow !== 'none' ) T.css.txt += ' text-shadow: 1px 1px 1px '+shadow+';';

	        T.css.txtselect = T.css.txt + 'padding:0px 4px; border:1px dashed ' + cc.border + ';';
	        T.css.item = T.css.txt + 'padding:0px 4px; position:relative; margin-bottom:1px; ';

	    },


	    // note

	    //https://developer.mozilla.org/fr/docs/Web/CSS/css_flexible_box_layout/aligning_items_in_a_flex_container

	    /*cloneColor: function () {

	        let cc = Object.assign({}, T.colors );
	        return cc;

	    },*/

	    // intern function

	    cloneCss: function () {

	        //let cc = Object.assign({}, T.css );
	        return { ...T.css };

	    },

	    clone: function ( o ) {

	        return o.cloneNode( true );

	    },

	    setSvg: function( dom, type, value, id, id2 ){

	        if( id === -1 ) dom.setAttributeNS( null, type, value );
	        else if( id2 !== undefined ) dom.childNodes[ id || 0 ].childNodes[ id2 || 0 ].setAttributeNS( null, type, value );
	        else dom.childNodes[ id || 0 ].setAttributeNS( null, type, value );

	    },

	    setCss: function( dom, css ){

	        for( let r in css ){
	            if( T.DOM_SIZE.indexOf(r) !== -1 ) dom.style[r] = css[r] + 'px';
	            else dom.style[r] = css[r];
	        }

	    },

	    set: function( g, o ){

	        for( let att in o ){
	            if( att === 'txt' ) g.textContent = o[ att ];
	            if( att === 'link' ) g.setAttributeNS( T.links, 'xlink:href', o[ att ] );
	            else g.setAttributeNS( null, att, o[ att ] );
	        }
	        
	    },

	    get: function( dom, id ){

	        if( id === undefined ) return dom; // root
	        else if( !isNaN( id ) ) return dom.childNodes[ id ]; // first child
	        else if( id instanceof Array ){
	            if(id.length === 2) return dom.childNodes[ id[0] ].childNodes[ id[1] ];
	            if(id.length === 3) return dom.childNodes[ id[0] ].childNodes[ id[1] ].childNodes[ id[2] ];
	        }

	    },

	    dom : function ( type, css, obj, dom, id ) {

	        type = type || 'div';

	        if( T.SVG_TYPE_D.indexOf(type) !== -1 || T.SVG_TYPE_G.indexOf(type) !== -1 ){ // is svg element

	            if( type ==='svg' ){

	                dom = document.createElementNS( T.svgns, 'svg' );
	                T.set( dom, obj );

	          /*  } else if ( type === 'use' ) {

	                dom = document.createElementNS( T.svgns, 'use' );
	                T.set( dom, obj );
	*/
	            } else {
	                // create new svg if not def
	                if( dom === undefined ) dom = document.createElementNS( T.svgns, 'svg' );
	                T.addAttributes( dom, type, obj, id );

	            }
	            
	        } else { // is html element

	            if( dom === undefined ) dom = document.createElementNS( T.htmls, type );
	            else dom = dom.appendChild( document.createElementNS( T.htmls, type ) );

	        }

	        if( css ) dom.style.cssText = css; 

	        if( id === undefined ) return dom;
	        else return dom.childNodes[ id || 0 ];

	    },

	    addAttributes : function( dom, type, o, id ){

	        let g = document.createElementNS( T.svgns, type );
	        T.set( g, o );
	        T.get( dom, id ).appendChild( g );
	        if( T.SVG_TYPE_G.indexOf(type) !== -1 ) g.style.pointerEvents = 'none';
	        return g;

	    },

	    clear : function( dom ){

	        T.purge( dom );
	        while (dom.firstChild) {
	            if ( dom.firstChild.firstChild ) T.clear( dom.firstChild );
	            dom.removeChild( dom.firstChild ); 
	        }

	    },

	    purge : function ( dom ) {

	        let a = dom.attributes, i, n;
	        if (a) {
	            i = a.length;
	            while(i--){
	                n = a[i].name;
	                if (typeof dom[n] === 'function') dom[n] = null;
	            }
	        }
	        a = dom.childNodes;
	        if (a) {
	            i = a.length;
	            while(i--){ 
	                T.purge( dom.childNodes[i] ); 
	            }
	        }

	    },

	    // ----------------------
	    //   SVG Effects function
	    // ----------------------

	    addSVGGlowEffect: function () {

	        if ( document.getElementById( 'UILGlow') !== null ) return;

	        let svgFilter = T.initUILEffects();

	        let filter = T.addAttributes( svgFilter, 'filter', { id: 'UILGlow', x: '-20%', y: '-20%', width: '140%', height: '140%' } );
	        T.addAttributes( filter, 'feGaussianBlur', { in: 'SourceGraphic', stdDeviation: '3', result: 'uilBlur' } );
	        let feMerge = T.addAttributes( filter, 'feMerge', {  } );
	        
	        for( let i = 0; i <= 3; i++ ) {

	            T.addAttributes( feMerge, 'feMergeNode', { in: 'uilBlur' } );
	        
	        }

	        T.addAttributes( feMerge, 'feMergeNode', { in: 'SourceGraphic' } );

	    },

	    initUILEffects: function () {

	        let svgFilter = document.getElementById( 'UILSVGEffects');
	        
	        if ( svgFilter === null ) {
	            
	            svgFilter = T.dom( 'svg', undefined , { id: 'UILSVGEffects', width: '0', height: '0' } );
	            document.body.appendChild( svgFilter );
	 
	        }

	        return svgFilter;

	    },

	    // ----------------------
	    //   Color function
	    // ----------------------

	    ColorLuma : function ( hex, l ) {

	        //if( hex.substring(0, 3) === 'rgba' ) hex = '#000';

	        if( hex === 'n' ) hex = '#000';

	        // validate hex string
	        hex = String(hex).replace(/[^0-9a-f]/gi, '');
	        if (hex.length < 6) {
	            hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
	        }
	        l = l || 0;

	        // convert to decimal and change luminosity
	        let rgb = "#", c, i;
	        for (i = 0; i < 3; i++) {
	            c = parseInt(hex.substr(i*2,2), 16);
	            c = Math.round(Math.min(Math.max(0, c + (c * l)), 255)).toString(16);
	            rgb += ("00"+c).substr(c.length);
	        }

	        return rgb;

	    },

	    findDeepInver: function ( c ) { 

	        return (c[0] * 0.3 + c[1] * .59 + c[2] * .11) <= 0.6;
	        
	    },

	    lerpColor: function( c1, c2, factor ) {
	        let newColor = {};
	        for ( let i = 0; i < 3; i++ ) {
	          newColor[i] = c1[ i ] + ( c2[ i ] - c1[ i ] ) * factor;
	        }
	        return newColor;
	    },

	    hexToHtml: function ( v ) { 
	        v = v === undefined ? 0x000000 : v;
	        return "#" + ("000000" + v.toString(16)).substr(-6);
	        
	    },

	    htmlToHex: function ( v ) { 

	        return v.toUpperCase().replace("#", "0x");

	    },

	    u255: function (c, i) {

	        return parseInt(c.substring(i, i + 2), 16) / 255;

	    },

	    u16: function ( c, i ) {

	        return parseInt(c.substring(i, i + 1), 16) / 15;

	    },

	    unpack: function( c ){

	        if (c.length == 7) return [ T.u255(c, 1), T.u255(c, 3), T.u255(c, 5) ];
	        else if (c.length == 4) return [ T.u16(c,1), T.u16(c,2), T.u16(c,3) ];

	    },

	    p255: function ( c ) {
	        let h = Math.round( ( c * 255 ) ).toString( 16 );
	        if ( h.length < 2 ) h = '0' + h;
	        return h;
	    },

	    pack: function ( c ) {

	        return '#' + T.p255( c[ 0 ] ) + T.p255( c[ 1 ] ) + T.p255( c[ 2 ] );

	    },

	    htmlRgb: function( c ){

	        return 'rgb(' + Math.round(c[0] * 255) + ','+ Math.round(c[1] * 255) + ','+ Math.round(c[2] * 255) + ')';

	    },

	    pad: function( n ){
	        if(n.length == 1)n = '0' + n;
	        return n;
	    },

	    rgbToHex : function( c ){

	        let r = Math.round(c[0] * 255).toString(16);
	        let g = Math.round(c[1] * 255).toString(16);
	        let b = Math.round(c[2] * 255).toString(16);
	        return '#' + T.pad(r) + T.pad(g) + T.pad(b);

	       // return '#' + ( '000000' + ( ( c[0] * 255 ) << 16 ^ ( c[1] * 255 ) << 8 ^ ( c[2] * 255 ) << 0 ).toString( 16 ) ).slice( - 6 );

	    },

	    hueToRgb: function( p, q, t ){

	        if ( t < 0 ) t += 1;
	        if ( t > 1 ) t -= 1;
	        if ( t < 1 / 6 ) return p + ( q - p ) * 6 * t;
	        if ( t < 1 / 2 ) return q;
	        if ( t < 2 / 3 ) return p + ( q - p ) * 6 * ( 2 / 3 - t );
	        return p;

	    },

	    rgbToHsl: function ( c ) {

	        let r = c[0], g = c[1], b = c[2], min = Math.min(r, g, b), max = Math.max(r, g, b), delta = max - min, h = 0, s = 0, l = (min + max) / 2;
	        if (l > 0 && l < 1) s = delta / (l < 0.5 ? (2 * l) : (2 - 2 * l));
	        if (delta > 0) {
	            if (max == r && max != g) h += (g - b) / delta;
	            if (max == g && max != b) h += (2 + (b - r) / delta);
	            if (max == b && max != r) h += (4 + (r - g) / delta);
	            h /= 6;
	        }
	        return [ h, s, l ];

	    },

	    hslToRgb: function ( c ) {

	        let p, q, h = c[0], s = c[1], l = c[2];

	        if ( s === 0 ) return [ l, l, l ];
	        else {
	            q = l <= 0.5 ? l * (s + 1) : l + s - ( l * s );
	            p = l * 2 - q;
	            return [ T.hueToRgb(p, q, h + 0.33333), T.hueToRgb(p, q, h), T.hueToRgb(p, q, h - 0.33333) ];
	        }

	    },

	    // ----------------------
	    //   SVG MODEL
	    // ----------------------

	    makeGradiant: function ( type, settings, parent, colors ) {

	        T.dom( type, null, settings, parent, 0 );

	        let n = parent.childNodes[0].childNodes.length - 1, c;

	        for( let i = 0; i < colors.length; i++ ){

	            c = colors[i];
	            //T.dom( 'stop', null, { offset:c[0]+'%', style:'stop-color:'+c[1]+'; stop-opacity:'+c[2]+';' }, parent, [0,n] );
	            T.dom( 'stop', null, { offset:c[0]+'%', 'stop-color':c[1],  'stop-opacity':c[2] }, parent, [0,n] );

	        }

	    },

	    /*makeGraph: function () {

	        let w = 128;
	        let radius = 34;
	        let svg = T.dom( 'svg', T.css.basic , { viewBox:'0 0 '+w+' '+w, width:w, height:w, preserveAspectRatio:'none' } );
	        T.dom( 'path', '', { d:'', stroke:T.colors.text, 'stroke-width':4, fill:'none', 'stroke-linecap':'butt' }, svg );//0
	        //T.dom( 'rect', '', { x:10, y:10, width:108, height:108, stroke:'rgba(0,0,0,0.3)', 'stroke-width':2 , fill:'none'}, svg );//1
	        //T.dom( 'circle', '', { cx:64, cy:64, r:radius, fill:T.colors.button, stroke:'rgba(0,0,0,0.3)', 'stroke-width':8 }, svg );//0
	        
	        //T.dom( 'circle', '', { cx:64, cy:64, r:radius+7, stroke:'rgba(0,0,0,0.3)', 'stroke-width':7 , fill:'none'}, svg );//2
	        //T.dom( 'path', '', { d:'', stroke:'rgba(255,255,255,0.3)', 'stroke-width':2, fill:'none', 'stroke-linecap':'round', 'stroke-opacity':0.5 }, svg );//3
	        T.graph = svg;

	    },*/

	    makePad: function ( model ) {

	        let ww = 256;
	        let svg = T.dom( 'svg', T.css.basic + 'position:relative;', { viewBox:'0 0 '+ww+' '+ww, width:ww, height:ww, preserveAspectRatio:'none' } );
	        let w = 200; 
	        let d = (ww-w)*0.5, m = 20;
	        Tools.dom( 'rect', '', { x: d, y: d,  width: w, height: w, fill:T.colors.back }, svg ); // 0
	        Tools.dom( 'rect', '', { x: d+m*0.5, y: d+m*0.5, width: w - m , height: w - m, fill:T.colors.button }, svg ); // 1
	        // Pointer
	        Tools.dom( 'line', '', { x1: d+(m*0.5), y1: ww *0.5, x2: d+(w-m*0.5), y2: ww * 0.5, stroke:T.colors.back, 'stroke-width': 2 }, svg ); // 2
	        Tools.dom( 'line', '', { x1: ww * 0.5, x2: ww * 0.5, y1: d+(m*0.5), y2: d+(w-m*0.5), stroke:T.colors.back, 'stroke-width': 2 }, svg ); // 3
	        Tools.dom( 'circle', '', { cx: ww * 0.5, cy: ww * 0.5, r:5, stroke: T.colors.text, 'stroke-width': 5, fill:'none' }, svg ); // 4
	        T.pad2d = svg;

	    },

	    makeKnob: function ( model ) {

	        let w = 128;
	        let radius = 34;
	        let svg = T.dom( 'svg', T.css.basic + 'position:relative;', { viewBox:'0 0 '+w+' '+w, width:w, height:w, preserveAspectRatio:'none' } );
	        T.dom( 'circle', '', { cx:64, cy:64, r:radius, fill:T.colors.button, stroke:'rgba(0,0,0,0.3)', 'stroke-width':8 }, svg );//0
	        T.dom( 'path', '', { d:'', stroke:T.colors.text, 'stroke-width':4, fill:'none', 'stroke-linecap':'round' }, svg );//1
	        T.dom( 'circle', '', { cx:64, cy:64, r:radius+7, stroke:'rgba(0,0,0,0.1)', 'stroke-width':7 , fill:'none'}, svg );//2
	        T.dom( 'path', '', { d:'', stroke:'rgba(255,255,255,0.3)', 'stroke-width':2, fill:'none', 'stroke-linecap':'round', 'stroke-opacity':0.5 }, svg );//3
	        T.knob = svg;

	    },

	    makeCircular: function ( model ) {

	        let w = 128;
	        let radius = 40;
	        let svg = T.dom( 'svg', T.css.basic + 'position:relative;', { viewBox:'0 0 '+w+' '+w, width:w, height:w, preserveAspectRatio:'none' } );
	        T.dom( 'circle', '', { cx:64, cy:64, r:radius, stroke:'rgba(0,0,0,0.1)', 'stroke-width':10, fill:'none' }, svg );//0
	        T.dom( 'path', '', { d:'', stroke:T.colors.text, 'stroke-width':7, fill:'none', 'stroke-linecap':'butt' }, svg );//1
	        T.circular = svg;

	    },

	    makeJoystick: function ( model ) {

	        //+' background:#f00;'

	        let w = 128, ccc;
	        let radius = Math.floor((w-30)*0.5);
	        let innerRadius = Math.floor(radius*0.6);
	        let svg = T.dom( 'svg', T.css.basic + 'position:relative;', { viewBox:'0 0 '+w+' '+w, width:w, height:w, preserveAspectRatio:'none' } );
	        T.dom( 'defs', null, {}, svg );
	        T.dom( 'g', null, {}, svg );

	        if( model === 0 ){

	        

	            // gradian background
	            ccc = [ [40, 'rgb(0,0,0)', 0.3], [80, 'rgb(0,0,0)', 0], [90, 'rgb(50,50,50)', 0.4], [100, 'rgb(50,50,50)', 0] ];
	            T.makeGradiant( 'radialGradient', { id:'grad', cx:'50%', cy:'50%', r:'50%', fx:'50%', fy:'50%' }, svg, ccc );

	            // gradian shadow
	            ccc = [ [60, 'rgb(0,0,0)', 0.5], [100, 'rgb(0,0,0)', 0] ];
	            T.makeGradiant( 'radialGradient', { id:'gradS', cx:'50%', cy:'50%', r:'50%', fx:'50%', fy:'50%' }, svg, ccc );

	            // gradian stick
	            let cc0 = ['rgb(40,40,40)', 'rgb(48,48,48)', 'rgb(30,30,30)'];
	            let cc1 = ['rgb(1,90,197)', 'rgb(3,95,207)', 'rgb(0,65,167)'];

	            ccc = [ [30, cc0[0], 1], [60, cc0[1], 1], [80, cc0[1], 1], [100, cc0[2], 1] ];
	            T.makeGradiant( 'radialGradient', { id:'gradIn', cx:'50%', cy:'50%', r:'50%', fx:'50%', fy:'50%' }, svg, ccc );

	            ccc = [ [30, cc1[0], 1], [60, cc1[1], 1], [80, cc1[1], 1], [100, cc1[2], 1] ];
	            T.makeGradiant( 'radialGradient', { id:'gradIn2', cx:'50%', cy:'50%', r:'50%', fx:'50%', fy:'50%' }, svg, ccc );

	            // graph

	            T.dom( 'circle', '', { cx:64, cy:64, r:radius, fill:'url(#grad)' }, svg );//2
	            T.dom( 'circle', '', { cx:64+5, cy:64+10, r:innerRadius+10, fill:'url(#gradS)' }, svg );//3
	            T.dom( 'circle', '', { cx:64, cy:64, r:innerRadius, fill:'url(#gradIn)' }, svg );//4

	            T.joystick_0 = svg;

	        } else {
	             // gradian shadow
	            ccc = [ [69, 'rgb(0,0,0)', 0],[70, 'rgb(0,0,0)', 0.3], [100, 'rgb(0,0,0)', 0] ];
	            T.makeGradiant( 'radialGradient', { id:'gradX', cx:'50%', cy:'50%', r:'50%', fx:'50%', fy:'50%' }, svg, ccc );

	            T.dom( 'circle', '', { cx:64, cy:64, r:radius, fill:'none', stroke:'rgba(100,100,100,0.25)', 'stroke-width':'4' }, svg );//2
	            T.dom( 'circle', '', { cx:64, cy:64, r:innerRadius+14, fill:'url(#gradX)' }, svg );//3
	            T.dom( 'circle', '', { cx:64, cy:64, r:innerRadius, fill:'none', stroke:'rgb(100,100,100)', 'stroke-width':'4' }, svg );//4

	            T.joystick_1 = svg;
	        }

	        

	    },

	    makeColorRing: function () {

	        let w = 256;
	        let svg = T.dom( 'svg', T.css.basic + 'position:relative;', { viewBox:'0 0 '+w+' '+w, width:w, height:w, preserveAspectRatio:'none' } );
	        T.dom( 'defs', null, {}, svg );
	        T.dom( 'g', null, {}, svg );

	        let s = 30;//stroke
	        let r =( w-s )*0.5;
	        let mid = w*0.5;
	        let n = 24, nudge = 8 / r / n * Math.PI, a1 = 0;
	        let am, tan, d2, a2, ar, i, j, path, ccc;
	        let color = [];
	        
	        for ( i = 0; i <= n; ++i) {

	            d2 = i / n;
	            a2 = d2 * T.TwoPI;
	            am = (a1 + a2) * 0.5;
	            tan = 1 / Math.cos((a2 - a1) * 0.5);

	            ar = [
	                Math.sin(a1), -Math.cos(a1), 
	                Math.sin(am) * tan, -Math.cos(am) * tan, 
	                Math.sin(a2), -Math.cos(a2)
	            ];
	            
	            color[1] = T.rgbToHex( T.hslToRgb([d2, 1, 0.5]) );

	            if (i > 0) {

	                j = 6;
	                while(j--){
	                   ar[j] = ((ar[j]*r)+mid).toFixed(2);
	                }

	                path = ' M' + ar[0] + ' ' + ar[1] + ' Q' + ar[2] + ' ' + ar[3] + ' ' + ar[4] + ' ' + ar[5];

	                ccc = [ [0,color[0],1], [100,color[1],1] ];
	                T.makeGradiant( 'linearGradient', { id:'G'+i, x1:ar[0], y1:ar[1], x2:ar[4], y2:ar[5], gradientUnits:"userSpaceOnUse" }, svg, ccc );

	                T.dom( 'path', '', { d:path, 'stroke-width':s, stroke:'url(#G'+i+')', 'stroke-linecap':"butt" }, svg, 1 );
	                
	            }
	            a1 = a2 - nudge; 
	            color[0] = color[1];
	        }

	        let tw = 84.90;

	        // black / white
	        ccc = [ [0, '#FFFFFF', 1], [50, '#FFFFFF', 0], [50, '#000000', 0], [100, '#000000', 1] ];
	        T.makeGradiant( 'linearGradient', { id:'GL0', x1:0, y1:mid-tw, x2:0, y2:mid+tw, gradientUnits:"userSpaceOnUse" }, svg, ccc );

	        ccc = [ [0, '#7f7f7f', 1], [50, '#7f7f7f', 0.5], [100, '#7f7f7f', 0] ];
	        T.makeGradiant( 'linearGradient', { id:'GL1', x1:mid-49.05, y1:0, x2:mid+98, y2:0, gradientUnits:"userSpaceOnUse" }, svg, ccc );

	        T.dom( 'g', null, { 'transform-origin': '128px 128px', 'transform':'rotate(0)' }, svg );//2
	        T.dom( 'polygon', '', { points:'78.95 43.1 78.95 212.85 226 128',  fill:'red'  }, svg, 2 );// 2,0
	        T.dom( 'polygon', '', { points:'78.95 43.1 78.95 212.85 226 128',  fill:'url(#GL1)','stroke-width':1, stroke:'url(#GL1)'  }, svg, 2 );//2,1
	        T.dom( 'polygon', '', { points:'78.95 43.1 78.95 212.85 226 128',  fill:'url(#GL0)','stroke-width':1, stroke:'url(#GL0)'  }, svg, 2 );//2,2
	        T.dom( 'path', '', { d:'M 255.75 136.5 Q 256 132.3 256 128 256 123.7 255.75 119.5 L 241 128 255.75 136.5 Z',  fill:'none','stroke-width':2, stroke:'#000'  }, svg, 2 );//2,3
	        //T.dom( 'circle', '', { cx:128+113, cy:128, r:6, 'stroke-width':3, stroke:'#000', fill:'none' }, svg, 2 );//2.3

	        T.dom( 'circle', '', { cx:128, cy:128, r:6, 'stroke-width':2, stroke:'#000', fill:'none' }, svg );//3

	        T.colorRing = svg;

	    },

	    icon: function ( type, color, w ){

	        w = w || 40;
	        //color = color || '#DEDEDE';
	        let viewBox = '0 0 256 256';
	        //let viewBox = '0 0 '+ w +' '+ w;
	        let t = ["<svg xmlns='"+T.svgns+"' version='1.1' xmlns:xlink='"+T.htmls+"' style='pointer-events:none;' preserveAspectRatio='xMinYMax meet' x='0px' y='0px' width='"+w+"px' height='"+w+"px' viewBox='"+viewBox+"'><g>"];
	        switch(type){
	            case 'logo':
	            t[1]="<path id='logoin' fill='"+color+"' stroke='none' d='"+T.logoFill_d+"'/>";
	            break;
	            case 'donate':
	            t[1]="<path id='logoin' fill='"+color+"' stroke='none' d='"+T.logo_donate+"'/>";
	            break;
	            case 'neo':
	            t[1]="<path id='logoin' fill='"+color+"' stroke='none' d='"+T.logo_neo+"'/>";
	            break;
	            case 'phy':
	            t[1]="<path id='logoin' stroke='"+color+"' stroke-width='49' stroke-linejoin='round' stroke-linecap='butt' fill='none' d='"+T.logo_phy+"'/>";
	            break;
	            case 'config':
	            t[1]="<path id='logoin' stroke='"+color+"' stroke-width='49' stroke-linejoin='round' stroke-linecap='butt' fill='none' d='"+T.logo_config+"'/>";
	            break;
	            case 'github':
	            t[1]="<path id='logoin' fill='"+color+"' stroke='none' d='"+T.logo_github+"'/>";
	            break;
	            case 'save':
	            t[1]="<path stroke='"+color+"' stroke-width='4' stroke-linejoin='round' stroke-linecap='round' fill='none' d='M 26.125 17 L 20 22.95 14.05 17 M 20 9.95 L 20 22.95'/><path stroke='"+color;
	            t[1]+="' stroke-width='2.5' stroke-linejoin='round' stroke-linecap='round' fill='none' d='M 32.6 23 L 32.6 25.5 Q 32.6 28.5 29.6 28.5 L 10.6 28.5 Q 7.6 28.5 7.6 25.5 L 7.6 23'/>";
	            break;
	        }
	        t[2] = "</g></svg>";
	        return t.join("\n");

	    },

	    logoFill_d:`
    M 171 150.75 L 171 33.25 155.5 33.25 155.5 150.75 Q 155.5 162.2 147.45 170.2 139.45 178.25 128 178.25 116.6 178.25 108.55 170.2 100.5 162.2 100.5 150.75 
    L 100.5 33.25 85 33.25 85 150.75 Q 85 168.65 97.55 181.15 110.15 193.75 128 193.75 145.9 193.75 158.4 181.15 171 168.65 171 150.75 
    M 200 33.25 L 184 33.25 184 150.8 Q 184 174.1 167.6 190.4 151.3 206.8 128 206.8 104.75 206.8 88.3 190.4 72 174.1 72 150.8 L 72 33.25 56 33.25 56 150.75 
    Q 56 180.55 77.05 201.6 98.2 222.75 128 222.75 157.8 222.75 178.9 201.6 200 180.55 200 150.75 L 200 33.25 Z
    `,

	    logo_github:`
    M 180.5 70 Q 186.3 82.4 181.55 96.55 196.5 111.5 189.7 140.65 183.65 168.35 146 172.7 152.5 178.7 152.55 185.9 L 152.55 218.15 Q 152.84 224.56 159.15 223.3 
    159.21 223.3 159.25 223.3 181.14 216.25 198.7 198.7 228 169.4 228 128 228 86.6 198.7 57.3 169.4 28 128 28 86.6 28 57.3 57.3 28 86.6 28 128 28 169.4 57.3 198.7 74.85 
    216.25 96.75 223.3 96.78 223.3 96.8 223.3 103.16 224.54 103.45 218.15 L 103.45 200 Q 82.97 203.1 75.1 196.35 69.85 191.65 68.4 185.45 64.27 177.055 59.4 174.15 49.20 
    166.87 60.8 167.8 69.85 169.61 75.7 180 81.13 188.09 90 188.55 98.18 188.86 103.45 185.9 103.49 178.67 110 172.7 72.33 168.33 66.3 140.65 59.48 111.49 74.45 96.55 69.7 
    82.41 75.5 70 84.87 68.74 103.15 80 115.125 76.635 128 76.85 140.85 76.65 152.85 80 171.1 68.75 180.5 70 Z
    `,

	    logo_neo:`
    M 219 52 L 206 52 206 166 Q 206 183.4 193.75 195.65 181.4 208 164 208 146.6 208 134.35 195.65 122 183.4 122 166 L 122 90 Q 122 77.6 113.15 68.85 104.4 60 92 60 79.55 
    60 70.75 68.85 62 77.6 62 90 L 62 204 75 204 75 90 Q 75 83 79.95 78 84.95 73 92 73 99 73 104 78 109 83 109 90 L 109 166 Q 109 188.8 125.15 204.85 141.2 221 164 221 
    186.75 221 202.95 204.85 219 188.8 219 166 L 219 52 M 194 52 L 181 52 181 166 Q 181 173 176.05 178 171.05 183 164 183 157 183 152 178 147 173 147 166 L 147 90 Q 147 
    67.2 130.85 51.15 114.8 35 92 35 69.25 35 53.05 51.15 37 67.2 37 90 L 37 204 50 204 50 90 Q 50 72.6 62.25 60.35 74.6 48 92 48 109.4 48 121.65 60.35 134 72.6 134 90 L 
    134 166 Q 134 178.4 142.85 187.15 151.6 196 164 196 176.45 196 185.25 187.15 194 178.4 194 166 L 194 52 Z
    `,

	    logo_phy:`
    M 103.55 37.95 L 127.95 37.95 Q 162.35 37.95 186.5 55 210.9 72.35 210.9 96.5 210.9 120.65 186.5 137.7 162.35 155 127.95 155 L 127.95 237.95 M 127.95 155 
    Q 93.55 155 69.15 137.7 45 120.65 45 96.5 45 72.35 69.15 55 70.9 53.8 72.85 52.85 M 127.95 155 L 127.95 37.95
    `,

	    logo_config:`
    M 204.35 51.65 L 173.25 82.75 Q 192 101.5 192 128 L 236 128 M 192 128 Q 192 154.55 173.25 173.25 L 204.4 204.4 M 51.65 51.65 L 82.75 82.75 Q 101.5 64 128 64 
    L 128 20 M 51.6 204.4 L 82.75 173.25 Q 64 154.55 64 128 L 20 128 M 128 236 L 128 192 Q 101.5 192 82.75 173.25 M 64 128 Q 64 101.5 82.75 82.75 M 173.25 173.25 
    Q 154.55 192 128 192 M 128 64 Q 154.55 64 173.25 82.75
    `,

	    logo_donate:`
    M 171.3 80.3 Q 179.5 62.15 171.3 45.8 164.1 32.5 141.35 30.1 L 94.35 30.1 Q 89.35 30.4 88.3 35.15 L 70.5 148.05 Q 70.2 152.5 73.7 152.6 L 100.95 152.6 107 111.6 Q 108.75 
    106.55 112.6 106.45 130.45 108.05 145.3 103.9 163.35 98.75 171.3 80.3 M 179.8 71.5 Q 178.6 79.75 174.9 87.85 168.45 102.9 151.9 109.15 140.65 113.95 117.55 113 113.15 
    112.75 111 117.45 L 102.7 169.95 Q 102.45 173.8 105.5 173.85 L 128.95 173.85 Q 132.2 174.2 133.35 169.65 L 138.3 139.95 Q 139.75 135.6 143.1 135.5 146.6 135.75 150.6 135.65 
    154.55 135.5 157.35 135.1 160.15 134.7 166.75 132.35 181.35 127.4 187.9 111.2 194.25 95.75 189.5 81.95 186.75 74.85 179.8 71.5 M 103.5 209.9 Q 103.5 202.85 99.7 198.85 95.95 
    194.75 89.4 194.75 82.8 194.75 79.05 198.85 75.3 202.9 75.3 209.9 75.3 216.85 79.05 220.95 82.8 225.05 89.4 225.05 95.95 225.05 99.7 221 103.5 216.95 103.5 209.9 M 95.45 205.5 
    Q 95.95 207.3 95.95 209.9 95.95 212.65 95.45 214.35 94.95 216 94 217.3 93.1 218.45 91.9 219 90.7 219.55 89.4 219.55 88.15 219.55 86.95 219.05 85.75 218.55 84.8 217.3 83.9 216.15 
    83.4 214.35 82.85 212.6 82.85 209.9 82.85 207.3 83.4 205.45 83.95 203.55 84.85 202.45 85.9 201.2 86.95 200.75 88.05 200.25 89.4 200.25 90.7 200.25 91.85 200.8 93.05 201.3 94 202.5 
    94.9 203.65 95.45 205.5 M 153.3 195.35 L 145.3 195.35 135.5 224.45 142.8 224.45 144.6 218.5 153.75 218.5 155.6 224.45 163.1 224.45 153.3 195.35 M 152.15 213.25 L 146.25 213.25 
    149.2 203.65 152.15 213.25 M 116.75 195.35 L 107.8 195.35 107.8 224.45 114.5 224.45 114.5 204.2 125.7 224.45 132.75 224.45 132.75 195.35 126.05 195.35 126.05 212.05 116.75 195.35 M 
    66.5 197.65 Q 64.15 196.15 61.45 195.75 58.8 195.35 55.75 195.35 L 46.7 195.35 46.7 224.45 55.8 224.45 Q 58.8 224.45 61.5 224.05 64.15 223.6 66.4 222.15 69.15 220.45 70.9 217.2 
    72.7 214 72.7 209.95 72.7 205.7 71 202.6 69.35 199.5 66.5 197.65 M 64.2 205 Q 65.2 207 65.2 209.9 65.2 212.75 64.25 214.75 63.3 216.75 61.5 217.85 60 218.85 58.3 218.9 56.6 219 
    54.15 219 L 54 219 54 200.8 54.15 200.8 Q 56.4 200.8 58.05 200.9 59.7 200.95 61.15 201.75 63.2 202.95 64.2 205 M 210.2 195.35 L 190.5 195.35 190.5 224.45 210.2 224.45 210.2 218.9 
    197.75 218.9 197.75 211.55 209.2 211.55 209.2 206 197.75 206 197.75 200.9 210.2 200.9 210.2 195.35 M 187.5 195.35 L 163 195.35 163 200.9 171.6 200.9 171.6 224.45 178.9 224.45 178.9 
    200.9 187.5 200.9 187.5 195.35 Z
    `,

	};

	T.setText();

	const Tools = T;

	///https://wicg.github.io/file-system-access/#api-filesystemfilehandle-getfile


	class Files {

	    //-----------------------------
	    //  FILE TYPE
	    //-----------------------------

	    static autoTypes( type ) {

	        let t = [];

	        switch( type ){
	            case 'svg':
	            t = [ { accept: { 'image/svg+xml': '.svg'} }, ];
	            break;
	            case 'wav':
	            t = [ { accept: { 'audio/wav': '.wav'} }, ];
	            break;
	            case 'mp3':
	            t = [ { accept: { 'audio/mpeg': '.mp3'} }, ];
	            break;
	            case 'mp4':
	            t = [ { accept: { 'video/mp4': '.mp4'} }, ];
	            break;
	            case 'bin': case 'hex':
	            t = [ { description: 'Binary Files', accept: { 'application/octet-stream': ['.bin', '.hex'] } }, ];
	            break;
	            case 'text':
	            t = [ { description: 'Text Files', accept: { 'text/plain': ['.txt', '.text'], 'text/html': ['.html', '.htm'] } }, ];
	            break;
	            case 'json':
	            t = [ { description: 'JSON Files', accept: { 'application/json': ['.json'] } }, ];//text/plain
	            break;
	            case 'js':
	            t = [ { description: 'JavaScript Files', accept: { 'text/javascript': ['.js'] } }, ];
	            break;
	            case 'image':
	            t = [ { description: 'Images', accept: { 'image/*': ['.png', '.gif', '.jpeg', '.jpg'] } }, ];
	            break;
	            case 'icon':
	            t = [ { description: 'Icons', accept: { 'image/x-ico': ['.ico'] } }, ];
	            break;
	            case 'lut':
	            t = [ { description: 'Lut', accept: { 'text/plain': ['.cube', '.3dl'] } }, ];
	            break;

	        }

	        return t

	    }


	    //-----------------------------
	    //  LOAD
	    //-----------------------------

		static async load( o = {} ) {

	        if (typeof window.showOpenFilePicker !== 'function') {
	            window.showOpenFilePicker = Files.showOpenFilePickerPolyfill;
	        }

	        try {

	        	let type = o.type || '';

	            const options = {
	                excludeAcceptAllOption: type ? true : false,
	                multiple: false,
	                //startIn:'./assets'
	            };

	            options.types = Files.autoTypes( type );

	            // create a new handle
	            const handle = await window.showOpenFilePicker( options );
	            const file = await handle[0].getFile();
	            //let content = await file.text()

	            if( !file ) return null

	            let fname = file.name;
	            let ftype = fname.substring( fname.lastIndexOf('.')+1, fname.length );

	            const dataUrl = [ 'png', 'jpg', 'jpeg', 'mp4', 'webm', 'ogg', 'mp3' ];
	            const dataBuf = [ 'sea', 'z', 'hex', 'bvh', 'BVH', 'glb', 'gltf' ];
	            const reader = new FileReader();

	            if( dataUrl.indexOf( ftype ) !== -1 ) reader.readAsDataURL( file );
	            else if( dataBuf.indexOf( ftype ) !== -1 ) reader.readAsArrayBuffer( file );
	            else reader.readAsText( file );

	            reader.onload = function(e) {

	                let content = e.target.result;

	                switch(type){
	                    case 'image':
	                        let img = new Image;
	                        img.onload = function() {
	                            if( o.callback ) o.callback( img, fname, ftype );
	                        };
	                        img.src = content;
	                    break;
	                    case 'json':
	                        if( o.callback ) o.callback( JSON.parse( content ), fname, ftype );
	                    break;
	                    default:
	                        if( o.callback ) o.callback( content, fname, ftype );
	                    break;
	                }

	            };

	        } catch(e) {

	            console.log(e);
	            if( o.always && o.callback ) o.callback( null );

	        }

	    }

		static showOpenFilePickerPolyfill( options ) {
	        return new Promise((resolve) => {
	            const input = document.createElement("input");
	            input.type = "file";
	            input.multiple = options.multiple;
	            input.accept = options.types
	                .map((type) => type.accept)
	                .flatMap((inst) => Object.keys(inst).flatMap((key) => inst[key]))
	                .join(",");

	            input.addEventListener("change", () => {
	                resolve(
	                    [...input.files].map((file) => {
	                        return {
	                            getFile: async () =>
	                                new Promise((resolve) => {
	                                    resolve(file);
	                                }),
	                        };
	                    })
	                );
	            });

	            input.click();
	        })
	    }


	    //-----------------------------
	    //  SAVE
	    //-----------------------------

	    static async save( o = {} ) {

	        let usePoly = false;

	        if (typeof window.showSaveFilePicker !== 'function') {
	            window.showSaveFilePicker = Files.showSaveFilePickerPolyfill;
	            usePoly = true;
	        }

	        try {

	            let type = o.type || '';

	            const options = {
	                suggestedName: o.name || 'hello',
	                data: o.data || ''
	            };

	            options.types = Files.autoTypes( type );
	            options.finalType = Object.keys( options.types[0].accept )[0];
	            options.suggestedName += options.types[0].accept[options.finalType][0];


	            // create a new handle
	            const handle = await window.showSaveFilePicker( options );

	            if( usePoly ) return

	            // create a FileSystemWritableFileStream to write to
	            const file = await handle.createWritable();

	            let blob = new Blob([ options.data ], { type: options.finalType });

	            // write our file
	            await file.write(blob);

	            // close the file and write the contents to disk.
	            await file.close();

	        } catch(e) {

	            console.log(e);

	        }

	    }

	    static showSaveFilePickerPolyfill( options ) {
	        return new Promise((resolve) => {
	            const a = document.createElement("a");
	            a.download = options.suggestedName || "my-file.txt";
	            let blob = new Blob([ options.data ], { type:options.finalType });
	            a.href = URL.createObjectURL( blob );

	            a.addEventListener("click", () => {
	                resolve(
	                    setTimeout( () => URL.revokeObjectURL(a.href), 1000 )
	                );
	            });
	            a.click();
	        })
	    }


	    //-----------------------------
	    //  FOLDER not possible in poly
	    //-----------------------------

	    static async getFolder() {

	        try {
	    
	            const handle = await window.showDirectoryPicker();
	            const files = [];
	            for await (const entry of handle.values()) {
	                const file = await entry.getFile();
	                files.push(file);
	            }

	            console.log(files);
	            return files;

	        } catch(e) {

	            console.log(e);

	        }
	    
	    }








	    

	}

	class V2 {

		constructor( x = 0, y = 0 ) {

			this.x = x;
			this.y = y;

		}

		set ( x, y ) {

			this.x = x;
			this.y = y;
			return this;

		}

		divide ( v ) {

			this.x /= v.x;
			this.y /= v.y;
			return this;

		}

		multiply ( v ) {

			this.x *= v.x;
			this.y *= v.y;
			return this;

		}

		multiplyScalar ( scalar ) {

			this.x *= scalar;
			this.y *= scalar;
			return this;

		}

		divideScalar ( scalar ) {

			return this.multiplyScalar( 1 / scalar );

		}

		length () {

			return Math.sqrt( this.x * this.x + this.y * this.y );

		}

		angle () {

			// computes the angle in radians with respect to the positive x-axis

			var angle = Math.atan2( this.y, this.x );

			if ( angle < 0 ) angle += 2 * Math.PI;

			return angle;

		}

		addScalar ( s ) {

			this.x += s;
			this.y += s;
			return this;

		}

		negate () {

			this.x *= -1;
			this.y *= -1;
			return this;

		}

		neg () {

			this.x = -1;
			this.y = -1;
			return this;

		}

		isZero () {

			return ( this.x === 0 && this.y === 0 );

		}

		copy ( v ) {

			this.x = v.x;
			this.y = v.y;

			return this;

		}

		equals ( v ) {

			return ( ( v.x === this.x ) && ( v.y === this.y ) );

		}

		nearEquals ( v, n ) {

			return ( ( v.x.toFixed(n) === this.x.toFixed(n) ) && ( v.y.toFixed(n) === this.y.toFixed(n) ) );

		}

		lerp ( v, alpha ) {

			if( v === null ){
				this.x -= this.x * alpha;
			    this.y -= this.y * alpha;
			} else {
				this.x += ( v.x - this.x ) * alpha;
			    this.y += ( v.y - this.y ) * alpha;
			}

			return this;

		}

	}

	/**
	 * @author lth / https://github.com/lo-th
	 */

	class Proto {
	  constructor(o = {}) {
	    // disable mouse controle
	    this.lock = o.lock || false;

	    // for button
	    this.neverlock = false;

	    // only simple space
	    this.isSpace = o.isSpace || false;

	    // if is on gui or group
	    this.main = o.main || null;
	    this.isUI = o.isUI || false;
	    this.group = o.group || null;

	    this.isListen = false;

	    this.top = 0;
	    this.ytop = 0;

	    this.dx = o.dx || 0;

	    this.isSelectable = o.selectable !== undefined ? o.selectable : false;
	    this.unselectable =
	      o.unselect !== undefined ? o.unselect : this.isSelectable;

	    this.ontop = o.ontop ? o.ontop : false; // 'beforebegin' 'afterbegin' 'beforeend' 'afterend'

	    this.css = this.main ? this.main.css : Tools.css;

	    this.colors = Tools.defineColor(
	      o,
	      this.main
	        ? this.group
	          ? this.group.colors
	          : this.main.colors
	        : Tools.colors
	    );

	    this.overEffect = this.colors.showOver;

	    this.svgs = Tools.svgs;

	    this.zone = { x: 0, y: 0, w: 0, h: 0, d: 0 };
	    this.local = new V2().neg();

	    this.isCanvasOnly = false;
	    this.isSelect = false;

	    // percent of title
	    this.p = o.p !== undefined ? o.p : Tools.size.p;

	    this.w = this.isUI ? this.main.size.w : Tools.size.w;
	    if (o.w !== undefined) this.w = o.w;

	    this.h = this.isUI ? this.main.size.h : Tools.size.h;
	    if (o.h !== undefined) this.h = o.h;
	    if (!this.isSpace) this.h = this.h < 11 ? 11 : this.h;
	    else this.lock = true;

	    // decale for canvas only
	    this.fw = o.fw || 0;

	    this.autoWidth = o.auto || true; // auto width or flex
	    this.isOpen = false; //false// open statu

	    // radius for toolbox
	    this.radius = o.radius || this.colors.radius;

	    this.transition = o.transition || Tools.transition;

	    // only for number
	    this.isNumber = false;
	    this.noNeg = o.noNeg || false;
	    this.allEqual = o.allEqual || false;

	    // only most simple
	    this.mono = false;

	    // stop listening for edit slide text
	    this.isEdit = false;

	    // no title
	    this.simple = o.simple || false;
	    if (this.simple) this.sa = 0;

	    // define obj size
	    this.setSize(this.w);

	    // title size
	    if (o.sa !== undefined) this.sa = o.sa;
	    if (o.sb !== undefined) this.sb = o.sb;
	    if (this.simple) this.sb = this.w - this.sa;

	    // last number size for slide
	    this.sc = o.sc === undefined ? 47 : o.sc;

	    // for listening object
	    this.objectLink = null;
	    this.isSend = false;
	    this.objectKey = null;

	    this.txt = o.name || "";
	    this.name = o.rename || this.txt;
	    this.target = o.target || null;

	    // callback
	    this.callback = o.callback === undefined ? null : o.callback;
	    this.endCallback = null;
	    this.openCallback = o.openCallback === undefined ? null : o.openCallback;
	    this.closeCallback = o.closeCallback === undefined ? null : o.closeCallback;

	    // if no callback take one from group or gui
	    if (this.callback === null && this.isUI && this.main.callback !== null) {
	      this.callback = this.group ? this.group.callback : this.main.callback;
	    }

	    // elements
	    this.c = [];

	    // style
	    this.s = [];

	    this.useFlex = this.isUI ? this.main.useFlex : false;
	    let flexible = this.useFlex
	      ? "display:flex; justify-content:center; align-items:center; text-align:center; flex: 1 100%;"
	      : "float:left;";

	    this.c[0] = Tools.dom(
	      "div",
	      this.css.basic + flexible + "position:relative; height:20px;"
	    );

	    this.s[0] = this.c[0].style;

	    // bottom margin
	    this.margin = this.colors.sy;
	    this.mtop = 0;
	    let marginDiv = Tools.isDivid(this.margin);

	    if (this.isUI && this.margin) {
	      this.s[0].boxSizing = "content-box";
	      if (marginDiv) {
	        this.mtop = this.margin * 0.5;
	        //this.s[0].borderTop = '${this.mtop}px solid transparent'
	        //console.log(`${this.mtop}px solid transparent`)
	        this.s[0].borderTop = this.mtop + "px solid transparent";
	        this.s[0].borderBottom = this.mtop + "px solid transparent";
	      } else {
	        this.s[0].borderBottom = this.margin + "px solid transparent";
	      }
	    }

	    // with title
	    if (!this.simple) {
	      this.c[1] = Tools.dom("div", this.css.txt + this.css.middle);
	      this.s[1] = this.c[1].style;
	      this.c[1].textContent = this.name;
	      this.s[1].color = this.lock ? this.colors.titleoff : this.colors.title;
	    }

	    if (o.pos) {
	      this.s[0].position = "absolute";
	      for (let p in o.pos) {
	        this.s[0][p] = o.pos[p];
	      }
	      this.mono = true;
	    }

	    if (o.css) this.s[0].cssText = o.css;
	  }

	  // ----------------------
	  // make the node
	  // ----------------------

	  init() {
	    this.ytop = this.top + this.mtop;

	    this.zone.h = this.h + this.margin;
	    this.zone.w = this.w;

	    let s = this.s; // style cache
	    let c = this.c; // div cach

	    s[0].height = this.h + "px";

	    if (this.isUI) s[0].background = this.colors.background;

	    if (!this.autoWidth && this.useFlex) {
	      s[0].flex = "1 0 auto";
	      s[0].minWidth = this.minw + "px";
	      s[0].textAlign = "center";
	    } else {
	      if (this.isUI) s[0].width = "100%";
	    }

	    //if( this.autoHeight ) s[0].transition = 'height 0.01s ease-out';
	    if (c[1] !== undefined && this.autoWidth) {
	      s[1] = c[1].style;
	      s[1].top = 1 + "px";
	      s[1].height = this.h - 2 + "px";
	    }

	    let frag = Tools.frag;

	    for (let i = 1, lng = c.length; i !== lng; i++) {
	      if (c[i] !== undefined) {
	        frag.appendChild(c[i]);
	        s[i] = c[i].style;
	      }
	    }

	    let pp =
	      this.target !== null
	        ? this.target
	        : this.isUI
	        ? this.main.inner
	        : document.body;

	    if (this.ontop) pp.insertAdjacentElement("afterbegin", c[0]);
	    else pp.appendChild(c[0]);

	    c[0].appendChild(frag);

	    this.rSize();

	    // ! solo proto
	    if (!this.isUI) {
	      this.c[0].style.pointerEvents = "auto";
	      Roots.add(this);
	    }
	  }

	  addTransition() {
	    if (this.baseH && this.transition && this.isUI) {
	      this.c[0].style.transition = "height " + this.transition + "s ease-out";
	    }
	  }

	  // from Tools

	  dom(type, css, obj, dom, id) {
	    return Tools.dom(type, css, obj, dom, id);
	  }

	  setSvg(dom, type, value, id, id2) {
	    Tools.setSvg(dom, type, value, id, id2);
	  }

	  setCss(dom, css) {
	    Tools.setCss(dom, css);
	  }

	  clamp(value, min, max) {
	    return Tools.clamp(value, min, max);
	  }

	  getColorRing() {
	    if (!Tools.colorRing) Tools.makeColorRing();
	    return Tools.clone(Tools.colorRing);
	  }

	  getJoystick(model) {
	    if (!Tools["joystick_" + model]) Tools.makeJoystick(model);
	    return Tools.clone(Tools["joystick_" + model]);
	  }

	  getCircular(model) {
	    if (!Tools.circular) Tools.makeCircular(model);
	    return Tools.clone(Tools.circular);
	  }

	  getKnob(model) {
	    if (!Tools.knob) Tools.makeKnob(model);
	    return Tools.clone(Tools.knob);
	  }

	  getPad2d(model) {
	    if (!Tools.pad2d) Tools.makePad(model);
	    return Tools.clone(Tools.pad2d);
	  }

	  // from Roots

	  cursor(name) {
	    Roots.cursor(name);
	  }

	  /////////

	  update() {}

	  reset() {}

	  /////////

	  content() {
	    return this.c[0];
	  }

	  getDom() {
	    return this.c[0];
	  }

	  uiout() {
	    if (this.lock) return;
	    if (!this.overEffect) return;
	    if (this.s) this.s[0].background = this.colors.background;
	  }

	  uiover() {
	    if (this.lock) return;
	    if (!this.overEffect) return;
	    if (this.s) this.s[0].background = this.colors.backgroundOver;
	  }

	  rename(s) {
	    if (this.c[1] !== undefined) this.c[1].textContent = s;
	  }

	  listen() {
	    this.isListen = Roots.addListen(this);
	    return this;
	  }

	  listening() {
	    // modified by Fedemarino
	    if (this.objectLink === null) return;
	    if (this.isSend) return;
	    if (this.isEdit) return;
	    // check if value has changed
	    let hasChanged = this.setValue(this.objectLink[this.objectKey]);
	    return hasChanged;
	  }

	  setValue(v) {
	    const old = this.value;
	    if (this.isNumber) this.value = this.numValue(v);
	    //else if( v instanceof Array && v.length === 1 ) v = v[0];
	    else this.value = v;
	    this.update();
	    let hasChanged = false;
	    if (old !== this.value) {
	      hasChanged = true;
	    }

	    return hasChanged;
	  }

	  // ----------------------
	  // update every change
	  // ----------------------

	  onChange(f) {
	    if (this.isSpace) return;
	    this.callback = f || null;
	    return this;
	  }

	  // ----------------------
	  // update only on end
	  // ----------------------

	  onFinishChange(f) {
	    if (this.isSpace) return;
	    this.callback = null;
	    this.endCallback = f;
	    return this;
	  }

	  // ----------------------
	  // event on open close
	  // ----------------------

	  onOpen(f) {
	    this.openCallback = f;
	    return this;
	  }

	  onClose(f) {
	    this.closeCallback = f;
	    return this;
	  }

	  // ----------------------
	  //  send back value
	  // ----------------------

	  send(v) {
	    v = v || this.value;
	    if (v instanceof Array && v.length === 1) v = v[0];

	    this.isSend = true;
	    if (this.objectLink !== null) this.objectLink[this.objectKey] = v;
	    if (this.callback) this.callback(v, this.objectKey);
	    this.isSend = false;
	  }

	  sendEnd(v) {
	    v = v || this.value;
	    if (v instanceof Array && v.length === 1) v = v[0];

	    if (this.endCallback) this.endCallback(v);
	    if (this.objectLink !== null) this.objectLink[this.objectKey] = v;
	  }

	  // ----------------------
	  // clear node
	  // ----------------------

	  dispose() {
	    if (this.isListen) Roots.removeListen(this);

	    Tools.clear(this.c[0]);

	    if (this.target !== null) {
	      if (this.group !== null) this.group.clearOne(this);
	      else this.target.removeChild(this.c[0]);
	    } else {
	      if (this.isUI) this.main.clearOne(this);
	      else document.body.removeChild(this.c[0]);
	    }

	    if (!this.isUI) Roots.remove(this);

	    this.c = null;
	    this.s = null;
	    this.callback = null;
	    this.target = null;
	    this.isListen = false;
	  }

	  clear() {}

	  // ----------------------
	  // change size
	  // ----------------------

	  getWidth() {
	    let nw = Roots.getWidth(this);
	    if (nw) this.w = nw;
	  }

	  setSize(sx) {
	    if (!this.autoWidth) return;

	    this.w = sx;

	    if (this.simple) {
	      this.sb = this.w - this.sa;
	    } else {
	      let pp = this.w * (this.p / 100);
	      //this.sa = Math.floor( pp + 10 )
	      //this.sb = Math.floor( this.w - pp - 20 )
	      this.sa = Math.floor(pp + 8);
	      this.sb = Math.floor(this.w - pp - 16);
	    }
	  }

	  rSize() {
	    if (!this.autoWidth) return;
	    if (!this.isUI) this.s[0].width = this.w + "px";
	    if (!this.simple) this.s[1].width = this.sa + "px";
	  }

	  // ----------------------
	  // for numeric value
	  // ----------------------

	  setTypeNumber(o) {
	    this.isNumber = true;

	    this.value = 0;
	    if (o.value !== undefined) {
	      if (typeof o.value === "string") this.value = o.value * 1;
	      else this.value = o.value;
	    }

	    this.min = o.min === undefined ? -Infinity : o.min;
	    this.max = o.max === undefined ? Infinity : o.max;
	    this.precision = o.precision === undefined ? 2 : o.precision;

	    let s;

	    switch (this.precision) {
	      case 0:
	        s = 1;
	        break;
	      case 1:
	        s = 0.1;
	        break;
	      case 2:
	        s = 0.01;
	        break;
	      case 3:
	        s = 0.001;
	        break;
	      case 4:
	        s = 0.0001;
	        break;
	      case 5:
	        s = 0.00001;
	        break;
	      case 6:
	        s = 0.000001;
	        break;
	    }

	    this.step = o.step === undefined ? s : o.step;
	    this.range = this.max - this.min;
	    this.value = this.numValue(this.value);
	  }

	  numValue(n) {
	    if (this.noNeg) n = Math.abs(n);
	    return (
	      Math.min(this.max, Math.max(this.min, n)).toFixed(this.precision) * 1
	    );
	  }

	  // ----------------------
	  //   EVENTS DEFAULT
	  // ----------------------

	  handleEvent(e) {
	    if (this.lock) return;
	    if (this.neverlock) Roots.lock = false;
	    if (!this[e.type])
	      return console.error(e.type, "this type of event no existe !");

	    // TODO !!!!

	    //if( this.marginDiv ) z.d -= this.margin * 0.5

	    //if( this.marginDiv ) e.clientY -= this.margin * 0.5
	    //if( this.group && this.group.marginDiv ) e.clientY -= this.group.margin * 0.5

	    return this[e.type](e);
	  }

	  wheel(e) {
	    return false;
	  }
	  mousedown(e) {
	    return false;
	  }
	  mousemove(e) {
	    return false;
	  }
	  mouseup(e) {
	    return false;
	  }
	  keydown(e) {
	    return false;
	  }
	  keyup(e) {
	    return false;
	  }

	  // ----------------------
	  // object referency
	  // ----------------------

	  setReferency(obj, key) {
	    this.objectLink = obj;
	    this.objectKey = key;
	  }

	  display(v = false) {
	    this.s[0].visibility = v ? "visible" : "hidden";
	  }

	  // ----------------------
	  // resize height
	  // ----------------------

	  open() {
	    if (this.isOpen) return;
	    this.isOpen = true;
	    Roots.needResize = true;
	    if (this.openCallback) this.openCallback();
	  }

	  close() {
	    if (!this.isOpen) return;
	    this.isOpen = false;
	    Roots.needResize = true;
	    if (this.closeCallback) this.closeCallback();
	  }

	  needZone() {
	    Roots.needReZone = true;
	  }

	  rezone() {
	    Roots.needReZone = true;
	  }

	  // ----------------------
	  //  INPUT
	  // ----------------------

	  select() {}

	  unselect() {}

	  setInput(Input) {
	    Roots.setInput(Input, this);
	  }

	  upInput(x, down) {
	    return Roots.upInput(x, down);
	  }

	  // ----------------------
	  // special item
	  // ----------------------

	  selected(b) {
	    this.isSelect = b || false;
	  }
	}

	class Bool extends Proto {

	    constructor( o = {} ) {

	        super( o );
	        
	        this.value = o.value || false;
	        this.model = o.mode !== undefined ? o.mode : 0;

	        this.onName = o.rename || this.txt;
	        if( o.onName ) o.onname = o.onName;
	        if( o.onname ) this.onName = o.onname;

	        this.inh = o.inh || Math.floor( this.h*0.8 );
	        this.inw = o.inw || 36;

	        let cc = this.colors;
	       
	        if( this.model === 0 ){
	            let t = Math.floor(this.h*0.5)-((this.inh-2)*0.5);
	            this.c[2] = this.dom( 'div', this.css.basic + 'background:'+ cc.inputBg +'; height:'+(this.inh-2)+'px; width:'+this.inw+'px; top:'+t+'px; border-radius:10px; border:2px solid '+ cc.back );
	            this.c[3] = this.dom( 'div', this.css.basic + 'height:'+(this.inh-6)+'px; width:16px; top:'+(t+2)+'px; border-radius:10px; background:'+ cc.button+';' );
	        } else {
	            this.p = 0;
	            if( this.c[1] !== undefined ) this.c[1].textContent = '';
	            this.c[2] = this.dom( 'div', this.css.txt + this.css.button + 'top:1px; background:'+cc.button+'; height:'+(this.h-2)+'px; border:'+cc.borderSize+'px solid '+cc.border+'; border-radius:'+this.radius+'px;' );
	        }

	        this.stat = -1;

	        this.init();
	        this.update();

	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    mousedown ( e ) {

	        this.value = !this.value;
	        this.update( true );
	        return this.mousemove( e )

	    }

	    mousemove ( e ) {

	        this.cursor('pointer');
	        return this.mode( true )
	        
	    }

	    reset () {

	        this.cursor();
	        return this.mode()

	    }

	    // ----------------------
	    //   MODE
	    // ----------------------

	    mode ( over ) {

	        let change = false;
	        let cc = this.colors, s = this.s, n, v = this.value;

	        if( over ) n = v ? 4 : 3;
	        else n = v ? 2 : 1;

	        if( this.stat !== n ){

	            this.stat = n;

	            if( this.model !== 0 ){

	                switch( n ){

	                    case 1: s[2].color = cc.text; s[2].background = cc.button; break;
	                    case 2: s[2].color = cc.textSelect; s[2].background = cc.select; break;
	                    case 3: s[2].color = cc.textOver; s[2].background = cc.overoff; break;
	                    case 4: s[2].color = cc.textOver; s[2].background = cc.over; break;

	                }

	                this.c[2].innerHTML = v ? this.onName : this.name;

	            } else {

	                switch( n ){

	                    case 1: s[2].background = s[2].borderColor = cc.backoff; s[3].background = cc.button; break;// off out
	                    case 2: s[2].background = s[2].borderColor = cc.back; s[3].background = cc.textOver; break;// on over
	                    case 3: s[2].background = s[2].borderColor = cc.back; s[3].background = cc.overoff; break;// off over
	                    case 4: s[2].background = s[2].borderColor = cc.backoff; s[3].background = cc.textSelect; break;// on out

	                }

	                s[3].marginLeft = v ? '17px' : '2px';
	                this.c[1].textContent = v ? this.onName : this.name;

	            }

	            change = true;

	        }

	        return change

	    }

	    // ----------------------

	    update ( up ) {

	        this.mode();
	        if( up ) this.send();
	            
	    }

	    rSize () {

	        super.rSize();

	        let s = this.s;
	        let w = (this.w - 10 ) - this.inw;
	        if( this.model === 0 ){
	            s[2].left = w + 'px';
	            s[3].left = w + 'px';
	        } else {
	            s[2].left = this.sa + 'px';
	            s[2].width = this.sb  + 'px';
	        }
	        
	    }

	}

	class Button extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        this.value = '';
	        if( o.value !== undefined ) this.value = o.value;

	        this.values = o.value || this.txt;
	        if( o.values ) this.values = o.values;

	        if( !o.values && !o.value ) this.txt = '';

	        this.onName = o.onName || null;

	        this.on = false;

	        // force button width
	        this.bw = o.forceWidth || 0;
	        if(o.bw) this.bw = o.bw;
	        this.space = o.space || 3;

	        if( typeof this.values === 'string' ) this.values = [ this.values ];

	        this.isDown = false;
	        this.neverlock = true;
	        this.res = 0;

	        this.lng = this.values.length;
	        this.tmp = [];
	        this.stat = [];

	        let sel, cc = this.colors;

	        for( let i = 0; i < this.lng; i++ ){

	            sel = false;
	            if( this.values[i] === this.value && this.isSelectable ) sel = true;

	            this.c[i+2] = this.dom( 'div', this.css.txt + this.css.button + 'top:1px; height:'+(this.h-2)+'px; border:'+cc.borderSize+'px solid '+cc.border+'; border-radius:'+this.radius+'px;' );
	            this.c[i+2].style.background = sel ? cc.select : cc.button;
	            this.c[i+2].style.color = sel ? cc.textSelect : cc.text;
	            this.c[i+2].innerHTML = this.values[i];
	            this.stat[i] = sel ? 3:1;

	        }


	        if( this.txt==='' ) this.p = 0; 

	        if( (!o.value && !o.values) || this.p === 0 ){
	            if( this.c[1] !== undefined ) this.c[1].textContent = '';
	        } 
	        

	        this.init();

	    }

	    onOff() {

	        this.on = !this.on;
	        this.label( this.on ? this.onName : this.value );
	        
	    }

	    testZone ( e ) {

	        let l = this.local;
	        if( l.x === -1 && l.y === -1 ) return -1

	        let i = this.lng;
	        let t = this.tmp;
	        
	        while( i-- ){
	        	if( l.x>t[i][0] && l.x<t[i][2] ) return i
	        }

	        return -1

	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    mouseup ( e ) {

	        if( !this.isDown ) return false

	        this.isDown = false;
	        if( this.res !== -1 ){
	            if( this.value === this.values[this.res] && this.unselectable ) this.value = '';
	            else this.value = this.values[this.res];
	            if( this.onName !== null ) this.onOff();
	            this.send();
	        }

	        return this.mousemove( e )

	    }

	    mousedown ( e ) {

	        if( this.isDown ) return false
	        this.isDown = true;
	    	return this.mousemove( e )

	    }

	    mousemove ( e ) {

	        let up = false;
	        this.res = this.testZone( e );

	        if( this.res !== -1 ){
	            this.cursor('pointer');
	            up = this.modes( this.isDown ? 3 : 2, this.res );
	        } else {
	        	up = this.reset();
	        }

	        return up

	    }

	    // ----------------------

	    modes ( N = 1, id = -1 ) {

	        let i = this.lng, w, n, r = false;

	        while( i-- ){

	            n = N;
	            w = this.isSelectable ? this.values[ i ] === this.value : false;
	            
	            if( i === id ){
	                if( w && n === 2 ) n = 3; 
	            } else {
	                n = 1;
	                if( w ) n = 4;
	            }

	            //if( this.mode( n, i ) ) r = true
	            r = this.mode( n, i );

	        }

	        return r

	    }

	    mode ( n, id ) {

	        //if(!this.s) return false
	 
	        let change = false;
	        let cc = this.colors, s = this.s;
	        let i = id+2;

	        if( this.stat[id] !== n ){

	            this.stat[id] = n;
	        
	            switch( n ){

	                case 1: s[i].color = cc.text; s[i].background = cc.button; break
	                case 2: s[i].color = cc.textOver; s[i].background = cc.overoff; break
	                case 3: s[i].color = cc.textOver; s[i].background = cc.over; break
	                case 4: s[i].color = cc.textSelect; s[i].background = cc.select; break

	            }

	            change = true;

	        }

	        return change

	    }

	    // ----------------------

	    reset () {

	        this.res = -1;
	        this.cursor();
	        return this.modes()

	    }

	    label ( string, n ) {

	        n = n || 2;
	        this.c[n].textContent = string;

	    }

	    switchValues( n, string ){
	        this.c[n+2].innerHTML = this.values[n] = string;
	    }

	    icon ( string, y = 0, n = 2 ) {

	        //if(y) this.s[n].margin = ( y ) +'px 0px';
	        this.s[n].padding = ( y ) +'px 0px';
	        this.c[n].innerHTML = string;

	        return this

	    }

	    rSize () {

	        super.rSize();

	        let s = this.s;
	        let w = this.sb;
	        let d = this.sa;

	        let i = this.lng;
	        let sx = this.colors.sx; //this.space;
	        //let size = Math.floor( ( w-(dc*(i-1)) ) / i );
	        let size = ( w-(sx*(i-1)) ) / i; 

	        if( this.bw ){ 
	            size = this.bw < size ? this.bw : size;
	            //d = Math.floor((this.w-( (size * i) + (dc * (i-1)) ))*0.5)
	            d = ((this.w-( (size * i) + (sx * (i-1)) ))*0.5);
	        }

	        while( i-- ){

	        	//this.tmp[i] = [ Math.floor( d + ( size * i ) + ( dc * i )), size ];
	            this.tmp[i] = [ ( d + ( size * i ) + ( sx * i )), size ];
	        	this.tmp[i][2] = this.tmp[i][0] + this.tmp[i][1];

	            s[i+2].left = this.tmp[i][0] + 'px';
	            s[i+2].width = this.tmp[i][1] + 'px';

	        }

	    }

	}

	class Circular extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        this.isCyclic = o.cyclic || false;
	        this.model = o.stype || 0;
	        if( o.mode !== undefined ) this.model = o.mode;

	        this.autoWidth = false;
	        this.minw = this.w;
	        this.diam = o.diam || this.w; 

	        this.setTypeNumber( o );

	        this.twoPi = Tools.TwoPI;
	        this.pi90 = Tools.pi90;

	        this.offset = new V2();

	        this.h = o.h || this.w + 10;

	        this.c[0].style.width = this.w +'px';
	        this.c[0].style.display = 'block';

	        if(this.c[1] !== undefined) {

	            this.c[1].style.width = '100%';
	            this.c[1].style.justifyContent = 'center';
	            this.top = 10;
	            this.h += 10;

	        }



	        this.percent = 0;
	        this.cmode = 0;
	        let cc = this.colors;

	        this.c[2] = this.dom( 'div', this.css.txt + 'justify-content:center; top:'+(this.h-20)+'px; width:100%; color:'+ cc.text );

	        // svg
	        
	        this.c[3] = this.getCircular();

	        this.setSvg( this.c[3], 'stroke', cc.back, 0 );
	        this.setSvg( this.c[3], 'd', this.makePath(), 1 );
	        this.setSvg( this.c[3], 'stroke', cc.text, 1 );

	        this.setSvg( this.c[3], 'viewBox', '0 0 '+this.diam+' '+this.diam );
	        this.setCss( this.c[3], { width:this.diam, height:this.diam, left:0, top:this.top });

	        this.init();
	        this.update();

	    }

	    mode ( mode ) {

	        if( this.cmode === mode ) return false;

	        let cc = this.colors;
	        let color;

	        switch( mode ){
	            case 0: // base

	                this.s[2].color = cc.text;
	                this.setSvg( this.c[3], 'stroke', cc.back, 0);
	                color = this.model > 0 ? Tools.pack( Tools.lerpColor( Tools.unpack( Tools.ColorLuma( cc.text, -0.75) ), Tools.unpack( cc.text ), this.percent ) ) : cc.text;
	                this.setSvg( this.c[3], 'stroke', color, 1 );
	                
	            break;
	            case 1: // down

	                this.s[2].color = cc.textOver;
	                this.setSvg( this.c[3], 'stroke', cc.backoff, 0);
	                color = this.model > 0 ? Tools.pack( Tools.lerpColor( Tools.unpack( Tools.ColorLuma( cc.text, -0.75) ), Tools.unpack( cc.text ), this.percent ) ) : cc.textOver;
	                this.setSvg( this.c[3], 'stroke', color, 1 );
	                
	            break;
	        }

	        this.cmode = mode;
	        return true;

	    }

	    reset () {

	        this.isDown = false;
	        
	    }

	    testZone ( e ) {

	        let l = this.local;
	        if( l.x === -1 && l.y === -1 ) return '';
	        
	        if( l.y <= this.c[ 1 ].offsetHeight ) return 'title';
	        else if ( l.y > this.h - this.c[ 2 ].offsetHeight ) return 'text';
	        else return 'circular';

	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    mouseup ( e ) {

	        this.isDown = false;
	        this.sendEnd();
	        return this.mode(0);

	    }

	    mousedown ( e ) {

	        this.isDown = true;
	        this.old = this.value;
	        this.oldr = null;
	        this.mousemove( e );
	        return this.mode(1);

	    }

	    mousemove ( e ) {

	        if( !this.isDown ) return;

	        //console.log('over')

	        let off = this.offset;
	        off.x = (this.w*0.5) - ( e.clientX - this.zone.x );
	        off.y = (this.diam*0.5) - ( e.clientY - this.zone.y - this.ytop );

	        this.r = off.angle() - this.pi90;
	        this.r = (((this.r%this.twoPi)+this.twoPi)%this.twoPi);

	        if( this.oldr !== null ){ 

	            let dif = this.r - this.oldr;
	            this.r = Math.abs(dif) > Math.PI ? this.oldr : this.r;

	            if( dif > 6 ) this.r = 0;
	            if( dif < -6 ) this.r = this.twoPi;

	        }

	        let steps = 1 / this.twoPi;
	        let value = this.r * steps;

	        let n = ( ( this.range * value ) + this.min ) - this.old;

	        if(n >= this.step || n <= this.step){ 
	            n = ~~ ( n / this.step );
	            this.value = this.numValue( this.old + ( n * this.step ) );
	            this.update( true );
	            this.old = this.value;
	            this.oldr = this.r;
	        }

	    }

	    wheel ( e ) {

	        let name = this.testZone( e );

	        if( name === 'circular' ) {
	    
	            let v = this.value - this.step * e.delta;
	    
	            if ( v > this.max ) {
	                v = this.isCyclic ? this.min : this.max;
	            } else if ( v < this.min ) {
	                v = this.isCyclic ? this.max : this.min;
	            }
	    
	            this.setValue( v );
	            this.old = v;
	            this.update( true );

	            return true;
	    
	        }
	        return false;

	    }

	    // ----------------------

	    makePath () {

	        let r = 40;
	        let d = 24;
	        let a = this.percent * this.twoPi - 0.001;
	        let x2 = (r + r * Math.sin(a)) + d;
	        let y2 = (r - r * Math.cos(a)) + d;
	        let big = a > Math.PI ? 1 : 0;
	        return "M " + (r+d) + "," + d + " A " + r + "," + r + " 0 " + big + " 1 " + x2 + "," + y2;

	    }

	    update ( up ) {

	        this.c[2].textContent = this.value;
	        this.percent = ( this.value - this.min ) / this.range;

	        this.setSvg( this.c[3], 'd', this.makePath(), 1 );

	        if ( this.model > 0 ) {

	            let cc = this.colors;
	            let color = Tools.pack( Tools.lerpColor( Tools.unpack( Tools.ColorLuma( cc.text, -0.75) ), Tools.unpack( cc.text ), this.percent ) );
	            this.setSvg( this.c[3], 'stroke', color, 1 );
	        
	        }

	        if( up ) this.send();
	        
	    }

	}

	class Color extends Proto {

	    constructor( o = {} ) {

	        super( o );

		    //this.autoHeight = true;

		    this.ctype = o.ctype || 'hex';

		    this.wfixe = 256;

		    this.cw = this.sb > 256 ? 256 : this.sb;
		    if(o.cw != undefined ) this.cw = o.cw;



		    // color up or down
		    this.side = o.side || 'down';
		    this.up = this.side === 'down' ? 0 : 1;
		    
		    this.baseH = this.h;

		    this.offset = new V2();
		    this.decal = new V2();
		    this.pp = new V2();

		    let cc = this.colors;

		   // this.c[2] = this.dom( 'div', this.css.txt + this.css.middle + 'top:1px; height:'+(this.h-2)+'px;' + 'border-radius:'+this.radius+'px; text-shadow:none; border:'+cc.borderSize+'px solid '+cc.border+';' )

		    this.c[2] = this.dom( 'div', `${this.css.txt} ${this.css.middle} top:1px; height:${this.h-2}px; border-radius:${this.radius}px; text-shadow:none; border:${cc.borderSize}px solid ${cc.border};` );
		    //this.s[2] = this.c[2].style;

		    //this.s[2].textShadow = 'none'

		    /*if( this.up ){
		        this.s[2].top = 'auto';
		        this.s[2].bottom = '2px';
		    }*/

		    //this.c[0].style.textAlign = 'center';
		    this.c[0].style.display = 'block';

		    this.c[3] = this.getColorRing();
		    this.c[3].style.visibility  = 'hidden';

		    this.hsl = null;
		    this.value = '#ffffff';
		    if( o.value !== undefined ){
		        if( o.value instanceof Array ) this.value = Tools.rgbToHex( o.value );
		        else if(!isNaN(o.value)) this.value = Tools.hexToHtml( o.value );
		        else this.value = o.value;
		    }

		    this.bcolor = null;
		    this.isDown = false;
		    this.fistDown = false;

		    this.notext = o.notext || false;

		    this.tr = 98;
		    this.tsl = Math.sqrt(3) * this.tr;

		    this.hue = 0;
		    this.d = 256;

		    this.init();

		    this.setColor( this.value );

		    if( o.open !== undefined ) this.open();

		}

		testZone ( mx, my ) {

			let l = this.local;
			if( l.x === -1 && l.y === -1 ) return ''

			if( this.up && this.isOpen ){

				if( l.y > this.wfixe ) return 'title'
			    else return 'color'

			} else {

				if( l.y < this.baseH+2 ) return 'title'
		    	else if( this.isOpen ) return 'color'

			}

	    }

		// ----------------------
	    //   EVENTS
	    // ----------------------

		mouseup ( e ) {

		    this.isDown = false;
		    this.d = 256;

		}

		mousedown ( e ) {


			let name = this.testZone( e.clientX, e.clientY );


			//if( !name ) return;
			if(name === 'title'){
				if( !this.isOpen ) this.open();
		        else this.close();
		        return true;
			}


			if( name === 'color' ){

				this.isDown = true;
				this.fistDown = true;
				this.mousemove( e );
			}
		}

		mousemove ( e ) {

		    let name = this.testZone( e.clientX, e.clientY );

		    let off, d, hue, sat, lum, rad, x, y, rr, T = Tools;

		    if( name === 'title' ) this.cursor('pointer');

		    if( name === 'color' ){

		    	off = this.offset;
			    off.x = e.clientX - ( this.zone.x + this.decal.x + this.mid );
			    off.y = e.clientY - ( this.zone.y + this.decal.y + this.mid ) - this.ytop;
				d = off.length() * this.ratio;
				rr = off.angle();
				if(rr < 0) rr += 2 * T.PI;
							

		    	if ( d < 128 ) this.cursor('crosshair');
		    	else if( !this.isDown ) this.cursor();

		    	if( this.isDown ){

				    if( this.fistDown ){
				    	this.d = d;
				    	this.fistDown = false;
				    }

				    if ( this.d < 128 ) {

					    if ( this.d > this.tr ) { // outside hue

					        hue = ( rr + T.pi90 ) / T.TwoPI;
					        this.hue = (hue + 1) % 1;
					        this.setHSL([(hue + 1) % 1, this.hsl[1], this.hsl[2]]);

					    } else { // triangle

					    	x = off.x * this.ratio;
					    	y = off.y * this.ratio;

					    	let rr = (this.hue * T.TwoPI) + T.PI;
					    	if(rr < 0) rr += 2 * T.PI;

					    	rad = Math.atan2(-y, x);
					    	if(rad < 0) rad += 2 * T.PI;
							
					    	let rad0 = ( rad + T.pi90 + T.TwoPI + rr ) % (T.TwoPI),
					    	rad1 = rad0 % ((2/3) * T.PI) - (T.pi60),
					    	a    = 0.5 * this.tr,
					    	b    = Math.tan(rad1) * a,
					    	r    = Math.sqrt(x*x + y*y),
					    	maxR = Math.sqrt(a*a + b*b);

					    	if( r > maxR ) {
								let dx = Math.tan(rad1) * r;
								let rad2 = Math.atan(dx / maxR);
								if(rad2 > T.pi60)  rad2 = T.pi60;
							    else if( rad2 < -T.pi60 ) rad2 = -T.pi60;
							
								rad += rad2 - rad1;

								rad0 = (rad + T.pi90  + T.TwoPI + rr) % (T.TwoPI),
								rad1 = rad0 % ((2/3) * T.PI) - (T.pi60);
								b = Math.tan(rad1) * a;
								r = maxR = Math.sqrt(a*a + b*b);
							}

							lum = ((Math.sin(rad0) * r) / this.tsl) + 0.5;
					
							let w = 1 - (Math.abs(lum - 0.5) * 2);
							sat = (((Math.cos(rad0) * r) + (this.tr / 2)) / (1.5 * this.tr)) / w;
							sat = T.clamp( sat, 0, 1 );
							
					        this.setHSL([this.hsl[0], sat, lum]);

					    }
					}
				}
			}

		}

		// ----------------------

		setHeight () {

			this.h = this.isOpen ? this.wfixe + this.baseH + 5 : this.baseH;
			this.s[0].height = this.h + 'px';
			this.zone.h = this.h;

		}

		parentHeight ( t ) {

			if ( this.group !== null ) this.group.calc( t );
		    else if ( this.isUI ) this.main.calc( t );

		}

		open () {

			super.open();

			this.setHeight();

			if( this.up ) this.zone.y -= this.wfixe + 5;

			let t = this.h - this.baseH;

		    this.s[3].visibility = 'visible';
		    //this.s[3].display = 'block';
		    this.parentHeight( t );

		}

		close () {

			super.close();

			if( this.up ) this.zone.y += this.wfixe + 5;

			let t = this.h - this.baseH;

			this.setHeight();

		    this.s[3].visibility  = 'hidden';
		    //this.s[3].display = 'none';
		    this.parentHeight( -t );

		}

		update ( up ) {

		    let cc = Tools.rgbToHex( Tools.hslToRgb([ this.hsl[0], 1, 0.5 ]) );

		    this.moveMarkers();
		    
		    this.value = this.bcolor;

		    this.setSvg( this.c[3], 'fill', cc, 2, 0 );

		    this.s[2].background = this.bcolor;
		    if(!this.notext) this.c[2].textContent = Tools.htmlToHex( this.bcolor );

		    this.invert = Tools.findDeepInver( this.rgb );
		    this.s[2].color = this.invert ? '#fff' : '#000';

		    if(!up) return;

		    if( this.ctype === 'array' ) this.send( this.rgb );
		    if( this.ctype === 'rgb' ) this.send( Tools.htmlRgb( this.rgb ) );
		    if( this.ctype === 'hex' ) this.send( Tools.htmlToHex( this.value ) );
		    if( this.ctype === 'html' ) this.send();

		}

		setValue ( v ){

			if( v instanceof Array ) this.value = Tools.rgbToHex( v );
	        else if(!isNaN(v)) this.value = Tools.hexToHtml( v );
	        else this.value = v;

			this.setColor( this.value );
	        this.update();

		}

		setColor ( color ) {

		    let unpack = Tools.unpack(color);
		    if (this.bcolor !== color && unpack) {

		        this.bcolor = color;
		        this.rgb = unpack;
		        this.hsl = Tools.rgbToHsl( this.rgb );

		        this.hue = this.hsl[0];

		        this.update();
		    }
		    return this;

		}

		setHSL ( hsl ) {

		    this.hsl = hsl;
		    this.rgb = Tools.hslToRgb( hsl );
		    this.bcolor = Tools.rgbToHex( this.rgb );
		    this.update( true );
		    return this;

		}

		moveMarkers () {

			let p = this.pp;
			let T = Tools;

		    this.invert ? '#fff' : '#000';
		    let a = this.hsl[0] * T.TwoPI;
		    let third = (2/3) * T.PI;
		    let r = this.tr;
		    let h = this.hsl[0];
		    let s = this.hsl[1];
		    let l = this.hsl[2];

		    let angle = ( a - T.pi90 ) * T.todeg;

		    h = - a + T.pi90;

			let hx = Math.cos(h) * r;
			let hy = -Math.sin(h) * r;
			let sx = Math.cos(h - third) * r;
			let sy = -Math.sin(h - third) * r;
			let vx = Math.cos(h + third) * r;
			let vy = -Math.sin(h + third) * r;
			let mx = (sx + vx) / 2, my = (sy + vy) / 2;
			a  = (1 - 2 * Math.abs(l - .5)) * s;
			let x = sx + (vx - sx) * l + (hx - mx) * a;
			let y = sy + (vy - sy) * l + (hy - my) * a;

		    p.set( x, y ).addScalar(128);

		    //let ff = (1-l)*255;
		    // this.setSvg( this.c[3], 'stroke', 'rgb('+ff+','+ff+','+ff+')', 3 );

		    this.setSvg( this.c[3], 'transform', 'rotate('+angle+' )', 2 );

		    this.setSvg( this.c[3], 'cx', p.x, 3 );
		    this.setSvg( this.c[3], 'cy', p.y, 3 );
		    
		    this.setSvg( this.c[3], 'stroke', this.invert ? '#fff' : '#000', 2, 3 );
		    this.setSvg( this.c[3], 'stroke', this.invert ? '#fff' : '#000', 3 );
		    this.setSvg( this.c[3], 'fill',this.bcolor, 3 );

		}

		rSize () {

		    //Proto.prototype.rSize.call( this );
		    super.rSize();

		    let s = this.s;

		    s[2].width = this.sb + 'px';
		    s[2].left = this.sa + 'px';

		    //console.log(this.sb)

		    this.cw = this.sb > 256 ? 256 : this.sb;



		    this.rSizeColor( this.cw );

		    this.decal.x = Math.floor((this.w - this.wfixe) * 0.5);
		    //s[3].left = this.decal.x + 'px';
		    
		}

		rSizeColor ( w ) {


			if( w === this.wfixe ) return;



			this.wfixe = w;



			let s = this.s;

			//this.decal.x = Math.floor((this.w - this.wfixe) * 0.5);
		    this.decal.y = this.side === 'up' ? 2 : this.baseH + 2;
		    this.mid = Math.floor( this.wfixe * 0.5 );

		    this.setSvg( this.c[3], 'viewBox', '0 0 '+ this.wfixe + ' '+ this.wfixe );
		    s[3].width = this.wfixe + 'px';
		    s[3].height = this.wfixe + 'px';
	    	//s[3].left = this.decal.x + 'px';
		    s[3].top = this.decal.y + 'px';

		    this.ratio = 256 / this.wfixe;
		    this.square = 1 / (60*(this.wfixe/256));
		    this.setHeight();

		}


	}

	class Fps extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        this.round = Math.round;

	        //this.autoHeight = true;

	        this.baseH = this.h;
	        this.hplus = o.hplus || 50;

	        this.res = o.res || 40;
	        this.l = 1;

	        this.precision = o.precision || 0;
	        

	        this.custom = o.custom || false;
	        this.names = o.names || ['FPS', 'MS'];
	        let cc = o.cc || ['220,220,220', '255,255,0'];

	       // this.divid = [ 100, 100, 100 ];
	       // this.multy = [ 30, 30, 30 ];

	        this.adding = o.adding || false;

	        this.range = o.range || [ 165, 100, 100 ];

	        this.alpha = o.alpha || 0.25;

	        this.values = [];
	        this.points = [];
	        this.textDisplay = [];

	        if(!this.custom){

	            this.now = Roots.getTime();
	            this.startTime = 0;//this.now()
	            this.prevTime = 0;//this.startTime;
	            this.frames = 0;

	            this.ms = 0;
	            this.fps = 0;
	            this.mem = 0;
	            this.mm = 0;

	            this.isMem = ( self.performance && self.performance.memory ) ? true : false;

	           // this.divid = [ 100, 200, 1 ];
	           // this.multy = [ 30, 30, 30 ];

	            if( this.isMem ){

	                this.names.push('MEM');
	                cc.push('0,255,255');

	            }

	            this.txt = o.name || 'Fps';

	        }


	        let fltop = Math.floor(this.h*0.5)-3;
	        const ccc = this.colors;

	        this.c[1].textContent = this.txt;
	        //this.c[1].innerHTML = '&#160;' + this.txt
	        this.c[0].style.cursor = 'pointer';
	        this.c[0].style.pointerEvents = 'auto';

	        let panelCss = 'display:none; left:10px; top:'+ this.h + 'px; height:'+(this.hplus - 8)+'px; box-sizing:border-box; background: rgba(0, 0, 0, 0.2); border:1px solid '+ ccc.border +';';

	        if( this.radius !== 0 ) panelCss += 'border-radius:' + this.radius+'px;'; 

	        this.c[2] = this.dom( 'path', this.css.basic + panelCss , {} );

	        this.c[2].setAttribute('viewBox', '0 0 '+this.res+' 50' );
	        this.c[2].setAttribute('height', '100%' );
	        this.c[2].setAttribute('width', '100%' );
	        this.c[2].setAttribute('preserveAspectRatio', 'none' );


	        //this.dom( 'path', null, { fill:'rgba(255,255,0,0.3)', 'stroke-width':1, stroke:'#FF0', 'vector-effect':'non-scaling-stroke' }, this.c[2] );
	        //this.dom( 'path', null, { fill:'rgba(0,255,255,0.3)', 'stroke-width':1, stroke:'#0FF', 'vector-effect':'non-scaling-stroke' }, this.c[2] );
	        
	        // arrow
	        this.c[3] = this.dom( 'path', this.css.basic + 'position:absolute; width:6px; height:6px; left:0; top:'+fltop+'px;', { d:this.svgs.g1, fill:ccc.text, stroke:'none'});
	        //this.c[3] = this.dom( 'path', this.css.basic + 'position:absolute; width:10px; height:10px; left:4px; top:'+fltop+'px;', { d:this.svgs.arrow, fill:this.colors.text, stroke:'none'});

	        // result test
	        this.c[4] = this.dom( 'div', this.css.txt + 'position:absolute; left:10px; top:'+(this.h+2) +'px; display:none; width:100%; text-align:center;' );

	        // bottom line
	        if( o.bottomLine ) this.c[4] = this.dom( 'div', this.css.basic + 'width:100%; bottom:0px; height:1px; background: rgba(255, 255, 255, 0.2);');

	        this.isShow = false;



	        let s = this.s;

	        //s[1].marginLeft = '10px';
	        s[1].lineHeight = this.h-4;
	        s[1].color = ccc.text;
	        //s[1].paddingLeft = '18px';
	        //s[1].fontWeight = 'bold';

	        if( this.radius !== 0 )  s[0].borderRadius = this.radius+'px';
	        if( this.colors.gborder!=='none') s[0].border = '1px solid ' + ccc.gborder;




	        let j = 0;

	        for( j=0; j<this.names.length; j++ ){

	            let base = [];
	            let i = this.res+1;
	            while( i-- ) base.push(50);

	            this.range[j] = ( 1 / this.range[j] ) * 49;
	            
	            this.points.push( base );
	            this.values.push(0);
	           //  this.dom( 'path', null, { fill:'rgba('+cc[j]+',0.5)', 'stroke-width':1, stroke:'rgba('+cc[j]+',1)', 'vector-effect':'non-scaling-stroke' }, this.c[2] );
	            this.textDisplay.push( "<span style='color:rgb("+cc[j]+")'> " + this.names[j] +" ");

	        }

	        j = this.names.length;
	        while(j--){
	            this.dom( 'path', null, { fill:'rgba('+cc[j]+','+this.alpha+')', 'stroke-width':1, stroke:'rgba('+cc[j]+',1)', 'vector-effect':'non-scaling-stroke' }, this.c[2] );
	        }


	        this.init();

	        //if( this.isShow ) this.show();

	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    mousedown ( e ) {

	        if( this.isShow ) this.close();
	        else this.open();

	    }

	    // ----------------------

	    /*mode: function ( mode ) {

	        let s = this.s;

	        switch(mode){
	            case 0: // base
	                s[1].color = this.colors.text;
	                //s[1].background = 'none';
	            break;
	            case 1: // over
	                s[1].color = '#FFF';
	                //s[1].background = UIL.SELECT;
	            break;
	            case 2: // edit / down
	                s[1].color = this.colors.text;
	                //s[1].background = UIL.SELECTDOWN;
	            break;

	        }
	    },*/

	    tick ( v ) {

	        this.values = v;
	        if( !this.isShow ) return;
	        this.drawGraph();
	        this.upText();

	    }

	    makePath ( point ) {

	        let p = '';
	        p += 'M ' + (-1) + ' ' + 50;
	        for ( let i = 0; i < this.res + 1; i ++ ) { p += ' L ' + i + ' ' + point[i]; }
	        p += ' L ' + (this.res + 1) + ' ' + 50;
	        return p;

	    }

	    upText ( val ) {

	        let v = val || this.values, t = '';
	        for( let j=0, lng =this.names.length; j<lng; j++ ) t += this.textDisplay[j] + (v[j]).toFixed(this.precision) + '</span>';
	        this.c[4].innerHTML = t;
	    
	    }

	    drawGraph () {

	        let svg = this.c[2];
	        let i = this.names.length, v, old = 0, n = 0;

	        while( i-- ){
	            if( this.adding ) v = (this.values[n]+old) * this.range[n];
	            else  v = (this.values[n] * this.range[n]);
	            this.points[n].shift();
	            this.points[n].push( 50 - v );
	            this.setSvg( svg, 'd', this.makePath( this.points[n] ), i+1 );
	            old += this.values[n];
	            n++;

	        }

	    }

	    open () {

	        super.open();

	        this.h = this.hplus + this.baseH;

	        this.setSvg( this.c[3], 'd', this.svgs.g2 );

	        if( this.group !== null ){ this.group.calc( this.hplus );}
	        else if( this.isUI ) this.main.calc( this.hplus );

	        this.s[0].height = this.h +'px';
	        this.s[2].display = 'block'; 
	        this.s[4].display = 'block';
	        this.isShow = true;

	        if( !this.custom ) Roots.addListen( this );

	    }

	    close () {

	        super.close();

	        this.h = this.baseH;

	        this.setSvg( this.c[3], 'd', this.svgs.g1 );

	        if( this.group !== null ){ this.group.calc( -this.hplus );}
	        else if( this.isUI ) this.main.calc( -this.hplus );
	        
	        this.s[0].height = this.h +'px';
	        this.s[2].display = 'none';
	        this.s[4].display = 'none';
	        this.isShow = false;

	        if( !this.custom ) Roots.removeListen( this );

	        this.c[4].innerHTML = '';
	        
	    }


	    ///// AUTO FPS //////

	    begin () {

	        this.startTime = this.now();
	        
	    }

	    end () {

	        let time = this.now();
	        this.ms = time - this.startTime;

	        this.frames ++;

	        if ( time > this.prevTime + 1000 ) {

	            this.fps = this.round( ( this.frames * 1000 ) / ( time - this.prevTime ) );

	            this.prevTime = time;
	            this.frames = 0;

	            if ( this.isMem ) {

	                let heapSize = performance.memory.usedJSHeapSize;
	                let heapSizeLimit = performance.memory.jsHeapSizeLimit;

	                this.mem = this.round( heapSize * 0.000000954 );
	                this.mm = heapSize / heapSizeLimit;

	            }

	        }

	        this.values = [ this.fps, this.ms , this.mm ];

	        this.drawGraph();
	        this.upText( [ this.fps, this.ms, this.mem ] );

	        return time;

	    }

	    listening () {

	        if( !this.custom ) this.startTime = this.end();
	        
	    }

	    rSize () {

	        let s = this.s;
	        let w = this.w;

	        s[3].left = ( this.sa + this.sb - 6 ) + 'px';

	        s[0].width = w + 'px';
	        s[1].width = w + 'px';
	        s[2].left = 10 + 'px';
	        s[2].width = (w-20) + 'px';
	        s[4].width = (w-20) + 'px';
	        
	    }
	    
	}

	class Graph extends Proto {

	    constructor( o = {} ) {

	        super( o );

	    	this.value = o.value !== undefined ? o.value : [0,0,0];
	        this.lng = this.value.length;

	        this.precision = o.precision !== undefined ? o.precision : 2;
	        this.multiplicator = o.multiplicator || 1;
	        this.neg = o.neg || false;

	        this.line = o.line !== undefined ?  o.line : true;

	        //if(this.neg)this.multiplicator*=2;

	        this.autoWidth = o.autoWidth !== undefined ? o.autoWidth : true;
	        this.isNumber = false;

	        this.isDown = false;

	        this.h = o.h || 128 + 10;
	        this.rh = this.h - 10;
	        this.top = 0;

	        this.c[0].style.width = this.w +'px';

	        if( this.c[1] !== undefined ) { // with title

	            this.c[1].style.width = this.w +'px';

	            if(!this.autoWidth){
	                this.c[1].style.width = '100%';
	                this.c[1].style.justifyContent = 'center';
	            }
	            
	            
	            //this.c[1].style.background = '#ff0000';
	            //this.c[1].style.textAlign = 'center';
	            this.top = 10;
	            this.h += 10;

	        }

	        this.gh = this.rh - 28;
	        this.gw = this.w - 28;

	        //this.c[2] = this.dom( 'div', this.css.txt + 'justify-content:center; text-align: justify; column-count:'+this.lng+'; top:'+(this.h-20)+'px; width:100%; color:'+ this.colors.text );

	        //let colum = 'column-count:'+this.lng+'; column:'+this.lng+'; break-inside: column; top:'
	        this.c[2] = this.dom( 'div', this.css.txt + 'display:block; text-align:center; padding:0px 0px; top:'+(this.h-20)+'px; left:14px; width:'+this.gw+'px;  color:'+ this.colors.text );
	       
	        //this.c[2].textContent = this.value;
	        this.c[2].innerHTML = this.valueToHtml();

	        let svg = this.dom( 'svg', this.css.basic , { viewBox:'0 0 '+this.w+' '+this.rh, width:this.w, height:this.rh, preserveAspectRatio:'none' } );
	        this.setCss( svg, { width:this.w, height:this.rh, left:0, top:this.top });

	        this.dom( 'path', '', { d:'', stroke:this.colors.text, 'stroke-width':2, fill:'none', 'stroke-linecap':'butt' }, svg );
	        this.dom( 'rect', '', { x:10, y:10, width:this.gw+8, height:this.gh+8, stroke:'rgba(0,0,0,0.3)', 'stroke-width':1 , fill:'none'}, svg );

	        this.iw = ((this.gw-(4*(this.lng-1)))/this.lng);
	        let t = [];
	        this.cMode = [];

	        this.v = [];

	        for( let i = 0; i < this.lng; i++ ){

	        	t[i] = [ 14 + (i*this.iw) + (i*4), this.iw ];
	        	t[i][2] = t[i][0] + t[i][1];
	        	this.cMode[i] = 0;

	            if( this.neg ) this.v[i] = ((1+(this.value[i] / this.multiplicator))*0.5);
	        	else this.v[i] = this.value[i] / this.multiplicator;

	        	this.dom( 'rect', '', { x:t[i][0], y:14, width:t[i][1], height:1, fill:this.colors.text, 'fill-opacity':0.3 }, svg );

	        }

	        this.tmp = t;
	        this.c[3] = svg;

	        //console.log(this.w)

	        this.init();

	        if( this.c[1] !== undefined ){
	            this.c[1].style.top = 0 +'px';
	            this.c[1].style.height = 20 +'px';
	            this.s[1].lineHeight = (20-5)+'px';
	        }

	        this.update( false );

	    }

	    setValue ( value ) {

	        this.value = value;
	        this.lng = this.value.length;
	        for (var i = 0; i < this.lng; i++) {
	            if (this.neg) this.v[i] = (1 + value[i] / this.multiplicator) * 0.5;
	            else this.v[i] = value[i] / this.multiplicator;
	        }
	        this.update();

	    }

	    valueToHtml() {

	        let i = this.lng, n=0, r = '<table style="width:100%;"><tr>';
	        let w = 100 / this.lng;
	        let style = 'width:'+ w +'%;';//' text-align:center;'
	        while(i--){
	            if(n===this.lng-1) r += '<td style='+style+'>' + this.value[n] + '</td></tr></table>';
	            else r += '<td style='+style+'>' + this.value[n] + '</td>';
	            n++;
	        }
	        return r
	    }

	    updateSVG () {

	        if( this.line ) this.setSvg( this.c[3], 'd', this.makePath(), 0 );

	        for(let i = 0; i<this.lng; i++ ){

	            this.setSvg( this.c[3], 'height', this.v[i]*this.gh, i+2 );
	            this.setSvg( this.c[3], 'y', 14 + (this.gh - this.v[i]*this.gh), i+2 );
	            if( this.neg ) this.value[i] = ( ((this.v[i]*2)-1) * this.multiplicator ).toFixed( this.precision ) * 1;
	            else this.value[i] = ( (this.v[i] * this.multiplicator) ).toFixed( this.precision ) * 1;

	        }

	        //this.c[2].textContent = this.value;
	        this.c[2].innerHTML = this.valueToHtml();

	    }

	    testZone ( e ) {

	        let l = this.local;
	        if( l.x === -1 && l.y === -1 ) return '';

	        let i = this.lng;
	        let t = this.tmp;
	        
		    if( l.y>this.top && l.y<this.h-20 ){
		        while( i-- ){
		            if( l.x>t[i][0] && l.x<t[i][2] ) return i;
		        }
		    }

	        return ''

	    }

	    mode ( n, name ) {

	    	if( n === this.cMode[name] ) return false;

	    	let a;

	        switch(n){
	            case 0: a=0.3; break;
	            case 1: a=0.6; break;
	            case 2: a=1; break;
	        }

	        this.reset();

	        this.setSvg( this.c[3], 'fill-opacity', a, name + 2 );
	        this.cMode[name] = n;

	        return true;



	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    reset () {

	    	let nup = false;
	        //this.isDown = false;

	        let i = this.lng;
	        while(i--){ 
	            if( this.cMode[i] !== 0 ){
	                this.cMode[i] = 0;
	                this.setSvg( this.c[3], 'fill-opacity', 0.3, i + 2 );
	                nup = true;
	            }
	        }

	        return nup;

	    }

	    mouseup ( e ) {

	        this.isDown = false;
	        if( this.current !== -1 ) return this.reset();
	        
	    }

	    mousedown ( e ) {

	    	this.isDown = true;
	        return this.mousemove( e );

	    }

	    mousemove ( e ) {

	    	let nup = false;

	    	let name = this.testZone(e);

	    	if( name === '' ){

	            nup = this.reset();
	            //this.cursor();

	        } else { 

	            nup = this.mode( this.isDown ? 2 : 1, name );
	            //this.cursor( this.current !== -1 ? 'move' : 'pointer' );
	            if(this.isDown){
	            	this.v[name] = this.clamp( 1 - (( e.clientY - this.zone.y - this.ytop - 10 ) / this.gh) , 0, 1 );
	            	this.update( true );
	            }

	        }

	        return nup;

	    }

	    // ----------------------

	    update ( up ) {

	    	this.updateSVG();

	        if( up ) this.send();

	    }

	    makePath () {

	    	let p = "", h, w, wn, wm, ow, oh;
	    	//let g = this.iw*0.5

	    	for(let i = 0; i<this.lng; i++ ){

	    		h = 14 + (this.gh - this.v[i]*this.gh);
	    		w = (14 + (i*this.iw) + (i*4));

	    		wm = w + this.iw*0.5;
	    		wn = w + this.iw;

	    		if( i === 0 ) p+='M '+w+' '+ h + ' T ' + wm +' '+ h;
	    		else p += ' C ' + ow +' '+ oh + ',' + w +' '+ h + ',' + wm +' '+ h;
	    		if( i === this.lng-1 ) p+=' T ' + wn +' '+ h;

	    		ow = wn;
	    		oh = h; 

	    	}

	    	return p

	    }

	    rSize () {

	        super.rSize();

	        let s = this.s;
	        if( this.c[1] !== undefined ) s[1].width = this.w + 'px';
	        s[3].width = this.w + 'px';

	        let gw = this.w - 28;
	        let iw = ((gw-(4*(this.lng-1)))/this.lng);
	        let t = [];

	        s[2].width = gw + 'px';

	        for( let i = 0; i < this.lng; i++ ){

	            t[i] = [ 14 + (i*iw) + (i*4), iw ];
	            t[i][2] = t[i][0] + t[i][1];

	        }

	        this.tmp = t;

	    }

	}

	class Empty extends Proto {

	    constructor( o = {} ) {

		    o.isSpace = true;
	        o.margin = 0;
	        if(!o.h) o.h = 10;
	        super( o );
	        this.init();

	    }
	    
	}

	class Group extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        this.isGroup = true;

	        this.ADD = o.add;

	        this.autoHeight = true;

	        this.uis = [];
	        this.current = -1;
	        this.proto = null;
	        this.isEmpty = true;

	        this.decal = o.group ? 8 : 0;
	        //this.dd = o.group ? o.group.decal + 8 : 0

	        this.baseH = this.h;

	        this.spaceY = new Empty({h:this.margin});



	        let fltop = Math.floor(this.h*0.5)-3;

	        const cc = this.colors;

	        this.useFlex = true; 
	        let flexible = this.useFlex ? 'display:flex; flex-flow: row wrap;' : '';

	        this.c[2] = this.dom( 'div', this.css.basic + flexible + 'width:100%; left:0;  overflow:hidden; top:'+(this.h)+'px');
	        this.c[3] = this.dom( 'path', this.css.basic + 'position:absolute; width:6px; height:6px; left:0; top:'+fltop+'px;', { d:this.svgs.g1, fill:cc.text, stroke:'none'});

	        let bh = this.mtop === 0 ? this.margin : this.mtop;
	        
	        this.c[4] = this.dom( 'div', this.css.basic + 'width:100%; left:0; height:'+(bh+1)+'px; top:'+((this.h-1))+'px; background:none;');

	        this.s;
	        this.c[1].name = 'group';

	        this.init();

	        this.setBG( o.bg );

	        if( o.open ) this.open();

	    }

	    setBG ( bg ) {

	        const cc = this.colors;
	        const s = this.s;

	        if( bg !== undefined ) cc.groups = bg;
	        if(cc.groups === 'none') cc.groups = cc.background;
	            cc.background = 'none';

	        s[0].background = 'none';
	        s[1].background = cc.groups;
	        s[2].background = cc.groups;

	        if( cc.gborder !== 'none' ){
	            s[1].border = cc.borderSize+'px solid '+ cc.gborder;
	        }

	        if( this.radius !== 0 ){

	            s[1].borderRadius = this.radius+'px';
	            s[2].borderRadius = this.radius+'px';

	        }

	        /*let i = this.uis.length;
	        while(i--){
	            this.uis[i].setBG( 'none' );
	            //this.uis[i].setBG( this.colors.background );
	        }*/

	    }

	    testZone ( e ) {

	        let l = this.local;
	        if( l.x === -1 && l.y === -1 ) return '';

	        let name = '';

	        if( l.y < this.baseH + this.margin ) name = 'title';
	        else {
	            if( this.isOpen ) name = 'content';
	        }

	        //console.log(name)

	        return name;

	    }

	    clearTarget () {

	        if( this.current === -1 ) return false;
	        if( this.proto.s ){
	            // if no s target is delete !!
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

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    handleEvent ( e ) {

	        let type = e.type;

	        let change = false;
	        let protoChange = false;

	        let name = this.testZone( e );

	        if( !name ) return;

	        switch( name ){

	            case 'content':

	            //this.cursor()

	            //if( this.marginDiv ) e.clientY -= this.margin * 0.5

	            if( Roots.isMobile && type === 'mousedown' ) this.getNext( e, change );

	            if( this.proto ){ 
	                //e.clientY -= this.margin
	                protoChange = this.proto.handleEvent( e );
	            }

	            if( !Roots.lock ) this.getNext( e, change );

	            break;
	            case 'title':
	            //this.cursor( this.isOpen ? 'n-resize':'s-resize' );
	            this.cursor('pointer');
	            if( type === 'mousedown' ){
	                if( this.isOpen ) this.close();
	                else this.open();
	            }
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
	        }

	        if( next !== -1 ){ 
	            this.proto  = this.uis[ this.current ];
	            this.proto.uiover();
	        }

	    }

	    // ----------------------

	    

	    add() {

	        let a = arguments;

	        if( typeof a[1] === 'object' ){ 
	            a[1].isUI = this.isUI;
	            a[1].target = this.c[2];
	            a[1].main = this.main;
	            a[1].group = this;
	        } else if( typeof arguments[1] === 'string' ){
	            if( a[2] === undefined ) [].push.call( a, { isUI:true, target:this.c[2], main:this.main });
	            else { 
	                a[2].isUI = true;
	                a[2].target = this.c[2];
	                a[2].main = this.main;
	                a[2].group = this;
	            }
	        }

	        let u = this.ADD.apply( this, a );

	        if( u.isGroup ){ 
	            //o.add = add;
	            u.dx = 8;
	        }
	        
	        //u.dx += 4
	        //console.log(this.decal)
	        //u.zone.d -= 8
	        Roots.forceZone = true;
	        //u.margin += this.margin

	        //console.log( u.margin )
	        //Roots.needReZone = true

	        //Roots.resize()
	         //console.log(Roots.needResize)

	        this.uis.push( u );

	        this.isEmpty = false;

	        return u;

	    }

	    // remove one node

	    remove ( n ) {

	        if( n.dispose ) n.dispose();

	    }

	    // clear all iner 

	    dispose() {

	        this.clear();
	        if( this.isUI ) this.main.calc();
	        super.dispose();

	    }

	    clear() {

	        this.empty();

	    }

	    empty () {

	        this.close();

	        let i = this.uis.length, item;

	        while( i-- ){
	            item = this.uis.pop();
	            this.c[2].removeChild( item.c[0] );
	            item.clear( true );

	            //this.uis[i].clear()
	        }

	        this.isEmpty = true;
	        this.h = this.baseH;

	    }

	    // clear one element

	    clearOne ( n ) { 

	        let id = this.uis.indexOf( n );

	        if ( id !== -1 ) {
	            this.calc( - ( this.uis[ id ].h + this.margin ) );
	            this.c[2].removeChild( this.uis[ id ].c[0] );
	            this.uis.splice( id, 1 );

	            if( this.uis.length === 0 ){ 
	                this.isEmpty = true;
	                this.close();
	            }
	        }

	    }

	    

	    open () {

	        super.open();

	        this.setSvg( this.c[3], 'd', this.svgs.g2 );
	        this.rSizeContent();

	        //let t = this.h - this.baseH

	        const s = this.s;
	        const cc = this.colors;

	        //s[2].top = (this.h-1) + 'px'
	        s[2].top = (this.h+this.mtop) + 'px';
	        s[4].background = cc.groups;//'#0f0'

	        if(this.radius){

	            s[1].borderRadius = '0px';
	            s[2].borderRadius = '0px';

	            s[1].borderTopLeftRadius = this.radius+'px';
	            s[1].borderTopRightRadius = this.radius+'px';
	            s[2].borderBottomLeftRadius = this.radius+'px';
	            s[2].borderBottomRightRadius = this.radius+'px';
	        }

	        if( cc.gborder !== 'none' ){

	            s[4].borderLeft = cc.borderSize+'px solid '+ cc.gborder;
	            s[4].borderRight = cc.borderSize+'px solid '+ cc.gborder;

	            s[2].border = cc.borderSize+'px solid '+ cc.gborder;
	            s[2].borderTop = 'none';
	            s[1].borderBottom = cc.borderSize+'px solid rgba(0,0,0,0)';

	        }
	        
	        this.parentHeight();

	        //Roots.isLeave = true
	        //Roots.needResize = true

	    }

	    close () {

	        super.close();

	        //let t = this.h - this.baseH

	        this.setSvg( this.c[3], 'd', this.svgs.g1 );

	        this.h = this.baseH;

	        const s = this.s;
	        const cc = this.colors;
	        
	        s[0].height = this.h + 'px';
	        //s[1].height = (this.h-2) + 'px'
	        //s[2].top = this.h + 'px'
	        s[2].top = (this.h+this.mtop) + 'px';
	        s[4].background = 'none';

	        if( cc.gborder !== 'none' ){

	            s[4].border = 'none';
	            s[2].border = 'none';
	            s[1].border = cc.borderSize+'px solid '+ cc.gborder;
	        }

	        if(this.radius) s[1].borderRadius = this.radius+'px';

	        this.parentHeight();

	    }

	    calcUis () {

	        if( !this.isOpen || this.isEmpty ) this.h = this.baseH;
	        //else this.h = Roots.calcUis( this.uis, this.zone, this.zone.y + this.baseH ) + this.baseH;
	        else this.h = Roots.calcUis( [...this.uis, this.spaceY ], this.zone, this.zone.y + this.baseH + this.margin, true ) + this.baseH;

	        this.s[0].height = this.h + 'px';
	        this.s[2].height =( this.h - this.baseH )+ 'px';

	    }

	    parentHeight ( t ) {

	        if ( this.group !== null ) this.group.calc( t );
	        else if ( this.isUI ) this.main.calc( t );

	    }

	    calc ( y ) {

	        if( !this.isOpen ) return
	        if( this.isUI ) this.main.calc();
	        else this.calcUis();
	        this.s[0].height = this.h + 'px';
	        this.s[2].height = this.h + 'px';

	    }

	    rSizeContent () {

	        let i = this.uis.length;
	        while(i--){
	            this.uis[i].setSize( this.w );
	            this.uis[i].rSize();
	        }

	    }

	    rSize () {

	        super.rSize();

	        let s = this.s;

	        this.w = this.w - this.decal;

	        s[3].left = ( this.sa + this.sb - 6 ) + 'px';

	        s[1].width = this.w + 'px';
	        s[2].width = this.w + 'px';
	        s[1].left = (this.decal) + 'px';
	        s[2].left = (this.decal) + 'px';

	        if( this.isOpen ) this.rSizeContent();

	    }

	    //
	/*
	    uiout() {

	        if( this.lock ) return;
	        if(!this.overEffect) return;
	        if(this.s) this.s[0].background = this.colors.background;

	    }

	    uiover() {

	        if( this.lock ) return;
	        if(!this.overEffect) return;
	        //if( this.isOpen ) return;
	        if(this.s) this.s[0].background = this.colors.backgroundOver;

	    }
	*/
	}

	class Joystick extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        this.autoWidth = false;

	        this.value = [0,0];

	        this.minw  = this.w;
	        this.diam = o.diam || this.w; 

	        this.joyType = 'analogique';
	        this.model = o.mode !== undefined ? o.mode : 0;

	        this.precision = o.precision || 2;
	        this.multiplicator = o.multiplicator || 1;

	        this.pos = new V2();
	        this.tmp = new V2();

	        this.interval = null;
	        this.c[0].style.display = 'block';
	        this.haveText = o.text !== undefined ? o.text : true; 

	        //this.radius = this.w * 0.5;
	        //this.distance = this.radius*0.25;
	        this.distance = (this.diam*0.5)*0.25;

	        this.h = o.h || this.w + (this.haveText ? 10 : 0);

	        this.c[0].style.width = this.w +'px';

	        if( this.c[1] !== undefined ) { // with title

	            this.c[1].style.width = '100%';
	            this.c[1].style.justifyContent = 'center';
	            this.top = 10;
	            this.h += 10;

	        }

	        let cc = this.colors;

	        this.c[2] = this.dom( 'div', this.css.txt + 'justify-content:center; top:'+(this.h-20)+'px; width:100%; color:'+ cc.text );
	        this.c[2].textContent = this.haveText ? this.value : '';

	        this.c[3] = this.getJoystick( this.model );
	        this.setSvg( this.c[3], 'viewBox', '0 0 '+this.diam+' '+this.diam );
	        this.setCss( this.c[3], { width:this.diam, height:this.diam, left:0, top:this.top });

	        this.mode(0);


	        this.ratio = 128/this.w;

	        this.init();

	        this.update(false);
	        
	    }

	    mode ( mode ) {

	        let cc = this.colors;

	        switch(mode){
	            case 0: // base
	                if(this.model===0){
	                    this.setSvg( this.c[3], 'fill', 'url(#gradIn)', 4 );
	                    this.setSvg( this.c[3], 'stroke', '#000', 4 );
	                } else {
	                    this.setSvg( this.c[3], 'stroke', cc.joyOut, 2 );
	                    //this.setSvg( this.c[3], 'stroke', 'rgb(0,0,0,0.1)', 3 );
	                    this.setSvg( this.c[3], 'stroke', cc.joyOut, 4 );
	                    this.setSvg( this.c[3], 'fill', 'none', 4 );
	                }
	                
	            break;
	            case 1: // over
	                if(this.model===0){
	                    this.setSvg( this.c[3], 'fill', 'url(#gradIn2)', 4 );
	                    this.setSvg( this.c[3], 'stroke', 'rgba(0,0,0,0)', 4 );
	                } else {
	                    this.setSvg( this.c[3], 'stroke', cc.joyOver, 2 );
	                    //this.setSvg( this.c[3], 'stroke', 'rgb(0,0,0,0.3)', 3 );
	                    this.setSvg( this.c[3], 'stroke', cc.joySelect, 4 );
	                    this.setSvg( this.c[3], 'fill', cc.joyOver, 4 );
	                }
	            break;

	        }
	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    addInterval (){
	        if( this.interval !== null ) this.stopInterval();
	        if( this.pos.isZero() ) return;
	        this.interval = setInterval( function(){ this.update(); }.bind(this), 10 );

	    }

	    stopInterval (){

	        if( this.interval === null ) return;
	        clearInterval( this.interval );
	        this.interval = null;

	    }

	    reset () {

	        this.addInterval();
	        this.mode(0);

	    }

	    mouseup ( e ) {

	        this.addInterval();
	        this.isDown = false;
	    
	    }

	    mousedown ( e ) {

	        this.isDown = true;
	        this.mousemove( e );
	        this.mode( 2 );

	    }

	    mousemove ( e ) {

	        this.mode(1);

	        if( !this.isDown ) return;

	        //this.tmp.x = this.radius - ( e.clientX - this.zone.x );
	        //this.tmp.y = this.radius - ( e.clientY - this.zone.y - this.top );

	        this.tmp.x = (this.w*0.5) - ( e.clientX - this.zone.x );
	        this.tmp.y = (this.diam*0.5) - ( e.clientY - this.zone.y - this.ytop );

	        let distance = this.tmp.length();

	        if ( distance > this.distance ) {
	            let angle = Math.atan2(this.tmp.x, this.tmp.y);
	            this.tmp.x = Math.sin( angle ) * this.distance;
	            this.tmp.y = Math.cos( angle ) * this.distance;
	        }

	        this.pos.copy( this.tmp ).divideScalar( this.distance ).negate();

	        this.update();

	    }

	    setValue ( v ) {

	        if(v===undefined) v=[0,0];

	        this.pos.set( v[0] || 0, v[1]  || 0 );
	        this.updateSVG();

	    }

	    update ( up ) {

	        if( up === undefined ) up = true;

	        if( this.interval !== null ){

	            if( !this.isDown ){

	                this.pos.lerp( null, 0.3 );

	                this.pos.x = Math.abs( this.pos.x ) < 0.01 ? 0 : this.pos.x;
	                this.pos.y = Math.abs( this.pos.y ) < 0.01 ? 0 : this.pos.y;

	                if( this.isUI && this.main.isCanvas ) this.main.draw();

	            }

	        }

	        this.updateSVG();

	        if( up ) this.send();
	        

	        if( this.pos.isZero() ) this.stopInterval();

	    }

	    updateSVG () {

	        //let x = this.radius - ( -this.pos.x * this.distance );
	        //let y = this.radius - ( -this.pos.y * this.distance );

	        let x = (this.diam*0.5) - ( -this.pos.x * this.distance );
	        let y = (this.diam*0.5) - ( -this.pos.y * this.distance );

	        if(this.model === 0){

	            let sx = x + ((this.pos.x)*5) + 5;
	            let sy = y + ((this.pos.y)*5) + 10;

	            this.setSvg( this.c[3], 'cx', sx*this.ratio, 3 );
	            this.setSvg( this.c[3], 'cy', sy*this.ratio, 3 );
	        } else {
	            this.setSvg( this.c[3], 'cx', x*this.ratio, 3 );
	            this.setSvg( this.c[3], 'cy', y*this.ratio, 3 );
	        }

	        

	        this.setSvg( this.c[3], 'cx', x*this.ratio, 4 );
	        this.setSvg( this.c[3], 'cy', y*this.ratio, 4 );

	        this.value[0] =  ( this.pos.x * this.multiplicator ).toFixed( this.precision ) * 1;
	        this.value[1] =  ( this.pos.y * this.multiplicator ).toFixed( this.precision ) * 1;

	        if(this.haveText) this.c[2].textContent = this.value;

	    }

	    clear () {
	        
	        this.stopInterval();
	        super.clear();

	    }

	}

	class Knob extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        this.isCyclic = o.cyclic || false;
	        this.model = o.stype || 0;
	        if( o.mode !== undefined ) this.model = o.mode;

	        this.autoWidth = false;

	        this.setTypeNumber( o );

	        this.minw  = this.w;
	        this.diam = o.diam || this.w; 

	        this.mPI = Math.PI * 0.8;
	        this.toDeg = 180 / Math.PI;
	        this.cirRange = this.mPI * 2;

	        this.offset = new V2();

	        this.h = o.h || this.w + 10;

	        this.c[0].style.width = this.w +'px';
	        this.c[0].style.display = 'block';

	        if(this.c[1] !== undefined) {

	            this.c[1].style.width = '100%';
	            this.c[1].style.justifyContent = 'center';
	            this.top = 10;
	            this.h += 10;

	        }

	        this.percent = 0;

	        this.cmode = 0;
	        let cc = this.colors;

	        this.c[2] = this.dom( 'div', this.css.txt + 'justify-content:center; top:'+(this.h-20)+'px; width:100%; color:'+ cc.text );

	        this.c[3] = this.getKnob();
	        this.setSvg( this.c[3], 'fill', cc.button, 0 );
	        this.setSvg( this.c[3], 'stroke', cc.text, 1 );
	        this.setSvg( this.c[3], 'stroke', cc.text, 3 );
	        this.setSvg( this.c[3], 'd', this.makeGrad(), 3 );
	        
	        this.setSvg( this.c[3], 'viewBox', '0 0 ' + this.diam + ' ' + this.diam );
	        this.setCss( this.c[3], { width:this.diam, height:this.diam, left:0, top:this.top });

	        if ( this.model > 0 ) {

	            Tools.dom( 'path', '', { d: '', stroke:cc.text, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' }, this.c[3] ); //4

	            if ( this.model == 2) {
	            
	                Tools.addSVGGlowEffect();
	                this.setSvg( this.c[3], 'style', 'filter: url("#UILGlow");', 4 );
	            
	            }

	        }

	        this.r = 0;

	        this.init();

	        this.update();

	    }

	    mode ( mode ) {

	        let cc = this.colors;

	        if( this.cmode === mode ) return false;

	        switch( mode ) {
	            case 0: // base
	                this.s[2].color = cc.text;
	                this.setSvg( this.c[3], 'fill', cc.button, 0);
	                //this.setSvg( this.c[3], 'stroke','rgba(255,0,0,0.2)', 2);
	                this.setSvg( this.c[3], 'stroke', cc.text, 1 );
	            break;
	            case 1: // down
	                this.s[2].color = cc.textOver;
	                this.setSvg( this.c[3], 'fill', cc.select, 0);
	                //this.setSvg( this.c[3], 'stroke','rgba(0,0,0,0.6)', 2);
	                this.setSvg( this.c[3], 'stroke', cc.textOver, 1 );
	            break;
	        }

	        this.cmode = mode;
	        return true;

	    }

	    testZone ( e ) {

	        let l = this.local;
	        if( l.x === -1 && l.y === -1 ) return '';
	        if( l.y <= this.c[ 1 ].offsetHeight ) return 'title';
	        else if ( l.y > this.h - this.c[ 2 ].offsetHeight ) return 'text';
	        else return 'knob';

	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    mouseup ( e ) {

	        this.isDown = false;
	        this.sendEnd();
	        return this.mode(0)

	    }

	    mousedown ( e ) {

	        this.isDown = true;
	        this.old = this.value;
	        this.oldr = null;
	        this.mousemove( e );
	        return this.mode(1)

	    }

	    mousemove ( e ) {

	        if( !this.isDown ) return;

	        let off = this.offset;

	        //off.x = this.radius - ( e.clientX - this.zone.x );
	        //off.y = this.radius - ( e.clientY - this.zone.y - this.top );

	        off.x = (this.w*0.5) - ( e.clientX - this.zone.x );
	        off.y = (this.diam*0.5) - ( e.clientY - this.zone.y - this.ytop );

	        this.r = - Math.atan2( off.x, off.y );

	        if( this.oldr !== null ) this.r = Math.abs(this.r - this.oldr) > Math.PI ? this.oldr : this.r;

	        this.r = this.r > this.mPI ? this.mPI : this.r;
	        this.r = this.r < -this.mPI ? -this.mPI : this.r;

	        let steps = 1 / this.cirRange;
	        let value = (this.r + this.mPI) * steps;

	        let n = ( ( this.range * value ) + this.min ) - this.old;

	        if(n >= this.step || n <= this.step){ 
	            n = Math.floor( n / this.step );
	            this.value = this.numValue( this.old + ( n * this.step ) );
	            this.update( true );
	            this.old = this.value;
	            this.oldr = this.r;
	        }

	    }

	    wheel ( e ) {

	        let name = this.testZone( e );

	        if( name === 'knob' ) {
	    
	            let v = this.value - this.step * e.delta;
	    
	            if ( v > this.max ) {
	                v = this.isCyclic ? this.min : this.max;
	            } else if ( v < this.min ) {
	                v = this.isCyclic ? this.max : this.min;
	            }
	    
	            this.setValue( v );
	            this.old = v;
	            this.update( true );

	            return true;
	    
	        }
	        return false;

	    }

	    makeGrad () {

	        let d = '', step, range, a, x, y, x2, y2, r = 64;
	        let startangle = Math.PI + this.mPI;
	        let endangle = Math.PI - this.mPI;
	        //let step = this.step>5 ? this.step : 1;

	        if(this.step>5){
	            range =  this.range / this.step;
	            step = ( startangle - endangle ) / range;
	        } else {
	            step = (( startangle - endangle ) / r)*2;
	            range = r*0.5;
	        }

	        for ( let i = 0; i <= range; ++i ) {

	            a = startangle - ( step * i );
	            x = r + Math.sin( a ) * ( r - 20 );
	            y = r + Math.cos( a ) * ( r - 20 );
	            x2 = r + Math.sin( a ) * ( r - 24 );
	            y2 = r + Math.cos( a ) * ( r - 24 );
	            d += 'M' + x + ' ' + y + ' L' + x2 + ' '+y2 + ' ';

	        }

	        return d;

	    }

	    update ( up ) {

	        this.c[2].textContent = this.value;
	        this.percent = (this.value - this.min) / this.range;

	        let sa = Math.PI + this.mPI;
	        let ea = ( ( this.percent * this.cirRange ) - ( this.mPI ) );

	        let sin = Math.sin( ea );
	        let cos = Math.cos( ea );

	        let x1 = ( 25 * sin ) + 64;
	        let y1 = -( 25 * cos ) + 64;
	        let x2 = ( 20 * sin ) + 64;
	        let y2 = -( 20 * cos ) + 64;

	        this.setSvg( this.c[3], 'd', 'M ' + x1 +' ' + y1 + ' L ' + x2 +' ' + y2, 1 );
	        
	        if ( this.model > 0 ) {

	            let x1 = 36 * Math.sin( sa ) + 64;
	            let y1 = 36 * Math.cos( sa ) + 64;
	            let x2 = 36 * sin + 64;
	            let y2 = -36 * cos + 64;
	            let big = ea <= Math.PI - this.mPI ? 0 : 1;
	            this.setSvg( this.c[3], 'd', 'M ' + x1 + ',' + y1 + ' A ' + 36 + ',' + 36 + ' 1 ' + big + ' 1 ' + x2 + ',' + y2, 4 );

	            let color = Tools.pack( Tools.lerpColor( Tools.unpack( Tools.ColorLuma( this.colors.text, -0.75) ), Tools.unpack( this.colors.text ), this.percent ) );
	            this.setSvg( this.c[3], 'stroke', color, 4 );
	        
	        }

	        if( up ) this.send();
	        
	    }

	}

	class List extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        // TODO not work
	        this.hideCurrent = false;

	        // images
	        this.path = o.path || '';
	        this.format = o.format || '';
	        

	        this.isWithImage = this.path !== '' ? true:false;
	        this.preLoadComplete = false;

	        this.tmpImage = {};
	        this.tmpUrl = [];

	        this.m = o.m !== undefined ? o.m : 5;


	        let align = o.align || 'left';

	        // scroll size
	        let ss = o.scrollSize || 10;
	        this.ss = ss+1;

	        this.sMode = 0;
	        this.tMode = 0;

	        this.listOnly = o.listOnly || false;
	        this.staticTop = o.staticTop || false;

	        this.isSelectable = this.listOnly;
	        if( o.select !== undefined ) o.selectable = o.select;
	        if( o.selectable !== undefined ) this.isSelectable = o.selectable;

	        if( this.txt === '' ) this.p = 0;


	        let fltop = Math.floor(this.h*0.5)-3;
	        let cc = this.colors;

	        this.c[2] = this.dom( 'div', this.css.basic + 'top:0; display:none; border-radius:'+this.radius+'px;' );
	        this.c[3] = this.dom( 'div', this.css.item + 'padding:0px '+this.m+'px; margin-bottom:0px; position:absolute; justify-content:'+align+'; text-align:'+align+'; line-height:'+(this.h-4)+'px; top:1px; background:'+cc.button+'; height:'+(this.h-2)+'px; border:1px solid '+cc.border+'; border-radius:'+this.radius+'px;' );
	        this.c[4] = this.dom( 'path', this.css.basic + 'position:absolute; width:6px; height:6px; top:'+fltop+'px;', { d:this.svgs.g1, fill:cc.text, stroke:'none'});

	        this.scrollerBack = this.dom( 'div', this.css.basic + 'right:0px; width:'+ss+'px; background:'+cc.back+'; display:none;');
	        this.scroller = this.dom( 'div', this.css.basic + 'right:'+((ss-(ss*0.25))*0.5)+'px; width:'+(ss*0.25)+'px; background:'+cc.text+'; display:none; ');

	        this.c[3].style.color = cc.text;


	        this.list = [];
	        this.refObject = null;

	        if( o.list ){
	            if( o.list instanceof Array ){
	                this.list = o.list;
	            } else if( o.list instanceof Object ){
	                this.refObject = o.list;
	                for( let g in this.refObject ) this.list.push( g );
	            }
	        }

	        this.items = [];

	        this.prevName = '';

	        
	        this.tmpId = 0;

	        this.baseH = this.h;

	        this.itemHeight = o.itemHeight || this.h;//(this.h-3);

	        // force full list 
	        this.full = o.full || false;

	        this.py = 0;
	        this.ww = this.sb;
	        this.scroll = false;
	        this.isDown = false;

	        this.current = null;

	        // list up or down
	        this.side = o.side || 'down';
	        this.up = this.side === 'down' ? 0 : 1;

	        if( this.up ){

	            this.c[2].style.top = 'auto';
	            this.c[3].style.top = 'auto';
	            this.c[4].style.top = 'auto';

	            this.c[2].style.bottom = this.h-2 + 'px';
	            this.c[3].style.bottom = '1px';
	            this.c[4].style.bottom = fltop + 'px';

	        } else {
	            this.c[2].style.top = this.baseH + 'px';
	        }

	        this.listIn = this.dom( 'div', this.css.basic + 'left:0; top:0; width:100%; background:none;');
	        this.listIn.name = 'list';

	        this.topList = 0;
	        
	        this.c[2].appendChild( this.listIn );
	        this.c[2].appendChild( this.scrollerBack );
	        this.c[2].appendChild( this.scroller );

	        if( o.value !== undefined ){
	            if(!isNaN(o.value)) this.value = this.list[ o.value ];
	            else this.value = o.value;
	        }else {
	            this.value = this.list[0];
	        }

	        this.isOpenOnStart = o.open || false;

	        if( this.listOnly ){
	            this.baseH = 5;
	            this.c[3].style.display = 'none';
	            this.c[4].style.display = 'none';
	            this.c[2].style.top = this.baseH+'px';
	            this.isOpenOnStart = true;
	        }


	        this.miniCanvas = o.miniCanvas || false; 
	        this.canvasBg = o.canvasBg || 'rgba(0,0,0,0)';
	        this.imageSize = o.imageSize || [20,20];

	        // dragout function
	        this.drag = o.drag || false;
	        this.dragout = o.dragout || false;
	        this.dragstart = o.dragstart || null;
	        this.dragend = o.dragend || null;

	        

	        //this.c[0].style.background = '#FF0000'
	        ///if( this.isWithImage ) this.preloadImage();
	            
	        this.setList( this.list );
	        this.init();
	        if( this.isWithImage ) this.preloadImage();
	        if( this.isOpenOnStart ) this.open( true );

	        this.baseH += this.mtop;

	    }

	    // image list

	    preloadImage () {



	        this.preLoadComplete = false;

	        this.tmpImage = {};
	        for( let i=0; i<this.list.length; i++ ) this.tmpUrl.push( this.list[i] );
	        this.loadOne();
	        
	    }

	    nextImg () {

	        if(this.c === null) return

	        this.tmpUrl.shift();
	        if( this.tmpUrl.length === 0 ){ 

	            this.preLoadComplete = true;

	            this.addImages();
	            /*this.setList( this.list );
	            this.init();
	            if( this.isOpenOnStart ) this.open();*/

	        }
	        else this.loadOne();

	    }

	    loadOne(){

	        let self = this;
	        let name = this.tmpUrl[0];
	        let img = document.createElement('img');
	        img.style.cssText = 'position:absolute; width:'+self.imageSize[0]+'px; height:'+self.imageSize[1]+'px';
	        img.setAttribute('src', this.path + name + this.format );

	        img.addEventListener('load', function() {

	            self.imageSize[2] = img.width;
	            self.imageSize[3] = img.height;
	            self.tmpImage[name] = img;
	            self.nextImg();

	        });

	    }

	    //

	    testZone ( e ) {

	        let l = this.local;
	        if( l.x === -1 && l.y === -1 ) return '';

	        if( this.up && this.isOpen ){
	            if( l.y > this.h - this.baseH ) return 'title';
	            else {
	                if( this.scroll && ( l.x > (this.sa+this.sb-this.ss)) ) return 'scroll';
	                if(l.x > this.sa) return this.testItems( l.y-this.baseH );
	            }

	        } else {
	            if( l.y < this.baseH+2 ) return 'title';
	            else {
	                if( this.isOpen ){
	                    if( this.scroll && ( l.x > (this.sa+this.sb-this.ss)) ) return 'scroll';
	                    if(l.x > this.sa) return this.testItems( l.y-this.baseH );
	                }
	            }

	        }

	        return '';

	    }

	    testItems ( y ) {

	        let name = '';

	        let items = this.items;

	        /*if(this.hideCurrent){
	            //items = [...this.items]
	            items = this.items.slice(this.tmpId)

	        }*/

	        let i = items.length, item, a, b;
	        while(i--){
	            item = items[i];
	            a = item.posy + this.topList;
	            b = item.posy + this.itemHeight + 1 + this.topList;
	            if( y >= a && y <= b ){ 
	                name = 'item' + i;
	                this.modeItem(0);
	                this.current = item;
	                this.modeItem(1);
	                return name;
	            }

	        }

	        return name;

	    }

	    modeItem ( mode ) {

	        if( !this.current ) return

	        if( this.current.select && mode===0) mode = 2;
	        let cc = this.colors;

	        switch( mode ){

	            case 0: // base
	                this.current.style.background = cc.back;
	                this.current.style.color = cc.text;
	            break;
	            case 1: // over
	                this.current.style.background = cc.over;
	                this.current.style.color = cc.textOver;
	            break;
	            case 2: // edit / down
	                this.current.style.background = cc.select;
	                this.current.style.color = cc.textSelect;
	            break;

	        }
	    }

	    unSelected() {

	        if( !this.current ) return
	        this.modeItem(0);
	        this.current = null;

	    }

	    selected() {

	        if( !this.current ) return
	        this.resetItems();
	        this.modeItem(2);
	        this.current.select = true;

	        

	    }

	    resetItems() {

	        let i = this.items.length;
	        while(i--){
	            this.items[i].select = false;
	            this.items[i].style.background = this.colors.back;
	            this.items[i].style.color = this.colors.text;
	        }

	    }

	    hideActive() {

	        if( !this.hideCurrent ) return
	        //if( !this.current ) return
	        if( this.current )this.tmpId = this.current.id;
	        this.resetHide();
	        //this.items[this.tmpId].style.height = 0+'px'
	        
	    }

	    resetHide() {

	        console.log(this.tmpId);

	        let i = this.items.length;
	        while(i--){
	            if(i===this.tmpId){
	                this.items[i].style.height = 0+'px';
	                this.items[i].posy = -1;
	            } else {
	                this.items[i].style.height = this.itemHeight+'px';
	                this.items[i].posy = (this.itemHeight+1)*(i-1);
	            }
	            //this.items[i].style.display = 'flex'
	            
	            /*this.items[i].select = false
	            this.items[i].style.background = this.colors.back;
	            this.items[i].style.color = this.colors.text;*/
	        }

	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------


	    mouseup ( e ) {

	        this.isDown = false;

	    }

	    mousedown ( e ) {

	        let name = this.testZone( e );

	        if( !name ) return false;

	        if( name === 'scroll' ){

	            this.isDown = true;
	            this.mousemove( e );

	        } else if( name === 'title' ){

	            this.modeTitle(2);
	            if( !this.listOnly ){
	                this.hideActive();
	                if( !this.isOpen ) this.open();
	                else this.close();
	            }
	        } else {
	            // is item
	            if( this.current ){

	                this.value = this.list[ this.current.id ];
	                //this.tmpId = this.current.id

	                if( this.isSelectable ) this.selected();

	                //this.send( this.refObject !== null ? this.refObject[ this.list[this.current.id]] : this.value );
	                this.send( this.value );

	                if( !this.listOnly ) {
	                    this.close();
	                    this.setTopItem();
	                    //this.hideActive()
	                }
	            }
	            
	        }

	        return true;

	    }

	    mousemove ( e ) {

	        let nup = false;
	        let name = this.testZone( e );

	        if( !name ) return nup;

	        if( name === 'title' ){
	            this.unSelected();
	            this.modeTitle(1);
	            this.cursor('pointer');

	        } else if( name === 'scroll' ){

	            this.cursor('s-resize');
	            this.modeScroll(1);
	            if( this.isDown ){
	                this.modeScroll(2);
	                //this.update( ( e.clientY - top  ) - ( this.sh*0.5 ) );
	                let top = this.zone.y+this.baseH-2;
	                this.update( ( e.clientY - top  ) - ( this.sh*0.5 ) );
	            }
	            //if(this.isDown) this.listmove(e);
	        } else {

	            // is item
	            this.modeTitle(0);
	            this.modeScroll(0);
	            this.cursor('pointer');
	        
	        }

	        if( name !== this.prevName ) nup = true;
	        this.prevName = name;

	        return nup;

	    }

	    wheel ( e ) {

	        let name = this.testZone( e );
	        if( name === 'title' ) return false; 
	        this.py += e.delta*10;
	        this.update(this.py);
	        return true;

	    }



	    // ----------------------

	    reset () {

	        this.prevName = '';
	        this.unSelected();
	        this.modeTitle(0);
	        this.modeScroll(0);

	        //console.log('this is reset')
	        
	    }

	    modeScroll ( mode ) {

	        if( mode === this.sMode ) return;

	        let s = this.scroller.style;
	        let cc = this.colors;

	        switch(mode){
	            case 0: // base
	                s.background = cc.text;
	            break;
	            case 1: // over
	                s.background = cc.select;
	            break;
	            case 2: // edit / down
	                s.background = cc.select;
	            break;

	        }

	        this.sMode = mode;
	    }

	    modeTitle ( mode ) {

	        if( mode === this.tMode ) return;

	        let s = this.s;
	        let cc = this.colors;

	        switch(mode){
	            case 0: // base
	                s[3].color = cc.text;
	                s[3].background = cc.button;
	            break;
	            case 1: // over
	                s[3].color = cc.textOver;
	                s[3].background = cc.overoff;
	            break;
	            case 2: // edit / down
	                s[3].color = cc.textSelect;
	                s[3].background = cc.overoff;
	            break;

	        }

	        this.tMode = mode;

	    }

	    clearList () {

	        while ( this.listIn.children.length ) this.listIn.removeChild( this.listIn.lastChild );
	        this.items = [];

	    }

	    setList ( list ) {

	        this.clearList();

	        this.list = list;
	        this.length = this.list.length;

	        let lng = this.hideCurrent? this.length-1 : this.length;

	        this.maxItem = this.full ? lng : 5;
	        this.maxItem = lng < this.maxItem ? lng : this.maxItem;

	        this.maxHeight = this.maxItem * (this.itemHeight+1) + 2;
	        


	        this.max = lng * (this.itemHeight+1) + 2;
	        this.ratio = this.maxHeight / this.max;
	        this.sh = this.maxHeight * this.ratio;
	        this.range = this.maxHeight - this.sh;

	        this.c[2].style.height = this.maxHeight + 'px';
	        this.scrollerBack.style.height = this.maxHeight + 'px';
	        this.scroller.style.height = this.sh + 'px';

	        if( this.max > this.maxHeight ){ 
	            this.ww = this.sb - this.ss;
	            this.scroll = true;
	        }

	        if( this.miniCanvas ) {

	            this.tmpCanvas = document.createElement('canvas');
	            this.tmpCanvas.width = this.imageSize[0];
	            this.tmpCanvas.height = this.imageSize[1];
	            this.tmpCtx = this.tmpCanvas.getContext("2d");
	            this.tmpCtx.fillStyle = this.canvasBg;
	            this.tmpCtx.fillRect(0, 0, this.imageSize[0], this.imageSize[1]);

	        }

	        let item, n;//, l = this.sb;
	        for( let i=0; i<this.length; i++ ){

	            n = this.list[i];
	            item = this.dom( 'div', this.css.item + 'padding:0px '+(this.m+1)+'px; width:'+this.ww+'px; height:'+this.itemHeight+'px; line-height:'+(this.itemHeight-2)+'px; color:'+this.colors.text+'; background:'+this.colors.back+';' );
	            item.name = 'item'+ i;
	            item.id = i;
	            item.select = false;
	            item.posy = (this.itemHeight+1)*i;
	            this.listIn.appendChild( item );
	            this.items.push( item );

	            if( n === this.value ) this.current = item;

	            //if( this.isWithImage ) item.appendChild( this.tmpImage[n] );
	            if( !this.isWithImage ) item.textContent = n;

	            if( this.miniCanvas ){

	                let c = new Image();
	                c.src = this.tmpCanvas.toDataURL();

	                //item.style.marginLeft = (this.imageSize[0]+8)+'px'


	                /*let c = document.createElement('canvas')

	                c.width = this.imageSize[0]
	                c.height = this.imageSize[1]
	                let ctx = c.getContext("2d")
	                ctx.fillStyle = this.canvasBg
	                ctx.fillRect(0, 0, this.imageSize[0], this.imageSize[1])*/
	                
	                //c.style.cssText = 'position:relative; pointer-events:none; display:inline-block; float:left; margin-left:0px; margin-right:5px; top:2px'
	               // c.style.cssText =' flex-shrink: 0;'

	                c.style.cssText ='margin-right:4px;';


	                //c.style.cssText = 'display:flex; align-content: flex-start; flex-wrap: wrap;'
	                //item.style.float = 'right'
	                item.appendChild( c );

	                this.tmpImage[n] = c;

	            }

	            if( this.dragout ){

	                item.img = this.tmpImage[n];

	                item.style.pointerEvents = 'auto';
	                item.draggable = "true";

	                item.addEventListener('dragstart', this.dragstart || function(){ /*console.log('drag start')*/});
	                item.addEventListener('drag', this.drag || function(){ /*console.log('drag start')*/});
	                //item.addEventListener('dragover', this);
	                //item.addEventListener('dragenter', this);
	                item.addEventListener('dragleave', function(){ Roots.fakeUp(); } );
	                item.addEventListener('dragend', this.dragend || function(){ /*console.log('drag end')*/ }.bind(this) );
	                //item.addEventListener('drop', function(){console.log('drop')})

	            }

	        }

	        this.setTopItem();
	        if( this.isSelectable ) this.selected();
	        
	    }

	    drawImage( name, image, x,y,w,h ){

	        this.tmpCtx.clearRect(0, 0, this.imageSize[0], this.imageSize[1]);
	        this.tmpCtx.drawImage(image, x, y, w, h, 0, 0, this.imageSize[0], this.imageSize[1]);
	        this.tmpImage[name].src = this.tmpCanvas.toDataURL();


	        /*let c = this.tmpImage[name]
	        let ctx = c.getContext("2d")
	        ctx.drawImage(image, x, y, w, h, 0, 0, this.imageSize[0], this.imageSize[1])*/

	    }

	    addImages (){
	        let lng = this.list.length;
	        for( let i=0; i<lng; i++ ){
	            this.items[i].appendChild( this.tmpImage[this.list[i]] );
	        }
	        this.setTopItem();
	    }

	    setValue ( value ) {

	        if(!isNaN(value)) this.value = this.list[ value ];
	        else this.value = value;

	        //this.tmpId = value

	        this.setTopItem();

	    }

	    setTopItem (){

	        if( this.staticTop ) return;

	        if( this.isWithImage ){

	            if(!this.preLoadComplete ) return;

	            if(!this.c[3].children.length){
	                this.canvas = document.createElement('canvas');
	                this.canvas.width = this.imageSize[0];
	                this.canvas.height = this.imageSize[1];
	                this.canvas.style.cssText ='margin-right:4px;';
	                this.ctx = this.canvas.getContext("2d");
	                this.c[3].style.textAlign = 'left';
	                this.c[3].style.justifyContent = 'left';
	                this.c[3].appendChild( this.canvas );
	            }

	            this.tmpImage[ this.value ];
	            this.ctx.drawImage( this.tmpImage[ this.value ], 0, 0, this.imageSize[2], this.imageSize[3], 0,0, this.imageSize[0], this.imageSize[1] );

	        }
	        else this.c[3].textContent = this.value;

	        if( this.miniCanvas ){

	            if(!this.c[3].children.length){
	                this.canvas = document.createElement('canvas');
	                this.canvas.width = this.imageSize[0];
	                this.canvas.height = this.imageSize[1];
	                this.canvas.style.cssText ='margin-right:4px;';
	                this.ctx = this.canvas.getContext("2d");
	                this.c[3].style.textAlign = 'left';
	                this.c[3].style.justifyContent = 'left';
	                this.c[3].appendChild( this.canvas );
	            }

	            this.ctx.drawImage( this.tmpImage[ this.value ], 0, 0 );


	        }

	    }


	    // ----- LIST

	    update ( y ) {

	        if( !this.scroll ) return;

	        y = y < 0 ? 0 : y;
	        y = y > this.range ? this.range : y;

	        this.topList = -Math.floor( y / this.ratio );

	        this.listIn.style.top = this.topList+'px';
	        this.scroller.style.top = Math.floor( y )  + 'px';

	        this.py = y;

	    }

	    parentHeight ( t ) {

	        if ( this.group !== null ) this.group.calc( t );
	        else if ( this.isUI ) this.main.calc( t );

	    }

	    open ( first ) {

	        super.open();

	        this.update( 0 );

	        this.h = this.maxHeight + this.baseH + 5;
	        if( !this.scroll ){
	            this.topList = 0;
	            this.h = this.baseH + 5 + this.max;
	            this.scroller.style.display = 'none';
	            this.scrollerBack.style.display = 'none';
	        } else {
	            this.scroller.style.display = 'block';
	            this.scrollerBack.style.display = 'block';
	        }
	        this.s[0].height = this.h + 'px';
	        this.s[2].display = 'block';

	        if( this.up ){ 
	            this.zone.y -= this.h - (this.baseH-10);
	            this.setSvg( this.c[4], 'd', this.svgs.g1 );
	        } else {
	            this.setSvg( this.c[4], 'd', this.svgs.g2 );
	        }

	        this.rSizeContent();

	        let t = this.h - this.baseH;

	        this.zone.h = this.h;

	        if(!first) this.parentHeight( t );

	    }

	    close () {

	        super.close();

	        if( this.up ) this.zone.y += this.h - (this.baseH-10);

	        let t = this.h - this.baseH;

	        this.h = this.baseH;
	        this.s[0].height = this.h + 'px';
	        this.s[2].display = 'none';
	        this.setSvg( this.c[4], 'd', this.svgs.g1 );

	        this.zone.h = this.h;

	        this.parentHeight( -t );

	    }

	    // -----

	    text ( txt ) {

	        this.c[3].textContent = txt;

	    }

	    rSizeContent () {

	        let i = this.length;
	        while(i--) this.listIn.children[i].style.width = this.ww + 'px';

	    }

	    rSize () {

	        super.rSize();

	        //Proto.prototype.rSize.call( this );

	        let s = this.s;
	        let w = this.sb;
	        let d = this.sa;

	        if(s[2]=== undefined) return;

	        s[2].width = w + 'px';
	        s[2].left = d +'px';

	        s[3].width = w + 'px';
	        s[3].left = d + 'px';

	        s[4].left = d + w - 15 + 'px';

	        this.ww = w;
	        if( this.max > this.maxHeight ) this.ww = w-this.ss;
	        if(this.isOpen) this.rSizeContent();

	    }

	}

	class Numeric extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        this.setTypeNumber( o );

	        this.allway = o.allway || false;

	        this.isDown = false;
	        this.value = [0];
	        this.multy = 1;
	        this.invmulty = 1;
	        this.isSingle = true;
	        this.isAngle = false;
	        this.isVector = false;

	        if( o.isAngle ){
	            this.isAngle = true;
	            this.multy = Tools.torad;
	            this.invmulty = Tools.todeg;
	        }

	        this.isDrag = o.drag || false;

	        if( o.value !== undefined ){
	            if( !isNaN(o.value) ){
	                this.value = [o.value];
	            } else if( o.value instanceof Array ){ 
	                this.value = o.value;
	                this.isSingle = false;
	            } else if( o.value instanceof Object ){ 
	                this.value = [];
	                if( o.value.x !== undefined ) this.value[0] = o.value.x;
	                if( o.value.y !== undefined ) this.value[1] = o.value.y;
	                if( o.value.z !== undefined ) this.value[2] = o.value.z;
	                if( o.value.w !== undefined ) this.value[3] = o.value.w;
	                this.isSingle = false;
	                this.isVector = true;
	            }
	        }

	        this.lng = this.value.length;
	        this.tmp = [];

	        this.current = -1;
	        this.prev = { x:0, y:0, d:0, v:0 };

	        let cc = this.colors;

	        // bg
	        this.c[2] = this.dom( 'div', this.css.basic + ' background:' + cc.select + '; top:4px; width:0px; height:' + (this.h-8) + 'px;' );

	        this.cMode = [];
	        
	        let i = this.lng;
	        while(i--){

	            if( this.isAngle ) this.value[i] = (this.value[i] * 180 / Math.PI).toFixed( this.precision );
	            this.c[3+i] = this.dom( 'div', this.css.txtselect + 'top:1px; height:'+(this.h-2)+'px; color:' + cc.text + '; background:' + cc.back + '; borderColor:' + cc.border+'; border-radius:'+this.radius+'px;');
	            if(o.center) this.c[2+i].style.textAlign = 'center';
	            this.c[3+i].textContent = this.value[i];
	            this.c[3+i].style.color = this.colors.text;
	            this.c[3+i].isNum = true;
	            this.cMode[i] = 0;

	        }

	        // selection
	        this.selectId = 3 + this.lng;
	        this.c[this.selectId] = this.dom(  'div', this.css.txtselect + 'position:absolute; top:2px; height:' + (this.h-4) + 'px; padding:0px 0px; width:0px; color:' + cc.textSelect + '; background:' + cc.select + '; border:none; border-radius:0px;');

	        // cursor
	        this.cursorId = 4 + this.lng;
	        this.c[ this.cursorId ] = this.dom( 'div', this.css.basic + 'top:2px; height:' + (this.h-4) + 'px; width:0px; background:'+cc.text+';' );

	        this.init();
	    }

	    testZone ( e ) {

	        let l = this.local;
	        if( l.x === -1 && l.y === -1 ) return ''

	        let i = this.lng;
	        let t = this.tmp;

	        while( i-- ){
	            if( l.x>t[i][0] && l.x<t[i][2] ) return i
	        }

	        return ''

	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    mousedown ( e ) {

	        let name = this.testZone( e );

	        if( !this.isDown ){
	            this.isDown = true;
	            if( name !== '' ){ 
	            	this.current = name;
	            	this.prev = { x:e.clientX, y:e.clientY, d:0, v: this.isSingle ? parseFloat(this.value) : parseFloat( this.value[ this.current ] ) };
	            	this.setInput( this.c[ 3 + this.current ] );
	            }
	            return this.mousemove( e )
	        }

	        return false

	    }

	    mouseup ( e ) {

	    	if( this.isDown ){
	            
	            this.isDown = false;
	            this.prev = { x:0, y:0, d:0, v:0 };

	            return this.mousemove( e )
	        }

	        return false

	    }

	    mousemove ( e ) {

	        let nup = false;
	        let x = 0;

	        let name = this.testZone( e );

	        if( name === '' ) this.cursor();
	        else { 
	        	if(!this.isDrag) this.cursor('text');
	        	else this.cursor( this.current !== -1 ? 'move' : 'pointer' );
	        }

	        

	        if( this.isDrag ){

	        	if( this.current !== -1 ){

	            	this.prev.d += ( e.clientX - this.prev.x ) - ( e.clientY - this.prev.y );

	                let n = this.prev.v + ( this.prev.d * this.step);

	                this.value[ this.current ] = this.numValue(n);
	                this.c[ 3 + this.current ].textContent = this.value[this.current];

	                this.validate();

	                this.prev.x = e.clientX;
	                this.prev.y = e.clientY;

	                nup = true;
	             }

	        } else {

	        	if( this.isDown ) x = e.clientX - this.zone.x -3;
	        	if( this.current !== -1 ) x -= this.tmp[this.current][0];
	        	return this.upInput( x, this.isDown )

	        }

	        return nup

	    }

	    // ----------------------

	    reset () {

	        let nup = false;
	        return nup

	    }


	    setValue ( v ) {

	        if( this.isVector ){
	            if( v.x !== undefined ) this.value[0] = v.x;
	            if( v.y !== undefined ) this.value[1] = v.y;
	            if( v.z !== undefined ) this.value[2] = v.z;
	            if( v.w !== undefined ) this.value[3] = v.w;
	        } else {
	            this.value = this.isSingle ? [v] : v;  
	        }

	        this.update();

	    }

	    sameStr ( str ){

	        let i = this.value.length;
	        while(i--) this.c[ 3 + i ].textContent = str;

	    }

	    update ( up ) {

	        let i = this.value.length;

	        while(i--){
	             this.value[i] = this.numValue( this.value[i] * this.invmulty );
	             this.c[ 3 + i ].textContent = this.value[i];
	        }

	        if( up ) this.send();

	    }

	    send ( v ) {

	        v = v || this.value;

	        this.isSend = true;

	        if( this.objectLink !== null ){ 

	            if( this.isVector ){
	                this.objectLink[ this.objectKey ].fromArray( v );
	            } else {
	                this.objectLink[ this.objectKey ] = v;
	            }

	        }

	        if( this.callback ) this.callback( v, this.objectKey );
	        this.isSend = false;

	    }


	    // ----------------------
	    //   INPUT
	    // ----------------------

	    select ( c, e, w, t ) {

	        let s = this.s;
	        let d = this.current !== -1 ? this.tmp[this.current][0] + 5 : 0;
	        s[this.cursorId].width = '1px';
	        s[this.cursorId].left = ( d + c ) + 'px';
	        s[this.selectId].left =  ( d + e )  + 'px';
	        s[this.selectId].width =  w  + 'px';
	        this.c[this.selectId].innerHTML = t;
	    
	    }

	    unselect () {

	        let s = this.s;
	        if(!s) return
	        this.c[this.selectId].innerHTML = '';
	        s[this.selectId].width = 0 + 'px';
	        s[this.cursorId].width = 0 + 'px';

	    }

	    validate ( force ) {

	        let ar = [];
	        let i = this.lng;

	        if( this.allway ) force = true;

	        while(i--){
	        	if(!isNaN( this.c[ 3 + i ].textContent )){ 
	                let nx = this.numValue( this.c[ 3 + i ].textContent );
	                this.c[ 3 + i ].textContent = nx;
	                this.value[i] = nx;
	            } else { // not number
	                this.c[ 3 + i ].textContent = this.value[i];
	            }

	        	ar[i] = this.value[i] * this.multy;
	        }

	        if( !force ) return
	        this.send( this.isSingle ? ar[0] : ar );

	    }

	    // ----------------------
	    //   REZISE
	    // ----------------------

	    rSize () {

	        super.rSize();
	        let sx = this.colors.sx;
	        let ss = sx * (this.lng-1);
	        let w = (this.sb-ss) / this.lng;//(( this.sb + sx ) / this.lng )-sx
	        let s = this.s;
	        let i = this.lng;

	        while(i--){
	            //this.tmp[i] = [ Math.floor( this.sa + ( w * i )+( 5 * i )), w ];
	            this.tmp[i] = [ ( this.sa + ( w * i )+( sx * i )), w ];
	            this.tmp[i][2] = this.tmp[i][0] + this.tmp[i][1];
	            s[ 3 + i ].left = this.tmp[i][0] + 'px';
	            s[ 3 + i ].width = this.tmp[i][1] + 'px';
	        }

	    }

	}

	class Slide extends Proto {
	  constructor(o = {}) {
	    super(o);

	    if (o.easing <= 0) throw "Easing must be > 0";
	    this.easing = o.easing || 1;

	    this.setTypeNumber(o);

	    this.model = o.stype || 0;
	    if (o.mode !== undefined) this.model = o.mode;

	    //this.defaultBorderColor = this.colors.hide;

	    this.isDown = false;
	    this.isOver = false;
	    this.allway = o.allway || false;

	    this.isDeg = o.isDeg || false;
	    this.isCyclic = o.cyclic || false;

	    this.firstImput = false;

	    let cc = this.colors;

	    //this.c[2] = this.dom( 'div', this.css.txtselect + 'letter-spacing:-1px; text-align:right; width:47px; border:1px dashed '+this.defaultBorderColor+'; color:'+ this.colors.text );
	    //this.c[2] = this.dom( 'div', this.css.txtselect + 'text-align:right; width:47px; border:1px dashed '+this.defaultBorderColor+'; color:'+ this.colors.text );
	    this.c[2] = this.dom(
	      "div",
	      this.css.txtselect +
	        "border:none; background:none; width:47px; color:" +
	        cc.text +
	        ";"
	    );
	    //this.c[2] = this.dom( 'div', this.css.txtselect + 'letter-spacing:-1px; text-align:right; width:47px; color:'+ this.colors.text );
	    this.c[3] = this.dom(
	      "div",
	      this.css.basic + " top:0; height:" + this.h + "px;"
	    );

	    this.c[4] = this.dom(
	      "div",
	      this.css.basic +
	        "background:" +
	        cc.back +
	        "; top:2px; height:" +
	        (this.h - 4) +
	        "px;"
	    );
	    this.c[5] = this.dom(
	      "div",
	      this.css.basic +
	        "left:4px; top:5px; height:" +
	        (this.h - 10) +
	        "px; background:" +
	        cc.text +
	        ";"
	    );

	    this.c[2].isNum = true;
	    //this.c[2].style.height = (this.h-4) + 'px';
	    //this.c[2].style.lineHeight = (this.h-8) + 'px';
	    this.c[2].style.height = this.h - 2 + "px";
	    this.c[2].style.lineHeight = this.h - 10 + "px";

	    if (this.model !== 0) {
	      let r1 = 4,
	        h1 = 4,
	        h2 = 8,
	        ww = this.h - 6,
	        ra = 16;

	      if (this.model === 2) {
	        r1 = 0;
	        h1 = 2;
	        h2 = 4;
	        ra = 2;
	        ww = (this.h - 6) * 0.5;
	      }

	      if (this.model === 3) this.c[5].style.visible = "none";

	      this.c[4].style.borderRadius = r1 + "px";
	      this.c[4].style.height = h2 + "px";
	      this.c[4].style.top = this.h * 0.5 - h1 + "px";
	      this.c[5].style.borderRadius = r1 * 0.5 + "px";
	      this.c[5].style.height = h1 + "px";
	      this.c[5].style.top = this.h * 0.5 - h1 * 0.5 + "px";

	      //this.c[6] = this.dom( 'div', this.css.basic + 'border-radius:'+ra+'px; margin-left:'+(-ww*0.5)+'px; border:1px solid '+cc.border+'; background:'+cc.button+'; left:4px; top:2px; height:'+(this.h-4)+'px; width:'+ww+'px;' );
	      this.c[6] = this.dom(
	        "div",
	        this.css.basic +
	          "border-radius:" +
	          ra +
	          "px; margin-left:" +
	          -ww * 0.5 +
	          "px; background:" +
	          cc.text +
	          "; left:4px; top:3px; height:" +
	          (this.h - 6) +
	          "px; width:" +
	          ww +
	          "px;"
	      );
	    }

	    this.init();
	  }

	  testZone(e) {
	    let l = this.local;
	    if (l.x === -1 && l.y === -1) return "";

	    if (l.x >= this.txl) return "text";
	    else if (l.x >= this.sa) return "scroll";
	    else return "";
	  }

	  // ----------------------
	  //   EVENTS
	  // ----------------------

	  mouseup(e) {
	    if (this.isDown) this.isDown = false;
	  }

	  mousedown(e) {
	    let name = this.testZone(e);

	    if (!name) return false;

	    if (name === "scroll") {
	      this.isDown = true;
	      this.old = this.value;
	      this.mousemove(e);
	    }

	    /*if( name === 'text' ){
	            this.setInput( this.c[2], function(){ this.validate() }.bind(this) );
	        }*/

	    return true;
	  }

	  mousemove(e) {
	    let nup = false;

	    let name = this.testZone(e);

	    if (name === "scroll") {
	      this.mode(1);
	      this.cursor("w-resize");
	      //} else if(name === 'text'){
	      //this.cursor('pointer');
	    } else {
	      this.cursor();
	    }

	    if (this.isDown) {
	      let nNormalized = (e.clientX - (this.zone.x + this.sa) - 3) / this.ww;

	      // lo mapeo al rango 0 ... 1
	      nNormalized = Math.min(1, Math.max(0, nNormalized));

	      // aplico easing
	      let nEased = Math.pow(nNormalized, this.easing); // easing

	      let nNew = nEased * this.range + this.min;
	      let nNewSlider = nNormalized * this.range + this.min;

	      this.sliderValue = this.numValue(nNewSlider);

	      let delta = nNew - this.old;

	      let steps;
	      if (delta >= this.step || delta <= this.step) {
	        steps = Math.floor(delta / this.step);
	        this.value = this.numValue(this.old + steps * this.step);
	        // value without easing applied

	        this.update(true);
	        this.old = this.value;
	      }
	      //console.log("n, normalized, value", nNew, nNormalized, this.value);
	      nup = true;
	    }

	    return nup;
	  }

	  wheel(e) {
	    let name = this.testZone(e);

	    if (name === "scroll") {
	      let v = this.value - this.step * e.delta;

	      if (v > this.max) {
	        v = this.isCyclic ? this.min : this.max;
	      } else if (v < this.min) {
	        v = this.isCyclic ? this.max : this.min;
	      }

	      this.setValue(v);
	      this.old = v;
	      this.update(true);

	      return true;
	    }

	    return false;
	  }

	  //keydown: function ( e ) { return true; },

	  // ----------------------

	  validate() {
	    let n = this.c[2].textContent;

	    if (!isNaN(n)) {
	      this.value = this.numValue(n);
	      this.update(true);
	    } else this.c[2].textContent = this.value + (this.isDeg ? "°" : "");
	  }

	  reset() {
	    //this.clearInput();
	    this.isDown = false;
	    this.mode(0);
	  }

	  mode(mode) {
	    let s = this.s;
	    let cc = this.colors;

	    switch (mode) {
	      case 0: // base
	        // s[2].border = '1px solid ' + this.colors.hide;
	        s[2].color = cc.text;
	        s[4].background = cc.back;
	        s[5].background = cc.text;
	        if (this.model !== 0) s[6].background = cc.text; //cc.button;
	        break;
	      case 1: // scroll over
	        //s[2].border = '1px dashed ' + this.colors.hide;
	        s[2].color = cc.textOver;
	        s[4].background = cc.back;
	        s[5].background = cc.textOver;
	        if (this.model !== 0) s[6].background = cc.textOver; //cc.overoff;
	        break;
	    }
	  }

	  update(up) {
	    let ww = Math.floor(this.ww * ((this.sliderValue - this.min) / this.range));
	    //let ww = Math.floor(this.ww * ((this.value - this.min) / this.range));

	    if (this.model !== 3) this.s[5].width = ww + "px";
	    if (this.s[6]) this.s[6].left = this.sa + ww + 3 + "px";
	    this.c[2].textContent = this.value + (this.isDeg ? "°" : "");

	    if (up) this.send();
	  }

	  rSize() {
	    super.rSize();

	    let w = this.sb - this.sc;
	    this.ww = w - 6;

	    let tx = this.sc;
	    if (this.isUI || !this.simple) tx = this.sc + 10;
	    this.txl = this.w - tx + 2;

	    //let ty = Math.floor(this.h * 0.5) - 8;

	    let s = this.s;

	    s[2].width = this.sc - 6 + "px";
	    s[2].left = this.txl + 4 + "px";
	    //s[2].top = ty + 'px';
	    s[3].left = this.sa + "px";
	    s[3].width = w + "px";
	    s[4].left = this.sa + "px";
	    s[4].width = w + "px";
	    s[5].left = this.sa + 3 + "px";

	    this.update();
	  }
	}

	class TextInput extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        this.cmode = 0;

	        this.value = o.value !== undefined ? o.value : '';
	        this.placeHolder = o.placeHolder || '';

	        this.allway = o.allway || false;
	        this.editable = o.edit !== undefined ? o.edit : true;

	        this.isDown = false;

	        let cc = this.colors;

	        // text
	        this.c[2] = this.dom( 'div', this.css.txtselect + 'top:1px; height:' + (this.h-2) + 'px; color:' + cc.text + '; background:' + cc.back + '; borderColor:' + cc.border+'; border-radius:'+this.radius+'px;' );
	        this.c[2].textContent = this.value;

	        // selection
	        this.c[3] = this.dom(  'div', this.css.txtselect + 'position:absolute; top:2px; height:' + (this.h-4) + 'px; padding:0px 0px; width:0px; color:' + cc.textSelect + '; background:' + cc.select + '; border:none; border-radius:0px;');

	        // cursor
	        this.c[4] = this.dom( 'div', this.css.basic + 'top:2px; height:' + (this.h-4) + 'px; width:0px; background:'+cc.text+';' );

	        // fake
	        this.c[5] = this.dom( 'div', this.css.txtselect + 'top:1px; height:' + (this.h-2) + 'px; border:none; justify-content: center; font-style: italic; color:'+cc.border+';' );
	        if( this.value === '' ) this.c[5].textContent = this.placeHolder;

	        


	        this.init();

	    }

	    testZone ( e ) {

	        let l = this.local;
	        if( l.x === -1 && l.y === -1 ) return '';
	        if( l.x >= this.sa ) return 'text';
	        return '';

	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    mouseup ( e ) {

	        if(!this.editable) return;

	        if( this.isDown ){
	            this.isDown = false;
	            return this.mousemove( e );
	        }

	        return false;

	    }

	    mousedown ( e ) {

	        if(!this.editable) return;

	        let name = this.testZone( e );

	        if( !this.isDown ){
	            this.isDown = true;
	            if( name === 'text' ) this.setInput( this.c[2] );
	            return this.mousemove( e );
	        }

	        return false;

	    }

	    mousemove ( e ) {

	        if(!this.editable) return;

	        let name = this.testZone( e );

	        //let l = this.local;
	        //if( l.x === -1 && l.y === -1 ){ return;}

	        //if( l.x >= this.sa ) this.cursor('text');
	        //else this.cursor();

	        let x = 0;

	        if( name === 'text' ) this.cursor('text');
	        else this.cursor();

	        if( this.isDown ) x = e.clientX - this.zone.x;

	        return this.upInput( x - this.sa -3, this.isDown );

	    }

	    update ( ) {

	        this.c[2].textContent = this.value;
	        
	    }

	    // ----------------------

	    reset () {

	        this.cursor();

	    }

	    // ----------------------
	    //   INPUT
	    // ----------------------

	    select ( c, e, w, t ) {

	        let s = this.s;
	        let d = this.sa + 5;
	        s[4].width = '1px';
	        s[4].left = ( d + e ) + 'px';

	        s[3].left =  ( d + e )  + 'px';
	        s[3].width =  w  + 'px';
	        this.c[3].innerHTML = t;
	    
	    }

	    unselect () {

	        let s = this.s;
	        if(!s) return;
	        s[3].width =  0  + 'px';
	        this.c[3].innerHTML = 't';
	        s[4].width = 0 + 'px';

	    }

	    validate ( force ) {

	        if( this.allway ) force = true; 

	        this.value = this.c[2].textContent;

	        if(this.value !== '') this.c[5].textContent = '';
	        else this.c[5].textContent = this.placeHolder;

	        if( !force ) return;

	        this.send();

	    }

	    // ----------------------
	    //   REZISE
	    // ----------------------

	    rSize () {

	        super.rSize();

	        let s = this.s;
	        s[2].left = this.sa + 'px';
	        s[2].width = this.sb + 'px';

	        s[5].left = this.sa + 'px';
	        s[5].width = this.sb + 'px';
	     
	    }


	}

	class Title extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        let prefix = o.prefix || '';

	        this.c[2] = this.dom( 'div', this.css.txt + 'justify-content:right; width:60px; line-height:'+ (this.h-8) + 'px; color:' + this.colors.text );

	        if( this.h === 31 ){

	            this.s[0].height = this.h + 'px';
	            this.s[1].top = 8 + 'px';
	            this.c[2].style.top = 8 + 'px';

	        }

	        let s = this.s;

	        s[1].justifyContent = o.align || 'left';
	        //s[1].textAlign = o.align || 'left';
	        s[1].fontWeight = o.fontWeight || 'bold';


	        this.c[1].textContent = this.txt.substring(0,1).toUpperCase() + this.txt.substring(1).replace("-", " ");
	        this.c[2].textContent = prefix;

	        this.init();

	    }

	    text( txt ) {

	        this.c[1].textContent = txt;

	    }

	    text2( txt ) {

	        this.c[2].textContent = txt;

	    }

	    rSize() {

	        super.rSize();
	        this.s[1].width = this.w + 'px'; //- 50 + 'px';
	        this.s[2].left = this.w + 'px';//- ( 50 + 26 ) + 'px';

	    }

	    setColor( c ) {
	        this.s[1].color = c;
	        this.s[2].color = c;
	    }

	}

	class Select extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        this.value = o.value || '';
	        this.isDown = false;
	        this.onActif = o.onActif || function(){};

	        //let prefix = o.prefix || '';
	        const cc = this.colors;

	        this.c[2] = this.dom( 'div', this.css.txt + this.css.button + ' top:1px; background:'+cc.button+'; height:'+(this.h-2)+'px; border:'+ cc.buttonBorder+'; border-radius:15px; width:30px; left:10px;' );
	        //this.c[2].style.color = this.fontColor;

	        this.c[3] = this.dom( 'div', this.css.txtselect + 'height:' + (this.h-4) + 'px; background:' + cc.inputBg + '; borderColor:' + cc.inputBorder+'; border-radius:'+this.radius+'px;' );
	        this.c[3].textContent = this.value;

	        let fltop = Math.floor(this.h*0.5)-7;
	        this.c[4] = this.dom( 'path', this.css.basic + 'position:absolute; width:14px; height:14px; left:5px; top:'+fltop+'px;', { d:this.svgs[ 'cursor' ], fill:cc.text, stroke:'none'});

	        this.stat = 1;
	        this.isActif = false;

	        this.init();

	    }

	    testZone ( e ) {

	        let l = this.local;
	        if( l.x === -1 && l.y === -1 ) return ''
	        if( l.x > this.sa && l.x < this.sa+30 ) return 'over'
	        return '0'

	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    mouseup ( e ) {
	    
	        if( this.isDown ){
	            //this.value = false;
	            this.isDown = false;
	            //this.send();
	            return this.mousemove( e )
	        }

	        return false

	    }

	    mousedown ( e ) {

	        let name = this.testZone( e );

	        if( !name ) return false

	        this.isDown = true;
	        //this.value = this.values[ name-2 ];
	        //this.send();
	        return this.mousemove( e )

	    }

	    mousemove ( e ) {

	        let up = false;
	        let name = this.testZone( e );

	        if( name === 'over' ){
	            this.cursor('pointer');
	            up = this.mode( this.isDown ? 3 : 2 );
	        } else {
	            up = this.reset();
	        }

	        return up

	    }

	    // ----------------------

	    apply ( v ) {

	        v = v || '';

	        if( v !== this.value ) {
	            this.value = v;
	            this.c[3].textContent = this.value;
	            this.send();
	        }
	        
	        this.mode(1);

	    }

	    update () {

	        this.mode( 3 );

	    }

	    mode ( n ) {

	        let change = false;
	        let cc = this.colors;

	        if( this.stat !== n ){

	            if( n===1 ) this.isActif = false;
	            if( n===3 ){ 
	                if( !this.isActif ){ this.isActif = true; n=4; this.onActif( this ); }
	                else { this.isActif = false; }
	            }

	            if( n===2 && this.isActif ) n = 4;

	            this.stat = n;

	            switch( n ){

	                case 1: this.s[ 2 ].color = cc.text; this.s[ 2 ].background = cc.button; break; // base
	                case 2: this.s[ 2 ].color = cc.textOver; this.s[ 2 ].background = cc.overoff; break; // over
	                case 3: this.s[ 2 ].color = cc.textOver; this.s[ 2 ].background = cc.action; break; // down
	                case 4: this.s[ 2 ].color = cc.textSelect; this.s[ 2 ].background = cc.action; break; // actif

	            }

	            change = true;

	        }

	        return change



	    }

	    reset () {

	        this.cursor();
	        return this.mode( this.isActif ? 4 : 1 )

	    }

	    text ( txt ) {

	        this.c[3].textContent = txt;

	    }

	    rSize () {

	        super.rSize();

	        let s = this.s;
	        s[2].left = this.sa + 'px';
	        s[3].left = (this.sa + 40) + 'px';
	        s[3].width = (this.sb - 40) + 'px';
	        s[4].left = (this.sa+8) + 'px';

	    }

	}

	class Bitmap extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        this.value = o.value || '';
	        this.refTexture = o.texture || null;
	        this.img = null;

	        this.isDown = false;
	        this.neverlock = true;



	        const cc = this.colors;

	        this.c[2] = this.dom( 'div', this.css.txt + this.css.button + ' top:1px; background:'+cc.button+'; height:'+(this.h-2)+'px; border:'+cc.buttonBorder+'; border-radius:15px; width:30px; left:10px;' );

	        this.c[3] = this.dom( 'div', this.css.txtselect + 'height:' + (this.h-4) + 'px; background:' + cc.inputBg + '; borderColor:' + cc.inputBorder+'; border-radius:'+this.radius+'px;' );
	        this.c[3].textContent = this.value;

	        let fltop = Math.floor(this.h*0.5)-7;
	        this.c[4] = this.dom( 'path', this.css.basic + 'position:absolute; width:14px; height:14px; left:5px; top:'+fltop+'px;', { d:this.svgs[ 'load' ], fill:cc.text, stroke:'none'});

	        this.stat = 1;

	        this.init();

	    }

	    testZone ( e ) {

	        let l = this.local;
	        if( l.x === -1 && l.y === -1 ) return '';
	        if( l.x > this.sa && l.x < this.sa+30 ) return 'over';
	        return '0'

	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    mouseup ( e ) {
	    
	        if( this.isDown ){
	            //this.value = false;
	            this.isDown = false;
	            //this.send();
	            return this.mousemove( e );
	        }

	        return false;

	    }

	    mousedown ( e ) {

	        let name = this.testZone( e );

	        if( !name ) return false;

	        if( name === 'over' ){
	            this.isDown = true;
	            Files.load( { callback:this.changeBitmap.bind(this) } );

	        }

	        
	        //this.value = this.values[ name-2 ];
	        //this.send();
	        return this.mousemove( e );

	    }

	    mousemove ( e ) {

	        let up = false;

	        let name = this.testZone( e );

	        if( name === 'over' ){
	            this.cursor('pointer');
	            up = this.mode( this.isDown ? 3 : 2 );
	        } else {
	            up = this.reset();
	        }

	        return up;

	    }

	    // ----------------------

	    changeBitmap( img, fname ){

	        if( img ){
	            this.img = img;
	            this.apply( fname );
	        } else {
	            this.img = null;
	            this.apply( 'null' );
	        }
	        
	    }

	    // ----------------------

	    apply ( v ) {

	        v = v || '';

	        if( v !== this.value ) {
	            this.value = v;
	            this.c[3].textContent = this.value;

	            if( this.img !== null ){
	                if( this.objectLink !== null ) this.objectLink[ this.val ] = v;
	                if( this.callback ) this.callback( this.value, this.img, this.name );
	            }
	            
	        }
	        
	        this.mode(1);

	    }

	    update () {

	        this.mode( 3 );

	    }

	    mode ( n ) {

	        let change = false;
	        let cc = this.colors;

	        if( this.stat !== n ){

	            this.stat = n;

	            switch( n ){

	                case 1: this.s[ 2 ].color = cc.text; this.s[ 2 ].background = cc.button; break; // base
	                case 2: this.s[ 2 ].color = cc.textOver; this.s[ 2 ].background = cc.overoff; break; // over
	                case 3: this.s[ 2 ].color = cc.textOver; this.s[ 2 ].background = cc.over; break; // down
	                case 4: this.s[ 2 ].color = cc.textSelect; this.s[ 2 ].background = cc.select; break; // actif

	            }

	            change = true;

	        }

	        return change;



	    }

	    reset () {

	        this.cursor();
	        return this.mode( this.isActif ? 4 : 1 );

	    }

	    text ( txt ) {

	        this.c[3].textContent = txt;

	    }

	    rSize () {

	        super.rSize();

	        let s = this.s;
	        s[2].left = this.sa + 'px';
	        s[3].left = (this.sa + 40) + 'px';
	        s[3].width = (this.sb - 40) + 'px';
	        s[4].left = (this.sa+8) + 'px';

	    }

	}

	//import { Proto } from '../core/Proto.js';

	class Selector extends Button {

	    constructor( o = {} ) {

	        if( o.selectable === undefined ) o.selectable = true;
	        super( o );
	     
	    }

	}

	class Item extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        this.p = 100;
	        this.value = this.txt;
	        this.status = 1;

	        this.itype = o.itype || 'none';
	        this.val = this.itype;

	        this.graph = this.svgs[ this.itype ];

	        let fltop = Math.floor(this.h*0.5)-7;

	        this.c[2] = this.dom( 'path', this.css.basic + 'position:absolute; width:14px; height:14px; left:5px; top:'+fltop+'px;', { d:this.graph, fill:this.colors.text, stroke:'none'});

	        this.s[1].marginLeft = 20 + 'px';

	        this.init();

	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    mousemove ( e ) {

	        this.cursor('pointer');

	        //up = this.modes( this.isDown ? 3 : 2, name );

	    }

	    mousedown ( e ) {

	        if( this.isUI ) this.main.resetItem();

	        this.selected( true );

	        this.send();

	        return true;

	    }

	    uiout () {

	        if( this.isSelect ) this.mode(3);
	        else this.mode(1);

	    }

	    uiover () {

	        if( this.isSelect ) this.mode(4);
	        else this.mode(2);

	    }

	    update () {
	            
	    }

	    /*rSize () {
	        
	        super.rSize();

	    }*/

	    mode ( n ) {

	        let change = false;

	        if( this.status !== n ){

	            this.status = n;
	            let s = this.s, cc = this.colors;
	        
	            switch( n ){

	                case 1: this.status = 1; s[1].color = cc.text; s[0].background = 'none'; break;
	                case 2: this.status = 2; s[1].color = cc.textOver; s[0].background = cc.back; break;
	                case 3: this.status = 3; s[1].color = cc.textSelect; s[0].background = cc.select; break;
	                case 4: this.status = 4; s[1].color = cc.textOver; s[0].background = cc.over; break;

	            }

	            change = true;

	        }

	        return change;

	    }

	    reset () {

	        this.cursor();
	       // return this.mode( 1 );

	    }

	    selected ( b ){

	        if( this.isSelect ) this.mode(1);

	        this.isSelect = b || false;

	        if( this.isSelect ) this.mode(3);
	        
	    }


	}

	class Grid extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        /*this.values = o.values || [];

	        if( typeof this.values === 'string' ) this.values = [ this.values ];*/

	        this.values = [];

	        if( o.values ){
	            if( o.values instanceof Array ){
	                this.values = o.values;
	            } else if( o.values instanceof String ){
	                this.values = [ o.values ];
	            } else if( o.values instanceof Object ){
	                this.refObject = o.values;
	                for( let g in this.refObject ) this.values.push( g );
	            }
	        }

	        this.lng = this.values.length;



	        this.value = o.value || null;




	        let cc = this.colors;


	        this.isSelectable = o.selectable || false;
	        this.spaces = o.spaces || [ cc.sx, cc.sy ];
	        this.bsize = o.bsize || [ 90, this.h ];

	        this.bsizeMax = this.bsize[0];

	        this.tmp = [];
	        this.stat = [];
	        this.grid = [ 2, Math.round( this.lng * 0.5 ) ];

	        this.h = ( this.grid[1] * this.bsize[1] ) + ( this.grid[1] * this.spaces[1] ); //+ 4 - (this.mtop*2) //+ (this.spaces[1] - this.mtop);

	        this.c[1].textContent = '';
	        //this.c[2] = this.dom( 'table', this.css.basic + 'width:100%; top:'+(this.spaces[1]-2)+'px; height:auto; border-collapse:separate; border:none; border-spacing: '+(this.spaces[0]-2)+'px '+(this.spaces[1]-2)+'px;' );
	        this.c[2] = this.dom( 'table', this.css.basic + 'width:100%; border-spacing: '+(this.spaces[0]-2)+'px '+(this.spaces[1])+'px; border:none;' );

	        let n = 0, b, td, tr, sel;

	        this.res = -1;
	        this.isDown = false;
	        this.neverlock = true;

	        this.buttons = []; 
	        this.stat = [];
	        this.tmpX = [];
	        this.tmpY = [];

	        for( let i = 0; i < this.grid[1]; i++ ){

	            tr = this.c[2].insertRow();
	            tr.style.cssText = 'pointer-events:none;';
	            for( let j = 0; j < this.grid[0]; j++ ){

	                td = tr.insertCell();
	                td.style.cssText = 'pointer-events:none;';

	                if( this.values[n] ){

	                    sel = false;
	                    if( this.values[n] === this.value && this.isSelectable ) sel = true;

	                    b = document.createElement( 'div' );
	                    b.style.cssText = this.css.txt + this.css.button + 'position:static; top:1px; width:'+this.bsize[0]+'px; height:'+(this.bsize[1]-2)+'px; border:'+cc.borderSize+'px solid '+cc.border+'; left:auto; right:auto; border-radius:'+this.radius+'px;';
	                    b.style.background = sel ? cc.select : cc.button;
	                    b.style.color = sel ? cc.textSelect : cc.text;
	                    b.innerHTML = this.values[n];
	                    td.appendChild( b );

	                    this.buttons.push(b);
	                    this.stat.push(1);

	                } else {

	                    b = document.createElement( 'div' );
	                    b.style.cssText = this.css.txt + 'position:static; width:'+this.bsize[0]+'px; height:'+this.bsize[1]+'px; text-align:center; left:auto; right:auto; background:none;';
	                    td.appendChild( b );

	                }

	                if(j===0) b.style.cssText += 'float:right;';
	                else b.style.cssText += 'float:left;';
	            
	                n++;

	            }
	        }

	        this.s[0].border = 'none';

	        this.init();

	    }

	    testZone ( e ) {

	        let l = this.local;
	        if( l.x === -1 && l.y === -1 ) return -1;

	        l.y += this.mtop;
	        
	        let tx = this.tmpX;
	        let ty = this.tmpY;

	        let id = -1;
	        let c = -1;
	        let line = -1;
	        let i = this.grid[0];
	        while( i-- ){
	        	if( l.x > tx[i][0] && l.x < tx[i][1] ) c = i;
	        }

	        i = this.grid[1];
	        while( i-- ){
	            if( l.y > ty[i][0] && l.y < ty[i][1] ) line = i;
	        }

	        if(c!==-1 && line!==-1){
	            id = c + (line*2);
	            if(id>this.lng-1) id = -1;
	        }

	        return id;

	    }

	    // ----------------------
	    //   EVENTS
	    // ----------------------

	    mouseup ( e ) {

	        if( !this.isDown ) return false

	        this.isDown = false;
	        if( this.res !== -1 ){
	            this.value = this.values[this.res];
	            this.send();
	        }

	        return this.mousemove( e )

	    }

	    mousedown ( e ) {

	        if( this.isDown ) return false
	        this.isDown = true;
	        return this.mousemove( e )

	    }

	    mousemove ( e ) {

	        let up = false;
	        this.res = this.testZone( e );

	        if( this.res !== -1 ){
	            this.cursor('pointer');
	            up = this.modes( this.isDown ? 3 : 2, this.res );
	        } else {
	        	up = this.reset();
	        }

	        return up;

	    }

	    // ----------------------
	    //   MODE
	    // -----------------------

	    modes ( N = 1, id = -1 ) {

	        let i = this.lng, w, n, r = false;

	        while( i-- ){

	            n = N;
	            w = this.isSelectable ? this.values[ i ] === this.value : false;
	            
	            if( i === id ){
	                if( w && n === 2 ) n = 3; 
	            } else {
	                n = 1;
	                if( w ) n = 4;
	            }

	            if( this.mode( n, i ) ) r = true;

	        }

	        return r

	    }

	    mode ( n, id ) {

	        let change = false;
	        let cc = this.colors, s = this.buttons;
	        let i = id;

	        if( this.stat[id] !== n ){

	            this.stat[id] = n;
	        
	            switch( n ){

	                case 1: s[i].style.color = cc.text; s[i].style.background = cc.button; break;
	                case 2: s[i].style.color = cc.textOver; s[i].style.background = cc.overoff; break;
	                case 3: s[i].style.color = cc.textOver; s[i].style.background = cc.over; break;
	                case 4: s[i].style.color = cc.textSelect; s[i].style.background = cc.select; break;

	            }

	            change = true;

	        }

	        return change;

	    }

	    // ----------------------

	    reset () {

	        this.res = -1;
	        this.cursor();
	        return this.modes()

	    }


	    label ( string, n ) {

	        this.buttons[n].textContent = string;

	    }

	    icon ( string, y, n ) {

	        this.buttons[n].style.padding = ( y || 0 ) +'px 0px';
	        this.buttons[n].innerHTML = string;

	    }

	    testW () {

	        let vw = this.spaces[0]*3 + this.bsizeMax*2, rz = false;
	        if( vw > this.w ) {
	            this.bsize[0] = ( this.w-(this.spaces[0]*3) ) * 0.5;
	            rz = true;
	        } else {
	            if( this.bsize[0] !== this.bsizeMax ) {
	                this.bsize[0] = this.bsizeMax;
	                rz = true;
	            }
	        }

	        if( !rz ) return;

	        let i = this.buttons.length;
	        while(i--) this.buttons[i].style.width = this.bsize[0] + 'px';

	    }

	    rSize () {

	        super.rSize();

	        this.testW();

	        let mid;

	        this.tmpX = [];
	        this.tmpY = [];

	        for( let j = 0; j < this.grid[0]; j++ ){

	            if(j===0){
	                mid = ( this.w*0.5 ) - ( this.spaces[0]*0.5 );
	                this.tmpX.push( [ mid-this.bsize[0], mid ] );
	            } else {
	                mid = ( this.w*0.5 ) + ( this.spaces[0]*0.5 );
	                this.tmpX.push( [ mid, mid+this.bsize[0] ] );
	            }

	        }

	        mid = this.spaces[1];

	        for( let i = 0; i < this.grid[1]; i++ ){

	            this.tmpY.push( [ mid, mid + this.bsize[1] ] );
	            mid += this.bsize[1] + this.spaces[1];
	            
	        }

	    }

	}

	class Pad2D extends Proto {

	    constructor( o = {} ) {

	        super( o );

	        this.autoWidth = false;
	        this.minw  = this.w;
	        this.diam = o.diam || this.w; 

	        //this.margin = 15;
	        this.pos = new V2(0,0);
	        this.maxPos = 90;

	        this.model = o.stype || 0;
	        if( o.mode !== undefined ) this.model = o.mode;

	        this.min = o.min === undefined ? -1 : o.min;
	        this.max = o.max === undefined ? 1 : o.max;

	        this.range = (this.max - this.min)*0.5;  

	        this.cmode = 0;


	        //console.log(this.range)

	        this.c[0].style.display = 'block';

	        



	        this.precision = o.precision === undefined ? 2 : o.precision;

	        /*this.bounds = {};
	        this.bounds.x1 = o.x1 || -1;
	        this.bounds.x2 = o.x2 || 1;
	        this.bounds.y1 = o.y1 || -1;
	        this.bounds.y2 = o.y2 || 1;

	        this.lerpX = this.lerp( this.margin, this.w - this.margin , this.bounds.x1, this.bounds.x2 );
	        this.lerpY = this.lerp( this.margin, this.w - this.margin , this.bounds.y1, this.bounds.y2 );

	        this.alerpX = this.lerp( this.bounds.x1, this.bounds.x2, this.margin, this.w - this.margin );
	        this.alerpY = this.lerp( this.bounds.y1, this.bounds.y2, this.margin, this.w - this.margin );*/

	        this.value = ( Array.isArray( o.value ) && o.value.length == 2 ) ? o.value : [ 0, 0 ];
	        
	        
	        this.h = o.h || this.w + 10;

	        this.c[0].style.width = this.w + 'px';

	        // Title
	        if( this.c[1] !== undefined ) { // with title

	            this.c[1].style.width = '100%';
	            this.c[1].style.justifyContent = 'center';
	            this.top = 10;
	            this.h += 10;

	        }

	        //this.top -= this.margin

	        let cc = this.colors;


	        // Value
	        this.c[2] = this.dom( 'div', this.css.txt + 'justify-content:center; top:'+ ( this.h - 20 ) + 'px; width:100%; color:' + cc.text );
	        this.c[2].textContent = this.value;

	        // Pad

	        let pad = this.getPad2d();

	        this.setSvg( pad, 'fill', cc.back, 0 );
	        this.setSvg( pad, 'fill', cc.button, 1 );
	        this.setSvg( pad, 'stroke', cc.back, 2 );
	        this.setSvg( pad, 'stroke', cc.back, 3 );
	        this.setSvg( pad, 'stroke', cc.text, 4 );

	        this.setSvg( pad, 'viewBox', '0 0 '+this.diam+' '+this.diam );
	        this.setCss( pad, { width:this.diam, height:this.diam, left:0, top:this.top });

	        this.c[3] = pad;

	        this.init();
	        this.setValue();

	    }
	    
	    testZone ( e ) {
	        
	        let l = this.local;

	        if( l.x === -1 && l.y === -1 ) return '';



	        if( l.y <= this.c[ 1 ].offsetHeight ) return 'title';
	        else if ( l.y > this.h - this.c[ 2 ].offsetHeight ) return 'text';
	        else return 'pad';

	        /*if( ( l.x >= this.margin ) && ( l.x <= this.w - this.margin ) && ( l.y >= this.top + this.margin ) && ( l.y <= this.top + this.w - this.margin ) ) {
	            return 'pad';
	        }*/
	        
	        //return '';

	    }

	    mouseup ( e ) {

	        this.isDown = false;
	        return this.mode(0);

	    }

	    mousedown ( e ) {

	        if ( this.testZone(e) === 'pad' ) {

	            this.isDown = true;
	            this.mousemove( e );
	            return this.mode(1);
	        }

	    }

	    mousemove ( e ) {

	        if( !this.isDown ) return;

	        let x = (this.w*0.5) - ( e.clientX - this.zone.x );
	        let y = (this.diam*0.5) - ( e.clientY - this.zone.y - this.ytop );
	        

	        let r = 256 / this.diam;

	        x = -(x*r);
	        y = -(y*r);

	        x = Tools.clamp( x, -this.maxPos, this.maxPos );
	        y = Tools.clamp( y, -this.maxPos, this.maxPos );

	        //let x = e.clientX - this.zone.x;
	        //let y = e.clientY - this.zone.y - this.top;

	        /*if( x < this.margin ) x = this.margin;
	        if( x > this.w - this.margin ) x = this.w - this.margin;
	        if( y < this.margin ) y = this.margin;
	        if( y > this.w - this.margin ) y = this.w - this.margin;*/

	        //console.log(x,y)

	        this.setPos( [ x , y ] );
	        
	        this.update( true );

	    }

	    mode ( mode ) {

	        if( this.cmode === mode ) return false;

	        let cc = this.colors;

	        switch( mode ){
	            case 0: // base

	                this.s[2].color = cc.text;
	                this.setSvg( this.c[3], 'fill', cc.back, 0);
	                this.setSvg( this.c[3], 'fill', cc.button, 1);
	                this.setSvg( this.c[3], 'stroke', cc.back, 2);
	                this.setSvg( this.c[3], 'stroke', cc.back, 3);
	                this.setSvg( this.c[3], 'stroke', cc.text, 4 );
	                
	            break;
	            case 1: // down

	                this.s[2].color = cc.textSelect;
	                this.setSvg( this.c[3], 'fill', cc.backoff, 0);
	                this.setSvg( this.c[3], 'fill', cc.overoff, 1);
	                this.setSvg( this.c[3], 'stroke', cc.backoff, 2);
	                this.setSvg( this.c[3], 'stroke', cc.backoff, 3);
	                this.setSvg( this.c[3], 'stroke', cc.textSelect, 4 );
	                
	            break;
	        }

	        this.cmode = mode;
	        return true;



	    }

	    update ( up ) {

	        //if( up === undefined ) up = true;
	        
	        this.c[2].textContent = this.value;

	        this.updateSVG();

	        if( up ) this.send();

	    }

	    updateSVG() {

	        if ( this.model == 1 ) {

	            this.setSvg( this.c[3], 'y1', this.pos.y, 2 );
	            this.setSvg( this.c[3], 'y2', this.pos.y, 2 );

	            this.setSvg( this.c[3], 'x1', this.pos.x, 3 );
	            this.setSvg( this.c[3], 'x2', this.pos.x, 3 );

	        }

	        this.setSvg( this.c[3], 'cx', this.pos.x, 4 );
	        this.setSvg( this.c[3], 'cy', this.pos.y, 4 );

	    }

	    setPos ( p ) {

	        //if( p === undefined ) p = [ this.w / 2, this.w / 2 ];

	        this.pos.set( p[0]+128 , p[1]+128 );

	        let r = 1/this.maxPos;

	        this.value[0] = ((p[0]*r)*this.range).toFixed( this.precision );
	        this.value[1] = ((p[1]*r)*this.range).toFixed( this.precision );

	    }

	    setValue ( v, up = false ) {

	        if( v === undefined ) v = this.value;

	        /*if ( v[0] < this.bounds.x1 ) v[0] = this.bounds.x1;
	        if ( v[0] > this.bounds.x2 ) v[0] = this.bounds.x2;
	        if ( v[1] < this.bounds.y1 ) v[1] = this.bounds.y1;
	        if ( v[1] > this.bounds.y2 ) v[1] = this.bounds.y2;*/

	        this.value[0] = Math.min( this.max, Math.max( this.min, v[0] ) ).toFixed( this.precision ) * 1;
	        this.value[1] = Math.min( this.max, Math.max( this.min, v[1] ) ).toFixed( this.precision ) * 1;

	        this.pos.set( ((this.value[0]/this.range)*this.maxPos)+128  , ((this.value[1]/this.range)*this.maxPos)+128 );

	        //console.log(this.pos)

	        this.update( up );

	    }

	    /*lerp( s1, s2, d1, d2, c = true ) {

	        let s = ( d2 - d1 ) / ( s2 - s1 );

	        return c ? ( v ) => { 
	            return ( ( v < s1 ? s1 : v > s2 ? s2 : v ) - s1 ) * s + d1
	        } : ( v ) => { 
	          return ( v - s1 ) * s + d1
	        }

	    }*/

	}

	const add = function () {

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

	        }

	        

	        if( n !== null ){

	            Roots.needResize = true;

	            if( ref ) n.setReferency( a[0], a[1] );
	            return n;

	        }

	};

	const autoType = function ( v, o ) {

	    let type = 'slide';

	    if( typeof v === 'boolean' ) type = 'bool'; 
	    else if( typeof v === 'string' ){ 

	        if( v.substring(0,1) === '#' ) type = 'color';
	        else type = 'string'; 

	    } else if( typeof v === 'number' ){ 

	        if( o.ctype ) type = 'color';
	        else type = 'slide';

	    } else if( typeof v === 'array' && v instanceof Array ){

	        if( typeof v[0] === 'number' ) type = 'number';
	        else if( typeof v[0] === 'string' ) type = 'list';

	    } else if( typeof v === 'object' && v instanceof Object ){

	        if( v.x !== undefined ) type = 'number';
	        else type = 'list';

	    }

	    return type

	};

	/**
	 * @author lth / https://github.com/lo-th
	 */

	class Gui {
	  constructor(o = {}) {
	    this.isGui = true;

	    this.name = "gui";

	    // for 3d
	    this.canvas = null;
	    this.screen = null;
	    this.plane = o.plane || null;

	    // color
	    if (o.config) o.colors = o.config;
	    if (o.colors) this.setConfig(o.colors);
	    else this.colors = Tools.defineColor(o);

	    //this.cleanning = false

	    // style
	    this.css = Tools.cloneCss();

	    this.isReset = true;
	    this.tmpAdd = null;
	    //this.tmpH = 0

	    this.isCanvas = o.isCanvas || false;
	    this.isCanvasOnly = false;

	    // Modified by Fedemarino
	    // option to define whether the event listeners should be added or not
	    Roots.addDOMEventListeners = o.hasOwnProperty("addDOMEventListeners")
	      ? o.addDOMEventListeners
	      : true;

	    this.callback = o.callback === undefined ? null : o.callback;

	    this.forceHeight = o.maxHeight || 0;
	    this.lockHeight = o.lockHeight || false;

	    this.isItemMode = o.itemMode !== undefined ? o.itemMode : false;

	    this.cn = "";

	    // size define
	    this.size = Tools.size;
	    if (o.p !== undefined) this.size.p = o.p;
	    if (o.w !== undefined) this.size.w = o.w;
	    if (o.h !== undefined) this.size.h = o.h;
	    if (o.s !== undefined) this.size.s = o.s;

	    this.size.h = this.size.h < 11 ? 11 : this.size.h;

	    // local mouse and zone
	    this.local = new V2().neg();
	    this.zone = { x: 0, y: 0, w: this.size.w, h: 0 };

	    // virtual mouse
	    this.mouse = new V2().neg();

	    this.h = 0;
	    //this.prevY = -1;
	    this.sw = 0;

	    this.margin = this.colors.sy;
	    this.marginDiv = Tools.isDivid(this.margin);

	    // bottom and close height
	    this.isWithClose = o.close !== undefined ? o.close : true;
	    this.bh = !this.isWithClose ? 0 : this.size.h;

	    this.autoResize = o.autoResize === undefined ? true : o.autoResize;

	    // default position
	    this.isCenter = o.center || false;
	    this.cssGui =
	      o.css !== undefined ? o.css : this.isCenter ? "" : "right:10px;";

	    this.isOpen = o.open !== undefined ? o.open : true;
	    this.isDown = false;
	    this.isScroll = false;

	    this.uis = [];
	    this.current = -1;
	    this.proto = null;
	    this.isEmpty = true;
	    this.decal = 0;
	    this.ratio = 1;
	    this.oy = 0;

	    this.isNewTarget = false;

	    let cc = this.colors;

	    this.content = Tools.dom(
	      "div",
	      this.css.basic +
	        " width:0px; height:auto; top:0px; background:" +
	        cc.content +
	        "; " +
	        this.cssGui
	    );

	    this.innerContent = Tools.dom(
	      "div",
	      this.css.basic +
	        "width:100%; top:0; left:0; height:auto; overflow:hidden;"
	    );
	    //this.innerContent = Tools.dom( 'div', this.css.basic + this.css.button + 'width:100%; top:0; left:0; height:auto; overflow:hidden;');
	    this.content.appendChild(this.innerContent);

	    //this.inner = Tools.dom( 'div', this.css.basic + 'width:100%; left:0; ')
	    this.useFlex = true;
	    let flexible = this.useFlex ? "display:flex; flex-flow: row wrap;" : ""; //' display:flex; justify-content:start; align-items:start;flex-direction: column; justify-content: center; align-items: center;';
	    this.inner = Tools.dom(
	      "div",
	      this.css.basic + flexible + "width:100%; left:0; "
	    );
	    this.innerContent.appendChild(this.inner);

	    // scroll
	    this.scrollBG = Tools.dom(
	      "div",
	      this.css.basic +
	        "right:0; top:0; width:" +
	        (this.size.s - 1) +
	        "px; height:10px; display:none; background:" +
	        cc.background +
	        ";"
	    );
	    this.content.appendChild(this.scrollBG);

	    this.scroll = Tools.dom(
	      "div",
	      this.css.basic +
	        "background:" +
	        cc.button +
	        "; right:2px; top:0; width:" +
	        (this.size.s - 4) +
	        "px; height:10px;"
	    );
	    this.scrollBG.appendChild(this.scroll);

	    // bottom button
	    this.bottomText = o.bottomText || ["open", "close"];

	    let r = cc.radius;
	    this.bottom = Tools.dom(
	      "div",
	      this.css.txt +
	        "width:100%; top:auto; bottom:0; left:0; border-bottom-right-radius:" +
	        r +
	        "px; border-bottom-left-radius:" +
	        r +
	        "px; justify-content:center; height:" +
	        this.bh +
	        "px; line-height:" +
	        (this.bh - 5) +
	        "px; color:" +
	        cc.text +
	        ";"
	    ); // border-top:1px solid '+Tools.colors.stroke+';');
	    this.content.appendChild(this.bottom);
	    this.bottom.textContent = this.isOpen
	      ? this.bottomText[1]
	      : this.bottomText[0];
	    this.bottom.style.background = cc.background;

	    //

	    this.parent = o.parent !== undefined ? o.parent : null;
	    this.parent = o.target !== undefined ? o.target : this.parent;

	    if (this.parent === null && !this.isCanvas) {
	      this.parent = document.body;
	    }

	    if (this.parent !== null) this.parent.appendChild(this.content);

	    if (this.isCanvas && this.parent === null) this.isCanvasOnly = true;

	    if (!this.isCanvasOnly) {
	      this.content.style.pointerEvents = "auto";
	    } else {
	      this.content.style.left = "0px";
	      this.content.style.right = "auto";
	      o.transition = 0;
	    }

	    // height transition
	    this.transition =
	      o.transition !== undefined ? o.transition : Tools.transition;
	    if (this.transition) setTimeout(this.addTransition.bind(this), 1000);

	    this.setWidth();

	    if (this.isCanvas) this.makeCanvas();

	    Roots.add(this);
	  }

	  triggerMouseDown(x, y) {
	    Roots.handleEvent({
	      type: "pointerdown",
	      clientX: x,
	      clientY: y,
	      delta: 0,
	      key: null,
	      keyCode: NaN,
	    });
	  }

	  triggerMouseMove() {
	    Roots.handleEvent({
	      type: "pointermove",
	      clientX: -1,
	      clientY: -1,
	      delta: 0,
	      key: null,
	      keyCode: NaN,
	    });
	  }

	  triggerMouseUp(x, y) {
	    /*

	        clientX,clientY are no used when isCanvas==true
	        */
	    Roots.handleEvent({
	      type: "pointerup",
	      clientX: x,
	      clientY: y,
	      delta: 0,
	      key: null,
	      keyCode: NaN,
	    });
	  }

	  setTop(t, h) {
	    this.content.style.top = t + "px";
	    if (h !== undefined) this.forceHeight = h;
	    this.calc();

	    Roots.needReZone = true;
	  }

	  addTransition() {
	    if (this.transition && !this.isCanvas) {
	      this.innerContent.style.transition =
	        "height " + this.transition + "s ease-out";
	      this.content.style.transition =
	        "height " + this.transition + "s ease-out";
	      this.bottom.style.transition = "top " + this.transition + "s ease-out";
	      //this.bottom.addEventListener("transitionend", Roots.resize, true);
	    }

	    let i = this.uis.length;
	    while (i--) this.uis[i].addTransition();
	  }

	  // ----------------------
	  //   CANVAS
	  // ----------------------

	  onDraw() {}

	  makeCanvas() {
	    this.canvas = document.createElementNS(
	      "http://www.w3.org/1999/xhtml",
	      "canvas"
	    );
	    this.canvas.width = this.zone.w;
	    this.canvas.height = this.forceHeight ? this.forceHeight : this.zone.h;

	    //console.log( this.canvas.width, this.canvas.height )
	  }

	  draw(force) {
	    if (this.canvas === null) return;

	    let w = this.zone.w;
	    let h = this.forceHeight ? this.forceHeight : this.zone.h;
	    Roots.toCanvas(this, w, h, force);
	  }

	  //////

	  getDom() {
	    return this.content;
	  }

	  noMouse() {
	    this.mouse.neg();
	  }

	  setMouse(uv, flip = true) {
	    if (flip)
	      this.mouse.set(
	        Math.round(uv.x * this.canvas.width),
	        this.canvas.height - Math.round(uv.y * this.canvas.height)
	      );
	    else
	      this.mouse.set(
	        Math.round(uv.x * this.canvas.width),
	        Math.round(uv.y * this.canvas.height)
	      );
	    //this.mouse.set( m.x, m.y );

	    //console.log("setMouse "+uv.x+" "+uv.y)
	  }

	  setConfig(o) {
	    // reset to default text
	    Tools.setText();
	    this.colors = Tools.defineColor(o);
	  }

	  setColors(o) {
	    for (let c in o) {
	      if (this.colors[c]) this.colors[c] = o[c];
	    }
	  }

	  setText(size, color, font, shadow) {
	    Tools.setText(size, color, font, shadow);
	  }

	  hide(b) {
	    this.content.style.visibility = b ? "hidden" : "visible";
	  }

	  display(v = false) {
	    this.content.style.visibility = v ? "visible" : "hidden";
	  }

	  onChange(f) {
	    this.callback = f || null;
	    return this;
	  }

	  // ----------------------
	  //   STYLES
	  // ----------------------

	  mode(n) {
	    let needChange = false;
	    let cc = this.colors;

	    if (n !== this.cn) {
	      this.cn = n;

	      switch (n) {
	        case "def":
	          Roots.cursor();
	          this.scroll.style.background = cc.button;
	          this.bottom.style.background = cc.background;
	          this.bottom.style.color = cc.text;
	          break;

	        //case 'scrollDef': this.scroll.style.background = this.colors.scroll; break;
	        case "scrollOver":
	          Roots.cursor("ns-resize");
	          this.scroll.style.background = cc.select;
	          break;
	        case "scrollDown":
	          this.scroll.style.background = cc.select;
	          break;

	        //case 'bottomDef': this.bottom.style.background = this.colors.background; break;
	        case "bottomOver":
	          Roots.cursor("pointer");
	          this.bottom.style.background = cc.backgroundOver;
	          this.bottom.style.color = cc.textOver;
	          break;
	        //case 'bottomDown': this.bottom.style.background = this.colors.select; this.bottom.style.color = '#000'; break;
	      }

	      needChange = true;
	    }

	    return needChange;
	  }

	  // ----------------------
	  //   TARGET
	  // ----------------------

	  clearTarget() {
	    if (this.current === -1) return false;
	    if (this.proto.s) {
	      // if no s target is delete !!
	      this.proto.uiout();
	      this.proto.reset();
	    }

	    this.proto = null;
	    this.current = -1;

	    ///console.log(this.isDown)//if(this.isDown)Roots.clearInput();

	    Roots.cursor();
	    return true;
	  }

	  // ----------------------
	  //   ZONE TEST
	  // ----------------------

	  testZone(e) {
	    let l = this.local;
	    if (l.x === -1 && l.y === -1) return "";

	    this.isReset = false;

	    let name = "";

	    let s = this.isScroll ? this.zone.w - this.size.s : this.zone.w;

	    if (l.y > this.zone.h - this.bh && l.y < this.zone.h) name = "bottom";
	    else name = l.x > s ? "scroll" : "content";

	    return name;
	  }

	  // ----------------------
	  //   EVENTS
	  // ----------------------

	  handleEvent(e) {
	    //if( this.cleanning ) return

	    //console.log("Gui.handleEvent")
	    //console.log(e);
	    let type = e.type;

	    let change = false;
	    let protoChange = false;

	    let name = this.testZone(e);

	    if (type === "mouseup" && this.isDown) this.isDown = false;
	    if (type === "mousedown" && !this.isDown) this.isDown = true;

	    if (this.isDown && this.isNewTarget) {
	      Roots.clearInput();
	      this.isNewTarget = false;
	    }

	    if (!name) return;

	    switch (name) {
	      case "content":
	        e.clientY = this.isScroll ? e.clientY + this.decal : e.clientY;

	        if (Roots.isMobile && type === "mousedown") this.getNext(e, change);

	        if (this.proto) protoChange = this.proto.handleEvent(e);

	        if (type === "mousemove") change = this.mode("def");
	        if (type === "wheel" && !protoChange && this.isScroll)
	          change = this.onWheel(e);

	        if (!Roots.lock) {
	          this.getNext(e, change);
	        }

	        break;
	      case "bottom":
	        this.clearTarget();
	        if (type === "mousemove") change = this.mode("bottomOver");
	        if (type === "mousedown") {
	          this.isOpen = this.isOpen ? false : true;
	          this.bottom.textContent = this.isOpen
	            ? this.bottomText[1]
	            : this.bottomText[0];
	          //this.setHeight();
	          this.calc();
	          this.mode("def");
	          change = true;
	        }

	        break;
	      case "scroll":
	        this.clearTarget();
	        if (type === "mousemove") change = this.mode("scrollOver");
	        if (type === "mousedown") change = this.mode("scrollDown");
	        if (type === "wheel") change = this.onWheel(e);
	        if (this.isDown) this.update(e.clientY - this.zone.y - this.sh * 0.5);

	        break;
	    }

	    if (this.isDown) change = true;
	    if (protoChange) change = true;

	    if (type === "keyup") change = true;
	    if (type === "keydown") change = true;

	    if (change) this.draw();
	  }

	  getNext(e, change) {
	    let next = Roots.findTarget(this.uis, e);

	    if (next !== this.current) {
	      this.clearTarget();
	      this.current = next;
	      this.isNewTarget = true;
	    }

	    if (next !== -1) {
	      this.proto = this.uis[this.current];
	      this.proto.uiover();
	    }
	  }

	  onWheel(e) {
	    this.oy += 20 * e.delta;
	    this.update(this.oy);
	    return true;
	  }

	  // ----------------------
	  //   RESET
	  // ----------------------

	  reset(force) {
	    if (this.isReset) return;

	    //this.resetItem();

	    this.mouse.neg();
	    this.isDown = false;

	    //Roots.clearInput();
	    let r = this.mode("def");
	    let r2 = this.clearTarget();

	    if (r || r2) this.draw(true);

	    this.isReset = true;

	    //Roots.lock = false;
	  }

	  // ----------------------
	  //   ADD NODE
	  // ----------------------

	  add() {
	    //if(this.cleanning) this.cleanning = false

	    let a = arguments;
	    let ontop = false;

	    if (typeof a[1] === "object") {
	      a[1].isUI = true;
	      a[1].main = this;

	      ontop = a[1].ontop ? a[1].ontop : false;
	    } else if (typeof a[1] === "string") {
	      if (a[2] === undefined) [].push.call(a, { isUI: true, main: this });
	      else {
	        a[2].isUI = true;
	        a[2].main = this;
	        //ontop = a[1].ontop ? a[1].ontop : false;
	        ontop = a[2].ontop ? a[2].ontop : false;
	      }
	    }

	    let u = add.apply(this, a);

	    if (u === null) return;

	    if (ontop) this.uis.unshift(u);
	    else this.uis.push(u);

	    this.calc();

	    this.isEmpty = false;

	    return u;
	  }

	  // remove one node

	  remove(n) {
	    if (n.dispose) n.dispose();
	  }

	  // call after uis clear

	  clearOne(n) {
	    let id = this.uis.indexOf(n);
	    if (id !== -1) {
	      //this.calc( - (this.uis[ id ].h + 1 ) );
	      this.inner.removeChild(this.uis[id].c[0]);
	      this.uis.splice(id, 1);
	      this.calc();
	    }
	  }

	  // clear all gui

	  empty() {
	    //this.cleanning = true

	    //this.close();

	    let i = this.uis.length,
	      item;

	    while (i--) {
	      item = this.uis.pop();
	      this.inner.removeChild(item.c[0]);
	      item.dispose();
	    }

	    this.uis = [];
	    this.isEmpty = true;
	    this.calc();
	  }

	  clear() {
	    this.empty();
	  }

	  clear2() {
	    setTimeout(this.empty.bind(this), 0);
	  }

	  dispose() {
	    this.clear();
	    if (this.parent !== null) this.parent.removeChild(this.content);
	    Roots.remove(this);
	  }

	  // ----------------------
	  //   ITEMS SPECIAL
	  // ----------------------

	  resetItem() {
	    if (!this.isItemMode) return;

	    let i = this.uis.length;
	    while (i--) this.uis[i].selected();
	  }

	  setItem(name) {
	    if (!this.isItemMode) return;

	    name = name || "";
	    this.resetItem();

	    if (!name) {
	      this.update(0);
	      return;
	    }

	    let i = this.uis.length;
	    while (i--) {
	      if (this.uis[i].value === name) {
	        this.uis[i].selected(true);
	        if (this.isScroll)
	          this.update(i * (this.uis[i].h + this.margin) * this.ratio);
	      }
	    }
	  }

	  // ----------------------
	  //   SCROLL
	  // ----------------------

	  upScroll(b) {
	    this.sw = b ? this.size.s : 0;
	    this.oy = b ? this.oy : 0;
	    this.scrollBG.style.display = b ? "block" : "none";

	    if (b) {
	      this.total = this.h;

	      this.maxView = this.maxHeight;

	      this.ratio = this.maxView / this.total;
	      this.sh = this.maxView * this.ratio;

	      this.range = this.maxView - this.sh;

	      this.oy = Tools.clamp(this.oy, 0, this.range);

	      this.scrollBG.style.height = this.maxView + "px";
	      this.scroll.style.height = this.sh + "px";
	    }

	    this.setItemWidth(this.zone.w - this.sw);
	    this.update(this.oy);
	  }

	  update(y) {
	    y = Tools.clamp(y, 0, this.range);

	    this.decal = Math.floor(y / this.ratio);
	    this.inner.style.top = -this.decal + "px";
	    this.scroll.style.top = Math.floor(y) + "px";
	    this.oy = y;
	  }

	  // ----------------------
	  //   RESIZE FUNCTION
	  // ----------------------

	  calcUis() {
	    return Roots.calcUis(this.uis, this.zone, this.zone.y);
	  }

	  calc() {
	    clearTimeout(this.tmp);
	    this.tmp = setTimeout(this.setHeight.bind(this), 10);
	  }

	  setHeight() {
	    if (this.tmp) clearTimeout(this.tmp);

	    this.zone.h = this.bh;
	    this.isScroll = false;

	    if (this.isOpen) {
	      this.h = this.calcUis();

	      let hhh = this.forceHeight
	        ? this.forceHeight + this.zone.y
	        : window.innerHeight;

	      this.maxHeight = hhh - this.zone.y - this.bh;

	      let diff = this.h - this.maxHeight;

	      if (diff > 1) {
	        this.isScroll = true;
	        this.zone.h = this.maxHeight + this.bh;
	      } else {
	        this.zone.h = this.h + this.bh;
	      }
	    }

	    this.upScroll(this.isScroll);

	    this.innerContent.style.height = this.zone.h - this.bh + "px";
	    this.content.style.height = this.zone.h + "px";
	    this.bottom.style.top = this.zone.h - this.bh + "px";

	    if (this.forceHeight && this.lockHeight)
	      this.content.style.height = this.forceHeight + "px";
	    if (this.isCanvas) this.draw(true);
	  }

	  rezone() {
	    Roots.needReZone = true;
	  }

	  setWidth(w) {
	    if (w) this.zone.w = w;

	    this.zone.w = Math.floor(this.zone.w);
	    this.content.style.width = this.zone.w + "px";
	    if (this.isCenter)
	      this.content.style.marginLeft = -Math.floor(this.zone.w * 0.5) + "px";
	    this.setItemWidth(this.zone.w - this.sw);
	  }

	  setItemWidth(w) {
	    let i = this.uis.length;
	    while (i--) {
	      this.uis[i].setSize(w);
	      this.uis[i].rSize();
	    }
	  }
	}

	exports.Files = Files;
	exports.Gui = Gui;
	exports.REVISION = REVISION;
	exports.Tools = Tools;
	exports.add = add;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWlsLmpzIiwic291cmNlcyI6WyIuLi9zcmMvY29yZS9Sb290cy5qcyIsIi4uL3NyYy9jb3JlL1Rvb2xzLmpzIiwiLi4vc3JjL2NvcmUvRmlsZXMuanMiLCIuLi9zcmMvY29yZS9WMi5qcyIsIi4uL3NyYy9jb3JlL1Byb3RvLmpzIiwiLi4vc3JjL3Byb3RvL0Jvb2wuanMiLCIuLi9zcmMvcHJvdG8vQnV0dG9uLmpzIiwiLi4vc3JjL3Byb3RvL0NpcmN1bGFyLmpzIiwiLi4vc3JjL3Byb3RvL0NvbG9yLmpzIiwiLi4vc3JjL3Byb3RvL0Zwcy5qcyIsIi4uL3NyYy9wcm90by9HcmFwaC5qcyIsIi4uL3NyYy9wcm90by9FbXB0eS5qcyIsIi4uL3NyYy9wcm90by9Hcm91cC5qcyIsIi4uL3NyYy9wcm90by9Kb3lzdGljay5qcyIsIi4uL3NyYy9wcm90by9Lbm9iLmpzIiwiLi4vc3JjL3Byb3RvL0xpc3QuanMiLCIuLi9zcmMvcHJvdG8vTnVtZXJpYy5qcyIsIi4uL3NyYy9wcm90by9TbGlkZS5qcyIsIi4uL3NyYy9wcm90by9UZXh0SW5wdXQuanMiLCIuLi9zcmMvcHJvdG8vVGl0bGUuanMiLCIuLi9zcmMvcHJvdG8vU2VsZWN0LmpzIiwiLi4vc3JjL3Byb3RvL0JpdG1hcC5qcyIsIi4uL3NyYy9wcm90by9TZWxlY3Rvci5qcyIsIi4uL3NyYy9wcm90by9JdGVtLmpzIiwiLi4vc3JjL3Byb3RvL0dyaWQuanMiLCIuLi9zcmMvcHJvdG8vUGFkMkQuanMiLCIuLi9zcmMvY29yZS9hZGQuanMiLCIuLi9zcmMvY29yZS9HdWkuanMiXSwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEBhdXRob3IgbHRoIC8gaHR0cHM6Ly9naXRodWIuY29tL2xvLXRoXHJcbiAqL1xyXG5cclxuZXhwb3J0IGNvbnN0IFJFVklTSU9OID0gXCI0LjMuMFwiO1xyXG5cclxuLy8gSU5URU5BTCBGVU5DVElPTlxyXG5cclxuY29uc3QgUiA9IHtcclxuICB1aTogW10sXHJcblxyXG4gIGRvbTogbnVsbCxcclxuXHJcbiAgSUQ6IG51bGwsXHJcbiAgbG9jazogZmFsc2UsXHJcbiAgd2xvY2s6IGZhbHNlLFxyXG4gIGN1cnJlbnQ6IC0xLFxyXG5cclxuICBuZWVkUmVab25lOiB0cnVlLFxyXG4gIG5lZWRSZXNpemU6IGZhbHNlLFxyXG4gIGZvcmNlWm9uZTogZmFsc2UsXHJcbiAgaXNFdmVudHNJbml0OiBmYWxzZSxcclxuICBpc0xlYXZlOiBmYWxzZSxcclxuICBhZGRET01FdmVudExpc3RlbmVyczogdHJ1ZSxcclxuXHJcbiAgZG93blRpbWU6IDAsXHJcbiAgcHJldlRpbWU6IDAsXHJcblxyXG4gIC8vcHJldkRlZmF1bHQ6IFsnY29udGV4dG1lbnUnLCAnd2hlZWwnXSxcclxuICBwcmV2RGVmYXVsdDogW1wiY29udGV4dG1lbnVcIl0sXHJcbiAgcG9pbnRlckV2ZW50OiBbXCJwb2ludGVyZG93blwiLCBcInBvaW50ZXJtb3ZlXCIsIFwicG9pbnRlcnVwXCJdLFxyXG4gIGV2ZW50T3V0OiBbXCJwb2ludGVyY2FuY2VsXCIsIFwicG9pbnRlcm91dFwiLCBcInBvaW50ZXJsZWF2ZVwiXSxcclxuXHJcbiAgeG1sc2VyaWFsaXplcjogbnVsbCxcclxuICB0bXBUaW1lOiBudWxsLFxyXG4gIHRtcEltYWdlOiBudWxsLFxyXG5cclxuICBvbGRDdXJzb3I6IFwiYXV0b1wiLFxyXG5cclxuICBpbnB1dDogbnVsbCxcclxuICBwYXJlbnQ6IG51bGwsXHJcbiAgZmlyc3RJbXB1dDogdHJ1ZSxcclxuXHJcbiAgaGlkZGVuSW1wdXQ6IG51bGwsXHJcbiAgaGlkZGVuU2l6ZXI6IG51bGwsXHJcbiAgaGFzRm9jdXM6IGZhbHNlLFxyXG4gIHN0YXJ0SW5wdXQ6IGZhbHNlLFxyXG4gIGlucHV0UmFuZ2U6IFswLCAwXSxcclxuICBjdXJzb3JJZDogMCxcclxuICBzdHI6IFwiXCIsXHJcbiAgcG9zOiAwLFxyXG4gIHN0YXJ0WDogLTEsXHJcbiAgbW92ZVg6IC0xLFxyXG5cclxuICBkZWJ1Z0lucHV0OiBmYWxzZSxcclxuXHJcbiAgaXNMb29wOiBmYWxzZSxcclxuICBsaXN0ZW5zOiBbXSxcclxuXHJcbiAgZToge1xyXG4gICAgdHlwZTogbnVsbCxcclxuICAgIGNsaWVudFg6IDAsXHJcbiAgICBjbGllbnRZOiAwLFxyXG4gICAga2V5Q29kZTogTmFOLFxyXG4gICAga2V5OiBudWxsLFxyXG4gICAgZGVsdGE6IDAsXHJcbiAgfSxcclxuXHJcbiAgaXNNb2JpbGU6IGZhbHNlLFxyXG5cclxuICBub3c6IG51bGwsXHJcbiAgbmVlZHNVcGRhdGU6IGZhbHNlLFxyXG5cclxuICBnZXRUaW1lOiBmdW5jdGlvbiAoKSB7XHJcbiAgICByZXR1cm4gc2VsZi5wZXJmb3JtYW5jZSAmJiBzZWxmLnBlcmZvcm1hbmNlLm5vd1xyXG4gICAgICA/IHNlbGYucGVyZm9ybWFuY2Uubm93LmJpbmQocGVyZm9ybWFuY2UpXHJcbiAgICAgIDogRGF0ZS5ub3c7XHJcbiAgfSxcclxuXHJcbiAgYWRkOiBmdW5jdGlvbiAobykge1xyXG4gICAgLy8gUi51aVswXSBpcyBkZSBHVUkgb2JqZWN0IHRoYXQgaXMgYWRkZWQgZmlyc3QgYnkgdGhlIGNvbnN0cnVjdG9yXHJcbiAgICBSLnVpLnB1c2gobyk7XHJcbiAgICBSLmdldFpvbmUobyk7XHJcblxyXG4gICAgaWYgKCFSLmlzRXZlbnRzSW5pdCkgUi5pbml0RXZlbnRzKCk7XHJcbiAgfSxcclxuXHJcbiAgdGVzdE1vYmlsZTogZnVuY3Rpb24gKCkge1xyXG4gICAgbGV0IG4gPSBuYXZpZ2F0b3IudXNlckFnZW50O1xyXG4gICAgaWYgKFxyXG4gICAgICBuLm1hdGNoKC9BbmRyb2lkL2kpIHx8XHJcbiAgICAgIG4ubWF0Y2goL3dlYk9TL2kpIHx8XHJcbiAgICAgIG4ubWF0Y2goL2lQaG9uZS9pKSB8fFxyXG4gICAgICBuLm1hdGNoKC9pUGFkL2kpIHx8XHJcbiAgICAgIG4ubWF0Y2goL2lQb2QvaSkgfHxcclxuICAgICAgbi5tYXRjaCgvQmxhY2tCZXJyeS9pKSB8fFxyXG4gICAgICBuLm1hdGNoKC9XaW5kb3dzIFBob25lL2kpXHJcbiAgICApXHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgZWxzZSByZXR1cm4gZmFsc2U7XHJcbiAgfSxcclxuXHJcbiAgcmVtb3ZlOiBmdW5jdGlvbiAobykge1xyXG4gICAgbGV0IGkgPSBSLnVpLmluZGV4T2Yobyk7XHJcblxyXG4gICAgaWYgKGkgIT09IC0xKSB7XHJcbiAgICAgIFIucmVtb3ZlTGlzdGVuKG8pO1xyXG4gICAgICBSLnVpLnNwbGljZShpLCAxKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoUi51aS5sZW5ndGggPT09IDApIHtcclxuICAgICAgUi5yZW1vdmVFdmVudHMoKTtcclxuICAgIH1cclxuICB9LFxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBFVkVOVFNcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIGluaXRFdmVudHM6IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmIChSLmlzRXZlbnRzSW5pdCkgcmV0dXJuO1xyXG5cclxuICAgIGxldCBkb20gPSBkb2N1bWVudC5ib2R5O1xyXG5cclxuICAgIFIuaXNNb2JpbGUgPSBSLnRlc3RNb2JpbGUoKTtcclxuICAgIFIubm93ID0gUi5nZXRUaW1lKCk7XHJcblxyXG4gICAgaWYgKCFSLmlzTW9iaWxlKSB7XHJcbiAgICAgIGRvbS5hZGRFdmVudExpc3RlbmVyKFwid2hlZWxcIiwgUiwgeyBwYXNzaXZlOiBmYWxzZSB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGRvbS5zdHlsZS50b3VjaEFjdGlvbiA9IFwibm9uZVwiO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKFwiUi5hZGRET01FdmVudExpc3RlbmVycyBcIiArIFIuYWRkRE9NRXZlbnRMaXN0ZW5lcnMpO1xyXG4gICAgaWYgKFIuYWRkRE9NRXZlbnRMaXN0ZW5lcnMpIHtcclxuICAgICAgZG9tLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVyY2FuY2VsXCIsIFIpO1xyXG4gICAgICBkb20uYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJsZWF2ZVwiLCBSKTtcclxuICAgICAgLy9kb20uYWRkRXZlbnRMaXN0ZW5lciggJ3BvaW50ZXJvdXQnLCBSIClcclxuXHJcbiAgICAgIGRvbS5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcm1vdmVcIiwgUik7XHJcbiAgICAgIGRvbS5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmRvd25cIiwgUik7XHJcbiAgICAgIGRvbS5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcnVwXCIsIFIpO1xyXG5cclxuICAgICAgZG9tLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIFIsIGZhbHNlKTtcclxuICAgICAgZG9tLmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBSLCBmYWxzZSk7XHJcbiAgICB9XHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBSLnJlc2l6ZSwgZmFsc2UpO1xyXG5cclxuICAgIC8vd2luZG93Lm9uYmx1ciA9IFIub3V0O1xyXG4gICAgLy93aW5kb3cub25mb2N1cyA9IFIuaW47XHJcblxyXG4gICAgUi5pc0V2ZW50c0luaXQgPSB0cnVlO1xyXG4gICAgUi5kb20gPSBkb207XHJcbiAgfSxcclxuXHJcbiAgcmVtb3ZlRXZlbnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAoIVIuaXNFdmVudHNJbml0KSByZXR1cm47XHJcblxyXG4gICAgbGV0IGRvbSA9IGRvY3VtZW50LmJvZHk7XHJcblxyXG4gICAgaWYgKCFSLmlzTW9iaWxlKSB7XHJcbiAgICAgIGRvbS5yZW1vdmVFdmVudExpc3RlbmVyKFwid2hlZWxcIiwgUik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKFIuYWRkRE9NRXZlbnRMaXN0ZW5lcnMpIHtcclxuICAgICAgZG9tLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJwb2ludGVyY2FuY2VsXCIsIFIpO1xyXG4gICAgICBkb20ucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJsZWF2ZVwiLCBSKTtcclxuICAgICAgLy9kb20ucmVtb3ZlRXZlbnRMaXN0ZW5lciggJ3BvaW50ZXJvdXQnLCBSICk7XHJcblxyXG4gICAgICBkb20ucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJtb3ZlXCIsIFIpO1xyXG4gICAgICBkb20ucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIFIpO1xyXG4gICAgICBkb20ucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJ1cFwiLCBSKTtcclxuXHJcbiAgICAgIGRvbS5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBSKTtcclxuICAgICAgZG9tLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBSKTtcclxuICAgIH1cclxuICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKFwicmVzaXplXCIsIFIucmVzaXplKTtcclxuXHJcbiAgICBSLmlzRXZlbnRzSW5pdCA9IGZhbHNlO1xyXG4gIH0sXHJcblxyXG4gIHJlc2l6ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgbGV0IGkgPSBSLnVpLmxlbmd0aCxcclxuICAgICAgdTtcclxuXHJcbiAgICB3aGlsZSAoaS0tKSB7XHJcbiAgICAgIHUgPSBSLnVpW2ldO1xyXG4gICAgICBpZiAodS5pc0d1aSAmJiAhdS5pc0NhbnZhc09ubHkgJiYgdS5hdXRvUmVzaXplKSB1LmNhbGMoKTtcclxuICAgIH1cclxuXHJcbiAgICBSLm5lZWRSZVpvbmUgPSB0cnVlO1xyXG4gICAgUi5uZWVkUmVzaXplID0gZmFsc2U7XHJcbiAgfSxcclxuXHJcbiAgb3V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcImltIGFtIG91dFwiKTtcclxuICAgIFIuY2xlYXJPbGRJRCgpO1xyXG4gIH0sXHJcblxyXG4gIGluOiBmdW5jdGlvbiAoKSB7XHJcbiAgICBjb25zb2xlLmxvZyhcImltIGFtIGluXCIpO1xyXG4gICAgLy8gIFIuY2xlYXJPbGRJRCgpO1xyXG4gIH0sXHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyAgIEhBTkRMRSBFVkVOVFNcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIGZha2VVcDogZnVuY3Rpb24gKCkge1xyXG4gICAgdGhpcy5oYW5kbGVFdmVudCh7IHR5cGU6IFwicG9pbnRlcnVwXCIgfSk7XHJcbiAgfSxcclxuXHJcbiAgaGFuZGxlRXZlbnQ6IGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgLy9jb25zb2xlLmxvZyhcIlJvb3RzLmhhbmRsZUV2ZW50IFwiK2V2ZW50LnR5cGUpXHJcbiAgICAvL2lmKCFldmVudC50eXBlKSByZXR1cm47XHJcblxyXG4gICAgaWYgKFIucHJldkRlZmF1bHQuaW5kZXhPZihldmVudC50eXBlKSAhPT0gLTEpIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgaWYgKFIubmVlZFJlc2l6ZSkgUi5yZXNpemUoKTtcclxuXHJcbiAgICBSLmZpbmRab25lKFIuZm9yY2Vab25lKTtcclxuXHJcbiAgICBsZXQgZSA9IFIuZTtcclxuICAgIGxldCBsZWF2ZSA9IGZhbHNlO1xyXG5cclxuICAgIGlmIChldmVudC50eXBlID09PSBcImtleWRvd25cIikgUi5rZXlkb3duKGV2ZW50KTtcclxuICAgIGlmIChldmVudC50eXBlID09PSBcImtleXVwXCIpIFIua2V5dXAoZXZlbnQpO1xyXG5cclxuICAgIGlmIChldmVudC50eXBlID09PSBcIndoZWVsXCIpIGUuZGVsdGEgPSBldmVudC5kZWx0YVkgPiAwID8gMSA6IC0xO1xyXG4gICAgZWxzZSBlLmRlbHRhID0gMDtcclxuXHJcbiAgICBsZXQgcHR5cGUgPSBldmVudC5wb2ludGVyVHlwZTsgLy8gbW91c2UsIHBlbiwgdG91Y2hcclxuXHJcbiAgICBlLmNsaWVudFggPSAocHR5cGUgPT09IFwidG91Y2hcIiA/IGV2ZW50LnBhZ2VYIDogZXZlbnQuY2xpZW50WCkgfHwgMDtcclxuICAgIGUuY2xpZW50WSA9IChwdHlwZSA9PT0gXCJ0b3VjaFwiID8gZXZlbnQucGFnZVkgOiBldmVudC5jbGllbnRZKSB8fCAwO1xyXG5cclxuICAgIGUudHlwZSA9IGV2ZW50LnR5cGU7XHJcblxyXG4gICAgaWYgKFIuZXZlbnRPdXQuaW5kZXhPZihldmVudC50eXBlKSAhPT0gLTEpIHtcclxuICAgICAgbGVhdmUgPSB0cnVlO1xyXG4gICAgICBlLnR5cGUgPSBcIm1vdXNldXBcIjtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZXZlbnQudHlwZSA9PT0gXCJwb2ludGVybGVhdmVcIikgUi5pc0xlYXZlID0gdHJ1ZTtcclxuXHJcbiAgICBpZiAoZXZlbnQudHlwZSA9PT0gXCJwb2ludGVyZG93blwiKSBlLnR5cGUgPSBcIm1vdXNlZG93blwiO1xyXG4gICAgaWYgKGV2ZW50LnR5cGUgPT09IFwicG9pbnRlcnVwXCIpIGUudHlwZSA9IFwibW91c2V1cFwiO1xyXG4gICAgaWYgKGV2ZW50LnR5cGUgPT09IFwicG9pbnRlcm1vdmVcIikge1xyXG4gICAgICBpZiAoUi5pc0xlYXZlKSB7XHJcbiAgICAgICAgLy8gaWYgdXNlciByZXNpemUgb3V0c2lkZSB0aGlzIGRvY3VtZW50XHJcbiAgICAgICAgUi5pc0xlYXZlID0gZmFsc2U7XHJcbiAgICAgICAgUi5yZXNpemUoKTtcclxuICAgICAgfVxyXG4gICAgICBlLnR5cGUgPSBcIm1vdXNlbW92ZVwiO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGRvdWJsZSBjbGljayB0ZXN0XHJcbiAgICBpZiAoZS50eXBlID09PSBcIm1vdXNlZG93blwiKSB7XHJcbiAgICAgIFIuZG93blRpbWUgPSBSLm5vdygpO1xyXG4gICAgICBsZXQgdGltZSA9IFIuZG93blRpbWUgLSBSLnByZXZUaW1lO1xyXG5cclxuICAgICAgLy8gZG91YmxlIGNsaWNrIG9uIGltcHV0XHJcbiAgICAgIGlmICh0aW1lIDwgMjAwKSB7XHJcbiAgICAgICAgUi5zZWxlY3RBbGwoKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIFIucHJldlRpbWUgPSBSLmRvd25UaW1lO1xyXG4gICAgICBSLmZvcmNlWm9uZSA9IGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGZvciBpbXB1dFxyXG4gICAgaWYgKGUudHlwZSA9PT0gXCJtb3VzZWRvd25cIikgUi5jbGVhcklucHV0KCk7XHJcblxyXG4gICAgLy8gbW91c2UgbG9ja1xyXG4gICAgaWYgKGUudHlwZSA9PT0gXCJtb3VzZWRvd25cIikgUi5sb2NrID0gdHJ1ZTtcclxuICAgIGlmIChlLnR5cGUgPT09IFwibW91c2V1cFwiKSBSLmxvY2sgPSBmYWxzZTtcclxuXHJcbiAgICAvL2lmKCBSLmN1cnJlbnQgIT09IG51bGwgJiYgUi5jdXJyZW50Lm5ldmVybG9jayApIFIubG9jayA9IGZhbHNlO1xyXG5cclxuICAgIC8qaWYoIGUudHlwZSA9PT0gJ21vdXNlZG93bicgJiYgZXZlbnQuYnV0dG9uID09PSAxKXtcclxuICAgICAgICAgICAgUi5jdXJzb3IoKVxyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgfSovXHJcblxyXG4gICAgLy9jb25zb2xlLmxvZyhcInA0IFwiK1IuaXNNb2JpbGUrXCIgXCIrZS50eXBlK1wiIFwiK1IubG9jaylcclxuXHJcbiAgICBpZiAoUi5pc01vYmlsZSAmJiBlLnR5cGUgPT09IFwibW91c2Vkb3duXCIpIFIuZmluZElEKGUpO1xyXG4gICAgaWYgKGUudHlwZSA9PT0gXCJtb3VzZW1vdmVcIiAmJiAhUi5sb2NrKSBSLmZpbmRJRChlKTtcclxuXHJcbiAgICBpZiAoUi5JRCAhPT0gbnVsbCkge1xyXG4gICAgICBpZiAoUi5JRC5pc0NhbnZhc09ubHkpIHtcclxuICAgICAgICBlLmNsaWVudFggPSBSLklELm1vdXNlLng7XHJcbiAgICAgICAgZS5jbGllbnRZID0gUi5JRC5tb3VzZS55O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvL2lmKCBSLklELm1hcmdpbkRpdiApIGUuY2xpZW50WSAtPSBSLklELm1hcmdpbiAqIDAuNVxyXG5cclxuICAgICAgUi5JRC5oYW5kbGVFdmVudChlKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoUi5pc01vYmlsZSAmJiBlLnR5cGUgPT09IFwibW91c2V1cFwiKSBSLmNsZWFyT2xkSUQoKTtcclxuICAgIGlmIChsZWF2ZSkgUi5jbGVhck9sZElEKCk7XHJcbiAgfSxcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICAgSURcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIGZpbmRJRDogZnVuY3Rpb24gKGUpIHtcclxuICAgIGxldCBpID0gUi51aS5sZW5ndGgsXHJcbiAgICAgIG5leHQgPSAtMSxcclxuICAgICAgdSxcclxuICAgICAgeCxcclxuICAgICAgeTtcclxuXHJcbiAgICB3aGlsZSAoaS0tKSB7XHJcbiAgICAgIHUgPSBSLnVpW2ldO1xyXG5cclxuICAgICAgaWYgKHUuaXNDYW52YXNPbmx5KSB7XHJcbiAgICAgICAgeCA9IHUubW91c2UueDtcclxuICAgICAgICB5ID0gdS5tb3VzZS55O1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHggPSBlLmNsaWVudFg7XHJcbiAgICAgICAgeSA9IGUuY2xpZW50WTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKFIub25ab25lKHUsIHgsIHkpKSB7XHJcbiAgICAgICAgbmV4dCA9IGk7XHJcblxyXG4gICAgICAgIGlmIChuZXh0ICE9PSBSLmN1cnJlbnQpIHtcclxuICAgICAgICAgIFIuY2xlYXJPbGRJRCgpO1xyXG4gICAgICAgICAgUi5jdXJyZW50ID0gbmV4dDtcclxuICAgICAgICAgIFIuSUQgPSB1O1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmIChuZXh0ID09PSAtMSkgUi5jbGVhck9sZElEKCk7XHJcbiAgfSxcclxuXHJcbiAgY2xlYXJPbGRJRDogZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKCFSLklEKSByZXR1cm47XHJcbiAgICBSLmN1cnJlbnQgPSAtMTtcclxuICAgIFIuSUQucmVzZXQoKTtcclxuICAgIFIuSUQgPSBudWxsO1xyXG4gICAgUi5jdXJzb3IoKTtcclxuICB9LFxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBHVUkgLyBHUk9VUCBGVU5DVElPTlxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgY2FsY1VpczogKHVpcywgem9uZSwgcHksIGdyb3VwID0gZmFsc2UpID0+IHtcclxuICAgIC8vY29uc29sZS5sb2coJ2NhbGNfdWlzJylcclxuXHJcbiAgICBsZXQgaSA9IHVpcy5sZW5ndGgsXHJcbiAgICAgIHUsXHJcbiAgICAgIHB4ID0gMCxcclxuICAgICAgbiA9IDAsXHJcbiAgICAgIHR3LFxyXG4gICAgICBtLFxyXG4gICAgICBkaXY7XHJcblxyXG4gICAgbGV0IGhlaWdodCA9IDA7XHJcblxyXG4gICAgd2hpbGUgKGktLSkge1xyXG4gICAgICB1ID0gdWlzW25dO1xyXG4gICAgICBuKys7XHJcblxyXG4gICAgICBpZiAoIWdyb3VwICYmIHUuaXNHcm91cCkgdS5jYWxjVWlzKCk7XHJcblxyXG4gICAgICBtID0gdS5tYXJnaW47XHJcbiAgICAgIC8vZGl2ID0gdS5tYXJnaW5EaXZcclxuXHJcbiAgICAgIHUuem9uZS53ID0gdS53O1xyXG4gICAgICB1LnpvbmUuaCA9IHUuaCArIG07XHJcblxyXG4gICAgICBpZiAoIXUuYXV0b1dpZHRoKSB7XHJcbiAgICAgICAgaWYgKHB4ID09PSAwKSBoZWlnaHQgKz0gdS5oICsgbTtcclxuXHJcbiAgICAgICAgdS56b25lLnggPSB6b25lLnggKyBweDtcclxuICAgICAgICB1LnpvbmUueSA9IHB5OyAvLyArIHUubXRvcFxyXG4gICAgICAgIC8vaWYoZGl2KSB1LnpvbmUueSArPSBtICogMC41XHJcblxyXG4gICAgICAgIHR3ID0gUi5nZXRXaWR0aCh1KTtcclxuICAgICAgICBpZiAodHcpIHUuem9uZS53ID0gdS53ID0gdHc7XHJcbiAgICAgICAgZWxzZSBpZiAodS5mdykgdS56b25lLncgPSB1LncgPSB1LmZ3O1xyXG5cclxuICAgICAgICBweCArPSB1LnpvbmUudztcclxuXHJcbiAgICAgICAgaWYgKHB4ID49IHpvbmUudykge1xyXG4gICAgICAgICAgcHkgKz0gdS5oICsgbTtcclxuICAgICAgICAgIC8vaWYoZGl2KSBweSArPSBtICogMC41XHJcbiAgICAgICAgICBweCA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHB4ID0gMDtcclxuXHJcbiAgICAgICAgdS56b25lLnggPSB6b25lLnggKyB1LmR4O1xyXG4gICAgICAgIHUuem9uZS55ID0gcHk7XHJcbiAgICAgICAgcHkgKz0gdS5oICsgbTtcclxuXHJcbiAgICAgICAgaGVpZ2h0ICs9IHUuaCArIG07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gaGVpZ2h0O1xyXG4gIH0sXHJcblxyXG4gIGZpbmRUYXJnZXQ6IGZ1bmN0aW9uICh1aXMsIGUpIHtcclxuICAgIGxldCBpID0gdWlzLmxlbmd0aDtcclxuXHJcbiAgICB3aGlsZSAoaS0tKSB7XHJcbiAgICAgIGlmIChSLm9uWm9uZSh1aXNbaV0sIGUuY2xpZW50WCwgZS5jbGllbnRZKSkgcmV0dXJuIGk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIC0xO1xyXG4gIH0sXHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyAgIFpPTkVcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIGZpbmRab25lOiBmdW5jdGlvbiAoZm9yY2UpIHtcclxuICAgIGlmICghUi5uZWVkUmVab25lICYmICFmb3JjZSkgcmV0dXJuO1xyXG5cclxuICAgIHZhciBpID0gUi51aS5sZW5ndGgsXHJcbiAgICAgIHU7XHJcblxyXG4gICAgd2hpbGUgKGktLSkge1xyXG4gICAgICB1ID0gUi51aVtpXTtcclxuICAgICAgUi5nZXRab25lKHUpO1xyXG4gICAgICBpZiAodS5pc0d1aSkgdS5jYWxjVWlzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgUi5uZWVkUmVab25lID0gZmFsc2U7XHJcbiAgfSxcclxuXHJcbiAgb25ab25lOiBmdW5jdGlvbiAobywgeCwgeSkge1xyXG4gICAgaWYgKHggPT09IHVuZGVmaW5lZCB8fCB5ID09PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICBsZXQgeiA9IG8uem9uZTtcclxuICAgIGxldCBteCA9IHggLSB6Lng7IC8vIC0gby5keDtcclxuICAgIGxldCBteSA9IHkgLSB6Lnk7XHJcblxyXG4gICAgLy9pZiggdGhpcy5tYXJnaW5EaXYgKSBlLmNsaWVudFkgLT0gdGhpcy5tYXJnaW4gKiAwLjVcclxuICAgIC8vaWYoIG8uZ3JvdXAgJiYgby5ncm91cC5tYXJnaW5EaXYgKSBteSArPSBvLmdyb3VwLm1hcmdpbiAqIDAuNVxyXG4gICAgLy9pZiggby5ncm91cCAhPT0gbnVsbCApIG14IC09IG8uZHhcclxuXHJcbiAgICBsZXQgb3ZlciA9IG14ID49IDAgJiYgbXkgPj0gMCAmJiBteCA8PSB6LncgJiYgbXkgPD0gei5oO1xyXG5cclxuICAgIC8vaWYoIG8ubWFyZ2luRGl2ICkgbXkgLT0gby5tYXJnaW4gKiAwLjVcclxuXHJcbiAgICBpZiAob3Zlcikgby5sb2NhbC5zZXQobXgsIG15KTtcclxuICAgIGVsc2Ugby5sb2NhbC5uZWcoKTtcclxuXHJcbiAgICByZXR1cm4gb3ZlcjtcclxuICB9LFxyXG5cclxuICBnZXRXaWR0aDogZnVuY3Rpb24gKG8pIHtcclxuICAgIC8vcmV0dXJuIG8uZ2V0RG9tKCkub2Zmc2V0V2lkdGhcclxuICAgIHJldHVybiBvLmdldERvbSgpLmNsaWVudFdpZHRoO1xyXG5cclxuICAgIC8vbGV0IHIgPSBvLmdldERvbSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG4gICAgLy9yZXR1cm4gKHIud2lkdGgpXHJcbiAgICAvL3JldHVybiBNYXRoLmZsb29yKHIud2lkdGgpXHJcbiAgfSxcclxuXHJcbiAgZ2V0Wm9uZTogZnVuY3Rpb24gKG8pIHtcclxuICAgIGlmIChvLmlzQ2FudmFzT25seSkgcmV0dXJuO1xyXG4gICAgbGV0IHIgPSBvLmdldERvbSgpLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xyXG5cclxuICAgIC8vaWYoICFyLndpZHRoICkgcmV0dXJuXHJcbiAgICAvL28uem9uZSA9IHsgeDpNYXRoLmZsb29yKHIubGVmdCksIHk6TWF0aC5mbG9vcihyLnRvcCksIHc6TWF0aC5mbG9vcihyLndpZHRoKSwgaDpNYXRoLmZsb29yKHIuaGVpZ2h0KSB9O1xyXG4gICAgLy9vLnpvbmUgPSB7IHg6TWF0aC5yb3VuZChyLmxlZnQpLCB5Ok1hdGgucm91bmQoci50b3ApLCB3Ok1hdGgucm91bmQoci53aWR0aCksIGg6TWF0aC5yb3VuZChyLmhlaWdodCkgfTtcclxuICAgIG8uem9uZSA9IHsgeDogci5sZWZ0LCB5OiByLnRvcCwgdzogci53aWR0aCwgaDogci5oZWlnaHQgfTtcclxuXHJcbiAgICAvL2NvbnNvbGUubG9nKG8ubmFtZSwgby56b25lKVxyXG4gIH0sXHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyAgIENVUlNPUlxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgY3Vyc29yOiBmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgbmFtZSA9IG5hbWUgPyBuYW1lIDogXCJhdXRvXCI7XHJcbiAgICBpZiAobmFtZSAhPT0gUi5vbGRDdXJzb3IpIHtcclxuICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5jdXJzb3IgPSBuYW1lO1xyXG4gICAgICBSLm9sZEN1cnNvciA9IG5hbWU7XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICAgQ0FOVkFTXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICB0b0NhbnZhczogZnVuY3Rpb24gKG8sIHcsIGgsIGZvcmNlKSB7XHJcbiAgICBpZiAoIVIueG1sc2VyaWFsaXplcikgUi54bWxzZXJpYWxpemVyID0gbmV3IFhNTFNlcmlhbGl6ZXIoKTtcclxuXHJcbiAgICAvLyBwcmV2ZW50IGV4ZXNpdmUgcmVkcmF3XHJcblxyXG4gICAgaWYgKGZvcmNlICYmIFIudG1wVGltZSAhPT0gbnVsbCkge1xyXG4gICAgICBjbGVhclRpbWVvdXQoUi50bXBUaW1lKTtcclxuICAgICAgUi50bXBUaW1lID0gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoUi50bXBUaW1lICE9PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgaWYgKFIubG9jaylcclxuICAgICAgUi50bXBUaW1lID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgUi50bXBUaW1lID0gbnVsbDtcclxuICAgICAgfSwgMTApO1xyXG5cclxuICAgIC8vL1xyXG5cclxuICAgIGxldCBpc05ld1NpemUgPSBmYWxzZTtcclxuICAgIGlmICh3ICE9PSBvLmNhbnZhcy53aWR0aCB8fCBoICE9PSBvLmNhbnZhcy5oZWlnaHQpIGlzTmV3U2l6ZSA9IHRydWU7XHJcblxyXG4gICAgaWYgKFIudG1wSW1hZ2UgPT09IG51bGwpIFIudG1wSW1hZ2UgPSBuZXcgSW1hZ2UoKTtcclxuXHJcbiAgICBsZXQgaW1nID0gUi50bXBJbWFnZTsgLy9uZXcgSW1hZ2UoKTtcclxuXHJcbiAgICBsZXQgaHRtbFN0cmluZyA9IFIueG1sc2VyaWFsaXplci5zZXJpYWxpemVUb1N0cmluZyhvLmNvbnRlbnQpO1xyXG5cclxuICAgIGxldCBzdmcgPVxyXG4gICAgICAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIgd2lkdGg9XCInICtcclxuICAgICAgdyArXHJcbiAgICAgICdcIiBoZWlnaHQ9XCInICtcclxuICAgICAgaCArXHJcbiAgICAgICdcIj48Zm9yZWlnbk9iamVjdCBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBub25lOyBsZWZ0OjA7XCIgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiPicgK1xyXG4gICAgICBodG1sU3RyaW5nICtcclxuICAgICAgXCI8L2ZvcmVpZ25PYmplY3Q+PC9zdmc+XCI7XHJcblxyXG4gICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgbGV0IGN0eCA9IG8uY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuXHJcbiAgICAgIGlmIChpc05ld1NpemUpIHtcclxuICAgICAgICBvLmNhbnZhcy53aWR0aCA9IHc7XHJcbiAgICAgICAgby5jYW52YXMuaGVpZ2h0ID0gaDtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBjdHguY2xlYXJSZWN0KDAsIDAsIHcsIGgpO1xyXG4gICAgICB9XHJcbiAgICAgIGN0eC5kcmF3SW1hZ2UodGhpcywgMCwgMCk7XHJcblxyXG4gICAgICBvLm9uRHJhdygpO1xyXG4gICAgfTtcclxuXHJcbiAgICBpbWcuc3JjID0gXCJkYXRhOmltYWdlL3N2Zyt4bWw7Y2hhcnNldD11dGYtOCxcIiArIGVuY29kZVVSSUNvbXBvbmVudChzdmcpO1xyXG4gICAgLy9pbWcuc3JjID0gJ2RhdGE6aW1hZ2Uvc3ZnK3htbDtiYXNlNjQsJysgd2luZG93LmJ0b2EoIHN2ZyApO1xyXG4gICAgaW1nLmNyb3NzT3JpZ2luID0gXCJcIjtcclxuICAgIFIubmVlZHNVcGRhdGUgPSBmYWxzZTtcclxuICB9LFxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBJTlBVVFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgc2V0SGlkZGVuOiBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAoUi5oaWRkZW5JbXB1dCA9PT0gbnVsbCkge1xyXG4gICAgICAvL2xldCBjc3MgPSBSLnBhcmVudC5jc3MudHh0c2VsZWN0ICsgJ3BhZGRpbmc6MDsgd2lkdGg6YXV0bzsgaGVpZ2h0OmF1dG87ICdcclxuICAgICAgLy9sZXQgY3NzID0gUi5wYXJlbnQuY3NzLnR4dCArICdwYWRkaW5nOjA7IHdpZHRoOmF1dG87IGhlaWdodDphdXRvOyB0ZXh0LXNoYWRvdzpub25lOydcclxuICAgICAgLy9jc3MgKz0gJ2xlZnQ6MTBweDsgdG9wOmF1dG87IGJvcmRlcjpub25lOyBjb2xvcjojRkZGOyBiYWNrZ3JvdW5kOiMwMDA7JyArIGhpZGU7XHJcblxyXG4gICAgICBSLmhpZGRlbkltcHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xyXG4gICAgICBSLmhpZGRlbkltcHV0LnR5cGUgPSBcInRleHRcIjtcclxuICAgICAgLy9SLmhpZGRlbkltcHV0LnN0eWxlLmNzc1RleHQgPSBjc3MgKyAnYm90dG9tOjMwcHg7JyArIChSLmRlYnVnSW5wdXQgPyAnJyA6ICd0cmFuc2Zvcm06c2NhbGUoMCk7Jyk7XHJcblxyXG4gICAgICBSLmhpZGRlblNpemVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgICAgLy9SLmhpZGRlblNpemVyLnN0eWxlLmNzc1RleHQgPSBjc3MgKyAnYm90dG9tOjYwcHg7JztcclxuXHJcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoUi5oaWRkZW5JbXB1dCk7XHJcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoUi5oaWRkZW5TaXplcik7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGhpZGUgPSBSLmRlYnVnSW5wdXQgPyBcIlwiIDogXCJvcGFjaXR5OjA7IHpJbmRleDowO1wiO1xyXG4gICAgbGV0IGNzcyA9XHJcbiAgICAgIFIucGFyZW50LmNzcy50eHRzZWxlY3QgK1xyXG4gICAgICBcInBhZGRpbmc6MDsgd2lkdGg6YXV0bzsgaGVpZ2h0OmF1dG87IGxlZnQ6MTBweDsgdG9wOmF1dG87IGNvbG9yOiNGRkY7IGJhY2tncm91bmQ6IzAwMDtcIiArXHJcbiAgICAgIGhpZGU7XHJcbiAgICBSLmhpZGRlbkltcHV0LnN0eWxlLmNzc1RleHQgPVxyXG4gICAgICBjc3MgKyBcImJvdHRvbToxMHB4O1wiICsgKFIuZGVidWdJbnB1dCA/IFwiXCIgOiBcInRyYW5zZm9ybTpzY2FsZSgwKTtcIik7XHJcbiAgICBSLmhpZGRlblNpemVyLnN0eWxlLmNzc1RleHQgPSBjc3MgKyBcImJvdHRvbTo0MHB4O1wiO1xyXG5cclxuICAgIFIuaGlkZGVuSW1wdXQuc3R5bGUud2lkdGggPSBSLmlucHV0LmNsaWVudFdpZHRoICsgXCJweFwiO1xyXG4gICAgUi5oaWRkZW5JbXB1dC52YWx1ZSA9IFIuc3RyO1xyXG4gICAgUi5oaWRkZW5TaXplci5pbm5lckhUTUwgPSBSLnN0cjtcclxuXHJcbiAgICBSLmhhc0ZvY3VzID0gdHJ1ZTtcclxuICB9LFxyXG5cclxuICBjbGVhckhpZGRlbjogZnVuY3Rpb24gKHApIHtcclxuICAgIGlmIChSLmhpZGRlbkltcHV0ID09PSBudWxsKSByZXR1cm47XHJcbiAgICBSLmhhc0ZvY3VzID0gZmFsc2U7XHJcbiAgfSxcclxuXHJcbiAgY2xpY2tQb3M6IGZ1bmN0aW9uICh4KSB7XHJcbiAgICBsZXQgaSA9IFIuc3RyLmxlbmd0aCxcclxuICAgICAgbCA9IDAsXHJcbiAgICAgIG4gPSAwO1xyXG4gICAgd2hpbGUgKGktLSkge1xyXG4gICAgICBsICs9IFIudGV4dFdpZHRoKFIuc3RyW25dKTtcclxuICAgICAgaWYgKGwgPj0geCkgYnJlYWs7XHJcbiAgICAgIG4rKztcclxuICAgIH1cclxuICAgIHJldHVybiBuO1xyXG4gIH0sXHJcblxyXG4gIHVwSW5wdXQ6IGZ1bmN0aW9uICh4LCBkb3duKSB7XHJcbiAgICBpZiAoUi5wYXJlbnQgPT09IG51bGwpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICBsZXQgdXAgPSBmYWxzZTtcclxuXHJcbiAgICBpZiAoZG93bikge1xyXG4gICAgICBsZXQgaWQgPSBSLmNsaWNrUG9zKHgpO1xyXG5cclxuICAgICAgUi5tb3ZlWCA9IGlkO1xyXG5cclxuICAgICAgaWYgKFIuc3RhcnRYID09PSAtMSkge1xyXG4gICAgICAgIFIuc3RhcnRYID0gaWQ7XHJcbiAgICAgICAgUi5jdXJzb3JJZCA9IGlkO1xyXG4gICAgICAgIFIuaW5wdXRSYW5nZSA9IFtSLnN0YXJ0WCwgUi5zdGFydFhdO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGxldCBpc1NlbGVjdGlvbiA9IFIubW92ZVggIT09IFIuc3RhcnRYO1xyXG5cclxuICAgICAgICBpZiAoaXNTZWxlY3Rpb24pIHtcclxuICAgICAgICAgIGlmIChSLnN0YXJ0WCA+IFIubW92ZVgpIFIuaW5wdXRSYW5nZSA9IFtSLm1vdmVYLCBSLnN0YXJ0WF07XHJcbiAgICAgICAgICBlbHNlIFIuaW5wdXRSYW5nZSA9IFtSLnN0YXJ0WCwgUi5tb3ZlWF07XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICB1cCA9IHRydWU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpZiAoUi5zdGFydFggIT09IC0xKSB7XHJcbiAgICAgICAgUi5oYXNGb2N1cyA9IHRydWU7XHJcbiAgICAgICAgUi5oaWRkZW5JbXB1dC5mb2N1cygpO1xyXG4gICAgICAgIFIuaGlkZGVuSW1wdXQuc2VsZWN0aW9uU3RhcnQgPSBSLmlucHV0UmFuZ2VbMF07XHJcbiAgICAgICAgUi5oaWRkZW5JbXB1dC5zZWxlY3Rpb25FbmQgPSBSLmlucHV0UmFuZ2VbMV07XHJcbiAgICAgICAgUi5zdGFydFggPSAtMTtcclxuXHJcbiAgICAgICAgdXAgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHVwKSBSLnNlbGVjdFBhcmVudCgpO1xyXG5cclxuICAgIHJldHVybiB1cDtcclxuICB9LFxyXG5cclxuICBzZWxlY3RBbGw6IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICghUi5wYXJlbnQpIHJldHVybjtcclxuXHJcbiAgICBSLnN0ciA9IFIuaW5wdXQudGV4dENvbnRlbnQ7XHJcbiAgICBSLmlucHV0UmFuZ2UgPSBbMCwgUi5zdHIubGVuZ3RoXTtcclxuICAgIFIuaGFzRm9jdXMgPSB0cnVlO1xyXG4gICAgUi5oaWRkZW5JbXB1dC5mb2N1cygpO1xyXG4gICAgUi5oaWRkZW5JbXB1dC5zZWxlY3Rpb25TdGFydCA9IFIuaW5wdXRSYW5nZVswXTtcclxuICAgIFIuaGlkZGVuSW1wdXQuc2VsZWN0aW9uRW5kID0gUi5pbnB1dFJhbmdlWzFdO1xyXG4gICAgUi5jdXJzb3JJZCA9IFIuaW5wdXRSYW5nZVsxXTtcclxuICAgIFIuc2VsZWN0UGFyZW50KCk7XHJcbiAgfSxcclxuXHJcbiAgc2VsZWN0UGFyZW50OiBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgYyA9IFIudGV4dFdpZHRoKFIuc3RyLnN1YnN0cmluZygwLCBSLmN1cnNvcklkKSk7XHJcbiAgICB2YXIgZSA9IFIudGV4dFdpZHRoKFIuc3RyLnN1YnN0cmluZygwLCBSLmlucHV0UmFuZ2VbMF0pKTtcclxuICAgIHZhciBzID0gUi50ZXh0V2lkdGgoUi5zdHIuc3Vic3RyaW5nKFIuaW5wdXRSYW5nZVswXSwgUi5pbnB1dFJhbmdlWzFdKSk7XHJcblxyXG4gICAgUi5wYXJlbnQuc2VsZWN0KGMsIGUsIHMsIFIuaGlkZGVuU2l6ZXIuaW5uZXJIVE1MKTtcclxuICB9LFxyXG5cclxuICB0ZXh0V2lkdGg6IGZ1bmN0aW9uICh0ZXh0KSB7XHJcbiAgICBpZiAoUi5oaWRkZW5TaXplciA9PT0gbnVsbCkgcmV0dXJuIDA7XHJcbiAgICB0ZXh0ID0gdGV4dC5yZXBsYWNlKC8gL2csIFwiJm5ic3A7XCIpO1xyXG4gICAgUi5oaWRkZW5TaXplci5pbm5lckhUTUwgPSB0ZXh0O1xyXG4gICAgcmV0dXJuIFIuaGlkZGVuU2l6ZXIuY2xpZW50V2lkdGg7XHJcbiAgfSxcclxuXHJcbiAgY2xlYXJJbnB1dDogZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKFIucGFyZW50ID09PSBudWxsKSByZXR1cm47XHJcbiAgICBpZiAoIVIuZmlyc3RJbXB1dCkgUi5wYXJlbnQudmFsaWRhdGUodHJ1ZSk7XHJcblxyXG4gICAgUi5jbGVhckhpZGRlbigpO1xyXG4gICAgUi5wYXJlbnQudW5zZWxlY3QoKTtcclxuXHJcbiAgICAvL1IuaW5wdXQuc3R5bGUuYmFja2dyb3VuZCA9ICdub25lJztcclxuICAgIFIuaW5wdXQuc3R5bGUuYmFja2dyb3VuZCA9IFIucGFyZW50LmNvbG9ycy5iYWNrO1xyXG4gICAgUi5pbnB1dC5zdHlsZS5ib3JkZXJDb2xvciA9IFIucGFyZW50LmNvbG9ycy5ib3JkZXI7XHJcbiAgICAvL1IuaW5wdXQuc3R5bGUuY29sb3IgPSBSLnBhcmVudC5jb2xvcnMudGV4dDtcclxuICAgIFIucGFyZW50LmlzRWRpdCA9IGZhbHNlO1xyXG5cclxuICAgIFIuaW5wdXQgPSBudWxsO1xyXG4gICAgUi5wYXJlbnQgPSBudWxsO1xyXG4gICAgKFIuc3RyID0gXCJcIiksIChSLmZpcnN0SW1wdXQgPSB0cnVlKTtcclxuICB9LFxyXG5cclxuICBzZXRJbnB1dDogZnVuY3Rpb24gKElucHV0LCBwYXJlbnQpIHtcclxuICAgIFIuY2xlYXJJbnB1dCgpO1xyXG5cclxuICAgIFIuaW5wdXQgPSBJbnB1dDtcclxuICAgIFIucGFyZW50ID0gcGFyZW50O1xyXG5cclxuICAgIFIuaW5wdXQuc3R5bGUuYmFja2dyb3VuZCA9IFIucGFyZW50LmNvbG9ycy5iYWNrb2ZmO1xyXG4gICAgUi5pbnB1dC5zdHlsZS5ib3JkZXJDb2xvciA9IFIucGFyZW50LmNvbG9ycy5zZWxlY3Q7XHJcbiAgICAvL1IuaW5wdXQuc3R5bGUuY29sb3IgPSBSLnBhcmVudC5jb2xvcnMudGV4dFNlbGVjdDtcclxuICAgIFIuc3RyID0gUi5pbnB1dC50ZXh0Q29udGVudDtcclxuXHJcbiAgICBSLnNldEhpZGRlbigpO1xyXG4gIH0sXHJcblxyXG4gIGtleWRvd246IGZ1bmN0aW9uIChlKSB7XHJcbiAgICBpZiAoUi5wYXJlbnQgPT09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICBsZXQga2V5Q29kZSA9IGUud2hpY2gsXHJcbiAgICAgIGlzU2hpZnQgPSBlLnNoaWZ0S2V5O1xyXG5cclxuICAgIC8vY29uc29sZS5sb2coIGtleUNvZGUgKVxyXG5cclxuICAgIFIuZmlyc3RJbXB1dCA9IGZhbHNlO1xyXG5cclxuICAgIGlmIChSLmhhc0ZvY3VzKSB7XHJcbiAgICAgIC8vIGhhY2sgdG8gZml4IHRvdWNoIGV2ZW50IGJ1ZyBpbiBpT1MgU2FmYXJpXHJcbiAgICAgIHdpbmRvdy5mb2N1cygpO1xyXG4gICAgICBSLmhpZGRlbkltcHV0LmZvY3VzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgUi5wYXJlbnQuaXNFZGl0ID0gdHJ1ZTtcclxuXHJcbiAgICAvLyBlLnByZXZlbnREZWZhdWx0KCk7XHJcblxyXG4gICAgLy8gYWRkIHN1cHBvcnQgZm9yIEN0cmwvQ21kK0Egc2VsZWN0aW9uXHJcbiAgICAvL2lmICgga2V5Q29kZSA9PT0gNjUgJiYgKGUuY3RybEtleSB8fCBlLm1ldGFLZXkgKSkge1xyXG4gICAgLy9SLnNlbGVjdFRleHQoKTtcclxuICAgIC8vZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgLy9yZXR1cm4gc2VsZi5yZW5kZXIoKTtcclxuICAgIC8vfVxyXG5cclxuICAgIGlmIChrZXlDb2RlID09PSAxMykge1xyXG4gICAgICAvL2VudGVyXHJcblxyXG4gICAgICBSLmNsZWFySW5wdXQoKTtcclxuXHJcbiAgICAgIC8vfSBlbHNlIGlmKCBrZXlDb2RlID09PSA5ICl7IC8vdGFiIGtleVxyXG5cclxuICAgICAgLy8gUi5pbnB1dC50ZXh0Q29udGVudCA9ICcnO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaWYgKFIuaW5wdXQuaXNOdW0pIHtcclxuICAgICAgICBpZiAoXHJcbiAgICAgICAgICAoZS5rZXlDb2RlID4gNDcgJiYgZS5rZXlDb2RlIDwgNTgpIHx8XHJcbiAgICAgICAgICAoZS5rZXlDb2RlID4gOTUgJiYgZS5rZXlDb2RlIDwgMTA2KSB8fFxyXG4gICAgICAgICAgZS5rZXlDb2RlID09PSAxOTAgfHxcclxuICAgICAgICAgIGUua2V5Q29kZSA9PT0gMTEwIHx8XHJcbiAgICAgICAgICBlLmtleUNvZGUgPT09IDggfHxcclxuICAgICAgICAgIGUua2V5Q29kZSA9PT0gMTA5XHJcbiAgICAgICAgKSB7XHJcbiAgICAgICAgICBSLmhpZGRlbkltcHV0LnJlYWRPbmx5ID0gZmFsc2U7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIFIuaGlkZGVuSW1wdXQucmVhZE9ubHkgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBSLmhpZGRlbkltcHV0LnJlYWRPbmx5ID0gZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9LFxyXG5cclxuICBrZXl1cDogZnVuY3Rpb24gKGUpIHtcclxuICAgIGlmIChSLnBhcmVudCA9PT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgIFIuc3RyID0gUi5oaWRkZW5JbXB1dC52YWx1ZTtcclxuXHJcbiAgICBpZiAoUi5wYXJlbnQuYWxsRXF1YWwpIFIucGFyZW50LnNhbWVTdHIoUi5zdHIpOyAvLyBudW1lcmljIHNhbcO5ZSB2YWx1ZVxyXG4gICAgZWxzZSBSLmlucHV0LnRleHRDb250ZW50ID0gUi5zdHI7XHJcblxyXG4gICAgUi5jdXJzb3JJZCA9IFIuaGlkZGVuSW1wdXQuc2VsZWN0aW9uU3RhcnQ7XHJcbiAgICBSLmlucHV0UmFuZ2UgPSBbUi5oaWRkZW5JbXB1dC5zZWxlY3Rpb25TdGFydCwgUi5oaWRkZW5JbXB1dC5zZWxlY3Rpb25FbmRdO1xyXG5cclxuICAgIFIuc2VsZWN0UGFyZW50KCk7XHJcblxyXG4gICAgLy9pZiggUi5wYXJlbnQuYWxsd2F5IClcclxuICAgIFIucGFyZW50LnZhbGlkYXRlKCk7XHJcbiAgfSxcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vXHJcbiAgLy8gICBMSVNURU5JTkdcclxuICAvL1xyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgbG9vcDogZnVuY3Rpb24gKCkge1xyXG4gICAgLy8gbW9kaWZpZWQgYnkgRmVkZW1hcmlub1xyXG4gICAgaWYgKFIuaXNMb29wKSByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoUi5sb29wKTtcclxuICAgIFIubmVlZHNVcGRhdGUgPSBSLnVwZGF0ZSgpO1xyXG4gICAgLy8gaWYgdGhlcmUgaXMgYSBjaGFuZ2UgaW4gYSB2YWx1ZSBnZW5lcmF0ZWQgZXh0ZXJuYWxseSwgdGhlIEdVSSBuZWVkcyB0byBiZSByZWRyYXduXHJcbiAgICBpZiAoUi51aVswXSkgUi51aVswXS5kcmF3KCk7XHJcbiAgfSxcclxuXHJcbiAgdXBkYXRlOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAvLyBtb2RpZmllZCBieSBGZWRlbWFyaW5vXHJcbiAgICBsZXQgaSA9IFIubGlzdGVucy5sZW5ndGg7XHJcbiAgICBsZXQgbmVlZHNVcGRhdGUgPSBmYWxzZTtcclxuICAgIHdoaWxlIChpLS0pIHtcclxuICAgICAgLy9jaGVjayBpZiB0aGUgdmFsdWUgb2YgdGhlIG9iamVjdCBoYXMgY2hhbmdlZFxyXG4gICAgICBsZXQgaGFzQ2hhbmdlZCA9IFIubGlzdGVuc1tpXS5saXN0ZW5pbmcoKTtcclxuICAgICAgaWYgKGhhc0NoYW5nZWQpIG5lZWRzVXBkYXRlID0gdHJ1ZTtcclxuICAgIH1cclxuICAgIHJldHVybiBuZWVkc1VwZGF0ZTtcclxuICB9LFxyXG5cclxuICByZW1vdmVMaXN0ZW46IGZ1bmN0aW9uIChwcm90bykge1xyXG4gICAgbGV0IGlkID0gUi5saXN0ZW5zLmluZGV4T2YocHJvdG8pO1xyXG4gICAgaWYgKGlkICE9PSAtMSkgUi5saXN0ZW5zLnNwbGljZShpZCwgMSk7XHJcbiAgICBpZiAoUi5saXN0ZW5zLmxlbmd0aCA9PT0gMCkgUi5pc0xvb3AgPSBmYWxzZTtcclxuICB9LFxyXG5cclxuICBhZGRMaXN0ZW46IGZ1bmN0aW9uIChwcm90bykge1xyXG4gICAgbGV0IGlkID0gUi5saXN0ZW5zLmluZGV4T2YocHJvdG8pO1xyXG5cclxuICAgIGlmIChpZCAhPT0gLTEpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICBSLmxpc3RlbnMucHVzaChwcm90byk7XHJcblxyXG4gICAgaWYgKCFSLmlzTG9vcCkge1xyXG4gICAgICBSLmlzTG9vcCA9IHRydWU7XHJcbiAgICAgIFIubG9vcCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0sXHJcbn07XHJcblxyXG5leHBvcnQgY29uc3QgUm9vdHMgPSBSO1xyXG4iLCIvKipcclxuICogQGF1dGhvciBsdGggLyBodHRwczovL2dpdGh1Yi5jb20vbG8tdGhcclxuICovXHJcblxyXG5pbXBvcnQgeyBSb290cyB9IGZyb20gJy4vUm9vdHMuanMnO1xyXG5cclxuY29uc3QgVCA9IHtcclxuXHJcbiAgICB0cmFuc2l0aW9uOiAwLjIsXHJcblxyXG4gICAgZnJhZzogZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLFxyXG5cclxuICAgIGNvbG9yUmluZzogbnVsbCxcclxuICAgIGpveXN0aWNrXzA6IG51bGwsXHJcbiAgICBqb3lzdGlja18xOiBudWxsLFxyXG4gICAgY2lyY3VsYXI6IG51bGwsXHJcbiAgICBrbm9iOiBudWxsLFxyXG4gICAgcGFkMmQ6IG51bGwsXHJcblxyXG4gICAgc3ZnbnM6IFwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIixcclxuICAgIGxpbmtzOiBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmtcIixcclxuICAgIGh0bWxzOiBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIixcclxuXHJcbiAgICBET01fU0laRTogWyAnaGVpZ2h0JywgJ3dpZHRoJywgJ3RvcCcsICdsZWZ0JywgJ2JvdHRvbScsICdyaWdodCcsICdtYXJnaW4tbGVmdCcsICdtYXJnaW4tcmlnaHQnLCAnbWFyZ2luLXRvcCcsICdtYXJnaW4tYm90dG9tJ10sXHJcbiAgICBTVkdfVFlQRV9EOiBbICdwYXR0ZXJuJywgJ2RlZnMnLCAndHJhbnNmb3JtJywgJ3N0b3AnLCAnYW5pbWF0ZScsICdyYWRpYWxHcmFkaWVudCcsICdsaW5lYXJHcmFkaWVudCcsICdhbmltYXRlTW90aW9uJywgJ3VzZScsICdmaWx0ZXInLCAnZmVDb2xvck1hdHJpeCcgXSxcclxuICAgIFNWR19UWVBFX0c6IFsgJ3N2ZycsICdyZWN0JywgJ2NpcmNsZScsICdwYXRoJywgJ3BvbHlnb24nLCAndGV4dCcsICdnJywgJ2xpbmUnLCAnZm9yZWlnbk9iamVjdCcgXSxcclxuXHJcbiAgICBQSTogTWF0aC5QSSxcclxuICAgIFR3b1BJOiBNYXRoLlBJKjIsXHJcbiAgICBwaTkwOiBNYXRoLlBJICogMC41LFxyXG4gICAgcGk2MDogTWF0aC5QSS8zLFxyXG4gICAgXHJcbiAgICB0b3JhZDogTWF0aC5QSSAvIDE4MCxcclxuICAgIHRvZGVnOiAxODAgLyBNYXRoLlBJLFxyXG5cclxuICAgIGNsYW1wOiAoIHYsIG1pbiwgbWF4ICkgPT4ge1xyXG5cclxuICAgICAgICB2ID0gdiA8IG1pbiA/IG1pbiA6IHY7XHJcbiAgICAgICAgdiA9IHYgPiBtYXggPyBtYXggOiB2O1xyXG4gICAgICAgIHJldHVybiB2O1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgaXNEaXZpZDogKCB2ICkgPT4gKCB2KjAuNSA9PT0gTWF0aC5mbG9vcih2KjAuNSkgKSxcclxuXHJcbiAgICBzaXplOiB7ICB3OiAyNDAsIGg6IDIwLCBwOiAzMCwgczogOCB9LFxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgQ09MT1JcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBkZWZpbmVDb2xvcjogKCBvLCBjYyA9IFQuY29sb3JzICkgPT4ge1xyXG5cclxuICAgICAgICBsZXQgY29sb3IgPSB7IC4uLmNjIH1cclxuXHJcbiAgICAgICAgbGV0IHRleHRDaGFuZ2UgPSBbJ2ZvbnRGYW1pbHknLCAnZm9udFdlaWdodCcsICdmb250U2hhZG93JywgJ2ZvbnRTaXplJyBdXHJcbiAgICAgICAgbGV0IGNoYW5nZVRleHQgPSBmYWxzZVxyXG5cclxuICAgICAgICBpZiggby5mb250ICkgby5mb250RmFtaWx5ID0gby5mb250XHJcbiAgICAgICAgaWYoIG8uc2hhZG93ICkgby5mb250U2hhZG93ID0gby5zaGFkb3dcclxuICAgICAgICBpZiggby53ZWlnaHQgKSBvLmZvbnRXZWlnaHQgPSBvLndlaWdodFxyXG5cclxuICAgICAgICBpZiggby5mb250Q29sb3IgKSBvLnRleHQgPSBvLmZvbnRDb2xvclxyXG4gICAgICAgIGlmKCBvLmNvbG9yICkgby50ZXh0ID0gby5jb2xvclxyXG5cclxuICAgICAgICBpZiggby50ZXh0ICl7XHJcbiAgICAgICAgICAgIGNvbG9yLnRleHQgPSBvLnRleHRcclxuICAgICAgICAgICAgaWYoICFvLmZvbnRDb2xvciAmJiAhby5jb2xvciApeyBcclxuICAgICAgICAgICAgICAgIGNvbG9yLnRpdGxlID0gVC5Db2xvckx1bWEoIG8udGV4dCwgLTAuMjUgKVxyXG4gICAgICAgICAgICAgICAgY29sb3IudGl0bGVvZmYgPSBULkNvbG9yTHVtYSggby50ZXh0LCAtMC41IClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb2xvci50ZXh0T3ZlciA9IFQuQ29sb3JMdW1hKCBvLnRleHQsIDAuMjUgKVxyXG4gICAgICAgICAgICBjb2xvci50ZXh0U2VsZWN0ID0gVC5Db2xvckx1bWEoIG8udGV4dCwgMC41IClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCBvLmJ1dHRvbiApe1xyXG4gICAgICAgICAgICBjb2xvci5idXR0b24gPSBvLmJ1dHRvblxyXG4gICAgICAgICAgICBjb2xvci5ib3JkZXIgPSBULkNvbG9yTHVtYSggby5idXR0b24sIDAuMSApXHJcbiAgICAgICAgICAgIGNvbG9yLm92ZXJvZmYgPSBULkNvbG9yTHVtYSggby5idXR0b24sIDAuMiApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggby5zZWxlY3QgKXtcclxuICAgICAgICAgICAgY29sb3Iuc2VsZWN0ID0gby5zZWxlY3RcclxuICAgICAgICAgICAgY29sb3Iub3ZlciA9IFQuQ29sb3JMdW1hKCBvLnNlbGVjdCwgLTAuMSApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggby5pdGVtQmcgKSBvLmJhY2sgPSBvLml0ZW1CZ1xyXG5cclxuICAgICAgICBpZiggby5iYWNrICl7XHJcbiAgICAgICAgICAgIGNvbG9yLmJhY2sgPSBvLmJhY2tcclxuICAgICAgICAgICAgY29sb3IuYmFja29mZiA9IFQuQ29sb3JMdW1hKCBvLmJhY2ssIC0wLjEgKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoIG8uZm9udFNlbGVjdCApIGNvbG9yLnRleHRTZWxlY3QgPSBvLmZvbnRTZWxlY3RcclxuICAgICAgICBpZiggby5ncm91cEJvcmRlciApIGNvbG9yLmdib3JkZXIgPSBvLmdyb3VwQm9yZGVyXHJcblxyXG4gICAgICAgIC8vaWYoIG8udHJhbnNwYXJlbnQgKSBvLmJnID0gJ25vbmUnXHJcbiAgICAgICAgLy9pZiggby5iZyApIGNvbG9yLmJhY2tncm91bmQgPSBjb2xvci5iYWNrZ3JvdW5kT3ZlciA9IG8uYmdcclxuICAgICAgICBpZiggby5iZ092ZXIgKSBjb2xvci5iYWNrZ3JvdW5kT3ZlciA9IG8uYmdPdmVyXHJcblxyXG4gICAgICAgIGZvciggbGV0IG0gaW4gY29sb3IgKXtcclxuICAgICAgICAgICAgaWYob1ttXSE9PXVuZGVmaW5lZCkgY29sb3JbbV0gPSBvW21dXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IoIGxldCBtIGluIG8gKXtcclxuICAgICAgICAgICAgaWYoIHRleHRDaGFuZ2UuaW5kZXhPZihtKSAhPT0gLTEgKSBjaGFuZ2VUZXh0ID0gdHJ1ZSBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCBjaGFuZ2VUZXh0ICkgVC5kZWZpbmVUZXh0KCBjb2xvciApXHJcblxyXG4gICAgICAgIHJldHVybiBjb2xvclxyXG5cclxuICAgIH0sXHJcblxyXG4gICAgY29sb3JzOiB7XHJcblxyXG4gICAgICAgIHN4OiA0LC8vNFxyXG4gICAgICAgIHN5OiAyLC8vMlxyXG4gICAgICAgIHJhZGl1czoyLFxyXG5cclxuICAgICAgICBzaG93T3ZlciA6IDEsXHJcbiAgICAgICAgLy9ncm91cE92ZXIgOiAxLFxyXG5cclxuICAgICAgICBjb250ZW50Oidub25lJyxcclxuICAgICAgICBiYWNrZ3JvdW5kOiAncmdiYSg1MCw1MCw1MCwwLjE1KScsXHJcbiAgICAgICAgYmFja2dyb3VuZE92ZXI6ICdyZ2JhKDUwLDUwLDUwLDAuMyknLFxyXG5cclxuICAgICAgICB0aXRsZSA6ICcjQ0NDJyxcclxuICAgICAgICB0aXRsZW9mZiA6ICcjQkJCJyxcclxuICAgICAgICB0ZXh0IDogJyNEREQnLFxyXG4gICAgICAgIHRleHRPdmVyIDogJyNFRUUnLFxyXG4gICAgICAgIHRleHRTZWxlY3QgOiAnI0ZGRicsXHJcbiAgICAgICAgXHJcbiAgICAgICAgYmFjazoncmdiYSgwLDAsMCwwLjIpJyxcclxuICAgICAgICBiYWNrb2ZmOidyZ2JhKDAsMCwwLDAuMyknLFxyXG5cclxuICAgICAgICAvLyBpbnB1dCBhbmQgYnV0dG9uIGJvcmRlclxyXG4gICAgICAgIGJvcmRlciA6ICcjNGM0YzRjJyxcclxuICAgICAgICBib3JkZXJTaXplIDogMSxcclxuXHJcbiAgICAgICAgZ2JvcmRlciA6ICdub25lJyxcclxuICAgICAgICBncm91cHMgOiAnbm9uZScsXHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIGJ1dHRvbiA6ICcjM2MzYzNjJyxcclxuICAgICAgICBvdmVyb2ZmIDogJyM1YzVjNWMnLFxyXG4gICAgICAgIG92ZXIgOiAnIzAyNDY5OScsXHJcbiAgICAgICAgc2VsZWN0IDogJyMzMDhBRkYnLFxyXG4gICAgICAgIGFjdGlvbjogJyNGRjMzMDAnLFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vZm9udEZhbWlseTogJ1RhaG9tYScsXHJcbiAgICAgICAgZm9udEZhbWlseTogJ0NvbnNvbGFzLCBtb25vc3BhY2UnLFxyXG4gICAgICAgIC8vZm9udEZhbWlseTogXCInUm9ib3RvIE1vbm8nLCAnU291cmNlIENvZGUgUHJvJywgTWVubG8sIENvdXJpZXIsIG1vbm9zcGFjZVwiLFxyXG4gICAgICAgIGZvbnRXZWlnaHQ6ICdub3JtYWwnLFxyXG4gICAgICAgIGZvbnRTaGFkb3c6ICdub25lJywvLycjMDAwJyxcclxuICAgICAgICBmb250U2l6ZToxMixcclxuXHJcbiAgICAgICAgam95T3ZlcjoncmdiYSg0OCwxMzgsMjU1LDAuMjUpJyxcclxuICAgICAgICBqb3lPdXQ6ICdyZ2JhKDEwMCwxMDAsMTAwLDAuNSknLFxyXG4gICAgICAgIGpveVNlbGVjdDogJyMzMDhBRkYnLFxyXG5cclxuICAgICAgICBcclxuICAgICAgICBoaWRlOiAncmdiYSgwLDAsMCwwKScsXHJcblxyXG4gICAgfSxcclxuXHJcbiAgICAvLyBzdHlsZSBjc3NcclxuXHJcbiAgICBjc3MgOiB7XHJcblxyXG4gICAgICAgIGJhc2ljOiAncG9zaXRpb246YWJzb2x1dGU7IHBvaW50ZXItZXZlbnRzOm5vbmU7IGJveC1zaXppbmc6Ym9yZGVyLWJveDsgbWFyZ2luOjA7IHBhZGRpbmc6MDsgb3ZlcmZsb3c6aGlkZGVuOyAnICsgJy1vLXVzZXItc2VsZWN0Om5vbmU7IC1tcy11c2VyLXNlbGVjdDpub25lOyAta2h0bWwtdXNlci1zZWxlY3Q6bm9uZTsgLXdlYmtpdC11c2VyLXNlbGVjdDpub25lOyAtbW96LXVzZXItc2VsZWN0Om5vbmU7JyxcclxuICAgICAgICBidXR0b246J2Rpc3BsYXk6ZmxleDsgYWxpZ24taXRlbXM6Y2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyOyB0ZXh0LWFsaWduOmNlbnRlcjsnLFxyXG4gICAgICAgIG1pZGRsZTonZGlzcGxheTpmbGV4OyBhbGlnbi1pdGVtczpjZW50ZXI7IGp1c3RpZnktY29udGVudDpsZWZ0OyB0ZXh0LWFsaWduOmxlZnQ7IGZsZXgtZGlyZWN0aW9uOiByb3ctcmV2ZXJzZTsnXHJcbiAgICB9LFxyXG5cclxuICAgIC8vIHN2ZyBwYXRoXHJcblxyXG4gICAgc3Znczoge1xyXG5cclxuICAgICAgICBnMTonTSA2IDQgTCAwIDQgMCA2IDYgNiA2IDQgTSA2IDAgTCAwIDAgMCAyIDYgMiA2IDAgWicsXHJcbiAgICAgICAgZzI6J00gNiAwIEwgNCAwIDQgNiA2IDYgNiAwIE0gMiAwIEwgMCAwIDAgNiAyIDYgMiAwIFonLFxyXG5cclxuICAgICAgICBncm91cDonTSA3IDcgTCA3IDggOCA4IDggNyA3IDcgTSA1IDcgTCA1IDggNiA4IDYgNyA1IDcgTSAzIDcgTCAzIDggNCA4IDQgNyAzIDcgTSA3IDUgTCA3IDYgOCA2IDggNSA3IDUgTSA2IDYgTCA2IDUgNSA1IDUgNiA2IDYgTSA3IDMgTCA3IDQgOCA0IDggMyA3IDMgTSA2IDQgTCA2IDMgNSAzIDUgNCA2IDQgTSAzIDUgTCAzIDYgNCA2IDQgNSAzIDUgTSAzIDMgTCAzIDQgNCA0IDQgMyAzIDMgWicsXHJcbiAgICAgICAgYXJyb3c6J00gMyA4IEwgOCA1IDMgMiAzIDggWicsXHJcblxyXG4gICAgICAgIGFycm93RG93bjonTSA1IDggTCA4IDMgMiAzIDUgOCBaJyxcclxuICAgICAgICBhcnJvd1VwOidNIDUgMiBMIDIgNyA4IDcgNSAyIFonLFxyXG5cclxuICAgICAgICBzb2xpZDonTSAxMyAxMCBMIDEzIDEgNCAxIDEgNCAxIDEzIDEwIDEzIDEzIDEwIE0gMTEgMyBMIDExIDkgOSAxMSAzIDExIDMgNSA1IDMgMTEgMyBaJyxcclxuICAgICAgICBib2R5OidNIDEzIDEwIEwgMTMgMSA0IDEgMSA0IDEgMTMgMTAgMTMgMTMgMTAgTSAxMSAzIEwgMTEgOSA5IDExIDMgMTEgMyA1IDUgMyAxMSAzIE0gNSA0IEwgNCA1IDQgMTAgOSAxMCAxMCA5IDEwIDQgNSA0IFonLFxyXG4gICAgICAgIHZlaGljbGU6J00gMTMgNiBMIDExIDEgMyAxIDEgNiAxIDEzIDMgMTMgMyAxMSAxMSAxMSAxMSAxMyAxMyAxMyAxMyA2IE0gMi40IDYgTCA0IDIgMTAgMiAxMS42IDYgMi40IDYgTSAxMiA4IEwgMTIgMTAgMTAgMTAgMTAgOCAxMiA4IE0gNCA4IEwgNCAxMCAyIDEwIDIgOCA0IDggWicsXHJcbiAgICAgICAgYXJ0aWN1bGF0aW9uOidNIDEzIDkgTCAxMiA5IDkgMiA5IDEgNSAxIDUgMiAyIDkgMSA5IDEgMTMgNSAxMyA1IDkgNCA5IDYgNSA4IDUgMTAgOSA5IDkgOSAxMyAxMyAxMyAxMyA5IFonLFxyXG4gICAgICAgIGNoYXJhY3RlcjonTSAxMyA0IEwgMTIgMyA5IDQgNSA0IDIgMyAxIDQgNSA2IDUgOCA0IDEzIDYgMTMgNyA5IDggMTMgMTAgMTMgOSA4IDkgNiAxMyA0IE0gNiAxIEwgNiAzIDggMyA4IDEgNiAxIFonLFxyXG4gICAgICAgIHRlcnJhaW46J00gMTMgOCBMIDEyIDcgUSA5LjA2IC0zLjY3IDUuOTUgNC44NSA0LjA0IDMuMjcgMiA3IEwgMSA4IDcgMTMgMTMgOCBNIDMgOCBRIDMuNzggNS40MjAgNS40IDYuNiA1LjIwIDcuMjUgNSA4IEwgNyA4IFEgOC4zOSAtMC4xNiAxMSA4IEwgNyAxMSAzIDggWicsXHJcbiAgICAgICAgam9pbnQ6J00gNy43IDcuNyBRIDggNy40NSA4IDcgOCA2LjYgNy43IDYuMyA3LjQ1IDYgNyA2IDYuNiA2IDYuMyA2LjMgNiA2LjYgNiA3IDYgNy40NSA2LjMgNy43IDYuNiA4IDcgOCA3LjQ1IDggNy43IDcuNyBNIDMuMzUgOC42NSBMIDEgMTEgMyAxMyA1LjM1IDEwLjY1IFEgNi4xIDExIDcgMTEgOC4yOCAxMSA5LjI1IDEwLjI1IEwgNy44IDguOCBRIDcuNDUgOSA3IDkgNi4xNSA5IDUuNTUgOC40IDUgNy44NSA1IDcgNSA2LjU0IDUuMTUgNi4xNSBMIDMuNyA0LjcgUSAzIDUuNzEyIDMgNyAzIDcuOSAzLjM1IDguNjUgTSAxMC4yNSA5LjI1IFEgMTEgOC4yOCAxMSA3IDExIDYuMSAxMC42NSA1LjM1IEwgMTMgMyAxMSAxIDguNjUgMy4zNSBRIDcuOSAzIDcgMyA1LjcgMyA0LjcgMy43IEwgNi4xNSA1LjE1IFEgNi41NCA1IDcgNSA3Ljg1IDUgOC40IDUuNTUgOSA2LjE1IDkgNyA5IDcuNDUgOC44IDcuOCBMIDEwLjI1IDkuMjUgWicsXHJcbiAgICAgICAgcmF5OidNIDkgMTEgTCA1IDExIDUgMTIgOSAxMiA5IDExIE0gMTIgNSBMIDExIDUgMTEgOSAxMiA5IDEyIDUgTSAxMS41IDEwIFEgMTAuOSAxMCAxMC40NSAxMC40NSAxMCAxMC45IDEwIDExLjUgMTAgMTIuMiAxMC40NSAxMi41NSAxMC45IDEzIDExLjUgMTMgMTIuMiAxMyAxMi41NSAxMi41NSAxMyAxMi4yIDEzIDExLjUgMTMgMTAuOSAxMi41NSAxMC40NSAxMi4yIDEwIDExLjUgMTAgTSA5IDEwIEwgMTAgOSAyIDEgMSAyIDkgMTAgWicsXHJcbiAgICAgICAgY29sbGlzaW9uOidNIDExIDEyIEwgMTMgMTAgMTAgNyAxMyA0IDExIDIgNy41IDUuNSA5IDcgNy41IDguNSAxMSAxMiBNIDMgMiBMIDEgNCA0IDcgMSAxMCAzIDEyIDggNyAzIDIgWicsXHJcbiAgICAgICAgbWFwOidNIDEzIDEgTCAxIDEgMSAxMyAxMyAxMyAxMyAxIE0gMTIgMiBMIDEyIDcgNyA3IDcgMTIgMiAxMiAyIDcgNyA3IDcgMiAxMiAyIFonLFxyXG4gICAgICAgIG1hdGVyaWFsOidNIDEzIDEgTCAxIDEgMSAxMyAxMyAxMyAxMyAxIE0gMTIgMiBMIDEyIDcgNyA3IDcgMTIgMiAxMiAyIDcgNyA3IDcgMiAxMiAyIFonLFxyXG4gICAgICAgIHRleHR1cmU6J00gMTMgNCBMIDEzIDEgMSAxIDEgNCA1IDQgNSAxMyA5IDEzIDkgNCAxMyA0IFonLFxyXG4gICAgICAgIG9iamVjdDonTSAxMCAxIEwgNyA0IDQgMSAxIDEgMSAxMyA0IDEzIDQgNSA3IDggMTAgNSAxMCAxMyAxMyAxMyAxMyAxIDEwIDEgWicsXHJcbiAgICAgICAgbm9uZTonTSA5IDUgTCA1IDUgNSA5IDkgOSA5IDUgWicsXHJcbiAgICAgICAgY3Vyc29yOidNIDQgNyBMIDEgMTAgMSAxMiAyIDEzIDQgMTMgNyAxMCA5IDE0IDE0IDAgMCA1IDQgNyBaJyxcclxuICAgICAgICBsb2FkOidNIDEzIDggTCAxMS41IDYuNSA5IDkgOSAzIDUgMyA1IDkgMi41IDYuNSAxIDggNyAxNCAxMyA4IE0gOSAyIEwgOSAwIDUgMCA1IDIgOSAyIFonLFxyXG4gICAgICAgIHNhdmU6J00gOSAxMiBMIDUgMTIgNSAxNCA5IDE0IDkgMTIgTSAxMS41IDcuNSBMIDEzIDYgNyAwIDEgNiAyLjUgNy41IDUgNSA1IDExIDkgMTEgOSA1IDExLjUgNy41IFonLFxyXG4gICAgICAgIGV4dGVybjonTSAxNCAxNCBMIDE0IDAgMCAwIDAgMTQgMTQgMTQgTSAxMiA2IEwgMTIgMTIgMiAxMiAyIDYgMTIgNiBNIDEyIDIgTCAxMiA0IDIgNCAyIDIgMTIgMiBaJyxcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIHJlem9uZSAoKSB7XHJcbiAgICAgICAgUm9vdHMubmVlZFJlWm9uZSA9IHRydWU7XHJcbiAgICB9LFxyXG5cclxuICAgIGdldEltcHV0OiBmdW5jdGlvbigpe1xyXG5cclxuICAgICAgICByZXR1cm4gUm9vdHMuaW5wdXQgPyB0cnVlIDogZmFsc2VcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIHNldFN0eWxlIDogZnVuY3Rpb24gKCBkYXRhICl7XHJcblxyXG4gICAgICAgIGZvciAoIHZhciBvIGluIGRhdGEgKXtcclxuICAgICAgICAgICAgaWYoIFQuY29sb3JzW29dICkgVC5jb2xvcnNbb10gPSBkYXRhW29dO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgVC5zZXRUZXh0KCk7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyBjdXN0b20gdGV4dFxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIGRlZmluZVRleHQ6IGZ1bmN0aW9uKCBvICl7XHJcblxyXG4gICAgICAgIFQuc2V0VGV4dCggby5mb250U2l6ZSwgby50ZXh0LCBvLmZvbnRGYW1pbHksIG8uZm9udFNoYWRvdywgby5mb250V2VpZ2h0IClcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIHNldFRleHQ6IGZ1bmN0aW9uKCBzaXplLCBjb2xvciwgZm9udCwgc2hhZG93LCB3ZWlnaHQgKXtcclxuXHJcbiAgICAgICAgbGV0IGNjID0gVC5jb2xvcnM7XHJcblxyXG4gICAgICAgIGlmKCBmb250ID09PSB1bmRlZmluZWQgKSBmb250ID0gY2MuZm9udEZhbWlseVxyXG4gICAgICAgIGlmKCBzaXplID09PSB1bmRlZmluZWQgKSBzaXplID0gY2MuZm9udFNpemVcclxuICAgICAgICBpZiggc2hhZG93ID09PSB1bmRlZmluZWQgKSBzaGFkb3cgPSBjYy5mb250U2hhZG93XHJcbiAgICAgICAgaWYoIHdlaWdodCA9PT0gdW5kZWZpbmVkICkgd2VpZ2h0ID0gY2MuZm9udFdlaWdodFxyXG4gICAgICAgIGlmKCBjb2xvciA9PT0gdW5kZWZpbmVkICkgY29sb3IgPSBjYy50ZXh0XHJcblxyXG4gICAgICAgIGlmKCBpc05hTihzaXplKSApeyBpZiggc2l6ZS5zZWFyY2goJ2VtJyk9PT0tMSApIHNpemUgKz0gJ3B4J31cclxuICAgICAgICBlbHNlIHNpemUgKz0gJ3B4J1xyXG4gICAgICAgIFxyXG5cclxuICAgICAgICAvL2xldCBhbGlnbiA9ICdkaXNwbGF5OmZsZXg7IGp1c3RpZnktY29udGVudDpsZWZ0OyBhbGlnbi1pdGVtczpjZW50ZXI7IHRleHQtYWxpZ246bGVmdDsnXHJcblxyXG4gICAgICAgIFQuY3NzLnR4dCA9IFQuY3NzLmJhc2ljICsgVC5jc3MubWlkZGxlICsgJyBmb250LWZhbWlseTonKyBmb250ICsnOyBmb250LXdlaWdodDonK3dlaWdodCsnOyBmb250LXNpemU6JytzaXplKyc7IGNvbG9yOicrY2MudGV4dCsnOyBwYWRkaW5nOjBweCA4cHg7IGxlZnQ6MDsgdG9wOjJweDsgaGVpZ2h0OjE2cHg7IHdpZHRoOjEwMHB4OyBvdmVyZmxvdzpoaWRkZW47IHdoaXRlLXNwYWNlOiBub3dyYXA7IGxldHRlci1zcGFjaW5nOiBub3JtYWw7JztcclxuICAgICAgICBpZiggc2hhZG93ICE9PSAnbm9uZScgKSBULmNzcy50eHQgKz0gJyB0ZXh0LXNoYWRvdzogMXB4IDFweCAxcHggJytzaGFkb3crJzsnO1xyXG5cclxuICAgICAgICBULmNzcy50eHRzZWxlY3QgPSBULmNzcy50eHQgKyAncGFkZGluZzowcHggNHB4OyBib3JkZXI6MXB4IGRhc2hlZCAnICsgY2MuYm9yZGVyICsgJzsnO1xyXG4gICAgICAgIFQuY3NzLml0ZW0gPSBULmNzcy50eHQgKyAncGFkZGluZzowcHggNHB4OyBwb3NpdGlvbjpyZWxhdGl2ZTsgbWFyZ2luLWJvdHRvbToxcHg7ICdcclxuXHJcbiAgICB9LFxyXG5cclxuXHJcbiAgICAvLyBub3RlXHJcblxyXG4gICAgLy9odHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9mci9kb2NzL1dlYi9DU1MvY3NzX2ZsZXhpYmxlX2JveF9sYXlvdXQvYWxpZ25pbmdfaXRlbXNfaW5fYV9mbGV4X2NvbnRhaW5lclxyXG5cclxuICAgIC8qY2xvbmVDb2xvcjogZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgICBsZXQgY2MgPSBPYmplY3QuYXNzaWduKHt9LCBULmNvbG9ycyApO1xyXG4gICAgICAgIHJldHVybiBjYztcclxuXHJcbiAgICB9LCovXHJcblxyXG4gICAgLy8gaW50ZXJuIGZ1bmN0aW9uXHJcblxyXG4gICAgY2xvbmVDc3M6IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgLy9sZXQgY2MgPSBPYmplY3QuYXNzaWduKHt9LCBULmNzcyApO1xyXG4gICAgICAgIHJldHVybiB7IC4uLlQuY3NzIH07XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBjbG9uZTogZnVuY3Rpb24gKCBvICkge1xyXG5cclxuICAgICAgICByZXR1cm4gby5jbG9uZU5vZGUoIHRydWUgKTtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIHNldFN2ZzogZnVuY3Rpb24oIGRvbSwgdHlwZSwgdmFsdWUsIGlkLCBpZDIgKXtcclxuXHJcbiAgICAgICAgaWYoIGlkID09PSAtMSApIGRvbS5zZXRBdHRyaWJ1dGVOUyggbnVsbCwgdHlwZSwgdmFsdWUgKTtcclxuICAgICAgICBlbHNlIGlmKCBpZDIgIT09IHVuZGVmaW5lZCApIGRvbS5jaGlsZE5vZGVzWyBpZCB8fCAwIF0uY2hpbGROb2Rlc1sgaWQyIHx8IDAgXS5zZXRBdHRyaWJ1dGVOUyggbnVsbCwgdHlwZSwgdmFsdWUgKTtcclxuICAgICAgICBlbHNlIGRvbS5jaGlsZE5vZGVzWyBpZCB8fCAwIF0uc2V0QXR0cmlidXRlTlMoIG51bGwsIHR5cGUsIHZhbHVlICk7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBzZXRDc3M6IGZ1bmN0aW9uKCBkb20sIGNzcyApe1xyXG5cclxuICAgICAgICBmb3IoIGxldCByIGluIGNzcyApe1xyXG4gICAgICAgICAgICBpZiggVC5ET01fU0laRS5pbmRleE9mKHIpICE9PSAtMSApIGRvbS5zdHlsZVtyXSA9IGNzc1tyXSArICdweCc7XHJcbiAgICAgICAgICAgIGVsc2UgZG9tLnN0eWxlW3JdID0gY3NzW3JdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9LFxyXG5cclxuICAgIHNldDogZnVuY3Rpb24oIGcsIG8gKXtcclxuXHJcbiAgICAgICAgZm9yKCBsZXQgYXR0IGluIG8gKXtcclxuICAgICAgICAgICAgaWYoIGF0dCA9PT0gJ3R4dCcgKSBnLnRleHRDb250ZW50ID0gb1sgYXR0IF07XHJcbiAgICAgICAgICAgIGlmKCBhdHQgPT09ICdsaW5rJyApIGcuc2V0QXR0cmlidXRlTlMoIFQubGlua3MsICd4bGluazpocmVmJywgb1sgYXR0IF0gKTtcclxuICAgICAgICAgICAgZWxzZSBnLnNldEF0dHJpYnV0ZU5TKCBudWxsLCBhdHQsIG9bIGF0dCBdICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgfSxcclxuXHJcbiAgICBnZXQ6IGZ1bmN0aW9uKCBkb20sIGlkICl7XHJcblxyXG4gICAgICAgIGlmKCBpZCA9PT0gdW5kZWZpbmVkICkgcmV0dXJuIGRvbTsgLy8gcm9vdFxyXG4gICAgICAgIGVsc2UgaWYoICFpc05hTiggaWQgKSApIHJldHVybiBkb20uY2hpbGROb2Rlc1sgaWQgXTsgLy8gZmlyc3QgY2hpbGRcclxuICAgICAgICBlbHNlIGlmKCBpZCBpbnN0YW5jZW9mIEFycmF5ICl7XHJcbiAgICAgICAgICAgIGlmKGlkLmxlbmd0aCA9PT0gMikgcmV0dXJuIGRvbS5jaGlsZE5vZGVzWyBpZFswXSBdLmNoaWxkTm9kZXNbIGlkWzFdIF07XHJcbiAgICAgICAgICAgIGlmKGlkLmxlbmd0aCA9PT0gMykgcmV0dXJuIGRvbS5jaGlsZE5vZGVzWyBpZFswXSBdLmNoaWxkTm9kZXNbIGlkWzFdIF0uY2hpbGROb2Rlc1sgaWRbMl0gXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBkb20gOiBmdW5jdGlvbiAoIHR5cGUsIGNzcywgb2JqLCBkb20sIGlkICkge1xyXG5cclxuICAgICAgICB0eXBlID0gdHlwZSB8fCAnZGl2JztcclxuXHJcbiAgICAgICAgaWYoIFQuU1ZHX1RZUEVfRC5pbmRleE9mKHR5cGUpICE9PSAtMSB8fCBULlNWR19UWVBFX0cuaW5kZXhPZih0eXBlKSAhPT0gLTEgKXsgLy8gaXMgc3ZnIGVsZW1lbnRcclxuXHJcbiAgICAgICAgICAgIGlmKCB0eXBlID09PSdzdmcnICl7XHJcblxyXG4gICAgICAgICAgICAgICAgZG9tID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCBULnN2Z25zLCAnc3ZnJyApO1xyXG4gICAgICAgICAgICAgICAgVC5zZXQoIGRvbSwgb2JqICk7XHJcblxyXG4gICAgICAgICAgLyogIH0gZWxzZSBpZiAoIHR5cGUgPT09ICd1c2UnICkge1xyXG5cclxuICAgICAgICAgICAgICAgIGRvbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyggVC5zdmducywgJ3VzZScgKTtcclxuICAgICAgICAgICAgICAgIFQuc2V0KCBkb20sIG9iaiApO1xyXG4qL1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gY3JlYXRlIG5ldyBzdmcgaWYgbm90IGRlZlxyXG4gICAgICAgICAgICAgICAgaWYoIGRvbSA9PT0gdW5kZWZpbmVkICkgZG9tID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCBULnN2Z25zLCAnc3ZnJyApO1xyXG4gICAgICAgICAgICAgICAgVC5hZGRBdHRyaWJ1dGVzKCBkb20sIHR5cGUsIG9iaiwgaWQgKTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfSBlbHNlIHsgLy8gaXMgaHRtbCBlbGVtZW50XHJcblxyXG4gICAgICAgICAgICBpZiggZG9tID09PSB1bmRlZmluZWQgKSBkb20gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoIFQuaHRtbHMsIHR5cGUgKTtcclxuICAgICAgICAgICAgZWxzZSBkb20gPSBkb20uYXBwZW5kQ2hpbGQoIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyggVC5odG1scywgdHlwZSApICk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoIGNzcyApIGRvbS5zdHlsZS5jc3NUZXh0ID0gY3NzOyBcclxuXHJcbiAgICAgICAgaWYoIGlkID09PSB1bmRlZmluZWQgKSByZXR1cm4gZG9tO1xyXG4gICAgICAgIGVsc2UgcmV0dXJuIGRvbS5jaGlsZE5vZGVzWyBpZCB8fCAwIF07XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBhZGRBdHRyaWJ1dGVzIDogZnVuY3Rpb24oIGRvbSwgdHlwZSwgbywgaWQgKXtcclxuXHJcbiAgICAgICAgbGV0IGcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoIFQuc3ZnbnMsIHR5cGUgKTtcclxuICAgICAgICBULnNldCggZywgbyApO1xyXG4gICAgICAgIFQuZ2V0KCBkb20sIGlkICkuYXBwZW5kQ2hpbGQoIGcgKTtcclxuICAgICAgICBpZiggVC5TVkdfVFlQRV9HLmluZGV4T2YodHlwZSkgIT09IC0xICkgZy5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xyXG4gICAgICAgIHJldHVybiBnO1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgY2xlYXIgOiBmdW5jdGlvbiggZG9tICl7XHJcblxyXG4gICAgICAgIFQucHVyZ2UoIGRvbSApO1xyXG4gICAgICAgIHdoaWxlIChkb20uZmlyc3RDaGlsZCkge1xyXG4gICAgICAgICAgICBpZiAoIGRvbS5maXJzdENoaWxkLmZpcnN0Q2hpbGQgKSBULmNsZWFyKCBkb20uZmlyc3RDaGlsZCApO1xyXG4gICAgICAgICAgICBkb20ucmVtb3ZlQ2hpbGQoIGRvbS5maXJzdENoaWxkICk7IFxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9LFxyXG5cclxuICAgIHB1cmdlIDogZnVuY3Rpb24gKCBkb20gKSB7XHJcblxyXG4gICAgICAgIGxldCBhID0gZG9tLmF0dHJpYnV0ZXMsIGksIG47XHJcbiAgICAgICAgaWYgKGEpIHtcclxuICAgICAgICAgICAgaSA9IGEubGVuZ3RoO1xyXG4gICAgICAgICAgICB3aGlsZShpLS0pe1xyXG4gICAgICAgICAgICAgICAgbiA9IGFbaV0ubmFtZTtcclxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgZG9tW25dID09PSAnZnVuY3Rpb24nKSBkb21bbl0gPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGEgPSBkb20uY2hpbGROb2RlcztcclxuICAgICAgICBpZiAoYSkge1xyXG4gICAgICAgICAgICBpID0gYS5sZW5ndGg7XHJcbiAgICAgICAgICAgIHdoaWxlKGktLSl7IFxyXG4gICAgICAgICAgICAgICAgVC5wdXJnZSggZG9tLmNoaWxkTm9kZXNbaV0gKTsgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIFNWRyBFZmZlY3RzIGZ1bmN0aW9uXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgYWRkU1ZHR2xvd0VmZmVjdDogZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgICBpZiAoIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCAnVUlMR2xvdycpICE9PSBudWxsICkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgc3ZnRmlsdGVyID0gVC5pbml0VUlMRWZmZWN0cygpO1xyXG5cclxuICAgICAgICBsZXQgZmlsdGVyID0gVC5hZGRBdHRyaWJ1dGVzKCBzdmdGaWx0ZXIsICdmaWx0ZXInLCB7IGlkOiAnVUlMR2xvdycsIHg6ICctMjAlJywgeTogJy0yMCUnLCB3aWR0aDogJzE0MCUnLCBoZWlnaHQ6ICcxNDAlJyB9ICk7XHJcbiAgICAgICAgVC5hZGRBdHRyaWJ1dGVzKCBmaWx0ZXIsICdmZUdhdXNzaWFuQmx1cicsIHsgaW46ICdTb3VyY2VHcmFwaGljJywgc3RkRGV2aWF0aW9uOiAnMycsIHJlc3VsdDogJ3VpbEJsdXInIH0gKTtcclxuICAgICAgICBsZXQgZmVNZXJnZSA9IFQuYWRkQXR0cmlidXRlcyggZmlsdGVyLCAnZmVNZXJnZScsIHsgIH0gKTtcclxuICAgICAgICBcclxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8PSAzOyBpKysgKSB7XHJcblxyXG4gICAgICAgICAgICBULmFkZEF0dHJpYnV0ZXMoIGZlTWVyZ2UsICdmZU1lcmdlTm9kZScsIHsgaW46ICd1aWxCbHVyJyB9ICk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBULmFkZEF0dHJpYnV0ZXMoIGZlTWVyZ2UsICdmZU1lcmdlTm9kZScsIHsgaW46ICdTb3VyY2VHcmFwaGljJyB9ICk7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBpbml0VUlMRWZmZWN0czogZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgICBsZXQgc3ZnRmlsdGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoICdVSUxTVkdFZmZlY3RzJyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKCBzdmdGaWx0ZXIgPT09IG51bGwgKSB7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBzdmdGaWx0ZXIgPSBULmRvbSggJ3N2ZycsIHVuZGVmaW5lZCAsIHsgaWQ6ICdVSUxTVkdFZmZlY3RzJywgd2lkdGg6ICcwJywgaGVpZ2h0OiAnMCcgfSApO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKCBzdmdGaWx0ZXIgKTtcclxuIFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHN2Z0ZpbHRlcjtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgQ29sb3IgZnVuY3Rpb25cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBDb2xvckx1bWEgOiBmdW5jdGlvbiAoIGhleCwgbCApIHtcclxuXHJcbiAgICAgICAgLy9pZiggaGV4LnN1YnN0cmluZygwLCAzKSA9PT0gJ3JnYmEnICkgaGV4ID0gJyMwMDAnO1xyXG5cclxuICAgICAgICBpZiggaGV4ID09PSAnbicgKSBoZXggPSAnIzAwMCc7XHJcblxyXG4gICAgICAgIC8vIHZhbGlkYXRlIGhleCBzdHJpbmdcclxuICAgICAgICBoZXggPSBTdHJpbmcoaGV4KS5yZXBsYWNlKC9bXjAtOWEtZl0vZ2ksICcnKTtcclxuICAgICAgICBpZiAoaGV4Lmxlbmd0aCA8IDYpIHtcclxuICAgICAgICAgICAgaGV4ID0gaGV4WzBdK2hleFswXStoZXhbMV0raGV4WzFdK2hleFsyXStoZXhbMl07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGwgPSBsIHx8IDA7XHJcblxyXG4gICAgICAgIC8vIGNvbnZlcnQgdG8gZGVjaW1hbCBhbmQgY2hhbmdlIGx1bWlub3NpdHlcclxuICAgICAgICBsZXQgcmdiID0gXCIjXCIsIGMsIGk7XHJcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IDM7IGkrKykge1xyXG4gICAgICAgICAgICBjID0gcGFyc2VJbnQoaGV4LnN1YnN0cihpKjIsMiksIDE2KTtcclxuICAgICAgICAgICAgYyA9IE1hdGgucm91bmQoTWF0aC5taW4oTWF0aC5tYXgoMCwgYyArIChjICogbCkpLCAyNTUpKS50b1N0cmluZygxNik7XHJcbiAgICAgICAgICAgIHJnYiArPSAoXCIwMFwiK2MpLnN1YnN0cihjLmxlbmd0aCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gcmdiO1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgZmluZERlZXBJbnZlcjogZnVuY3Rpb24gKCBjICkgeyBcclxuXHJcbiAgICAgICAgcmV0dXJuIChjWzBdICogMC4zICsgY1sxXSAqIC41OSArIGNbMl0gKiAuMTEpIDw9IDAuNjtcclxuICAgICAgICBcclxuICAgIH0sXHJcblxyXG4gICAgbGVycENvbG9yOiBmdW5jdGlvbiggYzEsIGMyLCBmYWN0b3IgKSB7XHJcbiAgICAgICAgbGV0IG5ld0NvbG9yID0ge307XHJcbiAgICAgICAgZm9yICggbGV0IGkgPSAwOyBpIDwgMzsgaSsrICkge1xyXG4gICAgICAgICAgbmV3Q29sb3JbaV0gPSBjMVsgaSBdICsgKCBjMlsgaSBdIC0gYzFbIGkgXSApICogZmFjdG9yO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbmV3Q29sb3I7XHJcbiAgICB9LFxyXG5cclxuICAgIGhleFRvSHRtbDogZnVuY3Rpb24gKCB2ICkgeyBcclxuICAgICAgICB2ID0gdiA9PT0gdW5kZWZpbmVkID8gMHgwMDAwMDAgOiB2O1xyXG4gICAgICAgIHJldHVybiBcIiNcIiArIChcIjAwMDAwMFwiICsgdi50b1N0cmluZygxNikpLnN1YnN0cigtNik7XHJcbiAgICAgICAgXHJcbiAgICB9LFxyXG5cclxuICAgIGh0bWxUb0hleDogZnVuY3Rpb24gKCB2ICkgeyBcclxuXHJcbiAgICAgICAgcmV0dXJuIHYudG9VcHBlckNhc2UoKS5yZXBsYWNlKFwiI1wiLCBcIjB4XCIpO1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgdTI1NTogZnVuY3Rpb24gKGMsIGkpIHtcclxuXHJcbiAgICAgICAgcmV0dXJuIHBhcnNlSW50KGMuc3Vic3RyaW5nKGksIGkgKyAyKSwgMTYpIC8gMjU1O1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgdTE2OiBmdW5jdGlvbiAoIGMsIGkgKSB7XHJcblxyXG4gICAgICAgIHJldHVybiBwYXJzZUludChjLnN1YnN0cmluZyhpLCBpICsgMSksIDE2KSAvIDE1O1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgdW5wYWNrOiBmdW5jdGlvbiggYyApe1xyXG5cclxuICAgICAgICBpZiAoYy5sZW5ndGggPT0gNykgcmV0dXJuIFsgVC51MjU1KGMsIDEpLCBULnUyNTUoYywgMyksIFQudTI1NShjLCA1KSBdO1xyXG4gICAgICAgIGVsc2UgaWYgKGMubGVuZ3RoID09IDQpIHJldHVybiBbIFQudTE2KGMsMSksIFQudTE2KGMsMiksIFQudTE2KGMsMykgXTtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIHAyNTU6IGZ1bmN0aW9uICggYyApIHtcclxuICAgICAgICBsZXQgaCA9IE1hdGgucm91bmQoICggYyAqIDI1NSApICkudG9TdHJpbmcoIDE2ICk7XHJcbiAgICAgICAgaWYgKCBoLmxlbmd0aCA8IDIgKSBoID0gJzAnICsgaDtcclxuICAgICAgICByZXR1cm4gaDtcclxuICAgIH0sXHJcblxyXG4gICAgcGFjazogZnVuY3Rpb24gKCBjICkge1xyXG5cclxuICAgICAgICByZXR1cm4gJyMnICsgVC5wMjU1KCBjWyAwIF0gKSArIFQucDI1NSggY1sgMSBdICkgKyBULnAyNTUoIGNbIDIgXSApO1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgaHRtbFJnYjogZnVuY3Rpb24oIGMgKXtcclxuXHJcbiAgICAgICAgcmV0dXJuICdyZ2IoJyArIE1hdGgucm91bmQoY1swXSAqIDI1NSkgKyAnLCcrIE1hdGgucm91bmQoY1sxXSAqIDI1NSkgKyAnLCcrIE1hdGgucm91bmQoY1syXSAqIDI1NSkgKyAnKSc7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBwYWQ6IGZ1bmN0aW9uKCBuICl7XHJcbiAgICAgICAgaWYobi5sZW5ndGggPT0gMSluID0gJzAnICsgbjtcclxuICAgICAgICByZXR1cm4gbjtcclxuICAgIH0sXHJcblxyXG4gICAgcmdiVG9IZXggOiBmdW5jdGlvbiggYyApe1xyXG5cclxuICAgICAgICBsZXQgciA9IE1hdGgucm91bmQoY1swXSAqIDI1NSkudG9TdHJpbmcoMTYpO1xyXG4gICAgICAgIGxldCBnID0gTWF0aC5yb3VuZChjWzFdICogMjU1KS50b1N0cmluZygxNik7XHJcbiAgICAgICAgbGV0IGIgPSBNYXRoLnJvdW5kKGNbMl0gKiAyNTUpLnRvU3RyaW5nKDE2KTtcclxuICAgICAgICByZXR1cm4gJyMnICsgVC5wYWQocikgKyBULnBhZChnKSArIFQucGFkKGIpO1xyXG5cclxuICAgICAgIC8vIHJldHVybiAnIycgKyAoICcwMDAwMDAnICsgKCAoIGNbMF0gKiAyNTUgKSA8PCAxNiBeICggY1sxXSAqIDI1NSApIDw8IDggXiAoIGNbMl0gKiAyNTUgKSA8PCAwICkudG9TdHJpbmcoIDE2ICkgKS5zbGljZSggLSA2ICk7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBodWVUb1JnYjogZnVuY3Rpb24oIHAsIHEsIHQgKXtcclxuXHJcbiAgICAgICAgaWYgKCB0IDwgMCApIHQgKz0gMTtcclxuICAgICAgICBpZiAoIHQgPiAxICkgdCAtPSAxO1xyXG4gICAgICAgIGlmICggdCA8IDEgLyA2ICkgcmV0dXJuIHAgKyAoIHEgLSBwICkgKiA2ICogdDtcclxuICAgICAgICBpZiAoIHQgPCAxIC8gMiApIHJldHVybiBxO1xyXG4gICAgICAgIGlmICggdCA8IDIgLyAzICkgcmV0dXJuIHAgKyAoIHEgLSBwICkgKiA2ICogKCAyIC8gMyAtIHQgKTtcclxuICAgICAgICByZXR1cm4gcDtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIHJnYlRvSHNsOiBmdW5jdGlvbiAoIGMgKSB7XHJcblxyXG4gICAgICAgIGxldCByID0gY1swXSwgZyA9IGNbMV0sIGIgPSBjWzJdLCBtaW4gPSBNYXRoLm1pbihyLCBnLCBiKSwgbWF4ID0gTWF0aC5tYXgociwgZywgYiksIGRlbHRhID0gbWF4IC0gbWluLCBoID0gMCwgcyA9IDAsIGwgPSAobWluICsgbWF4KSAvIDI7XHJcbiAgICAgICAgaWYgKGwgPiAwICYmIGwgPCAxKSBzID0gZGVsdGEgLyAobCA8IDAuNSA/ICgyICogbCkgOiAoMiAtIDIgKiBsKSk7XHJcbiAgICAgICAgaWYgKGRlbHRhID4gMCkge1xyXG4gICAgICAgICAgICBpZiAobWF4ID09IHIgJiYgbWF4ICE9IGcpIGggKz0gKGcgLSBiKSAvIGRlbHRhO1xyXG4gICAgICAgICAgICBpZiAobWF4ID09IGcgJiYgbWF4ICE9IGIpIGggKz0gKDIgKyAoYiAtIHIpIC8gZGVsdGEpO1xyXG4gICAgICAgICAgICBpZiAobWF4ID09IGIgJiYgbWF4ICE9IHIpIGggKz0gKDQgKyAociAtIGcpIC8gZGVsdGEpO1xyXG4gICAgICAgICAgICBoIC89IDY7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbIGgsIHMsIGwgXTtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIGhzbFRvUmdiOiBmdW5jdGlvbiAoIGMgKSB7XHJcblxyXG4gICAgICAgIGxldCBwLCBxLCBoID0gY1swXSwgcyA9IGNbMV0sIGwgPSBjWzJdO1xyXG5cclxuICAgICAgICBpZiAoIHMgPT09IDAgKSByZXR1cm4gWyBsLCBsLCBsIF07XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHEgPSBsIDw9IDAuNSA/IGwgKiAocyArIDEpIDogbCArIHMgLSAoIGwgKiBzICk7XHJcbiAgICAgICAgICAgIHAgPSBsICogMiAtIHE7XHJcbiAgICAgICAgICAgIHJldHVybiBbIFQuaHVlVG9SZ2IocCwgcSwgaCArIDAuMzMzMzMpLCBULmh1ZVRvUmdiKHAsIHEsIGgpLCBULmh1ZVRvUmdiKHAsIHEsIGggLSAwLjMzMzMzKSBdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9LFxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgU1ZHIE1PREVMXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgbWFrZUdyYWRpYW50OiBmdW5jdGlvbiAoIHR5cGUsIHNldHRpbmdzLCBwYXJlbnQsIGNvbG9ycyApIHtcclxuXHJcbiAgICAgICAgVC5kb20oIHR5cGUsIG51bGwsIHNldHRpbmdzLCBwYXJlbnQsIDAgKTtcclxuXHJcbiAgICAgICAgbGV0IG4gPSBwYXJlbnQuY2hpbGROb2Rlc1swXS5jaGlsZE5vZGVzLmxlbmd0aCAtIDEsIGM7XHJcblxyXG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgY29sb3JzLmxlbmd0aDsgaSsrICl7XHJcblxyXG4gICAgICAgICAgICBjID0gY29sb3JzW2ldO1xyXG4gICAgICAgICAgICAvL1QuZG9tKCAnc3RvcCcsIG51bGwsIHsgb2Zmc2V0OmNbMF0rJyUnLCBzdHlsZTonc3RvcC1jb2xvcjonK2NbMV0rJzsgc3RvcC1vcGFjaXR5OicrY1syXSsnOycgfSwgcGFyZW50LCBbMCxuXSApO1xyXG4gICAgICAgICAgICBULmRvbSggJ3N0b3AnLCBudWxsLCB7IG9mZnNldDpjWzBdKyclJywgJ3N0b3AtY29sb3InOmNbMV0sICAnc3RvcC1vcGFjaXR5JzpjWzJdIH0sIHBhcmVudCwgWzAsbl0gKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0sXHJcblxyXG4gICAgLyptYWtlR3JhcGg6IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgbGV0IHcgPSAxMjg7XHJcbiAgICAgICAgbGV0IHJhZGl1cyA9IDM0O1xyXG4gICAgICAgIGxldCBzdmcgPSBULmRvbSggJ3N2ZycsIFQuY3NzLmJhc2ljICwgeyB2aWV3Qm94OicwIDAgJyt3KycgJyt3LCB3aWR0aDp3LCBoZWlnaHQ6dywgcHJlc2VydmVBc3BlY3RSYXRpbzonbm9uZScgfSApO1xyXG4gICAgICAgIFQuZG9tKCAncGF0aCcsICcnLCB7IGQ6JycsIHN0cm9rZTpULmNvbG9ycy50ZXh0LCAnc3Ryb2tlLXdpZHRoJzo0LCBmaWxsOidub25lJywgJ3N0cm9rZS1saW5lY2FwJzonYnV0dCcgfSwgc3ZnICk7Ly8wXHJcbiAgICAgICAgLy9ULmRvbSggJ3JlY3QnLCAnJywgeyB4OjEwLCB5OjEwLCB3aWR0aDoxMDgsIGhlaWdodDoxMDgsIHN0cm9rZToncmdiYSgwLDAsMCwwLjMpJywgJ3N0cm9rZS13aWR0aCc6MiAsIGZpbGw6J25vbmUnfSwgc3ZnICk7Ly8xXHJcbiAgICAgICAgLy9ULmRvbSggJ2NpcmNsZScsICcnLCB7IGN4OjY0LCBjeTo2NCwgcjpyYWRpdXMsIGZpbGw6VC5jb2xvcnMuYnV0dG9uLCBzdHJva2U6J3JnYmEoMCwwLDAsMC4zKScsICdzdHJva2Utd2lkdGgnOjggfSwgc3ZnICk7Ly8wXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9ULmRvbSggJ2NpcmNsZScsICcnLCB7IGN4OjY0LCBjeTo2NCwgcjpyYWRpdXMrNywgc3Ryb2tlOidyZ2JhKDAsMCwwLDAuMyknLCAnc3Ryb2tlLXdpZHRoJzo3ICwgZmlsbDonbm9uZSd9LCBzdmcgKTsvLzJcclxuICAgICAgICAvL1QuZG9tKCAncGF0aCcsICcnLCB7IGQ6JycsIHN0cm9rZToncmdiYSgyNTUsMjU1LDI1NSwwLjMpJywgJ3N0cm9rZS13aWR0aCc6MiwgZmlsbDonbm9uZScsICdzdHJva2UtbGluZWNhcCc6J3JvdW5kJywgJ3N0cm9rZS1vcGFjaXR5JzowLjUgfSwgc3ZnICk7Ly8zXHJcbiAgICAgICAgVC5ncmFwaCA9IHN2ZztcclxuXHJcbiAgICB9LCovXHJcblxyXG4gICAgbWFrZVBhZDogZnVuY3Rpb24gKCBtb2RlbCApIHtcclxuXHJcbiAgICAgICAgbGV0IHd3ID0gMjU2XHJcbiAgICAgICAgbGV0IHN2ZyA9IFQuZG9tKCAnc3ZnJywgVC5jc3MuYmFzaWMgKyAncG9zaXRpb246cmVsYXRpdmU7JywgeyB2aWV3Qm94OicwIDAgJyt3dysnICcrd3csIHdpZHRoOnd3LCBoZWlnaHQ6d3csIHByZXNlcnZlQXNwZWN0UmF0aW86J25vbmUnIH0gKTtcclxuICAgICAgICBsZXQgdyA9IDIwMDsgXHJcbiAgICAgICAgbGV0IGQgPSAod3ctdykqMC41LCBtID0gMjA7XHJcbiAgICAgICAgVG9vbHMuZG9tKCAncmVjdCcsICcnLCB7IHg6IGQsIHk6IGQsICB3aWR0aDogdywgaGVpZ2h0OiB3LCBmaWxsOlQuY29sb3JzLmJhY2sgfSwgc3ZnICk7IC8vIDBcclxuICAgICAgICBUb29scy5kb20oICdyZWN0JywgJycsIHsgeDogZCttKjAuNSwgeTogZCttKjAuNSwgd2lkdGg6IHcgLSBtICwgaGVpZ2h0OiB3IC0gbSwgZmlsbDpULmNvbG9ycy5idXR0b24gfSwgc3ZnICk7IC8vIDFcclxuICAgICAgICAvLyBQb2ludGVyXHJcbiAgICAgICAgVG9vbHMuZG9tKCAnbGluZScsICcnLCB7IHgxOiBkKyhtKjAuNSksIHkxOiB3dyAqMC41LCB4MjogZCsody1tKjAuNSksIHkyOiB3dyAqIDAuNSwgc3Ryb2tlOlQuY29sb3JzLmJhY2ssICdzdHJva2Utd2lkdGgnOiAyIH0sIHN2ZyApOyAvLyAyXHJcbiAgICAgICAgVG9vbHMuZG9tKCAnbGluZScsICcnLCB7IHgxOiB3dyAqIDAuNSwgeDI6IHd3ICogMC41LCB5MTogZCsobSowLjUpLCB5MjogZCsody1tKjAuNSksIHN0cm9rZTpULmNvbG9ycy5iYWNrLCAnc3Ryb2tlLXdpZHRoJzogMiB9LCBzdmcgKTsgLy8gM1xyXG4gICAgICAgIFRvb2xzLmRvbSggJ2NpcmNsZScsICcnLCB7IGN4OiB3dyAqIDAuNSwgY3k6IHd3ICogMC41LCByOjUsIHN0cm9rZTogVC5jb2xvcnMudGV4dCwgJ3N0cm9rZS13aWR0aCc6IDUsIGZpbGw6J25vbmUnIH0sIHN2ZyApOyAvLyA0XHJcbiAgICAgICAgVC5wYWQyZCA9IHN2ZztcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIG1ha2VLbm9iOiBmdW5jdGlvbiAoIG1vZGVsICkge1xyXG5cclxuICAgICAgICBsZXQgdyA9IDEyODtcclxuICAgICAgICBsZXQgcmFkaXVzID0gMzQ7XHJcbiAgICAgICAgbGV0IHN2ZyA9IFQuZG9tKCAnc3ZnJywgVC5jc3MuYmFzaWMgKyAncG9zaXRpb246cmVsYXRpdmU7JywgeyB2aWV3Qm94OicwIDAgJyt3KycgJyt3LCB3aWR0aDp3LCBoZWlnaHQ6dywgcHJlc2VydmVBc3BlY3RSYXRpbzonbm9uZScgfSApO1xyXG4gICAgICAgIFQuZG9tKCAnY2lyY2xlJywgJycsIHsgY3g6NjQsIGN5OjY0LCByOnJhZGl1cywgZmlsbDpULmNvbG9ycy5idXR0b24sIHN0cm9rZToncmdiYSgwLDAsMCwwLjMpJywgJ3N0cm9rZS13aWR0aCc6OCB9LCBzdmcgKTsvLzBcclxuICAgICAgICBULmRvbSggJ3BhdGgnLCAnJywgeyBkOicnLCBzdHJva2U6VC5jb2xvcnMudGV4dCwgJ3N0cm9rZS13aWR0aCc6NCwgZmlsbDonbm9uZScsICdzdHJva2UtbGluZWNhcCc6J3JvdW5kJyB9LCBzdmcgKTsvLzFcclxuICAgICAgICBULmRvbSggJ2NpcmNsZScsICcnLCB7IGN4OjY0LCBjeTo2NCwgcjpyYWRpdXMrNywgc3Ryb2tlOidyZ2JhKDAsMCwwLDAuMSknLCAnc3Ryb2tlLXdpZHRoJzo3ICwgZmlsbDonbm9uZSd9LCBzdmcgKTsvLzJcclxuICAgICAgICBULmRvbSggJ3BhdGgnLCAnJywgeyBkOicnLCBzdHJva2U6J3JnYmEoMjU1LDI1NSwyNTUsMC4zKScsICdzdHJva2Utd2lkdGgnOjIsIGZpbGw6J25vbmUnLCAnc3Ryb2tlLWxpbmVjYXAnOidyb3VuZCcsICdzdHJva2Utb3BhY2l0eSc6MC41IH0sIHN2ZyApOy8vM1xyXG4gICAgICAgIFQua25vYiA9IHN2ZztcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIG1ha2VDaXJjdWxhcjogZnVuY3Rpb24gKCBtb2RlbCApIHtcclxuXHJcbiAgICAgICAgbGV0IHcgPSAxMjg7XHJcbiAgICAgICAgbGV0IHJhZGl1cyA9IDQwO1xyXG4gICAgICAgIGxldCBzdmcgPSBULmRvbSggJ3N2ZycsIFQuY3NzLmJhc2ljICsgJ3Bvc2l0aW9uOnJlbGF0aXZlOycsIHsgdmlld0JveDonMCAwICcrdysnICcrdywgd2lkdGg6dywgaGVpZ2h0OncsIHByZXNlcnZlQXNwZWN0UmF0aW86J25vbmUnIH0gKTtcclxuICAgICAgICBULmRvbSggJ2NpcmNsZScsICcnLCB7IGN4OjY0LCBjeTo2NCwgcjpyYWRpdXMsIHN0cm9rZToncmdiYSgwLDAsMCwwLjEpJywgJ3N0cm9rZS13aWR0aCc6MTAsIGZpbGw6J25vbmUnIH0sIHN2ZyApOy8vMFxyXG4gICAgICAgIFQuZG9tKCAncGF0aCcsICcnLCB7IGQ6JycsIHN0cm9rZTpULmNvbG9ycy50ZXh0LCAnc3Ryb2tlLXdpZHRoJzo3LCBmaWxsOidub25lJywgJ3N0cm9rZS1saW5lY2FwJzonYnV0dCcgfSwgc3ZnICk7Ly8xXHJcbiAgICAgICAgVC5jaXJjdWxhciA9IHN2ZztcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIG1ha2VKb3lzdGljazogZnVuY3Rpb24gKCBtb2RlbCApIHtcclxuXHJcbiAgICAgICAgLy8rJyBiYWNrZ3JvdW5kOiNmMDA7J1xyXG5cclxuICAgICAgICBsZXQgdyA9IDEyOCwgY2NjO1xyXG4gICAgICAgIGxldCByYWRpdXMgPSBNYXRoLmZsb29yKCh3LTMwKSowLjUpO1xyXG4gICAgICAgIGxldCBpbm5lclJhZGl1cyA9IE1hdGguZmxvb3IocmFkaXVzKjAuNik7XHJcbiAgICAgICAgbGV0IHN2ZyA9IFQuZG9tKCAnc3ZnJywgVC5jc3MuYmFzaWMgKyAncG9zaXRpb246cmVsYXRpdmU7JywgeyB2aWV3Qm94OicwIDAgJyt3KycgJyt3LCB3aWR0aDp3LCBoZWlnaHQ6dywgcHJlc2VydmVBc3BlY3RSYXRpbzonbm9uZScgfSApO1xyXG4gICAgICAgIFQuZG9tKCAnZGVmcycsIG51bGwsIHt9LCBzdmcgKTtcclxuICAgICAgICBULmRvbSggJ2cnLCBudWxsLCB7fSwgc3ZnICk7XHJcblxyXG4gICAgICAgIGlmKCBtb2RlbCA9PT0gMCApe1xyXG5cclxuICAgICAgICBcclxuXHJcbiAgICAgICAgICAgIC8vIGdyYWRpYW4gYmFja2dyb3VuZFxyXG4gICAgICAgICAgICBjY2MgPSBbIFs0MCwgJ3JnYigwLDAsMCknLCAwLjNdLCBbODAsICdyZ2IoMCwwLDApJywgMF0sIFs5MCwgJ3JnYig1MCw1MCw1MCknLCAwLjRdLCBbMTAwLCAncmdiKDUwLDUwLDUwKScsIDBdIF07XHJcbiAgICAgICAgICAgIFQubWFrZUdyYWRpYW50KCAncmFkaWFsR3JhZGllbnQnLCB7IGlkOidncmFkJywgY3g6JzUwJScsIGN5Oic1MCUnLCByOic1MCUnLCBmeDonNTAlJywgZnk6JzUwJScgfSwgc3ZnLCBjY2MgKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGdyYWRpYW4gc2hhZG93XHJcbiAgICAgICAgICAgIGNjYyA9IFsgWzYwLCAncmdiKDAsMCwwKScsIDAuNV0sIFsxMDAsICdyZ2IoMCwwLDApJywgMF0gXTtcclxuICAgICAgICAgICAgVC5tYWtlR3JhZGlhbnQoICdyYWRpYWxHcmFkaWVudCcsIHsgaWQ6J2dyYWRTJywgY3g6JzUwJScsIGN5Oic1MCUnLCByOic1MCUnLCBmeDonNTAlJywgZnk6JzUwJScgfSwgc3ZnLCBjY2MgKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGdyYWRpYW4gc3RpY2tcclxuICAgICAgICAgICAgbGV0IGNjMCA9IFsncmdiKDQwLDQwLDQwKScsICdyZ2IoNDgsNDgsNDgpJywgJ3JnYigzMCwzMCwzMCknXTtcclxuICAgICAgICAgICAgbGV0IGNjMSA9IFsncmdiKDEsOTAsMTk3KScsICdyZ2IoMyw5NSwyMDcpJywgJ3JnYigwLDY1LDE2NyknXTtcclxuXHJcbiAgICAgICAgICAgIGNjYyA9IFsgWzMwLCBjYzBbMF0sIDFdLCBbNjAsIGNjMFsxXSwgMV0sIFs4MCwgY2MwWzFdLCAxXSwgWzEwMCwgY2MwWzJdLCAxXSBdO1xyXG4gICAgICAgICAgICBULm1ha2VHcmFkaWFudCggJ3JhZGlhbEdyYWRpZW50JywgeyBpZDonZ3JhZEluJywgY3g6JzUwJScsIGN5Oic1MCUnLCByOic1MCUnLCBmeDonNTAlJywgZnk6JzUwJScgfSwgc3ZnLCBjY2MgKTtcclxuXHJcbiAgICAgICAgICAgIGNjYyA9IFsgWzMwLCBjYzFbMF0sIDFdLCBbNjAsIGNjMVsxXSwgMV0sIFs4MCwgY2MxWzFdLCAxXSwgWzEwMCwgY2MxWzJdLCAxXSBdO1xyXG4gICAgICAgICAgICBULm1ha2VHcmFkaWFudCggJ3JhZGlhbEdyYWRpZW50JywgeyBpZDonZ3JhZEluMicsIGN4Oic1MCUnLCBjeTonNTAlJywgcjonNTAlJywgZng6JzUwJScsIGZ5Oic1MCUnIH0sIHN2ZywgY2NjICk7XHJcblxyXG4gICAgICAgICAgICAvLyBncmFwaFxyXG5cclxuICAgICAgICAgICAgVC5kb20oICdjaXJjbGUnLCAnJywgeyBjeDo2NCwgY3k6NjQsIHI6cmFkaXVzLCBmaWxsOid1cmwoI2dyYWQpJyB9LCBzdmcgKTsvLzJcclxuICAgICAgICAgICAgVC5kb20oICdjaXJjbGUnLCAnJywgeyBjeDo2NCs1LCBjeTo2NCsxMCwgcjppbm5lclJhZGl1cysxMCwgZmlsbDondXJsKCNncmFkUyknIH0sIHN2ZyApOy8vM1xyXG4gICAgICAgICAgICBULmRvbSggJ2NpcmNsZScsICcnLCB7IGN4OjY0LCBjeTo2NCwgcjppbm5lclJhZGl1cywgZmlsbDondXJsKCNncmFkSW4pJyB9LCBzdmcgKTsvLzRcclxuXHJcbiAgICAgICAgICAgIFQuam95c3RpY2tfMCA9IHN2ZztcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgIC8vIGdyYWRpYW4gc2hhZG93XHJcbiAgICAgICAgICAgIGNjYyA9IFsgWzY5LCAncmdiKDAsMCwwKScsIDBdLFs3MCwgJ3JnYigwLDAsMCknLCAwLjNdLCBbMTAwLCAncmdiKDAsMCwwKScsIDBdIF07XHJcbiAgICAgICAgICAgIFQubWFrZUdyYWRpYW50KCAncmFkaWFsR3JhZGllbnQnLCB7IGlkOidncmFkWCcsIGN4Oic1MCUnLCBjeTonNTAlJywgcjonNTAlJywgZng6JzUwJScsIGZ5Oic1MCUnIH0sIHN2ZywgY2NjICk7XHJcblxyXG4gICAgICAgICAgICBULmRvbSggJ2NpcmNsZScsICcnLCB7IGN4OjY0LCBjeTo2NCwgcjpyYWRpdXMsIGZpbGw6J25vbmUnLCBzdHJva2U6J3JnYmEoMTAwLDEwMCwxMDAsMC4yNSknLCAnc3Ryb2tlLXdpZHRoJzonNCcgfSwgc3ZnICk7Ly8yXHJcbiAgICAgICAgICAgIFQuZG9tKCAnY2lyY2xlJywgJycsIHsgY3g6NjQsIGN5OjY0LCByOmlubmVyUmFkaXVzKzE0LCBmaWxsOid1cmwoI2dyYWRYKScgfSwgc3ZnICk7Ly8zXHJcbiAgICAgICAgICAgIFQuZG9tKCAnY2lyY2xlJywgJycsIHsgY3g6NjQsIGN5OjY0LCByOmlubmVyUmFkaXVzLCBmaWxsOidub25lJywgc3Ryb2tlOidyZ2IoMTAwLDEwMCwxMDApJywgJ3N0cm9rZS13aWR0aCc6JzQnIH0sIHN2ZyApOy8vNFxyXG5cclxuICAgICAgICAgICAgVC5qb3lzdGlja18xID0gc3ZnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgXHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBtYWtlQ29sb3JSaW5nOiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgIGxldCB3ID0gMjU2O1xyXG4gICAgICAgIGxldCBzdmcgPSBULmRvbSggJ3N2ZycsIFQuY3NzLmJhc2ljICsgJ3Bvc2l0aW9uOnJlbGF0aXZlOycsIHsgdmlld0JveDonMCAwICcrdysnICcrdywgd2lkdGg6dywgaGVpZ2h0OncsIHByZXNlcnZlQXNwZWN0UmF0aW86J25vbmUnIH0gKTtcclxuICAgICAgICBULmRvbSggJ2RlZnMnLCBudWxsLCB7fSwgc3ZnICk7XHJcbiAgICAgICAgVC5kb20oICdnJywgbnVsbCwge30sIHN2ZyApO1xyXG5cclxuICAgICAgICBsZXQgcyA9IDMwOy8vc3Ryb2tlXHJcbiAgICAgICAgbGV0IHIgPSggdy1zICkqMC41O1xyXG4gICAgICAgIGxldCBtaWQgPSB3KjAuNTtcclxuICAgICAgICBsZXQgbiA9IDI0LCBudWRnZSA9IDggLyByIC8gbiAqIE1hdGguUEksIGExID0gMCwgZDE7XHJcbiAgICAgICAgbGV0IGFtLCB0YW4sIGQyLCBhMiwgYXIsIGksIGosIHBhdGgsIGNjYztcclxuICAgICAgICBsZXQgY29sb3IgPSBbXTtcclxuICAgICAgICBcclxuICAgICAgICBmb3IgKCBpID0gMDsgaSA8PSBuOyArK2kpIHtcclxuXHJcbiAgICAgICAgICAgIGQyID0gaSAvIG47XHJcbiAgICAgICAgICAgIGEyID0gZDIgKiBULlR3b1BJO1xyXG4gICAgICAgICAgICBhbSA9IChhMSArIGEyKSAqIDAuNTtcclxuICAgICAgICAgICAgdGFuID0gMSAvIE1hdGguY29zKChhMiAtIGExKSAqIDAuNSk7XHJcblxyXG4gICAgICAgICAgICBhciA9IFtcclxuICAgICAgICAgICAgICAgIE1hdGguc2luKGExKSwgLU1hdGguY29zKGExKSwgXHJcbiAgICAgICAgICAgICAgICBNYXRoLnNpbihhbSkgKiB0YW4sIC1NYXRoLmNvcyhhbSkgKiB0YW4sIFxyXG4gICAgICAgICAgICAgICAgTWF0aC5zaW4oYTIpLCAtTWF0aC5jb3MoYTIpXHJcbiAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb2xvclsxXSA9IFQucmdiVG9IZXgoIFQuaHNsVG9SZ2IoW2QyLCAxLCAwLjVdKSApO1xyXG5cclxuICAgICAgICAgICAgaWYgKGkgPiAwKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaiA9IDY7XHJcbiAgICAgICAgICAgICAgICB3aGlsZShqLS0pe1xyXG4gICAgICAgICAgICAgICAgICAgYXJbal0gPSAoKGFyW2pdKnIpK21pZCkudG9GaXhlZCgyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBwYXRoID0gJyBNJyArIGFyWzBdICsgJyAnICsgYXJbMV0gKyAnIFEnICsgYXJbMl0gKyAnICcgKyBhclszXSArICcgJyArIGFyWzRdICsgJyAnICsgYXJbNV07XHJcblxyXG4gICAgICAgICAgICAgICAgY2NjID0gWyBbMCxjb2xvclswXSwxXSwgWzEwMCxjb2xvclsxXSwxXSBdO1xyXG4gICAgICAgICAgICAgICAgVC5tYWtlR3JhZGlhbnQoICdsaW5lYXJHcmFkaWVudCcsIHsgaWQ6J0cnK2ksIHgxOmFyWzBdLCB5MTphclsxXSwgeDI6YXJbNF0sIHkyOmFyWzVdLCBncmFkaWVudFVuaXRzOlwidXNlclNwYWNlT25Vc2VcIiB9LCBzdmcsIGNjYyApO1xyXG5cclxuICAgICAgICAgICAgICAgIFQuZG9tKCAncGF0aCcsICcnLCB7IGQ6cGF0aCwgJ3N0cm9rZS13aWR0aCc6cywgc3Ryb2tlOid1cmwoI0cnK2krJyknLCAnc3Ryb2tlLWxpbmVjYXAnOlwiYnV0dFwiIH0sIHN2ZywgMSApO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYTEgPSBhMiAtIG51ZGdlOyBcclxuICAgICAgICAgICAgY29sb3JbMF0gPSBjb2xvclsxXTtcclxuICAgICAgICAgICAgZDEgPSBkMjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBiciA9ICgxMjggLSBzICkgKyAyO1xyXG4gICAgICAgIGxldCBidyA9IDYwO1xyXG5cclxuICAgICAgICBsZXQgdHcgPSA4NC45MDtcclxuXHJcbiAgICAgICAgLy8gYmxhY2sgLyB3aGl0ZVxyXG4gICAgICAgIGNjYyA9IFsgWzAsICcjRkZGRkZGJywgMV0sIFs1MCwgJyNGRkZGRkYnLCAwXSwgWzUwLCAnIzAwMDAwMCcsIDBdLCBbMTAwLCAnIzAwMDAwMCcsIDFdIF07XHJcbiAgICAgICAgVC5tYWtlR3JhZGlhbnQoICdsaW5lYXJHcmFkaWVudCcsIHsgaWQ6J0dMMCcsIHgxOjAsIHkxOm1pZC10dywgeDI6MCwgeTI6bWlkK3R3LCBncmFkaWVudFVuaXRzOlwidXNlclNwYWNlT25Vc2VcIiB9LCBzdmcsIGNjYyApO1xyXG5cclxuICAgICAgICBjY2MgPSBbIFswLCAnIzdmN2Y3ZicsIDFdLCBbNTAsICcjN2Y3ZjdmJywgMC41XSwgWzEwMCwgJyM3ZjdmN2YnLCAwXSBdO1xyXG4gICAgICAgIFQubWFrZUdyYWRpYW50KCAnbGluZWFyR3JhZGllbnQnLCB7IGlkOidHTDEnLCB4MTptaWQtNDkuMDUsIHkxOjAsIHgyOm1pZCs5OCwgeTI6MCwgZ3JhZGllbnRVbml0czpcInVzZXJTcGFjZU9uVXNlXCIgfSwgc3ZnLCBjY2MgKTtcclxuXHJcbiAgICAgICAgVC5kb20oICdnJywgbnVsbCwgeyAndHJhbnNmb3JtLW9yaWdpbic6ICcxMjhweCAxMjhweCcsICd0cmFuc2Zvcm0nOidyb3RhdGUoMCknIH0sIHN2ZyApOy8vMlxyXG4gICAgICAgIFQuZG9tKCAncG9seWdvbicsICcnLCB7IHBvaW50czonNzguOTUgNDMuMSA3OC45NSAyMTIuODUgMjI2IDEyOCcsICBmaWxsOidyZWQnICB9LCBzdmcsIDIgKTsvLyAyLDBcclxuICAgICAgICBULmRvbSggJ3BvbHlnb24nLCAnJywgeyBwb2ludHM6Jzc4Ljk1IDQzLjEgNzguOTUgMjEyLjg1IDIyNiAxMjgnLCAgZmlsbDondXJsKCNHTDEpJywnc3Ryb2tlLXdpZHRoJzoxLCBzdHJva2U6J3VybCgjR0wxKScgIH0sIHN2ZywgMiApOy8vMiwxXHJcbiAgICAgICAgVC5kb20oICdwb2x5Z29uJywgJycsIHsgcG9pbnRzOic3OC45NSA0My4xIDc4Ljk1IDIxMi44NSAyMjYgMTI4JywgIGZpbGw6J3VybCgjR0wwKScsJ3N0cm9rZS13aWR0aCc6MSwgc3Ryb2tlOid1cmwoI0dMMCknICB9LCBzdmcsIDIgKTsvLzIsMlxyXG4gICAgICAgIFQuZG9tKCAncGF0aCcsICcnLCB7IGQ6J00gMjU1Ljc1IDEzNi41IFEgMjU2IDEzMi4zIDI1NiAxMjggMjU2IDEyMy43IDI1NS43NSAxMTkuNSBMIDI0MSAxMjggMjU1Ljc1IDEzNi41IFonLCAgZmlsbDonbm9uZScsJ3N0cm9rZS13aWR0aCc6Miwgc3Ryb2tlOicjMDAwJyAgfSwgc3ZnLCAyICk7Ly8yLDNcclxuICAgICAgICAvL1QuZG9tKCAnY2lyY2xlJywgJycsIHsgY3g6MTI4KzExMywgY3k6MTI4LCByOjYsICdzdHJva2Utd2lkdGgnOjMsIHN0cm9rZTonIzAwMCcsIGZpbGw6J25vbmUnIH0sIHN2ZywgMiApOy8vMi4zXHJcblxyXG4gICAgICAgIFQuZG9tKCAnY2lyY2xlJywgJycsIHsgY3g6MTI4LCBjeToxMjgsIHI6NiwgJ3N0cm9rZS13aWR0aCc6Miwgc3Ryb2tlOicjMDAwJywgZmlsbDonbm9uZScgfSwgc3ZnICk7Ly8zXHJcblxyXG4gICAgICAgIFQuY29sb3JSaW5nID0gc3ZnO1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgaWNvbjogZnVuY3Rpb24gKCB0eXBlLCBjb2xvciwgdyApe1xyXG5cclxuICAgICAgICB3ID0gdyB8fCA0MDtcclxuICAgICAgICAvL2NvbG9yID0gY29sb3IgfHwgJyNERURFREUnO1xyXG4gICAgICAgIGxldCB2aWV3Qm94ID0gJzAgMCAyNTYgMjU2JztcclxuICAgICAgICAvL2xldCB2aWV3Qm94ID0gJzAgMCAnKyB3ICsnICcrIHc7XHJcbiAgICAgICAgbGV0IHQgPSBbXCI8c3ZnIHhtbG5zPSdcIitULnN2Z25zK1wiJyB2ZXJzaW9uPScxLjEnIHhtbG5zOnhsaW5rPSdcIitULmh0bWxzK1wiJyBzdHlsZT0ncG9pbnRlci1ldmVudHM6bm9uZTsnIHByZXNlcnZlQXNwZWN0UmF0aW89J3hNaW5ZTWF4IG1lZXQnIHg9JzBweCcgeT0nMHB4JyB3aWR0aD0nXCIrdytcInB4JyBoZWlnaHQ9J1wiK3crXCJweCcgdmlld0JveD0nXCIrdmlld0JveCtcIic+PGc+XCJdO1xyXG4gICAgICAgIHN3aXRjaCh0eXBlKXtcclxuICAgICAgICAgICAgY2FzZSAnbG9nbyc6XHJcbiAgICAgICAgICAgIHRbMV09XCI8cGF0aCBpZD0nbG9nb2luJyBmaWxsPSdcIitjb2xvcitcIicgc3Ryb2tlPSdub25lJyBkPSdcIitULmxvZ29GaWxsX2QrXCInLz5cIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2RvbmF0ZSc6XHJcbiAgICAgICAgICAgIHRbMV09XCI8cGF0aCBpZD0nbG9nb2luJyBmaWxsPSdcIitjb2xvcitcIicgc3Ryb2tlPSdub25lJyBkPSdcIitULmxvZ29fZG9uYXRlK1wiJy8+XCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICduZW8nOlxyXG4gICAgICAgICAgICB0WzFdPVwiPHBhdGggaWQ9J2xvZ29pbicgZmlsbD0nXCIrY29sb3IrXCInIHN0cm9rZT0nbm9uZScgZD0nXCIrVC5sb2dvX25lbytcIicvPlwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAncGh5JzpcclxuICAgICAgICAgICAgdFsxXT1cIjxwYXRoIGlkPSdsb2dvaW4nIHN0cm9rZT0nXCIrY29sb3IrXCInIHN0cm9rZS13aWR0aD0nNDknIHN0cm9rZS1saW5lam9pbj0ncm91bmQnIHN0cm9rZS1saW5lY2FwPSdidXR0JyBmaWxsPSdub25lJyBkPSdcIitULmxvZ29fcGh5K1wiJy8+XCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdjb25maWcnOlxyXG4gICAgICAgICAgICB0WzFdPVwiPHBhdGggaWQ9J2xvZ29pbicgc3Ryb2tlPSdcIitjb2xvcitcIicgc3Ryb2tlLXdpZHRoPSc0OScgc3Ryb2tlLWxpbmVqb2luPSdyb3VuZCcgc3Ryb2tlLWxpbmVjYXA9J2J1dHQnIGZpbGw9J25vbmUnIGQ9J1wiK1QubG9nb19jb25maWcrXCInLz5cIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2dpdGh1Yic6XHJcbiAgICAgICAgICAgIHRbMV09XCI8cGF0aCBpZD0nbG9nb2luJyBmaWxsPSdcIitjb2xvcitcIicgc3Ryb2tlPSdub25lJyBkPSdcIitULmxvZ29fZ2l0aHViK1wiJy8+XCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdzYXZlJzpcclxuICAgICAgICAgICAgdFsxXT1cIjxwYXRoIHN0cm9rZT0nXCIrY29sb3IrXCInIHN0cm9rZS13aWR0aD0nNCcgc3Ryb2tlLWxpbmVqb2luPSdyb3VuZCcgc3Ryb2tlLWxpbmVjYXA9J3JvdW5kJyBmaWxsPSdub25lJyBkPSdNIDI2LjEyNSAxNyBMIDIwIDIyLjk1IDE0LjA1IDE3IE0gMjAgOS45NSBMIDIwIDIyLjk1Jy8+PHBhdGggc3Ryb2tlPSdcIitjb2xvcjtcclxuICAgICAgICAgICAgdFsxXSs9XCInIHN0cm9rZS13aWR0aD0nMi41JyBzdHJva2UtbGluZWpvaW49J3JvdW5kJyBzdHJva2UtbGluZWNhcD0ncm91bmQnIGZpbGw9J25vbmUnIGQ9J00gMzIuNiAyMyBMIDMyLjYgMjUuNSBRIDMyLjYgMjguNSAyOS42IDI4LjUgTCAxMC42IDI4LjUgUSA3LjYgMjguNSA3LjYgMjUuNSBMIDcuNiAyMycvPlwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgdFsyXSA9IFwiPC9nPjwvc3ZnPlwiO1xyXG4gICAgICAgIHJldHVybiB0LmpvaW4oXCJcXG5cIik7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBsb2dvRmlsbF9kOmBcclxuICAgIE0gMTcxIDE1MC43NSBMIDE3MSAzMy4yNSAxNTUuNSAzMy4yNSAxNTUuNSAxNTAuNzUgUSAxNTUuNSAxNjIuMiAxNDcuNDUgMTcwLjIgMTM5LjQ1IDE3OC4yNSAxMjggMTc4LjI1IDExNi42IDE3OC4yNSAxMDguNTUgMTcwLjIgMTAwLjUgMTYyLjIgMTAwLjUgMTUwLjc1IFxyXG4gICAgTCAxMDAuNSAzMy4yNSA4NSAzMy4yNSA4NSAxNTAuNzUgUSA4NSAxNjguNjUgOTcuNTUgMTgxLjE1IDExMC4xNSAxOTMuNzUgMTI4IDE5My43NSAxNDUuOSAxOTMuNzUgMTU4LjQgMTgxLjE1IDE3MSAxNjguNjUgMTcxIDE1MC43NSBcclxuICAgIE0gMjAwIDMzLjI1IEwgMTg0IDMzLjI1IDE4NCAxNTAuOCBRIDE4NCAxNzQuMSAxNjcuNiAxOTAuNCAxNTEuMyAyMDYuOCAxMjggMjA2LjggMTA0Ljc1IDIwNi44IDg4LjMgMTkwLjQgNzIgMTc0LjEgNzIgMTUwLjggTCA3MiAzMy4yNSA1NiAzMy4yNSA1NiAxNTAuNzUgXHJcbiAgICBRIDU2IDE4MC41NSA3Ny4wNSAyMDEuNiA5OC4yIDIyMi43NSAxMjggMjIyLjc1IDE1Ny44IDIyMi43NSAxNzguOSAyMDEuNiAyMDAgMTgwLjU1IDIwMCAxNTAuNzUgTCAyMDAgMzMuMjUgWlxyXG4gICAgYCxcclxuXHJcbiAgICBsb2dvX2dpdGh1YjpgXHJcbiAgICBNIDE4MC41IDcwIFEgMTg2LjMgODIuNCAxODEuNTUgOTYuNTUgMTk2LjUgMTExLjUgMTg5LjcgMTQwLjY1IDE4My42NSAxNjguMzUgMTQ2IDE3Mi43IDE1Mi41IDE3OC43IDE1Mi41NSAxODUuOSBMIDE1Mi41NSAyMTguMTUgUSAxNTIuODQgMjI0LjU2IDE1OS4xNSAyMjMuMyBcclxuICAgIDE1OS4yMSAyMjMuMyAxNTkuMjUgMjIzLjMgMTgxLjE0IDIxNi4yNSAxOTguNyAxOTguNyAyMjggMTY5LjQgMjI4IDEyOCAyMjggODYuNiAxOTguNyA1Ny4zIDE2OS40IDI4IDEyOCAyOCA4Ni42IDI4IDU3LjMgNTcuMyAyOCA4Ni42IDI4IDEyOCAyOCAxNjkuNCA1Ny4zIDE5OC43IDc0Ljg1IFxyXG4gICAgMjE2LjI1IDk2Ljc1IDIyMy4zIDk2Ljc4IDIyMy4zIDk2LjggMjIzLjMgMTAzLjE2IDIyNC41NCAxMDMuNDUgMjE4LjE1IEwgMTAzLjQ1IDIwMCBRIDgyLjk3IDIwMy4xIDc1LjEgMTk2LjM1IDY5Ljg1IDE5MS42NSA2OC40IDE4NS40NSA2NC4yNyAxNzcuMDU1IDU5LjQgMTc0LjE1IDQ5LjIwIFxyXG4gICAgMTY2Ljg3IDYwLjggMTY3LjggNjkuODUgMTY5LjYxIDc1LjcgMTgwIDgxLjEzIDE4OC4wOSA5MCAxODguNTUgOTguMTggMTg4Ljg2IDEwMy40NSAxODUuOSAxMDMuNDkgMTc4LjY3IDExMCAxNzIuNyA3Mi4zMyAxNjguMzMgNjYuMyAxNDAuNjUgNTkuNDggMTExLjQ5IDc0LjQ1IDk2LjU1IDY5LjcgXHJcbiAgICA4Mi40MSA3NS41IDcwIDg0Ljg3IDY4Ljc0IDEwMy4xNSA4MCAxMTUuMTI1IDc2LjYzNSAxMjggNzYuODUgMTQwLjg1IDc2LjY1IDE1Mi44NSA4MCAxNzEuMSA2OC43NSAxODAuNSA3MCBaXHJcbiAgICBgLFxyXG5cclxuICAgIGxvZ29fbmVvOmBcclxuICAgIE0gMjE5IDUyIEwgMjA2IDUyIDIwNiAxNjYgUSAyMDYgMTgzLjQgMTkzLjc1IDE5NS42NSAxODEuNCAyMDggMTY0IDIwOCAxNDYuNiAyMDggMTM0LjM1IDE5NS42NSAxMjIgMTgzLjQgMTIyIDE2NiBMIDEyMiA5MCBRIDEyMiA3Ny42IDExMy4xNSA2OC44NSAxMDQuNCA2MCA5MiA2MCA3OS41NSBcclxuICAgIDYwIDcwLjc1IDY4Ljg1IDYyIDc3LjYgNjIgOTAgTCA2MiAyMDQgNzUgMjA0IDc1IDkwIFEgNzUgODMgNzkuOTUgNzggODQuOTUgNzMgOTIgNzMgOTkgNzMgMTA0IDc4IDEwOSA4MyAxMDkgOTAgTCAxMDkgMTY2IFEgMTA5IDE4OC44IDEyNS4xNSAyMDQuODUgMTQxLjIgMjIxIDE2NCAyMjEgXHJcbiAgICAxODYuNzUgMjIxIDIwMi45NSAyMDQuODUgMjE5IDE4OC44IDIxOSAxNjYgTCAyMTkgNTIgTSAxOTQgNTIgTCAxODEgNTIgMTgxIDE2NiBRIDE4MSAxNzMgMTc2LjA1IDE3OCAxNzEuMDUgMTgzIDE2NCAxODMgMTU3IDE4MyAxNTIgMTc4IDE0NyAxNzMgMTQ3IDE2NiBMIDE0NyA5MCBRIDE0NyBcclxuICAgIDY3LjIgMTMwLjg1IDUxLjE1IDExNC44IDM1IDkyIDM1IDY5LjI1IDM1IDUzLjA1IDUxLjE1IDM3IDY3LjIgMzcgOTAgTCAzNyAyMDQgNTAgMjA0IDUwIDkwIFEgNTAgNzIuNiA2Mi4yNSA2MC4zNSA3NC42IDQ4IDkyIDQ4IDEwOS40IDQ4IDEyMS42NSA2MC4zNSAxMzQgNzIuNiAxMzQgOTAgTCBcclxuICAgIDEzNCAxNjYgUSAxMzQgMTc4LjQgMTQyLjg1IDE4Ny4xNSAxNTEuNiAxOTYgMTY0IDE5NiAxNzYuNDUgMTk2IDE4NS4yNSAxODcuMTUgMTk0IDE3OC40IDE5NCAxNjYgTCAxOTQgNTIgWlxyXG4gICAgYCxcclxuXHJcbiAgICBsb2dvX3BoeTpgXHJcbiAgICBNIDEwMy41NSAzNy45NSBMIDEyNy45NSAzNy45NSBRIDE2Mi4zNSAzNy45NSAxODYuNSA1NSAyMTAuOSA3Mi4zNSAyMTAuOSA5Ni41IDIxMC45IDEyMC42NSAxODYuNSAxMzcuNyAxNjIuMzUgMTU1IDEyNy45NSAxNTUgTCAxMjcuOTUgMjM3Ljk1IE0gMTI3Ljk1IDE1NSBcclxuICAgIFEgOTMuNTUgMTU1IDY5LjE1IDEzNy43IDQ1IDEyMC42NSA0NSA5Ni41IDQ1IDcyLjM1IDY5LjE1IDU1IDcwLjkgNTMuOCA3Mi44NSA1Mi44NSBNIDEyNy45NSAxNTUgTCAxMjcuOTUgMzcuOTVcclxuICAgIGAsXHJcblxyXG4gICAgbG9nb19jb25maWc6YFxyXG4gICAgTSAyMDQuMzUgNTEuNjUgTCAxNzMuMjUgODIuNzUgUSAxOTIgMTAxLjUgMTkyIDEyOCBMIDIzNiAxMjggTSAxOTIgMTI4IFEgMTkyIDE1NC41NSAxNzMuMjUgMTczLjI1IEwgMjA0LjQgMjA0LjQgTSA1MS42NSA1MS42NSBMIDgyLjc1IDgyLjc1IFEgMTAxLjUgNjQgMTI4IDY0IFxyXG4gICAgTCAxMjggMjAgTSA1MS42IDIwNC40IEwgODIuNzUgMTczLjI1IFEgNjQgMTU0LjU1IDY0IDEyOCBMIDIwIDEyOCBNIDEyOCAyMzYgTCAxMjggMTkyIFEgMTAxLjUgMTkyIDgyLjc1IDE3My4yNSBNIDY0IDEyOCBRIDY0IDEwMS41IDgyLjc1IDgyLjc1IE0gMTczLjI1IDE3My4yNSBcclxuICAgIFEgMTU0LjU1IDE5MiAxMjggMTkyIE0gMTI4IDY0IFEgMTU0LjU1IDY0IDE3My4yNSA4Mi43NVxyXG4gICAgYCxcclxuXHJcbiAgICBsb2dvX2RvbmF0ZTpgXHJcbiAgICBNIDE3MS4zIDgwLjMgUSAxNzkuNSA2Mi4xNSAxNzEuMyA0NS44IDE2NC4xIDMyLjUgMTQxLjM1IDMwLjEgTCA5NC4zNSAzMC4xIFEgODkuMzUgMzAuNCA4OC4zIDM1LjE1IEwgNzAuNSAxNDguMDUgUSA3MC4yIDE1Mi41IDczLjcgMTUyLjYgTCAxMDAuOTUgMTUyLjYgMTA3IDExMS42IFEgMTA4Ljc1IFxyXG4gICAgMTA2LjU1IDExMi42IDEwNi40NSAxMzAuNDUgMTA4LjA1IDE0NS4zIDEwMy45IDE2My4zNSA5OC43NSAxNzEuMyA4MC4zIE0gMTc5LjggNzEuNSBRIDE3OC42IDc5Ljc1IDE3NC45IDg3Ljg1IDE2OC40NSAxMDIuOSAxNTEuOSAxMDkuMTUgMTQwLjY1IDExMy45NSAxMTcuNTUgMTEzIDExMy4xNSBcclxuICAgIDExMi43NSAxMTEgMTE3LjQ1IEwgMTAyLjcgMTY5Ljk1IFEgMTAyLjQ1IDE3My44IDEwNS41IDE3My44NSBMIDEyOC45NSAxNzMuODUgUSAxMzIuMiAxNzQuMiAxMzMuMzUgMTY5LjY1IEwgMTM4LjMgMTM5Ljk1IFEgMTM5Ljc1IDEzNS42IDE0My4xIDEzNS41IDE0Ni42IDEzNS43NSAxNTAuNiAxMzUuNjUgXHJcbiAgICAxNTQuNTUgMTM1LjUgMTU3LjM1IDEzNS4xIDE2MC4xNSAxMzQuNyAxNjYuNzUgMTMyLjM1IDE4MS4zNSAxMjcuNCAxODcuOSAxMTEuMiAxOTQuMjUgOTUuNzUgMTg5LjUgODEuOTUgMTg2Ljc1IDc0Ljg1IDE3OS44IDcxLjUgTSAxMDMuNSAyMDkuOSBRIDEwMy41IDIwMi44NSA5OS43IDE5OC44NSA5NS45NSBcclxuICAgIDE5NC43NSA4OS40IDE5NC43NSA4Mi44IDE5NC43NSA3OS4wNSAxOTguODUgNzUuMyAyMDIuOSA3NS4zIDIwOS45IDc1LjMgMjE2Ljg1IDc5LjA1IDIyMC45NSA4Mi44IDIyNS4wNSA4OS40IDIyNS4wNSA5NS45NSAyMjUuMDUgOTkuNyAyMjEgMTAzLjUgMjE2Ljk1IDEwMy41IDIwOS45IE0gOTUuNDUgMjA1LjUgXHJcbiAgICBRIDk1Ljk1IDIwNy4zIDk1Ljk1IDIwOS45IDk1Ljk1IDIxMi42NSA5NS40NSAyMTQuMzUgOTQuOTUgMjE2IDk0IDIxNy4zIDkzLjEgMjE4LjQ1IDkxLjkgMjE5IDkwLjcgMjE5LjU1IDg5LjQgMjE5LjU1IDg4LjE1IDIxOS41NSA4Ni45NSAyMTkuMDUgODUuNzUgMjE4LjU1IDg0LjggMjE3LjMgODMuOSAyMTYuMTUgXHJcbiAgICA4My40IDIxNC4zNSA4Mi44NSAyMTIuNiA4Mi44NSAyMDkuOSA4Mi44NSAyMDcuMyA4My40IDIwNS40NSA4My45NSAyMDMuNTUgODQuODUgMjAyLjQ1IDg1LjkgMjAxLjIgODYuOTUgMjAwLjc1IDg4LjA1IDIwMC4yNSA4OS40IDIwMC4yNSA5MC43IDIwMC4yNSA5MS44NSAyMDAuOCA5My4wNSAyMDEuMyA5NCAyMDIuNSBcclxuICAgIDk0LjkgMjAzLjY1IDk1LjQ1IDIwNS41IE0gMTUzLjMgMTk1LjM1IEwgMTQ1LjMgMTk1LjM1IDEzNS41IDIyNC40NSAxNDIuOCAyMjQuNDUgMTQ0LjYgMjE4LjUgMTUzLjc1IDIxOC41IDE1NS42IDIyNC40NSAxNjMuMSAyMjQuNDUgMTUzLjMgMTk1LjM1IE0gMTUyLjE1IDIxMy4yNSBMIDE0Ni4yNSAyMTMuMjUgXHJcbiAgICAxNDkuMiAyMDMuNjUgMTUyLjE1IDIxMy4yNSBNIDExNi43NSAxOTUuMzUgTCAxMDcuOCAxOTUuMzUgMTA3LjggMjI0LjQ1IDExNC41IDIyNC40NSAxMTQuNSAyMDQuMiAxMjUuNyAyMjQuNDUgMTMyLjc1IDIyNC40NSAxMzIuNzUgMTk1LjM1IDEyNi4wNSAxOTUuMzUgMTI2LjA1IDIxMi4wNSAxMTYuNzUgMTk1LjM1IE0gXHJcbiAgICA2Ni41IDE5Ny42NSBRIDY0LjE1IDE5Ni4xNSA2MS40NSAxOTUuNzUgNTguOCAxOTUuMzUgNTUuNzUgMTk1LjM1IEwgNDYuNyAxOTUuMzUgNDYuNyAyMjQuNDUgNTUuOCAyMjQuNDUgUSA1OC44IDIyNC40NSA2MS41IDIyNC4wNSA2NC4xNSAyMjMuNiA2Ni40IDIyMi4xNSA2OS4xNSAyMjAuNDUgNzAuOSAyMTcuMiBcclxuICAgIDcyLjcgMjE0IDcyLjcgMjA5Ljk1IDcyLjcgMjA1LjcgNzEgMjAyLjYgNjkuMzUgMTk5LjUgNjYuNSAxOTcuNjUgTSA2NC4yIDIwNSBRIDY1LjIgMjA3IDY1LjIgMjA5LjkgNjUuMiAyMTIuNzUgNjQuMjUgMjE0Ljc1IDYzLjMgMjE2Ljc1IDYxLjUgMjE3Ljg1IDYwIDIxOC44NSA1OC4zIDIxOC45IDU2LjYgMjE5IFxyXG4gICAgNTQuMTUgMjE5IEwgNTQgMjE5IDU0IDIwMC44IDU0LjE1IDIwMC44IFEgNTYuNCAyMDAuOCA1OC4wNSAyMDAuOSA1OS43IDIwMC45NSA2MS4xNSAyMDEuNzUgNjMuMiAyMDIuOTUgNjQuMiAyMDUgTSAyMTAuMiAxOTUuMzUgTCAxOTAuNSAxOTUuMzUgMTkwLjUgMjI0LjQ1IDIxMC4yIDIyNC40NSAyMTAuMiAyMTguOSBcclxuICAgIDE5Ny43NSAyMTguOSAxOTcuNzUgMjExLjU1IDIwOS4yIDIxMS41NSAyMDkuMiAyMDYgMTk3Ljc1IDIwNiAxOTcuNzUgMjAwLjkgMjEwLjIgMjAwLjkgMjEwLjIgMTk1LjM1IE0gMTg3LjUgMTk1LjM1IEwgMTYzIDE5NS4zNSAxNjMgMjAwLjkgMTcxLjYgMjAwLjkgMTcxLjYgMjI0LjQ1IDE3OC45IDIyNC40NSAxNzguOSBcclxuICAgIDIwMC45IDE4Ny41IDIwMC45IDE4Ny41IDE5NS4zNSBaXHJcbiAgICBgLFxyXG5cclxufVxyXG5cclxuVC5zZXRUZXh0KCk7XHJcblxyXG5leHBvcnQgY29uc3QgVG9vbHMgPSBUOyIsIi8vL2h0dHBzOi8vd2ljZy5naXRodWIuaW8vZmlsZS1zeXN0ZW0tYWNjZXNzLyNhcGktZmlsZXN5c3RlbWZpbGVoYW5kbGUtZ2V0ZmlsZVxyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlcyB7XHJcblxyXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gIEZJTEUgVFlQRVxyXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIHN0YXRpYyBhdXRvVHlwZXMoIHR5cGUgKSB7XHJcblxyXG4gICAgICAgIGxldCB0ID0gW11cclxuXHJcbiAgICAgICAgc3dpdGNoKCB0eXBlICl7XHJcbiAgICAgICAgICAgIGNhc2UgJ3N2Zyc6XHJcbiAgICAgICAgICAgIHQgPSBbIHsgYWNjZXB0OiB7ICdpbWFnZS9zdmcreG1sJzogJy5zdmcnfSB9LCBdXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICd3YXYnOlxyXG4gICAgICAgICAgICB0ID0gWyB7IGFjY2VwdDogeyAnYXVkaW8vd2F2JzogJy53YXYnfSB9LCBdXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdtcDMnOlxyXG4gICAgICAgICAgICB0ID0gWyB7IGFjY2VwdDogeyAnYXVkaW8vbXBlZyc6ICcubXAzJ30gfSwgXVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnbXA0JzpcclxuICAgICAgICAgICAgdCA9IFsgeyBhY2NlcHQ6IHsgJ3ZpZGVvL21wNCc6ICcubXA0J30gfSwgXVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnYmluJzogY2FzZSAnaGV4JzpcclxuICAgICAgICAgICAgdCA9IFsgeyBkZXNjcmlwdGlvbjogJ0JpbmFyeSBGaWxlcycsIGFjY2VwdDogeyAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJzogWycuYmluJywgJy5oZXgnXSB9IH0sIF1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3RleHQnOlxyXG4gICAgICAgICAgICB0ID0gWyB7IGRlc2NyaXB0aW9uOiAnVGV4dCBGaWxlcycsIGFjY2VwdDogeyAndGV4dC9wbGFpbic6IFsnLnR4dCcsICcudGV4dCddLCAndGV4dC9odG1sJzogWycuaHRtbCcsICcuaHRtJ10gfSB9LCBdXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdqc29uJzpcclxuICAgICAgICAgICAgdCA9IFsgeyBkZXNjcmlwdGlvbjogJ0pTT04gRmlsZXMnLCBhY2NlcHQ6IHsgJ2FwcGxpY2F0aW9uL2pzb24nOiBbJy5qc29uJ10gfSB9LCBdLy90ZXh0L3BsYWluXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdqcyc6XHJcbiAgICAgICAgICAgIHQgPSBbIHsgZGVzY3JpcHRpb246ICdKYXZhU2NyaXB0IEZpbGVzJywgYWNjZXB0OiB7ICd0ZXh0L2phdmFzY3JpcHQnOiBbJy5qcyddIH0gfSwgXVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnaW1hZ2UnOlxyXG4gICAgICAgICAgICB0ID0gWyB7IGRlc2NyaXB0aW9uOiAnSW1hZ2VzJywgYWNjZXB0OiB7ICdpbWFnZS8qJzogWycucG5nJywgJy5naWYnLCAnLmpwZWcnLCAnLmpwZyddIH0gfSwgXVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnaWNvbic6XHJcbiAgICAgICAgICAgIHQgPSBbIHsgZGVzY3JpcHRpb246ICdJY29ucycsIGFjY2VwdDogeyAnaW1hZ2UveC1pY28nOiBbJy5pY28nXSB9IH0sIF1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2x1dCc6XHJcbiAgICAgICAgICAgIHQgPSBbIHsgZGVzY3JpcHRpb246ICdMdXQnLCBhY2NlcHQ6IHsgJ3RleHQvcGxhaW4nOiBbJy5jdWJlJywgJy4zZGwnXSB9IH0sIF1cclxuICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRcclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICBMT0FEXHJcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG5cdHN0YXRpYyBhc3luYyBsb2FkKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93LnNob3dPcGVuRmlsZVBpY2tlciAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICB3aW5kb3cuc2hvd09wZW5GaWxlUGlja2VyID0gRmlsZXMuc2hvd09wZW5GaWxlUGlja2VyUG9seWZpbGxcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeSB7XHJcblxyXG4gICAgICAgIFx0bGV0IHR5cGUgPSBvLnR5cGUgfHwgJydcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgICAgICBleGNsdWRlQWNjZXB0QWxsT3B0aW9uOiB0eXBlID8gdHJ1ZSA6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgbXVsdGlwbGU6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgLy9zdGFydEluOicuL2Fzc2V0cydcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIG9wdGlvbnMudHlwZXMgPSBGaWxlcy5hdXRvVHlwZXMoIHR5cGUgKVxyXG5cclxuICAgICAgICAgICAgLy8gY3JlYXRlIGEgbmV3IGhhbmRsZVxyXG4gICAgICAgICAgICBjb25zdCBoYW5kbGUgPSBhd2FpdCB3aW5kb3cuc2hvd09wZW5GaWxlUGlja2VyKCBvcHRpb25zIClcclxuICAgICAgICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IGhhbmRsZVswXS5nZXRGaWxlKClcclxuICAgICAgICAgICAgLy9sZXQgY29udGVudCA9IGF3YWl0IGZpbGUudGV4dCgpXHJcblxyXG4gICAgICAgICAgICBpZiggIWZpbGUgKSByZXR1cm4gbnVsbFxyXG5cclxuICAgICAgICAgICAgbGV0IGZuYW1lID0gZmlsZS5uYW1lO1xyXG4gICAgICAgICAgICBsZXQgZnR5cGUgPSBmbmFtZS5zdWJzdHJpbmcoIGZuYW1lLmxhc3RJbmRleE9mKCcuJykrMSwgZm5hbWUubGVuZ3RoICk7XHJcblxyXG4gICAgICAgICAgICBjb25zdCBkYXRhVXJsID0gWyAncG5nJywgJ2pwZycsICdqcGVnJywgJ21wNCcsICd3ZWJtJywgJ29nZycsICdtcDMnIF07XHJcbiAgICAgICAgICAgIGNvbnN0IGRhdGFCdWYgPSBbICdzZWEnLCAneicsICdoZXgnLCAnYnZoJywgJ0JWSCcsICdnbGInLCAnZ2x0ZicgXTtcclxuICAgICAgICAgICAgY29uc3QgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHJcbiAgICAgICAgICAgIGlmKCBkYXRhVXJsLmluZGV4T2YoIGZ0eXBlICkgIT09IC0xICkgcmVhZGVyLnJlYWRBc0RhdGFVUkwoIGZpbGUgKVxyXG4gICAgICAgICAgICBlbHNlIGlmKCBkYXRhQnVmLmluZGV4T2YoIGZ0eXBlICkgIT09IC0xICkgcmVhZGVyLnJlYWRBc0FycmF5QnVmZmVyKCBmaWxlIClcclxuICAgICAgICAgICAgZWxzZSByZWFkZXIucmVhZEFzVGV4dCggZmlsZSApXHJcblxyXG4gICAgICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24oZSkge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBjb250ZW50ID0gZS50YXJnZXQucmVzdWx0XHJcblxyXG4gICAgICAgICAgICAgICAgc3dpdGNoKHR5cGUpe1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgJ2ltYWdlJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGltZyA9IG5ldyBJbWFnZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYoIG8uY2FsbGJhY2sgKSBvLmNhbGxiYWNrKCBpbWcsIGZuYW1lLCBmdHlwZSApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaW1nLnNyYyA9IGNvbnRlbnRcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdqc29uJzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIG8uY2FsbGJhY2sgKSBvLmNhbGxiYWNrKCBKU09OLnBhcnNlKCBjb250ZW50ICksIGZuYW1lLCBmdHlwZSApXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYoIG8uY2FsbGJhY2sgKSBvLmNhbGxiYWNrKCBjb250ZW50LCBmbmFtZSwgZnR5cGUgKVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9IGNhdGNoKGUpIHtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpXHJcbiAgICAgICAgICAgIGlmKCBvLmFsd2F5cyAmJiBvLmNhbGxiYWNrICkgby5jYWxsYmFjayggbnVsbCApXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cdHN0YXRpYyBzaG93T3BlbkZpbGVQaWNrZXJQb2x5ZmlsbCggb3B0aW9ucyApIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIik7XHJcbiAgICAgICAgICAgIGlucHV0LnR5cGUgPSBcImZpbGVcIjtcclxuICAgICAgICAgICAgaW5wdXQubXVsdGlwbGUgPSBvcHRpb25zLm11bHRpcGxlO1xyXG4gICAgICAgICAgICBpbnB1dC5hY2NlcHQgPSBvcHRpb25zLnR5cGVzXHJcbiAgICAgICAgICAgICAgICAubWFwKCh0eXBlKSA9PiB0eXBlLmFjY2VwdClcclxuICAgICAgICAgICAgICAgIC5mbGF0TWFwKChpbnN0KSA9PiBPYmplY3Qua2V5cyhpbnN0KS5mbGF0TWFwKChrZXkpID0+IGluc3Rba2V5XSkpXHJcbiAgICAgICAgICAgICAgICAuam9pbihcIixcIik7XHJcblxyXG4gICAgICAgICAgICBpbnB1dC5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoXHJcbiAgICAgICAgICAgICAgICAgICAgWy4uLmlucHV0LmZpbGVzXS5tYXAoKGZpbGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGdldEZpbGU6IGFzeW5jICgpID0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShmaWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBpbnB1dC5jbGljaygpO1xyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICBTQVZFXHJcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgc3RhdGljIGFzeW5jIHNhdmUoIG8gPSB7fSApIHtcclxuXHJcbiAgICAgICAgbGV0IHVzZVBvbHkgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYgKHR5cGVvZiB3aW5kb3cuc2hvd1NhdmVGaWxlUGlja2VyICE9PSAnZnVuY3Rpb24nKSB7XHJcbiAgICAgICAgICAgIHdpbmRvdy5zaG93U2F2ZUZpbGVQaWNrZXIgPSBGaWxlcy5zaG93U2F2ZUZpbGVQaWNrZXJQb2x5ZmlsbFxyXG4gICAgICAgICAgICB1c2VQb2x5ID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRyeSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgdHlwZSA9IG8udHlwZSB8fCAnJ1xyXG5cclxuICAgICAgICAgICAgY29uc3Qgb3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgICAgIHN1Z2dlc3RlZE5hbWU6IG8ubmFtZSB8fCAnaGVsbG8nLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogby5kYXRhIHx8ICcnXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBvcHRpb25zLnR5cGVzID0gRmlsZXMuYXV0b1R5cGVzKCB0eXBlIClcclxuICAgICAgICAgICAgb3B0aW9ucy5maW5hbFR5cGUgPSBPYmplY3Qua2V5cyggb3B0aW9ucy50eXBlc1swXS5hY2NlcHQgKVswXVxyXG4gICAgICAgICAgICBvcHRpb25zLnN1Z2dlc3RlZE5hbWUgKz0gb3B0aW9ucy50eXBlc1swXS5hY2NlcHRbb3B0aW9ucy5maW5hbFR5cGVdWzBdXHJcblxyXG5cclxuICAgICAgICAgICAgLy8gY3JlYXRlIGEgbmV3IGhhbmRsZVxyXG4gICAgICAgICAgICBjb25zdCBoYW5kbGUgPSBhd2FpdCB3aW5kb3cuc2hvd1NhdmVGaWxlUGlja2VyKCBvcHRpb25zICk7XHJcblxyXG4gICAgICAgICAgICBpZiggdXNlUG9seSApIHJldHVyblxyXG5cclxuICAgICAgICAgICAgLy8gY3JlYXRlIGEgRmlsZVN5c3RlbVdyaXRhYmxlRmlsZVN0cmVhbSB0byB3cml0ZSB0b1xyXG4gICAgICAgICAgICBjb25zdCBmaWxlID0gYXdhaXQgaGFuZGxlLmNyZWF0ZVdyaXRhYmxlKCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgYmxvYiA9IG5ldyBCbG9iKFsgb3B0aW9ucy5kYXRhIF0sIHsgdHlwZTogb3B0aW9ucy5maW5hbFR5cGUgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyB3cml0ZSBvdXIgZmlsZVxyXG4gICAgICAgICAgICBhd2FpdCBmaWxlLndyaXRlKGJsb2IpO1xyXG5cclxuICAgICAgICAgICAgLy8gY2xvc2UgdGhlIGZpbGUgYW5kIHdyaXRlIHRoZSBjb250ZW50cyB0byBkaXNrLlxyXG4gICAgICAgICAgICBhd2FpdCBmaWxlLmNsb3NlKCk7XHJcblxyXG4gICAgICAgIH0gY2F0Y2goZSkge1xyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coZSk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgc3RhdGljIHNob3dTYXZlRmlsZVBpY2tlclBvbHlmaWxsKCBvcHRpb25zICkge1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBhID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImFcIik7XHJcbiAgICAgICAgICAgIGEuZG93bmxvYWQgPSBvcHRpb25zLnN1Z2dlc3RlZE5hbWUgfHwgXCJteS1maWxlLnR4dFwiXHJcbiAgICAgICAgICAgIGxldCBibG9iID0gbmV3IEJsb2IoWyBvcHRpb25zLmRhdGEgXSwgeyB0eXBlOm9wdGlvbnMuZmluYWxUeXBlIH0pO1xyXG4gICAgICAgICAgICBhLmhyZWYgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKCBibG9iIClcclxuXHJcbiAgICAgICAgICAgIGEuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoXHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCggKCkgPT4gVVJMLnJldm9rZU9iamVjdFVSTChhLmhyZWYpLCAxMDAwIClcclxuICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgYS5jbGljaygpXHJcbiAgICAgICAgfSlcclxuICAgIH1cclxuXHJcblxyXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gIEZPTERFUiBub3QgcG9zc2libGUgaW4gcG9seVxyXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIHN0YXRpYyBhc3luYyBnZXRGb2xkZXIoKSB7XHJcblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICBcclxuICAgICAgICAgICAgY29uc3QgaGFuZGxlID0gYXdhaXQgd2luZG93LnNob3dEaXJlY3RvcnlQaWNrZXIoKTtcclxuICAgICAgICAgICAgY29uc3QgZmlsZXMgPSBbXTtcclxuICAgICAgICAgICAgZm9yIGF3YWl0IChjb25zdCBlbnRyeSBvZiBoYW5kbGUudmFsdWVzKCkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBlbnRyeS5nZXRGaWxlKCk7XHJcbiAgICAgICAgICAgICAgICBmaWxlcy5wdXNoKGZpbGUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhmaWxlcylcclxuICAgICAgICAgICAgcmV0dXJuIGZpbGVzO1xyXG5cclxuICAgICAgICB9IGNhdGNoKGUpIHtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xyXG5cclxuICAgICAgICB9XHJcbiAgICBcclxuICAgIH1cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG4gICAgXHJcblxyXG59IiwiZXhwb3J0IGNsYXNzIFYyIHtcclxuXHJcblx0Y29uc3RydWN0b3IoIHggPSAwLCB5ID0gMCApIHtcclxuXHJcblx0XHR0aGlzLnggPSB4O1xyXG5cdFx0dGhpcy55ID0geTtcclxuXHJcblx0fVxyXG5cclxuXHRzZXQgKCB4LCB5ICkge1xyXG5cclxuXHRcdHRoaXMueCA9IHg7XHJcblx0XHR0aGlzLnkgPSB5O1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblxyXG5cdH1cclxuXHJcblx0ZGl2aWRlICggdiApIHtcclxuXHJcblx0XHR0aGlzLnggLz0gdi54O1xyXG5cdFx0dGhpcy55IC89IHYueTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cclxuXHR9XHJcblxyXG5cdG11bHRpcGx5ICggdiApIHtcclxuXHJcblx0XHR0aGlzLnggKj0gdi54O1xyXG5cdFx0dGhpcy55ICo9IHYueTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cclxuXHR9XHJcblxyXG5cdG11bHRpcGx5U2NhbGFyICggc2NhbGFyICkge1xyXG5cclxuXHRcdHRoaXMueCAqPSBzY2FsYXI7XHJcblx0XHR0aGlzLnkgKj0gc2NhbGFyO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblxyXG5cdH1cclxuXHJcblx0ZGl2aWRlU2NhbGFyICggc2NhbGFyICkge1xyXG5cclxuXHRcdHJldHVybiB0aGlzLm11bHRpcGx5U2NhbGFyKCAxIC8gc2NhbGFyICk7XHJcblxyXG5cdH1cclxuXHJcblx0bGVuZ3RoICgpIHtcclxuXHJcblx0XHRyZXR1cm4gTWF0aC5zcXJ0KCB0aGlzLnggKiB0aGlzLnggKyB0aGlzLnkgKiB0aGlzLnkgKTtcclxuXHJcblx0fVxyXG5cclxuXHRhbmdsZSAoKSB7XHJcblxyXG5cdFx0Ly8gY29tcHV0ZXMgdGhlIGFuZ2xlIGluIHJhZGlhbnMgd2l0aCByZXNwZWN0IHRvIHRoZSBwb3NpdGl2ZSB4LWF4aXNcclxuXHJcblx0XHR2YXIgYW5nbGUgPSBNYXRoLmF0YW4yKCB0aGlzLnksIHRoaXMueCApO1xyXG5cclxuXHRcdGlmICggYW5nbGUgPCAwICkgYW5nbGUgKz0gMiAqIE1hdGguUEk7XHJcblxyXG5cdFx0cmV0dXJuIGFuZ2xlO1xyXG5cclxuXHR9XHJcblxyXG5cdGFkZFNjYWxhciAoIHMgKSB7XHJcblxyXG5cdFx0dGhpcy54ICs9IHM7XHJcblx0XHR0aGlzLnkgKz0gcztcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cclxuXHR9XHJcblxyXG5cdG5lZ2F0ZSAoKSB7XHJcblxyXG5cdFx0dGhpcy54ICo9IC0xO1xyXG5cdFx0dGhpcy55ICo9IC0xO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblxyXG5cdH1cclxuXHJcblx0bmVnICgpIHtcclxuXHJcblx0XHR0aGlzLnggPSAtMTtcclxuXHRcdHRoaXMueSA9IC0xO1xyXG5cdFx0cmV0dXJuIHRoaXM7XHJcblxyXG5cdH1cclxuXHJcblx0aXNaZXJvICgpIHtcclxuXHJcblx0XHRyZXR1cm4gKCB0aGlzLnggPT09IDAgJiYgdGhpcy55ID09PSAwICk7XHJcblxyXG5cdH1cclxuXHJcblx0Y29weSAoIHYgKSB7XHJcblxyXG5cdFx0dGhpcy54ID0gdi54O1xyXG5cdFx0dGhpcy55ID0gdi55O1xyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cclxuXHR9XHJcblxyXG5cdGVxdWFscyAoIHYgKSB7XHJcblxyXG5cdFx0cmV0dXJuICggKCB2LnggPT09IHRoaXMueCApICYmICggdi55ID09PSB0aGlzLnkgKSApO1xyXG5cclxuXHR9XHJcblxyXG5cdG5lYXJFcXVhbHMgKCB2LCBuICkge1xyXG5cclxuXHRcdHJldHVybiAoICggdi54LnRvRml4ZWQobikgPT09IHRoaXMueC50b0ZpeGVkKG4pICkgJiYgKCB2LnkudG9GaXhlZChuKSA9PT0gdGhpcy55LnRvRml4ZWQobikgKSApO1xyXG5cclxuXHR9XHJcblxyXG5cdGxlcnAgKCB2LCBhbHBoYSApIHtcclxuXHJcblx0XHRpZiggdiA9PT0gbnVsbCApe1xyXG5cdFx0XHR0aGlzLnggLT0gdGhpcy54ICogYWxwaGE7XHJcblx0XHQgICAgdGhpcy55IC09IHRoaXMueSAqIGFscGhhO1xyXG5cdFx0fSBlbHNlIHtcclxuXHRcdFx0dGhpcy54ICs9ICggdi54IC0gdGhpcy54ICkgKiBhbHBoYTtcclxuXHRcdCAgICB0aGlzLnkgKz0gKCB2LnkgLSB0aGlzLnkgKSAqIGFscGhhO1xyXG5cdFx0fVxyXG5cclxuXHRcdHJldHVybiB0aGlzO1xyXG5cclxuXHR9XHJcblxyXG59IiwiaW1wb3J0IHsgUm9vdHMgfSBmcm9tIFwiLi9Sb290cy5qc1wiO1xyXG5pbXBvcnQgeyBUb29scyB9IGZyb20gXCIuL1Rvb2xzLmpzXCI7XHJcbmltcG9ydCB7IFYyIH0gZnJvbSBcIi4vVjIuanNcIjtcclxuXHJcbi8qKlxyXG4gKiBAYXV0aG9yIGx0aCAvIGh0dHBzOi8vZ2l0aHViLmNvbS9sby10aFxyXG4gKi9cclxuXHJcbmV4cG9ydCBjbGFzcyBQcm90byB7XHJcbiAgY29uc3RydWN0b3IobyA9IHt9KSB7XHJcbiAgICAvLyBkaXNhYmxlIG1vdXNlIGNvbnRyb2xlXHJcbiAgICB0aGlzLmxvY2sgPSBvLmxvY2sgfHwgZmFsc2U7XHJcblxyXG4gICAgLy8gZm9yIGJ1dHRvblxyXG4gICAgdGhpcy5uZXZlcmxvY2sgPSBmYWxzZTtcclxuXHJcbiAgICAvLyBvbmx5IHNpbXBsZSBzcGFjZVxyXG4gICAgdGhpcy5pc1NwYWNlID0gby5pc1NwYWNlIHx8IGZhbHNlO1xyXG5cclxuICAgIC8vIGlmIGlzIG9uIGd1aSBvciBncm91cFxyXG4gICAgdGhpcy5tYWluID0gby5tYWluIHx8IG51bGw7XHJcbiAgICB0aGlzLmlzVUkgPSBvLmlzVUkgfHwgZmFsc2U7XHJcbiAgICB0aGlzLmdyb3VwID0gby5ncm91cCB8fCBudWxsO1xyXG5cclxuICAgIHRoaXMuaXNMaXN0ZW4gPSBmYWxzZTtcclxuXHJcbiAgICB0aGlzLnRvcCA9IDA7XHJcbiAgICB0aGlzLnl0b3AgPSAwO1xyXG5cclxuICAgIHRoaXMuZHggPSBvLmR4IHx8IDA7XHJcblxyXG4gICAgdGhpcy5pc1NlbGVjdGFibGUgPSBvLnNlbGVjdGFibGUgIT09IHVuZGVmaW5lZCA/IG8uc2VsZWN0YWJsZSA6IGZhbHNlO1xyXG4gICAgdGhpcy51bnNlbGVjdGFibGUgPVxyXG4gICAgICBvLnVuc2VsZWN0ICE9PSB1bmRlZmluZWQgPyBvLnVuc2VsZWN0IDogdGhpcy5pc1NlbGVjdGFibGU7XHJcblxyXG4gICAgdGhpcy5vbnRvcCA9IG8ub250b3AgPyBvLm9udG9wIDogZmFsc2U7IC8vICdiZWZvcmViZWdpbicgJ2FmdGVyYmVnaW4nICdiZWZvcmVlbmQnICdhZnRlcmVuZCdcclxuXHJcbiAgICB0aGlzLmNzcyA9IHRoaXMubWFpbiA/IHRoaXMubWFpbi5jc3MgOiBUb29scy5jc3M7XHJcblxyXG4gICAgdGhpcy5jb2xvcnMgPSBUb29scy5kZWZpbmVDb2xvcihcclxuICAgICAgbyxcclxuICAgICAgdGhpcy5tYWluXHJcbiAgICAgICAgPyB0aGlzLmdyb3VwXHJcbiAgICAgICAgICA/IHRoaXMuZ3JvdXAuY29sb3JzXHJcbiAgICAgICAgICA6IHRoaXMubWFpbi5jb2xvcnNcclxuICAgICAgICA6IFRvb2xzLmNvbG9yc1xyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLm92ZXJFZmZlY3QgPSB0aGlzLmNvbG9ycy5zaG93T3ZlcjtcclxuXHJcbiAgICB0aGlzLnN2Z3MgPSBUb29scy5zdmdzO1xyXG5cclxuICAgIHRoaXMuem9uZSA9IHsgeDogMCwgeTogMCwgdzogMCwgaDogMCwgZDogMCB9O1xyXG4gICAgdGhpcy5sb2NhbCA9IG5ldyBWMigpLm5lZygpO1xyXG5cclxuICAgIHRoaXMuaXNDYW52YXNPbmx5ID0gZmFsc2U7XHJcbiAgICB0aGlzLmlzU2VsZWN0ID0gZmFsc2U7XHJcblxyXG4gICAgLy8gcGVyY2VudCBvZiB0aXRsZVxyXG4gICAgdGhpcy5wID0gby5wICE9PSB1bmRlZmluZWQgPyBvLnAgOiBUb29scy5zaXplLnA7XHJcblxyXG4gICAgdGhpcy53ID0gdGhpcy5pc1VJID8gdGhpcy5tYWluLnNpemUudyA6IFRvb2xzLnNpemUudztcclxuICAgIGlmIChvLncgIT09IHVuZGVmaW5lZCkgdGhpcy53ID0gby53O1xyXG5cclxuICAgIHRoaXMuaCA9IHRoaXMuaXNVSSA/IHRoaXMubWFpbi5zaXplLmggOiBUb29scy5zaXplLmg7XHJcbiAgICBpZiAoby5oICE9PSB1bmRlZmluZWQpIHRoaXMuaCA9IG8uaDtcclxuICAgIGlmICghdGhpcy5pc1NwYWNlKSB0aGlzLmggPSB0aGlzLmggPCAxMSA/IDExIDogdGhpcy5oO1xyXG4gICAgZWxzZSB0aGlzLmxvY2sgPSB0cnVlO1xyXG5cclxuICAgIC8vIGRlY2FsZSBmb3IgY2FudmFzIG9ubHlcclxuICAgIHRoaXMuZncgPSBvLmZ3IHx8IDA7XHJcblxyXG4gICAgdGhpcy5hdXRvV2lkdGggPSBvLmF1dG8gfHwgdHJ1ZTsgLy8gYXV0byB3aWR0aCBvciBmbGV4XHJcbiAgICB0aGlzLmlzT3BlbiA9IGZhbHNlOyAvL2ZhbHNlLy8gb3BlbiBzdGF0dVxyXG5cclxuICAgIC8vIHJhZGl1cyBmb3IgdG9vbGJveFxyXG4gICAgdGhpcy5yYWRpdXMgPSBvLnJhZGl1cyB8fCB0aGlzLmNvbG9ycy5yYWRpdXM7XHJcblxyXG4gICAgdGhpcy50cmFuc2l0aW9uID0gby50cmFuc2l0aW9uIHx8IFRvb2xzLnRyYW5zaXRpb247XHJcblxyXG4gICAgLy8gb25seSBmb3IgbnVtYmVyXHJcbiAgICB0aGlzLmlzTnVtYmVyID0gZmFsc2U7XHJcbiAgICB0aGlzLm5vTmVnID0gby5ub05lZyB8fCBmYWxzZTtcclxuICAgIHRoaXMuYWxsRXF1YWwgPSBvLmFsbEVxdWFsIHx8IGZhbHNlO1xyXG5cclxuICAgIC8vIG9ubHkgbW9zdCBzaW1wbGVcclxuICAgIHRoaXMubW9ubyA9IGZhbHNlO1xyXG5cclxuICAgIC8vIHN0b3AgbGlzdGVuaW5nIGZvciBlZGl0IHNsaWRlIHRleHRcclxuICAgIHRoaXMuaXNFZGl0ID0gZmFsc2U7XHJcblxyXG4gICAgLy8gbm8gdGl0bGVcclxuICAgIHRoaXMuc2ltcGxlID0gby5zaW1wbGUgfHwgZmFsc2U7XHJcbiAgICBpZiAodGhpcy5zaW1wbGUpIHRoaXMuc2EgPSAwO1xyXG5cclxuICAgIC8vIGRlZmluZSBvYmogc2l6ZVxyXG4gICAgdGhpcy5zZXRTaXplKHRoaXMudyk7XHJcblxyXG4gICAgLy8gdGl0bGUgc2l6ZVxyXG4gICAgaWYgKG8uc2EgIT09IHVuZGVmaW5lZCkgdGhpcy5zYSA9IG8uc2E7XHJcbiAgICBpZiAoby5zYiAhPT0gdW5kZWZpbmVkKSB0aGlzLnNiID0gby5zYjtcclxuICAgIGlmICh0aGlzLnNpbXBsZSkgdGhpcy5zYiA9IHRoaXMudyAtIHRoaXMuc2E7XHJcblxyXG4gICAgLy8gbGFzdCBudW1iZXIgc2l6ZSBmb3Igc2xpZGVcclxuICAgIHRoaXMuc2MgPSBvLnNjID09PSB1bmRlZmluZWQgPyA0NyA6IG8uc2M7XHJcblxyXG4gICAgLy8gZm9yIGxpc3RlbmluZyBvYmplY3RcclxuICAgIHRoaXMub2JqZWN0TGluayA9IG51bGw7XHJcbiAgICB0aGlzLmlzU2VuZCA9IGZhbHNlO1xyXG4gICAgdGhpcy5vYmplY3RLZXkgPSBudWxsO1xyXG5cclxuICAgIHRoaXMudHh0ID0gby5uYW1lIHx8IFwiXCI7XHJcbiAgICB0aGlzLm5hbWUgPSBvLnJlbmFtZSB8fCB0aGlzLnR4dDtcclxuICAgIHRoaXMudGFyZ2V0ID0gby50YXJnZXQgfHwgbnVsbDtcclxuXHJcbiAgICAvLyBjYWxsYmFja1xyXG4gICAgdGhpcy5jYWxsYmFjayA9IG8uY2FsbGJhY2sgPT09IHVuZGVmaW5lZCA/IG51bGwgOiBvLmNhbGxiYWNrO1xyXG4gICAgdGhpcy5lbmRDYWxsYmFjayA9IG51bGw7XHJcbiAgICB0aGlzLm9wZW5DYWxsYmFjayA9IG8ub3BlbkNhbGxiYWNrID09PSB1bmRlZmluZWQgPyBudWxsIDogby5vcGVuQ2FsbGJhY2s7XHJcbiAgICB0aGlzLmNsb3NlQ2FsbGJhY2sgPSBvLmNsb3NlQ2FsbGJhY2sgPT09IHVuZGVmaW5lZCA/IG51bGwgOiBvLmNsb3NlQ2FsbGJhY2s7XHJcblxyXG4gICAgLy8gaWYgbm8gY2FsbGJhY2sgdGFrZSBvbmUgZnJvbSBncm91cCBvciBndWlcclxuICAgIGlmICh0aGlzLmNhbGxiYWNrID09PSBudWxsICYmIHRoaXMuaXNVSSAmJiB0aGlzLm1haW4uY2FsbGJhY2sgIT09IG51bGwpIHtcclxuICAgICAgdGhpcy5jYWxsYmFjayA9IHRoaXMuZ3JvdXAgPyB0aGlzLmdyb3VwLmNhbGxiYWNrIDogdGhpcy5tYWluLmNhbGxiYWNrO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGVsZW1lbnRzXHJcbiAgICB0aGlzLmMgPSBbXTtcclxuXHJcbiAgICAvLyBzdHlsZVxyXG4gICAgdGhpcy5zID0gW107XHJcblxyXG4gICAgdGhpcy51c2VGbGV4ID0gdGhpcy5pc1VJID8gdGhpcy5tYWluLnVzZUZsZXggOiBmYWxzZTtcclxuICAgIGxldCBmbGV4aWJsZSA9IHRoaXMudXNlRmxleFxyXG4gICAgICA/IFwiZGlzcGxheTpmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyOyBhbGlnbi1pdGVtczpjZW50ZXI7IHRleHQtYWxpZ246Y2VudGVyOyBmbGV4OiAxIDEwMCU7XCJcclxuICAgICAgOiBcImZsb2F0OmxlZnQ7XCI7XHJcblxyXG4gICAgdGhpcy5jWzBdID0gVG9vbHMuZG9tKFxyXG4gICAgICBcImRpdlwiLFxyXG4gICAgICB0aGlzLmNzcy5iYXNpYyArIGZsZXhpYmxlICsgXCJwb3NpdGlvbjpyZWxhdGl2ZTsgaGVpZ2h0OjIwcHg7XCJcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5zWzBdID0gdGhpcy5jWzBdLnN0eWxlO1xyXG5cclxuICAgIC8vIGJvdHRvbSBtYXJnaW5cclxuICAgIHRoaXMubWFyZ2luID0gdGhpcy5jb2xvcnMuc3k7XHJcbiAgICB0aGlzLm10b3AgPSAwO1xyXG4gICAgbGV0IG1hcmdpbkRpdiA9IFRvb2xzLmlzRGl2aWQodGhpcy5tYXJnaW4pO1xyXG5cclxuICAgIGlmICh0aGlzLmlzVUkgJiYgdGhpcy5tYXJnaW4pIHtcclxuICAgICAgdGhpcy5zWzBdLmJveFNpemluZyA9IFwiY29udGVudC1ib3hcIjtcclxuICAgICAgaWYgKG1hcmdpbkRpdikge1xyXG4gICAgICAgIHRoaXMubXRvcCA9IHRoaXMubWFyZ2luICogMC41O1xyXG4gICAgICAgIC8vdGhpcy5zWzBdLmJvcmRlclRvcCA9ICcke3RoaXMubXRvcH1weCBzb2xpZCB0cmFuc3BhcmVudCdcclxuICAgICAgICAvL2NvbnNvbGUubG9nKGAke3RoaXMubXRvcH1weCBzb2xpZCB0cmFuc3BhcmVudGApXHJcbiAgICAgICAgdGhpcy5zWzBdLmJvcmRlclRvcCA9IHRoaXMubXRvcCArIFwicHggc29saWQgdHJhbnNwYXJlbnRcIjtcclxuICAgICAgICB0aGlzLnNbMF0uYm9yZGVyQm90dG9tID0gdGhpcy5tdG9wICsgXCJweCBzb2xpZCB0cmFuc3BhcmVudFwiO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuc1swXS5ib3JkZXJCb3R0b20gPSB0aGlzLm1hcmdpbiArIFwicHggc29saWQgdHJhbnNwYXJlbnRcIjtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIHdpdGggdGl0bGVcclxuICAgIGlmICghdGhpcy5zaW1wbGUpIHtcclxuICAgICAgdGhpcy5jWzFdID0gVG9vbHMuZG9tKFwiZGl2XCIsIHRoaXMuY3NzLnR4dCArIHRoaXMuY3NzLm1pZGRsZSk7XHJcbiAgICAgIHRoaXMuc1sxXSA9IHRoaXMuY1sxXS5zdHlsZTtcclxuICAgICAgdGhpcy5jWzFdLnRleHRDb250ZW50ID0gdGhpcy5uYW1lO1xyXG4gICAgICB0aGlzLnNbMV0uY29sb3IgPSB0aGlzLmxvY2sgPyB0aGlzLmNvbG9ycy50aXRsZW9mZiA6IHRoaXMuY29sb3JzLnRpdGxlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvLnBvcykge1xyXG4gICAgICB0aGlzLnNbMF0ucG9zaXRpb24gPSBcImFic29sdXRlXCI7XHJcbiAgICAgIGZvciAobGV0IHAgaW4gby5wb3MpIHtcclxuICAgICAgICB0aGlzLnNbMF1bcF0gPSBvLnBvc1twXTtcclxuICAgICAgfVxyXG4gICAgICB0aGlzLm1vbm8gPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChvLmNzcykgdGhpcy5zWzBdLmNzc1RleHQgPSBvLmNzcztcclxuICB9XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBtYWtlIHRoZSBub2RlXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBpbml0KCkge1xyXG4gICAgdGhpcy55dG9wID0gdGhpcy50b3AgKyB0aGlzLm10b3A7XHJcblxyXG4gICAgdGhpcy56b25lLmggPSB0aGlzLmggKyB0aGlzLm1hcmdpbjtcclxuICAgIHRoaXMuem9uZS53ID0gdGhpcy53O1xyXG5cclxuICAgIGxldCBzID0gdGhpcy5zOyAvLyBzdHlsZSBjYWNoZVxyXG4gICAgbGV0IGMgPSB0aGlzLmM7IC8vIGRpdiBjYWNoXHJcblxyXG4gICAgc1swXS5oZWlnaHQgPSB0aGlzLmggKyBcInB4XCI7XHJcblxyXG4gICAgaWYgKHRoaXMuaXNVSSkgc1swXS5iYWNrZ3JvdW5kID0gdGhpcy5jb2xvcnMuYmFja2dyb3VuZDtcclxuXHJcbiAgICBpZiAoIXRoaXMuYXV0b1dpZHRoICYmIHRoaXMudXNlRmxleCkge1xyXG4gICAgICBzWzBdLmZsZXggPSBcIjEgMCBhdXRvXCI7XHJcbiAgICAgIHNbMF0ubWluV2lkdGggPSB0aGlzLm1pbncgKyBcInB4XCI7XHJcbiAgICAgIHNbMF0udGV4dEFsaWduID0gXCJjZW50ZXJcIjtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmICh0aGlzLmlzVUkpIHNbMF0ud2lkdGggPSBcIjEwMCVcIjtcclxuICAgIH1cclxuXHJcbiAgICAvL2lmKCB0aGlzLmF1dG9IZWlnaHQgKSBzWzBdLnRyYW5zaXRpb24gPSAnaGVpZ2h0IDAuMDFzIGVhc2Utb3V0JztcclxuICAgIGlmIChjWzFdICE9PSB1bmRlZmluZWQgJiYgdGhpcy5hdXRvV2lkdGgpIHtcclxuICAgICAgc1sxXSA9IGNbMV0uc3R5bGU7XHJcbiAgICAgIHNbMV0udG9wID0gMSArIFwicHhcIjtcclxuICAgICAgc1sxXS5oZWlnaHQgPSB0aGlzLmggLSAyICsgXCJweFwiO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBmcmFnID0gVG9vbHMuZnJhZztcclxuXHJcbiAgICBmb3IgKGxldCBpID0gMSwgbG5nID0gYy5sZW5ndGg7IGkgIT09IGxuZzsgaSsrKSB7XHJcbiAgICAgIGlmIChjW2ldICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICBmcmFnLmFwcGVuZENoaWxkKGNbaV0pO1xyXG4gICAgICAgIHNbaV0gPSBjW2ldLnN0eWxlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IHBwID1cclxuICAgICAgdGhpcy50YXJnZXQgIT09IG51bGxcclxuICAgICAgICA/IHRoaXMudGFyZ2V0XHJcbiAgICAgICAgOiB0aGlzLmlzVUlcclxuICAgICAgICA/IHRoaXMubWFpbi5pbm5lclxyXG4gICAgICAgIDogZG9jdW1lbnQuYm9keTtcclxuXHJcbiAgICBpZiAodGhpcy5vbnRvcCkgcHAuaW5zZXJ0QWRqYWNlbnRFbGVtZW50KFwiYWZ0ZXJiZWdpblwiLCBjWzBdKTtcclxuICAgIGVsc2UgcHAuYXBwZW5kQ2hpbGQoY1swXSk7XHJcblxyXG4gICAgY1swXS5hcHBlbmRDaGlsZChmcmFnKTtcclxuXHJcbiAgICB0aGlzLnJTaXplKCk7XHJcblxyXG4gICAgLy8gISBzb2xvIHByb3RvXHJcbiAgICBpZiAoIXRoaXMuaXNVSSkge1xyXG4gICAgICB0aGlzLmNbMF0uc3R5bGUucG9pbnRlckV2ZW50cyA9IFwiYXV0b1wiO1xyXG4gICAgICBSb290cy5hZGQodGhpcyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBhZGRUcmFuc2l0aW9uKCkge1xyXG4gICAgaWYgKHRoaXMuYmFzZUggJiYgdGhpcy50cmFuc2l0aW9uICYmIHRoaXMuaXNVSSkge1xyXG4gICAgICB0aGlzLmNbMF0uc3R5bGUudHJhbnNpdGlvbiA9IFwiaGVpZ2h0IFwiICsgdGhpcy50cmFuc2l0aW9uICsgXCJzIGVhc2Utb3V0XCI7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBmcm9tIFRvb2xzXHJcblxyXG4gIGRvbSh0eXBlLCBjc3MsIG9iaiwgZG9tLCBpZCkge1xyXG4gICAgcmV0dXJuIFRvb2xzLmRvbSh0eXBlLCBjc3MsIG9iaiwgZG9tLCBpZCk7XHJcbiAgfVxyXG5cclxuICBzZXRTdmcoZG9tLCB0eXBlLCB2YWx1ZSwgaWQsIGlkMikge1xyXG4gICAgVG9vbHMuc2V0U3ZnKGRvbSwgdHlwZSwgdmFsdWUsIGlkLCBpZDIpO1xyXG4gIH1cclxuXHJcbiAgc2V0Q3NzKGRvbSwgY3NzKSB7XHJcbiAgICBUb29scy5zZXRDc3MoZG9tLCBjc3MpO1xyXG4gIH1cclxuXHJcbiAgY2xhbXAodmFsdWUsIG1pbiwgbWF4KSB7XHJcbiAgICByZXR1cm4gVG9vbHMuY2xhbXAodmFsdWUsIG1pbiwgbWF4KTtcclxuICB9XHJcblxyXG4gIGdldENvbG9yUmluZygpIHtcclxuICAgIGlmICghVG9vbHMuY29sb3JSaW5nKSBUb29scy5tYWtlQ29sb3JSaW5nKCk7XHJcbiAgICByZXR1cm4gVG9vbHMuY2xvbmUoVG9vbHMuY29sb3JSaW5nKTtcclxuICB9XHJcblxyXG4gIGdldEpveXN0aWNrKG1vZGVsKSB7XHJcbiAgICBpZiAoIVRvb2xzW1wiam95c3RpY2tfXCIgKyBtb2RlbF0pIFRvb2xzLm1ha2VKb3lzdGljayhtb2RlbCk7XHJcbiAgICByZXR1cm4gVG9vbHMuY2xvbmUoVG9vbHNbXCJqb3lzdGlja19cIiArIG1vZGVsXSk7XHJcbiAgfVxyXG5cclxuICBnZXRDaXJjdWxhcihtb2RlbCkge1xyXG4gICAgaWYgKCFUb29scy5jaXJjdWxhcikgVG9vbHMubWFrZUNpcmN1bGFyKG1vZGVsKTtcclxuICAgIHJldHVybiBUb29scy5jbG9uZShUb29scy5jaXJjdWxhcik7XHJcbiAgfVxyXG5cclxuICBnZXRLbm9iKG1vZGVsKSB7XHJcbiAgICBpZiAoIVRvb2xzLmtub2IpIFRvb2xzLm1ha2VLbm9iKG1vZGVsKTtcclxuICAgIHJldHVybiBUb29scy5jbG9uZShUb29scy5rbm9iKTtcclxuICB9XHJcblxyXG4gIGdldFBhZDJkKG1vZGVsKSB7XHJcbiAgICBpZiAoIVRvb2xzLnBhZDJkKSBUb29scy5tYWtlUGFkKG1vZGVsKTtcclxuICAgIHJldHVybiBUb29scy5jbG9uZShUb29scy5wYWQyZCk7XHJcbiAgfVxyXG5cclxuICAvLyBmcm9tIFJvb3RzXHJcblxyXG4gIGN1cnNvcihuYW1lKSB7XHJcbiAgICBSb290cy5jdXJzb3IobmFtZSk7XHJcbiAgfVxyXG5cclxuICAvLy8vLy8vLy9cclxuXHJcbiAgdXBkYXRlKCkge31cclxuXHJcbiAgcmVzZXQoKSB7fVxyXG5cclxuICAvLy8vLy8vLy9cclxuXHJcbiAgY29udGVudCgpIHtcclxuICAgIHJldHVybiB0aGlzLmNbMF07XHJcbiAgfVxyXG5cclxuICBnZXREb20oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5jWzBdO1xyXG4gIH1cclxuXHJcbiAgdWlvdXQoKSB7XHJcbiAgICBpZiAodGhpcy5sb2NrKSByZXR1cm47XHJcbiAgICBpZiAoIXRoaXMub3ZlckVmZmVjdCkgcmV0dXJuO1xyXG4gICAgaWYgKHRoaXMucykgdGhpcy5zWzBdLmJhY2tncm91bmQgPSB0aGlzLmNvbG9ycy5iYWNrZ3JvdW5kO1xyXG4gIH1cclxuXHJcbiAgdWlvdmVyKCkge1xyXG4gICAgaWYgKHRoaXMubG9jaykgcmV0dXJuO1xyXG4gICAgaWYgKCF0aGlzLm92ZXJFZmZlY3QpIHJldHVybjtcclxuICAgIGlmICh0aGlzLnMpIHRoaXMuc1swXS5iYWNrZ3JvdW5kID0gdGhpcy5jb2xvcnMuYmFja2dyb3VuZE92ZXI7XHJcbiAgfVxyXG5cclxuICByZW5hbWUocykge1xyXG4gICAgaWYgKHRoaXMuY1sxXSAhPT0gdW5kZWZpbmVkKSB0aGlzLmNbMV0udGV4dENvbnRlbnQgPSBzO1xyXG4gIH1cclxuXHJcbiAgbGlzdGVuKCkge1xyXG4gICAgdGhpcy5pc0xpc3RlbiA9IFJvb3RzLmFkZExpc3Rlbih0aGlzKTtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgbGlzdGVuaW5nKCkge1xyXG4gICAgLy8gbW9kaWZpZWQgYnkgRmVkZW1hcmlub1xyXG4gICAgaWYgKHRoaXMub2JqZWN0TGluayA9PT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgaWYgKHRoaXMuaXNTZW5kKSByZXR1cm47XHJcbiAgICBpZiAodGhpcy5pc0VkaXQpIHJldHVybjtcclxuICAgIC8vIGNoZWNrIGlmIHZhbHVlIGhhcyBjaGFuZ2VkXHJcbiAgICBsZXQgaGFzQ2hhbmdlZCA9IHRoaXMuc2V0VmFsdWUodGhpcy5vYmplY3RMaW5rW3RoaXMub2JqZWN0S2V5XSk7XHJcbiAgICByZXR1cm4gaGFzQ2hhbmdlZDtcclxuICB9XHJcblxyXG4gIHNldFZhbHVlKHYpIHtcclxuICAgIGNvbnN0IG9sZCA9IHRoaXMudmFsdWU7XHJcbiAgICBpZiAodGhpcy5pc051bWJlcikgdGhpcy52YWx1ZSA9IHRoaXMubnVtVmFsdWUodik7XHJcbiAgICAvL2Vsc2UgaWYoIHYgaW5zdGFuY2VvZiBBcnJheSAmJiB2Lmxlbmd0aCA9PT0gMSApIHYgPSB2WzBdO1xyXG4gICAgZWxzZSB0aGlzLnZhbHVlID0gdjtcclxuICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICBsZXQgaGFzQ2hhbmdlZCA9IGZhbHNlO1xyXG4gICAgaWYgKG9sZCAhPT0gdGhpcy52YWx1ZSkge1xyXG4gICAgICBoYXNDaGFuZ2VkID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gaGFzQ2hhbmdlZDtcclxuICB9XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyB1cGRhdGUgZXZlcnkgY2hhbmdlXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBvbkNoYW5nZShmKSB7XHJcbiAgICBpZiAodGhpcy5pc1NwYWNlKSByZXR1cm47XHJcbiAgICB0aGlzLmNhbGxiYWNrID0gZiB8fCBudWxsO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gdXBkYXRlIG9ubHkgb24gZW5kXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBvbkZpbmlzaENoYW5nZShmKSB7XHJcbiAgICBpZiAodGhpcy5pc1NwYWNlKSByZXR1cm47XHJcbiAgICB0aGlzLmNhbGxiYWNrID0gbnVsbDtcclxuICAgIHRoaXMuZW5kQ2FsbGJhY2sgPSBmO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gZXZlbnQgb24gb3BlbiBjbG9zZVxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgb25PcGVuKGYpIHtcclxuICAgIHRoaXMub3BlbkNhbGxiYWNrID0gZjtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgb25DbG9zZShmKSB7XHJcbiAgICB0aGlzLmNsb3NlQ2FsbGJhY2sgPSBmO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gIHNlbmQgYmFjayB2YWx1ZVxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgc2VuZCh2KSB7XHJcbiAgICB2ID0gdiB8fCB0aGlzLnZhbHVlO1xyXG4gICAgaWYgKHYgaW5zdGFuY2VvZiBBcnJheSAmJiB2Lmxlbmd0aCA9PT0gMSkgdiA9IHZbMF07XHJcblxyXG4gICAgdGhpcy5pc1NlbmQgPSB0cnVlO1xyXG4gICAgaWYgKHRoaXMub2JqZWN0TGluayAhPT0gbnVsbCkgdGhpcy5vYmplY3RMaW5rW3RoaXMub2JqZWN0S2V5XSA9IHY7XHJcbiAgICBpZiAodGhpcy5jYWxsYmFjaykgdGhpcy5jYWxsYmFjayh2LCB0aGlzLm9iamVjdEtleSk7XHJcbiAgICB0aGlzLmlzU2VuZCA9IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgc2VuZEVuZCh2KSB7XHJcbiAgICB2ID0gdiB8fCB0aGlzLnZhbHVlO1xyXG4gICAgaWYgKHYgaW5zdGFuY2VvZiBBcnJheSAmJiB2Lmxlbmd0aCA9PT0gMSkgdiA9IHZbMF07XHJcblxyXG4gICAgaWYgKHRoaXMuZW5kQ2FsbGJhY2spIHRoaXMuZW5kQ2FsbGJhY2sodik7XHJcbiAgICBpZiAodGhpcy5vYmplY3RMaW5rICE9PSBudWxsKSB0aGlzLm9iamVjdExpbmtbdGhpcy5vYmplY3RLZXldID0gdjtcclxuICB9XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBjbGVhciBub2RlXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBkaXNwb3NlKCkge1xyXG4gICAgaWYgKHRoaXMuaXNMaXN0ZW4pIFJvb3RzLnJlbW92ZUxpc3Rlbih0aGlzKTtcclxuXHJcbiAgICBUb29scy5jbGVhcih0aGlzLmNbMF0pO1xyXG5cclxuICAgIGlmICh0aGlzLnRhcmdldCAhPT0gbnVsbCkge1xyXG4gICAgICBpZiAodGhpcy5ncm91cCAhPT0gbnVsbCkgdGhpcy5ncm91cC5jbGVhck9uZSh0aGlzKTtcclxuICAgICAgZWxzZSB0aGlzLnRhcmdldC5yZW1vdmVDaGlsZCh0aGlzLmNbMF0pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaWYgKHRoaXMuaXNVSSkgdGhpcy5tYWluLmNsZWFyT25lKHRoaXMpO1xyXG4gICAgICBlbHNlIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGhpcy5jWzBdKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXRoaXMuaXNVSSkgUm9vdHMucmVtb3ZlKHRoaXMpO1xyXG5cclxuICAgIHRoaXMuYyA9IG51bGw7XHJcbiAgICB0aGlzLnMgPSBudWxsO1xyXG4gICAgdGhpcy5jYWxsYmFjayA9IG51bGw7XHJcbiAgICB0aGlzLnRhcmdldCA9IG51bGw7XHJcbiAgICB0aGlzLmlzTGlzdGVuID0gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBjbGVhcigpIHt9XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBjaGFuZ2Ugc2l6ZVxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgZ2V0V2lkdGgoKSB7XHJcbiAgICBsZXQgbncgPSBSb290cy5nZXRXaWR0aCh0aGlzKTtcclxuICAgIGlmIChudykgdGhpcy53ID0gbnc7XHJcbiAgfVxyXG5cclxuICBzZXRTaXplKHN4KSB7XHJcbiAgICBpZiAoIXRoaXMuYXV0b1dpZHRoKSByZXR1cm47XHJcblxyXG4gICAgdGhpcy53ID0gc3g7XHJcblxyXG4gICAgaWYgKHRoaXMuc2ltcGxlKSB7XHJcbiAgICAgIHRoaXMuc2IgPSB0aGlzLncgLSB0aGlzLnNhO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgbGV0IHBwID0gdGhpcy53ICogKHRoaXMucCAvIDEwMCk7XHJcbiAgICAgIC8vdGhpcy5zYSA9IE1hdGguZmxvb3IoIHBwICsgMTAgKVxyXG4gICAgICAvL3RoaXMuc2IgPSBNYXRoLmZsb29yKCB0aGlzLncgLSBwcCAtIDIwIClcclxuICAgICAgdGhpcy5zYSA9IE1hdGguZmxvb3IocHAgKyA4KTtcclxuICAgICAgdGhpcy5zYiA9IE1hdGguZmxvb3IodGhpcy53IC0gcHAgLSAxNik7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByU2l6ZSgpIHtcclxuICAgIGlmICghdGhpcy5hdXRvV2lkdGgpIHJldHVybjtcclxuICAgIGlmICghdGhpcy5pc1VJKSB0aGlzLnNbMF0ud2lkdGggPSB0aGlzLncgKyBcInB4XCI7XHJcbiAgICBpZiAoIXRoaXMuc2ltcGxlKSB0aGlzLnNbMV0ud2lkdGggPSB0aGlzLnNhICsgXCJweFwiO1xyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIGZvciBudW1lcmljIHZhbHVlXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBzZXRUeXBlTnVtYmVyKG8pIHtcclxuICAgIHRoaXMuaXNOdW1iZXIgPSB0cnVlO1xyXG5cclxuICAgIHRoaXMudmFsdWUgPSAwO1xyXG4gICAgaWYgKG8udmFsdWUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICBpZiAodHlwZW9mIG8udmFsdWUgPT09IFwic3RyaW5nXCIpIHRoaXMudmFsdWUgPSBvLnZhbHVlICogMTtcclxuICAgICAgZWxzZSB0aGlzLnZhbHVlID0gby52YWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLm1pbiA9IG8ubWluID09PSB1bmRlZmluZWQgPyAtSW5maW5pdHkgOiBvLm1pbjtcclxuICAgIHRoaXMubWF4ID0gby5tYXggPT09IHVuZGVmaW5lZCA/IEluZmluaXR5IDogby5tYXg7XHJcbiAgICB0aGlzLnByZWNpc2lvbiA9IG8ucHJlY2lzaW9uID09PSB1bmRlZmluZWQgPyAyIDogby5wcmVjaXNpb247XHJcblxyXG4gICAgbGV0IHM7XHJcblxyXG4gICAgc3dpdGNoICh0aGlzLnByZWNpc2lvbikge1xyXG4gICAgICBjYXNlIDA6XHJcbiAgICAgICAgcyA9IDE7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgMTpcclxuICAgICAgICBzID0gMC4xO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDI6XHJcbiAgICAgICAgcyA9IDAuMDE7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgMzpcclxuICAgICAgICBzID0gMC4wMDE7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgNDpcclxuICAgICAgICBzID0gMC4wMDAxO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDU6XHJcbiAgICAgICAgcyA9IDAuMDAwMDE7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgNjpcclxuICAgICAgICBzID0gMC4wMDAwMDE7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5zdGVwID0gby5zdGVwID09PSB1bmRlZmluZWQgPyBzIDogby5zdGVwO1xyXG4gICAgdGhpcy5yYW5nZSA9IHRoaXMubWF4IC0gdGhpcy5taW47XHJcbiAgICB0aGlzLnZhbHVlID0gdGhpcy5udW1WYWx1ZSh0aGlzLnZhbHVlKTtcclxuICB9XHJcblxyXG4gIG51bVZhbHVlKG4pIHtcclxuICAgIGlmICh0aGlzLm5vTmVnKSBuID0gTWF0aC5hYnMobik7XHJcbiAgICByZXR1cm4gKFxyXG4gICAgICBNYXRoLm1pbih0aGlzLm1heCwgTWF0aC5tYXgodGhpcy5taW4sIG4pKS50b0ZpeGVkKHRoaXMucHJlY2lzaW9uKSAqIDFcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBFVkVOVFMgREVGQVVMVFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgaGFuZGxlRXZlbnQoZSkge1xyXG4gICAgaWYgKHRoaXMubG9jaykgcmV0dXJuO1xyXG4gICAgaWYgKHRoaXMubmV2ZXJsb2NrKSBSb290cy5sb2NrID0gZmFsc2U7XHJcbiAgICBpZiAoIXRoaXNbZS50eXBlXSlcclxuICAgICAgcmV0dXJuIGNvbnNvbGUuZXJyb3IoZS50eXBlLCBcInRoaXMgdHlwZSBvZiBldmVudCBubyBleGlzdGUgIVwiKTtcclxuXHJcbiAgICAvLyBUT0RPICEhISFcclxuXHJcbiAgICAvL2lmKCB0aGlzLm1hcmdpbkRpdiApIHouZCAtPSB0aGlzLm1hcmdpbiAqIDAuNVxyXG5cclxuICAgIC8vaWYoIHRoaXMubWFyZ2luRGl2ICkgZS5jbGllbnRZIC09IHRoaXMubWFyZ2luICogMC41XHJcbiAgICAvL2lmKCB0aGlzLmdyb3VwICYmIHRoaXMuZ3JvdXAubWFyZ2luRGl2ICkgZS5jbGllbnRZIC09IHRoaXMuZ3JvdXAubWFyZ2luICogMC41XHJcblxyXG4gICAgcmV0dXJuIHRoaXNbZS50eXBlXShlKTtcclxuICB9XHJcblxyXG4gIHdoZWVsKGUpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbiAgbW91c2Vkb3duKGUpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbiAgbW91c2Vtb3ZlKGUpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbiAgbW91c2V1cChlKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG4gIGtleWRvd24oZSkge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuICBrZXl1cChlKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gb2JqZWN0IHJlZmVyZW5jeVxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgc2V0UmVmZXJlbmN5KG9iaiwga2V5KSB7XHJcbiAgICB0aGlzLm9iamVjdExpbmsgPSBvYmo7XHJcbiAgICB0aGlzLm9iamVjdEtleSA9IGtleTtcclxuICB9XHJcblxyXG4gIGRpc3BsYXkodiA9IGZhbHNlKSB7XHJcbiAgICB0aGlzLnNbMF0udmlzaWJpbGl0eSA9IHYgPyBcInZpc2libGVcIiA6IFwiaGlkZGVuXCI7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gcmVzaXplIGhlaWdodFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgb3BlbigpIHtcclxuICAgIGlmICh0aGlzLmlzT3BlbikgcmV0dXJuO1xyXG4gICAgdGhpcy5pc09wZW4gPSB0cnVlO1xyXG4gICAgUm9vdHMubmVlZFJlc2l6ZSA9IHRydWU7XHJcbiAgICBpZiAodGhpcy5vcGVuQ2FsbGJhY2spIHRoaXMub3BlbkNhbGxiYWNrKCk7XHJcbiAgfVxyXG5cclxuICBjbG9zZSgpIHtcclxuICAgIGlmICghdGhpcy5pc09wZW4pIHJldHVybjtcclxuICAgIHRoaXMuaXNPcGVuID0gZmFsc2U7XHJcbiAgICBSb290cy5uZWVkUmVzaXplID0gdHJ1ZTtcclxuICAgIGlmICh0aGlzLmNsb3NlQ2FsbGJhY2spIHRoaXMuY2xvc2VDYWxsYmFjaygpO1xyXG4gIH1cclxuXHJcbiAgbmVlZFpvbmUoKSB7XHJcbiAgICBSb290cy5uZWVkUmVab25lID0gdHJ1ZTtcclxuICB9XHJcblxyXG4gIHJlem9uZSgpIHtcclxuICAgIFJvb3RzLm5lZWRSZVpvbmUgPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICBJTlBVVFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgc2VsZWN0KCkge31cclxuXHJcbiAgdW5zZWxlY3QoKSB7fVxyXG5cclxuICBzZXRJbnB1dChJbnB1dCkge1xyXG4gICAgUm9vdHMuc2V0SW5wdXQoSW5wdXQsIHRoaXMpO1xyXG4gIH1cclxuXHJcbiAgdXBJbnB1dCh4LCBkb3duKSB7XHJcbiAgICByZXR1cm4gUm9vdHMudXBJbnB1dCh4LCBkb3duKTtcclxuICB9XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBzcGVjaWFsIGl0ZW1cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIHNlbGVjdGVkKGIpIHtcclxuICAgIHRoaXMuaXNTZWxlY3QgPSBiIHx8IGZhbHNlO1xyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEJvb2wgZXh0ZW5kcyBQcm90byB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoIG8gPSB7fSApIHtcclxuXHJcbiAgICAgICAgc3VwZXIoIG8gKVxyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMudmFsdWUgPSBvLnZhbHVlIHx8IGZhbHNlXHJcbiAgICAgICAgdGhpcy5tb2RlbCA9IG8ubW9kZSAhPT0gdW5kZWZpbmVkID8gby5tb2RlIDogMFxyXG5cclxuICAgICAgICB0aGlzLm9uTmFtZSA9IG8ucmVuYW1lIHx8IHRoaXMudHh0XHJcbiAgICAgICAgaWYoIG8ub25OYW1lICkgby5vbm5hbWUgPSBvLm9uTmFtZVxyXG4gICAgICAgIGlmKCBvLm9ubmFtZSApIHRoaXMub25OYW1lID0gby5vbm5hbWVcclxuXHJcbiAgICAgICAgdGhpcy5pbmggPSBvLmluaCB8fCBNYXRoLmZsb29yKCB0aGlzLmgqMC44IClcclxuICAgICAgICB0aGlzLmludyA9IG8uaW53IHx8IDM2XHJcblxyXG4gICAgICAgIGxldCBjYyA9IHRoaXMuY29sb3JzXHJcbiAgICAgICBcclxuICAgICAgICBpZiggdGhpcy5tb2RlbCA9PT0gMCApe1xyXG4gICAgICAgICAgICBsZXQgdCA9IE1hdGguZmxvb3IodGhpcy5oKjAuNSktKCh0aGlzLmluaC0yKSowLjUpO1xyXG4gICAgICAgICAgICB0aGlzLmNbMl0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLmJhc2ljICsgJ2JhY2tncm91bmQ6JysgY2MuaW5wdXRCZyArJzsgaGVpZ2h0OicrKHRoaXMuaW5oLTIpKydweDsgd2lkdGg6Jyt0aGlzLmludysncHg7IHRvcDonK3QrJ3B4OyBib3JkZXItcmFkaXVzOjEwcHg7IGJvcmRlcjoycHggc29saWQgJysgY2MuYmFjayApXHJcbiAgICAgICAgICAgIHRoaXMuY1szXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MuYmFzaWMgKyAnaGVpZ2h0OicrKHRoaXMuaW5oLTYpKydweDsgd2lkdGg6MTZweDsgdG9wOicrKHQrMikrJ3B4OyBib3JkZXItcmFkaXVzOjEwcHg7IGJhY2tncm91bmQ6JysgY2MuYnV0dG9uKyc7JyApXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5wID0gMFxyXG4gICAgICAgICAgICBpZiggdGhpcy5jWzFdICE9PSB1bmRlZmluZWQgKSB0aGlzLmNbMV0udGV4dENvbnRlbnQgPSAnJztcclxuICAgICAgICAgICAgdGhpcy5jWzJdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHQgKyB0aGlzLmNzcy5idXR0b24gKyAndG9wOjFweDsgYmFja2dyb3VuZDonK2NjLmJ1dHRvbisnOyBoZWlnaHQ6JysodGhpcy5oLTIpKydweDsgYm9yZGVyOicrY2MuYm9yZGVyU2l6ZSsncHggc29saWQgJytjYy5ib3JkZXIrJzsgYm9yZGVyLXJhZGl1czonK3RoaXMucmFkaXVzKydweDsnIClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc3RhdCA9IC0xXHJcblxyXG4gICAgICAgIHRoaXMuaW5pdCgpXHJcbiAgICAgICAgdGhpcy51cGRhdGUoKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIEVWRU5UU1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIG1vdXNlZG93biAoIGUgKSB7XHJcblxyXG4gICAgICAgIHRoaXMudmFsdWUgPSAhdGhpcy52YWx1ZVxyXG4gICAgICAgIHRoaXMudXBkYXRlKCB0cnVlIClcclxuICAgICAgICByZXR1cm4gdGhpcy5tb3VzZW1vdmUoIGUgKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZW1vdmUgKCBlICkge1xyXG5cclxuICAgICAgICB0aGlzLmN1cnNvcigncG9pbnRlcicpXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZSggdHJ1ZSApXHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgcmVzZXQgKCkge1xyXG5cclxuICAgICAgICB0aGlzLmN1cnNvcigpXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZSgpXHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgTU9ERVxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIG1vZGUgKCBvdmVyICkge1xyXG5cclxuICAgICAgICBsZXQgY2hhbmdlID0gZmFsc2VcclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9ycywgcyA9IHRoaXMucywgbiwgdiA9IHRoaXMudmFsdWVcclxuXHJcbiAgICAgICAgaWYoIG92ZXIgKSBuID0gdiA/IDQgOiAzXHJcbiAgICAgICAgZWxzZSBuID0gdiA/IDIgOiAxXHJcblxyXG4gICAgICAgIGlmKCB0aGlzLnN0YXQgIT09IG4gKXtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc3RhdCA9IG5cclxuXHJcbiAgICAgICAgICAgIGlmKCB0aGlzLm1vZGVsICE9PSAwICl7XHJcblxyXG4gICAgICAgICAgICAgICAgc3dpdGNoKCBuICl7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTogc1syXS5jb2xvciA9IGNjLnRleHQ7IHNbMl0uYmFja2dyb3VuZCA9IGNjLmJ1dHRvbjsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyOiBzWzJdLmNvbG9yID0gY2MudGV4dFNlbGVjdDsgc1syXS5iYWNrZ3JvdW5kID0gY2Muc2VsZWN0OyBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDM6IHNbMl0uY29sb3IgPSBjYy50ZXh0T3Zlcjsgc1syXS5iYWNrZ3JvdW5kID0gY2Mub3Zlcm9mZjsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0OiBzWzJdLmNvbG9yID0gY2MudGV4dE92ZXI7IHNbMl0uYmFja2dyb3VuZCA9IGNjLm92ZXI7IGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNbMl0uaW5uZXJIVE1MID0gdiA/IHRoaXMub25OYW1lIDogdGhpcy5uYW1lXHJcblxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgICAgIHN3aXRjaCggbiApe1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6IHNbMl0uYmFja2dyb3VuZCA9IHNbMl0uYm9yZGVyQ29sb3IgPSBjYy5iYWNrb2ZmOyBzWzNdLmJhY2tncm91bmQgPSBjYy5idXR0b247IGJyZWFrOy8vIG9mZiBvdXRcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6IHNbMl0uYmFja2dyb3VuZCA9IHNbMl0uYm9yZGVyQ29sb3IgPSBjYy5iYWNrOyBzWzNdLmJhY2tncm91bmQgPSBjYy50ZXh0T3ZlcjsgYnJlYWs7Ly8gb24gb3ZlclxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzogc1syXS5iYWNrZ3JvdW5kID0gc1syXS5ib3JkZXJDb2xvciA9IGNjLmJhY2s7IHNbM10uYmFja2dyb3VuZCA9IGNjLm92ZXJvZmY7IGJyZWFrOy8vIG9mZiBvdmVyXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA0OiBzWzJdLmJhY2tncm91bmQgPSBzWzJdLmJvcmRlckNvbG9yID0gY2MuYmFja29mZjsgc1szXS5iYWNrZ3JvdW5kID0gY2MudGV4dFNlbGVjdDsgYnJlYWs7Ly8gb24gb3V0XHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNbM10ubWFyZ2luTGVmdCA9IHYgPyAnMTdweCcgOiAnMnB4J1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jWzFdLnRleHRDb250ZW50ID0gdiA/IHRoaXMub25OYW1lIDogdGhpcy5uYW1lXHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjaGFuZ2UgPSB0cnVlXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNoYW5nZVxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgdXBkYXRlICggdXAgKSB7XHJcblxyXG4gICAgICAgIHRoaXMubW9kZSgpXHJcbiAgICAgICAgaWYoIHVwICkgdGhpcy5zZW5kKClcclxuICAgICAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgclNpemUgKCkge1xyXG5cclxuICAgICAgICBzdXBlci5yU2l6ZSgpXHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zXHJcbiAgICAgICAgbGV0IHcgPSAodGhpcy53IC0gMTAgKSAtIHRoaXMuaW53XHJcbiAgICAgICAgaWYoIHRoaXMubW9kZWwgPT09IDAgKXtcclxuICAgICAgICAgICAgc1syXS5sZWZ0ID0gdyArICdweCdcclxuICAgICAgICAgICAgc1szXS5sZWZ0ID0gdyArICdweCdcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzWzJdLmxlZnQgPSB0aGlzLnNhICsgJ3B4J1xyXG4gICAgICAgICAgICBzWzJdLndpZHRoID0gdGhpcy5zYiAgKyAncHgnXHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQnV0dG9uIGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvIClcclxuXHJcbiAgICAgICAgdGhpcy52YWx1ZSA9ICcnO1xyXG4gICAgICAgIGlmKCBvLnZhbHVlICE9PSB1bmRlZmluZWQgKSB0aGlzLnZhbHVlID0gby52YWx1ZVxyXG5cclxuICAgICAgICB0aGlzLnZhbHVlcyA9IG8udmFsdWUgfHwgdGhpcy50eHRcclxuICAgICAgICBpZiggby52YWx1ZXMgKSB0aGlzLnZhbHVlcyA9IG8udmFsdWVzXHJcblxyXG4gICAgICAgIGlmKCAhby52YWx1ZXMgJiYgIW8udmFsdWUgKSB0aGlzLnR4dCA9ICcnXHJcblxyXG4gICAgICAgIHRoaXMub25OYW1lID0gby5vbk5hbWUgfHwgbnVsbDtcclxuXHJcbiAgICAgICAgdGhpcy5vbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICAvLyBmb3JjZSBidXR0b24gd2lkdGhcclxuICAgICAgICB0aGlzLmJ3ID0gby5mb3JjZVdpZHRoIHx8IDBcclxuICAgICAgICBpZihvLmJ3KSB0aGlzLmJ3ID0gby5id1xyXG4gICAgICAgIHRoaXMuc3BhY2UgPSBvLnNwYWNlIHx8IDNcclxuXHJcbiAgICAgICAgaWYoIHR5cGVvZiB0aGlzLnZhbHVlcyA9PT0gJ3N0cmluZycgKSB0aGlzLnZhbHVlcyA9IFsgdGhpcy52YWx1ZXMgXVxyXG5cclxuICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5uZXZlcmxvY2sgPSB0cnVlXHJcbiAgICAgICAgdGhpcy5yZXMgPSAwXHJcblxyXG4gICAgICAgIHRoaXMubG5nID0gdGhpcy52YWx1ZXMubGVuZ3RoXHJcbiAgICAgICAgdGhpcy50bXAgPSBbXVxyXG4gICAgICAgIHRoaXMuc3RhdCA9IFtdXHJcblxyXG4gICAgICAgIGxldCBzZWwsIGNjID0gdGhpcy5jb2xvcnM7XHJcblxyXG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgdGhpcy5sbmc7IGkrKyApe1xyXG5cclxuICAgICAgICAgICAgc2VsID0gZmFsc2VcclxuICAgICAgICAgICAgaWYoIHRoaXMudmFsdWVzW2ldID09PSB0aGlzLnZhbHVlICYmIHRoaXMuaXNTZWxlY3RhYmxlICkgc2VsID0gdHJ1ZVxyXG5cclxuICAgICAgICAgICAgdGhpcy5jW2krMl0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLnR4dCArIHRoaXMuY3NzLmJ1dHRvbiArICd0b3A6MXB4OyBoZWlnaHQ6JysodGhpcy5oLTIpKydweDsgYm9yZGVyOicrY2MuYm9yZGVyU2l6ZSsncHggc29saWQgJytjYy5ib3JkZXIrJzsgYm9yZGVyLXJhZGl1czonK3RoaXMucmFkaXVzKydweDsnIClcclxuICAgICAgICAgICAgdGhpcy5jW2krMl0uc3R5bGUuYmFja2dyb3VuZCA9IHNlbCA/IGNjLnNlbGVjdCA6IGNjLmJ1dHRvblxyXG4gICAgICAgICAgICB0aGlzLmNbaSsyXS5zdHlsZS5jb2xvciA9IHNlbCA/IGNjLnRleHRTZWxlY3QgOiBjYy50ZXh0XHJcbiAgICAgICAgICAgIHRoaXMuY1tpKzJdLmlubmVySFRNTCA9IHRoaXMudmFsdWVzW2ldO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRbaV0gPSBzZWwgPyAzOjE7XHJcblxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGlmKCB0aGlzLnR4dD09PScnICkgdGhpcy5wID0gMCBcclxuXHJcbiAgICAgICAgaWYoICghby52YWx1ZSAmJiAhby52YWx1ZXMpIHx8IHRoaXMucCA9PT0gMCApe1xyXG4gICAgICAgICAgICBpZiggdGhpcy5jWzFdICE9PSB1bmRlZmluZWQgKSB0aGlzLmNbMV0udGV4dENvbnRlbnQgPSAnJ1xyXG4gICAgICAgIH0gXHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBvbk9mZigpIHtcclxuXHJcbiAgICAgICAgdGhpcy5vbiA9ICF0aGlzLm9uO1xyXG4gICAgICAgIHRoaXMubGFiZWwoIHRoaXMub24gPyB0aGlzLm9uTmFtZSA6IHRoaXMudmFsdWUgKVxyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIHRlc3Rab25lICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IGwgPSB0aGlzLmxvY2FsO1xyXG4gICAgICAgIGlmKCBsLnggPT09IC0xICYmIGwueSA9PT0gLTEgKSByZXR1cm4gLTFcclxuXHJcbiAgICAgICAgbGV0IGkgPSB0aGlzLmxuZ1xyXG4gICAgICAgIGxldCB0ID0gdGhpcy50bXBcclxuICAgICAgICBcclxuICAgICAgICB3aGlsZSggaS0tICl7XHJcbiAgICAgICAgXHRpZiggbC54PnRbaV1bMF0gJiYgbC54PHRbaV1bMl0gKSByZXR1cm4gaVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIC0xXHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgRVZFTlRTXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgbW91c2V1cCAoIGUgKSB7XHJcblxyXG4gICAgICAgIGlmKCAhdGhpcy5pc0Rvd24gKSByZXR1cm4gZmFsc2VcclxuXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZVxyXG4gICAgICAgIGlmKCB0aGlzLnJlcyAhPT0gLTEgKXtcclxuICAgICAgICAgICAgaWYoIHRoaXMudmFsdWUgPT09IHRoaXMudmFsdWVzW3RoaXMucmVzXSAmJiB0aGlzLnVuc2VsZWN0YWJsZSApIHRoaXMudmFsdWUgPSAnJ1xyXG4gICAgICAgICAgICBlbHNlIHRoaXMudmFsdWUgPSB0aGlzLnZhbHVlc1t0aGlzLnJlc11cclxuICAgICAgICAgICAgaWYoIHRoaXMub25OYW1lICE9PSBudWxsICkgdGhpcy5vbk9mZigpXHJcbiAgICAgICAgICAgIHRoaXMuc2VuZCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy5tb3VzZW1vdmUoIGUgKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZWRvd24gKCBlICkge1xyXG5cclxuICAgICAgICBpZiggdGhpcy5pc0Rvd24gKSByZXR1cm4gZmFsc2VcclxuICAgICAgICB0aGlzLmlzRG93biA9IHRydWVcclxuICAgIFx0cmV0dXJuIHRoaXMubW91c2Vtb3ZlKCBlIClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vtb3ZlICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IHVwID0gZmFsc2VcclxuICAgICAgICB0aGlzLnJlcyA9IHRoaXMudGVzdFpvbmUoIGUgKVxyXG5cclxuICAgICAgICBpZiggdGhpcy5yZXMgIT09IC0xICl7XHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yKCdwb2ludGVyJylcclxuICAgICAgICAgICAgdXAgPSB0aGlzLm1vZGVzKCB0aGlzLmlzRG93biA/IDMgOiAyLCB0aGlzLnJlcyApXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICBcdHVwID0gdGhpcy5yZXNldCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdXBcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIG1vZGVzICggTiA9IDEsIGlkID0gLTEgKSB7XHJcblxyXG4gICAgICAgIGxldCBpID0gdGhpcy5sbmcsIHcsIG4sIHIgPSBmYWxzZVxyXG5cclxuICAgICAgICB3aGlsZSggaS0tICl7XHJcblxyXG4gICAgICAgICAgICBuID0gTlxyXG4gICAgICAgICAgICB3ID0gdGhpcy5pc1NlbGVjdGFibGUgPyB0aGlzLnZhbHVlc1sgaSBdID09PSB0aGlzLnZhbHVlIDogZmFsc2VcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmKCBpID09PSBpZCApe1xyXG4gICAgICAgICAgICAgICAgaWYoIHcgJiYgbiA9PT0gMiApIG4gPSAzIFxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbiA9IDFcclxuICAgICAgICAgICAgICAgIGlmKCB3ICkgbiA9IDRcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy9pZiggdGhpcy5tb2RlKCBuLCBpICkgKSByID0gdHJ1ZVxyXG4gICAgICAgICAgICByID0gdGhpcy5tb2RlKCBuLCBpIClcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gclxyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb2RlICggbiwgaWQgKSB7XHJcblxyXG4gICAgICAgIC8vaWYoIXRoaXMucykgcmV0dXJuIGZhbHNlXHJcbiBcclxuICAgICAgICBsZXQgY2hhbmdlID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnMsIHMgPSB0aGlzLnNcclxuICAgICAgICBsZXQgaSA9IGlkKzJcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuc3RhdFtpZF0gIT09IG4gKXtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc3RhdFtpZF0gPSBuO1xyXG4gICAgICAgIFxyXG4gICAgICAgICAgICBzd2l0Y2goIG4gKXtcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlIDE6IHNbaV0uY29sb3IgPSBjYy50ZXh0OyBzW2ldLmJhY2tncm91bmQgPSBjYy5idXR0b247IGJyZWFrXHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6IHNbaV0uY29sb3IgPSBjYy50ZXh0T3Zlcjsgc1tpXS5iYWNrZ3JvdW5kID0gY2Mub3Zlcm9mZjsgYnJlYWtcclxuICAgICAgICAgICAgICAgIGNhc2UgMzogc1tpXS5jb2xvciA9IGNjLnRleHRPdmVyOyBzW2ldLmJhY2tncm91bmQgPSBjYy5vdmVyOyBicmVha1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiBzW2ldLmNvbG9yID0gY2MudGV4dFNlbGVjdDsgc1tpXS5iYWNrZ3JvdW5kID0gY2Muc2VsZWN0OyBicmVha1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY2hhbmdlID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gY2hhbmdlXHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICByZXNldCAoKSB7XHJcblxyXG4gICAgICAgIHRoaXMucmVzID0gLTFcclxuICAgICAgICB0aGlzLmN1cnNvcigpXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZXMoKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBsYWJlbCAoIHN0cmluZywgbiApIHtcclxuXHJcbiAgICAgICAgbiA9IG4gfHwgMjtcclxuICAgICAgICB0aGlzLmNbbl0udGV4dENvbnRlbnQgPSBzdHJpbmdcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc3dpdGNoVmFsdWVzKCBuLCBzdHJpbmcgKXtcclxuICAgICAgICB0aGlzLmNbbisyXS5pbm5lckhUTUwgPSB0aGlzLnZhbHVlc1tuXSA9IHN0cmluZztcclxuICAgIH1cclxuXHJcbiAgICBpY29uICggc3RyaW5nLCB5ID0gMCwgbiA9IDIgKSB7XHJcblxyXG4gICAgICAgIC8vaWYoeSkgdGhpcy5zW25dLm1hcmdpbiA9ICggeSApICsncHggMHB4JztcclxuICAgICAgICB0aGlzLnNbbl0ucGFkZGluZyA9ICggeSApICsncHggMHB4JztcclxuICAgICAgICB0aGlzLmNbbl0uaW5uZXJIVE1MID0gc3RyaW5nO1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpc1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByU2l6ZSAoKSB7XHJcblxyXG4gICAgICAgIHN1cGVyLnJTaXplKCk7XHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zO1xyXG4gICAgICAgIGxldCB3ID0gdGhpcy5zYjtcclxuICAgICAgICBsZXQgZCA9IHRoaXMuc2E7XHJcblxyXG4gICAgICAgIGxldCBpID0gdGhpcy5sbmc7XHJcbiAgICAgICAgbGV0IHN4ID0gdGhpcy5jb2xvcnMuc3ggLy90aGlzLnNwYWNlO1xyXG4gICAgICAgIC8vbGV0IHNpemUgPSBNYXRoLmZsb29yKCAoIHctKGRjKihpLTEpKSApIC8gaSApO1xyXG4gICAgICAgIGxldCBzaXplID0gKCB3LShzeCooaS0xKSkgKSAvIGkgXHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmJ3ICl7IFxyXG4gICAgICAgICAgICBzaXplID0gdGhpcy5idyA8IHNpemUgPyB0aGlzLmJ3IDogc2l6ZVxyXG4gICAgICAgICAgICAvL2QgPSBNYXRoLmZsb29yKCh0aGlzLnctKCAoc2l6ZSAqIGkpICsgKGRjICogKGktMSkpICkpKjAuNSlcclxuICAgICAgICAgICAgZCA9ICgodGhpcy53LSggKHNpemUgKiBpKSArIChzeCAqIChpLTEpKSApKSowLjUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB3aGlsZSggaS0tICl7XHJcblxyXG4gICAgICAgIFx0Ly90aGlzLnRtcFtpXSA9IFsgTWF0aC5mbG9vciggZCArICggc2l6ZSAqIGkgKSArICggZGMgKiBpICkpLCBzaXplIF07XHJcbiAgICAgICAgICAgIHRoaXMudG1wW2ldID0gWyAoIGQgKyAoIHNpemUgKiBpICkgKyAoIHN4ICogaSApKSwgc2l6ZSBdO1xyXG4gICAgICAgIFx0dGhpcy50bXBbaV1bMl0gPSB0aGlzLnRtcFtpXVswXSArIHRoaXMudG1wW2ldWzFdO1xyXG5cclxuICAgICAgICAgICAgc1tpKzJdLmxlZnQgPSB0aGlzLnRtcFtpXVswXSArICdweCdcclxuICAgICAgICAgICAgc1tpKzJdLndpZHRoID0gdGhpcy50bXBbaV1bMV0gKyAncHgnXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdG8gfSBmcm9tICcuLi9jb3JlL1Byb3RvLmpzJztcclxuaW1wb3J0IHsgVG9vbHMgfSBmcm9tICcuLi9jb3JlL1Rvb2xzLmpzJztcclxuaW1wb3J0IHsgVjIgfSBmcm9tICcuLi9jb3JlL1YyLmpzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBDaXJjdWxhciBleHRlbmRzIFByb3RvIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciggbyA9IHt9ICkge1xyXG5cclxuICAgICAgICBzdXBlciggbyApXHJcblxyXG4gICAgICAgIHRoaXMuaXNDeWNsaWMgPSBvLmN5Y2xpYyB8fCBmYWxzZVxyXG4gICAgICAgIHRoaXMubW9kZWwgPSBvLnN0eXBlIHx8IDBcclxuICAgICAgICBpZiggby5tb2RlICE9PSB1bmRlZmluZWQgKSB0aGlzLm1vZGVsID0gby5tb2RlXHJcblxyXG4gICAgICAgIHRoaXMuYXV0b1dpZHRoID0gZmFsc2VcclxuICAgICAgICB0aGlzLm1pbncgPSB0aGlzLndcclxuICAgICAgICB0aGlzLmRpYW0gPSBvLmRpYW0gfHwgdGhpcy53IFxyXG5cclxuICAgICAgICB0aGlzLnNldFR5cGVOdW1iZXIoIG8gKVxyXG5cclxuICAgICAgICB0aGlzLnR3b1BpID0gVG9vbHMuVHdvUElcclxuICAgICAgICB0aGlzLnBpOTAgPSBUb29scy5waTkwXHJcblxyXG4gICAgICAgIHRoaXMub2Zmc2V0ID0gbmV3IFYyKClcclxuXHJcbiAgICAgICAgdGhpcy5oID0gby5oIHx8IHRoaXMudyArIDEwXHJcblxyXG4gICAgICAgIHRoaXMuY1swXS5zdHlsZS53aWR0aCA9IHRoaXMudyArJ3B4J1xyXG4gICAgICAgIHRoaXMuY1swXS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJ1xyXG5cclxuICAgICAgICBpZih0aGlzLmNbMV0gIT09IHVuZGVmaW5lZCkge1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jWzFdLnN0eWxlLndpZHRoID0gJzEwMCUnXHJcbiAgICAgICAgICAgIHRoaXMuY1sxXS5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdjZW50ZXInXHJcbiAgICAgICAgICAgIHRoaXMudG9wID0gMTBcclxuICAgICAgICAgICAgdGhpcy5oICs9IDEwXHJcblxyXG4gICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICB0aGlzLnBlcmNlbnQgPSAwXHJcbiAgICAgICAgdGhpcy5jbW9kZSA9IDBcclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICB0aGlzLmNbMl0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLnR4dCArICdqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyOyB0b3A6JysodGhpcy5oLTIwKSsncHg7IHdpZHRoOjEwMCU7IGNvbG9yOicrIGNjLnRleHQgKVxyXG5cclxuICAgICAgICAvLyBzdmdcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLmNbM10gPSB0aGlzLmdldENpcmN1bGFyKClcclxuXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNjLmJhY2ssIDAgKVxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdkJywgdGhpcy5tYWtlUGF0aCgpLCAxIClcclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgY2MudGV4dCwgMSApXHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICd2aWV3Qm94JywgJzAgMCAnK3RoaXMuZGlhbSsnICcrdGhpcy5kaWFtIClcclxuICAgICAgICB0aGlzLnNldENzcyggdGhpcy5jWzNdLCB7IHdpZHRoOnRoaXMuZGlhbSwgaGVpZ2h0OnRoaXMuZGlhbSwgbGVmdDowLCB0b3A6dGhpcy50b3AgfSlcclxuXHJcbiAgICAgICAgdGhpcy5pbml0KClcclxuICAgICAgICB0aGlzLnVwZGF0ZSgpXHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vZGUgKCBtb2RlICkge1xyXG5cclxuICAgICAgICBpZiggdGhpcy5jbW9kZSA9PT0gbW9kZSApIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnNcclxuICAgICAgICBsZXQgY29sb3JcclxuXHJcbiAgICAgICAgc3dpdGNoKCBtb2RlICl7XHJcbiAgICAgICAgICAgIGNhc2UgMDogLy8gYmFzZVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuc1syXS5jb2xvciA9IGNjLnRleHQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgY2MuYmFjaywgMCk7XHJcbiAgICAgICAgICAgICAgICBjb2xvciA9IHRoaXMubW9kZWwgPiAwID8gVG9vbHMucGFjayggVG9vbHMubGVycENvbG9yKCBUb29scy51bnBhY2soIFRvb2xzLkNvbG9yTHVtYSggY2MudGV4dCwgLTAuNzUpICksIFRvb2xzLnVucGFjayggY2MudGV4dCApLCB0aGlzLnBlcmNlbnQgKSApIDogY2MudGV4dDtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjb2xvciwgMSApO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDE6IC8vIGRvd25cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNbMl0uY29sb3IgPSBjYy50ZXh0T3ZlcjtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjYy5iYWNrb2ZmLCAwKTtcclxuICAgICAgICAgICAgICAgIGNvbG9yID0gdGhpcy5tb2RlbCA+IDAgPyBUb29scy5wYWNrKCBUb29scy5sZXJwQ29sb3IoIFRvb2xzLnVucGFjayggVG9vbHMuQ29sb3JMdW1hKCBjYy50ZXh0LCAtMC43NSkgKSwgVG9vbHMudW5wYWNrKCBjYy50ZXh0ICksIHRoaXMucGVyY2VudCApICkgOiBjYy50ZXh0T3ZlclxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNvbG9yLCAxICk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmNtb2RlID0gbW9kZTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmVzZXQgKCkge1xyXG5cclxuICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIHRlc3Rab25lICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IGwgPSB0aGlzLmxvY2FsO1xyXG4gICAgICAgIGlmKCBsLnggPT09IC0xICYmIGwueSA9PT0gLTEgKSByZXR1cm4gJyc7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYoIGwueSA8PSB0aGlzLmNbIDEgXS5vZmZzZXRIZWlnaHQgKSByZXR1cm4gJ3RpdGxlJztcclxuICAgICAgICBlbHNlIGlmICggbC55ID4gdGhpcy5oIC0gdGhpcy5jWyAyIF0ub2Zmc2V0SGVpZ2h0ICkgcmV0dXJuICd0ZXh0JztcclxuICAgICAgICBlbHNlIHJldHVybiAnY2lyY3VsYXInO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIEVWRU5UU1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIG1vdXNldXAgKCBlICkge1xyXG5cclxuICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuc2VuZEVuZCgpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1vZGUoMCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlZG93biAoIGUgKSB7XHJcblxyXG4gICAgICAgIHRoaXMuaXNEb3duID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLm9sZCA9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgdGhpcy5vbGRyID0gbnVsbDtcclxuICAgICAgICB0aGlzLm1vdXNlbW92ZSggZSApO1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1vZGUoMSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlbW92ZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGlmKCAhdGhpcy5pc0Rvd24gKSByZXR1cm47XHJcblxyXG4gICAgICAgIC8vY29uc29sZS5sb2coJ292ZXInKVxyXG5cclxuICAgICAgICBsZXQgb2ZmID0gdGhpcy5vZmZzZXQ7XHJcbiAgICAgICAgb2ZmLnggPSAodGhpcy53KjAuNSkgLSAoIGUuY2xpZW50WCAtIHRoaXMuem9uZS54ICk7XHJcbiAgICAgICAgb2ZmLnkgPSAodGhpcy5kaWFtKjAuNSkgLSAoIGUuY2xpZW50WSAtIHRoaXMuem9uZS55IC0gdGhpcy55dG9wICk7XHJcblxyXG4gICAgICAgIHRoaXMuciA9IG9mZi5hbmdsZSgpIC0gdGhpcy5waTkwO1xyXG4gICAgICAgIHRoaXMuciA9ICgoKHRoaXMuciV0aGlzLnR3b1BpKSt0aGlzLnR3b1BpKSV0aGlzLnR3b1BpKTtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMub2xkciAhPT0gbnVsbCApeyBcclxuXHJcbiAgICAgICAgICAgIGxldCBkaWYgPSB0aGlzLnIgLSB0aGlzLm9sZHI7XHJcbiAgICAgICAgICAgIHRoaXMuciA9IE1hdGguYWJzKGRpZikgPiBNYXRoLlBJID8gdGhpcy5vbGRyIDogdGhpcy5yO1xyXG5cclxuICAgICAgICAgICAgaWYoIGRpZiA+IDYgKSB0aGlzLnIgPSAwO1xyXG4gICAgICAgICAgICBpZiggZGlmIDwgLTYgKSB0aGlzLnIgPSB0aGlzLnR3b1BpO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzdGVwcyA9IDEgLyB0aGlzLnR3b1BpO1xyXG4gICAgICAgIGxldCB2YWx1ZSA9IHRoaXMuciAqIHN0ZXBzO1xyXG5cclxuICAgICAgICBsZXQgbiA9ICggKCB0aGlzLnJhbmdlICogdmFsdWUgKSArIHRoaXMubWluICkgLSB0aGlzLm9sZDtcclxuXHJcbiAgICAgICAgaWYobiA+PSB0aGlzLnN0ZXAgfHwgbiA8PSB0aGlzLnN0ZXApeyBcclxuICAgICAgICAgICAgbiA9IH5+ICggbiAvIHRoaXMuc3RlcCApO1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdGhpcy5udW1WYWx1ZSggdGhpcy5vbGQgKyAoIG4gKiB0aGlzLnN0ZXAgKSApO1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSggdHJ1ZSApO1xyXG4gICAgICAgICAgICB0aGlzLm9sZCA9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgICAgIHRoaXMub2xkciA9IHRoaXMucjtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHdoZWVsICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IG5hbWUgPSB0aGlzLnRlc3Rab25lKCBlICk7XHJcblxyXG4gICAgICAgIGlmKCBuYW1lID09PSAnY2lyY3VsYXInICkge1xyXG4gICAgXHJcbiAgICAgICAgICAgIGxldCB2ID0gdGhpcy52YWx1ZSAtIHRoaXMuc3RlcCAqIGUuZGVsdGE7XHJcbiAgICBcclxuICAgICAgICAgICAgaWYgKCB2ID4gdGhpcy5tYXggKSB7XHJcbiAgICAgICAgICAgICAgICB2ID0gdGhpcy5pc0N5Y2xpYyA/IHRoaXMubWluIDogdGhpcy5tYXg7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIHYgPCB0aGlzLm1pbiApIHtcclxuICAgICAgICAgICAgICAgIHYgPSB0aGlzLmlzQ3ljbGljID8gdGhpcy5tYXggOiB0aGlzLm1pbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgXHJcbiAgICAgICAgICAgIHRoaXMuc2V0VmFsdWUoIHYgKTtcclxuICAgICAgICAgICAgdGhpcy5vbGQgPSB2O1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSggdHJ1ZSApO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICBcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgbWFrZVBhdGggKCkge1xyXG5cclxuICAgICAgICBsZXQgciA9IDQwO1xyXG4gICAgICAgIGxldCBkID0gMjQ7XHJcbiAgICAgICAgbGV0IGEgPSB0aGlzLnBlcmNlbnQgKiB0aGlzLnR3b1BpIC0gMC4wMDE7XHJcbiAgICAgICAgbGV0IHgyID0gKHIgKyByICogTWF0aC5zaW4oYSkpICsgZDtcclxuICAgICAgICBsZXQgeTIgPSAociAtIHIgKiBNYXRoLmNvcyhhKSkgKyBkO1xyXG4gICAgICAgIGxldCBiaWcgPSBhID4gTWF0aC5QSSA/IDEgOiAwO1xyXG4gICAgICAgIHJldHVybiBcIk0gXCIgKyAocitkKSArIFwiLFwiICsgZCArIFwiIEEgXCIgKyByICsgXCIsXCIgKyByICsgXCIgMCBcIiArIGJpZyArIFwiIDEgXCIgKyB4MiArIFwiLFwiICsgeTI7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSAoIHVwICkge1xyXG5cclxuICAgICAgICB0aGlzLmNbMl0udGV4dENvbnRlbnQgPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgIHRoaXMucGVyY2VudCA9ICggdGhpcy52YWx1ZSAtIHRoaXMubWluICkgLyB0aGlzLnJhbmdlO1xyXG5cclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZCcsIHRoaXMubWFrZVBhdGgoKSwgMSApO1xyXG5cclxuICAgICAgICBpZiAoIHRoaXMubW9kZWwgPiAwICkge1xyXG5cclxuICAgICAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnNcclxuICAgICAgICAgICAgbGV0IGNvbG9yID0gVG9vbHMucGFjayggVG9vbHMubGVycENvbG9yKCBUb29scy51bnBhY2soIFRvb2xzLkNvbG9yTHVtYSggY2MudGV4dCwgLTAuNzUpICksIFRvb2xzLnVucGFjayggY2MudGV4dCApLCB0aGlzLnBlcmNlbnQgKSApO1xyXG4gICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgY29sb3IsIDEgKTtcclxuICAgICAgICBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCB1cCApIHRoaXMuc2VuZCgpO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFRvb2xzIH0gZnJvbSAnLi4vY29yZS9Ub29scy5qcyc7XHJcbmltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcyc7XHJcbmltcG9ydCB7IFYyIH0gZnJvbSAnLi4vY29yZS9WMi5qcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQ29sb3IgZXh0ZW5kcyBQcm90byB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoIG8gPSB7fSApIHtcclxuXHJcbiAgICAgICAgc3VwZXIoIG8gKTtcclxuXHJcblx0ICAgIC8vdGhpcy5hdXRvSGVpZ2h0ID0gdHJ1ZTtcclxuXHJcblx0ICAgIHRoaXMuY3R5cGUgPSBvLmN0eXBlIHx8ICdoZXgnO1xyXG5cclxuXHQgICAgdGhpcy53Zml4ZSA9IDI1NjtcclxuXHJcblx0ICAgIHRoaXMuY3cgPSB0aGlzLnNiID4gMjU2ID8gMjU2IDogdGhpcy5zYjtcclxuXHQgICAgaWYoby5jdyAhPSB1bmRlZmluZWQgKSB0aGlzLmN3ID0gby5jdztcclxuXHJcblxyXG5cclxuXHQgICAgLy8gY29sb3IgdXAgb3IgZG93blxyXG5cdCAgICB0aGlzLnNpZGUgPSBvLnNpZGUgfHwgJ2Rvd24nO1xyXG5cdCAgICB0aGlzLnVwID0gdGhpcy5zaWRlID09PSAnZG93bicgPyAwIDogMTtcclxuXHQgICAgXHJcblx0ICAgIHRoaXMuYmFzZUggPSB0aGlzLmg7XHJcblxyXG5cdCAgICB0aGlzLm9mZnNldCA9IG5ldyBWMigpO1xyXG5cdCAgICB0aGlzLmRlY2FsID0gbmV3IFYyKCk7XHJcblx0ICAgIHRoaXMucHAgPSBuZXcgVjIoKTtcclxuXHJcblx0ICAgIGxldCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG5cdCAgIC8vIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0ICsgdGhpcy5jc3MubWlkZGxlICsgJ3RvcDoxcHg7IGhlaWdodDonKyh0aGlzLmgtMikrJ3B4OycgKyAnYm9yZGVyLXJhZGl1czonK3RoaXMucmFkaXVzKydweDsgdGV4dC1zaGFkb3c6bm9uZTsgYm9yZGVyOicrY2MuYm9yZGVyU2l6ZSsncHggc29saWQgJytjYy5ib3JkZXIrJzsnIClcclxuXHJcblx0ICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgYCR7dGhpcy5jc3MudHh0fSAke3RoaXMuY3NzLm1pZGRsZX0gdG9wOjFweDsgaGVpZ2h0OiR7dGhpcy5oLTJ9cHg7IGJvcmRlci1yYWRpdXM6JHt0aGlzLnJhZGl1c31weDsgdGV4dC1zaGFkb3c6bm9uZTsgYm9yZGVyOiR7Y2MuYm9yZGVyU2l6ZX1weCBzb2xpZCAke2NjLmJvcmRlcn07YCApXHJcblx0ICAgIC8vdGhpcy5zWzJdID0gdGhpcy5jWzJdLnN0eWxlO1xyXG5cclxuXHQgICAgLy90aGlzLnNbMl0udGV4dFNoYWRvdyA9ICdub25lJ1xyXG5cclxuXHQgICAgLyppZiggdGhpcy51cCApe1xyXG5cdCAgICAgICAgdGhpcy5zWzJdLnRvcCA9ICdhdXRvJztcclxuXHQgICAgICAgIHRoaXMuc1syXS5ib3R0b20gPSAnMnB4JztcclxuXHQgICAgfSovXHJcblxyXG5cdCAgICAvL3RoaXMuY1swXS5zdHlsZS50ZXh0QWxpZ24gPSAnY2VudGVyJztcclxuXHQgICAgdGhpcy5jWzBdLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snXHJcblxyXG5cdCAgICB0aGlzLmNbM10gPSB0aGlzLmdldENvbG9yUmluZygpXHJcblx0ICAgIHRoaXMuY1szXS5zdHlsZS52aXNpYmlsaXR5ICA9ICdoaWRkZW4nXHJcblxyXG5cdCAgICB0aGlzLmhzbCA9IG51bGxcclxuXHQgICAgdGhpcy52YWx1ZSA9ICcjZmZmZmZmJ1xyXG5cdCAgICBpZiggby52YWx1ZSAhPT0gdW5kZWZpbmVkICl7XHJcblx0ICAgICAgICBpZiggby52YWx1ZSBpbnN0YW5jZW9mIEFycmF5ICkgdGhpcy52YWx1ZSA9IFRvb2xzLnJnYlRvSGV4KCBvLnZhbHVlIClcclxuXHQgICAgICAgIGVsc2UgaWYoIWlzTmFOKG8udmFsdWUpKSB0aGlzLnZhbHVlID0gVG9vbHMuaGV4VG9IdG1sKCBvLnZhbHVlIClcclxuXHQgICAgICAgIGVsc2UgdGhpcy52YWx1ZSA9IG8udmFsdWVcclxuXHQgICAgfVxyXG5cclxuXHQgICAgdGhpcy5iY29sb3IgPSBudWxsXHJcblx0ICAgIHRoaXMuaXNEb3duID0gZmFsc2VcclxuXHQgICAgdGhpcy5maXN0RG93biA9IGZhbHNlXHJcblxyXG5cdCAgICB0aGlzLm5vdGV4dCA9IG8ubm90ZXh0IHx8IGZhbHNlXHJcblxyXG5cdCAgICB0aGlzLnRyID0gOThcclxuXHQgICAgdGhpcy50c2wgPSBNYXRoLnNxcnQoMykgKiB0aGlzLnRyXHJcblxyXG5cdCAgICB0aGlzLmh1ZSA9IDBcclxuXHQgICAgdGhpcy5kID0gMjU2XHJcblxyXG5cdCAgICB0aGlzLmluaXQoKVxyXG5cclxuXHQgICAgdGhpcy5zZXRDb2xvciggdGhpcy52YWx1ZSApXHJcblxyXG5cdCAgICBpZiggby5vcGVuICE9PSB1bmRlZmluZWQgKSB0aGlzLm9wZW4oKVxyXG5cclxuXHR9XHJcblxyXG5cdHRlc3Rab25lICggbXgsIG15ICkge1xyXG5cclxuXHRcdGxldCBsID0gdGhpcy5sb2NhbFxyXG5cdFx0aWYoIGwueCA9PT0gLTEgJiYgbC55ID09PSAtMSApIHJldHVybiAnJ1xyXG5cclxuXHRcdGlmKCB0aGlzLnVwICYmIHRoaXMuaXNPcGVuICl7XHJcblxyXG5cdFx0XHRpZiggbC55ID4gdGhpcy53Zml4ZSApIHJldHVybiAndGl0bGUnXHJcblx0XHQgICAgZWxzZSByZXR1cm4gJ2NvbG9yJ1xyXG5cclxuXHRcdH0gZWxzZSB7XHJcblxyXG5cdFx0XHRpZiggbC55IDwgdGhpcy5iYXNlSCsyICkgcmV0dXJuICd0aXRsZSdcclxuXHQgICAgXHRlbHNlIGlmKCB0aGlzLmlzT3BlbiApIHJldHVybiAnY29sb3InXHJcblxyXG5cdFx0fVxyXG5cclxuICAgIH1cclxuXHJcblx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBFVkVOVFNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcblx0bW91c2V1cCAoIGUgKSB7XHJcblxyXG5cdCAgICB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG5cdCAgICB0aGlzLmQgPSAyNTY7XHJcblxyXG5cdH1cclxuXHJcblx0bW91c2Vkb3duICggZSApIHtcclxuXHJcblxyXG5cdFx0bGV0IG5hbWUgPSB0aGlzLnRlc3Rab25lKCBlLmNsaWVudFgsIGUuY2xpZW50WSApO1xyXG5cclxuXHJcblx0XHQvL2lmKCAhbmFtZSApIHJldHVybjtcclxuXHRcdGlmKG5hbWUgPT09ICd0aXRsZScpe1xyXG5cdFx0XHRpZiggIXRoaXMuaXNPcGVuICkgdGhpcy5vcGVuKCk7XHJcblx0ICAgICAgICBlbHNlIHRoaXMuY2xvc2UoKTtcclxuXHQgICAgICAgIHJldHVybiB0cnVlO1xyXG5cdFx0fVxyXG5cclxuXHJcblx0XHRpZiggbmFtZSA9PT0gJ2NvbG9yJyApe1xyXG5cclxuXHRcdFx0dGhpcy5pc0Rvd24gPSB0cnVlO1xyXG5cdFx0XHR0aGlzLmZpc3REb3duID0gdHJ1ZVxyXG5cdFx0XHR0aGlzLm1vdXNlbW92ZSggZSApO1xyXG5cdFx0fVxyXG5cdH1cclxuXHJcblx0bW91c2Vtb3ZlICggZSApIHtcclxuXHJcblx0ICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZSggZS5jbGllbnRYLCBlLmNsaWVudFkgKTtcclxuXHJcblx0ICAgIGxldCBvZmYsIGQsIGh1ZSwgc2F0LCBsdW0sIHJhZCwgeCwgeSwgcnIsIFQgPSBUb29scztcclxuXHJcblx0ICAgIGlmKCBuYW1lID09PSAndGl0bGUnICkgdGhpcy5jdXJzb3IoJ3BvaW50ZXInKTtcclxuXHJcblx0ICAgIGlmKCBuYW1lID09PSAnY29sb3InICl7XHJcblxyXG5cdCAgICBcdG9mZiA9IHRoaXMub2Zmc2V0O1xyXG5cdFx0ICAgIG9mZi54ID0gZS5jbGllbnRYIC0gKCB0aGlzLnpvbmUueCArIHRoaXMuZGVjYWwueCArIHRoaXMubWlkICk7XHJcblx0XHQgICAgb2ZmLnkgPSBlLmNsaWVudFkgLSAoIHRoaXMuem9uZS55ICsgdGhpcy5kZWNhbC55ICsgdGhpcy5taWQgKSAtIHRoaXMueXRvcDtcclxuXHRcdFx0ZCA9IG9mZi5sZW5ndGgoKSAqIHRoaXMucmF0aW87XHJcblx0XHRcdHJyID0gb2ZmLmFuZ2xlKCk7XHJcblx0XHRcdGlmKHJyIDwgMCkgcnIgKz0gMiAqIFQuUEk7XHJcblx0XHRcdFx0XHRcdFxyXG5cclxuXHQgICAgXHRpZiAoIGQgPCAxMjggKSB0aGlzLmN1cnNvcignY3Jvc3NoYWlyJyk7XHJcblx0ICAgIFx0ZWxzZSBpZiggIXRoaXMuaXNEb3duICkgdGhpcy5jdXJzb3IoKVxyXG5cclxuXHQgICAgXHRpZiggdGhpcy5pc0Rvd24gKXtcclxuXHJcblx0XHRcdCAgICBpZiggdGhpcy5maXN0RG93biApe1xyXG5cdFx0XHQgICAgXHR0aGlzLmQgPSBkO1xyXG5cdFx0XHQgICAgXHR0aGlzLmZpc3REb3duID0gZmFsc2U7XHJcblx0XHRcdCAgICB9XHJcblxyXG5cdFx0XHQgICAgaWYgKCB0aGlzLmQgPCAxMjggKSB7XHJcblxyXG5cdFx0XHRcdCAgICBpZiAoIHRoaXMuZCA+IHRoaXMudHIgKSB7IC8vIG91dHNpZGUgaHVlXHJcblxyXG5cdFx0XHRcdCAgICAgICAgaHVlID0gKCByciArIFQucGk5MCApIC8gVC5Ud29QSTtcclxuXHRcdFx0XHQgICAgICAgIHRoaXMuaHVlID0gKGh1ZSArIDEpICUgMTtcclxuXHRcdFx0XHQgICAgICAgIHRoaXMuc2V0SFNMKFsoaHVlICsgMSkgJSAxLCB0aGlzLmhzbFsxXSwgdGhpcy5oc2xbMl1dKTtcclxuXHJcblx0XHRcdFx0ICAgIH0gZWxzZSB7IC8vIHRyaWFuZ2xlXHJcblxyXG5cdFx0XHRcdCAgICBcdHggPSBvZmYueCAqIHRoaXMucmF0aW87XHJcblx0XHRcdFx0ICAgIFx0eSA9IG9mZi55ICogdGhpcy5yYXRpbztcclxuXHJcblx0XHRcdFx0ICAgIFx0bGV0IHJyID0gKHRoaXMuaHVlICogVC5Ud29QSSkgKyBULlBJO1xyXG5cdFx0XHRcdCAgICBcdGlmKHJyIDwgMCkgcnIgKz0gMiAqIFQuUEk7XHJcblxyXG5cdFx0XHRcdCAgICBcdHJhZCA9IE1hdGguYXRhbjIoLXksIHgpO1xyXG5cdFx0XHRcdCAgICBcdGlmKHJhZCA8IDApIHJhZCArPSAyICogVC5QSTtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0ICAgIFx0bGV0IHJhZDAgPSAoIHJhZCArIFQucGk5MCArIFQuVHdvUEkgKyByciApICUgKFQuVHdvUEkpLFxyXG5cdFx0XHRcdCAgICBcdHJhZDEgPSByYWQwICUgKCgyLzMpICogVC5QSSkgLSAoVC5waTYwKSxcclxuXHRcdFx0XHQgICAgXHRhICAgID0gMC41ICogdGhpcy50cixcclxuXHRcdFx0XHQgICAgXHRiICAgID0gTWF0aC50YW4ocmFkMSkgKiBhLFxyXG5cdFx0XHRcdCAgICBcdHIgICAgPSBNYXRoLnNxcnQoeCp4ICsgeSp5KSxcclxuXHRcdFx0XHQgICAgXHRtYXhSID0gTWF0aC5zcXJ0KGEqYSArIGIqYik7XHJcblxyXG5cdFx0XHRcdCAgICBcdGlmKCByID4gbWF4UiApIHtcclxuXHRcdFx0XHRcdFx0XHRsZXQgZHggPSBNYXRoLnRhbihyYWQxKSAqIHI7XHJcblx0XHRcdFx0XHRcdFx0bGV0IHJhZDIgPSBNYXRoLmF0YW4oZHggLyBtYXhSKTtcclxuXHRcdFx0XHRcdFx0XHRpZihyYWQyID4gVC5waTYwKSAgcmFkMiA9IFQucGk2MDtcclxuXHRcdFx0XHRcdFx0ICAgIGVsc2UgaWYoIHJhZDIgPCAtVC5waTYwICkgcmFkMiA9IC1ULnBpNjA7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRcdHJhZCArPSByYWQyIC0gcmFkMTtcclxuXHJcblx0XHRcdFx0XHRcdFx0cmFkMCA9IChyYWQgKyBULnBpOTAgICsgVC5Ud29QSSArIHJyKSAlIChULlR3b1BJKSxcclxuXHRcdFx0XHRcdFx0XHRyYWQxID0gcmFkMCAlICgoMi8zKSAqIFQuUEkpIC0gKFQucGk2MCk7XHJcblx0XHRcdFx0XHRcdFx0YiA9IE1hdGgudGFuKHJhZDEpICogYTtcclxuXHRcdFx0XHRcdFx0XHRyID0gbWF4UiA9IE1hdGguc3FydChhKmEgKyBiKmIpO1xyXG5cdFx0XHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdFx0XHRsdW0gPSAoKE1hdGguc2luKHJhZDApICogcikgLyB0aGlzLnRzbCkgKyAwLjU7XHJcblx0XHRcdFx0XHJcblx0XHRcdFx0XHRcdGxldCB3ID0gMSAtIChNYXRoLmFicyhsdW0gLSAwLjUpICogMik7XHJcblx0XHRcdFx0XHRcdHNhdCA9ICgoKE1hdGguY29zKHJhZDApICogcikgKyAodGhpcy50ciAvIDIpKSAvICgxLjUgKiB0aGlzLnRyKSkgLyB3O1xyXG5cdFx0XHRcdFx0XHRzYXQgPSBULmNsYW1wKCBzYXQsIDAsIDEgKTtcclxuXHRcdFx0XHRcdFx0XHJcblx0XHRcdFx0ICAgICAgICB0aGlzLnNldEhTTChbdGhpcy5oc2xbMF0sIHNhdCwgbHVtXSk7XHJcblxyXG5cdFx0XHRcdCAgICB9XHJcblx0XHRcdFx0fVxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblxyXG5cdH1cclxuXHJcblx0Ly8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuXHRzZXRIZWlnaHQgKCkge1xyXG5cclxuXHRcdHRoaXMuaCA9IHRoaXMuaXNPcGVuID8gdGhpcy53Zml4ZSArIHRoaXMuYmFzZUggKyA1IDogdGhpcy5iYXNlSFxyXG5cdFx0dGhpcy5zWzBdLmhlaWdodCA9IHRoaXMuaCArICdweCdcclxuXHRcdHRoaXMuem9uZS5oID0gdGhpcy5oXHJcblxyXG5cdH1cclxuXHJcblx0cGFyZW50SGVpZ2h0ICggdCApIHtcclxuXHJcblx0XHRpZiAoIHRoaXMuZ3JvdXAgIT09IG51bGwgKSB0aGlzLmdyb3VwLmNhbGMoIHQgKTtcclxuXHQgICAgZWxzZSBpZiAoIHRoaXMuaXNVSSApIHRoaXMubWFpbi5jYWxjKCB0ICk7XHJcblxyXG5cdH1cclxuXHJcblx0b3BlbiAoKSB7XHJcblxyXG5cdFx0c3VwZXIub3BlbigpO1xyXG5cclxuXHRcdHRoaXMuc2V0SGVpZ2h0KCk7XHJcblxyXG5cdFx0aWYoIHRoaXMudXAgKSB0aGlzLnpvbmUueSAtPSB0aGlzLndmaXhlICsgNTtcclxuXHJcblx0XHRsZXQgdCA9IHRoaXMuaCAtIHRoaXMuYmFzZUg7XHJcblxyXG5cdCAgICB0aGlzLnNbM10udmlzaWJpbGl0eSA9ICd2aXNpYmxlJztcclxuXHQgICAgLy90aGlzLnNbM10uZGlzcGxheSA9ICdibG9jayc7XHJcblx0ICAgIHRoaXMucGFyZW50SGVpZ2h0KCB0ICk7XHJcblxyXG5cdH1cclxuXHJcblx0Y2xvc2UgKCkge1xyXG5cclxuXHRcdHN1cGVyLmNsb3NlKCk7XHJcblxyXG5cdFx0aWYoIHRoaXMudXAgKSB0aGlzLnpvbmUueSArPSB0aGlzLndmaXhlICsgNTtcclxuXHJcblx0XHRsZXQgdCA9IHRoaXMuaCAtIHRoaXMuYmFzZUg7XHJcblxyXG5cdFx0dGhpcy5zZXRIZWlnaHQoKTtcclxuXHJcblx0ICAgIHRoaXMuc1szXS52aXNpYmlsaXR5ICA9ICdoaWRkZW4nO1xyXG5cdCAgICAvL3RoaXMuc1szXS5kaXNwbGF5ID0gJ25vbmUnO1xyXG5cdCAgICB0aGlzLnBhcmVudEhlaWdodCggLXQgKTtcclxuXHJcblx0fVxyXG5cclxuXHR1cGRhdGUgKCB1cCApIHtcclxuXHJcblx0ICAgIGxldCBjYyA9IFRvb2xzLnJnYlRvSGV4KCBUb29scy5oc2xUb1JnYihbIHRoaXMuaHNsWzBdLCAxLCAwLjUgXSkgKTtcclxuXHJcblx0ICAgIHRoaXMubW92ZU1hcmtlcnMoKTtcclxuXHQgICAgXHJcblx0ICAgIHRoaXMudmFsdWUgPSB0aGlzLmJjb2xvcjtcclxuXHJcblx0ICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdmaWxsJywgY2MsIDIsIDAgKTtcclxuXHJcblx0ICAgIHRoaXMuc1syXS5iYWNrZ3JvdW5kID0gdGhpcy5iY29sb3I7XHJcblx0ICAgIGlmKCF0aGlzLm5vdGV4dCkgdGhpcy5jWzJdLnRleHRDb250ZW50ID0gVG9vbHMuaHRtbFRvSGV4KCB0aGlzLmJjb2xvciApO1xyXG5cclxuXHQgICAgdGhpcy5pbnZlcnQgPSBUb29scy5maW5kRGVlcEludmVyKCB0aGlzLnJnYiApO1xyXG5cdCAgICB0aGlzLnNbMl0uY29sb3IgPSB0aGlzLmludmVydCA/ICcjZmZmJyA6ICcjMDAwJztcclxuXHJcblx0ICAgIGlmKCF1cCkgcmV0dXJuO1xyXG5cclxuXHQgICAgaWYoIHRoaXMuY3R5cGUgPT09ICdhcnJheScgKSB0aGlzLnNlbmQoIHRoaXMucmdiICk7XHJcblx0ICAgIGlmKCB0aGlzLmN0eXBlID09PSAncmdiJyApIHRoaXMuc2VuZCggVG9vbHMuaHRtbFJnYiggdGhpcy5yZ2IgKSApO1xyXG5cdCAgICBpZiggdGhpcy5jdHlwZSA9PT0gJ2hleCcgKSB0aGlzLnNlbmQoIFRvb2xzLmh0bWxUb0hleCggdGhpcy52YWx1ZSApICk7XHJcblx0ICAgIGlmKCB0aGlzLmN0eXBlID09PSAnaHRtbCcgKSB0aGlzLnNlbmQoKTtcclxuXHJcblx0fVxyXG5cclxuXHRzZXRWYWx1ZSAoIHYgKXtcclxuXHJcblx0XHRpZiggdiBpbnN0YW5jZW9mIEFycmF5ICkgdGhpcy52YWx1ZSA9IFRvb2xzLnJnYlRvSGV4KCB2ICk7XHJcbiAgICAgICAgZWxzZSBpZighaXNOYU4odikpIHRoaXMudmFsdWUgPSBUb29scy5oZXhUb0h0bWwoIHYgKTtcclxuICAgICAgICBlbHNlIHRoaXMudmFsdWUgPSB2O1xyXG5cclxuXHRcdHRoaXMuc2V0Q29sb3IoIHRoaXMudmFsdWUgKVxyXG4gICAgICAgIHRoaXMudXBkYXRlKCk7XHJcblxyXG5cdH1cclxuXHJcblx0c2V0Q29sb3IgKCBjb2xvciApIHtcclxuXHJcblx0ICAgIGxldCB1bnBhY2sgPSBUb29scy51bnBhY2soY29sb3IpO1xyXG5cdCAgICBpZiAodGhpcy5iY29sb3IgIT09IGNvbG9yICYmIHVucGFjaykge1xyXG5cclxuXHQgICAgICAgIHRoaXMuYmNvbG9yID0gY29sb3JcclxuXHQgICAgICAgIHRoaXMucmdiID0gdW5wYWNrXHJcblx0ICAgICAgICB0aGlzLmhzbCA9IFRvb2xzLnJnYlRvSHNsKCB0aGlzLnJnYiApXHJcblxyXG5cdCAgICAgICAgdGhpcy5odWUgPSB0aGlzLmhzbFswXTtcclxuXHJcblx0ICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG5cdCAgICB9XHJcblx0ICAgIHJldHVybiB0aGlzO1xyXG5cclxuXHR9XHJcblxyXG5cdHNldEhTTCAoIGhzbCApIHtcclxuXHJcblx0ICAgIHRoaXMuaHNsID0gaHNsO1xyXG5cdCAgICB0aGlzLnJnYiA9IFRvb2xzLmhzbFRvUmdiKCBoc2wgKTtcclxuXHQgICAgdGhpcy5iY29sb3IgPSBUb29scy5yZ2JUb0hleCggdGhpcy5yZ2IgKTtcclxuXHQgICAgdGhpcy51cGRhdGUoIHRydWUgKTtcclxuXHQgICAgcmV0dXJuIHRoaXM7XHJcblxyXG5cdH1cclxuXHJcblx0bW92ZU1hcmtlcnMgKCkge1xyXG5cclxuXHRcdGxldCBwID0gdGhpcy5wcFxyXG5cdFx0bGV0IFQgPSBUb29sc1xyXG5cclxuXHQgICAgbGV0IGMxID0gdGhpcy5pbnZlcnQgPyAnI2ZmZicgOiAnIzAwMCc7XHJcblx0ICAgIGxldCBhID0gdGhpcy5oc2xbMF0gKiBULlR3b1BJO1xyXG5cdCAgICBsZXQgdGhpcmQgPSAoMi8zKSAqIFQuUEk7XHJcblx0ICAgIGxldCByID0gdGhpcy50cjtcclxuXHQgICAgbGV0IGggPSB0aGlzLmhzbFswXTtcclxuXHQgICAgbGV0IHMgPSB0aGlzLmhzbFsxXTtcclxuXHQgICAgbGV0IGwgPSB0aGlzLmhzbFsyXTtcclxuXHJcblx0ICAgIGxldCBhbmdsZSA9ICggYSAtIFQucGk5MCApICogVC50b2RlZztcclxuXHJcblx0ICAgIGggPSAtIGEgKyBULnBpOTA7XHJcblxyXG5cdFx0bGV0IGh4ID0gTWF0aC5jb3MoaCkgKiByO1xyXG5cdFx0bGV0IGh5ID0gLU1hdGguc2luKGgpICogcjtcclxuXHRcdGxldCBzeCA9IE1hdGguY29zKGggLSB0aGlyZCkgKiByO1xyXG5cdFx0bGV0IHN5ID0gLU1hdGguc2luKGggLSB0aGlyZCkgKiByO1xyXG5cdFx0bGV0IHZ4ID0gTWF0aC5jb3MoaCArIHRoaXJkKSAqIHI7XHJcblx0XHRsZXQgdnkgPSAtTWF0aC5zaW4oaCArIHRoaXJkKSAqIHI7XHJcblx0XHRsZXQgbXggPSAoc3ggKyB2eCkgLyAyLCBteSA9IChzeSArIHZ5KSAvIDI7XHJcblx0XHRhICA9ICgxIC0gMiAqIE1hdGguYWJzKGwgLSAuNSkpICogcztcclxuXHRcdGxldCB4ID0gc3ggKyAodnggLSBzeCkgKiBsICsgKGh4IC0gbXgpICogYTtcclxuXHRcdGxldCB5ID0gc3kgKyAodnkgLSBzeSkgKiBsICsgKGh5IC0gbXkpICogYTtcclxuXHJcblx0ICAgIHAuc2V0KCB4LCB5ICkuYWRkU2NhbGFyKDEyOCk7XHJcblxyXG5cdCAgICAvL2xldCBmZiA9ICgxLWwpKjI1NTtcclxuXHQgICAgLy8gdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsICdyZ2IoJytmZisnLCcrZmYrJywnK2ZmKycpJywgMyApO1xyXG5cclxuXHQgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3RyYW5zZm9ybScsICdyb3RhdGUoJythbmdsZSsnICknLCAyICk7XHJcblxyXG5cdCAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnY3gnLCBwLngsIDMgKTtcclxuXHQgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2N5JywgcC55LCAzICk7XHJcblx0ICAgIFxyXG5cdCAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgdGhpcy5pbnZlcnQgPyAnI2ZmZicgOiAnIzAwMCcsIDIsIDMgKTtcclxuXHQgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIHRoaXMuaW52ZXJ0ID8gJyNmZmYnIDogJyMwMDAnLCAzICk7XHJcblx0ICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdmaWxsJyx0aGlzLmJjb2xvciwgMyApO1xyXG5cclxuXHR9XHJcblxyXG5cdHJTaXplICgpIHtcclxuXHJcblx0ICAgIC8vUHJvdG8ucHJvdG90eXBlLnJTaXplLmNhbGwoIHRoaXMgKTtcclxuXHQgICAgc3VwZXIuclNpemUoKTtcclxuXHJcblx0ICAgIGxldCBzID0gdGhpcy5zO1xyXG5cclxuXHQgICAgc1syXS53aWR0aCA9IHRoaXMuc2IgKyAncHgnO1xyXG5cdCAgICBzWzJdLmxlZnQgPSB0aGlzLnNhICsgJ3B4JztcclxuXHJcblx0ICAgIC8vY29uc29sZS5sb2codGhpcy5zYilcclxuXHJcblx0ICAgIHRoaXMuY3cgPSB0aGlzLnNiID4gMjU2ID8gMjU2IDogdGhpcy5zYjtcclxuXHJcblxyXG5cclxuXHQgICAgdGhpcy5yU2l6ZUNvbG9yKCB0aGlzLmN3ICk7XHJcblxyXG5cdCAgICB0aGlzLmRlY2FsLnggPSBNYXRoLmZsb29yKCh0aGlzLncgLSB0aGlzLndmaXhlKSAqIDAuNSk7XHJcblx0ICAgIC8vc1szXS5sZWZ0ID0gdGhpcy5kZWNhbC54ICsgJ3B4JztcclxuXHQgICAgXHJcblx0fVxyXG5cclxuXHRyU2l6ZUNvbG9yICggdyApIHtcclxuXHJcblxyXG5cdFx0aWYoIHcgPT09IHRoaXMud2ZpeGUgKSByZXR1cm47XHJcblxyXG5cclxuXHJcblx0XHR0aGlzLndmaXhlID0gdztcclxuXHJcblxyXG5cclxuXHRcdGxldCBzID0gdGhpcy5zO1xyXG5cclxuXHRcdC8vdGhpcy5kZWNhbC54ID0gTWF0aC5mbG9vcigodGhpcy53IC0gdGhpcy53Zml4ZSkgKiAwLjUpO1xyXG5cdCAgICB0aGlzLmRlY2FsLnkgPSB0aGlzLnNpZGUgPT09ICd1cCcgPyAyIDogdGhpcy5iYXNlSCArIDJcclxuXHQgICAgdGhpcy5taWQgPSBNYXRoLmZsb29yKCB0aGlzLndmaXhlICogMC41IClcclxuXHJcblx0ICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICd2aWV3Qm94JywgJzAgMCAnKyB0aGlzLndmaXhlICsgJyAnKyB0aGlzLndmaXhlIClcclxuXHQgICAgc1szXS53aWR0aCA9IHRoaXMud2ZpeGUgKyAncHgnXHJcblx0ICAgIHNbM10uaGVpZ2h0ID0gdGhpcy53Zml4ZSArICdweCdcclxuICAgIFx0Ly9zWzNdLmxlZnQgPSB0aGlzLmRlY2FsLnggKyAncHgnO1xyXG5cdCAgICBzWzNdLnRvcCA9IHRoaXMuZGVjYWwueSArICdweCdcclxuXHJcblx0ICAgIHRoaXMucmF0aW8gPSAyNTYgLyB0aGlzLndmaXhlXHJcblx0ICAgIHRoaXMuc3F1YXJlID0gMSAvICg2MCoodGhpcy53Zml4ZS8yNTYpKVxyXG5cdCAgICB0aGlzLnNldEhlaWdodCgpXHJcblxyXG5cdH1cclxuXHJcblxyXG59IiwiaW1wb3J0IHsgUm9vdHMgfSBmcm9tICcuLi9jb3JlL1Jvb3RzLmpzJztcclxuaW1wb3J0IHsgUHJvdG8gfSBmcm9tICcuLi9jb3JlL1Byb3RvLmpzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBGcHMgZXh0ZW5kcyBQcm90byB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoIG8gPSB7fSApIHtcclxuXHJcbiAgICAgICAgc3VwZXIoIG8gKTtcclxuXHJcbiAgICAgICAgdGhpcy5yb3VuZCA9IE1hdGgucm91bmQ7XHJcblxyXG4gICAgICAgIC8vdGhpcy5hdXRvSGVpZ2h0ID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgdGhpcy5iYXNlSCA9IHRoaXMuaDtcclxuICAgICAgICB0aGlzLmhwbHVzID0gby5ocGx1cyB8fCA1MDtcclxuXHJcbiAgICAgICAgdGhpcy5yZXMgPSBvLnJlcyB8fCA0MDtcclxuICAgICAgICB0aGlzLmwgPSAxO1xyXG5cclxuICAgICAgICB0aGlzLnByZWNpc2lvbiA9IG8ucHJlY2lzaW9uIHx8IDA7XHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIHRoaXMuY3VzdG9tID0gby5jdXN0b20gfHwgZmFsc2U7XHJcbiAgICAgICAgdGhpcy5uYW1lcyA9IG8ubmFtZXMgfHwgWydGUFMnLCAnTVMnXTtcclxuICAgICAgICBsZXQgY2MgPSBvLmNjIHx8IFsnMjIwLDIyMCwyMjAnLCAnMjU1LDI1NSwwJ107XHJcblxyXG4gICAgICAgLy8gdGhpcy5kaXZpZCA9IFsgMTAwLCAxMDAsIDEwMCBdO1xyXG4gICAgICAgLy8gdGhpcy5tdWx0eSA9IFsgMzAsIDMwLCAzMCBdO1xyXG5cclxuICAgICAgICB0aGlzLmFkZGluZyA9IG8uYWRkaW5nIHx8IGZhbHNlO1xyXG5cclxuICAgICAgICB0aGlzLnJhbmdlID0gby5yYW5nZSB8fCBbIDE2NSwgMTAwLCAxMDAgXTtcclxuXHJcbiAgICAgICAgdGhpcy5hbHBoYSA9IG8uYWxwaGEgfHwgMC4yNTtcclxuXHJcbiAgICAgICAgdGhpcy52YWx1ZXMgPSBbXTtcclxuICAgICAgICB0aGlzLnBvaW50cyA9IFtdO1xyXG4gICAgICAgIHRoaXMudGV4dERpc3BsYXkgPSBbXTtcclxuXHJcbiAgICAgICAgaWYoIXRoaXMuY3VzdG9tKXtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubm93ID0gUm9vdHMuZ2V0VGltZSgpXHJcbiAgICAgICAgICAgIHRoaXMuc3RhcnRUaW1lID0gMDsvL3RoaXMubm93KClcclxuICAgICAgICAgICAgdGhpcy5wcmV2VGltZSA9IDA7Ly90aGlzLnN0YXJ0VGltZTtcclxuICAgICAgICAgICAgdGhpcy5mcmFtZXMgPSAwO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tcyA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuZnBzID0gMDtcclxuICAgICAgICAgICAgdGhpcy5tZW0gPSAwO1xyXG4gICAgICAgICAgICB0aGlzLm1tID0gMDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaXNNZW0gPSAoIHNlbGYucGVyZm9ybWFuY2UgJiYgc2VsZi5wZXJmb3JtYW5jZS5tZW1vcnkgKSA/IHRydWUgOiBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgLy8gdGhpcy5kaXZpZCA9IFsgMTAwLCAyMDAsIDEgXTtcclxuICAgICAgICAgICAvLyB0aGlzLm11bHR5ID0gWyAzMCwgMzAsIDMwIF07XHJcblxyXG4gICAgICAgICAgICBpZiggdGhpcy5pc01lbSApe1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMubmFtZXMucHVzaCgnTUVNJyk7XHJcbiAgICAgICAgICAgICAgICBjYy5wdXNoKCcwLDI1NSwyNTUnKTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMudHh0ID0gby5uYW1lIHx8ICdGcHMnXHJcblxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIGxldCBmbHRvcCA9IE1hdGguZmxvb3IodGhpcy5oKjAuNSktMztcclxuICAgICAgICBjb25zdCBjY2MgPSB0aGlzLmNvbG9ycztcclxuXHJcbiAgICAgICAgdGhpcy5jWzFdLnRleHRDb250ZW50ID0gdGhpcy50eHQ7XHJcbiAgICAgICAgLy90aGlzLmNbMV0uaW5uZXJIVE1MID0gJyYjMTYwOycgKyB0aGlzLnR4dFxyXG4gICAgICAgIHRoaXMuY1swXS5zdHlsZS5jdXJzb3IgPSAncG9pbnRlcic7XHJcbiAgICAgICAgdGhpcy5jWzBdLnN0eWxlLnBvaW50ZXJFdmVudHMgPSAnYXV0byc7XHJcblxyXG4gICAgICAgIGxldCBwYW5lbENzcyA9ICdkaXNwbGF5Om5vbmU7IGxlZnQ6MTBweDsgdG9wOicrIHRoaXMuaCArICdweDsgaGVpZ2h0OicrKHRoaXMuaHBsdXMgLSA4KSsncHg7IGJveC1zaXppbmc6Ym9yZGVyLWJveDsgYmFja2dyb3VuZDogcmdiYSgwLCAwLCAwLCAwLjIpOyBib3JkZXI6MXB4IHNvbGlkICcrIGNjYy5ib3JkZXIgKyc7JztcclxuXHJcbiAgICAgICAgaWYoIHRoaXMucmFkaXVzICE9PSAwICkgcGFuZWxDc3MgKz0gJ2JvcmRlci1yYWRpdXM6JyArIHRoaXMucmFkaXVzKydweDsnOyBcclxuXHJcbiAgICAgICAgdGhpcy5jWzJdID0gdGhpcy5kb20oICdwYXRoJywgdGhpcy5jc3MuYmFzaWMgKyBwYW5lbENzcyAsIHt9ICk7XHJcblxyXG4gICAgICAgIHRoaXMuY1syXS5zZXRBdHRyaWJ1dGUoJ3ZpZXdCb3gnLCAnMCAwICcrdGhpcy5yZXMrJyA1MCcgKTtcclxuICAgICAgICB0aGlzLmNbMl0uc2V0QXR0cmlidXRlKCdoZWlnaHQnLCAnMTAwJScgKTtcclxuICAgICAgICB0aGlzLmNbMl0uc2V0QXR0cmlidXRlKCd3aWR0aCcsICcxMDAlJyApO1xyXG4gICAgICAgIHRoaXMuY1syXS5zZXRBdHRyaWJ1dGUoJ3ByZXNlcnZlQXNwZWN0UmF0aW8nLCAnbm9uZScgKTtcclxuXHJcblxyXG4gICAgICAgIC8vdGhpcy5kb20oICdwYXRoJywgbnVsbCwgeyBmaWxsOidyZ2JhKDI1NSwyNTUsMCwwLjMpJywgJ3N0cm9rZS13aWR0aCc6MSwgc3Ryb2tlOicjRkYwJywgJ3ZlY3Rvci1lZmZlY3QnOidub24tc2NhbGluZy1zdHJva2UnIH0sIHRoaXMuY1syXSApO1xyXG4gICAgICAgIC8vdGhpcy5kb20oICdwYXRoJywgbnVsbCwgeyBmaWxsOidyZ2JhKDAsMjU1LDI1NSwwLjMpJywgJ3N0cm9rZS13aWR0aCc6MSwgc3Ryb2tlOicjMEZGJywgJ3ZlY3Rvci1lZmZlY3QnOidub24tc2NhbGluZy1zdHJva2UnIH0sIHRoaXMuY1syXSApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIGFycm93XHJcbiAgICAgICAgdGhpcy5jWzNdID0gdGhpcy5kb20oICdwYXRoJywgdGhpcy5jc3MuYmFzaWMgKyAncG9zaXRpb246YWJzb2x1dGU7IHdpZHRoOjZweDsgaGVpZ2h0OjZweDsgbGVmdDowOyB0b3A6JytmbHRvcCsncHg7JywgeyBkOnRoaXMuc3Zncy5nMSwgZmlsbDpjY2MudGV4dCwgc3Ryb2tlOidub25lJ30pXHJcbiAgICAgICAgLy90aGlzLmNbM10gPSB0aGlzLmRvbSggJ3BhdGgnLCB0aGlzLmNzcy5iYXNpYyArICdwb3NpdGlvbjphYnNvbHV0ZTsgd2lkdGg6MTBweDsgaGVpZ2h0OjEwcHg7IGxlZnQ6NHB4OyB0b3A6JytmbHRvcCsncHg7JywgeyBkOnRoaXMuc3Zncy5hcnJvdywgZmlsbDp0aGlzLmNvbG9ycy50ZXh0LCBzdHJva2U6J25vbmUnfSk7XHJcblxyXG4gICAgICAgIC8vIHJlc3VsdCB0ZXN0XHJcbiAgICAgICAgdGhpcy5jWzRdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHQgKyAncG9zaXRpb246YWJzb2x1dGU7IGxlZnQ6MTBweDsgdG9wOicrKHRoaXMuaCsyKSArJ3B4OyBkaXNwbGF5Om5vbmU7IHdpZHRoOjEwMCU7IHRleHQtYWxpZ246Y2VudGVyOycgKTtcclxuXHJcbiAgICAgICAgLy8gYm90dG9tIGxpbmVcclxuICAgICAgICBpZiggby5ib3R0b21MaW5lICkgdGhpcy5jWzRdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy5iYXNpYyArICd3aWR0aDoxMDAlOyBib3R0b206MHB4OyBoZWlnaHQ6MXB4OyBiYWNrZ3JvdW5kOiByZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMik7Jyk7XHJcblxyXG4gICAgICAgIHRoaXMuaXNTaG93ID0gZmFsc2U7XHJcblxyXG5cclxuXHJcbiAgICAgICAgbGV0IHMgPSB0aGlzLnM7XHJcblxyXG4gICAgICAgIC8vc1sxXS5tYXJnaW5MZWZ0ID0gJzEwcHgnO1xyXG4gICAgICAgIHNbMV0ubGluZUhlaWdodCA9IHRoaXMuaC00O1xyXG4gICAgICAgIHNbMV0uY29sb3IgPSBjY2MudGV4dDtcclxuICAgICAgICAvL3NbMV0ucGFkZGluZ0xlZnQgPSAnMThweCc7XHJcbiAgICAgICAgLy9zWzFdLmZvbnRXZWlnaHQgPSAnYm9sZCc7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLnJhZGl1cyAhPT0gMCApICBzWzBdLmJvcmRlclJhZGl1cyA9IHRoaXMucmFkaXVzKydweCc7XHJcbiAgICAgICAgaWYoIHRoaXMuY29sb3JzLmdib3JkZXIhPT0nbm9uZScpIHNbMF0uYm9yZGVyID0gJzFweCBzb2xpZCAnICsgY2NjLmdib3JkZXI7XHJcblxyXG5cclxuXHJcblxyXG4gICAgICAgIGxldCBqID0gMDtcclxuXHJcbiAgICAgICAgZm9yKCBqPTA7IGo8dGhpcy5uYW1lcy5sZW5ndGg7IGorKyApe1xyXG5cclxuICAgICAgICAgICAgbGV0IGJhc2UgPSBbXTtcclxuICAgICAgICAgICAgbGV0IGkgPSB0aGlzLnJlcysxO1xyXG4gICAgICAgICAgICB3aGlsZSggaS0tICkgYmFzZS5wdXNoKDUwKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMucmFuZ2Vbal0gPSAoIDEgLyB0aGlzLnJhbmdlW2pdICkgKiA0OTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRzLnB1c2goIGJhc2UgKTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZXMucHVzaCgwKTtcclxuICAgICAgICAgICAvLyAgdGhpcy5kb20oICdwYXRoJywgbnVsbCwgeyBmaWxsOidyZ2JhKCcrY2Nbal0rJywwLjUpJywgJ3N0cm9rZS13aWR0aCc6MSwgc3Ryb2tlOidyZ2JhKCcrY2Nbal0rJywxKScsICd2ZWN0b3ItZWZmZWN0Jzonbm9uLXNjYWxpbmctc3Ryb2tlJyB9LCB0aGlzLmNbMl0gKTtcclxuICAgICAgICAgICAgdGhpcy50ZXh0RGlzcGxheS5wdXNoKCBcIjxzcGFuIHN0eWxlPSdjb2xvcjpyZ2IoXCIrY2Nbal0rXCIpJz4gXCIgKyB0aGlzLm5hbWVzW2pdICtcIiBcIik7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaiA9IHRoaXMubmFtZXMubGVuZ3RoO1xyXG4gICAgICAgIHdoaWxlKGotLSl7XHJcbiAgICAgICAgICAgIHRoaXMuZG9tKCAncGF0aCcsIG51bGwsIHsgZmlsbDoncmdiYSgnK2NjW2pdKycsJyt0aGlzLmFscGhhKycpJywgJ3N0cm9rZS13aWR0aCc6MSwgc3Ryb2tlOidyZ2JhKCcrY2Nbal0rJywxKScsICd2ZWN0b3ItZWZmZWN0Jzonbm9uLXNjYWxpbmctc3Ryb2tlJyB9LCB0aGlzLmNbMl0gKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB0aGlzLmluaXQoKTtcclxuXHJcbiAgICAgICAgLy9pZiggdGhpcy5pc1Nob3cgKSB0aGlzLnNob3coKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBFVkVOVFNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBtb3VzZWRvd24gKCBlICkge1xyXG5cclxuICAgICAgICBpZiggdGhpcy5pc1Nob3cgKSB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgZWxzZSB0aGlzLm9wZW4oKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIC8qbW9kZTogZnVuY3Rpb24gKCBtb2RlICkge1xyXG5cclxuICAgICAgICBsZXQgcyA9IHRoaXMucztcclxuXHJcbiAgICAgICAgc3dpdGNoKG1vZGUpe1xyXG4gICAgICAgICAgICBjYXNlIDA6IC8vIGJhc2VcclxuICAgICAgICAgICAgICAgIHNbMV0uY29sb3IgPSB0aGlzLmNvbG9ycy50ZXh0O1xyXG4gICAgICAgICAgICAgICAgLy9zWzFdLmJhY2tncm91bmQgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDE6IC8vIG92ZXJcclxuICAgICAgICAgICAgICAgIHNbMV0uY29sb3IgPSAnI0ZGRic7XHJcbiAgICAgICAgICAgICAgICAvL3NbMV0uYmFja2dyb3VuZCA9IFVJTC5TRUxFQ1Q7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6IC8vIGVkaXQgLyBkb3duXHJcbiAgICAgICAgICAgICAgICBzWzFdLmNvbG9yID0gdGhpcy5jb2xvcnMudGV4dDtcclxuICAgICAgICAgICAgICAgIC8vc1sxXS5iYWNrZ3JvdW5kID0gVUlMLlNFTEVDVERPV047XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9LCovXHJcblxyXG4gICAgdGljayAoIHYgKSB7XHJcblxyXG4gICAgICAgIHRoaXMudmFsdWVzID0gdjtcclxuICAgICAgICBpZiggIXRoaXMuaXNTaG93ICkgcmV0dXJuO1xyXG4gICAgICAgIHRoaXMuZHJhd0dyYXBoKCk7XHJcbiAgICAgICAgdGhpcy51cFRleHQoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbWFrZVBhdGggKCBwb2ludCApIHtcclxuXHJcbiAgICAgICAgbGV0IHAgPSAnJztcclxuICAgICAgICBwICs9ICdNICcgKyAoLTEpICsgJyAnICsgNTA7XHJcbiAgICAgICAgZm9yICggbGV0IGkgPSAwOyBpIDwgdGhpcy5yZXMgKyAxOyBpICsrICkgeyBwICs9ICcgTCAnICsgaSArICcgJyArIHBvaW50W2ldOyB9XHJcbiAgICAgICAgcCArPSAnIEwgJyArICh0aGlzLnJlcyArIDEpICsgJyAnICsgNTA7XHJcbiAgICAgICAgcmV0dXJuIHA7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHVwVGV4dCAoIHZhbCApIHtcclxuXHJcbiAgICAgICAgbGV0IHYgPSB2YWwgfHwgdGhpcy52YWx1ZXMsIHQgPSAnJztcclxuICAgICAgICBmb3IoIGxldCBqPTAsIGxuZyA9dGhpcy5uYW1lcy5sZW5ndGg7IGo8bG5nOyBqKysgKSB0ICs9IHRoaXMudGV4dERpc3BsYXlbal0gKyAodltqXSkudG9GaXhlZCh0aGlzLnByZWNpc2lvbikgKyAnPC9zcGFuPic7XHJcbiAgICAgICAgdGhpcy5jWzRdLmlubmVySFRNTCA9IHQ7XHJcbiAgICBcclxuICAgIH1cclxuXHJcbiAgICBkcmF3R3JhcGggKCkge1xyXG5cclxuICAgICAgICBsZXQgc3ZnID0gdGhpcy5jWzJdO1xyXG4gICAgICAgIGxldCBpID0gdGhpcy5uYW1lcy5sZW5ndGgsIHYsIG9sZCA9IDAsIG4gPSAwO1xyXG5cclxuICAgICAgICB3aGlsZSggaS0tICl7XHJcbiAgICAgICAgICAgIGlmKCB0aGlzLmFkZGluZyApIHYgPSAodGhpcy52YWx1ZXNbbl0rb2xkKSAqIHRoaXMucmFuZ2Vbbl07XHJcbiAgICAgICAgICAgIGVsc2UgIHYgPSAodGhpcy52YWx1ZXNbbl0gKiB0aGlzLnJhbmdlW25dKTtcclxuICAgICAgICAgICAgdGhpcy5wb2ludHNbbl0uc2hpZnQoKTtcclxuICAgICAgICAgICAgdGhpcy5wb2ludHNbbl0ucHVzaCggNTAgLSB2ICk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCBzdmcsICdkJywgdGhpcy5tYWtlUGF0aCggdGhpcy5wb2ludHNbbl0gKSwgaSsxICk7XHJcbiAgICAgICAgICAgIG9sZCArPSB0aGlzLnZhbHVlc1tuXTtcclxuICAgICAgICAgICAgbisrO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG9wZW4gKCkge1xyXG5cclxuICAgICAgICBzdXBlci5vcGVuKClcclxuXHJcbiAgICAgICAgdGhpcy5oID0gdGhpcy5ocGx1cyArIHRoaXMuYmFzZUg7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdkJywgdGhpcy5zdmdzLmcyICk7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmdyb3VwICE9PSBudWxsICl7IHRoaXMuZ3JvdXAuY2FsYyggdGhpcy5ocGx1cyApO31cclxuICAgICAgICBlbHNlIGlmKCB0aGlzLmlzVUkgKSB0aGlzLm1haW4uY2FsYyggdGhpcy5ocGx1cyApO1xyXG5cclxuICAgICAgICB0aGlzLnNbMF0uaGVpZ2h0ID0gdGhpcy5oICsncHgnO1xyXG4gICAgICAgIHRoaXMuc1syXS5kaXNwbGF5ID0gJ2Jsb2NrJzsgXHJcbiAgICAgICAgdGhpcy5zWzRdLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgICAgIHRoaXMuaXNTaG93ID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgaWYoICF0aGlzLmN1c3RvbSApIFJvb3RzLmFkZExpc3RlbiggdGhpcyApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjbG9zZSAoKSB7XHJcblxyXG4gICAgICAgIHN1cGVyLmNsb3NlKClcclxuXHJcbiAgICAgICAgdGhpcy5oID0gdGhpcy5iYXNlSDtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2QnLCB0aGlzLnN2Z3MuZzEgKTtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuZ3JvdXAgIT09IG51bGwgKXsgdGhpcy5ncm91cC5jYWxjKCAtdGhpcy5ocGx1cyApO31cclxuICAgICAgICBlbHNlIGlmKCB0aGlzLmlzVUkgKSB0aGlzLm1haW4uY2FsYyggLXRoaXMuaHBsdXMgKTtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLnNbMF0uaGVpZ2h0ID0gdGhpcy5oICsncHgnO1xyXG4gICAgICAgIHRoaXMuc1syXS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIHRoaXMuc1s0XS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIHRoaXMuaXNTaG93ID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmKCAhdGhpcy5jdXN0b20gKSBSb290cy5yZW1vdmVMaXN0ZW4oIHRoaXMgKTtcclxuXHJcbiAgICAgICAgdGhpcy5jWzRdLmlubmVySFRNTCA9ICcnO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvLy8vLyBBVVRPIEZQUyAvLy8vLy9cclxuXHJcbiAgICBiZWdpbiAoKSB7XHJcblxyXG4gICAgICAgIHRoaXMuc3RhcnRUaW1lID0gdGhpcy5ub3coKTtcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICBlbmQgKCkge1xyXG5cclxuICAgICAgICBsZXQgdGltZSA9IHRoaXMubm93KCk7XHJcbiAgICAgICAgdGhpcy5tcyA9IHRpbWUgLSB0aGlzLnN0YXJ0VGltZTtcclxuXHJcbiAgICAgICAgdGhpcy5mcmFtZXMgKys7XHJcblxyXG4gICAgICAgIGlmICggdGltZSA+IHRoaXMucHJldlRpbWUgKyAxMDAwICkge1xyXG5cclxuICAgICAgICAgICAgdGhpcy5mcHMgPSB0aGlzLnJvdW5kKCAoIHRoaXMuZnJhbWVzICogMTAwMCApIC8gKCB0aW1lIC0gdGhpcy5wcmV2VGltZSApICk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnByZXZUaW1lID0gdGltZTtcclxuICAgICAgICAgICAgdGhpcy5mcmFtZXMgPSAwO1xyXG5cclxuICAgICAgICAgICAgaWYgKCB0aGlzLmlzTWVtICkge1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBoZWFwU2l6ZSA9IHBlcmZvcm1hbmNlLm1lbW9yeS51c2VkSlNIZWFwU2l6ZTtcclxuICAgICAgICAgICAgICAgIGxldCBoZWFwU2l6ZUxpbWl0ID0gcGVyZm9ybWFuY2UubWVtb3J5LmpzSGVhcFNpemVMaW1pdDtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLm1lbSA9IHRoaXMucm91bmQoIGhlYXBTaXplICogMC4wMDAwMDA5NTQgKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubW0gPSBoZWFwU2l6ZSAvIGhlYXBTaXplTGltaXQ7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy52YWx1ZXMgPSBbIHRoaXMuZnBzLCB0aGlzLm1zICwgdGhpcy5tbSBdO1xyXG5cclxuICAgICAgICB0aGlzLmRyYXdHcmFwaCgpO1xyXG4gICAgICAgIHRoaXMudXBUZXh0KCBbIHRoaXMuZnBzLCB0aGlzLm1zLCB0aGlzLm1lbSBdICk7XHJcblxyXG4gICAgICAgIHJldHVybiB0aW1lO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBsaXN0ZW5pbmcgKCkge1xyXG5cclxuICAgICAgICBpZiggIXRoaXMuY3VzdG9tICkgdGhpcy5zdGFydFRpbWUgPSB0aGlzLmVuZCgpO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIHJTaXplICgpIHtcclxuXHJcbiAgICAgICAgbGV0IHMgPSB0aGlzLnM7XHJcbiAgICAgICAgbGV0IHcgPSB0aGlzLnc7XHJcblxyXG4gICAgICAgIHNbM10ubGVmdCA9ICggdGhpcy5zYSArIHRoaXMuc2IgLSA2ICkgKyAncHgnXHJcblxyXG4gICAgICAgIHNbMF0ud2lkdGggPSB3ICsgJ3B4JztcclxuICAgICAgICBzWzFdLndpZHRoID0gdyArICdweCc7XHJcbiAgICAgICAgc1syXS5sZWZ0ID0gMTAgKyAncHgnO1xyXG4gICAgICAgIHNbMl0ud2lkdGggPSAody0yMCkgKyAncHgnO1xyXG4gICAgICAgIHNbNF0ud2lkdGggPSAody0yMCkgKyAncHgnO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG4gICAgXHJcbn0iLCJpbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5pbXBvcnQgeyBWMiB9IGZyb20gJy4uL2NvcmUvVjIuanMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEdyYXBoIGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvICk7XHJcblxyXG4gICAgXHR0aGlzLnZhbHVlID0gby52YWx1ZSAhPT0gdW5kZWZpbmVkID8gby52YWx1ZSA6IFswLDAsMF07XHJcbiAgICAgICAgdGhpcy5sbmcgPSB0aGlzLnZhbHVlLmxlbmd0aDtcclxuXHJcbiAgICAgICAgdGhpcy5wcmVjaXNpb24gPSBvLnByZWNpc2lvbiAhPT0gdW5kZWZpbmVkID8gby5wcmVjaXNpb24gOiAyO1xyXG4gICAgICAgIHRoaXMubXVsdGlwbGljYXRvciA9IG8ubXVsdGlwbGljYXRvciB8fCAxO1xyXG4gICAgICAgIHRoaXMubmVnID0gby5uZWcgfHwgZmFsc2U7XHJcblxyXG4gICAgICAgIHRoaXMubGluZSA9IG8ubGluZSAhPT0gdW5kZWZpbmVkID8gIG8ubGluZSA6IHRydWU7XHJcblxyXG4gICAgICAgIC8vaWYodGhpcy5uZWcpdGhpcy5tdWx0aXBsaWNhdG9yKj0yO1xyXG5cclxuICAgICAgICB0aGlzLmF1dG9XaWR0aCA9IG8uYXV0b1dpZHRoICE9PSB1bmRlZmluZWQgPyBvLmF1dG9XaWR0aCA6IHRydWU7XHJcbiAgICAgICAgdGhpcy5pc051bWJlciA9IGZhbHNlO1xyXG5cclxuICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG5cclxuICAgICAgICB0aGlzLmggPSBvLmggfHwgMTI4ICsgMTA7XHJcbiAgICAgICAgdGhpcy5yaCA9IHRoaXMuaCAtIDEwO1xyXG4gICAgICAgIHRoaXMudG9wID0gMDtcclxuXHJcbiAgICAgICAgdGhpcy5jWzBdLnN0eWxlLndpZHRoID0gdGhpcy53ICsncHgnO1xyXG5cclxuICAgICAgICBpZiggdGhpcy5jWzFdICE9PSB1bmRlZmluZWQgKSB7IC8vIHdpdGggdGl0bGVcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY1sxXS5zdHlsZS53aWR0aCA9IHRoaXMudyArJ3B4JztcclxuXHJcbiAgICAgICAgICAgIGlmKCF0aGlzLmF1dG9XaWR0aCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNbMV0uc3R5bGUud2lkdGggPSAnMTAwJSc7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNbMV0uc3R5bGUuanVzdGlmeUNvbnRlbnQgPSAnY2VudGVyJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy90aGlzLmNbMV0uc3R5bGUuYmFja2dyb3VuZCA9ICcjZmYwMDAwJztcclxuICAgICAgICAgICAgLy90aGlzLmNbMV0uc3R5bGUudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcbiAgICAgICAgICAgIHRoaXMudG9wID0gMTA7XHJcbiAgICAgICAgICAgIHRoaXMuaCArPSAxMDtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmdoID0gdGhpcy5yaCAtIDI4O1xyXG4gICAgICAgIHRoaXMuZ3cgPSB0aGlzLncgLSAyODtcclxuXHJcbiAgICAgICAgLy90aGlzLmNbMl0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLnR4dCArICdqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyOyB0ZXh0LWFsaWduOiBqdXN0aWZ5OyBjb2x1bW4tY291bnQ6Jyt0aGlzLmxuZysnOyB0b3A6JysodGhpcy5oLTIwKSsncHg7IHdpZHRoOjEwMCU7IGNvbG9yOicrIHRoaXMuY29sb3JzLnRleHQgKTtcclxuXHJcbiAgICAgICAgLy9sZXQgY29sdW0gPSAnY29sdW1uLWNvdW50OicrdGhpcy5sbmcrJzsgY29sdW1uOicrdGhpcy5sbmcrJzsgYnJlYWstaW5zaWRlOiBjb2x1bW47IHRvcDonXHJcbiAgICAgICAgdGhpcy5jWzJdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHQgKyAnZGlzcGxheTpibG9jazsgdGV4dC1hbGlnbjpjZW50ZXI7IHBhZGRpbmc6MHB4IDBweDsgdG9wOicrKHRoaXMuaC0yMCkrJ3B4OyBsZWZ0OjE0cHg7IHdpZHRoOicrdGhpcy5ndysncHg7ICBjb2xvcjonKyB0aGlzLmNvbG9ycy50ZXh0ICk7XHJcbiAgICAgICBcclxuICAgICAgICAvL3RoaXMuY1syXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgdGhpcy5jWzJdLmlubmVySFRNTCA9IHRoaXMudmFsdWVUb0h0bWwoKTtcclxuXHJcbiAgICAgICAgbGV0IHN2ZyA9IHRoaXMuZG9tKCAnc3ZnJywgdGhpcy5jc3MuYmFzaWMgLCB7IHZpZXdCb3g6JzAgMCAnK3RoaXMudysnICcrdGhpcy5yaCwgd2lkdGg6dGhpcy53LCBoZWlnaHQ6dGhpcy5yaCwgcHJlc2VydmVBc3BlY3RSYXRpbzonbm9uZScgfSApO1xyXG4gICAgICAgIHRoaXMuc2V0Q3NzKCBzdmcsIHsgd2lkdGg6dGhpcy53LCBoZWlnaHQ6dGhpcy5yaCwgbGVmdDowLCB0b3A6dGhpcy50b3AgfSk7XHJcblxyXG4gICAgICAgIHRoaXMuZG9tKCAncGF0aCcsICcnLCB7IGQ6JycsIHN0cm9rZTp0aGlzLmNvbG9ycy50ZXh0LCAnc3Ryb2tlLXdpZHRoJzoyLCBmaWxsOidub25lJywgJ3N0cm9rZS1saW5lY2FwJzonYnV0dCcgfSwgc3ZnICk7XHJcbiAgICAgICAgdGhpcy5kb20oICdyZWN0JywgJycsIHsgeDoxMCwgeToxMCwgd2lkdGg6dGhpcy5ndys4LCBoZWlnaHQ6dGhpcy5naCs4LCBzdHJva2U6J3JnYmEoMCwwLDAsMC4zKScsICdzdHJva2Utd2lkdGgnOjEgLCBmaWxsOidub25lJ30sIHN2ZyApO1xyXG5cclxuICAgICAgICB0aGlzLml3ID0gKCh0aGlzLmd3LSg0Kih0aGlzLmxuZy0xKSkpL3RoaXMubG5nKTtcclxuICAgICAgICBsZXQgdCA9IFtdO1xyXG4gICAgICAgIHRoaXMuY01vZGUgPSBbXTtcclxuXHJcbiAgICAgICAgdGhpcy52ID0gW107XHJcblxyXG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgdGhpcy5sbmc7IGkrKyApe1xyXG5cclxuICAgICAgICBcdHRbaV0gPSBbIDE0ICsgKGkqdGhpcy5pdykgKyAoaSo0KSwgdGhpcy5pdyBdO1xyXG4gICAgICAgIFx0dFtpXVsyXSA9IHRbaV1bMF0gKyB0W2ldWzFdO1xyXG4gICAgICAgIFx0dGhpcy5jTW9kZVtpXSA9IDA7XHJcblxyXG4gICAgICAgICAgICBpZiggdGhpcy5uZWcgKSB0aGlzLnZbaV0gPSAoKDErKHRoaXMudmFsdWVbaV0gLyB0aGlzLm11bHRpcGxpY2F0b3IpKSowLjUpO1xyXG4gICAgICAgIFx0ZWxzZSB0aGlzLnZbaV0gPSB0aGlzLnZhbHVlW2ldIC8gdGhpcy5tdWx0aXBsaWNhdG9yO1xyXG5cclxuICAgICAgICBcdHRoaXMuZG9tKCAncmVjdCcsICcnLCB7IHg6dFtpXVswXSwgeToxNCwgd2lkdGg6dFtpXVsxXSwgaGVpZ2h0OjEsIGZpbGw6dGhpcy5jb2xvcnMudGV4dCwgJ2ZpbGwtb3BhY2l0eSc6MC4zIH0sIHN2ZyApO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudG1wID0gdDtcclxuICAgICAgICB0aGlzLmNbM10gPSBzdmc7XHJcblxyXG4gICAgICAgIC8vY29uc29sZS5sb2codGhpcy53KVxyXG5cclxuICAgICAgICB0aGlzLmluaXQoKTtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuY1sxXSAhPT0gdW5kZWZpbmVkICl7XHJcbiAgICAgICAgICAgIHRoaXMuY1sxXS5zdHlsZS50b3AgPSAwICsncHgnO1xyXG4gICAgICAgICAgICB0aGlzLmNbMV0uc3R5bGUuaGVpZ2h0ID0gMjAgKydweCc7XHJcbiAgICAgICAgICAgIHRoaXMuc1sxXS5saW5lSGVpZ2h0ID0gKDIwLTUpKydweCdcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlKCBmYWxzZSApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRWYWx1ZSAoIHZhbHVlICkge1xyXG5cclxuICAgICAgICB0aGlzLnZhbHVlID0gdmFsdWU7XHJcbiAgICAgICAgdGhpcy5sbmcgPSB0aGlzLnZhbHVlLmxlbmd0aDtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHRoaXMubG5nOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubmVnKSB0aGlzLnZbaV0gPSAoMSArIHZhbHVlW2ldIC8gdGhpcy5tdWx0aXBsaWNhdG9yKSAqIDAuNTtcclxuICAgICAgICAgICAgZWxzZSB0aGlzLnZbaV0gPSB2YWx1ZVtpXSAvIHRoaXMubXVsdGlwbGljYXRvcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdmFsdWVUb0h0bWwoKSB7XHJcblxyXG4gICAgICAgIGxldCBpID0gdGhpcy5sbmcsIG49MCwgciA9ICc8dGFibGUgc3R5bGU9XCJ3aWR0aDoxMDAlO1wiPjx0cj4nXHJcbiAgICAgICAgbGV0IHcgPSAxMDAgLyB0aGlzLmxuZ1xyXG4gICAgICAgIGxldCBzdHlsZSA9ICd3aWR0aDonKyB3ICsnJTsnLy8nIHRleHQtYWxpZ246Y2VudGVyOydcclxuICAgICAgICB3aGlsZShpLS0pe1xyXG4gICAgICAgICAgICBpZihuPT09dGhpcy5sbmctMSkgciArPSAnPHRkIHN0eWxlPScrc3R5bGUrJz4nICsgdGhpcy52YWx1ZVtuXSArICc8L3RkPjwvdHI+PC90YWJsZT4nXHJcbiAgICAgICAgICAgIGVsc2UgciArPSAnPHRkIHN0eWxlPScrc3R5bGUrJz4nICsgdGhpcy52YWx1ZVtuXSArICc8L3RkPidcclxuICAgICAgICAgICAgbisrXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiByXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlU1ZHICgpIHtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMubGluZSApIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdkJywgdGhpcy5tYWtlUGF0aCgpLCAwICk7XHJcblxyXG4gICAgICAgIGZvcihsZXQgaSA9IDA7IGk8dGhpcy5sbmc7IGkrKyApe1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2hlaWdodCcsIHRoaXMudltpXSp0aGlzLmdoLCBpKzIgKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3knLCAxNCArICh0aGlzLmdoIC0gdGhpcy52W2ldKnRoaXMuZ2gpLCBpKzIgKTtcclxuICAgICAgICAgICAgaWYoIHRoaXMubmVnICkgdGhpcy52YWx1ZVtpXSA9ICggKCh0aGlzLnZbaV0qMiktMSkgKiB0aGlzLm11bHRpcGxpY2F0b3IgKS50b0ZpeGVkKCB0aGlzLnByZWNpc2lvbiApICogMTtcclxuICAgICAgICAgICAgZWxzZSB0aGlzLnZhbHVlW2ldID0gKCAodGhpcy52W2ldICogdGhpcy5tdWx0aXBsaWNhdG9yKSApLnRvRml4ZWQoIHRoaXMucHJlY2lzaW9uICkgKiAxO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vdGhpcy5jWzJdLnRleHRDb250ZW50ID0gdGhpcy52YWx1ZTtcclxuICAgICAgICB0aGlzLmNbMl0uaW5uZXJIVE1MID0gdGhpcy52YWx1ZVRvSHRtbCgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB0ZXN0Wm9uZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBsID0gdGhpcy5sb2NhbDtcclxuICAgICAgICBpZiggbC54ID09PSAtMSAmJiBsLnkgPT09IC0xICkgcmV0dXJuICcnO1xyXG5cclxuICAgICAgICBsZXQgaSA9IHRoaXMubG5nO1xyXG4gICAgICAgIGxldCB0ID0gdGhpcy50bXA7XHJcbiAgICAgICAgXHJcblx0ICAgIGlmKCBsLnk+dGhpcy50b3AgJiYgbC55PHRoaXMuaC0yMCApe1xyXG5cdCAgICAgICAgd2hpbGUoIGktLSApe1xyXG5cdCAgICAgICAgICAgIGlmKCBsLng+dFtpXVswXSAmJiBsLng8dFtpXVsyXSApIHJldHVybiBpO1xyXG5cdCAgICAgICAgfVxyXG5cdCAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAnJ1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb2RlICggbiwgbmFtZSApIHtcclxuXHJcbiAgICBcdGlmKCBuID09PSB0aGlzLmNNb2RlW25hbWVdICkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgIFx0bGV0IGE7XHJcblxyXG4gICAgICAgIHN3aXRjaChuKXtcclxuICAgICAgICAgICAgY2FzZSAwOiBhPTAuMzsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTogYT0wLjY7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6IGE9MTsgYnJlYWs7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnJlc2V0KCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdmaWxsLW9wYWNpdHknLCBhLCBuYW1lICsgMiApO1xyXG4gICAgICAgIHRoaXMuY01vZGVbbmFtZV0gPSBuO1xyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIEVWRU5UU1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIHJlc2V0ICgpIHtcclxuXHJcbiAgICBcdGxldCBudXAgPSBmYWxzZTtcclxuICAgICAgICAvL3RoaXMuaXNEb3duID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGxldCBpID0gdGhpcy5sbmc7XHJcbiAgICAgICAgd2hpbGUoaS0tKXsgXHJcbiAgICAgICAgICAgIGlmKCB0aGlzLmNNb2RlW2ldICE9PSAwICl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNNb2RlW2ldID0gMDtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdmaWxsLW9wYWNpdHknLCAwLjMsIGkgKyAyICk7XHJcbiAgICAgICAgICAgICAgICBudXAgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVwO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZXVwICggZSApIHtcclxuXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcclxuICAgICAgICBpZiggdGhpcy5jdXJyZW50ICE9PSAtMSApIHJldHVybiB0aGlzLnJlc2V0KCk7XHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vkb3duICggZSApIHtcclxuXHJcbiAgICBcdHRoaXMuaXNEb3duID0gdHJ1ZTtcclxuICAgICAgICByZXR1cm4gdGhpcy5tb3VzZW1vdmUoIGUgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vtb3ZlICggZSApIHtcclxuXHJcbiAgICBcdGxldCBudXAgPSBmYWxzZTtcclxuXHJcbiAgICBcdGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZShlKTtcclxuXHJcbiAgICBcdGlmKCBuYW1lID09PSAnJyApe1xyXG5cclxuICAgICAgICAgICAgbnVwID0gdGhpcy5yZXNldCgpO1xyXG4gICAgICAgICAgICAvL3RoaXMuY3Vyc29yKCk7XHJcblxyXG4gICAgICAgIH0gZWxzZSB7IFxyXG5cclxuICAgICAgICAgICAgbnVwID0gdGhpcy5tb2RlKCB0aGlzLmlzRG93biA/IDIgOiAxLCBuYW1lICk7XHJcbiAgICAgICAgICAgIC8vdGhpcy5jdXJzb3IoIHRoaXMuY3VycmVudCAhPT0gLTEgPyAnbW92ZScgOiAncG9pbnRlcicgKTtcclxuICAgICAgICAgICAgaWYodGhpcy5pc0Rvd24pe1xyXG4gICAgICAgICAgICBcdHRoaXMudltuYW1lXSA9IHRoaXMuY2xhbXAoIDEgLSAoKCBlLmNsaWVudFkgLSB0aGlzLnpvbmUueSAtIHRoaXMueXRvcCAtIDEwICkgLyB0aGlzLmdoKSAsIDAsIDEgKTtcclxuICAgICAgICAgICAgXHR0aGlzLnVwZGF0ZSggdHJ1ZSApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51cDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIHVwZGF0ZSAoIHVwICkge1xyXG5cclxuICAgIFx0dGhpcy51cGRhdGVTVkcoKTtcclxuXHJcbiAgICAgICAgaWYoIHVwICkgdGhpcy5zZW5kKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1ha2VQYXRoICgpIHtcclxuXHJcbiAgICBcdGxldCBwID0gXCJcIiwgaCwgdywgd24sIHdtLCBvdywgb2hcclxuICAgIFx0Ly9sZXQgZyA9IHRoaXMuaXcqMC41XHJcblxyXG4gICAgXHRmb3IobGV0IGkgPSAwOyBpPHRoaXMubG5nOyBpKysgKXtcclxuXHJcbiAgICBcdFx0aCA9IDE0ICsgKHRoaXMuZ2ggLSB0aGlzLnZbaV0qdGhpcy5naClcclxuICAgIFx0XHR3ID0gKDE0ICsgKGkqdGhpcy5pdykgKyAoaSo0KSlcclxuXHJcbiAgICBcdFx0d20gPSB3ICsgdGhpcy5pdyowLjVcclxuICAgIFx0XHR3biA9IHcgKyB0aGlzLml3XHJcblxyXG4gICAgXHRcdGlmKCBpID09PSAwICkgcCs9J00gJyt3KycgJysgaCArICcgVCAnICsgd20gKycgJysgaFxyXG4gICAgXHRcdGVsc2UgcCArPSAnIEMgJyArIG93ICsnICcrIG9oICsgJywnICsgdyArJyAnKyBoICsgJywnICsgd20gKycgJysgaFxyXG4gICAgXHRcdGlmKCBpID09PSB0aGlzLmxuZy0xICkgcCs9JyBUICcgKyB3biArJyAnKyBoXHJcblxyXG4gICAgXHRcdG93ID0gd25cclxuICAgIFx0XHRvaCA9IGggXHJcblxyXG4gICAgXHR9XHJcblxyXG4gICAgXHRyZXR1cm4gcFxyXG5cclxuICAgIH1cclxuXHJcbiAgICByU2l6ZSAoKSB7XHJcblxyXG4gICAgICAgIHN1cGVyLnJTaXplKCk7XHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zO1xyXG4gICAgICAgIGlmKCB0aGlzLmNbMV0gIT09IHVuZGVmaW5lZCApIHNbMV0ud2lkdGggPSB0aGlzLncgKyAncHgnXHJcbiAgICAgICAgc1szXS53aWR0aCA9IHRoaXMudyArICdweCdcclxuXHJcbiAgICAgICAgbGV0IGd3ID0gdGhpcy53IC0gMjhcclxuICAgICAgICBsZXQgaXcgPSAoKGd3LSg0Kih0aGlzLmxuZy0xKSkpL3RoaXMubG5nKVxyXG4gICAgICAgIGxldCB0ID0gW11cclxuXHJcbiAgICAgICAgc1syXS53aWR0aCA9IGd3ICsgJ3B4J1xyXG5cclxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8IHRoaXMubG5nOyBpKysgKXtcclxuXHJcbiAgICAgICAgICAgIHRbaV0gPSBbIDE0ICsgKGkqaXcpICsgKGkqNCksIGl3IF1cclxuICAgICAgICAgICAgdFtpXVsyXSA9IHRbaV1bMF0gKyB0W2ldWzFdXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy50bXAgPSB0XHJcblxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgRW1wdHkgZXh0ZW5kcyBQcm90byB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoIG8gPSB7fSApIHtcclxuXHJcblx0ICAgIG8uaXNTcGFjZSA9IHRydWVcclxuICAgICAgICBvLm1hcmdpbiA9IDBcclxuICAgICAgICBpZighby5oKSBvLmggPSAxMFxyXG4gICAgICAgIHN1cGVyKCBvIClcclxuICAgICAgICB0aGlzLmluaXQoKVxyXG5cclxuICAgIH1cclxuICAgIFxyXG59XHJcbiIsIlxyXG5pbXBvcnQgeyBSb290cyB9IGZyb20gJy4uL2NvcmUvUm9vdHMuanMnO1xyXG5pbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5pbXBvcnQgeyBFbXB0eSB9IGZyb20gJy4vRW1wdHkuanMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEdyb3VwIGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvICk7XHJcblxyXG4gICAgICAgIHRoaXMuaXNHcm91cCA9IHRydWVcclxuXHJcbiAgICAgICAgdGhpcy5BREQgPSBvLmFkZDtcclxuXHJcbiAgICAgICAgdGhpcy5hdXRvSGVpZ2h0ID0gdHJ1ZVxyXG5cclxuICAgICAgICB0aGlzLnVpcyA9IFtdXHJcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gLTFcclxuICAgICAgICB0aGlzLnByb3RvID0gbnVsbFxyXG4gICAgICAgIHRoaXMuaXNFbXB0eSA9IHRydWVcclxuXHJcbiAgICAgICAgdGhpcy5kZWNhbCA9IG8uZ3JvdXAgPyA4IDogMFxyXG4gICAgICAgIC8vdGhpcy5kZCA9IG8uZ3JvdXAgPyBvLmdyb3VwLmRlY2FsICsgOCA6IDBcclxuXHJcbiAgICAgICAgdGhpcy5iYXNlSCA9IHRoaXMuaFxyXG5cclxuICAgICAgICB0aGlzLnNwYWNlWSA9IG5ldyBFbXB0eSh7aDp0aGlzLm1hcmdpbn0pO1xyXG5cclxuXHJcblxyXG4gICAgICAgIGxldCBmbHRvcCA9IE1hdGguZmxvb3IodGhpcy5oKjAuNSktM1xyXG5cclxuICAgICAgICBjb25zdCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG4gICAgICAgIHRoaXMudXNlRmxleCA9IHRydWUgXHJcbiAgICAgICAgbGV0IGZsZXhpYmxlID0gdGhpcy51c2VGbGV4ID8gJ2Rpc3BsYXk6ZmxleDsgZmxleC1mbG93OiByb3cgd3JhcDsnIDogJydcclxuXHJcbiAgICAgICAgdGhpcy5jWzJdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy5iYXNpYyArIGZsZXhpYmxlICsgJ3dpZHRoOjEwMCU7IGxlZnQ6MDsgIG92ZXJmbG93OmhpZGRlbjsgdG9wOicrKHRoaXMuaCkrJ3B4JylcclxuICAgICAgICB0aGlzLmNbM10gPSB0aGlzLmRvbSggJ3BhdGgnLCB0aGlzLmNzcy5iYXNpYyArICdwb3NpdGlvbjphYnNvbHV0ZTsgd2lkdGg6NnB4OyBoZWlnaHQ6NnB4OyBsZWZ0OjA7IHRvcDonK2ZsdG9wKydweDsnLCB7IGQ6dGhpcy5zdmdzLmcxLCBmaWxsOmNjLnRleHQsIHN0cm9rZTonbm9uZSd9KVxyXG5cclxuICAgICAgICBsZXQgYmggPSB0aGlzLm10b3AgPT09IDAgPyB0aGlzLm1hcmdpbiA6IHRoaXMubXRvcFxyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuY1s0XSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MuYmFzaWMgKyAnd2lkdGg6MTAwJTsgbGVmdDowOyBoZWlnaHQ6JysoYmgrMSkrJ3B4OyB0b3A6JysoKHRoaXMuaC0xKSkrJ3B4OyBiYWNrZ3JvdW5kOm5vbmU7JylcclxuXHJcbiAgICAgICAgbGV0IHMgPSB0aGlzLnM7XHJcbiAgICAgICAgdGhpcy5jWzFdLm5hbWUgPSAnZ3JvdXAnXHJcblxyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG5cclxuICAgICAgICB0aGlzLnNldEJHKCBvLmJnIClcclxuXHJcbiAgICAgICAgaWYoIG8ub3BlbiApIHRoaXMub3BlbigpXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNldEJHICggYmcgKSB7XHJcblxyXG4gICAgICAgIGNvbnN0IGNjID0gdGhpcy5jb2xvcnNcclxuICAgICAgICBjb25zdCBzID0gdGhpcy5zXHJcblxyXG4gICAgICAgIGlmKCBiZyAhPT0gdW5kZWZpbmVkICkgY2MuZ3JvdXBzID0gYmdcclxuICAgICAgICBpZihjYy5ncm91cHMgPT09ICdub25lJykgY2MuZ3JvdXBzID0gY2MuYmFja2dyb3VuZFxyXG4gICAgICAgICAgICBjYy5iYWNrZ3JvdW5kID0gJ25vbmUnXHJcblxyXG4gICAgICAgIHNbMF0uYmFja2dyb3VuZCA9ICdub25lJztcclxuICAgICAgICBzWzFdLmJhY2tncm91bmQgPSBjYy5ncm91cHNcclxuICAgICAgICBzWzJdLmJhY2tncm91bmQgPSBjYy5ncm91cHNcclxuXHJcbiAgICAgICAgaWYoIGNjLmdib3JkZXIgIT09ICdub25lJyApe1xyXG4gICAgICAgICAgICBzWzFdLmJvcmRlciA9IGNjLmJvcmRlclNpemUrJ3B4IHNvbGlkICcrIGNjLmdib3JkZXJcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLnJhZGl1cyAhPT0gMCApe1xyXG5cclxuICAgICAgICAgICAgc1sxXS5ib3JkZXJSYWRpdXMgPSB0aGlzLnJhZGl1cysncHgnXHJcbiAgICAgICAgICAgIHNbMl0uYm9yZGVyUmFkaXVzID0gdGhpcy5yYWRpdXMrJ3B4J1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qbGV0IGkgPSB0aGlzLnVpcy5sZW5ndGg7XHJcbiAgICAgICAgd2hpbGUoaS0tKXtcclxuICAgICAgICAgICAgdGhpcy51aXNbaV0uc2V0QkcoICdub25lJyApO1xyXG4gICAgICAgICAgICAvL3RoaXMudWlzW2ldLnNldEJHKCB0aGlzLmNvbG9ycy5iYWNrZ3JvdW5kICk7XHJcbiAgICAgICAgfSovXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHRlc3Rab25lICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IGwgPSB0aGlzLmxvY2FsO1xyXG4gICAgICAgIGlmKCBsLnggPT09IC0xICYmIGwueSA9PT0gLTEgKSByZXR1cm4gJyc7XHJcblxyXG4gICAgICAgIGxldCBuYW1lID0gJyc7XHJcblxyXG4gICAgICAgIGlmKCBsLnkgPCB0aGlzLmJhc2VIICsgdGhpcy5tYXJnaW4gKSBuYW1lID0gJ3RpdGxlJztcclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgaWYoIHRoaXMuaXNPcGVuICkgbmFtZSA9ICdjb250ZW50JztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vY29uc29sZS5sb2cobmFtZSlcclxuXHJcbiAgICAgICAgcmV0dXJuIG5hbWU7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNsZWFyVGFyZ2V0ICgpIHtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuY3VycmVudCA9PT0gLTEgKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgaWYoIHRoaXMucHJvdG8ucyApe1xyXG4gICAgICAgICAgICAvLyBpZiBubyBzIHRhcmdldCBpcyBkZWxldGUgISFcclxuICAgICAgICAgICAgdGhpcy5wcm90by51aW91dCgpO1xyXG4gICAgICAgICAgICB0aGlzLnByb3RvLnJlc2V0KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMucHJvdG8gPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY3VycmVudCA9IC0xO1xyXG4gICAgICAgIHRoaXMuY3Vyc29yKCk7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJlc2V0ICgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5jbGVhclRhcmdldCgpXHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgRVZFTlRTXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgaGFuZGxlRXZlbnQgKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgdHlwZSA9IGUudHlwZTtcclxuXHJcbiAgICAgICAgbGV0IGNoYW5nZSA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBwcm90b0NoYW5nZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoIGUgKTtcclxuXHJcbiAgICAgICAgaWYoICFuYW1lICkgcmV0dXJuO1xyXG5cclxuICAgICAgICBzd2l0Y2goIG5hbWUgKXtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ2NvbnRlbnQnOlxyXG5cclxuICAgICAgICAgICAgLy90aGlzLmN1cnNvcigpXHJcblxyXG4gICAgICAgICAgICAvL2lmKCB0aGlzLm1hcmdpbkRpdiApIGUuY2xpZW50WSAtPSB0aGlzLm1hcmdpbiAqIDAuNVxyXG5cclxuICAgICAgICAgICAgaWYoIFJvb3RzLmlzTW9iaWxlICYmIHR5cGUgPT09ICdtb3VzZWRvd24nICkgdGhpcy5nZXROZXh0KCBlLCBjaGFuZ2UgKVxyXG5cclxuICAgICAgICAgICAgaWYoIHRoaXMucHJvdG8gKXsgXHJcbiAgICAgICAgICAgICAgICAvL2UuY2xpZW50WSAtPSB0aGlzLm1hcmdpblxyXG4gICAgICAgICAgICAgICAgcHJvdG9DaGFuZ2UgPSB0aGlzLnByb3RvLmhhbmRsZUV2ZW50KCBlIClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYoICFSb290cy5sb2NrICkgdGhpcy5nZXROZXh0KCBlLCBjaGFuZ2UgKVxyXG5cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3RpdGxlJzpcclxuICAgICAgICAgICAgLy90aGlzLmN1cnNvciggdGhpcy5pc09wZW4gPyAnbi1yZXNpemUnOidzLXJlc2l6ZScgKTtcclxuICAgICAgICAgICAgdGhpcy5jdXJzb3IoJ3BvaW50ZXInKVxyXG4gICAgICAgICAgICBpZiggdHlwZSA9PT0gJ21vdXNlZG93bicgKXtcclxuICAgICAgICAgICAgICAgIGlmKCB0aGlzLmlzT3BlbiApIHRoaXMuY2xvc2UoKVxyXG4gICAgICAgICAgICAgICAgZWxzZSB0aGlzLm9wZW4oKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggdGhpcy5pc0Rvd24gKSBjaGFuZ2UgPSB0cnVlO1xyXG4gICAgICAgIGlmKCBwcm90b0NoYW5nZSApIGNoYW5nZSA9IHRydWU7XHJcblxyXG4gICAgICAgIHJldHVybiBjaGFuZ2U7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGdldE5leHQgKCBlLCBjaGFuZ2UgKSB7XHJcblxyXG4gICAgICAgIGxldCBuZXh0ID0gUm9vdHMuZmluZFRhcmdldCggdGhpcy51aXMsIGUgKTtcclxuXHJcbiAgICAgICAgaWYoIG5leHQgIT09IHRoaXMuY3VycmVudCApe1xyXG4gICAgICAgICAgICB0aGlzLmNsZWFyVGFyZ2V0KCk7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudCA9IG5leHQ7XHJcbiAgICAgICAgICAgIGNoYW5nZSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggbmV4dCAhPT0gLTEgKXsgXHJcbiAgICAgICAgICAgIHRoaXMucHJvdG8gID0gdGhpcy51aXNbIHRoaXMuY3VycmVudCBdO1xyXG4gICAgICAgICAgICB0aGlzLnByb3RvLnVpb3ZlcigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIFxyXG5cclxuICAgIGFkZCgpIHtcclxuXHJcbiAgICAgICAgbGV0IGEgPSBhcmd1bWVudHM7XHJcblxyXG4gICAgICAgIGlmKCB0eXBlb2YgYVsxXSA9PT0gJ29iamVjdCcgKXsgXHJcbiAgICAgICAgICAgIGFbMV0uaXNVSSA9IHRoaXMuaXNVSVxyXG4gICAgICAgICAgICBhWzFdLnRhcmdldCA9IHRoaXMuY1syXVxyXG4gICAgICAgICAgICBhWzFdLm1haW4gPSB0aGlzLm1haW5cclxuICAgICAgICAgICAgYVsxXS5ncm91cCA9IHRoaXNcclxuICAgICAgICB9IGVsc2UgaWYoIHR5cGVvZiBhcmd1bWVudHNbMV0gPT09ICdzdHJpbmcnICl7XHJcbiAgICAgICAgICAgIGlmKCBhWzJdID09PSB1bmRlZmluZWQgKSBbXS5wdXNoLmNhbGwoIGEsIHsgaXNVSTp0cnVlLCB0YXJnZXQ6dGhpcy5jWzJdLCBtYWluOnRoaXMubWFpbiB9KTtcclxuICAgICAgICAgICAgZWxzZXsgXHJcbiAgICAgICAgICAgICAgICBhWzJdLmlzVUkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgYVsyXS50YXJnZXQgPSB0aGlzLmNbMl07XHJcbiAgICAgICAgICAgICAgICBhWzJdLm1haW4gPSB0aGlzLm1haW47XHJcbiAgICAgICAgICAgICAgICBhWzJdLmdyb3VwID0gdGhpcztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IHUgPSB0aGlzLkFERC5hcHBseSggdGhpcywgYSApXHJcblxyXG4gICAgICAgIGlmKCB1LmlzR3JvdXAgKXsgXHJcbiAgICAgICAgICAgIC8vby5hZGQgPSBhZGQ7XHJcbiAgICAgICAgICAgIHUuZHggPSA4XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vdS5keCArPSA0XHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyh0aGlzLmRlY2FsKVxyXG4gICAgICAgIC8vdS56b25lLmQgLT0gOFxyXG4gICAgICAgIFJvb3RzLmZvcmNlWm9uZSA9IHRydWVcclxuICAgICAgICAvL3UubWFyZ2luICs9IHRoaXMubWFyZ2luXHJcblxyXG4gICAgICAgIC8vY29uc29sZS5sb2coIHUubWFyZ2luIClcclxuICAgICAgICAvL1Jvb3RzLm5lZWRSZVpvbmUgPSB0cnVlXHJcblxyXG4gICAgICAgIC8vUm9vdHMucmVzaXplKClcclxuICAgICAgICAgLy9jb25zb2xlLmxvZyhSb290cy5uZWVkUmVzaXplKVxyXG5cclxuICAgICAgICB0aGlzLnVpcy5wdXNoKCB1IClcclxuXHJcbiAgICAgICAgdGhpcy5pc0VtcHR5ID0gZmFsc2VcclxuXHJcbiAgICAgICAgcmV0dXJuIHU7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIHJlbW92ZSBvbmUgbm9kZVxyXG5cclxuICAgIHJlbW92ZSAoIG4gKSB7XHJcblxyXG4gICAgICAgIGlmKCBuLmRpc3Bvc2UgKSBuLmRpc3Bvc2UoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2xlYXIgYWxsIGluZXIgXHJcblxyXG4gICAgZGlzcG9zZSgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5jbGVhcigpXHJcbiAgICAgICAgaWYoIHRoaXMuaXNVSSApIHRoaXMubWFpbi5jYWxjKClcclxuICAgICAgICBzdXBlci5kaXNwb3NlKClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2xlYXIoKSB7XHJcblxyXG4gICAgICAgIHRoaXMuZW1wdHkoKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBlbXB0eSAoKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY2xvc2UoKTtcclxuXHJcbiAgICAgICAgbGV0IGkgPSB0aGlzLnVpcy5sZW5ndGgsIGl0ZW07XHJcblxyXG4gICAgICAgIHdoaWxlKCBpLS0gKXtcclxuICAgICAgICAgICAgaXRlbSA9IHRoaXMudWlzLnBvcCgpXHJcbiAgICAgICAgICAgIHRoaXMuY1syXS5yZW1vdmVDaGlsZCggaXRlbS5jWzBdIClcclxuICAgICAgICAgICAgaXRlbS5jbGVhciggdHJ1ZSApXHJcblxyXG4gICAgICAgICAgICAvL3RoaXMudWlzW2ldLmNsZWFyKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuaXNFbXB0eSA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5oID0gdGhpcy5iYXNlSDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gY2xlYXIgb25lIGVsZW1lbnRcclxuXHJcbiAgICBjbGVhck9uZSAoIG4gKSB7IFxyXG5cclxuICAgICAgICBsZXQgaWQgPSB0aGlzLnVpcy5pbmRleE9mKCBuICk7XHJcblxyXG4gICAgICAgIGlmICggaWQgIT09IC0xICkge1xyXG4gICAgICAgICAgICB0aGlzLmNhbGMoIC0gKCB0aGlzLnVpc1sgaWQgXS5oICsgdGhpcy5tYXJnaW4gKSApXHJcbiAgICAgICAgICAgIHRoaXMuY1syXS5yZW1vdmVDaGlsZCggdGhpcy51aXNbIGlkIF0uY1swXSApXHJcbiAgICAgICAgICAgIHRoaXMudWlzLnNwbGljZSggaWQsIDEgKVxyXG5cclxuICAgICAgICAgICAgaWYoIHRoaXMudWlzLmxlbmd0aCA9PT0gMCApeyBcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNFbXB0eSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIFxyXG5cclxuICAgIG9wZW4gKCkge1xyXG5cclxuICAgICAgICBzdXBlci5vcGVuKClcclxuXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2QnLCB0aGlzLnN2Z3MuZzIgKVxyXG4gICAgICAgIHRoaXMuclNpemVDb250ZW50KClcclxuXHJcbiAgICAgICAgLy9sZXQgdCA9IHRoaXMuaCAtIHRoaXMuYmFzZUhcclxuXHJcbiAgICAgICAgY29uc3QgcyA9IHRoaXMuc1xyXG4gICAgICAgIGNvbnN0IGNjID0gdGhpcy5jb2xvcnNcclxuXHJcbiAgICAgICAgLy9zWzJdLnRvcCA9ICh0aGlzLmgtMSkgKyAncHgnXHJcbiAgICAgICAgc1syXS50b3AgPSAodGhpcy5oK3RoaXMubXRvcCkgKyAncHgnXHJcbiAgICAgICAgc1s0XS5iYWNrZ3JvdW5kID0gY2MuZ3JvdXBzLy8nIzBmMCdcclxuXHJcbiAgICAgICAgaWYodGhpcy5yYWRpdXMpe1xyXG5cclxuICAgICAgICAgICAgc1sxXS5ib3JkZXJSYWRpdXMgPSAnMHB4J1xyXG4gICAgICAgICAgICBzWzJdLmJvcmRlclJhZGl1cyA9ICcwcHgnXHJcblxyXG4gICAgICAgICAgICBzWzFdLmJvcmRlclRvcExlZnRSYWRpdXMgPSB0aGlzLnJhZGl1cysncHgnXHJcbiAgICAgICAgICAgIHNbMV0uYm9yZGVyVG9wUmlnaHRSYWRpdXMgPSB0aGlzLnJhZGl1cysncHgnXHJcbiAgICAgICAgICAgIHNbMl0uYm9yZGVyQm90dG9tTGVmdFJhZGl1cyA9IHRoaXMucmFkaXVzKydweCdcclxuICAgICAgICAgICAgc1syXS5ib3JkZXJCb3R0b21SaWdodFJhZGl1cyA9IHRoaXMucmFkaXVzKydweCdcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCBjYy5nYm9yZGVyICE9PSAnbm9uZScgKXtcclxuXHJcbiAgICAgICAgICAgIHNbNF0uYm9yZGVyTGVmdCA9IGNjLmJvcmRlclNpemUrJ3B4IHNvbGlkICcrIGNjLmdib3JkZXJcclxuICAgICAgICAgICAgc1s0XS5ib3JkZXJSaWdodCA9IGNjLmJvcmRlclNpemUrJ3B4IHNvbGlkICcrIGNjLmdib3JkZXJcclxuXHJcbiAgICAgICAgICAgIHNbMl0uYm9yZGVyID0gY2MuYm9yZGVyU2l6ZSsncHggc29saWQgJysgY2MuZ2JvcmRlclxyXG4gICAgICAgICAgICBzWzJdLmJvcmRlclRvcCA9ICdub25lJztcclxuICAgICAgICAgICAgc1sxXS5ib3JkZXJCb3R0b20gPSBjYy5ib3JkZXJTaXplKydweCBzb2xpZCByZ2JhKDAsMCwwLDApJ1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5wYXJlbnRIZWlnaHQoKVxyXG5cclxuICAgICAgICAvL1Jvb3RzLmlzTGVhdmUgPSB0cnVlXHJcbiAgICAgICAgLy9Sb290cy5uZWVkUmVzaXplID0gdHJ1ZVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBjbG9zZSAoKSB7XHJcblxyXG4gICAgICAgIHN1cGVyLmNsb3NlKClcclxuXHJcbiAgICAgICAgLy9sZXQgdCA9IHRoaXMuaCAtIHRoaXMuYmFzZUhcclxuXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2QnLCB0aGlzLnN2Z3MuZzEgKVxyXG5cclxuICAgICAgICB0aGlzLmggPSB0aGlzLmJhc2VIXHJcblxyXG4gICAgICAgIGNvbnN0IHMgPSB0aGlzLnNcclxuICAgICAgICBjb25zdCBjYyA9IHRoaXMuY29sb3JzXHJcbiAgICAgICAgXHJcbiAgICAgICAgc1swXS5oZWlnaHQgPSB0aGlzLmggKyAncHgnXHJcbiAgICAgICAgLy9zWzFdLmhlaWdodCA9ICh0aGlzLmgtMikgKyAncHgnXHJcbiAgICAgICAgLy9zWzJdLnRvcCA9IHRoaXMuaCArICdweCdcclxuICAgICAgICBzWzJdLnRvcCA9ICh0aGlzLmgrdGhpcy5tdG9wKSArICdweCdcclxuICAgICAgICBzWzRdLmJhY2tncm91bmQgPSAnbm9uZSdcclxuXHJcbiAgICAgICAgaWYoIGNjLmdib3JkZXIgIT09ICdub25lJyApe1xyXG5cclxuICAgICAgICAgICAgc1s0XS5ib3JkZXIgPSAnbm9uZSdcclxuICAgICAgICAgICAgc1syXS5ib3JkZXIgPSAnbm9uZSdcclxuICAgICAgICAgICAgc1sxXS5ib3JkZXIgPSBjYy5ib3JkZXJTaXplKydweCBzb2xpZCAnKyBjYy5nYm9yZGVyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZih0aGlzLnJhZGl1cykgc1sxXS5ib3JkZXJSYWRpdXMgPSB0aGlzLnJhZGl1cysncHgnXHJcblxyXG4gICAgICAgIHRoaXMucGFyZW50SGVpZ2h0KClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2FsY1VpcyAoKSB7XHJcblxyXG4gICAgICAgIGlmKCAhdGhpcy5pc09wZW4gfHwgdGhpcy5pc0VtcHR5ICkgdGhpcy5oID0gdGhpcy5iYXNlSFxyXG4gICAgICAgIC8vZWxzZSB0aGlzLmggPSBSb290cy5jYWxjVWlzKCB0aGlzLnVpcywgdGhpcy56b25lLCB0aGlzLnpvbmUueSArIHRoaXMuYmFzZUggKSArIHRoaXMuYmFzZUg7XHJcbiAgICAgICAgZWxzZSB0aGlzLmggPSBSb290cy5jYWxjVWlzKCBbLi4udGhpcy51aXMsIHRoaXMuc3BhY2VZIF0sIHRoaXMuem9uZSwgdGhpcy56b25lLnkgKyB0aGlzLmJhc2VIICsgdGhpcy5tYXJnaW4sIHRydWUgKSArIHRoaXMuYmFzZUhcclxuXHJcbiAgICAgICAgdGhpcy5zWzBdLmhlaWdodCA9IHRoaXMuaCArICdweCdcclxuICAgICAgICB0aGlzLnNbMl0uaGVpZ2h0ID0oIHRoaXMuaCAtIHRoaXMuYmFzZUggKSsgJ3B4J1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwYXJlbnRIZWlnaHQgKCB0ICkge1xyXG5cclxuICAgICAgICBpZiAoIHRoaXMuZ3JvdXAgIT09IG51bGwgKSB0aGlzLmdyb3VwLmNhbGMoIHQgKVxyXG4gICAgICAgIGVsc2UgaWYgKCB0aGlzLmlzVUkgKSB0aGlzLm1haW4uY2FsYyggdCApXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNhbGMgKCB5ICkge1xyXG5cclxuICAgICAgICBpZiggIXRoaXMuaXNPcGVuICkgcmV0dXJuXHJcbiAgICAgICAgaWYoIHRoaXMuaXNVSSApIHRoaXMubWFpbi5jYWxjKClcclxuICAgICAgICBlbHNlIHRoaXMuY2FsY1VpcygpXHJcbiAgICAgICAgdGhpcy5zWzBdLmhlaWdodCA9IHRoaXMuaCArICdweCdcclxuICAgICAgICB0aGlzLnNbMl0uaGVpZ2h0ID0gdGhpcy5oICsgJ3B4J1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByU2l6ZUNvbnRlbnQgKCkge1xyXG5cclxuICAgICAgICBsZXQgaSA9IHRoaXMudWlzLmxlbmd0aFxyXG4gICAgICAgIHdoaWxlKGktLSl7XHJcbiAgICAgICAgICAgIHRoaXMudWlzW2ldLnNldFNpemUoIHRoaXMudyApXHJcbiAgICAgICAgICAgIHRoaXMudWlzW2ldLnJTaXplKClcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJTaXplICgpIHtcclxuXHJcbiAgICAgICAgc3VwZXIuclNpemUoKVxyXG5cclxuICAgICAgICBsZXQgcyA9IHRoaXMuc1xyXG5cclxuICAgICAgICB0aGlzLncgPSB0aGlzLncgLSB0aGlzLmRlY2FsXHJcblxyXG4gICAgICAgIHNbM10ubGVmdCA9ICggdGhpcy5zYSArIHRoaXMuc2IgLSA2ICkgKyAncHgnXHJcblxyXG4gICAgICAgIHNbMV0ud2lkdGggPSB0aGlzLncgKyAncHgnXHJcbiAgICAgICAgc1syXS53aWR0aCA9IHRoaXMudyArICdweCdcclxuICAgICAgICBzWzFdLmxlZnQgPSAodGhpcy5kZWNhbCkgKyAncHgnXHJcbiAgICAgICAgc1syXS5sZWZ0ID0gKHRoaXMuZGVjYWwpICsgJ3B4J1xyXG5cclxuICAgICAgICBpZiggdGhpcy5pc09wZW4gKSB0aGlzLnJTaXplQ29udGVudCgpXHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vXHJcbi8qXHJcbiAgICB1aW91dCgpIHtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMubG9jayApIHJldHVybjtcclxuICAgICAgICBpZighdGhpcy5vdmVyRWZmZWN0KSByZXR1cm47XHJcbiAgICAgICAgaWYodGhpcy5zKSB0aGlzLnNbMF0uYmFja2dyb3VuZCA9IHRoaXMuY29sb3JzLmJhY2tncm91bmQ7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHVpb3ZlcigpIHtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMubG9jayApIHJldHVybjtcclxuICAgICAgICBpZighdGhpcy5vdmVyRWZmZWN0KSByZXR1cm47XHJcbiAgICAgICAgLy9pZiggdGhpcy5pc09wZW4gKSByZXR1cm47XHJcbiAgICAgICAgaWYodGhpcy5zKSB0aGlzLnNbMF0uYmFja2dyb3VuZCA9IHRoaXMuY29sb3JzLmJhY2tncm91bmRPdmVyO1xyXG5cclxuICAgIH1cclxuKi9cclxufSIsImltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcyc7XHJcbmltcG9ydCB7IFYyIH0gZnJvbSAnLi4vY29yZS9WMi5qcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgSm95c3RpY2sgZXh0ZW5kcyBQcm90byB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoIG8gPSB7fSApIHtcclxuXHJcbiAgICAgICAgc3VwZXIoIG8gKTtcclxuXHJcbiAgICAgICAgdGhpcy5hdXRvV2lkdGggPSBmYWxzZTtcclxuXHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IFswLDBdO1xyXG5cclxuICAgICAgICB0aGlzLm1pbncgID0gdGhpcy53XHJcbiAgICAgICAgdGhpcy5kaWFtID0gby5kaWFtIHx8IHRoaXMudyBcclxuXHJcbiAgICAgICAgdGhpcy5qb3lUeXBlID0gJ2FuYWxvZ2lxdWUnO1xyXG4gICAgICAgIHRoaXMubW9kZWwgPSBvLm1vZGUgIT09IHVuZGVmaW5lZCA/IG8ubW9kZSA6IDA7XHJcblxyXG4gICAgICAgIHRoaXMucHJlY2lzaW9uID0gby5wcmVjaXNpb24gfHwgMjtcclxuICAgICAgICB0aGlzLm11bHRpcGxpY2F0b3IgPSBvLm11bHRpcGxpY2F0b3IgfHwgMTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3MgPSBuZXcgVjIoKTtcclxuICAgICAgICB0aGlzLnRtcCA9IG5ldyBWMigpO1xyXG5cclxuICAgICAgICB0aGlzLmludGVydmFsID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNbMF0uc3R5bGUuZGlzcGxheSA9ICdibG9jaydcclxuICAgICAgICB0aGlzLmhhdmVUZXh0ID0gby50ZXh0ICE9PSB1bmRlZmluZWQgPyBvLnRleHQgOiB0cnVlIFxyXG5cclxuICAgICAgICAvL3RoaXMucmFkaXVzID0gdGhpcy53ICogMC41O1xyXG4gICAgICAgIC8vdGhpcy5kaXN0YW5jZSA9IHRoaXMucmFkaXVzKjAuMjU7XHJcbiAgICAgICAgdGhpcy5kaXN0YW5jZSA9ICh0aGlzLmRpYW0qMC41KSowLjI1O1xyXG5cclxuICAgICAgICB0aGlzLmggPSBvLmggfHwgdGhpcy53ICsgKHRoaXMuaGF2ZVRleHQgPyAxMCA6IDApO1xyXG5cclxuICAgICAgICB0aGlzLmNbMF0uc3R5bGUud2lkdGggPSB0aGlzLncgKydweCc7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmNbMV0gIT09IHVuZGVmaW5lZCApIHsgLy8gd2l0aCB0aXRsZVxyXG5cclxuICAgICAgICAgICAgdGhpcy5jWzFdLnN0eWxlLndpZHRoID0gJzEwMCUnO1xyXG4gICAgICAgICAgICB0aGlzLmNbMV0uc3R5bGUuanVzdGlmeUNvbnRlbnQgPSAnY2VudGVyJztcclxuICAgICAgICAgICAgdGhpcy50b3AgPSAxMDtcclxuICAgICAgICAgICAgdGhpcy5oICs9IDEwO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG4gICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0ICsgJ2p1c3RpZnktY29udGVudDpjZW50ZXI7IHRvcDonKyh0aGlzLmgtMjApKydweDsgd2lkdGg6MTAwJTsgY29sb3I6JysgY2MudGV4dCApO1xyXG4gICAgICAgIHRoaXMuY1syXS50ZXh0Q29udGVudCA9IHRoaXMuaGF2ZVRleHQgPyB0aGlzLnZhbHVlIDogJyc7XHJcblxyXG4gICAgICAgIHRoaXMuY1szXSA9IHRoaXMuZ2V0Sm95c3RpY2soIHRoaXMubW9kZWwgKTtcclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAndmlld0JveCcsICcwIDAgJyt0aGlzLmRpYW0rJyAnK3RoaXMuZGlhbSApO1xyXG4gICAgICAgIHRoaXMuc2V0Q3NzKCB0aGlzLmNbM10sIHsgd2lkdGg6dGhpcy5kaWFtLCBoZWlnaHQ6dGhpcy5kaWFtLCBsZWZ0OjAsIHRvcDp0aGlzLnRvcCB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5tb2RlKDApXHJcblxyXG5cclxuICAgICAgICB0aGlzLnJhdGlvID0gMTI4L3RoaXMudztcclxuXHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlKGZhbHNlKTtcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICBtb2RlICggbW9kZSApIHtcclxuXHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnNcclxuXHJcbiAgICAgICAgc3dpdGNoKG1vZGUpe1xyXG4gICAgICAgICAgICBjYXNlIDA6IC8vIGJhc2VcclxuICAgICAgICAgICAgICAgIGlmKHRoaXMubW9kZWw9PT0wKXtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbCcsICd1cmwoI2dyYWRJbiknLCA0ICk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsICcjMDAwJywgNCApO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgY2Muam95T3V0LCAyICk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy90aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgJ3JnYigwLDAsMCwwLjEpJywgMyApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjYy5qb3lPdXQsIDQgKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbCcsICdub25lJywgNCApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDE6IC8vIG92ZXJcclxuICAgICAgICAgICAgICAgIGlmKHRoaXMubW9kZWw9PT0wKXtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbCcsICd1cmwoI2dyYWRJbjIpJywgNCApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCAncmdiYSgwLDAsMCwwKScsIDQgKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNjLmpveU92ZXIsIDIgKTtcclxuICAgICAgICAgICAgICAgICAgICAvL3RoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCAncmdiKDAsMCwwLDAuMyknLCAzICk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNjLmpveVNlbGVjdCwgNCApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdmaWxsJywgY2Muam95T3ZlciwgNCApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOiAvLyBlZGl0XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBFVkVOVFNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBhZGRJbnRlcnZhbCAoKXtcclxuICAgICAgICBpZiggdGhpcy5pbnRlcnZhbCAhPT0gbnVsbCApIHRoaXMuc3RvcEludGVydmFsKCk7XHJcbiAgICAgICAgaWYoIHRoaXMucG9zLmlzWmVybygpICkgcmV0dXJuO1xyXG4gICAgICAgIHRoaXMuaW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCggZnVuY3Rpb24oKXsgdGhpcy51cGRhdGUoKTsgfS5iaW5kKHRoaXMpLCAxMCApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzdG9wSW50ZXJ2YWwgKCl7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmludGVydmFsID09PSBudWxsICkgcmV0dXJuO1xyXG4gICAgICAgIGNsZWFySW50ZXJ2YWwoIHRoaXMuaW50ZXJ2YWwgKTtcclxuICAgICAgICB0aGlzLmludGVydmFsID0gbnVsbDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmVzZXQgKCkge1xyXG5cclxuICAgICAgICB0aGlzLmFkZEludGVydmFsKCk7XHJcbiAgICAgICAgdGhpcy5tb2RlKDApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZXVwICggZSApIHtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRJbnRlcnZhbCgpO1xyXG4gICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2U7XHJcbiAgICBcclxuICAgIH1cclxuXHJcbiAgICBtb3VzZWRvd24gKCBlICkge1xyXG5cclxuICAgICAgICB0aGlzLmlzRG93biA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5tb3VzZW1vdmUoIGUgKTtcclxuICAgICAgICB0aGlzLm1vZGUoIDIgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vtb3ZlICggZSApIHtcclxuXHJcbiAgICAgICAgdGhpcy5tb2RlKDEpO1xyXG5cclxuICAgICAgICBpZiggIXRoaXMuaXNEb3duICkgcmV0dXJuO1xyXG5cclxuICAgICAgICAvL3RoaXMudG1wLnggPSB0aGlzLnJhZGl1cyAtICggZS5jbGllbnRYIC0gdGhpcy56b25lLnggKTtcclxuICAgICAgICAvL3RoaXMudG1wLnkgPSB0aGlzLnJhZGl1cyAtICggZS5jbGllbnRZIC0gdGhpcy56b25lLnkgLSB0aGlzLnRvcCApO1xyXG5cclxuICAgICAgICB0aGlzLnRtcC54ID0gKHRoaXMudyowLjUpIC0gKCBlLmNsaWVudFggLSB0aGlzLnpvbmUueCApO1xyXG4gICAgICAgIHRoaXMudG1wLnkgPSAodGhpcy5kaWFtKjAuNSkgLSAoIGUuY2xpZW50WSAtIHRoaXMuem9uZS55IC0gdGhpcy55dG9wICk7XHJcblxyXG4gICAgICAgIGxldCBkaXN0YW5jZSA9IHRoaXMudG1wLmxlbmd0aCgpO1xyXG5cclxuICAgICAgICBpZiAoIGRpc3RhbmNlID4gdGhpcy5kaXN0YW5jZSApIHtcclxuICAgICAgICAgICAgbGV0IGFuZ2xlID0gTWF0aC5hdGFuMih0aGlzLnRtcC54LCB0aGlzLnRtcC55KTtcclxuICAgICAgICAgICAgdGhpcy50bXAueCA9IE1hdGguc2luKCBhbmdsZSApICogdGhpcy5kaXN0YW5jZTtcclxuICAgICAgICAgICAgdGhpcy50bXAueSA9IE1hdGguY29zKCBhbmdsZSApICogdGhpcy5kaXN0YW5jZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucG9zLmNvcHkoIHRoaXMudG1wICkuZGl2aWRlU2NhbGFyKCB0aGlzLmRpc3RhbmNlICkubmVnYXRlKCk7XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNldFZhbHVlICggdiApIHtcclxuXHJcbiAgICAgICAgaWYodj09PXVuZGVmaW5lZCkgdj1bMCwwXTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3Muc2V0KCB2WzBdIHx8IDAsIHZbMV0gIHx8IDAgKTtcclxuICAgICAgICB0aGlzLnVwZGF0ZVNWRygpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGUgKCB1cCApIHtcclxuXHJcbiAgICAgICAgaWYoIHVwID09PSB1bmRlZmluZWQgKSB1cCA9IHRydWU7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmludGVydmFsICE9PSBudWxsICl7XHJcblxyXG4gICAgICAgICAgICBpZiggIXRoaXMuaXNEb3duICl7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wb3MubGVycCggbnVsbCwgMC4zICk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5wb3MueCA9IE1hdGguYWJzKCB0aGlzLnBvcy54ICkgPCAwLjAxID8gMCA6IHRoaXMucG9zLng7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBvcy55ID0gTWF0aC5hYnMoIHRoaXMucG9zLnkgKSA8IDAuMDEgPyAwIDogdGhpcy5wb3MueTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiggdGhpcy5pc1VJICYmIHRoaXMubWFpbi5pc0NhbnZhcyApIHRoaXMubWFpbi5kcmF3KCk7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGVTVkcoKTtcclxuXHJcbiAgICAgICAgaWYoIHVwICkgdGhpcy5zZW5kKCk7XHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIGlmKCB0aGlzLnBvcy5pc1plcm8oKSApIHRoaXMuc3RvcEludGVydmFsKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZVNWRyAoKSB7XHJcblxyXG4gICAgICAgIC8vbGV0IHggPSB0aGlzLnJhZGl1cyAtICggLXRoaXMucG9zLnggKiB0aGlzLmRpc3RhbmNlICk7XHJcbiAgICAgICAgLy9sZXQgeSA9IHRoaXMucmFkaXVzIC0gKCAtdGhpcy5wb3MueSAqIHRoaXMuZGlzdGFuY2UgKTtcclxuXHJcbiAgICAgICAgbGV0IHggPSAodGhpcy5kaWFtKjAuNSkgLSAoIC10aGlzLnBvcy54ICogdGhpcy5kaXN0YW5jZSApO1xyXG4gICAgICAgIGxldCB5ID0gKHRoaXMuZGlhbSowLjUpIC0gKCAtdGhpcy5wb3MueSAqIHRoaXMuZGlzdGFuY2UgKTtcclxuXHJcbiAgICAgICAgaWYodGhpcy5tb2RlbCA9PT0gMCl7XHJcblxyXG4gICAgICAgICAgICBsZXQgc3ggPSB4ICsgKCh0aGlzLnBvcy54KSo1KSArIDU7XHJcbiAgICAgICAgICAgIGxldCBzeSA9IHkgKyAoKHRoaXMucG9zLnkpKjUpICsgMTA7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnY3gnLCBzeCp0aGlzLnJhdGlvLCAzICk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdjeScsIHN5KnRoaXMucmF0aW8sIDMgKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnY3gnLCB4KnRoaXMucmF0aW8sIDMgKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2N5JywgeSp0aGlzLnJhdGlvLCAzICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBcclxuXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2N4JywgeCp0aGlzLnJhdGlvLCA0ICk7XHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2N5JywgeSp0aGlzLnJhdGlvLCA0ICk7XHJcblxyXG4gICAgICAgIHRoaXMudmFsdWVbMF0gPSAgKCB0aGlzLnBvcy54ICogdGhpcy5tdWx0aXBsaWNhdG9yICkudG9GaXhlZCggdGhpcy5wcmVjaXNpb24gKSAqIDE7XHJcbiAgICAgICAgdGhpcy52YWx1ZVsxXSA9ICAoIHRoaXMucG9zLnkgKiB0aGlzLm11bHRpcGxpY2F0b3IgKS50b0ZpeGVkKCB0aGlzLnByZWNpc2lvbiApICogMTtcclxuXHJcbiAgICAgICAgaWYodGhpcy5oYXZlVGV4dCkgdGhpcy5jWzJdLnRleHRDb250ZW50ID0gdGhpcy52YWx1ZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2xlYXIgKCkge1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuc3RvcEludGVydmFsKCk7XHJcbiAgICAgICAgc3VwZXIuY2xlYXIoKTtcclxuXHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdG8gfSBmcm9tICcuLi9jb3JlL1Byb3RvLmpzJztcclxuaW1wb3J0IHsgVG9vbHMgfSBmcm9tICcuLi9jb3JlL1Rvb2xzLmpzJztcclxuaW1wb3J0IHsgVjIgfSBmcm9tICcuLi9jb3JlL1YyLmpzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBLbm9iIGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvICk7XHJcblxyXG4gICAgICAgIHRoaXMuaXNDeWNsaWMgPSBvLmN5Y2xpYyB8fCBmYWxzZTtcclxuICAgICAgICB0aGlzLm1vZGVsID0gby5zdHlwZSB8fCAwO1xyXG4gICAgICAgIGlmKCBvLm1vZGUgIT09IHVuZGVmaW5lZCApIHRoaXMubW9kZWwgPSBvLm1vZGU7XHJcblxyXG4gICAgICAgIHRoaXMuYXV0b1dpZHRoID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0VHlwZU51bWJlciggbyApO1xyXG5cclxuICAgICAgICB0aGlzLm1pbncgID0gdGhpcy53XHJcbiAgICAgICAgdGhpcy5kaWFtID0gby5kaWFtIHx8IHRoaXMudyBcclxuXHJcbiAgICAgICAgdGhpcy5tUEkgPSBNYXRoLlBJICogMC44O1xyXG4gICAgICAgIHRoaXMudG9EZWcgPSAxODAgLyBNYXRoLlBJO1xyXG4gICAgICAgIHRoaXMuY2lyUmFuZ2UgPSB0aGlzLm1QSSAqIDI7XHJcblxyXG4gICAgICAgIHRoaXMub2Zmc2V0ID0gbmV3IFYyKCk7XHJcblxyXG4gICAgICAgIHRoaXMuaCA9IG8uaCB8fCB0aGlzLncgKyAxMDtcclxuXHJcbiAgICAgICAgdGhpcy5jWzBdLnN0eWxlLndpZHRoID0gdGhpcy53ICsncHgnXHJcbiAgICAgICAgdGhpcy5jWzBdLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snXHJcblxyXG4gICAgICAgIGlmKHRoaXMuY1sxXSAhPT0gdW5kZWZpbmVkKSB7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNbMV0uc3R5bGUud2lkdGggPSAnMTAwJSdcclxuICAgICAgICAgICAgdGhpcy5jWzFdLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2NlbnRlcidcclxuICAgICAgICAgICAgdGhpcy50b3AgPSAxMDtcclxuICAgICAgICAgICAgdGhpcy5oICs9IDEwO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMucGVyY2VudCA9IDA7XHJcblxyXG4gICAgICAgIHRoaXMuY21vZGUgPSAwO1xyXG4gICAgICAgIGxldCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG4gICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0ICsgJ2p1c3RpZnktY29udGVudDpjZW50ZXI7IHRvcDonKyh0aGlzLmgtMjApKydweDsgd2lkdGg6MTAwJTsgY29sb3I6JysgY2MudGV4dCApO1xyXG5cclxuICAgICAgICB0aGlzLmNbM10gPSB0aGlzLmdldEtub2IoKTtcclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbCcsIGNjLmJ1dHRvbiwgMCApXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNjLnRleHQsIDEgKVxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjYy50ZXh0LCAzIClcclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZCcsIHRoaXMubWFrZUdyYWQoKSwgMyApXHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3ZpZXdCb3gnLCAnMCAwICcgKyB0aGlzLmRpYW0gKyAnICcgKyB0aGlzLmRpYW0gKVxyXG4gICAgICAgIHRoaXMuc2V0Q3NzKCB0aGlzLmNbM10sIHsgd2lkdGg6dGhpcy5kaWFtLCBoZWlnaHQ6dGhpcy5kaWFtLCBsZWZ0OjAsIHRvcDp0aGlzLnRvcCB9KVxyXG5cclxuICAgICAgICBpZiAoIHRoaXMubW9kZWwgPiAwICkge1xyXG5cclxuICAgICAgICAgICAgVG9vbHMuZG9tKCAncGF0aCcsICcnLCB7IGQ6ICcnLCBzdHJva2U6Y2MudGV4dCwgJ3N0cm9rZS13aWR0aCc6IDIsIGZpbGw6ICdub25lJywgJ3N0cm9rZS1saW5lY2FwJzogJ3JvdW5kJyB9LCB0aGlzLmNbM10gKTsgLy80XHJcblxyXG4gICAgICAgICAgICBpZiAoIHRoaXMubW9kZWwgPT0gMikge1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIFRvb2xzLmFkZFNWR0dsb3dFZmZlY3QoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHlsZScsICdmaWx0ZXI6IHVybChcIiNVSUxHbG93XCIpOycsIDQgKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnIgPSAwO1xyXG5cclxuICAgICAgICB0aGlzLmluaXQoKTtcclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW9kZSAoIG1vZGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmNtb2RlID09PSBtb2RlICkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgICBzd2l0Y2goIG1vZGUgKSB7XHJcbiAgICAgICAgICAgIGNhc2UgMDogLy8gYmFzZVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zWzJdLmNvbG9yID0gY2MudGV4dDtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdmaWxsJywgY2MuYnV0dG9uLCAwKTtcclxuICAgICAgICAgICAgICAgIC8vdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsJ3JnYmEoMjU1LDAsMCwwLjIpJywgMik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgY2MudGV4dCwgMSApO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOiAvLyBkb3duXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNbMl0uY29sb3IgPSBjYy50ZXh0T3ZlcjtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdmaWxsJywgY2Muc2VsZWN0LCAwKTtcclxuICAgICAgICAgICAgICAgIC8vdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsJ3JnYmEoMCwwLDAsMC42KScsIDIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNjLnRleHRPdmVyLCAxICk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jbW9kZSA9IG1vZGU7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHRlc3Rab25lICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IGwgPSB0aGlzLmxvY2FsO1xyXG4gICAgICAgIGlmKCBsLnggPT09IC0xICYmIGwueSA9PT0gLTEgKSByZXR1cm4gJyc7XHJcbiAgICAgICAgaWYoIGwueSA8PSB0aGlzLmNbIDEgXS5vZmZzZXRIZWlnaHQgKSByZXR1cm4gJ3RpdGxlJztcclxuICAgICAgICBlbHNlIGlmICggbC55ID4gdGhpcy5oIC0gdGhpcy5jWyAyIF0ub2Zmc2V0SGVpZ2h0ICkgcmV0dXJuICd0ZXh0JztcclxuICAgICAgICBlbHNlIHJldHVybiAna25vYic7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgRVZFTlRTXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgbW91c2V1cCAoIGUgKSB7XHJcblxyXG4gICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5zZW5kRW5kKClcclxuICAgICAgICByZXR1cm4gdGhpcy5tb2RlKDApXHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlZG93biAoIGUgKSB7XHJcblxyXG4gICAgICAgIHRoaXMuaXNEb3duID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMub2xkID0gdGhpcy52YWx1ZVxyXG4gICAgICAgIHRoaXMub2xkciA9IG51bGxcclxuICAgICAgICB0aGlzLm1vdXNlbW92ZSggZSApXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZSgxKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZW1vdmUgKCBlICkge1xyXG5cclxuICAgICAgICBpZiggIXRoaXMuaXNEb3duICkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgb2ZmID0gdGhpcy5vZmZzZXQ7XHJcblxyXG4gICAgICAgIC8vb2ZmLnggPSB0aGlzLnJhZGl1cyAtICggZS5jbGllbnRYIC0gdGhpcy56b25lLnggKTtcclxuICAgICAgICAvL29mZi55ID0gdGhpcy5yYWRpdXMgLSAoIGUuY2xpZW50WSAtIHRoaXMuem9uZS55IC0gdGhpcy50b3AgKTtcclxuXHJcbiAgICAgICAgb2ZmLnggPSAodGhpcy53KjAuNSkgLSAoIGUuY2xpZW50WCAtIHRoaXMuem9uZS54ICk7XHJcbiAgICAgICAgb2ZmLnkgPSAodGhpcy5kaWFtKjAuNSkgLSAoIGUuY2xpZW50WSAtIHRoaXMuem9uZS55IC0gdGhpcy55dG9wICk7XHJcblxyXG4gICAgICAgIHRoaXMuciA9IC0gTWF0aC5hdGFuMiggb2ZmLngsIG9mZi55ICk7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLm9sZHIgIT09IG51bGwgKSB0aGlzLnIgPSBNYXRoLmFicyh0aGlzLnIgLSB0aGlzLm9sZHIpID4gTWF0aC5QSSA/IHRoaXMub2xkciA6IHRoaXMucjtcclxuXHJcbiAgICAgICAgdGhpcy5yID0gdGhpcy5yID4gdGhpcy5tUEkgPyB0aGlzLm1QSSA6IHRoaXMucjtcclxuICAgICAgICB0aGlzLnIgPSB0aGlzLnIgPCAtdGhpcy5tUEkgPyAtdGhpcy5tUEkgOiB0aGlzLnI7XHJcblxyXG4gICAgICAgIGxldCBzdGVwcyA9IDEgLyB0aGlzLmNpclJhbmdlO1xyXG4gICAgICAgIGxldCB2YWx1ZSA9ICh0aGlzLnIgKyB0aGlzLm1QSSkgKiBzdGVwcztcclxuXHJcbiAgICAgICAgbGV0IG4gPSAoICggdGhpcy5yYW5nZSAqIHZhbHVlICkgKyB0aGlzLm1pbiApIC0gdGhpcy5vbGQ7XHJcblxyXG4gICAgICAgIGlmKG4gPj0gdGhpcy5zdGVwIHx8IG4gPD0gdGhpcy5zdGVwKXsgXHJcbiAgICAgICAgICAgIG4gPSBNYXRoLmZsb29yKCBuIC8gdGhpcy5zdGVwICk7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSB0aGlzLm51bVZhbHVlKCB0aGlzLm9sZCArICggbiAqIHRoaXMuc3RlcCApICk7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKCB0cnVlICk7XHJcbiAgICAgICAgICAgIHRoaXMub2xkID0gdGhpcy52YWx1ZTtcclxuICAgICAgICAgICAgdGhpcy5vbGRyID0gdGhpcy5yO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgd2hlZWwgKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoIGUgKTtcclxuXHJcbiAgICAgICAgaWYoIG5hbWUgPT09ICdrbm9iJyApIHtcclxuICAgIFxyXG4gICAgICAgICAgICBsZXQgdiA9IHRoaXMudmFsdWUgLSB0aGlzLnN0ZXAgKiBlLmRlbHRhO1xyXG4gICAgXHJcbiAgICAgICAgICAgIGlmICggdiA+IHRoaXMubWF4ICkge1xyXG4gICAgICAgICAgICAgICAgdiA9IHRoaXMuaXNDeWNsaWMgPyB0aGlzLm1pbiA6IHRoaXMubWF4O1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCB2IDwgdGhpcy5taW4gKSB7XHJcbiAgICAgICAgICAgICAgICB2ID0gdGhpcy5pc0N5Y2xpYyA/IHRoaXMubWF4IDogdGhpcy5taW47XHJcbiAgICAgICAgICAgIH1cclxuICAgIFxyXG4gICAgICAgICAgICB0aGlzLnNldFZhbHVlKCB2ICk7XHJcbiAgICAgICAgICAgIHRoaXMub2xkID0gdjtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoIHRydWUgKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbWFrZUdyYWQgKCkge1xyXG5cclxuICAgICAgICBsZXQgZCA9ICcnLCBzdGVwLCByYW5nZSwgYSwgeCwgeSwgeDIsIHkyLCByID0gNjQ7XHJcbiAgICAgICAgbGV0IHN0YXJ0YW5nbGUgPSBNYXRoLlBJICsgdGhpcy5tUEk7XHJcbiAgICAgICAgbGV0IGVuZGFuZ2xlID0gTWF0aC5QSSAtIHRoaXMubVBJO1xyXG4gICAgICAgIC8vbGV0IHN0ZXAgPSB0aGlzLnN0ZXA+NSA/IHRoaXMuc3RlcCA6IDE7XHJcblxyXG4gICAgICAgIGlmKHRoaXMuc3RlcD41KXtcclxuICAgICAgICAgICAgcmFuZ2UgPSAgdGhpcy5yYW5nZSAvIHRoaXMuc3RlcDtcclxuICAgICAgICAgICAgc3RlcCA9ICggc3RhcnRhbmdsZSAtIGVuZGFuZ2xlICkgLyByYW5nZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzdGVwID0gKCggc3RhcnRhbmdsZSAtIGVuZGFuZ2xlICkgLyByKSoyO1xyXG4gICAgICAgICAgICByYW5nZSA9IHIqMC41O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yICggbGV0IGkgPSAwOyBpIDw9IHJhbmdlOyArK2kgKSB7XHJcblxyXG4gICAgICAgICAgICBhID0gc3RhcnRhbmdsZSAtICggc3RlcCAqIGkgKTtcclxuICAgICAgICAgICAgeCA9IHIgKyBNYXRoLnNpbiggYSApICogKCByIC0gMjAgKTtcclxuICAgICAgICAgICAgeSA9IHIgKyBNYXRoLmNvcyggYSApICogKCByIC0gMjAgKTtcclxuICAgICAgICAgICAgeDIgPSByICsgTWF0aC5zaW4oIGEgKSAqICggciAtIDI0ICk7XHJcbiAgICAgICAgICAgIHkyID0gciArIE1hdGguY29zKCBhICkgKiAoIHIgLSAyNCApO1xyXG4gICAgICAgICAgICBkICs9ICdNJyArIHggKyAnICcgKyB5ICsgJyBMJyArIHgyICsgJyAnK3kyICsgJyAnO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBkO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGUgKCB1cCApIHtcclxuXHJcbiAgICAgICAgdGhpcy5jWzJdLnRleHRDb250ZW50ID0gdGhpcy52YWx1ZTtcclxuICAgICAgICB0aGlzLnBlcmNlbnQgPSAodGhpcy52YWx1ZSAtIHRoaXMubWluKSAvIHRoaXMucmFuZ2U7XHJcblxyXG4gICAgICAgIGxldCBzYSA9IE1hdGguUEkgKyB0aGlzLm1QSTtcclxuICAgICAgICBsZXQgZWEgPSAoICggdGhpcy5wZXJjZW50ICogdGhpcy5jaXJSYW5nZSApIC0gKCB0aGlzLm1QSSApICk7XHJcblxyXG4gICAgICAgIGxldCBzaW4gPSBNYXRoLnNpbiggZWEgKTtcclxuICAgICAgICBsZXQgY29zID0gTWF0aC5jb3MoIGVhICk7XHJcblxyXG4gICAgICAgIGxldCB4MSA9ICggMjUgKiBzaW4gKSArIDY0O1xyXG4gICAgICAgIGxldCB5MSA9IC0oIDI1ICogY29zICkgKyA2NDtcclxuICAgICAgICBsZXQgeDIgPSAoIDIwICogc2luICkgKyA2NDtcclxuICAgICAgICBsZXQgeTIgPSAtKCAyMCAqIGNvcyApICsgNjQ7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdkJywgJ00gJyArIHgxICsnICcgKyB5MSArICcgTCAnICsgeDIgKycgJyArIHkyLCAxICk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKCB0aGlzLm1vZGVsID4gMCApIHtcclxuXHJcbiAgICAgICAgICAgIGxldCB4MSA9IDM2ICogTWF0aC5zaW4oIHNhICkgKyA2NDtcclxuICAgICAgICAgICAgbGV0IHkxID0gMzYgKiBNYXRoLmNvcyggc2EgKSArIDY0O1xyXG4gICAgICAgICAgICBsZXQgeDIgPSAzNiAqIHNpbiArIDY0O1xyXG4gICAgICAgICAgICBsZXQgeTIgPSAtMzYgKiBjb3MgKyA2NDtcclxuICAgICAgICAgICAgbGV0IGJpZyA9IGVhIDw9IE1hdGguUEkgLSB0aGlzLm1QSSA/IDAgOiAxO1xyXG4gICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZCcsICdNICcgKyB4MSArICcsJyArIHkxICsgJyBBICcgKyAzNiArICcsJyArIDM2ICsgJyAxICcgKyBiaWcgKyAnIDEgJyArIHgyICsgJywnICsgeTIsIDQgKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjb2xvciA9IFRvb2xzLnBhY2soIFRvb2xzLmxlcnBDb2xvciggVG9vbHMudW5wYWNrKCBUb29scy5Db2xvckx1bWEoIHRoaXMuY29sb3JzLnRleHQsIC0wLjc1KSApLCBUb29scy51bnBhY2soIHRoaXMuY29sb3JzLnRleHQgKSwgdGhpcy5wZXJjZW50ICkgKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNvbG9yLCA0ICk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggdXAgKSB0aGlzLnNlbmQoKTtcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5pbXBvcnQgeyBSb290cyB9IGZyb20gJy4uL2NvcmUvUm9vdHMuanMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIExpc3QgZXh0ZW5kcyBQcm90byB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoIG8gPSB7fSApIHtcclxuXHJcbiAgICAgICAgc3VwZXIoIG8gKTtcclxuXHJcbiAgICAgICAgLy8gVE9ETyBub3Qgd29ya1xyXG4gICAgICAgIHRoaXMuaGlkZUN1cnJlbnQgPSBmYWxzZVxyXG5cclxuICAgICAgICAvLyBpbWFnZXNcclxuICAgICAgICB0aGlzLnBhdGggPSBvLnBhdGggfHwgJyc7XHJcbiAgICAgICAgdGhpcy5mb3JtYXQgPSBvLmZvcm1hdCB8fCAnJztcclxuICAgICAgICBcclxuXHJcbiAgICAgICAgdGhpcy5pc1dpdGhJbWFnZSA9IHRoaXMucGF0aCAhPT0gJycgPyB0cnVlOmZhbHNlO1xyXG4gICAgICAgIHRoaXMucHJlTG9hZENvbXBsZXRlID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHRoaXMudG1wSW1hZ2UgPSB7fTtcclxuICAgICAgICB0aGlzLnRtcFVybCA9IFtdO1xyXG5cclxuICAgICAgICB0aGlzLm0gPSBvLm0gIT09IHVuZGVmaW5lZCA/IG8ubSA6IDVcclxuXHJcblxyXG4gICAgICAgIGxldCBhbGlnbiA9IG8uYWxpZ24gfHwgJ2xlZnQnO1xyXG5cclxuICAgICAgICAvLyBzY3JvbGwgc2l6ZVxyXG4gICAgICAgIGxldCBzcyA9IG8uc2Nyb2xsU2l6ZSB8fCAxMFxyXG4gICAgICAgIHRoaXMuc3MgPSBzcysxXHJcblxyXG4gICAgICAgIHRoaXMuc01vZGUgPSAwO1xyXG4gICAgICAgIHRoaXMudE1vZGUgPSAwO1xyXG5cclxuICAgICAgICB0aGlzLmxpc3RPbmx5ID0gby5saXN0T25seSB8fCBmYWxzZVxyXG4gICAgICAgIHRoaXMuc3RhdGljVG9wID0gby5zdGF0aWNUb3AgfHwgZmFsc2VcclxuXHJcbiAgICAgICAgdGhpcy5pc1NlbGVjdGFibGUgPSB0aGlzLmxpc3RPbmx5XHJcbiAgICAgICAgaWYoIG8uc2VsZWN0ICE9PSB1bmRlZmluZWQgKSBvLnNlbGVjdGFibGUgPSBvLnNlbGVjdFxyXG4gICAgICAgIGlmKCBvLnNlbGVjdGFibGUgIT09IHVuZGVmaW5lZCApIHRoaXMuaXNTZWxlY3RhYmxlID0gby5zZWxlY3RhYmxlXHJcblxyXG4gICAgICAgIGlmKCB0aGlzLnR4dCA9PT0gJycgKSB0aGlzLnAgPSAwO1xyXG5cclxuXHJcbiAgICAgICAgbGV0IGZsdG9wID0gTWF0aC5mbG9vcih0aGlzLmgqMC41KS0zO1xyXG4gICAgICAgIGxldCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG4gICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MuYmFzaWMgKyAndG9wOjA7IGRpc3BsYXk6bm9uZTsgYm9yZGVyLXJhZGl1czonK3RoaXMucmFkaXVzKydweDsnICk7XHJcbiAgICAgICAgdGhpcy5jWzNdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy5pdGVtICsgJ3BhZGRpbmc6MHB4ICcrdGhpcy5tKydweDsgbWFyZ2luLWJvdHRvbTowcHg7IHBvc2l0aW9uOmFic29sdXRlOyBqdXN0aWZ5LWNvbnRlbnQ6JythbGlnbisnOyB0ZXh0LWFsaWduOicrYWxpZ24rJzsgbGluZS1oZWlnaHQ6JysodGhpcy5oLTQpKydweDsgdG9wOjFweDsgYmFja2dyb3VuZDonK2NjLmJ1dHRvbisnOyBoZWlnaHQ6JysodGhpcy5oLTIpKydweDsgYm9yZGVyOjFweCBzb2xpZCAnK2NjLmJvcmRlcisnOyBib3JkZXItcmFkaXVzOicrdGhpcy5yYWRpdXMrJ3B4OycgKTtcclxuICAgICAgICB0aGlzLmNbNF0gPSB0aGlzLmRvbSggJ3BhdGgnLCB0aGlzLmNzcy5iYXNpYyArICdwb3NpdGlvbjphYnNvbHV0ZTsgd2lkdGg6NnB4OyBoZWlnaHQ6NnB4OyB0b3A6JytmbHRvcCsncHg7JywgeyBkOnRoaXMuc3Zncy5nMSwgZmlsbDpjYy50ZXh0LCBzdHJva2U6J25vbmUnfSk7XHJcblxyXG4gICAgICAgIHRoaXMuc2Nyb2xsZXJCYWNrID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy5iYXNpYyArICdyaWdodDowcHg7IHdpZHRoOicrc3MrJ3B4OyBiYWNrZ3JvdW5kOicrY2MuYmFjaysnOyBkaXNwbGF5Om5vbmU7Jyk7XHJcbiAgICAgICAgdGhpcy5zY3JvbGxlciA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MuYmFzaWMgKyAncmlnaHQ6JysoKHNzLShzcyowLjI1KSkqMC41KSsncHg7IHdpZHRoOicrKHNzKjAuMjUpKydweDsgYmFja2dyb3VuZDonK2NjLnRleHQrJzsgZGlzcGxheTpub25lOyAnKTtcclxuXHJcbiAgICAgICAgdGhpcy5jWzNdLnN0eWxlLmNvbG9yID0gY2MudGV4dDtcclxuXHJcblxyXG4gICAgICAgIHRoaXMubGlzdCA9IFtdXHJcbiAgICAgICAgdGhpcy5yZWZPYmplY3QgPSBudWxsXHJcblxyXG4gICAgICAgIGlmKCBvLmxpc3QgKXtcclxuICAgICAgICAgICAgaWYoIG8ubGlzdCBpbnN0YW5jZW9mIEFycmF5ICl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpc3QgPSBvLmxpc3RcclxuICAgICAgICAgICAgfSBlbHNlIGlmKCBvLmxpc3QgaW5zdGFuY2VvZiBPYmplY3QgKXtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVmT2JqZWN0ID0gby5saXN0XHJcbiAgICAgICAgICAgICAgICBmb3IoIGxldCBnIGluIHRoaXMucmVmT2JqZWN0ICkgdGhpcy5saXN0LnB1c2goIGcgKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLml0ZW1zID0gW107XHJcblxyXG4gICAgICAgIHRoaXMucHJldk5hbWUgPSAnJztcclxuXHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy50bXBJZCA9IDBcclxuXHJcbiAgICAgICAgdGhpcy5iYXNlSCA9IHRoaXMuaDtcclxuXHJcbiAgICAgICAgdGhpcy5pdGVtSGVpZ2h0ID0gby5pdGVtSGVpZ2h0IHx8IHRoaXMuaC8vKHRoaXMuaC0zKTtcclxuXHJcbiAgICAgICAgLy8gZm9yY2UgZnVsbCBsaXN0IFxyXG4gICAgICAgIHRoaXMuZnVsbCA9IG8uZnVsbCB8fCBmYWxzZTtcclxuXHJcbiAgICAgICAgdGhpcy5weSA9IDA7XHJcbiAgICAgICAgdGhpcy53dyA9IHRoaXMuc2I7XHJcbiAgICAgICAgdGhpcy5zY3JvbGwgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnQgPSBudWxsO1xyXG5cclxuICAgICAgICAvLyBsaXN0IHVwIG9yIGRvd25cclxuICAgICAgICB0aGlzLnNpZGUgPSBvLnNpZGUgfHwgJ2Rvd24nO1xyXG4gICAgICAgIHRoaXMudXAgPSB0aGlzLnNpZGUgPT09ICdkb3duJyA/IDAgOiAxO1xyXG5cclxuICAgICAgICBpZiggdGhpcy51cCApe1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jWzJdLnN0eWxlLnRvcCA9ICdhdXRvJztcclxuICAgICAgICAgICAgdGhpcy5jWzNdLnN0eWxlLnRvcCA9ICdhdXRvJztcclxuICAgICAgICAgICAgdGhpcy5jWzRdLnN0eWxlLnRvcCA9ICdhdXRvJztcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY1syXS5zdHlsZS5ib3R0b20gPSB0aGlzLmgtMiArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuY1szXS5zdHlsZS5ib3R0b20gPSAnMXB4JztcclxuICAgICAgICAgICAgdGhpcy5jWzRdLnN0eWxlLmJvdHRvbSA9IGZsdG9wICsgJ3B4JztcclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5jWzJdLnN0eWxlLnRvcCA9IHRoaXMuYmFzZUggKyAncHgnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5saXN0SW4gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLmJhc2ljICsgJ2xlZnQ6MDsgdG9wOjA7IHdpZHRoOjEwMCU7IGJhY2tncm91bmQ6bm9uZTsnKTtcclxuICAgICAgICB0aGlzLmxpc3RJbi5uYW1lID0gJ2xpc3QnO1xyXG5cclxuICAgICAgICB0aGlzLnRvcExpc3QgPSAwO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuY1syXS5hcHBlbmRDaGlsZCggdGhpcy5saXN0SW4gKTtcclxuICAgICAgICB0aGlzLmNbMl0uYXBwZW5kQ2hpbGQoIHRoaXMuc2Nyb2xsZXJCYWNrICk7XHJcbiAgICAgICAgdGhpcy5jWzJdLmFwcGVuZENoaWxkKCB0aGlzLnNjcm9sbGVyICk7XHJcblxyXG4gICAgICAgIGlmKCBvLnZhbHVlICE9PSB1bmRlZmluZWQgKXtcclxuICAgICAgICAgICAgaWYoIWlzTmFOKG8udmFsdWUpKSB0aGlzLnZhbHVlID0gdGhpcy5saXN0WyBvLnZhbHVlIF07XHJcbiAgICAgICAgICAgIGVsc2UgdGhpcy52YWx1ZSA9IG8udmFsdWU7XHJcbiAgICAgICAgfWVsc2V7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSB0aGlzLmxpc3RbMF07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmlzT3Blbk9uU3RhcnQgPSBvLm9wZW4gfHwgZmFsc2U7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmxpc3RPbmx5ICl7XHJcbiAgICAgICAgICAgIHRoaXMuYmFzZUggPSA1O1xyXG4gICAgICAgICAgICB0aGlzLmNbM10uc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICAgICAgdGhpcy5jWzRdLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgIHRoaXMuY1syXS5zdHlsZS50b3AgPSB0aGlzLmJhc2VIKydweCdcclxuICAgICAgICAgICAgdGhpcy5pc09wZW5PblN0YXJ0ID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICB0aGlzLm1pbmlDYW52YXMgPSBvLm1pbmlDYW52YXMgfHwgZmFsc2UgXHJcbiAgICAgICAgdGhpcy5jYW52YXNCZyA9IG8uY2FudmFzQmcgfHwgJ3JnYmEoMCwwLDAsMCknXHJcbiAgICAgICAgdGhpcy5pbWFnZVNpemUgPSBvLmltYWdlU2l6ZSB8fCBbMjAsMjBdO1xyXG5cclxuICAgICAgICAvLyBkcmFnb3V0IGZ1bmN0aW9uXHJcbiAgICAgICAgdGhpcy5kcmFnID0gby5kcmFnIHx8IGZhbHNlXHJcbiAgICAgICAgdGhpcy5kcmFnb3V0ID0gby5kcmFnb3V0IHx8IGZhbHNlXHJcbiAgICAgICAgdGhpcy5kcmFnc3RhcnQgPSBvLmRyYWdzdGFydCB8fCBudWxsXHJcbiAgICAgICAgdGhpcy5kcmFnZW5kID0gby5kcmFnZW5kIHx8IG51bGxcclxuXHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIC8vdGhpcy5jWzBdLnN0eWxlLmJhY2tncm91bmQgPSAnI0ZGMDAwMCdcclxuICAgICAgICAvLy9pZiggdGhpcy5pc1dpdGhJbWFnZSApIHRoaXMucHJlbG9hZEltYWdlKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIHRoaXMuc2V0TGlzdCggdGhpcy5saXN0ICk7XHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICAgICAgaWYoIHRoaXMuaXNXaXRoSW1hZ2UgKSB0aGlzLnByZWxvYWRJbWFnZSgpO1xyXG4gICAgICAgIGlmKCB0aGlzLmlzT3Blbk9uU3RhcnQgKSB0aGlzLm9wZW4oIHRydWUgKVxyXG5cclxuICAgICAgICB0aGlzLmJhc2VIICs9IHRoaXMubXRvcFxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyBpbWFnZSBsaXN0XHJcblxyXG4gICAgcHJlbG9hZEltYWdlICgpIHtcclxuXHJcblxyXG5cclxuICAgICAgICB0aGlzLnByZUxvYWRDb21wbGV0ZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICB0aGlzLnRtcEltYWdlID0ge307XHJcbiAgICAgICAgZm9yKCBsZXQgaT0wOyBpPHRoaXMubGlzdC5sZW5ndGg7IGkrKyApIHRoaXMudG1wVXJsLnB1c2goIHRoaXMubGlzdFtpXSApO1xyXG4gICAgICAgIHRoaXMubG9hZE9uZSgpO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIG5leHRJbWcgKCkge1xyXG5cclxuICAgICAgICBpZih0aGlzLmMgPT09IG51bGwpIHJldHVyblxyXG5cclxuICAgICAgICB0aGlzLnRtcFVybC5zaGlmdCgpO1xyXG4gICAgICAgIGlmKCB0aGlzLnRtcFVybC5sZW5ndGggPT09IDAgKXsgXHJcblxyXG4gICAgICAgICAgICB0aGlzLnByZUxvYWRDb21wbGV0ZSA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZEltYWdlcygpO1xyXG4gICAgICAgICAgICAvKnRoaXMuc2V0TGlzdCggdGhpcy5saXN0ICk7XHJcbiAgICAgICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgICAgICAgICBpZiggdGhpcy5pc09wZW5PblN0YXJ0ICkgdGhpcy5vcGVuKCk7Ki9cclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgdGhpcy5sb2FkT25lKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGxvYWRPbmUoKXtcclxuXHJcbiAgICAgICAgbGV0IHNlbGYgPSB0aGlzXHJcbiAgICAgICAgbGV0IG5hbWUgPSB0aGlzLnRtcFVybFswXTtcclxuICAgICAgICBsZXQgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XHJcbiAgICAgICAgaW1nLnN0eWxlLmNzc1RleHQgPSAncG9zaXRpb246YWJzb2x1dGU7IHdpZHRoOicrc2VsZi5pbWFnZVNpemVbMF0rJ3B4OyBoZWlnaHQ6JytzZWxmLmltYWdlU2l6ZVsxXSsncHgnO1xyXG4gICAgICAgIGltZy5zZXRBdHRyaWJ1dGUoJ3NyYycsIHRoaXMucGF0aCArIG5hbWUgKyB0aGlzLmZvcm1hdCApO1xyXG5cclxuICAgICAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICAgICAgc2VsZi5pbWFnZVNpemVbMl0gPSBpbWcud2lkdGg7XHJcbiAgICAgICAgICAgIHNlbGYuaW1hZ2VTaXplWzNdID0gaW1nLmhlaWdodDtcclxuICAgICAgICAgICAgc2VsZi50bXBJbWFnZVtuYW1lXSA9IGltZztcclxuICAgICAgICAgICAgc2VsZi5uZXh0SW1nKCk7XHJcblxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvL1xyXG5cclxuICAgIHRlc3Rab25lICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IGwgPSB0aGlzLmxvY2FsO1xyXG4gICAgICAgIGlmKCBsLnggPT09IC0xICYmIGwueSA9PT0gLTEgKSByZXR1cm4gJyc7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLnVwICYmIHRoaXMuaXNPcGVuICl7XHJcbiAgICAgICAgICAgIGlmKCBsLnkgPiB0aGlzLmggLSB0aGlzLmJhc2VIICkgcmV0dXJuICd0aXRsZSc7XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICBpZiggdGhpcy5zY3JvbGwgJiYgKCBsLnggPiAodGhpcy5zYSt0aGlzLnNiLXRoaXMuc3MpKSApIHJldHVybiAnc2Nyb2xsJztcclxuICAgICAgICAgICAgICAgIGlmKGwueCA+IHRoaXMuc2EpIHJldHVybiB0aGlzLnRlc3RJdGVtcyggbC55LXRoaXMuYmFzZUggKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiggbC55IDwgdGhpcy5iYXNlSCsyICkgcmV0dXJuICd0aXRsZSc7XHJcbiAgICAgICAgICAgIGVsc2V7XHJcbiAgICAgICAgICAgICAgICBpZiggdGhpcy5pc09wZW4gKXtcclxuICAgICAgICAgICAgICAgICAgICBpZiggdGhpcy5zY3JvbGwgJiYgKCBsLnggPiAodGhpcy5zYSt0aGlzLnNiLXRoaXMuc3MpKSApIHJldHVybiAnc2Nyb2xsJztcclxuICAgICAgICAgICAgICAgICAgICBpZihsLnggPiB0aGlzLnNhKSByZXR1cm4gdGhpcy50ZXN0SXRlbXMoIGwueS10aGlzLmJhc2VIICk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gJyc7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHRlc3RJdGVtcyAoIHkgKSB7XHJcblxyXG4gICAgICAgIGxldCBuYW1lID0gJyc7XHJcblxyXG4gICAgICAgIGxldCBpdGVtcyA9IHRoaXMuaXRlbXNcclxuXHJcbiAgICAgICAgLyppZih0aGlzLmhpZGVDdXJyZW50KXtcclxuICAgICAgICAgICAgLy9pdGVtcyA9IFsuLi50aGlzLml0ZW1zXVxyXG4gICAgICAgICAgICBpdGVtcyA9IHRoaXMuaXRlbXMuc2xpY2UodGhpcy50bXBJZClcclxuXHJcbiAgICAgICAgfSovXHJcblxyXG4gICAgICAgIGxldCBpID0gaXRlbXMubGVuZ3RoLCBpdGVtLCBhLCBiO1xyXG4gICAgICAgIHdoaWxlKGktLSl7XHJcbiAgICAgICAgICAgIGl0ZW0gPSBpdGVtc1tpXTtcclxuICAgICAgICAgICAgYSA9IGl0ZW0ucG9zeSArIHRoaXMudG9wTGlzdDtcclxuICAgICAgICAgICAgYiA9IGl0ZW0ucG9zeSArIHRoaXMuaXRlbUhlaWdodCArIDEgKyB0aGlzLnRvcExpc3Q7XHJcbiAgICAgICAgICAgIGlmKCB5ID49IGEgJiYgeSA8PSBiICl7IFxyXG4gICAgICAgICAgICAgICAgbmFtZSA9ICdpdGVtJyArIGk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGVJdGVtKDApXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnQgPSBpdGVtO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlSXRlbSgxKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5hbWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbmFtZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW9kZUl0ZW0gKCBtb2RlICkge1xyXG5cclxuICAgICAgICBpZiggIXRoaXMuY3VycmVudCApIHJldHVyblxyXG5cclxuICAgICAgICBpZiggdGhpcy5jdXJyZW50LnNlbGVjdCAmJiBtb2RlPT09MCkgbW9kZSA9IDJcclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICBzd2l0Y2goIG1vZGUgKXtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgMDogLy8gYmFzZVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50LnN0eWxlLmJhY2tncm91bmQgPSBjYy5iYWNrXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnQuc3R5bGUuY29sb3IgPSBjYy50ZXh0O1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOiAvLyBvdmVyXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnQuc3R5bGUuYmFja2dyb3VuZCA9IGNjLm92ZXJcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudC5zdHlsZS5jb2xvciA9IGNjLnRleHRPdmVyO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOiAvLyBlZGl0IC8gZG93blxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50LnN0eWxlLmJhY2tncm91bmQgPSBjYy5zZWxlY3RcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudC5zdHlsZS5jb2xvciA9IGNjLnRleHRTZWxlY3Q7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdW5TZWxlY3RlZCgpIHtcclxuXHJcbiAgICAgICAgaWYoICF0aGlzLmN1cnJlbnQgKSByZXR1cm5cclxuICAgICAgICB0aGlzLm1vZGVJdGVtKDApXHJcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gbnVsbFxyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZWxlY3RlZCgpIHtcclxuXHJcbiAgICAgICAgaWYoICF0aGlzLmN1cnJlbnQgKSByZXR1cm5cclxuICAgICAgICB0aGlzLnJlc2V0SXRlbXMoKVxyXG4gICAgICAgIHRoaXMubW9kZUl0ZW0oMilcclxuICAgICAgICB0aGlzLmN1cnJlbnQuc2VsZWN0ID0gdHJ1ZVxyXG5cclxuICAgICAgICBcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmVzZXRJdGVtcygpIHtcclxuXHJcbiAgICAgICAgbGV0IGkgPSB0aGlzLml0ZW1zLmxlbmd0aFxyXG4gICAgICAgIHdoaWxlKGktLSl7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0uc2VsZWN0ID0gZmFsc2VcclxuICAgICAgICAgICAgdGhpcy5pdGVtc1tpXS5zdHlsZS5iYWNrZ3JvdW5kID0gdGhpcy5jb2xvcnMuYmFjaztcclxuICAgICAgICAgICAgdGhpcy5pdGVtc1tpXS5zdHlsZS5jb2xvciA9IHRoaXMuY29sb3JzLnRleHQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBoaWRlQWN0aXZlKCkge1xyXG5cclxuICAgICAgICBpZiggIXRoaXMuaGlkZUN1cnJlbnQgKSByZXR1cm5cclxuICAgICAgICAvL2lmKCAhdGhpcy5jdXJyZW50ICkgcmV0dXJuXHJcbiAgICAgICAgaWYoIHRoaXMuY3VycmVudCApdGhpcy50bXBJZCA9IHRoaXMuY3VycmVudC5pZFxyXG4gICAgICAgIHRoaXMucmVzZXRIaWRlKClcclxuICAgICAgICAvL3RoaXMuaXRlbXNbdGhpcy50bXBJZF0uc3R5bGUuaGVpZ2h0ID0gMCsncHgnXHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgcmVzZXRIaWRlKCkge1xyXG5cclxuICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnRtcElkKVxyXG5cclxuICAgICAgICBsZXQgaSA9IHRoaXMuaXRlbXMubGVuZ3RoXHJcbiAgICAgICAgd2hpbGUoaS0tKXtcclxuICAgICAgICAgICAgaWYoaT09PXRoaXMudG1wSWQpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtc1tpXS5zdHlsZS5oZWlnaHQgPSAwKydweCdcclxuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0ucG9zeSA9IC0xO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtc1tpXS5zdHlsZS5oZWlnaHQgPSB0aGlzLml0ZW1IZWlnaHQrJ3B4J1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtc1tpXS5wb3N5ID0gKHRoaXMuaXRlbUhlaWdodCsxKSooaS0xKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvL3RoaXMuaXRlbXNbaV0uc3R5bGUuZGlzcGxheSA9ICdmbGV4J1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLyp0aGlzLml0ZW1zW2ldLnNlbGVjdCA9IGZhbHNlXHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0uc3R5bGUuYmFja2dyb3VuZCA9IHRoaXMuY29sb3JzLmJhY2s7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0uc3R5bGUuY29sb3IgPSB0aGlzLmNvbG9ycy50ZXh0OyovXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIEVWRU5UU1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuXHJcbiAgICBtb3VzZXVwICggZSApIHtcclxuXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vkb3duICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IG5hbWUgPSB0aGlzLnRlc3Rab25lKCBlICk7XHJcblxyXG4gICAgICAgIGlmKCAhbmFtZSApIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYoIG5hbWUgPT09ICdzY3JvbGwnICl7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmlzRG93biA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMubW91c2Vtb3ZlKCBlICk7XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiggbmFtZSA9PT0gJ3RpdGxlJyApe1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb2RlVGl0bGUoMilcclxuICAgICAgICAgICAgaWYoICF0aGlzLmxpc3RPbmx5ICl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhpZGVBY3RpdmUoKVxyXG4gICAgICAgICAgICAgICAgaWYoICF0aGlzLmlzT3BlbiApIHRoaXMub3BlbigpXHJcbiAgICAgICAgICAgICAgICBlbHNlIHRoaXMuY2xvc2UoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gaXMgaXRlbVxyXG4gICAgICAgICAgICBpZiggdGhpcy5jdXJyZW50ICl7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHRoaXMubGlzdFsgdGhpcy5jdXJyZW50LmlkIF1cclxuICAgICAgICAgICAgICAgIC8vdGhpcy50bXBJZCA9IHRoaXMuY3VycmVudC5pZFxyXG5cclxuICAgICAgICAgICAgICAgIGlmKCB0aGlzLmlzU2VsZWN0YWJsZSApIHRoaXMuc2VsZWN0ZWQoKVxyXG5cclxuICAgICAgICAgICAgICAgIC8vdGhpcy5zZW5kKCB0aGlzLnJlZk9iamVjdCAhPT0gbnVsbCA/IHRoaXMucmVmT2JqZWN0WyB0aGlzLmxpc3RbdGhpcy5jdXJyZW50LmlkXV0gOiB0aGlzLnZhbHVlICk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNlbmQoIHRoaXMudmFsdWUgKVxyXG5cclxuICAgICAgICAgICAgICAgIGlmKCAhdGhpcy5saXN0T25seSApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsb3NlKClcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFRvcEl0ZW0oKVxyXG4gICAgICAgICAgICAgICAgICAgIC8vdGhpcy5oaWRlQWN0aXZlKClcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZW1vdmUgKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgbnVwID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IG5hbWUgPSB0aGlzLnRlc3Rab25lKCBlICk7XHJcblxyXG4gICAgICAgIGlmKCAhbmFtZSApIHJldHVybiBudXA7XHJcblxyXG4gICAgICAgIGlmKCBuYW1lID09PSAndGl0bGUnICl7XHJcbiAgICAgICAgICAgIHRoaXMudW5TZWxlY3RlZCgpO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGVUaXRsZSgxKTtcclxuICAgICAgICAgICAgdGhpcy5jdXJzb3IoJ3BvaW50ZXInKTtcclxuXHJcbiAgICAgICAgfSBlbHNlIGlmKCBuYW1lID09PSAnc2Nyb2xsJyApe1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jdXJzb3IoJ3MtcmVzaXplJyk7XHJcbiAgICAgICAgICAgIHRoaXMubW9kZVNjcm9sbCgxKTtcclxuICAgICAgICAgICAgaWYoIHRoaXMuaXNEb3duICl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vZGVTY3JvbGwoMik7XHJcbiAgICAgICAgICAgICAgICAvL3RoaXMudXBkYXRlKCAoIGUuY2xpZW50WSAtIHRvcCAgKSAtICggdGhpcy5zaCowLjUgKSApO1xyXG4gICAgICAgICAgICAgICAgbGV0IHRvcCA9IHRoaXMuem9uZS55K3RoaXMuYmFzZUgtMjtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlKCAoIGUuY2xpZW50WSAtIHRvcCAgKSAtICggdGhpcy5zaCowLjUgKSApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vaWYodGhpcy5pc0Rvd24pIHRoaXMubGlzdG1vdmUoZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgIC8vIGlzIGl0ZW1cclxuICAgICAgICAgICAgdGhpcy5tb2RlVGl0bGUoMCk7XHJcbiAgICAgICAgICAgIHRoaXMubW9kZVNjcm9sbCgwKTtcclxuICAgICAgICAgICAgdGhpcy5jdXJzb3IoJ3BvaW50ZXInKTtcclxuICAgICAgICBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCBuYW1lICE9PSB0aGlzLnByZXZOYW1lICkgbnVwID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLnByZXZOYW1lID0gbmFtZTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG51cDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgd2hlZWwgKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoIGUgKTtcclxuICAgICAgICBpZiggbmFtZSA9PT0gJ3RpdGxlJyApIHJldHVybiBmYWxzZTsgXHJcbiAgICAgICAgdGhpcy5weSArPSBlLmRlbHRhKjEwO1xyXG4gICAgICAgIHRoaXMudXBkYXRlKHRoaXMucHkpO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICByZXNldCAoKSB7XHJcblxyXG4gICAgICAgIHRoaXMucHJldk5hbWUgPSAnJztcclxuICAgICAgICB0aGlzLnVuU2VsZWN0ZWQoKTtcclxuICAgICAgICB0aGlzLm1vZGVUaXRsZSgwKTtcclxuICAgICAgICB0aGlzLm1vZGVTY3JvbGwoMCk7XHJcblxyXG4gICAgICAgIC8vY29uc29sZS5sb2coJ3RoaXMgaXMgcmVzZXQnKVxyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIG1vZGVTY3JvbGwgKCBtb2RlICkge1xyXG5cclxuICAgICAgICBpZiggbW9kZSA9PT0gdGhpcy5zTW9kZSApIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IHMgPSB0aGlzLnNjcm9sbGVyLnN0eWxlO1xyXG4gICAgICAgIGxldCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG4gICAgICAgIHN3aXRjaChtb2RlKXtcclxuICAgICAgICAgICAgY2FzZSAwOiAvLyBiYXNlXHJcbiAgICAgICAgICAgICAgICBzLmJhY2tncm91bmQgPSBjYy50ZXh0O1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOiAvLyBvdmVyXHJcbiAgICAgICAgICAgICAgICBzLmJhY2tncm91bmQgPSBjYy5zZWxlY3Q7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6IC8vIGVkaXQgLyBkb3duXHJcbiAgICAgICAgICAgICAgICBzLmJhY2tncm91bmQgPSBjYy5zZWxlY3Q7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc01vZGUgPSBtb2RlO1xyXG4gICAgfVxyXG5cclxuICAgIG1vZGVUaXRsZSAoIG1vZGUgKSB7XHJcblxyXG4gICAgICAgIGlmKCBtb2RlID09PSB0aGlzLnRNb2RlICkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgcyA9IHRoaXMucztcclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICBzd2l0Y2gobW9kZSl7XHJcbiAgICAgICAgICAgIGNhc2UgMDogLy8gYmFzZVxyXG4gICAgICAgICAgICAgICAgc1szXS5jb2xvciA9IGNjLnRleHQ7XHJcbiAgICAgICAgICAgICAgICBzWzNdLmJhY2tncm91bmQgPSBjYy5idXR0b247XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDE6IC8vIG92ZXJcclxuICAgICAgICAgICAgICAgIHNbM10uY29sb3IgPSBjYy50ZXh0T3ZlcjtcclxuICAgICAgICAgICAgICAgIHNbM10uYmFja2dyb3VuZCA9IGNjLm92ZXJvZmY7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6IC8vIGVkaXQgLyBkb3duXHJcbiAgICAgICAgICAgICAgICBzWzNdLmNvbG9yID0gY2MudGV4dFNlbGVjdDtcclxuICAgICAgICAgICAgICAgIHNbM10uYmFja2dyb3VuZCA9IGNjLm92ZXJvZmY7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudE1vZGUgPSBtb2RlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjbGVhckxpc3QgKCkge1xyXG5cclxuICAgICAgICB3aGlsZSAoIHRoaXMubGlzdEluLmNoaWxkcmVuLmxlbmd0aCApIHRoaXMubGlzdEluLnJlbW92ZUNoaWxkKCB0aGlzLmxpc3RJbi5sYXN0Q2hpbGQgKTtcclxuICAgICAgICB0aGlzLml0ZW1zID0gW107XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNldExpc3QgKCBsaXN0ICkge1xyXG5cclxuICAgICAgICB0aGlzLmNsZWFyTGlzdCgpO1xyXG5cclxuICAgICAgICB0aGlzLmxpc3QgPSBsaXN0O1xyXG4gICAgICAgIHRoaXMubGVuZ3RoID0gdGhpcy5saXN0Lmxlbmd0aDtcclxuXHJcbiAgICAgICAgbGV0IGxuZyA9IHRoaXMuaGlkZUN1cnJlbnQ/IHRoaXMubGVuZ3RoLTEgOiB0aGlzLmxlbmd0aFxyXG5cclxuICAgICAgICB0aGlzLm1heEl0ZW0gPSB0aGlzLmZ1bGwgPyBsbmcgOiA1O1xyXG4gICAgICAgIHRoaXMubWF4SXRlbSA9IGxuZyA8IHRoaXMubWF4SXRlbSA/IGxuZyA6IHRoaXMubWF4SXRlbTtcclxuXHJcbiAgICAgICAgdGhpcy5tYXhIZWlnaHQgPSB0aGlzLm1heEl0ZW0gKiAodGhpcy5pdGVtSGVpZ2h0KzEpICsgMjtcclxuICAgICAgICBcclxuXHJcblxyXG4gICAgICAgIHRoaXMubWF4ID0gbG5nICogKHRoaXMuaXRlbUhlaWdodCsxKSArIDI7XHJcbiAgICAgICAgdGhpcy5yYXRpbyA9IHRoaXMubWF4SGVpZ2h0IC8gdGhpcy5tYXg7XHJcbiAgICAgICAgdGhpcy5zaCA9IHRoaXMubWF4SGVpZ2h0ICogdGhpcy5yYXRpbztcclxuICAgICAgICB0aGlzLnJhbmdlID0gdGhpcy5tYXhIZWlnaHQgLSB0aGlzLnNoO1xyXG5cclxuICAgICAgICB0aGlzLmNbMl0uc3R5bGUuaGVpZ2h0ID0gdGhpcy5tYXhIZWlnaHQgKyAncHgnO1xyXG4gICAgICAgIHRoaXMuc2Nyb2xsZXJCYWNrLnN0eWxlLmhlaWdodCA9IHRoaXMubWF4SGVpZ2h0ICsgJ3B4JztcclxuICAgICAgICB0aGlzLnNjcm9sbGVyLnN0eWxlLmhlaWdodCA9IHRoaXMuc2ggKyAncHgnO1xyXG5cclxuICAgICAgICBpZiggdGhpcy5tYXggPiB0aGlzLm1heEhlaWdodCApeyBcclxuICAgICAgICAgICAgdGhpcy53dyA9IHRoaXMuc2IgLSB0aGlzLnNzO1xyXG4gICAgICAgICAgICB0aGlzLnNjcm9sbCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggdGhpcy5taW5pQ2FudmFzICkge1xyXG5cclxuICAgICAgICAgICAgdGhpcy50bXBDYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKVxyXG4gICAgICAgICAgICB0aGlzLnRtcENhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VTaXplWzBdXHJcbiAgICAgICAgICAgIHRoaXMudG1wQ2FudmFzLmhlaWdodCA9IHRoaXMuaW1hZ2VTaXplWzFdXHJcbiAgICAgICAgICAgIHRoaXMudG1wQ3R4ID0gdGhpcy50bXBDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpXHJcbiAgICAgICAgICAgIHRoaXMudG1wQ3R4LmZpbGxTdHlsZSA9IHRoaXMuY2FudmFzQmdcclxuICAgICAgICAgICAgdGhpcy50bXBDdHguZmlsbFJlY3QoMCwgMCwgdGhpcy5pbWFnZVNpemVbMF0sIHRoaXMuaW1hZ2VTaXplWzFdKVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBpdGVtLCBuOy8vLCBsID0gdGhpcy5zYjtcclxuICAgICAgICBmb3IoIGxldCBpPTA7IGk8dGhpcy5sZW5ndGg7IGkrKyApe1xyXG5cclxuICAgICAgICAgICAgbiA9IHRoaXMubGlzdFtpXTtcclxuICAgICAgICAgICAgaXRlbSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MuaXRlbSArICdwYWRkaW5nOjBweCAnKyh0aGlzLm0rMSkrJ3B4OyB3aWR0aDonK3RoaXMud3crJ3B4OyBoZWlnaHQ6Jyt0aGlzLml0ZW1IZWlnaHQrJ3B4OyBsaW5lLWhlaWdodDonKyh0aGlzLml0ZW1IZWlnaHQtMikrJ3B4OyBjb2xvcjonK3RoaXMuY29sb3JzLnRleHQrJzsgYmFja2dyb3VuZDonK3RoaXMuY29sb3JzLmJhY2srJzsnICk7XHJcbiAgICAgICAgICAgIGl0ZW0ubmFtZSA9ICdpdGVtJysgaVxyXG4gICAgICAgICAgICBpdGVtLmlkID0gaTtcclxuICAgICAgICAgICAgaXRlbS5zZWxlY3QgPSBmYWxzZVxyXG4gICAgICAgICAgICBpdGVtLnBvc3kgPSAodGhpcy5pdGVtSGVpZ2h0KzEpKmk7XHJcbiAgICAgICAgICAgIHRoaXMubGlzdEluLmFwcGVuZENoaWxkKCBpdGVtICk7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMucHVzaCggaXRlbSApO1xyXG5cclxuICAgICAgICAgICAgaWYoIG4gPT09IHRoaXMudmFsdWUgKSB0aGlzLmN1cnJlbnQgPSBpdGVtXHJcblxyXG4gICAgICAgICAgICAvL2lmKCB0aGlzLmlzV2l0aEltYWdlICkgaXRlbS5hcHBlbmRDaGlsZCggdGhpcy50bXBJbWFnZVtuXSApO1xyXG4gICAgICAgICAgICBpZiggIXRoaXMuaXNXaXRoSW1hZ2UgKSBpdGVtLnRleHRDb250ZW50ID0gbjtcclxuXHJcbiAgICAgICAgICAgIGlmKCB0aGlzLm1pbmlDYW52YXMgKXtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgYyA9IG5ldyBJbWFnZSgpXHJcbiAgICAgICAgICAgICAgICBjLnNyYyA9IHRoaXMudG1wQ2FudmFzLnRvRGF0YVVSTCgpXHJcblxyXG4gICAgICAgICAgICAgICAgLy9pdGVtLnN0eWxlLm1hcmdpbkxlZnQgPSAodGhpcy5pbWFnZVNpemVbMF0rOCkrJ3B4J1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAvKmxldCBjID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcclxuXHJcbiAgICAgICAgICAgICAgICBjLndpZHRoID0gdGhpcy5pbWFnZVNpemVbMF1cclxuICAgICAgICAgICAgICAgIGMuaGVpZ2h0ID0gdGhpcy5pbWFnZVNpemVbMV1cclxuICAgICAgICAgICAgICAgIGxldCBjdHggPSBjLmdldENvbnRleHQoXCIyZFwiKVxyXG4gICAgICAgICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHRoaXMuY2FudmFzQmdcclxuICAgICAgICAgICAgICAgIGN0eC5maWxsUmVjdCgwLCAwLCB0aGlzLmltYWdlU2l6ZVswXSwgdGhpcy5pbWFnZVNpemVbMV0pKi9cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy9jLnN0eWxlLmNzc1RleHQgPSAncG9zaXRpb246cmVsYXRpdmU7IHBvaW50ZXItZXZlbnRzOm5vbmU7IGRpc3BsYXk6aW5saW5lLWJsb2NrOyBmbG9hdDpsZWZ0OyBtYXJnaW4tbGVmdDowcHg7IG1hcmdpbi1yaWdodDo1cHg7IHRvcDoycHgnXHJcbiAgICAgICAgICAgICAgIC8vIGMuc3R5bGUuY3NzVGV4dCA9JyBmbGV4LXNocmluazogMDsnXHJcblxyXG4gICAgICAgICAgICAgICAgYy5zdHlsZS5jc3NUZXh0ID0nbWFyZ2luLXJpZ2h0OjRweDsnXHJcblxyXG5cclxuICAgICAgICAgICAgICAgIC8vYy5zdHlsZS5jc3NUZXh0ID0gJ2Rpc3BsYXk6ZmxleDsgYWxpZ24tY29udGVudDogZmxleC1zdGFydDsgZmxleC13cmFwOiB3cmFwOydcclxuICAgICAgICAgICAgICAgIC8vaXRlbS5zdHlsZS5mbG9hdCA9ICdyaWdodCdcclxuICAgICAgICAgICAgICAgIGl0ZW0uYXBwZW5kQ2hpbGQoIGMgKVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMudG1wSW1hZ2Vbbl0gPSBjXHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiggdGhpcy5kcmFnb3V0ICl7XHJcblxyXG4gICAgICAgICAgICAgICAgaXRlbS5pbWcgPSB0aGlzLnRtcEltYWdlW25dXHJcblxyXG4gICAgICAgICAgICAgICAgaXRlbS5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ2F1dG8nO1xyXG4gICAgICAgICAgICAgICAgaXRlbS5kcmFnZ2FibGUgPSBcInRydWVcIlxyXG5cclxuICAgICAgICAgICAgICAgIGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcignZHJhZ3N0YXJ0JywgdGhpcy5kcmFnc3RhcnQgfHwgZnVuY3Rpb24oKXsgLypjb25zb2xlLmxvZygnZHJhZyBzdGFydCcpKi99KVxyXG4gICAgICAgICAgICAgICAgaXRlbS5hZGRFdmVudExpc3RlbmVyKCdkcmFnJywgdGhpcy5kcmFnIHx8IGZ1bmN0aW9uKCl7IC8qY29uc29sZS5sb2coJ2RyYWcgc3RhcnQnKSovfSlcclxuICAgICAgICAgICAgICAgIC8vaXRlbS5hZGRFdmVudExpc3RlbmVyKCdkcmFnb3ZlcicsIHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgLy9pdGVtLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdlbnRlcicsIHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgaXRlbS5hZGRFdmVudExpc3RlbmVyKCdkcmFnbGVhdmUnLCBmdW5jdGlvbigpeyBSb290cy5mYWtlVXAoKTsgfSApO1xyXG4gICAgICAgICAgICAgICAgaXRlbS5hZGRFdmVudExpc3RlbmVyKCdkcmFnZW5kJywgdGhpcy5kcmFnZW5kIHx8IGZ1bmN0aW9uKCl7IC8qY29uc29sZS5sb2coJ2RyYWcgZW5kJykqLyB9LmJpbmQodGhpcykgKVxyXG4gICAgICAgICAgICAgICAgLy9pdGVtLmFkZEV2ZW50TGlzdGVuZXIoJ2Ryb3AnLCBmdW5jdGlvbigpe2NvbnNvbGUubG9nKCdkcm9wJyl9KVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2V0VG9wSXRlbSgpO1xyXG4gICAgICAgIGlmKCB0aGlzLmlzU2VsZWN0YWJsZSApIHRoaXMuc2VsZWN0ZWQoKVxyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIGRyYXdJbWFnZSggbmFtZSwgaW1hZ2UsIHgseSx3LGggKXtcclxuXHJcbiAgICAgICAgdGhpcy50bXBDdHguY2xlYXJSZWN0KDAsIDAsIHRoaXMuaW1hZ2VTaXplWzBdLCB0aGlzLmltYWdlU2l6ZVsxXSk7XHJcbiAgICAgICAgdGhpcy50bXBDdHguZHJhd0ltYWdlKGltYWdlLCB4LCB5LCB3LCBoLCAwLCAwLCB0aGlzLmltYWdlU2l6ZVswXSwgdGhpcy5pbWFnZVNpemVbMV0pXHJcbiAgICAgICAgdGhpcy50bXBJbWFnZVtuYW1lXS5zcmMgPSB0aGlzLnRtcENhbnZhcy50b0RhdGFVUkwoKVxyXG5cclxuXHJcbiAgICAgICAgLypsZXQgYyA9IHRoaXMudG1wSW1hZ2VbbmFtZV1cclxuICAgICAgICBsZXQgY3R4ID0gYy5nZXRDb250ZXh0KFwiMmRcIilcclxuICAgICAgICBjdHguZHJhd0ltYWdlKGltYWdlLCB4LCB5LCB3LCBoLCAwLCAwLCB0aGlzLmltYWdlU2l6ZVswXSwgdGhpcy5pbWFnZVNpemVbMV0pKi9cclxuXHJcbiAgICB9XHJcblxyXG4gICAgYWRkSW1hZ2VzICgpe1xyXG4gICAgICAgIGxldCBsbmcgPSB0aGlzLmxpc3QubGVuZ3RoO1xyXG4gICAgICAgIGZvciggbGV0IGk9MDsgaTxsbmc7IGkrKyApe1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zW2ldLmFwcGVuZENoaWxkKCB0aGlzLnRtcEltYWdlW3RoaXMubGlzdFtpXV0gKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5zZXRUb3BJdGVtKCk7XHJcbiAgICB9XHJcblxyXG4gICAgc2V0VmFsdWUgKCB2YWx1ZSApIHtcclxuXHJcbiAgICAgICAgaWYoIWlzTmFOKHZhbHVlKSkgdGhpcy52YWx1ZSA9IHRoaXMubGlzdFsgdmFsdWUgXTtcclxuICAgICAgICBlbHNlIHRoaXMudmFsdWUgPSB2YWx1ZTtcclxuXHJcbiAgICAgICAgLy90aGlzLnRtcElkID0gdmFsdWVcclxuXHJcbiAgICAgICAgdGhpcy5zZXRUb3BJdGVtKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNldFRvcEl0ZW0gKCl7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLnN0YXRpY1RvcCApIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuaXNXaXRoSW1hZ2UgKXtcclxuXHJcbiAgICAgICAgICAgIGlmKCF0aGlzLnByZUxvYWRDb21wbGV0ZSApIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgIGlmKCF0aGlzLmNbM10uY2hpbGRyZW4ubGVuZ3RoKXtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VTaXplWzBdXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlU2l6ZVsxXVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jYW52YXMuc3R5bGUuY3NzVGV4dCA9J21hcmdpbi1yaWdodDo0cHg7J1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdHggPSB0aGlzLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNbM10uc3R5bGUudGV4dEFsaWduID0gJ2xlZnQnXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNbM10uc3R5bGUuanVzdGlmeUNvbnRlbnQgPSAnbGVmdCdcclxuICAgICAgICAgICAgICAgIHRoaXMuY1szXS5hcHBlbmRDaGlsZCggdGhpcy5jYW52YXMgKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IGltZyA9IHRoaXMudG1wSW1hZ2VbIHRoaXMudmFsdWUgXTtcclxuICAgICAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKCB0aGlzLnRtcEltYWdlWyB0aGlzLnZhbHVlIF0sIDAsIDAsIHRoaXMuaW1hZ2VTaXplWzJdLCB0aGlzLmltYWdlU2l6ZVszXSwgMCwwLCB0aGlzLmltYWdlU2l6ZVswXSwgdGhpcy5pbWFnZVNpemVbMV0gKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgdGhpcy5jWzNdLnRleHRDb250ZW50ID0gdGhpcy52YWx1ZTtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMubWluaUNhbnZhcyApe1xyXG5cclxuICAgICAgICAgICAgaWYoIXRoaXMuY1szXS5jaGlsZHJlbi5sZW5ndGgpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy5pbWFnZVNpemVbMF07XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlU2l6ZVsxXTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FudmFzLnN0eWxlLmNzc1RleHQgPSdtYXJnaW4tcmlnaHQ6NHB4OydcclxuICAgICAgICAgICAgICAgIHRoaXMuY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNbM10uc3R5bGUudGV4dEFsaWduID0gJ2xlZnQnXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNbM10uc3R5bGUuanVzdGlmeUNvbnRlbnQgPSAnbGVmdCdcclxuICAgICAgICAgICAgICAgIHRoaXMuY1szXS5hcHBlbmRDaGlsZCggdGhpcy5jYW52YXMgKVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmN0eC5kcmF3SW1hZ2UoIHRoaXMudG1wSW1hZ2VbIHRoaXMudmFsdWUgXSwgMCwgMCApO1xyXG5cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgLy8gLS0tLS0gTElTVFxyXG5cclxuICAgIHVwZGF0ZSAoIHkgKSB7XHJcblxyXG4gICAgICAgIGlmKCAhdGhpcy5zY3JvbGwgKSByZXR1cm47XHJcblxyXG4gICAgICAgIHkgPSB5IDwgMCA/IDAgOiB5O1xyXG4gICAgICAgIHkgPSB5ID4gdGhpcy5yYW5nZSA/IHRoaXMucmFuZ2UgOiB5O1xyXG5cclxuICAgICAgICB0aGlzLnRvcExpc3QgPSAtTWF0aC5mbG9vciggeSAvIHRoaXMucmF0aW8gKTtcclxuXHJcbiAgICAgICAgdGhpcy5saXN0SW4uc3R5bGUudG9wID0gdGhpcy50b3BMaXN0KydweCc7XHJcbiAgICAgICAgdGhpcy5zY3JvbGxlci5zdHlsZS50b3AgPSBNYXRoLmZsb29yKCB5ICkgICsgJ3B4JztcclxuXHJcbiAgICAgICAgdGhpcy5weSA9IHk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHBhcmVudEhlaWdodCAoIHQgKSB7XHJcblxyXG4gICAgICAgIGlmICggdGhpcy5ncm91cCAhPT0gbnVsbCApIHRoaXMuZ3JvdXAuY2FsYyggdCApO1xyXG4gICAgICAgIGVsc2UgaWYgKCB0aGlzLmlzVUkgKSB0aGlzLm1haW4uY2FsYyggdCApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBvcGVuICggZmlyc3QgKSB7XHJcblxyXG4gICAgICAgIHN1cGVyLm9wZW4oKTtcclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGUoIDAgKVxyXG5cclxuICAgICAgICB0aGlzLmggPSB0aGlzLm1heEhlaWdodCArIHRoaXMuYmFzZUggKyA1O1xyXG4gICAgICAgIGlmKCAhdGhpcy5zY3JvbGwgKXtcclxuICAgICAgICAgICAgdGhpcy50b3BMaXN0ID0gMDtcclxuICAgICAgICAgICAgdGhpcy5oID0gdGhpcy5iYXNlSCArIDUgKyB0aGlzLm1heDtcclxuICAgICAgICAgICAgdGhpcy5zY3JvbGxlci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgICAgICB0aGlzLnNjcm9sbGVyQmFjay5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsZXIuc3R5bGUuZGlzcGxheSA9ICdibG9jayc7XHJcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsZXJCYWNrLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnNbMF0uaGVpZ2h0ID0gdGhpcy5oICsgJ3B4JztcclxuICAgICAgICB0aGlzLnNbMl0uZGlzcGxheSA9ICdibG9jayc7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLnVwICl7IFxyXG4gICAgICAgICAgICB0aGlzLnpvbmUueSAtPSB0aGlzLmggLSAodGhpcy5iYXNlSC0xMCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbNF0sICdkJywgdGhpcy5zdmdzLmcxICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1s0XSwgJ2QnLCB0aGlzLnN2Z3MuZzIgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuclNpemVDb250ZW50KCk7XHJcblxyXG4gICAgICAgIGxldCB0ID0gdGhpcy5oIC0gdGhpcy5iYXNlSDtcclxuXHJcbiAgICAgICAgdGhpcy56b25lLmggPSB0aGlzLmg7XHJcblxyXG4gICAgICAgIGlmKCFmaXJzdCkgdGhpcy5wYXJlbnRIZWlnaHQoIHQgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2xvc2UgKCkge1xyXG5cclxuICAgICAgICBzdXBlci5jbG9zZSgpO1xyXG5cclxuICAgICAgICBpZiggdGhpcy51cCApIHRoaXMuem9uZS55ICs9IHRoaXMuaCAtICh0aGlzLmJhc2VILTEwKTtcclxuXHJcbiAgICAgICAgbGV0IHQgPSB0aGlzLmggLSB0aGlzLmJhc2VIO1xyXG5cclxuICAgICAgICB0aGlzLmggPSB0aGlzLmJhc2VIO1xyXG4gICAgICAgIHRoaXMuc1swXS5oZWlnaHQgPSB0aGlzLmggKyAncHgnO1xyXG4gICAgICAgIHRoaXMuc1syXS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbNF0sICdkJywgdGhpcy5zdmdzLmcxICk7XHJcblxyXG4gICAgICAgIHRoaXMuem9uZS5oID0gdGhpcy5oO1xyXG5cclxuICAgICAgICB0aGlzLnBhcmVudEhlaWdodCggLXQgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS1cclxuXHJcbiAgICB0ZXh0ICggdHh0ICkge1xyXG5cclxuICAgICAgICB0aGlzLmNbM10udGV4dENvbnRlbnQgPSB0eHQ7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJTaXplQ29udGVudCAoKSB7XHJcblxyXG4gICAgICAgIGxldCBpID0gdGhpcy5sZW5ndGg7XHJcbiAgICAgICAgd2hpbGUoaS0tKSB0aGlzLmxpc3RJbi5jaGlsZHJlbltpXS5zdHlsZS53aWR0aCA9IHRoaXMud3cgKyAncHgnO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByU2l6ZSAoKSB7XHJcblxyXG4gICAgICAgIHN1cGVyLnJTaXplKClcclxuXHJcbiAgICAgICAgLy9Qcm90by5wcm90b3R5cGUuclNpemUuY2FsbCggdGhpcyApO1xyXG5cclxuICAgICAgICBsZXQgcyA9IHRoaXMucztcclxuICAgICAgICBsZXQgdyA9IHRoaXMuc2I7XHJcbiAgICAgICAgbGV0IGQgPSB0aGlzLnNhO1xyXG5cclxuICAgICAgICBpZihzWzJdPT09IHVuZGVmaW5lZCkgcmV0dXJuO1xyXG5cclxuICAgICAgICBzWzJdLndpZHRoID0gdyArICdweCc7XHJcbiAgICAgICAgc1syXS5sZWZ0ID0gZCArJ3B4JztcclxuXHJcbiAgICAgICAgc1szXS53aWR0aCA9IHcgKyAncHgnO1xyXG4gICAgICAgIHNbM10ubGVmdCA9IGQgKyAncHgnO1xyXG5cclxuICAgICAgICBzWzRdLmxlZnQgPSBkICsgdyAtIDE1ICsgJ3B4JztcclxuXHJcbiAgICAgICAgdGhpcy53dyA9IHc7XHJcbiAgICAgICAgaWYoIHRoaXMubWF4ID4gdGhpcy5tYXhIZWlnaHQgKSB0aGlzLnd3ID0gdy10aGlzLnNzO1xyXG4gICAgICAgIGlmKHRoaXMuaXNPcGVuKSB0aGlzLnJTaXplQ29udGVudCgpO1xyXG5cclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5pbXBvcnQgeyBUb29scyB9IGZyb20gJy4uL2NvcmUvVG9vbHMuanMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIE51bWVyaWMgZXh0ZW5kcyBQcm90byB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoIG8gPSB7fSApIHtcclxuXHJcbiAgICAgICAgc3VwZXIoIG8gKVxyXG5cclxuICAgICAgICB0aGlzLnNldFR5cGVOdW1iZXIoIG8gKVxyXG5cclxuICAgICAgICB0aGlzLmFsbHdheSA9IG8uYWxsd2F5IHx8IGZhbHNlXHJcblxyXG4gICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2VcclxuICAgICAgICB0aGlzLnZhbHVlID0gWzBdXHJcbiAgICAgICAgdGhpcy5tdWx0eSA9IDFcclxuICAgICAgICB0aGlzLmludm11bHR5ID0gMVxyXG4gICAgICAgIHRoaXMuaXNTaW5nbGUgPSB0cnVlXHJcbiAgICAgICAgdGhpcy5pc0FuZ2xlID0gZmFsc2VcclxuICAgICAgICB0aGlzLmlzVmVjdG9yID0gZmFsc2VcclxuXHJcbiAgICAgICAgaWYoIG8uaXNBbmdsZSApe1xyXG4gICAgICAgICAgICB0aGlzLmlzQW5nbGUgPSB0cnVlXHJcbiAgICAgICAgICAgIHRoaXMubXVsdHkgPSBUb29scy50b3JhZFxyXG4gICAgICAgICAgICB0aGlzLmludm11bHR5ID0gVG9vbHMudG9kZWdcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuaXNEcmFnID0gby5kcmFnIHx8IGZhbHNlXHJcblxyXG4gICAgICAgIGlmKCBvLnZhbHVlICE9PSB1bmRlZmluZWQgKXtcclxuICAgICAgICAgICAgaWYoICFpc05hTihvLnZhbHVlKSApe1xyXG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZSA9IFtvLnZhbHVlXVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYoIG8udmFsdWUgaW5zdGFuY2VvZiBBcnJheSApeyBcclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgPSBvLnZhbHVlXHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzU2luZ2xlID0gZmFsc2VcclxuICAgICAgICAgICAgfSBlbHNlIGlmKCBvLnZhbHVlIGluc3RhbmNlb2YgT2JqZWN0ICl7IFxyXG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZSA9IFtdXHJcbiAgICAgICAgICAgICAgICBpZiggby52YWx1ZS54ICE9PSB1bmRlZmluZWQgKSB0aGlzLnZhbHVlWzBdID0gby52YWx1ZS54XHJcbiAgICAgICAgICAgICAgICBpZiggby52YWx1ZS55ICE9PSB1bmRlZmluZWQgKSB0aGlzLnZhbHVlWzFdID0gby52YWx1ZS55XHJcbiAgICAgICAgICAgICAgICBpZiggby52YWx1ZS56ICE9PSB1bmRlZmluZWQgKSB0aGlzLnZhbHVlWzJdID0gby52YWx1ZS56XHJcbiAgICAgICAgICAgICAgICBpZiggby52YWx1ZS53ICE9PSB1bmRlZmluZWQgKSB0aGlzLnZhbHVlWzNdID0gby52YWx1ZS53XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzU2luZ2xlID0gZmFsc2VcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNWZWN0b3IgPSB0cnVlXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubG5nID0gdGhpcy52YWx1ZS5sZW5ndGhcclxuICAgICAgICB0aGlzLnRtcCA9IFtdXHJcblxyXG4gICAgICAgIHRoaXMuY3VycmVudCA9IC0xXHJcbiAgICAgICAgdGhpcy5wcmV2ID0geyB4OjAsIHk6MCwgZDowLCB2OjAgfVxyXG5cclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICAvLyBiZ1xyXG4gICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MuYmFzaWMgKyAnIGJhY2tncm91bmQ6JyArIGNjLnNlbGVjdCArICc7IHRvcDo0cHg7IHdpZHRoOjBweDsgaGVpZ2h0OicgKyAodGhpcy5oLTgpICsgJ3B4OycgKVxyXG5cclxuICAgICAgICB0aGlzLmNNb2RlID0gW11cclxuICAgICAgICBcclxuICAgICAgICBsZXQgaSA9IHRoaXMubG5nXHJcbiAgICAgICAgd2hpbGUoaS0tKXtcclxuXHJcbiAgICAgICAgICAgIGlmKCB0aGlzLmlzQW5nbGUgKSB0aGlzLnZhbHVlW2ldID0gKHRoaXMudmFsdWVbaV0gKiAxODAgLyBNYXRoLlBJKS50b0ZpeGVkKCB0aGlzLnByZWNpc2lvbiApXHJcbiAgICAgICAgICAgIHRoaXMuY1szK2ldID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHRzZWxlY3QgKyAndG9wOjFweDsgaGVpZ2h0OicrKHRoaXMuaC0yKSsncHg7IGNvbG9yOicgKyBjYy50ZXh0ICsgJzsgYmFja2dyb3VuZDonICsgY2MuYmFjayArICc7IGJvcmRlckNvbG9yOicgKyBjYy5ib3JkZXIrJzsgYm9yZGVyLXJhZGl1czonK3RoaXMucmFkaXVzKydweDsnKVxyXG4gICAgICAgICAgICBpZihvLmNlbnRlcikgdGhpcy5jWzIraV0uc3R5bGUudGV4dEFsaWduID0gJ2NlbnRlcidcclxuICAgICAgICAgICAgdGhpcy5jWzMraV0udGV4dENvbnRlbnQgPSB0aGlzLnZhbHVlW2ldXHJcbiAgICAgICAgICAgIHRoaXMuY1szK2ldLnN0eWxlLmNvbG9yID0gdGhpcy5jb2xvcnMudGV4dFxyXG4gICAgICAgICAgICB0aGlzLmNbMytpXS5pc051bSA9IHRydWVcclxuICAgICAgICAgICAgdGhpcy5jTW9kZVtpXSA9IDBcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBzZWxlY3Rpb25cclxuICAgICAgICB0aGlzLnNlbGVjdElkID0gMyArIHRoaXMubG5nO1xyXG4gICAgICAgIHRoaXMuY1t0aGlzLnNlbGVjdElkXSA9IHRoaXMuZG9tKCAgJ2RpdicsIHRoaXMuY3NzLnR4dHNlbGVjdCArICdwb3NpdGlvbjphYnNvbHV0ZTsgdG9wOjJweDsgaGVpZ2h0OicgKyAodGhpcy5oLTQpICsgJ3B4OyBwYWRkaW5nOjBweCAwcHg7IHdpZHRoOjBweDsgY29sb3I6JyArIGNjLnRleHRTZWxlY3QgKyAnOyBiYWNrZ3JvdW5kOicgKyBjYy5zZWxlY3QgKyAnOyBib3JkZXI6bm9uZTsgYm9yZGVyLXJhZGl1czowcHg7Jyk7XHJcblxyXG4gICAgICAgIC8vIGN1cnNvclxyXG4gICAgICAgIHRoaXMuY3Vyc29ySWQgPSA0ICsgdGhpcy5sbmc7XHJcbiAgICAgICAgdGhpcy5jWyB0aGlzLmN1cnNvcklkIF0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLmJhc2ljICsgJ3RvcDoycHg7IGhlaWdodDonICsgKHRoaXMuaC00KSArICdweDsgd2lkdGg6MHB4OyBiYWNrZ3JvdW5kOicrY2MudGV4dCsnOycgKTtcclxuXHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcbiAgICB9XHJcblxyXG4gICAgdGVzdFpvbmUgKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgbCA9IHRoaXMubG9jYWxcclxuICAgICAgICBpZiggbC54ID09PSAtMSAmJiBsLnkgPT09IC0xICkgcmV0dXJuICcnXHJcblxyXG4gICAgICAgIGxldCBpID0gdGhpcy5sbmdcclxuICAgICAgICBsZXQgdCA9IHRoaXMudG1wXHJcblxyXG4gICAgICAgIHdoaWxlKCBpLS0gKXtcclxuICAgICAgICAgICAgaWYoIGwueD50W2ldWzBdICYmIGwueDx0W2ldWzJdICkgcmV0dXJuIGlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAnJ1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIEVWRU5UU1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIG1vdXNlZG93biAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZSggZSApXHJcblxyXG4gICAgICAgIGlmKCAhdGhpcy5pc0Rvd24gKXtcclxuICAgICAgICAgICAgdGhpcy5pc0Rvd24gPSB0cnVlXHJcbiAgICAgICAgICAgIGlmKCBuYW1lICE9PSAnJyApeyBcclxuICAgICAgICAgICAgXHR0aGlzLmN1cnJlbnQgPSBuYW1lXHJcbiAgICAgICAgICAgIFx0dGhpcy5wcmV2ID0geyB4OmUuY2xpZW50WCwgeTplLmNsaWVudFksIGQ6MCwgdjogdGhpcy5pc1NpbmdsZSA/IHBhcnNlRmxvYXQodGhpcy52YWx1ZSkgOiBwYXJzZUZsb2F0KCB0aGlzLnZhbHVlWyB0aGlzLmN1cnJlbnQgXSApIH1cclxuICAgICAgICAgICAgXHR0aGlzLnNldElucHV0KCB0aGlzLmNbIDMgKyB0aGlzLmN1cnJlbnQgXSApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW91c2Vtb3ZlKCBlIClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZXVwICggZSApIHtcclxuXHJcbiAgICBcdGlmKCB0aGlzLmlzRG93biApe1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZVxyXG4gICAgICAgICAgICB0aGlzLnByZXYgPSB7IHg6MCwgeTowLCBkOjAsIHY6MCB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3VzZW1vdmUoIGUgKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlbW92ZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBudXAgPSBmYWxzZVxyXG4gICAgICAgIGxldCB4ID0gMFxyXG5cclxuICAgICAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoIGUgKVxyXG5cclxuICAgICAgICBpZiggbmFtZSA9PT0gJycgKSB0aGlzLmN1cnNvcigpXHJcbiAgICAgICAgZWxzZXsgXHJcbiAgICAgICAgXHRpZighdGhpcy5pc0RyYWcpIHRoaXMuY3Vyc29yKCd0ZXh0Jyk7XHJcbiAgICAgICAgXHRlbHNlIHRoaXMuY3Vyc29yKCB0aGlzLmN1cnJlbnQgIT09IC0xID8gJ21vdmUnIDogJ3BvaW50ZXInICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuaXNEcmFnICl7XHJcblxyXG4gICAgICAgIFx0aWYoIHRoaXMuY3VycmVudCAhPT0gLTEgKXtcclxuXHJcbiAgICAgICAgICAgIFx0dGhpcy5wcmV2LmQgKz0gKCBlLmNsaWVudFggLSB0aGlzLnByZXYueCApIC0gKCBlLmNsaWVudFkgLSB0aGlzLnByZXYueSApXHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IG4gPSB0aGlzLnByZXYudiArICggdGhpcy5wcmV2LmQgKiB0aGlzLnN0ZXApXHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZVsgdGhpcy5jdXJyZW50IF0gPSB0aGlzLm51bVZhbHVlKG4pXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNbIDMgKyB0aGlzLmN1cnJlbnQgXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWVbdGhpcy5jdXJyZW50XVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMudmFsaWRhdGUoKVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucHJldi54ID0gZS5jbGllbnRYXHJcbiAgICAgICAgICAgICAgICB0aGlzLnByZXYueSA9IGUuY2xpZW50WVxyXG5cclxuICAgICAgICAgICAgICAgIG51cCA9IHRydWVcclxuICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgXHRpZiggdGhpcy5pc0Rvd24gKSB4ID0gZS5jbGllbnRYIC0gdGhpcy56b25lLnggLTNcclxuICAgICAgICBcdGlmKCB0aGlzLmN1cnJlbnQgIT09IC0xICkgeCAtPSB0aGlzLnRtcFt0aGlzLmN1cnJlbnRdWzBdXHJcbiAgICAgICAgXHRyZXR1cm4gdGhpcy51cElucHV0KCB4LCB0aGlzLmlzRG93biApXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51cFxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgcmVzZXQgKCkge1xyXG5cclxuICAgICAgICBsZXQgbnVwID0gZmFsc2VcclxuICAgICAgICByZXR1cm4gbnVwXHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBzZXRWYWx1ZSAoIHYgKSB7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmlzVmVjdG9yICl7XHJcbiAgICAgICAgICAgIGlmKCB2LnggIT09IHVuZGVmaW5lZCApIHRoaXMudmFsdWVbMF0gPSB2LnhcclxuICAgICAgICAgICAgaWYoIHYueSAhPT0gdW5kZWZpbmVkICkgdGhpcy52YWx1ZVsxXSA9IHYueVxyXG4gICAgICAgICAgICBpZiggdi56ICE9PSB1bmRlZmluZWQgKSB0aGlzLnZhbHVlWzJdID0gdi56XHJcbiAgICAgICAgICAgIGlmKCB2LncgIT09IHVuZGVmaW5lZCApIHRoaXMudmFsdWVbM10gPSB2LndcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdGhpcy5pc1NpbmdsZSA/IFt2XSA6IHYgIFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGUoKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBzYW1lU3RyICggc3RyICl7XHJcblxyXG4gICAgICAgIGxldCBpID0gdGhpcy52YWx1ZS5sZW5ndGhcclxuICAgICAgICB3aGlsZShpLS0pIHRoaXMuY1sgMyArIGkgXS50ZXh0Q29udGVudCA9IHN0clxyXG5cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGUgKCB1cCApIHtcclxuXHJcbiAgICAgICAgbGV0IGkgPSB0aGlzLnZhbHVlLmxlbmd0aFxyXG5cclxuICAgICAgICB3aGlsZShpLS0pe1xyXG4gICAgICAgICAgICAgdGhpcy52YWx1ZVtpXSA9IHRoaXMubnVtVmFsdWUoIHRoaXMudmFsdWVbaV0gKiB0aGlzLmludm11bHR5IClcclxuICAgICAgICAgICAgIHRoaXMuY1sgMyArIGkgXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWVbaV1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCB1cCApIHRoaXMuc2VuZCgpXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNlbmQgKCB2ICkge1xyXG5cclxuICAgICAgICB2ID0gdiB8fCB0aGlzLnZhbHVlXHJcblxyXG4gICAgICAgIHRoaXMuaXNTZW5kID0gdHJ1ZVxyXG5cclxuICAgICAgICBpZiggdGhpcy5vYmplY3RMaW5rICE9PSBudWxsICl7IFxyXG5cclxuICAgICAgICAgICAgaWYoIHRoaXMuaXNWZWN0b3IgKXtcclxuICAgICAgICAgICAgICAgIHRoaXMub2JqZWN0TGlua1sgdGhpcy5vYmplY3RLZXkgXS5mcm9tQXJyYXkoIHYgKVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vYmplY3RMaW5rWyB0aGlzLm9iamVjdEtleSBdID0gdlxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoIHRoaXMuY2FsbGJhY2sgKSB0aGlzLmNhbGxiYWNrKCB2LCB0aGlzLm9iamVjdEtleSApXHJcbiAgICAgICAgdGhpcy5pc1NlbmQgPSBmYWxzZVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBJTlBVVFxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIHNlbGVjdCAoIGMsIGUsIHcsIHQgKSB7XHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zXHJcbiAgICAgICAgbGV0IGQgPSB0aGlzLmN1cnJlbnQgIT09IC0xID8gdGhpcy50bXBbdGhpcy5jdXJyZW50XVswXSArIDUgOiAwXHJcbiAgICAgICAgc1t0aGlzLmN1cnNvcklkXS53aWR0aCA9ICcxcHgnXHJcbiAgICAgICAgc1t0aGlzLmN1cnNvcklkXS5sZWZ0ID0gKCBkICsgYyApICsgJ3B4J1xyXG4gICAgICAgIHNbdGhpcy5zZWxlY3RJZF0ubGVmdCA9ICAoIGQgKyBlICkgICsgJ3B4J1xyXG4gICAgICAgIHNbdGhpcy5zZWxlY3RJZF0ud2lkdGggPSAgdyAgKyAncHgnXHJcbiAgICAgICAgdGhpcy5jW3RoaXMuc2VsZWN0SWRdLmlubmVySFRNTCA9IHRcclxuICAgIFxyXG4gICAgfVxyXG5cclxuICAgIHVuc2VsZWN0ICgpIHtcclxuXHJcbiAgICAgICAgbGV0IHMgPSB0aGlzLnNcclxuICAgICAgICBpZighcykgcmV0dXJuXHJcbiAgICAgICAgdGhpcy5jW3RoaXMuc2VsZWN0SWRdLmlubmVySFRNTCA9ICcnXHJcbiAgICAgICAgc1t0aGlzLnNlbGVjdElkXS53aWR0aCA9IDAgKyAncHgnXHJcbiAgICAgICAgc1t0aGlzLmN1cnNvcklkXS53aWR0aCA9IDAgKyAncHgnXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHZhbGlkYXRlICggZm9yY2UgKSB7XHJcblxyXG4gICAgICAgIGxldCBhciA9IFtdXHJcbiAgICAgICAgbGV0IGkgPSB0aGlzLmxuZ1xyXG5cclxuICAgICAgICBpZiggdGhpcy5hbGx3YXkgKSBmb3JjZSA9IHRydWVcclxuXHJcbiAgICAgICAgd2hpbGUoaS0tKXtcclxuICAgICAgICBcdGlmKCFpc05hTiggdGhpcy5jWyAzICsgaSBdLnRleHRDb250ZW50ICkpeyBcclxuICAgICAgICAgICAgICAgIGxldCBueCA9IHRoaXMubnVtVmFsdWUoIHRoaXMuY1sgMyArIGkgXS50ZXh0Q29udGVudCApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jWyAzICsgaSBdLnRleHRDb250ZW50ID0gbnhcclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWVbaV0gPSBueFxyXG4gICAgICAgICAgICB9IGVsc2UgeyAvLyBub3QgbnVtYmVyXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNbIDMgKyBpIF0udGV4dENvbnRlbnQgPSB0aGlzLnZhbHVlW2ldXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgXHRhcltpXSA9IHRoaXMudmFsdWVbaV0gKiB0aGlzLm11bHR5XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggIWZvcmNlICkgcmV0dXJuXHJcbiAgICAgICAgdGhpcy5zZW5kKCB0aGlzLmlzU2luZ2xlID8gYXJbMF0gOiBhciApXHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgUkVaSVNFXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgclNpemUgKCkge1xyXG5cclxuICAgICAgICBzdXBlci5yU2l6ZSgpXHJcbiAgICAgICAgbGV0IHN4ID0gdGhpcy5jb2xvcnMuc3hcclxuICAgICAgICBsZXQgc3MgPSBzeCAqICh0aGlzLmxuZy0xKVxyXG4gICAgICAgIGxldCB3ID0gKHRoaXMuc2Itc3MpIC8gdGhpcy5sbmcvLygoIHRoaXMuc2IgKyBzeCApIC8gdGhpcy5sbmcgKS1zeFxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zXHJcbiAgICAgICAgbGV0IGkgPSB0aGlzLmxuZ1xyXG5cclxuICAgICAgICB3aGlsZShpLS0pe1xyXG4gICAgICAgICAgICAvL3RoaXMudG1wW2ldID0gWyBNYXRoLmZsb29yKCB0aGlzLnNhICsgKCB3ICogaSApKyggNSAqIGkgKSksIHcgXTtcclxuICAgICAgICAgICAgdGhpcy50bXBbaV0gPSBbICggdGhpcy5zYSArICggdyAqIGkgKSsoIHN4ICogaSApKSwgdyBdXHJcbiAgICAgICAgICAgIHRoaXMudG1wW2ldWzJdID0gdGhpcy50bXBbaV1bMF0gKyB0aGlzLnRtcFtpXVsxXVxyXG4gICAgICAgICAgICBzWyAzICsgaSBdLmxlZnQgPSB0aGlzLnRtcFtpXVswXSArICdweCdcclxuICAgICAgICAgICAgc1sgMyArIGkgXS53aWR0aCA9IHRoaXMudG1wW2ldWzFdICsgJ3B4J1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdG8gfSBmcm9tIFwiLi4vY29yZS9Qcm90by5qc1wiO1xyXG5pbXBvcnQgeyBUb29scyB9IGZyb20gXCIuLi9jb3JlL1Rvb2xzLmpzXCI7XHJcblxyXG5mdW5jdGlvbiBlYXNlKHgsIG1pbiwgbWF4LCBwb3dlcikge1xyXG4gIGxldCBuID0gbWluICsgTWF0aC5wb3coKHggLSBtaW4pIC8gKG1heCAtIG1pbiksIHBvd2VyKSAqIChtYXggLSBtaW4pO1xyXG4gIHJldHVybiBuO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU2xpZGUgZXh0ZW5kcyBQcm90byB7XHJcbiAgY29uc3RydWN0b3IobyA9IHt9KSB7XHJcbiAgICBzdXBlcihvKTtcclxuXHJcbiAgICBpZiAoby5lYXNpbmcgPD0gMCkgdGhyb3cgXCJFYXNpbmcgbXVzdCBiZSA+IDBcIjtcclxuICAgIHRoaXMuZWFzaW5nID0gby5lYXNpbmcgfHwgMTtcclxuXHJcbiAgICB0aGlzLnNldFR5cGVOdW1iZXIobyk7XHJcblxyXG4gICAgdGhpcy5tb2RlbCA9IG8uc3R5cGUgfHwgMDtcclxuICAgIGlmIChvLm1vZGUgIT09IHVuZGVmaW5lZCkgdGhpcy5tb2RlbCA9IG8ubW9kZTtcclxuXHJcbiAgICAvL3RoaXMuZGVmYXVsdEJvcmRlckNvbG9yID0gdGhpcy5jb2xvcnMuaGlkZTtcclxuXHJcbiAgICB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG4gICAgdGhpcy5pc092ZXIgPSBmYWxzZTtcclxuICAgIHRoaXMuYWxsd2F5ID0gby5hbGx3YXkgfHwgZmFsc2U7XHJcblxyXG4gICAgdGhpcy5pc0RlZyA9IG8uaXNEZWcgfHwgZmFsc2U7XHJcbiAgICB0aGlzLmlzQ3ljbGljID0gby5jeWNsaWMgfHwgZmFsc2U7XHJcblxyXG4gICAgdGhpcy5maXJzdEltcHV0ID0gZmFsc2U7XHJcblxyXG4gICAgbGV0IGNjID0gdGhpcy5jb2xvcnM7XHJcblxyXG4gICAgLy90aGlzLmNbMl0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLnR4dHNlbGVjdCArICdsZXR0ZXItc3BhY2luZzotMXB4OyB0ZXh0LWFsaWduOnJpZ2h0OyB3aWR0aDo0N3B4OyBib3JkZXI6MXB4IGRhc2hlZCAnK3RoaXMuZGVmYXVsdEJvcmRlckNvbG9yKyc7IGNvbG9yOicrIHRoaXMuY29sb3JzLnRleHQgKTtcclxuICAgIC8vdGhpcy5jWzJdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHRzZWxlY3QgKyAndGV4dC1hbGlnbjpyaWdodDsgd2lkdGg6NDdweDsgYm9yZGVyOjFweCBkYXNoZWQgJyt0aGlzLmRlZmF1bHRCb3JkZXJDb2xvcisnOyBjb2xvcjonKyB0aGlzLmNvbG9ycy50ZXh0ICk7XHJcbiAgICB0aGlzLmNbMl0gPSB0aGlzLmRvbShcclxuICAgICAgXCJkaXZcIixcclxuICAgICAgdGhpcy5jc3MudHh0c2VsZWN0ICtcclxuICAgICAgICBcImJvcmRlcjpub25lOyBiYWNrZ3JvdW5kOm5vbmU7IHdpZHRoOjQ3cHg7IGNvbG9yOlwiICtcclxuICAgICAgICBjYy50ZXh0ICtcclxuICAgICAgICBcIjtcIlxyXG4gICAgKTtcclxuICAgIC8vdGhpcy5jWzJdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHRzZWxlY3QgKyAnbGV0dGVyLXNwYWNpbmc6LTFweDsgdGV4dC1hbGlnbjpyaWdodDsgd2lkdGg6NDdweDsgY29sb3I6JysgdGhpcy5jb2xvcnMudGV4dCApO1xyXG4gICAgdGhpcy5jWzNdID0gdGhpcy5kb20oXHJcbiAgICAgIFwiZGl2XCIsXHJcbiAgICAgIHRoaXMuY3NzLmJhc2ljICsgXCIgdG9wOjA7IGhlaWdodDpcIiArIHRoaXMuaCArIFwicHg7XCJcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5jWzRdID0gdGhpcy5kb20oXHJcbiAgICAgIFwiZGl2XCIsXHJcbiAgICAgIHRoaXMuY3NzLmJhc2ljICtcclxuICAgICAgICBcImJhY2tncm91bmQ6XCIgK1xyXG4gICAgICAgIGNjLmJhY2sgK1xyXG4gICAgICAgIFwiOyB0b3A6MnB4OyBoZWlnaHQ6XCIgK1xyXG4gICAgICAgICh0aGlzLmggLSA0KSArXHJcbiAgICAgICAgXCJweDtcIlxyXG4gICAgKTtcclxuICAgIHRoaXMuY1s1XSA9IHRoaXMuZG9tKFxyXG4gICAgICBcImRpdlwiLFxyXG4gICAgICB0aGlzLmNzcy5iYXNpYyArXHJcbiAgICAgICAgXCJsZWZ0OjRweDsgdG9wOjVweDsgaGVpZ2h0OlwiICtcclxuICAgICAgICAodGhpcy5oIC0gMTApICtcclxuICAgICAgICBcInB4OyBiYWNrZ3JvdW5kOlwiICtcclxuICAgICAgICBjYy50ZXh0ICtcclxuICAgICAgICBcIjtcIlxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmNbMl0uaXNOdW0gPSB0cnVlO1xyXG4gICAgLy90aGlzLmNbMl0uc3R5bGUuaGVpZ2h0ID0gKHRoaXMuaC00KSArICdweCc7XHJcbiAgICAvL3RoaXMuY1syXS5zdHlsZS5saW5lSGVpZ2h0ID0gKHRoaXMuaC04KSArICdweCc7XHJcbiAgICB0aGlzLmNbMl0uc3R5bGUuaGVpZ2h0ID0gdGhpcy5oIC0gMiArIFwicHhcIjtcclxuICAgIHRoaXMuY1syXS5zdHlsZS5saW5lSGVpZ2h0ID0gdGhpcy5oIC0gMTAgKyBcInB4XCI7XHJcblxyXG4gICAgaWYgKHRoaXMubW9kZWwgIT09IDApIHtcclxuICAgICAgbGV0IHIxID0gNCxcclxuICAgICAgICBoMSA9IDQsXHJcbiAgICAgICAgaDIgPSA4LFxyXG4gICAgICAgIHd3ID0gdGhpcy5oIC0gNixcclxuICAgICAgICByYSA9IDE2O1xyXG5cclxuICAgICAgaWYgKHRoaXMubW9kZWwgPT09IDIpIHtcclxuICAgICAgICByMSA9IDA7XHJcbiAgICAgICAgaDEgPSAyO1xyXG4gICAgICAgIGgyID0gNDtcclxuICAgICAgICByYSA9IDI7XHJcbiAgICAgICAgd3cgPSAodGhpcy5oIC0gNikgKiAwLjU7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmICh0aGlzLm1vZGVsID09PSAzKSB0aGlzLmNbNV0uc3R5bGUudmlzaWJsZSA9IFwibm9uZVwiO1xyXG5cclxuICAgICAgdGhpcy5jWzRdLnN0eWxlLmJvcmRlclJhZGl1cyA9IHIxICsgXCJweFwiO1xyXG4gICAgICB0aGlzLmNbNF0uc3R5bGUuaGVpZ2h0ID0gaDIgKyBcInB4XCI7XHJcbiAgICAgIHRoaXMuY1s0XS5zdHlsZS50b3AgPSB0aGlzLmggKiAwLjUgLSBoMSArIFwicHhcIjtcclxuICAgICAgdGhpcy5jWzVdLnN0eWxlLmJvcmRlclJhZGl1cyA9IHIxICogMC41ICsgXCJweFwiO1xyXG4gICAgICB0aGlzLmNbNV0uc3R5bGUuaGVpZ2h0ID0gaDEgKyBcInB4XCI7XHJcbiAgICAgIHRoaXMuY1s1XS5zdHlsZS50b3AgPSB0aGlzLmggKiAwLjUgLSBoMSAqIDAuNSArIFwicHhcIjtcclxuXHJcbiAgICAgIC8vdGhpcy5jWzZdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy5iYXNpYyArICdib3JkZXItcmFkaXVzOicrcmErJ3B4OyBtYXJnaW4tbGVmdDonKygtd3cqMC41KSsncHg7IGJvcmRlcjoxcHggc29saWQgJytjYy5ib3JkZXIrJzsgYmFja2dyb3VuZDonK2NjLmJ1dHRvbisnOyBsZWZ0OjRweDsgdG9wOjJweDsgaGVpZ2h0OicrKHRoaXMuaC00KSsncHg7IHdpZHRoOicrd3crJ3B4OycgKTtcclxuICAgICAgdGhpcy5jWzZdID0gdGhpcy5kb20oXHJcbiAgICAgICAgXCJkaXZcIixcclxuICAgICAgICB0aGlzLmNzcy5iYXNpYyArXHJcbiAgICAgICAgICBcImJvcmRlci1yYWRpdXM6XCIgK1xyXG4gICAgICAgICAgcmEgK1xyXG4gICAgICAgICAgXCJweDsgbWFyZ2luLWxlZnQ6XCIgK1xyXG4gICAgICAgICAgLXd3ICogMC41ICtcclxuICAgICAgICAgIFwicHg7IGJhY2tncm91bmQ6XCIgK1xyXG4gICAgICAgICAgY2MudGV4dCArXHJcbiAgICAgICAgICBcIjsgbGVmdDo0cHg7IHRvcDozcHg7IGhlaWdodDpcIiArXHJcbiAgICAgICAgICAodGhpcy5oIC0gNikgK1xyXG4gICAgICAgICAgXCJweDsgd2lkdGg6XCIgK1xyXG4gICAgICAgICAgd3cgK1xyXG4gICAgICAgICAgXCJweDtcIlxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuaW5pdCgpO1xyXG4gIH1cclxuXHJcbiAgdGVzdFpvbmUoZSkge1xyXG4gICAgbGV0IGwgPSB0aGlzLmxvY2FsO1xyXG4gICAgaWYgKGwueCA9PT0gLTEgJiYgbC55ID09PSAtMSkgcmV0dXJuIFwiXCI7XHJcblxyXG4gICAgaWYgKGwueCA+PSB0aGlzLnR4bCkgcmV0dXJuIFwidGV4dFwiO1xyXG4gICAgZWxzZSBpZiAobC54ID49IHRoaXMuc2EpIHJldHVybiBcInNjcm9sbFwiO1xyXG4gICAgZWxzZSByZXR1cm4gXCJcIjtcclxuICB9XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyAgIEVWRU5UU1xyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgbW91c2V1cChlKSB7XHJcbiAgICBpZiAodGhpcy5pc0Rvd24pIHRoaXMuaXNEb3duID0gZmFsc2U7XHJcbiAgfVxyXG5cclxuICBtb3VzZWRvd24oZSkge1xyXG4gICAgbGV0IG5hbWUgPSB0aGlzLnRlc3Rab25lKGUpO1xyXG5cclxuICAgIGlmICghbmFtZSkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgIGlmIChuYW1lID09PSBcInNjcm9sbFwiKSB7XHJcbiAgICAgIHRoaXMuaXNEb3duID0gdHJ1ZTtcclxuICAgICAgdGhpcy5vbGQgPSB0aGlzLnZhbHVlO1xyXG4gICAgICB0aGlzLm1vdXNlbW92ZShlKTtcclxuICAgIH1cclxuXHJcbiAgICAvKmlmKCBuYW1lID09PSAndGV4dCcgKXtcclxuICAgICAgICAgICAgdGhpcy5zZXRJbnB1dCggdGhpcy5jWzJdLCBmdW5jdGlvbigpeyB0aGlzLnZhbGlkYXRlKCkgfS5iaW5kKHRoaXMpICk7XHJcbiAgICAgICAgfSovXHJcblxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICBtb3VzZW1vdmUoZSkge1xyXG4gICAgbGV0IG51cCA9IGZhbHNlO1xyXG5cclxuICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZShlKTtcclxuXHJcbiAgICBpZiAobmFtZSA9PT0gXCJzY3JvbGxcIikge1xyXG4gICAgICB0aGlzLm1vZGUoMSk7XHJcbiAgICAgIHRoaXMuY3Vyc29yKFwidy1yZXNpemVcIik7XHJcbiAgICAgIC8vfSBlbHNlIGlmKG5hbWUgPT09ICd0ZXh0Jyl7XHJcbiAgICAgIC8vdGhpcy5jdXJzb3IoJ3BvaW50ZXInKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuY3Vyc29yKCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuaXNEb3duKSB7XHJcbiAgICAgIGxldCBuTm9ybWFsaXplZCA9IChlLmNsaWVudFggLSAodGhpcy56b25lLnggKyB0aGlzLnNhKSAtIDMpIC8gdGhpcy53dztcclxuXHJcbiAgICAgIC8vIGxvIG1hcGVvIGFsIHJhbmdvIDAgLi4uIDFcclxuICAgICAgbk5vcm1hbGl6ZWQgPSBNYXRoLm1pbigxLCBNYXRoLm1heCgwLCBuTm9ybWFsaXplZCkpO1xyXG5cclxuICAgICAgLy8gYXBsaWNvIGVhc2luZ1xyXG4gICAgICBsZXQgbkVhc2VkID0gTWF0aC5wb3cobk5vcm1hbGl6ZWQsIHRoaXMuZWFzaW5nKTsgLy8gZWFzaW5nXHJcblxyXG4gICAgICBsZXQgbk5ldyA9IG5FYXNlZCAqIHRoaXMucmFuZ2UgKyB0aGlzLm1pbjtcclxuICAgICAgbGV0IG5OZXdTbGlkZXIgPSBuTm9ybWFsaXplZCAqIHRoaXMucmFuZ2UgKyB0aGlzLm1pbjtcclxuXHJcbiAgICAgIHRoaXMuc2xpZGVyVmFsdWUgPSB0aGlzLm51bVZhbHVlKG5OZXdTbGlkZXIpO1xyXG5cclxuICAgICAgbGV0IGRlbHRhID0gbk5ldyAtIHRoaXMub2xkO1xyXG5cclxuICAgICAgbGV0IHN0ZXBzO1xyXG4gICAgICBpZiAoZGVsdGEgPj0gdGhpcy5zdGVwIHx8IGRlbHRhIDw9IHRoaXMuc3RlcCkge1xyXG4gICAgICAgIHN0ZXBzID0gTWF0aC5mbG9vcihkZWx0YSAvIHRoaXMuc3RlcCk7XHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IHRoaXMubnVtVmFsdWUodGhpcy5vbGQgKyBzdGVwcyAqIHRoaXMuc3RlcCk7XHJcbiAgICAgICAgLy8gdmFsdWUgd2l0aG91dCBlYXNpbmcgYXBwbGllZFxyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZSh0cnVlKTtcclxuICAgICAgICB0aGlzLm9sZCA9IHRoaXMudmFsdWU7XHJcbiAgICAgIH1cclxuICAgICAgLy9jb25zb2xlLmxvZyhcIm4sIG5vcm1hbGl6ZWQsIHZhbHVlXCIsIG5OZXcsIG5Ob3JtYWxpemVkLCB0aGlzLnZhbHVlKTtcclxuICAgICAgbnVwID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbnVwO1xyXG4gIH1cclxuXHJcbiAgd2hlZWwoZSkge1xyXG4gICAgbGV0IG5hbWUgPSB0aGlzLnRlc3Rab25lKGUpO1xyXG5cclxuICAgIGlmIChuYW1lID09PSBcInNjcm9sbFwiKSB7XHJcbiAgICAgIGxldCB2ID0gdGhpcy52YWx1ZSAtIHRoaXMuc3RlcCAqIGUuZGVsdGE7XHJcblxyXG4gICAgICBpZiAodiA+IHRoaXMubWF4KSB7XHJcbiAgICAgICAgdiA9IHRoaXMuaXNDeWNsaWMgPyB0aGlzLm1pbiA6IHRoaXMubWF4O1xyXG4gICAgICB9IGVsc2UgaWYgKHYgPCB0aGlzLm1pbikge1xyXG4gICAgICAgIHYgPSB0aGlzLmlzQ3ljbGljID8gdGhpcy5tYXggOiB0aGlzLm1pbjtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy5zZXRWYWx1ZSh2KTtcclxuICAgICAgdGhpcy5vbGQgPSB2O1xyXG4gICAgICB0aGlzLnVwZGF0ZSh0cnVlKTtcclxuXHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8va2V5ZG93bjogZnVuY3Rpb24gKCBlICkgeyByZXR1cm4gdHJ1ZTsgfSxcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICB2YWxpZGF0ZSgpIHtcclxuICAgIGxldCBuID0gdGhpcy5jWzJdLnRleHRDb250ZW50O1xyXG5cclxuICAgIGlmICghaXNOYU4obikpIHtcclxuICAgICAgdGhpcy52YWx1ZSA9IHRoaXMubnVtVmFsdWUobik7XHJcbiAgICAgIHRoaXMudXBkYXRlKHRydWUpO1xyXG4gICAgfSBlbHNlIHRoaXMuY1syXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWUgKyAodGhpcy5pc0RlZyA/IFwiwrBcIiA6IFwiXCIpO1xyXG4gIH1cclxuXHJcbiAgcmVzZXQoKSB7XHJcbiAgICAvL3RoaXMuY2xlYXJJbnB1dCgpO1xyXG4gICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcclxuICAgIHRoaXMubW9kZSgwKTtcclxuICB9XHJcblxyXG4gIG1vZGUobW9kZSkge1xyXG4gICAgbGV0IHMgPSB0aGlzLnM7XHJcbiAgICBsZXQgY2MgPSB0aGlzLmNvbG9ycztcclxuXHJcbiAgICBzd2l0Y2ggKG1vZGUpIHtcclxuICAgICAgY2FzZSAwOiAvLyBiYXNlXHJcbiAgICAgICAgLy8gc1syXS5ib3JkZXIgPSAnMXB4IHNvbGlkICcgKyB0aGlzLmNvbG9ycy5oaWRlO1xyXG4gICAgICAgIHNbMl0uY29sb3IgPSBjYy50ZXh0O1xyXG4gICAgICAgIHNbNF0uYmFja2dyb3VuZCA9IGNjLmJhY2s7XHJcbiAgICAgICAgc1s1XS5iYWNrZ3JvdW5kID0gY2MudGV4dDtcclxuICAgICAgICBpZiAodGhpcy5tb2RlbCAhPT0gMCkgc1s2XS5iYWNrZ3JvdW5kID0gY2MudGV4dDsgLy9jYy5idXR0b247XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgMTogLy8gc2Nyb2xsIG92ZXJcclxuICAgICAgICAvL3NbMl0uYm9yZGVyID0gJzFweCBkYXNoZWQgJyArIHRoaXMuY29sb3JzLmhpZGU7XHJcbiAgICAgICAgc1syXS5jb2xvciA9IGNjLnRleHRPdmVyO1xyXG4gICAgICAgIHNbNF0uYmFja2dyb3VuZCA9IGNjLmJhY2s7XHJcbiAgICAgICAgc1s1XS5iYWNrZ3JvdW5kID0gY2MudGV4dE92ZXI7XHJcbiAgICAgICAgaWYgKHRoaXMubW9kZWwgIT09IDApIHNbNl0uYmFja2dyb3VuZCA9IGNjLnRleHRPdmVyOyAvL2NjLm92ZXJvZmY7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB1cGRhdGUodXApIHtcclxuICAgIGxldCB3dyA9IE1hdGguZmxvb3IodGhpcy53dyAqICgodGhpcy5zbGlkZXJWYWx1ZSAtIHRoaXMubWluKSAvIHRoaXMucmFuZ2UpKTtcclxuICAgIC8vbGV0IHd3ID0gTWF0aC5mbG9vcih0aGlzLnd3ICogKCh0aGlzLnZhbHVlIC0gdGhpcy5taW4pIC8gdGhpcy5yYW5nZSkpO1xyXG5cclxuICAgIGlmICh0aGlzLm1vZGVsICE9PSAzKSB0aGlzLnNbNV0ud2lkdGggPSB3dyArIFwicHhcIjtcclxuICAgIGlmICh0aGlzLnNbNl0pIHRoaXMuc1s2XS5sZWZ0ID0gdGhpcy5zYSArIHd3ICsgMyArIFwicHhcIjtcclxuICAgIHRoaXMuY1syXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWUgKyAodGhpcy5pc0RlZyA/IFwiwrBcIiA6IFwiXCIpO1xyXG5cclxuICAgIGlmICh1cCkgdGhpcy5zZW5kKCk7XHJcbiAgfVxyXG5cclxuICByU2l6ZSgpIHtcclxuICAgIHN1cGVyLnJTaXplKCk7XHJcblxyXG4gICAgbGV0IHcgPSB0aGlzLnNiIC0gdGhpcy5zYztcclxuICAgIHRoaXMud3cgPSB3IC0gNjtcclxuXHJcbiAgICBsZXQgdHggPSB0aGlzLnNjO1xyXG4gICAgaWYgKHRoaXMuaXNVSSB8fCAhdGhpcy5zaW1wbGUpIHR4ID0gdGhpcy5zYyArIDEwO1xyXG4gICAgdGhpcy50eGwgPSB0aGlzLncgLSB0eCArIDI7XHJcblxyXG4gICAgLy9sZXQgdHkgPSBNYXRoLmZsb29yKHRoaXMuaCAqIDAuNSkgLSA4O1xyXG5cclxuICAgIGxldCBzID0gdGhpcy5zO1xyXG5cclxuICAgIHNbMl0ud2lkdGggPSB0aGlzLnNjIC0gNiArIFwicHhcIjtcclxuICAgIHNbMl0ubGVmdCA9IHRoaXMudHhsICsgNCArIFwicHhcIjtcclxuICAgIC8vc1syXS50b3AgPSB0eSArICdweCc7XHJcbiAgICBzWzNdLmxlZnQgPSB0aGlzLnNhICsgXCJweFwiO1xyXG4gICAgc1szXS53aWR0aCA9IHcgKyBcInB4XCI7XHJcbiAgICBzWzRdLmxlZnQgPSB0aGlzLnNhICsgXCJweFwiO1xyXG4gICAgc1s0XS53aWR0aCA9IHcgKyBcInB4XCI7XHJcbiAgICBzWzVdLmxlZnQgPSB0aGlzLnNhICsgMyArIFwicHhcIjtcclxuXHJcbiAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gIH1cclxufVxyXG4iLCJpbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFRleHRJbnB1dCBleHRlbmRzIFByb3RvIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciggbyA9IHt9ICkge1xyXG5cclxuICAgICAgICBzdXBlciggbyApO1xyXG5cclxuICAgICAgICB0aGlzLmNtb2RlID0gMDtcclxuXHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IG8udmFsdWUgIT09IHVuZGVmaW5lZCA/IG8udmFsdWUgOiAnJztcclxuICAgICAgICB0aGlzLnBsYWNlSG9sZGVyID0gby5wbGFjZUhvbGRlciB8fCAnJztcclxuXHJcbiAgICAgICAgdGhpcy5hbGx3YXkgPSBvLmFsbHdheSB8fCBmYWxzZTtcclxuICAgICAgICB0aGlzLmVkaXRhYmxlID0gby5lZGl0ICE9PSB1bmRlZmluZWQgPyBvLmVkaXQgOiB0cnVlO1xyXG5cclxuICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG5cclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICAvLyB0ZXh0XHJcbiAgICAgICAgdGhpcy5jWzJdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHRzZWxlY3QgKyAndG9wOjFweDsgaGVpZ2h0OicgKyAodGhpcy5oLTIpICsgJ3B4OyBjb2xvcjonICsgY2MudGV4dCArICc7IGJhY2tncm91bmQ6JyArIGNjLmJhY2sgKyAnOyBib3JkZXJDb2xvcjonICsgY2MuYm9yZGVyKyc7IGJvcmRlci1yYWRpdXM6Jyt0aGlzLnJhZGl1cysncHg7JyApO1xyXG4gICAgICAgIHRoaXMuY1syXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWU7XHJcblxyXG4gICAgICAgIC8vIHNlbGVjdGlvblxyXG4gICAgICAgIHRoaXMuY1szXSA9IHRoaXMuZG9tKCAgJ2RpdicsIHRoaXMuY3NzLnR4dHNlbGVjdCArICdwb3NpdGlvbjphYnNvbHV0ZTsgdG9wOjJweDsgaGVpZ2h0OicgKyAodGhpcy5oLTQpICsgJ3B4OyBwYWRkaW5nOjBweCAwcHg7IHdpZHRoOjBweDsgY29sb3I6JyArIGNjLnRleHRTZWxlY3QgKyAnOyBiYWNrZ3JvdW5kOicgKyBjYy5zZWxlY3QgKyAnOyBib3JkZXI6bm9uZTsgYm9yZGVyLXJhZGl1czowcHg7Jyk7XHJcblxyXG4gICAgICAgIC8vIGN1cnNvclxyXG4gICAgICAgIHRoaXMuY1s0XSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MuYmFzaWMgKyAndG9wOjJweDsgaGVpZ2h0OicgKyAodGhpcy5oLTQpICsgJ3B4OyB3aWR0aDowcHg7IGJhY2tncm91bmQ6JytjYy50ZXh0Kyc7JyApO1xyXG5cclxuICAgICAgICAvLyBmYWtlXHJcbiAgICAgICAgdGhpcy5jWzVdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHRzZWxlY3QgKyAndG9wOjFweDsgaGVpZ2h0OicgKyAodGhpcy5oLTIpICsgJ3B4OyBib3JkZXI6bm9uZTsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IGZvbnQtc3R5bGU6IGl0YWxpYzsgY29sb3I6JytjYy5ib3JkZXIrJzsnICk7XHJcbiAgICAgICAgaWYoIHRoaXMudmFsdWUgPT09ICcnICkgdGhpcy5jWzVdLnRleHRDb250ZW50ID0gdGhpcy5wbGFjZUhvbGRlcjtcclxuXHJcbiAgICAgICAgXHJcblxyXG5cclxuICAgICAgICB0aGlzLmluaXQoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdGVzdFpvbmUgKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgbCA9IHRoaXMubG9jYWw7XHJcbiAgICAgICAgaWYoIGwueCA9PT0gLTEgJiYgbC55ID09PSAtMSApIHJldHVybiAnJztcclxuICAgICAgICBpZiggbC54ID49IHRoaXMuc2EgKSByZXR1cm4gJ3RleHQnO1xyXG4gICAgICAgIHJldHVybiAnJztcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBFVkVOVFNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBtb3VzZXVwICggZSApIHtcclxuXHJcbiAgICAgICAgaWYoIXRoaXMuZWRpdGFibGUpIHJldHVybjtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuaXNEb3duICl7XHJcbiAgICAgICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdXNlbW92ZSggZSApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZWRvd24gKCBlICkge1xyXG5cclxuICAgICAgICBpZighdGhpcy5lZGl0YWJsZSkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoIGUgKTtcclxuXHJcbiAgICAgICAgaWYoICF0aGlzLmlzRG93biApe1xyXG4gICAgICAgICAgICB0aGlzLmlzRG93biA9IHRydWU7XHJcbiAgICAgICAgICAgIGlmKCBuYW1lID09PSAndGV4dCcgKSB0aGlzLnNldElucHV0KCB0aGlzLmNbMl0gKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW91c2Vtb3ZlKCBlICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlbW92ZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGlmKCF0aGlzLmVkaXRhYmxlKSByZXR1cm47XHJcblxyXG4gICAgICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZSggZSApO1xyXG5cclxuICAgICAgICAvL2xldCBsID0gdGhpcy5sb2NhbDtcclxuICAgICAgICAvL2lmKCBsLnggPT09IC0xICYmIGwueSA9PT0gLTEgKXsgcmV0dXJuO31cclxuXHJcbiAgICAgICAgLy9pZiggbC54ID49IHRoaXMuc2EgKSB0aGlzLmN1cnNvcigndGV4dCcpO1xyXG4gICAgICAgIC8vZWxzZSB0aGlzLmN1cnNvcigpO1xyXG5cclxuICAgICAgICBsZXQgeCA9IDA7XHJcblxyXG4gICAgICAgIGlmKCBuYW1lID09PSAndGV4dCcgKSB0aGlzLmN1cnNvcigndGV4dCcpO1xyXG4gICAgICAgIGVsc2UgdGhpcy5jdXJzb3IoKTtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuaXNEb3duICkgeCA9IGUuY2xpZW50WCAtIHRoaXMuem9uZS54O1xyXG5cclxuICAgICAgICByZXR1cm4gdGhpcy51cElucHV0KCB4IC0gdGhpcy5zYSAtMywgdGhpcy5pc0Rvd24gKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlICggKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY1syXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIHJlc2V0ICgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJzb3IoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBJTlBVVFxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIHNlbGVjdCAoIGMsIGUsIHcsIHQgKSB7XHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zO1xyXG4gICAgICAgIGxldCBkID0gdGhpcy5zYSArIDU7XHJcbiAgICAgICAgc1s0XS53aWR0aCA9ICcxcHgnO1xyXG4gICAgICAgIHNbNF0ubGVmdCA9ICggZCArIGUgKSArICdweCc7XHJcblxyXG4gICAgICAgIHNbM10ubGVmdCA9ICAoIGQgKyBlICkgICsgJ3B4JztcclxuICAgICAgICBzWzNdLndpZHRoID0gIHcgICsgJ3B4JztcclxuICAgICAgICB0aGlzLmNbM10uaW5uZXJIVE1MID0gdFxyXG4gICAgXHJcbiAgICB9XHJcblxyXG4gICAgdW5zZWxlY3QgKCkge1xyXG5cclxuICAgICAgICBsZXQgcyA9IHRoaXMucztcclxuICAgICAgICBpZighcykgcmV0dXJuO1xyXG4gICAgICAgIHNbM10ud2lkdGggPSAgMCAgKyAncHgnO1xyXG4gICAgICAgIHRoaXMuY1szXS5pbm5lckhUTUwgPSAndCdcclxuICAgICAgICBzWzRdLndpZHRoID0gMCArICdweCc7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHZhbGlkYXRlICggZm9yY2UgKSB7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmFsbHdheSApIGZvcmNlID0gdHJ1ZTsgXHJcblxyXG4gICAgICAgIHRoaXMudmFsdWUgPSB0aGlzLmNbMl0udGV4dENvbnRlbnQ7XHJcblxyXG4gICAgICAgIGlmKHRoaXMudmFsdWUgIT09ICcnKSB0aGlzLmNbNV0udGV4dENvbnRlbnQgPSAnJztcclxuICAgICAgICBlbHNlIHRoaXMuY1s1XS50ZXh0Q29udGVudCA9IHRoaXMucGxhY2VIb2xkZXI7XHJcblxyXG4gICAgICAgIGlmKCAhZm9yY2UgKSByZXR1cm47XHJcblxyXG4gICAgICAgIHRoaXMuc2VuZCgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIFJFWklTRVxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIHJTaXplICgpIHtcclxuXHJcbiAgICAgICAgc3VwZXIuclNpemUoKTtcclxuXHJcbiAgICAgICAgbGV0IHMgPSB0aGlzLnM7XHJcbiAgICAgICAgc1syXS5sZWZ0ID0gdGhpcy5zYSArICdweCc7XHJcbiAgICAgICAgc1syXS53aWR0aCA9IHRoaXMuc2IgKyAncHgnO1xyXG5cclxuICAgICAgICBzWzVdLmxlZnQgPSB0aGlzLnNhICsgJ3B4JztcclxuICAgICAgICBzWzVdLndpZHRoID0gdGhpcy5zYiArICdweCc7XHJcbiAgICAgXHJcbiAgICB9XHJcblxyXG5cclxufSIsImltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcyc7XHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIFRpdGxlIGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvICk7XHJcblxyXG4gICAgICAgIGxldCBwcmVmaXggPSBvLnByZWZpeCB8fCAnJztcclxuXHJcbiAgICAgICAgdGhpcy5jWzJdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHQgKyAnanVzdGlmeS1jb250ZW50OnJpZ2h0OyB3aWR0aDo2MHB4OyBsaW5lLWhlaWdodDonKyAodGhpcy5oLTgpICsgJ3B4OyBjb2xvcjonICsgdGhpcy5jb2xvcnMudGV4dCApO1xyXG5cclxuICAgICAgICBpZiggdGhpcy5oID09PSAzMSApe1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zWzBdLmhlaWdodCA9IHRoaXMuaCArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuc1sxXS50b3AgPSA4ICsgJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5jWzJdLnN0eWxlLnRvcCA9IDggKyAncHgnO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zO1xyXG5cclxuICAgICAgICBzWzFdLmp1c3RpZnlDb250ZW50ID0gby5hbGlnbiB8fCAnbGVmdCc7XHJcbiAgICAgICAgLy9zWzFdLnRleHRBbGlnbiA9IG8uYWxpZ24gfHwgJ2xlZnQnO1xyXG4gICAgICAgIHNbMV0uZm9udFdlaWdodCA9IG8uZm9udFdlaWdodCB8fCAnYm9sZCc7XHJcblxyXG5cclxuICAgICAgICB0aGlzLmNbMV0udGV4dENvbnRlbnQgPSB0aGlzLnR4dC5zdWJzdHJpbmcoMCwxKS50b1VwcGVyQ2FzZSgpICsgdGhpcy50eHQuc3Vic3RyaW5nKDEpLnJlcGxhY2UoXCItXCIsIFwiIFwiKTtcclxuICAgICAgICB0aGlzLmNbMl0udGV4dENvbnRlbnQgPSBwcmVmaXg7XHJcblxyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB0ZXh0KCB0eHQgKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY1sxXS50ZXh0Q29udGVudCA9IHR4dDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdGV4dDIoIHR4dCApIHtcclxuXHJcbiAgICAgICAgdGhpcy5jWzJdLnRleHRDb250ZW50ID0gdHh0O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByU2l6ZSgpIHtcclxuXHJcbiAgICAgICAgc3VwZXIuclNpemUoKTtcclxuICAgICAgICB0aGlzLnNbMV0ud2lkdGggPSB0aGlzLncgKyAncHgnOyAvLy0gNTAgKyAncHgnO1xyXG4gICAgICAgIHRoaXMuc1syXS5sZWZ0ID0gdGhpcy53ICsgJ3B4JzsvLy0gKCA1MCArIDI2ICkgKyAncHgnO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRDb2xvciggYyApIHtcclxuICAgICAgICB0aGlzLnNbMV0uY29sb3IgPSBjXHJcbiAgICAgICAgdGhpcy5zWzJdLmNvbG9yID0gY1xyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgU2VsZWN0IGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvIClcclxuXHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IG8udmFsdWUgfHwgJydcclxuICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5vbkFjdGlmID0gby5vbkFjdGlmIHx8IGZ1bmN0aW9uKCl7fVxyXG5cclxuICAgICAgICAvL2xldCBwcmVmaXggPSBvLnByZWZpeCB8fCAnJztcclxuICAgICAgICBjb25zdCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG4gICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0ICsgdGhpcy5jc3MuYnV0dG9uICsgJyB0b3A6MXB4OyBiYWNrZ3JvdW5kOicrY2MuYnV0dG9uKyc7IGhlaWdodDonKyh0aGlzLmgtMikrJ3B4OyBib3JkZXI6JysgY2MuYnV0dG9uQm9yZGVyKyc7IGJvcmRlci1yYWRpdXM6MTVweDsgd2lkdGg6MzBweDsgbGVmdDoxMHB4OycgKVxyXG4gICAgICAgIC8vdGhpcy5jWzJdLnN0eWxlLmNvbG9yID0gdGhpcy5mb250Q29sb3I7XHJcblxyXG4gICAgICAgIHRoaXMuY1szXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0c2VsZWN0ICsgJ2hlaWdodDonICsgKHRoaXMuaC00KSArICdweDsgYmFja2dyb3VuZDonICsgY2MuaW5wdXRCZyArICc7IGJvcmRlckNvbG9yOicgKyBjYy5pbnB1dEJvcmRlcisnOyBib3JkZXItcmFkaXVzOicrdGhpcy5yYWRpdXMrJ3B4OycgKVxyXG4gICAgICAgIHRoaXMuY1szXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWVcclxuXHJcbiAgICAgICAgbGV0IGZsdG9wID0gTWF0aC5mbG9vcih0aGlzLmgqMC41KS03XHJcbiAgICAgICAgdGhpcy5jWzRdID0gdGhpcy5kb20oICdwYXRoJywgdGhpcy5jc3MuYmFzaWMgKyAncG9zaXRpb246YWJzb2x1dGU7IHdpZHRoOjE0cHg7IGhlaWdodDoxNHB4OyBsZWZ0OjVweDsgdG9wOicrZmx0b3ArJ3B4OycsIHsgZDp0aGlzLnN2Z3NbICdjdXJzb3InIF0sIGZpbGw6Y2MudGV4dCwgc3Ryb2tlOidub25lJ30pXHJcblxyXG4gICAgICAgIHRoaXMuc3RhdCA9IDFcclxuICAgICAgICB0aGlzLmlzQWN0aWYgPSBmYWxzZVxyXG5cclxuICAgICAgICB0aGlzLmluaXQoKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICB0ZXN0Wm9uZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBsID0gdGhpcy5sb2NhbFxyXG4gICAgICAgIGlmKCBsLnggPT09IC0xICYmIGwueSA9PT0gLTEgKSByZXR1cm4gJydcclxuICAgICAgICBpZiggbC54ID4gdGhpcy5zYSAmJiBsLnggPCB0aGlzLnNhKzMwICkgcmV0dXJuICdvdmVyJ1xyXG4gICAgICAgIHJldHVybiAnMCdcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBFVkVOVFNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBtb3VzZXVwICggZSApIHtcclxuICAgIFxyXG4gICAgICAgIGlmKCB0aGlzLmlzRG93biApe1xyXG4gICAgICAgICAgICAvL3RoaXMudmFsdWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZVxyXG4gICAgICAgICAgICAvL3RoaXMuc2VuZCgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3VzZW1vdmUoIGUgKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlXHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlZG93biAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZSggZSApXHJcblxyXG4gICAgICAgIGlmKCAhbmFtZSApIHJldHVybiBmYWxzZVxyXG5cclxuICAgICAgICB0aGlzLmlzRG93biA9IHRydWVcclxuICAgICAgICAvL3RoaXMudmFsdWUgPSB0aGlzLnZhbHVlc1sgbmFtZS0yIF07XHJcbiAgICAgICAgLy90aGlzLnNlbmQoKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5tb3VzZW1vdmUoIGUgKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZW1vdmUgKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgdXAgPSBmYWxzZVxyXG4gICAgICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZSggZSApXHJcblxyXG4gICAgICAgIGlmKCBuYW1lID09PSAnb3ZlcicgKXtcclxuICAgICAgICAgICAgdGhpcy5jdXJzb3IoJ3BvaW50ZXInKTtcclxuICAgICAgICAgICAgdXAgPSB0aGlzLm1vZGUoIHRoaXMuaXNEb3duID8gMyA6IDIgKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHVwID0gdGhpcy5yZXNldCgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdXBcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIGFwcGx5ICggdiApIHtcclxuXHJcbiAgICAgICAgdiA9IHYgfHwgJyc7XHJcblxyXG4gICAgICAgIGlmKCB2ICE9PSB0aGlzLnZhbHVlICkge1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdjtcclxuICAgICAgICAgICAgdGhpcy5jWzNdLnRleHRDb250ZW50ID0gdGhpcy52YWx1ZTtcclxuICAgICAgICAgICAgdGhpcy5zZW5kKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMubW9kZSgxKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlICgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5tb2RlKCAzICk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vZGUgKCBuICkge1xyXG5cclxuICAgICAgICBsZXQgY2hhbmdlID0gZmFsc2VcclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICBpZiggdGhpcy5zdGF0ICE9PSBuICl7XHJcblxyXG4gICAgICAgICAgICBpZiggbj09PTEgKSB0aGlzLmlzQWN0aWYgPSBmYWxzZTs7XHJcblxyXG4gICAgICAgICAgICBpZiggbj09PTMgKXsgXHJcbiAgICAgICAgICAgICAgICBpZiggIXRoaXMuaXNBY3RpZiApeyB0aGlzLmlzQWN0aWYgPSB0cnVlOyBuPTQ7IHRoaXMub25BY3RpZiggdGhpcyApOyB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHsgdGhpcy5pc0FjdGlmID0gZmFsc2U7IH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYoIG49PT0yICYmIHRoaXMuaXNBY3RpZiApIG4gPSA0O1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zdGF0ID0gblxyXG5cclxuICAgICAgICAgICAgc3dpdGNoKCBuICl7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAxOiB0aGlzLnNbIDIgXS5jb2xvciA9IGNjLnRleHQ7IHRoaXMuc1sgMiBdLmJhY2tncm91bmQgPSBjYy5idXR0b247IGJyZWFrOyAvLyBiYXNlXHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6IHRoaXMuc1sgMiBdLmNvbG9yID0gY2MudGV4dE92ZXI7IHRoaXMuc1sgMiBdLmJhY2tncm91bmQgPSBjYy5vdmVyb2ZmOyBicmVhazsgLy8gb3ZlclxyXG4gICAgICAgICAgICAgICAgY2FzZSAzOiB0aGlzLnNbIDIgXS5jb2xvciA9IGNjLnRleHRPdmVyOyB0aGlzLnNbIDIgXS5iYWNrZ3JvdW5kID0gY2MuYWN0aW9uOyBicmVhazsgLy8gZG93blxyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiB0aGlzLnNbIDIgXS5jb2xvciA9IGNjLnRleHRTZWxlY3Q7IHRoaXMuc1sgMiBdLmJhY2tncm91bmQgPSBjYy5hY3Rpb247IGJyZWFrOyAvLyBhY3RpZlxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY2hhbmdlID0gdHJ1ZVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjaGFuZ2VcclxuXHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXNldCAoKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY3Vyc29yKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZSggdGhpcy5pc0FjdGlmID8gNCA6IDEgKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICB0ZXh0ICggdHh0ICkge1xyXG5cclxuICAgICAgICB0aGlzLmNbM10udGV4dENvbnRlbnQgPSB0eHRcclxuXHJcbiAgICB9XHJcblxyXG4gICAgclNpemUgKCkge1xyXG5cclxuICAgICAgICBzdXBlci5yU2l6ZSgpXHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zXHJcbiAgICAgICAgc1syXS5sZWZ0ID0gdGhpcy5zYSArICdweCdcclxuICAgICAgICBzWzNdLmxlZnQgPSAodGhpcy5zYSArIDQwKSArICdweCdcclxuICAgICAgICBzWzNdLndpZHRoID0gKHRoaXMuc2IgLSA0MCkgKyAncHgnXHJcbiAgICAgICAgc1s0XS5sZWZ0ID0gKHRoaXMuc2ErOCkgKyAncHgnXHJcblxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcyc7XHJcbmltcG9ydCB7IEZpbGVzIH0gZnJvbSAnLi4vY29yZS9GaWxlcy5qcyc7XHJcblxyXG5cclxuZXhwb3J0IGNsYXNzIEJpdG1hcCBleHRlbmRzIFByb3RvIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciggbyA9IHt9ICkge1xyXG5cclxuICAgICAgICBzdXBlciggbyApXHJcblxyXG4gICAgICAgIHRoaXMudmFsdWUgPSBvLnZhbHVlIHx8ICcnXHJcbiAgICAgICAgdGhpcy5yZWZUZXh0dXJlID0gby50ZXh0dXJlIHx8IG51bGw7XHJcbiAgICAgICAgdGhpcy5pbWcgPSBudWxsXHJcblxyXG4gICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2VcclxuICAgICAgICB0aGlzLm5ldmVybG9jayA9IHRydWVcclxuXHJcblxyXG5cclxuICAgICAgICBjb25zdCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG4gICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0ICsgdGhpcy5jc3MuYnV0dG9uICsgJyB0b3A6MXB4OyBiYWNrZ3JvdW5kOicrY2MuYnV0dG9uKyc7IGhlaWdodDonKyh0aGlzLmgtMikrJ3B4OyBib3JkZXI6JytjYy5idXR0b25Cb3JkZXIrJzsgYm9yZGVyLXJhZGl1czoxNXB4OyB3aWR0aDozMHB4OyBsZWZ0OjEwcHg7JyApXHJcblxyXG4gICAgICAgIHRoaXMuY1szXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0c2VsZWN0ICsgJ2hlaWdodDonICsgKHRoaXMuaC00KSArICdweDsgYmFja2dyb3VuZDonICsgY2MuaW5wdXRCZyArICc7IGJvcmRlckNvbG9yOicgKyBjYy5pbnB1dEJvcmRlcisnOyBib3JkZXItcmFkaXVzOicrdGhpcy5yYWRpdXMrJ3B4OycgKVxyXG4gICAgICAgIHRoaXMuY1szXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWU7XHJcblxyXG4gICAgICAgIGxldCBmbHRvcCA9IE1hdGguZmxvb3IodGhpcy5oKjAuNSktN1xyXG4gICAgICAgIHRoaXMuY1s0XSA9IHRoaXMuZG9tKCAncGF0aCcsIHRoaXMuY3NzLmJhc2ljICsgJ3Bvc2l0aW9uOmFic29sdXRlOyB3aWR0aDoxNHB4OyBoZWlnaHQ6MTRweDsgbGVmdDo1cHg7IHRvcDonK2ZsdG9wKydweDsnLCB7IGQ6dGhpcy5zdmdzWyAnbG9hZCcgXSwgZmlsbDpjYy50ZXh0LCBzdHJva2U6J25vbmUnfSlcclxuXHJcbiAgICAgICAgdGhpcy5zdGF0ID0gMVxyXG5cclxuICAgICAgICB0aGlzLmluaXQoKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICB0ZXN0Wm9uZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBsID0gdGhpcy5sb2NhbDtcclxuICAgICAgICBpZiggbC54ID09PSAtMSAmJiBsLnkgPT09IC0xICkgcmV0dXJuICcnO1xyXG4gICAgICAgIGlmKCBsLnggPiB0aGlzLnNhICYmIGwueCA8IHRoaXMuc2ErMzAgKSByZXR1cm4gJ292ZXInO1xyXG4gICAgICAgIHJldHVybiAnMCdcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBFVkVOVFNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBtb3VzZXVwICggZSApIHtcclxuICAgIFxyXG4gICAgICAgIGlmKCB0aGlzLmlzRG93biApe1xyXG4gICAgICAgICAgICAvL3RoaXMudmFsdWUgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcclxuICAgICAgICAgICAgLy90aGlzLnNlbmQoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW91c2Vtb3ZlKCBlICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlZG93biAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZSggZSApO1xyXG5cclxuICAgICAgICBpZiggIW5hbWUgKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmKCBuYW1lID09PSAnb3ZlcicgKXtcclxuICAgICAgICAgICAgdGhpcy5pc0Rvd24gPSB0cnVlXHJcbiAgICAgICAgICAgIEZpbGVzLmxvYWQoIHsgY2FsbGJhY2s6dGhpcy5jaGFuZ2VCaXRtYXAuYmluZCh0aGlzKSB9IClcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBcclxuICAgICAgICAvL3RoaXMudmFsdWUgPSB0aGlzLnZhbHVlc1sgbmFtZS0yIF07XHJcbiAgICAgICAgLy90aGlzLnNlbmQoKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5tb3VzZW1vdmUoIGUgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vtb3ZlICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IHVwID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZSggZSApO1xyXG5cclxuICAgICAgICBpZiggbmFtZSA9PT0gJ292ZXInICl7XHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yKCdwb2ludGVyJyk7XHJcbiAgICAgICAgICAgIHVwID0gdGhpcy5tb2RlKCB0aGlzLmlzRG93biA/IDMgOiAyIClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB1cCA9IHRoaXMucmVzZXQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB1cDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIGNoYW5nZUJpdG1hcCggaW1nLCBmbmFtZSApe1xyXG5cclxuICAgICAgICBpZiggaW1nICl7XHJcbiAgICAgICAgICAgIHRoaXMuaW1nID0gaW1nXHJcbiAgICAgICAgICAgIHRoaXMuYXBwbHkoIGZuYW1lIClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLmltZyA9IG51bGxcclxuICAgICAgICAgICAgdGhpcy5hcHBseSggJ251bGwnIClcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIGFwcGx5ICggdiApIHtcclxuXHJcbiAgICAgICAgdiA9IHYgfHwgJyc7XHJcblxyXG4gICAgICAgIGlmKCB2ICE9PSB0aGlzLnZhbHVlICkge1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdjtcclxuICAgICAgICAgICAgdGhpcy5jWzNdLnRleHRDb250ZW50ID0gdGhpcy52YWx1ZTtcclxuXHJcbiAgICAgICAgICAgIGlmKCB0aGlzLmltZyAhPT0gbnVsbCApe1xyXG4gICAgICAgICAgICAgICAgaWYoIHRoaXMub2JqZWN0TGluayAhPT0gbnVsbCApIHRoaXMub2JqZWN0TGlua1sgdGhpcy52YWwgXSA9IHZcclxuICAgICAgICAgICAgICAgIGlmKCB0aGlzLmNhbGxiYWNrICkgdGhpcy5jYWxsYmFjayggdGhpcy52YWx1ZSwgdGhpcy5pbWcsIHRoaXMubmFtZSApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMubW9kZSgxKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlICgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5tb2RlKCAzICk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vZGUgKCBuICkge1xyXG5cclxuICAgICAgICBsZXQgY2hhbmdlID0gZmFsc2VcclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICBpZiggdGhpcy5zdGF0ICE9PSBuICl7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnN0YXQgPSBuXHJcblxyXG4gICAgICAgICAgICBzd2l0Y2goIG4gKXtcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlIDE6IHRoaXMuc1sgMiBdLmNvbG9yID0gY2MudGV4dDsgdGhpcy5zWyAyIF0uYmFja2dyb3VuZCA9IGNjLmJ1dHRvbjsgYnJlYWs7IC8vIGJhc2VcclxuICAgICAgICAgICAgICAgIGNhc2UgMjogdGhpcy5zWyAyIF0uY29sb3IgPSBjYy50ZXh0T3ZlcjsgdGhpcy5zWyAyIF0uYmFja2dyb3VuZCA9IGNjLm92ZXJvZmY7IGJyZWFrOyAvLyBvdmVyXHJcbiAgICAgICAgICAgICAgICBjYXNlIDM6IHRoaXMuc1sgMiBdLmNvbG9yID0gY2MudGV4dE92ZXI7IHRoaXMuc1sgMiBdLmJhY2tncm91bmQgPSBjYy5vdmVyOyBicmVhazsgLy8gZG93blxyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiB0aGlzLnNbIDIgXS5jb2xvciA9IGNjLnRleHRTZWxlY3Q7IHRoaXMuc1sgMiBdLmJhY2tncm91bmQgPSBjYy5zZWxlY3Q7IGJyZWFrOyAvLyBhY3RpZlxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY2hhbmdlID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gY2hhbmdlO1xyXG5cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJlc2V0ICgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJzb3IoKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5tb2RlKCB0aGlzLmlzQWN0aWYgPyA0IDogMSApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB0ZXh0ICggdHh0ICkge1xyXG5cclxuICAgICAgICB0aGlzLmNbM10udGV4dENvbnRlbnQgPSB0eHQ7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJTaXplICgpIHtcclxuXHJcbiAgICAgICAgc3VwZXIuclNpemUoKTtcclxuXHJcbiAgICAgICAgbGV0IHMgPSB0aGlzLnM7XHJcbiAgICAgICAgc1syXS5sZWZ0ID0gdGhpcy5zYSArICdweCc7XHJcbiAgICAgICAgc1szXS5sZWZ0ID0gKHRoaXMuc2EgKyA0MCkgKyAncHgnO1xyXG4gICAgICAgIHNbM10ud2lkdGggPSAodGhpcy5zYiAtIDQwKSArICdweCc7XHJcbiAgICAgICAgc1s0XS5sZWZ0ID0gKHRoaXMuc2ErOCkgKyAncHgnO1xyXG5cclxuICAgIH1cclxuXHJcbn0iLCIvL2ltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcyc7XHJcbmltcG9ydCB7IEJ1dHRvbiB9IGZyb20gJy4vQnV0dG9uLmpzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBTZWxlY3RvciBleHRlbmRzIEJ1dHRvbiB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoIG8gPSB7fSApIHtcclxuXHJcbiAgICAgICAgaWYoIG8uc2VsZWN0YWJsZSA9PT0gdW5kZWZpbmVkICkgby5zZWxlY3RhYmxlID0gdHJ1ZVxyXG4gICAgICAgIHN1cGVyKCBvICk7XHJcbiAgICAgXHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdG8gfSBmcm9tICcuLi9jb3JlL1Byb3RvLmpzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBJdGVtIGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvICk7XHJcblxyXG4gICAgICAgIHRoaXMucCA9IDEwMDtcclxuICAgICAgICB0aGlzLnZhbHVlID0gdGhpcy50eHQ7XHJcbiAgICAgICAgdGhpcy5zdGF0dXMgPSAxO1xyXG5cclxuICAgICAgICB0aGlzLml0eXBlID0gby5pdHlwZSB8fCAnbm9uZSc7XHJcbiAgICAgICAgdGhpcy52YWwgPSB0aGlzLml0eXBlO1xyXG5cclxuICAgICAgICB0aGlzLmdyYXBoID0gdGhpcy5zdmdzWyB0aGlzLml0eXBlIF07XHJcblxyXG4gICAgICAgIGxldCBmbHRvcCA9IE1hdGguZmxvb3IodGhpcy5oKjAuNSktNztcclxuXHJcbiAgICAgICAgdGhpcy5jWzJdID0gdGhpcy5kb20oICdwYXRoJywgdGhpcy5jc3MuYmFzaWMgKyAncG9zaXRpb246YWJzb2x1dGU7IHdpZHRoOjE0cHg7IGhlaWdodDoxNHB4OyBsZWZ0OjVweDsgdG9wOicrZmx0b3ArJ3B4OycsIHsgZDp0aGlzLmdyYXBoLCBmaWxsOnRoaXMuY29sb3JzLnRleHQsIHN0cm9rZTonbm9uZSd9KTtcclxuXHJcbiAgICAgICAgdGhpcy5zWzFdLm1hcmdpbkxlZnQgPSAyMCArICdweCc7XHJcblxyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIEVWRU5UU1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIG1vdXNlbW92ZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY3Vyc29yKCdwb2ludGVyJyk7XHJcblxyXG4gICAgICAgIC8vdXAgPSB0aGlzLm1vZGVzKCB0aGlzLmlzRG93biA/IDMgOiAyLCBuYW1lICk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlZG93biAoIGUgKSB7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmlzVUkgKSB0aGlzLm1haW4ucmVzZXRJdGVtKCk7XHJcblxyXG4gICAgICAgIHRoaXMuc2VsZWN0ZWQoIHRydWUgKTtcclxuXHJcbiAgICAgICAgdGhpcy5zZW5kKCk7XHJcblxyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB1aW91dCAoKSB7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmlzU2VsZWN0ICkgdGhpcy5tb2RlKDMpO1xyXG4gICAgICAgIGVsc2UgdGhpcy5tb2RlKDEpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB1aW92ZXIgKCkge1xyXG5cclxuICAgICAgICBpZiggdGhpcy5pc1NlbGVjdCApIHRoaXMubW9kZSg0KTtcclxuICAgICAgICBlbHNlIHRoaXMubW9kZSgyKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlICgpIHtcclxuICAgICAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgLypyU2l6ZSAoKSB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgc3VwZXIuclNpemUoKTtcclxuXHJcbiAgICB9Ki9cclxuXHJcbiAgICBtb2RlICggbiApIHtcclxuXHJcbiAgICAgICAgbGV0IGNoYW5nZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiggdGhpcy5zdGF0dXMgIT09IG4gKXtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc3RhdHVzID0gbjtcclxuICAgICAgICAgICAgbGV0IHMgPSB0aGlzLnMsIGNjID0gdGhpcy5jb2xvcnNcclxuICAgICAgICBcclxuICAgICAgICAgICAgc3dpdGNoKCBuICl7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAxOiB0aGlzLnN0YXR1cyA9IDE7IHNbMV0uY29sb3IgPSBjYy50ZXh0OyBzWzBdLmJhY2tncm91bmQgPSAnbm9uZSc7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAyOiB0aGlzLnN0YXR1cyA9IDI7IHNbMV0uY29sb3IgPSBjYy50ZXh0T3Zlcjsgc1swXS5iYWNrZ3JvdW5kID0gY2MuYmFjazsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDM6IHRoaXMuc3RhdHVzID0gMzsgc1sxXS5jb2xvciA9IGNjLnRleHRTZWxlY3Q7IHNbMF0uYmFja2dyb3VuZCA9IGNjLnNlbGVjdDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6IHRoaXMuc3RhdHVzID0gNDsgc1sxXS5jb2xvciA9IGNjLnRleHRPdmVyOyBzWzBdLmJhY2tncm91bmQgPSBjYy5vdmVyOyBicmVhaztcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNoYW5nZSA9IHRydWU7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNoYW5nZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmVzZXQgKCkge1xyXG5cclxuICAgICAgICB0aGlzLmN1cnNvcigpO1xyXG4gICAgICAgLy8gcmV0dXJuIHRoaXMubW9kZSggMSApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZWxlY3RlZCAoIGIgKXtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuaXNTZWxlY3QgKSB0aGlzLm1vZGUoMSk7XHJcblxyXG4gICAgICAgIHRoaXMuaXNTZWxlY3QgPSBiIHx8IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiggdGhpcy5pc1NlbGVjdCApIHRoaXMubW9kZSgzKTtcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdG8gfSBmcm9tICcuLi9jb3JlL1Byb3RvLmpzJ1xyXG5pbXBvcnQgeyBCdXR0b24gfSBmcm9tICcuL0J1dHRvbi5qcydcclxuXHJcbmV4cG9ydCBjbGFzcyBHcmlkIGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvICk7XHJcblxyXG4gICAgICAgIC8qdGhpcy52YWx1ZXMgPSBvLnZhbHVlcyB8fCBbXTtcclxuXHJcbiAgICAgICAgaWYoIHR5cGVvZiB0aGlzLnZhbHVlcyA9PT0gJ3N0cmluZycgKSB0aGlzLnZhbHVlcyA9IFsgdGhpcy52YWx1ZXMgXTsqL1xyXG5cclxuICAgICAgICB0aGlzLnZhbHVlcyA9IFtdO1xyXG5cclxuICAgICAgICBpZiggby52YWx1ZXMgKXtcclxuICAgICAgICAgICAgaWYoIG8udmFsdWVzIGluc3RhbmNlb2YgQXJyYXkgKXtcclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWVzID0gby52YWx1ZXNcclxuICAgICAgICAgICAgfSBlbHNlIGlmKCBvLnZhbHVlcyBpbnN0YW5jZW9mIFN0cmluZyApe1xyXG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZXMgPSBbIG8udmFsdWVzIF07XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiggby52YWx1ZXMgaW5zdGFuY2VvZiBPYmplY3QgKXtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVmT2JqZWN0ID0gby52YWx1ZXNcclxuICAgICAgICAgICAgICAgIGZvciggbGV0IGcgaW4gdGhpcy5yZWZPYmplY3QgKSB0aGlzLnZhbHVlcy5wdXNoKCBnIClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5sbmcgPSB0aGlzLnZhbHVlcy5sZW5ndGg7XHJcblxyXG5cclxuXHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IG8udmFsdWUgfHwgbnVsbDtcclxuXHJcblxyXG5cclxuXHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnNcclxuXHJcblxyXG4gICAgICAgIHRoaXMuaXNTZWxlY3RhYmxlID0gby5zZWxlY3RhYmxlIHx8IGZhbHNlXHJcbiAgICAgICAgdGhpcy5zcGFjZXMgPSBvLnNwYWNlcyB8fCBbIGNjLnN4LCBjYy5zeSBdXHJcbiAgICAgICAgdGhpcy5ic2l6ZSA9IG8uYnNpemUgfHwgWyA5MCwgdGhpcy5oIF07XHJcblxyXG4gICAgICAgIHRoaXMuYnNpemVNYXggPSB0aGlzLmJzaXplWzBdXHJcblxyXG4gICAgICAgIHRoaXMudG1wID0gW107XHJcbiAgICAgICAgdGhpcy5zdGF0ID0gW107XHJcbiAgICAgICAgdGhpcy5ncmlkID0gWyAyLCBNYXRoLnJvdW5kKCB0aGlzLmxuZyAqIDAuNSApIF07XHJcblxyXG4gICAgICAgIHRoaXMuaCA9ICggdGhpcy5ncmlkWzFdICogdGhpcy5ic2l6ZVsxXSApICsgKCB0aGlzLmdyaWRbMV0gKiB0aGlzLnNwYWNlc1sxXSApIC8vKyA0IC0gKHRoaXMubXRvcCoyKSAvLysgKHRoaXMuc3BhY2VzWzFdIC0gdGhpcy5tdG9wKTtcclxuXHJcbiAgICAgICAgdGhpcy5jWzFdLnRleHRDb250ZW50ID0gJyc7XHJcbiAgICAgICAgLy90aGlzLmNbMl0gPSB0aGlzLmRvbSggJ3RhYmxlJywgdGhpcy5jc3MuYmFzaWMgKyAnd2lkdGg6MTAwJTsgdG9wOicrKHRoaXMuc3BhY2VzWzFdLTIpKydweDsgaGVpZ2h0OmF1dG87IGJvcmRlci1jb2xsYXBzZTpzZXBhcmF0ZTsgYm9yZGVyOm5vbmU7IGJvcmRlci1zcGFjaW5nOiAnKyh0aGlzLnNwYWNlc1swXS0yKSsncHggJysodGhpcy5zcGFjZXNbMV0tMikrJ3B4OycgKTtcclxuICAgICAgICB0aGlzLmNbMl0gPSB0aGlzLmRvbSggJ3RhYmxlJywgdGhpcy5jc3MuYmFzaWMgKyAnd2lkdGg6MTAwJTsgYm9yZGVyLXNwYWNpbmc6ICcrKHRoaXMuc3BhY2VzWzBdLTIpKydweCAnKyh0aGlzLnNwYWNlc1sxXSkrJ3B4OyBib3JkZXI6bm9uZTsnICk7XHJcblxyXG4gICAgICAgIGxldCBuID0gMCwgYiwgbWlkLCB0ZCwgdHIsIHNlbDtcclxuXHJcbiAgICAgICAgdGhpcy5yZXMgPSAtMVxyXG4gICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2VcclxuICAgICAgICB0aGlzLm5ldmVybG9jayA9IHRydWVcclxuXHJcbiAgICAgICAgdGhpcy5idXR0b25zID0gW107IFxyXG4gICAgICAgIHRoaXMuc3RhdCA9IFtdO1xyXG4gICAgICAgIHRoaXMudG1wWCA9IFtdO1xyXG4gICAgICAgIHRoaXMudG1wWSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8IHRoaXMuZ3JpZFsxXTsgaSsrICl7XHJcblxyXG4gICAgICAgICAgICB0ciA9IHRoaXMuY1syXS5pbnNlcnRSb3coKTtcclxuICAgICAgICAgICAgdHIuc3R5bGUuY3NzVGV4dCA9ICdwb2ludGVyLWV2ZW50czpub25lOyc7XHJcbiAgICAgICAgICAgIGZvciggbGV0IGogPSAwOyBqIDwgdGhpcy5ncmlkWzBdOyBqKysgKXtcclxuXHJcbiAgICAgICAgICAgICAgICB0ZCA9IHRyLmluc2VydENlbGwoKTtcclxuICAgICAgICAgICAgICAgIHRkLnN0eWxlLmNzc1RleHQgPSAncG9pbnRlci1ldmVudHM6bm9uZTsnO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmKCB0aGlzLnZhbHVlc1tuXSApe1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBzZWwgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICBpZiggdGhpcy52YWx1ZXNbbl0gPT09IHRoaXMudmFsdWUgJiYgdGhpcy5pc1NlbGVjdGFibGUgKSBzZWwgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBiID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggJ2RpdicgKTtcclxuICAgICAgICAgICAgICAgICAgICBiLnN0eWxlLmNzc1RleHQgPSB0aGlzLmNzcy50eHQgKyB0aGlzLmNzcy5idXR0b24gKyAncG9zaXRpb246c3RhdGljOyB0b3A6MXB4OyB3aWR0aDonK3RoaXMuYnNpemVbMF0rJ3B4OyBoZWlnaHQ6JysodGhpcy5ic2l6ZVsxXS0yKSsncHg7IGJvcmRlcjonK2NjLmJvcmRlclNpemUrJ3B4IHNvbGlkICcrY2MuYm9yZGVyKyc7IGxlZnQ6YXV0bzsgcmlnaHQ6YXV0bzsgYm9yZGVyLXJhZGl1czonK3RoaXMucmFkaXVzKydweDsnO1xyXG4gICAgICAgICAgICAgICAgICAgIGIuc3R5bGUuYmFja2dyb3VuZCA9IHNlbCA/IGNjLnNlbGVjdCA6IGNjLmJ1dHRvbjtcclxuICAgICAgICAgICAgICAgICAgICBiLnN0eWxlLmNvbG9yID0gc2VsID8gY2MudGV4dFNlbGVjdCA6IGNjLnRleHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYi5pbm5lckhUTUwgPSB0aGlzLnZhbHVlc1tuXTtcclxuICAgICAgICAgICAgICAgICAgICB0ZC5hcHBlbmRDaGlsZCggYiApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJ1dHRvbnMucHVzaChiKVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdC5wdXNoKDEpXHJcblxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoICdkaXYnIClcclxuICAgICAgICAgICAgICAgICAgICBiLnN0eWxlLmNzc1RleHQgPSB0aGlzLmNzcy50eHQgKyAncG9zaXRpb246c3RhdGljOyB3aWR0aDonK3RoaXMuYnNpemVbMF0rJ3B4OyBoZWlnaHQ6Jyt0aGlzLmJzaXplWzFdKydweDsgdGV4dC1hbGlnbjpjZW50ZXI7IGxlZnQ6YXV0bzsgcmlnaHQ6YXV0bzsgYmFja2dyb3VuZDpub25lOydcclxuICAgICAgICAgICAgICAgICAgICB0ZC5hcHBlbmRDaGlsZCggYiApXHJcblxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmKGo9PT0wKSBiLnN0eWxlLmNzc1RleHQgKz0gJ2Zsb2F0OnJpZ2h0Oyc7XHJcbiAgICAgICAgICAgICAgICBlbHNlIGIuc3R5bGUuY3NzVGV4dCArPSAnZmxvYXQ6bGVmdDsnO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIG4rKztcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc1swXS5ib3JkZXIgPSAnbm9uZSdcclxuXHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHRlc3Rab25lICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IGwgPSB0aGlzLmxvY2FsO1xyXG4gICAgICAgIGlmKCBsLnggPT09IC0xICYmIGwueSA9PT0gLTEgKSByZXR1cm4gLTE7XHJcblxyXG4gICAgICAgIGwueSArPSB0aGlzLm10b3BcclxuICAgICAgICBcclxuICAgICAgICBsZXQgdHggPSB0aGlzLnRtcFg7XHJcbiAgICAgICAgbGV0IHR5ID0gdGhpcy50bXBZO1xyXG5cclxuICAgICAgICBsZXQgaWQgPSAtMTtcclxuICAgICAgICBsZXQgYyA9IC0xO1xyXG4gICAgICAgIGxldCBsaW5lID0gLTE7XHJcbiAgICAgICAgbGV0IGkgPSB0aGlzLmdyaWRbMF07XHJcbiAgICAgICAgd2hpbGUoIGktLSApe1xyXG4gICAgICAgIFx0aWYoIGwueCA+IHR4W2ldWzBdICYmIGwueCA8IHR4W2ldWzFdICkgYyA9IGk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpID0gdGhpcy5ncmlkWzFdO1xyXG4gICAgICAgIHdoaWxlKCBpLS0gKXtcclxuICAgICAgICAgICAgaWYoIGwueSA+IHR5W2ldWzBdICYmIGwueSA8IHR5W2ldWzFdICkgbGluZSA9IGk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZihjIT09LTEgJiYgbGluZSE9PS0xKXtcclxuICAgICAgICAgICAgaWQgPSBjICsgKGxpbmUqMik7XHJcbiAgICAgICAgICAgIGlmKGlkPnRoaXMubG5nLTEpIGlkID0gLTE7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gaWQ7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgRVZFTlRTXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgbW91c2V1cCAoIGUgKSB7XHJcblxyXG4gICAgICAgIGlmKCAhdGhpcy5pc0Rvd24gKSByZXR1cm4gZmFsc2VcclxuXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZVxyXG4gICAgICAgIGlmKCB0aGlzLnJlcyAhPT0gLTEgKXtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHRoaXMudmFsdWVzW3RoaXMucmVzXVxyXG4gICAgICAgICAgICB0aGlzLnNlbmQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW91c2Vtb3ZlKCBlIClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vkb3duICggZSApIHtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuaXNEb3duICkgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSB0cnVlXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW91c2Vtb3ZlKCBlIClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vtb3ZlICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IHVwID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5yZXMgPSB0aGlzLnRlc3Rab25lKCBlIClcclxuXHJcbiAgICAgICAgaWYoIHRoaXMucmVzICE9PSAtMSApe1xyXG4gICAgICAgICAgICB0aGlzLmN1cnNvcigncG9pbnRlcicpXHJcbiAgICAgICAgICAgIHVwID0gdGhpcy5tb2RlcyggdGhpcy5pc0Rvd24gPyAzIDogMiwgdGhpcy5yZXMgKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgXHR1cCA9IHRoaXMucmVzZXQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB1cDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBNT0RFXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIG1vZGVzICggTiA9IDEsIGlkID0gLTEgKSB7XHJcblxyXG4gICAgICAgIGxldCBpID0gdGhpcy5sbmcsIHcsIG4sIHIgPSBmYWxzZVxyXG5cclxuICAgICAgICB3aGlsZSggaS0tICl7XHJcblxyXG4gICAgICAgICAgICBuID0gTlxyXG4gICAgICAgICAgICB3ID0gdGhpcy5pc1NlbGVjdGFibGUgPyB0aGlzLnZhbHVlc1sgaSBdID09PSB0aGlzLnZhbHVlIDogZmFsc2VcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmKCBpID09PSBpZCApe1xyXG4gICAgICAgICAgICAgICAgaWYoIHcgJiYgbiA9PT0gMiApIG4gPSAzIFxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbiA9IDFcclxuICAgICAgICAgICAgICAgIGlmKCB3ICkgbiA9IDRcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYoIHRoaXMubW9kZSggbiwgaSApICkgciA9IHRydWVcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gclxyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb2RlICggbiwgaWQgKSB7XHJcblxyXG4gICAgICAgIGxldCBjaGFuZ2UgPSBmYWxzZTtcclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9ycywgcyA9IHRoaXMuYnV0dG9uc1xyXG4gICAgICAgIGxldCBpID0gaWRcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuc3RhdFtpZF0gIT09IG4gKXtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc3RhdFtpZF0gPSBuO1xyXG4gICAgICAgIFxyXG4gICAgICAgICAgICBzd2l0Y2goIG4gKXtcclxuXHJcbiAgICAgICAgICAgICAgICBjYXNlIDE6IHNbaV0uc3R5bGUuY29sb3IgPSBjYy50ZXh0OyBzW2ldLnN0eWxlLmJhY2tncm91bmQgPSBjYy5idXR0b247IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAyOiBzW2ldLnN0eWxlLmNvbG9yID0gY2MudGV4dE92ZXI7IHNbaV0uc3R5bGUuYmFja2dyb3VuZCA9IGNjLm92ZXJvZmY7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAzOiBzW2ldLnN0eWxlLmNvbG9yID0gY2MudGV4dE92ZXI7IHNbaV0uc3R5bGUuYmFja2dyb3VuZCA9IGNjLm92ZXI7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiBzW2ldLnN0eWxlLmNvbG9yID0gY2MudGV4dFNlbGVjdDsgc1tpXS5zdHlsZS5iYWNrZ3JvdW5kID0gY2Muc2VsZWN0OyBicmVhaztcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNoYW5nZSA9IHRydWU7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNoYW5nZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIHJlc2V0ICgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5yZXMgPSAtMVxyXG4gICAgICAgIHRoaXMuY3Vyc29yKClcclxuICAgICAgICByZXR1cm4gdGhpcy5tb2RlcygpXHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBsYWJlbCAoIHN0cmluZywgbiApIHtcclxuXHJcbiAgICAgICAgdGhpcy5idXR0b25zW25dLnRleHRDb250ZW50ID0gc3RyaW5nO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBpY29uICggc3RyaW5nLCB5LCBuICkge1xyXG5cclxuICAgICAgICB0aGlzLmJ1dHRvbnNbbl0uc3R5bGUucGFkZGluZyA9ICggeSB8fCAwICkgKydweCAwcHgnO1xyXG4gICAgICAgIHRoaXMuYnV0dG9uc1tuXS5pbm5lckhUTUwgPSBzdHJpbmc7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHRlc3RXICgpIHtcclxuXHJcbiAgICAgICAgbGV0IHZ3ID0gdGhpcy5zcGFjZXNbMF0qMyArIHRoaXMuYnNpemVNYXgqMiwgcnogPSBmYWxzZTtcclxuICAgICAgICBpZiggdncgPiB0aGlzLncgKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYnNpemVbMF0gPSAoIHRoaXMudy0odGhpcy5zcGFjZXNbMF0qMykgKSAqIDAuNTtcclxuICAgICAgICAgICAgcnogPSB0cnVlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmKCB0aGlzLmJzaXplWzBdICE9PSB0aGlzLmJzaXplTWF4ICkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ic2l6ZVswXSA9IHRoaXMuYnNpemVNYXg7XHJcbiAgICAgICAgICAgICAgICByeiA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCAhcnogKSByZXR1cm47XHJcblxyXG4gICAgICAgIGxldCBpID0gdGhpcy5idXR0b25zLmxlbmd0aDtcclxuICAgICAgICB3aGlsZShpLS0pIHRoaXMuYnV0dG9uc1tpXS5zdHlsZS53aWR0aCA9IHRoaXMuYnNpemVbMF0gKyAncHgnO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByU2l6ZSAoKSB7XHJcblxyXG4gICAgICAgIHN1cGVyLnJTaXplKCk7XHJcblxyXG4gICAgICAgIHRoaXMudGVzdFcoKTtcclxuXHJcbiAgICAgICAgbGV0IG4gPSAwLCBiLCBtaWQ7XHJcblxyXG4gICAgICAgIHRoaXMudG1wWCA9IFtdO1xyXG4gICAgICAgIHRoaXMudG1wWSA9IFtdO1xyXG5cclxuICAgICAgICBmb3IoIGxldCBqID0gMDsgaiA8IHRoaXMuZ3JpZFswXTsgaisrICl7XHJcblxyXG4gICAgICAgICAgICBpZihqPT09MCl7XHJcbiAgICAgICAgICAgICAgICBtaWQgPSAoIHRoaXMudyowLjUgKSAtICggdGhpcy5zcGFjZXNbMF0qMC41ICk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRtcFgucHVzaCggWyBtaWQtdGhpcy5ic2l6ZVswXSwgbWlkIF0gKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIG1pZCA9ICggdGhpcy53KjAuNSApICsgKCB0aGlzLnNwYWNlc1swXSowLjUgKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudG1wWC5wdXNoKCBbIG1pZCwgbWlkK3RoaXMuYnNpemVbMF0gXSApO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbWlkID0gdGhpcy5zcGFjZXNbMV07XHJcblxyXG4gICAgICAgIGZvciggbGV0IGkgPSAwOyBpIDwgdGhpcy5ncmlkWzFdOyBpKysgKXtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudG1wWS5wdXNoKCBbIG1pZCwgbWlkICsgdGhpcy5ic2l6ZVsxXSBdICk7XHJcbiAgICAgICAgICAgIG1pZCArPSB0aGlzLmJzaXplWzFdICsgdGhpcy5zcGFjZXNbMV07XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdG8gfSBmcm9tICcuLi9jb3JlL1Byb3RvLmpzJztcclxuaW1wb3J0IHsgVG9vbHMgfSBmcm9tICcuLi9jb3JlL1Rvb2xzLmpzJztcclxuaW1wb3J0IHsgVjIgfSBmcm9tICcuLi9jb3JlL1YyLmpzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQYWQyRCBleHRlbmRzIFByb3RvIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciggbyA9IHt9ICkge1xyXG5cclxuICAgICAgICBzdXBlciggbyApO1xyXG5cclxuICAgICAgICB0aGlzLmF1dG9XaWR0aCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMubWludyAgPSB0aGlzLndcclxuICAgICAgICB0aGlzLmRpYW0gPSBvLmRpYW0gfHwgdGhpcy53IFxyXG5cclxuICAgICAgICAvL3RoaXMubWFyZ2luID0gMTU7XHJcbiAgICAgICAgdGhpcy5wb3MgPSBuZXcgVjIoMCwwKTtcclxuICAgICAgICB0aGlzLm1heFBvcyA9IDkwXHJcblxyXG4gICAgICAgIHRoaXMubW9kZWwgPSBvLnN0eXBlIHx8IDA7XHJcbiAgICAgICAgaWYoIG8ubW9kZSAhPT0gdW5kZWZpbmVkICkgdGhpcy5tb2RlbCA9IG8ubW9kZTtcclxuXHJcbiAgICAgICAgdGhpcy5taW4gPSBvLm1pbiA9PT0gdW5kZWZpbmVkID8gLTEgOiBvLm1pbjtcclxuICAgICAgICB0aGlzLm1heCA9IG8ubWF4ID09PSB1bmRlZmluZWQgPyAxIDogby5tYXg7XHJcblxyXG4gICAgICAgIHRoaXMucmFuZ2UgPSAodGhpcy5tYXggLSB0aGlzLm1pbikqMC41OyAgXHJcblxyXG4gICAgICAgIHRoaXMuY21vZGUgPSAwO1xyXG5cclxuXHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyh0aGlzLnJhbmdlKVxyXG5cclxuICAgICAgICB0aGlzLmNbMF0uc3R5bGUuZGlzcGxheSA9ICdibG9jaydcclxuXHJcbiAgICAgICAgXHJcblxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5wcmVjaXNpb24gPSBvLnByZWNpc2lvbiA9PT0gdW5kZWZpbmVkID8gMiA6IG8ucHJlY2lzaW9uO1xyXG5cclxuICAgICAgICAvKnRoaXMuYm91bmRzID0ge307XHJcbiAgICAgICAgdGhpcy5ib3VuZHMueDEgPSBvLngxIHx8IC0xO1xyXG4gICAgICAgIHRoaXMuYm91bmRzLngyID0gby54MiB8fCAxO1xyXG4gICAgICAgIHRoaXMuYm91bmRzLnkxID0gby55MSB8fCAtMTtcclxuICAgICAgICB0aGlzLmJvdW5kcy55MiA9IG8ueTIgfHwgMTtcclxuXHJcbiAgICAgICAgdGhpcy5sZXJwWCA9IHRoaXMubGVycCggdGhpcy5tYXJnaW4sIHRoaXMudyAtIHRoaXMubWFyZ2luICwgdGhpcy5ib3VuZHMueDEsIHRoaXMuYm91bmRzLngyICk7XHJcbiAgICAgICAgdGhpcy5sZXJwWSA9IHRoaXMubGVycCggdGhpcy5tYXJnaW4sIHRoaXMudyAtIHRoaXMubWFyZ2luICwgdGhpcy5ib3VuZHMueTEsIHRoaXMuYm91bmRzLnkyICk7XHJcblxyXG4gICAgICAgIHRoaXMuYWxlcnBYID0gdGhpcy5sZXJwKCB0aGlzLmJvdW5kcy54MSwgdGhpcy5ib3VuZHMueDIsIHRoaXMubWFyZ2luLCB0aGlzLncgLSB0aGlzLm1hcmdpbiApO1xyXG4gICAgICAgIHRoaXMuYWxlcnBZID0gdGhpcy5sZXJwKCB0aGlzLmJvdW5kcy55MSwgdGhpcy5ib3VuZHMueTIsIHRoaXMubWFyZ2luLCB0aGlzLncgLSB0aGlzLm1hcmdpbiApOyovXHJcblxyXG4gICAgICAgIHRoaXMudmFsdWUgPSAoIEFycmF5LmlzQXJyYXkoIG8udmFsdWUgKSAmJiBvLnZhbHVlLmxlbmd0aCA9PSAyICkgPyBvLnZhbHVlIDogWyAwLCAwIF07XHJcbiAgICAgICAgXHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5oID0gby5oIHx8IHRoaXMudyArIDEwO1xyXG5cclxuICAgICAgICB0aGlzLmNbMF0uc3R5bGUud2lkdGggPSB0aGlzLncgKyAncHgnO1xyXG5cclxuICAgICAgICAvLyBUaXRsZVxyXG4gICAgICAgIGlmKCB0aGlzLmNbMV0gIT09IHVuZGVmaW5lZCApIHsgLy8gd2l0aCB0aXRsZVxyXG5cclxuICAgICAgICAgICAgdGhpcy5jWzFdLnN0eWxlLndpZHRoID0gJzEwMCUnO1xyXG4gICAgICAgICAgICB0aGlzLmNbMV0uc3R5bGUuanVzdGlmeUNvbnRlbnQgPSAnY2VudGVyJztcclxuICAgICAgICAgICAgdGhpcy50b3AgPSAxMDtcclxuICAgICAgICAgICAgdGhpcy5oICs9IDEwO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vdGhpcy50b3AgLT0gdGhpcy5tYXJnaW5cclxuXHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnNcclxuXHJcblxyXG4gICAgICAgIC8vIFZhbHVlXHJcbiAgICAgICAgdGhpcy5jWzJdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHQgKyAnanVzdGlmeS1jb250ZW50OmNlbnRlcjsgdG9wOicrICggdGhpcy5oIC0gMjAgKSArICdweDsgd2lkdGg6MTAwJTsgY29sb3I6JyArIGNjLnRleHQgKTtcclxuICAgICAgICB0aGlzLmNbMl0udGV4dENvbnRlbnQgPSB0aGlzLnZhbHVlO1xyXG5cclxuICAgICAgICAvLyBQYWRcclxuXHJcbiAgICAgICAgbGV0IHBhZCA9IHRoaXMuZ2V0UGFkMmQoKVxyXG5cclxuICAgICAgICB0aGlzLnNldFN2ZyggcGFkLCAnZmlsbCcsIGNjLmJhY2ssIDAgKVxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCBwYWQsICdmaWxsJywgY2MuYnV0dG9uLCAxIClcclxuICAgICAgICB0aGlzLnNldFN2ZyggcGFkLCAnc3Ryb2tlJywgY2MuYmFjaywgMiApXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHBhZCwgJ3N0cm9rZScsIGNjLmJhY2ssIDMgKVxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCBwYWQsICdzdHJva2UnLCBjYy50ZXh0LCA0IClcclxuXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHBhZCwgJ3ZpZXdCb3gnLCAnMCAwICcrdGhpcy5kaWFtKycgJyt0aGlzLmRpYW0gKVxyXG4gICAgICAgIHRoaXMuc2V0Q3NzKCBwYWQsIHsgd2lkdGg6dGhpcy5kaWFtLCBoZWlnaHQ6dGhpcy5kaWFtLCBsZWZ0OjAsIHRvcDp0aGlzLnRvcCB9KVxyXG5cclxuICAgICAgICB0aGlzLmNbM10gPSBwYWRcclxuXHJcbiAgICAgICAgdGhpcy5pbml0KClcclxuICAgICAgICB0aGlzLnNldFZhbHVlKClcclxuXHJcbiAgICB9XHJcbiAgICBcclxuICAgIHRlc3Rab25lICggZSApIHtcclxuICAgICAgICBcclxuICAgICAgICBsZXQgbCA9IHRoaXMubG9jYWw7XHJcblxyXG4gICAgICAgIGlmKCBsLnggPT09IC0xICYmIGwueSA9PT0gLTEgKSByZXR1cm4gJyc7XHJcblxyXG5cclxuXHJcbiAgICAgICAgaWYoIGwueSA8PSB0aGlzLmNbIDEgXS5vZmZzZXRIZWlnaHQgKSByZXR1cm4gJ3RpdGxlJztcclxuICAgICAgICBlbHNlIGlmICggbC55ID4gdGhpcy5oIC0gdGhpcy5jWyAyIF0ub2Zmc2V0SGVpZ2h0ICkgcmV0dXJuICd0ZXh0JztcclxuICAgICAgICBlbHNlIHJldHVybiAncGFkJztcclxuXHJcbiAgICAgICAgLyppZiggKCBsLnggPj0gdGhpcy5tYXJnaW4gKSAmJiAoIGwueCA8PSB0aGlzLncgLSB0aGlzLm1hcmdpbiApICYmICggbC55ID49IHRoaXMudG9wICsgdGhpcy5tYXJnaW4gKSAmJiAoIGwueSA8PSB0aGlzLnRvcCArIHRoaXMudyAtIHRoaXMubWFyZ2luICkgKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAncGFkJztcclxuICAgICAgICB9Ki9cclxuICAgICAgICBcclxuICAgICAgICAvL3JldHVybiAnJztcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2V1cCAoIGUgKSB7XHJcblxyXG4gICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2U7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZSgwKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vkb3duICggZSApIHtcclxuXHJcbiAgICAgICAgaWYgKCB0aGlzLnRlc3Rab25lKGUpID09PSAncGFkJyApIHtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuaXNEb3duID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5tb3VzZW1vdmUoIGUgKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW9kZSgxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlbW92ZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGlmKCAhdGhpcy5pc0Rvd24gKSByZXR1cm47XHJcblxyXG4gICAgICAgIGxldCB4ID0gKHRoaXMudyowLjUpIC0gKCBlLmNsaWVudFggLSB0aGlzLnpvbmUueCApXHJcbiAgICAgICAgbGV0IHkgPSAodGhpcy5kaWFtKjAuNSkgLSAoIGUuY2xpZW50WSAtIHRoaXMuem9uZS55IC0gdGhpcy55dG9wIClcclxuICAgICAgICBcclxuXHJcbiAgICAgICAgbGV0IHIgPSAyNTYgLyB0aGlzLmRpYW1cclxuXHJcbiAgICAgICAgeCA9IC0oeCpyKVxyXG4gICAgICAgIHkgPSAtKHkqcilcclxuXHJcbiAgICAgICAgeCA9IFRvb2xzLmNsYW1wKCB4LCAtdGhpcy5tYXhQb3MsIHRoaXMubWF4UG9zIClcclxuICAgICAgICB5ID0gVG9vbHMuY2xhbXAoIHksIC10aGlzLm1heFBvcywgdGhpcy5tYXhQb3MgKVxyXG5cclxuICAgICAgICAvL2xldCB4ID0gZS5jbGllbnRYIC0gdGhpcy56b25lLng7XHJcbiAgICAgICAgLy9sZXQgeSA9IGUuY2xpZW50WSAtIHRoaXMuem9uZS55IC0gdGhpcy50b3A7XHJcblxyXG4gICAgICAgIC8qaWYoIHggPCB0aGlzLm1hcmdpbiApIHggPSB0aGlzLm1hcmdpbjtcclxuICAgICAgICBpZiggeCA+IHRoaXMudyAtIHRoaXMubWFyZ2luICkgeCA9IHRoaXMudyAtIHRoaXMubWFyZ2luO1xyXG4gICAgICAgIGlmKCB5IDwgdGhpcy5tYXJnaW4gKSB5ID0gdGhpcy5tYXJnaW47XHJcbiAgICAgICAgaWYoIHkgPiB0aGlzLncgLSB0aGlzLm1hcmdpbiApIHkgPSB0aGlzLncgLSB0aGlzLm1hcmdpbjsqL1xyXG5cclxuICAgICAgICAvL2NvbnNvbGUubG9nKHgseSlcclxuXHJcbiAgICAgICAgdGhpcy5zZXRQb3MoIFsgeCAsIHkgXSApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMudXBkYXRlKCB0cnVlICk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vZGUgKCBtb2RlICkge1xyXG5cclxuICAgICAgICBpZiggdGhpcy5jbW9kZSA9PT0gbW9kZSApIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnNcclxuXHJcbiAgICAgICAgc3dpdGNoKCBtb2RlICl7XHJcbiAgICAgICAgICAgIGNhc2UgMDogLy8gYmFzZVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuc1syXS5jb2xvciA9IGNjLnRleHQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbCcsIGNjLmJhY2ssIDApXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbCcsIGNjLmJ1dHRvbiwgMSlcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjYy5iYWNrLCAyKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNjLmJhY2ssIDMpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgY2MudGV4dCwgNCApXHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTogLy8gZG93blxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuc1syXS5jb2xvciA9IGNjLnRleHRTZWxlY3Q7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbCcsIGNjLmJhY2tvZmYsIDApXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbCcsIGNjLm92ZXJvZmYsIDEpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgY2MuYmFja29mZiwgMilcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjYy5iYWNrb2ZmLCAzKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNjLnRleHRTZWxlY3QsIDQgKVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jbW9kZSA9IG1vZGU7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlICggdXAgKSB7XHJcblxyXG4gICAgICAgIC8vaWYoIHVwID09PSB1bmRlZmluZWQgKSB1cCA9IHRydWU7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5jWzJdLnRleHRDb250ZW50ID0gdGhpcy52YWx1ZTtcclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGVTVkcoKTtcclxuXHJcbiAgICAgICAgaWYoIHVwICkgdGhpcy5zZW5kKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZVNWRygpIHtcclxuXHJcbiAgICAgICAgaWYgKCB0aGlzLm1vZGVsID09IDEgKSB7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAneTEnLCB0aGlzLnBvcy55LCAyICk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICd5MicsIHRoaXMucG9zLnksIDIgKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICd4MScsIHRoaXMucG9zLngsIDMgKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3gyJywgdGhpcy5wb3MueCwgMyApO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdjeCcsIHRoaXMucG9zLngsIDQgKTtcclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnY3knLCB0aGlzLnBvcy55LCA0ICk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHNldFBvcyAoIHAgKSB7XHJcblxyXG4gICAgICAgIC8vaWYoIHAgPT09IHVuZGVmaW5lZCApIHAgPSBbIHRoaXMudyAvIDIsIHRoaXMudyAvIDIgXTtcclxuXHJcbiAgICAgICAgdGhpcy5wb3Muc2V0KCBwWzBdKzEyOCAsIHBbMV0rMTI4ICk7XHJcblxyXG4gICAgICAgIGxldCByID0gMS90aGlzLm1heFBvc1xyXG5cclxuICAgICAgICB0aGlzLnZhbHVlWzBdID0gKChwWzBdKnIpKnRoaXMucmFuZ2UpLnRvRml4ZWQoIHRoaXMucHJlY2lzaW9uICk7XHJcbiAgICAgICAgdGhpcy52YWx1ZVsxXSA9ICgocFsxXSpyKSp0aGlzLnJhbmdlKS50b0ZpeGVkKCB0aGlzLnByZWNpc2lvbiApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRWYWx1ZSAoIHYsIHVwID0gZmFsc2UgKSB7XHJcblxyXG4gICAgICAgIGlmKCB2ID09PSB1bmRlZmluZWQgKSB2ID0gdGhpcy52YWx1ZTtcclxuXHJcbiAgICAgICAgLyppZiAoIHZbMF0gPCB0aGlzLmJvdW5kcy54MSApIHZbMF0gPSB0aGlzLmJvdW5kcy54MTtcclxuICAgICAgICBpZiAoIHZbMF0gPiB0aGlzLmJvdW5kcy54MiApIHZbMF0gPSB0aGlzLmJvdW5kcy54MjtcclxuICAgICAgICBpZiAoIHZbMV0gPCB0aGlzLmJvdW5kcy55MSApIHZbMV0gPSB0aGlzLmJvdW5kcy55MTtcclxuICAgICAgICBpZiAoIHZbMV0gPiB0aGlzLmJvdW5kcy55MiApIHZbMV0gPSB0aGlzLmJvdW5kcy55MjsqL1xyXG5cclxuICAgICAgICB0aGlzLnZhbHVlWzBdID0gTWF0aC5taW4oIHRoaXMubWF4LCBNYXRoLm1heCggdGhpcy5taW4sIHZbMF0gKSApLnRvRml4ZWQoIHRoaXMucHJlY2lzaW9uICkgKiAxO1xyXG4gICAgICAgIHRoaXMudmFsdWVbMV0gPSBNYXRoLm1pbiggdGhpcy5tYXgsIE1hdGgubWF4KCB0aGlzLm1pbiwgdlsxXSApICkudG9GaXhlZCggdGhpcy5wcmVjaXNpb24gKSAqIDE7XHJcblxyXG4gICAgICAgIHRoaXMucG9zLnNldCggKCh0aGlzLnZhbHVlWzBdL3RoaXMucmFuZ2UpKnRoaXMubWF4UG9zKSsxMjggICwgKCh0aGlzLnZhbHVlWzFdL3RoaXMucmFuZ2UpKnRoaXMubWF4UG9zKSsxMjggKVxyXG5cclxuICAgICAgICAvL2NvbnNvbGUubG9nKHRoaXMucG9zKVxyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZSggdXAgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLypsZXJwKCBzMSwgczIsIGQxLCBkMiwgYyA9IHRydWUgKSB7XHJcblxyXG4gICAgICAgIGxldCBzID0gKCBkMiAtIGQxICkgLyAoIHMyIC0gczEgKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGMgPyAoIHYgKSA9PiB7IFxyXG4gICAgICAgICAgICByZXR1cm4gKCAoIHYgPCBzMSA/IHMxIDogdiA+IHMyID8gczIgOiB2ICkgLSBzMSApICogcyArIGQxXHJcbiAgICAgICAgfSA6ICggdiApID0+IHsgXHJcbiAgICAgICAgICByZXR1cm4gKCB2IC0gczEgKSAqIHMgKyBkMVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9Ki9cclxuXHJcbn0iLCJcclxuaW1wb3J0IHsgQm9vbCB9IGZyb20gJy4uL3Byb3RvL0Jvb2wuanMnO1xyXG5pbXBvcnQgeyBCdXR0b24gfSBmcm9tICcuLi9wcm90by9CdXR0b24uanMnO1xyXG5pbXBvcnQgeyBDaXJjdWxhciB9IGZyb20gJy4uL3Byb3RvL0NpcmN1bGFyLmpzJztcclxuaW1wb3J0IHsgQ29sb3IgfSBmcm9tICcuLi9wcm90by9Db2xvci5qcyc7XHJcbmltcG9ydCB7IEZwcyB9IGZyb20gJy4uL3Byb3RvL0Zwcy5qcyc7XHJcbmltcG9ydCB7IEdyYXBoIH0gZnJvbSAnLi4vcHJvdG8vR3JhcGguanMnO1xyXG5pbXBvcnQgeyBHcm91cCAgfSBmcm9tICcuLi9wcm90by9Hcm91cC5qcyc7XHJcbmltcG9ydCB7IEpveXN0aWNrIH0gZnJvbSAnLi4vcHJvdG8vSm95c3RpY2suanMnO1xyXG5pbXBvcnQgeyBLbm9iIH0gZnJvbSAnLi4vcHJvdG8vS25vYi5qcyc7XHJcbmltcG9ydCB7IExpc3QgfSBmcm9tICcuLi9wcm90by9MaXN0LmpzJztcclxuaW1wb3J0IHsgTnVtZXJpYyB9IGZyb20gJy4uL3Byb3RvL051bWVyaWMuanMnO1xyXG5pbXBvcnQgeyBTbGlkZSB9IGZyb20gJy4uL3Byb3RvL1NsaWRlLmpzJztcclxuaW1wb3J0IHsgVGV4dElucHV0IH0gZnJvbSAnLi4vcHJvdG8vVGV4dElucHV0LmpzJztcclxuaW1wb3J0IHsgVGl0bGUgfSBmcm9tICcuLi9wcm90by9UaXRsZS5qcyc7XHJcbmltcG9ydCB7IFNlbGVjdCB9IGZyb20gJy4uL3Byb3RvL1NlbGVjdC5qcyc7XHJcbmltcG9ydCB7IEJpdG1hcCB9IGZyb20gJy4uL3Byb3RvL0JpdG1hcC5qcyc7XHJcbmltcG9ydCB7IFNlbGVjdG9yIH0gZnJvbSAnLi4vcHJvdG8vU2VsZWN0b3IuanMnO1xyXG5pbXBvcnQgeyBFbXB0eSB9IGZyb20gJy4uL3Byb3RvL0VtcHR5LmpzJztcclxuaW1wb3J0IHsgSXRlbSB9IGZyb20gJy4uL3Byb3RvL0l0ZW0uanMnO1xyXG5pbXBvcnQgeyBHcmlkIH0gZnJvbSAnLi4vcHJvdG8vR3JpZC5qcyc7XHJcbmltcG9ydCB7IFBhZDJEIH0gZnJvbSAnLi4vcHJvdG8vUGFkMkQuanMnO1xyXG5pbXBvcnQgeyBSb290cyB9IGZyb20gJy4vUm9vdHMuanMnO1xyXG5cclxuZXhwb3J0IGNvbnN0IGFkZCA9IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgbGV0IGEgPSBhcmd1bWVudHM7IFxyXG5cclxuICAgICAgICBsZXQgdHlwZSwgbywgcmVmID0gZmFsc2UsIG4gPSBudWxsO1xyXG5cclxuICAgICAgICBpZiggdHlwZW9mIGFbMF0gPT09ICdzdHJpbmcnICl7IFxyXG5cclxuICAgICAgICAgICAgdHlwZSA9IGFbMF07XHJcbiAgICAgICAgICAgIG8gPSBhWzFdIHx8IHt9O1xyXG5cclxuICAgICAgICB9IGVsc2UgaWYgKCB0eXBlb2YgYVswXSA9PT0gJ29iamVjdCcgKXsgLy8gbGlrZSBkYXQgZ3VpXHJcblxyXG4gICAgICAgICAgICByZWYgPSB0cnVlO1xyXG4gICAgICAgICAgICBpZiggYVsyXSA9PT0gdW5kZWZpbmVkICkgW10ucHVzaC5jYWxsKGEsIHt9KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB0eXBlID0gYVsyXS50eXBlID8gYVsyXS50eXBlIDogYXV0b1R5cGUoIGFbMF1bYVsxXV0sIGFbMl0gKTtcclxuXHJcbiAgICAgICAgICAgIG8gPSBhWzJdO1xyXG4gICAgICAgICAgICBvLm5hbWUgPSBhWzFdO1xyXG4gICAgICAgICAgICBpZiAoby5oYXNPd25Qcm9wZXJ0eShcImRpc3BsYXlOYW1lXCIpKSBvLm5hbWUgPSBvLmRpc3BsYXlOYW1lO1xyXG5cclxuICAgICAgICAgICAgaWYoIHR5cGUgPT09ICdsaXN0JyAmJiAhby5saXN0ICl7IG8ubGlzdCA9IGFbMF1bYVsxXV07IH1cclxuICAgICAgICAgICAgZWxzZSBvLnZhbHVlID0gYVswXVthWzFdXTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgbmFtZSA9IHR5cGUudG9Mb3dlckNhc2UoKTtcclxuXHJcbiAgICAgICAgaWYoIG5hbWUgPT09ICdncm91cCcgKXsgXHJcbiAgICAgICAgICAgIG8uYWRkID0gYWRkO1xyXG4gICAgICAgICAgICAvL28uZHggPSA4XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzd2l0Y2goIG5hbWUgKXtcclxuXHJcbiAgICAgICAgICAgIGNhc2UgJ2Jvb2wnOiBjYXNlICdib29sZWFuJzogbiA9IG5ldyBCb29sKG8pOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnYnV0dG9uJzogbiA9IG5ldyBCdXR0b24obyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdjaXJjdWxhcic6IG4gPSBuZXcgQ2lyY3VsYXIobyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdjb2xvcic6IG4gPSBuZXcgQ29sb3Iobyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdmcHMnOiBuID0gbmV3IEZwcyhvKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2dyYXBoJzogbiA9IG5ldyBHcmFwaChvKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2dyb3VwJzogbiA9IG5ldyBHcm91cChvKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2pveXN0aWNrJzogbiA9IG5ldyBKb3lzdGljayhvKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2tub2InOiBuID0gbmV3IEtub2Iobyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdsaXN0JzogbiA9IG5ldyBMaXN0KG8pOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnbnVtZXJpYyc6IGNhc2UgJ251bWJlcic6IG4gPSBuZXcgTnVtZXJpYyhvKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NsaWRlJzogbiA9IG5ldyBTbGlkZShvKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3RleHRJbnB1dCc6IGNhc2UgJ3N0cmluZyc6IG4gPSBuZXcgVGV4dElucHV0KG8pOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAndGl0bGUnOiBjYXNlICd0ZXh0JzogbiA9IG5ldyBUaXRsZShvKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3NlbGVjdCc6IG4gPSBuZXcgU2VsZWN0KG8pOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnYml0bWFwJzogbiA9IG5ldyBCaXRtYXAobyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdzZWxlY3Rvcic6IG4gPSBuZXcgU2VsZWN0b3Iobyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdlbXB0eSc6IGNhc2UgJ3NwYWNlJzogbiA9IG5ldyBFbXB0eShvKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2l0ZW0nOiBuID0gbmV3IEl0ZW0obyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdncmlkJzogbiA9IG5ldyBHcmlkKG8pOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAncGFkMmQnOiBjYXNlICdwYWQnOiBuID0gbmV3IFBhZDJEKG8pOyBicmVhaztcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBcclxuXHJcbiAgICAgICAgaWYoIG4gIT09IG51bGwgKXtcclxuXHJcbiAgICAgICAgICAgIFJvb3RzLm5lZWRSZXNpemUgPSB0cnVlXHJcblxyXG4gICAgICAgICAgICBpZiggcmVmICkgbi5zZXRSZWZlcmVuY3koIGFbMF0sIGFbMV0gKTtcclxuICAgICAgICAgICAgcmV0dXJuIG47XHJcblxyXG4gICAgICAgIH1cclxuXHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBhdXRvVHlwZSA9IGZ1bmN0aW9uICggdiwgbyApIHtcclxuXHJcbiAgICBsZXQgdHlwZSA9ICdzbGlkZSdcclxuXHJcbiAgICBpZiggdHlwZW9mIHYgPT09ICdib29sZWFuJyApIHR5cGUgPSAnYm9vbCcgXHJcbiAgICBlbHNlIGlmKCB0eXBlb2YgdiA9PT0gJ3N0cmluZycgKXsgXHJcblxyXG4gICAgICAgIGlmKCB2LnN1YnN0cmluZygwLDEpID09PSAnIycgKSB0eXBlID0gJ2NvbG9yJ1xyXG4gICAgICAgIGVsc2UgdHlwZSA9ICdzdHJpbmcnIFxyXG5cclxuICAgIH0gZWxzZSBpZiggdHlwZW9mIHYgPT09ICdudW1iZXInICl7IFxyXG5cclxuICAgICAgICBpZiggby5jdHlwZSApIHR5cGUgPSAnY29sb3InXHJcbiAgICAgICAgZWxzZSB0eXBlID0gJ3NsaWRlJ1xyXG5cclxuICAgIH0gZWxzZSBpZiggdHlwZW9mIHYgPT09ICdhcnJheScgJiYgdiBpbnN0YW5jZW9mIEFycmF5ICl7XHJcblxyXG4gICAgICAgIGlmKCB0eXBlb2YgdlswXSA9PT0gJ251bWJlcicgKSB0eXBlID0gJ251bWJlcidcclxuICAgICAgICBlbHNlIGlmKCB0eXBlb2YgdlswXSA9PT0gJ3N0cmluZycgKSB0eXBlID0gJ2xpc3QnXHJcblxyXG4gICAgfSBlbHNlIGlmKCB0eXBlb2YgdiA9PT0gJ29iamVjdCcgJiYgdiBpbnN0YW5jZW9mIE9iamVjdCApe1xyXG5cclxuICAgICAgICBpZiggdi54ICE9PSB1bmRlZmluZWQgKSB0eXBlID0gJ251bWJlcidcclxuICAgICAgICBlbHNlIHR5cGUgPSAnbGlzdCdcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHR5cGVcclxuXHJcbn0iLCJpbXBvcnQgeyBSb290cyB9IGZyb20gXCIuL1Jvb3RzLmpzXCI7XHJcbmltcG9ydCB7IFRvb2xzIH0gZnJvbSBcIi4vVG9vbHMuanNcIjtcclxuaW1wb3J0IHsgYWRkIH0gZnJvbSBcIi4vYWRkLmpzXCI7XHJcbmltcG9ydCB7IFYyIH0gZnJvbSBcIi4vVjIuanNcIjtcclxuXHJcbi8qKlxyXG4gKiBAYXV0aG9yIGx0aCAvIGh0dHBzOi8vZ2l0aHViLmNvbS9sby10aFxyXG4gKi9cclxuXHJcbmV4cG9ydCBjbGFzcyBHdWkge1xyXG4gIGNvbnN0cnVjdG9yKG8gPSB7fSkge1xyXG4gICAgdGhpcy5pc0d1aSA9IHRydWU7XHJcblxyXG4gICAgdGhpcy5uYW1lID0gXCJndWlcIjtcclxuXHJcbiAgICAvLyBmb3IgM2RcclxuICAgIHRoaXMuY2FudmFzID0gbnVsbDtcclxuICAgIHRoaXMuc2NyZWVuID0gbnVsbDtcclxuICAgIHRoaXMucGxhbmUgPSBvLnBsYW5lIHx8IG51bGw7XHJcblxyXG4gICAgLy8gY29sb3JcclxuICAgIGlmIChvLmNvbmZpZykgby5jb2xvcnMgPSBvLmNvbmZpZztcclxuICAgIGlmIChvLmNvbG9ycykgdGhpcy5zZXRDb25maWcoby5jb2xvcnMpO1xyXG4gICAgZWxzZSB0aGlzLmNvbG9ycyA9IFRvb2xzLmRlZmluZUNvbG9yKG8pO1xyXG5cclxuICAgIC8vdGhpcy5jbGVhbm5pbmcgPSBmYWxzZVxyXG5cclxuICAgIC8vIHN0eWxlXHJcbiAgICB0aGlzLmNzcyA9IFRvb2xzLmNsb25lQ3NzKCk7XHJcblxyXG4gICAgdGhpcy5pc1Jlc2V0ID0gdHJ1ZTtcclxuICAgIHRoaXMudG1wQWRkID0gbnVsbDtcclxuICAgIC8vdGhpcy50bXBIID0gMFxyXG5cclxuICAgIHRoaXMuaXNDYW52YXMgPSBvLmlzQ2FudmFzIHx8IGZhbHNlO1xyXG4gICAgdGhpcy5pc0NhbnZhc09ubHkgPSBmYWxzZTtcclxuXHJcbiAgICAvLyBNb2RpZmllZCBieSBGZWRlbWFyaW5vXHJcbiAgICAvLyBvcHRpb24gdG8gZGVmaW5lIHdoZXRoZXIgdGhlIGV2ZW50IGxpc3RlbmVycyBzaG91bGQgYmUgYWRkZWQgb3Igbm90XHJcbiAgICBSb290cy5hZGRET01FdmVudExpc3RlbmVycyA9IG8uaGFzT3duUHJvcGVydHkoXCJhZGRET01FdmVudExpc3RlbmVyc1wiKVxyXG4gICAgICA/IG8uYWRkRE9NRXZlbnRMaXN0ZW5lcnNcclxuICAgICAgOiB0cnVlO1xyXG5cclxuICAgIHRoaXMuY2FsbGJhY2sgPSBvLmNhbGxiYWNrID09PSB1bmRlZmluZWQgPyBudWxsIDogby5jYWxsYmFjaztcclxuXHJcbiAgICB0aGlzLmZvcmNlSGVpZ2h0ID0gby5tYXhIZWlnaHQgfHwgMDtcclxuICAgIHRoaXMubG9ja0hlaWdodCA9IG8ubG9ja0hlaWdodCB8fCBmYWxzZTtcclxuXHJcbiAgICB0aGlzLmlzSXRlbU1vZGUgPSBvLml0ZW1Nb2RlICE9PSB1bmRlZmluZWQgPyBvLml0ZW1Nb2RlIDogZmFsc2U7XHJcblxyXG4gICAgdGhpcy5jbiA9IFwiXCI7XHJcblxyXG4gICAgLy8gc2l6ZSBkZWZpbmVcclxuICAgIHRoaXMuc2l6ZSA9IFRvb2xzLnNpemU7XHJcbiAgICBpZiAoby5wICE9PSB1bmRlZmluZWQpIHRoaXMuc2l6ZS5wID0gby5wO1xyXG4gICAgaWYgKG8udyAhPT0gdW5kZWZpbmVkKSB0aGlzLnNpemUudyA9IG8udztcclxuICAgIGlmIChvLmggIT09IHVuZGVmaW5lZCkgdGhpcy5zaXplLmggPSBvLmg7XHJcbiAgICBpZiAoby5zICE9PSB1bmRlZmluZWQpIHRoaXMuc2l6ZS5zID0gby5zO1xyXG5cclxuICAgIHRoaXMuc2l6ZS5oID0gdGhpcy5zaXplLmggPCAxMSA/IDExIDogdGhpcy5zaXplLmg7XHJcblxyXG4gICAgLy8gbG9jYWwgbW91c2UgYW5kIHpvbmVcclxuICAgIHRoaXMubG9jYWwgPSBuZXcgVjIoKS5uZWcoKTtcclxuICAgIHRoaXMuem9uZSA9IHsgeDogMCwgeTogMCwgdzogdGhpcy5zaXplLncsIGg6IDAgfTtcclxuXHJcbiAgICAvLyB2aXJ0dWFsIG1vdXNlXHJcbiAgICB0aGlzLm1vdXNlID0gbmV3IFYyKCkubmVnKCk7XHJcblxyXG4gICAgdGhpcy5oID0gMDtcclxuICAgIC8vdGhpcy5wcmV2WSA9IC0xO1xyXG4gICAgdGhpcy5zdyA9IDA7XHJcblxyXG4gICAgdGhpcy5tYXJnaW4gPSB0aGlzLmNvbG9ycy5zeTtcclxuICAgIHRoaXMubWFyZ2luRGl2ID0gVG9vbHMuaXNEaXZpZCh0aGlzLm1hcmdpbik7XHJcblxyXG4gICAgLy8gYm90dG9tIGFuZCBjbG9zZSBoZWlnaHRcclxuICAgIHRoaXMuaXNXaXRoQ2xvc2UgPSBvLmNsb3NlICE9PSB1bmRlZmluZWQgPyBvLmNsb3NlIDogdHJ1ZTtcclxuICAgIHRoaXMuYmggPSAhdGhpcy5pc1dpdGhDbG9zZSA/IDAgOiB0aGlzLnNpemUuaDtcclxuXHJcbiAgICB0aGlzLmF1dG9SZXNpemUgPSBvLmF1dG9SZXNpemUgPT09IHVuZGVmaW5lZCA/IHRydWUgOiBvLmF1dG9SZXNpemU7XHJcblxyXG4gICAgLy8gZGVmYXVsdCBwb3NpdGlvblxyXG4gICAgdGhpcy5pc0NlbnRlciA9IG8uY2VudGVyIHx8IGZhbHNlO1xyXG4gICAgdGhpcy5jc3NHdWkgPVxyXG4gICAgICBvLmNzcyAhPT0gdW5kZWZpbmVkID8gby5jc3MgOiB0aGlzLmlzQ2VudGVyID8gXCJcIiA6IFwicmlnaHQ6MTBweDtcIjtcclxuXHJcbiAgICB0aGlzLmlzT3BlbiA9IG8ub3BlbiAhPT0gdW5kZWZpbmVkID8gby5vcGVuIDogdHJ1ZTtcclxuICAgIHRoaXMuaXNEb3duID0gZmFsc2U7XHJcbiAgICB0aGlzLmlzU2Nyb2xsID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy51aXMgPSBbXTtcclxuICAgIHRoaXMuY3VycmVudCA9IC0xO1xyXG4gICAgdGhpcy5wcm90byA9IG51bGw7XHJcbiAgICB0aGlzLmlzRW1wdHkgPSB0cnVlO1xyXG4gICAgdGhpcy5kZWNhbCA9IDA7XHJcbiAgICB0aGlzLnJhdGlvID0gMTtcclxuICAgIHRoaXMub3kgPSAwO1xyXG5cclxuICAgIHRoaXMuaXNOZXdUYXJnZXQgPSBmYWxzZTtcclxuXHJcbiAgICBsZXQgY2MgPSB0aGlzLmNvbG9ycztcclxuXHJcbiAgICB0aGlzLmNvbnRlbnQgPSBUb29scy5kb20oXHJcbiAgICAgIFwiZGl2XCIsXHJcbiAgICAgIHRoaXMuY3NzLmJhc2ljICtcclxuICAgICAgICBcIiB3aWR0aDowcHg7IGhlaWdodDphdXRvOyB0b3A6MHB4OyBiYWNrZ3JvdW5kOlwiICtcclxuICAgICAgICBjYy5jb250ZW50ICtcclxuICAgICAgICBcIjsgXCIgK1xyXG4gICAgICAgIHRoaXMuY3NzR3VpXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuaW5uZXJDb250ZW50ID0gVG9vbHMuZG9tKFxyXG4gICAgICBcImRpdlwiLFxyXG4gICAgICB0aGlzLmNzcy5iYXNpYyArXHJcbiAgICAgICAgXCJ3aWR0aDoxMDAlOyB0b3A6MDsgbGVmdDowOyBoZWlnaHQ6YXV0bzsgb3ZlcmZsb3c6aGlkZGVuO1wiXHJcbiAgICApO1xyXG4gICAgLy90aGlzLmlubmVyQ29udGVudCA9IFRvb2xzLmRvbSggJ2RpdicsIHRoaXMuY3NzLmJhc2ljICsgdGhpcy5jc3MuYnV0dG9uICsgJ3dpZHRoOjEwMCU7IHRvcDowOyBsZWZ0OjA7IGhlaWdodDphdXRvOyBvdmVyZmxvdzpoaWRkZW47Jyk7XHJcbiAgICB0aGlzLmNvbnRlbnQuYXBwZW5kQ2hpbGQodGhpcy5pbm5lckNvbnRlbnQpO1xyXG5cclxuICAgIC8vdGhpcy5pbm5lciA9IFRvb2xzLmRvbSggJ2RpdicsIHRoaXMuY3NzLmJhc2ljICsgJ3dpZHRoOjEwMCU7IGxlZnQ6MDsgJylcclxuICAgIHRoaXMudXNlRmxleCA9IHRydWU7XHJcbiAgICBsZXQgZmxleGlibGUgPSB0aGlzLnVzZUZsZXggPyBcImRpc3BsYXk6ZmxleDsgZmxleC1mbG93OiByb3cgd3JhcDtcIiA6IFwiXCI7IC8vJyBkaXNwbGF5OmZsZXg7IGp1c3RpZnktY29udGVudDpzdGFydDsgYWxpZ24taXRlbXM6c3RhcnQ7ZmxleC1kaXJlY3Rpb246IGNvbHVtbjsganVzdGlmeS1jb250ZW50OiBjZW50ZXI7IGFsaWduLWl0ZW1zOiBjZW50ZXI7JztcclxuICAgIHRoaXMuaW5uZXIgPSBUb29scy5kb20oXHJcbiAgICAgIFwiZGl2XCIsXHJcbiAgICAgIHRoaXMuY3NzLmJhc2ljICsgZmxleGlibGUgKyBcIndpZHRoOjEwMCU7IGxlZnQ6MDsgXCJcclxuICAgICk7XHJcbiAgICB0aGlzLmlubmVyQ29udGVudC5hcHBlbmRDaGlsZCh0aGlzLmlubmVyKTtcclxuXHJcbiAgICAvLyBzY3JvbGxcclxuICAgIHRoaXMuc2Nyb2xsQkcgPSBUb29scy5kb20oXHJcbiAgICAgIFwiZGl2XCIsXHJcbiAgICAgIHRoaXMuY3NzLmJhc2ljICtcclxuICAgICAgICBcInJpZ2h0OjA7IHRvcDowOyB3aWR0aDpcIiArXHJcbiAgICAgICAgKHRoaXMuc2l6ZS5zIC0gMSkgK1xyXG4gICAgICAgIFwicHg7IGhlaWdodDoxMHB4OyBkaXNwbGF5Om5vbmU7IGJhY2tncm91bmQ6XCIgK1xyXG4gICAgICAgIGNjLmJhY2tncm91bmQgK1xyXG4gICAgICAgIFwiO1wiXHJcbiAgICApO1xyXG4gICAgdGhpcy5jb250ZW50LmFwcGVuZENoaWxkKHRoaXMuc2Nyb2xsQkcpO1xyXG5cclxuICAgIHRoaXMuc2Nyb2xsID0gVG9vbHMuZG9tKFxyXG4gICAgICBcImRpdlwiLFxyXG4gICAgICB0aGlzLmNzcy5iYXNpYyArXHJcbiAgICAgICAgXCJiYWNrZ3JvdW5kOlwiICtcclxuICAgICAgICBjYy5idXR0b24gK1xyXG4gICAgICAgIFwiOyByaWdodDoycHg7IHRvcDowOyB3aWR0aDpcIiArXHJcbiAgICAgICAgKHRoaXMuc2l6ZS5zIC0gNCkgK1xyXG4gICAgICAgIFwicHg7IGhlaWdodDoxMHB4O1wiXHJcbiAgICApO1xyXG4gICAgdGhpcy5zY3JvbGxCRy5hcHBlbmRDaGlsZCh0aGlzLnNjcm9sbCk7XHJcblxyXG4gICAgLy8gYm90dG9tIGJ1dHRvblxyXG4gICAgdGhpcy5ib3R0b21UZXh0ID0gby5ib3R0b21UZXh0IHx8IFtcIm9wZW5cIiwgXCJjbG9zZVwiXTtcclxuXHJcbiAgICBsZXQgciA9IGNjLnJhZGl1cztcclxuICAgIHRoaXMuYm90dG9tID0gVG9vbHMuZG9tKFxyXG4gICAgICBcImRpdlwiLFxyXG4gICAgICB0aGlzLmNzcy50eHQgK1xyXG4gICAgICAgIFwid2lkdGg6MTAwJTsgdG9wOmF1dG87IGJvdHRvbTowOyBsZWZ0OjA7IGJvcmRlci1ib3R0b20tcmlnaHQtcmFkaXVzOlwiICtcclxuICAgICAgICByICtcclxuICAgICAgICBcInB4OyBib3JkZXItYm90dG9tLWxlZnQtcmFkaXVzOlwiICtcclxuICAgICAgICByICtcclxuICAgICAgICBcInB4OyBqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyOyBoZWlnaHQ6XCIgK1xyXG4gICAgICAgIHRoaXMuYmggK1xyXG4gICAgICAgIFwicHg7IGxpbmUtaGVpZ2h0OlwiICtcclxuICAgICAgICAodGhpcy5iaCAtIDUpICtcclxuICAgICAgICBcInB4OyBjb2xvcjpcIiArXHJcbiAgICAgICAgY2MudGV4dCArXHJcbiAgICAgICAgXCI7XCJcclxuICAgICk7IC8vIGJvcmRlci10b3A6MXB4IHNvbGlkICcrVG9vbHMuY29sb3JzLnN0cm9rZSsnOycpO1xyXG4gICAgdGhpcy5jb250ZW50LmFwcGVuZENoaWxkKHRoaXMuYm90dG9tKTtcclxuICAgIHRoaXMuYm90dG9tLnRleHRDb250ZW50ID0gdGhpcy5pc09wZW5cclxuICAgICAgPyB0aGlzLmJvdHRvbVRleHRbMV1cclxuICAgICAgOiB0aGlzLmJvdHRvbVRleHRbMF07XHJcbiAgICB0aGlzLmJvdHRvbS5zdHlsZS5iYWNrZ3JvdW5kID0gY2MuYmFja2dyb3VuZDtcclxuXHJcbiAgICAvL1xyXG5cclxuICAgIHRoaXMucGFyZW50ID0gby5wYXJlbnQgIT09IHVuZGVmaW5lZCA/IG8ucGFyZW50IDogbnVsbDtcclxuICAgIHRoaXMucGFyZW50ID0gby50YXJnZXQgIT09IHVuZGVmaW5lZCA/IG8udGFyZ2V0IDogdGhpcy5wYXJlbnQ7XHJcblxyXG4gICAgaWYgKHRoaXMucGFyZW50ID09PSBudWxsICYmICF0aGlzLmlzQ2FudmFzKSB7XHJcbiAgICAgIHRoaXMucGFyZW50ID0gZG9jdW1lbnQuYm9keTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5wYXJlbnQgIT09IG51bGwpIHRoaXMucGFyZW50LmFwcGVuZENoaWxkKHRoaXMuY29udGVudCk7XHJcblxyXG4gICAgaWYgKHRoaXMuaXNDYW52YXMgJiYgdGhpcy5wYXJlbnQgPT09IG51bGwpIHRoaXMuaXNDYW52YXNPbmx5ID0gdHJ1ZTtcclxuXHJcbiAgICBpZiAoIXRoaXMuaXNDYW52YXNPbmx5KSB7XHJcbiAgICAgIHRoaXMuY29udGVudC5zdHlsZS5wb2ludGVyRXZlbnRzID0gXCJhdXRvXCI7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLmNvbnRlbnQuc3R5bGUubGVmdCA9IFwiMHB4XCI7XHJcbiAgICAgIHRoaXMuY29udGVudC5zdHlsZS5yaWdodCA9IFwiYXV0b1wiO1xyXG4gICAgICBvLnRyYW5zaXRpb24gPSAwO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGhlaWdodCB0cmFuc2l0aW9uXHJcbiAgICB0aGlzLnRyYW5zaXRpb24gPVxyXG4gICAgICBvLnRyYW5zaXRpb24gIT09IHVuZGVmaW5lZCA/IG8udHJhbnNpdGlvbiA6IFRvb2xzLnRyYW5zaXRpb247XHJcbiAgICBpZiAodGhpcy50cmFuc2l0aW9uKSBzZXRUaW1lb3V0KHRoaXMuYWRkVHJhbnNpdGlvbi5iaW5kKHRoaXMpLCAxMDAwKTtcclxuXHJcbiAgICB0aGlzLnNldFdpZHRoKCk7XHJcblxyXG4gICAgaWYgKHRoaXMuaXNDYW52YXMpIHRoaXMubWFrZUNhbnZhcygpO1xyXG5cclxuICAgIFJvb3RzLmFkZCh0aGlzKTtcclxuICB9XHJcblxyXG4gIHRyaWdnZXJNb3VzZURvd24oeCwgeSkge1xyXG4gICAgUm9vdHMuaGFuZGxlRXZlbnQoe1xyXG4gICAgICB0eXBlOiBcInBvaW50ZXJkb3duXCIsXHJcbiAgICAgIGNsaWVudFg6IHgsXHJcbiAgICAgIGNsaWVudFk6IHksXHJcbiAgICAgIGRlbHRhOiAwLFxyXG4gICAgICBrZXk6IG51bGwsXHJcbiAgICAgIGtleUNvZGU6IE5hTixcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdHJpZ2dlck1vdXNlTW92ZSgpIHtcclxuICAgIFJvb3RzLmhhbmRsZUV2ZW50KHtcclxuICAgICAgdHlwZTogXCJwb2ludGVybW92ZVwiLFxyXG4gICAgICBjbGllbnRYOiAtMSxcclxuICAgICAgY2xpZW50WTogLTEsXHJcbiAgICAgIGRlbHRhOiAwLFxyXG4gICAgICBrZXk6IG51bGwsXHJcbiAgICAgIGtleUNvZGU6IE5hTixcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgdHJpZ2dlck1vdXNlVXAoeCwgeSkge1xyXG4gICAgLypcclxuXHJcbiAgICAgICAgY2xpZW50WCxjbGllbnRZIGFyZSBubyB1c2VkIHdoZW4gaXNDYW52YXM9PXRydWVcclxuICAgICAgICAqL1xyXG4gICAgUm9vdHMuaGFuZGxlRXZlbnQoe1xyXG4gICAgICB0eXBlOiBcInBvaW50ZXJ1cFwiLFxyXG4gICAgICBjbGllbnRYOiB4LFxyXG4gICAgICBjbGllbnRZOiB5LFxyXG4gICAgICBkZWx0YTogMCxcclxuICAgICAga2V5OiBudWxsLFxyXG4gICAgICBrZXlDb2RlOiBOYU4sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHNldFRvcCh0LCBoKSB7XHJcbiAgICB0aGlzLmNvbnRlbnQuc3R5bGUudG9wID0gdCArIFwicHhcIjtcclxuICAgIGlmIChoICE9PSB1bmRlZmluZWQpIHRoaXMuZm9yY2VIZWlnaHQgPSBoO1xyXG4gICAgdGhpcy5jYWxjKCk7XHJcblxyXG4gICAgUm9vdHMubmVlZFJlWm9uZSA9IHRydWU7XHJcbiAgfVxyXG5cclxuICBhZGRUcmFuc2l0aW9uKCkge1xyXG4gICAgaWYgKHRoaXMudHJhbnNpdGlvbiAmJiAhdGhpcy5pc0NhbnZhcykge1xyXG4gICAgICB0aGlzLmlubmVyQ29udGVudC5zdHlsZS50cmFuc2l0aW9uID1cclxuICAgICAgICBcImhlaWdodCBcIiArIHRoaXMudHJhbnNpdGlvbiArIFwicyBlYXNlLW91dFwiO1xyXG4gICAgICB0aGlzLmNvbnRlbnQuc3R5bGUudHJhbnNpdGlvbiA9XHJcbiAgICAgICAgXCJoZWlnaHQgXCIgKyB0aGlzLnRyYW5zaXRpb24gKyBcInMgZWFzZS1vdXRcIjtcclxuICAgICAgdGhpcy5ib3R0b20uc3R5bGUudHJhbnNpdGlvbiA9IFwidG9wIFwiICsgdGhpcy50cmFuc2l0aW9uICsgXCJzIGVhc2Utb3V0XCI7XHJcbiAgICAgIC8vdGhpcy5ib3R0b20uYWRkRXZlbnRMaXN0ZW5lcihcInRyYW5zaXRpb25lbmRcIiwgUm9vdHMucmVzaXplLCB0cnVlKTtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgaSA9IHRoaXMudWlzLmxlbmd0aDtcclxuICAgIHdoaWxlIChpLS0pIHRoaXMudWlzW2ldLmFkZFRyYW5zaXRpb24oKTtcclxuICB9XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyAgIENBTlZBU1xyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgb25EcmF3KCkge31cclxuXHJcbiAgbWFrZUNhbnZhcygpIHtcclxuICAgIHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKFxyXG4gICAgICBcImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIixcclxuICAgICAgXCJjYW52YXNcIlxyXG4gICAgKTtcclxuICAgIHRoaXMuY2FudmFzLndpZHRoID0gdGhpcy56b25lLnc7XHJcbiAgICB0aGlzLmNhbnZhcy5oZWlnaHQgPSB0aGlzLmZvcmNlSGVpZ2h0ID8gdGhpcy5mb3JjZUhlaWdodCA6IHRoaXMuem9uZS5oO1xyXG5cclxuICAgIC8vY29uc29sZS5sb2coIHRoaXMuY2FudmFzLndpZHRoLCB0aGlzLmNhbnZhcy5oZWlnaHQgKVxyXG4gIH1cclxuXHJcbiAgZHJhdyhmb3JjZSkge1xyXG4gICAgaWYgKHRoaXMuY2FudmFzID09PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgbGV0IHcgPSB0aGlzLnpvbmUudztcclxuICAgIGxldCBoID0gdGhpcy5mb3JjZUhlaWdodCA/IHRoaXMuZm9yY2VIZWlnaHQgOiB0aGlzLnpvbmUuaDtcclxuICAgIFJvb3RzLnRvQ2FudmFzKHRoaXMsIHcsIGgsIGZvcmNlKTtcclxuICB9XHJcblxyXG4gIC8vLy8vL1xyXG5cclxuICBnZXREb20oKSB7XHJcbiAgICByZXR1cm4gdGhpcy5jb250ZW50O1xyXG4gIH1cclxuXHJcbiAgbm9Nb3VzZSgpIHtcclxuICAgIHRoaXMubW91c2UubmVnKCk7XHJcbiAgfVxyXG5cclxuICBzZXRNb3VzZSh1diwgZmxpcCA9IHRydWUpIHtcclxuICAgIGlmIChmbGlwKVxyXG4gICAgICB0aGlzLm1vdXNlLnNldChcclxuICAgICAgICBNYXRoLnJvdW5kKHV2LnggKiB0aGlzLmNhbnZhcy53aWR0aCksXHJcbiAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0IC0gTWF0aC5yb3VuZCh1di55ICogdGhpcy5jYW52YXMuaGVpZ2h0KVxyXG4gICAgICApO1xyXG4gICAgZWxzZVxyXG4gICAgICB0aGlzLm1vdXNlLnNldChcclxuICAgICAgICBNYXRoLnJvdW5kKHV2LnggKiB0aGlzLmNhbnZhcy53aWR0aCksXHJcbiAgICAgICAgTWF0aC5yb3VuZCh1di55ICogdGhpcy5jYW52YXMuaGVpZ2h0KVxyXG4gICAgICApO1xyXG4gICAgLy90aGlzLm1vdXNlLnNldCggbS54LCBtLnkgKTtcclxuXHJcbiAgICAvL2NvbnNvbGUubG9nKFwic2V0TW91c2UgXCIrdXYueCtcIiBcIit1di55KVxyXG4gIH1cclxuXHJcbiAgc2V0Q29uZmlnKG8pIHtcclxuICAgIC8vIHJlc2V0IHRvIGRlZmF1bHQgdGV4dFxyXG4gICAgVG9vbHMuc2V0VGV4dCgpO1xyXG4gICAgdGhpcy5jb2xvcnMgPSBUb29scy5kZWZpbmVDb2xvcihvKTtcclxuICB9XHJcblxyXG4gIHNldENvbG9ycyhvKSB7XHJcbiAgICBmb3IgKGxldCBjIGluIG8pIHtcclxuICAgICAgaWYgKHRoaXMuY29sb3JzW2NdKSB0aGlzLmNvbG9yc1tjXSA9IG9bY107XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBzZXRUZXh0KHNpemUsIGNvbG9yLCBmb250LCBzaGFkb3cpIHtcclxuICAgIFRvb2xzLnNldFRleHQoc2l6ZSwgY29sb3IsIGZvbnQsIHNoYWRvdyk7XHJcbiAgfVxyXG5cclxuICBoaWRlKGIpIHtcclxuICAgIHRoaXMuY29udGVudC5zdHlsZS52aXNpYmlsaXR5ID0gYiA/IFwiaGlkZGVuXCIgOiBcInZpc2libGVcIjtcclxuICB9XHJcblxyXG4gIGRpc3BsYXkodiA9IGZhbHNlKSB7XHJcbiAgICB0aGlzLmNvbnRlbnQuc3R5bGUudmlzaWJpbGl0eSA9IHYgPyBcInZpc2libGVcIiA6IFwiaGlkZGVuXCI7XHJcbiAgfVxyXG5cclxuICBvbkNoYW5nZShmKSB7XHJcbiAgICB0aGlzLmNhbGxiYWNrID0gZiB8fCBudWxsO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBTVFlMRVNcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIG1vZGUobikge1xyXG4gICAgbGV0IG5lZWRDaGFuZ2UgPSBmYWxzZTtcclxuICAgIGxldCBjYyA9IHRoaXMuY29sb3JzO1xyXG5cclxuICAgIGlmIChuICE9PSB0aGlzLmNuKSB7XHJcbiAgICAgIHRoaXMuY24gPSBuO1xyXG5cclxuICAgICAgc3dpdGNoIChuKSB7XHJcbiAgICAgICAgY2FzZSBcImRlZlwiOlxyXG4gICAgICAgICAgUm9vdHMuY3Vyc29yKCk7XHJcbiAgICAgICAgICB0aGlzLnNjcm9sbC5zdHlsZS5iYWNrZ3JvdW5kID0gY2MuYnV0dG9uO1xyXG4gICAgICAgICAgdGhpcy5ib3R0b20uc3R5bGUuYmFja2dyb3VuZCA9IGNjLmJhY2tncm91bmQ7XHJcbiAgICAgICAgICB0aGlzLmJvdHRvbS5zdHlsZS5jb2xvciA9IGNjLnRleHQ7XHJcbiAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgLy9jYXNlICdzY3JvbGxEZWYnOiB0aGlzLnNjcm9sbC5zdHlsZS5iYWNrZ3JvdW5kID0gdGhpcy5jb2xvcnMuc2Nyb2xsOyBicmVhaztcclxuICAgICAgICBjYXNlIFwic2Nyb2xsT3ZlclwiOlxyXG4gICAgICAgICAgUm9vdHMuY3Vyc29yKFwibnMtcmVzaXplXCIpO1xyXG4gICAgICAgICAgdGhpcy5zY3JvbGwuc3R5bGUuYmFja2dyb3VuZCA9IGNjLnNlbGVjdDtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJzY3JvbGxEb3duXCI6XHJcbiAgICAgICAgICB0aGlzLnNjcm9sbC5zdHlsZS5iYWNrZ3JvdW5kID0gY2Muc2VsZWN0O1xyXG4gICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIC8vY2FzZSAnYm90dG9tRGVmJzogdGhpcy5ib3R0b20uc3R5bGUuYmFja2dyb3VuZCA9IHRoaXMuY29sb3JzLmJhY2tncm91bmQ7IGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJib3R0b21PdmVyXCI6XHJcbiAgICAgICAgICBSb290cy5jdXJzb3IoXCJwb2ludGVyXCIpO1xyXG4gICAgICAgICAgdGhpcy5ib3R0b20uc3R5bGUuYmFja2dyb3VuZCA9IGNjLmJhY2tncm91bmRPdmVyO1xyXG4gICAgICAgICAgdGhpcy5ib3R0b20uc3R5bGUuY29sb3IgPSBjYy50ZXh0T3ZlcjtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIC8vY2FzZSAnYm90dG9tRG93bic6IHRoaXMuYm90dG9tLnN0eWxlLmJhY2tncm91bmQgPSB0aGlzLmNvbG9ycy5zZWxlY3Q7IHRoaXMuYm90dG9tLnN0eWxlLmNvbG9yID0gJyMwMDAnOyBicmVhaztcclxuICAgICAgfVxyXG5cclxuICAgICAgbmVlZENoYW5nZSA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG5lZWRDaGFuZ2U7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBUQVJHRVRcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIGNsZWFyVGFyZ2V0KCkge1xyXG4gICAgaWYgKHRoaXMuY3VycmVudCA9PT0gLTEpIHJldHVybiBmYWxzZTtcclxuICAgIGlmICh0aGlzLnByb3RvLnMpIHtcclxuICAgICAgLy8gaWYgbm8gcyB0YXJnZXQgaXMgZGVsZXRlICEhXHJcbiAgICAgIHRoaXMucHJvdG8udWlvdXQoKTtcclxuICAgICAgdGhpcy5wcm90by5yZXNldCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMucHJvdG8gPSBudWxsO1xyXG4gICAgdGhpcy5jdXJyZW50ID0gLTE7XHJcblxyXG4gICAgLy8vY29uc29sZS5sb2codGhpcy5pc0Rvd24pLy9pZih0aGlzLmlzRG93bilSb290cy5jbGVhcklucHV0KCk7XHJcblxyXG4gICAgUm9vdHMuY3Vyc29yKCk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyAgIFpPTkUgVEVTVFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgdGVzdFpvbmUoZSkge1xyXG4gICAgbGV0IGwgPSB0aGlzLmxvY2FsO1xyXG4gICAgaWYgKGwueCA9PT0gLTEgJiYgbC55ID09PSAtMSkgcmV0dXJuIFwiXCI7XHJcblxyXG4gICAgdGhpcy5pc1Jlc2V0ID0gZmFsc2U7XHJcblxyXG4gICAgbGV0IG5hbWUgPSBcIlwiO1xyXG5cclxuICAgIGxldCBzID0gdGhpcy5pc1Njcm9sbCA/IHRoaXMuem9uZS53IC0gdGhpcy5zaXplLnMgOiB0aGlzLnpvbmUudztcclxuXHJcbiAgICBpZiAobC55ID4gdGhpcy56b25lLmggLSB0aGlzLmJoICYmIGwueSA8IHRoaXMuem9uZS5oKSBuYW1lID0gXCJib3R0b21cIjtcclxuICAgIGVsc2UgbmFtZSA9IGwueCA+IHMgPyBcInNjcm9sbFwiIDogXCJjb250ZW50XCI7XHJcblxyXG4gICAgcmV0dXJuIG5hbWU7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBFVkVOVFNcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIGhhbmRsZUV2ZW50KGUpIHtcclxuICAgIC8vaWYoIHRoaXMuY2xlYW5uaW5nICkgcmV0dXJuXHJcblxyXG4gICAgLy9jb25zb2xlLmxvZyhcIkd1aS5oYW5kbGVFdmVudFwiKVxyXG4gICAgLy9jb25zb2xlLmxvZyhlKTtcclxuICAgIGxldCB0eXBlID0gZS50eXBlO1xyXG5cclxuICAgIGxldCBjaGFuZ2UgPSBmYWxzZTtcclxuICAgIGxldCBwcm90b0NoYW5nZSA9IGZhbHNlO1xyXG5cclxuICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZShlKTtcclxuXHJcbiAgICBpZiAodHlwZSA9PT0gXCJtb3VzZXVwXCIgJiYgdGhpcy5pc0Rvd24pIHRoaXMuaXNEb3duID0gZmFsc2U7XHJcbiAgICBpZiAodHlwZSA9PT0gXCJtb3VzZWRvd25cIiAmJiAhdGhpcy5pc0Rvd24pIHRoaXMuaXNEb3duID0gdHJ1ZTtcclxuXHJcbiAgICBpZiAodGhpcy5pc0Rvd24gJiYgdGhpcy5pc05ld1RhcmdldCkge1xyXG4gICAgICBSb290cy5jbGVhcklucHV0KCk7XHJcbiAgICAgIHRoaXMuaXNOZXdUYXJnZXQgPSBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIW5hbWUpIHJldHVybjtcclxuXHJcbiAgICBzd2l0Y2ggKG5hbWUpIHtcclxuICAgICAgY2FzZSBcImNvbnRlbnRcIjpcclxuICAgICAgICBlLmNsaWVudFkgPSB0aGlzLmlzU2Nyb2xsID8gZS5jbGllbnRZICsgdGhpcy5kZWNhbCA6IGUuY2xpZW50WTtcclxuXHJcbiAgICAgICAgaWYgKFJvb3RzLmlzTW9iaWxlICYmIHR5cGUgPT09IFwibW91c2Vkb3duXCIpIHRoaXMuZ2V0TmV4dChlLCBjaGFuZ2UpO1xyXG5cclxuICAgICAgICBpZiAodGhpcy5wcm90bykgcHJvdG9DaGFuZ2UgPSB0aGlzLnByb3RvLmhhbmRsZUV2ZW50KGUpO1xyXG5cclxuICAgICAgICBpZiAodHlwZSA9PT0gXCJtb3VzZW1vdmVcIikgY2hhbmdlID0gdGhpcy5tb2RlKFwiZGVmXCIpO1xyXG4gICAgICAgIGlmICh0eXBlID09PSBcIndoZWVsXCIgJiYgIXByb3RvQ2hhbmdlICYmIHRoaXMuaXNTY3JvbGwpXHJcbiAgICAgICAgICBjaGFuZ2UgPSB0aGlzLm9uV2hlZWwoZSk7XHJcblxyXG4gICAgICAgIGlmICghUm9vdHMubG9jaykge1xyXG4gICAgICAgICAgdGhpcy5nZXROZXh0KGUsIGNoYW5nZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSBcImJvdHRvbVwiOlxyXG4gICAgICAgIHRoaXMuY2xlYXJUYXJnZXQoKTtcclxuICAgICAgICBpZiAodHlwZSA9PT0gXCJtb3VzZW1vdmVcIikgY2hhbmdlID0gdGhpcy5tb2RlKFwiYm90dG9tT3ZlclwiKTtcclxuICAgICAgICBpZiAodHlwZSA9PT0gXCJtb3VzZWRvd25cIikge1xyXG4gICAgICAgICAgdGhpcy5pc09wZW4gPSB0aGlzLmlzT3BlbiA/IGZhbHNlIDogdHJ1ZTtcclxuICAgICAgICAgIHRoaXMuYm90dG9tLnRleHRDb250ZW50ID0gdGhpcy5pc09wZW5cclxuICAgICAgICAgICAgPyB0aGlzLmJvdHRvbVRleHRbMV1cclxuICAgICAgICAgICAgOiB0aGlzLmJvdHRvbVRleHRbMF07XHJcbiAgICAgICAgICAvL3RoaXMuc2V0SGVpZ2h0KCk7XHJcbiAgICAgICAgICB0aGlzLmNhbGMoKTtcclxuICAgICAgICAgIHRoaXMubW9kZShcImRlZlwiKTtcclxuICAgICAgICAgIGNoYW5nZSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSBcInNjcm9sbFwiOlxyXG4gICAgICAgIHRoaXMuY2xlYXJUYXJnZXQoKTtcclxuICAgICAgICBpZiAodHlwZSA9PT0gXCJtb3VzZW1vdmVcIikgY2hhbmdlID0gdGhpcy5tb2RlKFwic2Nyb2xsT3ZlclwiKTtcclxuICAgICAgICBpZiAodHlwZSA9PT0gXCJtb3VzZWRvd25cIikgY2hhbmdlID0gdGhpcy5tb2RlKFwic2Nyb2xsRG93blwiKTtcclxuICAgICAgICBpZiAodHlwZSA9PT0gXCJ3aGVlbFwiKSBjaGFuZ2UgPSB0aGlzLm9uV2hlZWwoZSk7XHJcbiAgICAgICAgaWYgKHRoaXMuaXNEb3duKSB0aGlzLnVwZGF0ZShlLmNsaWVudFkgLSB0aGlzLnpvbmUueSAtIHRoaXMuc2ggKiAwLjUpO1xyXG5cclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuXHJcbiAgICBpZiAodGhpcy5pc0Rvd24pIGNoYW5nZSA9IHRydWU7XHJcbiAgICBpZiAocHJvdG9DaGFuZ2UpIGNoYW5nZSA9IHRydWU7XHJcblxyXG4gICAgaWYgKHR5cGUgPT09IFwia2V5dXBcIikgY2hhbmdlID0gdHJ1ZTtcclxuICAgIGlmICh0eXBlID09PSBcImtleWRvd25cIikgY2hhbmdlID0gdHJ1ZTtcclxuXHJcbiAgICBpZiAoY2hhbmdlKSB0aGlzLmRyYXcoKTtcclxuICB9XHJcblxyXG4gIGdldE5leHQoZSwgY2hhbmdlKSB7XHJcbiAgICBsZXQgbmV4dCA9IFJvb3RzLmZpbmRUYXJnZXQodGhpcy51aXMsIGUpO1xyXG5cclxuICAgIGlmIChuZXh0ICE9PSB0aGlzLmN1cnJlbnQpIHtcclxuICAgICAgdGhpcy5jbGVhclRhcmdldCgpO1xyXG4gICAgICB0aGlzLmN1cnJlbnQgPSBuZXh0O1xyXG4gICAgICBjaGFuZ2UgPSB0cnVlO1xyXG4gICAgICB0aGlzLmlzTmV3VGFyZ2V0ID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobmV4dCAhPT0gLTEpIHtcclxuICAgICAgdGhpcy5wcm90byA9IHRoaXMudWlzW3RoaXMuY3VycmVudF07XHJcbiAgICAgIHRoaXMucHJvdG8udWlvdmVyKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBvbldoZWVsKGUpIHtcclxuICAgIHRoaXMub3kgKz0gMjAgKiBlLmRlbHRhO1xyXG4gICAgdGhpcy51cGRhdGUodGhpcy5veSk7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyAgIFJFU0VUXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICByZXNldChmb3JjZSkge1xyXG4gICAgaWYgKHRoaXMuaXNSZXNldCkgcmV0dXJuO1xyXG5cclxuICAgIC8vdGhpcy5yZXNldEl0ZW0oKTtcclxuXHJcbiAgICB0aGlzLm1vdXNlLm5lZygpO1xyXG4gICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcclxuXHJcbiAgICAvL1Jvb3RzLmNsZWFySW5wdXQoKTtcclxuICAgIGxldCByID0gdGhpcy5tb2RlKFwiZGVmXCIpO1xyXG4gICAgbGV0IHIyID0gdGhpcy5jbGVhclRhcmdldCgpO1xyXG5cclxuICAgIGlmIChyIHx8IHIyKSB0aGlzLmRyYXcodHJ1ZSk7XHJcblxyXG4gICAgdGhpcy5pc1Jlc2V0ID0gdHJ1ZTtcclxuXHJcbiAgICAvL1Jvb3RzLmxvY2sgPSBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyAgIEFERCBOT0RFXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBhZGQoKSB7XHJcbiAgICAvL2lmKHRoaXMuY2xlYW5uaW5nKSB0aGlzLmNsZWFubmluZyA9IGZhbHNlXHJcblxyXG4gICAgbGV0IGEgPSBhcmd1bWVudHM7XHJcbiAgICBsZXQgb250b3AgPSBmYWxzZTtcclxuXHJcbiAgICBpZiAodHlwZW9mIGFbMV0gPT09IFwib2JqZWN0XCIpIHtcclxuICAgICAgYVsxXS5pc1VJID0gdHJ1ZTtcclxuICAgICAgYVsxXS5tYWluID0gdGhpcztcclxuXHJcbiAgICAgIG9udG9wID0gYVsxXS5vbnRvcCA/IGFbMV0ub250b3AgOiBmYWxzZTtcclxuICAgIH0gZWxzZSBpZiAodHlwZW9mIGFbMV0gPT09IFwic3RyaW5nXCIpIHtcclxuICAgICAgaWYgKGFbMl0gPT09IHVuZGVmaW5lZCkgW10ucHVzaC5jYWxsKGEsIHsgaXNVSTogdHJ1ZSwgbWFpbjogdGhpcyB9KTtcclxuICAgICAgZWxzZSB7XHJcbiAgICAgICAgYVsyXS5pc1VJID0gdHJ1ZTtcclxuICAgICAgICBhWzJdLm1haW4gPSB0aGlzO1xyXG4gICAgICAgIC8vb250b3AgPSBhWzFdLm9udG9wID8gYVsxXS5vbnRvcCA6IGZhbHNlO1xyXG4gICAgICAgIG9udG9wID0gYVsyXS5vbnRvcCA/IGFbMl0ub250b3AgOiBmYWxzZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxldCB1ID0gYWRkLmFwcGx5KHRoaXMsIGEpO1xyXG5cclxuICAgIGlmICh1ID09PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgaWYgKG9udG9wKSB0aGlzLnVpcy51bnNoaWZ0KHUpO1xyXG4gICAgZWxzZSB0aGlzLnVpcy5wdXNoKHUpO1xyXG5cclxuICAgIHRoaXMuY2FsYygpO1xyXG5cclxuICAgIHRoaXMuaXNFbXB0eSA9IGZhbHNlO1xyXG5cclxuICAgIHJldHVybiB1O1xyXG4gIH1cclxuXHJcbiAgLy8gcmVtb3ZlIG9uZSBub2RlXHJcblxyXG4gIHJlbW92ZShuKSB7XHJcbiAgICBpZiAobi5kaXNwb3NlKSBuLmRpc3Bvc2UoKTtcclxuICB9XHJcblxyXG4gIC8vIGNhbGwgYWZ0ZXIgdWlzIGNsZWFyXHJcblxyXG4gIGNsZWFyT25lKG4pIHtcclxuICAgIGxldCBpZCA9IHRoaXMudWlzLmluZGV4T2Yobik7XHJcbiAgICBpZiAoaWQgIT09IC0xKSB7XHJcbiAgICAgIC8vdGhpcy5jYWxjKCAtICh0aGlzLnVpc1sgaWQgXS5oICsgMSApICk7XHJcbiAgICAgIHRoaXMuaW5uZXIucmVtb3ZlQ2hpbGQodGhpcy51aXNbaWRdLmNbMF0pO1xyXG4gICAgICB0aGlzLnVpcy5zcGxpY2UoaWQsIDEpO1xyXG4gICAgICB0aGlzLmNhbGMoKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIGNsZWFyIGFsbCBndWlcclxuXHJcbiAgZW1wdHkoKSB7XHJcbiAgICAvL3RoaXMuY2xlYW5uaW5nID0gdHJ1ZVxyXG5cclxuICAgIC8vdGhpcy5jbG9zZSgpO1xyXG5cclxuICAgIGxldCBpID0gdGhpcy51aXMubGVuZ3RoLFxyXG4gICAgICBpdGVtO1xyXG5cclxuICAgIHdoaWxlIChpLS0pIHtcclxuICAgICAgaXRlbSA9IHRoaXMudWlzLnBvcCgpO1xyXG4gICAgICB0aGlzLmlubmVyLnJlbW92ZUNoaWxkKGl0ZW0uY1swXSk7XHJcbiAgICAgIGl0ZW0uZGlzcG9zZSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMudWlzID0gW107XHJcbiAgICB0aGlzLmlzRW1wdHkgPSB0cnVlO1xyXG4gICAgdGhpcy5jYWxjKCk7XHJcbiAgfVxyXG5cclxuICBjbGVhcigpIHtcclxuICAgIHRoaXMuZW1wdHkoKTtcclxuICB9XHJcblxyXG4gIGNsZWFyMigpIHtcclxuICAgIHNldFRpbWVvdXQodGhpcy5lbXB0eS5iaW5kKHRoaXMpLCAwKTtcclxuICB9XHJcblxyXG4gIGRpc3Bvc2UoKSB7XHJcbiAgICB0aGlzLmNsZWFyKCk7XHJcbiAgICBpZiAodGhpcy5wYXJlbnQgIT09IG51bGwpIHRoaXMucGFyZW50LnJlbW92ZUNoaWxkKHRoaXMuY29udGVudCk7XHJcbiAgICBSb290cy5yZW1vdmUodGhpcyk7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBJVEVNUyBTUEVDSUFMXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICByZXNldEl0ZW0oKSB7XHJcbiAgICBpZiAoIXRoaXMuaXNJdGVtTW9kZSkgcmV0dXJuO1xyXG5cclxuICAgIGxldCBpID0gdGhpcy51aXMubGVuZ3RoO1xyXG4gICAgd2hpbGUgKGktLSkgdGhpcy51aXNbaV0uc2VsZWN0ZWQoKTtcclxuICB9XHJcblxyXG4gIHNldEl0ZW0obmFtZSkge1xyXG4gICAgaWYgKCF0aGlzLmlzSXRlbU1vZGUpIHJldHVybjtcclxuXHJcbiAgICBuYW1lID0gbmFtZSB8fCBcIlwiO1xyXG4gICAgdGhpcy5yZXNldEl0ZW0oKTtcclxuXHJcbiAgICBpZiAoIW5hbWUpIHtcclxuICAgICAgdGhpcy51cGRhdGUoMCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgaSA9IHRoaXMudWlzLmxlbmd0aDtcclxuICAgIHdoaWxlIChpLS0pIHtcclxuICAgICAgaWYgKHRoaXMudWlzW2ldLnZhbHVlID09PSBuYW1lKSB7XHJcbiAgICAgICAgdGhpcy51aXNbaV0uc2VsZWN0ZWQodHJ1ZSk7XHJcbiAgICAgICAgaWYgKHRoaXMuaXNTY3JvbGwpXHJcbiAgICAgICAgICB0aGlzLnVwZGF0ZShpICogKHRoaXMudWlzW2ldLmggKyB0aGlzLm1hcmdpbikgKiB0aGlzLnJhdGlvKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICAgU0NST0xMXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICB1cFNjcm9sbChiKSB7XHJcbiAgICB0aGlzLnN3ID0gYiA/IHRoaXMuc2l6ZS5zIDogMDtcclxuICAgIHRoaXMub3kgPSBiID8gdGhpcy5veSA6IDA7XHJcbiAgICB0aGlzLnNjcm9sbEJHLnN0eWxlLmRpc3BsYXkgPSBiID8gXCJibG9ja1wiIDogXCJub25lXCI7XHJcblxyXG4gICAgaWYgKGIpIHtcclxuICAgICAgdGhpcy50b3RhbCA9IHRoaXMuaDtcclxuXHJcbiAgICAgIHRoaXMubWF4VmlldyA9IHRoaXMubWF4SGVpZ2h0O1xyXG5cclxuICAgICAgdGhpcy5yYXRpbyA9IHRoaXMubWF4VmlldyAvIHRoaXMudG90YWw7XHJcbiAgICAgIHRoaXMuc2ggPSB0aGlzLm1heFZpZXcgKiB0aGlzLnJhdGlvO1xyXG5cclxuICAgICAgdGhpcy5yYW5nZSA9IHRoaXMubWF4VmlldyAtIHRoaXMuc2g7XHJcblxyXG4gICAgICB0aGlzLm95ID0gVG9vbHMuY2xhbXAodGhpcy5veSwgMCwgdGhpcy5yYW5nZSk7XHJcblxyXG4gICAgICB0aGlzLnNjcm9sbEJHLnN0eWxlLmhlaWdodCA9IHRoaXMubWF4VmlldyArIFwicHhcIjtcclxuICAgICAgdGhpcy5zY3JvbGwuc3R5bGUuaGVpZ2h0ID0gdGhpcy5zaCArIFwicHhcIjtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnNldEl0ZW1XaWR0aCh0aGlzLnpvbmUudyAtIHRoaXMuc3cpO1xyXG4gICAgdGhpcy51cGRhdGUodGhpcy5veSk7XHJcbiAgfVxyXG5cclxuICB1cGRhdGUoeSkge1xyXG4gICAgeSA9IFRvb2xzLmNsYW1wKHksIDAsIHRoaXMucmFuZ2UpO1xyXG5cclxuICAgIHRoaXMuZGVjYWwgPSBNYXRoLmZsb29yKHkgLyB0aGlzLnJhdGlvKTtcclxuICAgIHRoaXMuaW5uZXIuc3R5bGUudG9wID0gLXRoaXMuZGVjYWwgKyBcInB4XCI7XHJcbiAgICB0aGlzLnNjcm9sbC5zdHlsZS50b3AgPSBNYXRoLmZsb29yKHkpICsgXCJweFwiO1xyXG4gICAgdGhpcy5veSA9IHk7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBSRVNJWkUgRlVOQ1RJT05cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIGNhbGNVaXMoKSB7XHJcbiAgICByZXR1cm4gUm9vdHMuY2FsY1Vpcyh0aGlzLnVpcywgdGhpcy56b25lLCB0aGlzLnpvbmUueSk7XHJcbiAgfVxyXG5cclxuICBjYWxjKCkge1xyXG4gICAgY2xlYXJUaW1lb3V0KHRoaXMudG1wKTtcclxuICAgIHRoaXMudG1wID0gc2V0VGltZW91dCh0aGlzLnNldEhlaWdodC5iaW5kKHRoaXMpLCAxMCk7XHJcbiAgfVxyXG5cclxuICBzZXRIZWlnaHQoKSB7XHJcbiAgICBpZiAodGhpcy50bXApIGNsZWFyVGltZW91dCh0aGlzLnRtcCk7XHJcblxyXG4gICAgdGhpcy56b25lLmggPSB0aGlzLmJoO1xyXG4gICAgdGhpcy5pc1Njcm9sbCA9IGZhbHNlO1xyXG5cclxuICAgIGlmICh0aGlzLmlzT3Blbikge1xyXG4gICAgICB0aGlzLmggPSB0aGlzLmNhbGNVaXMoKTtcclxuXHJcbiAgICAgIGxldCBoaGggPSB0aGlzLmZvcmNlSGVpZ2h0XHJcbiAgICAgICAgPyB0aGlzLmZvcmNlSGVpZ2h0ICsgdGhpcy56b25lLnlcclxuICAgICAgICA6IHdpbmRvdy5pbm5lckhlaWdodDtcclxuXHJcbiAgICAgIHRoaXMubWF4SGVpZ2h0ID0gaGhoIC0gdGhpcy56b25lLnkgLSB0aGlzLmJoO1xyXG5cclxuICAgICAgbGV0IGRpZmYgPSB0aGlzLmggLSB0aGlzLm1heEhlaWdodDtcclxuXHJcbiAgICAgIGlmIChkaWZmID4gMSkge1xyXG4gICAgICAgIHRoaXMuaXNTY3JvbGwgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuem9uZS5oID0gdGhpcy5tYXhIZWlnaHQgKyB0aGlzLmJoO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMuem9uZS5oID0gdGhpcy5oICsgdGhpcy5iaDtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRoaXMudXBTY3JvbGwodGhpcy5pc1Njcm9sbCk7XHJcblxyXG4gICAgdGhpcy5pbm5lckNvbnRlbnQuc3R5bGUuaGVpZ2h0ID0gdGhpcy56b25lLmggLSB0aGlzLmJoICsgXCJweFwiO1xyXG4gICAgdGhpcy5jb250ZW50LnN0eWxlLmhlaWdodCA9IHRoaXMuem9uZS5oICsgXCJweFwiO1xyXG4gICAgdGhpcy5ib3R0b20uc3R5bGUudG9wID0gdGhpcy56b25lLmggLSB0aGlzLmJoICsgXCJweFwiO1xyXG5cclxuICAgIGlmICh0aGlzLmZvcmNlSGVpZ2h0ICYmIHRoaXMubG9ja0hlaWdodClcclxuICAgICAgdGhpcy5jb250ZW50LnN0eWxlLmhlaWdodCA9IHRoaXMuZm9yY2VIZWlnaHQgKyBcInB4XCI7XHJcbiAgICBpZiAodGhpcy5pc0NhbnZhcykgdGhpcy5kcmF3KHRydWUpO1xyXG4gIH1cclxuXHJcbiAgcmV6b25lKCkge1xyXG4gICAgUm9vdHMubmVlZFJlWm9uZSA9IHRydWU7XHJcbiAgfVxyXG5cclxuICBzZXRXaWR0aCh3KSB7XHJcbiAgICBpZiAodykgdGhpcy56b25lLncgPSB3O1xyXG5cclxuICAgIHRoaXMuem9uZS53ID0gTWF0aC5mbG9vcih0aGlzLnpvbmUudyk7XHJcbiAgICB0aGlzLmNvbnRlbnQuc3R5bGUud2lkdGggPSB0aGlzLnpvbmUudyArIFwicHhcIjtcclxuICAgIGlmICh0aGlzLmlzQ2VudGVyKVxyXG4gICAgICB0aGlzLmNvbnRlbnQuc3R5bGUubWFyZ2luTGVmdCA9IC1NYXRoLmZsb29yKHRoaXMuem9uZS53ICogMC41KSArIFwicHhcIjtcclxuICAgIHRoaXMuc2V0SXRlbVdpZHRoKHRoaXMuem9uZS53IC0gdGhpcy5zdyk7XHJcbiAgfVxyXG5cclxuICBzZXRJdGVtV2lkdGgodykge1xyXG4gICAgbGV0IGkgPSB0aGlzLnVpcy5sZW5ndGg7XHJcbiAgICB3aGlsZSAoaS0tKSB7XHJcbiAgICAgIHRoaXMudWlzW2ldLnNldFNpemUodyk7XHJcbiAgICAgIHRoaXMudWlzW2ldLnJTaXplKCk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Q0FBQTtDQUNBO0NBQ0E7QUFDQTtBQUNZLE9BQUMsUUFBUSxHQUFHLFFBQVE7QUFDaEM7Q0FDQTtBQUNBO0NBQ0EsTUFBTSxDQUFDLEdBQUc7Q0FDVixFQUFFLEVBQUUsRUFBRSxFQUFFO0FBQ1I7Q0FDQSxFQUFFLEdBQUcsRUFBRSxJQUFJO0FBQ1g7Q0FDQSxFQUFFLEVBQUUsRUFBRSxJQUFJO0NBQ1YsRUFBRSxJQUFJLEVBQUUsS0FBSztDQUNiLEVBQUUsS0FBSyxFQUFFLEtBQUs7Q0FDZCxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7QUFDYjtDQUNBLEVBQUUsVUFBVSxFQUFFLElBQUk7Q0FDbEIsRUFBRSxVQUFVLEVBQUUsS0FBSztDQUNuQixFQUFFLFNBQVMsRUFBRSxLQUFLO0NBQ2xCLEVBQUUsWUFBWSxFQUFFLEtBQUs7Q0FDckIsRUFBRSxP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O0NBQzlCLE1BQU0sQ0FBQyxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7Q0FDMUIsS0FBSztBQUNMO0NBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBQy9DO0NBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7Q0FDOUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0FBQzdDO0NBQ0E7QUFDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBO0FBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQzFELElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFdBQVcsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RDtDQUNBLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLElBQUksRUFBRTtDQUN2QixNQUFNLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUU7Q0FDN0IsUUFBUSxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztDQUNqQyxRQUFRLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0NBQ2pDLE9BQU87QUFDUDtDQUNBO0FBQ0E7Q0FDQSxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQzFCLEtBQUs7QUFDTDtDQUNBLElB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QUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7Q0FDcEQsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0NBQ3ZEO0NBQ0EsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7QUFDNUI7Q0FDQSxJQUFJLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0NBQ25CLElBQUksQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7Q0FDcEIsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLENBQUM7Q0FDeEMsR0FBRztBQUNIO0NBQ0EsRUFBRSxRQUFRLEVBQUUsVUFBVSxLQUFLLEVBQUUsTUFBTSxFQUFFO0NBQ3JDLElBQUksQ0FBQyxDQUFDLFVBQVUsRUFBRSxDQUFDO0FBQ25CO0NBQ0EsSUFBSSxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztDQUNwQixJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0FBQ3RCO0NBQ0EsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDO0NBQ3ZELElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztDQUN2RDtDQUNBLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQztBQUNoQztDQUNBLElBQUksQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFDO0NBQ2xCLEdBQUc7QUFDSDtDQUNBLEVBQUUsT0FBTyxFQUFFLFVBQVUsQ0FBQyxFQUFFO0NB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LElBQUksQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0NBQy9FLGFBQWEsSUFBSSxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM5RTtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksSUFBSSxFQUFFLFdBQVcsQ0FBQyxHQUFHO0NBQ3pCLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDO0NBQ3pELFFBQVEsS0FBSyxDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztDQUN4QyxRQUFRLE9BQU8sQ0FBQyxDQUFDO0NBQ2pCLEtBQUs7QUFDTDtDQUNBLElBQUksSUFBSSxFQUFFLFdBQVcsQ0FBQyxHQUFHO0FBQ3pCO0NBQ0EsUUFBUSxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUM1RTtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksT0FBTyxFQUFFLFVBQVUsQ0FBQyxFQUFFO0FBQzFCO0NBQ0EsUUFBUSxPQUFPLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztBQUNqSDtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksR0FBRyxFQUFFLFVBQVUsQ0FBQyxFQUFFO0NBQ3RCLFFBQVEsR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsQ0FBQztDQUNyQyxRQUFRLE9BQU8sQ0FBQyxDQUFDO0NBQ2pCLEtBQUs7QUFDTDtDQUNBLElBQUksUUFBUSxHQUFHLFVBQVUsQ0FBQyxFQUFFO0FBQzVCO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7Q0FDcEQsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7Q0FDcEQsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7Q0FDcEQsUUFBUSxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRDtDQUNBO0FBQ0E7Q0FDQSxLQUFLO0FBQ0w7Q0FDQSxJQUFJLFFBQVEsRUFBRSxVQUFVLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFO0FBQ2pDO0NBQ0EsUUFBUSxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUM1QixRQUFRLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQzVCLFFBQVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztDQUN0RCxRQUFRLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7Q0FDbEMsUUFBUSxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztDQUNsRSxRQUFRLE9BQU8sQ0FBQyxDQUFDO0FBQ2pCO0NBQ0EsS0FBSztBQUNMO0NBQ0EsSUFBSSxRQUFRLEVBQUUsV0FBVyxDQUFDLEdBQUc7QUFDN0I7Q0FDQSxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssR0FBRyxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQztDQUNqSixRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUMxRSxRQUFRLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRTtDQUN2QixZQUFZLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDO0NBQzNELFlBQVksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7Q0FDakUsWUFBWSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQztDQUNqRSxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDbkIsU0FBUztDQUNULFFBQVEsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDM0I7Q0FDQSxLQUFLO0FBQ0w7Q0FDQSxJQUFJLFFBQVEsRUFBRSxXQUFXLENBQUMsR0FBRztBQUM3QjtDQUNBLFFBQVEsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9DO0NBQ0EsUUFBUSxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Q0FDMUMsYUFBYTtDQUNiLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztDQUMzRCxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztDQUMxQixZQUFZLE9BQU8sRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUM7Q0FDekcsU0FBUztBQUNUO0NBQ0EsS0FBSztBQUNMO0NBQ0E7Q0FDQTtDQUNBO0FBQ0E7Q0FDQSxJQUFJLFlBQVksRUFBRSxXQUFXLElBQUksRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLE1BQU0sR0FBRztBQUM5RDtDQUNBLFFBQVEsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDakQ7Q0FDQSxRQUFRLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzlEO0NBQ0EsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUNoRDtDQUNBLFlBQVksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUMxQjtDQUNBLFlBQVksQ0FBQyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDL0c7Q0FDQSxTQUFTO0FBQ1Q7Q0FDQSxLQUFLO0FBQ0w7Q0FDQTtBQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBO0FBQ0E7Q0FDQSxJQUFJLE9BQU8sRUFBRSxXQUFXLEtBQUssR0FBRztBQUNoQztDQUNBLFFBQVEsSUFBSSxFQUFFLEdBQUcsSUFBRztDQUNwQixRQUFRLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLG9CQUFvQixFQUFFLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxFQUFFLEVBQUUsbUJBQW1CLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztDQUNwSixRQUFRLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQztDQUNwQixRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztDQUNuQyxRQUFRLEtBQUssQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUM7Q0FDL0YsUUFBUSxLQUFLLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDO0NBQ3JIO0NBQ0EsUUFBUSxLQUFLLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsR0FBRyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQztDQUM3SSxRQUFRLEtBQUssQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsY0FBYyxF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LEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQzFIO0NBQ0E7Q0FDQSxZQUFZLElBQUksR0FBRyxHQUFHLENBQUMsZUFBZSxFQUFFLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQztDQUMxRSxZQUFZLElBQUksR0FBRyxHQUFHLENBQUMsZUFBZSxFQUFFLGVBQWUsRUFBRSxlQUFlLENBQUMsQ0FBQztBQUMxRTtDQUNBLFlBQVksR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7Q0FDMUYsWUFBWSxDQUFDLENBQUMsWUFBWSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDM0g7Q0FDQSxZQUFZLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0NBQzFGLFlBQVksQ0FBQyxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQzVIO0NBQ0E7QUFDQTtDQUNBLFlBQVksQ0FBQyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDO0NBQ3RGLFlBQVksQ0FBQyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLGFBQWEsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDO0NBQ3BHLFlBQVksQ0FBQyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQzdGO0NBQ0EsWUFBWSxDQUFDLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQztBQUMvQjtDQUNBLFNBQVMsTUFBTTtDQUNmO0NBQ0EsWUFBWSxHQUFH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Q0Y7Q0FDQSxDQUFDLE1BQU0sQ0FBQyxHQUFHO0FBQ1g7Q0FDQSxFQUFFLFNBQVMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUc7QUFDMUM7Q0FDQSxFQUFFO0FBQ0Y7Q0FDQSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRztBQUNaO0NBQ0EsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDZixFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNmO0NBQ0EsRUFBRSxPQUFPLElBQUksQ0FBQztBQUNkO0NBQ0EsRUFBRTtBQUNGO0NBQ0EsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDZDtDQUNBLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRztBQUN0RDtDQUNBLEVBQUU7QUFDRjtDQUNBLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRztBQUNyQjtDQUNBLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUc7QUFDbEc7Q0FDQSxFQUFFO0FBQ0Y7Q0FDQSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLEdBQUc7QUFDbkI7Q0FDQSxFQUFFLElBQUksQ0FBQyxLQUFLLElBQUksRUFBRTtDQUNsQixHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxL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QzFELFNBQVMsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7QUFDMUI7Q0FDQTtDQUNBLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN4QjtDQUNBLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQztDQUNwQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO0FBQ3hCO0NBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztBQUNqRDtDQUNBLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUM7QUFDdkQ7Q0FDQTtDQUNBLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7Q0FDMUIsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDO0NBQ2xDLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQztBQUN4QztDQUNBO0NBQ0EsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQztBQUN0QjtDQUNBO0NBQ0EsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztBQUN4QjtDQUNBO0NBQ0EsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDO0NBQ3BDLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ2pDO0NBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pCO0NBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxTQUFTLEVBQUUsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO0NBQzNDLElBQUksSUFBSSxDQUFDLENBQUMsRUFBRSxLQUFLLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7Q0FDM0MsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDaEQ7Q0FDQTtDQUNBLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLFNBQVMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM3QztDQUNBO0NBQ0EsSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztDQUMzQixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO0NBQ3hCLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7QUFDMUI7Q0FDQSxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7Q0FDNUIsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQztDQUNyQyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUM7QUFDbkM7Q0FDQTtDQUNBLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsUUFBUSxLQUFLLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQztDQUNqRSxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO0NBQzVCLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsWUFBWSxLQUFLLFNBQVMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFlBQVks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R0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztDQUNsQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7Q0FDeEMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0NBQzdFLEtBQUs7QUFDTDtDQUNBLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFO0NBQ2YsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUM7Q0FDdEMsTUFBTSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUU7Q0FDM0IsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDaEMsT0FBTztDQUNQLE1BQU0sSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7Q0FDdkIsS0FBSztBQUNMO0NBQ0EsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztDQUN6QyxHQUFHO0FBQ0g7Q0FDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBLEVBQUUsSUFBSSxHQUFHO0NBQ1QsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztBQUNyQztDQUNBLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxD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O0NBQ2hCLFFBQVEsTUFBTTtDQUNkLE1BQU0sS0FBSyxDQUFDO0NBQ1osUUFBUSxDQUFDLEdBQUcsSUFBSSxDQUFDO0NBQ2pCLFFBQVEsTUFBTTtDQUNkLE1BQU0sS0FBSyxDQUFDO0NBQ1osUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFDO0NBQ2xCLFFBQVEsTUFBTTtDQUNkLE1BQU0sS0FBSyxDQUFDO0NBQ1osUUFBUSxDQUFDLEdBQUcsTUFBTSxDQUFDO0NBQ25CLFFBQVEsTUFBTTtDQUNkLE1BQU0sS0FBSyxDQUFDO0NBQ1osUUFBUSxDQUFDLEdBQUcsT0FBTyxDQUFDO0NBQ3BCLFFBQVEsTUFBTTtDQUNkLE1BQU0sS0FBSyxDQUFDO0NBQ1osUUFBUSxDQUFDLEdBQUcsUUFBUSxDQUFDO0NBQ3JCLFFBQVEsTUFBTTtDQUNkLEtBQUs7QUFDTDtDQUNBLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztDQUNsRCxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0NBQ3JDLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztDQUMzQyxHQUFHO0FBQ0g7Q0FDQSxFQUFFLFFBQVEsQ0FBQyxDQUFDLEVBQUU7Q0FDZCxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUNwQyxJQUFJO0NBQ0osTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDO0NBQzNFLE1BQU07Q0FD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QUFTO0FBQ1Q7Q0FDQSxRQUFRLE9BQU8sQ0FBQyxFQUFFLEVBQUU7QUFDcEI7Q0FDQTtDQUNBLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDO0NBQ3JFLFNBQVMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUQ7Q0FDQSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSTtDQUMvQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSTtBQUNoRDtDQUNBLFNBQVM7QUFDVDtDQUNBLEtBQUs7QUFDTDtDQUNBOztDQ3BQTyxNQUFNLFFBQVEsU0FBUyxLQUFLLENBQUM7QUFDcEM7Q0FDQSxJQUFJLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHO0FBQzFCO0NBQ0EsUUFBUSxLQUFLLEVBQUUsQ0FBQyxHQUFFO0FBQ2xCO0NBQ0EsUUFBUSxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxNQUFNLElBQUksTUFBSztDQUN6QyxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFDO0NBQ2pDLFFBQVEsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFJO0FBQ3REO0NBQ0EsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLE1BQUs7Q0FDOUIsUUFBUSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFDO0NBQzFCLFFBQVEsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFDO0FBQ3BDO0NBQ0EsUUFBUSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUMsR0FBRTtBQUMvQjtDQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBSztDQUNoQyxRQUFRLElBQUksQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLEtBQUk7QUFDOUI7Q0FDQSxRQUFRLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxFQUFFLEdBQUU7QUFDOUI7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUU7QUFDbkM7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUk7Q0FDNUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsUUFBTztBQUN6QztDQUNBLFFBQVEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsRUFBRTtBQUNwQztDQUNBLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLE9BQU07Q0FDMUMsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsU0FBUTtDQUNyRCxZQUFZLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRTtDQUN6QixZQUFZLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRTtBQUN4QjtDQUNBLFNBQVM7QUFDVDtBQUNBO0FBQ0E7Q0FDQSxRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBQztDQUN4QixRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBQztDQUN0QixRQUFRLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFNO0FBQzVCO0NBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLDhCQUE4QixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxDQUFDLElBQUksR0FBRTtBQUNsSTtDQUNBO0NBQ0E7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsR0FBRTtBQUN0QztDQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRTtDQUN0RCxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsR0FBRTtDQUN6RCxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUU7QUFDdEQ7Q0FDQSxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEdBQUU7Q0FDM0UsUUFBUSxJQUFJLENBQUMs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ekIsUUFBUSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDO0NBQzVCLFFBQVEsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVCO0NBQ0EsS0FBSztBQUNMO0NBQ0EsSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDcEI7Q0FDQSxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU87QUFDbEM7Q0FDQTtBQUNBO0NBQ0EsUUFBUSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0NBQzlCLFFBQVEsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztDQUMzRCxRQUFRLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUMxRTtDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztDQUN6QyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMvRDtDQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksRUFBRTtBQUNoQztDQUNBLFlBQVksSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0NBQ3pDLFlBQVksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2xFO0NBQ0EsWUFBWSxJQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDckMsWUFBWSxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDL0M7Q0FDQSxTQUFTO0FBQ1Q7Q0FDQSxRQUFRLElBQUksS0FBSyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0NBQ25DLFFBQVEsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7QUFDbkM7Q0FDQSxRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssS0FBSyxJQUFJLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDakU7Q0FDQSxRQUFRLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUM7Q0FDNUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Q0FDckMsWUFBWSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7Q0FDdkUsWUFBWSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDO0NBQ2hDLFlBQVksSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0NBQ2xDLFlBQVksSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQy9CLFNBQVM7QUFDVDtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ2hCO0NBQ0EsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3RDO0NBQ0EsUUFBUSxJQUFJLElBQUksS0FBSyxVQUFVLEdBQUc7Q0FDbEM7Q0FDQSxZQUFZLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0NBQ3JEO0NBQ0EsWUFBWSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHO0NBQ2hDLGdCQUFnQixDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7Q0FDeEQsYUFBYSxNQUFNLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUc7Q0FDdkMsZ0JBQWdCLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztDQUN4RCxhQUFhO0NBQ2I7Q0FDQSxZQUFZLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLENBQUM7Q0FDL0IsWUFBWSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztDQUN6QixZQUFZLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDaEM7Q0FDQSxZQUFZLE9BQU8sSUFBSSxDQUFDO0NBQ3hCO0NBQ0EsU0FBUztDQUNULFFBQVEsT0FBTyxLQUFLLENBQUM7QUFDckI7Q0FDQSxLQUFLO0FBQ0w7Q0FDQTtBQUNBO0NBQ0EsSUFBSSxRQUFRLENBQUMsR0FBRztBQUNoQjtDQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0NBQ25CLFFBQVEsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0NBQ25CLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztDQUNsRCxRQUFRLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUMzQyxRQUFRLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUMzQyxRQUFRLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDdEMsUUFBUSxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxLQUFLLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDbEc7Q0FDQSxLQUFLO0FBQ0w7Q0FDQSxJQUFJLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRztBQUNsQjtDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztDQUMzQyxRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQztBQUM5RDtDQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDMUQ7Q0FDQSxRQUFRLEtBQUssSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUc7QUFDOUI7Q0FDQSxZQUFZ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WSxHQUFHLEdBQUcsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDO0NBQzVDLFlBQVksSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQ3JDLFlBQVksSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRTtDQUNBLFNBQVMsTUFBTTtBQUNmO0NBQ0EsU0FBUyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0NBQ2hDLFNBQVMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUNoQztDQUNBLFNBQVMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztDQUM5QyxTQUFTLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDbkM7Q0FDQSxTQUFTLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQ2pDLFNBQVMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztDQUNyQztDQUNBLFNBQVMsSUFBSSxJQUFJLEdBQUcsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDO0NBQy9ELFNBQVMsSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUM7Q0FDaEQsU0FBUyxDQUFDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxFQUFFO0NBQzdCLFNBQVMsQ0FBQyxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztDQUNsQyxTQUFTLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUNwQyxTQUFTLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDO0NBQ0EsU0FBUyxJQUFJLENBQUMsR0FBRyxJQUFJLEdBQUc7Q0FDeEIsT0FBTyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztDQUNuQyxPQUFPLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0NBQ3ZDLE9BQU8sR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztDQUN4QyxlQUFlLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0NBQ25EO0NBQ0EsT0FBTyxHQUFHLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQztBQUMxQjtDQUNBLE9BQU8sSUFBSSxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQztDQUN4RCxPQUFPLElBQUksR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDL0MsT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDOUIsT0FBTyxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDdkMsT0FBTztBQUNQO0NBQ0EsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksR0FBRyxDQUFDO0NBQ3BEO0NBQ0EsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Q0FDNUMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUMzRSxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Q0FDakM7Q0FDQSxZQUFZLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ2pEO0NBQ0EsU0FBUztDQUNULEtBQUs7Q0FDTCxJQUFJO0NBQ0osR0FBRztBQUNIO0NBQ0EsRUFBRTtBQUNGO0NBQ0E7QUFDQTtDQUNBLENBQUMsU0FBUyxDQUFDLEdBQUc7QUFDZDtDQUNBLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQUs7Q0FDakUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUk7Q0FDbEMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBQztBQUN0QjtDQUNBLEVBQUU7QUFDRjtDQUNBLENBQUMsWUFBWSxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ3BCO0NBQ0EsRUFBRSxLQUFLLElBQUksQ0FBQyxLQUFLLEtBQUssSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO0NBQ2xELFVBQVUsS0FBSyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQy9DO0NBQ0EsRUFBRTtBQUNGO0NBQ0EsQ0FBQyxJQUFJLENBQUMsR0FBRztBQUNUO0NBQ0EsRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDZjtDQUNBLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ25CO0NBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7QUFDOUM7Q0FDQSxFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUM5QjtDQUNBLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsU0FBUyxDQUFDO0NBQ3RDO0NBQ0EsS0FBSyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQzVCO0NB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QUcsQ0FBQyxDQUFDO0NBQzNCLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztDQUM1QixFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztDQUNuQyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0NBQ3BDLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0NBQ25DLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDcEMsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0NBQzdDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDdEMsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO0NBQzdDLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QztDQUNBLEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2xDO0NBQ0E7Q0FDQTtBQUNBO0NBQ0EsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsV0FBVyxFQUFFLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3BFO0NBQ0EsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Q0FDNUMsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Q0FDNUM7Q0FDQSxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztDQUM3RSxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDO0NBQzFFLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3JEO0NBQ0EsRUFBRTtBQUNGO0NBQ0EsQ0FBQyxLQUFLLENBQUMsR0FBRztBQUNWO0NBQ0E7Q0FDQSxLQUFLLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNuQjtDQUNBLEtBQUssSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNwQjtDQUNBLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztDQUNqQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDaEM7Q0FDQTtBQUNBO0NBQ0EsS0FBSyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO0FBQzdDO0FBQ0E7QUFDQTtDQUNBLEtBQUssSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7QUFDaEM7Q0FDQSxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLElBQUksR0FBRyxDQUFDLENBQUM7Q0FDNUQ7Q0FDQTtDQUNBLEVBQUU7QUFDRjtDQUNBLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ2xCO0FBQ0E7Q0FDQSxFQUFFLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxLQUFLLEdBQUcsT0FBTztBQUNoQztBQUNBO0FBQ0E7Q0FDQSxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0FBQ2pCO0FBQ0E7QUFDQTtDQUNBLEVBQUUsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNqQjtDQUNBO0NBQ0EsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFDO0NBQzNELEtBQUssSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FB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QUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO0FBQ3REO0NBQ0EsUUFBUSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Q0FDekIsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO0FBQ3ZEO0NBQ0EsUUFBUSxPQUFPLElBQUksQ0FBQztBQUNwQjtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksU0FBUyxDQUFDLEdBQUc7QUFDakI7Q0FDQSxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0NBQ3ZEO0NBQ0EsS0FBSztBQUNMO0NBQ0EsSUFBSSxLQUFLLENBQUMsR0FBRztBQUNiO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ3ZCLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN2QjtDQUNBLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssS0FBSTtBQUNwRDtDQUNBLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0NBQzlCLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0NBQzlCLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO0NBQzlCLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDO0NBQ25DLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksSUFBSSxDQUFDO0NBQ25DO0NBQ0EsS0FBSztDQUNMO0NBQ0E7O0NDM1VPLE1BQU0sS0FBSyxTQUFTLEtBQUssQ0FBQztBQUNqQztDQUNBLElBQUksV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUc7QUFDMUI7Q0FDQSxRQUFRLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUNuQjtDQUNBLEtBQUssSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxLQUFLLFNBQVMsR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUM1RCxRQUFRLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7QUFDckM7Q0FDQSxRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLFNBQVMsS0FBSyxTQUFTLEdBQUcsQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUM7Q0FDckUsUUFBUSxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDO0NBQ2xELFFBQVEsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQztBQUNsQztDQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsSUFBSSxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztBQUMxRDtDQUNBO0FBQ0E7Q0FDQSxRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLFNBQVMsS0FBSyxTQUFTLEdBQUcsQ0FBQyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUM7Q0FDeEUsUUFBUSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztBQUM5QjtDQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7QUFDNUI7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLEdBQUcsRUFBRSxDQUFDO0NBQ2pDLFFBQVEsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztDQUM5QixRQUFRLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQ3JCO0NBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7QUFDN0M7Q0FDQSxRQUFRLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTLEdBQUc7QUFDdEM7Q0FDQSxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztBQUNqRDtDQUNBLFlBQVksR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUM7Q0FDL0IsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7Q0FDL0MsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsR0FBRyxTQUFRO0NBQ3pELGFBQWE7Q0FDYjtDQUNBO0NBQ0E7Q0FDQTtDQUNBLFlBQVksSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7Q0FDMUIsWUFBWSxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUN6QjtDQUNBLFNBQVM7QUFDVDtDQUNBLFFBQVEsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztDQUMvQixRQUFRLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDOUI7Q0FDQTtBQUNBO0NBQ0E7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcseURBQXlELEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO0NBQzVMO0NBQ0E7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUNqRDtDQUNBLFFBQVEsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsbUJBQW1CLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztDQUN0SixRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7QUFDbEY7Q0FDQSxRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQztDQUMvSCxRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxjQUFjLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNoSjtDQUNBLFFBQVEsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDeEQsUUFBUSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Q0FDbkIsUUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztBQUN4QjtDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDcEI7Q0FDQSxRQUFRLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQzNDO0NBQ0EsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO0NBQ3RELFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDckMsU0FBUyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMzQjtDQUNBLFlBQVksSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7Q0FDdEYsY0FBYyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQztBQUM3RDtDQUNBLFNBQVMsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQzlIO0NBQ0EsU0FBUztBQUNUO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztDQUNyQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO0FBQ3hCO0NBQ0E7QUFDQTtDQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3BCO0NBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxFQUFFO0NBQ3JDLFlBQVks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O0FBQ2xCO0NBQ0EsS0FBSyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDdEI7Q0FDQSxRQUFRLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUM3QjtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksUUFBUSxDQUFDLEdBQUc7QUFDaEI7Q0FDQSxLQUFLLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUU7Q0FDckM7QUFDQTtDQUNBLEtBQUssSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDckM7Q0FDQSxNQUFNLENBQUMsR0FBRyxFQUFFLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUM7Q0FDNUMsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQ3BDO0NBQ0EsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBRztDQUMxQixNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUU7QUFDdEI7Q0FDQSxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLEtBQUssR0FBRyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUM7Q0FDekQsV0FBVyxDQUFDLElBQUksS0FBSyxHQUFHLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFB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QUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFFO0NBQy9CLFNBQVM7QUFDVDtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksS0FBSyxDQUFDLEdBQUc7QUFDYjtDQUNBLFFBQVEsS0FBSyxDQUFDLEtBQUssR0FBRTtBQUNyQjtDQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUM7QUFDdEI7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBSztBQUNwQztDQUNBLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEtBQUssS0FBSTtBQUNwRDtDQUNBLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUk7Q0FDbEMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSTtDQUNsQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLEtBQUk7Q0FDdkMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFJO0FBQ3ZDO0NBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksR0FBRTtBQUM3QztDQUNBLEtBQUs7QUFDTDtDQUNBO0NBQ0E7Q0FDQTtBQUNBO0NBQ0E7Q0FDQTtDQUNBO0FBQ0E7Q0FDQTtBQUNBO0NBQ0E7QUFDQTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0FBQ0E7Q0FDQTtDQUNBO0NBQ0E7O0NDNWNPLE1BQU0sUUFBUSxTQUFTLEtBQUssQ0FBQztBQUNwQztDQUNBLElBQUksV0FBVyxFQUFF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Q0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDaEU7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Q0FDbkQsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Q0FDNUUsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztBQUM3RjtDQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUM7QUFDcEI7QUFDQTtDQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNoQztDQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3BCO0NBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0NBQzNCO0NBQ0EsS0FBSztBQUNMO0NBQ0EsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLEdBQUc7QUFDbEI7Q0FDQSxRQUFRLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFNO0FBQzVCO0NBQ0EsUUFBUSxPQUFPLElBQUk7Q0FDbkIsWUFBWSxLQUFLLENBQUM7Q0FDbEIsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7Q0FDbEMsb0JBQW9CLElBQUksQ0FB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UUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDekM7Q0FDQSxRQUFRLEtBQUssUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUc7Q0FDeEMsWUFBWSxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDM0QsWUFBWSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7Q0FDM0QsWUFBWSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUM7Q0FDM0QsU0FBUztBQUNUO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUN6RTtDQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ3RCO0NBQ0EsS0FBSztBQUNMO0NBQ0EsSUFBSSxRQUFRLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDbkI7Q0FDQSxRQUFRLEdBQUcsQ0FBQyxHQUFHLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEM7Q0FDQSxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO0NBQzlDLFFBQVEsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3pCO0NBQ0EsS0FBSztBQUNMO0NBQ0EsSUFBSSxNQUFN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QUFFLENBQUM7Q0FDbkMsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFFO0NBQ3RELFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRTtDQUN0RCxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUU7Q0FDdEQsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEdBQUU7Q0FDekQ7Q0FDQSxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUU7Q0FDakYsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUM7QUFDNUY7Q0FDQSxRQUFRLEtBQUssSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUc7QUFDOUI7Q0FDQSxZQUFZLEtBQUssQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFB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RyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQzFFO0NBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM5QztDQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdEc7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztDQUN2RCxRQUFRLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDekQ7Q0FDQSxRQUFRLElBQUksS0FBSyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0NBQ3RDLFFBQVEsSUFBSSxLQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDO0FBQ2hEO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLEtBQUssSUFBSSxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsR0FBRyxD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QUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUM7Q0FDOUMsWUFBWSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQztDQUNuQyxZQUFZLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7Q0FDcEMsWUFBWSxJQUFJLEdBQUcsR0FBRyxFQUFFLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDdkQsWUFBWSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLEVBQUUsR0FBRyxLQUFLLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxLQUFLLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDakk7Q0FDQSxZQUFZLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztDQUNuSyxZQUFZLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDO0NBQ3pEO0NBQ0EsU0FBUztBQUNUO0NBQ0EsUUFBUSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFF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SUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztDQUNyVSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsZ0RBQWdELENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNySztDQUNBLFFBQVEsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0NBQ2xJLFFBQVEsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxRQUFRLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLFlBQVksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQzdKO0NBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQztBQUN4QztBQUNBO0NBQ0EsUUFBUSxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUU7Q0FDdEIsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUk7QUFDN0I7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRTtDQUNwQixZQUFZLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxLQUFLLEVBQUU7Q0FDekMsZ0JBQWdCLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUk7Q0FDbEMsYUFBYSxNQUFNLElBQUksQ0FBQyxDQUFDLElBQUksWUFBWSxNQUFNLEVBQUU7Q0FDakQsZ0JBQWdCLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEtBQUk7Q0FDdkMsZ0JBQWdCLEtBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUU7Q0FDbEUsYUFBYTtDQUNiLFNBQVM7QUFDVDtDQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDeEI7Q0FDQSxRQUFRLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO0FBQzNCO0NBQ0E7Q0FDQSxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBQztBQUN0QjtDQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzVCO0NBQ0EsUUFBUSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLEVBQUM7QUFDaEQ7Q0FDQTtDQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLEtBQUssQ0FBQztBQUNwQztDQUNBLFFBQVEsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7Q0FDcEIsUUFBUSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7Q0FDMUIs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LENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTTtBQUMvRDtDQUNBLFFBQVEsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7Q0FDM0MsUUFBUSxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQy9EO0NBQ0EsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDaEU7QUFDQTtBQUNBO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztDQUNqRCxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0NBQy9DLFFBQVEsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7Q0FDOUMsUUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUM5QztDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO0NBQ3ZELFFBQVEsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO0NBQy9ELFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBQ3BEO0NBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsRUFBRTtDQUN2QyxZQUFZLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO0NBQ3hDLFlBQVksSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7Q0FDL0IsU0FBUztBQUNUO0NBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxVQUFVLEdBQUc7QUFDOUI7Q0FDQSxZQUFZLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUM7Q0FDN0QsWUFBWSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQztDQUNwRCxZQUFZLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFDO0NBQ3JELFlBQVksSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUM7Q0FDekQsWUFBWSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUTtDQUNqRCxZQUFZLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQzVFO0NBQ0EsU0FBUztBQUNUO0NBQ0EsUUFBUSxJQUFJLElBQUksRUFBRSxDQUFDLENBQUM7Q0FDcEIsUUFBUSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMxQztDQUNBLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDN0IsWUFBWSxJQUFJLEdBQUcs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Q0FDQSxTQUFTO0FBQ1Q7Q0FDQSxRQUFRLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztDQUMxQixRQUFRLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFFO0NBQy9DO0NBQ0EsS0FBSztBQUNMO0NBQ0EsSUFBSSxTQUFTLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDckM7Q0FDQSxRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDMUUsUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFDO0NBQzVGLFFBQVEsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEdBQUU7QUFDNUQ7QUFDQTtDQUNBO0NBQ0E7Q0FDQTtBQUNBO0NBQ0EsS0FBSztBQUNMO0NBQ0EsSUFBSSxTQUFTLENBQUMsRUFBRTtDQUNoQixRQUFRLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO0NBQ25DLFFBQVEsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtDQUNsQyxZQUFZLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxD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SSxDQUFDLFlBQVksRUFBRSxDQUFDO0FBQzVCO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDcEM7Q0FDQSxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDN0I7Q0FDQSxRQUFRLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUMxQztDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksS0FBSyxDQUFDLEdBQUc7QUFDYjtDQUNBLFFBQVEsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ3RCO0NBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzlEO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDcEM7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztDQUM1QixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0NBQ3pDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0NBQ25DLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO0FBQ3BEO0NBQ0EsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzdCO0NBQ0EsUUFBUSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDaEM7Q0FDQSxLQUFLO0FBQ0w7Q0FDQTtBQUNBO0NBQ0EsSUFBSSxJQUFJLENBQUMsRUFBRSxHQUFHLEdBQUc7QUFDakI7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLEdBQUcsQ0FBQztBQUNwQztDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksWUFBWSxDQUFDLEdBQUc7QUFDcEI7Q0FDQSxRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7Q0FDNUIsUUFBUSxNQUFNLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDeEU7Q0FDQSxLQUFLO0FBQ0w7Q0FDQSxJQUFJLEtBQUssQ0FBQyxHQUFHO0FBQ2I7Q0FDQSxRQUFRLEtBQUssQ0FBQyxLQUFLLEdBQUU7QUFDckI7Q0FDQTtBQUNBO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ3ZCLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztDQUN4QixRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDeEI7Q0FDQSxRQUFRLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLFNBQVMsRUFBRSxPQUFPO0FBQ3JDO0NBQ0EsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7Q0FDOUIsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUM7QUFDNUI7Q0FDQSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztDQUM5QixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUM3QjtDQUNBLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDdEM7Q0FDQSxRQUFRLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0NBQ3BCLFFBQVEsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztDQUM1RCxRQUFRLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7QUFDNUM7Q0FDQSxLQUFLO0FBQ0w7Q0FDQTs7Q0MzMEJPLE1BQU0sT0FBTyxTQUFTLEtBQUssQ0FBQztBQUNuQztDQUNBLElBQUksV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUc7QUFDMUI7Q0FDQSxRQUFRLEtBQUssRUFBRSxDQUFDLEdBQUU7QUFDbEI7Q0FDQSxRQUFRLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxHQUFFO0FBQy9CO0NBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLElBQUksTUFBSztBQUN2QztDQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFLO0NBQzNCLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsRUFBQztDQUN4QixRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBQztDQUN0QixRQUFRLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBQztDQUN6QixRQUFRLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSTtDQUM1QixRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBSztDQUM1QixRQUFRLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBSztBQUM3QjtDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFO0NBQ3ZCLFlBQVksSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFJO0NBQy9CLFlBQVksSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBSztDQUNwQyxZQUFZLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDLE1BQUs7Q0FDdkMsU0FBUztBQUNUO0NBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksTUFBSztBQUNyQztDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsS0FBSyxLQUFLLFNBQVMsRUFBRTtDQUNuQyxZQUFZLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFO0NBQ2pDLGdCQUFnQixJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBQztDQUN0QyxhQUFhLE1BQU0sSUFBSSxDQUFDLENBQUMsS0FBSyxZQUFZLEtBQUssRUFBRTtDQUNqRCxnQkFBZ0IsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsTUFBSztDQUNwQyxnQkFBZ0IsSUFBSSxDQUFDLFFBQVEsR0FBRyxNQUFLO0NBQ3JDLGFBQWEsTUFBTSxJQUFJLENBQUMsQ0FBQyxLQUFLLFlBQVksTUFBTSxFQUFFO0NBQ2xELGdCQUFnQixJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUU7Q0FDL0IsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFDO0NBQ3ZFLGdCQUFnQixJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBQztDQUN2RSxnQkFBZ0IsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUM7Q0FDdkUsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFDO0NBQ3ZFLGdCQUFnQixJQUFJLENBQUMsUUFBUSxHQUFHLE1BQUs7Q0FDckMsZ0JBQWdCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSTtDQUNwQyxhQUFhO0NBQ2IsU0FBUztBQUNUO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTTtDQUNwQyxRQUFRLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRTtBQUNyQjtDQUNBLFFBQVEsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLEVBQUM7Q0FDekIsUUFBUSxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRTtBQUMxQztDQUNBLFFBQVEsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU07QUFDNUI7Q0FDQTtDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxjQUFjLEdBQUcsRUFBRSxDQUFDLE1BQU0sR0FBRywrQkFBK0IsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRTtBQUN6STtDQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFFO0NBQ3ZCO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBRztDQUN4QixRQUFRLE1BQU0sQ0FBQyxFQUFFLENBQUM7QUFDbEI7Q0FDQSxZQUFZLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsR0FBRTtDQUN4RyxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLGtCQUFrQixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsZUFBZSxHQUFHLEVBQUUsQ0FBQyxJQUFJLEdBQUcsZ0JBQWdCLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBQztDQUNyTixZQUFZLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLFNBQVE7Q0FDL0QsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUM7Q0FDbkQsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSTtDQUN0RCxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxLQUFJO0NBQ3BDLFlBQVksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFDO0FBQzdCO0NBQ0EsU0FBUztBQUNUO0NBQ0E7Q0FDQSxRQUFRLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7Q0FDckMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxxQ0FBcUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLHdDQUF3QyxHQUFHLEVBQUUsQ0FBQyxVQUFVLEdBQUcsZUFBZSxHQUFHLEVBQUUsQ0FBQyxNQUFNLEdBQUcsbUNBQW1DLENBQUMsQ0FBQztBQUMxUDtDQUNBO0NBQ0EsUUFBUSxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0NBQ3JDLFFBQVEsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsa0JBQWtCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyw0QkFBNEIsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ2pKO0NBQ0EsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Q0FDcEIsS0FBSztBQUNMO0NBQ0EsSUFBSSxRQUFRLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDbkI7Q0FDQSxRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFLO0NBQzFCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsT0FBTyxFQUFFO0FBQ2hEO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBRztDQUN4QixRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFHO0FBQ3hCO0NBQ0EsUUFBUSxPQUFPLENBQUMsRUFBRSxFQUFFO0NBQ3BCLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUM7Q0FDckQsU0FBUztBQUNUO0NBQ0EsUUFBUSxPQUFPLEVBQUU7QUFDakI7Q0FDQSxLQUFLO0FBQ0w7Q0FDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBLElBQUksU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ3BCO0NBQ0EsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRTtBQUNyQztDQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7Q0FDMUIsWUFBWSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUk7Q0FDOUIsWUFBWSxJQUFJLElBQUksS0FBSyxFQUFFLEVBQUU7Q0FDN0IsYUFBYSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUk7Q0FDaEMsYUFBYSxJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLFVBQVUsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSxHQUFFO0NBQ2hKLGFBQWEsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUU7Q0FDeEQsYUFBYTtDQUNiLFlBQVksT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRTtDQUN0QyxTQUFTO0FBQ1Q7Q0FDQSxRQUFRLE9BQU8sS0FBSztBQUNwQjtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksT0FBTyxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ2xCO0NBQ0EsS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUU7Q0FDdEI7Q0FDQSxZQUFZLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBSztDQUMvQixZQUFZLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFFO0FBQzlDO0NBQ0EsWUFBWSxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFO0NBQ3RDLFNBQVM7QUFDVDtDQUNBLFFBQVEsT0FBTyxLQUFLO0FBQ3BCO0NBQ0EsS0FBSztBQUNMO0NBQ0EsSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDcEI7Q0FDQSxRQUFRLElBQUksR0FBRyxHQUFHLE1BQUs7Q0FDdkIsUUFBUSxJQUFJLENBQUMsR0FBRyxFQUFDO0FBQ2pCO0NBQ0EsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsR0FBRTtBQUNyQztDQUNBLFFBQVEsSUFBSSxJQUFJLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUU7Q0FDdkMsYUFBWTtDQUNaLFNBQVMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUM5QyxjQUFjLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sS0FBSyxDQUFDLENBQUMsR0FBRyxNQUFNLEdBQUcsU0FBUyxFQUFFLENBQUM7Q0FDdEUsU0FBUztBQUNUO0NBQ0E7QUFDQTtDQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO0FBQ3pCO0NBQ0EsU0FBUyxJQUFJLElBQUksQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUFDLEVBQUU7QUFDbEM7Q0FDQSxhQUFhLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFFO0FBQ3JGO0NBQ0EsZ0JBQWdCLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUM7QUFDaEU7Q0FDQSxnQkFBZ0IsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUM7Q0FDN0QsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDO0FBQ2pGO0NBQ0EsZ0JBQWdCLElBQUksQ0FBQyxRQUFRLEdBQUU7QUFDL0I7Q0FDQSxnQkFBZ0IsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQU87Q0FDdkMsZ0JBQWdCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFPO0FBQ3ZDO0NBQ0EsZ0JBQWdCLEdBQUcsR0FBRyxLQUFJO0NBQzFCLGNBQWM7QUFDZDtDQUNBLFNBQVMsTUFBTTtBQUNmO0NBQ0EsU0FBUyxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBQztDQUN6RCxTQUFTLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDO0NBQ2pFLFNBQVMsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFO0FBQzlDO0NBQ0EsU0FBUztBQUNUO0NBQ0EsUUFBUSxPQUFPLEdBQUc7QUFDbEI7Q0FDQSxLQUFLO0FBQ0w7Q0FDQTtBQUNBO0NBQ0EsSUFBSSxLQUFLLENBQUMsR0FBRztBQUNiO0NBQ0EsUUFBUSxJQUFJLEdBQUcsR0FBRyxNQUFLO0NBQ3ZCLFFBQVEsT0FBTyxHQUFHO0FBQ2xCO0NBQ0EsS0FBSztBQUNMO0FBQ0E7Q0FDQSxJQUFJLFFBQVEsQ0FBQyxFQUFFLENBQUMsR0FBRztBQUNuQjtDQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO0NBQzNCLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0NBQ3ZELFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0NBQ3ZELFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0NBQ3ZELFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDO0NBQ3ZELFNBQVMsTUFBTTtDQUNmLFlBQVksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBQztDQUNoRCxTQUFTO0FBQ1Q7Q0FDQSxRQUFRLElBQUksQ0FBQyxNQUFNLEdBQUU7QUFDckI7Q0FDQSxLQUFLO0FBQ0w7Q0FDQSxJQUFJLE9BQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRTtBQUNuQjtDQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFNO0NBQ2pDLFFBQVEsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUcsSUFBRztBQUNwRDtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksTUFBTSxDQUFDLEVBQUUsRUFBRSxHQUFHO0FBQ2xCO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU07QUFDakM7Q0FDQSxRQUFRLE1BQU0sQ0FBQyxFQUFFLENBQUM7Q0FDbEIsYUFBYSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFFO0NBQzNFLGFBQWEsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFDO0NBQ3hELFNBQVM7QUFDVDtDQUNBLFFBQVEsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRTtBQUM1QjtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ2Y7Q0FDQSxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQUs7QUFDM0I7Q0FDQSxRQUFRLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSTtBQUMxQjtDQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksRUFBRTtBQUN0QztDQUNBLFlBQVksSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFO0NBQy9CLGdCQUFnQixJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFFO0NBQ2hFLGFBQWEsTUFBTTtDQUNuQixnQkFBZ0IsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBQztDQUNyRCxhQUFhO0FBQ2I7Q0FDQSxTQUFTO0FBQ1Q7Q0FDQSxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxHQUFFO0NBQzlELFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFLO0FBQzNCO0NBQ0EsS0FBSztBQUNMO0FBQ0E7Q0FDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQzFCO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBQztDQUN0QixRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUM7Q0FDdkUsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssR0FBRyxNQUFLO0NBQ3RDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEtBQUk7Q0FDaEQsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSTtDQUNsRCxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxLQUFJO0NBQzNDLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxHQUFHLEVBQUM7Q0FDM0M7Q0FDQSxLQUFLO0FBQ0w7Q0FDQSxJQUFJLFFBQVEsQ0FBQyxHQUFHO0FBQ2hCO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBQztDQUN0QixRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTTtDQUNyQixRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsR0FBRyxHQUFFO0NBQzVDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLEtBQUk7Q0FDekMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsS0FBSTtBQUN6QztDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksUUFBUSxDQUFDLEVBQUUsS0FBSyxHQUFHO0FBQ3ZCO0NBQ0EsUUFBUSxJQUFJLEVBQUUsR0FBRyxHQUFFO0NBQ25CLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUc7QUFDeEI7Q0FDQSxRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLEdBQUcsS0FBSTtBQUN0QztDQUNBLFFBQVEsTUFBTSxDQUFDLEVBQUUsQ0FBQztDQUNsQixTQUFTLEdBQUcsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7Q0FDbEQsZ0JBQWdCLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUM7Q0FDdEUsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFdBQVcsR0FBRyxHQUFFO0NBQ2hELGdCQUFnQixJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUU7Q0FDbEMsYUFBYSxNQUFNO0NBQ25CLGdCQUFnQixJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUM7Q0FDM0QsYUFBYTtBQUNiO0NBQ0EsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBSztDQUMzQyxTQUFTO0FBQ1Q7Q0FDQSxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsTUFBTTtDQUMzQixRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFFO0FBQy9DO0NBQ0EsS0FBSztBQUNMO0NBQ0E7Q0FDQTtDQUNBO0FBQ0E7Q0FDQSxJQUFJLEtBQUssQ0FBQyxHQUFHO0FBQ2I7Q0FDQSxRQUFRLEtBQUssQ0FBQyxLQUFLLEdBQUU7Q0FDckIsUUFBUSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUU7Q0FDL0IsUUFBUSxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUM7Q0FDbEMsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFHO0NBQ3ZDLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUM7Q0FDdEIsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBRztBQUN4QjtDQUNBLFFBQVEsTUFBTSxDQUFDLEVBQUUsQ0FBQztDQUNsQjtDQUNBLFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUU7Q0FDbEUsWUFBWSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUM7Q0FDNUQsWUFBWSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUk7Q0FDbkQsWUFBWSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEtBQUk7Q0FDcEQsU0FBUztBQUNUO0NBQ0EsS0FBSztBQUNMO0NBQ0E7O0NDelRPLE1BQU0sS0FBSyxTQUFTLEtBQUssQ0FBQztDQUNqQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO0NBQ3RCLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2I7Q0FDQSxJQUFJLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztDQUNsRCxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7QUFDaEM7Q0FDQSxJQUFJLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUI7Q0FDQSxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUM7Q0FDOUIsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNsRDtDQUNBO0FBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO0NBQ3hCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7Q0FDeEIsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDO0FBQ3BDO0NBQ0EsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDO0NBQ2xDLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQztBQUN0QztDQUNBLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7QUFDNUI7Q0FDQSxJQUFJLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDekI7Q0FDQTtDQUNBO0NBQ0EsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHO0NBQ3hCLE1BQU0sS0FBSztDQUNYLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTO0NBQ3hCLFFBQVEsa0RBQWtEO0NBQzFELFFBQVEsRUFBRSxDQUFDLElBQUk7Q0FDZixRQUFRLEdBQUc7Q0FDWCxLQUFLLENBQUM7Q0FDTjtDQUNBLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRztDQUN4QixNQUFNLEtBQUs7Q0FDWCxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLGlCQUFpQixHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSztDQUN6RCxLQUFLLENBQUM7QUFDTjtDQUNBLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRztDQUN4QixNQUFNLEtBQUs7Q0FDWCxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSztDQUNwQixRQUFRLGFBQWE7Q0FDckIsUUFBUSxFQUFFLENBQUMsSUFBSTtDQUNmLFFBQVEsb0JBQW9CO0NBQzVCLFNBQVMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDcEIsUUFBUSxLQUFLO0NBQ2IsS0FBSyxDQUFDO0NBQ04sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHO0NBQ3hCLE1BQU0sS0FBSztDQUNYLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLO0NBQ3BCLFFBQVEsNEJBQTRCO0NBQ3BDLFNBQVMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7Q0FDckIsUUFBUSxpQkFBaUI7Q0FDekIsUUFBUSxFQUFFLENBQUMsSUFBSTtDQUNmLFFBQVEsR0FBRztDQUNYLEtBQUssQ0FBQztBQUNOO0NBQ0EsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7Q0FDM0I7Q0FDQTtDQUNBLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztDQUMvQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDcEQ7Q0FDQSxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQUU7Q0FDMUIsTUFBTSxJQUFJLEVBQUUsR0FBRyxDQUFDO0NBQ2hCLFFBQVEsRUFBRSxHQUFHLENBQUM7Q0FDZCxRQUFRLEVBQUUsR0FBRyxDQUFDO0NBQ2QsUUFBUSxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDO0NBQ3ZCLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNoQjtDQUNBLE1BQU0sSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRTtDQUM1QixRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7Q0FDZixRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7Q0FDZixRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7Q0FDZixRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7Q0FDZixRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEdBQUcsQ0FBQztDQUNoQyxPQUFPO0FBQ1A7Q0FDQSxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztBQUM3RDtDQUNBLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7Q0FDL0MsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztDQUN6QyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO0NBQ3JELE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDO0NBQ3JELE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7Q0FDekMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFB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QyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDO0FBQzVFO0NBQ0E7Q0FDQSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDO0FBQzFEO0NBQ0E7Q0FDQSxNQUFNLElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUN0RDtDQUNBLE1BQU0sSUFBSSxJQUFJLEdBQUcsTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztDQUNoRCxNQUFNLElBQUksVUFBVSxHQUFHLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDM0Q7Q0FDQSxNQUFNLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNuRDtDQUNBLE1BQU0sSUFBSSxLQUFLLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDbEM7Q0FDQSxNQUFNLElBQUksS0FBSyxDQUFDO0NBQ2hCLE1BQU0sSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksRUFBRTtDQUNwRCxRQUFRLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDOUMsUUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQ2pFO0FBQ0E7Q0FDQSxRQUFRLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENB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LElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQztDQUN4RCxRQUFRLE1BQU07Q0FDZCxNQUFNLEtBQUssQ0FBQztDQUNaO0NBQ0EsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUM7Q0FDakMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUM7Q0FDbEMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUM7Q0FDdEMsUUFBUSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQztDQUM1RCxRQUFRLE1BQU07Q0FDZCxLQUFLO0NBQ0wsR0FBRztBQUNIO0NBQ0EsRUFBRSxNQUFNLENBQUMsRUFBRSxFQUFFO0NBQ2IsSUFBSSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7Q0FDaEY7QUFDQTtDQUNBLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO0NBQ3RELElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7Q0FDNUQsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ2pFO0NBQ0EsSUFBSSxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Q0FDeEIsR0FBRztBQUNIO0NBQ0EsRUFBRSxLQUFLLEdBQUc7Q0FDVixJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNsQjtDQUNBLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO0NBQzlCLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BCO0NBQ0EsSUFBSSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO0NBQ3JCLElBQUksSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7Q0FDckQsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUMvQjtDQUNBO0FBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbkI7Q0FDQSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0NBQ3BDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7Q0FDcEM7Q0FDQSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7Q0FDL0IsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7Q0FDMUIsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0NBQy9CLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0NBQzFCLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDbkM7Q0FDQSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztDQUNsQixHQUFHO0NBQ0g7O0NDeFNPLE1BQU0sU0FBUyxTQUFTLEtBQUssQ0FBQztBQUNyQztDQUNBLElBQUksV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUc7QUFDMUI7Q0FDQSxRQUFRLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUNuQjtDQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7QUFDdkI7Q0FDQSxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssS0FBSyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7Q0FDMUQsUUFBUSxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDO0FBQy9DO0NBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLElBQUksS0FBSyxDQUFDO0NBQ3hDLFFBQVEsSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztBQUM3RDtDQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7QUFDNUI7Q0FDQSxRQUFRLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFNO0FBQzVCO0NBQ0E7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcsa0JBQWtCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxZQUFZLEdBQUcsRUFBRSxDQUFDLElBQUksR0FBRyxlQUFlLEdBQUcsRUFBRSxDQUFDLElBQUksR0FBRyxnQkFBZ0IsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7Q0FDck4sUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQzNDO0NBQ0E7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEdBQUcscUNBQXFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyx3Q0FBd0MsR0FBRyxFQUFFLENBQUMsVUFBVSxHQUFHLGVBQWUsR0FBRyxFQUFFLENBQUMsTUFBTSxHQUFHLG1DQUFtQyxDQUFDLENBQUM7QUFDOU87Q0FDQTtDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxrQkFBa0IsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLDRCQUE0QixDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDbkk7Q0FDQTtDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsR0FBRyxrQkFBa0IsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLHNFQUFzRSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUM7Q0FDbkwsUUFBUSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7QUFDekU7Q0FDQTtBQUNBO0FBQ0E7Q0FDQSxRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNwQjtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksUUFBUSxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ25CO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0NBQzNCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsT0FBTyxFQUFFLENBQUM7Q0FDakQsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxPQUFPLE1BQU0sQ0FBQztDQUMzQyxRQUFRLE9BQU8sRUFBRSxDQUFDO0FBQ2xCO0NBQ0EsS0FBSztBQUNMO0NBQ0E7Q0FDQTtDQUNBO0FBQ0E7Q0FDQSxJQUFJLE9BQU8sQ0FBQyxFQUFFLENBQUMsR0FBRztBQUNsQjtDQUNBLFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTztBQUNsQztDQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO0NBQ3pCLFlBQVksSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7Q0FDaEMsWUFBWSxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFLENBQUM7Q0FDdkMsU0FBUztBQUNUO0NBQ0EsUUFBUSxPQUFPLEtBQUssQ0FBQztBQUNyQjtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ3BCO0NBQ0EsUUFBUSxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPO0FBQ2xDO0NBQ0EsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3RDO0NBQ0EsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtDQUMxQixZQUFZLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0NBQy9CLFlBQVksSUFBSSxJQUFJLEtBQUssTUFBTSxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0NBQzdELFlBQVksT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRSxDQUFDO0NBQ3ZDLFNBQVM7QUFDVDtDQUNBLFFBQVEsT0FBTyxLQUFLLENBQUM7QUFDckI7Q0FDQSxLQUFLO0FBQ0w7Q0FDQSxJQUFJLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBRztBQUNwQjtDQUNBLFFBQVEsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsT0FBTztBQUNsQztDQUNBLFFBQVEsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUN0QztDQUNBO0NBQ0E7QUFDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2xCO0NBQ0EsUUFBUSxJQUFJLElBQUksS0FBSyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztDQUNsRCxhQUFhLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUMzQjtDQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3REO0NBQ0EsUUFBUSxPQUFPLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUMzRDtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksTUFBTSxDQUFDLElBQUk7QUFDZjtDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztDQUMzQztDQUNBLEtBQUs7QUFDTDtDQUNBO0FBQ0E7Q0FDQSxJQUFJLEtBQUssQ0FBQyxHQUFHO0FBQ2I7Q0FDQSxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUN0QjtDQUNBLEtBQUs7QUFDTDtDQUNBO0NBQ0E7Q0FDQTtBQUNBO0NBQ0EsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDMUI7Q0FDQSxRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7Q0FDdkIsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztDQUM1QixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0NBQzNCLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssSUFBSSxDQUFDO0FBQ3JDO0NBQ0EsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxJQUFJLENBQUM7Q0FDdkMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUM7Q0FDaEMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxFQUFDO0NBQy9CO0NBQ0EsS0FBSztBQUNMO0NBQ0EsSUFBSSxRQUFRLENBQUMsR0FBRztBQUNoQjtDQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztDQUN2QixRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTztDQUN0QixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQztDQUNoQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxHQUFHLElBQUc7Q0FDakMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDOUI7Q0FDQSxLQUFLO0FBQ0w7Q0FDQSxJQUFJLFFBQVEsQ0FBQyxFQUFFLEtBQUssR0FBRztBQUN2QjtDQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDdkM7Q0FDQSxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7QUFDM0M7Q0FDQSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssS0FBSyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO0NBQ3pELGFBQWEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQztBQUN0RDtDQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPO0FBQzVCO0NBQ0EsUUFBUSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDcEI7Q0FDQSxLQUFLO0FBQ0w7Q0FDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBLElBQUksS0FBSyxDQUFDLEdBQUc7QUFDYjtDQUNBLFFBQVEsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ3RCO0NBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ3ZCLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztDQUNuQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDcEM7Q0FDQSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7Q0FDbkMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0NBQ3BDO0NBQ0EsS0FBSztBQUNMO0FBQ0E7Q0FDQTs7Q0NqTE8sTUFBTSxLQUFLLFNBQVMsS0FBSyxDQUFDO0FBQ2pDO0NBQ0EsSUFBSSxXQUFXLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRztBQUMxQjtDQUNBLFFBQVEsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ25CO0NBQ0EsUUFBUSxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLEVBQUUsQ0FBQztBQUNwQztDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxpREFBaUQsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3RKO0NBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO0FBQzNCO0NBQ0EsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztDQUM3QyxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7Q0FDckMsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUMzQztDQUNBLFNBQVM7QUFDVDtDQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN2QjtDQUNBLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLE1BQU0sQ0FBQztDQUNoRDtDQUNBLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsVUFBVSxJQUFJLE1BQU0sQ0FBQztBQUNqRDtBQUNBO0NBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztDQUNoSCxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLE1BQU0sQ0FBQztBQUN2QztDQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3BCO0NBQ0EsS0FBSztBQUNMO0NBQ0EsSUFBSSxJQUFJLEVBQUUsR0FBRyxHQUFHO0FBQ2hCO0NBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUM7QUFDcEM7Q0FD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QjtDQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxLQUFLO0FBQ3ZDO0NBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQUs7Q0FDM0IsUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUU7Q0FDN0IsWUFBWSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBQztDQUM5QyxZQUFZLElBQUksQ0FBQyxJQUFJLEdBQUU7Q0FDdkIsU0FBUztBQUNUO0NBQ0EsUUFBUSxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFO0FBQ2xDO0NBQ0EsS0FBSztBQUNMO0NBQ0EsSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDcEI7Q0FDQSxRQUFRLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLEtBQUs7Q0FDdEMsUUFBUSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUk7Q0FDMUIsUUFBUSxPQUFPLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxFQUFFO0FBQ2xDO0NBQ0EsS0FBSztBQUNMO0NBQ0EsSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDcEI7Q0FDQSxRQUFRLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQztDQUN2QixRQUFRLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEdBQUU7QUFDckM7Q0FDQSxRQUFRLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBRTtDQUM3QixZQUFZLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxFQUFDO0NBQ2xDLFlBQVksRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLEdBQUU7Q0FDNUQsU0FBUyxNQUFNO0NBQ2YsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLEtB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UUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztBQUN2QjtBQUNBO0NBQ0E7QUFDQTtDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLFFBQU87QUFDekM7Q0FDQTtBQUNBO0FBQ0E7QUFDQTtDQUNBLFFBQVEsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsU0FBUyxLQUFLLFNBQVMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUNyRTtDQUNBO0NBQ0E7Q0FDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0NBQzlGO0NBQ0E7Q0FDQSxRQUFRLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNwQztDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQzlDO0NBQ0E7Q0FDQSxRQUFRLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTLEdBQUc7QUFDdEM7Q0FDQSxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7Q0FDM0MsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsUUFBUSxDQUFDO0NB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QyxNQUFNLEVBQUUsQ0FBQyxFQUFDO0NBQzdELGdCQUFnQixJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDO0NBQzdELGdCQUFnQixJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFDO0NBQzdELGdCQUFnQixJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFFO0NBQzlEO0NBQ0EsWUFBWSxNQUFNO0NBQ2xCLFlBQVksS0FBSyxDQUFDO0FBQ2xCO0NBQ0EsZ0JBQWdCLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUM7Q0FDaEQsZ0JBQWdCLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUM7Q0FDOUQsZ0JBQWdCLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUM7Q0FDOUQsZ0JBQWdCLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUM7Q0FDaEUsZ0JBQWdCLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUM7Q0FDaEUsZ0JBQWdCLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLFVBQVUsRUFBRSxDQUFDLEdBQUU7Q0FDcEU7Q0FDQSxZQUFZLE1BQU07Q0FDbEIsU0FBUztBQUNUO0NBQ0EsUUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztDQUMxQixRQUFRLE9BQU8sSUFBSSxDQUFDO0FBQ3BCO0FBQ0E7QUFDQTtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksTUFBTSxDQUFDLEVBQUUsRUFBRSxHQUFHO0FBQ2xCO0NBQ0E7Q0FDQTtDQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUMzQztDQUNBLFFBQVEsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3pCO0NBQ0EsUUFBUSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDN0I7Q0FDQSxLQUFLO0FBQ0w7Q0FDQSxJQUFJLFNBQVMsR0FBRztBQUNoQjtDQUNBLFFBQVEsS0FBSyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsR0FBRztBQUMvQjtDQUNBLFlBQVksSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztDQUMxRCxZQUFZLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDMUQ7Q0FDQSxZQUFZLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Q0FDMUQsWUFBWSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQzFEO0NBQ0EsU0FBUztBQUNUO0NBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0NBQ3RELFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUN0RDtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ2pCO0NBQ0E7QUFDQTtDQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDNUM7Q0FDQSxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTTtBQUM3QjtDQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Q0FDeEUsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUN4RTtDQUNBLEtBQUs7QUFDTDtDQUNBLElBQUksUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxLQUFLLEdBQUc7QUFDL0I7Q0FDQSxRQUFRLElBQUksQ0FBQyxLQUFLLFNBQVMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUM3QztDQUNBO0NBQ0E7Q0FDQTtDQUNBO0FBQ0E7Q0FDQSxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0NBQ3ZHLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDdkc7Q0FDQSxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsR0FBRTtBQUNwSDtDQUNBO0FBQ0E7Q0FD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QSxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUM7Q0FDeEMsSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxVQUFVLElBQUksS0FBSyxDQUFDO0FBQzVDO0NBQ0EsSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxRQUFRLEtBQUssU0FBUyxHQUFHLENBQUMsQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO0FBQ3BFO0NBQ0EsSUFBSSxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNqQjtDQUNBO0NBQ0EsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7Q0FDM0IsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDN0MsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDN0MsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDN0MsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0M7Q0FDQSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdEQ7Q0FDQTtDQUNBLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEVBQUUsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDO0NBQ2hDLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ3JEO0NBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNoQztDQUNBLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDZjtDQUNBLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDaEI7Q0FDQSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Q0FDakMsSUFBSSxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2hEO0NBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLEtBQUssS0FBSyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7Q0FDOUQsSUFBSSxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDbEQ7Q0FDQSxJQUFJLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFVBQVUsS0FBSyxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUM7QUFDdkU7Q0FDQTtDQUNBLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQztDQUN0QyxJQUFJLElBQUksQ0FBQyxNQUFNO0NBQ2YsTUFBTSxDQUFDLENBQUMsR0FBRyxLQUFLLFNBQVMsR0FBRyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxHQUFHLGFBQWEsQ0FBQztBQUN2RTtDQUNBLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsR0FBRyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztDQUN2RCxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO0NBQ3hCLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7QUFDMUI7Q0FDQSxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO0NBQ2xCLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsQ0FBQztDQUN0QixJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0NBQ3RCLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7Q0FDeEIsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztDQUNuQixJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0NBQ25CLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDaEI7Q0FDQSxJQUFJLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO0FBQzdCO0NBQ0EsSUFBSSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0FBQ3pCO0NBQ0EsSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQyxHQUFHO0NBQzVCLE1BQU0sS0FBSztDQUNYLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLO0NBQ3BCLFFBQVEsK0NBQStDO0NBQ3ZELFFBQVEsRUFBRSxDQUFDLE9BQU87Q0FDbEIsUUFBUSxJQUFJO0NBQ1osUUFBUSxJQUFJLENBQUMsTUFBTTtDQUNuQixLQUFLLENBQUM7QUFDTjtDQUNBLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUMsR0FBRztDQUNqQyxNQUFNLEtBQUs7Q0FDWCxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSztDQUNwQixRQUFRLDBEQUEwRDtDQUNsRSxLQUFLLENBQUM7Q0FDTjtDQUNBLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ2hEO0NBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0NBQ3hCLElBQUksSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sR0FBRyxvQ0FBb0MsR0FBRyxFQUFFLENBQUM7Q0FDNUUsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHO0NBQzFCLE1BQU0sS0FBSztDQUNYLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsUUFBUSxHQUFHLHNCQUFzQjtDQUN4RCxLQUFLLENBQUM7Q0FDTixJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUM5QztDQUNBO0NBQ0EsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQyxHQUFHO0NBQzdCLE1BQU0sS0FBSztDQUNYLE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLO0NBQ3BCLFFBQVEsd0JBQXdCO0NBQ2hDLFNBQVMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0NBQ3pCLFFBQVEsNENBQTRDO0NBQ3BELFFBQVEsRUFBRSxDQUFDLFVBQVU7Q0FDckIsUUFBUSxHQUFHO0NBQ1gsS0FBSyxDQUFDO0NBQ04sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDNUM7Q0FDQSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLEdBQUc7Q0FDM0IsTUFBTSxLQUFLO0NBQ1gsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUs7Q0FDcEIsUUFBUSxhQUFhO0NBQ3JCLFFBQVEsRUFBRSxDQUFDLE1BQU07Q0FDakIsUUFBUSw0QkFBNEI7Q0FDcEMsU0FBUyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Q0FDekIsUUFBUSxrQkFBa0I7Q0FDMUIsS0FBSyxDQUFDO0NBQ04sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDM0M7Q0FDQTtDQUNBLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsVUFBVSxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0FBQ3hEO0NBQ0EsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDO0NBQ3RCLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsR0FBRztDQUMzQixNQUFNLEtBQUs7Q0FDWCxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRztDQUNsQixRQUFRLHFFQUFxRTtDQUM3RSxRQUFRLENBQUM7Q0FDVCxRQUFRLGdDQUFnQztDQUN4QyxRQUFRLENBQUM7Q0FDVCxRQUFRLHFDQUFxQztDQUM3QyxRQUFRLElBQUksQ0FBQyxFQUFFO0NBQ2YsUUFBUSxrQkFBa0I7Q0FDMUIsU0FBUyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztDQUNyQixRQUFRLFlBQVk7Q0FDcEIsUUFBUSxFQUFFLENBQUMsSUFBSTtDQUNmLFFBQVEsR0FBRztDQUNYLEtBQUssQ0FBQztDQUNOLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0NBQzFDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU07Q0FDekMsUUFBUSxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztDQUMxQixRQUFRLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDM0IsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQztBQUNqRDtDQUNBO0FBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sS0FBSyxTQUFTLEdBQUcsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7Q0FDM0QsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLEtBQUssU0FBUyxHQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztBQUNsRTtDQUNBLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7Q0FDaEQsTUFBTSxJQUFJLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7Q0FDbEMsS0FBSztBQUNMO0NBQ0EsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNwRTtDQUNBLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxFQUFFLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO0FBQ3hFO0NBQ0EsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRTtDQUM1QixNQUFNLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxNQUFNLENBQUM7Q0FDaEQsS0FBSyxNQUFNO0NBQ1gsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO0NBQ3RDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztDQUN4QyxNQUFNLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDO0NBQ3ZCLEtBQUs7QUFDTDtDQUNBO0NBQ0EsSUFBSSxJQUFJLENBQUMsVUFBVTtDQUNuQixNQUFNLENBQUMsQ0FBQyxVQUFVLEtBQUssU0FBUyxHQUFHLENBQUMsQ0FBQyxVQUFVLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQztDQUNuRSxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDekU7Q0FDQSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztBQUNwQjtDQUNBLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztBQUN6QztDQUNBLElBQUksS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztDQUNwQixHQUFHO0FBQ0g7Q0FDQSxFQUFFLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7Q0FDekIsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDO0NBQ3RCLE1BQU0sSUFBSSxFQUFFLGFBQWE7Q0FDekIsTUFBTSxPQUFPLEVBQUUsQ0FBQztDQUNoQixNQUFNLE9BQU8sRUFBRSxDQUFDO0NBQ2hCLE1BQU0sS0FBSyxFQUFFLENBQUM7Q0FDZCxNQUFNLEdBQUcsRUFBRSxJQUFJO0NBQ2YsTUFBTSxPQUFPLEVBQUUsR0FBRztDQUNsQixLQUFLLENBQUMsQ0FBQztDQUNQLEdBQUc7QUFDSDtDQUNBLEVBQUUsZ0JBQWdCLEdBQUc7Q0FDckIsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDO0NBQ3RCLE1BQU0sSUFBSSxFQUFFLGFBQWE7Q0FDekIsTUFBTSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0NBQ2pCLE1BQU0sT0FBTyxFQUFFLENBQUMsQ0FBQztDQUNqQixNQUFNLEtBQUssRUFBRSxDQUFDO0NBQ2QsTUFBTSxHQUFHLEVBQUUsSUFBSTtDQUNmLE1BQU0sT0FBTyxFQUFFLEdBQUc7Q0FDbEIsS0FBSyxDQUFDLENBQUM7Q0FDUCxHQUFHO0FBQ0g7Q0FDQSxFQUFFLGNBQWMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFO0NBQ3ZCO0FBQ0E7Q0FDQTtDQUNBO0NBQ0EsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDO0NBQ3RCLE1BQU0sSUFBSSxFQUFFLFdBQVc7Q0FDdkIsTUFBTSxPQUFPLEVBQUUsQ0FBQztDQUNoQixNQUFNLE9BQU8sRUFBRSxDQUFDO0NBQ2hCLE1BQU0sS0FBSyxFQUFFLENBQUM7Q0FDZCxNQUFNLEdBQUcsRUFBRSxJQUFJO0NBQ2YsTUFBTSxPQUFPLEVBQUUsR0FBRztDQUNsQixLQUFLLENBQUMsQ0FBQztDQUNQLEdBQUc7QUFDSDtDQUNBLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUU7Q0FDZixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0NBQ3RDLElBQUksSUFBSSxDQUFDLEtBQUssU0FBUyxFQUFFLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDO0NBQzlDLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ2hCO0NBQ0EsSUFBSSxLQUFLLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztDQUM1QixHQUFHO0FBQ0g7Q0FDQSxFQUFFLGFBQWEsR0FBRztDQUNsQixJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7Q0FDM0MsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxVQUFVO0NBQ3hDLFFBQVEsU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLEdBQUcsWUFBWSxDQUFDO0NBQ25ELE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVTtDQUNuQyxRQUFRLFNBQVMsR0FBRyxJQUFJLENBQUMsVUFBVSxHQUFHLFlBQVksQ0FBQztDQUNuRCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsR0FBRyxZQUFZLENBQUM7Q0FDN0U7Q0FDQSxLQUFLO0FBQ0w7Q0FDQSxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0NBQzVCLElBQUksT0FBTyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO0NBQzVDLEdBQUc7QUFDSDtDQUNBO0NBQ0E7Q0FDQTtBQUNBO0NBQ0EsRUFBRSxNQUFNLEdBQUcsRUFBRTtBQUNiO0NBQ0EsRUFBRSxVQUFVLEdBQUc7Q0FDZixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLGVBQWU7Q0FDMUMsTUFBTSw4QkFBOEI7Q0FDcEMsTUFBTSxRQUFRO0NBQ2QsS0FBSyxDQUFDO0NBQ04sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztDQUNwQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMzRTtDQUNBO0NBQ0EsR0FBRztBQUNIO0NBQ0EsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFO0NBQ2QsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxFQUFFLE9BQU87QUFDckM7Q0FDQSxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQ3hCLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0NBQzlELElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztDQUN0QyxHQUFHO0FBQ0g7Q0FDQTtBQUNBO0NBQ0EsRUFBRSxNQUFNLEdBQUc7Q0FDWCxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztDQUN4QixHQUFHO0FBQ0g7Q0FDQSxFQUFFLE9BQU8sR0FBRztDQUNaLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztDQUNyQixHQUFHO0FBQ0g7Q0FDQSxFQUFFLFFBQVEsQ0FBQyxFQUFFLEVBQUUsSUFBSSxHQUFHLElBQUksRUFBRTtDQUM1QixJQUFJLElBQUksSUFBSTtDQUNaLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHO0NBQ3BCLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDO0NBQzVDLFFBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0NBQ2xFLE9BQU8sQ0FBQztDQUNSO0NBQ0EsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUc7Q0FDcEIsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUM7Q0FDNUMsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7Q0FDN0MsT0FBTyxDQUFDO0NBQ1I7QUFDQTtDQUNBO0NBQ0EsR0FBRztBQUNIO0NBQ0EsRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUFFO0NBQ2Y7Q0FDQSxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztDQUNwQixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUN2QyxHQUFHO0FBQ0g7Q0FDQSxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUU7Q0FDZixJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFO0NBQ3JCLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ2hELEtBQUs7Q0FDTCxHQUFHO0FBQ0g7Q0FDQSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUU7Q0FDckMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0NBQzdDLEdBQUc7QUFDSDtDQUNBLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRTtDQUNWLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLENBQUMsR0FBRyxRQUFRLEdBQUcsU0FBUyxDQUFDO0NBQzdELEdBQUc7QUFDSDtDQUNBLEVBQUUsT0FBTyxDQUFDLENBQUMsR0FBRyxLQUFLLEVBQUU7Q0FDckIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsQ0FBQyxHQUFHLFNBQVMsR0FBRyxRQUFRLENBQUM7Q0FDN0QsR0FBRztBQUNIO0NBQ0EsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFO0NBQ2QsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUM7Q0FDOUIsSUFBSSxPQUFPLElBQUksQ0FBQztDQUNoQixHQUFHO0FBQ0g7Q0FDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRTtDQUNWLElBQUksSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO0NBQzNCLElBQUksSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztBQUN6QjtDQUNBLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUN2QixNQUFNLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ2xCO0NBQ0EsTUFBTSxRQUFRLENBQUM7Q0FDZixRQUFRLEtBQUssS0FBSztDQUNsQixVQUFVLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQztDQUN6QixVQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDO0NBQ25ELFVBQVUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUM7Q0FDdkQsVUFBVSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQztDQUM1QyxVQUFVLE1BQU07QUFDaEI7Q0FDQTtDQUNBLFFBQVEsS0FBSyxZQUFZO0NBQ3pCLFVBQVUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztDQUNwQyxVQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDO0NBQ25ELFVBQVUsTUFBTTtDQUNoQixRQUFRLEtBQUssWUFBWTtDQUN6QixVQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDO0NBQ25ELFVBQVUsTUFBTTtBQUNoQjtDQUNBO0NBQ0EsUUFBUSxLQUFLLFlBQVk7Q0FDekIsVUFBVSxLQUFLLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0NBQ2xDLFVBQVUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQUM7Q0FDM0QsVUFBVSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQztDQUNoRCxVQUFVLE1BQU07Q0FDaEI7Q0FDQSxPQUFPO0FBQ1A7Q0FDQSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUM7Q0FDeEIsS0FBSztBQUNMO0NBQ0EsSUFBSSxPQUFPLFVBQVUsQ0FBQztDQUN0QixHQUFHO0FBQ0g7Q0FDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBLEVBQUUsV0FBVyxHQUFHO0NBQ2hCLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLENBQUMsQ0FBQyxFQUFFLE9BQU8sS0FBSyxDQUFDO0NBQzFDLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRTtDQUN0QjtDQUNBLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztDQUN6QixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7Q0FDekIsS0FBSztBQUNMO0NBQ0EsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztDQUN0QixJQUFJLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDdEI7Q0FDQTtBQUNBO0NBQ0EsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7Q0FDbkIsSUFBSSxPQUFPLElBQUksQ0FBQztDQUNoQixHQUFHO0FBQ0g7Q0FDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRTtDQUNkLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztDQUN2QixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDO0FBQzVDO0NBQ0EsSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLEtBQUssQ0FBQztBQUN6QjtDQUNBLElBQUksSUFBSSxJQUFJLEdBQUcsRUFBRSxDQUFDO0FBQ2xCO0NBQ0EsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3BFO0NBQ0EsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksR0FBRyxRQUFRLENBQUM7Q0FDMUUsU0FBUyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsUUFBUSxHQUFHLFNBQVMsQ0FBQztBQUMvQztDQUNBLElBQUksT0FBTyxJQUFJLENBQUM7Q0FDaEIsR0FBRztBQUNIO0NBQ0E7Q0FDQTtDQUNBO0FBQ0E7Q0FDQSxFQUFFLFdBQVcsQ0FBQyxDQUFDLEVBQUU7Q0FDakI7QUFDQTtDQUNBO0NBQ0E7Q0FDQSxJQUFJLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDdEI7Q0FDQSxJQUFJLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQztDQUN2QixJQUFJLElBQUksV0FBVyxHQUFHLEtBQUssQ0FBQztBQUM1QjtDQUNBLElBQUksSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQztDQUNBLElBQUksSUFBSSxJQUFJLEtBQUssU0FBUyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7Q0FDL0QsSUFBSSxJQUFJLElBQUksS0FBSyxXQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0FBQ2pFO0NBQ0EsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRTtDQUN6QyxNQUFNLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztDQUN6QixNQUFNLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO0NBQy9CLEtBQUs7QUFDTDtDQUNBLElBQUksSUFBSSxDQUFDLElBQUksRUFBRSxPQUFPO0FBQ3RCO0NBQ0EsSUFBSSxRQUFRLElBQUk7Q0FDaEIsTUFBTSxLQUFLLFNBQVM7Q0FDcEIsUUFBUSxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDdkU7Q0FDQSxRQUFRLElBQUksS0FBSyxDQUFDLFFBQVEsSUFBSSxJQUFJLEtBQUssV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzVFO0NBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hFO0NBQ0EsUUFBUSxJQUFJLElBQUksS0FBSyxXQUFXLEVBQUUsTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDNUQsUUFBUSxJQUFJLElBQUksS0FBSyxPQUFPLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFFBQVE7Q0FDN0QsVUFBVSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQztDQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUU7Q0FDekIsVUFBVSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztDQUNsQyxTQUFTO0FBQ1Q7Q0FDQSxRQUFRLE1BQU07Q0FDZCxNQUFNLEtBQUssUUFBUTtDQUNuQixRQUFRLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztDQUMzQixRQUFRLElBQUksSUFBSSxLQUFLLFdBQVcsRUFBRSxNQUFNLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztDQUNuRSxRQUFRLElBQUksSUFBSSxLQUFLLFdBQVcsRUFBRTtDQUNsQyxVQUFVLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLEdBQUcsSUFBSSxDQUFDO0NBQ25ELFVBQVUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU07Q0FDL0MsY0FBYyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztDQUNoQyxjQUFjLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDakM7Q0FDQSxVQUFVLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztDQUN0QixVQUFVLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDM0IsVUFBVSxNQUFNLEdBQUcsSUFBSSxDQUFDO0NBQ3hCLFNBQVM7QUFDVDtDQUNBLFFBQVEsTUFBTTtDQUNkLE1BQU0sS0FBSyxRQUFRO0NBQ25CLFFBQVEsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0NBQzNCLFFBQVEsSUFBSSxJQUFJLEtBQUssV0FBVyxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0NBQ25FLFFBQVEsSUFBSSxJQUFJLEtBQUssV0FBVyxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO0NBQ25FLFFBQVEsSUFBSSxJQUFJLEtBQUssT0FBTyxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ3ZELFFBQVEsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQzlFO0NBQ0EsUUFBUSxNQUFNO0NBQ2QsS0FBSztBQUNMO0NBQ0EsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLElBQUksQ0FBQztDQUNuQyxJQUFJLElBQUksV0FBVyxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUM7QUFDbkM7Q0FDQSxJQUFJLElBQUksSUFBSSxLQUFLLE9BQU8sRUFBRSxNQUFNLEdBQUcsSUFBSSxDQUFDO0NBQ3hDLElBQUksSUFBSSxJQUFJLEtBQUssU0FBUyxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUM7QUFDMUM7Q0FDQSxJQUFJLElBQUksTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztDQUM1QixHQUFHO0FBQ0g7Q0FDQSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFO0NBQ3JCLElBQUksSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQzdDO0NBQ0EsSUFBSSxJQUFJLElBQUksS0FBSyxJQUFJLENBQUMsT0FBTyxFQUFFO0NBQy9CLE1BQU0sSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0NBQ3pCLE1BQU0sSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7Q0FFMUIsTUFBTSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztDQUM5QixLQUFLO0FBQ0w7Q0FDQSxJQUFJLElBQUksSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFO0NBQ3JCLE1BQU0sSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztDQUMxQyxNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7Q0FDMUIsS0FBSztDQUNMLEdBQUc7QUFDSDtDQUNBLEVBQUUsT0FBTyxDQUFDLENBQUMsRUFBRTtDQUNiLElBQUksSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztDQUM1QixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQ3pCLElBQUksT0FBTyxJQUFJLENBQUM7Q0FDaEIsR0FBRztBQUNIO0NBQ0E7Q0FDQTtDQUNBO0FBQ0E7Q0FDQSxFQUFFLEtBQUssQ0FBQyxLQUFLLEVBQUU7Q0FDZixJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxPQUFPO0FBQzdCO0NBQ0E7QUFDQTtDQUNBLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQztDQUNyQixJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO0FBQ3hCO0NBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDN0IsSUFBSSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDaEM7Q0FDQSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ2pDO0NBQ0EsSUFBSSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUN4QjtDQUNBO0NBQ0EsR0FBRztBQUNIO0NBQ0E7Q0FDQTtDQUNBO0FBQ0E7Q0FDQSxFQUFFLEdBQUcsR0FBRztDQUNSO0FBQ0E7Q0FDQSxJQUFJLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQztDQUN0QixJQUFJLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQztBQUN0QjtDQUNBLElBQUksSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLEVBQUU7Q0FDbEMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztDQUN2QixNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQ3ZCO0NBQ0EsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztDQUM5QyxLQUFLLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxRQUFRLEVBQUU7Q0FDekMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztDQUMxRSxXQUFXO0NBQ1gsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztDQUN6QixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0NBQ3pCO0NBQ0EsUUFBUSxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztDQUNoRCxPQUFPO0NBQ1AsS0FBSztBQUNMO0NBQ0EsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztBQUMvQjtDQUNBLElBQUksSUFBSSxDQUFDLEtBQUssSUFBSSxFQUFFLE9BQU87QUFDM0I7Q0FDQSxJQUFJLElBQUksS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ25DLFNBQVMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUI7Q0FDQSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNoQjtDQUNBLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUM7QUFDekI7Q0FDQSxJQUFJLE9BQU8sQ0FBQyxDQUFDO0NBQ2IsR0FBRztBQUNIO0NBQ0E7QUFDQTtDQUNBLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRTtDQUNaLElBQUksSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztDQUMvQixHQUFHO0FBQ0g7Q0FDQTtBQUNBO0NBQ0EsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFO0NBQ2QsSUFBSSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUNqQyxJQUFJLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFO0NBQ25CO0NBQ0EsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0NBQ2hELE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQzdCLE1BQU0sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0NBQ2xCLEtBQUs7Q0FDTCxHQUFHO0FBQ0g7Q0FDQTtBQUNBO0NBQ0EsRUFBRSxLQUFLLEdBQUc7Q0FDVjtBQUNBO0NBQ0E7QUFDQTtDQUNBLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNO0NBQzNCLE1BQU0sSUFBSSxDQUFDO0FBQ1g7Q0FDQSxJQUFJLE9BQU8sQ0FBQyxFQUFFLEVBQUU7Q0FDaEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztDQUM1QixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztDQUN4QyxNQUFNLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztDQUNyQixLQUFLO0FBQ0w7Q0FDQSxJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO0NBQ2xCLElBQUksSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7Q0FDeEIsSUFBSSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Q0FDaEIsR0FBRztBQUNIO0NBQ0EsRUFBRSxLQUFLLEdBQUc7Q0FDVixJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztDQUNqQixHQUFHO0FBQ0g7Q0FDQSxFQUFFLE1BQU0sR0FBRztDQUNYLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0NBQ3pDLEdBQUc7QUFDSDtDQUNBLEVBQUUsT0FBTyxHQUFHO0NBQ1osSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Q0FDakIsSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztDQUNwRSxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7Q0FDdkIsR0FBRztBQUNIO0NBQ0E7Q0FDQTtDQUNBO0FBQ0E7Q0FDQSxFQUFFLFNBQVMsR0FBRztDQUNkLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTztBQUNqQztDQUNBLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7Q0FDNUIsSUFBSSxPQUFPLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7Q0FDdkMsR0FBRztBQUNIO0NBQ0EsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFO0NBQ2hCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTztBQUNqQztDQUNBLElBQUksSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7Q0FDdEIsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDckI7Q0FDQSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7Q0FDZixNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7Q0FDckIsTUFBTSxPQUFPO0NBQ2IsS0FBSztBQUNMO0NBQ0EsSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztDQUM1QixJQUFJLE9BQU8sQ0FBQyxFQUFFLEVBQUU7Q0FDaEIsTUFBTSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxLQUFLLElBQUksRUFBRTtDQUN0QyxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO0NBQ25DLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUTtDQUN6QixVQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDdEUsT0FBTztDQUNQLEtBQUs7Q0FDTCxHQUFHO0FBQ0g7Q0FDQTtDQUNBO0NBQ0E7QUFDQTtDQUNBLEVBQUUsUUFBUSxDQUFDLENBQUMsRUFBRTtDQUNkLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0NBQ2xDLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7Q0FDOUIsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsQ0FBQyxHQUFHLE9BQU8sR0FBRyxNQUFNLENBQUM7QUFDdkQ7Q0FDQSxJQUFJLElBQUksQ0FBQyxFQUFFO0NBQ1gsTUFBTSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDMUI7Q0FDQSxNQUFNLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztBQUNwQztDQUNBLE1BQU0sSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7Q0FDN0MsTUFBTSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUMxQztDQUNBLE1BQU0sSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDMUM7Q0FDQSxNQUFNLElBQUksQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDcEQ7Q0FDQSxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztDQUN2RCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztDQUNoRCxLQUFLO0FBQ0w7Q0FDQSxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0NBQzdDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Q0FDekIsR0FBRztBQUNIO0NBQ0EsRUFBRSxNQUFNLENBQUMsQ0FBQyxFQUFFO0NBQ1osSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN0QztDQUNBLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Q0FDNUMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdB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
