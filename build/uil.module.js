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

export { Files, Gui, REVISION, Tools, add };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWlsLm1vZHVsZS5qcyIsInNvdXJjZXMiOlsiLi4vc3JjL2NvcmUvUm9vdHMuanMiLCIuLi9zcmMvY29yZS9Ub29scy5qcyIsIi4uL3NyYy9jb3JlL0ZpbGVzLmpzIiwiLi4vc3JjL2NvcmUvVjIuanMiLCIuLi9zcmMvY29yZS9Qcm90by5qcyIsIi4uL3NyYy9wcm90by9Cb29sLmpzIiwiLi4vc3JjL3Byb3RvL0J1dHRvbi5qcyIsIi4uL3NyYy9wcm90by9DaXJjdWxhci5qcyIsIi4uL3NyYy9wcm90by9Db2xvci5qcyIsIi4uL3NyYy9wcm90by9GcHMuanMiLCIuLi9zcmMvcHJvdG8vR3JhcGguanMiLCIuLi9zcmMvcHJvdG8vRW1wdHkuanMiLCIuLi9zcmMvcHJvdG8vR3JvdXAuanMiLCIuLi9zcmMvcHJvdG8vSm95c3RpY2suanMiLCIuLi9zcmMvcHJvdG8vS25vYi5qcyIsIi4uL3NyYy9wcm90by9MaXN0LmpzIiwiLi4vc3JjL3Byb3RvL051bWVyaWMuanMiLCIuLi9zcmMvcHJvdG8vU2xpZGUuanMiLCIuLi9zcmMvcHJvdG8vVGV4dElucHV0LmpzIiwiLi4vc3JjL3Byb3RvL1RpdGxlLmpzIiwiLi4vc3JjL3Byb3RvL1NlbGVjdC5qcyIsIi4uL3NyYy9wcm90by9CaXRtYXAuanMiLCIuLi9zcmMvcHJvdG8vU2VsZWN0b3IuanMiLCIuLi9zcmMvcHJvdG8vSXRlbS5qcyIsIi4uL3NyYy9wcm90by9HcmlkLmpzIiwiLi4vc3JjL3Byb3RvL1BhZDJELmpzIiwiLi4vc3JjL2NvcmUvYWRkLmpzIiwiLi4vc3JjL2NvcmUvR3VpLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBAYXV0aG9yIGx0aCAvIGh0dHBzOi8vZ2l0aHViLmNvbS9sby10aFxyXG4gKi9cclxuXHJcbmV4cG9ydCBjb25zdCBSRVZJU0lPTiA9IFwiNC4zLjBcIjtcclxuXHJcbi8vIElOVEVOQUwgRlVOQ1RJT05cclxuXHJcbmNvbnN0IFIgPSB7XHJcbiAgdWk6IFtdLFxyXG5cclxuICBkb206IG51bGwsXHJcblxyXG4gIElEOiBudWxsLFxyXG4gIGxvY2s6IGZhbHNlLFxyXG4gIHdsb2NrOiBmYWxzZSxcclxuICBjdXJyZW50OiAtMSxcclxuXHJcbiAgbmVlZFJlWm9uZTogdHJ1ZSxcclxuICBuZWVkUmVzaXplOiBmYWxzZSxcclxuICBmb3JjZVpvbmU6IGZhbHNlLFxyXG4gIGlzRXZlbnRzSW5pdDogZmFsc2UsXHJcbiAgaXNMZWF2ZTogZmFsc2UsXHJcbiAgYWRkRE9NRXZlbnRMaXN0ZW5lcnM6IHRydWUsXHJcblxyXG4gIGRvd25UaW1lOiAwLFxyXG4gIHByZXZUaW1lOiAwLFxyXG5cclxuICAvL3ByZXZEZWZhdWx0OiBbJ2NvbnRleHRtZW51JywgJ3doZWVsJ10sXHJcbiAgcHJldkRlZmF1bHQ6IFtcImNvbnRleHRtZW51XCJdLFxyXG4gIHBvaW50ZXJFdmVudDogW1wicG9pbnRlcmRvd25cIiwgXCJwb2ludGVybW92ZVwiLCBcInBvaW50ZXJ1cFwiXSxcclxuICBldmVudE91dDogW1wicG9pbnRlcmNhbmNlbFwiLCBcInBvaW50ZXJvdXRcIiwgXCJwb2ludGVybGVhdmVcIl0sXHJcblxyXG4gIHhtbHNlcmlhbGl6ZXI6IG51bGwsXHJcbiAgdG1wVGltZTogbnVsbCxcclxuICB0bXBJbWFnZTogbnVsbCxcclxuXHJcbiAgb2xkQ3Vyc29yOiBcImF1dG9cIixcclxuXHJcbiAgaW5wdXQ6IG51bGwsXHJcbiAgcGFyZW50OiBudWxsLFxyXG4gIGZpcnN0SW1wdXQ6IHRydWUsXHJcblxyXG4gIGhpZGRlbkltcHV0OiBudWxsLFxyXG4gIGhpZGRlblNpemVyOiBudWxsLFxyXG4gIGhhc0ZvY3VzOiBmYWxzZSxcclxuICBzdGFydElucHV0OiBmYWxzZSxcclxuICBpbnB1dFJhbmdlOiBbMCwgMF0sXHJcbiAgY3Vyc29ySWQ6IDAsXHJcbiAgc3RyOiBcIlwiLFxyXG4gIHBvczogMCxcclxuICBzdGFydFg6IC0xLFxyXG4gIG1vdmVYOiAtMSxcclxuXHJcbiAgZGVidWdJbnB1dDogZmFsc2UsXHJcblxyXG4gIGlzTG9vcDogZmFsc2UsXHJcbiAgbGlzdGVuczogW10sXHJcblxyXG4gIGU6IHtcclxuICAgIHR5cGU6IG51bGwsXHJcbiAgICBjbGllbnRYOiAwLFxyXG4gICAgY2xpZW50WTogMCxcclxuICAgIGtleUNvZGU6IE5hTixcclxuICAgIGtleTogbnVsbCxcclxuICAgIGRlbHRhOiAwLFxyXG4gIH0sXHJcblxyXG4gIGlzTW9iaWxlOiBmYWxzZSxcclxuXHJcbiAgbm93OiBudWxsLFxyXG4gIG5lZWRzVXBkYXRlOiBmYWxzZSxcclxuXHJcbiAgZ2V0VGltZTogZnVuY3Rpb24gKCkge1xyXG4gICAgcmV0dXJuIHNlbGYucGVyZm9ybWFuY2UgJiYgc2VsZi5wZXJmb3JtYW5jZS5ub3dcclxuICAgICAgPyBzZWxmLnBlcmZvcm1hbmNlLm5vdy5iaW5kKHBlcmZvcm1hbmNlKVxyXG4gICAgICA6IERhdGUubm93O1xyXG4gIH0sXHJcblxyXG4gIGFkZDogZnVuY3Rpb24gKG8pIHtcclxuICAgIC8vIFIudWlbMF0gaXMgZGUgR1VJIG9iamVjdCB0aGF0IGlzIGFkZGVkIGZpcnN0IGJ5IHRoZSBjb25zdHJ1Y3RvclxyXG4gICAgUi51aS5wdXNoKG8pO1xyXG4gICAgUi5nZXRab25lKG8pO1xyXG5cclxuICAgIGlmICghUi5pc0V2ZW50c0luaXQpIFIuaW5pdEV2ZW50cygpO1xyXG4gIH0sXHJcblxyXG4gIHRlc3RNb2JpbGU6IGZ1bmN0aW9uICgpIHtcclxuICAgIGxldCBuID0gbmF2aWdhdG9yLnVzZXJBZ2VudDtcclxuICAgIGlmIChcclxuICAgICAgbi5tYXRjaCgvQW5kcm9pZC9pKSB8fFxyXG4gICAgICBuLm1hdGNoKC93ZWJPUy9pKSB8fFxyXG4gICAgICBuLm1hdGNoKC9pUGhvbmUvaSkgfHxcclxuICAgICAgbi5tYXRjaCgvaVBhZC9pKSB8fFxyXG4gICAgICBuLm1hdGNoKC9pUG9kL2kpIHx8XHJcbiAgICAgIG4ubWF0Y2goL0JsYWNrQmVycnkvaSkgfHxcclxuICAgICAgbi5tYXRjaCgvV2luZG93cyBQaG9uZS9pKVxyXG4gICAgKVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIGVsc2UgcmV0dXJuIGZhbHNlO1xyXG4gIH0sXHJcblxyXG4gIHJlbW92ZTogZnVuY3Rpb24gKG8pIHtcclxuICAgIGxldCBpID0gUi51aS5pbmRleE9mKG8pO1xyXG5cclxuICAgIGlmIChpICE9PSAtMSkge1xyXG4gICAgICBSLnJlbW92ZUxpc3RlbihvKTtcclxuICAgICAgUi51aS5zcGxpY2UoaSwgMSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKFIudWkubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIFIucmVtb3ZlRXZlbnRzKCk7XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICAgRVZFTlRTXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBpbml0RXZlbnRzOiBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAoUi5pc0V2ZW50c0luaXQpIHJldHVybjtcclxuXHJcbiAgICBsZXQgZG9tID0gZG9jdW1lbnQuYm9keTtcclxuXHJcbiAgICBSLmlzTW9iaWxlID0gUi50ZXN0TW9iaWxlKCk7XHJcbiAgICBSLm5vdyA9IFIuZ2V0VGltZSgpO1xyXG5cclxuICAgIGlmICghUi5pc01vYmlsZSkge1xyXG4gICAgICBkb20uYWRkRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIFIsIHsgcGFzc2l2ZTogZmFsc2UgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBkb20uc3R5bGUudG91Y2hBY3Rpb24gPSBcIm5vbmVcIjtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhcIlIuYWRkRE9NRXZlbnRMaXN0ZW5lcnMgXCIgKyBSLmFkZERPTUV2ZW50TGlzdGVuZXJzKTtcclxuICAgIGlmIChSLmFkZERPTUV2ZW50TGlzdGVuZXJzKSB7XHJcbiAgICAgIGRvbS5hZGRFdmVudExpc3RlbmVyKFwicG9pbnRlcmNhbmNlbFwiLCBSKTtcclxuICAgICAgZG9tLmFkZEV2ZW50TGlzdGVuZXIoXCJwb2ludGVybGVhdmVcIiwgUik7XHJcbiAgICAgIC8vZG9tLmFkZEV2ZW50TGlzdGVuZXIoICdwb2ludGVyb3V0JywgUiApXHJcblxyXG4gICAgICBkb20uYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJtb3ZlXCIsIFIpO1xyXG4gICAgICBkb20uYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJkb3duXCIsIFIpO1xyXG4gICAgICBkb20uYWRkRXZlbnRMaXN0ZW5lcihcInBvaW50ZXJ1cFwiLCBSKTtcclxuXHJcbiAgICAgIGRvbS5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBSLCBmYWxzZSk7XHJcbiAgICAgIGRvbS5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgUiwgZmFsc2UpO1xyXG4gICAgfVxyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJyZXNpemVcIiwgUi5yZXNpemUsIGZhbHNlKTtcclxuXHJcbiAgICAvL3dpbmRvdy5vbmJsdXIgPSBSLm91dDtcclxuICAgIC8vd2luZG93Lm9uZm9jdXMgPSBSLmluO1xyXG5cclxuICAgIFIuaXNFdmVudHNJbml0ID0gdHJ1ZTtcclxuICAgIFIuZG9tID0gZG9tO1xyXG4gIH0sXHJcblxyXG4gIHJlbW92ZUV2ZW50czogZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKCFSLmlzRXZlbnRzSW5pdCkgcmV0dXJuO1xyXG5cclxuICAgIGxldCBkb20gPSBkb2N1bWVudC5ib2R5O1xyXG5cclxuICAgIGlmICghUi5pc01vYmlsZSkge1xyXG4gICAgICBkb20ucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIndoZWVsXCIsIFIpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChSLmFkZERPTUV2ZW50TGlzdGVuZXJzKSB7XHJcbiAgICAgIGRvbS5yZW1vdmVFdmVudExpc3RlbmVyKFwicG9pbnRlcmNhbmNlbFwiLCBSKTtcclxuICAgICAgZG9tLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJwb2ludGVybGVhdmVcIiwgUik7XHJcbiAgICAgIC8vZG9tLnJlbW92ZUV2ZW50TGlzdGVuZXIoICdwb2ludGVyb3V0JywgUiApO1xyXG5cclxuICAgICAgZG9tLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJwb2ludGVybW92ZVwiLCBSKTtcclxuICAgICAgZG9tLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJwb2ludGVyZG93blwiLCBSKTtcclxuICAgICAgZG9tLnJlbW92ZUV2ZW50TGlzdGVuZXIoXCJwb2ludGVydXBcIiwgUik7XHJcblxyXG4gICAgICBkb20ucmVtb3ZlRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgUik7XHJcbiAgICAgIGRvbS5yZW1vdmVFdmVudExpc3RlbmVyKFwia2V5dXBcIiwgUik7XHJcbiAgICB9XHJcbiAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcihcInJlc2l6ZVwiLCBSLnJlc2l6ZSk7XHJcblxyXG4gICAgUi5pc0V2ZW50c0luaXQgPSBmYWxzZTtcclxuICB9LFxyXG5cclxuICByZXNpemU6IGZ1bmN0aW9uICgpIHtcclxuICAgIGxldCBpID0gUi51aS5sZW5ndGgsXHJcbiAgICAgIHU7XHJcblxyXG4gICAgd2hpbGUgKGktLSkge1xyXG4gICAgICB1ID0gUi51aVtpXTtcclxuICAgICAgaWYgKHUuaXNHdWkgJiYgIXUuaXNDYW52YXNPbmx5ICYmIHUuYXV0b1Jlc2l6ZSkgdS5jYWxjKCk7XHJcbiAgICB9XHJcblxyXG4gICAgUi5uZWVkUmVab25lID0gdHJ1ZTtcclxuICAgIFIubmVlZFJlc2l6ZSA9IGZhbHNlO1xyXG4gIH0sXHJcblxyXG4gIG91dDogZnVuY3Rpb24gKCkge1xyXG4gICAgY29uc29sZS5sb2coXCJpbSBhbSBvdXRcIik7XHJcbiAgICBSLmNsZWFyT2xkSUQoKTtcclxuICB9LFxyXG5cclxuICBpbjogZnVuY3Rpb24gKCkge1xyXG4gICAgY29uc29sZS5sb2coXCJpbSBhbSBpblwiKTtcclxuICAgIC8vICBSLmNsZWFyT2xkSUQoKTtcclxuICB9LFxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBIQU5ETEUgRVZFTlRTXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBmYWtlVXA6IGZ1bmN0aW9uICgpIHtcclxuICAgIHRoaXMuaGFuZGxlRXZlbnQoeyB0eXBlOiBcInBvaW50ZXJ1cFwiIH0pO1xyXG4gIH0sXHJcblxyXG4gIGhhbmRsZUV2ZW50OiBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgIC8vY29uc29sZS5sb2coXCJSb290cy5oYW5kbGVFdmVudCBcIitldmVudC50eXBlKVxyXG4gICAgLy9pZighZXZlbnQudHlwZSkgcmV0dXJuO1xyXG5cclxuICAgIGlmIChSLnByZXZEZWZhdWx0LmluZGV4T2YoZXZlbnQudHlwZSkgIT09IC0xKSBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgIGlmIChSLm5lZWRSZXNpemUpIFIucmVzaXplKCk7XHJcblxyXG4gICAgUi5maW5kWm9uZShSLmZvcmNlWm9uZSk7XHJcblxyXG4gICAgbGV0IGUgPSBSLmU7XHJcbiAgICBsZXQgbGVhdmUgPSBmYWxzZTtcclxuXHJcbiAgICBpZiAoZXZlbnQudHlwZSA9PT0gXCJrZXlkb3duXCIpIFIua2V5ZG93bihldmVudCk7XHJcbiAgICBpZiAoZXZlbnQudHlwZSA9PT0gXCJrZXl1cFwiKSBSLmtleXVwKGV2ZW50KTtcclxuXHJcbiAgICBpZiAoZXZlbnQudHlwZSA9PT0gXCJ3aGVlbFwiKSBlLmRlbHRhID0gZXZlbnQuZGVsdGFZID4gMCA/IDEgOiAtMTtcclxuICAgIGVsc2UgZS5kZWx0YSA9IDA7XHJcblxyXG4gICAgbGV0IHB0eXBlID0gZXZlbnQucG9pbnRlclR5cGU7IC8vIG1vdXNlLCBwZW4sIHRvdWNoXHJcblxyXG4gICAgZS5jbGllbnRYID0gKHB0eXBlID09PSBcInRvdWNoXCIgPyBldmVudC5wYWdlWCA6IGV2ZW50LmNsaWVudFgpIHx8IDA7XHJcbiAgICBlLmNsaWVudFkgPSAocHR5cGUgPT09IFwidG91Y2hcIiA/IGV2ZW50LnBhZ2VZIDogZXZlbnQuY2xpZW50WSkgfHwgMDtcclxuXHJcbiAgICBlLnR5cGUgPSBldmVudC50eXBlO1xyXG5cclxuICAgIGlmIChSLmV2ZW50T3V0LmluZGV4T2YoZXZlbnQudHlwZSkgIT09IC0xKSB7XHJcbiAgICAgIGxlYXZlID0gdHJ1ZTtcclxuICAgICAgZS50eXBlID0gXCJtb3VzZXVwXCI7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGV2ZW50LnR5cGUgPT09IFwicG9pbnRlcmxlYXZlXCIpIFIuaXNMZWF2ZSA9IHRydWU7XHJcblxyXG4gICAgaWYgKGV2ZW50LnR5cGUgPT09IFwicG9pbnRlcmRvd25cIikgZS50eXBlID0gXCJtb3VzZWRvd25cIjtcclxuICAgIGlmIChldmVudC50eXBlID09PSBcInBvaW50ZXJ1cFwiKSBlLnR5cGUgPSBcIm1vdXNldXBcIjtcclxuICAgIGlmIChldmVudC50eXBlID09PSBcInBvaW50ZXJtb3ZlXCIpIHtcclxuICAgICAgaWYgKFIuaXNMZWF2ZSkge1xyXG4gICAgICAgIC8vIGlmIHVzZXIgcmVzaXplIG91dHNpZGUgdGhpcyBkb2N1bWVudFxyXG4gICAgICAgIFIuaXNMZWF2ZSA9IGZhbHNlO1xyXG4gICAgICAgIFIucmVzaXplKCk7XHJcbiAgICAgIH1cclxuICAgICAgZS50eXBlID0gXCJtb3VzZW1vdmVcIjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBkb3VibGUgY2xpY2sgdGVzdFxyXG4gICAgaWYgKGUudHlwZSA9PT0gXCJtb3VzZWRvd25cIikge1xyXG4gICAgICBSLmRvd25UaW1lID0gUi5ub3coKTtcclxuICAgICAgbGV0IHRpbWUgPSBSLmRvd25UaW1lIC0gUi5wcmV2VGltZTtcclxuXHJcbiAgICAgIC8vIGRvdWJsZSBjbGljayBvbiBpbXB1dFxyXG4gICAgICBpZiAodGltZSA8IDIwMCkge1xyXG4gICAgICAgIFIuc2VsZWN0QWxsKCk7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBSLnByZXZUaW1lID0gUi5kb3duVGltZTtcclxuICAgICAgUi5mb3JjZVpvbmUgPSBmYWxzZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBmb3IgaW1wdXRcclxuICAgIGlmIChlLnR5cGUgPT09IFwibW91c2Vkb3duXCIpIFIuY2xlYXJJbnB1dCgpO1xyXG5cclxuICAgIC8vIG1vdXNlIGxvY2tcclxuICAgIGlmIChlLnR5cGUgPT09IFwibW91c2Vkb3duXCIpIFIubG9jayA9IHRydWU7XHJcbiAgICBpZiAoZS50eXBlID09PSBcIm1vdXNldXBcIikgUi5sb2NrID0gZmFsc2U7XHJcblxyXG4gICAgLy9pZiggUi5jdXJyZW50ICE9PSBudWxsICYmIFIuY3VycmVudC5uZXZlcmxvY2sgKSBSLmxvY2sgPSBmYWxzZTtcclxuXHJcbiAgICAvKmlmKCBlLnR5cGUgPT09ICdtb3VzZWRvd24nICYmIGV2ZW50LmJ1dHRvbiA9PT0gMSl7XHJcbiAgICAgICAgICAgIFIuY3Vyc29yKClcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgIH0qL1xyXG5cclxuICAgIC8vY29uc29sZS5sb2coXCJwNCBcIitSLmlzTW9iaWxlK1wiIFwiK2UudHlwZStcIiBcIitSLmxvY2spXHJcblxyXG4gICAgaWYgKFIuaXNNb2JpbGUgJiYgZS50eXBlID09PSBcIm1vdXNlZG93blwiKSBSLmZpbmRJRChlKTtcclxuICAgIGlmIChlLnR5cGUgPT09IFwibW91c2Vtb3ZlXCIgJiYgIVIubG9jaykgUi5maW5kSUQoZSk7XHJcblxyXG4gICAgaWYgKFIuSUQgIT09IG51bGwpIHtcclxuICAgICAgaWYgKFIuSUQuaXNDYW52YXNPbmx5KSB7XHJcbiAgICAgICAgZS5jbGllbnRYID0gUi5JRC5tb3VzZS54O1xyXG4gICAgICAgIGUuY2xpZW50WSA9IFIuSUQubW91c2UueTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy9pZiggUi5JRC5tYXJnaW5EaXYgKSBlLmNsaWVudFkgLT0gUi5JRC5tYXJnaW4gKiAwLjVcclxuXHJcbiAgICAgIFIuSUQuaGFuZGxlRXZlbnQoZSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKFIuaXNNb2JpbGUgJiYgZS50eXBlID09PSBcIm1vdXNldXBcIikgUi5jbGVhck9sZElEKCk7XHJcbiAgICBpZiAobGVhdmUpIFIuY2xlYXJPbGRJRCgpO1xyXG4gIH0sXHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyAgIElEXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBmaW5kSUQ6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICBsZXQgaSA9IFIudWkubGVuZ3RoLFxyXG4gICAgICBuZXh0ID0gLTEsXHJcbiAgICAgIHUsXHJcbiAgICAgIHgsXHJcbiAgICAgIHk7XHJcblxyXG4gICAgd2hpbGUgKGktLSkge1xyXG4gICAgICB1ID0gUi51aVtpXTtcclxuXHJcbiAgICAgIGlmICh1LmlzQ2FudmFzT25seSkge1xyXG4gICAgICAgIHggPSB1Lm1vdXNlLng7XHJcbiAgICAgICAgeSA9IHUubW91c2UueTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB4ID0gZS5jbGllbnRYO1xyXG4gICAgICAgIHkgPSBlLmNsaWVudFk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChSLm9uWm9uZSh1LCB4LCB5KSkge1xyXG4gICAgICAgIG5leHQgPSBpO1xyXG5cclxuICAgICAgICBpZiAobmV4dCAhPT0gUi5jdXJyZW50KSB7XHJcbiAgICAgICAgICBSLmNsZWFyT2xkSUQoKTtcclxuICAgICAgICAgIFIuY3VycmVudCA9IG5leHQ7XHJcbiAgICAgICAgICBSLklEID0gdTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAobmV4dCA9PT0gLTEpIFIuY2xlYXJPbGRJRCgpO1xyXG4gIH0sXHJcblxyXG4gIGNsZWFyT2xkSUQ6IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmICghUi5JRCkgcmV0dXJuO1xyXG4gICAgUi5jdXJyZW50ID0gLTE7XHJcbiAgICBSLklELnJlc2V0KCk7XHJcbiAgICBSLklEID0gbnVsbDtcclxuICAgIFIuY3Vyc29yKCk7XHJcbiAgfSxcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICAgR1VJIC8gR1JPVVAgRlVOQ1RJT05cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIGNhbGNVaXM6ICh1aXMsIHpvbmUsIHB5LCBncm91cCA9IGZhbHNlKSA9PiB7XHJcbiAgICAvL2NvbnNvbGUubG9nKCdjYWxjX3VpcycpXHJcblxyXG4gICAgbGV0IGkgPSB1aXMubGVuZ3RoLFxyXG4gICAgICB1LFxyXG4gICAgICBweCA9IDAsXHJcbiAgICAgIG4gPSAwLFxyXG4gICAgICB0dyxcclxuICAgICAgbSxcclxuICAgICAgZGl2O1xyXG5cclxuICAgIGxldCBoZWlnaHQgPSAwO1xyXG5cclxuICAgIHdoaWxlIChpLS0pIHtcclxuICAgICAgdSA9IHVpc1tuXTtcclxuICAgICAgbisrO1xyXG5cclxuICAgICAgaWYgKCFncm91cCAmJiB1LmlzR3JvdXApIHUuY2FsY1VpcygpO1xyXG5cclxuICAgICAgbSA9IHUubWFyZ2luO1xyXG4gICAgICAvL2RpdiA9IHUubWFyZ2luRGl2XHJcblxyXG4gICAgICB1LnpvbmUudyA9IHUudztcclxuICAgICAgdS56b25lLmggPSB1LmggKyBtO1xyXG5cclxuICAgICAgaWYgKCF1LmF1dG9XaWR0aCkge1xyXG4gICAgICAgIGlmIChweCA9PT0gMCkgaGVpZ2h0ICs9IHUuaCArIG07XHJcblxyXG4gICAgICAgIHUuem9uZS54ID0gem9uZS54ICsgcHg7XHJcbiAgICAgICAgdS56b25lLnkgPSBweTsgLy8gKyB1Lm10b3BcclxuICAgICAgICAvL2lmKGRpdikgdS56b25lLnkgKz0gbSAqIDAuNVxyXG5cclxuICAgICAgICB0dyA9IFIuZ2V0V2lkdGgodSk7XHJcbiAgICAgICAgaWYgKHR3KSB1LnpvbmUudyA9IHUudyA9IHR3O1xyXG4gICAgICAgIGVsc2UgaWYgKHUuZncpIHUuem9uZS53ID0gdS53ID0gdS5mdztcclxuXHJcbiAgICAgICAgcHggKz0gdS56b25lLnc7XHJcblxyXG4gICAgICAgIGlmIChweCA+PSB6b25lLncpIHtcclxuICAgICAgICAgIHB5ICs9IHUuaCArIG07XHJcbiAgICAgICAgICAvL2lmKGRpdikgcHkgKz0gbSAqIDAuNVxyXG4gICAgICAgICAgcHggPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBweCA9IDA7XHJcblxyXG4gICAgICAgIHUuem9uZS54ID0gem9uZS54ICsgdS5keDtcclxuICAgICAgICB1LnpvbmUueSA9IHB5O1xyXG4gICAgICAgIHB5ICs9IHUuaCArIG07XHJcblxyXG4gICAgICAgIGhlaWdodCArPSB1LmggKyBtO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGhlaWdodDtcclxuICB9LFxyXG5cclxuICBmaW5kVGFyZ2V0OiBmdW5jdGlvbiAodWlzLCBlKSB7XHJcbiAgICBsZXQgaSA9IHVpcy5sZW5ndGg7XHJcblxyXG4gICAgd2hpbGUgKGktLSkge1xyXG4gICAgICBpZiAoUi5vblpvbmUodWlzW2ldLCBlLmNsaWVudFgsIGUuY2xpZW50WSkpIHJldHVybiBpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiAtMTtcclxuICB9LFxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBaT05FXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBmaW5kWm9uZTogZnVuY3Rpb24gKGZvcmNlKSB7XHJcbiAgICBpZiAoIVIubmVlZFJlWm9uZSAmJiAhZm9yY2UpIHJldHVybjtcclxuXHJcbiAgICB2YXIgaSA9IFIudWkubGVuZ3RoLFxyXG4gICAgICB1O1xyXG5cclxuICAgIHdoaWxlIChpLS0pIHtcclxuICAgICAgdSA9IFIudWlbaV07XHJcbiAgICAgIFIuZ2V0Wm9uZSh1KTtcclxuICAgICAgaWYgKHUuaXNHdWkpIHUuY2FsY1VpcygpO1xyXG4gICAgfVxyXG5cclxuICAgIFIubmVlZFJlWm9uZSA9IGZhbHNlO1xyXG4gIH0sXHJcblxyXG4gIG9uWm9uZTogZnVuY3Rpb24gKG8sIHgsIHkpIHtcclxuICAgIGlmICh4ID09PSB1bmRlZmluZWQgfHwgeSA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgbGV0IHogPSBvLnpvbmU7XHJcbiAgICBsZXQgbXggPSB4IC0gei54OyAvLyAtIG8uZHg7XHJcbiAgICBsZXQgbXkgPSB5IC0gei55O1xyXG5cclxuICAgIC8vaWYoIHRoaXMubWFyZ2luRGl2ICkgZS5jbGllbnRZIC09IHRoaXMubWFyZ2luICogMC41XHJcbiAgICAvL2lmKCBvLmdyb3VwICYmIG8uZ3JvdXAubWFyZ2luRGl2ICkgbXkgKz0gby5ncm91cC5tYXJnaW4gKiAwLjVcclxuICAgIC8vaWYoIG8uZ3JvdXAgIT09IG51bGwgKSBteCAtPSBvLmR4XHJcblxyXG4gICAgbGV0IG92ZXIgPSBteCA+PSAwICYmIG15ID49IDAgJiYgbXggPD0gei53ICYmIG15IDw9IHouaDtcclxuXHJcbiAgICAvL2lmKCBvLm1hcmdpbkRpdiApIG15IC09IG8ubWFyZ2luICogMC41XHJcblxyXG4gICAgaWYgKG92ZXIpIG8ubG9jYWwuc2V0KG14LCBteSk7XHJcbiAgICBlbHNlIG8ubG9jYWwubmVnKCk7XHJcblxyXG4gICAgcmV0dXJuIG92ZXI7XHJcbiAgfSxcclxuXHJcbiAgZ2V0V2lkdGg6IGZ1bmN0aW9uIChvKSB7XHJcbiAgICAvL3JldHVybiBvLmdldERvbSgpLm9mZnNldFdpZHRoXHJcbiAgICByZXR1cm4gby5nZXREb20oKS5jbGllbnRXaWR0aDtcclxuXHJcbiAgICAvL2xldCByID0gby5nZXREb20oKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuICAgIC8vcmV0dXJuIChyLndpZHRoKVxyXG4gICAgLy9yZXR1cm4gTWF0aC5mbG9vcihyLndpZHRoKVxyXG4gIH0sXHJcblxyXG4gIGdldFpvbmU6IGZ1bmN0aW9uIChvKSB7XHJcbiAgICBpZiAoby5pc0NhbnZhc09ubHkpIHJldHVybjtcclxuICAgIGxldCByID0gby5nZXREb20oKS5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcclxuXHJcbiAgICAvL2lmKCAhci53aWR0aCApIHJldHVyblxyXG4gICAgLy9vLnpvbmUgPSB7IHg6TWF0aC5mbG9vcihyLmxlZnQpLCB5Ok1hdGguZmxvb3Ioci50b3ApLCB3Ok1hdGguZmxvb3Ioci53aWR0aCksIGg6TWF0aC5mbG9vcihyLmhlaWdodCkgfTtcclxuICAgIC8vby56b25lID0geyB4Ok1hdGgucm91bmQoci5sZWZ0KSwgeTpNYXRoLnJvdW5kKHIudG9wKSwgdzpNYXRoLnJvdW5kKHIud2lkdGgpLCBoOk1hdGgucm91bmQoci5oZWlnaHQpIH07XHJcbiAgICBvLnpvbmUgPSB7IHg6IHIubGVmdCwgeTogci50b3AsIHc6IHIud2lkdGgsIGg6IHIuaGVpZ2h0IH07XHJcblxyXG4gICAgLy9jb25zb2xlLmxvZyhvLm5hbWUsIG8uem9uZSlcclxuICB9LFxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBDVVJTT1JcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIGN1cnNvcjogZnVuY3Rpb24gKG5hbWUpIHtcclxuICAgIG5hbWUgPSBuYW1lID8gbmFtZSA6IFwiYXV0b1wiO1xyXG4gICAgaWYgKG5hbWUgIT09IFIub2xkQ3Vyc29yKSB7XHJcbiAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUuY3Vyc29yID0gbmFtZTtcclxuICAgICAgUi5vbGRDdXJzb3IgPSBuYW1lO1xyXG4gICAgfVxyXG4gIH0sXHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyAgIENBTlZBU1xyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgdG9DYW52YXM6IGZ1bmN0aW9uIChvLCB3LCBoLCBmb3JjZSkge1xyXG4gICAgaWYgKCFSLnhtbHNlcmlhbGl6ZXIpIFIueG1sc2VyaWFsaXplciA9IG5ldyBYTUxTZXJpYWxpemVyKCk7XHJcblxyXG4gICAgLy8gcHJldmVudCBleGVzaXZlIHJlZHJhd1xyXG5cclxuICAgIGlmIChmb3JjZSAmJiBSLnRtcFRpbWUgIT09IG51bGwpIHtcclxuICAgICAgY2xlYXJUaW1lb3V0KFIudG1wVGltZSk7XHJcbiAgICAgIFIudG1wVGltZSA9IG51bGw7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKFIudG1wVGltZSAhPT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgIGlmIChSLmxvY2spXHJcbiAgICAgIFIudG1wVGltZSA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIFIudG1wVGltZSA9IG51bGw7XHJcbiAgICAgIH0sIDEwKTtcclxuXHJcbiAgICAvLy9cclxuXHJcbiAgICBsZXQgaXNOZXdTaXplID0gZmFsc2U7XHJcbiAgICBpZiAodyAhPT0gby5jYW52YXMud2lkdGggfHwgaCAhPT0gby5jYW52YXMuaGVpZ2h0KSBpc05ld1NpemUgPSB0cnVlO1xyXG5cclxuICAgIGlmIChSLnRtcEltYWdlID09PSBudWxsKSBSLnRtcEltYWdlID0gbmV3IEltYWdlKCk7XHJcblxyXG4gICAgbGV0IGltZyA9IFIudG1wSW1hZ2U7IC8vbmV3IEltYWdlKCk7XHJcblxyXG4gICAgbGV0IGh0bWxTdHJpbmcgPSBSLnhtbHNlcmlhbGl6ZXIuc2VyaWFsaXplVG9TdHJpbmcoby5jb250ZW50KTtcclxuXHJcbiAgICBsZXQgc3ZnID1cclxuICAgICAgJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiIHdpZHRoPVwiJyArXHJcbiAgICAgIHcgK1xyXG4gICAgICAnXCIgaGVpZ2h0PVwiJyArXHJcbiAgICAgIGggK1xyXG4gICAgICAnXCI+PGZvcmVpZ25PYmplY3Qgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogbm9uZTsgbGVmdDowO1wiIHdpZHRoPVwiMTAwJVwiIGhlaWdodD1cIjEwMCVcIj4nICtcclxuICAgICAgaHRtbFN0cmluZyArXHJcbiAgICAgIFwiPC9mb3JlaWduT2JqZWN0Pjwvc3ZnPlwiO1xyXG5cclxuICAgIGltZy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGxldCBjdHggPSBvLmNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcblxyXG4gICAgICBpZiAoaXNOZXdTaXplKSB7XHJcbiAgICAgICAgby5jYW52YXMud2lkdGggPSB3O1xyXG4gICAgICAgIG8uY2FudmFzLmhlaWdodCA9IGg7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgY3R4LmNsZWFyUmVjdCgwLCAwLCB3LCBoKTtcclxuICAgICAgfVxyXG4gICAgICBjdHguZHJhd0ltYWdlKHRoaXMsIDAsIDApO1xyXG5cclxuICAgICAgby5vbkRyYXcoKTtcclxuICAgIH07XHJcblxyXG4gICAgaW1nLnNyYyA9IFwiZGF0YTppbWFnZS9zdmcreG1sO2NoYXJzZXQ9dXRmLTgsXCIgKyBlbmNvZGVVUklDb21wb25lbnQoc3ZnKTtcclxuICAgIC8vaW1nLnNyYyA9ICdkYXRhOmltYWdlL3N2Zyt4bWw7YmFzZTY0LCcrIHdpbmRvdy5idG9hKCBzdmcgKTtcclxuICAgIGltZy5jcm9zc09yaWdpbiA9IFwiXCI7XHJcbiAgICBSLm5lZWRzVXBkYXRlID0gZmFsc2U7XHJcbiAgfSxcclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICAgSU5QVVRcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIHNldEhpZGRlbjogZnVuY3Rpb24gKCkge1xyXG4gICAgaWYgKFIuaGlkZGVuSW1wdXQgPT09IG51bGwpIHtcclxuICAgICAgLy9sZXQgY3NzID0gUi5wYXJlbnQuY3NzLnR4dHNlbGVjdCArICdwYWRkaW5nOjA7IHdpZHRoOmF1dG87IGhlaWdodDphdXRvOyAnXHJcbiAgICAgIC8vbGV0IGNzcyA9IFIucGFyZW50LmNzcy50eHQgKyAncGFkZGluZzowOyB3aWR0aDphdXRvOyBoZWlnaHQ6YXV0bzsgdGV4dC1zaGFkb3c6bm9uZTsnXHJcbiAgICAgIC8vY3NzICs9ICdsZWZ0OjEwcHg7IHRvcDphdXRvOyBib3JkZXI6bm9uZTsgY29sb3I6I0ZGRjsgYmFja2dyb3VuZDojMDAwOycgKyBoaWRlO1xyXG5cclxuICAgICAgUi5oaWRkZW5JbXB1dCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbnB1dFwiKTtcclxuICAgICAgUi5oaWRkZW5JbXB1dC50eXBlID0gXCJ0ZXh0XCI7XHJcbiAgICAgIC8vUi5oaWRkZW5JbXB1dC5zdHlsZS5jc3NUZXh0ID0gY3NzICsgJ2JvdHRvbTozMHB4OycgKyAoUi5kZWJ1Z0lucHV0ID8gJycgOiAndHJhbnNmb3JtOnNjYWxlKDApOycpO1xyXG5cclxuICAgICAgUi5oaWRkZW5TaXplciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XHJcbiAgICAgIC8vUi5oaWRkZW5TaXplci5zdHlsZS5jc3NUZXh0ID0gY3NzICsgJ2JvdHRvbTo2MHB4Oyc7XHJcblxyXG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKFIuaGlkZGVuSW1wdXQpO1xyXG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKFIuaGlkZGVuU2l6ZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIGxldCBoaWRlID0gUi5kZWJ1Z0lucHV0ID8gXCJcIiA6IFwib3BhY2l0eTowOyB6SW5kZXg6MDtcIjtcclxuICAgIGxldCBjc3MgPVxyXG4gICAgICBSLnBhcmVudC5jc3MudHh0c2VsZWN0ICtcclxuICAgICAgXCJwYWRkaW5nOjA7IHdpZHRoOmF1dG87IGhlaWdodDphdXRvOyBsZWZ0OjEwcHg7IHRvcDphdXRvOyBjb2xvcjojRkZGOyBiYWNrZ3JvdW5kOiMwMDA7XCIgK1xyXG4gICAgICBoaWRlO1xyXG4gICAgUi5oaWRkZW5JbXB1dC5zdHlsZS5jc3NUZXh0ID1cclxuICAgICAgY3NzICsgXCJib3R0b206MTBweDtcIiArIChSLmRlYnVnSW5wdXQgPyBcIlwiIDogXCJ0cmFuc2Zvcm06c2NhbGUoMCk7XCIpO1xyXG4gICAgUi5oaWRkZW5TaXplci5zdHlsZS5jc3NUZXh0ID0gY3NzICsgXCJib3R0b206NDBweDtcIjtcclxuXHJcbiAgICBSLmhpZGRlbkltcHV0LnN0eWxlLndpZHRoID0gUi5pbnB1dC5jbGllbnRXaWR0aCArIFwicHhcIjtcclxuICAgIFIuaGlkZGVuSW1wdXQudmFsdWUgPSBSLnN0cjtcclxuICAgIFIuaGlkZGVuU2l6ZXIuaW5uZXJIVE1MID0gUi5zdHI7XHJcblxyXG4gICAgUi5oYXNGb2N1cyA9IHRydWU7XHJcbiAgfSxcclxuXHJcbiAgY2xlYXJIaWRkZW46IGZ1bmN0aW9uIChwKSB7XHJcbiAgICBpZiAoUi5oaWRkZW5JbXB1dCA9PT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgUi5oYXNGb2N1cyA9IGZhbHNlO1xyXG4gIH0sXHJcblxyXG4gIGNsaWNrUG9zOiBmdW5jdGlvbiAoeCkge1xyXG4gICAgbGV0IGkgPSBSLnN0ci5sZW5ndGgsXHJcbiAgICAgIGwgPSAwLFxyXG4gICAgICBuID0gMDtcclxuICAgIHdoaWxlIChpLS0pIHtcclxuICAgICAgbCArPSBSLnRleHRXaWR0aChSLnN0cltuXSk7XHJcbiAgICAgIGlmIChsID49IHgpIGJyZWFrO1xyXG4gICAgICBuKys7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbjtcclxuICB9LFxyXG5cclxuICB1cElucHV0OiBmdW5jdGlvbiAoeCwgZG93bikge1xyXG4gICAgaWYgKFIucGFyZW50ID09PSBudWxsKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgbGV0IHVwID0gZmFsc2U7XHJcblxyXG4gICAgaWYgKGRvd24pIHtcclxuICAgICAgbGV0IGlkID0gUi5jbGlja1Bvcyh4KTtcclxuXHJcbiAgICAgIFIubW92ZVggPSBpZDtcclxuXHJcbiAgICAgIGlmIChSLnN0YXJ0WCA9PT0gLTEpIHtcclxuICAgICAgICBSLnN0YXJ0WCA9IGlkO1xyXG4gICAgICAgIFIuY3Vyc29ySWQgPSBpZDtcclxuICAgICAgICBSLmlucHV0UmFuZ2UgPSBbUi5zdGFydFgsIFIuc3RhcnRYXTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICBsZXQgaXNTZWxlY3Rpb24gPSBSLm1vdmVYICE9PSBSLnN0YXJ0WDtcclxuXHJcbiAgICAgICAgaWYgKGlzU2VsZWN0aW9uKSB7XHJcbiAgICAgICAgICBpZiAoUi5zdGFydFggPiBSLm1vdmVYKSBSLmlucHV0UmFuZ2UgPSBbUi5tb3ZlWCwgUi5zdGFydFhdO1xyXG4gICAgICAgICAgZWxzZSBSLmlucHV0UmFuZ2UgPSBbUi5zdGFydFgsIFIubW92ZVhdO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgdXAgPSB0cnVlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgaWYgKFIuc3RhcnRYICE9PSAtMSkge1xyXG4gICAgICAgIFIuaGFzRm9jdXMgPSB0cnVlO1xyXG4gICAgICAgIFIuaGlkZGVuSW1wdXQuZm9jdXMoKTtcclxuICAgICAgICBSLmhpZGRlbkltcHV0LnNlbGVjdGlvblN0YXJ0ID0gUi5pbnB1dFJhbmdlWzBdO1xyXG4gICAgICAgIFIuaGlkZGVuSW1wdXQuc2VsZWN0aW9uRW5kID0gUi5pbnB1dFJhbmdlWzFdO1xyXG4gICAgICAgIFIuc3RhcnRYID0gLTE7XHJcblxyXG4gICAgICAgIHVwID0gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGlmICh1cCkgUi5zZWxlY3RQYXJlbnQoKTtcclxuXHJcbiAgICByZXR1cm4gdXA7XHJcbiAgfSxcclxuXHJcbiAgc2VsZWN0QWxsOiBmdW5jdGlvbiAoKSB7XHJcbiAgICBpZiAoIVIucGFyZW50KSByZXR1cm47XHJcblxyXG4gICAgUi5zdHIgPSBSLmlucHV0LnRleHRDb250ZW50O1xyXG4gICAgUi5pbnB1dFJhbmdlID0gWzAsIFIuc3RyLmxlbmd0aF07XHJcbiAgICBSLmhhc0ZvY3VzID0gdHJ1ZTtcclxuICAgIFIuaGlkZGVuSW1wdXQuZm9jdXMoKTtcclxuICAgIFIuaGlkZGVuSW1wdXQuc2VsZWN0aW9uU3RhcnQgPSBSLmlucHV0UmFuZ2VbMF07XHJcbiAgICBSLmhpZGRlbkltcHV0LnNlbGVjdGlvbkVuZCA9IFIuaW5wdXRSYW5nZVsxXTtcclxuICAgIFIuY3Vyc29ySWQgPSBSLmlucHV0UmFuZ2VbMV07XHJcbiAgICBSLnNlbGVjdFBhcmVudCgpO1xyXG4gIH0sXHJcblxyXG4gIHNlbGVjdFBhcmVudDogZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIGMgPSBSLnRleHRXaWR0aChSLnN0ci5zdWJzdHJpbmcoMCwgUi5jdXJzb3JJZCkpO1xyXG4gICAgdmFyIGUgPSBSLnRleHRXaWR0aChSLnN0ci5zdWJzdHJpbmcoMCwgUi5pbnB1dFJhbmdlWzBdKSk7XHJcbiAgICB2YXIgcyA9IFIudGV4dFdpZHRoKFIuc3RyLnN1YnN0cmluZyhSLmlucHV0UmFuZ2VbMF0sIFIuaW5wdXRSYW5nZVsxXSkpO1xyXG5cclxuICAgIFIucGFyZW50LnNlbGVjdChjLCBlLCBzLCBSLmhpZGRlblNpemVyLmlubmVySFRNTCk7XHJcbiAgfSxcclxuXHJcbiAgdGV4dFdpZHRoOiBmdW5jdGlvbiAodGV4dCkge1xyXG4gICAgaWYgKFIuaGlkZGVuU2l6ZXIgPT09IG51bGwpIHJldHVybiAwO1xyXG4gICAgdGV4dCA9IHRleHQucmVwbGFjZSgvIC9nLCBcIiZuYnNwO1wiKTtcclxuICAgIFIuaGlkZGVuU2l6ZXIuaW5uZXJIVE1MID0gdGV4dDtcclxuICAgIHJldHVybiBSLmhpZGRlblNpemVyLmNsaWVudFdpZHRoO1xyXG4gIH0sXHJcblxyXG4gIGNsZWFySW5wdXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgIGlmIChSLnBhcmVudCA9PT0gbnVsbCkgcmV0dXJuO1xyXG4gICAgaWYgKCFSLmZpcnN0SW1wdXQpIFIucGFyZW50LnZhbGlkYXRlKHRydWUpO1xyXG5cclxuICAgIFIuY2xlYXJIaWRkZW4oKTtcclxuICAgIFIucGFyZW50LnVuc2VsZWN0KCk7XHJcblxyXG4gICAgLy9SLmlucHV0LnN0eWxlLmJhY2tncm91bmQgPSAnbm9uZSc7XHJcbiAgICBSLmlucHV0LnN0eWxlLmJhY2tncm91bmQgPSBSLnBhcmVudC5jb2xvcnMuYmFjaztcclxuICAgIFIuaW5wdXQuc3R5bGUuYm9yZGVyQ29sb3IgPSBSLnBhcmVudC5jb2xvcnMuYm9yZGVyO1xyXG4gICAgLy9SLmlucHV0LnN0eWxlLmNvbG9yID0gUi5wYXJlbnQuY29sb3JzLnRleHQ7XHJcbiAgICBSLnBhcmVudC5pc0VkaXQgPSBmYWxzZTtcclxuXHJcbiAgICBSLmlucHV0ID0gbnVsbDtcclxuICAgIFIucGFyZW50ID0gbnVsbDtcclxuICAgIChSLnN0ciA9IFwiXCIpLCAoUi5maXJzdEltcHV0ID0gdHJ1ZSk7XHJcbiAgfSxcclxuXHJcbiAgc2V0SW5wdXQ6IGZ1bmN0aW9uIChJbnB1dCwgcGFyZW50KSB7XHJcbiAgICBSLmNsZWFySW5wdXQoKTtcclxuXHJcbiAgICBSLmlucHV0ID0gSW5wdXQ7XHJcbiAgICBSLnBhcmVudCA9IHBhcmVudDtcclxuXHJcbiAgICBSLmlucHV0LnN0eWxlLmJhY2tncm91bmQgPSBSLnBhcmVudC5jb2xvcnMuYmFja29mZjtcclxuICAgIFIuaW5wdXQuc3R5bGUuYm9yZGVyQ29sb3IgPSBSLnBhcmVudC5jb2xvcnMuc2VsZWN0O1xyXG4gICAgLy9SLmlucHV0LnN0eWxlLmNvbG9yID0gUi5wYXJlbnQuY29sb3JzLnRleHRTZWxlY3Q7XHJcbiAgICBSLnN0ciA9IFIuaW5wdXQudGV4dENvbnRlbnQ7XHJcblxyXG4gICAgUi5zZXRIaWRkZW4oKTtcclxuICB9LFxyXG5cclxuICBrZXlkb3duOiBmdW5jdGlvbiAoZSkge1xyXG4gICAgaWYgKFIucGFyZW50ID09PSBudWxsKSByZXR1cm47XHJcblxyXG4gICAgbGV0IGtleUNvZGUgPSBlLndoaWNoLFxyXG4gICAgICBpc1NoaWZ0ID0gZS5zaGlmdEtleTtcclxuXHJcbiAgICAvL2NvbnNvbGUubG9nKCBrZXlDb2RlIClcclxuXHJcbiAgICBSLmZpcnN0SW1wdXQgPSBmYWxzZTtcclxuXHJcbiAgICBpZiAoUi5oYXNGb2N1cykge1xyXG4gICAgICAvLyBoYWNrIHRvIGZpeCB0b3VjaCBldmVudCBidWcgaW4gaU9TIFNhZmFyaVxyXG4gICAgICB3aW5kb3cuZm9jdXMoKTtcclxuICAgICAgUi5oaWRkZW5JbXB1dC5mb2N1cygpO1xyXG4gICAgfVxyXG5cclxuICAgIFIucGFyZW50LmlzRWRpdCA9IHRydWU7XHJcblxyXG4gICAgLy8gZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG5cclxuICAgIC8vIGFkZCBzdXBwb3J0IGZvciBDdHJsL0NtZCtBIHNlbGVjdGlvblxyXG4gICAgLy9pZiAoIGtleUNvZGUgPT09IDY1ICYmIChlLmN0cmxLZXkgfHwgZS5tZXRhS2V5ICkpIHtcclxuICAgIC8vUi5zZWxlY3RUZXh0KCk7XHJcbiAgICAvL2UucHJldmVudERlZmF1bHQoKTtcclxuICAgIC8vcmV0dXJuIHNlbGYucmVuZGVyKCk7XHJcbiAgICAvL31cclxuXHJcbiAgICBpZiAoa2V5Q29kZSA9PT0gMTMpIHtcclxuICAgICAgLy9lbnRlclxyXG5cclxuICAgICAgUi5jbGVhcklucHV0KCk7XHJcblxyXG4gICAgICAvL30gZWxzZSBpZigga2V5Q29kZSA9PT0gOSApeyAvL3RhYiBrZXlcclxuXHJcbiAgICAgIC8vIFIuaW5wdXQudGV4dENvbnRlbnQgPSAnJztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmIChSLmlucHV0LmlzTnVtKSB7XHJcbiAgICAgICAgaWYgKFxyXG4gICAgICAgICAgKGUua2V5Q29kZSA+IDQ3ICYmIGUua2V5Q29kZSA8IDU4KSB8fFxyXG4gICAgICAgICAgKGUua2V5Q29kZSA+IDk1ICYmIGUua2V5Q29kZSA8IDEwNikgfHxcclxuICAgICAgICAgIGUua2V5Q29kZSA9PT0gMTkwIHx8XHJcbiAgICAgICAgICBlLmtleUNvZGUgPT09IDExMCB8fFxyXG4gICAgICAgICAgZS5rZXlDb2RlID09PSA4IHx8XHJcbiAgICAgICAgICBlLmtleUNvZGUgPT09IDEwOVxyXG4gICAgICAgICkge1xyXG4gICAgICAgICAgUi5oaWRkZW5JbXB1dC5yZWFkT25seSA9IGZhbHNlO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBSLmhpZGRlbkltcHV0LnJlYWRPbmx5ID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgUi5oaWRkZW5JbXB1dC5yZWFkT25seSA9IGZhbHNlO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAga2V5dXA6IGZ1bmN0aW9uIChlKSB7XHJcbiAgICBpZiAoUi5wYXJlbnQgPT09IG51bGwpIHJldHVybjtcclxuXHJcbiAgICBSLnN0ciA9IFIuaGlkZGVuSW1wdXQudmFsdWU7XHJcblxyXG4gICAgaWYgKFIucGFyZW50LmFsbEVxdWFsKSBSLnBhcmVudC5zYW1lU3RyKFIuc3RyKTsgLy8gbnVtZXJpYyBzYW3DuWUgdmFsdWVcclxuICAgIGVsc2UgUi5pbnB1dC50ZXh0Q29udGVudCA9IFIuc3RyO1xyXG5cclxuICAgIFIuY3Vyc29ySWQgPSBSLmhpZGRlbkltcHV0LnNlbGVjdGlvblN0YXJ0O1xyXG4gICAgUi5pbnB1dFJhbmdlID0gW1IuaGlkZGVuSW1wdXQuc2VsZWN0aW9uU3RhcnQsIFIuaGlkZGVuSW1wdXQuc2VsZWN0aW9uRW5kXTtcclxuXHJcbiAgICBSLnNlbGVjdFBhcmVudCgpO1xyXG5cclxuICAgIC8vaWYoIFIucGFyZW50LmFsbHdheSApXHJcbiAgICBSLnBhcmVudC52YWxpZGF0ZSgpO1xyXG4gIH0sXHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvL1xyXG4gIC8vICAgTElTVEVOSU5HXHJcbiAgLy9cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIGxvb3A6IGZ1bmN0aW9uICgpIHtcclxuICAgIC8vIG1vZGlmaWVkIGJ5IEZlZGVtYXJpbm9cclxuICAgIGlmIChSLmlzTG9vcCkgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKFIubG9vcCk7XHJcbiAgICBSLm5lZWRzVXBkYXRlID0gUi51cGRhdGUoKTtcclxuICAgIC8vIGlmIHRoZXJlIGlzIGEgY2hhbmdlIGluIGEgdmFsdWUgZ2VuZXJhdGVkIGV4dGVybmFsbHksIHRoZSBHVUkgbmVlZHMgdG8gYmUgcmVkcmF3blxyXG4gICAgaWYgKFIudWlbMF0pIFIudWlbMF0uZHJhdygpO1xyXG4gIH0sXHJcblxyXG4gIHVwZGF0ZTogZnVuY3Rpb24gKCkge1xyXG4gICAgLy8gbW9kaWZpZWQgYnkgRmVkZW1hcmlub1xyXG4gICAgbGV0IGkgPSBSLmxpc3RlbnMubGVuZ3RoO1xyXG4gICAgbGV0IG5lZWRzVXBkYXRlID0gZmFsc2U7XHJcbiAgICB3aGlsZSAoaS0tKSB7XHJcbiAgICAgIC8vY2hlY2sgaWYgdGhlIHZhbHVlIG9mIHRoZSBvYmplY3QgaGFzIGNoYW5nZWRcclxuICAgICAgbGV0IGhhc0NoYW5nZWQgPSBSLmxpc3RlbnNbaV0ubGlzdGVuaW5nKCk7XHJcbiAgICAgIGlmIChoYXNDaGFuZ2VkKSBuZWVkc1VwZGF0ZSA9IHRydWU7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmVlZHNVcGRhdGU7XHJcbiAgfSxcclxuXHJcbiAgcmVtb3ZlTGlzdGVuOiBmdW5jdGlvbiAocHJvdG8pIHtcclxuICAgIGxldCBpZCA9IFIubGlzdGVucy5pbmRleE9mKHByb3RvKTtcclxuICAgIGlmIChpZCAhPT0gLTEpIFIubGlzdGVucy5zcGxpY2UoaWQsIDEpO1xyXG4gICAgaWYgKFIubGlzdGVucy5sZW5ndGggPT09IDApIFIuaXNMb29wID0gZmFsc2U7XHJcbiAgfSxcclxuXHJcbiAgYWRkTGlzdGVuOiBmdW5jdGlvbiAocHJvdG8pIHtcclxuICAgIGxldCBpZCA9IFIubGlzdGVucy5pbmRleE9mKHByb3RvKTtcclxuXHJcbiAgICBpZiAoaWQgIT09IC0xKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgUi5saXN0ZW5zLnB1c2gocHJvdG8pO1xyXG5cclxuICAgIGlmICghUi5pc0xvb3ApIHtcclxuICAgICAgUi5pc0xvb3AgPSB0cnVlO1xyXG4gICAgICBSLmxvb3AoKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9LFxyXG59O1xyXG5cclxuZXhwb3J0IGNvbnN0IFJvb3RzID0gUjtcclxuIiwiLyoqXHJcbiAqIEBhdXRob3IgbHRoIC8gaHR0cHM6Ly9naXRodWIuY29tL2xvLXRoXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgUm9vdHMgfSBmcm9tICcuL1Jvb3RzLmpzJztcclxuXHJcbmNvbnN0IFQgPSB7XHJcblxyXG4gICAgdHJhbnNpdGlvbjogMC4yLFxyXG5cclxuICAgIGZyYWc6IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKSxcclxuXHJcbiAgICBjb2xvclJpbmc6IG51bGwsXHJcbiAgICBqb3lzdGlja18wOiBudWxsLFxyXG4gICAgam95c3RpY2tfMTogbnVsbCxcclxuICAgIGNpcmN1bGFyOiBudWxsLFxyXG4gICAga25vYjogbnVsbCxcclxuICAgIHBhZDJkOiBudWxsLFxyXG5cclxuICAgIHN2Z25zOiBcImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCIsXHJcbiAgICBsaW5rczogXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rXCIsXHJcbiAgICBodG1sczogXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCIsXHJcblxyXG4gICAgRE9NX1NJWkU6IFsgJ2hlaWdodCcsICd3aWR0aCcsICd0b3AnLCAnbGVmdCcsICdib3R0b20nLCAncmlnaHQnLCAnbWFyZ2luLWxlZnQnLCAnbWFyZ2luLXJpZ2h0JywgJ21hcmdpbi10b3AnLCAnbWFyZ2luLWJvdHRvbSddLFxyXG4gICAgU1ZHX1RZUEVfRDogWyAncGF0dGVybicsICdkZWZzJywgJ3RyYW5zZm9ybScsICdzdG9wJywgJ2FuaW1hdGUnLCAncmFkaWFsR3JhZGllbnQnLCAnbGluZWFyR3JhZGllbnQnLCAnYW5pbWF0ZU1vdGlvbicsICd1c2UnLCAnZmlsdGVyJywgJ2ZlQ29sb3JNYXRyaXgnIF0sXHJcbiAgICBTVkdfVFlQRV9HOiBbICdzdmcnLCAncmVjdCcsICdjaXJjbGUnLCAncGF0aCcsICdwb2x5Z29uJywgJ3RleHQnLCAnZycsICdsaW5lJywgJ2ZvcmVpZ25PYmplY3QnIF0sXHJcblxyXG4gICAgUEk6IE1hdGguUEksXHJcbiAgICBUd29QSTogTWF0aC5QSSoyLFxyXG4gICAgcGk5MDogTWF0aC5QSSAqIDAuNSxcclxuICAgIHBpNjA6IE1hdGguUEkvMyxcclxuICAgIFxyXG4gICAgdG9yYWQ6IE1hdGguUEkgLyAxODAsXHJcbiAgICB0b2RlZzogMTgwIC8gTWF0aC5QSSxcclxuXHJcbiAgICBjbGFtcDogKCB2LCBtaW4sIG1heCApID0+IHtcclxuXHJcbiAgICAgICAgdiA9IHYgPCBtaW4gPyBtaW4gOiB2O1xyXG4gICAgICAgIHYgPSB2ID4gbWF4ID8gbWF4IDogdjtcclxuICAgICAgICByZXR1cm4gdjtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIGlzRGl2aWQ6ICggdiApID0+ICggdiowLjUgPT09IE1hdGguZmxvb3IodiowLjUpICksXHJcblxyXG4gICAgc2l6ZTogeyAgdzogMjQwLCBoOiAyMCwgcDogMzAsIHM6IDggfSxcclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIENPTE9SXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgZGVmaW5lQ29sb3I6ICggbywgY2MgPSBULmNvbG9ycyApID0+IHtcclxuXHJcbiAgICAgICAgbGV0IGNvbG9yID0geyAuLi5jYyB9XHJcblxyXG4gICAgICAgIGxldCB0ZXh0Q2hhbmdlID0gWydmb250RmFtaWx5JywgJ2ZvbnRXZWlnaHQnLCAnZm9udFNoYWRvdycsICdmb250U2l6ZScgXVxyXG4gICAgICAgIGxldCBjaGFuZ2VUZXh0ID0gZmFsc2VcclxuXHJcbiAgICAgICAgaWYoIG8uZm9udCApIG8uZm9udEZhbWlseSA9IG8uZm9udFxyXG4gICAgICAgIGlmKCBvLnNoYWRvdyApIG8uZm9udFNoYWRvdyA9IG8uc2hhZG93XHJcbiAgICAgICAgaWYoIG8ud2VpZ2h0ICkgby5mb250V2VpZ2h0ID0gby53ZWlnaHRcclxuXHJcbiAgICAgICAgaWYoIG8uZm9udENvbG9yICkgby50ZXh0ID0gby5mb250Q29sb3JcclxuICAgICAgICBpZiggby5jb2xvciApIG8udGV4dCA9IG8uY29sb3JcclxuXHJcbiAgICAgICAgaWYoIG8udGV4dCApe1xyXG4gICAgICAgICAgICBjb2xvci50ZXh0ID0gby50ZXh0XHJcbiAgICAgICAgICAgIGlmKCAhby5mb250Q29sb3IgJiYgIW8uY29sb3IgKXsgXHJcbiAgICAgICAgICAgICAgICBjb2xvci50aXRsZSA9IFQuQ29sb3JMdW1hKCBvLnRleHQsIC0wLjI1IClcclxuICAgICAgICAgICAgICAgIGNvbG9yLnRpdGxlb2ZmID0gVC5Db2xvckx1bWEoIG8udGV4dCwgLTAuNSApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29sb3IudGV4dE92ZXIgPSBULkNvbG9yTHVtYSggby50ZXh0LCAwLjI1IClcclxuICAgICAgICAgICAgY29sb3IudGV4dFNlbGVjdCA9IFQuQ29sb3JMdW1hKCBvLnRleHQsIDAuNSApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggby5idXR0b24gKXtcclxuICAgICAgICAgICAgY29sb3IuYnV0dG9uID0gby5idXR0b25cclxuICAgICAgICAgICAgY29sb3IuYm9yZGVyID0gVC5Db2xvckx1bWEoIG8uYnV0dG9uLCAwLjEgKVxyXG4gICAgICAgICAgICBjb2xvci5vdmVyb2ZmID0gVC5Db2xvckx1bWEoIG8uYnV0dG9uLCAwLjIgKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoIG8uc2VsZWN0ICl7XHJcbiAgICAgICAgICAgIGNvbG9yLnNlbGVjdCA9IG8uc2VsZWN0XHJcbiAgICAgICAgICAgIGNvbG9yLm92ZXIgPSBULkNvbG9yTHVtYSggby5zZWxlY3QsIC0wLjEgKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoIG8uaXRlbUJnICkgby5iYWNrID0gby5pdGVtQmdcclxuXHJcbiAgICAgICAgaWYoIG8uYmFjayApe1xyXG4gICAgICAgICAgICBjb2xvci5iYWNrID0gby5iYWNrXHJcbiAgICAgICAgICAgIGNvbG9yLmJhY2tvZmYgPSBULkNvbG9yTHVtYSggby5iYWNrLCAtMC4xIClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCBvLmZvbnRTZWxlY3QgKSBjb2xvci50ZXh0U2VsZWN0ID0gby5mb250U2VsZWN0XHJcbiAgICAgICAgaWYoIG8uZ3JvdXBCb3JkZXIgKSBjb2xvci5nYm9yZGVyID0gby5ncm91cEJvcmRlclxyXG5cclxuICAgICAgICAvL2lmKCBvLnRyYW5zcGFyZW50ICkgby5iZyA9ICdub25lJ1xyXG4gICAgICAgIC8vaWYoIG8uYmcgKSBjb2xvci5iYWNrZ3JvdW5kID0gY29sb3IuYmFja2dyb3VuZE92ZXIgPSBvLmJnXHJcbiAgICAgICAgaWYoIG8uYmdPdmVyICkgY29sb3IuYmFja2dyb3VuZE92ZXIgPSBvLmJnT3ZlclxyXG5cclxuICAgICAgICBmb3IoIGxldCBtIGluIGNvbG9yICl7XHJcbiAgICAgICAgICAgIGlmKG9bbV0hPT11bmRlZmluZWQpIGNvbG9yW21dID0gb1ttXVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yKCBsZXQgbSBpbiBvICl7XHJcbiAgICAgICAgICAgIGlmKCB0ZXh0Q2hhbmdlLmluZGV4T2YobSkgIT09IC0xICkgY2hhbmdlVGV4dCA9IHRydWUgXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggY2hhbmdlVGV4dCApIFQuZGVmaW5lVGV4dCggY29sb3IgKVxyXG5cclxuICAgICAgICByZXR1cm4gY29sb3JcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIGNvbG9yczoge1xyXG5cclxuICAgICAgICBzeDogNCwvLzRcclxuICAgICAgICBzeTogMiwvLzJcclxuICAgICAgICByYWRpdXM6MixcclxuXHJcbiAgICAgICAgc2hvd092ZXIgOiAxLFxyXG4gICAgICAgIC8vZ3JvdXBPdmVyIDogMSxcclxuXHJcbiAgICAgICAgY29udGVudDonbm9uZScsXHJcbiAgICAgICAgYmFja2dyb3VuZDogJ3JnYmEoNTAsNTAsNTAsMC4xNSknLFxyXG4gICAgICAgIGJhY2tncm91bmRPdmVyOiAncmdiYSg1MCw1MCw1MCwwLjMpJyxcclxuXHJcbiAgICAgICAgdGl0bGUgOiAnI0NDQycsXHJcbiAgICAgICAgdGl0bGVvZmYgOiAnI0JCQicsXHJcbiAgICAgICAgdGV4dCA6ICcjREREJyxcclxuICAgICAgICB0ZXh0T3ZlciA6ICcjRUVFJyxcclxuICAgICAgICB0ZXh0U2VsZWN0IDogJyNGRkYnLFxyXG4gICAgICAgIFxyXG4gICAgICAgIGJhY2s6J3JnYmEoMCwwLDAsMC4yKScsXHJcbiAgICAgICAgYmFja29mZjoncmdiYSgwLDAsMCwwLjMpJyxcclxuXHJcbiAgICAgICAgLy8gaW5wdXQgYW5kIGJ1dHRvbiBib3JkZXJcclxuICAgICAgICBib3JkZXIgOiAnIzRjNGM0YycsXHJcbiAgICAgICAgYm9yZGVyU2l6ZSA6IDEsXHJcblxyXG4gICAgICAgIGdib3JkZXIgOiAnbm9uZScsXHJcbiAgICAgICAgZ3JvdXBzIDogJ25vbmUnLFxyXG4gICAgICAgIFxyXG5cclxuICAgICAgICBidXR0b24gOiAnIzNjM2MzYycsXHJcbiAgICAgICAgb3Zlcm9mZiA6ICcjNWM1YzVjJyxcclxuICAgICAgICBvdmVyIDogJyMwMjQ2OTknLFxyXG4gICAgICAgIHNlbGVjdCA6ICcjMzA4QUZGJyxcclxuICAgICAgICBhY3Rpb246ICcjRkYzMzAwJyxcclxuICAgICAgICBcclxuICAgICAgICAvL2ZvbnRGYW1pbHk6ICdUYWhvbWEnLFxyXG4gICAgICAgIGZvbnRGYW1pbHk6ICdDb25zb2xhcywgbW9ub3NwYWNlJyxcclxuICAgICAgICAvL2ZvbnRGYW1pbHk6IFwiJ1JvYm90byBNb25vJywgJ1NvdXJjZSBDb2RlIFBybycsIE1lbmxvLCBDb3VyaWVyLCBtb25vc3BhY2VcIixcclxuICAgICAgICBmb250V2VpZ2h0OiAnbm9ybWFsJyxcclxuICAgICAgICBmb250U2hhZG93OiAnbm9uZScsLy8nIzAwMCcsXHJcbiAgICAgICAgZm9udFNpemU6MTIsXHJcblxyXG4gICAgICAgIGpveU92ZXI6J3JnYmEoNDgsMTM4LDI1NSwwLjI1KScsXHJcbiAgICAgICAgam95T3V0OiAncmdiYSgxMDAsMTAwLDEwMCwwLjUpJyxcclxuICAgICAgICBqb3lTZWxlY3Q6ICcjMzA4QUZGJyxcclxuXHJcbiAgICAgICAgXHJcbiAgICAgICAgaGlkZTogJ3JnYmEoMCwwLDAsMCknLFxyXG5cclxuICAgIH0sXHJcblxyXG4gICAgLy8gc3R5bGUgY3NzXHJcblxyXG4gICAgY3NzIDoge1xyXG5cclxuICAgICAgICBiYXNpYzogJ3Bvc2l0aW9uOmFic29sdXRlOyBwb2ludGVyLWV2ZW50czpub25lOyBib3gtc2l6aW5nOmJvcmRlci1ib3g7IG1hcmdpbjowOyBwYWRkaW5nOjA7IG92ZXJmbG93OmhpZGRlbjsgJyArICctby11c2VyLXNlbGVjdDpub25lOyAtbXMtdXNlci1zZWxlY3Q6bm9uZTsgLWtodG1sLXVzZXItc2VsZWN0Om5vbmU7IC13ZWJraXQtdXNlci1zZWxlY3Q6bm9uZTsgLW1vei11c2VyLXNlbGVjdDpub25lOycsXHJcbiAgICAgICAgYnV0dG9uOidkaXNwbGF5OmZsZXg7IGFsaWduLWl0ZW1zOmNlbnRlcjsganVzdGlmeS1jb250ZW50OmNlbnRlcjsgdGV4dC1hbGlnbjpjZW50ZXI7JyxcclxuICAgICAgICBtaWRkbGU6J2Rpc3BsYXk6ZmxleDsgYWxpZ24taXRlbXM6Y2VudGVyOyBqdXN0aWZ5LWNvbnRlbnQ6bGVmdDsgdGV4dC1hbGlnbjpsZWZ0OyBmbGV4LWRpcmVjdGlvbjogcm93LXJldmVyc2U7J1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBzdmcgcGF0aFxyXG5cclxuICAgIHN2Z3M6IHtcclxuXHJcbiAgICAgICAgZzE6J00gNiA0IEwgMCA0IDAgNiA2IDYgNiA0IE0gNiAwIEwgMCAwIDAgMiA2IDIgNiAwIFonLFxyXG4gICAgICAgIGcyOidNIDYgMCBMIDQgMCA0IDYgNiA2IDYgMCBNIDIgMCBMIDAgMCAwIDYgMiA2IDIgMCBaJyxcclxuXHJcbiAgICAgICAgZ3JvdXA6J00gNyA3IEwgNyA4IDggOCA4IDcgNyA3IE0gNSA3IEwgNSA4IDYgOCA2IDcgNSA3IE0gMyA3IEwgMyA4IDQgOCA0IDcgMyA3IE0gNyA1IEwgNyA2IDggNiA4IDUgNyA1IE0gNiA2IEwgNiA1IDUgNSA1IDYgNiA2IE0gNyAzIEwgNyA0IDggNCA4IDMgNyAzIE0gNiA0IEwgNiAzIDUgMyA1IDQgNiA0IE0gMyA1IEwgMyA2IDQgNiA0IDUgMyA1IE0gMyAzIEwgMyA0IDQgNCA0IDMgMyAzIFonLFxyXG4gICAgICAgIGFycm93OidNIDMgOCBMIDggNSAzIDIgMyA4IFonLFxyXG5cclxuICAgICAgICBhcnJvd0Rvd246J00gNSA4IEwgOCAzIDIgMyA1IDggWicsXHJcbiAgICAgICAgYXJyb3dVcDonTSA1IDIgTCAyIDcgOCA3IDUgMiBaJyxcclxuXHJcbiAgICAgICAgc29saWQ6J00gMTMgMTAgTCAxMyAxIDQgMSAxIDQgMSAxMyAxMCAxMyAxMyAxMCBNIDExIDMgTCAxMSA5IDkgMTEgMyAxMSAzIDUgNSAzIDExIDMgWicsXHJcbiAgICAgICAgYm9keTonTSAxMyAxMCBMIDEzIDEgNCAxIDEgNCAxIDEzIDEwIDEzIDEzIDEwIE0gMTEgMyBMIDExIDkgOSAxMSAzIDExIDMgNSA1IDMgMTEgMyBNIDUgNCBMIDQgNSA0IDEwIDkgMTAgMTAgOSAxMCA0IDUgNCBaJyxcclxuICAgICAgICB2ZWhpY2xlOidNIDEzIDYgTCAxMSAxIDMgMSAxIDYgMSAxMyAzIDEzIDMgMTEgMTEgMTEgMTEgMTMgMTMgMTMgMTMgNiBNIDIuNCA2IEwgNCAyIDEwIDIgMTEuNiA2IDIuNCA2IE0gMTIgOCBMIDEyIDEwIDEwIDEwIDEwIDggMTIgOCBNIDQgOCBMIDQgMTAgMiAxMCAyIDggNCA4IFonLFxyXG4gICAgICAgIGFydGljdWxhdGlvbjonTSAxMyA5IEwgMTIgOSA5IDIgOSAxIDUgMSA1IDIgMiA5IDEgOSAxIDEzIDUgMTMgNSA5IDQgOSA2IDUgOCA1IDEwIDkgOSA5IDkgMTMgMTMgMTMgMTMgOSBaJyxcclxuICAgICAgICBjaGFyYWN0ZXI6J00gMTMgNCBMIDEyIDMgOSA0IDUgNCAyIDMgMSA0IDUgNiA1IDggNCAxMyA2IDEzIDcgOSA4IDEzIDEwIDEzIDkgOCA5IDYgMTMgNCBNIDYgMSBMIDYgMyA4IDMgOCAxIDYgMSBaJyxcclxuICAgICAgICB0ZXJyYWluOidNIDEzIDggTCAxMiA3IFEgOS4wNiAtMy42NyA1Ljk1IDQuODUgNC4wNCAzLjI3IDIgNyBMIDEgOCA3IDEzIDEzIDggTSAzIDggUSAzLjc4IDUuNDIwIDUuNCA2LjYgNS4yMCA3LjI1IDUgOCBMIDcgOCBRIDguMzkgLTAuMTYgMTEgOCBMIDcgMTEgMyA4IFonLFxyXG4gICAgICAgIGpvaW50OidNIDcuNyA3LjcgUSA4IDcuNDUgOCA3IDggNi42IDcuNyA2LjMgNy40NSA2IDcgNiA2LjYgNiA2LjMgNi4zIDYgNi42IDYgNyA2IDcuNDUgNi4zIDcuNyA2LjYgOCA3IDggNy40NSA4IDcuNyA3LjcgTSAzLjM1IDguNjUgTCAxIDExIDMgMTMgNS4zNSAxMC42NSBRIDYuMSAxMSA3IDExIDguMjggMTEgOS4yNSAxMC4yNSBMIDcuOCA4LjggUSA3LjQ1IDkgNyA5IDYuMTUgOSA1LjU1IDguNCA1IDcuODUgNSA3IDUgNi41NCA1LjE1IDYuMTUgTCAzLjcgNC43IFEgMyA1LjcxMiAzIDcgMyA3LjkgMy4zNSA4LjY1IE0gMTAuMjUgOS4yNSBRIDExIDguMjggMTEgNyAxMSA2LjEgMTAuNjUgNS4zNSBMIDEzIDMgMTEgMSA4LjY1IDMuMzUgUSA3LjkgMyA3IDMgNS43IDMgNC43IDMuNyBMIDYuMTUgNS4xNSBRIDYuNTQgNSA3IDUgNy44NSA1IDguNCA1LjU1IDkgNi4xNSA5IDcgOSA3LjQ1IDguOCA3LjggTCAxMC4yNSA5LjI1IFonLFxyXG4gICAgICAgIHJheTonTSA5IDExIEwgNSAxMSA1IDEyIDkgMTIgOSAxMSBNIDEyIDUgTCAxMSA1IDExIDkgMTIgOSAxMiA1IE0gMTEuNSAxMCBRIDEwLjkgMTAgMTAuNDUgMTAuNDUgMTAgMTAuOSAxMCAxMS41IDEwIDEyLjIgMTAuNDUgMTIuNTUgMTAuOSAxMyAxMS41IDEzIDEyLjIgMTMgMTIuNTUgMTIuNTUgMTMgMTIuMiAxMyAxMS41IDEzIDEwLjkgMTIuNTUgMTAuNDUgMTIuMiAxMCAxMS41IDEwIE0gOSAxMCBMIDEwIDkgMiAxIDEgMiA5IDEwIFonLFxyXG4gICAgICAgIGNvbGxpc2lvbjonTSAxMSAxMiBMIDEzIDEwIDEwIDcgMTMgNCAxMSAyIDcuNSA1LjUgOSA3IDcuNSA4LjUgMTEgMTIgTSAzIDIgTCAxIDQgNCA3IDEgMTAgMyAxMiA4IDcgMyAyIFonLFxyXG4gICAgICAgIG1hcDonTSAxMyAxIEwgMSAxIDEgMTMgMTMgMTMgMTMgMSBNIDEyIDIgTCAxMiA3IDcgNyA3IDEyIDIgMTIgMiA3IDcgNyA3IDIgMTIgMiBaJyxcclxuICAgICAgICBtYXRlcmlhbDonTSAxMyAxIEwgMSAxIDEgMTMgMTMgMTMgMTMgMSBNIDEyIDIgTCAxMiA3IDcgNyA3IDEyIDIgMTIgMiA3IDcgNyA3IDIgMTIgMiBaJyxcclxuICAgICAgICB0ZXh0dXJlOidNIDEzIDQgTCAxMyAxIDEgMSAxIDQgNSA0IDUgMTMgOSAxMyA5IDQgMTMgNCBaJyxcclxuICAgICAgICBvYmplY3Q6J00gMTAgMSBMIDcgNCA0IDEgMSAxIDEgMTMgNCAxMyA0IDUgNyA4IDEwIDUgMTAgMTMgMTMgMTMgMTMgMSAxMCAxIFonLFxyXG4gICAgICAgIG5vbmU6J00gOSA1IEwgNSA1IDUgOSA5IDkgOSA1IFonLFxyXG4gICAgICAgIGN1cnNvcjonTSA0IDcgTCAxIDEwIDEgMTIgMiAxMyA0IDEzIDcgMTAgOSAxNCAxNCAwIDAgNSA0IDcgWicsXHJcbiAgICAgICAgbG9hZDonTSAxMyA4IEwgMTEuNSA2LjUgOSA5IDkgMyA1IDMgNSA5IDIuNSA2LjUgMSA4IDcgMTQgMTMgOCBNIDkgMiBMIDkgMCA1IDAgNSAyIDkgMiBaJyxcclxuICAgICAgICBzYXZlOidNIDkgMTIgTCA1IDEyIDUgMTQgOSAxNCA5IDEyIE0gMTEuNSA3LjUgTCAxMyA2IDcgMCAxIDYgMi41IDcuNSA1IDUgNSAxMSA5IDExIDkgNSAxMS41IDcuNSBaJyxcclxuICAgICAgICBleHRlcm46J00gMTQgMTQgTCAxNCAwIDAgMCAwIDE0IDE0IDE0IE0gMTIgNiBMIDEyIDEyIDIgMTIgMiA2IDEyIDYgTSAxMiAyIEwgMTIgNCAyIDQgMiAyIDEyIDIgWicsXHJcblxyXG4gICAgfSxcclxuXHJcbiAgICByZXpvbmUgKCkge1xyXG4gICAgICAgIFJvb3RzLm5lZWRSZVpvbmUgPSB0cnVlO1xyXG4gICAgfSxcclxuXHJcbiAgICBnZXRJbXB1dDogZnVuY3Rpb24oKXtcclxuXHJcbiAgICAgICAgcmV0dXJuIFJvb3RzLmlucHV0ID8gdHJ1ZSA6IGZhbHNlXHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBzZXRTdHlsZSA6IGZ1bmN0aW9uICggZGF0YSApe1xyXG5cclxuICAgICAgICBmb3IgKCB2YXIgbyBpbiBkYXRhICl7XHJcbiAgICAgICAgICAgIGlmKCBULmNvbG9yc1tvXSApIFQuY29sb3JzW29dID0gZGF0YVtvXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIFQuc2V0VGV4dCgpO1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gY3VzdG9tIHRleHRcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBkZWZpbmVUZXh0OiBmdW5jdGlvbiggbyApe1xyXG5cclxuICAgICAgICBULnNldFRleHQoIG8uZm9udFNpemUsIG8udGV4dCwgby5mb250RmFtaWx5LCBvLmZvbnRTaGFkb3csIG8uZm9udFdlaWdodCApXHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBzZXRUZXh0OiBmdW5jdGlvbiggc2l6ZSwgY29sb3IsIGZvbnQsIHNoYWRvdywgd2VpZ2h0ICl7XHJcblxyXG4gICAgICAgIGxldCBjYyA9IFQuY29sb3JzO1xyXG5cclxuICAgICAgICBpZiggZm9udCA9PT0gdW5kZWZpbmVkICkgZm9udCA9IGNjLmZvbnRGYW1pbHlcclxuICAgICAgICBpZiggc2l6ZSA9PT0gdW5kZWZpbmVkICkgc2l6ZSA9IGNjLmZvbnRTaXplXHJcbiAgICAgICAgaWYoIHNoYWRvdyA9PT0gdW5kZWZpbmVkICkgc2hhZG93ID0gY2MuZm9udFNoYWRvd1xyXG4gICAgICAgIGlmKCB3ZWlnaHQgPT09IHVuZGVmaW5lZCApIHdlaWdodCA9IGNjLmZvbnRXZWlnaHRcclxuICAgICAgICBpZiggY29sb3IgPT09IHVuZGVmaW5lZCApIGNvbG9yID0gY2MudGV4dFxyXG5cclxuICAgICAgICBpZiggaXNOYU4oc2l6ZSkgKXsgaWYoIHNpemUuc2VhcmNoKCdlbScpPT09LTEgKSBzaXplICs9ICdweCd9XHJcbiAgICAgICAgZWxzZSBzaXplICs9ICdweCdcclxuICAgICAgICBcclxuXHJcbiAgICAgICAgLy9sZXQgYWxpZ24gPSAnZGlzcGxheTpmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6bGVmdDsgYWxpZ24taXRlbXM6Y2VudGVyOyB0ZXh0LWFsaWduOmxlZnQ7J1xyXG5cclxuICAgICAgICBULmNzcy50eHQgPSBULmNzcy5iYXNpYyArIFQuY3NzLm1pZGRsZSArICcgZm9udC1mYW1pbHk6JysgZm9udCArJzsgZm9udC13ZWlnaHQ6Jyt3ZWlnaHQrJzsgZm9udC1zaXplOicrc2l6ZSsnOyBjb2xvcjonK2NjLnRleHQrJzsgcGFkZGluZzowcHggOHB4OyBsZWZ0OjA7IHRvcDoycHg7IGhlaWdodDoxNnB4OyB3aWR0aDoxMDBweDsgb3ZlcmZsb3c6aGlkZGVuOyB3aGl0ZS1zcGFjZTogbm93cmFwOyBsZXR0ZXItc3BhY2luZzogbm9ybWFsOyc7XHJcbiAgICAgICAgaWYoIHNoYWRvdyAhPT0gJ25vbmUnICkgVC5jc3MudHh0ICs9ICcgdGV4dC1zaGFkb3c6IDFweCAxcHggMXB4ICcrc2hhZG93Kyc7JztcclxuXHJcbiAgICAgICAgVC5jc3MudHh0c2VsZWN0ID0gVC5jc3MudHh0ICsgJ3BhZGRpbmc6MHB4IDRweDsgYm9yZGVyOjFweCBkYXNoZWQgJyArIGNjLmJvcmRlciArICc7JztcclxuICAgICAgICBULmNzcy5pdGVtID0gVC5jc3MudHh0ICsgJ3BhZGRpbmc6MHB4IDRweDsgcG9zaXRpb246cmVsYXRpdmU7IG1hcmdpbi1ib3R0b206MXB4OyAnXHJcblxyXG4gICAgfSxcclxuXHJcblxyXG4gICAgLy8gbm90ZVxyXG5cclxuICAgIC8vaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZnIvZG9jcy9XZWIvQ1NTL2Nzc19mbGV4aWJsZV9ib3hfbGF5b3V0L2FsaWduaW5nX2l0ZW1zX2luX2FfZmxleF9jb250YWluZXJcclxuXHJcbiAgICAvKmNsb25lQ29sb3I6IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgbGV0IGNjID0gT2JqZWN0LmFzc2lnbih7fSwgVC5jb2xvcnMgKTtcclxuICAgICAgICByZXR1cm4gY2M7XHJcblxyXG4gICAgfSwqL1xyXG5cclxuICAgIC8vIGludGVybiBmdW5jdGlvblxyXG5cclxuICAgIGNsb25lQ3NzOiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgIC8vbGV0IGNjID0gT2JqZWN0LmFzc2lnbih7fSwgVC5jc3MgKTtcclxuICAgICAgICByZXR1cm4geyAuLi5ULmNzcyB9O1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgY2xvbmU6IGZ1bmN0aW9uICggbyApIHtcclxuXHJcbiAgICAgICAgcmV0dXJuIG8uY2xvbmVOb2RlKCB0cnVlICk7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBzZXRTdmc6IGZ1bmN0aW9uKCBkb20sIHR5cGUsIHZhbHVlLCBpZCwgaWQyICl7XHJcblxyXG4gICAgICAgIGlmKCBpZCA9PT0gLTEgKSBkb20uc2V0QXR0cmlidXRlTlMoIG51bGwsIHR5cGUsIHZhbHVlICk7XHJcbiAgICAgICAgZWxzZSBpZiggaWQyICE9PSB1bmRlZmluZWQgKSBkb20uY2hpbGROb2Rlc1sgaWQgfHwgMCBdLmNoaWxkTm9kZXNbIGlkMiB8fCAwIF0uc2V0QXR0cmlidXRlTlMoIG51bGwsIHR5cGUsIHZhbHVlICk7XHJcbiAgICAgICAgZWxzZSBkb20uY2hpbGROb2Rlc1sgaWQgfHwgMCBdLnNldEF0dHJpYnV0ZU5TKCBudWxsLCB0eXBlLCB2YWx1ZSApO1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgc2V0Q3NzOiBmdW5jdGlvbiggZG9tLCBjc3MgKXtcclxuXHJcbiAgICAgICAgZm9yKCBsZXQgciBpbiBjc3MgKXtcclxuICAgICAgICAgICAgaWYoIFQuRE9NX1NJWkUuaW5kZXhPZihyKSAhPT0gLTEgKSBkb20uc3R5bGVbcl0gPSBjc3Nbcl0gKyAncHgnO1xyXG4gICAgICAgICAgICBlbHNlIGRvbS5zdHlsZVtyXSA9IGNzc1tyXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBzZXQ6IGZ1bmN0aW9uKCBnLCBvICl7XHJcblxyXG4gICAgICAgIGZvciggbGV0IGF0dCBpbiBvICl7XHJcbiAgICAgICAgICAgIGlmKCBhdHQgPT09ICd0eHQnICkgZy50ZXh0Q29udGVudCA9IG9bIGF0dCBdO1xyXG4gICAgICAgICAgICBpZiggYXR0ID09PSAnbGluaycgKSBnLnNldEF0dHJpYnV0ZU5TKCBULmxpbmtzLCAneGxpbms6aHJlZicsIG9bIGF0dCBdICk7XHJcbiAgICAgICAgICAgIGVsc2UgZy5zZXRBdHRyaWJ1dGVOUyggbnVsbCwgYXR0LCBvWyBhdHQgXSApO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgIH0sXHJcblxyXG4gICAgZ2V0OiBmdW5jdGlvbiggZG9tLCBpZCApe1xyXG5cclxuICAgICAgICBpZiggaWQgPT09IHVuZGVmaW5lZCApIHJldHVybiBkb207IC8vIHJvb3RcclxuICAgICAgICBlbHNlIGlmKCAhaXNOYU4oIGlkICkgKSByZXR1cm4gZG9tLmNoaWxkTm9kZXNbIGlkIF07IC8vIGZpcnN0IGNoaWxkXHJcbiAgICAgICAgZWxzZSBpZiggaWQgaW5zdGFuY2VvZiBBcnJheSApe1xyXG4gICAgICAgICAgICBpZihpZC5sZW5ndGggPT09IDIpIHJldHVybiBkb20uY2hpbGROb2Rlc1sgaWRbMF0gXS5jaGlsZE5vZGVzWyBpZFsxXSBdO1xyXG4gICAgICAgICAgICBpZihpZC5sZW5ndGggPT09IDMpIHJldHVybiBkb20uY2hpbGROb2Rlc1sgaWRbMF0gXS5jaGlsZE5vZGVzWyBpZFsxXSBdLmNoaWxkTm9kZXNbIGlkWzJdIF07XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0sXHJcblxyXG4gICAgZG9tIDogZnVuY3Rpb24gKCB0eXBlLCBjc3MsIG9iaiwgZG9tLCBpZCApIHtcclxuXHJcbiAgICAgICAgdHlwZSA9IHR5cGUgfHwgJ2Rpdic7XHJcblxyXG4gICAgICAgIGlmKCBULlNWR19UWVBFX0QuaW5kZXhPZih0eXBlKSAhPT0gLTEgfHwgVC5TVkdfVFlQRV9HLmluZGV4T2YodHlwZSkgIT09IC0xICl7IC8vIGlzIHN2ZyBlbGVtZW50XHJcblxyXG4gICAgICAgICAgICBpZiggdHlwZSA9PT0nc3ZnJyApe1xyXG5cclxuICAgICAgICAgICAgICAgIGRvbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyggVC5zdmducywgJ3N2ZycgKTtcclxuICAgICAgICAgICAgICAgIFQuc2V0KCBkb20sIG9iaiApO1xyXG5cclxuICAgICAgICAgIC8qICB9IGVsc2UgaWYgKCB0eXBlID09PSAndXNlJyApIHtcclxuXHJcbiAgICAgICAgICAgICAgICBkb20gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoIFQuc3ZnbnMsICd1c2UnICk7XHJcbiAgICAgICAgICAgICAgICBULnNldCggZG9tLCBvYmogKTtcclxuKi9cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIGNyZWF0ZSBuZXcgc3ZnIGlmIG5vdCBkZWZcclxuICAgICAgICAgICAgICAgIGlmKCBkb20gPT09IHVuZGVmaW5lZCApIGRvbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyggVC5zdmducywgJ3N2ZycgKTtcclxuICAgICAgICAgICAgICAgIFQuYWRkQXR0cmlidXRlcyggZG9tLCB0eXBlLCBvYmosIGlkICk7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH0gZWxzZSB7IC8vIGlzIGh0bWwgZWxlbWVudFxyXG5cclxuICAgICAgICAgICAgaWYoIGRvbSA9PT0gdW5kZWZpbmVkICkgZG9tID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCBULmh0bWxzLCB0eXBlICk7XHJcbiAgICAgICAgICAgIGVsc2UgZG9tID0gZG9tLmFwcGVuZENoaWxkKCBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoIFQuaHRtbHMsIHR5cGUgKSApO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCBjc3MgKSBkb20uc3R5bGUuY3NzVGV4dCA9IGNzczsgXHJcblxyXG4gICAgICAgIGlmKCBpZCA9PT0gdW5kZWZpbmVkICkgcmV0dXJuIGRvbTtcclxuICAgICAgICBlbHNlIHJldHVybiBkb20uY2hpbGROb2Rlc1sgaWQgfHwgMCBdO1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgYWRkQXR0cmlidXRlcyA6IGZ1bmN0aW9uKCBkb20sIHR5cGUsIG8sIGlkICl7XHJcblxyXG4gICAgICAgIGxldCBnID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCBULnN2Z25zLCB0eXBlICk7XHJcbiAgICAgICAgVC5zZXQoIGcsIG8gKTtcclxuICAgICAgICBULmdldCggZG9tLCBpZCApLmFwcGVuZENoaWxkKCBnICk7XHJcbiAgICAgICAgaWYoIFQuU1ZHX1RZUEVfRy5pbmRleE9mKHR5cGUpICE9PSAtMSApIGcuc3R5bGUucG9pbnRlckV2ZW50cyA9ICdub25lJztcclxuICAgICAgICByZXR1cm4gZztcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIGNsZWFyIDogZnVuY3Rpb24oIGRvbSApe1xyXG5cclxuICAgICAgICBULnB1cmdlKCBkb20gKTtcclxuICAgICAgICB3aGlsZSAoZG9tLmZpcnN0Q2hpbGQpIHtcclxuICAgICAgICAgICAgaWYgKCBkb20uZmlyc3RDaGlsZC5maXJzdENoaWxkICkgVC5jbGVhciggZG9tLmZpcnN0Q2hpbGQgKTtcclxuICAgICAgICAgICAgZG9tLnJlbW92ZUNoaWxkKCBkb20uZmlyc3RDaGlsZCApOyBcclxuICAgICAgICB9XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBwdXJnZSA6IGZ1bmN0aW9uICggZG9tICkge1xyXG5cclxuICAgICAgICBsZXQgYSA9IGRvbS5hdHRyaWJ1dGVzLCBpLCBuO1xyXG4gICAgICAgIGlmIChhKSB7XHJcbiAgICAgICAgICAgIGkgPSBhLmxlbmd0aDtcclxuICAgICAgICAgICAgd2hpbGUoaS0tKXtcclxuICAgICAgICAgICAgICAgIG4gPSBhW2ldLm5hbWU7XHJcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGRvbVtuXSA9PT0gJ2Z1bmN0aW9uJykgZG9tW25dID0gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBhID0gZG9tLmNoaWxkTm9kZXM7XHJcbiAgICAgICAgaWYgKGEpIHtcclxuICAgICAgICAgICAgaSA9IGEubGVuZ3RoO1xyXG4gICAgICAgICAgICB3aGlsZShpLS0peyBcclxuICAgICAgICAgICAgICAgIFQucHVyZ2UoIGRvbS5jaGlsZE5vZGVzW2ldICk7IFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0sXHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBTVkcgRWZmZWN0cyBmdW5jdGlvblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIGFkZFNWR0dsb3dFZmZlY3Q6IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgaWYgKCBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCggJ1VJTEdsb3cnKSAhPT0gbnVsbCApIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IHN2Z0ZpbHRlciA9IFQuaW5pdFVJTEVmZmVjdHMoKTtcclxuXHJcbiAgICAgICAgbGV0IGZpbHRlciA9IFQuYWRkQXR0cmlidXRlcyggc3ZnRmlsdGVyLCAnZmlsdGVyJywgeyBpZDogJ1VJTEdsb3cnLCB4OiAnLTIwJScsIHk6ICctMjAlJywgd2lkdGg6ICcxNDAlJywgaGVpZ2h0OiAnMTQwJScgfSApO1xyXG4gICAgICAgIFQuYWRkQXR0cmlidXRlcyggZmlsdGVyLCAnZmVHYXVzc2lhbkJsdXInLCB7IGluOiAnU291cmNlR3JhcGhpYycsIHN0ZERldmlhdGlvbjogJzMnLCByZXN1bHQ6ICd1aWxCbHVyJyB9ICk7XHJcbiAgICAgICAgbGV0IGZlTWVyZ2UgPSBULmFkZEF0dHJpYnV0ZXMoIGZpbHRlciwgJ2ZlTWVyZ2UnLCB7ICB9ICk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yKCBsZXQgaSA9IDA7IGkgPD0gMzsgaSsrICkge1xyXG5cclxuICAgICAgICAgICAgVC5hZGRBdHRyaWJ1dGVzKCBmZU1lcmdlLCAnZmVNZXJnZU5vZGUnLCB7IGluOiAndWlsQmx1cicgfSApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgVC5hZGRBdHRyaWJ1dGVzKCBmZU1lcmdlLCAnZmVNZXJnZU5vZGUnLCB7IGluOiAnU291cmNlR3JhcGhpYycgfSApO1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgaW5pdFVJTEVmZmVjdHM6IGZ1bmN0aW9uICgpIHtcclxuXHJcbiAgICAgICAgbGV0IHN2Z0ZpbHRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCAnVUlMU1ZHRWZmZWN0cycpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICggc3ZnRmlsdGVyID09PSBudWxsICkge1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgc3ZnRmlsdGVyID0gVC5kb20oICdzdmcnLCB1bmRlZmluZWQgLCB7IGlkOiAnVUlMU1ZHRWZmZWN0cycsIHdpZHRoOiAnMCcsIGhlaWdodDogJzAnIH0gKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCggc3ZnRmlsdGVyICk7XHJcbiBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBzdmdGaWx0ZXI7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIENvbG9yIGZ1bmN0aW9uXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgQ29sb3JMdW1hIDogZnVuY3Rpb24gKCBoZXgsIGwgKSB7XHJcblxyXG4gICAgICAgIC8vaWYoIGhleC5zdWJzdHJpbmcoMCwgMykgPT09ICdyZ2JhJyApIGhleCA9ICcjMDAwJztcclxuXHJcbiAgICAgICAgaWYoIGhleCA9PT0gJ24nICkgaGV4ID0gJyMwMDAnO1xyXG5cclxuICAgICAgICAvLyB2YWxpZGF0ZSBoZXggc3RyaW5nXHJcbiAgICAgICAgaGV4ID0gU3RyaW5nKGhleCkucmVwbGFjZSgvW14wLTlhLWZdL2dpLCAnJyk7XHJcbiAgICAgICAgaWYgKGhleC5sZW5ndGggPCA2KSB7XHJcbiAgICAgICAgICAgIGhleCA9IGhleFswXStoZXhbMF0raGV4WzFdK2hleFsxXStoZXhbMl0raGV4WzJdO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsID0gbCB8fCAwO1xyXG5cclxuICAgICAgICAvLyBjb252ZXJ0IHRvIGRlY2ltYWwgYW5kIGNoYW5nZSBsdW1pbm9zaXR5XHJcbiAgICAgICAgbGV0IHJnYiA9IFwiI1wiLCBjLCBpO1xyXG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCAzOyBpKyspIHtcclxuICAgICAgICAgICAgYyA9IHBhcnNlSW50KGhleC5zdWJzdHIoaSoyLDIpLCAxNik7XHJcbiAgICAgICAgICAgIGMgPSBNYXRoLnJvdW5kKE1hdGgubWluKE1hdGgubWF4KDAsIGMgKyAoYyAqIGwpKSwgMjU1KSkudG9TdHJpbmcoMTYpO1xyXG4gICAgICAgICAgICByZ2IgKz0gKFwiMDBcIitjKS5zdWJzdHIoYy5sZW5ndGgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJnYjtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIGZpbmREZWVwSW52ZXI6IGZ1bmN0aW9uICggYyApIHsgXHJcblxyXG4gICAgICAgIHJldHVybiAoY1swXSAqIDAuMyArIGNbMV0gKiAuNTkgKyBjWzJdICogLjExKSA8PSAwLjY7XHJcbiAgICAgICAgXHJcbiAgICB9LFxyXG5cclxuICAgIGxlcnBDb2xvcjogZnVuY3Rpb24oIGMxLCBjMiwgZmFjdG9yICkge1xyXG4gICAgICAgIGxldCBuZXdDb2xvciA9IHt9O1xyXG4gICAgICAgIGZvciAoIGxldCBpID0gMDsgaSA8IDM7IGkrKyApIHtcclxuICAgICAgICAgIG5ld0NvbG9yW2ldID0gYzFbIGkgXSArICggYzJbIGkgXSAtIGMxWyBpIF0gKSAqIGZhY3RvcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ld0NvbG9yO1xyXG4gICAgfSxcclxuXHJcbiAgICBoZXhUb0h0bWw6IGZ1bmN0aW9uICggdiApIHsgXHJcbiAgICAgICAgdiA9IHYgPT09IHVuZGVmaW5lZCA/IDB4MDAwMDAwIDogdjtcclxuICAgICAgICByZXR1cm4gXCIjXCIgKyAoXCIwMDAwMDBcIiArIHYudG9TdHJpbmcoMTYpKS5zdWJzdHIoLTYpO1xyXG4gICAgICAgIFxyXG4gICAgfSxcclxuXHJcbiAgICBodG1sVG9IZXg6IGZ1bmN0aW9uICggdiApIHsgXHJcblxyXG4gICAgICAgIHJldHVybiB2LnRvVXBwZXJDYXNlKCkucmVwbGFjZShcIiNcIiwgXCIweFwiKTtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIHUyNTU6IGZ1bmN0aW9uIChjLCBpKSB7XHJcblxyXG4gICAgICAgIHJldHVybiBwYXJzZUludChjLnN1YnN0cmluZyhpLCBpICsgMiksIDE2KSAvIDI1NTtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIHUxNjogZnVuY3Rpb24gKCBjLCBpICkge1xyXG5cclxuICAgICAgICByZXR1cm4gcGFyc2VJbnQoYy5zdWJzdHJpbmcoaSwgaSArIDEpLCAxNikgLyAxNTtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIHVucGFjazogZnVuY3Rpb24oIGMgKXtcclxuXHJcbiAgICAgICAgaWYgKGMubGVuZ3RoID09IDcpIHJldHVybiBbIFQudTI1NShjLCAxKSwgVC51MjU1KGMsIDMpLCBULnUyNTUoYywgNSkgXTtcclxuICAgICAgICBlbHNlIGlmIChjLmxlbmd0aCA9PSA0KSByZXR1cm4gWyBULnUxNihjLDEpLCBULnUxNihjLDIpLCBULnUxNihjLDMpIF07XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBwMjU1OiBmdW5jdGlvbiAoIGMgKSB7XHJcbiAgICAgICAgbGV0IGggPSBNYXRoLnJvdW5kKCAoIGMgKiAyNTUgKSApLnRvU3RyaW5nKCAxNiApO1xyXG4gICAgICAgIGlmICggaC5sZW5ndGggPCAyICkgaCA9ICcwJyArIGg7XHJcbiAgICAgICAgcmV0dXJuIGg7XHJcbiAgICB9LFxyXG5cclxuICAgIHBhY2s6IGZ1bmN0aW9uICggYyApIHtcclxuXHJcbiAgICAgICAgcmV0dXJuICcjJyArIFQucDI1NSggY1sgMCBdICkgKyBULnAyNTUoIGNbIDEgXSApICsgVC5wMjU1KCBjWyAyIF0gKTtcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIGh0bWxSZ2I6IGZ1bmN0aW9uKCBjICl7XHJcblxyXG4gICAgICAgIHJldHVybiAncmdiKCcgKyBNYXRoLnJvdW5kKGNbMF0gKiAyNTUpICsgJywnKyBNYXRoLnJvdW5kKGNbMV0gKiAyNTUpICsgJywnKyBNYXRoLnJvdW5kKGNbMl0gKiAyNTUpICsgJyknO1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgcGFkOiBmdW5jdGlvbiggbiApe1xyXG4gICAgICAgIGlmKG4ubGVuZ3RoID09IDEpbiA9ICcwJyArIG47XHJcbiAgICAgICAgcmV0dXJuIG47XHJcbiAgICB9LFxyXG5cclxuICAgIHJnYlRvSGV4IDogZnVuY3Rpb24oIGMgKXtcclxuXHJcbiAgICAgICAgbGV0IHIgPSBNYXRoLnJvdW5kKGNbMF0gKiAyNTUpLnRvU3RyaW5nKDE2KTtcclxuICAgICAgICBsZXQgZyA9IE1hdGgucm91bmQoY1sxXSAqIDI1NSkudG9TdHJpbmcoMTYpO1xyXG4gICAgICAgIGxldCBiID0gTWF0aC5yb3VuZChjWzJdICogMjU1KS50b1N0cmluZygxNik7XHJcbiAgICAgICAgcmV0dXJuICcjJyArIFQucGFkKHIpICsgVC5wYWQoZykgKyBULnBhZChiKTtcclxuXHJcbiAgICAgICAvLyByZXR1cm4gJyMnICsgKCAnMDAwMDAwJyArICggKCBjWzBdICogMjU1ICkgPDwgMTYgXiAoIGNbMV0gKiAyNTUgKSA8PCA4IF4gKCBjWzJdICogMjU1ICkgPDwgMCApLnRvU3RyaW5nKCAxNiApICkuc2xpY2UoIC0gNiApO1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgaHVlVG9SZ2I6IGZ1bmN0aW9uKCBwLCBxLCB0ICl7XHJcblxyXG4gICAgICAgIGlmICggdCA8IDAgKSB0ICs9IDE7XHJcbiAgICAgICAgaWYgKCB0ID4gMSApIHQgLT0gMTtcclxuICAgICAgICBpZiAoIHQgPCAxIC8gNiApIHJldHVybiBwICsgKCBxIC0gcCApICogNiAqIHQ7XHJcbiAgICAgICAgaWYgKCB0IDwgMSAvIDIgKSByZXR1cm4gcTtcclxuICAgICAgICBpZiAoIHQgPCAyIC8gMyApIHJldHVybiBwICsgKCBxIC0gcCApICogNiAqICggMiAvIDMgLSB0ICk7XHJcbiAgICAgICAgcmV0dXJuIHA7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICByZ2JUb0hzbDogZnVuY3Rpb24gKCBjICkge1xyXG5cclxuICAgICAgICBsZXQgciA9IGNbMF0sIGcgPSBjWzFdLCBiID0gY1syXSwgbWluID0gTWF0aC5taW4ociwgZywgYiksIG1heCA9IE1hdGgubWF4KHIsIGcsIGIpLCBkZWx0YSA9IG1heCAtIG1pbiwgaCA9IDAsIHMgPSAwLCBsID0gKG1pbiArIG1heCkgLyAyO1xyXG4gICAgICAgIGlmIChsID4gMCAmJiBsIDwgMSkgcyA9IGRlbHRhIC8gKGwgPCAwLjUgPyAoMiAqIGwpIDogKDIgLSAyICogbCkpO1xyXG4gICAgICAgIGlmIChkZWx0YSA+IDApIHtcclxuICAgICAgICAgICAgaWYgKG1heCA9PSByICYmIG1heCAhPSBnKSBoICs9IChnIC0gYikgLyBkZWx0YTtcclxuICAgICAgICAgICAgaWYgKG1heCA9PSBnICYmIG1heCAhPSBiKSBoICs9ICgyICsgKGIgLSByKSAvIGRlbHRhKTtcclxuICAgICAgICAgICAgaWYgKG1heCA9PSBiICYmIG1heCAhPSByKSBoICs9ICg0ICsgKHIgLSBnKSAvIGRlbHRhKTtcclxuICAgICAgICAgICAgaCAvPSA2O1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gWyBoLCBzLCBsIF07XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBoc2xUb1JnYjogZnVuY3Rpb24gKCBjICkge1xyXG5cclxuICAgICAgICBsZXQgcCwgcSwgaCA9IGNbMF0sIHMgPSBjWzFdLCBsID0gY1syXTtcclxuXHJcbiAgICAgICAgaWYgKCBzID09PSAwICkgcmV0dXJuIFsgbCwgbCwgbCBdO1xyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBxID0gbCA8PSAwLjUgPyBsICogKHMgKyAxKSA6IGwgKyBzIC0gKCBsICogcyApO1xyXG4gICAgICAgICAgICBwID0gbCAqIDIgLSBxO1xyXG4gICAgICAgICAgICByZXR1cm4gWyBULmh1ZVRvUmdiKHAsIHEsIGggKyAwLjMzMzMzKSwgVC5odWVUb1JnYihwLCBxLCBoKSwgVC5odWVUb1JnYihwLCBxLCBoIC0gMC4zMzMzMykgXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIFNWRyBNT0RFTFxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIG1ha2VHcmFkaWFudDogZnVuY3Rpb24gKCB0eXBlLCBzZXR0aW5ncywgcGFyZW50LCBjb2xvcnMgKSB7XHJcblxyXG4gICAgICAgIFQuZG9tKCB0eXBlLCBudWxsLCBzZXR0aW5ncywgcGFyZW50LCAwICk7XHJcblxyXG4gICAgICAgIGxldCBuID0gcGFyZW50LmNoaWxkTm9kZXNbMF0uY2hpbGROb2Rlcy5sZW5ndGggLSAxLCBjO1xyXG5cclxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8IGNvbG9ycy5sZW5ndGg7IGkrKyApe1xyXG5cclxuICAgICAgICAgICAgYyA9IGNvbG9yc1tpXTtcclxuICAgICAgICAgICAgLy9ULmRvbSggJ3N0b3AnLCBudWxsLCB7IG9mZnNldDpjWzBdKyclJywgc3R5bGU6J3N0b3AtY29sb3I6JytjWzFdKyc7IHN0b3Atb3BhY2l0eTonK2NbMl0rJzsnIH0sIHBhcmVudCwgWzAsbl0gKTtcclxuICAgICAgICAgICAgVC5kb20oICdzdG9wJywgbnVsbCwgeyBvZmZzZXQ6Y1swXSsnJScsICdzdG9wLWNvbG9yJzpjWzFdLCAgJ3N0b3Atb3BhY2l0eSc6Y1syXSB9LCBwYXJlbnQsIFswLG5dICk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9LFxyXG5cclxuICAgIC8qbWFrZUdyYXBoOiBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgIGxldCB3ID0gMTI4O1xyXG4gICAgICAgIGxldCByYWRpdXMgPSAzNDtcclxuICAgICAgICBsZXQgc3ZnID0gVC5kb20oICdzdmcnLCBULmNzcy5iYXNpYyAsIHsgdmlld0JveDonMCAwICcrdysnICcrdywgd2lkdGg6dywgaGVpZ2h0OncsIHByZXNlcnZlQXNwZWN0UmF0aW86J25vbmUnIH0gKTtcclxuICAgICAgICBULmRvbSggJ3BhdGgnLCAnJywgeyBkOicnLCBzdHJva2U6VC5jb2xvcnMudGV4dCwgJ3N0cm9rZS13aWR0aCc6NCwgZmlsbDonbm9uZScsICdzdHJva2UtbGluZWNhcCc6J2J1dHQnIH0sIHN2ZyApOy8vMFxyXG4gICAgICAgIC8vVC5kb20oICdyZWN0JywgJycsIHsgeDoxMCwgeToxMCwgd2lkdGg6MTA4LCBoZWlnaHQ6MTA4LCBzdHJva2U6J3JnYmEoMCwwLDAsMC4zKScsICdzdHJva2Utd2lkdGgnOjIgLCBmaWxsOidub25lJ30sIHN2ZyApOy8vMVxyXG4gICAgICAgIC8vVC5kb20oICdjaXJjbGUnLCAnJywgeyBjeDo2NCwgY3k6NjQsIHI6cmFkaXVzLCBmaWxsOlQuY29sb3JzLmJ1dHRvbiwgc3Ryb2tlOidyZ2JhKDAsMCwwLDAuMyknLCAnc3Ryb2tlLXdpZHRoJzo4IH0sIHN2ZyApOy8vMFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vVC5kb20oICdjaXJjbGUnLCAnJywgeyBjeDo2NCwgY3k6NjQsIHI6cmFkaXVzKzcsIHN0cm9rZToncmdiYSgwLDAsMCwwLjMpJywgJ3N0cm9rZS13aWR0aCc6NyAsIGZpbGw6J25vbmUnfSwgc3ZnICk7Ly8yXHJcbiAgICAgICAgLy9ULmRvbSggJ3BhdGgnLCAnJywgeyBkOicnLCBzdHJva2U6J3JnYmEoMjU1LDI1NSwyNTUsMC4zKScsICdzdHJva2Utd2lkdGgnOjIsIGZpbGw6J25vbmUnLCAnc3Ryb2tlLWxpbmVjYXAnOidyb3VuZCcsICdzdHJva2Utb3BhY2l0eSc6MC41IH0sIHN2ZyApOy8vM1xyXG4gICAgICAgIFQuZ3JhcGggPSBzdmc7XHJcblxyXG4gICAgfSwqL1xyXG5cclxuICAgIG1ha2VQYWQ6IGZ1bmN0aW9uICggbW9kZWwgKSB7XHJcblxyXG4gICAgICAgIGxldCB3dyA9IDI1NlxyXG4gICAgICAgIGxldCBzdmcgPSBULmRvbSggJ3N2ZycsIFQuY3NzLmJhc2ljICsgJ3Bvc2l0aW9uOnJlbGF0aXZlOycsIHsgdmlld0JveDonMCAwICcrd3crJyAnK3d3LCB3aWR0aDp3dywgaGVpZ2h0Ond3LCBwcmVzZXJ2ZUFzcGVjdFJhdGlvOidub25lJyB9ICk7XHJcbiAgICAgICAgbGV0IHcgPSAyMDA7IFxyXG4gICAgICAgIGxldCBkID0gKHd3LXcpKjAuNSwgbSA9IDIwO1xyXG4gICAgICAgIFRvb2xzLmRvbSggJ3JlY3QnLCAnJywgeyB4OiBkLCB5OiBkLCAgd2lkdGg6IHcsIGhlaWdodDogdywgZmlsbDpULmNvbG9ycy5iYWNrIH0sIHN2ZyApOyAvLyAwXHJcbiAgICAgICAgVG9vbHMuZG9tKCAncmVjdCcsICcnLCB7IHg6IGQrbSowLjUsIHk6IGQrbSowLjUsIHdpZHRoOiB3IC0gbSAsIGhlaWdodDogdyAtIG0sIGZpbGw6VC5jb2xvcnMuYnV0dG9uIH0sIHN2ZyApOyAvLyAxXHJcbiAgICAgICAgLy8gUG9pbnRlclxyXG4gICAgICAgIFRvb2xzLmRvbSggJ2xpbmUnLCAnJywgeyB4MTogZCsobSowLjUpLCB5MTogd3cgKjAuNSwgeDI6IGQrKHctbSowLjUpLCB5Mjogd3cgKiAwLjUsIHN0cm9rZTpULmNvbG9ycy5iYWNrLCAnc3Ryb2tlLXdpZHRoJzogMiB9LCBzdmcgKTsgLy8gMlxyXG4gICAgICAgIFRvb2xzLmRvbSggJ2xpbmUnLCAnJywgeyB4MTogd3cgKiAwLjUsIHgyOiB3dyAqIDAuNSwgeTE6IGQrKG0qMC41KSwgeTI6IGQrKHctbSowLjUpLCBzdHJva2U6VC5jb2xvcnMuYmFjaywgJ3N0cm9rZS13aWR0aCc6IDIgfSwgc3ZnICk7IC8vIDNcclxuICAgICAgICBUb29scy5kb20oICdjaXJjbGUnLCAnJywgeyBjeDogd3cgKiAwLjUsIGN5OiB3dyAqIDAuNSwgcjo1LCBzdHJva2U6IFQuY29sb3JzLnRleHQsICdzdHJva2Utd2lkdGgnOiA1LCBmaWxsOidub25lJyB9LCBzdmcgKTsgLy8gNFxyXG4gICAgICAgIFQucGFkMmQgPSBzdmc7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBtYWtlS25vYjogZnVuY3Rpb24gKCBtb2RlbCApIHtcclxuXHJcbiAgICAgICAgbGV0IHcgPSAxMjg7XHJcbiAgICAgICAgbGV0IHJhZGl1cyA9IDM0O1xyXG4gICAgICAgIGxldCBzdmcgPSBULmRvbSggJ3N2ZycsIFQuY3NzLmJhc2ljICsgJ3Bvc2l0aW9uOnJlbGF0aXZlOycsIHsgdmlld0JveDonMCAwICcrdysnICcrdywgd2lkdGg6dywgaGVpZ2h0OncsIHByZXNlcnZlQXNwZWN0UmF0aW86J25vbmUnIH0gKTtcclxuICAgICAgICBULmRvbSggJ2NpcmNsZScsICcnLCB7IGN4OjY0LCBjeTo2NCwgcjpyYWRpdXMsIGZpbGw6VC5jb2xvcnMuYnV0dG9uLCBzdHJva2U6J3JnYmEoMCwwLDAsMC4zKScsICdzdHJva2Utd2lkdGgnOjggfSwgc3ZnICk7Ly8wXHJcbiAgICAgICAgVC5kb20oICdwYXRoJywgJycsIHsgZDonJywgc3Ryb2tlOlQuY29sb3JzLnRleHQsICdzdHJva2Utd2lkdGgnOjQsIGZpbGw6J25vbmUnLCAnc3Ryb2tlLWxpbmVjYXAnOidyb3VuZCcgfSwgc3ZnICk7Ly8xXHJcbiAgICAgICAgVC5kb20oICdjaXJjbGUnLCAnJywgeyBjeDo2NCwgY3k6NjQsIHI6cmFkaXVzKzcsIHN0cm9rZToncmdiYSgwLDAsMCwwLjEpJywgJ3N0cm9rZS13aWR0aCc6NyAsIGZpbGw6J25vbmUnfSwgc3ZnICk7Ly8yXHJcbiAgICAgICAgVC5kb20oICdwYXRoJywgJycsIHsgZDonJywgc3Ryb2tlOidyZ2JhKDI1NSwyNTUsMjU1LDAuMyknLCAnc3Ryb2tlLXdpZHRoJzoyLCBmaWxsOidub25lJywgJ3N0cm9rZS1saW5lY2FwJzoncm91bmQnLCAnc3Ryb2tlLW9wYWNpdHknOjAuNSB9LCBzdmcgKTsvLzNcclxuICAgICAgICBULmtub2IgPSBzdmc7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBtYWtlQ2lyY3VsYXI6IGZ1bmN0aW9uICggbW9kZWwgKSB7XHJcblxyXG4gICAgICAgIGxldCB3ID0gMTI4O1xyXG4gICAgICAgIGxldCByYWRpdXMgPSA0MDtcclxuICAgICAgICBsZXQgc3ZnID0gVC5kb20oICdzdmcnLCBULmNzcy5iYXNpYyArICdwb3NpdGlvbjpyZWxhdGl2ZTsnLCB7IHZpZXdCb3g6JzAgMCAnK3crJyAnK3csIHdpZHRoOncsIGhlaWdodDp3LCBwcmVzZXJ2ZUFzcGVjdFJhdGlvOidub25lJyB9ICk7XHJcbiAgICAgICAgVC5kb20oICdjaXJjbGUnLCAnJywgeyBjeDo2NCwgY3k6NjQsIHI6cmFkaXVzLCBzdHJva2U6J3JnYmEoMCwwLDAsMC4xKScsICdzdHJva2Utd2lkdGgnOjEwLCBmaWxsOidub25lJyB9LCBzdmcgKTsvLzBcclxuICAgICAgICBULmRvbSggJ3BhdGgnLCAnJywgeyBkOicnLCBzdHJva2U6VC5jb2xvcnMudGV4dCwgJ3N0cm9rZS13aWR0aCc6NywgZmlsbDonbm9uZScsICdzdHJva2UtbGluZWNhcCc6J2J1dHQnIH0sIHN2ZyApOy8vMVxyXG4gICAgICAgIFQuY2lyY3VsYXIgPSBzdmc7XHJcblxyXG4gICAgfSxcclxuXHJcbiAgICBtYWtlSm95c3RpY2s6IGZ1bmN0aW9uICggbW9kZWwgKSB7XHJcblxyXG4gICAgICAgIC8vKycgYmFja2dyb3VuZDojZjAwOydcclxuXHJcbiAgICAgICAgbGV0IHcgPSAxMjgsIGNjYztcclxuICAgICAgICBsZXQgcmFkaXVzID0gTWF0aC5mbG9vcigody0zMCkqMC41KTtcclxuICAgICAgICBsZXQgaW5uZXJSYWRpdXMgPSBNYXRoLmZsb29yKHJhZGl1cyowLjYpO1xyXG4gICAgICAgIGxldCBzdmcgPSBULmRvbSggJ3N2ZycsIFQuY3NzLmJhc2ljICsgJ3Bvc2l0aW9uOnJlbGF0aXZlOycsIHsgdmlld0JveDonMCAwICcrdysnICcrdywgd2lkdGg6dywgaGVpZ2h0OncsIHByZXNlcnZlQXNwZWN0UmF0aW86J25vbmUnIH0gKTtcclxuICAgICAgICBULmRvbSggJ2RlZnMnLCBudWxsLCB7fSwgc3ZnICk7XHJcbiAgICAgICAgVC5kb20oICdnJywgbnVsbCwge30sIHN2ZyApO1xyXG5cclxuICAgICAgICBpZiggbW9kZWwgPT09IDAgKXtcclxuXHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgICAgICAvLyBncmFkaWFuIGJhY2tncm91bmRcclxuICAgICAgICAgICAgY2NjID0gWyBbNDAsICdyZ2IoMCwwLDApJywgMC4zXSwgWzgwLCAncmdiKDAsMCwwKScsIDBdLCBbOTAsICdyZ2IoNTAsNTAsNTApJywgMC40XSwgWzEwMCwgJ3JnYig1MCw1MCw1MCknLCAwXSBdO1xyXG4gICAgICAgICAgICBULm1ha2VHcmFkaWFudCggJ3JhZGlhbEdyYWRpZW50JywgeyBpZDonZ3JhZCcsIGN4Oic1MCUnLCBjeTonNTAlJywgcjonNTAlJywgZng6JzUwJScsIGZ5Oic1MCUnIH0sIHN2ZywgY2NjICk7XHJcblxyXG4gICAgICAgICAgICAvLyBncmFkaWFuIHNoYWRvd1xyXG4gICAgICAgICAgICBjY2MgPSBbIFs2MCwgJ3JnYigwLDAsMCknLCAwLjVdLCBbMTAwLCAncmdiKDAsMCwwKScsIDBdIF07XHJcbiAgICAgICAgICAgIFQubWFrZUdyYWRpYW50KCAncmFkaWFsR3JhZGllbnQnLCB7IGlkOidncmFkUycsIGN4Oic1MCUnLCBjeTonNTAlJywgcjonNTAlJywgZng6JzUwJScsIGZ5Oic1MCUnIH0sIHN2ZywgY2NjICk7XHJcblxyXG4gICAgICAgICAgICAvLyBncmFkaWFuIHN0aWNrXHJcbiAgICAgICAgICAgIGxldCBjYzAgPSBbJ3JnYig0MCw0MCw0MCknLCAncmdiKDQ4LDQ4LDQ4KScsICdyZ2IoMzAsMzAsMzApJ107XHJcbiAgICAgICAgICAgIGxldCBjYzEgPSBbJ3JnYigxLDkwLDE5NyknLCAncmdiKDMsOTUsMjA3KScsICdyZ2IoMCw2NSwxNjcpJ107XHJcblxyXG4gICAgICAgICAgICBjY2MgPSBbIFszMCwgY2MwWzBdLCAxXSwgWzYwLCBjYzBbMV0sIDFdLCBbODAsIGNjMFsxXSwgMV0sIFsxMDAsIGNjMFsyXSwgMV0gXTtcclxuICAgICAgICAgICAgVC5tYWtlR3JhZGlhbnQoICdyYWRpYWxHcmFkaWVudCcsIHsgaWQ6J2dyYWRJbicsIGN4Oic1MCUnLCBjeTonNTAlJywgcjonNTAlJywgZng6JzUwJScsIGZ5Oic1MCUnIH0sIHN2ZywgY2NjICk7XHJcblxyXG4gICAgICAgICAgICBjY2MgPSBbIFszMCwgY2MxWzBdLCAxXSwgWzYwLCBjYzFbMV0sIDFdLCBbODAsIGNjMVsxXSwgMV0sIFsxMDAsIGNjMVsyXSwgMV0gXTtcclxuICAgICAgICAgICAgVC5tYWtlR3JhZGlhbnQoICdyYWRpYWxHcmFkaWVudCcsIHsgaWQ6J2dyYWRJbjInLCBjeDonNTAlJywgY3k6JzUwJScsIHI6JzUwJScsIGZ4Oic1MCUnLCBmeTonNTAlJyB9LCBzdmcsIGNjYyApO1xyXG5cclxuICAgICAgICAgICAgLy8gZ3JhcGhcclxuXHJcbiAgICAgICAgICAgIFQuZG9tKCAnY2lyY2xlJywgJycsIHsgY3g6NjQsIGN5OjY0LCByOnJhZGl1cywgZmlsbDondXJsKCNncmFkKScgfSwgc3ZnICk7Ly8yXHJcbiAgICAgICAgICAgIFQuZG9tKCAnY2lyY2xlJywgJycsIHsgY3g6NjQrNSwgY3k6NjQrMTAsIHI6aW5uZXJSYWRpdXMrMTAsIGZpbGw6J3VybCgjZ3JhZFMpJyB9LCBzdmcgKTsvLzNcclxuICAgICAgICAgICAgVC5kb20oICdjaXJjbGUnLCAnJywgeyBjeDo2NCwgY3k6NjQsIHI6aW5uZXJSYWRpdXMsIGZpbGw6J3VybCgjZ3JhZEluKScgfSwgc3ZnICk7Ly80XHJcblxyXG4gICAgICAgICAgICBULmpveXN0aWNrXzAgPSBzdmc7XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAvLyBncmFkaWFuIHNoYWRvd1xyXG4gICAgICAgICAgICBjY2MgPSBbIFs2OSwgJ3JnYigwLDAsMCknLCAwXSxbNzAsICdyZ2IoMCwwLDApJywgMC4zXSwgWzEwMCwgJ3JnYigwLDAsMCknLCAwXSBdO1xyXG4gICAgICAgICAgICBULm1ha2VHcmFkaWFudCggJ3JhZGlhbEdyYWRpZW50JywgeyBpZDonZ3JhZFgnLCBjeDonNTAlJywgY3k6JzUwJScsIHI6JzUwJScsIGZ4Oic1MCUnLCBmeTonNTAlJyB9LCBzdmcsIGNjYyApO1xyXG5cclxuICAgICAgICAgICAgVC5kb20oICdjaXJjbGUnLCAnJywgeyBjeDo2NCwgY3k6NjQsIHI6cmFkaXVzLCBmaWxsOidub25lJywgc3Ryb2tlOidyZ2JhKDEwMCwxMDAsMTAwLDAuMjUpJywgJ3N0cm9rZS13aWR0aCc6JzQnIH0sIHN2ZyApOy8vMlxyXG4gICAgICAgICAgICBULmRvbSggJ2NpcmNsZScsICcnLCB7IGN4OjY0LCBjeTo2NCwgcjppbm5lclJhZGl1cysxNCwgZmlsbDondXJsKCNncmFkWCknIH0sIHN2ZyApOy8vM1xyXG4gICAgICAgICAgICBULmRvbSggJ2NpcmNsZScsICcnLCB7IGN4OjY0LCBjeTo2NCwgcjppbm5lclJhZGl1cywgZmlsbDonbm9uZScsIHN0cm9rZToncmdiKDEwMCwxMDAsMTAwKScsICdzdHJva2Utd2lkdGgnOic0JyB9LCBzdmcgKTsvLzRcclxuXHJcbiAgICAgICAgICAgIFQuam95c3RpY2tfMSA9IHN2ZztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIFxyXG5cclxuICAgIH0sXHJcblxyXG4gICAgbWFrZUNvbG9yUmluZzogZnVuY3Rpb24gKCkge1xyXG5cclxuICAgICAgICBsZXQgdyA9IDI1NjtcclxuICAgICAgICBsZXQgc3ZnID0gVC5kb20oICdzdmcnLCBULmNzcy5iYXNpYyArICdwb3NpdGlvbjpyZWxhdGl2ZTsnLCB7IHZpZXdCb3g6JzAgMCAnK3crJyAnK3csIHdpZHRoOncsIGhlaWdodDp3LCBwcmVzZXJ2ZUFzcGVjdFJhdGlvOidub25lJyB9ICk7XHJcbiAgICAgICAgVC5kb20oICdkZWZzJywgbnVsbCwge30sIHN2ZyApO1xyXG4gICAgICAgIFQuZG9tKCAnZycsIG51bGwsIHt9LCBzdmcgKTtcclxuXHJcbiAgICAgICAgbGV0IHMgPSAzMDsvL3N0cm9rZVxyXG4gICAgICAgIGxldCByID0oIHctcyApKjAuNTtcclxuICAgICAgICBsZXQgbWlkID0gdyowLjU7XHJcbiAgICAgICAgbGV0IG4gPSAyNCwgbnVkZ2UgPSA4IC8gciAvIG4gKiBNYXRoLlBJLCBhMSA9IDAsIGQxO1xyXG4gICAgICAgIGxldCBhbSwgdGFuLCBkMiwgYTIsIGFyLCBpLCBqLCBwYXRoLCBjY2M7XHJcbiAgICAgICAgbGV0IGNvbG9yID0gW107XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yICggaSA9IDA7IGkgPD0gbjsgKytpKSB7XHJcblxyXG4gICAgICAgICAgICBkMiA9IGkgLyBuO1xyXG4gICAgICAgICAgICBhMiA9IGQyICogVC5Ud29QSTtcclxuICAgICAgICAgICAgYW0gPSAoYTEgKyBhMikgKiAwLjU7XHJcbiAgICAgICAgICAgIHRhbiA9IDEgLyBNYXRoLmNvcygoYTIgLSBhMSkgKiAwLjUpO1xyXG5cclxuICAgICAgICAgICAgYXIgPSBbXHJcbiAgICAgICAgICAgICAgICBNYXRoLnNpbihhMSksIC1NYXRoLmNvcyhhMSksIFxyXG4gICAgICAgICAgICAgICAgTWF0aC5zaW4oYW0pICogdGFuLCAtTWF0aC5jb3MoYW0pICogdGFuLCBcclxuICAgICAgICAgICAgICAgIE1hdGguc2luKGEyKSwgLU1hdGguY29zKGEyKVxyXG4gICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29sb3JbMV0gPSBULnJnYlRvSGV4KCBULmhzbFRvUmdiKFtkMiwgMSwgMC41XSkgKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xyXG5cclxuICAgICAgICAgICAgICAgIGogPSA2O1xyXG4gICAgICAgICAgICAgICAgd2hpbGUoai0tKXtcclxuICAgICAgICAgICAgICAgICAgIGFyW2pdID0gKChhcltqXSpyKSttaWQpLnRvRml4ZWQoMik7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcGF0aCA9ICcgTScgKyBhclswXSArICcgJyArIGFyWzFdICsgJyBRJyArIGFyWzJdICsgJyAnICsgYXJbM10gKyAnICcgKyBhcls0XSArICcgJyArIGFyWzVdO1xyXG5cclxuICAgICAgICAgICAgICAgIGNjYyA9IFsgWzAsY29sb3JbMF0sMV0sIFsxMDAsY29sb3JbMV0sMV0gXTtcclxuICAgICAgICAgICAgICAgIFQubWFrZUdyYWRpYW50KCAnbGluZWFyR3JhZGllbnQnLCB7IGlkOidHJytpLCB4MTphclswXSwgeTE6YXJbMV0sIHgyOmFyWzRdLCB5Mjphcls1XSwgZ3JhZGllbnRVbml0czpcInVzZXJTcGFjZU9uVXNlXCIgfSwgc3ZnLCBjY2MgKTtcclxuXHJcbiAgICAgICAgICAgICAgICBULmRvbSggJ3BhdGgnLCAnJywgeyBkOnBhdGgsICdzdHJva2Utd2lkdGgnOnMsIHN0cm9rZTondXJsKCNHJytpKycpJywgJ3N0cm9rZS1saW5lY2FwJzpcImJ1dHRcIiB9LCBzdmcsIDEgKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGExID0gYTIgLSBudWRnZTsgXHJcbiAgICAgICAgICAgIGNvbG9yWzBdID0gY29sb3JbMV07XHJcbiAgICAgICAgICAgIGQxID0gZDI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgYnIgPSAoMTI4IC0gcyApICsgMjtcclxuICAgICAgICBsZXQgYncgPSA2MDtcclxuXHJcbiAgICAgICAgbGV0IHR3ID0gODQuOTA7XHJcblxyXG4gICAgICAgIC8vIGJsYWNrIC8gd2hpdGVcclxuICAgICAgICBjY2MgPSBbIFswLCAnI0ZGRkZGRicsIDFdLCBbNTAsICcjRkZGRkZGJywgMF0sIFs1MCwgJyMwMDAwMDAnLCAwXSwgWzEwMCwgJyMwMDAwMDAnLCAxXSBdO1xyXG4gICAgICAgIFQubWFrZUdyYWRpYW50KCAnbGluZWFyR3JhZGllbnQnLCB7IGlkOidHTDAnLCB4MTowLCB5MTptaWQtdHcsIHgyOjAsIHkyOm1pZCt0dywgZ3JhZGllbnRVbml0czpcInVzZXJTcGFjZU9uVXNlXCIgfSwgc3ZnLCBjY2MgKTtcclxuXHJcbiAgICAgICAgY2NjID0gWyBbMCwgJyM3ZjdmN2YnLCAxXSwgWzUwLCAnIzdmN2Y3ZicsIDAuNV0sIFsxMDAsICcjN2Y3ZjdmJywgMF0gXTtcclxuICAgICAgICBULm1ha2VHcmFkaWFudCggJ2xpbmVhckdyYWRpZW50JywgeyBpZDonR0wxJywgeDE6bWlkLTQ5LjA1LCB5MTowLCB4MjptaWQrOTgsIHkyOjAsIGdyYWRpZW50VW5pdHM6XCJ1c2VyU3BhY2VPblVzZVwiIH0sIHN2ZywgY2NjICk7XHJcblxyXG4gICAgICAgIFQuZG9tKCAnZycsIG51bGwsIHsgJ3RyYW5zZm9ybS1vcmlnaW4nOiAnMTI4cHggMTI4cHgnLCAndHJhbnNmb3JtJzoncm90YXRlKDApJyB9LCBzdmcgKTsvLzJcclxuICAgICAgICBULmRvbSggJ3BvbHlnb24nLCAnJywgeyBwb2ludHM6Jzc4Ljk1IDQzLjEgNzguOTUgMjEyLjg1IDIyNiAxMjgnLCAgZmlsbDoncmVkJyAgfSwgc3ZnLCAyICk7Ly8gMiwwXHJcbiAgICAgICAgVC5kb20oICdwb2x5Z29uJywgJycsIHsgcG9pbnRzOic3OC45NSA0My4xIDc4Ljk1IDIxMi44NSAyMjYgMTI4JywgIGZpbGw6J3VybCgjR0wxKScsJ3N0cm9rZS13aWR0aCc6MSwgc3Ryb2tlOid1cmwoI0dMMSknICB9LCBzdmcsIDIgKTsvLzIsMVxyXG4gICAgICAgIFQuZG9tKCAncG9seWdvbicsICcnLCB7IHBvaW50czonNzguOTUgNDMuMSA3OC45NSAyMTIuODUgMjI2IDEyOCcsICBmaWxsOid1cmwoI0dMMCknLCdzdHJva2Utd2lkdGgnOjEsIHN0cm9rZTondXJsKCNHTDApJyAgfSwgc3ZnLCAyICk7Ly8yLDJcclxuICAgICAgICBULmRvbSggJ3BhdGgnLCAnJywgeyBkOidNIDI1NS43NSAxMzYuNSBRIDI1NiAxMzIuMyAyNTYgMTI4IDI1NiAxMjMuNyAyNTUuNzUgMTE5LjUgTCAyNDEgMTI4IDI1NS43NSAxMzYuNSBaJywgIGZpbGw6J25vbmUnLCdzdHJva2Utd2lkdGgnOjIsIHN0cm9rZTonIzAwMCcgIH0sIHN2ZywgMiApOy8vMiwzXHJcbiAgICAgICAgLy9ULmRvbSggJ2NpcmNsZScsICcnLCB7IGN4OjEyOCsxMTMsIGN5OjEyOCwgcjo2LCAnc3Ryb2tlLXdpZHRoJzozLCBzdHJva2U6JyMwMDAnLCBmaWxsOidub25lJyB9LCBzdmcsIDIgKTsvLzIuM1xyXG5cclxuICAgICAgICBULmRvbSggJ2NpcmNsZScsICcnLCB7IGN4OjEyOCwgY3k6MTI4LCByOjYsICdzdHJva2Utd2lkdGgnOjIsIHN0cm9rZTonIzAwMCcsIGZpbGw6J25vbmUnIH0sIHN2ZyApOy8vM1xyXG5cclxuICAgICAgICBULmNvbG9yUmluZyA9IHN2ZztcclxuXHJcbiAgICB9LFxyXG5cclxuICAgIGljb246IGZ1bmN0aW9uICggdHlwZSwgY29sb3IsIHcgKXtcclxuXHJcbiAgICAgICAgdyA9IHcgfHwgNDA7XHJcbiAgICAgICAgLy9jb2xvciA9IGNvbG9yIHx8ICcjREVERURFJztcclxuICAgICAgICBsZXQgdmlld0JveCA9ICcwIDAgMjU2IDI1Nic7XHJcbiAgICAgICAgLy9sZXQgdmlld0JveCA9ICcwIDAgJysgdyArJyAnKyB3O1xyXG4gICAgICAgIGxldCB0ID0gW1wiPHN2ZyB4bWxucz0nXCIrVC5zdmducytcIicgdmVyc2lvbj0nMS4xJyB4bWxuczp4bGluaz0nXCIrVC5odG1scytcIicgc3R5bGU9J3BvaW50ZXItZXZlbnRzOm5vbmU7JyBwcmVzZXJ2ZUFzcGVjdFJhdGlvPSd4TWluWU1heCBtZWV0JyB4PScwcHgnIHk9JzBweCcgd2lkdGg9J1wiK3crXCJweCcgaGVpZ2h0PSdcIit3K1wicHgnIHZpZXdCb3g9J1wiK3ZpZXdCb3grXCInPjxnPlwiXTtcclxuICAgICAgICBzd2l0Y2godHlwZSl7XHJcbiAgICAgICAgICAgIGNhc2UgJ2xvZ28nOlxyXG4gICAgICAgICAgICB0WzFdPVwiPHBhdGggaWQ9J2xvZ29pbicgZmlsbD0nXCIrY29sb3IrXCInIHN0cm9rZT0nbm9uZScgZD0nXCIrVC5sb2dvRmlsbF9kK1wiJy8+XCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdkb25hdGUnOlxyXG4gICAgICAgICAgICB0WzFdPVwiPHBhdGggaWQ9J2xvZ29pbicgZmlsbD0nXCIrY29sb3IrXCInIHN0cm9rZT0nbm9uZScgZD0nXCIrVC5sb2dvX2RvbmF0ZStcIicvPlwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnbmVvJzpcclxuICAgICAgICAgICAgdFsxXT1cIjxwYXRoIGlkPSdsb2dvaW4nIGZpbGw9J1wiK2NvbG9yK1wiJyBzdHJva2U9J25vbmUnIGQ9J1wiK1QubG9nb19uZW8rXCInLz5cIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3BoeSc6XHJcbiAgICAgICAgICAgIHRbMV09XCI8cGF0aCBpZD0nbG9nb2luJyBzdHJva2U9J1wiK2NvbG9yK1wiJyBzdHJva2Utd2lkdGg9JzQ5JyBzdHJva2UtbGluZWpvaW49J3JvdW5kJyBzdHJva2UtbGluZWNhcD0nYnV0dCcgZmlsbD0nbm9uZScgZD0nXCIrVC5sb2dvX3BoeStcIicvPlwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnY29uZmlnJzpcclxuICAgICAgICAgICAgdFsxXT1cIjxwYXRoIGlkPSdsb2dvaW4nIHN0cm9rZT0nXCIrY29sb3IrXCInIHN0cm9rZS13aWR0aD0nNDknIHN0cm9rZS1saW5lam9pbj0ncm91bmQnIHN0cm9rZS1saW5lY2FwPSdidXR0JyBmaWxsPSdub25lJyBkPSdcIitULmxvZ29fY29uZmlnK1wiJy8+XCI7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdnaXRodWInOlxyXG4gICAgICAgICAgICB0WzFdPVwiPHBhdGggaWQ9J2xvZ29pbicgZmlsbD0nXCIrY29sb3IrXCInIHN0cm9rZT0nbm9uZScgZD0nXCIrVC5sb2dvX2dpdGh1YitcIicvPlwiO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnc2F2ZSc6XHJcbiAgICAgICAgICAgIHRbMV09XCI8cGF0aCBzdHJva2U9J1wiK2NvbG9yK1wiJyBzdHJva2Utd2lkdGg9JzQnIHN0cm9rZS1saW5lam9pbj0ncm91bmQnIHN0cm9rZS1saW5lY2FwPSdyb3VuZCcgZmlsbD0nbm9uZScgZD0nTSAyNi4xMjUgMTcgTCAyMCAyMi45NSAxNC4wNSAxNyBNIDIwIDkuOTUgTCAyMCAyMi45NScvPjxwYXRoIHN0cm9rZT0nXCIrY29sb3I7XHJcbiAgICAgICAgICAgIHRbMV0rPVwiJyBzdHJva2Utd2lkdGg9JzIuNScgc3Ryb2tlLWxpbmVqb2luPSdyb3VuZCcgc3Ryb2tlLWxpbmVjYXA9J3JvdW5kJyBmaWxsPSdub25lJyBkPSdNIDMyLjYgMjMgTCAzMi42IDI1LjUgUSAzMi42IDI4LjUgMjkuNiAyOC41IEwgMTAuNiAyOC41IFEgNy42IDI4LjUgNy42IDI1LjUgTCA3LjYgMjMnLz5cIjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRbMl0gPSBcIjwvZz48L3N2Zz5cIjtcclxuICAgICAgICByZXR1cm4gdC5qb2luKFwiXFxuXCIpO1xyXG5cclxuICAgIH0sXHJcblxyXG4gICAgbG9nb0ZpbGxfZDpgXHJcbiAgICBNIDE3MSAxNTAuNzUgTCAxNzEgMzMuMjUgMTU1LjUgMzMuMjUgMTU1LjUgMTUwLjc1IFEgMTU1LjUgMTYyLjIgMTQ3LjQ1IDE3MC4yIDEzOS40NSAxNzguMjUgMTI4IDE3OC4yNSAxMTYuNiAxNzguMjUgMTA4LjU1IDE3MC4yIDEwMC41IDE2Mi4yIDEwMC41IDE1MC43NSBcclxuICAgIEwgMTAwLjUgMzMuMjUgODUgMzMuMjUgODUgMTUwLjc1IFEgODUgMTY4LjY1IDk3LjU1IDE4MS4xNSAxMTAuMTUgMTkzLjc1IDEyOCAxOTMuNzUgMTQ1LjkgMTkzLjc1IDE1OC40IDE4MS4xNSAxNzEgMTY4LjY1IDE3MSAxNTAuNzUgXHJcbiAgICBNIDIwMCAzMy4yNSBMIDE4NCAzMy4yNSAxODQgMTUwLjggUSAxODQgMTc0LjEgMTY3LjYgMTkwLjQgMTUxLjMgMjA2LjggMTI4IDIwNi44IDEwNC43NSAyMDYuOCA4OC4zIDE5MC40IDcyIDE3NC4xIDcyIDE1MC44IEwgNzIgMzMuMjUgNTYgMzMuMjUgNTYgMTUwLjc1IFxyXG4gICAgUSA1NiAxODAuNTUgNzcuMDUgMjAxLjYgOTguMiAyMjIuNzUgMTI4IDIyMi43NSAxNTcuOCAyMjIuNzUgMTc4LjkgMjAxLjYgMjAwIDE4MC41NSAyMDAgMTUwLjc1IEwgMjAwIDMzLjI1IFpcclxuICAgIGAsXHJcblxyXG4gICAgbG9nb19naXRodWI6YFxyXG4gICAgTSAxODAuNSA3MCBRIDE4Ni4zIDgyLjQgMTgxLjU1IDk2LjU1IDE5Ni41IDExMS41IDE4OS43IDE0MC42NSAxODMuNjUgMTY4LjM1IDE0NiAxNzIuNyAxNTIuNSAxNzguNyAxNTIuNTUgMTg1LjkgTCAxNTIuNTUgMjE4LjE1IFEgMTUyLjg0IDIyNC41NiAxNTkuMTUgMjIzLjMgXHJcbiAgICAxNTkuMjEgMjIzLjMgMTU5LjI1IDIyMy4zIDE4MS4xNCAyMTYuMjUgMTk4LjcgMTk4LjcgMjI4IDE2OS40IDIyOCAxMjggMjI4IDg2LjYgMTk4LjcgNTcuMyAxNjkuNCAyOCAxMjggMjggODYuNiAyOCA1Ny4zIDU3LjMgMjggODYuNiAyOCAxMjggMjggMTY5LjQgNTcuMyAxOTguNyA3NC44NSBcclxuICAgIDIxNi4yNSA5Ni43NSAyMjMuMyA5Ni43OCAyMjMuMyA5Ni44IDIyMy4zIDEwMy4xNiAyMjQuNTQgMTAzLjQ1IDIxOC4xNSBMIDEwMy40NSAyMDAgUSA4Mi45NyAyMDMuMSA3NS4xIDE5Ni4zNSA2OS44NSAxOTEuNjUgNjguNCAxODUuNDUgNjQuMjcgMTc3LjA1NSA1OS40IDE3NC4xNSA0OS4yMCBcclxuICAgIDE2Ni44NyA2MC44IDE2Ny44IDY5Ljg1IDE2OS42MSA3NS43IDE4MCA4MS4xMyAxODguMDkgOTAgMTg4LjU1IDk4LjE4IDE4OC44NiAxMDMuNDUgMTg1LjkgMTAzLjQ5IDE3OC42NyAxMTAgMTcyLjcgNzIuMzMgMTY4LjMzIDY2LjMgMTQwLjY1IDU5LjQ4IDExMS40OSA3NC40NSA5Ni41NSA2OS43IFxyXG4gICAgODIuNDEgNzUuNSA3MCA4NC44NyA2OC43NCAxMDMuMTUgODAgMTE1LjEyNSA3Ni42MzUgMTI4IDc2Ljg1IDE0MC44NSA3Ni42NSAxNTIuODUgODAgMTcxLjEgNjguNzUgMTgwLjUgNzAgWlxyXG4gICAgYCxcclxuXHJcbiAgICBsb2dvX25lbzpgXHJcbiAgICBNIDIxOSA1MiBMIDIwNiA1MiAyMDYgMTY2IFEgMjA2IDE4My40IDE5My43NSAxOTUuNjUgMTgxLjQgMjA4IDE2NCAyMDggMTQ2LjYgMjA4IDEzNC4zNSAxOTUuNjUgMTIyIDE4My40IDEyMiAxNjYgTCAxMjIgOTAgUSAxMjIgNzcuNiAxMTMuMTUgNjguODUgMTA0LjQgNjAgOTIgNjAgNzkuNTUgXHJcbiAgICA2MCA3MC43NSA2OC44NSA2MiA3Ny42IDYyIDkwIEwgNjIgMjA0IDc1IDIwNCA3NSA5MCBRIDc1IDgzIDc5Ljk1IDc4IDg0Ljk1IDczIDkyIDczIDk5IDczIDEwNCA3OCAxMDkgODMgMTA5IDkwIEwgMTA5IDE2NiBRIDEwOSAxODguOCAxMjUuMTUgMjA0Ljg1IDE0MS4yIDIyMSAxNjQgMjIxIFxyXG4gICAgMTg2Ljc1IDIyMSAyMDIuOTUgMjA0Ljg1IDIxOSAxODguOCAyMTkgMTY2IEwgMjE5IDUyIE0gMTk0IDUyIEwgMTgxIDUyIDE4MSAxNjYgUSAxODEgMTczIDE3Ni4wNSAxNzggMTcxLjA1IDE4MyAxNjQgMTgzIDE1NyAxODMgMTUyIDE3OCAxNDcgMTczIDE0NyAxNjYgTCAxNDcgOTAgUSAxNDcgXHJcbiAgICA2Ny4yIDEzMC44NSA1MS4xNSAxMTQuOCAzNSA5MiAzNSA2OS4yNSAzNSA1My4wNSA1MS4xNSAzNyA2Ny4yIDM3IDkwIEwgMzcgMjA0IDUwIDIwNCA1MCA5MCBRIDUwIDcyLjYgNjIuMjUgNjAuMzUgNzQuNiA0OCA5MiA0OCAxMDkuNCA0OCAxMjEuNjUgNjAuMzUgMTM0IDcyLjYgMTM0IDkwIEwgXHJcbiAgICAxMzQgMTY2IFEgMTM0IDE3OC40IDE0Mi44NSAxODcuMTUgMTUxLjYgMTk2IDE2NCAxOTYgMTc2LjQ1IDE5NiAxODUuMjUgMTg3LjE1IDE5NCAxNzguNCAxOTQgMTY2IEwgMTk0IDUyIFpcclxuICAgIGAsXHJcblxyXG4gICAgbG9nb19waHk6YFxyXG4gICAgTSAxMDMuNTUgMzcuOTUgTCAxMjcuOTUgMzcuOTUgUSAxNjIuMzUgMzcuOTUgMTg2LjUgNTUgMjEwLjkgNzIuMzUgMjEwLjkgOTYuNSAyMTAuOSAxMjAuNjUgMTg2LjUgMTM3LjcgMTYyLjM1IDE1NSAxMjcuOTUgMTU1IEwgMTI3Ljk1IDIzNy45NSBNIDEyNy45NSAxNTUgXHJcbiAgICBRIDkzLjU1IDE1NSA2OS4xNSAxMzcuNyA0NSAxMjAuNjUgNDUgOTYuNSA0NSA3Mi4zNSA2OS4xNSA1NSA3MC45IDUzLjggNzIuODUgNTIuODUgTSAxMjcuOTUgMTU1IEwgMTI3Ljk1IDM3Ljk1XHJcbiAgICBgLFxyXG5cclxuICAgIGxvZ29fY29uZmlnOmBcclxuICAgIE0gMjA0LjM1IDUxLjY1IEwgMTczLjI1IDgyLjc1IFEgMTkyIDEwMS41IDE5MiAxMjggTCAyMzYgMTI4IE0gMTkyIDEyOCBRIDE5MiAxNTQuNTUgMTczLjI1IDE3My4yNSBMIDIwNC40IDIwNC40IE0gNTEuNjUgNTEuNjUgTCA4Mi43NSA4Mi43NSBRIDEwMS41IDY0IDEyOCA2NCBcclxuICAgIEwgMTI4IDIwIE0gNTEuNiAyMDQuNCBMIDgyLjc1IDE3My4yNSBRIDY0IDE1NC41NSA2NCAxMjggTCAyMCAxMjggTSAxMjggMjM2IEwgMTI4IDE5MiBRIDEwMS41IDE5MiA4Mi43NSAxNzMuMjUgTSA2NCAxMjggUSA2NCAxMDEuNSA4Mi43NSA4Mi43NSBNIDE3My4yNSAxNzMuMjUgXHJcbiAgICBRIDE1NC41NSAxOTIgMTI4IDE5MiBNIDEyOCA2NCBRIDE1NC41NSA2NCAxNzMuMjUgODIuNzVcclxuICAgIGAsXHJcblxyXG4gICAgbG9nb19kb25hdGU6YFxyXG4gICAgTSAxNzEuMyA4MC4zIFEgMTc5LjUgNjIuMTUgMTcxLjMgNDUuOCAxNjQuMSAzMi41IDE0MS4zNSAzMC4xIEwgOTQuMzUgMzAuMSBRIDg5LjM1IDMwLjQgODguMyAzNS4xNSBMIDcwLjUgMTQ4LjA1IFEgNzAuMiAxNTIuNSA3My43IDE1Mi42IEwgMTAwLjk1IDE1Mi42IDEwNyAxMTEuNiBRIDEwOC43NSBcclxuICAgIDEwNi41NSAxMTIuNiAxMDYuNDUgMTMwLjQ1IDEwOC4wNSAxNDUuMyAxMDMuOSAxNjMuMzUgOTguNzUgMTcxLjMgODAuMyBNIDE3OS44IDcxLjUgUSAxNzguNiA3OS43NSAxNzQuOSA4Ny44NSAxNjguNDUgMTAyLjkgMTUxLjkgMTA5LjE1IDE0MC42NSAxMTMuOTUgMTE3LjU1IDExMyAxMTMuMTUgXHJcbiAgICAxMTIuNzUgMTExIDExNy40NSBMIDEwMi43IDE2OS45NSBRIDEwMi40NSAxNzMuOCAxMDUuNSAxNzMuODUgTCAxMjguOTUgMTczLjg1IFEgMTMyLjIgMTc0LjIgMTMzLjM1IDE2OS42NSBMIDEzOC4zIDEzOS45NSBRIDEzOS43NSAxMzUuNiAxNDMuMSAxMzUuNSAxNDYuNiAxMzUuNzUgMTUwLjYgMTM1LjY1IFxyXG4gICAgMTU0LjU1IDEzNS41IDE1Ny4zNSAxMzUuMSAxNjAuMTUgMTM0LjcgMTY2Ljc1IDEzMi4zNSAxODEuMzUgMTI3LjQgMTg3LjkgMTExLjIgMTk0LjI1IDk1Ljc1IDE4OS41IDgxLjk1IDE4Ni43NSA3NC44NSAxNzkuOCA3MS41IE0gMTAzLjUgMjA5LjkgUSAxMDMuNSAyMDIuODUgOTkuNyAxOTguODUgOTUuOTUgXHJcbiAgICAxOTQuNzUgODkuNCAxOTQuNzUgODIuOCAxOTQuNzUgNzkuMDUgMTk4Ljg1IDc1LjMgMjAyLjkgNzUuMyAyMDkuOSA3NS4zIDIxNi44NSA3OS4wNSAyMjAuOTUgODIuOCAyMjUuMDUgODkuNCAyMjUuMDUgOTUuOTUgMjI1LjA1IDk5LjcgMjIxIDEwMy41IDIxNi45NSAxMDMuNSAyMDkuOSBNIDk1LjQ1IDIwNS41IFxyXG4gICAgUSA5NS45NSAyMDcuMyA5NS45NSAyMDkuOSA5NS45NSAyMTIuNjUgOTUuNDUgMjE0LjM1IDk0Ljk1IDIxNiA5NCAyMTcuMyA5My4xIDIxOC40NSA5MS45IDIxOSA5MC43IDIxOS41NSA4OS40IDIxOS41NSA4OC4xNSAyMTkuNTUgODYuOTUgMjE5LjA1IDg1Ljc1IDIxOC41NSA4NC44IDIxNy4zIDgzLjkgMjE2LjE1IFxyXG4gICAgODMuNCAyMTQuMzUgODIuODUgMjEyLjYgODIuODUgMjA5LjkgODIuODUgMjA3LjMgODMuNCAyMDUuNDUgODMuOTUgMjAzLjU1IDg0Ljg1IDIwMi40NSA4NS45IDIwMS4yIDg2Ljk1IDIwMC43NSA4OC4wNSAyMDAuMjUgODkuNCAyMDAuMjUgOTAuNyAyMDAuMjUgOTEuODUgMjAwLjggOTMuMDUgMjAxLjMgOTQgMjAyLjUgXHJcbiAgICA5NC45IDIwMy42NSA5NS40NSAyMDUuNSBNIDE1My4zIDE5NS4zNSBMIDE0NS4zIDE5NS4zNSAxMzUuNSAyMjQuNDUgMTQyLjggMjI0LjQ1IDE0NC42IDIxOC41IDE1My43NSAyMTguNSAxNTUuNiAyMjQuNDUgMTYzLjEgMjI0LjQ1IDE1My4zIDE5NS4zNSBNIDE1Mi4xNSAyMTMuMjUgTCAxNDYuMjUgMjEzLjI1IFxyXG4gICAgMTQ5LjIgMjAzLjY1IDE1Mi4xNSAyMTMuMjUgTSAxMTYuNzUgMTk1LjM1IEwgMTA3LjggMTk1LjM1IDEwNy44IDIyNC40NSAxMTQuNSAyMjQuNDUgMTE0LjUgMjA0LjIgMTI1LjcgMjI0LjQ1IDEzMi43NSAyMjQuNDUgMTMyLjc1IDE5NS4zNSAxMjYuMDUgMTk1LjM1IDEyNi4wNSAyMTIuMDUgMTE2Ljc1IDE5NS4zNSBNIFxyXG4gICAgNjYuNSAxOTcuNjUgUSA2NC4xNSAxOTYuMTUgNjEuNDUgMTk1Ljc1IDU4LjggMTk1LjM1IDU1Ljc1IDE5NS4zNSBMIDQ2LjcgMTk1LjM1IDQ2LjcgMjI0LjQ1IDU1LjggMjI0LjQ1IFEgNTguOCAyMjQuNDUgNjEuNSAyMjQuMDUgNjQuMTUgMjIzLjYgNjYuNCAyMjIuMTUgNjkuMTUgMjIwLjQ1IDcwLjkgMjE3LjIgXHJcbiAgICA3Mi43IDIxNCA3Mi43IDIwOS45NSA3Mi43IDIwNS43IDcxIDIwMi42IDY5LjM1IDE5OS41IDY2LjUgMTk3LjY1IE0gNjQuMiAyMDUgUSA2NS4yIDIwNyA2NS4yIDIwOS45IDY1LjIgMjEyLjc1IDY0LjI1IDIxNC43NSA2My4zIDIxNi43NSA2MS41IDIxNy44NSA2MCAyMTguODUgNTguMyAyMTguOSA1Ni42IDIxOSBcclxuICAgIDU0LjE1IDIxOSBMIDU0IDIxOSA1NCAyMDAuOCA1NC4xNSAyMDAuOCBRIDU2LjQgMjAwLjggNTguMDUgMjAwLjkgNTkuNyAyMDAuOTUgNjEuMTUgMjAxLjc1IDYzLjIgMjAyLjk1IDY0LjIgMjA1IE0gMjEwLjIgMTk1LjM1IEwgMTkwLjUgMTk1LjM1IDE5MC41IDIyNC40NSAyMTAuMiAyMjQuNDUgMjEwLjIgMjE4LjkgXHJcbiAgICAxOTcuNzUgMjE4LjkgMTk3Ljc1IDIxMS41NSAyMDkuMiAyMTEuNTUgMjA5LjIgMjA2IDE5Ny43NSAyMDYgMTk3Ljc1IDIwMC45IDIxMC4yIDIwMC45IDIxMC4yIDE5NS4zNSBNIDE4Ny41IDE5NS4zNSBMIDE2MyAxOTUuMzUgMTYzIDIwMC45IDE3MS42IDIwMC45IDE3MS42IDIyNC40NSAxNzguOSAyMjQuNDUgMTc4LjkgXHJcbiAgICAyMDAuOSAxODcuNSAyMDAuOSAxODcuNSAxOTUuMzUgWlxyXG4gICAgYCxcclxuXHJcbn1cclxuXHJcblQuc2V0VGV4dCgpO1xyXG5cclxuZXhwb3J0IGNvbnN0IFRvb2xzID0gVDsiLCIvLy9odHRwczovL3dpY2cuZ2l0aHViLmlvL2ZpbGUtc3lzdGVtLWFjY2Vzcy8jYXBpLWZpbGVzeXN0ZW1maWxlaGFuZGxlLWdldGZpbGVcclxuXHJcblxyXG5leHBvcnQgY2xhc3MgRmlsZXMge1xyXG5cclxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICBGSUxFIFRZUEVcclxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBzdGF0aWMgYXV0b1R5cGVzKCB0eXBlICkge1xyXG5cclxuICAgICAgICBsZXQgdCA9IFtdXHJcblxyXG4gICAgICAgIHN3aXRjaCggdHlwZSApe1xyXG4gICAgICAgICAgICBjYXNlICdzdmcnOlxyXG4gICAgICAgICAgICB0ID0gWyB7IGFjY2VwdDogeyAnaW1hZ2Uvc3ZnK3htbCc6ICcuc3ZnJ30gfSwgXVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnd2F2JzpcclxuICAgICAgICAgICAgdCA9IFsgeyBhY2NlcHQ6IHsgJ2F1ZGlvL3dhdic6ICcud2F2J30gfSwgXVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnbXAzJzpcclxuICAgICAgICAgICAgdCA9IFsgeyBhY2NlcHQ6IHsgJ2F1ZGlvL21wZWcnOiAnLm1wMyd9IH0sIF1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ21wNCc6XHJcbiAgICAgICAgICAgIHQgPSBbIHsgYWNjZXB0OiB7ICd2aWRlby9tcDQnOiAnLm1wNCd9IH0sIF1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2Jpbic6IGNhc2UgJ2hleCc6XHJcbiAgICAgICAgICAgIHQgPSBbIHsgZGVzY3JpcHRpb246ICdCaW5hcnkgRmlsZXMnLCBhY2NlcHQ6IHsgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSc6IFsnLmJpbicsICcuaGV4J10gfSB9LCBdXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICd0ZXh0JzpcclxuICAgICAgICAgICAgdCA9IFsgeyBkZXNjcmlwdGlvbjogJ1RleHQgRmlsZXMnLCBhY2NlcHQ6IHsgJ3RleHQvcGxhaW4nOiBbJy50eHQnLCAnLnRleHQnXSwgJ3RleHQvaHRtbCc6IFsnLmh0bWwnLCAnLmh0bSddIH0gfSwgXVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnanNvbic6XHJcbiAgICAgICAgICAgIHQgPSBbIHsgZGVzY3JpcHRpb246ICdKU09OIEZpbGVzJywgYWNjZXB0OiB7ICdhcHBsaWNhdGlvbi9qc29uJzogWycuanNvbiddIH0gfSwgXS8vdGV4dC9wbGFpblxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnanMnOlxyXG4gICAgICAgICAgICB0ID0gWyB7IGRlc2NyaXB0aW9uOiAnSmF2YVNjcmlwdCBGaWxlcycsIGFjY2VwdDogeyAndGV4dC9qYXZhc2NyaXB0JzogWycuanMnXSB9IH0sIF1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2ltYWdlJzpcclxuICAgICAgICAgICAgdCA9IFsgeyBkZXNjcmlwdGlvbjogJ0ltYWdlcycsIGFjY2VwdDogeyAnaW1hZ2UvKic6IFsnLnBuZycsICcuZ2lmJywgJy5qcGVnJywgJy5qcGcnXSB9IH0sIF1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2ljb24nOlxyXG4gICAgICAgICAgICB0ID0gWyB7IGRlc2NyaXB0aW9uOiAnSWNvbnMnLCBhY2NlcHQ6IHsgJ2ltYWdlL3gtaWNvJzogWycuaWNvJ10gfSB9LCBdXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdsdXQnOlxyXG4gICAgICAgICAgICB0ID0gWyB7IGRlc2NyaXB0aW9uOiAnTHV0JywgYWNjZXB0OiB7ICd0ZXh0L3BsYWluJzogWycuY3ViZScsICcuM2RsJ10gfSB9LCBdXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgTE9BRFxyXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuXHRzdGF0aWMgYXN5bmMgbG9hZCggbyA9IHt9ICkge1xyXG5cclxuICAgICAgICBpZiAodHlwZW9mIHdpbmRvdy5zaG93T3BlbkZpbGVQaWNrZXIgIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgd2luZG93LnNob3dPcGVuRmlsZVBpY2tlciA9IEZpbGVzLnNob3dPcGVuRmlsZVBpY2tlclBvbHlmaWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnkge1xyXG5cclxuICAgICAgICBcdGxldCB0eXBlID0gby50eXBlIHx8ICcnXHJcblxyXG4gICAgICAgICAgICBjb25zdCBvcHRpb25zID0ge1xyXG4gICAgICAgICAgICAgICAgZXhjbHVkZUFjY2VwdEFsbE9wdGlvbjogdHlwZSA/IHRydWUgOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIG11bHRpcGxlOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgIC8vc3RhcnRJbjonLi9hc3NldHMnXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBvcHRpb25zLnR5cGVzID0gRmlsZXMuYXV0b1R5cGVzKCB0eXBlIClcclxuXHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBhIG5ldyBoYW5kbGVcclxuICAgICAgICAgICAgY29uc3QgaGFuZGxlID0gYXdhaXQgd2luZG93LnNob3dPcGVuRmlsZVBpY2tlciggb3B0aW9ucyApXHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBhd2FpdCBoYW5kbGVbMF0uZ2V0RmlsZSgpXHJcbiAgICAgICAgICAgIC8vbGV0IGNvbnRlbnQgPSBhd2FpdCBmaWxlLnRleHQoKVxyXG5cclxuICAgICAgICAgICAgaWYoICFmaWxlICkgcmV0dXJuIG51bGxcclxuXHJcbiAgICAgICAgICAgIGxldCBmbmFtZSA9IGZpbGUubmFtZTtcclxuICAgICAgICAgICAgbGV0IGZ0eXBlID0gZm5hbWUuc3Vic3RyaW5nKCBmbmFtZS5sYXN0SW5kZXhPZignLicpKzEsIGZuYW1lLmxlbmd0aCApO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgZGF0YVVybCA9IFsgJ3BuZycsICdqcGcnLCAnanBlZycsICdtcDQnLCAnd2VibScsICdvZ2cnLCAnbXAzJyBdO1xyXG4gICAgICAgICAgICBjb25zdCBkYXRhQnVmID0gWyAnc2VhJywgJ3onLCAnaGV4JywgJ2J2aCcsICdCVkgnLCAnZ2xiJywgJ2dsdGYnIF07XHJcbiAgICAgICAgICAgIGNvbnN0IHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcblxyXG4gICAgICAgICAgICBpZiggZGF0YVVybC5pbmRleE9mKCBmdHlwZSApICE9PSAtMSApIHJlYWRlci5yZWFkQXNEYXRhVVJMKCBmaWxlIClcclxuICAgICAgICAgICAgZWxzZSBpZiggZGF0YUJ1Zi5pbmRleE9mKCBmdHlwZSApICE9PSAtMSApIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlciggZmlsZSApXHJcbiAgICAgICAgICAgIGVsc2UgcmVhZGVyLnJlYWRBc1RleHQoIGZpbGUgKVxyXG5cclxuICAgICAgICAgICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKGUpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgY29udGVudCA9IGUudGFyZ2V0LnJlc3VsdFxyXG5cclxuICAgICAgICAgICAgICAgIHN3aXRjaCh0eXBlKXtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlICdpbWFnZSc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbWcgPSBuZXcgSW1hZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGltZy5vbmxvYWQgPSBmdW5jdGlvbigpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmKCBvLmNhbGxiYWNrICkgby5jYWxsYmFjayggaW1nLCBmbmFtZSwgZnR5cGUgKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGltZy5zcmMgPSBjb250ZW50XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAnanNvbic6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCBvLmNhbGxiYWNrICkgby5jYWxsYmFjayggSlNPTi5wYXJzZSggY29udGVudCApLCBmbmFtZSwgZnR5cGUgKVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmKCBvLmNhbGxiYWNrICkgby5jYWxsYmFjayggY29udGVudCwgZm5hbWUsIGZ0eXBlIClcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSBjYXRjaChlKSB7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlKVxyXG4gICAgICAgICAgICBpZiggby5hbHdheXMgJiYgby5jYWxsYmFjayApIG8uY2FsbGJhY2soIG51bGwgKVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHRzdGF0aWMgc2hvd09wZW5GaWxlUGlja2VyUG9seWZpbGwoIG9wdGlvbnMgKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImlucHV0XCIpO1xyXG4gICAgICAgICAgICBpbnB1dC50eXBlID0gXCJmaWxlXCI7XHJcbiAgICAgICAgICAgIGlucHV0Lm11bHRpcGxlID0gb3B0aW9ucy5tdWx0aXBsZTtcclxuICAgICAgICAgICAgaW5wdXQuYWNjZXB0ID0gb3B0aW9ucy50eXBlc1xyXG4gICAgICAgICAgICAgICAgLm1hcCgodHlwZSkgPT4gdHlwZS5hY2NlcHQpXHJcbiAgICAgICAgICAgICAgICAuZmxhdE1hcCgoaW5zdCkgPT4gT2JqZWN0LmtleXMoaW5zdCkuZmxhdE1hcCgoa2V5KSA9PiBpbnN0W2tleV0pKVxyXG4gICAgICAgICAgICAgICAgLmpvaW4oXCIsXCIpO1xyXG5cclxuICAgICAgICAgICAgaW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKFxyXG4gICAgICAgICAgICAgICAgICAgIFsuLi5pbnB1dC5maWxlc10ubWFwKChmaWxlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXRGaWxlOiBhc3luYyAoKSA9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoZmlsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgaW5wdXQuY2xpY2soKTtcclxuICAgICAgICB9KVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgU0FWRVxyXG4gICAgLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIHN0YXRpYyBhc3luYyBzYXZlKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIGxldCB1c2VQb2x5ID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmICh0eXBlb2Ygd2luZG93LnNob3dTYXZlRmlsZVBpY2tlciAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICB3aW5kb3cuc2hvd1NhdmVGaWxlUGlja2VyID0gRmlsZXMuc2hvd1NhdmVGaWxlUGlja2VyUG9seWZpbGxcclxuICAgICAgICAgICAgdXNlUG9seSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0cnkge1xyXG5cclxuICAgICAgICAgICAgbGV0IHR5cGUgPSBvLnR5cGUgfHwgJydcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IG9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgICAgICBzdWdnZXN0ZWROYW1lOiBvLm5hbWUgfHwgJ2hlbGxvJyxcclxuICAgICAgICAgICAgICAgIGRhdGE6IG8uZGF0YSB8fCAnJ1xyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgb3B0aW9ucy50eXBlcyA9IEZpbGVzLmF1dG9UeXBlcyggdHlwZSApXHJcbiAgICAgICAgICAgIG9wdGlvbnMuZmluYWxUeXBlID0gT2JqZWN0LmtleXMoIG9wdGlvbnMudHlwZXNbMF0uYWNjZXB0IClbMF1cclxuICAgICAgICAgICAgb3B0aW9ucy5zdWdnZXN0ZWROYW1lICs9IG9wdGlvbnMudHlwZXNbMF0uYWNjZXB0W29wdGlvbnMuZmluYWxUeXBlXVswXVxyXG5cclxuXHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBhIG5ldyBoYW5kbGVcclxuICAgICAgICAgICAgY29uc3QgaGFuZGxlID0gYXdhaXQgd2luZG93LnNob3dTYXZlRmlsZVBpY2tlciggb3B0aW9ucyApO1xyXG5cclxuICAgICAgICAgICAgaWYoIHVzZVBvbHkgKSByZXR1cm5cclxuXHJcbiAgICAgICAgICAgIC8vIGNyZWF0ZSBhIEZpbGVTeXN0ZW1Xcml0YWJsZUZpbGVTdHJlYW0gdG8gd3JpdGUgdG9cclxuICAgICAgICAgICAgY29uc3QgZmlsZSA9IGF3YWl0IGhhbmRsZS5jcmVhdGVXcml0YWJsZSgpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGJsb2IgPSBuZXcgQmxvYihbIG9wdGlvbnMuZGF0YSBdLCB7IHR5cGU6IG9wdGlvbnMuZmluYWxUeXBlIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gd3JpdGUgb3VyIGZpbGVcclxuICAgICAgICAgICAgYXdhaXQgZmlsZS53cml0ZShibG9iKTtcclxuXHJcbiAgICAgICAgICAgIC8vIGNsb3NlIHRoZSBmaWxlIGFuZCB3cml0ZSB0aGUgY29udGVudHMgdG8gZGlzay5cclxuICAgICAgICAgICAgYXdhaXQgZmlsZS5jbG9zZSgpO1xyXG5cclxuICAgICAgICB9IGNhdGNoKGUpIHtcclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGUpO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHN0YXRpYyBzaG93U2F2ZUZpbGVQaWNrZXJQb2x5ZmlsbCggb3B0aW9ucyApIHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xyXG4gICAgICAgICAgICBhLmRvd25sb2FkID0gb3B0aW9ucy5zdWdnZXN0ZWROYW1lIHx8IFwibXktZmlsZS50eHRcIlxyXG4gICAgICAgICAgICBsZXQgYmxvYiA9IG5ldyBCbG9iKFsgb3B0aW9ucy5kYXRhIF0sIHsgdHlwZTpvcHRpb25zLmZpbmFsVHlwZSB9KTtcclxuICAgICAgICAgICAgYS5ocmVmID0gVVJMLmNyZWF0ZU9iamVjdFVSTCggYmxvYiApXHJcblxyXG4gICAgICAgICAgICBhLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKFxyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoICgpID0+IFVSTC5yZXZva2VPYmplY3RVUkwoYS5ocmVmKSwgMTAwMCApXHJcbiAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIGEuY2xpY2soKVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICBGT0xERVIgbm90IHBvc3NpYmxlIGluIHBvbHlcclxuICAgIC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBzdGF0aWMgYXN5bmMgZ2V0Rm9sZGVyKCkge1xyXG5cclxuICAgICAgICB0cnkge1xyXG4gICAgXHJcbiAgICAgICAgICAgIGNvbnN0IGhhbmRsZSA9IGF3YWl0IHdpbmRvdy5zaG93RGlyZWN0b3J5UGlja2VyKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGZpbGVzID0gW107XHJcbiAgICAgICAgICAgIGZvciBhd2FpdCAoY29uc3QgZW50cnkgb2YgaGFuZGxlLnZhbHVlcygpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlID0gYXdhaXQgZW50cnkuZ2V0RmlsZSgpO1xyXG4gICAgICAgICAgICAgICAgZmlsZXMucHVzaChmaWxlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc29sZS5sb2coZmlsZXMpXHJcbiAgICAgICAgICAgIHJldHVybiBmaWxlcztcclxuXHJcbiAgICAgICAgfSBjYXRjaChlKSB7XHJcblxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgXHJcbiAgICB9XHJcblxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuICAgIFxyXG5cclxufSIsImV4cG9ydCBjbGFzcyBWMiB7XHJcblxyXG5cdGNvbnN0cnVjdG9yKCB4ID0gMCwgeSA9IDAgKSB7XHJcblxyXG5cdFx0dGhpcy54ID0geDtcclxuXHRcdHRoaXMueSA9IHk7XHJcblxyXG5cdH1cclxuXHJcblx0c2V0ICggeCwgeSApIHtcclxuXHJcblx0XHR0aGlzLnggPSB4O1xyXG5cdFx0dGhpcy55ID0geTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cclxuXHR9XHJcblxyXG5cdGRpdmlkZSAoIHYgKSB7XHJcblxyXG5cdFx0dGhpcy54IC89IHYueDtcclxuXHRcdHRoaXMueSAvPSB2Lnk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHJcblx0fVxyXG5cclxuXHRtdWx0aXBseSAoIHYgKSB7XHJcblxyXG5cdFx0dGhpcy54ICo9IHYueDtcclxuXHRcdHRoaXMueSAqPSB2Lnk7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHJcblx0fVxyXG5cclxuXHRtdWx0aXBseVNjYWxhciAoIHNjYWxhciApIHtcclxuXHJcblx0XHR0aGlzLnggKj0gc2NhbGFyO1xyXG5cdFx0dGhpcy55ICo9IHNjYWxhcjtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cclxuXHR9XHJcblxyXG5cdGRpdmlkZVNjYWxhciAoIHNjYWxhciApIHtcclxuXHJcblx0XHRyZXR1cm4gdGhpcy5tdWx0aXBseVNjYWxhciggMSAvIHNjYWxhciApO1xyXG5cclxuXHR9XHJcblxyXG5cdGxlbmd0aCAoKSB7XHJcblxyXG5cdFx0cmV0dXJuIE1hdGguc3FydCggdGhpcy54ICogdGhpcy54ICsgdGhpcy55ICogdGhpcy55ICk7XHJcblxyXG5cdH1cclxuXHJcblx0YW5nbGUgKCkge1xyXG5cclxuXHRcdC8vIGNvbXB1dGVzIHRoZSBhbmdsZSBpbiByYWRpYW5zIHdpdGggcmVzcGVjdCB0byB0aGUgcG9zaXRpdmUgeC1heGlzXHJcblxyXG5cdFx0dmFyIGFuZ2xlID0gTWF0aC5hdGFuMiggdGhpcy55LCB0aGlzLnggKTtcclxuXHJcblx0XHRpZiAoIGFuZ2xlIDwgMCApIGFuZ2xlICs9IDIgKiBNYXRoLlBJO1xyXG5cclxuXHRcdHJldHVybiBhbmdsZTtcclxuXHJcblx0fVxyXG5cclxuXHRhZGRTY2FsYXIgKCBzICkge1xyXG5cclxuXHRcdHRoaXMueCArPSBzO1xyXG5cdFx0dGhpcy55ICs9IHM7XHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHJcblx0fVxyXG5cclxuXHRuZWdhdGUgKCkge1xyXG5cclxuXHRcdHRoaXMueCAqPSAtMTtcclxuXHRcdHRoaXMueSAqPSAtMTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cclxuXHR9XHJcblxyXG5cdG5lZyAoKSB7XHJcblxyXG5cdFx0dGhpcy54ID0gLTE7XHJcblx0XHR0aGlzLnkgPSAtMTtcclxuXHRcdHJldHVybiB0aGlzO1xyXG5cclxuXHR9XHJcblxyXG5cdGlzWmVybyAoKSB7XHJcblxyXG5cdFx0cmV0dXJuICggdGhpcy54ID09PSAwICYmIHRoaXMueSA9PT0gMCApO1xyXG5cclxuXHR9XHJcblxyXG5cdGNvcHkgKCB2ICkge1xyXG5cclxuXHRcdHRoaXMueCA9IHYueDtcclxuXHRcdHRoaXMueSA9IHYueTtcclxuXHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHJcblx0fVxyXG5cclxuXHRlcXVhbHMgKCB2ICkge1xyXG5cclxuXHRcdHJldHVybiAoICggdi54ID09PSB0aGlzLnggKSAmJiAoIHYueSA9PT0gdGhpcy55ICkgKTtcclxuXHJcblx0fVxyXG5cclxuXHRuZWFyRXF1YWxzICggdiwgbiApIHtcclxuXHJcblx0XHRyZXR1cm4gKCAoIHYueC50b0ZpeGVkKG4pID09PSB0aGlzLngudG9GaXhlZChuKSApICYmICggdi55LnRvRml4ZWQobikgPT09IHRoaXMueS50b0ZpeGVkKG4pICkgKTtcclxuXHJcblx0fVxyXG5cclxuXHRsZXJwICggdiwgYWxwaGEgKSB7XHJcblxyXG5cdFx0aWYoIHYgPT09IG51bGwgKXtcclxuXHRcdFx0dGhpcy54IC09IHRoaXMueCAqIGFscGhhO1xyXG5cdFx0ICAgIHRoaXMueSAtPSB0aGlzLnkgKiBhbHBoYTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHRoaXMueCArPSAoIHYueCAtIHRoaXMueCApICogYWxwaGE7XHJcblx0XHQgICAgdGhpcy55ICs9ICggdi55IC0gdGhpcy55ICkgKiBhbHBoYTtcclxuXHRcdH1cclxuXHJcblx0XHRyZXR1cm4gdGhpcztcclxuXHJcblx0fVxyXG5cclxufSIsImltcG9ydCB7IFJvb3RzIH0gZnJvbSBcIi4vUm9vdHMuanNcIjtcclxuaW1wb3J0IHsgVG9vbHMgfSBmcm9tIFwiLi9Ub29scy5qc1wiO1xyXG5pbXBvcnQgeyBWMiB9IGZyb20gXCIuL1YyLmpzXCI7XHJcblxyXG4vKipcclxuICogQGF1dGhvciBsdGggLyBodHRwczovL2dpdGh1Yi5jb20vbG8tdGhcclxuICovXHJcblxyXG5leHBvcnQgY2xhc3MgUHJvdG8ge1xyXG4gIGNvbnN0cnVjdG9yKG8gPSB7fSkge1xyXG4gICAgLy8gZGlzYWJsZSBtb3VzZSBjb250cm9sZVxyXG4gICAgdGhpcy5sb2NrID0gby5sb2NrIHx8IGZhbHNlO1xyXG5cclxuICAgIC8vIGZvciBidXR0b25cclxuICAgIHRoaXMubmV2ZXJsb2NrID0gZmFsc2U7XHJcblxyXG4gICAgLy8gb25seSBzaW1wbGUgc3BhY2VcclxuICAgIHRoaXMuaXNTcGFjZSA9IG8uaXNTcGFjZSB8fCBmYWxzZTtcclxuXHJcbiAgICAvLyBpZiBpcyBvbiBndWkgb3IgZ3JvdXBcclxuICAgIHRoaXMubWFpbiA9IG8ubWFpbiB8fCBudWxsO1xyXG4gICAgdGhpcy5pc1VJID0gby5pc1VJIHx8IGZhbHNlO1xyXG4gICAgdGhpcy5ncm91cCA9IG8uZ3JvdXAgfHwgbnVsbDtcclxuXHJcbiAgICB0aGlzLmlzTGlzdGVuID0gZmFsc2U7XHJcblxyXG4gICAgdGhpcy50b3AgPSAwO1xyXG4gICAgdGhpcy55dG9wID0gMDtcclxuXHJcbiAgICB0aGlzLmR4ID0gby5keCB8fCAwO1xyXG5cclxuICAgIHRoaXMuaXNTZWxlY3RhYmxlID0gby5zZWxlY3RhYmxlICE9PSB1bmRlZmluZWQgPyBvLnNlbGVjdGFibGUgOiBmYWxzZTtcclxuICAgIHRoaXMudW5zZWxlY3RhYmxlID1cclxuICAgICAgby51bnNlbGVjdCAhPT0gdW5kZWZpbmVkID8gby51bnNlbGVjdCA6IHRoaXMuaXNTZWxlY3RhYmxlO1xyXG5cclxuICAgIHRoaXMub250b3AgPSBvLm9udG9wID8gby5vbnRvcCA6IGZhbHNlOyAvLyAnYmVmb3JlYmVnaW4nICdhZnRlcmJlZ2luJyAnYmVmb3JlZW5kJyAnYWZ0ZXJlbmQnXHJcblxyXG4gICAgdGhpcy5jc3MgPSB0aGlzLm1haW4gPyB0aGlzLm1haW4uY3NzIDogVG9vbHMuY3NzO1xyXG5cclxuICAgIHRoaXMuY29sb3JzID0gVG9vbHMuZGVmaW5lQ29sb3IoXHJcbiAgICAgIG8sXHJcbiAgICAgIHRoaXMubWFpblxyXG4gICAgICAgID8gdGhpcy5ncm91cFxyXG4gICAgICAgICAgPyB0aGlzLmdyb3VwLmNvbG9yc1xyXG4gICAgICAgICAgOiB0aGlzLm1haW4uY29sb3JzXHJcbiAgICAgICAgOiBUb29scy5jb2xvcnNcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5vdmVyRWZmZWN0ID0gdGhpcy5jb2xvcnMuc2hvd092ZXI7XHJcblxyXG4gICAgdGhpcy5zdmdzID0gVG9vbHMuc3ZncztcclxuXHJcbiAgICB0aGlzLnpvbmUgPSB7IHg6IDAsIHk6IDAsIHc6IDAsIGg6IDAsIGQ6IDAgfTtcclxuICAgIHRoaXMubG9jYWwgPSBuZXcgVjIoKS5uZWcoKTtcclxuXHJcbiAgICB0aGlzLmlzQ2FudmFzT25seSA9IGZhbHNlO1xyXG4gICAgdGhpcy5pc1NlbGVjdCA9IGZhbHNlO1xyXG5cclxuICAgIC8vIHBlcmNlbnQgb2YgdGl0bGVcclxuICAgIHRoaXMucCA9IG8ucCAhPT0gdW5kZWZpbmVkID8gby5wIDogVG9vbHMuc2l6ZS5wO1xyXG5cclxuICAgIHRoaXMudyA9IHRoaXMuaXNVSSA/IHRoaXMubWFpbi5zaXplLncgOiBUb29scy5zaXplLnc7XHJcbiAgICBpZiAoby53ICE9PSB1bmRlZmluZWQpIHRoaXMudyA9IG8udztcclxuXHJcbiAgICB0aGlzLmggPSB0aGlzLmlzVUkgPyB0aGlzLm1haW4uc2l6ZS5oIDogVG9vbHMuc2l6ZS5oO1xyXG4gICAgaWYgKG8uaCAhPT0gdW5kZWZpbmVkKSB0aGlzLmggPSBvLmg7XHJcbiAgICBpZiAoIXRoaXMuaXNTcGFjZSkgdGhpcy5oID0gdGhpcy5oIDwgMTEgPyAxMSA6IHRoaXMuaDtcclxuICAgIGVsc2UgdGhpcy5sb2NrID0gdHJ1ZTtcclxuXHJcbiAgICAvLyBkZWNhbGUgZm9yIGNhbnZhcyBvbmx5XHJcbiAgICB0aGlzLmZ3ID0gby5mdyB8fCAwO1xyXG5cclxuICAgIHRoaXMuYXV0b1dpZHRoID0gby5hdXRvIHx8IHRydWU7IC8vIGF1dG8gd2lkdGggb3IgZmxleFxyXG4gICAgdGhpcy5pc09wZW4gPSBmYWxzZTsgLy9mYWxzZS8vIG9wZW4gc3RhdHVcclxuXHJcbiAgICAvLyByYWRpdXMgZm9yIHRvb2xib3hcclxuICAgIHRoaXMucmFkaXVzID0gby5yYWRpdXMgfHwgdGhpcy5jb2xvcnMucmFkaXVzO1xyXG5cclxuICAgIHRoaXMudHJhbnNpdGlvbiA9IG8udHJhbnNpdGlvbiB8fCBUb29scy50cmFuc2l0aW9uO1xyXG5cclxuICAgIC8vIG9ubHkgZm9yIG51bWJlclxyXG4gICAgdGhpcy5pc051bWJlciA9IGZhbHNlO1xyXG4gICAgdGhpcy5ub05lZyA9IG8ubm9OZWcgfHwgZmFsc2U7XHJcbiAgICB0aGlzLmFsbEVxdWFsID0gby5hbGxFcXVhbCB8fCBmYWxzZTtcclxuXHJcbiAgICAvLyBvbmx5IG1vc3Qgc2ltcGxlXHJcbiAgICB0aGlzLm1vbm8gPSBmYWxzZTtcclxuXHJcbiAgICAvLyBzdG9wIGxpc3RlbmluZyBmb3IgZWRpdCBzbGlkZSB0ZXh0XHJcbiAgICB0aGlzLmlzRWRpdCA9IGZhbHNlO1xyXG5cclxuICAgIC8vIG5vIHRpdGxlXHJcbiAgICB0aGlzLnNpbXBsZSA9IG8uc2ltcGxlIHx8IGZhbHNlO1xyXG4gICAgaWYgKHRoaXMuc2ltcGxlKSB0aGlzLnNhID0gMDtcclxuXHJcbiAgICAvLyBkZWZpbmUgb2JqIHNpemVcclxuICAgIHRoaXMuc2V0U2l6ZSh0aGlzLncpO1xyXG5cclxuICAgIC8vIHRpdGxlIHNpemVcclxuICAgIGlmIChvLnNhICE9PSB1bmRlZmluZWQpIHRoaXMuc2EgPSBvLnNhO1xyXG4gICAgaWYgKG8uc2IgIT09IHVuZGVmaW5lZCkgdGhpcy5zYiA9IG8uc2I7XHJcbiAgICBpZiAodGhpcy5zaW1wbGUpIHRoaXMuc2IgPSB0aGlzLncgLSB0aGlzLnNhO1xyXG5cclxuICAgIC8vIGxhc3QgbnVtYmVyIHNpemUgZm9yIHNsaWRlXHJcbiAgICB0aGlzLnNjID0gby5zYyA9PT0gdW5kZWZpbmVkID8gNDcgOiBvLnNjO1xyXG5cclxuICAgIC8vIGZvciBsaXN0ZW5pbmcgb2JqZWN0XHJcbiAgICB0aGlzLm9iamVjdExpbmsgPSBudWxsO1xyXG4gICAgdGhpcy5pc1NlbmQgPSBmYWxzZTtcclxuICAgIHRoaXMub2JqZWN0S2V5ID0gbnVsbDtcclxuXHJcbiAgICB0aGlzLnR4dCA9IG8ubmFtZSB8fCBcIlwiO1xyXG4gICAgdGhpcy5uYW1lID0gby5yZW5hbWUgfHwgdGhpcy50eHQ7XHJcbiAgICB0aGlzLnRhcmdldCA9IG8udGFyZ2V0IHx8IG51bGw7XHJcblxyXG4gICAgLy8gY2FsbGJhY2tcclxuICAgIHRoaXMuY2FsbGJhY2sgPSBvLmNhbGxiYWNrID09PSB1bmRlZmluZWQgPyBudWxsIDogby5jYWxsYmFjaztcclxuICAgIHRoaXMuZW5kQ2FsbGJhY2sgPSBudWxsO1xyXG4gICAgdGhpcy5vcGVuQ2FsbGJhY2sgPSBvLm9wZW5DYWxsYmFjayA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IG8ub3BlbkNhbGxiYWNrO1xyXG4gICAgdGhpcy5jbG9zZUNhbGxiYWNrID0gby5jbG9zZUNhbGxiYWNrID09PSB1bmRlZmluZWQgPyBudWxsIDogby5jbG9zZUNhbGxiYWNrO1xyXG5cclxuICAgIC8vIGlmIG5vIGNhbGxiYWNrIHRha2Ugb25lIGZyb20gZ3JvdXAgb3IgZ3VpXHJcbiAgICBpZiAodGhpcy5jYWxsYmFjayA9PT0gbnVsbCAmJiB0aGlzLmlzVUkgJiYgdGhpcy5tYWluLmNhbGxiYWNrICE9PSBudWxsKSB7XHJcbiAgICAgIHRoaXMuY2FsbGJhY2sgPSB0aGlzLmdyb3VwID8gdGhpcy5ncm91cC5jYWxsYmFjayA6IHRoaXMubWFpbi5jYWxsYmFjaztcclxuICAgIH1cclxuXHJcbiAgICAvLyBlbGVtZW50c1xyXG4gICAgdGhpcy5jID0gW107XHJcblxyXG4gICAgLy8gc3R5bGVcclxuICAgIHRoaXMucyA9IFtdO1xyXG5cclxuICAgIHRoaXMudXNlRmxleCA9IHRoaXMuaXNVSSA/IHRoaXMubWFpbi51c2VGbGV4IDogZmFsc2U7XHJcbiAgICBsZXQgZmxleGlibGUgPSB0aGlzLnVzZUZsZXhcclxuICAgICAgPyBcImRpc3BsYXk6ZmxleDsganVzdGlmeS1jb250ZW50OmNlbnRlcjsgYWxpZ24taXRlbXM6Y2VudGVyOyB0ZXh0LWFsaWduOmNlbnRlcjsgZmxleDogMSAxMDAlO1wiXHJcbiAgICAgIDogXCJmbG9hdDpsZWZ0O1wiO1xyXG5cclxuICAgIHRoaXMuY1swXSA9IFRvb2xzLmRvbShcclxuICAgICAgXCJkaXZcIixcclxuICAgICAgdGhpcy5jc3MuYmFzaWMgKyBmbGV4aWJsZSArIFwicG9zaXRpb246cmVsYXRpdmU7IGhlaWdodDoyMHB4O1wiXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuc1swXSA9IHRoaXMuY1swXS5zdHlsZTtcclxuXHJcbiAgICAvLyBib3R0b20gbWFyZ2luXHJcbiAgICB0aGlzLm1hcmdpbiA9IHRoaXMuY29sb3JzLnN5O1xyXG4gICAgdGhpcy5tdG9wID0gMDtcclxuICAgIGxldCBtYXJnaW5EaXYgPSBUb29scy5pc0RpdmlkKHRoaXMubWFyZ2luKTtcclxuXHJcbiAgICBpZiAodGhpcy5pc1VJICYmIHRoaXMubWFyZ2luKSB7XHJcbiAgICAgIHRoaXMuc1swXS5ib3hTaXppbmcgPSBcImNvbnRlbnQtYm94XCI7XHJcbiAgICAgIGlmIChtYXJnaW5EaXYpIHtcclxuICAgICAgICB0aGlzLm10b3AgPSB0aGlzLm1hcmdpbiAqIDAuNTtcclxuICAgICAgICAvL3RoaXMuc1swXS5ib3JkZXJUb3AgPSAnJHt0aGlzLm10b3B9cHggc29saWQgdHJhbnNwYXJlbnQnXHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhgJHt0aGlzLm10b3B9cHggc29saWQgdHJhbnNwYXJlbnRgKVxyXG4gICAgICAgIHRoaXMuc1swXS5ib3JkZXJUb3AgPSB0aGlzLm10b3AgKyBcInB4IHNvbGlkIHRyYW5zcGFyZW50XCI7XHJcbiAgICAgICAgdGhpcy5zWzBdLmJvcmRlckJvdHRvbSA9IHRoaXMubXRvcCArIFwicHggc29saWQgdHJhbnNwYXJlbnRcIjtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLnNbMF0uYm9yZGVyQm90dG9tID0gdGhpcy5tYXJnaW4gKyBcInB4IHNvbGlkIHRyYW5zcGFyZW50XCI7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyB3aXRoIHRpdGxlXHJcbiAgICBpZiAoIXRoaXMuc2ltcGxlKSB7XHJcbiAgICAgIHRoaXMuY1sxXSA9IFRvb2xzLmRvbShcImRpdlwiLCB0aGlzLmNzcy50eHQgKyB0aGlzLmNzcy5taWRkbGUpO1xyXG4gICAgICB0aGlzLnNbMV0gPSB0aGlzLmNbMV0uc3R5bGU7XHJcbiAgICAgIHRoaXMuY1sxXS50ZXh0Q29udGVudCA9IHRoaXMubmFtZTtcclxuICAgICAgdGhpcy5zWzFdLmNvbG9yID0gdGhpcy5sb2NrID8gdGhpcy5jb2xvcnMudGl0bGVvZmYgOiB0aGlzLmNvbG9ycy50aXRsZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoby5wb3MpIHtcclxuICAgICAgdGhpcy5zWzBdLnBvc2l0aW9uID0gXCJhYnNvbHV0ZVwiO1xyXG4gICAgICBmb3IgKGxldCBwIGluIG8ucG9zKSB7XHJcbiAgICAgICAgdGhpcy5zWzBdW3BdID0gby5wb3NbcF07XHJcbiAgICAgIH1cclxuICAgICAgdGhpcy5tb25vID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoby5jc3MpIHRoaXMuc1swXS5jc3NUZXh0ID0gby5jc3M7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gbWFrZSB0aGUgbm9kZVxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgaW5pdCgpIHtcclxuICAgIHRoaXMueXRvcCA9IHRoaXMudG9wICsgdGhpcy5tdG9wO1xyXG5cclxuICAgIHRoaXMuem9uZS5oID0gdGhpcy5oICsgdGhpcy5tYXJnaW47XHJcbiAgICB0aGlzLnpvbmUudyA9IHRoaXMudztcclxuXHJcbiAgICBsZXQgcyA9IHRoaXMuczsgLy8gc3R5bGUgY2FjaGVcclxuICAgIGxldCBjID0gdGhpcy5jOyAvLyBkaXYgY2FjaFxyXG5cclxuICAgIHNbMF0uaGVpZ2h0ID0gdGhpcy5oICsgXCJweFwiO1xyXG5cclxuICAgIGlmICh0aGlzLmlzVUkpIHNbMF0uYmFja2dyb3VuZCA9IHRoaXMuY29sb3JzLmJhY2tncm91bmQ7XHJcblxyXG4gICAgaWYgKCF0aGlzLmF1dG9XaWR0aCAmJiB0aGlzLnVzZUZsZXgpIHtcclxuICAgICAgc1swXS5mbGV4ID0gXCIxIDAgYXV0b1wiO1xyXG4gICAgICBzWzBdLm1pbldpZHRoID0gdGhpcy5taW53ICsgXCJweFwiO1xyXG4gICAgICBzWzBdLnRleHRBbGlnbiA9IFwiY2VudGVyXCI7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBpZiAodGhpcy5pc1VJKSBzWzBdLndpZHRoID0gXCIxMDAlXCI7XHJcbiAgICB9XHJcblxyXG4gICAgLy9pZiggdGhpcy5hdXRvSGVpZ2h0ICkgc1swXS50cmFuc2l0aW9uID0gJ2hlaWdodCAwLjAxcyBlYXNlLW91dCc7XHJcbiAgICBpZiAoY1sxXSAhPT0gdW5kZWZpbmVkICYmIHRoaXMuYXV0b1dpZHRoKSB7XHJcbiAgICAgIHNbMV0gPSBjWzFdLnN0eWxlO1xyXG4gICAgICBzWzFdLnRvcCA9IDEgKyBcInB4XCI7XHJcbiAgICAgIHNbMV0uaGVpZ2h0ID0gdGhpcy5oIC0gMiArIFwicHhcIjtcclxuICAgIH1cclxuXHJcbiAgICBsZXQgZnJhZyA9IFRvb2xzLmZyYWc7XHJcblxyXG4gICAgZm9yIChsZXQgaSA9IDEsIGxuZyA9IGMubGVuZ3RoOyBpICE9PSBsbmc7IGkrKykge1xyXG4gICAgICBpZiAoY1tpXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgZnJhZy5hcHBlbmRDaGlsZChjW2ldKTtcclxuICAgICAgICBzW2ldID0gY1tpXS5zdHlsZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGxldCBwcCA9XHJcbiAgICAgIHRoaXMudGFyZ2V0ICE9PSBudWxsXHJcbiAgICAgICAgPyB0aGlzLnRhcmdldFxyXG4gICAgICAgIDogdGhpcy5pc1VJXHJcbiAgICAgICAgPyB0aGlzLm1haW4uaW5uZXJcclxuICAgICAgICA6IGRvY3VtZW50LmJvZHk7XHJcblxyXG4gICAgaWYgKHRoaXMub250b3ApIHBwLmluc2VydEFkamFjZW50RWxlbWVudChcImFmdGVyYmVnaW5cIiwgY1swXSk7XHJcbiAgICBlbHNlIHBwLmFwcGVuZENoaWxkKGNbMF0pO1xyXG5cclxuICAgIGNbMF0uYXBwZW5kQ2hpbGQoZnJhZyk7XHJcblxyXG4gICAgdGhpcy5yU2l6ZSgpO1xyXG5cclxuICAgIC8vICEgc29sbyBwcm90b1xyXG4gICAgaWYgKCF0aGlzLmlzVUkpIHtcclxuICAgICAgdGhpcy5jWzBdLnN0eWxlLnBvaW50ZXJFdmVudHMgPSBcImF1dG9cIjtcclxuICAgICAgUm9vdHMuYWRkKHRoaXMpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgYWRkVHJhbnNpdGlvbigpIHtcclxuICAgIGlmICh0aGlzLmJhc2VIICYmIHRoaXMudHJhbnNpdGlvbiAmJiB0aGlzLmlzVUkpIHtcclxuICAgICAgdGhpcy5jWzBdLnN0eWxlLnRyYW5zaXRpb24gPSBcImhlaWdodCBcIiArIHRoaXMudHJhbnNpdGlvbiArIFwicyBlYXNlLW91dFwiO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gZnJvbSBUb29sc1xyXG5cclxuICBkb20odHlwZSwgY3NzLCBvYmosIGRvbSwgaWQpIHtcclxuICAgIHJldHVybiBUb29scy5kb20odHlwZSwgY3NzLCBvYmosIGRvbSwgaWQpO1xyXG4gIH1cclxuXHJcbiAgc2V0U3ZnKGRvbSwgdHlwZSwgdmFsdWUsIGlkLCBpZDIpIHtcclxuICAgIFRvb2xzLnNldFN2Zyhkb20sIHR5cGUsIHZhbHVlLCBpZCwgaWQyKTtcclxuICB9XHJcblxyXG4gIHNldENzcyhkb20sIGNzcykge1xyXG4gICAgVG9vbHMuc2V0Q3NzKGRvbSwgY3NzKTtcclxuICB9XHJcblxyXG4gIGNsYW1wKHZhbHVlLCBtaW4sIG1heCkge1xyXG4gICAgcmV0dXJuIFRvb2xzLmNsYW1wKHZhbHVlLCBtaW4sIG1heCk7XHJcbiAgfVxyXG5cclxuICBnZXRDb2xvclJpbmcoKSB7XHJcbiAgICBpZiAoIVRvb2xzLmNvbG9yUmluZykgVG9vbHMubWFrZUNvbG9yUmluZygpO1xyXG4gICAgcmV0dXJuIFRvb2xzLmNsb25lKFRvb2xzLmNvbG9yUmluZyk7XHJcbiAgfVxyXG5cclxuICBnZXRKb3lzdGljayhtb2RlbCkge1xyXG4gICAgaWYgKCFUb29sc1tcImpveXN0aWNrX1wiICsgbW9kZWxdKSBUb29scy5tYWtlSm95c3RpY2sobW9kZWwpO1xyXG4gICAgcmV0dXJuIFRvb2xzLmNsb25lKFRvb2xzW1wiam95c3RpY2tfXCIgKyBtb2RlbF0pO1xyXG4gIH1cclxuXHJcbiAgZ2V0Q2lyY3VsYXIobW9kZWwpIHtcclxuICAgIGlmICghVG9vbHMuY2lyY3VsYXIpIFRvb2xzLm1ha2VDaXJjdWxhcihtb2RlbCk7XHJcbiAgICByZXR1cm4gVG9vbHMuY2xvbmUoVG9vbHMuY2lyY3VsYXIpO1xyXG4gIH1cclxuXHJcbiAgZ2V0S25vYihtb2RlbCkge1xyXG4gICAgaWYgKCFUb29scy5rbm9iKSBUb29scy5tYWtlS25vYihtb2RlbCk7XHJcbiAgICByZXR1cm4gVG9vbHMuY2xvbmUoVG9vbHMua25vYik7XHJcbiAgfVxyXG5cclxuICBnZXRQYWQyZChtb2RlbCkge1xyXG4gICAgaWYgKCFUb29scy5wYWQyZCkgVG9vbHMubWFrZVBhZChtb2RlbCk7XHJcbiAgICByZXR1cm4gVG9vbHMuY2xvbmUoVG9vbHMucGFkMmQpO1xyXG4gIH1cclxuXHJcbiAgLy8gZnJvbSBSb290c1xyXG5cclxuICBjdXJzb3IobmFtZSkge1xyXG4gICAgUm9vdHMuY3Vyc29yKG5hbWUpO1xyXG4gIH1cclxuXHJcbiAgLy8vLy8vLy8vXHJcblxyXG4gIHVwZGF0ZSgpIHt9XHJcblxyXG4gIHJlc2V0KCkge31cclxuXHJcbiAgLy8vLy8vLy8vXHJcblxyXG4gIGNvbnRlbnQoKSB7XHJcbiAgICByZXR1cm4gdGhpcy5jWzBdO1xyXG4gIH1cclxuXHJcbiAgZ2V0RG9tKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuY1swXTtcclxuICB9XHJcblxyXG4gIHVpb3V0KCkge1xyXG4gICAgaWYgKHRoaXMubG9jaykgcmV0dXJuO1xyXG4gICAgaWYgKCF0aGlzLm92ZXJFZmZlY3QpIHJldHVybjtcclxuICAgIGlmICh0aGlzLnMpIHRoaXMuc1swXS5iYWNrZ3JvdW5kID0gdGhpcy5jb2xvcnMuYmFja2dyb3VuZDtcclxuICB9XHJcblxyXG4gIHVpb3ZlcigpIHtcclxuICAgIGlmICh0aGlzLmxvY2spIHJldHVybjtcclxuICAgIGlmICghdGhpcy5vdmVyRWZmZWN0KSByZXR1cm47XHJcbiAgICBpZiAodGhpcy5zKSB0aGlzLnNbMF0uYmFja2dyb3VuZCA9IHRoaXMuY29sb3JzLmJhY2tncm91bmRPdmVyO1xyXG4gIH1cclxuXHJcbiAgcmVuYW1lKHMpIHtcclxuICAgIGlmICh0aGlzLmNbMV0gIT09IHVuZGVmaW5lZCkgdGhpcy5jWzFdLnRleHRDb250ZW50ID0gcztcclxuICB9XHJcblxyXG4gIGxpc3RlbigpIHtcclxuICAgIHRoaXMuaXNMaXN0ZW4gPSBSb290cy5hZGRMaXN0ZW4odGhpcyk7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIGxpc3RlbmluZygpIHtcclxuICAgIC8vIG1vZGlmaWVkIGJ5IEZlZGVtYXJpbm9cclxuICAgIGlmICh0aGlzLm9iamVjdExpbmsgPT09IG51bGwpIHJldHVybjtcclxuICAgIGlmICh0aGlzLmlzU2VuZCkgcmV0dXJuO1xyXG4gICAgaWYgKHRoaXMuaXNFZGl0KSByZXR1cm47XHJcbiAgICAvLyBjaGVjayBpZiB2YWx1ZSBoYXMgY2hhbmdlZFxyXG4gICAgbGV0IGhhc0NoYW5nZWQgPSB0aGlzLnNldFZhbHVlKHRoaXMub2JqZWN0TGlua1t0aGlzLm9iamVjdEtleV0pO1xyXG4gICAgcmV0dXJuIGhhc0NoYW5nZWQ7XHJcbiAgfVxyXG5cclxuICBzZXRWYWx1ZSh2KSB7XHJcbiAgICBjb25zdCBvbGQgPSB0aGlzLnZhbHVlO1xyXG4gICAgaWYgKHRoaXMuaXNOdW1iZXIpIHRoaXMudmFsdWUgPSB0aGlzLm51bVZhbHVlKHYpO1xyXG4gICAgLy9lbHNlIGlmKCB2IGluc3RhbmNlb2YgQXJyYXkgJiYgdi5sZW5ndGggPT09IDEgKSB2ID0gdlswXTtcclxuICAgIGVsc2UgdGhpcy52YWx1ZSA9IHY7XHJcbiAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgbGV0IGhhc0NoYW5nZWQgPSBmYWxzZTtcclxuICAgIGlmIChvbGQgIT09IHRoaXMudmFsdWUpIHtcclxuICAgICAgaGFzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGhhc0NoYW5nZWQ7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gdXBkYXRlIGV2ZXJ5IGNoYW5nZVxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgb25DaGFuZ2UoZikge1xyXG4gICAgaWYgKHRoaXMuaXNTcGFjZSkgcmV0dXJuO1xyXG4gICAgdGhpcy5jYWxsYmFjayA9IGYgfHwgbnVsbDtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIHVwZGF0ZSBvbmx5IG9uIGVuZFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgb25GaW5pc2hDaGFuZ2UoZikge1xyXG4gICAgaWYgKHRoaXMuaXNTcGFjZSkgcmV0dXJuO1xyXG4gICAgdGhpcy5jYWxsYmFjayA9IG51bGw7XHJcbiAgICB0aGlzLmVuZENhbGxiYWNrID0gZjtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIGV2ZW50IG9uIG9wZW4gY2xvc2VcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIG9uT3BlbihmKSB7XHJcbiAgICB0aGlzLm9wZW5DYWxsYmFjayA9IGY7XHJcbiAgICByZXR1cm4gdGhpcztcclxuICB9XHJcblxyXG4gIG9uQ2xvc2UoZikge1xyXG4gICAgdGhpcy5jbG9zZUNhbGxiYWNrID0gZjtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICBzZW5kIGJhY2sgdmFsdWVcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIHNlbmQodikge1xyXG4gICAgdiA9IHYgfHwgdGhpcy52YWx1ZTtcclxuICAgIGlmICh2IGluc3RhbmNlb2YgQXJyYXkgJiYgdi5sZW5ndGggPT09IDEpIHYgPSB2WzBdO1xyXG5cclxuICAgIHRoaXMuaXNTZW5kID0gdHJ1ZTtcclxuICAgIGlmICh0aGlzLm9iamVjdExpbmsgIT09IG51bGwpIHRoaXMub2JqZWN0TGlua1t0aGlzLm9iamVjdEtleV0gPSB2O1xyXG4gICAgaWYgKHRoaXMuY2FsbGJhY2spIHRoaXMuY2FsbGJhY2sodiwgdGhpcy5vYmplY3RLZXkpO1xyXG4gICAgdGhpcy5pc1NlbmQgPSBmYWxzZTtcclxuICB9XHJcblxyXG4gIHNlbmRFbmQodikge1xyXG4gICAgdiA9IHYgfHwgdGhpcy52YWx1ZTtcclxuICAgIGlmICh2IGluc3RhbmNlb2YgQXJyYXkgJiYgdi5sZW5ndGggPT09IDEpIHYgPSB2WzBdO1xyXG5cclxuICAgIGlmICh0aGlzLmVuZENhbGxiYWNrKSB0aGlzLmVuZENhbGxiYWNrKHYpO1xyXG4gICAgaWYgKHRoaXMub2JqZWN0TGluayAhPT0gbnVsbCkgdGhpcy5vYmplY3RMaW5rW3RoaXMub2JqZWN0S2V5XSA9IHY7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gY2xlYXIgbm9kZVxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgZGlzcG9zZSgpIHtcclxuICAgIGlmICh0aGlzLmlzTGlzdGVuKSBSb290cy5yZW1vdmVMaXN0ZW4odGhpcyk7XHJcblxyXG4gICAgVG9vbHMuY2xlYXIodGhpcy5jWzBdKTtcclxuXHJcbiAgICBpZiAodGhpcy50YXJnZXQgIT09IG51bGwpIHtcclxuICAgICAgaWYgKHRoaXMuZ3JvdXAgIT09IG51bGwpIHRoaXMuZ3JvdXAuY2xlYXJPbmUodGhpcyk7XHJcbiAgICAgIGVsc2UgdGhpcy50YXJnZXQucmVtb3ZlQ2hpbGQodGhpcy5jWzBdKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGlmICh0aGlzLmlzVUkpIHRoaXMubWFpbi5jbGVhck9uZSh0aGlzKTtcclxuICAgICAgZWxzZSBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRoaXMuY1swXSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCF0aGlzLmlzVUkpIFJvb3RzLnJlbW92ZSh0aGlzKTtcclxuXHJcbiAgICB0aGlzLmMgPSBudWxsO1xyXG4gICAgdGhpcy5zID0gbnVsbDtcclxuICAgIHRoaXMuY2FsbGJhY2sgPSBudWxsO1xyXG4gICAgdGhpcy50YXJnZXQgPSBudWxsO1xyXG4gICAgdGhpcy5pc0xpc3RlbiA9IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgY2xlYXIoKSB7fVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gY2hhbmdlIHNpemVcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIGdldFdpZHRoKCkge1xyXG4gICAgbGV0IG53ID0gUm9vdHMuZ2V0V2lkdGgodGhpcyk7XHJcbiAgICBpZiAobncpIHRoaXMudyA9IG53O1xyXG4gIH1cclxuXHJcbiAgc2V0U2l6ZShzeCkge1xyXG4gICAgaWYgKCF0aGlzLmF1dG9XaWR0aCkgcmV0dXJuO1xyXG5cclxuICAgIHRoaXMudyA9IHN4O1xyXG5cclxuICAgIGlmICh0aGlzLnNpbXBsZSkge1xyXG4gICAgICB0aGlzLnNiID0gdGhpcy53IC0gdGhpcy5zYTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGxldCBwcCA9IHRoaXMudyAqICh0aGlzLnAgLyAxMDApO1xyXG4gICAgICAvL3RoaXMuc2EgPSBNYXRoLmZsb29yKCBwcCArIDEwIClcclxuICAgICAgLy90aGlzLnNiID0gTWF0aC5mbG9vciggdGhpcy53IC0gcHAgLSAyMCApXHJcbiAgICAgIHRoaXMuc2EgPSBNYXRoLmZsb29yKHBwICsgOCk7XHJcbiAgICAgIHRoaXMuc2IgPSBNYXRoLmZsb29yKHRoaXMudyAtIHBwIC0gMTYpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgclNpemUoKSB7XHJcbiAgICBpZiAoIXRoaXMuYXV0b1dpZHRoKSByZXR1cm47XHJcbiAgICBpZiAoIXRoaXMuaXNVSSkgdGhpcy5zWzBdLndpZHRoID0gdGhpcy53ICsgXCJweFwiO1xyXG4gICAgaWYgKCF0aGlzLnNpbXBsZSkgdGhpcy5zWzFdLndpZHRoID0gdGhpcy5zYSArIFwicHhcIjtcclxuICB9XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyBmb3IgbnVtZXJpYyB2YWx1ZVxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgc2V0VHlwZU51bWJlcihvKSB7XHJcbiAgICB0aGlzLmlzTnVtYmVyID0gdHJ1ZTtcclxuXHJcbiAgICB0aGlzLnZhbHVlID0gMDtcclxuICAgIGlmIChvLnZhbHVlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgaWYgKHR5cGVvZiBvLnZhbHVlID09PSBcInN0cmluZ1wiKSB0aGlzLnZhbHVlID0gby52YWx1ZSAqIDE7XHJcbiAgICAgIGVsc2UgdGhpcy52YWx1ZSA9IG8udmFsdWU7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5taW4gPSBvLm1pbiA9PT0gdW5kZWZpbmVkID8gLUluZmluaXR5IDogby5taW47XHJcbiAgICB0aGlzLm1heCA9IG8ubWF4ID09PSB1bmRlZmluZWQgPyBJbmZpbml0eSA6IG8ubWF4O1xyXG4gICAgdGhpcy5wcmVjaXNpb24gPSBvLnByZWNpc2lvbiA9PT0gdW5kZWZpbmVkID8gMiA6IG8ucHJlY2lzaW9uO1xyXG5cclxuICAgIGxldCBzO1xyXG5cclxuICAgIHN3aXRjaCAodGhpcy5wcmVjaXNpb24pIHtcclxuICAgICAgY2FzZSAwOlxyXG4gICAgICAgIHMgPSAxO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDE6XHJcbiAgICAgICAgcyA9IDAuMTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAyOlxyXG4gICAgICAgIHMgPSAwLjAxO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDM6XHJcbiAgICAgICAgcyA9IDAuMDAxO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDQ6XHJcbiAgICAgICAgcyA9IDAuMDAwMTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSA1OlxyXG4gICAgICAgIHMgPSAwLjAwMDAxO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDY6XHJcbiAgICAgICAgcyA9IDAuMDAwMDAxO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuc3RlcCA9IG8uc3RlcCA9PT0gdW5kZWZpbmVkID8gcyA6IG8uc3RlcDtcclxuICAgIHRoaXMucmFuZ2UgPSB0aGlzLm1heCAtIHRoaXMubWluO1xyXG4gICAgdGhpcy52YWx1ZSA9IHRoaXMubnVtVmFsdWUodGhpcy52YWx1ZSk7XHJcbiAgfVxyXG5cclxuICBudW1WYWx1ZShuKSB7XHJcbiAgICBpZiAodGhpcy5ub05lZykgbiA9IE1hdGguYWJzKG4pO1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgTWF0aC5taW4odGhpcy5tYXgsIE1hdGgubWF4KHRoaXMubWluLCBuKSkudG9GaXhlZCh0aGlzLnByZWNpc2lvbikgKiAxXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICAgRVZFTlRTIERFRkFVTFRcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIGhhbmRsZUV2ZW50KGUpIHtcclxuICAgIGlmICh0aGlzLmxvY2spIHJldHVybjtcclxuICAgIGlmICh0aGlzLm5ldmVybG9jaykgUm9vdHMubG9jayA9IGZhbHNlO1xyXG4gICAgaWYgKCF0aGlzW2UudHlwZV0pXHJcbiAgICAgIHJldHVybiBjb25zb2xlLmVycm9yKGUudHlwZSwgXCJ0aGlzIHR5cGUgb2YgZXZlbnQgbm8gZXhpc3RlICFcIik7XHJcblxyXG4gICAgLy8gVE9ETyAhISEhXHJcblxyXG4gICAgLy9pZiggdGhpcy5tYXJnaW5EaXYgKSB6LmQgLT0gdGhpcy5tYXJnaW4gKiAwLjVcclxuXHJcbiAgICAvL2lmKCB0aGlzLm1hcmdpbkRpdiApIGUuY2xpZW50WSAtPSB0aGlzLm1hcmdpbiAqIDAuNVxyXG4gICAgLy9pZiggdGhpcy5ncm91cCAmJiB0aGlzLmdyb3VwLm1hcmdpbkRpdiApIGUuY2xpZW50WSAtPSB0aGlzLmdyb3VwLm1hcmdpbiAqIDAuNVxyXG5cclxuICAgIHJldHVybiB0aGlzW2UudHlwZV0oZSk7XHJcbiAgfVxyXG5cclxuICB3aGVlbChlKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG4gIG1vdXNlZG93bihlKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG4gIG1vdXNlbW92ZShlKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG4gIG1vdXNldXAoZSkge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuICBrZXlkb3duKGUpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbiAga2V5dXAoZSkge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIG9iamVjdCByZWZlcmVuY3lcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIHNldFJlZmVyZW5jeShvYmosIGtleSkge1xyXG4gICAgdGhpcy5vYmplY3RMaW5rID0gb2JqO1xyXG4gICAgdGhpcy5vYmplY3RLZXkgPSBrZXk7XHJcbiAgfVxyXG5cclxuICBkaXNwbGF5KHYgPSBmYWxzZSkge1xyXG4gICAgdGhpcy5zWzBdLnZpc2liaWxpdHkgPSB2ID8gXCJ2aXNpYmxlXCIgOiBcImhpZGRlblwiO1xyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vIHJlc2l6ZSBoZWlnaHRcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIG9wZW4oKSB7XHJcbiAgICBpZiAodGhpcy5pc09wZW4pIHJldHVybjtcclxuICAgIHRoaXMuaXNPcGVuID0gdHJ1ZTtcclxuICAgIFJvb3RzLm5lZWRSZXNpemUgPSB0cnVlO1xyXG4gICAgaWYgKHRoaXMub3BlbkNhbGxiYWNrKSB0aGlzLm9wZW5DYWxsYmFjaygpO1xyXG4gIH1cclxuXHJcbiAgY2xvc2UoKSB7XHJcbiAgICBpZiAoIXRoaXMuaXNPcGVuKSByZXR1cm47XHJcbiAgICB0aGlzLmlzT3BlbiA9IGZhbHNlO1xyXG4gICAgUm9vdHMubmVlZFJlc2l6ZSA9IHRydWU7XHJcbiAgICBpZiAodGhpcy5jbG9zZUNhbGxiYWNrKSB0aGlzLmNsb3NlQ2FsbGJhY2soKTtcclxuICB9XHJcblxyXG4gIG5lZWRab25lKCkge1xyXG4gICAgUm9vdHMubmVlZFJlWm9uZSA9IHRydWU7XHJcbiAgfVxyXG5cclxuICByZXpvbmUoKSB7XHJcbiAgICBSb290cy5uZWVkUmVab25lID0gdHJ1ZTtcclxuICB9XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyAgSU5QVVRcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIHNlbGVjdCgpIHt9XHJcblxyXG4gIHVuc2VsZWN0KCkge31cclxuXHJcbiAgc2V0SW5wdXQoSW5wdXQpIHtcclxuICAgIFJvb3RzLnNldElucHV0KElucHV0LCB0aGlzKTtcclxuICB9XHJcblxyXG4gIHVwSW5wdXQoeCwgZG93bikge1xyXG4gICAgcmV0dXJuIFJvb3RzLnVwSW5wdXQoeCwgZG93bik7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gc3BlY2lhbCBpdGVtXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBzZWxlY3RlZChiKSB7XHJcbiAgICB0aGlzLmlzU2VsZWN0ID0gYiB8fCBmYWxzZTtcclxuICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgUHJvdG8gfSBmcm9tICcuLi9jb3JlL1Byb3RvLmpzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBCb29sIGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvIClcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLnZhbHVlID0gby52YWx1ZSB8fCBmYWxzZVxyXG4gICAgICAgIHRoaXMubW9kZWwgPSBvLm1vZGUgIT09IHVuZGVmaW5lZCA/IG8ubW9kZSA6IDBcclxuXHJcbiAgICAgICAgdGhpcy5vbk5hbWUgPSBvLnJlbmFtZSB8fCB0aGlzLnR4dFxyXG4gICAgICAgIGlmKCBvLm9uTmFtZSApIG8ub25uYW1lID0gby5vbk5hbWVcclxuICAgICAgICBpZiggby5vbm5hbWUgKSB0aGlzLm9uTmFtZSA9IG8ub25uYW1lXHJcblxyXG4gICAgICAgIHRoaXMuaW5oID0gby5pbmggfHwgTWF0aC5mbG9vciggdGhpcy5oKjAuOCApXHJcbiAgICAgICAgdGhpcy5pbncgPSBvLmludyB8fCAzNlxyXG5cclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG4gICAgICAgXHJcbiAgICAgICAgaWYoIHRoaXMubW9kZWwgPT09IDAgKXtcclxuICAgICAgICAgICAgbGV0IHQgPSBNYXRoLmZsb29yKHRoaXMuaCowLjUpLSgodGhpcy5pbmgtMikqMC41KTtcclxuICAgICAgICAgICAgdGhpcy5jWzJdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy5iYXNpYyArICdiYWNrZ3JvdW5kOicrIGNjLmlucHV0QmcgKyc7IGhlaWdodDonKyh0aGlzLmluaC0yKSsncHg7IHdpZHRoOicrdGhpcy5pbncrJ3B4OyB0b3A6Jyt0KydweDsgYm9yZGVyLXJhZGl1czoxMHB4OyBib3JkZXI6MnB4IHNvbGlkICcrIGNjLmJhY2sgKVxyXG4gICAgICAgICAgICB0aGlzLmNbM10gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLmJhc2ljICsgJ2hlaWdodDonKyh0aGlzLmluaC02KSsncHg7IHdpZHRoOjE2cHg7IHRvcDonKyh0KzIpKydweDsgYm9yZGVyLXJhZGl1czoxMHB4OyBiYWNrZ3JvdW5kOicrIGNjLmJ1dHRvbisnOycgKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMucCA9IDBcclxuICAgICAgICAgICAgaWYoIHRoaXMuY1sxXSAhPT0gdW5kZWZpbmVkICkgdGhpcy5jWzFdLnRleHRDb250ZW50ID0gJyc7XHJcbiAgICAgICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0ICsgdGhpcy5jc3MuYnV0dG9uICsgJ3RvcDoxcHg7IGJhY2tncm91bmQ6JytjYy5idXR0b24rJzsgaGVpZ2h0OicrKHRoaXMuaC0yKSsncHg7IGJvcmRlcjonK2NjLmJvcmRlclNpemUrJ3B4IHNvbGlkICcrY2MuYm9yZGVyKyc7IGJvcmRlci1yYWRpdXM6Jyt0aGlzLnJhZGl1cysncHg7JyApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnN0YXQgPSAtMVxyXG5cclxuICAgICAgICB0aGlzLmluaXQoKVxyXG4gICAgICAgIHRoaXMudXBkYXRlKClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBFVkVOVFNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBtb3VzZWRvd24gKCBlICkge1xyXG5cclxuICAgICAgICB0aGlzLnZhbHVlID0gIXRoaXMudmFsdWVcclxuICAgICAgICB0aGlzLnVwZGF0ZSggdHJ1ZSApXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW91c2Vtb3ZlKCBlIClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vtb3ZlICggZSApIHtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJzb3IoJ3BvaW50ZXInKVxyXG4gICAgICAgIHJldHVybiB0aGlzLm1vZGUoIHRydWUgKVxyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIHJlc2V0ICgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJzb3IoKVxyXG4gICAgICAgIHJldHVybiB0aGlzLm1vZGUoKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIE1PREVcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBtb2RlICggb3ZlciApIHtcclxuXHJcbiAgICAgICAgbGV0IGNoYW5nZSA9IGZhbHNlXHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnMsIHMgPSB0aGlzLnMsIG4sIHYgPSB0aGlzLnZhbHVlXHJcblxyXG4gICAgICAgIGlmKCBvdmVyICkgbiA9IHYgPyA0IDogM1xyXG4gICAgICAgIGVsc2UgbiA9IHYgPyAyIDogMVxyXG5cclxuICAgICAgICBpZiggdGhpcy5zdGF0ICE9PSBuICl7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnN0YXQgPSBuXHJcblxyXG4gICAgICAgICAgICBpZiggdGhpcy5tb2RlbCAhPT0gMCApe1xyXG5cclxuICAgICAgICAgICAgICAgIHN3aXRjaCggbiApe1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6IHNbMl0uY29sb3IgPSBjYy50ZXh0OyBzWzJdLmJhY2tncm91bmQgPSBjYy5idXR0b247IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMjogc1syXS5jb2xvciA9IGNjLnRleHRTZWxlY3Q7IHNbMl0uYmFja2dyb3VuZCA9IGNjLnNlbGVjdDsgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAzOiBzWzJdLmNvbG9yID0gY2MudGV4dE92ZXI7IHNbMl0uYmFja2dyb3VuZCA9IGNjLm92ZXJvZmY7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDogc1syXS5jb2xvciA9IGNjLnRleHRPdmVyOyBzWzJdLmJhY2tncm91bmQgPSBjYy5vdmVyOyBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jWzJdLmlubmVySFRNTCA9IHYgPyB0aGlzLm9uTmFtZSA6IHRoaXMubmFtZVxyXG5cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgICAgICAgICBzd2l0Y2goIG4gKXtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOiBzWzJdLmJhY2tncm91bmQgPSBzWzJdLmJvcmRlckNvbG9yID0gY2MuYmFja29mZjsgc1szXS5iYWNrZ3JvdW5kID0gY2MuYnV0dG9uOyBicmVhazsvLyBvZmYgb3V0XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyOiBzWzJdLmJhY2tncm91bmQgPSBzWzJdLmJvcmRlckNvbG9yID0gY2MuYmFjazsgc1szXS5iYWNrZ3JvdW5kID0gY2MudGV4dE92ZXI7IGJyZWFrOy8vIG9uIG92ZXJcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDM6IHNbMl0uYmFja2dyb3VuZCA9IHNbMl0uYm9yZGVyQ29sb3IgPSBjYy5iYWNrOyBzWzNdLmJhY2tncm91bmQgPSBjYy5vdmVyb2ZmOyBicmVhazsvLyBvZmYgb3ZlclxyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDogc1syXS5iYWNrZ3JvdW5kID0gc1syXS5ib3JkZXJDb2xvciA9IGNjLmJhY2tvZmY7IHNbM10uYmFja2dyb3VuZCA9IGNjLnRleHRTZWxlY3Q7IGJyZWFrOy8vIG9uIG91dFxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBzWzNdLm1hcmdpbkxlZnQgPSB2ID8gJzE3cHgnIDogJzJweCdcclxuICAgICAgICAgICAgICAgIHRoaXMuY1sxXS50ZXh0Q29udGVudCA9IHYgPyB0aGlzLm9uTmFtZSA6IHRoaXMubmFtZVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY2hhbmdlID0gdHJ1ZVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjaGFuZ2VcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIHVwZGF0ZSAoIHVwICkge1xyXG5cclxuICAgICAgICB0aGlzLm1vZGUoKVxyXG4gICAgICAgIGlmKCB1cCApIHRoaXMuc2VuZCgpXHJcbiAgICAgICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIHJTaXplICgpIHtcclxuXHJcbiAgICAgICAgc3VwZXIuclNpemUoKVxyXG5cclxuICAgICAgICBsZXQgcyA9IHRoaXMuc1xyXG4gICAgICAgIGxldCB3ID0gKHRoaXMudyAtIDEwICkgLSB0aGlzLmlud1xyXG4gICAgICAgIGlmKCB0aGlzLm1vZGVsID09PSAwICl7XHJcbiAgICAgICAgICAgIHNbMl0ubGVmdCA9IHcgKyAncHgnXHJcbiAgICAgICAgICAgIHNbM10ubGVmdCA9IHcgKyAncHgnXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc1syXS5sZWZ0ID0gdGhpcy5zYSArICdweCdcclxuICAgICAgICAgICAgc1syXS53aWR0aCA9IHRoaXMuc2IgICsgJ3B4J1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEJ1dHRvbiBleHRlbmRzIFByb3RvIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciggbyA9IHt9ICkge1xyXG5cclxuICAgICAgICBzdXBlciggbyApXHJcblxyXG4gICAgICAgIHRoaXMudmFsdWUgPSAnJztcclxuICAgICAgICBpZiggby52YWx1ZSAhPT0gdW5kZWZpbmVkICkgdGhpcy52YWx1ZSA9IG8udmFsdWVcclxuXHJcbiAgICAgICAgdGhpcy52YWx1ZXMgPSBvLnZhbHVlIHx8IHRoaXMudHh0XHJcbiAgICAgICAgaWYoIG8udmFsdWVzICkgdGhpcy52YWx1ZXMgPSBvLnZhbHVlc1xyXG5cclxuICAgICAgICBpZiggIW8udmFsdWVzICYmICFvLnZhbHVlICkgdGhpcy50eHQgPSAnJ1xyXG5cclxuICAgICAgICB0aGlzLm9uTmFtZSA9IG8ub25OYW1lIHx8IG51bGw7XHJcblxyXG4gICAgICAgIHRoaXMub24gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgLy8gZm9yY2UgYnV0dG9uIHdpZHRoXHJcbiAgICAgICAgdGhpcy5idyA9IG8uZm9yY2VXaWR0aCB8fCAwXHJcbiAgICAgICAgaWYoby5idykgdGhpcy5idyA9IG8uYndcclxuICAgICAgICB0aGlzLnNwYWNlID0gby5zcGFjZSB8fCAzXHJcblxyXG4gICAgICAgIGlmKCB0eXBlb2YgdGhpcy52YWx1ZXMgPT09ICdzdHJpbmcnICkgdGhpcy52YWx1ZXMgPSBbIHRoaXMudmFsdWVzIF1cclxuXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMubmV2ZXJsb2NrID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMucmVzID0gMFxyXG5cclxuICAgICAgICB0aGlzLmxuZyA9IHRoaXMudmFsdWVzLmxlbmd0aFxyXG4gICAgICAgIHRoaXMudG1wID0gW11cclxuICAgICAgICB0aGlzLnN0YXQgPSBbXVxyXG5cclxuICAgICAgICBsZXQgc2VsLCBjYyA9IHRoaXMuY29sb3JzO1xyXG5cclxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8IHRoaXMubG5nOyBpKysgKXtcclxuXHJcbiAgICAgICAgICAgIHNlbCA9IGZhbHNlXHJcbiAgICAgICAgICAgIGlmKCB0aGlzLnZhbHVlc1tpXSA9PT0gdGhpcy52YWx1ZSAmJiB0aGlzLmlzU2VsZWN0YWJsZSApIHNlbCA9IHRydWVcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY1tpKzJdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHQgKyB0aGlzLmNzcy5idXR0b24gKyAndG9wOjFweDsgaGVpZ2h0OicrKHRoaXMuaC0yKSsncHg7IGJvcmRlcjonK2NjLmJvcmRlclNpemUrJ3B4IHNvbGlkICcrY2MuYm9yZGVyKyc7IGJvcmRlci1yYWRpdXM6Jyt0aGlzLnJhZGl1cysncHg7JyApXHJcbiAgICAgICAgICAgIHRoaXMuY1tpKzJdLnN0eWxlLmJhY2tncm91bmQgPSBzZWwgPyBjYy5zZWxlY3QgOiBjYy5idXR0b25cclxuICAgICAgICAgICAgdGhpcy5jW2krMl0uc3R5bGUuY29sb3IgPSBzZWwgPyBjYy50ZXh0U2VsZWN0IDogY2MudGV4dFxyXG4gICAgICAgICAgICB0aGlzLmNbaSsyXS5pbm5lckhUTUwgPSB0aGlzLnZhbHVlc1tpXTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0W2ldID0gc2VsID8gMzoxO1xyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBpZiggdGhpcy50eHQ9PT0nJyApIHRoaXMucCA9IDAgXHJcblxyXG4gICAgICAgIGlmKCAoIW8udmFsdWUgJiYgIW8udmFsdWVzKSB8fCB0aGlzLnAgPT09IDAgKXtcclxuICAgICAgICAgICAgaWYoIHRoaXMuY1sxXSAhPT0gdW5kZWZpbmVkICkgdGhpcy5jWzFdLnRleHRDb250ZW50ID0gJydcclxuICAgICAgICB9IFxyXG4gICAgICAgIFxyXG5cclxuICAgICAgICB0aGlzLmluaXQoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgb25PZmYoKSB7XHJcblxyXG4gICAgICAgIHRoaXMub24gPSAhdGhpcy5vbjtcclxuICAgICAgICB0aGlzLmxhYmVsKCB0aGlzLm9uID8gdGhpcy5vbk5hbWUgOiB0aGlzLnZhbHVlIClcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICB0ZXN0Wm9uZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBsID0gdGhpcy5sb2NhbDtcclxuICAgICAgICBpZiggbC54ID09PSAtMSAmJiBsLnkgPT09IC0xICkgcmV0dXJuIC0xXHJcblxyXG4gICAgICAgIGxldCBpID0gdGhpcy5sbmdcclxuICAgICAgICBsZXQgdCA9IHRoaXMudG1wXHJcbiAgICAgICAgXHJcbiAgICAgICAgd2hpbGUoIGktLSApe1xyXG4gICAgICAgIFx0aWYoIGwueD50W2ldWzBdICYmIGwueDx0W2ldWzJdICkgcmV0dXJuIGlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAtMVxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIEVWRU5UU1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIG1vdXNldXAgKCBlICkge1xyXG5cclxuICAgICAgICBpZiggIXRoaXMuaXNEb3duICkgcmV0dXJuIGZhbHNlXHJcblxyXG4gICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2VcclxuICAgICAgICBpZiggdGhpcy5yZXMgIT09IC0xICl7XHJcbiAgICAgICAgICAgIGlmKCB0aGlzLnZhbHVlID09PSB0aGlzLnZhbHVlc1t0aGlzLnJlc10gJiYgdGhpcy51bnNlbGVjdGFibGUgKSB0aGlzLnZhbHVlID0gJydcclxuICAgICAgICAgICAgZWxzZSB0aGlzLnZhbHVlID0gdGhpcy52YWx1ZXNbdGhpcy5yZXNdXHJcbiAgICAgICAgICAgIGlmKCB0aGlzLm9uTmFtZSAhPT0gbnVsbCApIHRoaXMub25PZmYoKVxyXG4gICAgICAgICAgICB0aGlzLnNlbmQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW91c2Vtb3ZlKCBlIClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vkb3duICggZSApIHtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuaXNEb3duICkgcmV0dXJuIGZhbHNlXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSB0cnVlXHJcbiAgICBcdHJldHVybiB0aGlzLm1vdXNlbW92ZSggZSApXHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlbW92ZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCB1cCA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5yZXMgPSB0aGlzLnRlc3Rab25lKCBlIClcclxuXHJcbiAgICAgICAgaWYoIHRoaXMucmVzICE9PSAtMSApe1xyXG4gICAgICAgICAgICB0aGlzLmN1cnNvcigncG9pbnRlcicpXHJcbiAgICAgICAgICAgIHVwID0gdGhpcy5tb2RlcyggdGhpcy5pc0Rvd24gPyAzIDogMiwgdGhpcy5yZXMgKVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgXHR1cCA9IHRoaXMucmVzZXQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHVwXHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBtb2RlcyAoIE4gPSAxLCBpZCA9IC0xICkge1xyXG5cclxuICAgICAgICBsZXQgaSA9IHRoaXMubG5nLCB3LCBuLCByID0gZmFsc2VcclxuXHJcbiAgICAgICAgd2hpbGUoIGktLSApe1xyXG5cclxuICAgICAgICAgICAgbiA9IE5cclxuICAgICAgICAgICAgdyA9IHRoaXMuaXNTZWxlY3RhYmxlID8gdGhpcy52YWx1ZXNbIGkgXSA9PT0gdGhpcy52YWx1ZSA6IGZhbHNlXHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiggaSA9PT0gaWQgKXtcclxuICAgICAgICAgICAgICAgIGlmKCB3ICYmIG4gPT09IDIgKSBuID0gMyBcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIG4gPSAxXHJcbiAgICAgICAgICAgICAgICBpZiggdyApIG4gPSA0XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vaWYoIHRoaXMubW9kZSggbiwgaSApICkgciA9IHRydWVcclxuICAgICAgICAgICAgciA9IHRoaXMubW9kZSggbiwgaSApXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW9kZSAoIG4sIGlkICkge1xyXG5cclxuICAgICAgICAvL2lmKCF0aGlzLnMpIHJldHVybiBmYWxzZVxyXG4gXHJcbiAgICAgICAgbGV0IGNoYW5nZSA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBjYyA9IHRoaXMuY29sb3JzLCBzID0gdGhpcy5zXHJcbiAgICAgICAgbGV0IGkgPSBpZCsyXHJcblxyXG4gICAgICAgIGlmKCB0aGlzLnN0YXRbaWRdICE9PSBuICl7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnN0YXRbaWRdID0gbjtcclxuICAgICAgICBcclxuICAgICAgICAgICAgc3dpdGNoKCBuICl7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAxOiBzW2ldLmNvbG9yID0gY2MudGV4dDsgc1tpXS5iYWNrZ3JvdW5kID0gY2MuYnV0dG9uOyBicmVha1xyXG4gICAgICAgICAgICAgICAgY2FzZSAyOiBzW2ldLmNvbG9yID0gY2MudGV4dE92ZXI7IHNbaV0uYmFja2dyb3VuZCA9IGNjLm92ZXJvZmY7IGJyZWFrXHJcbiAgICAgICAgICAgICAgICBjYXNlIDM6IHNbaV0uY29sb3IgPSBjYy50ZXh0T3Zlcjsgc1tpXS5iYWNrZ3JvdW5kID0gY2Mub3ZlcjsgYnJlYWtcclxuICAgICAgICAgICAgICAgIGNhc2UgNDogc1tpXS5jb2xvciA9IGNjLnRleHRTZWxlY3Q7IHNbaV0uYmFja2dyb3VuZCA9IGNjLnNlbGVjdDsgYnJlYWtcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNoYW5nZSA9IHRydWU7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNoYW5nZVxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgcmVzZXQgKCkge1xyXG5cclxuICAgICAgICB0aGlzLnJlcyA9IC0xXHJcbiAgICAgICAgdGhpcy5jdXJzb3IoKVxyXG4gICAgICAgIHJldHVybiB0aGlzLm1vZGVzKClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbGFiZWwgKCBzdHJpbmcsIG4gKSB7XHJcblxyXG4gICAgICAgIG4gPSBuIHx8IDI7XHJcbiAgICAgICAgdGhpcy5jW25dLnRleHRDb250ZW50ID0gc3RyaW5nXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHN3aXRjaFZhbHVlcyggbiwgc3RyaW5nICl7XHJcbiAgICAgICAgdGhpcy5jW24rMl0uaW5uZXJIVE1MID0gdGhpcy52YWx1ZXNbbl0gPSBzdHJpbmc7XHJcbiAgICB9XHJcblxyXG4gICAgaWNvbiAoIHN0cmluZywgeSA9IDAsIG4gPSAyICkge1xyXG5cclxuICAgICAgICAvL2lmKHkpIHRoaXMuc1tuXS5tYXJnaW4gPSAoIHkgKSArJ3B4IDBweCc7XHJcbiAgICAgICAgdGhpcy5zW25dLnBhZGRpbmcgPSAoIHkgKSArJ3B4IDBweCc7XHJcbiAgICAgICAgdGhpcy5jW25dLmlubmVySFRNTCA9IHN0cmluZztcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXNcclxuXHJcbiAgICB9XHJcblxyXG4gICAgclNpemUgKCkge1xyXG5cclxuICAgICAgICBzdXBlci5yU2l6ZSgpO1xyXG5cclxuICAgICAgICBsZXQgcyA9IHRoaXMucztcclxuICAgICAgICBsZXQgdyA9IHRoaXMuc2I7XHJcbiAgICAgICAgbGV0IGQgPSB0aGlzLnNhO1xyXG5cclxuICAgICAgICBsZXQgaSA9IHRoaXMubG5nO1xyXG4gICAgICAgIGxldCBzeCA9IHRoaXMuY29sb3JzLnN4IC8vdGhpcy5zcGFjZTtcclxuICAgICAgICAvL2xldCBzaXplID0gTWF0aC5mbG9vciggKCB3LShkYyooaS0xKSkgKSAvIGkgKTtcclxuICAgICAgICBsZXQgc2l6ZSA9ICggdy0oc3gqKGktMSkpICkgLyBpIFxyXG5cclxuICAgICAgICBpZiggdGhpcy5idyApeyBcclxuICAgICAgICAgICAgc2l6ZSA9IHRoaXMuYncgPCBzaXplID8gdGhpcy5idyA6IHNpemVcclxuICAgICAgICAgICAgLy9kID0gTWF0aC5mbG9vcigodGhpcy53LSggKHNpemUgKiBpKSArIChkYyAqIChpLTEpKSApKSowLjUpXHJcbiAgICAgICAgICAgIGQgPSAoKHRoaXMudy0oIChzaXplICogaSkgKyAoc3ggKiAoaS0xKSkgKSkqMC41KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgd2hpbGUoIGktLSApe1xyXG5cclxuICAgICAgICBcdC8vdGhpcy50bXBbaV0gPSBbIE1hdGguZmxvb3IoIGQgKyAoIHNpemUgKiBpICkgKyAoIGRjICogaSApKSwgc2l6ZSBdO1xyXG4gICAgICAgICAgICB0aGlzLnRtcFtpXSA9IFsgKCBkICsgKCBzaXplICogaSApICsgKCBzeCAqIGkgKSksIHNpemUgXTtcclxuICAgICAgICBcdHRoaXMudG1wW2ldWzJdID0gdGhpcy50bXBbaV1bMF0gKyB0aGlzLnRtcFtpXVsxXTtcclxuXHJcbiAgICAgICAgICAgIHNbaSsyXS5sZWZ0ID0gdGhpcy50bXBbaV1bMF0gKyAncHgnXHJcbiAgICAgICAgICAgIHNbaSsyXS53aWR0aCA9IHRoaXMudG1wW2ldWzFdICsgJ3B4J1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcyc7XHJcbmltcG9ydCB7IFRvb2xzIH0gZnJvbSAnLi4vY29yZS9Ub29scy5qcyc7XHJcbmltcG9ydCB7IFYyIH0gZnJvbSAnLi4vY29yZS9WMi5qcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQ2lyY3VsYXIgZXh0ZW5kcyBQcm90byB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoIG8gPSB7fSApIHtcclxuXHJcbiAgICAgICAgc3VwZXIoIG8gKVxyXG5cclxuICAgICAgICB0aGlzLmlzQ3ljbGljID0gby5jeWNsaWMgfHwgZmFsc2VcclxuICAgICAgICB0aGlzLm1vZGVsID0gby5zdHlwZSB8fCAwXHJcbiAgICAgICAgaWYoIG8ubW9kZSAhPT0gdW5kZWZpbmVkICkgdGhpcy5tb2RlbCA9IG8ubW9kZVxyXG5cclxuICAgICAgICB0aGlzLmF1dG9XaWR0aCA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5taW53ID0gdGhpcy53XHJcbiAgICAgICAgdGhpcy5kaWFtID0gby5kaWFtIHx8IHRoaXMudyBcclxuXHJcbiAgICAgICAgdGhpcy5zZXRUeXBlTnVtYmVyKCBvIClcclxuXHJcbiAgICAgICAgdGhpcy50d29QaSA9IFRvb2xzLlR3b1BJXHJcbiAgICAgICAgdGhpcy5waTkwID0gVG9vbHMucGk5MFxyXG5cclxuICAgICAgICB0aGlzLm9mZnNldCA9IG5ldyBWMigpXHJcblxyXG4gICAgICAgIHRoaXMuaCA9IG8uaCB8fCB0aGlzLncgKyAxMFxyXG5cclxuICAgICAgICB0aGlzLmNbMF0uc3R5bGUud2lkdGggPSB0aGlzLncgKydweCdcclxuICAgICAgICB0aGlzLmNbMF0uc3R5bGUuZGlzcGxheSA9ICdibG9jaydcclxuXHJcbiAgICAgICAgaWYodGhpcy5jWzFdICE9PSB1bmRlZmluZWQpIHtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY1sxXS5zdHlsZS53aWR0aCA9ICcxMDAlJ1xyXG4gICAgICAgICAgICB0aGlzLmNbMV0uc3R5bGUuanVzdGlmeUNvbnRlbnQgPSAnY2VudGVyJ1xyXG4gICAgICAgICAgICB0aGlzLnRvcCA9IDEwXHJcbiAgICAgICAgICAgIHRoaXMuaCArPSAxMFxyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5wZXJjZW50ID0gMFxyXG4gICAgICAgIHRoaXMuY21vZGUgPSAwXHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnNcclxuXHJcbiAgICAgICAgdGhpcy5jWzJdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHQgKyAnanVzdGlmeS1jb250ZW50OmNlbnRlcjsgdG9wOicrKHRoaXMuaC0yMCkrJ3B4OyB3aWR0aDoxMDAlOyBjb2xvcjonKyBjYy50ZXh0IClcclxuXHJcbiAgICAgICAgLy8gc3ZnXHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5jWzNdID0gdGhpcy5nZXRDaXJjdWxhcigpXHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjYy5iYWNrLCAwIClcclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZCcsIHRoaXMubWFrZVBhdGgoKSwgMSApXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNjLnRleHQsIDEgKVxyXG5cclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAndmlld0JveCcsICcwIDAgJyt0aGlzLmRpYW0rJyAnK3RoaXMuZGlhbSApXHJcbiAgICAgICAgdGhpcy5zZXRDc3MoIHRoaXMuY1szXSwgeyB3aWR0aDp0aGlzLmRpYW0sIGhlaWdodDp0aGlzLmRpYW0sIGxlZnQ6MCwgdG9wOnRoaXMudG9wIH0pXHJcblxyXG4gICAgICAgIHRoaXMuaW5pdCgpXHJcbiAgICAgICAgdGhpcy51cGRhdGUoKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb2RlICggbW9kZSApIHtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuY21vZGUgPT09IG1vZGUgKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgICAgIGxldCBjYyA9IHRoaXMuY29sb3JzXHJcbiAgICAgICAgbGV0IGNvbG9yXHJcblxyXG4gICAgICAgIHN3aXRjaCggbW9kZSApe1xyXG4gICAgICAgICAgICBjYXNlIDA6IC8vIGJhc2VcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNbMl0uY29sb3IgPSBjYy50ZXh0O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNjLmJhY2ssIDApO1xyXG4gICAgICAgICAgICAgICAgY29sb3IgPSB0aGlzLm1vZGVsID4gMCA/IFRvb2xzLnBhY2soIFRvb2xzLmxlcnBDb2xvciggVG9vbHMudW5wYWNrKCBUb29scy5Db2xvckx1bWEoIGNjLnRleHQsIC0wLjc1KSApLCBUb29scy51bnBhY2soIGNjLnRleHQgKSwgdGhpcy5wZXJjZW50ICkgKSA6IGNjLnRleHQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgY29sb3IsIDEgKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOiAvLyBkb3duXHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5zWzJdLmNvbG9yID0gY2MudGV4dE92ZXI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgY2MuYmFja29mZiwgMCk7XHJcbiAgICAgICAgICAgICAgICBjb2xvciA9IHRoaXMubW9kZWwgPiAwID8gVG9vbHMucGFjayggVG9vbHMubGVycENvbG9yKCBUb29scy51bnBhY2soIFRvb2xzLkNvbG9yTHVtYSggY2MudGV4dCwgLTAuNzUpICksIFRvb2xzLnVucGFjayggY2MudGV4dCApLCB0aGlzLnBlcmNlbnQgKSApIDogY2MudGV4dE92ZXJcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjb2xvciwgMSApO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5jbW9kZSA9IG1vZGU7XHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJlc2V0ICgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICB0ZXN0Wm9uZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBsID0gdGhpcy5sb2NhbDtcclxuICAgICAgICBpZiggbC54ID09PSAtMSAmJiBsLnkgPT09IC0xICkgcmV0dXJuICcnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmKCBsLnkgPD0gdGhpcy5jWyAxIF0ub2Zmc2V0SGVpZ2h0ICkgcmV0dXJuICd0aXRsZSc7XHJcbiAgICAgICAgZWxzZSBpZiAoIGwueSA+IHRoaXMuaCAtIHRoaXMuY1sgMiBdLm9mZnNldEhlaWdodCApIHJldHVybiAndGV4dCc7XHJcbiAgICAgICAgZWxzZSByZXR1cm4gJ2NpcmN1bGFyJztcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBFVkVOVFNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBtb3VzZXVwICggZSApIHtcclxuXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnNlbmRFbmQoKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5tb2RlKDApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZWRvd24gKCBlICkge1xyXG5cclxuICAgICAgICB0aGlzLmlzRG93biA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5vbGQgPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgIHRoaXMub2xkciA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5tb3VzZW1vdmUoIGUgKTtcclxuICAgICAgICByZXR1cm4gdGhpcy5tb2RlKDEpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZW1vdmUgKCBlICkge1xyXG5cclxuICAgICAgICBpZiggIXRoaXMuaXNEb3duICkgcmV0dXJuO1xyXG5cclxuICAgICAgICAvL2NvbnNvbGUubG9nKCdvdmVyJylcclxuXHJcbiAgICAgICAgbGV0IG9mZiA9IHRoaXMub2Zmc2V0O1xyXG4gICAgICAgIG9mZi54ID0gKHRoaXMudyowLjUpIC0gKCBlLmNsaWVudFggLSB0aGlzLnpvbmUueCApO1xyXG4gICAgICAgIG9mZi55ID0gKHRoaXMuZGlhbSowLjUpIC0gKCBlLmNsaWVudFkgLSB0aGlzLnpvbmUueSAtIHRoaXMueXRvcCApO1xyXG5cclxuICAgICAgICB0aGlzLnIgPSBvZmYuYW5nbGUoKSAtIHRoaXMucGk5MDtcclxuICAgICAgICB0aGlzLnIgPSAoKCh0aGlzLnIldGhpcy50d29QaSkrdGhpcy50d29QaSkldGhpcy50d29QaSk7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLm9sZHIgIT09IG51bGwgKXsgXHJcblxyXG4gICAgICAgICAgICBsZXQgZGlmID0gdGhpcy5yIC0gdGhpcy5vbGRyO1xyXG4gICAgICAgICAgICB0aGlzLnIgPSBNYXRoLmFicyhkaWYpID4gTWF0aC5QSSA/IHRoaXMub2xkciA6IHRoaXMucjtcclxuXHJcbiAgICAgICAgICAgIGlmKCBkaWYgPiA2ICkgdGhpcy5yID0gMDtcclxuICAgICAgICAgICAgaWYoIGRpZiA8IC02ICkgdGhpcy5yID0gdGhpcy50d29QaTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgc3RlcHMgPSAxIC8gdGhpcy50d29QaTtcclxuICAgICAgICBsZXQgdmFsdWUgPSB0aGlzLnIgKiBzdGVwcztcclxuXHJcbiAgICAgICAgbGV0IG4gPSAoICggdGhpcy5yYW5nZSAqIHZhbHVlICkgKyB0aGlzLm1pbiApIC0gdGhpcy5vbGQ7XHJcblxyXG4gICAgICAgIGlmKG4gPj0gdGhpcy5zdGVwIHx8IG4gPD0gdGhpcy5zdGVwKXsgXHJcbiAgICAgICAgICAgIG4gPSB+fiAoIG4gLyB0aGlzLnN0ZXAgKTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHRoaXMubnVtVmFsdWUoIHRoaXMub2xkICsgKCBuICogdGhpcy5zdGVwICkgKTtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoIHRydWUgKTtcclxuICAgICAgICAgICAgdGhpcy5vbGQgPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICB0aGlzLm9sZHIgPSB0aGlzLnI7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICB3aGVlbCAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZSggZSApO1xyXG5cclxuICAgICAgICBpZiggbmFtZSA9PT0gJ2NpcmN1bGFyJyApIHtcclxuICAgIFxyXG4gICAgICAgICAgICBsZXQgdiA9IHRoaXMudmFsdWUgLSB0aGlzLnN0ZXAgKiBlLmRlbHRhO1xyXG4gICAgXHJcbiAgICAgICAgICAgIGlmICggdiA+IHRoaXMubWF4ICkge1xyXG4gICAgICAgICAgICAgICAgdiA9IHRoaXMuaXNDeWNsaWMgPyB0aGlzLm1pbiA6IHRoaXMubWF4O1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCB2IDwgdGhpcy5taW4gKSB7XHJcbiAgICAgICAgICAgICAgICB2ID0gdGhpcy5pc0N5Y2xpYyA/IHRoaXMubWF4IDogdGhpcy5taW47XHJcbiAgICAgICAgICAgIH1cclxuICAgIFxyXG4gICAgICAgICAgICB0aGlzLnNldFZhbHVlKCB2ICk7XHJcbiAgICAgICAgICAgIHRoaXMub2xkID0gdjtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoIHRydWUgKTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIG1ha2VQYXRoICgpIHtcclxuXHJcbiAgICAgICAgbGV0IHIgPSA0MDtcclxuICAgICAgICBsZXQgZCA9IDI0O1xyXG4gICAgICAgIGxldCBhID0gdGhpcy5wZXJjZW50ICogdGhpcy50d29QaSAtIDAuMDAxO1xyXG4gICAgICAgIGxldCB4MiA9IChyICsgciAqIE1hdGguc2luKGEpKSArIGQ7XHJcbiAgICAgICAgbGV0IHkyID0gKHIgLSByICogTWF0aC5jb3MoYSkpICsgZDtcclxuICAgICAgICBsZXQgYmlnID0gYSA+IE1hdGguUEkgPyAxIDogMDtcclxuICAgICAgICByZXR1cm4gXCJNIFwiICsgKHIrZCkgKyBcIixcIiArIGQgKyBcIiBBIFwiICsgciArIFwiLFwiICsgciArIFwiIDAgXCIgKyBiaWcgKyBcIiAxIFwiICsgeDIgKyBcIixcIiArIHkyO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGUgKCB1cCApIHtcclxuXHJcbiAgICAgICAgdGhpcy5jWzJdLnRleHRDb250ZW50ID0gdGhpcy52YWx1ZTtcclxuICAgICAgICB0aGlzLnBlcmNlbnQgPSAoIHRoaXMudmFsdWUgLSB0aGlzLm1pbiApIC8gdGhpcy5yYW5nZTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2QnLCB0aGlzLm1ha2VQYXRoKCksIDEgKTtcclxuXHJcbiAgICAgICAgaWYgKCB0aGlzLm1vZGVsID4gMCApIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBjYyA9IHRoaXMuY29sb3JzXHJcbiAgICAgICAgICAgIGxldCBjb2xvciA9IFRvb2xzLnBhY2soIFRvb2xzLmxlcnBDb2xvciggVG9vbHMudW5wYWNrKCBUb29scy5Db2xvckx1bWEoIGNjLnRleHQsIC0wLjc1KSApLCBUb29scy51bnBhY2soIGNjLnRleHQgKSwgdGhpcy5wZXJjZW50ICkgKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNvbG9yLCAxICk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggdXAgKSB0aGlzLnNlbmQoKTtcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBUb29scyB9IGZyb20gJy4uL2NvcmUvVG9vbHMuanMnO1xyXG5pbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5pbXBvcnQgeyBWMiB9IGZyb20gJy4uL2NvcmUvVjIuanMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIENvbG9yIGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvICk7XHJcblxyXG5cdCAgICAvL3RoaXMuYXV0b0hlaWdodCA9IHRydWU7XHJcblxyXG5cdCAgICB0aGlzLmN0eXBlID0gby5jdHlwZSB8fCAnaGV4JztcclxuXHJcblx0ICAgIHRoaXMud2ZpeGUgPSAyNTY7XHJcblxyXG5cdCAgICB0aGlzLmN3ID0gdGhpcy5zYiA+IDI1NiA/IDI1NiA6IHRoaXMuc2I7XHJcblx0ICAgIGlmKG8uY3cgIT0gdW5kZWZpbmVkICkgdGhpcy5jdyA9IG8uY3c7XHJcblxyXG5cclxuXHJcblx0ICAgIC8vIGNvbG9yIHVwIG9yIGRvd25cclxuXHQgICAgdGhpcy5zaWRlID0gby5zaWRlIHx8ICdkb3duJztcclxuXHQgICAgdGhpcy51cCA9IHRoaXMuc2lkZSA9PT0gJ2Rvd24nID8gMCA6IDE7XHJcblx0ICAgIFxyXG5cdCAgICB0aGlzLmJhc2VIID0gdGhpcy5oO1xyXG5cclxuXHQgICAgdGhpcy5vZmZzZXQgPSBuZXcgVjIoKTtcclxuXHQgICAgdGhpcy5kZWNhbCA9IG5ldyBWMigpO1xyXG5cdCAgICB0aGlzLnBwID0gbmV3IFYyKCk7XHJcblxyXG5cdCAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuXHQgICAvLyB0aGlzLmNbMl0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLnR4dCArIHRoaXMuY3NzLm1pZGRsZSArICd0b3A6MXB4OyBoZWlnaHQ6JysodGhpcy5oLTIpKydweDsnICsgJ2JvcmRlci1yYWRpdXM6Jyt0aGlzLnJhZGl1cysncHg7IHRleHQtc2hhZG93Om5vbmU7IGJvcmRlcjonK2NjLmJvcmRlclNpemUrJ3B4IHNvbGlkICcrY2MuYm9yZGVyKyc7JyApXHJcblxyXG5cdCAgICB0aGlzLmNbMl0gPSB0aGlzLmRvbSggJ2RpdicsIGAke3RoaXMuY3NzLnR4dH0gJHt0aGlzLmNzcy5taWRkbGV9IHRvcDoxcHg7IGhlaWdodDoke3RoaXMuaC0yfXB4OyBib3JkZXItcmFkaXVzOiR7dGhpcy5yYWRpdXN9cHg7IHRleHQtc2hhZG93Om5vbmU7IGJvcmRlcjoke2NjLmJvcmRlclNpemV9cHggc29saWQgJHtjYy5ib3JkZXJ9O2AgKVxyXG5cdCAgICAvL3RoaXMuc1syXSA9IHRoaXMuY1syXS5zdHlsZTtcclxuXHJcblx0ICAgIC8vdGhpcy5zWzJdLnRleHRTaGFkb3cgPSAnbm9uZSdcclxuXHJcblx0ICAgIC8qaWYoIHRoaXMudXAgKXtcclxuXHQgICAgICAgIHRoaXMuc1syXS50b3AgPSAnYXV0byc7XHJcblx0ICAgICAgICB0aGlzLnNbMl0uYm90dG9tID0gJzJweCc7XHJcblx0ICAgIH0qL1xyXG5cclxuXHQgICAgLy90aGlzLmNbMF0uc3R5bGUudGV4dEFsaWduID0gJ2NlbnRlcic7XHJcblx0ICAgIHRoaXMuY1swXS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJ1xyXG5cclxuXHQgICAgdGhpcy5jWzNdID0gdGhpcy5nZXRDb2xvclJpbmcoKVxyXG5cdCAgICB0aGlzLmNbM10uc3R5bGUudmlzaWJpbGl0eSAgPSAnaGlkZGVuJ1xyXG5cclxuXHQgICAgdGhpcy5oc2wgPSBudWxsXHJcblx0ICAgIHRoaXMudmFsdWUgPSAnI2ZmZmZmZidcclxuXHQgICAgaWYoIG8udmFsdWUgIT09IHVuZGVmaW5lZCApe1xyXG5cdCAgICAgICAgaWYoIG8udmFsdWUgaW5zdGFuY2VvZiBBcnJheSApIHRoaXMudmFsdWUgPSBUb29scy5yZ2JUb0hleCggby52YWx1ZSApXHJcblx0ICAgICAgICBlbHNlIGlmKCFpc05hTihvLnZhbHVlKSkgdGhpcy52YWx1ZSA9IFRvb2xzLmhleFRvSHRtbCggby52YWx1ZSApXHJcblx0ICAgICAgICBlbHNlIHRoaXMudmFsdWUgPSBvLnZhbHVlXHJcblx0ICAgIH1cclxuXHJcblx0ICAgIHRoaXMuYmNvbG9yID0gbnVsbFxyXG5cdCAgICB0aGlzLmlzRG93biA9IGZhbHNlXHJcblx0ICAgIHRoaXMuZmlzdERvd24gPSBmYWxzZVxyXG5cclxuXHQgICAgdGhpcy5ub3RleHQgPSBvLm5vdGV4dCB8fCBmYWxzZVxyXG5cclxuXHQgICAgdGhpcy50ciA9IDk4XHJcblx0ICAgIHRoaXMudHNsID0gTWF0aC5zcXJ0KDMpICogdGhpcy50clxyXG5cclxuXHQgICAgdGhpcy5odWUgPSAwXHJcblx0ICAgIHRoaXMuZCA9IDI1NlxyXG5cclxuXHQgICAgdGhpcy5pbml0KClcclxuXHJcblx0ICAgIHRoaXMuc2V0Q29sb3IoIHRoaXMudmFsdWUgKVxyXG5cclxuXHQgICAgaWYoIG8ub3BlbiAhPT0gdW5kZWZpbmVkICkgdGhpcy5vcGVuKClcclxuXHJcblx0fVxyXG5cclxuXHR0ZXN0Wm9uZSAoIG14LCBteSApIHtcclxuXHJcblx0XHRsZXQgbCA9IHRoaXMubG9jYWxcclxuXHRcdGlmKCBsLnggPT09IC0xICYmIGwueSA9PT0gLTEgKSByZXR1cm4gJydcclxuXHJcblx0XHRpZiggdGhpcy51cCAmJiB0aGlzLmlzT3BlbiApe1xyXG5cclxuXHRcdFx0aWYoIGwueSA+IHRoaXMud2ZpeGUgKSByZXR1cm4gJ3RpdGxlJ1xyXG5cdFx0ICAgIGVsc2UgcmV0dXJuICdjb2xvcidcclxuXHJcblx0XHR9IGVsc2Uge1xyXG5cclxuXHRcdFx0aWYoIGwueSA8IHRoaXMuYmFzZUgrMiApIHJldHVybiAndGl0bGUnXHJcblx0ICAgIFx0ZWxzZSBpZiggdGhpcy5pc09wZW4gKSByZXR1cm4gJ2NvbG9yJ1xyXG5cclxuXHRcdH1cclxuXHJcbiAgICB9XHJcblxyXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgRVZFTlRTXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG5cdG1vdXNldXAgKCBlICkge1xyXG5cclxuXHQgICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcclxuXHQgICAgdGhpcy5kID0gMjU2O1xyXG5cclxuXHR9XHJcblxyXG5cdG1vdXNlZG93biAoIGUgKSB7XHJcblxyXG5cclxuXHRcdGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZSggZS5jbGllbnRYLCBlLmNsaWVudFkgKTtcclxuXHJcblxyXG5cdFx0Ly9pZiggIW5hbWUgKSByZXR1cm47XHJcblx0XHRpZihuYW1lID09PSAndGl0bGUnKXtcclxuXHRcdFx0aWYoICF0aGlzLmlzT3BlbiApIHRoaXMub3BlbigpO1xyXG5cdCAgICAgICAgZWxzZSB0aGlzLmNsb3NlKCk7XHJcblx0ICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHRcdH1cclxuXHJcblxyXG5cdFx0aWYoIG5hbWUgPT09ICdjb2xvcicgKXtcclxuXHJcblx0XHRcdHRoaXMuaXNEb3duID0gdHJ1ZTtcclxuXHRcdFx0dGhpcy5maXN0RG93biA9IHRydWVcclxuXHRcdFx0dGhpcy5tb3VzZW1vdmUoIGUgKTtcclxuXHRcdH1cclxuXHR9XHJcblxyXG5cdG1vdXNlbW92ZSAoIGUgKSB7XHJcblxyXG5cdCAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoIGUuY2xpZW50WCwgZS5jbGllbnRZICk7XHJcblxyXG5cdCAgICBsZXQgb2ZmLCBkLCBodWUsIHNhdCwgbHVtLCByYWQsIHgsIHksIHJyLCBUID0gVG9vbHM7XHJcblxyXG5cdCAgICBpZiggbmFtZSA9PT0gJ3RpdGxlJyApIHRoaXMuY3Vyc29yKCdwb2ludGVyJyk7XHJcblxyXG5cdCAgICBpZiggbmFtZSA9PT0gJ2NvbG9yJyApe1xyXG5cclxuXHQgICAgXHRvZmYgPSB0aGlzLm9mZnNldDtcclxuXHRcdCAgICBvZmYueCA9IGUuY2xpZW50WCAtICggdGhpcy56b25lLnggKyB0aGlzLmRlY2FsLnggKyB0aGlzLm1pZCApO1xyXG5cdFx0ICAgIG9mZi55ID0gZS5jbGllbnRZIC0gKCB0aGlzLnpvbmUueSArIHRoaXMuZGVjYWwueSArIHRoaXMubWlkICkgLSB0aGlzLnl0b3A7XHJcblx0XHRcdGQgPSBvZmYubGVuZ3RoKCkgKiB0aGlzLnJhdGlvO1xyXG5cdFx0XHRyciA9IG9mZi5hbmdsZSgpO1xyXG5cdFx0XHRpZihyciA8IDApIHJyICs9IDIgKiBULlBJO1xyXG5cdFx0XHRcdFx0XHRcclxuXHJcblx0ICAgIFx0aWYgKCBkIDwgMTI4ICkgdGhpcy5jdXJzb3IoJ2Nyb3NzaGFpcicpO1xyXG5cdCAgICBcdGVsc2UgaWYoICF0aGlzLmlzRG93biApIHRoaXMuY3Vyc29yKClcclxuXHJcblx0ICAgIFx0aWYoIHRoaXMuaXNEb3duICl7XHJcblxyXG5cdFx0XHQgICAgaWYoIHRoaXMuZmlzdERvd24gKXtcclxuXHRcdFx0ICAgIFx0dGhpcy5kID0gZDtcclxuXHRcdFx0ICAgIFx0dGhpcy5maXN0RG93biA9IGZhbHNlO1xyXG5cdFx0XHQgICAgfVxyXG5cclxuXHRcdFx0ICAgIGlmICggdGhpcy5kIDwgMTI4ICkge1xyXG5cclxuXHRcdFx0XHQgICAgaWYgKCB0aGlzLmQgPiB0aGlzLnRyICkgeyAvLyBvdXRzaWRlIGh1ZVxyXG5cclxuXHRcdFx0XHQgICAgICAgIGh1ZSA9ICggcnIgKyBULnBpOTAgKSAvIFQuVHdvUEk7XHJcblx0XHRcdFx0ICAgICAgICB0aGlzLmh1ZSA9IChodWUgKyAxKSAlIDE7XHJcblx0XHRcdFx0ICAgICAgICB0aGlzLnNldEhTTChbKGh1ZSArIDEpICUgMSwgdGhpcy5oc2xbMV0sIHRoaXMuaHNsWzJdXSk7XHJcblxyXG5cdFx0XHRcdCAgICB9IGVsc2UgeyAvLyB0cmlhbmdsZVxyXG5cclxuXHRcdFx0XHQgICAgXHR4ID0gb2ZmLnggKiB0aGlzLnJhdGlvO1xyXG5cdFx0XHRcdCAgICBcdHkgPSBvZmYueSAqIHRoaXMucmF0aW87XHJcblxyXG5cdFx0XHRcdCAgICBcdGxldCByciA9ICh0aGlzLmh1ZSAqIFQuVHdvUEkpICsgVC5QSTtcclxuXHRcdFx0XHQgICAgXHRpZihyciA8IDApIHJyICs9IDIgKiBULlBJO1xyXG5cclxuXHRcdFx0XHQgICAgXHRyYWQgPSBNYXRoLmF0YW4yKC15LCB4KTtcclxuXHRcdFx0XHQgICAgXHRpZihyYWQgPCAwKSByYWQgKz0gMiAqIFQuUEk7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdCAgICBcdGxldCByYWQwID0gKCByYWQgKyBULnBpOTAgKyBULlR3b1BJICsgcnIgKSAlIChULlR3b1BJKSxcclxuXHRcdFx0XHQgICAgXHRyYWQxID0gcmFkMCAlICgoMi8zKSAqIFQuUEkpIC0gKFQucGk2MCksXHJcblx0XHRcdFx0ICAgIFx0YSAgICA9IDAuNSAqIHRoaXMudHIsXHJcblx0XHRcdFx0ICAgIFx0YiAgICA9IE1hdGgudGFuKHJhZDEpICogYSxcclxuXHRcdFx0XHQgICAgXHRyICAgID0gTWF0aC5zcXJ0KHgqeCArIHkqeSksXHJcblx0XHRcdFx0ICAgIFx0bWF4UiA9IE1hdGguc3FydChhKmEgKyBiKmIpO1xyXG5cclxuXHRcdFx0XHQgICAgXHRpZiggciA+IG1heFIgKSB7XHJcblx0XHRcdFx0XHRcdFx0bGV0IGR4ID0gTWF0aC50YW4ocmFkMSkgKiByO1xyXG5cdFx0XHRcdFx0XHRcdGxldCByYWQyID0gTWF0aC5hdGFuKGR4IC8gbWF4Uik7XHJcblx0XHRcdFx0XHRcdFx0aWYocmFkMiA+IFQucGk2MCkgIHJhZDIgPSBULnBpNjA7XHJcblx0XHRcdFx0XHRcdCAgICBlbHNlIGlmKCByYWQyIDwgLVQucGk2MCApIHJhZDIgPSAtVC5waTYwO1xyXG5cdFx0XHRcdFx0XHRcclxuXHRcdFx0XHRcdFx0XHRyYWQgKz0gcmFkMiAtIHJhZDE7XHJcblxyXG5cdFx0XHRcdFx0XHRcdHJhZDAgPSAocmFkICsgVC5waTkwICArIFQuVHdvUEkgKyBycikgJSAoVC5Ud29QSSksXHJcblx0XHRcdFx0XHRcdFx0cmFkMSA9IHJhZDAgJSAoKDIvMykgKiBULlBJKSAtIChULnBpNjApO1xyXG5cdFx0XHRcdFx0XHRcdGIgPSBNYXRoLnRhbihyYWQxKSAqIGE7XHJcblx0XHRcdFx0XHRcdFx0ciA9IG1heFIgPSBNYXRoLnNxcnQoYSphICsgYipiKTtcclxuXHRcdFx0XHRcdFx0fVxyXG5cclxuXHRcdFx0XHRcdFx0bHVtID0gKChNYXRoLnNpbihyYWQwKSAqIHIpIC8gdGhpcy50c2wpICsgMC41O1xyXG5cdFx0XHRcdFxyXG5cdFx0XHRcdFx0XHRsZXQgdyA9IDEgLSAoTWF0aC5hYnMobHVtIC0gMC41KSAqIDIpO1xyXG5cdFx0XHRcdFx0XHRzYXQgPSAoKChNYXRoLmNvcyhyYWQwKSAqIHIpICsgKHRoaXMudHIgLyAyKSkgLyAoMS41ICogdGhpcy50cikpIC8gdztcclxuXHRcdFx0XHRcdFx0c2F0ID0gVC5jbGFtcCggc2F0LCAwLCAxICk7XHJcblx0XHRcdFx0XHRcdFxyXG5cdFx0XHRcdCAgICAgICAgdGhpcy5zZXRIU0woW3RoaXMuaHNsWzBdLCBzYXQsIGx1bV0pO1xyXG5cclxuXHRcdFx0XHQgICAgfVxyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cclxuXHR9XHJcblxyXG5cdC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcblx0c2V0SGVpZ2h0ICgpIHtcclxuXHJcblx0XHR0aGlzLmggPSB0aGlzLmlzT3BlbiA/IHRoaXMud2ZpeGUgKyB0aGlzLmJhc2VIICsgNSA6IHRoaXMuYmFzZUhcclxuXHRcdHRoaXMuc1swXS5oZWlnaHQgPSB0aGlzLmggKyAncHgnXHJcblx0XHR0aGlzLnpvbmUuaCA9IHRoaXMuaFxyXG5cclxuXHR9XHJcblxyXG5cdHBhcmVudEhlaWdodCAoIHQgKSB7XHJcblxyXG5cdFx0aWYgKCB0aGlzLmdyb3VwICE9PSBudWxsICkgdGhpcy5ncm91cC5jYWxjKCB0ICk7XHJcblx0ICAgIGVsc2UgaWYgKCB0aGlzLmlzVUkgKSB0aGlzLm1haW4uY2FsYyggdCApO1xyXG5cclxuXHR9XHJcblxyXG5cdG9wZW4gKCkge1xyXG5cclxuXHRcdHN1cGVyLm9wZW4oKTtcclxuXHJcblx0XHR0aGlzLnNldEhlaWdodCgpO1xyXG5cclxuXHRcdGlmKCB0aGlzLnVwICkgdGhpcy56b25lLnkgLT0gdGhpcy53Zml4ZSArIDU7XHJcblxyXG5cdFx0bGV0IHQgPSB0aGlzLmggLSB0aGlzLmJhc2VIO1xyXG5cclxuXHQgICAgdGhpcy5zWzNdLnZpc2liaWxpdHkgPSAndmlzaWJsZSc7XHJcblx0ICAgIC8vdGhpcy5zWzNdLmRpc3BsYXkgPSAnYmxvY2snO1xyXG5cdCAgICB0aGlzLnBhcmVudEhlaWdodCggdCApO1xyXG5cclxuXHR9XHJcblxyXG5cdGNsb3NlICgpIHtcclxuXHJcblx0XHRzdXBlci5jbG9zZSgpO1xyXG5cclxuXHRcdGlmKCB0aGlzLnVwICkgdGhpcy56b25lLnkgKz0gdGhpcy53Zml4ZSArIDU7XHJcblxyXG5cdFx0bGV0IHQgPSB0aGlzLmggLSB0aGlzLmJhc2VIO1xyXG5cclxuXHRcdHRoaXMuc2V0SGVpZ2h0KCk7XHJcblxyXG5cdCAgICB0aGlzLnNbM10udmlzaWJpbGl0eSAgPSAnaGlkZGVuJztcclxuXHQgICAgLy90aGlzLnNbM10uZGlzcGxheSA9ICdub25lJztcclxuXHQgICAgdGhpcy5wYXJlbnRIZWlnaHQoIC10ICk7XHJcblxyXG5cdH1cclxuXHJcblx0dXBkYXRlICggdXAgKSB7XHJcblxyXG5cdCAgICBsZXQgY2MgPSBUb29scy5yZ2JUb0hleCggVG9vbHMuaHNsVG9SZ2IoWyB0aGlzLmhzbFswXSwgMSwgMC41IF0pICk7XHJcblxyXG5cdCAgICB0aGlzLm1vdmVNYXJrZXJzKCk7XHJcblx0ICAgIFxyXG5cdCAgICB0aGlzLnZhbHVlID0gdGhpcy5iY29sb3I7XHJcblxyXG5cdCAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbCcsIGNjLCAyLCAwICk7XHJcblxyXG5cdCAgICB0aGlzLnNbMl0uYmFja2dyb3VuZCA9IHRoaXMuYmNvbG9yO1xyXG5cdCAgICBpZighdGhpcy5ub3RleHQpIHRoaXMuY1syXS50ZXh0Q29udGVudCA9IFRvb2xzLmh0bWxUb0hleCggdGhpcy5iY29sb3IgKTtcclxuXHJcblx0ICAgIHRoaXMuaW52ZXJ0ID0gVG9vbHMuZmluZERlZXBJbnZlciggdGhpcy5yZ2IgKTtcclxuXHQgICAgdGhpcy5zWzJdLmNvbG9yID0gdGhpcy5pbnZlcnQgPyAnI2ZmZicgOiAnIzAwMCc7XHJcblxyXG5cdCAgICBpZighdXApIHJldHVybjtcclxuXHJcblx0ICAgIGlmKCB0aGlzLmN0eXBlID09PSAnYXJyYXknICkgdGhpcy5zZW5kKCB0aGlzLnJnYiApO1xyXG5cdCAgICBpZiggdGhpcy5jdHlwZSA9PT0gJ3JnYicgKSB0aGlzLnNlbmQoIFRvb2xzLmh0bWxSZ2IoIHRoaXMucmdiICkgKTtcclxuXHQgICAgaWYoIHRoaXMuY3R5cGUgPT09ICdoZXgnICkgdGhpcy5zZW5kKCBUb29scy5odG1sVG9IZXgoIHRoaXMudmFsdWUgKSApO1xyXG5cdCAgICBpZiggdGhpcy5jdHlwZSA9PT0gJ2h0bWwnICkgdGhpcy5zZW5kKCk7XHJcblxyXG5cdH1cclxuXHJcblx0c2V0VmFsdWUgKCB2ICl7XHJcblxyXG5cdFx0aWYoIHYgaW5zdGFuY2VvZiBBcnJheSApIHRoaXMudmFsdWUgPSBUb29scy5yZ2JUb0hleCggdiApO1xyXG4gICAgICAgIGVsc2UgaWYoIWlzTmFOKHYpKSB0aGlzLnZhbHVlID0gVG9vbHMuaGV4VG9IdG1sKCB2ICk7XHJcbiAgICAgICAgZWxzZSB0aGlzLnZhbHVlID0gdjtcclxuXHJcblx0XHR0aGlzLnNldENvbG9yKCB0aGlzLnZhbHVlIClcclxuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG5cclxuXHR9XHJcblxyXG5cdHNldENvbG9yICggY29sb3IgKSB7XHJcblxyXG5cdCAgICBsZXQgdW5wYWNrID0gVG9vbHMudW5wYWNrKGNvbG9yKTtcclxuXHQgICAgaWYgKHRoaXMuYmNvbG9yICE9PSBjb2xvciAmJiB1bnBhY2spIHtcclxuXHJcblx0ICAgICAgICB0aGlzLmJjb2xvciA9IGNvbG9yXHJcblx0ICAgICAgICB0aGlzLnJnYiA9IHVucGFja1xyXG5cdCAgICAgICAgdGhpcy5oc2wgPSBUb29scy5yZ2JUb0hzbCggdGhpcy5yZ2IgKVxyXG5cclxuXHQgICAgICAgIHRoaXMuaHVlID0gdGhpcy5oc2xbMF07XHJcblxyXG5cdCAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuXHQgICAgfVxyXG5cdCAgICByZXR1cm4gdGhpcztcclxuXHJcblx0fVxyXG5cclxuXHRzZXRIU0wgKCBoc2wgKSB7XHJcblxyXG5cdCAgICB0aGlzLmhzbCA9IGhzbDtcclxuXHQgICAgdGhpcy5yZ2IgPSBUb29scy5oc2xUb1JnYiggaHNsICk7XHJcblx0ICAgIHRoaXMuYmNvbG9yID0gVG9vbHMucmdiVG9IZXgoIHRoaXMucmdiICk7XHJcblx0ICAgIHRoaXMudXBkYXRlKCB0cnVlICk7XHJcblx0ICAgIHJldHVybiB0aGlzO1xyXG5cclxuXHR9XHJcblxyXG5cdG1vdmVNYXJrZXJzICgpIHtcclxuXHJcblx0XHRsZXQgcCA9IHRoaXMucHBcclxuXHRcdGxldCBUID0gVG9vbHNcclxuXHJcblx0ICAgIGxldCBjMSA9IHRoaXMuaW52ZXJ0ID8gJyNmZmYnIDogJyMwMDAnO1xyXG5cdCAgICBsZXQgYSA9IHRoaXMuaHNsWzBdICogVC5Ud29QSTtcclxuXHQgICAgbGV0IHRoaXJkID0gKDIvMykgKiBULlBJO1xyXG5cdCAgICBsZXQgciA9IHRoaXMudHI7XHJcblx0ICAgIGxldCBoID0gdGhpcy5oc2xbMF07XHJcblx0ICAgIGxldCBzID0gdGhpcy5oc2xbMV07XHJcblx0ICAgIGxldCBsID0gdGhpcy5oc2xbMl07XHJcblxyXG5cdCAgICBsZXQgYW5nbGUgPSAoIGEgLSBULnBpOTAgKSAqIFQudG9kZWc7XHJcblxyXG5cdCAgICBoID0gLSBhICsgVC5waTkwO1xyXG5cclxuXHRcdGxldCBoeCA9IE1hdGguY29zKGgpICogcjtcclxuXHRcdGxldCBoeSA9IC1NYXRoLnNpbihoKSAqIHI7XHJcblx0XHRsZXQgc3ggPSBNYXRoLmNvcyhoIC0gdGhpcmQpICogcjtcclxuXHRcdGxldCBzeSA9IC1NYXRoLnNpbihoIC0gdGhpcmQpICogcjtcclxuXHRcdGxldCB2eCA9IE1hdGguY29zKGggKyB0aGlyZCkgKiByO1xyXG5cdFx0bGV0IHZ5ID0gLU1hdGguc2luKGggKyB0aGlyZCkgKiByO1xyXG5cdFx0bGV0IG14ID0gKHN4ICsgdngpIC8gMiwgbXkgPSAoc3kgKyB2eSkgLyAyO1xyXG5cdFx0YSAgPSAoMSAtIDIgKiBNYXRoLmFicyhsIC0gLjUpKSAqIHM7XHJcblx0XHRsZXQgeCA9IHN4ICsgKHZ4IC0gc3gpICogbCArIChoeCAtIG14KSAqIGE7XHJcblx0XHRsZXQgeSA9IHN5ICsgKHZ5IC0gc3kpICogbCArIChoeSAtIG15KSAqIGE7XHJcblxyXG5cdCAgICBwLnNldCggeCwgeSApLmFkZFNjYWxhcigxMjgpO1xyXG5cclxuXHQgICAgLy9sZXQgZmYgPSAoMS1sKSoyNTU7XHJcblx0ICAgIC8vIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCAncmdiKCcrZmYrJywnK2ZmKycsJytmZisnKScsIDMgKTtcclxuXHJcblx0ICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICd0cmFuc2Zvcm0nLCAncm90YXRlKCcrYW5nbGUrJyApJywgMiApO1xyXG5cclxuXHQgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2N4JywgcC54LCAzICk7XHJcblx0ICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdjeScsIHAueSwgMyApO1xyXG5cdCAgICBcclxuXHQgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIHRoaXMuaW52ZXJ0ID8gJyNmZmYnIDogJyMwMDAnLCAyLCAzICk7XHJcblx0ICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCB0aGlzLmludmVydCA/ICcjZmZmJyA6ICcjMDAwJywgMyApO1xyXG5cdCAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbCcsdGhpcy5iY29sb3IsIDMgKTtcclxuXHJcblx0fVxyXG5cclxuXHRyU2l6ZSAoKSB7XHJcblxyXG5cdCAgICAvL1Byb3RvLnByb3RvdHlwZS5yU2l6ZS5jYWxsKCB0aGlzICk7XHJcblx0ICAgIHN1cGVyLnJTaXplKCk7XHJcblxyXG5cdCAgICBsZXQgcyA9IHRoaXMucztcclxuXHJcblx0ICAgIHNbMl0ud2lkdGggPSB0aGlzLnNiICsgJ3B4JztcclxuXHQgICAgc1syXS5sZWZ0ID0gdGhpcy5zYSArICdweCc7XHJcblxyXG5cdCAgICAvL2NvbnNvbGUubG9nKHRoaXMuc2IpXHJcblxyXG5cdCAgICB0aGlzLmN3ID0gdGhpcy5zYiA+IDI1NiA/IDI1NiA6IHRoaXMuc2I7XHJcblxyXG5cclxuXHJcblx0ICAgIHRoaXMuclNpemVDb2xvciggdGhpcy5jdyApO1xyXG5cclxuXHQgICAgdGhpcy5kZWNhbC54ID0gTWF0aC5mbG9vcigodGhpcy53IC0gdGhpcy53Zml4ZSkgKiAwLjUpO1xyXG5cdCAgICAvL3NbM10ubGVmdCA9IHRoaXMuZGVjYWwueCArICdweCc7XHJcblx0ICAgIFxyXG5cdH1cclxuXHJcblx0clNpemVDb2xvciAoIHcgKSB7XHJcblxyXG5cclxuXHRcdGlmKCB3ID09PSB0aGlzLndmaXhlICkgcmV0dXJuO1xyXG5cclxuXHJcblxyXG5cdFx0dGhpcy53Zml4ZSA9IHc7XHJcblxyXG5cclxuXHJcblx0XHRsZXQgcyA9IHRoaXMucztcclxuXHJcblx0XHQvL3RoaXMuZGVjYWwueCA9IE1hdGguZmxvb3IoKHRoaXMudyAtIHRoaXMud2ZpeGUpICogMC41KTtcclxuXHQgICAgdGhpcy5kZWNhbC55ID0gdGhpcy5zaWRlID09PSAndXAnID8gMiA6IHRoaXMuYmFzZUggKyAyXHJcblx0ICAgIHRoaXMubWlkID0gTWF0aC5mbG9vciggdGhpcy53Zml4ZSAqIDAuNSApXHJcblxyXG5cdCAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAndmlld0JveCcsICcwIDAgJysgdGhpcy53Zml4ZSArICcgJysgdGhpcy53Zml4ZSApXHJcblx0ICAgIHNbM10ud2lkdGggPSB0aGlzLndmaXhlICsgJ3B4J1xyXG5cdCAgICBzWzNdLmhlaWdodCA9IHRoaXMud2ZpeGUgKyAncHgnXHJcbiAgICBcdC8vc1szXS5sZWZ0ID0gdGhpcy5kZWNhbC54ICsgJ3B4JztcclxuXHQgICAgc1szXS50b3AgPSB0aGlzLmRlY2FsLnkgKyAncHgnXHJcblxyXG5cdCAgICB0aGlzLnJhdGlvID0gMjU2IC8gdGhpcy53Zml4ZVxyXG5cdCAgICB0aGlzLnNxdWFyZSA9IDEgLyAoNjAqKHRoaXMud2ZpeGUvMjU2KSlcclxuXHQgICAgdGhpcy5zZXRIZWlnaHQoKVxyXG5cclxuXHR9XHJcblxyXG5cclxufSIsImltcG9ydCB7IFJvb3RzIH0gZnJvbSAnLi4vY29yZS9Sb290cy5qcyc7XHJcbmltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgRnBzIGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvICk7XHJcblxyXG4gICAgICAgIHRoaXMucm91bmQgPSBNYXRoLnJvdW5kO1xyXG5cclxuICAgICAgICAvL3RoaXMuYXV0b0hlaWdodCA9IHRydWU7XHJcblxyXG4gICAgICAgIHRoaXMuYmFzZUggPSB0aGlzLmg7XHJcbiAgICAgICAgdGhpcy5ocGx1cyA9IG8uaHBsdXMgfHwgNTA7XHJcblxyXG4gICAgICAgIHRoaXMucmVzID0gby5yZXMgfHwgNDA7XHJcbiAgICAgICAgdGhpcy5sID0gMTtcclxuXHJcbiAgICAgICAgdGhpcy5wcmVjaXNpb24gPSBvLnByZWNpc2lvbiB8fCAwO1xyXG4gICAgICAgIFxyXG5cclxuICAgICAgICB0aGlzLmN1c3RvbSA9IG8uY3VzdG9tIHx8IGZhbHNlO1xyXG4gICAgICAgIHRoaXMubmFtZXMgPSBvLm5hbWVzIHx8IFsnRlBTJywgJ01TJ107XHJcbiAgICAgICAgbGV0IGNjID0gby5jYyB8fCBbJzIyMCwyMjAsMjIwJywgJzI1NSwyNTUsMCddO1xyXG5cclxuICAgICAgIC8vIHRoaXMuZGl2aWQgPSBbIDEwMCwgMTAwLCAxMDAgXTtcclxuICAgICAgIC8vIHRoaXMubXVsdHkgPSBbIDMwLCAzMCwgMzAgXTtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRpbmcgPSBvLmFkZGluZyB8fCBmYWxzZTtcclxuXHJcbiAgICAgICAgdGhpcy5yYW5nZSA9IG8ucmFuZ2UgfHwgWyAxNjUsIDEwMCwgMTAwIF07XHJcblxyXG4gICAgICAgIHRoaXMuYWxwaGEgPSBvLmFscGhhIHx8IDAuMjU7XHJcblxyXG4gICAgICAgIHRoaXMudmFsdWVzID0gW107XHJcbiAgICAgICAgdGhpcy5wb2ludHMgPSBbXTtcclxuICAgICAgICB0aGlzLnRleHREaXNwbGF5ID0gW107XHJcblxyXG4gICAgICAgIGlmKCF0aGlzLmN1c3RvbSl7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm5vdyA9IFJvb3RzLmdldFRpbWUoKVxyXG4gICAgICAgICAgICB0aGlzLnN0YXJ0VGltZSA9IDA7Ly90aGlzLm5vdygpXHJcbiAgICAgICAgICAgIHRoaXMucHJldlRpbWUgPSAwOy8vdGhpcy5zdGFydFRpbWU7XHJcbiAgICAgICAgICAgIHRoaXMuZnJhbWVzID0gMDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubXMgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLmZwcyA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMubWVtID0gMDtcclxuICAgICAgICAgICAgdGhpcy5tbSA9IDA7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmlzTWVtID0gKCBzZWxmLnBlcmZvcm1hbmNlICYmIHNlbGYucGVyZm9ybWFuY2UubWVtb3J5ICkgPyB0cnVlIDogZmFsc2U7XHJcblxyXG4gICAgICAgICAgIC8vIHRoaXMuZGl2aWQgPSBbIDEwMCwgMjAwLCAxIF07XHJcbiAgICAgICAgICAgLy8gdGhpcy5tdWx0eSA9IFsgMzAsIDMwLCAzMCBdO1xyXG5cclxuICAgICAgICAgICAgaWYoIHRoaXMuaXNNZW0gKXtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLm5hbWVzLnB1c2goJ01FTScpO1xyXG4gICAgICAgICAgICAgICAgY2MucHVzaCgnMCwyNTUsMjU1Jyk7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnR4dCA9IG8ubmFtZSB8fCAnRnBzJ1xyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBsZXQgZmx0b3AgPSBNYXRoLmZsb29yKHRoaXMuaCowLjUpLTM7XHJcbiAgICAgICAgY29uc3QgY2NjID0gdGhpcy5jb2xvcnM7XHJcblxyXG4gICAgICAgIHRoaXMuY1sxXS50ZXh0Q29udGVudCA9IHRoaXMudHh0O1xyXG4gICAgICAgIC8vdGhpcy5jWzFdLmlubmVySFRNTCA9ICcmIzE2MDsnICsgdGhpcy50eHRcclxuICAgICAgICB0aGlzLmNbMF0uc3R5bGUuY3Vyc29yID0gJ3BvaW50ZXInO1xyXG4gICAgICAgIHRoaXMuY1swXS5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ2F1dG8nO1xyXG5cclxuICAgICAgICBsZXQgcGFuZWxDc3MgPSAnZGlzcGxheTpub25lOyBsZWZ0OjEwcHg7IHRvcDonKyB0aGlzLmggKyAncHg7IGhlaWdodDonKyh0aGlzLmhwbHVzIC0gOCkrJ3B4OyBib3gtc2l6aW5nOmJvcmRlci1ib3g7IGJhY2tncm91bmQ6IHJnYmEoMCwgMCwgMCwgMC4yKTsgYm9yZGVyOjFweCBzb2xpZCAnKyBjY2MuYm9yZGVyICsnOyc7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLnJhZGl1cyAhPT0gMCApIHBhbmVsQ3NzICs9ICdib3JkZXItcmFkaXVzOicgKyB0aGlzLnJhZGl1cysncHg7JzsgXHJcblxyXG4gICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAncGF0aCcsIHRoaXMuY3NzLmJhc2ljICsgcGFuZWxDc3MgLCB7fSApO1xyXG5cclxuICAgICAgICB0aGlzLmNbMl0uc2V0QXR0cmlidXRlKCd2aWV3Qm94JywgJzAgMCAnK3RoaXMucmVzKycgNTAnICk7XHJcbiAgICAgICAgdGhpcy5jWzJdLnNldEF0dHJpYnV0ZSgnaGVpZ2h0JywgJzEwMCUnICk7XHJcbiAgICAgICAgdGhpcy5jWzJdLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCAnMTAwJScgKTtcclxuICAgICAgICB0aGlzLmNbMl0uc2V0QXR0cmlidXRlKCdwcmVzZXJ2ZUFzcGVjdFJhdGlvJywgJ25vbmUnICk7XHJcblxyXG5cclxuICAgICAgICAvL3RoaXMuZG9tKCAncGF0aCcsIG51bGwsIHsgZmlsbDoncmdiYSgyNTUsMjU1LDAsMC4zKScsICdzdHJva2Utd2lkdGgnOjEsIHN0cm9rZTonI0ZGMCcsICd2ZWN0b3ItZWZmZWN0Jzonbm9uLXNjYWxpbmctc3Ryb2tlJyB9LCB0aGlzLmNbMl0gKTtcclxuICAgICAgICAvL3RoaXMuZG9tKCAncGF0aCcsIG51bGwsIHsgZmlsbDoncmdiYSgwLDI1NSwyNTUsMC4zKScsICdzdHJva2Utd2lkdGgnOjEsIHN0cm9rZTonIzBGRicsICd2ZWN0b3ItZWZmZWN0Jzonbm9uLXNjYWxpbmctc3Ryb2tlJyB9LCB0aGlzLmNbMl0gKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBhcnJvd1xyXG4gICAgICAgIHRoaXMuY1szXSA9IHRoaXMuZG9tKCAncGF0aCcsIHRoaXMuY3NzLmJhc2ljICsgJ3Bvc2l0aW9uOmFic29sdXRlOyB3aWR0aDo2cHg7IGhlaWdodDo2cHg7IGxlZnQ6MDsgdG9wOicrZmx0b3ArJ3B4OycsIHsgZDp0aGlzLnN2Z3MuZzEsIGZpbGw6Y2NjLnRleHQsIHN0cm9rZTonbm9uZSd9KVxyXG4gICAgICAgIC8vdGhpcy5jWzNdID0gdGhpcy5kb20oICdwYXRoJywgdGhpcy5jc3MuYmFzaWMgKyAncG9zaXRpb246YWJzb2x1dGU7IHdpZHRoOjEwcHg7IGhlaWdodDoxMHB4OyBsZWZ0OjRweDsgdG9wOicrZmx0b3ArJ3B4OycsIHsgZDp0aGlzLnN2Z3MuYXJyb3csIGZpbGw6dGhpcy5jb2xvcnMudGV4dCwgc3Ryb2tlOidub25lJ30pO1xyXG5cclxuICAgICAgICAvLyByZXN1bHQgdGVzdFxyXG4gICAgICAgIHRoaXMuY1s0XSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0ICsgJ3Bvc2l0aW9uOmFic29sdXRlOyBsZWZ0OjEwcHg7IHRvcDonKyh0aGlzLmgrMikgKydweDsgZGlzcGxheTpub25lOyB3aWR0aDoxMDAlOyB0ZXh0LWFsaWduOmNlbnRlcjsnICk7XHJcblxyXG4gICAgICAgIC8vIGJvdHRvbSBsaW5lXHJcbiAgICAgICAgaWYoIG8uYm90dG9tTGluZSApIHRoaXMuY1s0XSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MuYmFzaWMgKyAnd2lkdGg6MTAwJTsgYm90dG9tOjBweDsgaGVpZ2h0OjFweDsgYmFja2dyb3VuZDogcmdiYSgyNTUsIDI1NSwgMjU1LCAwLjIpOycpO1xyXG5cclxuICAgICAgICB0aGlzLmlzU2hvdyA9IGZhbHNlO1xyXG5cclxuXHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zO1xyXG5cclxuICAgICAgICAvL3NbMV0ubWFyZ2luTGVmdCA9ICcxMHB4JztcclxuICAgICAgICBzWzFdLmxpbmVIZWlnaHQgPSB0aGlzLmgtNDtcclxuICAgICAgICBzWzFdLmNvbG9yID0gY2NjLnRleHQ7XHJcbiAgICAgICAgLy9zWzFdLnBhZGRpbmdMZWZ0ID0gJzE4cHgnO1xyXG4gICAgICAgIC8vc1sxXS5mb250V2VpZ2h0ID0gJ2JvbGQnO1xyXG5cclxuICAgICAgICBpZiggdGhpcy5yYWRpdXMgIT09IDAgKSAgc1swXS5ib3JkZXJSYWRpdXMgPSB0aGlzLnJhZGl1cysncHgnO1xyXG4gICAgICAgIGlmKCB0aGlzLmNvbG9ycy5nYm9yZGVyIT09J25vbmUnKSBzWzBdLmJvcmRlciA9ICcxcHggc29saWQgJyArIGNjYy5nYm9yZGVyO1xyXG5cclxuXHJcblxyXG5cclxuICAgICAgICBsZXQgaiA9IDA7XHJcblxyXG4gICAgICAgIGZvciggaj0wOyBqPHRoaXMubmFtZXMubGVuZ3RoOyBqKysgKXtcclxuXHJcbiAgICAgICAgICAgIGxldCBiYXNlID0gW107XHJcbiAgICAgICAgICAgIGxldCBpID0gdGhpcy5yZXMrMTtcclxuICAgICAgICAgICAgd2hpbGUoIGktLSApIGJhc2UucHVzaCg1MCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnJhbmdlW2pdID0gKCAxIC8gdGhpcy5yYW5nZVtqXSApICogNDk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB0aGlzLnBvaW50cy5wdXNoKCBiYXNlICk7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWVzLnB1c2goMCk7XHJcbiAgICAgICAgICAgLy8gIHRoaXMuZG9tKCAncGF0aCcsIG51bGwsIHsgZmlsbDoncmdiYSgnK2NjW2pdKycsMC41KScsICdzdHJva2Utd2lkdGgnOjEsIHN0cm9rZToncmdiYSgnK2NjW2pdKycsMSknLCAndmVjdG9yLWVmZmVjdCc6J25vbi1zY2FsaW5nLXN0cm9rZScgfSwgdGhpcy5jWzJdICk7XHJcbiAgICAgICAgICAgIHRoaXMudGV4dERpc3BsYXkucHVzaCggXCI8c3BhbiBzdHlsZT0nY29sb3I6cmdiKFwiK2NjW2pdK1wiKSc+IFwiICsgdGhpcy5uYW1lc1tqXSArXCIgXCIpO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGogPSB0aGlzLm5hbWVzLmxlbmd0aDtcclxuICAgICAgICB3aGlsZShqLS0pe1xyXG4gICAgICAgICAgICB0aGlzLmRvbSggJ3BhdGgnLCBudWxsLCB7IGZpbGw6J3JnYmEoJytjY1tqXSsnLCcrdGhpcy5hbHBoYSsnKScsICdzdHJva2Utd2lkdGgnOjEsIHN0cm9rZToncmdiYSgnK2NjW2pdKycsMSknLCAndmVjdG9yLWVmZmVjdCc6J25vbi1zY2FsaW5nLXN0cm9rZScgfSwgdGhpcy5jWzJdICk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcblxyXG4gICAgICAgIC8vaWYoIHRoaXMuaXNTaG93ICkgdGhpcy5zaG93KCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgRVZFTlRTXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgbW91c2Vkb3duICggZSApIHtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuaXNTaG93ICkgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgIGVsc2UgdGhpcy5vcGVuKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICAvKm1vZGU6IGZ1bmN0aW9uICggbW9kZSApIHtcclxuXHJcbiAgICAgICAgbGV0IHMgPSB0aGlzLnM7XHJcblxyXG4gICAgICAgIHN3aXRjaChtb2RlKXtcclxuICAgICAgICAgICAgY2FzZSAwOiAvLyBiYXNlXHJcbiAgICAgICAgICAgICAgICBzWzFdLmNvbG9yID0gdGhpcy5jb2xvcnMudGV4dDtcclxuICAgICAgICAgICAgICAgIC8vc1sxXS5iYWNrZ3JvdW5kID0gJ25vbmUnO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOiAvLyBvdmVyXHJcbiAgICAgICAgICAgICAgICBzWzFdLmNvbG9yID0gJyNGRkYnO1xyXG4gICAgICAgICAgICAgICAgLy9zWzFdLmJhY2tncm91bmQgPSBVSUwuU0VMRUNUO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOiAvLyBlZGl0IC8gZG93blxyXG4gICAgICAgICAgICAgICAgc1sxXS5jb2xvciA9IHRoaXMuY29sb3JzLnRleHQ7XHJcbiAgICAgICAgICAgICAgICAvL3NbMV0uYmFja2dyb3VuZCA9IFVJTC5TRUxFQ1RET1dOO1xyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfSwqL1xyXG5cclxuICAgIHRpY2sgKCB2ICkge1xyXG5cclxuICAgICAgICB0aGlzLnZhbHVlcyA9IHY7XHJcbiAgICAgICAgaWYoICF0aGlzLmlzU2hvdyApIHJldHVybjtcclxuICAgICAgICB0aGlzLmRyYXdHcmFwaCgpO1xyXG4gICAgICAgIHRoaXMudXBUZXh0KCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1ha2VQYXRoICggcG9pbnQgKSB7XHJcblxyXG4gICAgICAgIGxldCBwID0gJyc7XHJcbiAgICAgICAgcCArPSAnTSAnICsgKC0xKSArICcgJyArIDUwO1xyXG4gICAgICAgIGZvciAoIGxldCBpID0gMDsgaSA8IHRoaXMucmVzICsgMTsgaSArKyApIHsgcCArPSAnIEwgJyArIGkgKyAnICcgKyBwb2ludFtpXTsgfVxyXG4gICAgICAgIHAgKz0gJyBMICcgKyAodGhpcy5yZXMgKyAxKSArICcgJyArIDUwO1xyXG4gICAgICAgIHJldHVybiBwO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB1cFRleHQgKCB2YWwgKSB7XHJcblxyXG4gICAgICAgIGxldCB2ID0gdmFsIHx8IHRoaXMudmFsdWVzLCB0ID0gJyc7XHJcbiAgICAgICAgZm9yKCBsZXQgaj0wLCBsbmcgPXRoaXMubmFtZXMubGVuZ3RoOyBqPGxuZzsgaisrICkgdCArPSB0aGlzLnRleHREaXNwbGF5W2pdICsgKHZbal0pLnRvRml4ZWQodGhpcy5wcmVjaXNpb24pICsgJzwvc3Bhbj4nO1xyXG4gICAgICAgIHRoaXMuY1s0XS5pbm5lckhUTUwgPSB0O1xyXG4gICAgXHJcbiAgICB9XHJcblxyXG4gICAgZHJhd0dyYXBoICgpIHtcclxuXHJcbiAgICAgICAgbGV0IHN2ZyA9IHRoaXMuY1syXTtcclxuICAgICAgICBsZXQgaSA9IHRoaXMubmFtZXMubGVuZ3RoLCB2LCBvbGQgPSAwLCBuID0gMDtcclxuXHJcbiAgICAgICAgd2hpbGUoIGktLSApe1xyXG4gICAgICAgICAgICBpZiggdGhpcy5hZGRpbmcgKSB2ID0gKHRoaXMudmFsdWVzW25dK29sZCkgKiB0aGlzLnJhbmdlW25dO1xyXG4gICAgICAgICAgICBlbHNlICB2ID0gKHRoaXMudmFsdWVzW25dICogdGhpcy5yYW5nZVtuXSk7XHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRzW25dLnNoaWZ0KCk7XHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRzW25dLnB1c2goIDUwIC0gdiApO1xyXG4gICAgICAgICAgICB0aGlzLnNldFN2Zyggc3ZnLCAnZCcsIHRoaXMubWFrZVBhdGgoIHRoaXMucG9pbnRzW25dICksIGkrMSApO1xyXG4gICAgICAgICAgICBvbGQgKz0gdGhpcy52YWx1ZXNbbl07XHJcbiAgICAgICAgICAgIG4rKztcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBvcGVuICgpIHtcclxuXHJcbiAgICAgICAgc3VwZXIub3BlbigpXHJcblxyXG4gICAgICAgIHRoaXMuaCA9IHRoaXMuaHBsdXMgKyB0aGlzLmJhc2VIO1xyXG5cclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZCcsIHRoaXMuc3Zncy5nMiApO1xyXG5cclxuICAgICAgICBpZiggdGhpcy5ncm91cCAhPT0gbnVsbCApeyB0aGlzLmdyb3VwLmNhbGMoIHRoaXMuaHBsdXMgKTt9XHJcbiAgICAgICAgZWxzZSBpZiggdGhpcy5pc1VJICkgdGhpcy5tYWluLmNhbGMoIHRoaXMuaHBsdXMgKTtcclxuXHJcbiAgICAgICAgdGhpcy5zWzBdLmhlaWdodCA9IHRoaXMuaCArJ3B4JztcclxuICAgICAgICB0aGlzLnNbMl0uZGlzcGxheSA9ICdibG9jayc7IFxyXG4gICAgICAgIHRoaXMuc1s0XS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuICAgICAgICB0aGlzLmlzU2hvdyA9IHRydWU7XHJcblxyXG4gICAgICAgIGlmKCAhdGhpcy5jdXN0b20gKSBSb290cy5hZGRMaXN0ZW4oIHRoaXMgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2xvc2UgKCkge1xyXG5cclxuICAgICAgICBzdXBlci5jbG9zZSgpXHJcblxyXG4gICAgICAgIHRoaXMuaCA9IHRoaXMuYmFzZUg7XHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdkJywgdGhpcy5zdmdzLmcxICk7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmdyb3VwICE9PSBudWxsICl7IHRoaXMuZ3JvdXAuY2FsYyggLXRoaXMuaHBsdXMgKTt9XHJcbiAgICAgICAgZWxzZSBpZiggdGhpcy5pc1VJICkgdGhpcy5tYWluLmNhbGMoIC10aGlzLmhwbHVzICk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5zWzBdLmhlaWdodCA9IHRoaXMuaCArJ3B4JztcclxuICAgICAgICB0aGlzLnNbMl0uZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICB0aGlzLnNbNF0uZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICB0aGlzLmlzU2hvdyA9IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiggIXRoaXMuY3VzdG9tICkgUm9vdHMucmVtb3ZlTGlzdGVuKCB0aGlzICk7XHJcblxyXG4gICAgICAgIHRoaXMuY1s0XS5pbm5lckhUTUwgPSAnJztcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcblxyXG4gICAgLy8vLy8gQVVUTyBGUFMgLy8vLy8vXHJcblxyXG4gICAgYmVnaW4gKCkge1xyXG5cclxuICAgICAgICB0aGlzLnN0YXJ0VGltZSA9IHRoaXMubm93KCk7XHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgZW5kICgpIHtcclxuXHJcbiAgICAgICAgbGV0IHRpbWUgPSB0aGlzLm5vdygpO1xyXG4gICAgICAgIHRoaXMubXMgPSB0aW1lIC0gdGhpcy5zdGFydFRpbWU7XHJcblxyXG4gICAgICAgIHRoaXMuZnJhbWVzICsrO1xyXG5cclxuICAgICAgICBpZiAoIHRpbWUgPiB0aGlzLnByZXZUaW1lICsgMTAwMCApIHtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZnBzID0gdGhpcy5yb3VuZCggKCB0aGlzLmZyYW1lcyAqIDEwMDAgKSAvICggdGltZSAtIHRoaXMucHJldlRpbWUgKSApO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5wcmV2VGltZSA9IHRpbWU7XHJcbiAgICAgICAgICAgIHRoaXMuZnJhbWVzID0gMDtcclxuXHJcbiAgICAgICAgICAgIGlmICggdGhpcy5pc01lbSApIHtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgaGVhcFNpemUgPSBwZXJmb3JtYW5jZS5tZW1vcnkudXNlZEpTSGVhcFNpemU7XHJcbiAgICAgICAgICAgICAgICBsZXQgaGVhcFNpemVMaW1pdCA9IHBlcmZvcm1hbmNlLm1lbW9yeS5qc0hlYXBTaXplTGltaXQ7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5tZW0gPSB0aGlzLnJvdW5kKCBoZWFwU2l6ZSAqIDAuMDAwMDAwOTU0ICk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1tID0gaGVhcFNpemUgLyBoZWFwU2l6ZUxpbWl0O1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudmFsdWVzID0gWyB0aGlzLmZwcywgdGhpcy5tcyAsIHRoaXMubW0gXTtcclxuXHJcbiAgICAgICAgdGhpcy5kcmF3R3JhcGgoKTtcclxuICAgICAgICB0aGlzLnVwVGV4dCggWyB0aGlzLmZwcywgdGhpcy5tcywgdGhpcy5tZW0gXSApO1xyXG5cclxuICAgICAgICByZXR1cm4gdGltZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbGlzdGVuaW5nICgpIHtcclxuXHJcbiAgICAgICAgaWYoICF0aGlzLmN1c3RvbSApIHRoaXMuc3RhcnRUaW1lID0gdGhpcy5lbmQoKTtcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICByU2l6ZSAoKSB7XHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zO1xyXG4gICAgICAgIGxldCB3ID0gdGhpcy53O1xyXG5cclxuICAgICAgICBzWzNdLmxlZnQgPSAoIHRoaXMuc2EgKyB0aGlzLnNiIC0gNiApICsgJ3B4J1xyXG5cclxuICAgICAgICBzWzBdLndpZHRoID0gdyArICdweCc7XHJcbiAgICAgICAgc1sxXS53aWR0aCA9IHcgKyAncHgnO1xyXG4gICAgICAgIHNbMl0ubGVmdCA9IDEwICsgJ3B4JztcclxuICAgICAgICBzWzJdLndpZHRoID0gKHctMjApICsgJ3B4JztcclxuICAgICAgICBzWzRdLndpZHRoID0gKHctMjApICsgJ3B4JztcclxuICAgICAgICBcclxuICAgIH1cclxuICAgIFxyXG59IiwiaW1wb3J0IHsgUHJvdG8gfSBmcm9tICcuLi9jb3JlL1Byb3RvLmpzJztcclxuaW1wb3J0IHsgVjIgfSBmcm9tICcuLi9jb3JlL1YyLmpzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBHcmFwaCBleHRlbmRzIFByb3RvIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciggbyA9IHt9ICkge1xyXG5cclxuICAgICAgICBzdXBlciggbyApO1xyXG5cclxuICAgIFx0dGhpcy52YWx1ZSA9IG8udmFsdWUgIT09IHVuZGVmaW5lZCA/IG8udmFsdWUgOiBbMCwwLDBdO1xyXG4gICAgICAgIHRoaXMubG5nID0gdGhpcy52YWx1ZS5sZW5ndGg7XHJcblxyXG4gICAgICAgIHRoaXMucHJlY2lzaW9uID0gby5wcmVjaXNpb24gIT09IHVuZGVmaW5lZCA/IG8ucHJlY2lzaW9uIDogMjtcclxuICAgICAgICB0aGlzLm11bHRpcGxpY2F0b3IgPSBvLm11bHRpcGxpY2F0b3IgfHwgMTtcclxuICAgICAgICB0aGlzLm5lZyA9IG8ubmVnIHx8IGZhbHNlO1xyXG5cclxuICAgICAgICB0aGlzLmxpbmUgPSBvLmxpbmUgIT09IHVuZGVmaW5lZCA/ICBvLmxpbmUgOiB0cnVlO1xyXG5cclxuICAgICAgICAvL2lmKHRoaXMubmVnKXRoaXMubXVsdGlwbGljYXRvcio9MjtcclxuXHJcbiAgICAgICAgdGhpcy5hdXRvV2lkdGggPSBvLmF1dG9XaWR0aCAhPT0gdW5kZWZpbmVkID8gby5hdXRvV2lkdGggOiB0cnVlO1xyXG4gICAgICAgIHRoaXMuaXNOdW1iZXIgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgdGhpcy5oID0gby5oIHx8IDEyOCArIDEwO1xyXG4gICAgICAgIHRoaXMucmggPSB0aGlzLmggLSAxMDtcclxuICAgICAgICB0aGlzLnRvcCA9IDA7XHJcblxyXG4gICAgICAgIHRoaXMuY1swXS5zdHlsZS53aWR0aCA9IHRoaXMudyArJ3B4JztcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuY1sxXSAhPT0gdW5kZWZpbmVkICkgeyAvLyB3aXRoIHRpdGxlXHJcblxyXG4gICAgICAgICAgICB0aGlzLmNbMV0uc3R5bGUud2lkdGggPSB0aGlzLncgKydweCc7XHJcblxyXG4gICAgICAgICAgICBpZighdGhpcy5hdXRvV2lkdGgpe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jWzFdLnN0eWxlLndpZHRoID0gJzEwMCUnO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jWzFdLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2NlbnRlcidcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vdGhpcy5jWzFdLnN0eWxlLmJhY2tncm91bmQgPSAnI2ZmMDAwMCc7XHJcbiAgICAgICAgICAgIC8vdGhpcy5jWzFdLnN0eWxlLnRleHRBbGlnbiA9ICdjZW50ZXInO1xyXG4gICAgICAgICAgICB0aGlzLnRvcCA9IDEwO1xyXG4gICAgICAgICAgICB0aGlzLmggKz0gMTA7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5naCA9IHRoaXMucmggLSAyODtcclxuICAgICAgICB0aGlzLmd3ID0gdGhpcy53IC0gMjg7XHJcblxyXG4gICAgICAgIC8vdGhpcy5jWzJdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHQgKyAnanVzdGlmeS1jb250ZW50OmNlbnRlcjsgdGV4dC1hbGlnbjoganVzdGlmeTsgY29sdW1uLWNvdW50OicrdGhpcy5sbmcrJzsgdG9wOicrKHRoaXMuaC0yMCkrJ3B4OyB3aWR0aDoxMDAlOyBjb2xvcjonKyB0aGlzLmNvbG9ycy50ZXh0ICk7XHJcblxyXG4gICAgICAgIC8vbGV0IGNvbHVtID0gJ2NvbHVtbi1jb3VudDonK3RoaXMubG5nKyc7IGNvbHVtbjonK3RoaXMubG5nKyc7IGJyZWFrLWluc2lkZTogY29sdW1uOyB0b3A6J1xyXG4gICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0ICsgJ2Rpc3BsYXk6YmxvY2s7IHRleHQtYWxpZ246Y2VudGVyOyBwYWRkaW5nOjBweCAwcHg7IHRvcDonKyh0aGlzLmgtMjApKydweDsgbGVmdDoxNHB4OyB3aWR0aDonK3RoaXMuZ3crJ3B4OyAgY29sb3I6JysgdGhpcy5jb2xvcnMudGV4dCApO1xyXG4gICAgICAgXHJcbiAgICAgICAgLy90aGlzLmNbMl0udGV4dENvbnRlbnQgPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgIHRoaXMuY1syXS5pbm5lckhUTUwgPSB0aGlzLnZhbHVlVG9IdG1sKCk7XHJcblxyXG4gICAgICAgIGxldCBzdmcgPSB0aGlzLmRvbSggJ3N2ZycsIHRoaXMuY3NzLmJhc2ljICwgeyB2aWV3Qm94OicwIDAgJyt0aGlzLncrJyAnK3RoaXMucmgsIHdpZHRoOnRoaXMudywgaGVpZ2h0OnRoaXMucmgsIHByZXNlcnZlQXNwZWN0UmF0aW86J25vbmUnIH0gKTtcclxuICAgICAgICB0aGlzLnNldENzcyggc3ZnLCB7IHdpZHRoOnRoaXMudywgaGVpZ2h0OnRoaXMucmgsIGxlZnQ6MCwgdG9wOnRoaXMudG9wIH0pO1xyXG5cclxuICAgICAgICB0aGlzLmRvbSggJ3BhdGgnLCAnJywgeyBkOicnLCBzdHJva2U6dGhpcy5jb2xvcnMudGV4dCwgJ3N0cm9rZS13aWR0aCc6MiwgZmlsbDonbm9uZScsICdzdHJva2UtbGluZWNhcCc6J2J1dHQnIH0sIHN2ZyApO1xyXG4gICAgICAgIHRoaXMuZG9tKCAncmVjdCcsICcnLCB7IHg6MTAsIHk6MTAsIHdpZHRoOnRoaXMuZ3crOCwgaGVpZ2h0OnRoaXMuZ2grOCwgc3Ryb2tlOidyZ2JhKDAsMCwwLDAuMyknLCAnc3Ryb2tlLXdpZHRoJzoxICwgZmlsbDonbm9uZSd9LCBzdmcgKTtcclxuXHJcbiAgICAgICAgdGhpcy5pdyA9ICgodGhpcy5ndy0oNCoodGhpcy5sbmctMSkpKS90aGlzLmxuZyk7XHJcbiAgICAgICAgbGV0IHQgPSBbXTtcclxuICAgICAgICB0aGlzLmNNb2RlID0gW107XHJcblxyXG4gICAgICAgIHRoaXMudiA9IFtdO1xyXG5cclxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8IHRoaXMubG5nOyBpKysgKXtcclxuXHJcbiAgICAgICAgXHR0W2ldID0gWyAxNCArIChpKnRoaXMuaXcpICsgKGkqNCksIHRoaXMuaXcgXTtcclxuICAgICAgICBcdHRbaV1bMl0gPSB0W2ldWzBdICsgdFtpXVsxXTtcclxuICAgICAgICBcdHRoaXMuY01vZGVbaV0gPSAwO1xyXG5cclxuICAgICAgICAgICAgaWYoIHRoaXMubmVnICkgdGhpcy52W2ldID0gKCgxKyh0aGlzLnZhbHVlW2ldIC8gdGhpcy5tdWx0aXBsaWNhdG9yKSkqMC41KTtcclxuICAgICAgICBcdGVsc2UgdGhpcy52W2ldID0gdGhpcy52YWx1ZVtpXSAvIHRoaXMubXVsdGlwbGljYXRvcjtcclxuXHJcbiAgICAgICAgXHR0aGlzLmRvbSggJ3JlY3QnLCAnJywgeyB4OnRbaV1bMF0sIHk6MTQsIHdpZHRoOnRbaV1bMV0sIGhlaWdodDoxLCBmaWxsOnRoaXMuY29sb3JzLnRleHQsICdmaWxsLW9wYWNpdHknOjAuMyB9LCBzdmcgKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRtcCA9IHQ7XHJcbiAgICAgICAgdGhpcy5jWzNdID0gc3ZnO1xyXG5cclxuICAgICAgICAvL2NvbnNvbGUubG9nKHRoaXMudylcclxuXHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmNbMV0gIT09IHVuZGVmaW5lZCApe1xyXG4gICAgICAgICAgICB0aGlzLmNbMV0uc3R5bGUudG9wID0gMCArJ3B4JztcclxuICAgICAgICAgICAgdGhpcy5jWzFdLnN0eWxlLmhlaWdodCA9IDIwICsncHgnO1xyXG4gICAgICAgICAgICB0aGlzLnNbMV0ubGluZUhlaWdodCA9ICgyMC01KSsncHgnXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZSggZmFsc2UgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2V0VmFsdWUgKCB2YWx1ZSApIHtcclxuXHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IHZhbHVlO1xyXG4gICAgICAgIHRoaXMubG5nID0gdGhpcy52YWx1ZS5sZW5ndGg7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLmxuZzsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm5lZykgdGhpcy52W2ldID0gKDEgKyB2YWx1ZVtpXSAvIHRoaXMubXVsdGlwbGljYXRvcikgKiAwLjU7XHJcbiAgICAgICAgICAgIGVsc2UgdGhpcy52W2ldID0gdmFsdWVbaV0gLyB0aGlzLm11bHRpcGxpY2F0b3I7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMudXBkYXRlKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHZhbHVlVG9IdG1sKCkge1xyXG5cclxuICAgICAgICBsZXQgaSA9IHRoaXMubG5nLCBuPTAsIHIgPSAnPHRhYmxlIHN0eWxlPVwid2lkdGg6MTAwJTtcIj48dHI+J1xyXG4gICAgICAgIGxldCB3ID0gMTAwIC8gdGhpcy5sbmdcclxuICAgICAgICBsZXQgc3R5bGUgPSAnd2lkdGg6JysgdyArJyU7Jy8vJyB0ZXh0LWFsaWduOmNlbnRlcjsnXHJcbiAgICAgICAgd2hpbGUoaS0tKXtcclxuICAgICAgICAgICAgaWYobj09PXRoaXMubG5nLTEpIHIgKz0gJzx0ZCBzdHlsZT0nK3N0eWxlKyc+JyArIHRoaXMudmFsdWVbbl0gKyAnPC90ZD48L3RyPjwvdGFibGU+J1xyXG4gICAgICAgICAgICBlbHNlIHIgKz0gJzx0ZCBzdHlsZT0nK3N0eWxlKyc+JyArIHRoaXMudmFsdWVbbl0gKyAnPC90ZD4nXHJcbiAgICAgICAgICAgIG4rK1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gclxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZVNWRyAoKSB7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmxpbmUgKSB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZCcsIHRoaXMubWFrZVBhdGgoKSwgMCApO1xyXG5cclxuICAgICAgICBmb3IobGV0IGkgPSAwOyBpPHRoaXMubG5nOyBpKysgKXtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdoZWlnaHQnLCB0aGlzLnZbaV0qdGhpcy5naCwgaSsyICk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICd5JywgMTQgKyAodGhpcy5naCAtIHRoaXMudltpXSp0aGlzLmdoKSwgaSsyICk7XHJcbiAgICAgICAgICAgIGlmKCB0aGlzLm5lZyApIHRoaXMudmFsdWVbaV0gPSAoICgodGhpcy52W2ldKjIpLTEpICogdGhpcy5tdWx0aXBsaWNhdG9yICkudG9GaXhlZCggdGhpcy5wcmVjaXNpb24gKSAqIDE7XHJcbiAgICAgICAgICAgIGVsc2UgdGhpcy52YWx1ZVtpXSA9ICggKHRoaXMudltpXSAqIHRoaXMubXVsdGlwbGljYXRvcikgKS50b0ZpeGVkKCB0aGlzLnByZWNpc2lvbiApICogMTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL3RoaXMuY1syXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgdGhpcy5jWzJdLmlubmVySFRNTCA9IHRoaXMudmFsdWVUb0h0bWwoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdGVzdFpvbmUgKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgbCA9IHRoaXMubG9jYWw7XHJcbiAgICAgICAgaWYoIGwueCA9PT0gLTEgJiYgbC55ID09PSAtMSApIHJldHVybiAnJztcclxuXHJcbiAgICAgICAgbGV0IGkgPSB0aGlzLmxuZztcclxuICAgICAgICBsZXQgdCA9IHRoaXMudG1wO1xyXG4gICAgICAgIFxyXG5cdCAgICBpZiggbC55PnRoaXMudG9wICYmIGwueTx0aGlzLmgtMjAgKXtcclxuXHQgICAgICAgIHdoaWxlKCBpLS0gKXtcclxuXHQgICAgICAgICAgICBpZiggbC54PnRbaV1bMF0gJiYgbC54PHRbaV1bMl0gKSByZXR1cm4gaTtcclxuXHQgICAgICAgIH1cclxuXHQgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gJydcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW9kZSAoIG4sIG5hbWUgKSB7XHJcblxyXG4gICAgXHRpZiggbiA9PT0gdGhpcy5jTW9kZVtuYW1lXSApIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICBcdGxldCBhO1xyXG5cclxuICAgICAgICBzd2l0Y2gobil7XHJcbiAgICAgICAgICAgIGNhc2UgMDogYT0wLjM7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDE6IGE9MC42OyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOiBhPTE7IGJyZWFrO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yZXNldCgpO1xyXG5cclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbC1vcGFjaXR5JywgYSwgbmFtZSArIDIgKTtcclxuICAgICAgICB0aGlzLmNNb2RlW25hbWVdID0gbjtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRydWU7XHJcblxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBFVkVOVFNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICByZXNldCAoKSB7XHJcblxyXG4gICAgXHRsZXQgbnVwID0gZmFsc2U7XHJcbiAgICAgICAgLy90aGlzLmlzRG93biA9IGZhbHNlO1xyXG5cclxuICAgICAgICBsZXQgaSA9IHRoaXMubG5nO1xyXG4gICAgICAgIHdoaWxlKGktLSl7IFxyXG4gICAgICAgICAgICBpZiggdGhpcy5jTW9kZVtpXSAhPT0gMCApe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jTW9kZVtpXSA9IDA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbC1vcGFjaXR5JywgMC4zLCBpICsgMiApO1xyXG4gICAgICAgICAgICAgICAgbnVwID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51cDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2V1cCAoIGUgKSB7XHJcblxyXG4gICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2U7XHJcbiAgICAgICAgaWYoIHRoaXMuY3VycmVudCAhPT0gLTEgKSByZXR1cm4gdGhpcy5yZXNldCgpO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlZG93biAoIGUgKSB7XHJcblxyXG4gICAgXHR0aGlzLmlzRG93biA9IHRydWU7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW91c2Vtb3ZlKCBlICk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlbW92ZSAoIGUgKSB7XHJcblxyXG4gICAgXHRsZXQgbnVwID0gZmFsc2U7XHJcblxyXG4gICAgXHRsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoZSk7XHJcblxyXG4gICAgXHRpZiggbmFtZSA9PT0gJycgKXtcclxuXHJcbiAgICAgICAgICAgIG51cCA9IHRoaXMucmVzZXQoKTtcclxuICAgICAgICAgICAgLy90aGlzLmN1cnNvcigpO1xyXG5cclxuICAgICAgICB9IGVsc2UgeyBcclxuXHJcbiAgICAgICAgICAgIG51cCA9IHRoaXMubW9kZSggdGhpcy5pc0Rvd24gPyAyIDogMSwgbmFtZSApO1xyXG4gICAgICAgICAgICAvL3RoaXMuY3Vyc29yKCB0aGlzLmN1cnJlbnQgIT09IC0xID8gJ21vdmUnIDogJ3BvaW50ZXInICk7XHJcbiAgICAgICAgICAgIGlmKHRoaXMuaXNEb3duKXtcclxuICAgICAgICAgICAgXHR0aGlzLnZbbmFtZV0gPSB0aGlzLmNsYW1wKCAxIC0gKCggZS5jbGllbnRZIC0gdGhpcy56b25lLnkgLSB0aGlzLnl0b3AgLSAxMCApIC8gdGhpcy5naCkgLCAwLCAxICk7XHJcbiAgICAgICAgICAgIFx0dGhpcy51cGRhdGUoIHRydWUgKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBudXA7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICB1cGRhdGUgKCB1cCApIHtcclxuXHJcbiAgICBcdHRoaXMudXBkYXRlU1ZHKCk7XHJcblxyXG4gICAgICAgIGlmKCB1cCApIHRoaXMuc2VuZCgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtYWtlUGF0aCAoKSB7XHJcblxyXG4gICAgXHRsZXQgcCA9IFwiXCIsIGgsIHcsIHduLCB3bSwgb3csIG9oXHJcbiAgICBcdC8vbGV0IGcgPSB0aGlzLml3KjAuNVxyXG5cclxuICAgIFx0Zm9yKGxldCBpID0gMDsgaTx0aGlzLmxuZzsgaSsrICl7XHJcblxyXG4gICAgXHRcdGggPSAxNCArICh0aGlzLmdoIC0gdGhpcy52W2ldKnRoaXMuZ2gpXHJcbiAgICBcdFx0dyA9ICgxNCArIChpKnRoaXMuaXcpICsgKGkqNCkpXHJcblxyXG4gICAgXHRcdHdtID0gdyArIHRoaXMuaXcqMC41XHJcbiAgICBcdFx0d24gPSB3ICsgdGhpcy5pd1xyXG5cclxuICAgIFx0XHRpZiggaSA9PT0gMCApIHArPSdNICcrdysnICcrIGggKyAnIFQgJyArIHdtICsnICcrIGhcclxuICAgIFx0XHRlbHNlIHAgKz0gJyBDICcgKyBvdyArJyAnKyBvaCArICcsJyArIHcgKycgJysgaCArICcsJyArIHdtICsnICcrIGhcclxuICAgIFx0XHRpZiggaSA9PT0gdGhpcy5sbmctMSApIHArPScgVCAnICsgd24gKycgJysgaFxyXG5cclxuICAgIFx0XHRvdyA9IHduXHJcbiAgICBcdFx0b2ggPSBoIFxyXG5cclxuICAgIFx0fVxyXG5cclxuICAgIFx0cmV0dXJuIHBcclxuXHJcbiAgICB9XHJcblxyXG4gICAgclNpemUgKCkge1xyXG5cclxuICAgICAgICBzdXBlci5yU2l6ZSgpO1xyXG5cclxuICAgICAgICBsZXQgcyA9IHRoaXMucztcclxuICAgICAgICBpZiggdGhpcy5jWzFdICE9PSB1bmRlZmluZWQgKSBzWzFdLndpZHRoID0gdGhpcy53ICsgJ3B4J1xyXG4gICAgICAgIHNbM10ud2lkdGggPSB0aGlzLncgKyAncHgnXHJcblxyXG4gICAgICAgIGxldCBndyA9IHRoaXMudyAtIDI4XHJcbiAgICAgICAgbGV0IGl3ID0gKChndy0oNCoodGhpcy5sbmctMSkpKS90aGlzLmxuZylcclxuICAgICAgICBsZXQgdCA9IFtdXHJcblxyXG4gICAgICAgIHNbMl0ud2lkdGggPSBndyArICdweCdcclxuXHJcbiAgICAgICAgZm9yKCBsZXQgaSA9IDA7IGkgPCB0aGlzLmxuZzsgaSsrICl7XHJcblxyXG4gICAgICAgICAgICB0W2ldID0gWyAxNCArIChpKml3KSArIChpKjQpLCBpdyBdXHJcbiAgICAgICAgICAgIHRbaV1bMl0gPSB0W2ldWzBdICsgdFtpXVsxXVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudG1wID0gdFxyXG5cclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEVtcHR5IGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG5cdCAgICBvLmlzU3BhY2UgPSB0cnVlXHJcbiAgICAgICAgby5tYXJnaW4gPSAwXHJcbiAgICAgICAgaWYoIW8uaCkgby5oID0gMTBcclxuICAgICAgICBzdXBlciggbyApXHJcbiAgICAgICAgdGhpcy5pbml0KClcclxuXHJcbiAgICB9XHJcbiAgICBcclxufVxyXG4iLCJcclxuaW1wb3J0IHsgUm9vdHMgfSBmcm9tICcuLi9jb3JlL1Jvb3RzLmpzJztcclxuaW1wb3J0IHsgUHJvdG8gfSBmcm9tICcuLi9jb3JlL1Byb3RvLmpzJztcclxuaW1wb3J0IHsgRW1wdHkgfSBmcm9tICcuL0VtcHR5LmpzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBHcm91cCBleHRlbmRzIFByb3RvIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciggbyA9IHt9ICkge1xyXG5cclxuICAgICAgICBzdXBlciggbyApO1xyXG5cclxuICAgICAgICB0aGlzLmlzR3JvdXAgPSB0cnVlXHJcblxyXG4gICAgICAgIHRoaXMuQUREID0gby5hZGQ7XHJcblxyXG4gICAgICAgIHRoaXMuYXV0b0hlaWdodCA9IHRydWVcclxuXHJcbiAgICAgICAgdGhpcy51aXMgPSBbXVxyXG4gICAgICAgIHRoaXMuY3VycmVudCA9IC0xXHJcbiAgICAgICAgdGhpcy5wcm90byA9IG51bGxcclxuICAgICAgICB0aGlzLmlzRW1wdHkgPSB0cnVlXHJcblxyXG4gICAgICAgIHRoaXMuZGVjYWwgPSBvLmdyb3VwID8gOCA6IDBcclxuICAgICAgICAvL3RoaXMuZGQgPSBvLmdyb3VwID8gby5ncm91cC5kZWNhbCArIDggOiAwXHJcblxyXG4gICAgICAgIHRoaXMuYmFzZUggPSB0aGlzLmhcclxuXHJcbiAgICAgICAgdGhpcy5zcGFjZVkgPSBuZXcgRW1wdHkoe2g6dGhpcy5tYXJnaW59KTtcclxuXHJcblxyXG5cclxuICAgICAgICBsZXQgZmx0b3AgPSBNYXRoLmZsb29yKHRoaXMuaCowLjUpLTNcclxuXHJcbiAgICAgICAgY29uc3QgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICB0aGlzLnVzZUZsZXggPSB0cnVlIFxyXG4gICAgICAgIGxldCBmbGV4aWJsZSA9IHRoaXMudXNlRmxleCA/ICdkaXNwbGF5OmZsZXg7IGZsZXgtZmxvdzogcm93IHdyYXA7JyA6ICcnXHJcblxyXG4gICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MuYmFzaWMgKyBmbGV4aWJsZSArICd3aWR0aDoxMDAlOyBsZWZ0OjA7ICBvdmVyZmxvdzpoaWRkZW47IHRvcDonKyh0aGlzLmgpKydweCcpXHJcbiAgICAgICAgdGhpcy5jWzNdID0gdGhpcy5kb20oICdwYXRoJywgdGhpcy5jc3MuYmFzaWMgKyAncG9zaXRpb246YWJzb2x1dGU7IHdpZHRoOjZweDsgaGVpZ2h0OjZweDsgbGVmdDowOyB0b3A6JytmbHRvcCsncHg7JywgeyBkOnRoaXMuc3Zncy5nMSwgZmlsbDpjYy50ZXh0LCBzdHJva2U6J25vbmUnfSlcclxuXHJcbiAgICAgICAgbGV0IGJoID0gdGhpcy5tdG9wID09PSAwID8gdGhpcy5tYXJnaW4gOiB0aGlzLm10b3BcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLmNbNF0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLmJhc2ljICsgJ3dpZHRoOjEwMCU7IGxlZnQ6MDsgaGVpZ2h0OicrKGJoKzEpKydweDsgdG9wOicrKCh0aGlzLmgtMSkpKydweDsgYmFja2dyb3VuZDpub25lOycpXHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zO1xyXG4gICAgICAgIHRoaXMuY1sxXS5uYW1lID0gJ2dyb3VwJ1xyXG5cclxuICAgICAgICB0aGlzLmluaXQoKTtcclxuXHJcbiAgICAgICAgdGhpcy5zZXRCRyggby5iZyApXHJcblxyXG4gICAgICAgIGlmKCBvLm9wZW4gKSB0aGlzLm9wZW4oKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRCRyAoIGJnICkge1xyXG5cclxuICAgICAgICBjb25zdCBjYyA9IHRoaXMuY29sb3JzXHJcbiAgICAgICAgY29uc3QgcyA9IHRoaXMuc1xyXG5cclxuICAgICAgICBpZiggYmcgIT09IHVuZGVmaW5lZCApIGNjLmdyb3VwcyA9IGJnXHJcbiAgICAgICAgaWYoY2MuZ3JvdXBzID09PSAnbm9uZScpIGNjLmdyb3VwcyA9IGNjLmJhY2tncm91bmRcclxuICAgICAgICAgICAgY2MuYmFja2dyb3VuZCA9ICdub25lJ1xyXG5cclxuICAgICAgICBzWzBdLmJhY2tncm91bmQgPSAnbm9uZSc7XHJcbiAgICAgICAgc1sxXS5iYWNrZ3JvdW5kID0gY2MuZ3JvdXBzXHJcbiAgICAgICAgc1syXS5iYWNrZ3JvdW5kID0gY2MuZ3JvdXBzXHJcblxyXG4gICAgICAgIGlmKCBjYy5nYm9yZGVyICE9PSAnbm9uZScgKXtcclxuICAgICAgICAgICAgc1sxXS5ib3JkZXIgPSBjYy5ib3JkZXJTaXplKydweCBzb2xpZCAnKyBjYy5nYm9yZGVyXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggdGhpcy5yYWRpdXMgIT09IDAgKXtcclxuXHJcbiAgICAgICAgICAgIHNbMV0uYm9yZGVyUmFkaXVzID0gdGhpcy5yYWRpdXMrJ3B4J1xyXG4gICAgICAgICAgICBzWzJdLmJvcmRlclJhZGl1cyA9IHRoaXMucmFkaXVzKydweCdcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKmxldCBpID0gdGhpcy51aXMubGVuZ3RoO1xyXG4gICAgICAgIHdoaWxlKGktLSl7XHJcbiAgICAgICAgICAgIHRoaXMudWlzW2ldLnNldEJHKCAnbm9uZScgKTtcclxuICAgICAgICAgICAgLy90aGlzLnVpc1tpXS5zZXRCRyggdGhpcy5jb2xvcnMuYmFja2dyb3VuZCApO1xyXG4gICAgICAgIH0qL1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB0ZXN0Wm9uZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBsID0gdGhpcy5sb2NhbDtcclxuICAgICAgICBpZiggbC54ID09PSAtMSAmJiBsLnkgPT09IC0xICkgcmV0dXJuICcnO1xyXG5cclxuICAgICAgICBsZXQgbmFtZSA9ICcnO1xyXG5cclxuICAgICAgICBpZiggbC55IDwgdGhpcy5iYXNlSCArIHRoaXMubWFyZ2luICkgbmFtZSA9ICd0aXRsZSc7XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGlmKCB0aGlzLmlzT3BlbiApIG5hbWUgPSAnY29udGVudCc7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL2NvbnNvbGUubG9nKG5hbWUpXHJcblxyXG4gICAgICAgIHJldHVybiBuYW1lO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBjbGVhclRhcmdldCAoKSB7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmN1cnJlbnQgPT09IC0xICkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIGlmKCB0aGlzLnByb3RvLnMgKXtcclxuICAgICAgICAgICAgLy8gaWYgbm8gcyB0YXJnZXQgaXMgZGVsZXRlICEhXHJcbiAgICAgICAgICAgIHRoaXMucHJvdG8udWlvdXQoKTtcclxuICAgICAgICAgICAgdGhpcy5wcm90by5yZXNldCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnByb3RvID0gbnVsbDtcclxuICAgICAgICB0aGlzLmN1cnJlbnQgPSAtMTtcclxuICAgICAgICB0aGlzLmN1cnNvcigpO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXNldCAoKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY2xlYXJUYXJnZXQoKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIEVWRU5UU1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIGhhbmRsZUV2ZW50ICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IHR5cGUgPSBlLnR5cGU7XHJcblxyXG4gICAgICAgIGxldCBjaGFuZ2UgPSBmYWxzZTtcclxuICAgICAgICBsZXQgcHJvdG9DaGFuZ2UgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgbGV0IG5hbWUgPSB0aGlzLnRlc3Rab25lKCBlICk7XHJcblxyXG4gICAgICAgIGlmKCAhbmFtZSApIHJldHVybjtcclxuXHJcbiAgICAgICAgc3dpdGNoKCBuYW1lICl7XHJcblxyXG4gICAgICAgICAgICBjYXNlICdjb250ZW50JzpcclxuXHJcbiAgICAgICAgICAgIC8vdGhpcy5jdXJzb3IoKVxyXG5cclxuICAgICAgICAgICAgLy9pZiggdGhpcy5tYXJnaW5EaXYgKSBlLmNsaWVudFkgLT0gdGhpcy5tYXJnaW4gKiAwLjVcclxuXHJcbiAgICAgICAgICAgIGlmKCBSb290cy5pc01vYmlsZSAmJiB0eXBlID09PSAnbW91c2Vkb3duJyApIHRoaXMuZ2V0TmV4dCggZSwgY2hhbmdlIClcclxuXHJcbiAgICAgICAgICAgIGlmKCB0aGlzLnByb3RvICl7IFxyXG4gICAgICAgICAgICAgICAgLy9lLmNsaWVudFkgLT0gdGhpcy5tYXJnaW5cclxuICAgICAgICAgICAgICAgIHByb3RvQ2hhbmdlID0gdGhpcy5wcm90by5oYW5kbGVFdmVudCggZSApXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmKCAhUm9vdHMubG9jayApIHRoaXMuZ2V0TmV4dCggZSwgY2hhbmdlIClcclxuXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICd0aXRsZSc6XHJcbiAgICAgICAgICAgIC8vdGhpcy5jdXJzb3IoIHRoaXMuaXNPcGVuID8gJ24tcmVzaXplJzoncy1yZXNpemUnICk7XHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yKCdwb2ludGVyJylcclxuICAgICAgICAgICAgaWYoIHR5cGUgPT09ICdtb3VzZWRvd24nICl7XHJcbiAgICAgICAgICAgICAgICBpZiggdGhpcy5pc09wZW4gKSB0aGlzLmNsb3NlKClcclxuICAgICAgICAgICAgICAgIGVsc2UgdGhpcy5vcGVuKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoIHRoaXMuaXNEb3duICkgY2hhbmdlID0gdHJ1ZTtcclxuICAgICAgICBpZiggcHJvdG9DaGFuZ2UgKSBjaGFuZ2UgPSB0cnVlO1xyXG5cclxuICAgICAgICByZXR1cm4gY2hhbmdlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBnZXROZXh0ICggZSwgY2hhbmdlICkge1xyXG5cclxuICAgICAgICBsZXQgbmV4dCA9IFJvb3RzLmZpbmRUYXJnZXQoIHRoaXMudWlzLCBlICk7XHJcblxyXG4gICAgICAgIGlmKCBuZXh0ICE9PSB0aGlzLmN1cnJlbnQgKXtcclxuICAgICAgICAgICAgdGhpcy5jbGVhclRhcmdldCgpO1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnQgPSBuZXh0O1xyXG4gICAgICAgICAgICBjaGFuZ2UgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoIG5leHQgIT09IC0xICl7IFxyXG4gICAgICAgICAgICB0aGlzLnByb3RvICA9IHRoaXMudWlzWyB0aGlzLmN1cnJlbnQgXTtcclxuICAgICAgICAgICAgdGhpcy5wcm90by51aW92ZXIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBcclxuXHJcbiAgICBhZGQoKSB7XHJcblxyXG4gICAgICAgIGxldCBhID0gYXJndW1lbnRzO1xyXG5cclxuICAgICAgICBpZiggdHlwZW9mIGFbMV0gPT09ICdvYmplY3QnICl7IFxyXG4gICAgICAgICAgICBhWzFdLmlzVUkgPSB0aGlzLmlzVUlcclxuICAgICAgICAgICAgYVsxXS50YXJnZXQgPSB0aGlzLmNbMl1cclxuICAgICAgICAgICAgYVsxXS5tYWluID0gdGhpcy5tYWluXHJcbiAgICAgICAgICAgIGFbMV0uZ3JvdXAgPSB0aGlzXHJcbiAgICAgICAgfSBlbHNlIGlmKCB0eXBlb2YgYXJndW1lbnRzWzFdID09PSAnc3RyaW5nJyApe1xyXG4gICAgICAgICAgICBpZiggYVsyXSA9PT0gdW5kZWZpbmVkICkgW10ucHVzaC5jYWxsKCBhLCB7IGlzVUk6dHJ1ZSwgdGFyZ2V0OnRoaXMuY1syXSwgbWFpbjp0aGlzLm1haW4gfSk7XHJcbiAgICAgICAgICAgIGVsc2V7IFxyXG4gICAgICAgICAgICAgICAgYVsyXS5pc1VJID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGFbMl0udGFyZ2V0ID0gdGhpcy5jWzJdO1xyXG4gICAgICAgICAgICAgICAgYVsyXS5tYWluID0gdGhpcy5tYWluO1xyXG4gICAgICAgICAgICAgICAgYVsyXS5ncm91cCA9IHRoaXM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxldCB1ID0gdGhpcy5BREQuYXBwbHkoIHRoaXMsIGEgKVxyXG5cclxuICAgICAgICBpZiggdS5pc0dyb3VwICl7IFxyXG4gICAgICAgICAgICAvL28uYWRkID0gYWRkO1xyXG4gICAgICAgICAgICB1LmR4ID0gOFxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvL3UuZHggKz0gNFxyXG4gICAgICAgIC8vY29uc29sZS5sb2codGhpcy5kZWNhbClcclxuICAgICAgICAvL3Uuem9uZS5kIC09IDhcclxuICAgICAgICBSb290cy5mb3JjZVpvbmUgPSB0cnVlXHJcbiAgICAgICAgLy91Lm1hcmdpbiArPSB0aGlzLm1hcmdpblxyXG5cclxuICAgICAgICAvL2NvbnNvbGUubG9nKCB1Lm1hcmdpbiApXHJcbiAgICAgICAgLy9Sb290cy5uZWVkUmVab25lID0gdHJ1ZVxyXG5cclxuICAgICAgICAvL1Jvb3RzLnJlc2l6ZSgpXHJcbiAgICAgICAgIC8vY29uc29sZS5sb2coUm9vdHMubmVlZFJlc2l6ZSlcclxuXHJcbiAgICAgICAgdGhpcy51aXMucHVzaCggdSApXHJcblxyXG4gICAgICAgIHRoaXMuaXNFbXB0eSA9IGZhbHNlXHJcblxyXG4gICAgICAgIHJldHVybiB1O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyByZW1vdmUgb25lIG5vZGVcclxuXHJcbiAgICByZW1vdmUgKCBuICkge1xyXG5cclxuICAgICAgICBpZiggbi5kaXNwb3NlICkgbi5kaXNwb3NlKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIGNsZWFyIGFsbCBpbmVyIFxyXG5cclxuICAgIGRpc3Bvc2UoKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY2xlYXIoKVxyXG4gICAgICAgIGlmKCB0aGlzLmlzVUkgKSB0aGlzLm1haW4uY2FsYygpXHJcbiAgICAgICAgc3VwZXIuZGlzcG9zZSgpXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNsZWFyKCkge1xyXG5cclxuICAgICAgICB0aGlzLmVtcHR5KClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZW1wdHkgKCkge1xyXG5cclxuICAgICAgICB0aGlzLmNsb3NlKCk7XHJcblxyXG4gICAgICAgIGxldCBpID0gdGhpcy51aXMubGVuZ3RoLCBpdGVtO1xyXG5cclxuICAgICAgICB3aGlsZSggaS0tICl7XHJcbiAgICAgICAgICAgIGl0ZW0gPSB0aGlzLnVpcy5wb3AoKVxyXG4gICAgICAgICAgICB0aGlzLmNbMl0ucmVtb3ZlQ2hpbGQoIGl0ZW0uY1swXSApXHJcbiAgICAgICAgICAgIGl0ZW0uY2xlYXIoIHRydWUgKVxyXG5cclxuICAgICAgICAgICAgLy90aGlzLnVpc1tpXS5jbGVhcigpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmlzRW1wdHkgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMuaCA9IHRoaXMuYmFzZUg7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIGNsZWFyIG9uZSBlbGVtZW50XHJcblxyXG4gICAgY2xlYXJPbmUgKCBuICkgeyBcclxuXHJcbiAgICAgICAgbGV0IGlkID0gdGhpcy51aXMuaW5kZXhPZiggbiApO1xyXG5cclxuICAgICAgICBpZiAoIGlkICE9PSAtMSApIHtcclxuICAgICAgICAgICAgdGhpcy5jYWxjKCAtICggdGhpcy51aXNbIGlkIF0uaCArIHRoaXMubWFyZ2luICkgKVxyXG4gICAgICAgICAgICB0aGlzLmNbMl0ucmVtb3ZlQ2hpbGQoIHRoaXMudWlzWyBpZCBdLmNbMF0gKVxyXG4gICAgICAgICAgICB0aGlzLnVpcy5zcGxpY2UoIGlkLCAxIClcclxuXHJcbiAgICAgICAgICAgIGlmKCB0aGlzLnVpcy5sZW5ndGggPT09IDAgKXsgXHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzRW1wdHkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBcclxuXHJcbiAgICBvcGVuICgpIHtcclxuXHJcbiAgICAgICAgc3VwZXIub3BlbigpXHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdkJywgdGhpcy5zdmdzLmcyIClcclxuICAgICAgICB0aGlzLnJTaXplQ29udGVudCgpXHJcblxyXG4gICAgICAgIC8vbGV0IHQgPSB0aGlzLmggLSB0aGlzLmJhc2VIXHJcblxyXG4gICAgICAgIGNvbnN0IHMgPSB0aGlzLnNcclxuICAgICAgICBjb25zdCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG4gICAgICAgIC8vc1syXS50b3AgPSAodGhpcy5oLTEpICsgJ3B4J1xyXG4gICAgICAgIHNbMl0udG9wID0gKHRoaXMuaCt0aGlzLm10b3ApICsgJ3B4J1xyXG4gICAgICAgIHNbNF0uYmFja2dyb3VuZCA9IGNjLmdyb3Vwcy8vJyMwZjAnXHJcblxyXG4gICAgICAgIGlmKHRoaXMucmFkaXVzKXtcclxuXHJcbiAgICAgICAgICAgIHNbMV0uYm9yZGVyUmFkaXVzID0gJzBweCdcclxuICAgICAgICAgICAgc1syXS5ib3JkZXJSYWRpdXMgPSAnMHB4J1xyXG5cclxuICAgICAgICAgICAgc1sxXS5ib3JkZXJUb3BMZWZ0UmFkaXVzID0gdGhpcy5yYWRpdXMrJ3B4J1xyXG4gICAgICAgICAgICBzWzFdLmJvcmRlclRvcFJpZ2h0UmFkaXVzID0gdGhpcy5yYWRpdXMrJ3B4J1xyXG4gICAgICAgICAgICBzWzJdLmJvcmRlckJvdHRvbUxlZnRSYWRpdXMgPSB0aGlzLnJhZGl1cysncHgnXHJcbiAgICAgICAgICAgIHNbMl0uYm9yZGVyQm90dG9tUmlnaHRSYWRpdXMgPSB0aGlzLnJhZGl1cysncHgnXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggY2MuZ2JvcmRlciAhPT0gJ25vbmUnICl7XHJcblxyXG4gICAgICAgICAgICBzWzRdLmJvcmRlckxlZnQgPSBjYy5ib3JkZXJTaXplKydweCBzb2xpZCAnKyBjYy5nYm9yZGVyXHJcbiAgICAgICAgICAgIHNbNF0uYm9yZGVyUmlnaHQgPSBjYy5ib3JkZXJTaXplKydweCBzb2xpZCAnKyBjYy5nYm9yZGVyXHJcblxyXG4gICAgICAgICAgICBzWzJdLmJvcmRlciA9IGNjLmJvcmRlclNpemUrJ3B4IHNvbGlkICcrIGNjLmdib3JkZXJcclxuICAgICAgICAgICAgc1syXS5ib3JkZXJUb3AgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgIHNbMV0uYm9yZGVyQm90dG9tID0gY2MuYm9yZGVyU2l6ZSsncHggc29saWQgcmdiYSgwLDAsMCwwKSdcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMucGFyZW50SGVpZ2h0KClcclxuXHJcbiAgICAgICAgLy9Sb290cy5pc0xlYXZlID0gdHJ1ZVxyXG4gICAgICAgIC8vUm9vdHMubmVlZFJlc2l6ZSA9IHRydWVcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2xvc2UgKCkge1xyXG5cclxuICAgICAgICBzdXBlci5jbG9zZSgpXHJcblxyXG4gICAgICAgIC8vbGV0IHQgPSB0aGlzLmggLSB0aGlzLmJhc2VIXHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdkJywgdGhpcy5zdmdzLmcxIClcclxuXHJcbiAgICAgICAgdGhpcy5oID0gdGhpcy5iYXNlSFxyXG5cclxuICAgICAgICBjb25zdCBzID0gdGhpcy5zXHJcbiAgICAgICAgY29uc3QgY2MgPSB0aGlzLmNvbG9yc1xyXG4gICAgICAgIFxyXG4gICAgICAgIHNbMF0uaGVpZ2h0ID0gdGhpcy5oICsgJ3B4J1xyXG4gICAgICAgIC8vc1sxXS5oZWlnaHQgPSAodGhpcy5oLTIpICsgJ3B4J1xyXG4gICAgICAgIC8vc1syXS50b3AgPSB0aGlzLmggKyAncHgnXHJcbiAgICAgICAgc1syXS50b3AgPSAodGhpcy5oK3RoaXMubXRvcCkgKyAncHgnXHJcbiAgICAgICAgc1s0XS5iYWNrZ3JvdW5kID0gJ25vbmUnXHJcblxyXG4gICAgICAgIGlmKCBjYy5nYm9yZGVyICE9PSAnbm9uZScgKXtcclxuXHJcbiAgICAgICAgICAgIHNbNF0uYm9yZGVyID0gJ25vbmUnXHJcbiAgICAgICAgICAgIHNbMl0uYm9yZGVyID0gJ25vbmUnXHJcbiAgICAgICAgICAgIHNbMV0uYm9yZGVyID0gY2MuYm9yZGVyU2l6ZSsncHggc29saWQgJysgY2MuZ2JvcmRlclxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYodGhpcy5yYWRpdXMpIHNbMV0uYm9yZGVyUmFkaXVzID0gdGhpcy5yYWRpdXMrJ3B4J1xyXG5cclxuICAgICAgICB0aGlzLnBhcmVudEhlaWdodCgpXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNhbGNVaXMgKCkge1xyXG5cclxuICAgICAgICBpZiggIXRoaXMuaXNPcGVuIHx8IHRoaXMuaXNFbXB0eSApIHRoaXMuaCA9IHRoaXMuYmFzZUhcclxuICAgICAgICAvL2Vsc2UgdGhpcy5oID0gUm9vdHMuY2FsY1VpcyggdGhpcy51aXMsIHRoaXMuem9uZSwgdGhpcy56b25lLnkgKyB0aGlzLmJhc2VIICkgKyB0aGlzLmJhc2VIO1xyXG4gICAgICAgIGVsc2UgdGhpcy5oID0gUm9vdHMuY2FsY1VpcyggWy4uLnRoaXMudWlzLCB0aGlzLnNwYWNlWSBdLCB0aGlzLnpvbmUsIHRoaXMuem9uZS55ICsgdGhpcy5iYXNlSCArIHRoaXMubWFyZ2luLCB0cnVlICkgKyB0aGlzLmJhc2VIXHJcblxyXG4gICAgICAgIHRoaXMuc1swXS5oZWlnaHQgPSB0aGlzLmggKyAncHgnXHJcbiAgICAgICAgdGhpcy5zWzJdLmhlaWdodCA9KCB0aGlzLmggLSB0aGlzLmJhc2VIICkrICdweCdcclxuXHJcbiAgICB9XHJcblxyXG4gICAgcGFyZW50SGVpZ2h0ICggdCApIHtcclxuXHJcbiAgICAgICAgaWYgKCB0aGlzLmdyb3VwICE9PSBudWxsICkgdGhpcy5ncm91cC5jYWxjKCB0IClcclxuICAgICAgICBlbHNlIGlmICggdGhpcy5pc1VJICkgdGhpcy5tYWluLmNhbGMoIHQgKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBjYWxjICggeSApIHtcclxuXHJcbiAgICAgICAgaWYoICF0aGlzLmlzT3BlbiApIHJldHVyblxyXG4gICAgICAgIGlmKCB0aGlzLmlzVUkgKSB0aGlzLm1haW4uY2FsYygpXHJcbiAgICAgICAgZWxzZSB0aGlzLmNhbGNVaXMoKVxyXG4gICAgICAgIHRoaXMuc1swXS5oZWlnaHQgPSB0aGlzLmggKyAncHgnXHJcbiAgICAgICAgdGhpcy5zWzJdLmhlaWdodCA9IHRoaXMuaCArICdweCdcclxuXHJcbiAgICB9XHJcblxyXG4gICAgclNpemVDb250ZW50ICgpIHtcclxuXHJcbiAgICAgICAgbGV0IGkgPSB0aGlzLnVpcy5sZW5ndGhcclxuICAgICAgICB3aGlsZShpLS0pe1xyXG4gICAgICAgICAgICB0aGlzLnVpc1tpXS5zZXRTaXplKCB0aGlzLncgKVxyXG4gICAgICAgICAgICB0aGlzLnVpc1tpXS5yU2l6ZSgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICByU2l6ZSAoKSB7XHJcblxyXG4gICAgICAgIHN1cGVyLnJTaXplKClcclxuXHJcbiAgICAgICAgbGV0IHMgPSB0aGlzLnNcclxuXHJcbiAgICAgICAgdGhpcy53ID0gdGhpcy53IC0gdGhpcy5kZWNhbFxyXG5cclxuICAgICAgICBzWzNdLmxlZnQgPSAoIHRoaXMuc2EgKyB0aGlzLnNiIC0gNiApICsgJ3B4J1xyXG5cclxuICAgICAgICBzWzFdLndpZHRoID0gdGhpcy53ICsgJ3B4J1xyXG4gICAgICAgIHNbMl0ud2lkdGggPSB0aGlzLncgKyAncHgnXHJcbiAgICAgICAgc1sxXS5sZWZ0ID0gKHRoaXMuZGVjYWwpICsgJ3B4J1xyXG4gICAgICAgIHNbMl0ubGVmdCA9ICh0aGlzLmRlY2FsKSArICdweCdcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuaXNPcGVuICkgdGhpcy5yU2l6ZUNvbnRlbnQoKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvL1xyXG4vKlxyXG4gICAgdWlvdXQoKSB7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmxvY2sgKSByZXR1cm47XHJcbiAgICAgICAgaWYoIXRoaXMub3ZlckVmZmVjdCkgcmV0dXJuO1xyXG4gICAgICAgIGlmKHRoaXMucykgdGhpcy5zWzBdLmJhY2tncm91bmQgPSB0aGlzLmNvbG9ycy5iYWNrZ3JvdW5kO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB1aW92ZXIoKSB7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmxvY2sgKSByZXR1cm47XHJcbiAgICAgICAgaWYoIXRoaXMub3ZlckVmZmVjdCkgcmV0dXJuO1xyXG4gICAgICAgIC8vaWYoIHRoaXMuaXNPcGVuICkgcmV0dXJuO1xyXG4gICAgICAgIGlmKHRoaXMucykgdGhpcy5zWzBdLmJhY2tncm91bmQgPSB0aGlzLmNvbG9ycy5iYWNrZ3JvdW5kT3ZlcjtcclxuXHJcbiAgICB9XHJcbiovXHJcbn0iLCJpbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5pbXBvcnQgeyBWMiB9IGZyb20gJy4uL2NvcmUvVjIuanMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEpveXN0aWNrIGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvICk7XHJcblxyXG4gICAgICAgIHRoaXMuYXV0b1dpZHRoID0gZmFsc2U7XHJcblxyXG4gICAgICAgIHRoaXMudmFsdWUgPSBbMCwwXTtcclxuXHJcbiAgICAgICAgdGhpcy5taW53ICA9IHRoaXMud1xyXG4gICAgICAgIHRoaXMuZGlhbSA9IG8uZGlhbSB8fCB0aGlzLncgXHJcblxyXG4gICAgICAgIHRoaXMuam95VHlwZSA9ICdhbmFsb2dpcXVlJztcclxuICAgICAgICB0aGlzLm1vZGVsID0gby5tb2RlICE9PSB1bmRlZmluZWQgPyBvLm1vZGUgOiAwO1xyXG5cclxuICAgICAgICB0aGlzLnByZWNpc2lvbiA9IG8ucHJlY2lzaW9uIHx8IDI7XHJcbiAgICAgICAgdGhpcy5tdWx0aXBsaWNhdG9yID0gby5tdWx0aXBsaWNhdG9yIHx8IDE7XHJcblxyXG4gICAgICAgIHRoaXMucG9zID0gbmV3IFYyKCk7XHJcbiAgICAgICAgdGhpcy50bXAgPSBuZXcgVjIoKTtcclxuXHJcbiAgICAgICAgdGhpcy5pbnRlcnZhbCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5jWzBdLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snXHJcbiAgICAgICAgdGhpcy5oYXZlVGV4dCA9IG8udGV4dCAhPT0gdW5kZWZpbmVkID8gby50ZXh0IDogdHJ1ZSBcclxuXHJcbiAgICAgICAgLy90aGlzLnJhZGl1cyA9IHRoaXMudyAqIDAuNTtcclxuICAgICAgICAvL3RoaXMuZGlzdGFuY2UgPSB0aGlzLnJhZGl1cyowLjI1O1xyXG4gICAgICAgIHRoaXMuZGlzdGFuY2UgPSAodGhpcy5kaWFtKjAuNSkqMC4yNTtcclxuXHJcbiAgICAgICAgdGhpcy5oID0gby5oIHx8IHRoaXMudyArICh0aGlzLmhhdmVUZXh0ID8gMTAgOiAwKTtcclxuXHJcbiAgICAgICAgdGhpcy5jWzBdLnN0eWxlLndpZHRoID0gdGhpcy53ICsncHgnO1xyXG5cclxuICAgICAgICBpZiggdGhpcy5jWzFdICE9PSB1bmRlZmluZWQgKSB7IC8vIHdpdGggdGl0bGVcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY1sxXS5zdHlsZS53aWR0aCA9ICcxMDAlJztcclxuICAgICAgICAgICAgdGhpcy5jWzFdLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2NlbnRlcic7XHJcbiAgICAgICAgICAgIHRoaXMudG9wID0gMTA7XHJcbiAgICAgICAgICAgIHRoaXMuaCArPSAxMDtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICB0aGlzLmNbMl0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLnR4dCArICdqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyOyB0b3A6JysodGhpcy5oLTIwKSsncHg7IHdpZHRoOjEwMCU7IGNvbG9yOicrIGNjLnRleHQgKTtcclxuICAgICAgICB0aGlzLmNbMl0udGV4dENvbnRlbnQgPSB0aGlzLmhhdmVUZXh0ID8gdGhpcy52YWx1ZSA6ICcnO1xyXG5cclxuICAgICAgICB0aGlzLmNbM10gPSB0aGlzLmdldEpveXN0aWNrKCB0aGlzLm1vZGVsICk7XHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3ZpZXdCb3gnLCAnMCAwICcrdGhpcy5kaWFtKycgJyt0aGlzLmRpYW0gKTtcclxuICAgICAgICB0aGlzLnNldENzcyggdGhpcy5jWzNdLCB7IHdpZHRoOnRoaXMuZGlhbSwgaGVpZ2h0OnRoaXMuZGlhbSwgbGVmdDowLCB0b3A6dGhpcy50b3AgfSk7XHJcblxyXG4gICAgICAgIHRoaXMubW9kZSgwKVxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5yYXRpbyA9IDEyOC90aGlzLnc7XHJcblxyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZShmYWxzZSk7XHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG4gICAgbW9kZSAoIG1vZGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG4gICAgICAgIHN3aXRjaChtb2RlKXtcclxuICAgICAgICAgICAgY2FzZSAwOiAvLyBiYXNlXHJcbiAgICAgICAgICAgICAgICBpZih0aGlzLm1vZGVsPT09MCl7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2ZpbGwnLCAndXJsKCNncmFkSW4pJywgNCApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCAnIzAwMCcsIDQgKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNjLmpveU91dCwgMiApO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsICdyZ2IoMCwwLDAsMC4xKScsIDMgKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgY2Muam95T3V0LCA0ICk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2ZpbGwnLCAnbm9uZScsIDQgKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOiAvLyBvdmVyXHJcbiAgICAgICAgICAgICAgICBpZih0aGlzLm1vZGVsPT09MCl7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2ZpbGwnLCAndXJsKCNncmFkSW4yKScsIDQgKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgJ3JnYmEoMCwwLDAsMCknLCA0ICk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjYy5qb3lPdmVyLCAyICk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy90aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgJ3JnYigwLDAsMCwwLjMpJywgMyApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjYy5qb3lTZWxlY3QsIDQgKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbCcsIGNjLmpveU92ZXIsIDQgKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMjogLy8gZWRpdFxyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgRVZFTlRTXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgYWRkSW50ZXJ2YWwgKCl7XHJcbiAgICAgICAgaWYoIHRoaXMuaW50ZXJ2YWwgIT09IG51bGwgKSB0aGlzLnN0b3BJbnRlcnZhbCgpO1xyXG4gICAgICAgIGlmKCB0aGlzLnBvcy5pc1plcm8oKSApIHJldHVybjtcclxuICAgICAgICB0aGlzLmludGVydmFsID0gc2V0SW50ZXJ2YWwoIGZ1bmN0aW9uKCl7IHRoaXMudXBkYXRlKCk7IH0uYmluZCh0aGlzKSwgMTAgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc3RvcEludGVydmFsICgpe1xyXG5cclxuICAgICAgICBpZiggdGhpcy5pbnRlcnZhbCA9PT0gbnVsbCApIHJldHVybjtcclxuICAgICAgICBjbGVhckludGVydmFsKCB0aGlzLmludGVydmFsICk7XHJcbiAgICAgICAgdGhpcy5pbnRlcnZhbCA9IG51bGw7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJlc2V0ICgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5hZGRJbnRlcnZhbCgpO1xyXG4gICAgICAgIHRoaXMubW9kZSgwKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2V1cCAoIGUgKSB7XHJcblxyXG4gICAgICAgIHRoaXMuYWRkSW50ZXJ2YWwoKTtcclxuICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG4gICAgXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vkb3duICggZSApIHtcclxuXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSB0cnVlO1xyXG4gICAgICAgIHRoaXMubW91c2Vtb3ZlKCBlICk7XHJcbiAgICAgICAgdGhpcy5tb2RlKCAyICk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlbW92ZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIHRoaXMubW9kZSgxKTtcclxuXHJcbiAgICAgICAgaWYoICF0aGlzLmlzRG93biApIHJldHVybjtcclxuXHJcbiAgICAgICAgLy90aGlzLnRtcC54ID0gdGhpcy5yYWRpdXMgLSAoIGUuY2xpZW50WCAtIHRoaXMuem9uZS54ICk7XHJcbiAgICAgICAgLy90aGlzLnRtcC55ID0gdGhpcy5yYWRpdXMgLSAoIGUuY2xpZW50WSAtIHRoaXMuem9uZS55IC0gdGhpcy50b3AgKTtcclxuXHJcbiAgICAgICAgdGhpcy50bXAueCA9ICh0aGlzLncqMC41KSAtICggZS5jbGllbnRYIC0gdGhpcy56b25lLnggKTtcclxuICAgICAgICB0aGlzLnRtcC55ID0gKHRoaXMuZGlhbSowLjUpIC0gKCBlLmNsaWVudFkgLSB0aGlzLnpvbmUueSAtIHRoaXMueXRvcCApO1xyXG5cclxuICAgICAgICBsZXQgZGlzdGFuY2UgPSB0aGlzLnRtcC5sZW5ndGgoKTtcclxuXHJcbiAgICAgICAgaWYgKCBkaXN0YW5jZSA+IHRoaXMuZGlzdGFuY2UgKSB7XHJcbiAgICAgICAgICAgIGxldCBhbmdsZSA9IE1hdGguYXRhbjIodGhpcy50bXAueCwgdGhpcy50bXAueSk7XHJcbiAgICAgICAgICAgIHRoaXMudG1wLnggPSBNYXRoLnNpbiggYW5nbGUgKSAqIHRoaXMuZGlzdGFuY2U7XHJcbiAgICAgICAgICAgIHRoaXMudG1wLnkgPSBNYXRoLmNvcyggYW5nbGUgKSAqIHRoaXMuZGlzdGFuY2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnBvcy5jb3B5KCB0aGlzLnRtcCApLmRpdmlkZVNjYWxhciggdGhpcy5kaXN0YW5jZSApLm5lZ2F0ZSgpO1xyXG5cclxuICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRWYWx1ZSAoIHYgKSB7XHJcblxyXG4gICAgICAgIGlmKHY9PT11bmRlZmluZWQpIHY9WzAsMF07XHJcblxyXG4gICAgICAgIHRoaXMucG9zLnNldCggdlswXSB8fCAwLCB2WzFdICB8fCAwICk7XHJcbiAgICAgICAgdGhpcy51cGRhdGVTVkcoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlICggdXAgKSB7XHJcblxyXG4gICAgICAgIGlmKCB1cCA9PT0gdW5kZWZpbmVkICkgdXAgPSB0cnVlO1xyXG5cclxuICAgICAgICBpZiggdGhpcy5pbnRlcnZhbCAhPT0gbnVsbCApe1xyXG5cclxuICAgICAgICAgICAgaWYoICF0aGlzLmlzRG93biApe1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucG9zLmxlcnAoIG51bGwsIDAuMyApO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucG9zLnggPSBNYXRoLmFicyggdGhpcy5wb3MueCApIDwgMC4wMSA/IDAgOiB0aGlzLnBvcy54O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wb3MueSA9IE1hdGguYWJzKCB0aGlzLnBvcy55ICkgPCAwLjAxID8gMCA6IHRoaXMucG9zLnk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYoIHRoaXMuaXNVSSAmJiB0aGlzLm1haW4uaXNDYW52YXMgKSB0aGlzLm1haW4uZHJhdygpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlU1ZHKCk7XHJcblxyXG4gICAgICAgIGlmKCB1cCApIHRoaXMuc2VuZCgpO1xyXG4gICAgICAgIFxyXG5cclxuICAgICAgICBpZiggdGhpcy5wb3MuaXNaZXJvKCkgKSB0aGlzLnN0b3BJbnRlcnZhbCgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVTVkcgKCkge1xyXG5cclxuICAgICAgICAvL2xldCB4ID0gdGhpcy5yYWRpdXMgLSAoIC10aGlzLnBvcy54ICogdGhpcy5kaXN0YW5jZSApO1xyXG4gICAgICAgIC8vbGV0IHkgPSB0aGlzLnJhZGl1cyAtICggLXRoaXMucG9zLnkgKiB0aGlzLmRpc3RhbmNlICk7XHJcblxyXG4gICAgICAgIGxldCB4ID0gKHRoaXMuZGlhbSowLjUpIC0gKCAtdGhpcy5wb3MueCAqIHRoaXMuZGlzdGFuY2UgKTtcclxuICAgICAgICBsZXQgeSA9ICh0aGlzLmRpYW0qMC41KSAtICggLXRoaXMucG9zLnkgKiB0aGlzLmRpc3RhbmNlICk7XHJcblxyXG4gICAgICAgIGlmKHRoaXMubW9kZWwgPT09IDApe1xyXG5cclxuICAgICAgICAgICAgbGV0IHN4ID0geCArICgodGhpcy5wb3MueCkqNSkgKyA1O1xyXG4gICAgICAgICAgICBsZXQgc3kgPSB5ICsgKCh0aGlzLnBvcy55KSo1KSArIDEwO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2N4Jywgc3gqdGhpcy5yYXRpbywgMyApO1xyXG4gICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnY3knLCBzeSp0aGlzLnJhdGlvLCAzICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2N4JywgeCp0aGlzLnJhdGlvLCAzICk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdjeScsIHkqdGhpcy5yYXRpbywgMyApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdjeCcsIHgqdGhpcy5yYXRpbywgNCApO1xyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdjeScsIHkqdGhpcy5yYXRpbywgNCApO1xyXG5cclxuICAgICAgICB0aGlzLnZhbHVlWzBdID0gICggdGhpcy5wb3MueCAqIHRoaXMubXVsdGlwbGljYXRvciApLnRvRml4ZWQoIHRoaXMucHJlY2lzaW9uICkgKiAxO1xyXG4gICAgICAgIHRoaXMudmFsdWVbMV0gPSAgKCB0aGlzLnBvcy55ICogdGhpcy5tdWx0aXBsaWNhdG9yICkudG9GaXhlZCggdGhpcy5wcmVjaXNpb24gKSAqIDE7XHJcblxyXG4gICAgICAgIGlmKHRoaXMuaGF2ZVRleHQpIHRoaXMuY1syXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWU7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNsZWFyICgpIHtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLnN0b3BJbnRlcnZhbCgpO1xyXG4gICAgICAgIHN1cGVyLmNsZWFyKCk7XHJcblxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcyc7XHJcbmltcG9ydCB7IFRvb2xzIH0gZnJvbSAnLi4vY29yZS9Ub29scy5qcyc7XHJcbmltcG9ydCB7IFYyIH0gZnJvbSAnLi4vY29yZS9WMi5qcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgS25vYiBleHRlbmRzIFByb3RvIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciggbyA9IHt9ICkge1xyXG5cclxuICAgICAgICBzdXBlciggbyApO1xyXG5cclxuICAgICAgICB0aGlzLmlzQ3ljbGljID0gby5jeWNsaWMgfHwgZmFsc2U7XHJcbiAgICAgICAgdGhpcy5tb2RlbCA9IG8uc3R5cGUgfHwgMDtcclxuICAgICAgICBpZiggby5tb2RlICE9PSB1bmRlZmluZWQgKSB0aGlzLm1vZGVsID0gby5tb2RlO1xyXG5cclxuICAgICAgICB0aGlzLmF1dG9XaWR0aCA9IGZhbHNlO1xyXG5cclxuICAgICAgICB0aGlzLnNldFR5cGVOdW1iZXIoIG8gKTtcclxuXHJcbiAgICAgICAgdGhpcy5taW53ICA9IHRoaXMud1xyXG4gICAgICAgIHRoaXMuZGlhbSA9IG8uZGlhbSB8fCB0aGlzLncgXHJcblxyXG4gICAgICAgIHRoaXMubVBJID0gTWF0aC5QSSAqIDAuODtcclxuICAgICAgICB0aGlzLnRvRGVnID0gMTgwIC8gTWF0aC5QSTtcclxuICAgICAgICB0aGlzLmNpclJhbmdlID0gdGhpcy5tUEkgKiAyO1xyXG5cclxuICAgICAgICB0aGlzLm9mZnNldCA9IG5ldyBWMigpO1xyXG5cclxuICAgICAgICB0aGlzLmggPSBvLmggfHwgdGhpcy53ICsgMTA7XHJcblxyXG4gICAgICAgIHRoaXMuY1swXS5zdHlsZS53aWR0aCA9IHRoaXMudyArJ3B4J1xyXG4gICAgICAgIHRoaXMuY1swXS5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJ1xyXG5cclxuICAgICAgICBpZih0aGlzLmNbMV0gIT09IHVuZGVmaW5lZCkge1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jWzFdLnN0eWxlLndpZHRoID0gJzEwMCUnXHJcbiAgICAgICAgICAgIHRoaXMuY1sxXS5zdHlsZS5qdXN0aWZ5Q29udGVudCA9ICdjZW50ZXInXHJcbiAgICAgICAgICAgIHRoaXMudG9wID0gMTA7XHJcbiAgICAgICAgICAgIHRoaXMuaCArPSAxMDtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnBlcmNlbnQgPSAwO1xyXG5cclxuICAgICAgICB0aGlzLmNtb2RlID0gMDtcclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICB0aGlzLmNbMl0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLnR4dCArICdqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyOyB0b3A6JysodGhpcy5oLTIwKSsncHg7IHdpZHRoOjEwMCU7IGNvbG9yOicrIGNjLnRleHQgKTtcclxuXHJcbiAgICAgICAgdGhpcy5jWzNdID0gdGhpcy5nZXRLbm9iKCk7XHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2ZpbGwnLCBjYy5idXR0b24sIDAgKVxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjYy50ZXh0LCAxIClcclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgY2MudGV4dCwgMyApXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2QnLCB0aGlzLm1ha2VHcmFkKCksIDMgKVxyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICd2aWV3Qm94JywgJzAgMCAnICsgdGhpcy5kaWFtICsgJyAnICsgdGhpcy5kaWFtIClcclxuICAgICAgICB0aGlzLnNldENzcyggdGhpcy5jWzNdLCB7IHdpZHRoOnRoaXMuZGlhbSwgaGVpZ2h0OnRoaXMuZGlhbSwgbGVmdDowLCB0b3A6dGhpcy50b3AgfSlcclxuXHJcbiAgICAgICAgaWYgKCB0aGlzLm1vZGVsID4gMCApIHtcclxuXHJcbiAgICAgICAgICAgIFRvb2xzLmRvbSggJ3BhdGgnLCAnJywgeyBkOiAnJywgc3Ryb2tlOmNjLnRleHQsICdzdHJva2Utd2lkdGgnOiAyLCBmaWxsOiAnbm9uZScsICdzdHJva2UtbGluZWNhcCc6ICdyb3VuZCcgfSwgdGhpcy5jWzNdICk7IC8vNFxyXG5cclxuICAgICAgICAgICAgaWYgKCB0aGlzLm1vZGVsID09IDIpIHtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBUb29scy5hZGRTVkdHbG93RWZmZWN0KCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3R5bGUnLCAnZmlsdGVyOiB1cmwoXCIjVUlMR2xvd1wiKTsnLCA0ICk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5yID0gMDtcclxuXHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vZGUgKCBtb2RlICkge1xyXG5cclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICBpZiggdGhpcy5jbW9kZSA9PT0gbW9kZSApIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICAgICAgc3dpdGNoKCBtb2RlICkge1xyXG4gICAgICAgICAgICBjYXNlIDA6IC8vIGJhc2VcclxuICAgICAgICAgICAgICAgIHRoaXMuc1syXS5jb2xvciA9IGNjLnRleHQ7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbCcsIGNjLmJ1dHRvbiwgMCk7XHJcbiAgICAgICAgICAgICAgICAvL3RoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCdyZ2JhKDI1NSwwLDAsMC4yKScsIDIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNjLnRleHQsIDEgKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTogLy8gZG93blxyXG4gICAgICAgICAgICAgICAgdGhpcy5zWzJdLmNvbG9yID0gY2MudGV4dE92ZXI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZmlsbCcsIGNjLnNlbGVjdCwgMCk7XHJcbiAgICAgICAgICAgICAgICAvL3RoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCdyZ2JhKDAsMCwwLDAuNiknLCAyKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjYy50ZXh0T3ZlciwgMSApO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY21vZGUgPSBtb2RlO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB0ZXN0Wm9uZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBsID0gdGhpcy5sb2NhbDtcclxuICAgICAgICBpZiggbC54ID09PSAtMSAmJiBsLnkgPT09IC0xICkgcmV0dXJuICcnO1xyXG4gICAgICAgIGlmKCBsLnkgPD0gdGhpcy5jWyAxIF0ub2Zmc2V0SGVpZ2h0ICkgcmV0dXJuICd0aXRsZSc7XHJcbiAgICAgICAgZWxzZSBpZiAoIGwueSA+IHRoaXMuaCAtIHRoaXMuY1sgMiBdLm9mZnNldEhlaWdodCApIHJldHVybiAndGV4dCc7XHJcbiAgICAgICAgZWxzZSByZXR1cm4gJ2tub2InO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIEVWRU5UU1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIG1vdXNldXAgKCBlICkge1xyXG5cclxuICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuc2VuZEVuZCgpXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZSgwKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZWRvd24gKCBlICkge1xyXG5cclxuICAgICAgICB0aGlzLmlzRG93biA9IHRydWVcclxuICAgICAgICB0aGlzLm9sZCA9IHRoaXMudmFsdWVcclxuICAgICAgICB0aGlzLm9sZHIgPSBudWxsXHJcbiAgICAgICAgdGhpcy5tb3VzZW1vdmUoIGUgKVxyXG4gICAgICAgIHJldHVybiB0aGlzLm1vZGUoMSlcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vtb3ZlICggZSApIHtcclxuXHJcbiAgICAgICAgaWYoICF0aGlzLmlzRG93biApIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IG9mZiA9IHRoaXMub2Zmc2V0O1xyXG5cclxuICAgICAgICAvL29mZi54ID0gdGhpcy5yYWRpdXMgLSAoIGUuY2xpZW50WCAtIHRoaXMuem9uZS54ICk7XHJcbiAgICAgICAgLy9vZmYueSA9IHRoaXMucmFkaXVzIC0gKCBlLmNsaWVudFkgLSB0aGlzLnpvbmUueSAtIHRoaXMudG9wICk7XHJcblxyXG4gICAgICAgIG9mZi54ID0gKHRoaXMudyowLjUpIC0gKCBlLmNsaWVudFggLSB0aGlzLnpvbmUueCApO1xyXG4gICAgICAgIG9mZi55ID0gKHRoaXMuZGlhbSowLjUpIC0gKCBlLmNsaWVudFkgLSB0aGlzLnpvbmUueSAtIHRoaXMueXRvcCApO1xyXG5cclxuICAgICAgICB0aGlzLnIgPSAtIE1hdGguYXRhbjIoIG9mZi54LCBvZmYueSApO1xyXG5cclxuICAgICAgICBpZiggdGhpcy5vbGRyICE9PSBudWxsICkgdGhpcy5yID0gTWF0aC5hYnModGhpcy5yIC0gdGhpcy5vbGRyKSA+IE1hdGguUEkgPyB0aGlzLm9sZHIgOiB0aGlzLnI7XHJcblxyXG4gICAgICAgIHRoaXMuciA9IHRoaXMuciA+IHRoaXMubVBJID8gdGhpcy5tUEkgOiB0aGlzLnI7XHJcbiAgICAgICAgdGhpcy5yID0gdGhpcy5yIDwgLXRoaXMubVBJID8gLXRoaXMubVBJIDogdGhpcy5yO1xyXG5cclxuICAgICAgICBsZXQgc3RlcHMgPSAxIC8gdGhpcy5jaXJSYW5nZTtcclxuICAgICAgICBsZXQgdmFsdWUgPSAodGhpcy5yICsgdGhpcy5tUEkpICogc3RlcHM7XHJcblxyXG4gICAgICAgIGxldCBuID0gKCAoIHRoaXMucmFuZ2UgKiB2YWx1ZSApICsgdGhpcy5taW4gKSAtIHRoaXMub2xkO1xyXG5cclxuICAgICAgICBpZihuID49IHRoaXMuc3RlcCB8fCBuIDw9IHRoaXMuc3RlcCl7IFxyXG4gICAgICAgICAgICBuID0gTWF0aC5mbG9vciggbiAvIHRoaXMuc3RlcCApO1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdGhpcy5udW1WYWx1ZSggdGhpcy5vbGQgKyAoIG4gKiB0aGlzLnN0ZXAgKSApO1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSggdHJ1ZSApO1xyXG4gICAgICAgICAgICB0aGlzLm9sZCA9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgICAgIHRoaXMub2xkciA9IHRoaXMucjtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHdoZWVsICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IG5hbWUgPSB0aGlzLnRlc3Rab25lKCBlICk7XHJcblxyXG4gICAgICAgIGlmKCBuYW1lID09PSAna25vYicgKSB7XHJcbiAgICBcclxuICAgICAgICAgICAgbGV0IHYgPSB0aGlzLnZhbHVlIC0gdGhpcy5zdGVwICogZS5kZWx0YTtcclxuICAgIFxyXG4gICAgICAgICAgICBpZiAoIHYgPiB0aGlzLm1heCApIHtcclxuICAgICAgICAgICAgICAgIHYgPSB0aGlzLmlzQ3ljbGljID8gdGhpcy5taW4gOiB0aGlzLm1heDtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICggdiA8IHRoaXMubWluICkge1xyXG4gICAgICAgICAgICAgICAgdiA9IHRoaXMuaXNDeWNsaWMgPyB0aGlzLm1heCA6IHRoaXMubWluO1xyXG4gICAgICAgICAgICB9XHJcbiAgICBcclxuICAgICAgICAgICAgdGhpcy5zZXRWYWx1ZSggdiApO1xyXG4gICAgICAgICAgICB0aGlzLm9sZCA9IHY7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKCB0cnVlICk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIFxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1ha2VHcmFkICgpIHtcclxuXHJcbiAgICAgICAgbGV0IGQgPSAnJywgc3RlcCwgcmFuZ2UsIGEsIHgsIHksIHgyLCB5MiwgciA9IDY0O1xyXG4gICAgICAgIGxldCBzdGFydGFuZ2xlID0gTWF0aC5QSSArIHRoaXMubVBJO1xyXG4gICAgICAgIGxldCBlbmRhbmdsZSA9IE1hdGguUEkgLSB0aGlzLm1QSTtcclxuICAgICAgICAvL2xldCBzdGVwID0gdGhpcy5zdGVwPjUgPyB0aGlzLnN0ZXAgOiAxO1xyXG5cclxuICAgICAgICBpZih0aGlzLnN0ZXA+NSl7XHJcbiAgICAgICAgICAgIHJhbmdlID0gIHRoaXMucmFuZ2UgLyB0aGlzLnN0ZXA7XHJcbiAgICAgICAgICAgIHN0ZXAgPSAoIHN0YXJ0YW5nbGUgLSBlbmRhbmdsZSApIC8gcmFuZ2U7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc3RlcCA9ICgoIHN0YXJ0YW5nbGUgLSBlbmRhbmdsZSApIC8gcikqMjtcclxuICAgICAgICAgICAgcmFuZ2UgPSByKjAuNTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZvciAoIGxldCBpID0gMDsgaSA8PSByYW5nZTsgKytpICkge1xyXG5cclxuICAgICAgICAgICAgYSA9IHN0YXJ0YW5nbGUgLSAoIHN0ZXAgKiBpICk7XHJcbiAgICAgICAgICAgIHggPSByICsgTWF0aC5zaW4oIGEgKSAqICggciAtIDIwICk7XHJcbiAgICAgICAgICAgIHkgPSByICsgTWF0aC5jb3MoIGEgKSAqICggciAtIDIwICk7XHJcbiAgICAgICAgICAgIHgyID0gciArIE1hdGguc2luKCBhICkgKiAoIHIgLSAyNCApO1xyXG4gICAgICAgICAgICB5MiA9IHIgKyBNYXRoLmNvcyggYSApICogKCByIC0gMjQgKTtcclxuICAgICAgICAgICAgZCArPSAnTScgKyB4ICsgJyAnICsgeSArICcgTCcgKyB4MiArICcgJyt5MiArICcgJztcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlICggdXAgKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY1syXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgdGhpcy5wZXJjZW50ID0gKHRoaXMudmFsdWUgLSB0aGlzLm1pbikgLyB0aGlzLnJhbmdlO1xyXG5cclxuICAgICAgICBsZXQgc2EgPSBNYXRoLlBJICsgdGhpcy5tUEk7XHJcbiAgICAgICAgbGV0IGVhID0gKCAoIHRoaXMucGVyY2VudCAqIHRoaXMuY2lyUmFuZ2UgKSAtICggdGhpcy5tUEkgKSApO1xyXG5cclxuICAgICAgICBsZXQgc2luID0gTWF0aC5zaW4oIGVhICk7XHJcbiAgICAgICAgbGV0IGNvcyA9IE1hdGguY29zKCBlYSApO1xyXG5cclxuICAgICAgICBsZXQgeDEgPSAoIDI1ICogc2luICkgKyA2NDtcclxuICAgICAgICBsZXQgeTEgPSAtKCAyNSAqIGNvcyApICsgNjQ7XHJcbiAgICAgICAgbGV0IHgyID0gKCAyMCAqIHNpbiApICsgNjQ7XHJcbiAgICAgICAgbGV0IHkyID0gLSggMjAgKiBjb3MgKSArIDY0O1xyXG5cclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnZCcsICdNICcgKyB4MSArJyAnICsgeTEgKyAnIEwgJyArIHgyICsnICcgKyB5MiwgMSApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICggdGhpcy5tb2RlbCA+IDAgKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgeDEgPSAzNiAqIE1hdGguc2luKCBzYSApICsgNjQ7XHJcbiAgICAgICAgICAgIGxldCB5MSA9IDM2ICogTWF0aC5jb3MoIHNhICkgKyA2NDtcclxuICAgICAgICAgICAgbGV0IHgyID0gMzYgKiBzaW4gKyA2NDtcclxuICAgICAgICAgICAgbGV0IHkyID0gLTM2ICogY29zICsgNjQ7XHJcbiAgICAgICAgICAgIGxldCBiaWcgPSBlYSA8PSBNYXRoLlBJIC0gdGhpcy5tUEkgPyAwIDogMTtcclxuICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2QnLCAnTSAnICsgeDEgKyAnLCcgKyB5MSArICcgQSAnICsgMzYgKyAnLCcgKyAzNiArICcgMSAnICsgYmlnICsgJyAxICcgKyB4MiArICcsJyArIHkyLCA0ICk7XHJcblxyXG4gICAgICAgICAgICBsZXQgY29sb3IgPSBUb29scy5wYWNrKCBUb29scy5sZXJwQ29sb3IoIFRvb2xzLnVucGFjayggVG9vbHMuQ29sb3JMdW1hKCB0aGlzLmNvbG9ycy50ZXh0LCAtMC43NSkgKSwgVG9vbHMudW5wYWNrKCB0aGlzLmNvbG9ycy50ZXh0ICksIHRoaXMucGVyY2VudCApICk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjb2xvciwgNCApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoIHVwICkgdGhpcy5zZW5kKCk7XHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdG8gfSBmcm9tICcuLi9jb3JlL1Byb3RvLmpzJztcclxuaW1wb3J0IHsgUm9vdHMgfSBmcm9tICcuLi9jb3JlL1Jvb3RzLmpzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBMaXN0IGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvICk7XHJcblxyXG4gICAgICAgIC8vIFRPRE8gbm90IHdvcmtcclxuICAgICAgICB0aGlzLmhpZGVDdXJyZW50ID0gZmFsc2VcclxuXHJcbiAgICAgICAgLy8gaW1hZ2VzXHJcbiAgICAgICAgdGhpcy5wYXRoID0gby5wYXRoIHx8ICcnO1xyXG4gICAgICAgIHRoaXMuZm9ybWF0ID0gby5mb3JtYXQgfHwgJyc7XHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIHRoaXMuaXNXaXRoSW1hZ2UgPSB0aGlzLnBhdGggIT09ICcnID8gdHJ1ZTpmYWxzZTtcclxuICAgICAgICB0aGlzLnByZUxvYWRDb21wbGV0ZSA9IGZhbHNlO1xyXG5cclxuICAgICAgICB0aGlzLnRtcEltYWdlID0ge307XHJcbiAgICAgICAgdGhpcy50bXBVcmwgPSBbXTtcclxuXHJcbiAgICAgICAgdGhpcy5tID0gby5tICE9PSB1bmRlZmluZWQgPyBvLm0gOiA1XHJcblxyXG5cclxuICAgICAgICBsZXQgYWxpZ24gPSBvLmFsaWduIHx8ICdsZWZ0JztcclxuXHJcbiAgICAgICAgLy8gc2Nyb2xsIHNpemVcclxuICAgICAgICBsZXQgc3MgPSBvLnNjcm9sbFNpemUgfHwgMTBcclxuICAgICAgICB0aGlzLnNzID0gc3MrMVxyXG5cclxuICAgICAgICB0aGlzLnNNb2RlID0gMDtcclxuICAgICAgICB0aGlzLnRNb2RlID0gMDtcclxuXHJcbiAgICAgICAgdGhpcy5saXN0T25seSA9IG8ubGlzdE9ubHkgfHwgZmFsc2VcclxuICAgICAgICB0aGlzLnN0YXRpY1RvcCA9IG8uc3RhdGljVG9wIHx8IGZhbHNlXHJcblxyXG4gICAgICAgIHRoaXMuaXNTZWxlY3RhYmxlID0gdGhpcy5saXN0T25seVxyXG4gICAgICAgIGlmKCBvLnNlbGVjdCAhPT0gdW5kZWZpbmVkICkgby5zZWxlY3RhYmxlID0gby5zZWxlY3RcclxuICAgICAgICBpZiggby5zZWxlY3RhYmxlICE9PSB1bmRlZmluZWQgKSB0aGlzLmlzU2VsZWN0YWJsZSA9IG8uc2VsZWN0YWJsZVxyXG5cclxuICAgICAgICBpZiggdGhpcy50eHQgPT09ICcnICkgdGhpcy5wID0gMDtcclxuXHJcblxyXG4gICAgICAgIGxldCBmbHRvcCA9IE1hdGguZmxvb3IodGhpcy5oKjAuNSktMztcclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICB0aGlzLmNbMl0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLmJhc2ljICsgJ3RvcDowOyBkaXNwbGF5Om5vbmU7IGJvcmRlci1yYWRpdXM6Jyt0aGlzLnJhZGl1cysncHg7JyApO1xyXG4gICAgICAgIHRoaXMuY1szXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MuaXRlbSArICdwYWRkaW5nOjBweCAnK3RoaXMubSsncHg7IG1hcmdpbi1ib3R0b206MHB4OyBwb3NpdGlvbjphYnNvbHV0ZTsganVzdGlmeS1jb250ZW50OicrYWxpZ24rJzsgdGV4dC1hbGlnbjonK2FsaWduKyc7IGxpbmUtaGVpZ2h0OicrKHRoaXMuaC00KSsncHg7IHRvcDoxcHg7IGJhY2tncm91bmQ6JytjYy5idXR0b24rJzsgaGVpZ2h0OicrKHRoaXMuaC0yKSsncHg7IGJvcmRlcjoxcHggc29saWQgJytjYy5ib3JkZXIrJzsgYm9yZGVyLXJhZGl1czonK3RoaXMucmFkaXVzKydweDsnICk7XHJcbiAgICAgICAgdGhpcy5jWzRdID0gdGhpcy5kb20oICdwYXRoJywgdGhpcy5jc3MuYmFzaWMgKyAncG9zaXRpb246YWJzb2x1dGU7IHdpZHRoOjZweDsgaGVpZ2h0OjZweDsgdG9wOicrZmx0b3ArJ3B4OycsIHsgZDp0aGlzLnN2Z3MuZzEsIGZpbGw6Y2MudGV4dCwgc3Ryb2tlOidub25lJ30pO1xyXG5cclxuICAgICAgICB0aGlzLnNjcm9sbGVyQmFjayA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MuYmFzaWMgKyAncmlnaHQ6MHB4OyB3aWR0aDonK3NzKydweDsgYmFja2dyb3VuZDonK2NjLmJhY2srJzsgZGlzcGxheTpub25lOycpO1xyXG4gICAgICAgIHRoaXMuc2Nyb2xsZXIgPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLmJhc2ljICsgJ3JpZ2h0OicrKChzcy0oc3MqMC4yNSkpKjAuNSkrJ3B4OyB3aWR0aDonKyhzcyowLjI1KSsncHg7IGJhY2tncm91bmQ6JytjYy50ZXh0Kyc7IGRpc3BsYXk6bm9uZTsgJyk7XHJcblxyXG4gICAgICAgIHRoaXMuY1szXS5zdHlsZS5jb2xvciA9IGNjLnRleHQ7XHJcblxyXG5cclxuICAgICAgICB0aGlzLmxpc3QgPSBbXVxyXG4gICAgICAgIHRoaXMucmVmT2JqZWN0ID0gbnVsbFxyXG5cclxuICAgICAgICBpZiggby5saXN0ICl7XHJcbiAgICAgICAgICAgIGlmKCBvLmxpc3QgaW5zdGFuY2VvZiBBcnJheSApe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saXN0ID0gby5saXN0XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiggby5saXN0IGluc3RhbmNlb2YgT2JqZWN0ICl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZk9iamVjdCA9IG8ubGlzdFxyXG4gICAgICAgICAgICAgICAgZm9yKCBsZXQgZyBpbiB0aGlzLnJlZk9iamVjdCApIHRoaXMubGlzdC5wdXNoKCBnIClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5pdGVtcyA9IFtdO1xyXG5cclxuICAgICAgICB0aGlzLnByZXZOYW1lID0gJyc7XHJcblxyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMudG1wSWQgPSAwXHJcblxyXG4gICAgICAgIHRoaXMuYmFzZUggPSB0aGlzLmg7XHJcblxyXG4gICAgICAgIHRoaXMuaXRlbUhlaWdodCA9IG8uaXRlbUhlaWdodCB8fCB0aGlzLmgvLyh0aGlzLmgtMyk7XHJcblxyXG4gICAgICAgIC8vIGZvcmNlIGZ1bGwgbGlzdCBcclxuICAgICAgICB0aGlzLmZ1bGwgPSBvLmZ1bGwgfHwgZmFsc2U7XHJcblxyXG4gICAgICAgIHRoaXMucHkgPSAwO1xyXG4gICAgICAgIHRoaXMud3cgPSB0aGlzLnNiO1xyXG4gICAgICAgIHRoaXMuc2Nyb2xsID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJyZW50ID0gbnVsbDtcclxuXHJcbiAgICAgICAgLy8gbGlzdCB1cCBvciBkb3duXHJcbiAgICAgICAgdGhpcy5zaWRlID0gby5zaWRlIHx8ICdkb3duJztcclxuICAgICAgICB0aGlzLnVwID0gdGhpcy5zaWRlID09PSAnZG93bicgPyAwIDogMTtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMudXAgKXtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY1syXS5zdHlsZS50b3AgPSAnYXV0byc7XHJcbiAgICAgICAgICAgIHRoaXMuY1szXS5zdHlsZS50b3AgPSAnYXV0byc7XHJcbiAgICAgICAgICAgIHRoaXMuY1s0XS5zdHlsZS50b3AgPSAnYXV0byc7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNbMl0uc3R5bGUuYm90dG9tID0gdGhpcy5oLTIgKyAncHgnO1xyXG4gICAgICAgICAgICB0aGlzLmNbM10uc3R5bGUuYm90dG9tID0gJzFweCc7XHJcbiAgICAgICAgICAgIHRoaXMuY1s0XS5zdHlsZS5ib3R0b20gPSBmbHRvcCArICdweCc7XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuY1syXS5zdHlsZS50b3AgPSB0aGlzLmJhc2VIICsgJ3B4JztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubGlzdEluID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy5iYXNpYyArICdsZWZ0OjA7IHRvcDowOyB3aWR0aDoxMDAlOyBiYWNrZ3JvdW5kOm5vbmU7Jyk7XHJcbiAgICAgICAgdGhpcy5saXN0SW4ubmFtZSA9ICdsaXN0JztcclxuXHJcbiAgICAgICAgdGhpcy50b3BMaXN0ID0gMDtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLmNbMl0uYXBwZW5kQ2hpbGQoIHRoaXMubGlzdEluICk7XHJcbiAgICAgICAgdGhpcy5jWzJdLmFwcGVuZENoaWxkKCB0aGlzLnNjcm9sbGVyQmFjayApO1xyXG4gICAgICAgIHRoaXMuY1syXS5hcHBlbmRDaGlsZCggdGhpcy5zY3JvbGxlciApO1xyXG5cclxuICAgICAgICBpZiggby52YWx1ZSAhPT0gdW5kZWZpbmVkICl7XHJcbiAgICAgICAgICAgIGlmKCFpc05hTihvLnZhbHVlKSkgdGhpcy52YWx1ZSA9IHRoaXMubGlzdFsgby52YWx1ZSBdO1xyXG4gICAgICAgICAgICBlbHNlIHRoaXMudmFsdWUgPSBvLnZhbHVlO1xyXG4gICAgICAgIH1lbHNle1xyXG4gICAgICAgICAgICB0aGlzLnZhbHVlID0gdGhpcy5saXN0WzBdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdGhpcy5pc09wZW5PblN0YXJ0ID0gby5vcGVuIHx8IGZhbHNlO1xyXG5cclxuICAgICAgICBpZiggdGhpcy5saXN0T25seSApe1xyXG4gICAgICAgICAgICB0aGlzLmJhc2VIID0gNTtcclxuICAgICAgICAgICAgdGhpcy5jWzNdLnN0eWxlLmRpc3BsYXkgPSAnbm9uZSc7XHJcbiAgICAgICAgICAgIHRoaXMuY1s0XS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgICAgICB0aGlzLmNbMl0uc3R5bGUudG9wID0gdGhpcy5iYXNlSCsncHgnXHJcbiAgICAgICAgICAgIHRoaXMuaXNPcGVuT25TdGFydCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5taW5pQ2FudmFzID0gby5taW5pQ2FudmFzIHx8IGZhbHNlIFxyXG4gICAgICAgIHRoaXMuY2FudmFzQmcgPSBvLmNhbnZhc0JnIHx8ICdyZ2JhKDAsMCwwLDApJ1xyXG4gICAgICAgIHRoaXMuaW1hZ2VTaXplID0gby5pbWFnZVNpemUgfHwgWzIwLDIwXTtcclxuXHJcbiAgICAgICAgLy8gZHJhZ291dCBmdW5jdGlvblxyXG4gICAgICAgIHRoaXMuZHJhZyA9IG8uZHJhZyB8fCBmYWxzZVxyXG4gICAgICAgIHRoaXMuZHJhZ291dCA9IG8uZHJhZ291dCB8fCBmYWxzZVxyXG4gICAgICAgIHRoaXMuZHJhZ3N0YXJ0ID0gby5kcmFnc3RhcnQgfHwgbnVsbFxyXG4gICAgICAgIHRoaXMuZHJhZ2VuZCA9IG8uZHJhZ2VuZCB8fCBudWxsXHJcblxyXG4gICAgICAgIFxyXG5cclxuICAgICAgICAvL3RoaXMuY1swXS5zdHlsZS5iYWNrZ3JvdW5kID0gJyNGRjAwMDAnXHJcbiAgICAgICAgLy8vaWYoIHRoaXMuaXNXaXRoSW1hZ2UgKSB0aGlzLnByZWxvYWRJbWFnZSgpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICB0aGlzLnNldExpc3QoIHRoaXMubGlzdCApO1xyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgICAgIGlmKCB0aGlzLmlzV2l0aEltYWdlICkgdGhpcy5wcmVsb2FkSW1hZ2UoKTtcclxuICAgICAgICBpZiggdGhpcy5pc09wZW5PblN0YXJ0ICkgdGhpcy5vcGVuKCB0cnVlIClcclxuXHJcbiAgICAgICAgdGhpcy5iYXNlSCArPSB0aGlzLm10b3BcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gaW1hZ2UgbGlzdFxyXG5cclxuICAgIHByZWxvYWRJbWFnZSAoKSB7XHJcblxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5wcmVMb2FkQ29tcGxldGUgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgdGhpcy50bXBJbWFnZSA9IHt9O1xyXG4gICAgICAgIGZvciggbGV0IGk9MDsgaTx0aGlzLmxpc3QubGVuZ3RoOyBpKysgKSB0aGlzLnRtcFVybC5wdXNoKCB0aGlzLmxpc3RbaV0gKTtcclxuICAgICAgICB0aGlzLmxvYWRPbmUoKTtcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICBuZXh0SW1nICgpIHtcclxuXHJcbiAgICAgICAgaWYodGhpcy5jID09PSBudWxsKSByZXR1cm5cclxuXHJcbiAgICAgICAgdGhpcy50bXBVcmwuc2hpZnQoKTtcclxuICAgICAgICBpZiggdGhpcy50bXBVcmwubGVuZ3RoID09PSAwICl7IFxyXG5cclxuICAgICAgICAgICAgdGhpcy5wcmVMb2FkQ29tcGxldGUgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRJbWFnZXMoKTtcclxuICAgICAgICAgICAgLyp0aGlzLnNldExpc3QoIHRoaXMubGlzdCApO1xyXG4gICAgICAgICAgICB0aGlzLmluaXQoKTtcclxuICAgICAgICAgICAgaWYoIHRoaXMuaXNPcGVuT25TdGFydCApIHRoaXMub3BlbigpOyovXHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHRoaXMubG9hZE9uZSgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBsb2FkT25lKCl7XHJcblxyXG4gICAgICAgIGxldCBzZWxmID0gdGhpc1xyXG4gICAgICAgIGxldCBuYW1lID0gdGhpcy50bXBVcmxbMF07XHJcbiAgICAgICAgbGV0IGltZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xyXG4gICAgICAgIGltZy5zdHlsZS5jc3NUZXh0ID0gJ3Bvc2l0aW9uOmFic29sdXRlOyB3aWR0aDonK3NlbGYuaW1hZ2VTaXplWzBdKydweDsgaGVpZ2h0Oicrc2VsZi5pbWFnZVNpemVbMV0rJ3B4JztcclxuICAgICAgICBpbWcuc2V0QXR0cmlidXRlKCdzcmMnLCB0aGlzLnBhdGggKyBuYW1lICsgdGhpcy5mb3JtYXQgKTtcclxuXHJcbiAgICAgICAgaW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCBmdW5jdGlvbigpIHtcclxuXHJcbiAgICAgICAgICAgIHNlbGYuaW1hZ2VTaXplWzJdID0gaW1nLndpZHRoO1xyXG4gICAgICAgICAgICBzZWxmLmltYWdlU2l6ZVszXSA9IGltZy5oZWlnaHQ7XHJcbiAgICAgICAgICAgIHNlbGYudG1wSW1hZ2VbbmFtZV0gPSBpbWc7XHJcbiAgICAgICAgICAgIHNlbGYubmV4dEltZygpO1xyXG5cclxuICAgICAgICB9KTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy9cclxuXHJcbiAgICB0ZXN0Wm9uZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBsID0gdGhpcy5sb2NhbDtcclxuICAgICAgICBpZiggbC54ID09PSAtMSAmJiBsLnkgPT09IC0xICkgcmV0dXJuICcnO1xyXG5cclxuICAgICAgICBpZiggdGhpcy51cCAmJiB0aGlzLmlzT3BlbiApe1xyXG4gICAgICAgICAgICBpZiggbC55ID4gdGhpcy5oIC0gdGhpcy5iYXNlSCApIHJldHVybiAndGl0bGUnO1xyXG4gICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgaWYoIHRoaXMuc2Nyb2xsICYmICggbC54ID4gKHRoaXMuc2ErdGhpcy5zYi10aGlzLnNzKSkgKSByZXR1cm4gJ3Njcm9sbCc7XHJcbiAgICAgICAgICAgICAgICBpZihsLnggPiB0aGlzLnNhKSByZXR1cm4gdGhpcy50ZXN0SXRlbXMoIGwueS10aGlzLmJhc2VIICk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYoIGwueSA8IHRoaXMuYmFzZUgrMiApIHJldHVybiAndGl0bGUnO1xyXG4gICAgICAgICAgICBlbHNle1xyXG4gICAgICAgICAgICAgICAgaWYoIHRoaXMuaXNPcGVuICl7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoIHRoaXMuc2Nyb2xsICYmICggbC54ID4gKHRoaXMuc2ErdGhpcy5zYi10aGlzLnNzKSkgKSByZXR1cm4gJ3Njcm9sbCc7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYobC54ID4gdGhpcy5zYSkgcmV0dXJuIHRoaXMudGVzdEl0ZW1zKCBsLnktdGhpcy5iYXNlSCApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuICcnO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB0ZXN0SXRlbXMgKCB5ICkge1xyXG5cclxuICAgICAgICBsZXQgbmFtZSA9ICcnO1xyXG5cclxuICAgICAgICBsZXQgaXRlbXMgPSB0aGlzLml0ZW1zXHJcblxyXG4gICAgICAgIC8qaWYodGhpcy5oaWRlQ3VycmVudCl7XHJcbiAgICAgICAgICAgIC8vaXRlbXMgPSBbLi4udGhpcy5pdGVtc11cclxuICAgICAgICAgICAgaXRlbXMgPSB0aGlzLml0ZW1zLnNsaWNlKHRoaXMudG1wSWQpXHJcblxyXG4gICAgICAgIH0qL1xyXG5cclxuICAgICAgICBsZXQgaSA9IGl0ZW1zLmxlbmd0aCwgaXRlbSwgYSwgYjtcclxuICAgICAgICB3aGlsZShpLS0pe1xyXG4gICAgICAgICAgICBpdGVtID0gaXRlbXNbaV07XHJcbiAgICAgICAgICAgIGEgPSBpdGVtLnBvc3kgKyB0aGlzLnRvcExpc3Q7XHJcbiAgICAgICAgICAgIGIgPSBpdGVtLnBvc3kgKyB0aGlzLml0ZW1IZWlnaHQgKyAxICsgdGhpcy50b3BMaXN0O1xyXG4gICAgICAgICAgICBpZiggeSA+PSBhICYmIHkgPD0gYiApeyBcclxuICAgICAgICAgICAgICAgIG5hbWUgPSAnaXRlbScgKyBpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlSXRlbSgwKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50ID0gaXRlbTtcclxuICAgICAgICAgICAgICAgIHRoaXMubW9kZUl0ZW0oMSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBuYW1lO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG5hbWU7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vZGVJdGVtICggbW9kZSApIHtcclxuXHJcbiAgICAgICAgaWYoICF0aGlzLmN1cnJlbnQgKSByZXR1cm5cclxuXHJcbiAgICAgICAgaWYoIHRoaXMuY3VycmVudC5zZWxlY3QgJiYgbW9kZT09PTApIG1vZGUgPSAyXHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnNcclxuXHJcbiAgICAgICAgc3dpdGNoKCBtb2RlICl7XHJcblxyXG4gICAgICAgICAgICBjYXNlIDA6IC8vIGJhc2VcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudC5zdHlsZS5iYWNrZ3JvdW5kID0gY2MuYmFja1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50LnN0eWxlLmNvbG9yID0gY2MudGV4dDtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTogLy8gb3ZlclxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50LnN0eWxlLmJhY2tncm91bmQgPSBjYy5vdmVyXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnQuc3R5bGUuY29sb3IgPSBjYy50ZXh0T3ZlcjtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMjogLy8gZWRpdCAvIGRvd25cclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudC5zdHlsZS5iYWNrZ3JvdW5kID0gY2Muc2VsZWN0XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnQuc3R5bGUuY29sb3IgPSBjYy50ZXh0U2VsZWN0O1xyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHVuU2VsZWN0ZWQoKSB7XHJcblxyXG4gICAgICAgIGlmKCAhdGhpcy5jdXJyZW50ICkgcmV0dXJuXHJcbiAgICAgICAgdGhpcy5tb2RlSXRlbSgwKVxyXG4gICAgICAgIHRoaXMuY3VycmVudCA9IG51bGxcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2VsZWN0ZWQoKSB7XHJcblxyXG4gICAgICAgIGlmKCAhdGhpcy5jdXJyZW50ICkgcmV0dXJuXHJcbiAgICAgICAgdGhpcy5yZXNldEl0ZW1zKClcclxuICAgICAgICB0aGlzLm1vZGVJdGVtKDIpXHJcbiAgICAgICAgdGhpcy5jdXJyZW50LnNlbGVjdCA9IHRydWVcclxuXHJcbiAgICAgICAgXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJlc2V0SXRlbXMoKSB7XHJcblxyXG4gICAgICAgIGxldCBpID0gdGhpcy5pdGVtcy5sZW5ndGhcclxuICAgICAgICB3aGlsZShpLS0pe1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zW2ldLnNlbGVjdCA9IGZhbHNlXHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0uc3R5bGUuYmFja2dyb3VuZCA9IHRoaXMuY29sb3JzLmJhY2s7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0uc3R5bGUuY29sb3IgPSB0aGlzLmNvbG9ycy50ZXh0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgaGlkZUFjdGl2ZSgpIHtcclxuXHJcbiAgICAgICAgaWYoICF0aGlzLmhpZGVDdXJyZW50ICkgcmV0dXJuXHJcbiAgICAgICAgLy9pZiggIXRoaXMuY3VycmVudCApIHJldHVyblxyXG4gICAgICAgIGlmKCB0aGlzLmN1cnJlbnQgKXRoaXMudG1wSWQgPSB0aGlzLmN1cnJlbnQuaWRcclxuICAgICAgICB0aGlzLnJlc2V0SGlkZSgpXHJcbiAgICAgICAgLy90aGlzLml0ZW1zW3RoaXMudG1wSWRdLnN0eWxlLmhlaWdodCA9IDArJ3B4J1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIHJlc2V0SGlkZSgpIHtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2codGhpcy50bXBJZClcclxuXHJcbiAgICAgICAgbGV0IGkgPSB0aGlzLml0ZW1zLmxlbmd0aFxyXG4gICAgICAgIHdoaWxlKGktLSl7XHJcbiAgICAgICAgICAgIGlmKGk9PT10aGlzLnRtcElkKXtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0uc3R5bGUuaGVpZ2h0ID0gMCsncHgnXHJcbiAgICAgICAgICAgICAgICB0aGlzLml0ZW1zW2ldLnBvc3kgPSAtMTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0uc3R5bGUuaGVpZ2h0ID0gdGhpcy5pdGVtSGVpZ2h0KydweCdcclxuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXNbaV0ucG9zeSA9ICh0aGlzLml0ZW1IZWlnaHQrMSkqKGktMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy90aGlzLml0ZW1zW2ldLnN0eWxlLmRpc3BsYXkgPSAnZmxleCdcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8qdGhpcy5pdGVtc1tpXS5zZWxlY3QgPSBmYWxzZVxyXG4gICAgICAgICAgICB0aGlzLml0ZW1zW2ldLnN0eWxlLmJhY2tncm91bmQgPSB0aGlzLmNvbG9ycy5iYWNrO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zW2ldLnN0eWxlLmNvbG9yID0gdGhpcy5jb2xvcnMudGV4dDsqL1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBFVkVOVFNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcblxyXG4gICAgbW91c2V1cCAoIGUgKSB7XHJcblxyXG4gICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2U7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlZG93biAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZSggZSApO1xyXG5cclxuICAgICAgICBpZiggIW5hbWUgKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgICAgIGlmKCBuYW1lID09PSAnc2Nyb2xsJyApe1xyXG5cclxuICAgICAgICAgICAgdGhpcy5pc0Rvd24gPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLm1vdXNlbW92ZSggZSApO1xyXG5cclxuICAgICAgICB9IGVsc2UgaWYoIG5hbWUgPT09ICd0aXRsZScgKXtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW9kZVRpdGxlKDIpXHJcbiAgICAgICAgICAgIGlmKCAhdGhpcy5saXN0T25seSApe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oaWRlQWN0aXZlKClcclxuICAgICAgICAgICAgICAgIGlmKCAhdGhpcy5pc09wZW4gKSB0aGlzLm9wZW4oKVxyXG4gICAgICAgICAgICAgICAgZWxzZSB0aGlzLmNsb3NlKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vIGlzIGl0ZW1cclxuICAgICAgICAgICAgaWYoIHRoaXMuY3VycmVudCApe1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgPSB0aGlzLmxpc3RbIHRoaXMuY3VycmVudC5pZCBdXHJcbiAgICAgICAgICAgICAgICAvL3RoaXMudG1wSWQgPSB0aGlzLmN1cnJlbnQuaWRcclxuXHJcbiAgICAgICAgICAgICAgICBpZiggdGhpcy5pc1NlbGVjdGFibGUgKSB0aGlzLnNlbGVjdGVkKClcclxuXHJcbiAgICAgICAgICAgICAgICAvL3RoaXMuc2VuZCggdGhpcy5yZWZPYmplY3QgIT09IG51bGwgPyB0aGlzLnJlZk9iamVjdFsgdGhpcy5saXN0W3RoaXMuY3VycmVudC5pZF1dIDogdGhpcy52YWx1ZSApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZW5kKCB0aGlzLnZhbHVlIClcclxuXHJcbiAgICAgICAgICAgICAgICBpZiggIXRoaXMubGlzdE9ubHkgKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbG9zZSgpXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRUb3BJdGVtKClcclxuICAgICAgICAgICAgICAgICAgICAvL3RoaXMuaGlkZUFjdGl2ZSgpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vtb3ZlICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IG51cCA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZSggZSApO1xyXG5cclxuICAgICAgICBpZiggIW5hbWUgKSByZXR1cm4gbnVwO1xyXG5cclxuICAgICAgICBpZiggbmFtZSA9PT0gJ3RpdGxlJyApe1xyXG4gICAgICAgICAgICB0aGlzLnVuU2VsZWN0ZWQoKTtcclxuICAgICAgICAgICAgdGhpcy5tb2RlVGl0bGUoMSk7XHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yKCdwb2ludGVyJyk7XHJcblxyXG4gICAgICAgIH0gZWxzZSBpZiggbmFtZSA9PT0gJ3Njcm9sbCcgKXtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yKCdzLXJlc2l6ZScpO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGVTY3JvbGwoMSk7XHJcbiAgICAgICAgICAgIGlmKCB0aGlzLmlzRG93biApe1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb2RlU2Nyb2xsKDIpO1xyXG4gICAgICAgICAgICAgICAgLy90aGlzLnVwZGF0ZSggKCBlLmNsaWVudFkgLSB0b3AgICkgLSAoIHRoaXMuc2gqMC41ICkgKTtcclxuICAgICAgICAgICAgICAgIGxldCB0b3AgPSB0aGlzLnpvbmUueSt0aGlzLmJhc2VILTI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZSggKCBlLmNsaWVudFkgLSB0b3AgICkgLSAoIHRoaXMuc2gqMC41ICkgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvL2lmKHRoaXMuaXNEb3duKSB0aGlzLmxpc3Rtb3ZlKGUpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICAvLyBpcyBpdGVtXHJcbiAgICAgICAgICAgIHRoaXMubW9kZVRpdGxlKDApO1xyXG4gICAgICAgICAgICB0aGlzLm1vZGVTY3JvbGwoMCk7XHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yKCdwb2ludGVyJyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggbmFtZSAhPT0gdGhpcy5wcmV2TmFtZSApIG51cCA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5wcmV2TmFtZSA9IG5hbWU7XHJcblxyXG4gICAgICAgIHJldHVybiBudXA7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHdoZWVsICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IG5hbWUgPSB0aGlzLnRlc3Rab25lKCBlICk7XHJcbiAgICAgICAgaWYoIG5hbWUgPT09ICd0aXRsZScgKSByZXR1cm4gZmFsc2U7IFxyXG4gICAgICAgIHRoaXMucHkgKz0gZS5kZWx0YSoxMDtcclxuICAgICAgICB0aGlzLnVwZGF0ZSh0aGlzLnB5KTtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgcmVzZXQgKCkge1xyXG5cclxuICAgICAgICB0aGlzLnByZXZOYW1lID0gJyc7XHJcbiAgICAgICAgdGhpcy51blNlbGVjdGVkKCk7XHJcbiAgICAgICAgdGhpcy5tb2RlVGl0bGUoMCk7XHJcbiAgICAgICAgdGhpcy5tb2RlU2Nyb2xsKDApO1xyXG5cclxuICAgICAgICAvL2NvbnNvbGUubG9nKCd0aGlzIGlzIHJlc2V0JylcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICBtb2RlU2Nyb2xsICggbW9kZSApIHtcclxuXHJcbiAgICAgICAgaWYoIG1vZGUgPT09IHRoaXMuc01vZGUgKSByZXR1cm47XHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zY3JvbGxlci5zdHlsZTtcclxuICAgICAgICBsZXQgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICBzd2l0Y2gobW9kZSl7XHJcbiAgICAgICAgICAgIGNhc2UgMDogLy8gYmFzZVxyXG4gICAgICAgICAgICAgICAgcy5iYWNrZ3JvdW5kID0gY2MudGV4dDtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTogLy8gb3ZlclxyXG4gICAgICAgICAgICAgICAgcy5iYWNrZ3JvdW5kID0gY2Muc2VsZWN0O1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOiAvLyBlZGl0IC8gZG93blxyXG4gICAgICAgICAgICAgICAgcy5iYWNrZ3JvdW5kID0gY2Muc2VsZWN0O1xyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNNb2RlID0gbW9kZTtcclxuICAgIH1cclxuXHJcbiAgICBtb2RlVGl0bGUgKCBtb2RlICkge1xyXG5cclxuICAgICAgICBpZiggbW9kZSA9PT0gdGhpcy50TW9kZSApIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IHMgPSB0aGlzLnM7XHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnNcclxuXHJcbiAgICAgICAgc3dpdGNoKG1vZGUpe1xyXG4gICAgICAgICAgICBjYXNlIDA6IC8vIGJhc2VcclxuICAgICAgICAgICAgICAgIHNbM10uY29sb3IgPSBjYy50ZXh0O1xyXG4gICAgICAgICAgICAgICAgc1szXS5iYWNrZ3JvdW5kID0gY2MuYnV0dG9uO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAxOiAvLyBvdmVyXHJcbiAgICAgICAgICAgICAgICBzWzNdLmNvbG9yID0gY2MudGV4dE92ZXI7XHJcbiAgICAgICAgICAgICAgICBzWzNdLmJhY2tncm91bmQgPSBjYy5vdmVyb2ZmO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOiAvLyBlZGl0IC8gZG93blxyXG4gICAgICAgICAgICAgICAgc1szXS5jb2xvciA9IGNjLnRleHRTZWxlY3Q7XHJcbiAgICAgICAgICAgICAgICBzWzNdLmJhY2tncm91bmQgPSBjYy5vdmVyb2ZmO1xyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnRNb2RlID0gbW9kZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgY2xlYXJMaXN0ICgpIHtcclxuXHJcbiAgICAgICAgd2hpbGUgKCB0aGlzLmxpc3RJbi5jaGlsZHJlbi5sZW5ndGggKSB0aGlzLmxpc3RJbi5yZW1vdmVDaGlsZCggdGhpcy5saXN0SW4ubGFzdENoaWxkICk7XHJcbiAgICAgICAgdGhpcy5pdGVtcyA9IFtdO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRMaXN0ICggbGlzdCApIHtcclxuXHJcbiAgICAgICAgdGhpcy5jbGVhckxpc3QoKTtcclxuXHJcbiAgICAgICAgdGhpcy5saXN0ID0gbGlzdDtcclxuICAgICAgICB0aGlzLmxlbmd0aCA9IHRoaXMubGlzdC5sZW5ndGg7XHJcblxyXG4gICAgICAgIGxldCBsbmcgPSB0aGlzLmhpZGVDdXJyZW50PyB0aGlzLmxlbmd0aC0xIDogdGhpcy5sZW5ndGhcclxuXHJcbiAgICAgICAgdGhpcy5tYXhJdGVtID0gdGhpcy5mdWxsID8gbG5nIDogNTtcclxuICAgICAgICB0aGlzLm1heEl0ZW0gPSBsbmcgPCB0aGlzLm1heEl0ZW0gPyBsbmcgOiB0aGlzLm1heEl0ZW07XHJcblxyXG4gICAgICAgIHRoaXMubWF4SGVpZ2h0ID0gdGhpcy5tYXhJdGVtICogKHRoaXMuaXRlbUhlaWdodCsxKSArIDI7XHJcbiAgICAgICAgXHJcblxyXG5cclxuICAgICAgICB0aGlzLm1heCA9IGxuZyAqICh0aGlzLml0ZW1IZWlnaHQrMSkgKyAyO1xyXG4gICAgICAgIHRoaXMucmF0aW8gPSB0aGlzLm1heEhlaWdodCAvIHRoaXMubWF4O1xyXG4gICAgICAgIHRoaXMuc2ggPSB0aGlzLm1heEhlaWdodCAqIHRoaXMucmF0aW87XHJcbiAgICAgICAgdGhpcy5yYW5nZSA9IHRoaXMubWF4SGVpZ2h0IC0gdGhpcy5zaDtcclxuXHJcbiAgICAgICAgdGhpcy5jWzJdLnN0eWxlLmhlaWdodCA9IHRoaXMubWF4SGVpZ2h0ICsgJ3B4JztcclxuICAgICAgICB0aGlzLnNjcm9sbGVyQmFjay5zdHlsZS5oZWlnaHQgPSB0aGlzLm1heEhlaWdodCArICdweCc7XHJcbiAgICAgICAgdGhpcy5zY3JvbGxlci5zdHlsZS5oZWlnaHQgPSB0aGlzLnNoICsgJ3B4JztcclxuXHJcbiAgICAgICAgaWYoIHRoaXMubWF4ID4gdGhpcy5tYXhIZWlnaHQgKXsgXHJcbiAgICAgICAgICAgIHRoaXMud3cgPSB0aGlzLnNiIC0gdGhpcy5zcztcclxuICAgICAgICAgICAgdGhpcy5zY3JvbGwgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoIHRoaXMubWluaUNhbnZhcyApIHtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudG1wQ2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcclxuICAgICAgICAgICAgdGhpcy50bXBDYW52YXMud2lkdGggPSB0aGlzLmltYWdlU2l6ZVswXVxyXG4gICAgICAgICAgICB0aGlzLnRtcENhbnZhcy5oZWlnaHQgPSB0aGlzLmltYWdlU2l6ZVsxXVxyXG4gICAgICAgICAgICB0aGlzLnRtcEN0eCA9IHRoaXMudG1wQ2FudmFzLmdldENvbnRleHQoXCIyZFwiKVxyXG4gICAgICAgICAgICB0aGlzLnRtcEN0eC5maWxsU3R5bGUgPSB0aGlzLmNhbnZhc0JnXHJcbiAgICAgICAgICAgIHRoaXMudG1wQ3R4LmZpbGxSZWN0KDAsIDAsIHRoaXMuaW1hZ2VTaXplWzBdLCB0aGlzLmltYWdlU2l6ZVsxXSlcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgaXRlbSwgbjsvLywgbCA9IHRoaXMuc2I7XHJcbiAgICAgICAgZm9yKCBsZXQgaT0wOyBpPHRoaXMubGVuZ3RoOyBpKysgKXtcclxuXHJcbiAgICAgICAgICAgIG4gPSB0aGlzLmxpc3RbaV07XHJcbiAgICAgICAgICAgIGl0ZW0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLml0ZW0gKyAncGFkZGluZzowcHggJysodGhpcy5tKzEpKydweDsgd2lkdGg6Jyt0aGlzLnd3KydweDsgaGVpZ2h0OicrdGhpcy5pdGVtSGVpZ2h0KydweDsgbGluZS1oZWlnaHQ6JysodGhpcy5pdGVtSGVpZ2h0LTIpKydweDsgY29sb3I6Jyt0aGlzLmNvbG9ycy50ZXh0Kyc7IGJhY2tncm91bmQ6Jyt0aGlzLmNvbG9ycy5iYWNrKyc7JyApO1xyXG4gICAgICAgICAgICBpdGVtLm5hbWUgPSAnaXRlbScrIGlcclxuICAgICAgICAgICAgaXRlbS5pZCA9IGk7XHJcbiAgICAgICAgICAgIGl0ZW0uc2VsZWN0ID0gZmFsc2VcclxuICAgICAgICAgICAgaXRlbS5wb3N5ID0gKHRoaXMuaXRlbUhlaWdodCsxKSppO1xyXG4gICAgICAgICAgICB0aGlzLmxpc3RJbi5hcHBlbmRDaGlsZCggaXRlbSApO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zLnB1c2goIGl0ZW0gKTtcclxuXHJcbiAgICAgICAgICAgIGlmKCBuID09PSB0aGlzLnZhbHVlICkgdGhpcy5jdXJyZW50ID0gaXRlbVxyXG5cclxuICAgICAgICAgICAgLy9pZiggdGhpcy5pc1dpdGhJbWFnZSApIGl0ZW0uYXBwZW5kQ2hpbGQoIHRoaXMudG1wSW1hZ2Vbbl0gKTtcclxuICAgICAgICAgICAgaWYoICF0aGlzLmlzV2l0aEltYWdlICkgaXRlbS50ZXh0Q29udGVudCA9IG47XHJcblxyXG4gICAgICAgICAgICBpZiggdGhpcy5taW5pQ2FudmFzICl7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGMgPSBuZXcgSW1hZ2UoKVxyXG4gICAgICAgICAgICAgICAgYy5zcmMgPSB0aGlzLnRtcENhbnZhcy50b0RhdGFVUkwoKVxyXG5cclxuICAgICAgICAgICAgICAgIC8vaXRlbS5zdHlsZS5tYXJnaW5MZWZ0ID0gKHRoaXMuaW1hZ2VTaXplWzBdKzgpKydweCdcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgLypsZXQgYyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpXHJcblxyXG4gICAgICAgICAgICAgICAgYy53aWR0aCA9IHRoaXMuaW1hZ2VTaXplWzBdXHJcbiAgICAgICAgICAgICAgICBjLmhlaWdodCA9IHRoaXMuaW1hZ2VTaXplWzFdXHJcbiAgICAgICAgICAgICAgICBsZXQgY3R4ID0gYy5nZXRDb250ZXh0KFwiMmRcIilcclxuICAgICAgICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSB0aGlzLmNhbnZhc0JnXHJcbiAgICAgICAgICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgdGhpcy5pbWFnZVNpemVbMF0sIHRoaXMuaW1hZ2VTaXplWzFdKSovXHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vYy5zdHlsZS5jc3NUZXh0ID0gJ3Bvc2l0aW9uOnJlbGF0aXZlOyBwb2ludGVyLWV2ZW50czpub25lOyBkaXNwbGF5OmlubGluZS1ibG9jazsgZmxvYXQ6bGVmdDsgbWFyZ2luLWxlZnQ6MHB4OyBtYXJnaW4tcmlnaHQ6NXB4OyB0b3A6MnB4J1xyXG4gICAgICAgICAgICAgICAvLyBjLnN0eWxlLmNzc1RleHQgPScgZmxleC1zaHJpbms6IDA7J1xyXG5cclxuICAgICAgICAgICAgICAgIGMuc3R5bGUuY3NzVGV4dCA9J21hcmdpbi1yaWdodDo0cHg7J1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAvL2Muc3R5bGUuY3NzVGV4dCA9ICdkaXNwbGF5OmZsZXg7IGFsaWduLWNvbnRlbnQ6IGZsZXgtc3RhcnQ7IGZsZXgtd3JhcDogd3JhcDsnXHJcbiAgICAgICAgICAgICAgICAvL2l0ZW0uc3R5bGUuZmxvYXQgPSAncmlnaHQnXHJcbiAgICAgICAgICAgICAgICBpdGVtLmFwcGVuZENoaWxkKCBjIClcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnRtcEltYWdlW25dID0gY1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYoIHRoaXMuZHJhZ291dCApe1xyXG5cclxuICAgICAgICAgICAgICAgIGl0ZW0uaW1nID0gdGhpcy50bXBJbWFnZVtuXVxyXG5cclxuICAgICAgICAgICAgICAgIGl0ZW0uc3R5bGUucG9pbnRlckV2ZW50cyA9ICdhdXRvJztcclxuICAgICAgICAgICAgICAgIGl0ZW0uZHJhZ2dhYmxlID0gXCJ0cnVlXCJcclxuXHJcbiAgICAgICAgICAgICAgICBpdGVtLmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdzdGFydCcsIHRoaXMuZHJhZ3N0YXJ0IHx8IGZ1bmN0aW9uKCl7IC8qY29uc29sZS5sb2coJ2RyYWcgc3RhcnQnKSovfSlcclxuICAgICAgICAgICAgICAgIGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcignZHJhZycsIHRoaXMuZHJhZyB8fCBmdW5jdGlvbigpeyAvKmNvbnNvbGUubG9nKCdkcmFnIHN0YXJ0JykqL30pXHJcbiAgICAgICAgICAgICAgICAvL2l0ZW0uYWRkRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCB0aGlzKTtcclxuICAgICAgICAgICAgICAgIC8vaXRlbS5hZGRFdmVudExpc3RlbmVyKCdkcmFnZW50ZXInLCB0aGlzKTtcclxuICAgICAgICAgICAgICAgIGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2xlYXZlJywgZnVuY3Rpb24oKXsgUm9vdHMuZmFrZVVwKCk7IH0gKTtcclxuICAgICAgICAgICAgICAgIGl0ZW0uYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VuZCcsIHRoaXMuZHJhZ2VuZCB8fCBmdW5jdGlvbigpeyAvKmNvbnNvbGUubG9nKCdkcmFnIGVuZCcpKi8gfS5iaW5kKHRoaXMpIClcclxuICAgICAgICAgICAgICAgIC8vaXRlbS5hZGRFdmVudExpc3RlbmVyKCdkcm9wJywgZnVuY3Rpb24oKXtjb25zb2xlLmxvZygnZHJvcCcpfSlcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNldFRvcEl0ZW0oKTtcclxuICAgICAgICBpZiggdGhpcy5pc1NlbGVjdGFibGUgKSB0aGlzLnNlbGVjdGVkKClcclxuICAgICAgICBcclxuICAgIH1cclxuXHJcbiAgICBkcmF3SW1hZ2UoIG5hbWUsIGltYWdlLCB4LHksdyxoICl7XHJcblxyXG4gICAgICAgIHRoaXMudG1wQ3R4LmNsZWFyUmVjdCgwLCAwLCB0aGlzLmltYWdlU2l6ZVswXSwgdGhpcy5pbWFnZVNpemVbMV0pO1xyXG4gICAgICAgIHRoaXMudG1wQ3R4LmRyYXdJbWFnZShpbWFnZSwgeCwgeSwgdywgaCwgMCwgMCwgdGhpcy5pbWFnZVNpemVbMF0sIHRoaXMuaW1hZ2VTaXplWzFdKVxyXG4gICAgICAgIHRoaXMudG1wSW1hZ2VbbmFtZV0uc3JjID0gdGhpcy50bXBDYW52YXMudG9EYXRhVVJMKClcclxuXHJcblxyXG4gICAgICAgIC8qbGV0IGMgPSB0aGlzLnRtcEltYWdlW25hbWVdXHJcbiAgICAgICAgbGV0IGN0eCA9IGMuZ2V0Q29udGV4dChcIjJkXCIpXHJcbiAgICAgICAgY3R4LmRyYXdJbWFnZShpbWFnZSwgeCwgeSwgdywgaCwgMCwgMCwgdGhpcy5pbWFnZVNpemVbMF0sIHRoaXMuaW1hZ2VTaXplWzFdKSovXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGFkZEltYWdlcyAoKXtcclxuICAgICAgICBsZXQgbG5nID0gdGhpcy5saXN0Lmxlbmd0aDtcclxuICAgICAgICBmb3IoIGxldCBpPTA7IGk8bG5nOyBpKysgKXtcclxuICAgICAgICAgICAgdGhpcy5pdGVtc1tpXS5hcHBlbmRDaGlsZCggdGhpcy50bXBJbWFnZVt0aGlzLmxpc3RbaV1dICk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc2V0VG9wSXRlbSgpO1xyXG4gICAgfVxyXG5cclxuICAgIHNldFZhbHVlICggdmFsdWUgKSB7XHJcblxyXG4gICAgICAgIGlmKCFpc05hTih2YWx1ZSkpIHRoaXMudmFsdWUgPSB0aGlzLmxpc3RbIHZhbHVlIF07XHJcbiAgICAgICAgZWxzZSB0aGlzLnZhbHVlID0gdmFsdWU7XHJcblxyXG4gICAgICAgIC8vdGhpcy50bXBJZCA9IHZhbHVlXHJcblxyXG4gICAgICAgIHRoaXMuc2V0VG9wSXRlbSgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRUb3BJdGVtICgpe1xyXG5cclxuICAgICAgICBpZiggdGhpcy5zdGF0aWNUb3AgKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmlzV2l0aEltYWdlICl7XHJcblxyXG4gICAgICAgICAgICBpZighdGhpcy5wcmVMb2FkQ29tcGxldGUgKSByZXR1cm47XHJcblxyXG4gICAgICAgICAgICBpZighdGhpcy5jWzNdLmNoaWxkcmVuLmxlbmd0aCl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYW52YXMud2lkdGggPSB0aGlzLmltYWdlU2l6ZVswXVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZVNpemVbMV1cclxuICAgICAgICAgICAgICAgIHRoaXMuY2FudmFzLnN0eWxlLmNzc1RleHQgPSdtYXJnaW4tcmlnaHQ6NHB4OydcclxuICAgICAgICAgICAgICAgIHRoaXMuY3R4ID0gdGhpcy5jYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jWzNdLnN0eWxlLnRleHRBbGlnbiA9ICdsZWZ0J1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jWzNdLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2xlZnQnXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNbM10uYXBwZW5kQ2hpbGQoIHRoaXMuY2FudmFzICk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBpbWcgPSB0aGlzLnRtcEltYWdlWyB0aGlzLnZhbHVlIF07XHJcbiAgICAgICAgICAgIHRoaXMuY3R4LmRyYXdJbWFnZSggdGhpcy50bXBJbWFnZVsgdGhpcy52YWx1ZSBdLCAwLCAwLCB0aGlzLmltYWdlU2l6ZVsyXSwgdGhpcy5pbWFnZVNpemVbM10sIDAsMCwgdGhpcy5pbWFnZVNpemVbMF0sIHRoaXMuaW1hZ2VTaXplWzFdICk7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHRoaXMuY1szXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWU7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLm1pbmlDYW52YXMgKXtcclxuXHJcbiAgICAgICAgICAgIGlmKCF0aGlzLmNbM10uY2hpbGRyZW4ubGVuZ3RoKXtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuaW1hZ2VTaXplWzBdO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5pbWFnZVNpemVbMV07XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbnZhcy5zdHlsZS5jc3NUZXh0ID0nbWFyZ2luLXJpZ2h0OjRweDsnXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN0eCA9IHRoaXMuY2FudmFzLmdldENvbnRleHQoXCIyZFwiKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jWzNdLnN0eWxlLnRleHRBbGlnbiA9ICdsZWZ0J1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jWzNdLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2xlZnQnXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNbM10uYXBwZW5kQ2hpbGQoIHRoaXMuY2FudmFzIClcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5jdHguZHJhd0ltYWdlKCB0aGlzLnRtcEltYWdlWyB0aGlzLnZhbHVlIF0sIDAsIDAgKTtcclxuXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8vIC0tLS0tIExJU1RcclxuXHJcbiAgICB1cGRhdGUgKCB5ICkge1xyXG5cclxuICAgICAgICBpZiggIXRoaXMuc2Nyb2xsICkgcmV0dXJuO1xyXG5cclxuICAgICAgICB5ID0geSA8IDAgPyAwIDogeTtcclxuICAgICAgICB5ID0geSA+IHRoaXMucmFuZ2UgPyB0aGlzLnJhbmdlIDogeTtcclxuXHJcbiAgICAgICAgdGhpcy50b3BMaXN0ID0gLU1hdGguZmxvb3IoIHkgLyB0aGlzLnJhdGlvICk7XHJcblxyXG4gICAgICAgIHRoaXMubGlzdEluLnN0eWxlLnRvcCA9IHRoaXMudG9wTGlzdCsncHgnO1xyXG4gICAgICAgIHRoaXMuc2Nyb2xsZXIuc3R5bGUudG9wID0gTWF0aC5mbG9vciggeSApICArICdweCc7XHJcblxyXG4gICAgICAgIHRoaXMucHkgPSB5O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBwYXJlbnRIZWlnaHQgKCB0ICkge1xyXG5cclxuICAgICAgICBpZiAoIHRoaXMuZ3JvdXAgIT09IG51bGwgKSB0aGlzLmdyb3VwLmNhbGMoIHQgKTtcclxuICAgICAgICBlbHNlIGlmICggdGhpcy5pc1VJICkgdGhpcy5tYWluLmNhbGMoIHQgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgb3BlbiAoIGZpcnN0ICkge1xyXG5cclxuICAgICAgICBzdXBlci5vcGVuKCk7XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlKCAwIClcclxuXHJcbiAgICAgICAgdGhpcy5oID0gdGhpcy5tYXhIZWlnaHQgKyB0aGlzLmJhc2VIICsgNTtcclxuICAgICAgICBpZiggIXRoaXMuc2Nyb2xsICl7XHJcbiAgICAgICAgICAgIHRoaXMudG9wTGlzdCA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuaCA9IHRoaXMuYmFzZUggKyA1ICsgdGhpcy5tYXg7XHJcbiAgICAgICAgICAgIHRoaXMuc2Nyb2xsZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICAgICAgdGhpcy5zY3JvbGxlckJhY2suc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aGlzLnNjcm9sbGVyLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snO1xyXG4gICAgICAgICAgICB0aGlzLnNjcm9sbGVyQmFjay5zdHlsZS5kaXNwbGF5ID0gJ2Jsb2NrJztcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5zWzBdLmhlaWdodCA9IHRoaXMuaCArICdweCc7XHJcbiAgICAgICAgdGhpcy5zWzJdLmRpc3BsYXkgPSAnYmxvY2snO1xyXG5cclxuICAgICAgICBpZiggdGhpcy51cCApeyBcclxuICAgICAgICAgICAgdGhpcy56b25lLnkgLT0gdGhpcy5oIC0gKHRoaXMuYmFzZUgtMTApO1xyXG4gICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzRdLCAnZCcsIHRoaXMuc3Zncy5nMSApO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbNF0sICdkJywgdGhpcy5zdmdzLmcyICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnJTaXplQ29udGVudCgpO1xyXG5cclxuICAgICAgICBsZXQgdCA9IHRoaXMuaCAtIHRoaXMuYmFzZUg7XHJcblxyXG4gICAgICAgIHRoaXMuem9uZS5oID0gdGhpcy5oO1xyXG5cclxuICAgICAgICBpZighZmlyc3QpIHRoaXMucGFyZW50SGVpZ2h0KCB0ICk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGNsb3NlICgpIHtcclxuXHJcbiAgICAgICAgc3VwZXIuY2xvc2UoKTtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMudXAgKSB0aGlzLnpvbmUueSArPSB0aGlzLmggLSAodGhpcy5iYXNlSC0xMCk7XHJcblxyXG4gICAgICAgIGxldCB0ID0gdGhpcy5oIC0gdGhpcy5iYXNlSDtcclxuXHJcbiAgICAgICAgdGhpcy5oID0gdGhpcy5iYXNlSDtcclxuICAgICAgICB0aGlzLnNbMF0uaGVpZ2h0ID0gdGhpcy5oICsgJ3B4JztcclxuICAgICAgICB0aGlzLnNbMl0uZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzRdLCAnZCcsIHRoaXMuc3Zncy5nMSApO1xyXG5cclxuICAgICAgICB0aGlzLnpvbmUuaCA9IHRoaXMuaDtcclxuXHJcbiAgICAgICAgdGhpcy5wYXJlbnRIZWlnaHQoIC10ICk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tXHJcblxyXG4gICAgdGV4dCAoIHR4dCApIHtcclxuXHJcbiAgICAgICAgdGhpcy5jWzNdLnRleHRDb250ZW50ID0gdHh0O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByU2l6ZUNvbnRlbnQgKCkge1xyXG5cclxuICAgICAgICBsZXQgaSA9IHRoaXMubGVuZ3RoO1xyXG4gICAgICAgIHdoaWxlKGktLSkgdGhpcy5saXN0SW4uY2hpbGRyZW5baV0uc3R5bGUud2lkdGggPSB0aGlzLnd3ICsgJ3B4JztcclxuXHJcbiAgICB9XHJcblxyXG4gICAgclNpemUgKCkge1xyXG5cclxuICAgICAgICBzdXBlci5yU2l6ZSgpXHJcblxyXG4gICAgICAgIC8vUHJvdG8ucHJvdG90eXBlLnJTaXplLmNhbGwoIHRoaXMgKTtcclxuXHJcbiAgICAgICAgbGV0IHMgPSB0aGlzLnM7XHJcbiAgICAgICAgbGV0IHcgPSB0aGlzLnNiO1xyXG4gICAgICAgIGxldCBkID0gdGhpcy5zYTtcclxuXHJcbiAgICAgICAgaWYoc1syXT09PSB1bmRlZmluZWQpIHJldHVybjtcclxuXHJcbiAgICAgICAgc1syXS53aWR0aCA9IHcgKyAncHgnO1xyXG4gICAgICAgIHNbMl0ubGVmdCA9IGQgKydweCc7XHJcblxyXG4gICAgICAgIHNbM10ud2lkdGggPSB3ICsgJ3B4JztcclxuICAgICAgICBzWzNdLmxlZnQgPSBkICsgJ3B4JztcclxuXHJcbiAgICAgICAgc1s0XS5sZWZ0ID0gZCArIHcgLSAxNSArICdweCc7XHJcblxyXG4gICAgICAgIHRoaXMud3cgPSB3O1xyXG4gICAgICAgIGlmKCB0aGlzLm1heCA+IHRoaXMubWF4SGVpZ2h0ICkgdGhpcy53dyA9IHctdGhpcy5zcztcclxuICAgICAgICBpZih0aGlzLmlzT3BlbikgdGhpcy5yU2l6ZUNvbnRlbnQoKTtcclxuXHJcbiAgICB9XHJcblxyXG59IiwiaW1wb3J0IHsgUHJvdG8gfSBmcm9tICcuLi9jb3JlL1Byb3RvLmpzJztcclxuaW1wb3J0IHsgVG9vbHMgfSBmcm9tICcuLi9jb3JlL1Rvb2xzLmpzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBOdW1lcmljIGV4dGVuZHMgUHJvdG8ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIHN1cGVyKCBvIClcclxuXHJcbiAgICAgICAgdGhpcy5zZXRUeXBlTnVtYmVyKCBvIClcclxuXHJcbiAgICAgICAgdGhpcy5hbGx3YXkgPSBvLmFsbHdheSB8fCBmYWxzZVxyXG5cclxuICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IFswXVxyXG4gICAgICAgIHRoaXMubXVsdHkgPSAxXHJcbiAgICAgICAgdGhpcy5pbnZtdWx0eSA9IDFcclxuICAgICAgICB0aGlzLmlzU2luZ2xlID0gdHJ1ZVxyXG4gICAgICAgIHRoaXMuaXNBbmdsZSA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5pc1ZlY3RvciA9IGZhbHNlXHJcblxyXG4gICAgICAgIGlmKCBvLmlzQW5nbGUgKXtcclxuICAgICAgICAgICAgdGhpcy5pc0FuZ2xlID0gdHJ1ZVxyXG4gICAgICAgICAgICB0aGlzLm11bHR5ID0gVG9vbHMudG9yYWRcclxuICAgICAgICAgICAgdGhpcy5pbnZtdWx0eSA9IFRvb2xzLnRvZGVnXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmlzRHJhZyA9IG8uZHJhZyB8fCBmYWxzZVxyXG5cclxuICAgICAgICBpZiggby52YWx1ZSAhPT0gdW5kZWZpbmVkICl7XHJcbiAgICAgICAgICAgIGlmKCAhaXNOYU4oby52YWx1ZSkgKXtcclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgPSBbby52YWx1ZV1cclxuICAgICAgICAgICAgfSBlbHNlIGlmKCBvLnZhbHVlIGluc3RhbmNlb2YgQXJyYXkgKXsgXHJcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlID0gby52YWx1ZVxyXG4gICAgICAgICAgICAgICAgdGhpcy5pc1NpbmdsZSA9IGZhbHNlXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiggby52YWx1ZSBpbnN0YW5jZW9mIE9iamVjdCApeyBcclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgPSBbXVxyXG4gICAgICAgICAgICAgICAgaWYoIG8udmFsdWUueCAhPT0gdW5kZWZpbmVkICkgdGhpcy52YWx1ZVswXSA9IG8udmFsdWUueFxyXG4gICAgICAgICAgICAgICAgaWYoIG8udmFsdWUueSAhPT0gdW5kZWZpbmVkICkgdGhpcy52YWx1ZVsxXSA9IG8udmFsdWUueVxyXG4gICAgICAgICAgICAgICAgaWYoIG8udmFsdWUueiAhPT0gdW5kZWZpbmVkICkgdGhpcy52YWx1ZVsyXSA9IG8udmFsdWUuelxyXG4gICAgICAgICAgICAgICAgaWYoIG8udmFsdWUudyAhPT0gdW5kZWZpbmVkICkgdGhpcy52YWx1ZVszXSA9IG8udmFsdWUud1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc1NpbmdsZSA9IGZhbHNlXHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzVmVjdG9yID0gdHJ1ZVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLmxuZyA9IHRoaXMudmFsdWUubGVuZ3RoXHJcbiAgICAgICAgdGhpcy50bXAgPSBbXVxyXG5cclxuICAgICAgICB0aGlzLmN1cnJlbnQgPSAtMVxyXG4gICAgICAgIHRoaXMucHJldiA9IHsgeDowLCB5OjAsIGQ6MCwgdjowIH1cclxuXHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnNcclxuXHJcbiAgICAgICAgLy8gYmdcclxuICAgICAgICB0aGlzLmNbMl0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLmJhc2ljICsgJyBiYWNrZ3JvdW5kOicgKyBjYy5zZWxlY3QgKyAnOyB0b3A6NHB4OyB3aWR0aDowcHg7IGhlaWdodDonICsgKHRoaXMuaC04KSArICdweDsnIClcclxuXHJcbiAgICAgICAgdGhpcy5jTW9kZSA9IFtdXHJcbiAgICAgICAgXHJcbiAgICAgICAgbGV0IGkgPSB0aGlzLmxuZ1xyXG4gICAgICAgIHdoaWxlKGktLSl7XHJcblxyXG4gICAgICAgICAgICBpZiggdGhpcy5pc0FuZ2xlICkgdGhpcy52YWx1ZVtpXSA9ICh0aGlzLnZhbHVlW2ldICogMTgwIC8gTWF0aC5QSSkudG9GaXhlZCggdGhpcy5wcmVjaXNpb24gKVxyXG4gICAgICAgICAgICB0aGlzLmNbMytpXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0c2VsZWN0ICsgJ3RvcDoxcHg7IGhlaWdodDonKyh0aGlzLmgtMikrJ3B4OyBjb2xvcjonICsgY2MudGV4dCArICc7IGJhY2tncm91bmQ6JyArIGNjLmJhY2sgKyAnOyBib3JkZXJDb2xvcjonICsgY2MuYm9yZGVyKyc7IGJvcmRlci1yYWRpdXM6Jyt0aGlzLnJhZGl1cysncHg7JylcclxuICAgICAgICAgICAgaWYoby5jZW50ZXIpIHRoaXMuY1syK2ldLnN0eWxlLnRleHRBbGlnbiA9ICdjZW50ZXInXHJcbiAgICAgICAgICAgIHRoaXMuY1szK2ldLnRleHRDb250ZW50ID0gdGhpcy52YWx1ZVtpXVxyXG4gICAgICAgICAgICB0aGlzLmNbMytpXS5zdHlsZS5jb2xvciA9IHRoaXMuY29sb3JzLnRleHRcclxuICAgICAgICAgICAgdGhpcy5jWzMraV0uaXNOdW0gPSB0cnVlXHJcbiAgICAgICAgICAgIHRoaXMuY01vZGVbaV0gPSAwXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gc2VsZWN0aW9uXHJcbiAgICAgICAgdGhpcy5zZWxlY3RJZCA9IDMgKyB0aGlzLmxuZztcclxuICAgICAgICB0aGlzLmNbdGhpcy5zZWxlY3RJZF0gPSB0aGlzLmRvbSggICdkaXYnLCB0aGlzLmNzcy50eHRzZWxlY3QgKyAncG9zaXRpb246YWJzb2x1dGU7IHRvcDoycHg7IGhlaWdodDonICsgKHRoaXMuaC00KSArICdweDsgcGFkZGluZzowcHggMHB4OyB3aWR0aDowcHg7IGNvbG9yOicgKyBjYy50ZXh0U2VsZWN0ICsgJzsgYmFja2dyb3VuZDonICsgY2Muc2VsZWN0ICsgJzsgYm9yZGVyOm5vbmU7IGJvcmRlci1yYWRpdXM6MHB4OycpO1xyXG5cclxuICAgICAgICAvLyBjdXJzb3JcclxuICAgICAgICB0aGlzLmN1cnNvcklkID0gNCArIHRoaXMubG5nO1xyXG4gICAgICAgIHRoaXMuY1sgdGhpcy5jdXJzb3JJZCBdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy5iYXNpYyArICd0b3A6MnB4OyBoZWlnaHQ6JyArICh0aGlzLmgtNCkgKyAncHg7IHdpZHRoOjBweDsgYmFja2dyb3VuZDonK2NjLnRleHQrJzsnICk7XHJcblxyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG4gICAgfVxyXG5cclxuICAgIHRlc3Rab25lICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IGwgPSB0aGlzLmxvY2FsXHJcbiAgICAgICAgaWYoIGwueCA9PT0gLTEgJiYgbC55ID09PSAtMSApIHJldHVybiAnJ1xyXG5cclxuICAgICAgICBsZXQgaSA9IHRoaXMubG5nXHJcbiAgICAgICAgbGV0IHQgPSB0aGlzLnRtcFxyXG5cclxuICAgICAgICB3aGlsZSggaS0tICl7XHJcbiAgICAgICAgICAgIGlmKCBsLng+dFtpXVswXSAmJiBsLng8dFtpXVsyXSApIHJldHVybiBpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gJydcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBFVkVOVFNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBtb3VzZWRvd24gKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoIGUgKVxyXG5cclxuICAgICAgICBpZiggIXRoaXMuaXNEb3duICl7XHJcbiAgICAgICAgICAgIHRoaXMuaXNEb3duID0gdHJ1ZVxyXG4gICAgICAgICAgICBpZiggbmFtZSAhPT0gJycgKXsgXHJcbiAgICAgICAgICAgIFx0dGhpcy5jdXJyZW50ID0gbmFtZVxyXG4gICAgICAgICAgICBcdHRoaXMucHJldiA9IHsgeDplLmNsaWVudFgsIHk6ZS5jbGllbnRZLCBkOjAsIHY6IHRoaXMuaXNTaW5nbGUgPyBwYXJzZUZsb2F0KHRoaXMudmFsdWUpIDogcGFyc2VGbG9hdCggdGhpcy52YWx1ZVsgdGhpcy5jdXJyZW50IF0gKSB9XHJcbiAgICAgICAgICAgIFx0dGhpcy5zZXRJbnB1dCggdGhpcy5jWyAzICsgdGhpcy5jdXJyZW50IF0gKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdXNlbW92ZSggZSApXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gZmFsc2VcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2V1cCAoIGUgKSB7XHJcblxyXG4gICAgXHRpZiggdGhpcy5pc0Rvd24gKXtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2VcclxuICAgICAgICAgICAgdGhpcy5wcmV2ID0geyB4OjAsIHk6MCwgZDowLCB2OjAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW91c2Vtb3ZlKCBlIClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZW1vdmUgKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgbnVwID0gZmFsc2VcclxuICAgICAgICBsZXQgeCA9IDBcclxuXHJcbiAgICAgICAgbGV0IG5hbWUgPSB0aGlzLnRlc3Rab25lKCBlIClcclxuXHJcbiAgICAgICAgaWYoIG5hbWUgPT09ICcnICkgdGhpcy5jdXJzb3IoKVxyXG4gICAgICAgIGVsc2V7IFxyXG4gICAgICAgIFx0aWYoIXRoaXMuaXNEcmFnKSB0aGlzLmN1cnNvcigndGV4dCcpO1xyXG4gICAgICAgIFx0ZWxzZSB0aGlzLmN1cnNvciggdGhpcy5jdXJyZW50ICE9PSAtMSA/ICdtb3ZlJyA6ICdwb2ludGVyJyApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmlzRHJhZyApe1xyXG5cclxuICAgICAgICBcdGlmKCB0aGlzLmN1cnJlbnQgIT09IC0xICl7XHJcblxyXG4gICAgICAgICAgICBcdHRoaXMucHJldi5kICs9ICggZS5jbGllbnRYIC0gdGhpcy5wcmV2LnggKSAtICggZS5jbGllbnRZIC0gdGhpcy5wcmV2LnkgKVxyXG5cclxuICAgICAgICAgICAgICAgIGxldCBuID0gdGhpcy5wcmV2LnYgKyAoIHRoaXMucHJldi5kICogdGhpcy5zdGVwKVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWVbIHRoaXMuY3VycmVudCBdID0gdGhpcy5udW1WYWx1ZShuKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jWyAzICsgdGhpcy5jdXJyZW50IF0udGV4dENvbnRlbnQgPSB0aGlzLnZhbHVlW3RoaXMuY3VycmVudF1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnZhbGlkYXRlKClcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnByZXYueCA9IGUuY2xpZW50WFxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcmV2LnkgPSBlLmNsaWVudFlcclxuXHJcbiAgICAgICAgICAgICAgICBudXAgPSB0cnVlXHJcbiAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgIFx0aWYoIHRoaXMuaXNEb3duICkgeCA9IGUuY2xpZW50WCAtIHRoaXMuem9uZS54IC0zXHJcbiAgICAgICAgXHRpZiggdGhpcy5jdXJyZW50ICE9PSAtMSApIHggLT0gdGhpcy50bXBbdGhpcy5jdXJyZW50XVswXVxyXG4gICAgICAgIFx0cmV0dXJuIHRoaXMudXBJbnB1dCggeCwgdGhpcy5pc0Rvd24gKVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBudXBcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIHJlc2V0ICgpIHtcclxuXHJcbiAgICAgICAgbGV0IG51cCA9IGZhbHNlXHJcbiAgICAgICAgcmV0dXJuIG51cFxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgc2V0VmFsdWUgKCB2ICkge1xyXG5cclxuICAgICAgICBpZiggdGhpcy5pc1ZlY3RvciApe1xyXG4gICAgICAgICAgICBpZiggdi54ICE9PSB1bmRlZmluZWQgKSB0aGlzLnZhbHVlWzBdID0gdi54XHJcbiAgICAgICAgICAgIGlmKCB2LnkgIT09IHVuZGVmaW5lZCApIHRoaXMudmFsdWVbMV0gPSB2LnlcclxuICAgICAgICAgICAgaWYoIHYueiAhPT0gdW5kZWZpbmVkICkgdGhpcy52YWx1ZVsyXSA9IHYuelxyXG4gICAgICAgICAgICBpZiggdi53ICE9PSB1bmRlZmluZWQgKSB0aGlzLnZhbHVlWzNdID0gdi53XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHRoaXMuaXNTaW5nbGUgPyBbdl0gOiB2ICBcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlKClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2FtZVN0ciAoIHN0ciApe1xyXG5cclxuICAgICAgICBsZXQgaSA9IHRoaXMudmFsdWUubGVuZ3RoXHJcbiAgICAgICAgd2hpbGUoaS0tKSB0aGlzLmNbIDMgKyBpIF0udGV4dENvbnRlbnQgPSBzdHJcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdXBkYXRlICggdXAgKSB7XHJcblxyXG4gICAgICAgIGxldCBpID0gdGhpcy52YWx1ZS5sZW5ndGhcclxuXHJcbiAgICAgICAgd2hpbGUoaS0tKXtcclxuICAgICAgICAgICAgIHRoaXMudmFsdWVbaV0gPSB0aGlzLm51bVZhbHVlKCB0aGlzLnZhbHVlW2ldICogdGhpcy5pbnZtdWx0eSApXHJcbiAgICAgICAgICAgICB0aGlzLmNbIDMgKyBpIF0udGV4dENvbnRlbnQgPSB0aGlzLnZhbHVlW2ldXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggdXAgKSB0aGlzLnNlbmQoKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZW5kICggdiApIHtcclxuXHJcbiAgICAgICAgdiA9IHYgfHwgdGhpcy52YWx1ZVxyXG5cclxuICAgICAgICB0aGlzLmlzU2VuZCA9IHRydWVcclxuXHJcbiAgICAgICAgaWYoIHRoaXMub2JqZWN0TGluayAhPT0gbnVsbCApeyBcclxuXHJcbiAgICAgICAgICAgIGlmKCB0aGlzLmlzVmVjdG9yICl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9iamVjdExpbmtbIHRoaXMub2JqZWN0S2V5IF0uZnJvbUFycmF5KCB2IClcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMub2JqZWN0TGlua1sgdGhpcy5vYmplY3RLZXkgXSA9IHZcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmNhbGxiYWNrICkgdGhpcy5jYWxsYmFjayggdiwgdGhpcy5vYmplY3RLZXkgKVxyXG4gICAgICAgIHRoaXMuaXNTZW5kID0gZmFsc2VcclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgSU5QVVRcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBzZWxlY3QgKCBjLCBlLCB3LCB0ICkge1xyXG5cclxuICAgICAgICBsZXQgcyA9IHRoaXMuc1xyXG4gICAgICAgIGxldCBkID0gdGhpcy5jdXJyZW50ICE9PSAtMSA/IHRoaXMudG1wW3RoaXMuY3VycmVudF1bMF0gKyA1IDogMFxyXG4gICAgICAgIHNbdGhpcy5jdXJzb3JJZF0ud2lkdGggPSAnMXB4J1xyXG4gICAgICAgIHNbdGhpcy5jdXJzb3JJZF0ubGVmdCA9ICggZCArIGMgKSArICdweCdcclxuICAgICAgICBzW3RoaXMuc2VsZWN0SWRdLmxlZnQgPSAgKCBkICsgZSApICArICdweCdcclxuICAgICAgICBzW3RoaXMuc2VsZWN0SWRdLndpZHRoID0gIHcgICsgJ3B4J1xyXG4gICAgICAgIHRoaXMuY1t0aGlzLnNlbGVjdElkXS5pbm5lckhUTUwgPSB0XHJcbiAgICBcclxuICAgIH1cclxuXHJcbiAgICB1bnNlbGVjdCAoKSB7XHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zXHJcbiAgICAgICAgaWYoIXMpIHJldHVyblxyXG4gICAgICAgIHRoaXMuY1t0aGlzLnNlbGVjdElkXS5pbm5lckhUTUwgPSAnJ1xyXG4gICAgICAgIHNbdGhpcy5zZWxlY3RJZF0ud2lkdGggPSAwICsgJ3B4J1xyXG4gICAgICAgIHNbdGhpcy5jdXJzb3JJZF0ud2lkdGggPSAwICsgJ3B4J1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB2YWxpZGF0ZSAoIGZvcmNlICkge1xyXG5cclxuICAgICAgICBsZXQgYXIgPSBbXVxyXG4gICAgICAgIGxldCBpID0gdGhpcy5sbmdcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuYWxsd2F5ICkgZm9yY2UgPSB0cnVlXHJcblxyXG4gICAgICAgIHdoaWxlKGktLSl7XHJcbiAgICAgICAgXHRpZighaXNOYU4oIHRoaXMuY1sgMyArIGkgXS50ZXh0Q29udGVudCApKXsgXHJcbiAgICAgICAgICAgICAgICBsZXQgbnggPSB0aGlzLm51bVZhbHVlKCB0aGlzLmNbIDMgKyBpIF0udGV4dENvbnRlbnQgKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY1sgMyArIGkgXS50ZXh0Q29udGVudCA9IG54XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlW2ldID0gbnhcclxuICAgICAgICAgICAgfSBlbHNlIHsgLy8gbm90IG51bWJlclxyXG4gICAgICAgICAgICAgICAgdGhpcy5jWyAzICsgaSBdLnRleHRDb250ZW50ID0gdGhpcy52YWx1ZVtpXVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIFx0YXJbaV0gPSB0aGlzLnZhbHVlW2ldICogdGhpcy5tdWx0eVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoICFmb3JjZSApIHJldHVyblxyXG4gICAgICAgIHRoaXMuc2VuZCggdGhpcy5pc1NpbmdsZSA/IGFyWzBdIDogYXIgKVxyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIFJFWklTRVxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIHJTaXplICgpIHtcclxuXHJcbiAgICAgICAgc3VwZXIuclNpemUoKVxyXG4gICAgICAgIGxldCBzeCA9IHRoaXMuY29sb3JzLnN4XHJcbiAgICAgICAgbGV0IHNzID0gc3ggKiAodGhpcy5sbmctMSlcclxuICAgICAgICBsZXQgdyA9ICh0aGlzLnNiLXNzKSAvIHRoaXMubG5nLy8oKCB0aGlzLnNiICsgc3ggKSAvIHRoaXMubG5nICktc3hcclxuICAgICAgICBsZXQgcyA9IHRoaXMuc1xyXG4gICAgICAgIGxldCBpID0gdGhpcy5sbmdcclxuXHJcbiAgICAgICAgd2hpbGUoaS0tKXtcclxuICAgICAgICAgICAgLy90aGlzLnRtcFtpXSA9IFsgTWF0aC5mbG9vciggdGhpcy5zYSArICggdyAqIGkgKSsoIDUgKiBpICkpLCB3IF07XHJcbiAgICAgICAgICAgIHRoaXMudG1wW2ldID0gWyAoIHRoaXMuc2EgKyAoIHcgKiBpICkrKCBzeCAqIGkgKSksIHcgXVxyXG4gICAgICAgICAgICB0aGlzLnRtcFtpXVsyXSA9IHRoaXMudG1wW2ldWzBdICsgdGhpcy50bXBbaV1bMV1cclxuICAgICAgICAgICAgc1sgMyArIGkgXS5sZWZ0ID0gdGhpcy50bXBbaV1bMF0gKyAncHgnXHJcbiAgICAgICAgICAgIHNbIDMgKyBpIF0ud2lkdGggPSB0aGlzLnRtcFtpXVsxXSArICdweCdcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFByb3RvIH0gZnJvbSBcIi4uL2NvcmUvUHJvdG8uanNcIjtcclxuaW1wb3J0IHsgVG9vbHMgfSBmcm9tIFwiLi4vY29yZS9Ub29scy5qc1wiO1xyXG5cclxuZnVuY3Rpb24gZWFzZSh4LCBtaW4sIG1heCwgcG93ZXIpIHtcclxuICBsZXQgbiA9IG1pbiArIE1hdGgucG93KCh4IC0gbWluKSAvIChtYXggLSBtaW4pLCBwb3dlcikgKiAobWF4IC0gbWluKTtcclxuICByZXR1cm4gbjtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFNsaWRlIGV4dGVuZHMgUHJvdG8ge1xyXG4gIGNvbnN0cnVjdG9yKG8gPSB7fSkge1xyXG4gICAgc3VwZXIobyk7XHJcblxyXG4gICAgaWYgKG8uZWFzaW5nIDw9IDApIHRocm93IFwiRWFzaW5nIG11c3QgYmUgPiAwXCI7XHJcbiAgICB0aGlzLmVhc2luZyA9IG8uZWFzaW5nIHx8IDE7XHJcblxyXG4gICAgdGhpcy5zZXRUeXBlTnVtYmVyKG8pO1xyXG5cclxuICAgIHRoaXMubW9kZWwgPSBvLnN0eXBlIHx8IDA7XHJcbiAgICBpZiAoby5tb2RlICE9PSB1bmRlZmluZWQpIHRoaXMubW9kZWwgPSBvLm1vZGU7XHJcblxyXG4gICAgLy90aGlzLmRlZmF1bHRCb3JkZXJDb2xvciA9IHRoaXMuY29sb3JzLmhpZGU7XHJcblxyXG4gICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcclxuICAgIHRoaXMuaXNPdmVyID0gZmFsc2U7XHJcbiAgICB0aGlzLmFsbHdheSA9IG8uYWxsd2F5IHx8IGZhbHNlO1xyXG5cclxuICAgIHRoaXMuaXNEZWcgPSBvLmlzRGVnIHx8IGZhbHNlO1xyXG4gICAgdGhpcy5pc0N5Y2xpYyA9IG8uY3ljbGljIHx8IGZhbHNlO1xyXG5cclxuICAgIHRoaXMuZmlyc3RJbXB1dCA9IGZhbHNlO1xyXG5cclxuICAgIGxldCBjYyA9IHRoaXMuY29sb3JzO1xyXG5cclxuICAgIC8vdGhpcy5jWzJdID0gdGhpcy5kb20oICdkaXYnLCB0aGlzLmNzcy50eHRzZWxlY3QgKyAnbGV0dGVyLXNwYWNpbmc6LTFweDsgdGV4dC1hbGlnbjpyaWdodDsgd2lkdGg6NDdweDsgYm9yZGVyOjFweCBkYXNoZWQgJyt0aGlzLmRlZmF1bHRCb3JkZXJDb2xvcisnOyBjb2xvcjonKyB0aGlzLmNvbG9ycy50ZXh0ICk7XHJcbiAgICAvL3RoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0c2VsZWN0ICsgJ3RleHQtYWxpZ246cmlnaHQ7IHdpZHRoOjQ3cHg7IGJvcmRlcjoxcHggZGFzaGVkICcrdGhpcy5kZWZhdWx0Qm9yZGVyQ29sb3IrJzsgY29sb3I6JysgdGhpcy5jb2xvcnMudGV4dCApO1xyXG4gICAgdGhpcy5jWzJdID0gdGhpcy5kb20oXHJcbiAgICAgIFwiZGl2XCIsXHJcbiAgICAgIHRoaXMuY3NzLnR4dHNlbGVjdCArXHJcbiAgICAgICAgXCJib3JkZXI6bm9uZTsgYmFja2dyb3VuZDpub25lOyB3aWR0aDo0N3B4OyBjb2xvcjpcIiArXHJcbiAgICAgICAgY2MudGV4dCArXHJcbiAgICAgICAgXCI7XCJcclxuICAgICk7XHJcbiAgICAvL3RoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0c2VsZWN0ICsgJ2xldHRlci1zcGFjaW5nOi0xcHg7IHRleHQtYWxpZ246cmlnaHQ7IHdpZHRoOjQ3cHg7IGNvbG9yOicrIHRoaXMuY29sb3JzLnRleHQgKTtcclxuICAgIHRoaXMuY1szXSA9IHRoaXMuZG9tKFxyXG4gICAgICBcImRpdlwiLFxyXG4gICAgICB0aGlzLmNzcy5iYXNpYyArIFwiIHRvcDowOyBoZWlnaHQ6XCIgKyB0aGlzLmggKyBcInB4O1wiXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuY1s0XSA9IHRoaXMuZG9tKFxyXG4gICAgICBcImRpdlwiLFxyXG4gICAgICB0aGlzLmNzcy5iYXNpYyArXHJcbiAgICAgICAgXCJiYWNrZ3JvdW5kOlwiICtcclxuICAgICAgICBjYy5iYWNrICtcclxuICAgICAgICBcIjsgdG9wOjJweDsgaGVpZ2h0OlwiICtcclxuICAgICAgICAodGhpcy5oIC0gNCkgK1xyXG4gICAgICAgIFwicHg7XCJcclxuICAgICk7XHJcbiAgICB0aGlzLmNbNV0gPSB0aGlzLmRvbShcclxuICAgICAgXCJkaXZcIixcclxuICAgICAgdGhpcy5jc3MuYmFzaWMgK1xyXG4gICAgICAgIFwibGVmdDo0cHg7IHRvcDo1cHg7IGhlaWdodDpcIiArXHJcbiAgICAgICAgKHRoaXMuaCAtIDEwKSArXHJcbiAgICAgICAgXCJweDsgYmFja2dyb3VuZDpcIiArXHJcbiAgICAgICAgY2MudGV4dCArXHJcbiAgICAgICAgXCI7XCJcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5jWzJdLmlzTnVtID0gdHJ1ZTtcclxuICAgIC8vdGhpcy5jWzJdLnN0eWxlLmhlaWdodCA9ICh0aGlzLmgtNCkgKyAncHgnO1xyXG4gICAgLy90aGlzLmNbMl0uc3R5bGUubGluZUhlaWdodCA9ICh0aGlzLmgtOCkgKyAncHgnO1xyXG4gICAgdGhpcy5jWzJdLnN0eWxlLmhlaWdodCA9IHRoaXMuaCAtIDIgKyBcInB4XCI7XHJcbiAgICB0aGlzLmNbMl0uc3R5bGUubGluZUhlaWdodCA9IHRoaXMuaCAtIDEwICsgXCJweFwiO1xyXG5cclxuICAgIGlmICh0aGlzLm1vZGVsICE9PSAwKSB7XHJcbiAgICAgIGxldCByMSA9IDQsXHJcbiAgICAgICAgaDEgPSA0LFxyXG4gICAgICAgIGgyID0gOCxcclxuICAgICAgICB3dyA9IHRoaXMuaCAtIDYsXHJcbiAgICAgICAgcmEgPSAxNjtcclxuXHJcbiAgICAgIGlmICh0aGlzLm1vZGVsID09PSAyKSB7XHJcbiAgICAgICAgcjEgPSAwO1xyXG4gICAgICAgIGgxID0gMjtcclxuICAgICAgICBoMiA9IDQ7XHJcbiAgICAgICAgcmEgPSAyO1xyXG4gICAgICAgIHd3ID0gKHRoaXMuaCAtIDYpICogMC41O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAodGhpcy5tb2RlbCA9PT0gMykgdGhpcy5jWzVdLnN0eWxlLnZpc2libGUgPSBcIm5vbmVcIjtcclxuXHJcbiAgICAgIHRoaXMuY1s0XS5zdHlsZS5ib3JkZXJSYWRpdXMgPSByMSArIFwicHhcIjtcclxuICAgICAgdGhpcy5jWzRdLnN0eWxlLmhlaWdodCA9IGgyICsgXCJweFwiO1xyXG4gICAgICB0aGlzLmNbNF0uc3R5bGUudG9wID0gdGhpcy5oICogMC41IC0gaDEgKyBcInB4XCI7XHJcbiAgICAgIHRoaXMuY1s1XS5zdHlsZS5ib3JkZXJSYWRpdXMgPSByMSAqIDAuNSArIFwicHhcIjtcclxuICAgICAgdGhpcy5jWzVdLnN0eWxlLmhlaWdodCA9IGgxICsgXCJweFwiO1xyXG4gICAgICB0aGlzLmNbNV0uc3R5bGUudG9wID0gdGhpcy5oICogMC41IC0gaDEgKiAwLjUgKyBcInB4XCI7XHJcblxyXG4gICAgICAvL3RoaXMuY1s2XSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MuYmFzaWMgKyAnYm9yZGVyLXJhZGl1czonK3JhKydweDsgbWFyZ2luLWxlZnQ6JysoLXd3KjAuNSkrJ3B4OyBib3JkZXI6MXB4IHNvbGlkICcrY2MuYm9yZGVyKyc7IGJhY2tncm91bmQ6JytjYy5idXR0b24rJzsgbGVmdDo0cHg7IHRvcDoycHg7IGhlaWdodDonKyh0aGlzLmgtNCkrJ3B4OyB3aWR0aDonK3d3KydweDsnICk7XHJcbiAgICAgIHRoaXMuY1s2XSA9IHRoaXMuZG9tKFxyXG4gICAgICAgIFwiZGl2XCIsXHJcbiAgICAgICAgdGhpcy5jc3MuYmFzaWMgK1xyXG4gICAgICAgICAgXCJib3JkZXItcmFkaXVzOlwiICtcclxuICAgICAgICAgIHJhICtcclxuICAgICAgICAgIFwicHg7IG1hcmdpbi1sZWZ0OlwiICtcclxuICAgICAgICAgIC13dyAqIDAuNSArXHJcbiAgICAgICAgICBcInB4OyBiYWNrZ3JvdW5kOlwiICtcclxuICAgICAgICAgIGNjLnRleHQgK1xyXG4gICAgICAgICAgXCI7IGxlZnQ6NHB4OyB0b3A6M3B4OyBoZWlnaHQ6XCIgK1xyXG4gICAgICAgICAgKHRoaXMuaCAtIDYpICtcclxuICAgICAgICAgIFwicHg7IHdpZHRoOlwiICtcclxuICAgICAgICAgIHd3ICtcclxuICAgICAgICAgIFwicHg7XCJcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLmluaXQoKTtcclxuICB9XHJcblxyXG4gIHRlc3Rab25lKGUpIHtcclxuICAgIGxldCBsID0gdGhpcy5sb2NhbDtcclxuICAgIGlmIChsLnggPT09IC0xICYmIGwueSA9PT0gLTEpIHJldHVybiBcIlwiO1xyXG5cclxuICAgIGlmIChsLnggPj0gdGhpcy50eGwpIHJldHVybiBcInRleHRcIjtcclxuICAgIGVsc2UgaWYgKGwueCA+PSB0aGlzLnNhKSByZXR1cm4gXCJzY3JvbGxcIjtcclxuICAgIGVsc2UgcmV0dXJuIFwiXCI7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBFVkVOVFNcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIG1vdXNldXAoZSkge1xyXG4gICAgaWYgKHRoaXMuaXNEb3duKSB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgbW91c2Vkb3duKGUpIHtcclxuICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZShlKTtcclxuXHJcbiAgICBpZiAoIW5hbWUpIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICBpZiAobmFtZSA9PT0gXCJzY3JvbGxcIikge1xyXG4gICAgICB0aGlzLmlzRG93biA9IHRydWU7XHJcbiAgICAgIHRoaXMub2xkID0gdGhpcy52YWx1ZTtcclxuICAgICAgdGhpcy5tb3VzZW1vdmUoZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLyppZiggbmFtZSA9PT0gJ3RleHQnICl7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0SW5wdXQoIHRoaXMuY1syXSwgZnVuY3Rpb24oKXsgdGhpcy52YWxpZGF0ZSgpIH0uYmluZCh0aGlzKSApO1xyXG4gICAgICAgIH0qL1xyXG5cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuXHJcbiAgbW91c2Vtb3ZlKGUpIHtcclxuICAgIGxldCBudXAgPSBmYWxzZTtcclxuXHJcbiAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoZSk7XHJcblxyXG4gICAgaWYgKG5hbWUgPT09IFwic2Nyb2xsXCIpIHtcclxuICAgICAgdGhpcy5tb2RlKDEpO1xyXG4gICAgICB0aGlzLmN1cnNvcihcInctcmVzaXplXCIpO1xyXG4gICAgICAvL30gZWxzZSBpZihuYW1lID09PSAndGV4dCcpe1xyXG4gICAgICAvL3RoaXMuY3Vyc29yKCdwb2ludGVyJyk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB0aGlzLmN1cnNvcigpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICh0aGlzLmlzRG93bikge1xyXG4gICAgICBsZXQgbk5vcm1hbGl6ZWQgPSAoZS5jbGllbnRYIC0gKHRoaXMuem9uZS54ICsgdGhpcy5zYSkgLSAzKSAvIHRoaXMud3c7XHJcblxyXG4gICAgICAvLyBsbyBtYXBlbyBhbCByYW5nbyAwIC4uLiAxXHJcbiAgICAgIG5Ob3JtYWxpemVkID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoMCwgbk5vcm1hbGl6ZWQpKTtcclxuXHJcbiAgICAgIC8vIGFwbGljbyBlYXNpbmdcclxuICAgICAgbGV0IG5FYXNlZCA9IE1hdGgucG93KG5Ob3JtYWxpemVkLCB0aGlzLmVhc2luZyk7IC8vIGVhc2luZ1xyXG5cclxuICAgICAgbGV0IG5OZXcgPSBuRWFzZWQgKiB0aGlzLnJhbmdlICsgdGhpcy5taW47XHJcbiAgICAgIGxldCBuTmV3U2xpZGVyID0gbk5vcm1hbGl6ZWQgKiB0aGlzLnJhbmdlICsgdGhpcy5taW47XHJcblxyXG4gICAgICB0aGlzLnNsaWRlclZhbHVlID0gdGhpcy5udW1WYWx1ZShuTmV3U2xpZGVyKTtcclxuXHJcbiAgICAgIGxldCBkZWx0YSA9IG5OZXcgLSB0aGlzLm9sZDtcclxuXHJcbiAgICAgIGxldCBzdGVwcztcclxuICAgICAgaWYgKGRlbHRhID49IHRoaXMuc3RlcCB8fCBkZWx0YSA8PSB0aGlzLnN0ZXApIHtcclxuICAgICAgICBzdGVwcyA9IE1hdGguZmxvb3IoZGVsdGEgLyB0aGlzLnN0ZXApO1xyXG4gICAgICAgIHRoaXMudmFsdWUgPSB0aGlzLm51bVZhbHVlKHRoaXMub2xkICsgc3RlcHMgKiB0aGlzLnN0ZXApO1xyXG4gICAgICAgIC8vIHZhbHVlIHdpdGhvdXQgZWFzaW5nIGFwcGxpZWRcclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGUodHJ1ZSk7XHJcbiAgICAgICAgdGhpcy5vbGQgPSB0aGlzLnZhbHVlO1xyXG4gICAgICB9XHJcbiAgICAgIC8vY29uc29sZS5sb2coXCJuLCBub3JtYWxpemVkLCB2YWx1ZVwiLCBuTmV3LCBuTm9ybWFsaXplZCwgdGhpcy52YWx1ZSk7XHJcbiAgICAgIG51cCA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIG51cDtcclxuICB9XHJcblxyXG4gIHdoZWVsKGUpIHtcclxuICAgIGxldCBuYW1lID0gdGhpcy50ZXN0Wm9uZShlKTtcclxuXHJcbiAgICBpZiAobmFtZSA9PT0gXCJzY3JvbGxcIikge1xyXG4gICAgICBsZXQgdiA9IHRoaXMudmFsdWUgLSB0aGlzLnN0ZXAgKiBlLmRlbHRhO1xyXG5cclxuICAgICAgaWYgKHYgPiB0aGlzLm1heCkge1xyXG4gICAgICAgIHYgPSB0aGlzLmlzQ3ljbGljID8gdGhpcy5taW4gOiB0aGlzLm1heDtcclxuICAgICAgfSBlbHNlIGlmICh2IDwgdGhpcy5taW4pIHtcclxuICAgICAgICB2ID0gdGhpcy5pc0N5Y2xpYyA/IHRoaXMubWF4IDogdGhpcy5taW47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHRoaXMuc2V0VmFsdWUodik7XHJcbiAgICAgIHRoaXMub2xkID0gdjtcclxuICAgICAgdGhpcy51cGRhdGUodHJ1ZSk7XHJcblxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvL2tleWRvd246IGZ1bmN0aW9uICggZSApIHsgcmV0dXJuIHRydWU7IH0sXHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgdmFsaWRhdGUoKSB7XHJcbiAgICBsZXQgbiA9IHRoaXMuY1syXS50ZXh0Q29udGVudDtcclxuXHJcbiAgICBpZiAoIWlzTmFOKG4pKSB7XHJcbiAgICAgIHRoaXMudmFsdWUgPSB0aGlzLm51bVZhbHVlKG4pO1xyXG4gICAgICB0aGlzLnVwZGF0ZSh0cnVlKTtcclxuICAgIH0gZWxzZSB0aGlzLmNbMl0udGV4dENvbnRlbnQgPSB0aGlzLnZhbHVlICsgKHRoaXMuaXNEZWcgPyBcIsKwXCIgOiBcIlwiKTtcclxuICB9XHJcblxyXG4gIHJlc2V0KCkge1xyXG4gICAgLy90aGlzLmNsZWFySW5wdXQoKTtcclxuICAgIHRoaXMuaXNEb3duID0gZmFsc2U7XHJcbiAgICB0aGlzLm1vZGUoMCk7XHJcbiAgfVxyXG5cclxuICBtb2RlKG1vZGUpIHtcclxuICAgIGxldCBzID0gdGhpcy5zO1xyXG4gICAgbGV0IGNjID0gdGhpcy5jb2xvcnM7XHJcblxyXG4gICAgc3dpdGNoIChtb2RlKSB7XHJcbiAgICAgIGNhc2UgMDogLy8gYmFzZVxyXG4gICAgICAgIC8vIHNbMl0uYm9yZGVyID0gJzFweCBzb2xpZCAnICsgdGhpcy5jb2xvcnMuaGlkZTtcclxuICAgICAgICBzWzJdLmNvbG9yID0gY2MudGV4dDtcclxuICAgICAgICBzWzRdLmJhY2tncm91bmQgPSBjYy5iYWNrO1xyXG4gICAgICAgIHNbNV0uYmFja2dyb3VuZCA9IGNjLnRleHQ7XHJcbiAgICAgICAgaWYgKHRoaXMubW9kZWwgIT09IDApIHNbNl0uYmFja2dyb3VuZCA9IGNjLnRleHQ7IC8vY2MuYnV0dG9uO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgICBjYXNlIDE6IC8vIHNjcm9sbCBvdmVyXHJcbiAgICAgICAgLy9zWzJdLmJvcmRlciA9ICcxcHggZGFzaGVkICcgKyB0aGlzLmNvbG9ycy5oaWRlO1xyXG4gICAgICAgIHNbMl0uY29sb3IgPSBjYy50ZXh0T3ZlcjtcclxuICAgICAgICBzWzRdLmJhY2tncm91bmQgPSBjYy5iYWNrO1xyXG4gICAgICAgIHNbNV0uYmFja2dyb3VuZCA9IGNjLnRleHRPdmVyO1xyXG4gICAgICAgIGlmICh0aGlzLm1vZGVsICE9PSAwKSBzWzZdLmJhY2tncm91bmQgPSBjYy50ZXh0T3ZlcjsgLy9jYy5vdmVyb2ZmO1xyXG4gICAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdXBkYXRlKHVwKSB7XHJcbiAgICBsZXQgd3cgPSBNYXRoLmZsb29yKHRoaXMud3cgKiAoKHRoaXMuc2xpZGVyVmFsdWUgLSB0aGlzLm1pbikgLyB0aGlzLnJhbmdlKSk7XHJcbiAgICAvL2xldCB3dyA9IE1hdGguZmxvb3IodGhpcy53dyAqICgodGhpcy52YWx1ZSAtIHRoaXMubWluKSAvIHRoaXMucmFuZ2UpKTtcclxuXHJcbiAgICBpZiAodGhpcy5tb2RlbCAhPT0gMykgdGhpcy5zWzVdLndpZHRoID0gd3cgKyBcInB4XCI7XHJcbiAgICBpZiAodGhpcy5zWzZdKSB0aGlzLnNbNl0ubGVmdCA9IHRoaXMuc2EgKyB3dyArIDMgKyBcInB4XCI7XHJcbiAgICB0aGlzLmNbMl0udGV4dENvbnRlbnQgPSB0aGlzLnZhbHVlICsgKHRoaXMuaXNEZWcgPyBcIsKwXCIgOiBcIlwiKTtcclxuXHJcbiAgICBpZiAodXApIHRoaXMuc2VuZCgpO1xyXG4gIH1cclxuXHJcbiAgclNpemUoKSB7XHJcbiAgICBzdXBlci5yU2l6ZSgpO1xyXG5cclxuICAgIGxldCB3ID0gdGhpcy5zYiAtIHRoaXMuc2M7XHJcbiAgICB0aGlzLnd3ID0gdyAtIDY7XHJcblxyXG4gICAgbGV0IHR4ID0gdGhpcy5zYztcclxuICAgIGlmICh0aGlzLmlzVUkgfHwgIXRoaXMuc2ltcGxlKSB0eCA9IHRoaXMuc2MgKyAxMDtcclxuICAgIHRoaXMudHhsID0gdGhpcy53IC0gdHggKyAyO1xyXG5cclxuICAgIC8vbGV0IHR5ID0gTWF0aC5mbG9vcih0aGlzLmggKiAwLjUpIC0gODtcclxuXHJcbiAgICBsZXQgcyA9IHRoaXMucztcclxuXHJcbiAgICBzWzJdLndpZHRoID0gdGhpcy5zYyAtIDYgKyBcInB4XCI7XHJcbiAgICBzWzJdLmxlZnQgPSB0aGlzLnR4bCArIDQgKyBcInB4XCI7XHJcbiAgICAvL3NbMl0udG9wID0gdHkgKyAncHgnO1xyXG4gICAgc1szXS5sZWZ0ID0gdGhpcy5zYSArIFwicHhcIjtcclxuICAgIHNbM10ud2lkdGggPSB3ICsgXCJweFwiO1xyXG4gICAgc1s0XS5sZWZ0ID0gdGhpcy5zYSArIFwicHhcIjtcclxuICAgIHNbNF0ud2lkdGggPSB3ICsgXCJweFwiO1xyXG4gICAgc1s1XS5sZWZ0ID0gdGhpcy5zYSArIDMgKyBcInB4XCI7XHJcblxyXG4gICAgdGhpcy51cGRhdGUoKTtcclxuICB9XHJcbn1cclxuIiwiaW1wb3J0IHsgUHJvdG8gfSBmcm9tICcuLi9jb3JlL1Byb3RvLmpzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBUZXh0SW5wdXQgZXh0ZW5kcyBQcm90byB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoIG8gPSB7fSApIHtcclxuXHJcbiAgICAgICAgc3VwZXIoIG8gKTtcclxuXHJcbiAgICAgICAgdGhpcy5jbW9kZSA9IDA7XHJcblxyXG4gICAgICAgIHRoaXMudmFsdWUgPSBvLnZhbHVlICE9PSB1bmRlZmluZWQgPyBvLnZhbHVlIDogJyc7XHJcbiAgICAgICAgdGhpcy5wbGFjZUhvbGRlciA9IG8ucGxhY2VIb2xkZXIgfHwgJyc7XHJcblxyXG4gICAgICAgIHRoaXMuYWxsd2F5ID0gby5hbGx3YXkgfHwgZmFsc2U7XHJcbiAgICAgICAgdGhpcy5lZGl0YWJsZSA9IG8uZWRpdCAhPT0gdW5kZWZpbmVkID8gby5lZGl0IDogdHJ1ZTtcclxuXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnNcclxuXHJcbiAgICAgICAgLy8gdGV4dFxyXG4gICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0c2VsZWN0ICsgJ3RvcDoxcHg7IGhlaWdodDonICsgKHRoaXMuaC0yKSArICdweDsgY29sb3I6JyArIGNjLnRleHQgKyAnOyBiYWNrZ3JvdW5kOicgKyBjYy5iYWNrICsgJzsgYm9yZGVyQ29sb3I6JyArIGNjLmJvcmRlcisnOyBib3JkZXItcmFkaXVzOicrdGhpcy5yYWRpdXMrJ3B4OycgKTtcclxuICAgICAgICB0aGlzLmNbMl0udGV4dENvbnRlbnQgPSB0aGlzLnZhbHVlO1xyXG5cclxuICAgICAgICAvLyBzZWxlY3Rpb25cclxuICAgICAgICB0aGlzLmNbM10gPSB0aGlzLmRvbSggICdkaXYnLCB0aGlzLmNzcy50eHRzZWxlY3QgKyAncG9zaXRpb246YWJzb2x1dGU7IHRvcDoycHg7IGhlaWdodDonICsgKHRoaXMuaC00KSArICdweDsgcGFkZGluZzowcHggMHB4OyB3aWR0aDowcHg7IGNvbG9yOicgKyBjYy50ZXh0U2VsZWN0ICsgJzsgYmFja2dyb3VuZDonICsgY2Muc2VsZWN0ICsgJzsgYm9yZGVyOm5vbmU7IGJvcmRlci1yYWRpdXM6MHB4OycpO1xyXG5cclxuICAgICAgICAvLyBjdXJzb3JcclxuICAgICAgICB0aGlzLmNbNF0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLmJhc2ljICsgJ3RvcDoycHg7IGhlaWdodDonICsgKHRoaXMuaC00KSArICdweDsgd2lkdGg6MHB4OyBiYWNrZ3JvdW5kOicrY2MudGV4dCsnOycgKTtcclxuXHJcbiAgICAgICAgLy8gZmFrZVxyXG4gICAgICAgIHRoaXMuY1s1XSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0c2VsZWN0ICsgJ3RvcDoxcHg7IGhlaWdodDonICsgKHRoaXMuaC0yKSArICdweDsgYm9yZGVyOm5vbmU7IGp1c3RpZnktY29udGVudDogY2VudGVyOyBmb250LXN0eWxlOiBpdGFsaWM7IGNvbG9yOicrY2MuYm9yZGVyKyc7JyApO1xyXG4gICAgICAgIGlmKCB0aGlzLnZhbHVlID09PSAnJyApIHRoaXMuY1s1XS50ZXh0Q29udGVudCA9IHRoaXMucGxhY2VIb2xkZXI7XHJcblxyXG4gICAgICAgIFxyXG5cclxuXHJcbiAgICAgICAgdGhpcy5pbml0KCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHRlc3Rab25lICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IGwgPSB0aGlzLmxvY2FsO1xyXG4gICAgICAgIGlmKCBsLnggPT09IC0xICYmIGwueSA9PT0gLTEgKSByZXR1cm4gJyc7XHJcbiAgICAgICAgaWYoIGwueCA+PSB0aGlzLnNhICkgcmV0dXJuICd0ZXh0JztcclxuICAgICAgICByZXR1cm4gJyc7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgRVZFTlRTXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgbW91c2V1cCAoIGUgKSB7XHJcblxyXG4gICAgICAgIGlmKCF0aGlzLmVkaXRhYmxlKSByZXR1cm47XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmlzRG93biApe1xyXG4gICAgICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5tb3VzZW1vdmUoIGUgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vkb3duICggZSApIHtcclxuXHJcbiAgICAgICAgaWYoIXRoaXMuZWRpdGFibGUpIHJldHVybjtcclxuXHJcbiAgICAgICAgbGV0IG5hbWUgPSB0aGlzLnRlc3Rab25lKCBlICk7XHJcblxyXG4gICAgICAgIGlmKCAhdGhpcy5pc0Rvd24gKXtcclxuICAgICAgICAgICAgdGhpcy5pc0Rvd24gPSB0cnVlO1xyXG4gICAgICAgICAgICBpZiggbmFtZSA9PT0gJ3RleHQnICkgdGhpcy5zZXRJbnB1dCggdGhpcy5jWzJdICk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdXNlbW92ZSggZSApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZW1vdmUgKCBlICkge1xyXG5cclxuICAgICAgICBpZighdGhpcy5lZGl0YWJsZSkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoIGUgKTtcclxuXHJcbiAgICAgICAgLy9sZXQgbCA9IHRoaXMubG9jYWw7XHJcbiAgICAgICAgLy9pZiggbC54ID09PSAtMSAmJiBsLnkgPT09IC0xICl7IHJldHVybjt9XHJcblxyXG4gICAgICAgIC8vaWYoIGwueCA+PSB0aGlzLnNhICkgdGhpcy5jdXJzb3IoJ3RleHQnKTtcclxuICAgICAgICAvL2Vsc2UgdGhpcy5jdXJzb3IoKTtcclxuXHJcbiAgICAgICAgbGV0IHggPSAwO1xyXG5cclxuICAgICAgICBpZiggbmFtZSA9PT0gJ3RleHQnICkgdGhpcy5jdXJzb3IoJ3RleHQnKTtcclxuICAgICAgICBlbHNlIHRoaXMuY3Vyc29yKCk7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmlzRG93biApIHggPSBlLmNsaWVudFggLSB0aGlzLnpvbmUueDtcclxuXHJcbiAgICAgICAgcmV0dXJuIHRoaXMudXBJbnB1dCggeCAtIHRoaXMuc2EgLTMsIHRoaXMuaXNEb3duICk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSAoICkge1xyXG5cclxuICAgICAgICB0aGlzLmNbMl0udGV4dENvbnRlbnQgPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICByZXNldCAoKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY3Vyc29yKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgSU5QVVRcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBzZWxlY3QgKCBjLCBlLCB3LCB0ICkge1xyXG5cclxuICAgICAgICBsZXQgcyA9IHRoaXMucztcclxuICAgICAgICBsZXQgZCA9IHRoaXMuc2EgKyA1O1xyXG4gICAgICAgIHNbNF0ud2lkdGggPSAnMXB4JztcclxuICAgICAgICBzWzRdLmxlZnQgPSAoIGQgKyBlICkgKyAncHgnO1xyXG5cclxuICAgICAgICBzWzNdLmxlZnQgPSAgKCBkICsgZSApICArICdweCc7XHJcbiAgICAgICAgc1szXS53aWR0aCA9ICB3ICArICdweCc7XHJcbiAgICAgICAgdGhpcy5jWzNdLmlubmVySFRNTCA9IHRcclxuICAgIFxyXG4gICAgfVxyXG5cclxuICAgIHVuc2VsZWN0ICgpIHtcclxuXHJcbiAgICAgICAgbGV0IHMgPSB0aGlzLnM7XHJcbiAgICAgICAgaWYoIXMpIHJldHVybjtcclxuICAgICAgICBzWzNdLndpZHRoID0gIDAgICsgJ3B4JztcclxuICAgICAgICB0aGlzLmNbM10uaW5uZXJIVE1MID0gJ3QnXHJcbiAgICAgICAgc1s0XS53aWR0aCA9IDAgKyAncHgnO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB2YWxpZGF0ZSAoIGZvcmNlICkge1xyXG5cclxuICAgICAgICBpZiggdGhpcy5hbGx3YXkgKSBmb3JjZSA9IHRydWU7IFxyXG5cclxuICAgICAgICB0aGlzLnZhbHVlID0gdGhpcy5jWzJdLnRleHRDb250ZW50O1xyXG5cclxuICAgICAgICBpZih0aGlzLnZhbHVlICE9PSAnJykgdGhpcy5jWzVdLnRleHRDb250ZW50ID0gJyc7XHJcbiAgICAgICAgZWxzZSB0aGlzLmNbNV0udGV4dENvbnRlbnQgPSB0aGlzLnBsYWNlSG9sZGVyO1xyXG5cclxuICAgICAgICBpZiggIWZvcmNlICkgcmV0dXJuO1xyXG5cclxuICAgICAgICB0aGlzLnNlbmQoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBSRVpJU0VcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICByU2l6ZSAoKSB7XHJcblxyXG4gICAgICAgIHN1cGVyLnJTaXplKCk7XHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zO1xyXG4gICAgICAgIHNbMl0ubGVmdCA9IHRoaXMuc2EgKyAncHgnO1xyXG4gICAgICAgIHNbMl0ud2lkdGggPSB0aGlzLnNiICsgJ3B4JztcclxuXHJcbiAgICAgICAgc1s1XS5sZWZ0ID0gdGhpcy5zYSArICdweCc7XHJcbiAgICAgICAgc1s1XS53aWR0aCA9IHRoaXMuc2IgKyAncHgnO1xyXG4gICAgIFxyXG4gICAgfVxyXG5cclxuXHJcbn0iLCJpbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBUaXRsZSBleHRlbmRzIFByb3RvIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciggbyA9IHt9ICkge1xyXG5cclxuICAgICAgICBzdXBlciggbyApO1xyXG5cclxuICAgICAgICBsZXQgcHJlZml4ID0gby5wcmVmaXggfHwgJyc7XHJcblxyXG4gICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0ICsgJ2p1c3RpZnktY29udGVudDpyaWdodDsgd2lkdGg6NjBweDsgbGluZS1oZWlnaHQ6JysgKHRoaXMuaC04KSArICdweDsgY29sb3I6JyArIHRoaXMuY29sb3JzLnRleHQgKTtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuaCA9PT0gMzEgKXtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc1swXS5oZWlnaHQgPSB0aGlzLmggKyAncHgnO1xyXG4gICAgICAgICAgICB0aGlzLnNbMV0udG9wID0gOCArICdweCc7XHJcbiAgICAgICAgICAgIHRoaXMuY1syXS5zdHlsZS50b3AgPSA4ICsgJ3B4JztcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsZXQgcyA9IHRoaXMucztcclxuXHJcbiAgICAgICAgc1sxXS5qdXN0aWZ5Q29udGVudCA9IG8uYWxpZ24gfHwgJ2xlZnQnO1xyXG4gICAgICAgIC8vc1sxXS50ZXh0QWxpZ24gPSBvLmFsaWduIHx8ICdsZWZ0JztcclxuICAgICAgICBzWzFdLmZvbnRXZWlnaHQgPSBvLmZvbnRXZWlnaHQgfHwgJ2JvbGQnO1xyXG5cclxuXHJcbiAgICAgICAgdGhpcy5jWzFdLnRleHRDb250ZW50ID0gdGhpcy50eHQuc3Vic3RyaW5nKDAsMSkudG9VcHBlckNhc2UoKSArIHRoaXMudHh0LnN1YnN0cmluZygxKS5yZXBsYWNlKFwiLVwiLCBcIiBcIik7XHJcbiAgICAgICAgdGhpcy5jWzJdLnRleHRDb250ZW50ID0gcHJlZml4O1xyXG5cclxuICAgICAgICB0aGlzLmluaXQoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdGV4dCggdHh0ICkge1xyXG5cclxuICAgICAgICB0aGlzLmNbMV0udGV4dENvbnRlbnQgPSB0eHQ7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHRleHQyKCB0eHQgKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY1syXS50ZXh0Q29udGVudCA9IHR4dDtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgclNpemUoKSB7XHJcblxyXG4gICAgICAgIHN1cGVyLnJTaXplKCk7XHJcbiAgICAgICAgdGhpcy5zWzFdLndpZHRoID0gdGhpcy53ICsgJ3B4JzsgLy8tIDUwICsgJ3B4JztcclxuICAgICAgICB0aGlzLnNbMl0ubGVmdCA9IHRoaXMudyArICdweCc7Ly8tICggNTAgKyAyNiApICsgJ3B4JztcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2V0Q29sb3IoIGMgKSB7XHJcbiAgICAgICAgdGhpcy5zWzFdLmNvbG9yID0gY1xyXG4gICAgICAgIHRoaXMuc1syXS5jb2xvciA9IGNcclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNlbGVjdCBleHRlbmRzIFByb3RvIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciggbyA9IHt9ICkge1xyXG5cclxuICAgICAgICBzdXBlciggbyApXHJcblxyXG4gICAgICAgIHRoaXMudmFsdWUgPSBvLnZhbHVlIHx8ICcnXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSBmYWxzZVxyXG4gICAgICAgIHRoaXMub25BY3RpZiA9IG8ub25BY3RpZiB8fCBmdW5jdGlvbigpe31cclxuXHJcbiAgICAgICAgLy9sZXQgcHJlZml4ID0gby5wcmVmaXggfHwgJyc7XHJcbiAgICAgICAgY29uc3QgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICB0aGlzLmNbMl0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLnR4dCArIHRoaXMuY3NzLmJ1dHRvbiArICcgdG9wOjFweDsgYmFja2dyb3VuZDonK2NjLmJ1dHRvbisnOyBoZWlnaHQ6JysodGhpcy5oLTIpKydweDsgYm9yZGVyOicrIGNjLmJ1dHRvbkJvcmRlcisnOyBib3JkZXItcmFkaXVzOjE1cHg7IHdpZHRoOjMwcHg7IGxlZnQ6MTBweDsnIClcclxuICAgICAgICAvL3RoaXMuY1syXS5zdHlsZS5jb2xvciA9IHRoaXMuZm9udENvbG9yO1xyXG5cclxuICAgICAgICB0aGlzLmNbM10gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLnR4dHNlbGVjdCArICdoZWlnaHQ6JyArICh0aGlzLmgtNCkgKyAncHg7IGJhY2tncm91bmQ6JyArIGNjLmlucHV0QmcgKyAnOyBib3JkZXJDb2xvcjonICsgY2MuaW5wdXRCb3JkZXIrJzsgYm9yZGVyLXJhZGl1czonK3RoaXMucmFkaXVzKydweDsnIClcclxuICAgICAgICB0aGlzLmNbM10udGV4dENvbnRlbnQgPSB0aGlzLnZhbHVlXHJcblxyXG4gICAgICAgIGxldCBmbHRvcCA9IE1hdGguZmxvb3IodGhpcy5oKjAuNSktN1xyXG4gICAgICAgIHRoaXMuY1s0XSA9IHRoaXMuZG9tKCAncGF0aCcsIHRoaXMuY3NzLmJhc2ljICsgJ3Bvc2l0aW9uOmFic29sdXRlOyB3aWR0aDoxNHB4OyBoZWlnaHQ6MTRweDsgbGVmdDo1cHg7IHRvcDonK2ZsdG9wKydweDsnLCB7IGQ6dGhpcy5zdmdzWyAnY3Vyc29yJyBdLCBmaWxsOmNjLnRleHQsIHN0cm9rZTonbm9uZSd9KVxyXG5cclxuICAgICAgICB0aGlzLnN0YXQgPSAxXHJcbiAgICAgICAgdGhpcy5pc0FjdGlmID0gZmFsc2VcclxuXHJcbiAgICAgICAgdGhpcy5pbml0KClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdGVzdFpvbmUgKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgbCA9IHRoaXMubG9jYWxcclxuICAgICAgICBpZiggbC54ID09PSAtMSAmJiBsLnkgPT09IC0xICkgcmV0dXJuICcnXHJcbiAgICAgICAgaWYoIGwueCA+IHRoaXMuc2EgJiYgbC54IDwgdGhpcy5zYSszMCApIHJldHVybiAnb3ZlcidcclxuICAgICAgICByZXR1cm4gJzAnXHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgRVZFTlRTXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgbW91c2V1cCAoIGUgKSB7XHJcbiAgICBcclxuICAgICAgICBpZiggdGhpcy5pc0Rvd24gKXtcclxuICAgICAgICAgICAgLy90aGlzLnZhbHVlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2VcclxuICAgICAgICAgICAgLy90aGlzLnNlbmQoKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubW91c2Vtb3ZlKCBlIClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZWRvd24gKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoIGUgKVxyXG5cclxuICAgICAgICBpZiggIW5hbWUgKSByZXR1cm4gZmFsc2VcclxuXHJcbiAgICAgICAgdGhpcy5pc0Rvd24gPSB0cnVlXHJcbiAgICAgICAgLy90aGlzLnZhbHVlID0gdGhpcy52YWx1ZXNbIG5hbWUtMiBdO1xyXG4gICAgICAgIC8vdGhpcy5zZW5kKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW91c2Vtb3ZlKCBlIClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW91c2Vtb3ZlICggZSApIHtcclxuXHJcbiAgICAgICAgbGV0IHVwID0gZmFsc2VcclxuICAgICAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoIGUgKVxyXG5cclxuICAgICAgICBpZiggbmFtZSA9PT0gJ292ZXInICl7XHJcbiAgICAgICAgICAgIHRoaXMuY3Vyc29yKCdwb2ludGVyJyk7XHJcbiAgICAgICAgICAgIHVwID0gdGhpcy5tb2RlKCB0aGlzLmlzRG93biA/IDMgOiAyIClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB1cCA9IHRoaXMucmVzZXQoKVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHVwXHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBhcHBseSAoIHYgKSB7XHJcblxyXG4gICAgICAgIHYgPSB2IHx8ICcnO1xyXG5cclxuICAgICAgICBpZiggdiAhPT0gdGhpcy52YWx1ZSApIHtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHY7XHJcbiAgICAgICAgICAgIHRoaXMuY1szXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgICAgIHRoaXMuc2VuZCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICB0aGlzLm1vZGUoMSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSAoKSB7XHJcblxyXG4gICAgICAgIHRoaXMubW9kZSggMyApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb2RlICggbiApIHtcclxuXHJcbiAgICAgICAgbGV0IGNoYW5nZSA9IGZhbHNlXHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnNcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuc3RhdCAhPT0gbiApe1xyXG5cclxuICAgICAgICAgICAgaWYoIG49PT0xICkgdGhpcy5pc0FjdGlmID0gZmFsc2U7O1xyXG5cclxuICAgICAgICAgICAgaWYoIG49PT0zICl7IFxyXG4gICAgICAgICAgICAgICAgaWYoICF0aGlzLmlzQWN0aWYgKXsgdGhpcy5pc0FjdGlmID0gdHJ1ZTsgbj00OyB0aGlzLm9uQWN0aWYoIHRoaXMgKTsgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7IHRoaXMuaXNBY3RpZiA9IGZhbHNlOyB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmKCBuPT09MiAmJiB0aGlzLmlzQWN0aWYgKSBuID0gNDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc3RhdCA9IG5cclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCggbiApe1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgMTogdGhpcy5zWyAyIF0uY29sb3IgPSBjYy50ZXh0OyB0aGlzLnNbIDIgXS5iYWNrZ3JvdW5kID0gY2MuYnV0dG9uOyBicmVhazsgLy8gYmFzZVxyXG4gICAgICAgICAgICAgICAgY2FzZSAyOiB0aGlzLnNbIDIgXS5jb2xvciA9IGNjLnRleHRPdmVyOyB0aGlzLnNbIDIgXS5iYWNrZ3JvdW5kID0gY2Mub3Zlcm9mZjsgYnJlYWs7IC8vIG92ZXJcclxuICAgICAgICAgICAgICAgIGNhc2UgMzogdGhpcy5zWyAyIF0uY29sb3IgPSBjYy50ZXh0T3ZlcjsgdGhpcy5zWyAyIF0uYmFja2dyb3VuZCA9IGNjLmFjdGlvbjsgYnJlYWs7IC8vIGRvd25cclxuICAgICAgICAgICAgICAgIGNhc2UgNDogdGhpcy5zWyAyIF0uY29sb3IgPSBjYy50ZXh0U2VsZWN0OyB0aGlzLnNbIDIgXS5iYWNrZ3JvdW5kID0gY2MuYWN0aW9uOyBicmVhazsgLy8gYWN0aWZcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNoYW5nZSA9IHRydWVcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gY2hhbmdlXHJcblxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgcmVzZXQgKCkge1xyXG5cclxuICAgICAgICB0aGlzLmN1cnNvcigpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1vZGUoIHRoaXMuaXNBY3RpZiA/IDQgOiAxIClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdGV4dCAoIHR4dCApIHtcclxuXHJcbiAgICAgICAgdGhpcy5jWzNdLnRleHRDb250ZW50ID0gdHh0XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJTaXplICgpIHtcclxuXHJcbiAgICAgICAgc3VwZXIuclNpemUoKVxyXG5cclxuICAgICAgICBsZXQgcyA9IHRoaXMuc1xyXG4gICAgICAgIHNbMl0ubGVmdCA9IHRoaXMuc2EgKyAncHgnXHJcbiAgICAgICAgc1szXS5sZWZ0ID0gKHRoaXMuc2EgKyA0MCkgKyAncHgnXHJcbiAgICAgICAgc1szXS53aWR0aCA9ICh0aGlzLnNiIC0gNDApICsgJ3B4J1xyXG4gICAgICAgIHNbNF0ubGVmdCA9ICh0aGlzLnNhKzgpICsgJ3B4J1xyXG5cclxuICAgIH1cclxuXHJcbn0iLCJpbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5pbXBvcnQgeyBGaWxlcyB9IGZyb20gJy4uL2NvcmUvRmlsZXMuanMnO1xyXG5cclxuXHJcbmV4cG9ydCBjbGFzcyBCaXRtYXAgZXh0ZW5kcyBQcm90byB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoIG8gPSB7fSApIHtcclxuXHJcbiAgICAgICAgc3VwZXIoIG8gKVxyXG5cclxuICAgICAgICB0aGlzLnZhbHVlID0gby52YWx1ZSB8fCAnJ1xyXG4gICAgICAgIHRoaXMucmVmVGV4dHVyZSA9IG8udGV4dHVyZSB8fCBudWxsO1xyXG4gICAgICAgIHRoaXMuaW1nID0gbnVsbFxyXG5cclxuICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5uZXZlcmxvY2sgPSB0cnVlXHJcblxyXG5cclxuXHJcbiAgICAgICAgY29uc3QgY2MgPSB0aGlzLmNvbG9yc1xyXG5cclxuICAgICAgICB0aGlzLmNbMl0gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLnR4dCArIHRoaXMuY3NzLmJ1dHRvbiArICcgdG9wOjFweDsgYmFja2dyb3VuZDonK2NjLmJ1dHRvbisnOyBoZWlnaHQ6JysodGhpcy5oLTIpKydweDsgYm9yZGVyOicrY2MuYnV0dG9uQm9yZGVyKyc7IGJvcmRlci1yYWRpdXM6MTVweDsgd2lkdGg6MzBweDsgbGVmdDoxMHB4OycgKVxyXG5cclxuICAgICAgICB0aGlzLmNbM10gPSB0aGlzLmRvbSggJ2RpdicsIHRoaXMuY3NzLnR4dHNlbGVjdCArICdoZWlnaHQ6JyArICh0aGlzLmgtNCkgKyAncHg7IGJhY2tncm91bmQ6JyArIGNjLmlucHV0QmcgKyAnOyBib3JkZXJDb2xvcjonICsgY2MuaW5wdXRCb3JkZXIrJzsgYm9yZGVyLXJhZGl1czonK3RoaXMucmFkaXVzKydweDsnIClcclxuICAgICAgICB0aGlzLmNbM10udGV4dENvbnRlbnQgPSB0aGlzLnZhbHVlO1xyXG5cclxuICAgICAgICBsZXQgZmx0b3AgPSBNYXRoLmZsb29yKHRoaXMuaCowLjUpLTdcclxuICAgICAgICB0aGlzLmNbNF0gPSB0aGlzLmRvbSggJ3BhdGgnLCB0aGlzLmNzcy5iYXNpYyArICdwb3NpdGlvbjphYnNvbHV0ZTsgd2lkdGg6MTRweDsgaGVpZ2h0OjE0cHg7IGxlZnQ6NXB4OyB0b3A6JytmbHRvcCsncHg7JywgeyBkOnRoaXMuc3Znc1sgJ2xvYWQnIF0sIGZpbGw6Y2MudGV4dCwgc3Ryb2tlOidub25lJ30pXHJcblxyXG4gICAgICAgIHRoaXMuc3RhdCA9IDFcclxuXHJcbiAgICAgICAgdGhpcy5pbml0KClcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdGVzdFpvbmUgKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgbCA9IHRoaXMubG9jYWw7XHJcbiAgICAgICAgaWYoIGwueCA9PT0gLTEgJiYgbC55ID09PSAtMSApIHJldHVybiAnJztcclxuICAgICAgICBpZiggbC54ID4gdGhpcy5zYSAmJiBsLnggPCB0aGlzLnNhKzMwICkgcmV0dXJuICdvdmVyJztcclxuICAgICAgICByZXR1cm4gJzAnXHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgRVZFTlRTXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gICAgbW91c2V1cCAoIGUgKSB7XHJcbiAgICBcclxuICAgICAgICBpZiggdGhpcy5pc0Rvd24gKXtcclxuICAgICAgICAgICAgLy90aGlzLnZhbHVlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2U7XHJcbiAgICAgICAgICAgIC8vdGhpcy5zZW5kKCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vdXNlbW92ZSggZSApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZWRvd24gKCBlICkge1xyXG5cclxuICAgICAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoIGUgKTtcclxuXHJcbiAgICAgICAgaWYoICFuYW1lICkgcmV0dXJuIGZhbHNlO1xyXG5cclxuICAgICAgICBpZiggbmFtZSA9PT0gJ292ZXInICl7XHJcbiAgICAgICAgICAgIHRoaXMuaXNEb3duID0gdHJ1ZVxyXG4gICAgICAgICAgICBGaWxlcy5sb2FkKCB7IGNhbGxiYWNrOnRoaXMuY2hhbmdlQml0bWFwLmJpbmQodGhpcykgfSApXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy90aGlzLnZhbHVlID0gdGhpcy52YWx1ZXNbIG5hbWUtMiBdO1xyXG4gICAgICAgIC8vdGhpcy5zZW5kKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW91c2Vtb3ZlKCBlICk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlbW92ZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCB1cCA9IGZhbHNlO1xyXG5cclxuICAgICAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoIGUgKTtcclxuXHJcbiAgICAgICAgaWYoIG5hbWUgPT09ICdvdmVyJyApe1xyXG4gICAgICAgICAgICB0aGlzLmN1cnNvcigncG9pbnRlcicpO1xyXG4gICAgICAgICAgICB1cCA9IHRoaXMubW9kZSggdGhpcy5pc0Rvd24gPyAzIDogMiApXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdXAgPSB0aGlzLnJlc2V0KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdXA7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBjaGFuZ2VCaXRtYXAoIGltZywgZm5hbWUgKXtcclxuXHJcbiAgICAgICAgaWYoIGltZyApe1xyXG4gICAgICAgICAgICB0aGlzLmltZyA9IGltZ1xyXG4gICAgICAgICAgICB0aGlzLmFwcGx5KCBmbmFtZSApXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5pbWcgPSBudWxsXHJcbiAgICAgICAgICAgIHRoaXMuYXBwbHkoICdudWxsJyApXHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBhcHBseSAoIHYgKSB7XHJcblxyXG4gICAgICAgIHYgPSB2IHx8ICcnO1xyXG5cclxuICAgICAgICBpZiggdiAhPT0gdGhpcy52YWx1ZSApIHtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHY7XHJcbiAgICAgICAgICAgIHRoaXMuY1szXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWU7XHJcblxyXG4gICAgICAgICAgICBpZiggdGhpcy5pbWcgIT09IG51bGwgKXtcclxuICAgICAgICAgICAgICAgIGlmKCB0aGlzLm9iamVjdExpbmsgIT09IG51bGwgKSB0aGlzLm9iamVjdExpbmtbIHRoaXMudmFsIF0gPSB2XHJcbiAgICAgICAgICAgICAgICBpZiggdGhpcy5jYWxsYmFjayApIHRoaXMuY2FsbGJhY2soIHRoaXMudmFsdWUsIHRoaXMuaW1nLCB0aGlzLm5hbWUgKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICB0aGlzLm1vZGUoMSk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSAoKSB7XHJcblxyXG4gICAgICAgIHRoaXMubW9kZSggMyApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb2RlICggbiApIHtcclxuXHJcbiAgICAgICAgbGV0IGNoYW5nZSA9IGZhbHNlXHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnNcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuc3RhdCAhPT0gbiApe1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zdGF0ID0gblxyXG5cclxuICAgICAgICAgICAgc3dpdGNoKCBuICl7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAxOiB0aGlzLnNbIDIgXS5jb2xvciA9IGNjLnRleHQ7IHRoaXMuc1sgMiBdLmJhY2tncm91bmQgPSBjYy5idXR0b247IGJyZWFrOyAvLyBiYXNlXHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6IHRoaXMuc1sgMiBdLmNvbG9yID0gY2MudGV4dE92ZXI7IHRoaXMuc1sgMiBdLmJhY2tncm91bmQgPSBjYy5vdmVyb2ZmOyBicmVhazsgLy8gb3ZlclxyXG4gICAgICAgICAgICAgICAgY2FzZSAzOiB0aGlzLnNbIDIgXS5jb2xvciA9IGNjLnRleHRPdmVyOyB0aGlzLnNbIDIgXS5iYWNrZ3JvdW5kID0gY2Mub3ZlcjsgYnJlYWs7IC8vIGRvd25cclxuICAgICAgICAgICAgICAgIGNhc2UgNDogdGhpcy5zWyAyIF0uY29sb3IgPSBjYy50ZXh0U2VsZWN0OyB0aGlzLnNbIDIgXS5iYWNrZ3JvdW5kID0gY2Muc2VsZWN0OyBicmVhazsgLy8gYWN0aWZcclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNoYW5nZSA9IHRydWU7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGNoYW5nZTtcclxuXHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICByZXNldCAoKSB7XHJcblxyXG4gICAgICAgIHRoaXMuY3Vyc29yKCk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZSggdGhpcy5pc0FjdGlmID8gNCA6IDEgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdGV4dCAoIHR4dCApIHtcclxuXHJcbiAgICAgICAgdGhpcy5jWzNdLnRleHRDb250ZW50ID0gdHh0O1xyXG5cclxuICAgIH1cclxuXHJcbiAgICByU2l6ZSAoKSB7XHJcblxyXG4gICAgICAgIHN1cGVyLnJTaXplKCk7XHJcblxyXG4gICAgICAgIGxldCBzID0gdGhpcy5zO1xyXG4gICAgICAgIHNbMl0ubGVmdCA9IHRoaXMuc2EgKyAncHgnO1xyXG4gICAgICAgIHNbM10ubGVmdCA9ICh0aGlzLnNhICsgNDApICsgJ3B4JztcclxuICAgICAgICBzWzNdLndpZHRoID0gKHRoaXMuc2IgLSA0MCkgKyAncHgnO1xyXG4gICAgICAgIHNbNF0ubGVmdCA9ICh0aGlzLnNhKzgpICsgJ3B4JztcclxuXHJcbiAgICB9XHJcblxyXG59IiwiLy9pbXBvcnQgeyBQcm90byB9IGZyb20gJy4uL2NvcmUvUHJvdG8uanMnO1xyXG5pbXBvcnQgeyBCdXR0b24gfSBmcm9tICcuL0J1dHRvbi5qcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgU2VsZWN0b3IgZXh0ZW5kcyBCdXR0b24ge1xyXG5cclxuICAgIGNvbnN0cnVjdG9yKCBvID0ge30gKSB7XHJcblxyXG4gICAgICAgIGlmKCBvLnNlbGVjdGFibGUgPT09IHVuZGVmaW5lZCApIG8uc2VsZWN0YWJsZSA9IHRydWVcclxuICAgICAgICBzdXBlciggbyApO1xyXG4gICAgIFxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgSXRlbSBleHRlbmRzIFByb3RvIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciggbyA9IHt9ICkge1xyXG5cclxuICAgICAgICBzdXBlciggbyApO1xyXG5cclxuICAgICAgICB0aGlzLnAgPSAxMDA7XHJcbiAgICAgICAgdGhpcy52YWx1ZSA9IHRoaXMudHh0O1xyXG4gICAgICAgIHRoaXMuc3RhdHVzID0gMTtcclxuXHJcbiAgICAgICAgdGhpcy5pdHlwZSA9IG8uaXR5cGUgfHwgJ25vbmUnO1xyXG4gICAgICAgIHRoaXMudmFsID0gdGhpcy5pdHlwZTtcclxuXHJcbiAgICAgICAgdGhpcy5ncmFwaCA9IHRoaXMuc3Znc1sgdGhpcy5pdHlwZSBdO1xyXG5cclxuICAgICAgICBsZXQgZmx0b3AgPSBNYXRoLmZsb29yKHRoaXMuaCowLjUpLTc7XHJcblxyXG4gICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAncGF0aCcsIHRoaXMuY3NzLmJhc2ljICsgJ3Bvc2l0aW9uOmFic29sdXRlOyB3aWR0aDoxNHB4OyBoZWlnaHQ6MTRweDsgbGVmdDo1cHg7IHRvcDonK2ZsdG9wKydweDsnLCB7IGQ6dGhpcy5ncmFwaCwgZmlsbDp0aGlzLmNvbG9ycy50ZXh0LCBzdHJva2U6J25vbmUnfSk7XHJcblxyXG4gICAgICAgIHRoaXMuc1sxXS5tYXJnaW5MZWZ0ID0gMjAgKyAncHgnO1xyXG5cclxuICAgICAgICB0aGlzLmluaXQoKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gICAgLy8gICBFVkVOVFNcclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBtb3VzZW1vdmUgKCBlICkge1xyXG5cclxuICAgICAgICB0aGlzLmN1cnNvcigncG9pbnRlcicpO1xyXG5cclxuICAgICAgICAvL3VwID0gdGhpcy5tb2RlcyggdGhpcy5pc0Rvd24gPyAzIDogMiwgbmFtZSApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZWRvd24gKCBlICkge1xyXG5cclxuICAgICAgICBpZiggdGhpcy5pc1VJICkgdGhpcy5tYWluLnJlc2V0SXRlbSgpO1xyXG5cclxuICAgICAgICB0aGlzLnNlbGVjdGVkKCB0cnVlICk7XHJcblxyXG4gICAgICAgIHRoaXMuc2VuZCgpO1xyXG5cclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdWlvdXQgKCkge1xyXG5cclxuICAgICAgICBpZiggdGhpcy5pc1NlbGVjdCApIHRoaXMubW9kZSgzKTtcclxuICAgICAgICBlbHNlIHRoaXMubW9kZSgxKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgdWlvdmVyICgpIHtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuaXNTZWxlY3QgKSB0aGlzLm1vZGUoNCk7XHJcbiAgICAgICAgZWxzZSB0aGlzLm1vZGUoMik7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSAoKSB7XHJcbiAgICAgICAgICAgIFxyXG4gICAgfVxyXG5cclxuICAgIC8qclNpemUgKCkge1xyXG4gICAgICAgIFxyXG4gICAgICAgIHN1cGVyLnJTaXplKCk7XHJcblxyXG4gICAgfSovXHJcblxyXG4gICAgbW9kZSAoIG4gKSB7XHJcblxyXG4gICAgICAgIGxldCBjaGFuZ2UgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuc3RhdHVzICE9PSBuICl7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnN0YXR1cyA9IG47XHJcbiAgICAgICAgICAgIGxldCBzID0gdGhpcy5zLCBjYyA9IHRoaXMuY29sb3JzXHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgIHN3aXRjaCggbiApe1xyXG5cclxuICAgICAgICAgICAgICAgIGNhc2UgMTogdGhpcy5zdGF0dXMgPSAxOyBzWzFdLmNvbG9yID0gY2MudGV4dDsgc1swXS5iYWNrZ3JvdW5kID0gJ25vbmUnOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMjogdGhpcy5zdGF0dXMgPSAyOyBzWzFdLmNvbG9yID0gY2MudGV4dE92ZXI7IHNbMF0uYmFja2dyb3VuZCA9IGNjLmJhY2s7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAzOiB0aGlzLnN0YXR1cyA9IDM7IHNbMV0uY29sb3IgPSBjYy50ZXh0U2VsZWN0OyBzWzBdLmJhY2tncm91bmQgPSBjYy5zZWxlY3Q7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OiB0aGlzLnN0YXR1cyA9IDQ7IHNbMV0uY29sb3IgPSBjYy50ZXh0T3Zlcjsgc1swXS5iYWNrZ3JvdW5kID0gY2Mub3ZlcjsgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjaGFuZ2UgPSB0cnVlO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjaGFuZ2U7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJlc2V0ICgpIHtcclxuXHJcbiAgICAgICAgdGhpcy5jdXJzb3IoKTtcclxuICAgICAgIC8vIHJldHVybiB0aGlzLm1vZGUoIDEgKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2VsZWN0ZWQgKCBiICl7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmlzU2VsZWN0ICkgdGhpcy5tb2RlKDEpO1xyXG5cclxuICAgICAgICB0aGlzLmlzU2VsZWN0ID0gYiB8fCBmYWxzZTtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuaXNTZWxlY3QgKSB0aGlzLm1vZGUoMyk7XHJcbiAgICAgICAgXHJcbiAgICB9XHJcblxyXG5cclxufSIsImltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcydcclxuaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSAnLi9CdXR0b24uanMnXHJcblxyXG5leHBvcnQgY2xhc3MgR3JpZCBleHRlbmRzIFByb3RvIHtcclxuXHJcbiAgICBjb25zdHJ1Y3RvciggbyA9IHt9ICkge1xyXG5cclxuICAgICAgICBzdXBlciggbyApO1xyXG5cclxuICAgICAgICAvKnRoaXMudmFsdWVzID0gby52YWx1ZXMgfHwgW107XHJcblxyXG4gICAgICAgIGlmKCB0eXBlb2YgdGhpcy52YWx1ZXMgPT09ICdzdHJpbmcnICkgdGhpcy52YWx1ZXMgPSBbIHRoaXMudmFsdWVzIF07Ki9cclxuXHJcbiAgICAgICAgdGhpcy52YWx1ZXMgPSBbXTtcclxuXHJcbiAgICAgICAgaWYoIG8udmFsdWVzICl7XHJcbiAgICAgICAgICAgIGlmKCBvLnZhbHVlcyBpbnN0YW5jZW9mIEFycmF5ICl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlcyA9IG8udmFsdWVzXHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiggby52YWx1ZXMgaW5zdGFuY2VvZiBTdHJpbmcgKXtcclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWVzID0gWyBvLnZhbHVlcyBdO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYoIG8udmFsdWVzIGluc3RhbmNlb2YgT2JqZWN0ICl7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlZk9iamVjdCA9IG8udmFsdWVzXHJcbiAgICAgICAgICAgICAgICBmb3IoIGxldCBnIGluIHRoaXMucmVmT2JqZWN0ICkgdGhpcy52YWx1ZXMucHVzaCggZyApXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMubG5nID0gdGhpcy52YWx1ZXMubGVuZ3RoO1xyXG5cclxuXHJcblxyXG4gICAgICAgIHRoaXMudmFsdWUgPSBvLnZhbHVlIHx8IG51bGw7XHJcblxyXG5cclxuXHJcblxyXG4gICAgICAgIGxldCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG5cclxuICAgICAgICB0aGlzLmlzU2VsZWN0YWJsZSA9IG8uc2VsZWN0YWJsZSB8fCBmYWxzZVxyXG4gICAgICAgIHRoaXMuc3BhY2VzID0gby5zcGFjZXMgfHwgWyBjYy5zeCwgY2Muc3kgXVxyXG4gICAgICAgIHRoaXMuYnNpemUgPSBvLmJzaXplIHx8IFsgOTAsIHRoaXMuaCBdO1xyXG5cclxuICAgICAgICB0aGlzLmJzaXplTWF4ID0gdGhpcy5ic2l6ZVswXVxyXG5cclxuICAgICAgICB0aGlzLnRtcCA9IFtdO1xyXG4gICAgICAgIHRoaXMuc3RhdCA9IFtdO1xyXG4gICAgICAgIHRoaXMuZ3JpZCA9IFsgMiwgTWF0aC5yb3VuZCggdGhpcy5sbmcgKiAwLjUgKSBdO1xyXG5cclxuICAgICAgICB0aGlzLmggPSAoIHRoaXMuZ3JpZFsxXSAqIHRoaXMuYnNpemVbMV0gKSArICggdGhpcy5ncmlkWzFdICogdGhpcy5zcGFjZXNbMV0gKSAvLysgNCAtICh0aGlzLm10b3AqMikgLy8rICh0aGlzLnNwYWNlc1sxXSAtIHRoaXMubXRvcCk7XHJcblxyXG4gICAgICAgIHRoaXMuY1sxXS50ZXh0Q29udGVudCA9ICcnO1xyXG4gICAgICAgIC8vdGhpcy5jWzJdID0gdGhpcy5kb20oICd0YWJsZScsIHRoaXMuY3NzLmJhc2ljICsgJ3dpZHRoOjEwMCU7IHRvcDonKyh0aGlzLnNwYWNlc1sxXS0yKSsncHg7IGhlaWdodDphdXRvOyBib3JkZXItY29sbGFwc2U6c2VwYXJhdGU7IGJvcmRlcjpub25lOyBib3JkZXItc3BhY2luZzogJysodGhpcy5zcGFjZXNbMF0tMikrJ3B4ICcrKHRoaXMuc3BhY2VzWzFdLTIpKydweDsnICk7XHJcbiAgICAgICAgdGhpcy5jWzJdID0gdGhpcy5kb20oICd0YWJsZScsIHRoaXMuY3NzLmJhc2ljICsgJ3dpZHRoOjEwMCU7IGJvcmRlci1zcGFjaW5nOiAnKyh0aGlzLnNwYWNlc1swXS0yKSsncHggJysodGhpcy5zcGFjZXNbMV0pKydweDsgYm9yZGVyOm5vbmU7JyApO1xyXG5cclxuICAgICAgICBsZXQgbiA9IDAsIGIsIG1pZCwgdGQsIHRyLCBzZWw7XHJcblxyXG4gICAgICAgIHRoaXMucmVzID0gLTFcclxuICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlXHJcbiAgICAgICAgdGhpcy5uZXZlcmxvY2sgPSB0cnVlXHJcblxyXG4gICAgICAgIHRoaXMuYnV0dG9ucyA9IFtdOyBcclxuICAgICAgICB0aGlzLnN0YXQgPSBbXTtcclxuICAgICAgICB0aGlzLnRtcFggPSBbXTtcclxuICAgICAgICB0aGlzLnRtcFkgPSBbXTtcclxuXHJcbiAgICAgICAgZm9yKCBsZXQgaSA9IDA7IGkgPCB0aGlzLmdyaWRbMV07IGkrKyApe1xyXG5cclxuICAgICAgICAgICAgdHIgPSB0aGlzLmNbMl0uaW5zZXJ0Um93KCk7XHJcbiAgICAgICAgICAgIHRyLnN0eWxlLmNzc1RleHQgPSAncG9pbnRlci1ldmVudHM6bm9uZTsnO1xyXG4gICAgICAgICAgICBmb3IoIGxldCBqID0gMDsgaiA8IHRoaXMuZ3JpZFswXTsgaisrICl7XHJcblxyXG4gICAgICAgICAgICAgICAgdGQgPSB0ci5pbnNlcnRDZWxsKCk7XHJcbiAgICAgICAgICAgICAgICB0ZC5zdHlsZS5jc3NUZXh0ID0gJ3BvaW50ZXItZXZlbnRzOm5vbmU7JztcclxuXHJcbiAgICAgICAgICAgICAgICBpZiggdGhpcy52YWx1ZXNbbl0gKXtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc2VsID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYoIHRoaXMudmFsdWVzW25dID09PSB0aGlzLnZhbHVlICYmIHRoaXMuaXNTZWxlY3RhYmxlICkgc2VsID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoICdkaXYnICk7XHJcbiAgICAgICAgICAgICAgICAgICAgYi5zdHlsZS5jc3NUZXh0ID0gdGhpcy5jc3MudHh0ICsgdGhpcy5jc3MuYnV0dG9uICsgJ3Bvc2l0aW9uOnN0YXRpYzsgdG9wOjFweDsgd2lkdGg6Jyt0aGlzLmJzaXplWzBdKydweDsgaGVpZ2h0OicrKHRoaXMuYnNpemVbMV0tMikrJ3B4OyBib3JkZXI6JytjYy5ib3JkZXJTaXplKydweCBzb2xpZCAnK2NjLmJvcmRlcisnOyBsZWZ0OmF1dG87IHJpZ2h0OmF1dG87IGJvcmRlci1yYWRpdXM6Jyt0aGlzLnJhZGl1cysncHg7JztcclxuICAgICAgICAgICAgICAgICAgICBiLnN0eWxlLmJhY2tncm91bmQgPSBzZWwgPyBjYy5zZWxlY3QgOiBjYy5idXR0b247XHJcbiAgICAgICAgICAgICAgICAgICAgYi5zdHlsZS5jb2xvciA9IHNlbCA/IGNjLnRleHRTZWxlY3QgOiBjYy50ZXh0O1xyXG4gICAgICAgICAgICAgICAgICAgIGIuaW5uZXJIVE1MID0gdGhpcy52YWx1ZXNbbl07XHJcbiAgICAgICAgICAgICAgICAgICAgdGQuYXBwZW5kQ2hpbGQoIGIgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idXR0b25zLnB1c2goYilcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXQucHVzaCgxKVxyXG5cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnZGl2JyApXHJcbiAgICAgICAgICAgICAgICAgICAgYi5zdHlsZS5jc3NUZXh0ID0gdGhpcy5jc3MudHh0ICsgJ3Bvc2l0aW9uOnN0YXRpYzsgd2lkdGg6Jyt0aGlzLmJzaXplWzBdKydweDsgaGVpZ2h0OicrdGhpcy5ic2l6ZVsxXSsncHg7IHRleHQtYWxpZ246Y2VudGVyOyBsZWZ0OmF1dG87IHJpZ2h0OmF1dG87IGJhY2tncm91bmQ6bm9uZTsnXHJcbiAgICAgICAgICAgICAgICAgICAgdGQuYXBwZW5kQ2hpbGQoIGIgKVxyXG5cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZihqPT09MCkgYi5zdHlsZS5jc3NUZXh0ICs9ICdmbG9hdDpyaWdodDsnO1xyXG4gICAgICAgICAgICAgICAgZWxzZSBiLnN0eWxlLmNzc1RleHQgKz0gJ2Zsb2F0OmxlZnQ7JztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBuKys7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNbMF0uYm9yZGVyID0gJ25vbmUnXHJcblxyXG4gICAgICAgIHRoaXMuaW5pdCgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB0ZXN0Wm9uZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCBsID0gdGhpcy5sb2NhbDtcclxuICAgICAgICBpZiggbC54ID09PSAtMSAmJiBsLnkgPT09IC0xICkgcmV0dXJuIC0xO1xyXG5cclxuICAgICAgICBsLnkgKz0gdGhpcy5tdG9wXHJcbiAgICAgICAgXHJcbiAgICAgICAgbGV0IHR4ID0gdGhpcy50bXBYO1xyXG4gICAgICAgIGxldCB0eSA9IHRoaXMudG1wWTtcclxuXHJcbiAgICAgICAgbGV0IGlkID0gLTE7XHJcbiAgICAgICAgbGV0IGMgPSAtMTtcclxuICAgICAgICBsZXQgbGluZSA9IC0xO1xyXG4gICAgICAgIGxldCBpID0gdGhpcy5ncmlkWzBdO1xyXG4gICAgICAgIHdoaWxlKCBpLS0gKXtcclxuICAgICAgICBcdGlmKCBsLnggPiB0eFtpXVswXSAmJiBsLnggPCB0eFtpXVsxXSApIGMgPSBpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaSA9IHRoaXMuZ3JpZFsxXTtcclxuICAgICAgICB3aGlsZSggaS0tICl7XHJcbiAgICAgICAgICAgIGlmKCBsLnkgPiB0eVtpXVswXSAmJiBsLnkgPCB0eVtpXVsxXSApIGxpbmUgPSBpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYoYyE9PS0xICYmIGxpbmUhPT0tMSl7XHJcbiAgICAgICAgICAgIGlkID0gYyArIChsaW5lKjIpO1xyXG4gICAgICAgICAgICBpZihpZD50aGlzLmxuZy0xKSBpZCA9IC0xO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGlkO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgICAvLyAgIEVWRU5UU1xyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICAgIG1vdXNldXAgKCBlICkge1xyXG5cclxuICAgICAgICBpZiggIXRoaXMuaXNEb3duICkgcmV0dXJuIGZhbHNlXHJcblxyXG4gICAgICAgIHRoaXMuaXNEb3duID0gZmFsc2VcclxuICAgICAgICBpZiggdGhpcy5yZXMgIT09IC0xICl7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSB0aGlzLnZhbHVlc1t0aGlzLnJlc11cclxuICAgICAgICAgICAgdGhpcy5zZW5kKClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB0aGlzLm1vdXNlbW92ZSggZSApXHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlZG93biAoIGUgKSB7XHJcblxyXG4gICAgICAgIGlmKCB0aGlzLmlzRG93biApIHJldHVybiBmYWxzZVxyXG4gICAgICAgIHRoaXMuaXNEb3duID0gdHJ1ZVxyXG4gICAgICAgIHJldHVybiB0aGlzLm1vdXNlbW92ZSggZSApXHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlbW92ZSAoIGUgKSB7XHJcblxyXG4gICAgICAgIGxldCB1cCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMucmVzID0gdGhpcy50ZXN0Wm9uZSggZSApXHJcblxyXG4gICAgICAgIGlmKCB0aGlzLnJlcyAhPT0gLTEgKXtcclxuICAgICAgICAgICAgdGhpcy5jdXJzb3IoJ3BvaW50ZXInKVxyXG4gICAgICAgICAgICB1cCA9IHRoaXMubW9kZXMoIHRoaXMuaXNEb3duID8gMyA6IDIsIHRoaXMucmVzIClcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgIFx0dXAgPSB0aGlzLnJlc2V0KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdXA7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAgIC8vICAgTU9ERVxyXG4gICAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICBtb2RlcyAoIE4gPSAxLCBpZCA9IC0xICkge1xyXG5cclxuICAgICAgICBsZXQgaSA9IHRoaXMubG5nLCB3LCBuLCByID0gZmFsc2VcclxuXHJcbiAgICAgICAgd2hpbGUoIGktLSApe1xyXG5cclxuICAgICAgICAgICAgbiA9IE5cclxuICAgICAgICAgICAgdyA9IHRoaXMuaXNTZWxlY3RhYmxlID8gdGhpcy52YWx1ZXNbIGkgXSA9PT0gdGhpcy52YWx1ZSA6IGZhbHNlXHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiggaSA9PT0gaWQgKXtcclxuICAgICAgICAgICAgICAgIGlmKCB3ICYmIG4gPT09IDIgKSBuID0gMyBcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIG4gPSAxXHJcbiAgICAgICAgICAgICAgICBpZiggdyApIG4gPSA0XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmKCB0aGlzLm1vZGUoIG4sIGkgKSApIHIgPSB0cnVlXHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHJcclxuXHJcbiAgICB9XHJcblxyXG4gICAgbW9kZSAoIG4sIGlkICkge1xyXG5cclxuICAgICAgICBsZXQgY2hhbmdlID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGNjID0gdGhpcy5jb2xvcnMsIHMgPSB0aGlzLmJ1dHRvbnNcclxuICAgICAgICBsZXQgaSA9IGlkXHJcblxyXG4gICAgICAgIGlmKCB0aGlzLnN0YXRbaWRdICE9PSBuICl7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnN0YXRbaWRdID0gbjtcclxuICAgICAgICBcclxuICAgICAgICAgICAgc3dpdGNoKCBuICl7XHJcblxyXG4gICAgICAgICAgICAgICAgY2FzZSAxOiBzW2ldLnN0eWxlLmNvbG9yID0gY2MudGV4dDsgc1tpXS5zdHlsZS5iYWNrZ3JvdW5kID0gY2MuYnV0dG9uOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMjogc1tpXS5zdHlsZS5jb2xvciA9IGNjLnRleHRPdmVyOyBzW2ldLnN0eWxlLmJhY2tncm91bmQgPSBjYy5vdmVyb2ZmOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMzogc1tpXS5zdHlsZS5jb2xvciA9IGNjLnRleHRPdmVyOyBzW2ldLnN0eWxlLmJhY2tncm91bmQgPSBjYy5vdmVyOyBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDogc1tpXS5zdHlsZS5jb2xvciA9IGNjLnRleHRTZWxlY3Q7IHNbaV0uc3R5bGUuYmFja2dyb3VuZCA9IGNjLnNlbGVjdDsgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjaGFuZ2UgPSB0cnVlO1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBjaGFuZ2U7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgICByZXNldCAoKSB7XHJcblxyXG4gICAgICAgIHRoaXMucmVzID0gLTFcclxuICAgICAgICB0aGlzLmN1cnNvcigpXHJcbiAgICAgICAgcmV0dXJuIHRoaXMubW9kZXMoKVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgbGFiZWwgKCBzdHJpbmcsIG4gKSB7XHJcblxyXG4gICAgICAgIHRoaXMuYnV0dG9uc1tuXS50ZXh0Q29udGVudCA9IHN0cmluZztcclxuXHJcbiAgICB9XHJcblxyXG4gICAgaWNvbiAoIHN0cmluZywgeSwgbiApIHtcclxuXHJcbiAgICAgICAgdGhpcy5idXR0b25zW25dLnN0eWxlLnBhZGRpbmcgPSAoIHkgfHwgMCApICsncHggMHB4JztcclxuICAgICAgICB0aGlzLmJ1dHRvbnNbbl0uaW5uZXJIVE1MID0gc3RyaW5nO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB0ZXN0VyAoKSB7XHJcblxyXG4gICAgICAgIGxldCB2dyA9IHRoaXMuc3BhY2VzWzBdKjMgKyB0aGlzLmJzaXplTWF4KjIsIHJ6ID0gZmFsc2U7XHJcbiAgICAgICAgaWYoIHZ3ID4gdGhpcy53ICkge1xyXG4gICAgICAgICAgICB0aGlzLmJzaXplWzBdID0gKCB0aGlzLnctKHRoaXMuc3BhY2VzWzBdKjMpICkgKiAwLjU7XHJcbiAgICAgICAgICAgIHJ6ID0gdHJ1ZTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiggdGhpcy5ic2l6ZVswXSAhPT0gdGhpcy5ic2l6ZU1heCApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnNpemVbMF0gPSB0aGlzLmJzaXplTWF4O1xyXG4gICAgICAgICAgICAgICAgcnogPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiggIXJ6ICkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgaSA9IHRoaXMuYnV0dG9ucy5sZW5ndGg7XHJcbiAgICAgICAgd2hpbGUoaS0tKSB0aGlzLmJ1dHRvbnNbaV0uc3R5bGUud2lkdGggPSB0aGlzLmJzaXplWzBdICsgJ3B4JztcclxuXHJcbiAgICB9XHJcblxyXG4gICAgclNpemUgKCkge1xyXG5cclxuICAgICAgICBzdXBlci5yU2l6ZSgpO1xyXG5cclxuICAgICAgICB0aGlzLnRlc3RXKCk7XHJcblxyXG4gICAgICAgIGxldCBuID0gMCwgYiwgbWlkO1xyXG5cclxuICAgICAgICB0aGlzLnRtcFggPSBbXTtcclxuICAgICAgICB0aGlzLnRtcFkgPSBbXTtcclxuXHJcbiAgICAgICAgZm9yKCBsZXQgaiA9IDA7IGogPCB0aGlzLmdyaWRbMF07IGorKyApe1xyXG5cclxuICAgICAgICAgICAgaWYoaj09PTApe1xyXG4gICAgICAgICAgICAgICAgbWlkID0gKCB0aGlzLncqMC41ICkgLSAoIHRoaXMuc3BhY2VzWzBdKjAuNSApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy50bXBYLnB1c2goIFsgbWlkLXRoaXMuYnNpemVbMF0sIG1pZCBdICk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBtaWQgPSAoIHRoaXMudyowLjUgKSArICggdGhpcy5zcGFjZXNbMF0qMC41ICk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRtcFgucHVzaCggWyBtaWQsIG1pZCt0aGlzLmJzaXplWzBdIF0gKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1pZCA9IHRoaXMuc3BhY2VzWzFdO1xyXG5cclxuICAgICAgICBmb3IoIGxldCBpID0gMDsgaSA8IHRoaXMuZ3JpZFsxXTsgaSsrICl7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnRtcFkucHVzaCggWyBtaWQsIG1pZCArIHRoaXMuYnNpemVbMV0gXSApO1xyXG4gICAgICAgICAgICBtaWQgKz0gdGhpcy5ic2l6ZVsxXSArIHRoaXMuc3BhY2VzWzFdO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxufSIsImltcG9ydCB7IFByb3RvIH0gZnJvbSAnLi4vY29yZS9Qcm90by5qcyc7XHJcbmltcG9ydCB7IFRvb2xzIH0gZnJvbSAnLi4vY29yZS9Ub29scy5qcyc7XHJcbmltcG9ydCB7IFYyIH0gZnJvbSAnLi4vY29yZS9WMi5qcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgUGFkMkQgZXh0ZW5kcyBQcm90byB7XHJcblxyXG4gICAgY29uc3RydWN0b3IoIG8gPSB7fSApIHtcclxuXHJcbiAgICAgICAgc3VwZXIoIG8gKTtcclxuXHJcbiAgICAgICAgdGhpcy5hdXRvV2lkdGggPSBmYWxzZTtcclxuICAgICAgICB0aGlzLm1pbncgID0gdGhpcy53XHJcbiAgICAgICAgdGhpcy5kaWFtID0gby5kaWFtIHx8IHRoaXMudyBcclxuXHJcbiAgICAgICAgLy90aGlzLm1hcmdpbiA9IDE1O1xyXG4gICAgICAgIHRoaXMucG9zID0gbmV3IFYyKDAsMCk7XHJcbiAgICAgICAgdGhpcy5tYXhQb3MgPSA5MFxyXG5cclxuICAgICAgICB0aGlzLm1vZGVsID0gby5zdHlwZSB8fCAwO1xyXG4gICAgICAgIGlmKCBvLm1vZGUgIT09IHVuZGVmaW5lZCApIHRoaXMubW9kZWwgPSBvLm1vZGU7XHJcblxyXG4gICAgICAgIHRoaXMubWluID0gby5taW4gPT09IHVuZGVmaW5lZCA/IC0xIDogby5taW47XHJcbiAgICAgICAgdGhpcy5tYXggPSBvLm1heCA9PT0gdW5kZWZpbmVkID8gMSA6IG8ubWF4O1xyXG5cclxuICAgICAgICB0aGlzLnJhbmdlID0gKHRoaXMubWF4IC0gdGhpcy5taW4pKjAuNTsgIFxyXG5cclxuICAgICAgICB0aGlzLmNtb2RlID0gMDtcclxuXHJcblxyXG4gICAgICAgIC8vY29uc29sZS5sb2codGhpcy5yYW5nZSlcclxuXHJcbiAgICAgICAgdGhpcy5jWzBdLnN0eWxlLmRpc3BsYXkgPSAnYmxvY2snXHJcblxyXG4gICAgICAgIFxyXG5cclxuXHJcblxyXG4gICAgICAgIHRoaXMucHJlY2lzaW9uID0gby5wcmVjaXNpb24gPT09IHVuZGVmaW5lZCA/IDIgOiBvLnByZWNpc2lvbjtcclxuXHJcbiAgICAgICAgLyp0aGlzLmJvdW5kcyA9IHt9O1xyXG4gICAgICAgIHRoaXMuYm91bmRzLngxID0gby54MSB8fCAtMTtcclxuICAgICAgICB0aGlzLmJvdW5kcy54MiA9IG8ueDIgfHwgMTtcclxuICAgICAgICB0aGlzLmJvdW5kcy55MSA9IG8ueTEgfHwgLTE7XHJcbiAgICAgICAgdGhpcy5ib3VuZHMueTIgPSBvLnkyIHx8IDE7XHJcblxyXG4gICAgICAgIHRoaXMubGVycFggPSB0aGlzLmxlcnAoIHRoaXMubWFyZ2luLCB0aGlzLncgLSB0aGlzLm1hcmdpbiAsIHRoaXMuYm91bmRzLngxLCB0aGlzLmJvdW5kcy54MiApO1xyXG4gICAgICAgIHRoaXMubGVycFkgPSB0aGlzLmxlcnAoIHRoaXMubWFyZ2luLCB0aGlzLncgLSB0aGlzLm1hcmdpbiAsIHRoaXMuYm91bmRzLnkxLCB0aGlzLmJvdW5kcy55MiApO1xyXG5cclxuICAgICAgICB0aGlzLmFsZXJwWCA9IHRoaXMubGVycCggdGhpcy5ib3VuZHMueDEsIHRoaXMuYm91bmRzLngyLCB0aGlzLm1hcmdpbiwgdGhpcy53IC0gdGhpcy5tYXJnaW4gKTtcclxuICAgICAgICB0aGlzLmFsZXJwWSA9IHRoaXMubGVycCggdGhpcy5ib3VuZHMueTEsIHRoaXMuYm91bmRzLnkyLCB0aGlzLm1hcmdpbiwgdGhpcy53IC0gdGhpcy5tYXJnaW4gKTsqL1xyXG5cclxuICAgICAgICB0aGlzLnZhbHVlID0gKCBBcnJheS5pc0FycmF5KCBvLnZhbHVlICkgJiYgby52YWx1ZS5sZW5ndGggPT0gMiApID8gby52YWx1ZSA6IFsgMCwgMCBdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuaCA9IG8uaCB8fCB0aGlzLncgKyAxMDtcclxuXHJcbiAgICAgICAgdGhpcy5jWzBdLnN0eWxlLndpZHRoID0gdGhpcy53ICsgJ3B4JztcclxuXHJcbiAgICAgICAgLy8gVGl0bGVcclxuICAgICAgICBpZiggdGhpcy5jWzFdICE9PSB1bmRlZmluZWQgKSB7IC8vIHdpdGggdGl0bGVcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY1sxXS5zdHlsZS53aWR0aCA9ICcxMDAlJztcclxuICAgICAgICAgICAgdGhpcy5jWzFdLnN0eWxlLmp1c3RpZnlDb250ZW50ID0gJ2NlbnRlcic7XHJcbiAgICAgICAgICAgIHRoaXMudG9wID0gMTA7XHJcbiAgICAgICAgICAgIHRoaXMuaCArPSAxMDtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL3RoaXMudG9wIC09IHRoaXMubWFyZ2luXHJcblxyXG4gICAgICAgIGxldCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG5cclxuICAgICAgICAvLyBWYWx1ZVxyXG4gICAgICAgIHRoaXMuY1syXSA9IHRoaXMuZG9tKCAnZGl2JywgdGhpcy5jc3MudHh0ICsgJ2p1c3RpZnktY29udGVudDpjZW50ZXI7IHRvcDonKyAoIHRoaXMuaCAtIDIwICkgKyAncHg7IHdpZHRoOjEwMCU7IGNvbG9yOicgKyBjYy50ZXh0ICk7XHJcbiAgICAgICAgdGhpcy5jWzJdLnRleHRDb250ZW50ID0gdGhpcy52YWx1ZTtcclxuXHJcbiAgICAgICAgLy8gUGFkXHJcblxyXG4gICAgICAgIGxldCBwYWQgPSB0aGlzLmdldFBhZDJkKClcclxuXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHBhZCwgJ2ZpbGwnLCBjYy5iYWNrLCAwIClcclxuICAgICAgICB0aGlzLnNldFN2ZyggcGFkLCAnZmlsbCcsIGNjLmJ1dHRvbiwgMSApXHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHBhZCwgJ3N0cm9rZScsIGNjLmJhY2ssIDIgKVxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCBwYWQsICdzdHJva2UnLCBjYy5iYWNrLCAzIClcclxuICAgICAgICB0aGlzLnNldFN2ZyggcGFkLCAnc3Ryb2tlJywgY2MudGV4dCwgNCApXHJcblxyXG4gICAgICAgIHRoaXMuc2V0U3ZnKCBwYWQsICd2aWV3Qm94JywgJzAgMCAnK3RoaXMuZGlhbSsnICcrdGhpcy5kaWFtIClcclxuICAgICAgICB0aGlzLnNldENzcyggcGFkLCB7IHdpZHRoOnRoaXMuZGlhbSwgaGVpZ2h0OnRoaXMuZGlhbSwgbGVmdDowLCB0b3A6dGhpcy50b3AgfSlcclxuXHJcbiAgICAgICAgdGhpcy5jWzNdID0gcGFkXHJcblxyXG4gICAgICAgIHRoaXMuaW5pdCgpXHJcbiAgICAgICAgdGhpcy5zZXRWYWx1ZSgpXHJcblxyXG4gICAgfVxyXG4gICAgXHJcbiAgICB0ZXN0Wm9uZSAoIGUgKSB7XHJcbiAgICAgICAgXHJcbiAgICAgICAgbGV0IGwgPSB0aGlzLmxvY2FsO1xyXG5cclxuICAgICAgICBpZiggbC54ID09PSAtMSAmJiBsLnkgPT09IC0xICkgcmV0dXJuICcnO1xyXG5cclxuXHJcblxyXG4gICAgICAgIGlmKCBsLnkgPD0gdGhpcy5jWyAxIF0ub2Zmc2V0SGVpZ2h0ICkgcmV0dXJuICd0aXRsZSc7XHJcbiAgICAgICAgZWxzZSBpZiAoIGwueSA+IHRoaXMuaCAtIHRoaXMuY1sgMiBdLm9mZnNldEhlaWdodCApIHJldHVybiAndGV4dCc7XHJcbiAgICAgICAgZWxzZSByZXR1cm4gJ3BhZCc7XHJcblxyXG4gICAgICAgIC8qaWYoICggbC54ID49IHRoaXMubWFyZ2luICkgJiYgKCBsLnggPD0gdGhpcy53IC0gdGhpcy5tYXJnaW4gKSAmJiAoIGwueSA+PSB0aGlzLnRvcCArIHRoaXMubWFyZ2luICkgJiYgKCBsLnkgPD0gdGhpcy50b3AgKyB0aGlzLncgLSB0aGlzLm1hcmdpbiApICkge1xyXG4gICAgICAgICAgICByZXR1cm4gJ3BhZCc7XHJcbiAgICAgICAgfSovXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy9yZXR1cm4gJyc7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNldXAgKCBlICkge1xyXG5cclxuICAgICAgICB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1vZGUoMCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIG1vdXNlZG93biAoIGUgKSB7XHJcblxyXG4gICAgICAgIGlmICggdGhpcy50ZXN0Wm9uZShlKSA9PT0gJ3BhZCcgKSB7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmlzRG93biA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMubW91c2Vtb3ZlKCBlICk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1vZGUoMSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb3VzZW1vdmUgKCBlICkge1xyXG5cclxuICAgICAgICBpZiggIXRoaXMuaXNEb3duICkgcmV0dXJuO1xyXG5cclxuICAgICAgICBsZXQgeCA9ICh0aGlzLncqMC41KSAtICggZS5jbGllbnRYIC0gdGhpcy56b25lLnggKVxyXG4gICAgICAgIGxldCB5ID0gKHRoaXMuZGlhbSowLjUpIC0gKCBlLmNsaWVudFkgLSB0aGlzLnpvbmUueSAtIHRoaXMueXRvcCApXHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIGxldCByID0gMjU2IC8gdGhpcy5kaWFtXHJcblxyXG4gICAgICAgIHggPSAtKHgqcilcclxuICAgICAgICB5ID0gLSh5KnIpXHJcblxyXG4gICAgICAgIHggPSBUb29scy5jbGFtcCggeCwgLXRoaXMubWF4UG9zLCB0aGlzLm1heFBvcyApXHJcbiAgICAgICAgeSA9IFRvb2xzLmNsYW1wKCB5LCAtdGhpcy5tYXhQb3MsIHRoaXMubWF4UG9zIClcclxuXHJcbiAgICAgICAgLy9sZXQgeCA9IGUuY2xpZW50WCAtIHRoaXMuem9uZS54O1xyXG4gICAgICAgIC8vbGV0IHkgPSBlLmNsaWVudFkgLSB0aGlzLnpvbmUueSAtIHRoaXMudG9wO1xyXG5cclxuICAgICAgICAvKmlmKCB4IDwgdGhpcy5tYXJnaW4gKSB4ID0gdGhpcy5tYXJnaW47XHJcbiAgICAgICAgaWYoIHggPiB0aGlzLncgLSB0aGlzLm1hcmdpbiApIHggPSB0aGlzLncgLSB0aGlzLm1hcmdpbjtcclxuICAgICAgICBpZiggeSA8IHRoaXMubWFyZ2luICkgeSA9IHRoaXMubWFyZ2luO1xyXG4gICAgICAgIGlmKCB5ID4gdGhpcy53IC0gdGhpcy5tYXJnaW4gKSB5ID0gdGhpcy53IC0gdGhpcy5tYXJnaW47Ki9cclxuXHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyh4LHkpXHJcblxyXG4gICAgICAgIHRoaXMuc2V0UG9zKCBbIHggLCB5IF0gKTtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLnVwZGF0ZSggdHJ1ZSApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBtb2RlICggbW9kZSApIHtcclxuXHJcbiAgICAgICAgaWYoIHRoaXMuY21vZGUgPT09IG1vZGUgKSByZXR1cm4gZmFsc2U7XHJcblxyXG4gICAgICAgIGxldCBjYyA9IHRoaXMuY29sb3JzXHJcblxyXG4gICAgICAgIHN3aXRjaCggbW9kZSApe1xyXG4gICAgICAgICAgICBjYXNlIDA6IC8vIGJhc2VcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNbMl0uY29sb3IgPSBjYy50ZXh0O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2ZpbGwnLCBjYy5iYWNrLCAwKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2ZpbGwnLCBjYy5idXR0b24sIDEpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgY2MuYmFjaywgMilcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjYy5iYWNrLCAzKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNjLnRleHQsIDQgKVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDE6IC8vIGRvd25cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNbMl0uY29sb3IgPSBjYy50ZXh0U2VsZWN0O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2ZpbGwnLCBjYy5iYWNrb2ZmLCAwKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2ZpbGwnLCBjYy5vdmVyb2ZmLCAxKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3N0cm9rZScsIGNjLmJhY2tvZmYsIDIpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnc3Ryb2tlJywgY2MuYmFja29mZiwgMylcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICdzdHJva2UnLCBjYy50ZXh0U2VsZWN0LCA0IClcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRoaXMuY21vZGUgPSBtb2RlO1xyXG4gICAgICAgIHJldHVybiB0cnVlO1xyXG5cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHVwZGF0ZSAoIHVwICkge1xyXG5cclxuICAgICAgICAvL2lmKCB1cCA9PT0gdW5kZWZpbmVkICkgdXAgPSB0cnVlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuY1syXS50ZXh0Q29udGVudCA9IHRoaXMudmFsdWU7XHJcblxyXG4gICAgICAgIHRoaXMudXBkYXRlU1ZHKCk7XHJcblxyXG4gICAgICAgIGlmKCB1cCApIHRoaXMuc2VuZCgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICB1cGRhdGVTVkcoKSB7XHJcblxyXG4gICAgICAgIGlmICggdGhpcy5tb2RlbCA9PSAxICkge1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ3kxJywgdGhpcy5wb3MueSwgMiApO1xyXG4gICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAneTInLCB0aGlzLnBvcy55LCAyICk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAneDEnLCB0aGlzLnBvcy54LCAzICk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0U3ZnKCB0aGlzLmNbM10sICd4MicsIHRoaXMucG9zLngsIDMgKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0aGlzLnNldFN2ZyggdGhpcy5jWzNdLCAnY3gnLCB0aGlzLnBvcy54LCA0ICk7XHJcbiAgICAgICAgdGhpcy5zZXRTdmcoIHRoaXMuY1szXSwgJ2N5JywgdGhpcy5wb3MueSwgNCApO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBzZXRQb3MgKCBwICkge1xyXG5cclxuICAgICAgICAvL2lmKCBwID09PSB1bmRlZmluZWQgKSBwID0gWyB0aGlzLncgLyAyLCB0aGlzLncgLyAyIF07XHJcblxyXG4gICAgICAgIHRoaXMucG9zLnNldCggcFswXSsxMjggLCBwWzFdKzEyOCApO1xyXG5cclxuICAgICAgICBsZXQgciA9IDEvdGhpcy5tYXhQb3NcclxuXHJcbiAgICAgICAgdGhpcy52YWx1ZVswXSA9ICgocFswXSpyKSp0aGlzLnJhbmdlKS50b0ZpeGVkKCB0aGlzLnByZWNpc2lvbiApO1xyXG4gICAgICAgIHRoaXMudmFsdWVbMV0gPSAoKHBbMV0qcikqdGhpcy5yYW5nZSkudG9GaXhlZCggdGhpcy5wcmVjaXNpb24gKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgc2V0VmFsdWUgKCB2LCB1cCA9IGZhbHNlICkge1xyXG5cclxuICAgICAgICBpZiggdiA9PT0gdW5kZWZpbmVkICkgdiA9IHRoaXMudmFsdWU7XHJcblxyXG4gICAgICAgIC8qaWYgKCB2WzBdIDwgdGhpcy5ib3VuZHMueDEgKSB2WzBdID0gdGhpcy5ib3VuZHMueDE7XHJcbiAgICAgICAgaWYgKCB2WzBdID4gdGhpcy5ib3VuZHMueDIgKSB2WzBdID0gdGhpcy5ib3VuZHMueDI7XHJcbiAgICAgICAgaWYgKCB2WzFdIDwgdGhpcy5ib3VuZHMueTEgKSB2WzFdID0gdGhpcy5ib3VuZHMueTE7XHJcbiAgICAgICAgaWYgKCB2WzFdID4gdGhpcy5ib3VuZHMueTIgKSB2WzFdID0gdGhpcy5ib3VuZHMueTI7Ki9cclxuXHJcbiAgICAgICAgdGhpcy52YWx1ZVswXSA9IE1hdGgubWluKCB0aGlzLm1heCwgTWF0aC5tYXgoIHRoaXMubWluLCB2WzBdICkgKS50b0ZpeGVkKCB0aGlzLnByZWNpc2lvbiApICogMTtcclxuICAgICAgICB0aGlzLnZhbHVlWzFdID0gTWF0aC5taW4oIHRoaXMubWF4LCBNYXRoLm1heCggdGhpcy5taW4sIHZbMV0gKSApLnRvRml4ZWQoIHRoaXMucHJlY2lzaW9uICkgKiAxO1xyXG5cclxuICAgICAgICB0aGlzLnBvcy5zZXQoICgodGhpcy52YWx1ZVswXS90aGlzLnJhbmdlKSp0aGlzLm1heFBvcykrMTI4ICAsICgodGhpcy52YWx1ZVsxXS90aGlzLnJhbmdlKSp0aGlzLm1heFBvcykrMTI4IClcclxuXHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyh0aGlzLnBvcylcclxuXHJcbiAgICAgICAgdGhpcy51cGRhdGUoIHVwICk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIC8qbGVycCggczEsIHMyLCBkMSwgZDIsIGMgPSB0cnVlICkge1xyXG5cclxuICAgICAgICBsZXQgcyA9ICggZDIgLSBkMSApIC8gKCBzMiAtIHMxICk7XHJcblxyXG4gICAgICAgIHJldHVybiBjID8gKCB2ICkgPT4geyBcclxuICAgICAgICAgICAgcmV0dXJuICggKCB2IDwgczEgPyBzMSA6IHYgPiBzMiA/IHMyIDogdiApIC0gczEgKSAqIHMgKyBkMVxyXG4gICAgICAgIH0gOiAoIHYgKSA9PiB7IFxyXG4gICAgICAgICAgcmV0dXJuICggdiAtIHMxICkgKiBzICsgZDFcclxuICAgICAgICB9XHJcblxyXG4gICAgfSovXHJcblxyXG59IiwiXHJcbmltcG9ydCB7IEJvb2wgfSBmcm9tICcuLi9wcm90by9Cb29sLmpzJztcclxuaW1wb3J0IHsgQnV0dG9uIH0gZnJvbSAnLi4vcHJvdG8vQnV0dG9uLmpzJztcclxuaW1wb3J0IHsgQ2lyY3VsYXIgfSBmcm9tICcuLi9wcm90by9DaXJjdWxhci5qcyc7XHJcbmltcG9ydCB7IENvbG9yIH0gZnJvbSAnLi4vcHJvdG8vQ29sb3IuanMnO1xyXG5pbXBvcnQgeyBGcHMgfSBmcm9tICcuLi9wcm90by9GcHMuanMnO1xyXG5pbXBvcnQgeyBHcmFwaCB9IGZyb20gJy4uL3Byb3RvL0dyYXBoLmpzJztcclxuaW1wb3J0IHsgR3JvdXAgIH0gZnJvbSAnLi4vcHJvdG8vR3JvdXAuanMnO1xyXG5pbXBvcnQgeyBKb3lzdGljayB9IGZyb20gJy4uL3Byb3RvL0pveXN0aWNrLmpzJztcclxuaW1wb3J0IHsgS25vYiB9IGZyb20gJy4uL3Byb3RvL0tub2IuanMnO1xyXG5pbXBvcnQgeyBMaXN0IH0gZnJvbSAnLi4vcHJvdG8vTGlzdC5qcyc7XHJcbmltcG9ydCB7IE51bWVyaWMgfSBmcm9tICcuLi9wcm90by9OdW1lcmljLmpzJztcclxuaW1wb3J0IHsgU2xpZGUgfSBmcm9tICcuLi9wcm90by9TbGlkZS5qcyc7XHJcbmltcG9ydCB7IFRleHRJbnB1dCB9IGZyb20gJy4uL3Byb3RvL1RleHRJbnB1dC5qcyc7XHJcbmltcG9ydCB7IFRpdGxlIH0gZnJvbSAnLi4vcHJvdG8vVGl0bGUuanMnO1xyXG5pbXBvcnQgeyBTZWxlY3QgfSBmcm9tICcuLi9wcm90by9TZWxlY3QuanMnO1xyXG5pbXBvcnQgeyBCaXRtYXAgfSBmcm9tICcuLi9wcm90by9CaXRtYXAuanMnO1xyXG5pbXBvcnQgeyBTZWxlY3RvciB9IGZyb20gJy4uL3Byb3RvL1NlbGVjdG9yLmpzJztcclxuaW1wb3J0IHsgRW1wdHkgfSBmcm9tICcuLi9wcm90by9FbXB0eS5qcyc7XHJcbmltcG9ydCB7IEl0ZW0gfSBmcm9tICcuLi9wcm90by9JdGVtLmpzJztcclxuaW1wb3J0IHsgR3JpZCB9IGZyb20gJy4uL3Byb3RvL0dyaWQuanMnO1xyXG5pbXBvcnQgeyBQYWQyRCB9IGZyb20gJy4uL3Byb3RvL1BhZDJELmpzJztcclxuaW1wb3J0IHsgUm9vdHMgfSBmcm9tICcuL1Jvb3RzLmpzJztcclxuXHJcbmV4cG9ydCBjb25zdCBhZGQgPSBmdW5jdGlvbiAoKSB7XHJcblxyXG4gICAgICAgIGxldCBhID0gYXJndW1lbnRzOyBcclxuXHJcbiAgICAgICAgbGV0IHR5cGUsIG8sIHJlZiA9IGZhbHNlLCBuID0gbnVsbDtcclxuXHJcbiAgICAgICAgaWYoIHR5cGVvZiBhWzBdID09PSAnc3RyaW5nJyApeyBcclxuXHJcbiAgICAgICAgICAgIHR5cGUgPSBhWzBdO1xyXG4gICAgICAgICAgICBvID0gYVsxXSB8fCB7fTtcclxuXHJcbiAgICAgICAgfSBlbHNlIGlmICggdHlwZW9mIGFbMF0gPT09ICdvYmplY3QnICl7IC8vIGxpa2UgZGF0IGd1aVxyXG5cclxuICAgICAgICAgICAgcmVmID0gdHJ1ZTtcclxuICAgICAgICAgICAgaWYoIGFbMl0gPT09IHVuZGVmaW5lZCApIFtdLnB1c2guY2FsbChhLCB7fSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgdHlwZSA9IGFbMl0udHlwZSA/IGFbMl0udHlwZSA6IGF1dG9UeXBlKCBhWzBdW2FbMV1dLCBhWzJdICk7XHJcblxyXG4gICAgICAgICAgICBvID0gYVsyXTtcclxuICAgICAgICAgICAgby5uYW1lID0gYVsxXTtcclxuICAgICAgICAgICAgaWYgKG8uaGFzT3duUHJvcGVydHkoXCJkaXNwbGF5TmFtZVwiKSkgby5uYW1lID0gby5kaXNwbGF5TmFtZTtcclxuXHJcbiAgICAgICAgICAgIGlmKCB0eXBlID09PSAnbGlzdCcgJiYgIW8ubGlzdCApeyBvLmxpc3QgPSBhWzBdW2FbMV1dOyB9XHJcbiAgICAgICAgICAgIGVsc2Ugby52YWx1ZSA9IGFbMF1bYVsxXV07XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IG5hbWUgPSB0eXBlLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgICAgIGlmKCBuYW1lID09PSAnZ3JvdXAnICl7IFxyXG4gICAgICAgICAgICBvLmFkZCA9IGFkZDtcclxuICAgICAgICAgICAgLy9vLmR4ID0gOFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3dpdGNoKCBuYW1lICl7XHJcblxyXG4gICAgICAgICAgICBjYXNlICdib29sJzogY2FzZSAnYm9vbGVhbic6IG4gPSBuZXcgQm9vbChvKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2J1dHRvbic6IG4gPSBuZXcgQnV0dG9uKG8pOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnY2lyY3VsYXInOiBuID0gbmV3IENpcmN1bGFyKG8pOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnY29sb3InOiBuID0gbmV3IENvbG9yKG8pOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnZnBzJzogbiA9IG5ldyBGcHMobyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdncmFwaCc6IG4gPSBuZXcgR3JhcGgobyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdncm91cCc6IG4gPSBuZXcgR3JvdXAobyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdqb3lzdGljayc6IG4gPSBuZXcgSm95c3RpY2sobyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdrbm9iJzogbiA9IG5ldyBLbm9iKG8pOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnbGlzdCc6IG4gPSBuZXcgTGlzdChvKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ251bWVyaWMnOiBjYXNlICdudW1iZXInOiBuID0gbmV3IE51bWVyaWMobyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdzbGlkZSc6IG4gPSBuZXcgU2xpZGUobyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICd0ZXh0SW5wdXQnOiBjYXNlICdzdHJpbmcnOiBuID0gbmV3IFRleHRJbnB1dChvKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3RpdGxlJzogY2FzZSAndGV4dCc6IG4gPSBuZXcgVGl0bGUobyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdzZWxlY3QnOiBuID0gbmV3IFNlbGVjdChvKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ2JpdG1hcCc6IG4gPSBuZXcgQml0bWFwKG8pOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnc2VsZWN0b3InOiBuID0gbmV3IFNlbGVjdG9yKG8pOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnZW1wdHknOiBjYXNlICdzcGFjZSc6IG4gPSBuZXcgRW1wdHkobyk7IGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdpdGVtJzogbiA9IG5ldyBJdGVtKG8pOyBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAnZ3JpZCc6IG4gPSBuZXcgR3JpZChvKTsgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgJ3BhZDJkJzogY2FzZSAncGFkJzogbiA9IG5ldyBQYWQyRChvKTsgYnJlYWs7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgXHJcblxyXG4gICAgICAgIGlmKCBuICE9PSBudWxsICl7XHJcblxyXG4gICAgICAgICAgICBSb290cy5uZWVkUmVzaXplID0gdHJ1ZVxyXG5cclxuICAgICAgICAgICAgaWYoIHJlZiApIG4uc2V0UmVmZXJlbmN5KCBhWzBdLCBhWzFdICk7XHJcbiAgICAgICAgICAgIHJldHVybiBuO1xyXG5cclxuICAgICAgICB9XHJcblxyXG59XHJcblxyXG5leHBvcnQgY29uc3QgYXV0b1R5cGUgPSBmdW5jdGlvbiAoIHYsIG8gKSB7XHJcblxyXG4gICAgbGV0IHR5cGUgPSAnc2xpZGUnXHJcblxyXG4gICAgaWYoIHR5cGVvZiB2ID09PSAnYm9vbGVhbicgKSB0eXBlID0gJ2Jvb2wnIFxyXG4gICAgZWxzZSBpZiggdHlwZW9mIHYgPT09ICdzdHJpbmcnICl7IFxyXG5cclxuICAgICAgICBpZiggdi5zdWJzdHJpbmcoMCwxKSA9PT0gJyMnICkgdHlwZSA9ICdjb2xvcidcclxuICAgICAgICBlbHNlIHR5cGUgPSAnc3RyaW5nJyBcclxuXHJcbiAgICB9IGVsc2UgaWYoIHR5cGVvZiB2ID09PSAnbnVtYmVyJyApeyBcclxuXHJcbiAgICAgICAgaWYoIG8uY3R5cGUgKSB0eXBlID0gJ2NvbG9yJ1xyXG4gICAgICAgIGVsc2UgdHlwZSA9ICdzbGlkZSdcclxuXHJcbiAgICB9IGVsc2UgaWYoIHR5cGVvZiB2ID09PSAnYXJyYXknICYmIHYgaW5zdGFuY2VvZiBBcnJheSApe1xyXG5cclxuICAgICAgICBpZiggdHlwZW9mIHZbMF0gPT09ICdudW1iZXInICkgdHlwZSA9ICdudW1iZXInXHJcbiAgICAgICAgZWxzZSBpZiggdHlwZW9mIHZbMF0gPT09ICdzdHJpbmcnICkgdHlwZSA9ICdsaXN0J1xyXG5cclxuICAgIH0gZWxzZSBpZiggdHlwZW9mIHYgPT09ICdvYmplY3QnICYmIHYgaW5zdGFuY2VvZiBPYmplY3QgKXtcclxuXHJcbiAgICAgICAgaWYoIHYueCAhPT0gdW5kZWZpbmVkICkgdHlwZSA9ICdudW1iZXInXHJcbiAgICAgICAgZWxzZSB0eXBlID0gJ2xpc3QnXHJcblxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0eXBlXHJcblxyXG59IiwiaW1wb3J0IHsgUm9vdHMgfSBmcm9tIFwiLi9Sb290cy5qc1wiO1xyXG5pbXBvcnQgeyBUb29scyB9IGZyb20gXCIuL1Rvb2xzLmpzXCI7XHJcbmltcG9ydCB7IGFkZCB9IGZyb20gXCIuL2FkZC5qc1wiO1xyXG5pbXBvcnQgeyBWMiB9IGZyb20gXCIuL1YyLmpzXCI7XHJcblxyXG4vKipcclxuICogQGF1dGhvciBsdGggLyBodHRwczovL2dpdGh1Yi5jb20vbG8tdGhcclxuICovXHJcblxyXG5leHBvcnQgY2xhc3MgR3VpIHtcclxuICBjb25zdHJ1Y3RvcihvID0ge30pIHtcclxuICAgIHRoaXMuaXNHdWkgPSB0cnVlO1xyXG5cclxuICAgIHRoaXMubmFtZSA9IFwiZ3VpXCI7XHJcblxyXG4gICAgLy8gZm9yIDNkXHJcbiAgICB0aGlzLmNhbnZhcyA9IG51bGw7XHJcbiAgICB0aGlzLnNjcmVlbiA9IG51bGw7XHJcbiAgICB0aGlzLnBsYW5lID0gby5wbGFuZSB8fCBudWxsO1xyXG5cclxuICAgIC8vIGNvbG9yXHJcbiAgICBpZiAoby5jb25maWcpIG8uY29sb3JzID0gby5jb25maWc7XHJcbiAgICBpZiAoby5jb2xvcnMpIHRoaXMuc2V0Q29uZmlnKG8uY29sb3JzKTtcclxuICAgIGVsc2UgdGhpcy5jb2xvcnMgPSBUb29scy5kZWZpbmVDb2xvcihvKTtcclxuXHJcbiAgICAvL3RoaXMuY2xlYW5uaW5nID0gZmFsc2VcclxuXHJcbiAgICAvLyBzdHlsZVxyXG4gICAgdGhpcy5jc3MgPSBUb29scy5jbG9uZUNzcygpO1xyXG5cclxuICAgIHRoaXMuaXNSZXNldCA9IHRydWU7XHJcbiAgICB0aGlzLnRtcEFkZCA9IG51bGw7XHJcbiAgICAvL3RoaXMudG1wSCA9IDBcclxuXHJcbiAgICB0aGlzLmlzQ2FudmFzID0gby5pc0NhbnZhcyB8fCBmYWxzZTtcclxuICAgIHRoaXMuaXNDYW52YXNPbmx5ID0gZmFsc2U7XHJcblxyXG4gICAgLy8gTW9kaWZpZWQgYnkgRmVkZW1hcmlub1xyXG4gICAgLy8gb3B0aW9uIHRvIGRlZmluZSB3aGV0aGVyIHRoZSBldmVudCBsaXN0ZW5lcnMgc2hvdWxkIGJlIGFkZGVkIG9yIG5vdFxyXG4gICAgUm9vdHMuYWRkRE9NRXZlbnRMaXN0ZW5lcnMgPSBvLmhhc093blByb3BlcnR5KFwiYWRkRE9NRXZlbnRMaXN0ZW5lcnNcIilcclxuICAgICAgPyBvLmFkZERPTUV2ZW50TGlzdGVuZXJzXHJcbiAgICAgIDogdHJ1ZTtcclxuXHJcbiAgICB0aGlzLmNhbGxiYWNrID0gby5jYWxsYmFjayA9PT0gdW5kZWZpbmVkID8gbnVsbCA6IG8uY2FsbGJhY2s7XHJcblxyXG4gICAgdGhpcy5mb3JjZUhlaWdodCA9IG8ubWF4SGVpZ2h0IHx8IDA7XHJcbiAgICB0aGlzLmxvY2tIZWlnaHQgPSBvLmxvY2tIZWlnaHQgfHwgZmFsc2U7XHJcblxyXG4gICAgdGhpcy5pc0l0ZW1Nb2RlID0gby5pdGVtTW9kZSAhPT0gdW5kZWZpbmVkID8gby5pdGVtTW9kZSA6IGZhbHNlO1xyXG5cclxuICAgIHRoaXMuY24gPSBcIlwiO1xyXG5cclxuICAgIC8vIHNpemUgZGVmaW5lXHJcbiAgICB0aGlzLnNpemUgPSBUb29scy5zaXplO1xyXG4gICAgaWYgKG8ucCAhPT0gdW5kZWZpbmVkKSB0aGlzLnNpemUucCA9IG8ucDtcclxuICAgIGlmIChvLncgIT09IHVuZGVmaW5lZCkgdGhpcy5zaXplLncgPSBvLnc7XHJcbiAgICBpZiAoby5oICE9PSB1bmRlZmluZWQpIHRoaXMuc2l6ZS5oID0gby5oO1xyXG4gICAgaWYgKG8ucyAhPT0gdW5kZWZpbmVkKSB0aGlzLnNpemUucyA9IG8ucztcclxuXHJcbiAgICB0aGlzLnNpemUuaCA9IHRoaXMuc2l6ZS5oIDwgMTEgPyAxMSA6IHRoaXMuc2l6ZS5oO1xyXG5cclxuICAgIC8vIGxvY2FsIG1vdXNlIGFuZCB6b25lXHJcbiAgICB0aGlzLmxvY2FsID0gbmV3IFYyKCkubmVnKCk7XHJcbiAgICB0aGlzLnpvbmUgPSB7IHg6IDAsIHk6IDAsIHc6IHRoaXMuc2l6ZS53LCBoOiAwIH07XHJcblxyXG4gICAgLy8gdmlydHVhbCBtb3VzZVxyXG4gICAgdGhpcy5tb3VzZSA9IG5ldyBWMigpLm5lZygpO1xyXG5cclxuICAgIHRoaXMuaCA9IDA7XHJcbiAgICAvL3RoaXMucHJldlkgPSAtMTtcclxuICAgIHRoaXMuc3cgPSAwO1xyXG5cclxuICAgIHRoaXMubWFyZ2luID0gdGhpcy5jb2xvcnMuc3k7XHJcbiAgICB0aGlzLm1hcmdpbkRpdiA9IFRvb2xzLmlzRGl2aWQodGhpcy5tYXJnaW4pO1xyXG5cclxuICAgIC8vIGJvdHRvbSBhbmQgY2xvc2UgaGVpZ2h0XHJcbiAgICB0aGlzLmlzV2l0aENsb3NlID0gby5jbG9zZSAhPT0gdW5kZWZpbmVkID8gby5jbG9zZSA6IHRydWU7XHJcbiAgICB0aGlzLmJoID0gIXRoaXMuaXNXaXRoQ2xvc2UgPyAwIDogdGhpcy5zaXplLmg7XHJcblxyXG4gICAgdGhpcy5hdXRvUmVzaXplID0gby5hdXRvUmVzaXplID09PSB1bmRlZmluZWQgPyB0cnVlIDogby5hdXRvUmVzaXplO1xyXG5cclxuICAgIC8vIGRlZmF1bHQgcG9zaXRpb25cclxuICAgIHRoaXMuaXNDZW50ZXIgPSBvLmNlbnRlciB8fCBmYWxzZTtcclxuICAgIHRoaXMuY3NzR3VpID1cclxuICAgICAgby5jc3MgIT09IHVuZGVmaW5lZCA/IG8uY3NzIDogdGhpcy5pc0NlbnRlciA/IFwiXCIgOiBcInJpZ2h0OjEwcHg7XCI7XHJcblxyXG4gICAgdGhpcy5pc09wZW4gPSBvLm9wZW4gIT09IHVuZGVmaW5lZCA/IG8ub3BlbiA6IHRydWU7XHJcbiAgICB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG4gICAgdGhpcy5pc1Njcm9sbCA9IGZhbHNlO1xyXG5cclxuICAgIHRoaXMudWlzID0gW107XHJcbiAgICB0aGlzLmN1cnJlbnQgPSAtMTtcclxuICAgIHRoaXMucHJvdG8gPSBudWxsO1xyXG4gICAgdGhpcy5pc0VtcHR5ID0gdHJ1ZTtcclxuICAgIHRoaXMuZGVjYWwgPSAwO1xyXG4gICAgdGhpcy5yYXRpbyA9IDE7XHJcbiAgICB0aGlzLm95ID0gMDtcclxuXHJcbiAgICB0aGlzLmlzTmV3VGFyZ2V0ID0gZmFsc2U7XHJcblxyXG4gICAgbGV0IGNjID0gdGhpcy5jb2xvcnM7XHJcblxyXG4gICAgdGhpcy5jb250ZW50ID0gVG9vbHMuZG9tKFxyXG4gICAgICBcImRpdlwiLFxyXG4gICAgICB0aGlzLmNzcy5iYXNpYyArXHJcbiAgICAgICAgXCIgd2lkdGg6MHB4OyBoZWlnaHQ6YXV0bzsgdG9wOjBweDsgYmFja2dyb3VuZDpcIiArXHJcbiAgICAgICAgY2MuY29udGVudCArXHJcbiAgICAgICAgXCI7IFwiICtcclxuICAgICAgICB0aGlzLmNzc0d1aVxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmlubmVyQ29udGVudCA9IFRvb2xzLmRvbShcclxuICAgICAgXCJkaXZcIixcclxuICAgICAgdGhpcy5jc3MuYmFzaWMgK1xyXG4gICAgICAgIFwid2lkdGg6MTAwJTsgdG9wOjA7IGxlZnQ6MDsgaGVpZ2h0OmF1dG87IG92ZXJmbG93OmhpZGRlbjtcIlxyXG4gICAgKTtcclxuICAgIC8vdGhpcy5pbm5lckNvbnRlbnQgPSBUb29scy5kb20oICdkaXYnLCB0aGlzLmNzcy5iYXNpYyArIHRoaXMuY3NzLmJ1dHRvbiArICd3aWR0aDoxMDAlOyB0b3A6MDsgbGVmdDowOyBoZWlnaHQ6YXV0bzsgb3ZlcmZsb3c6aGlkZGVuOycpO1xyXG4gICAgdGhpcy5jb250ZW50LmFwcGVuZENoaWxkKHRoaXMuaW5uZXJDb250ZW50KTtcclxuXHJcbiAgICAvL3RoaXMuaW5uZXIgPSBUb29scy5kb20oICdkaXYnLCB0aGlzLmNzcy5iYXNpYyArICd3aWR0aDoxMDAlOyBsZWZ0OjA7ICcpXHJcbiAgICB0aGlzLnVzZUZsZXggPSB0cnVlO1xyXG4gICAgbGV0IGZsZXhpYmxlID0gdGhpcy51c2VGbGV4ID8gXCJkaXNwbGF5OmZsZXg7IGZsZXgtZmxvdzogcm93IHdyYXA7XCIgOiBcIlwiOyAvLycgZGlzcGxheTpmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6c3RhcnQ7IGFsaWduLWl0ZW1zOnN0YXJ0O2ZsZXgtZGlyZWN0aW9uOiBjb2x1bW47IGp1c3RpZnktY29udGVudDogY2VudGVyOyBhbGlnbi1pdGVtczogY2VudGVyOyc7XHJcbiAgICB0aGlzLmlubmVyID0gVG9vbHMuZG9tKFxyXG4gICAgICBcImRpdlwiLFxyXG4gICAgICB0aGlzLmNzcy5iYXNpYyArIGZsZXhpYmxlICsgXCJ3aWR0aDoxMDAlOyBsZWZ0OjA7IFwiXHJcbiAgICApO1xyXG4gICAgdGhpcy5pbm5lckNvbnRlbnQuYXBwZW5kQ2hpbGQodGhpcy5pbm5lcik7XHJcblxyXG4gICAgLy8gc2Nyb2xsXHJcbiAgICB0aGlzLnNjcm9sbEJHID0gVG9vbHMuZG9tKFxyXG4gICAgICBcImRpdlwiLFxyXG4gICAgICB0aGlzLmNzcy5iYXNpYyArXHJcbiAgICAgICAgXCJyaWdodDowOyB0b3A6MDsgd2lkdGg6XCIgK1xyXG4gICAgICAgICh0aGlzLnNpemUucyAtIDEpICtcclxuICAgICAgICBcInB4OyBoZWlnaHQ6MTBweDsgZGlzcGxheTpub25lOyBiYWNrZ3JvdW5kOlwiICtcclxuICAgICAgICBjYy5iYWNrZ3JvdW5kICtcclxuICAgICAgICBcIjtcIlxyXG4gICAgKTtcclxuICAgIHRoaXMuY29udGVudC5hcHBlbmRDaGlsZCh0aGlzLnNjcm9sbEJHKTtcclxuXHJcbiAgICB0aGlzLnNjcm9sbCA9IFRvb2xzLmRvbShcclxuICAgICAgXCJkaXZcIixcclxuICAgICAgdGhpcy5jc3MuYmFzaWMgK1xyXG4gICAgICAgIFwiYmFja2dyb3VuZDpcIiArXHJcbiAgICAgICAgY2MuYnV0dG9uICtcclxuICAgICAgICBcIjsgcmlnaHQ6MnB4OyB0b3A6MDsgd2lkdGg6XCIgK1xyXG4gICAgICAgICh0aGlzLnNpemUucyAtIDQpICtcclxuICAgICAgICBcInB4OyBoZWlnaHQ6MTBweDtcIlxyXG4gICAgKTtcclxuICAgIHRoaXMuc2Nyb2xsQkcuYXBwZW5kQ2hpbGQodGhpcy5zY3JvbGwpO1xyXG5cclxuICAgIC8vIGJvdHRvbSBidXR0b25cclxuICAgIHRoaXMuYm90dG9tVGV4dCA9IG8uYm90dG9tVGV4dCB8fCBbXCJvcGVuXCIsIFwiY2xvc2VcIl07XHJcblxyXG4gICAgbGV0IHIgPSBjYy5yYWRpdXM7XHJcbiAgICB0aGlzLmJvdHRvbSA9IFRvb2xzLmRvbShcclxuICAgICAgXCJkaXZcIixcclxuICAgICAgdGhpcy5jc3MudHh0ICtcclxuICAgICAgICBcIndpZHRoOjEwMCU7IHRvcDphdXRvOyBib3R0b206MDsgbGVmdDowOyBib3JkZXItYm90dG9tLXJpZ2h0LXJhZGl1czpcIiArXHJcbiAgICAgICAgciArXHJcbiAgICAgICAgXCJweDsgYm9yZGVyLWJvdHRvbS1sZWZ0LXJhZGl1czpcIiArXHJcbiAgICAgICAgciArXHJcbiAgICAgICAgXCJweDsganVzdGlmeS1jb250ZW50OmNlbnRlcjsgaGVpZ2h0OlwiICtcclxuICAgICAgICB0aGlzLmJoICtcclxuICAgICAgICBcInB4OyBsaW5lLWhlaWdodDpcIiArXHJcbiAgICAgICAgKHRoaXMuYmggLSA1KSArXHJcbiAgICAgICAgXCJweDsgY29sb3I6XCIgK1xyXG4gICAgICAgIGNjLnRleHQgK1xyXG4gICAgICAgIFwiO1wiXHJcbiAgICApOyAvLyBib3JkZXItdG9wOjFweCBzb2xpZCAnK1Rvb2xzLmNvbG9ycy5zdHJva2UrJzsnKTtcclxuICAgIHRoaXMuY29udGVudC5hcHBlbmRDaGlsZCh0aGlzLmJvdHRvbSk7XHJcbiAgICB0aGlzLmJvdHRvbS50ZXh0Q29udGVudCA9IHRoaXMuaXNPcGVuXHJcbiAgICAgID8gdGhpcy5ib3R0b21UZXh0WzFdXHJcbiAgICAgIDogdGhpcy5ib3R0b21UZXh0WzBdO1xyXG4gICAgdGhpcy5ib3R0b20uc3R5bGUuYmFja2dyb3VuZCA9IGNjLmJhY2tncm91bmQ7XHJcblxyXG4gICAgLy9cclxuXHJcbiAgICB0aGlzLnBhcmVudCA9IG8ucGFyZW50ICE9PSB1bmRlZmluZWQgPyBvLnBhcmVudCA6IG51bGw7XHJcbiAgICB0aGlzLnBhcmVudCA9IG8udGFyZ2V0ICE9PSB1bmRlZmluZWQgPyBvLnRhcmdldCA6IHRoaXMucGFyZW50O1xyXG5cclxuICAgIGlmICh0aGlzLnBhcmVudCA9PT0gbnVsbCAmJiAhdGhpcy5pc0NhbnZhcykge1xyXG4gICAgICB0aGlzLnBhcmVudCA9IGRvY3VtZW50LmJvZHk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMucGFyZW50ICE9PSBudWxsKSB0aGlzLnBhcmVudC5hcHBlbmRDaGlsZCh0aGlzLmNvbnRlbnQpO1xyXG5cclxuICAgIGlmICh0aGlzLmlzQ2FudmFzICYmIHRoaXMucGFyZW50ID09PSBudWxsKSB0aGlzLmlzQ2FudmFzT25seSA9IHRydWU7XHJcblxyXG4gICAgaWYgKCF0aGlzLmlzQ2FudmFzT25seSkge1xyXG4gICAgICB0aGlzLmNvbnRlbnQuc3R5bGUucG9pbnRlckV2ZW50cyA9IFwiYXV0b1wiO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5jb250ZW50LnN0eWxlLmxlZnQgPSBcIjBweFwiO1xyXG4gICAgICB0aGlzLmNvbnRlbnQuc3R5bGUucmlnaHQgPSBcImF1dG9cIjtcclxuICAgICAgby50cmFuc2l0aW9uID0gMDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBoZWlnaHQgdHJhbnNpdGlvblxyXG4gICAgdGhpcy50cmFuc2l0aW9uID1cclxuICAgICAgby50cmFuc2l0aW9uICE9PSB1bmRlZmluZWQgPyBvLnRyYW5zaXRpb24gOiBUb29scy50cmFuc2l0aW9uO1xyXG4gICAgaWYgKHRoaXMudHJhbnNpdGlvbikgc2V0VGltZW91dCh0aGlzLmFkZFRyYW5zaXRpb24uYmluZCh0aGlzKSwgMTAwMCk7XHJcblxyXG4gICAgdGhpcy5zZXRXaWR0aCgpO1xyXG5cclxuICAgIGlmICh0aGlzLmlzQ2FudmFzKSB0aGlzLm1ha2VDYW52YXMoKTtcclxuXHJcbiAgICBSb290cy5hZGQodGhpcyk7XHJcbiAgfVxyXG5cclxuICB0cmlnZ2VyTW91c2VEb3duKHgsIHkpIHtcclxuICAgIFJvb3RzLmhhbmRsZUV2ZW50KHtcclxuICAgICAgdHlwZTogXCJwb2ludGVyZG93blwiLFxyXG4gICAgICBjbGllbnRYOiB4LFxyXG4gICAgICBjbGllbnRZOiB5LFxyXG4gICAgICBkZWx0YTogMCxcclxuICAgICAga2V5OiBudWxsLFxyXG4gICAgICBrZXlDb2RlOiBOYU4sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHRyaWdnZXJNb3VzZU1vdmUoKSB7XHJcbiAgICBSb290cy5oYW5kbGVFdmVudCh7XHJcbiAgICAgIHR5cGU6IFwicG9pbnRlcm1vdmVcIixcclxuICAgICAgY2xpZW50WDogLTEsXHJcbiAgICAgIGNsaWVudFk6IC0xLFxyXG4gICAgICBkZWx0YTogMCxcclxuICAgICAga2V5OiBudWxsLFxyXG4gICAgICBrZXlDb2RlOiBOYU4sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHRyaWdnZXJNb3VzZVVwKHgsIHkpIHtcclxuICAgIC8qXHJcblxyXG4gICAgICAgIGNsaWVudFgsY2xpZW50WSBhcmUgbm8gdXNlZCB3aGVuIGlzQ2FudmFzPT10cnVlXHJcbiAgICAgICAgKi9cclxuICAgIFJvb3RzLmhhbmRsZUV2ZW50KHtcclxuICAgICAgdHlwZTogXCJwb2ludGVydXBcIixcclxuICAgICAgY2xpZW50WDogeCxcclxuICAgICAgY2xpZW50WTogeSxcclxuICAgICAgZGVsdGE6IDAsXHJcbiAgICAgIGtleTogbnVsbCxcclxuICAgICAga2V5Q29kZTogTmFOLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBzZXRUb3AodCwgaCkge1xyXG4gICAgdGhpcy5jb250ZW50LnN0eWxlLnRvcCA9IHQgKyBcInB4XCI7XHJcbiAgICBpZiAoaCAhPT0gdW5kZWZpbmVkKSB0aGlzLmZvcmNlSGVpZ2h0ID0gaDtcclxuICAgIHRoaXMuY2FsYygpO1xyXG5cclxuICAgIFJvb3RzLm5lZWRSZVpvbmUgPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgYWRkVHJhbnNpdGlvbigpIHtcclxuICAgIGlmICh0aGlzLnRyYW5zaXRpb24gJiYgIXRoaXMuaXNDYW52YXMpIHtcclxuICAgICAgdGhpcy5pbm5lckNvbnRlbnQuc3R5bGUudHJhbnNpdGlvbiA9XHJcbiAgICAgICAgXCJoZWlnaHQgXCIgKyB0aGlzLnRyYW5zaXRpb24gKyBcInMgZWFzZS1vdXRcIjtcclxuICAgICAgdGhpcy5jb250ZW50LnN0eWxlLnRyYW5zaXRpb24gPVxyXG4gICAgICAgIFwiaGVpZ2h0IFwiICsgdGhpcy50cmFuc2l0aW9uICsgXCJzIGVhc2Utb3V0XCI7XHJcbiAgICAgIHRoaXMuYm90dG9tLnN0eWxlLnRyYW5zaXRpb24gPSBcInRvcCBcIiArIHRoaXMudHJhbnNpdGlvbiArIFwicyBlYXNlLW91dFwiO1xyXG4gICAgICAvL3RoaXMuYm90dG9tLmFkZEV2ZW50TGlzdGVuZXIoXCJ0cmFuc2l0aW9uZW5kXCIsIFJvb3RzLnJlc2l6ZSwgdHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGkgPSB0aGlzLnVpcy5sZW5ndGg7XHJcbiAgICB3aGlsZSAoaS0tKSB0aGlzLnVpc1tpXS5hZGRUcmFuc2l0aW9uKCk7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBDQU5WQVNcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIG9uRHJhdygpIHt9XHJcblxyXG4gIG1ha2VDYW52YXMoKSB7XHJcbiAgICB0aGlzLmNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhcclxuICAgICAgXCJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hodG1sXCIsXHJcbiAgICAgIFwiY2FudmFzXCJcclxuICAgICk7XHJcbiAgICB0aGlzLmNhbnZhcy53aWR0aCA9IHRoaXMuem9uZS53O1xyXG4gICAgdGhpcy5jYW52YXMuaGVpZ2h0ID0gdGhpcy5mb3JjZUhlaWdodCA/IHRoaXMuZm9yY2VIZWlnaHQgOiB0aGlzLnpvbmUuaDtcclxuXHJcbiAgICAvL2NvbnNvbGUubG9nKCB0aGlzLmNhbnZhcy53aWR0aCwgdGhpcy5jYW52YXMuaGVpZ2h0IClcclxuICB9XHJcblxyXG4gIGRyYXcoZm9yY2UpIHtcclxuICAgIGlmICh0aGlzLmNhbnZhcyA9PT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgIGxldCB3ID0gdGhpcy56b25lLnc7XHJcbiAgICBsZXQgaCA9IHRoaXMuZm9yY2VIZWlnaHQgPyB0aGlzLmZvcmNlSGVpZ2h0IDogdGhpcy56b25lLmg7XHJcbiAgICBSb290cy50b0NhbnZhcyh0aGlzLCB3LCBoLCBmb3JjZSk7XHJcbiAgfVxyXG5cclxuICAvLy8vLy9cclxuXHJcbiAgZ2V0RG9tKCkge1xyXG4gICAgcmV0dXJuIHRoaXMuY29udGVudDtcclxuICB9XHJcblxyXG4gIG5vTW91c2UoKSB7XHJcbiAgICB0aGlzLm1vdXNlLm5lZygpO1xyXG4gIH1cclxuXHJcbiAgc2V0TW91c2UodXYsIGZsaXAgPSB0cnVlKSB7XHJcbiAgICBpZiAoZmxpcClcclxuICAgICAgdGhpcy5tb3VzZS5zZXQoXHJcbiAgICAgICAgTWF0aC5yb3VuZCh1di54ICogdGhpcy5jYW52YXMud2lkdGgpLFxyXG4gICAgICAgIHRoaXMuY2FudmFzLmhlaWdodCAtIE1hdGgucm91bmQodXYueSAqIHRoaXMuY2FudmFzLmhlaWdodClcclxuICAgICAgKTtcclxuICAgIGVsc2VcclxuICAgICAgdGhpcy5tb3VzZS5zZXQoXHJcbiAgICAgICAgTWF0aC5yb3VuZCh1di54ICogdGhpcy5jYW52YXMud2lkdGgpLFxyXG4gICAgICAgIE1hdGgucm91bmQodXYueSAqIHRoaXMuY2FudmFzLmhlaWdodClcclxuICAgICAgKTtcclxuICAgIC8vdGhpcy5tb3VzZS5zZXQoIG0ueCwgbS55ICk7XHJcblxyXG4gICAgLy9jb25zb2xlLmxvZyhcInNldE1vdXNlIFwiK3V2LngrXCIgXCIrdXYueSlcclxuICB9XHJcblxyXG4gIHNldENvbmZpZyhvKSB7XHJcbiAgICAvLyByZXNldCB0byBkZWZhdWx0IHRleHRcclxuICAgIFRvb2xzLnNldFRleHQoKTtcclxuICAgIHRoaXMuY29sb3JzID0gVG9vbHMuZGVmaW5lQ29sb3Iobyk7XHJcbiAgfVxyXG5cclxuICBzZXRDb2xvcnMobykge1xyXG4gICAgZm9yIChsZXQgYyBpbiBvKSB7XHJcbiAgICAgIGlmICh0aGlzLmNvbG9yc1tjXSkgdGhpcy5jb2xvcnNbY10gPSBvW2NdO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgc2V0VGV4dChzaXplLCBjb2xvciwgZm9udCwgc2hhZG93KSB7XHJcbiAgICBUb29scy5zZXRUZXh0KHNpemUsIGNvbG9yLCBmb250LCBzaGFkb3cpO1xyXG4gIH1cclxuXHJcbiAgaGlkZShiKSB7XHJcbiAgICB0aGlzLmNvbnRlbnQuc3R5bGUudmlzaWJpbGl0eSA9IGIgPyBcImhpZGRlblwiIDogXCJ2aXNpYmxlXCI7XHJcbiAgfVxyXG5cclxuICBkaXNwbGF5KHYgPSBmYWxzZSkge1xyXG4gICAgdGhpcy5jb250ZW50LnN0eWxlLnZpc2liaWxpdHkgPSB2ID8gXCJ2aXNpYmxlXCIgOiBcImhpZGRlblwiO1xyXG4gIH1cclxuXHJcbiAgb25DaGFuZ2UoZikge1xyXG4gICAgdGhpcy5jYWxsYmFjayA9IGYgfHwgbnVsbDtcclxuICAgIHJldHVybiB0aGlzO1xyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICAgU1RZTEVTXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBtb2RlKG4pIHtcclxuICAgIGxldCBuZWVkQ2hhbmdlID0gZmFsc2U7XHJcbiAgICBsZXQgY2MgPSB0aGlzLmNvbG9ycztcclxuXHJcbiAgICBpZiAobiAhPT0gdGhpcy5jbikge1xyXG4gICAgICB0aGlzLmNuID0gbjtcclxuXHJcbiAgICAgIHN3aXRjaCAobikge1xyXG4gICAgICAgIGNhc2UgXCJkZWZcIjpcclxuICAgICAgICAgIFJvb3RzLmN1cnNvcigpO1xyXG4gICAgICAgICAgdGhpcy5zY3JvbGwuc3R5bGUuYmFja2dyb3VuZCA9IGNjLmJ1dHRvbjtcclxuICAgICAgICAgIHRoaXMuYm90dG9tLnN0eWxlLmJhY2tncm91bmQgPSBjYy5iYWNrZ3JvdW5kO1xyXG4gICAgICAgICAgdGhpcy5ib3R0b20uc3R5bGUuY29sb3IgPSBjYy50ZXh0O1xyXG4gICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIC8vY2FzZSAnc2Nyb2xsRGVmJzogdGhpcy5zY3JvbGwuc3R5bGUuYmFja2dyb3VuZCA9IHRoaXMuY29sb3JzLnNjcm9sbDsgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcInNjcm9sbE92ZXJcIjpcclxuICAgICAgICAgIFJvb3RzLmN1cnNvcihcIm5zLXJlc2l6ZVwiKTtcclxuICAgICAgICAgIHRoaXMuc2Nyb2xsLnN0eWxlLmJhY2tncm91bmQgPSBjYy5zZWxlY3Q7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIFwic2Nyb2xsRG93blwiOlxyXG4gICAgICAgICAgdGhpcy5zY3JvbGwuc3R5bGUuYmFja2dyb3VuZCA9IGNjLnNlbGVjdDtcclxuICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAvL2Nhc2UgJ2JvdHRvbURlZic6IHRoaXMuYm90dG9tLnN0eWxlLmJhY2tncm91bmQgPSB0aGlzLmNvbG9ycy5iYWNrZ3JvdW5kOyBicmVhaztcclxuICAgICAgICBjYXNlIFwiYm90dG9tT3ZlclwiOlxyXG4gICAgICAgICAgUm9vdHMuY3Vyc29yKFwicG9pbnRlclwiKTtcclxuICAgICAgICAgIHRoaXMuYm90dG9tLnN0eWxlLmJhY2tncm91bmQgPSBjYy5iYWNrZ3JvdW5kT3ZlcjtcclxuICAgICAgICAgIHRoaXMuYm90dG9tLnN0eWxlLmNvbG9yID0gY2MudGV4dE92ZXI7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICAvL2Nhc2UgJ2JvdHRvbURvd24nOiB0aGlzLmJvdHRvbS5zdHlsZS5iYWNrZ3JvdW5kID0gdGhpcy5jb2xvcnMuc2VsZWN0OyB0aGlzLmJvdHRvbS5zdHlsZS5jb2xvciA9ICcjMDAwJzsgYnJlYWs7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIG5lZWRDaGFuZ2UgPSB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBuZWVkQ2hhbmdlO1xyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICAgVEFSR0VUXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBjbGVhclRhcmdldCgpIHtcclxuICAgIGlmICh0aGlzLmN1cnJlbnQgPT09IC0xKSByZXR1cm4gZmFsc2U7XHJcbiAgICBpZiAodGhpcy5wcm90by5zKSB7XHJcbiAgICAgIC8vIGlmIG5vIHMgdGFyZ2V0IGlzIGRlbGV0ZSAhIVxyXG4gICAgICB0aGlzLnByb3RvLnVpb3V0KCk7XHJcbiAgICAgIHRoaXMucHJvdG8ucmVzZXQoKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnByb3RvID0gbnVsbDtcclxuICAgIHRoaXMuY3VycmVudCA9IC0xO1xyXG5cclxuICAgIC8vL2NvbnNvbGUubG9nKHRoaXMuaXNEb3duKS8vaWYodGhpcy5pc0Rvd24pUm9vdHMuY2xlYXJJbnB1dCgpO1xyXG5cclxuICAgIFJvb3RzLmN1cnNvcigpO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBaT05FIFRFU1RcclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcblxyXG4gIHRlc3Rab25lKGUpIHtcclxuICAgIGxldCBsID0gdGhpcy5sb2NhbDtcclxuICAgIGlmIChsLnggPT09IC0xICYmIGwueSA9PT0gLTEpIHJldHVybiBcIlwiO1xyXG5cclxuICAgIHRoaXMuaXNSZXNldCA9IGZhbHNlO1xyXG5cclxuICAgIGxldCBuYW1lID0gXCJcIjtcclxuXHJcbiAgICBsZXQgcyA9IHRoaXMuaXNTY3JvbGwgPyB0aGlzLnpvbmUudyAtIHRoaXMuc2l6ZS5zIDogdGhpcy56b25lLnc7XHJcblxyXG4gICAgaWYgKGwueSA+IHRoaXMuem9uZS5oIC0gdGhpcy5iaCAmJiBsLnkgPCB0aGlzLnpvbmUuaCkgbmFtZSA9IFwiYm90dG9tXCI7XHJcbiAgICBlbHNlIG5hbWUgPSBsLnggPiBzID8gXCJzY3JvbGxcIiA6IFwiY29udGVudFwiO1xyXG5cclxuICAgIHJldHVybiBuYW1lO1xyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICAgRVZFTlRTXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBoYW5kbGVFdmVudChlKSB7XHJcbiAgICAvL2lmKCB0aGlzLmNsZWFubmluZyApIHJldHVyblxyXG5cclxuICAgIC8vY29uc29sZS5sb2coXCJHdWkuaGFuZGxlRXZlbnRcIilcclxuICAgIC8vY29uc29sZS5sb2coZSk7XHJcbiAgICBsZXQgdHlwZSA9IGUudHlwZTtcclxuXHJcbiAgICBsZXQgY2hhbmdlID0gZmFsc2U7XHJcbiAgICBsZXQgcHJvdG9DaGFuZ2UgPSBmYWxzZTtcclxuXHJcbiAgICBsZXQgbmFtZSA9IHRoaXMudGVzdFpvbmUoZSk7XHJcblxyXG4gICAgaWYgKHR5cGUgPT09IFwibW91c2V1cFwiICYmIHRoaXMuaXNEb3duKSB0aGlzLmlzRG93biA9IGZhbHNlO1xyXG4gICAgaWYgKHR5cGUgPT09IFwibW91c2Vkb3duXCIgJiYgIXRoaXMuaXNEb3duKSB0aGlzLmlzRG93biA9IHRydWU7XHJcblxyXG4gICAgaWYgKHRoaXMuaXNEb3duICYmIHRoaXMuaXNOZXdUYXJnZXQpIHtcclxuICAgICAgUm9vdHMuY2xlYXJJbnB1dCgpO1xyXG4gICAgICB0aGlzLmlzTmV3VGFyZ2V0ID0gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFuYW1lKSByZXR1cm47XHJcblxyXG4gICAgc3dpdGNoIChuYW1lKSB7XHJcbiAgICAgIGNhc2UgXCJjb250ZW50XCI6XHJcbiAgICAgICAgZS5jbGllbnRZID0gdGhpcy5pc1Njcm9sbCA/IGUuY2xpZW50WSArIHRoaXMuZGVjYWwgOiBlLmNsaWVudFk7XHJcblxyXG4gICAgICAgIGlmIChSb290cy5pc01vYmlsZSAmJiB0eXBlID09PSBcIm1vdXNlZG93blwiKSB0aGlzLmdldE5leHQoZSwgY2hhbmdlKTtcclxuXHJcbiAgICAgICAgaWYgKHRoaXMucHJvdG8pIHByb3RvQ2hhbmdlID0gdGhpcy5wcm90by5oYW5kbGVFdmVudChlKTtcclxuXHJcbiAgICAgICAgaWYgKHR5cGUgPT09IFwibW91c2Vtb3ZlXCIpIGNoYW5nZSA9IHRoaXMubW9kZShcImRlZlwiKTtcclxuICAgICAgICBpZiAodHlwZSA9PT0gXCJ3aGVlbFwiICYmICFwcm90b0NoYW5nZSAmJiB0aGlzLmlzU2Nyb2xsKVxyXG4gICAgICAgICAgY2hhbmdlID0gdGhpcy5vbldoZWVsKGUpO1xyXG5cclxuICAgICAgICBpZiAoIVJvb3RzLmxvY2spIHtcclxuICAgICAgICAgIHRoaXMuZ2V0TmV4dChlLCBjaGFuZ2UpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgXCJib3R0b21cIjpcclxuICAgICAgICB0aGlzLmNsZWFyVGFyZ2V0KCk7XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IFwibW91c2Vtb3ZlXCIpIGNoYW5nZSA9IHRoaXMubW9kZShcImJvdHRvbU92ZXJcIik7XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IFwibW91c2Vkb3duXCIpIHtcclxuICAgICAgICAgIHRoaXMuaXNPcGVuID0gdGhpcy5pc09wZW4gPyBmYWxzZSA6IHRydWU7XHJcbiAgICAgICAgICB0aGlzLmJvdHRvbS50ZXh0Q29udGVudCA9IHRoaXMuaXNPcGVuXHJcbiAgICAgICAgICAgID8gdGhpcy5ib3R0b21UZXh0WzFdXHJcbiAgICAgICAgICAgIDogdGhpcy5ib3R0b21UZXh0WzBdO1xyXG4gICAgICAgICAgLy90aGlzLnNldEhlaWdodCgpO1xyXG4gICAgICAgICAgdGhpcy5jYWxjKCk7XHJcbiAgICAgICAgICB0aGlzLm1vZGUoXCJkZWZcIik7XHJcbiAgICAgICAgICBjaGFuZ2UgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgXCJzY3JvbGxcIjpcclxuICAgICAgICB0aGlzLmNsZWFyVGFyZ2V0KCk7XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IFwibW91c2Vtb3ZlXCIpIGNoYW5nZSA9IHRoaXMubW9kZShcInNjcm9sbE92ZXJcIik7XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IFwibW91c2Vkb3duXCIpIGNoYW5nZSA9IHRoaXMubW9kZShcInNjcm9sbERvd25cIik7XHJcbiAgICAgICAgaWYgKHR5cGUgPT09IFwid2hlZWxcIikgY2hhbmdlID0gdGhpcy5vbldoZWVsKGUpO1xyXG4gICAgICAgIGlmICh0aGlzLmlzRG93bikgdGhpcy51cGRhdGUoZS5jbGllbnRZIC0gdGhpcy56b25lLnkgLSB0aGlzLnNoICogMC41KTtcclxuXHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRoaXMuaXNEb3duKSBjaGFuZ2UgPSB0cnVlO1xyXG4gICAgaWYgKHByb3RvQ2hhbmdlKSBjaGFuZ2UgPSB0cnVlO1xyXG5cclxuICAgIGlmICh0eXBlID09PSBcImtleXVwXCIpIGNoYW5nZSA9IHRydWU7XHJcbiAgICBpZiAodHlwZSA9PT0gXCJrZXlkb3duXCIpIGNoYW5nZSA9IHRydWU7XHJcblxyXG4gICAgaWYgKGNoYW5nZSkgdGhpcy5kcmF3KCk7XHJcbiAgfVxyXG5cclxuICBnZXROZXh0KGUsIGNoYW5nZSkge1xyXG4gICAgbGV0IG5leHQgPSBSb290cy5maW5kVGFyZ2V0KHRoaXMudWlzLCBlKTtcclxuXHJcbiAgICBpZiAobmV4dCAhPT0gdGhpcy5jdXJyZW50KSB7XHJcbiAgICAgIHRoaXMuY2xlYXJUYXJnZXQoKTtcclxuICAgICAgdGhpcy5jdXJyZW50ID0gbmV4dDtcclxuICAgICAgY2hhbmdlID0gdHJ1ZTtcclxuICAgICAgdGhpcy5pc05ld1RhcmdldCA9IHRydWU7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKG5leHQgIT09IC0xKSB7XHJcbiAgICAgIHRoaXMucHJvdG8gPSB0aGlzLnVpc1t0aGlzLmN1cnJlbnRdO1xyXG4gICAgICB0aGlzLnByb3RvLnVpb3ZlcigpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgb25XaGVlbChlKSB7XHJcbiAgICB0aGlzLm95ICs9IDIwICogZS5kZWx0YTtcclxuICAgIHRoaXMudXBkYXRlKHRoaXMub3kpO1xyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBSRVNFVFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgcmVzZXQoZm9yY2UpIHtcclxuICAgIGlmICh0aGlzLmlzUmVzZXQpIHJldHVybjtcclxuXHJcbiAgICAvL3RoaXMucmVzZXRJdGVtKCk7XHJcblxyXG4gICAgdGhpcy5tb3VzZS5uZWcoKTtcclxuICAgIHRoaXMuaXNEb3duID0gZmFsc2U7XHJcblxyXG4gICAgLy9Sb290cy5jbGVhcklucHV0KCk7XHJcbiAgICBsZXQgciA9IHRoaXMubW9kZShcImRlZlwiKTtcclxuICAgIGxldCByMiA9IHRoaXMuY2xlYXJUYXJnZXQoKTtcclxuXHJcbiAgICBpZiAociB8fCByMikgdGhpcy5kcmF3KHRydWUpO1xyXG5cclxuICAgIHRoaXMuaXNSZXNldCA9IHRydWU7XHJcblxyXG4gICAgLy9Sb290cy5sb2NrID0gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tXHJcbiAgLy8gICBBREQgTk9ERVxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgYWRkKCkge1xyXG4gICAgLy9pZih0aGlzLmNsZWFubmluZykgdGhpcy5jbGVhbm5pbmcgPSBmYWxzZVxyXG5cclxuICAgIGxldCBhID0gYXJndW1lbnRzO1xyXG4gICAgbGV0IG9udG9wID0gZmFsc2U7XHJcblxyXG4gICAgaWYgKHR5cGVvZiBhWzFdID09PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgIGFbMV0uaXNVSSA9IHRydWU7XHJcbiAgICAgIGFbMV0ubWFpbiA9IHRoaXM7XHJcblxyXG4gICAgICBvbnRvcCA9IGFbMV0ub250b3AgPyBhWzFdLm9udG9wIDogZmFsc2U7XHJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhWzFdID09PSBcInN0cmluZ1wiKSB7XHJcbiAgICAgIGlmIChhWzJdID09PSB1bmRlZmluZWQpIFtdLnB1c2guY2FsbChhLCB7IGlzVUk6IHRydWUsIG1haW46IHRoaXMgfSk7XHJcbiAgICAgIGVsc2Uge1xyXG4gICAgICAgIGFbMl0uaXNVSSA9IHRydWU7XHJcbiAgICAgICAgYVsyXS5tYWluID0gdGhpcztcclxuICAgICAgICAvL29udG9wID0gYVsxXS5vbnRvcCA/IGFbMV0ub250b3AgOiBmYWxzZTtcclxuICAgICAgICBvbnRvcCA9IGFbMl0ub250b3AgPyBhWzJdLm9udG9wIDogZmFsc2U7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBsZXQgdSA9IGFkZC5hcHBseSh0aGlzLCBhKTtcclxuXHJcbiAgICBpZiAodSA9PT0gbnVsbCkgcmV0dXJuO1xyXG5cclxuICAgIGlmIChvbnRvcCkgdGhpcy51aXMudW5zaGlmdCh1KTtcclxuICAgIGVsc2UgdGhpcy51aXMucHVzaCh1KTtcclxuXHJcbiAgICB0aGlzLmNhbGMoKTtcclxuXHJcbiAgICB0aGlzLmlzRW1wdHkgPSBmYWxzZTtcclxuXHJcbiAgICByZXR1cm4gdTtcclxuICB9XHJcblxyXG4gIC8vIHJlbW92ZSBvbmUgbm9kZVxyXG5cclxuICByZW1vdmUobikge1xyXG4gICAgaWYgKG4uZGlzcG9zZSkgbi5kaXNwb3NlKCk7XHJcbiAgfVxyXG5cclxuICAvLyBjYWxsIGFmdGVyIHVpcyBjbGVhclxyXG5cclxuICBjbGVhck9uZShuKSB7XHJcbiAgICBsZXQgaWQgPSB0aGlzLnVpcy5pbmRleE9mKG4pO1xyXG4gICAgaWYgKGlkICE9PSAtMSkge1xyXG4gICAgICAvL3RoaXMuY2FsYyggLSAodGhpcy51aXNbIGlkIF0uaCArIDEgKSApO1xyXG4gICAgICB0aGlzLmlubmVyLnJlbW92ZUNoaWxkKHRoaXMudWlzW2lkXS5jWzBdKTtcclxuICAgICAgdGhpcy51aXMuc3BsaWNlKGlkLCAxKTtcclxuICAgICAgdGhpcy5jYWxjKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBjbGVhciBhbGwgZ3VpXHJcblxyXG4gIGVtcHR5KCkge1xyXG4gICAgLy90aGlzLmNsZWFubmluZyA9IHRydWVcclxuXHJcbiAgICAvL3RoaXMuY2xvc2UoKTtcclxuXHJcbiAgICBsZXQgaSA9IHRoaXMudWlzLmxlbmd0aCxcclxuICAgICAgaXRlbTtcclxuXHJcbiAgICB3aGlsZSAoaS0tKSB7XHJcbiAgICAgIGl0ZW0gPSB0aGlzLnVpcy5wb3AoKTtcclxuICAgICAgdGhpcy5pbm5lci5yZW1vdmVDaGlsZChpdGVtLmNbMF0pO1xyXG4gICAgICBpdGVtLmRpc3Bvc2UoKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnVpcyA9IFtdO1xyXG4gICAgdGhpcy5pc0VtcHR5ID0gdHJ1ZTtcclxuICAgIHRoaXMuY2FsYygpO1xyXG4gIH1cclxuXHJcbiAgY2xlYXIoKSB7XHJcbiAgICB0aGlzLmVtcHR5KCk7XHJcbiAgfVxyXG5cclxuICBjbGVhcjIoKSB7XHJcbiAgICBzZXRUaW1lb3V0KHRoaXMuZW1wdHkuYmluZCh0aGlzKSwgMCk7XHJcbiAgfVxyXG5cclxuICBkaXNwb3NlKCkge1xyXG4gICAgdGhpcy5jbGVhcigpO1xyXG4gICAgaWYgKHRoaXMucGFyZW50ICE9PSBudWxsKSB0aGlzLnBhcmVudC5yZW1vdmVDaGlsZCh0aGlzLmNvbnRlbnQpO1xyXG4gICAgUm9vdHMucmVtb3ZlKHRoaXMpO1xyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICAgSVRFTVMgU1BFQ0lBTFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgcmVzZXRJdGVtKCkge1xyXG4gICAgaWYgKCF0aGlzLmlzSXRlbU1vZGUpIHJldHVybjtcclxuXHJcbiAgICBsZXQgaSA9IHRoaXMudWlzLmxlbmd0aDtcclxuICAgIHdoaWxlIChpLS0pIHRoaXMudWlzW2ldLnNlbGVjdGVkKCk7XHJcbiAgfVxyXG5cclxuICBzZXRJdGVtKG5hbWUpIHtcclxuICAgIGlmICghdGhpcy5pc0l0ZW1Nb2RlKSByZXR1cm47XHJcblxyXG4gICAgbmFtZSA9IG5hbWUgfHwgXCJcIjtcclxuICAgIHRoaXMucmVzZXRJdGVtKCk7XHJcblxyXG4gICAgaWYgKCFuYW1lKSB7XHJcbiAgICAgIHRoaXMudXBkYXRlKDApO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgbGV0IGkgPSB0aGlzLnVpcy5sZW5ndGg7XHJcbiAgICB3aGlsZSAoaS0tKSB7XHJcbiAgICAgIGlmICh0aGlzLnVpc1tpXS52YWx1ZSA9PT0gbmFtZSkge1xyXG4gICAgICAgIHRoaXMudWlzW2ldLnNlbGVjdGVkKHRydWUpO1xyXG4gICAgICAgIGlmICh0aGlzLmlzU2Nyb2xsKVxyXG4gICAgICAgICAgdGhpcy51cGRhdGUoaSAqICh0aGlzLnVpc1tpXS5oICsgdGhpcy5tYXJnaW4pICogdGhpcy5yYXRpbyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuICAvLyAgIFNDUk9MTFxyXG4gIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHJcbiAgdXBTY3JvbGwoYikge1xyXG4gICAgdGhpcy5zdyA9IGIgPyB0aGlzLnNpemUucyA6IDA7XHJcbiAgICB0aGlzLm95ID0gYiA/IHRoaXMub3kgOiAwO1xyXG4gICAgdGhpcy5zY3JvbGxCRy5zdHlsZS5kaXNwbGF5ID0gYiA/IFwiYmxvY2tcIiA6IFwibm9uZVwiO1xyXG5cclxuICAgIGlmIChiKSB7XHJcbiAgICAgIHRoaXMudG90YWwgPSB0aGlzLmg7XHJcblxyXG4gICAgICB0aGlzLm1heFZpZXcgPSB0aGlzLm1heEhlaWdodDtcclxuXHJcbiAgICAgIHRoaXMucmF0aW8gPSB0aGlzLm1heFZpZXcgLyB0aGlzLnRvdGFsO1xyXG4gICAgICB0aGlzLnNoID0gdGhpcy5tYXhWaWV3ICogdGhpcy5yYXRpbztcclxuXHJcbiAgICAgIHRoaXMucmFuZ2UgPSB0aGlzLm1heFZpZXcgLSB0aGlzLnNoO1xyXG5cclxuICAgICAgdGhpcy5veSA9IFRvb2xzLmNsYW1wKHRoaXMub3ksIDAsIHRoaXMucmFuZ2UpO1xyXG5cclxuICAgICAgdGhpcy5zY3JvbGxCRy5zdHlsZS5oZWlnaHQgPSB0aGlzLm1heFZpZXcgKyBcInB4XCI7XHJcbiAgICAgIHRoaXMuc2Nyb2xsLnN0eWxlLmhlaWdodCA9IHRoaXMuc2ggKyBcInB4XCI7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5zZXRJdGVtV2lkdGgodGhpcy56b25lLncgLSB0aGlzLnN3KTtcclxuICAgIHRoaXMudXBkYXRlKHRoaXMub3kpO1xyXG4gIH1cclxuXHJcbiAgdXBkYXRlKHkpIHtcclxuICAgIHkgPSBUb29scy5jbGFtcCh5LCAwLCB0aGlzLnJhbmdlKTtcclxuXHJcbiAgICB0aGlzLmRlY2FsID0gTWF0aC5mbG9vcih5IC8gdGhpcy5yYXRpbyk7XHJcbiAgICB0aGlzLmlubmVyLnN0eWxlLnRvcCA9IC10aGlzLmRlY2FsICsgXCJweFwiO1xyXG4gICAgdGhpcy5zY3JvbGwuc3R5bGUudG9wID0gTWF0aC5mbG9vcih5KSArIFwicHhcIjtcclxuICAgIHRoaXMub3kgPSB5O1xyXG4gIH1cclxuXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG4gIC8vICAgUkVTSVpFIEZVTkNUSU9OXHJcbiAgLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxyXG5cclxuICBjYWxjVWlzKCkge1xyXG4gICAgcmV0dXJuIFJvb3RzLmNhbGNVaXModGhpcy51aXMsIHRoaXMuem9uZSwgdGhpcy56b25lLnkpO1xyXG4gIH1cclxuXHJcbiAgY2FsYygpIHtcclxuICAgIGNsZWFyVGltZW91dCh0aGlzLnRtcCk7XHJcbiAgICB0aGlzLnRtcCA9IHNldFRpbWVvdXQodGhpcy5zZXRIZWlnaHQuYmluZCh0aGlzKSwgMTApO1xyXG4gIH1cclxuXHJcbiAgc2V0SGVpZ2h0KCkge1xyXG4gICAgaWYgKHRoaXMudG1wKSBjbGVhclRpbWVvdXQodGhpcy50bXApO1xyXG5cclxuICAgIHRoaXMuem9uZS5oID0gdGhpcy5iaDtcclxuICAgIHRoaXMuaXNTY3JvbGwgPSBmYWxzZTtcclxuXHJcbiAgICBpZiAodGhpcy5pc09wZW4pIHtcclxuICAgICAgdGhpcy5oID0gdGhpcy5jYWxjVWlzKCk7XHJcblxyXG4gICAgICBsZXQgaGhoID0gdGhpcy5mb3JjZUhlaWdodFxyXG4gICAgICAgID8gdGhpcy5mb3JjZUhlaWdodCArIHRoaXMuem9uZS55XHJcbiAgICAgICAgOiB3aW5kb3cuaW5uZXJIZWlnaHQ7XHJcblxyXG4gICAgICB0aGlzLm1heEhlaWdodCA9IGhoaCAtIHRoaXMuem9uZS55IC0gdGhpcy5iaDtcclxuXHJcbiAgICAgIGxldCBkaWZmID0gdGhpcy5oIC0gdGhpcy5tYXhIZWlnaHQ7XHJcblxyXG4gICAgICBpZiAoZGlmZiA+IDEpIHtcclxuICAgICAgICB0aGlzLmlzU2Nyb2xsID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLnpvbmUuaCA9IHRoaXMubWF4SGVpZ2h0ICsgdGhpcy5iaDtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLnpvbmUuaCA9IHRoaXMuaCArIHRoaXMuYmg7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnVwU2Nyb2xsKHRoaXMuaXNTY3JvbGwpO1xyXG5cclxuICAgIHRoaXMuaW5uZXJDb250ZW50LnN0eWxlLmhlaWdodCA9IHRoaXMuem9uZS5oIC0gdGhpcy5iaCArIFwicHhcIjtcclxuICAgIHRoaXMuY29udGVudC5zdHlsZS5oZWlnaHQgPSB0aGlzLnpvbmUuaCArIFwicHhcIjtcclxuICAgIHRoaXMuYm90dG9tLnN0eWxlLnRvcCA9IHRoaXMuem9uZS5oIC0gdGhpcy5iaCArIFwicHhcIjtcclxuXHJcbiAgICBpZiAodGhpcy5mb3JjZUhlaWdodCAmJiB0aGlzLmxvY2tIZWlnaHQpXHJcbiAgICAgIHRoaXMuY29udGVudC5zdHlsZS5oZWlnaHQgPSB0aGlzLmZvcmNlSGVpZ2h0ICsgXCJweFwiO1xyXG4gICAgaWYgKHRoaXMuaXNDYW52YXMpIHRoaXMuZHJhdyh0cnVlKTtcclxuICB9XHJcblxyXG4gIHJlem9uZSgpIHtcclxuICAgIFJvb3RzLm5lZWRSZVpvbmUgPSB0cnVlO1xyXG4gIH1cclxuXHJcbiAgc2V0V2lkdGgodykge1xyXG4gICAgaWYgKHcpIHRoaXMuem9uZS53ID0gdztcclxuXHJcbiAgICB0aGlzLnpvbmUudyA9IE1hdGguZmxvb3IodGhpcy56b25lLncpO1xyXG4gICAgdGhpcy5jb250ZW50LnN0eWxlLndpZHRoID0gdGhpcy56b25lLncgKyBcInB4XCI7XHJcbiAgICBpZiAodGhpcy5pc0NlbnRlcilcclxuICAgICAgdGhpcy5jb250ZW50LnN0eWxlLm1hcmdpbkxlZnQgPSAtTWF0aC5mbG9vcih0aGlzLnpvbmUudyAqIDAuNSkgKyBcInB4XCI7XHJcbiAgICB0aGlzLnNldEl0ZW1XaWR0aCh0aGlzLnpvbmUudyAtIHRoaXMuc3cpO1xyXG4gIH1cclxuXHJcbiAgc2V0SXRlbVdpZHRoKHcpIHtcclxuICAgIGxldCBpID0gdGhpcy51aXMubGVuZ3RoO1xyXG4gICAgd2hpbGUgKGktLSkge1xyXG4gICAgICB0aGlzLnVpc1tpXS5zZXRTaXplKHcpO1xyXG4gICAgICB0aGlzLnVpc1tpXS5yU2l6ZSgpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDWSxNQUFDLFFBQVEsR0FBRyxRQUFRO0FBQ2hDO0FBQ0E7QUFDQTtBQUNBLE1BQU0sQ0FBQyxHQUFHO0FBQ1YsRUFBRSxFQUFFLEVBQUUsRUFBRTtBQUNSO0FBQ0EsRUFBRSxHQUFHLEVBQUUsSUFBSTtBQUNYO0FBQ0EsRUFBRSxFQUFFLEVBQUUsSUFBSTtBQUNWLEVBQUUsSUFBSSxFQUFFLEtBQUs7QUFDYixFQUFFLEtBQUssRUFBRSxLQUFLO0FBQ2QsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO0FBQ2I7QUFDQSxFQUFFLFVBQVUsRUFBRSxJQUFJO0FBQ2xCLEVBQUUsVUFBVSxFQUFFLEtBQUs7QUFDbkIsRUFBRSxTQUFTLEVBQUUsS0FBSztBQUNsQixFQUFFLFlBQVksRUFBRSxLQUFLO0FBQ3JCLEVBQUUs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QUFJLElBQUksQ0FBQyxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDM0QsSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDOUIsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxFQUFFLE1BQU0sRUFBRSxVQUFVLENBQUMsRUFBRTtBQUN2QixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTTtBQUN2QixNQUFNLElBQUksR0FBRyxDQUFDLENBQUM7QUFDZixNQUFNLENBQUM7QUFDUCxNQUFNLENBQUM7QUFDUCxNQUFNLENBQUMsQ0FBQztBQUNSO0FBQ0EsSUFBSSxPQUFPLENBQUMsRUFBRSxFQUFFO0FBQ2hCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEI7QUFDQSxNQUFNLElBQUksQ0FBQyxDQUFDLFlBQVksRUFBRTtBQUMxQixRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN0QixRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN0QixPQUFPLE1BQU07QUFDYixRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3RCLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDdEIsT0FBTztBQUNQO0FBQ0EsTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRTtBQUM3QixRQUFRLElBQUksR0FBRyxDQUFDLENBQUM7QUFDakI7QUFDQSxRQUFRLElBQUksSUFBSSxLQUFLLENBQUMsQ0FBQyxPQUFPLEVBQUU7QUFDaEMsVUFBVSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDekIsVUFBVSxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUMzQixVQUFVLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ25CLFNBQVM7QUFDVCxRQUFRLE1BQU07QUFDZCxPQUFPO0FBQ1AsS0FBSztBQUNMO0FBQ0EsSUFBSSxJQUFJLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDcEMsR0FBRztBQUNIO0FBQ0EsRUFBRSxVQUFVLEVBQUUsWUFBWTtBQUMxQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLE9BQU87QUFDdEIsSUFBSSxDQUFDLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQ25CLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUNqQixJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBQ2hCLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ2YsR0FBRztBQUNIO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxFQUFFLE9BQU8sRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssR0FBRyxLQUFLLEtBQUs7QUFDN0M7QUFDQTtBQUNBLElBQU8sSUFBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztBQUN2QixNQUFNLENBQUMsQ0FBQztBQUNSLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNiLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNaLE1BQU0sRUFBRSxDQUFDO0FBQ1QsTUFBTSxDQUFDLENBQUMsQ0FDRTtBQUNWO0FBQ0EsSUFBSSxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDbkI7QUFDQSxJQUFJLE9BQU8sQ0FBQyxFQUFFLEVBQUU7QUFDaEIsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLE1BQU0sQ0FBQyxFQUFFLENBQUM7QUFDVjtBQUNBLE1BQU0sSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUMzQztBQUNBLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDbkI7QUFDQTtBQUNBLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQixNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3pCO0FBQ0EsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRTtBQUN4QixRQUFRLElBQUksRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDeEM7QUFDQSxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQy9CLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3RCO0FBQ0E7QUFDQSxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLFFBQVEsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDcEMsYUFBYSxJQUFJLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzdDO0FBQ0EsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdkI7QUFDQSxRQUFRLElBQUksRUFBRSxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUU7QUFDMUIsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7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RUFBRTtBQUMxQjtBQUNBLFFBQVEsT0FBTyxNQUFNLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7QUFDakg7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLEdBQUcsRUFBRSxVQUFVLENBQUMsRUFBRTtBQUN0QixRQUFRLEdBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDckMsUUFBUSxPQUFPLENBQUMsQ0FBQztBQUNqQixLQUFLO0FBQ0w7QUFDQSxJQUFJLFFBQVEsR0FBRyxVQUFVLENBQUMsRUFBRTtBQUM1QjtBQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3BELFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3BELFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3BELFFBQVEsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEQ7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMO0FBQ0EsSUFBSSxRQUFRLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRTtBQUNqQztBQUNBLFFBQVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDNUIsUUFBUSxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM1QixRQUFRLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdEQsUUFBUSxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxDQUFDO0FBQ2xDLFFBQVEsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDbEUsUUFBUSxPQUFPLENBQUMsQ0FBQztBQUNqQjtBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksUUFBUSxFQUFFLFdBQVcsQ0FBQyxHQUFHO0FBQzdCO0FBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEdBQUcsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUM7QUFDakosUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUUsUUFBUSxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUU7QUFDdkIsWUFBWSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQztBQUMzRCxZQUFZLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDO0FBQ2pFLFlBQVksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUM7QUFDakUsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ25CLFNBQVM7QUFDVCxRQUFRLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQzNCO0FBQ0EsS0FBSztBQUNMO0FBQ0EsSUFBSSxRQUFRLEVBQUUsV0FBVyxDQUFDLEdBQUc7QUFDN0I7QUFDQSxRQUFRLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FB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RSxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQy9GLFFBQVEsS0FBSyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNySDtBQUNBLFFBQVEsS0FBSyxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLEdBQUcsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDN0ksUUFBUSxLQUFLLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFHLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGNBQWMs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RSxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUMxSDtBQUNBO0FBQ0EsWUFBWSxJQUFJLEdBQUcsR0FBRyxDQUFDLGVBQWUsRUFBRSxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFDMUUsWUFBWSxJQUFJLEdBQUcsR0FBRyxDQUFDLGVBQWUsRUFBRSxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQUM7QUFDMUU7QUFDQSxZQUFZLEdBQUcsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzFGLFlBQVksQ0FBQyxDQUFDLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQzNIO0FBQ0EsWUFBWSxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUMxRixZQUFZLENBQUMsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUM1SDtBQUNBO0FBQ0E7QUFDQSxZQUFZLENBQUMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUN0RixZQUFZLENBQUMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNwRyxZQUFZLENBQUMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUM3RjtBQUNBLFlBQVksQ0FBQyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUM7QUFDL0I7QUFDQSxTQUFTLE1BQU07QUFDZjtBQUNBLFlBQVksR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsWUFBWSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLFlBQVksRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM1RixZQUFZLENBQUMsQ0FBQyxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUMxSDtBQUNBLFlBQVksQ0FBQyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsd0JBQXdCLEVBQUUsY0FBYyxDQUFDLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQ3JJLFlBQVksQ0FBQyxDQUFDLEdBQUcsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUMvRixZQUFZLENBQUMsQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLGtCQUFrQixFQUFFLGNBQWMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FB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QUNGO0FBQ0EsQ0FBQyxNQUFNLENBQUMsR0FBRztBQUNYO0FBQ0EsRUFBRSxTQUFTLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHO0FBQzFDO0FBQ0EsRUFBRTtBQUNGO0FBQ0EsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDWjtBQUNBLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2YsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZjtBQUNBLEVBQUUsT0FBTyxJQUFJLENBQUM7QUFDZDtBQUNBLEVBQUU7QUFDRjtBQUNBLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ2Q7QUFDQSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxFQUFFLEdBQUc7QUFDdEQ7QUFDQSxFQUFFO0FBQ0Y7QUFDQSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDckI7QUFDQSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHO0FBQ2xHO0FBQ0EsRUFBRTtBQUNGO0FBQ0EsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsS0FBSyxHQUFHO0FBQ25CO0FBQ0EsRUFBRSxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUU7QUFDbEIsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcs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RUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUNqRCxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNoQztBQUNBLElBQUksSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7QUFDOUIsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztBQUMxQjtBQUNBO0FBQ0EsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDcEQ7QUFDQSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDekQsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QztBQUNBLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN6RCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMxRCxTQUFTLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO0FBQzFCO0FBQ0E7QUFDQSxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDeEI7QUFDQSxJQUFJLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUM7QUFDcEMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztBQUN4QjtBQUNBO0FBQ0EsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDakQ7QUFDQSxJQUFJLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFVBQVUsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDO0FBQ3ZEO0FBQ0E7QUFDQSxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO0FBQzFCLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLEtBQUssQ0FBQztBQUNsQyxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUM7QUFDeEM7QUFDQTtBQUNBLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUM7QUFDdEI7QUFDQTtBQUNBLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7QUFDeEI7QUFDQTtBQUNBLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQztBQUNwQyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUNqQztBQUNBO0FBQ0EsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QjtBQUNBO0FBQ0EsSUFBSSxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssU0FBUyxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUMzQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxTQUFTLEVBQUUsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzNDLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO0FBQ2hEO0FBQ0E7QUFDQSxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxTQUFTLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDN0M7QUFDQTtBQUNBLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7QUFDM0IsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQztBQUN4QixJQUFJLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO0FBQzFCO0FBQ0EsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDO0FBQzVCLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDckMsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDO0FBQ25DO0FBQ0E7QUFDQSxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsS0FBSyxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDakUsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQztBQUM1QixJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLFlBQVksS0FBSyxTQUFTLEdBQUcsSUFBSSxHQUFHLENBQUMsQ0FBQyxZQUFZ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QUksQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFFO0FBQ3BELFFBQVEsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUU7QUFDOUI7QUFDQSxRQUFRLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFNO0FBQzVCO0FBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFO0FBQzlCLFlBQVksSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDOUQsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLGFBQWEsRUFBRSxFQUFFLENBQUMsT0FBTyxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsMkNBQTJDLEVBQUUsRUFBRSxDQUFDLElBQUksR0FBRTtBQUN2TSxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLHFDQUFxQyxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxHQUFFO0FBQ3BLLFNBQVMsTUFBTTtBQUNmLFlBQVksSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFDO0FBQ3RCLFlBQVksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FB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eEI7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUM7QUFDeEIsUUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUM7QUFDdEIsUUFBUSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTTtBQUM1QjtBQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyw4QkFBOEIsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLHdCQUF3QixFQUFFLEVBQUUsQ0FBQyxJQUFJLEdBQUU7QUFDbEk7QUFDQTtBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLEdBQUU7QUFDdEM7QUFDQSxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUU7QUFDdEQsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEdBQUU7QUFDekQsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFFO0FBQ3REO0FBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxHQUFFO0FBQzNFLFFBQVEsSUFBSSxDQUFD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Q0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNsRTtBQUNBLFlBQVksSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3JDLFlBQVksSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQy9DO0FBQ0EsU0FBUztBQUNUO0FBQ0EsUUFBUSxJQUFJLEtBQUssR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUNuQyxRQUFRLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDO0FBQ25DO0FBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLEtBQUssSUFBSSxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBQ2pFO0FBQ0EsUUFBUSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQzVDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3JDLFlBQVksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDO0FBQ3ZFLFlBQVksSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUNoQyxZQUFZLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUNsQyxZQUFZLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUMvQixTQUFTO0FBQ1Q7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUMsR0FBRztBQUNoQjtBQUNBLFFBQVEsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUN0QztBQUNBLFFBQVEsSUFBSSxJQUFJLEtBQUssVUFBVSxHQUFHO0FBQ2xDO0FBQ0EsWUFBWSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNyRDtBQUNBLFlBQVksS0FBSyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRztBQUNoQyxnQkFBZ0IsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBQ3hELGFBQWEsTUFBTSxLQUFLLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHO0FBQ3ZDLGdCQUFnQixDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDeEQsYUFBYTtBQUNiO0FBQ0EsWUFBWSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQy9CLFlBQVksSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDekIsWUFBWSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDO0FBQ2hDO0FBQ0EsWUFBWSxPQUFPLElBQUksQ0FBQztBQUN4QjtBQUNBLFNBQVM7QUFDVCxRQUFRLE9BQU8sS0FBSyxDQUFDO0FBQ3JCO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBLElBQUksUUFBUSxDQUFDLEdBQUc7QUFDaEI7QUFDQSxRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNuQixRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNuQixRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7QUFDbEQsUUFBUSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0MsUUFBUSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0MsUUFBUSxJQUFJLEdBQUcsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3RDLFFBQVEsT0FBTyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsS0FBSyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ2xHO0FBQ0EsS0FBSztBQUNMO0FBQ0EsSUFBSSxNQUFNLENBQUMsRUFBRSxFQUFFLEdBQUc7QUFDbEI7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDM0MsUUFBUSxJQUFJLENBQUMsT0FBTyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDOUQ7QUFDQSxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQzFEO0FBQ0EsUUFBUSxLQUFLLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHO0FBQzlCO0FBQ0EsWUFB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QVksR0FBRyxHQUFHLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUM1QyxZQUFZLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNyQyxZQUFZLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkU7QUFDQSxTQUFTLE1BQU07QUFDZjtBQUNBLFNBQVMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUNoQyxTQUFTLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDaEM7QUFDQSxTQUFTLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDOUMsU0FBUyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ25DO0FBQ0EsU0FBUyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNqQyxTQUFTLEdBQUcsR0FBRyxHQUFHLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDckM7QUFDQSxTQUFTLElBQUksSUFBSSxHQUFHLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUMvRCxTQUFTLElBQUksR0FBRyxJQUFJLElB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QUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFLO0FBQ2pFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFJO0FBQ2xDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUM7QUFDdEI7QUFDQSxFQUFFO0FBQ0Y7QUFDQSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsR0FBRztBQUNwQjtBQUNBLEVBQUUsS0FBSyxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUNsRCxVQUFVLEtBQUssSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUMvQztBQUNBLEVBQUU7QUFDRjtBQUNBLENBQUMsSUFBSSxDQUFDLEdBQUc7QUFDVDtBQUNBLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ2Y7QUFDQSxFQUFFLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNuQjtBQUNBLEVBQUUsSUFBSSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDO0FBQzlDO0FBQ0EsRUFBRSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDOUI7QUFDQSxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLFNBQVMsQ0FBQztBQUN0QztBQUNBLEtBQUssSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUM1QjtBQUNBLEVBQUU7QUFDRjtBQUNBLENBQUMsS0FBSyxDQUFDLEdBQUc7QUFDVjtBQUNBLEVBQUUsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQ2hCO0FBQ0EsRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7QUFDOUM7QUFDQSxFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUM5QjtBQUNBLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ25CO0FBQ0EsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsSUFBSSxRQUFRLENBQUM7QUFDdEM7QUFDQSxLQUFLLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM3QjtBQUNBLEVBQUU7QUFDRjtBQUNBLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxHQUFHO0FBQ2Y7QUFDQSxLQUFLLElBQUksRUFBRSxHQUFHLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUN4RTtBQUNBLEtBQUssSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0FBQ3hCO0FBQ0EsS0FBSyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDOUI7QUFDQSxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUNoRDtBQUNBLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsSUFBSSxD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QUFHLENBQUMsQ0FBQztBQUMzQixFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDNUIsRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbkMsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNwQyxFQUFFLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNuQyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BDLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3RDLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUM3QyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDN0M7QUFDQSxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNsQztBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUNwRTtBQUNBLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQzVDLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQzVDO0FBQ0EsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDN0UsS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxHQUFHLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUMxRSxLQUFLLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUNyRDtBQUNBLEVBQUU7QUFDRjtBQUNBLENBQUMsS0FBSyxDQUFDLEdBQUc7QUFDVjtBQUNBO0FBQ0EsS0FBSyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDbkI7QUFDQSxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDcEI7QUFDQSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDakMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBQ2hDO0FBQ0E7QUFDQTtBQUNBLEtBQUssSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUM3QztBQUNBO0FBQ0E7QUFDQSxLQUFLLElBQUksQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDO0FBQ2hDO0FBQ0EsS0FBSyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0FBQzVEO0FBQ0E7QUFDQSxFQUFFO0FBQ0Y7QUFDQSxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsR0FBRztBQUNsQjtBQUNBO0FBQ0EsRUFBRSxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU87QUFDaEM7QUFDQTtBQUNBO0FBQ0EsRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQztBQUNqQjtBQUNBO0FBQ0E7QUFDQSxFQUFFLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDakI7QUFDQTtBQUNBLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBQztBQUMzRCxLQUFLLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsR0FBRTtBQUM5QztBQUNBLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssR0FBRTtBQUM5RSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFJO0FBQ25DLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUk7QUFDcEM7QUFDQSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsS0FBSTtBQUNuQztBQUNBLEtBQUssSUFBSSxDQUFDLEtBQUssR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQUs7QUFDbEMsS0FBSyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBQztBQUM1QyxLQUFLLElBQUksQ0FBQyxTQUFTLEdBQUU7QUFDckI7QUFDQSxFQUFFO0FBQ0Y7QUFDQTtBQUNBOztBQ3BhTyxNQUFNLEdBQUcsU0FBUyxLQUFLLENBQUM7QUFDL0I7QUFDQSxJQUFJLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHO0FBQzFCO0FBQ0EsUUFBUSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDbkI7QUFDQSxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUNoQztBQUNBO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUM1QixRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxFQUFFLENB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QUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLHdEQUF3RCxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFDO0FBQzdLO0FBQ0E7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxvQ0FBb0MsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLGtEQUFrRCxFQUFFLENBQUM7QUFDMUo7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsMkVBQTJFLENBQUMsQ0FBQztBQUN0SjtBQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7QUFDNUI7QUFDQTtBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCO0FBQ0E7QUFDQSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7QUFDOUI7QUFDQTtBQUNBO0FBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxJ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QUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQztBQUNoQztBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksU0FBUyxDQUFDLEdBQUc7QUFDakI7QUFDQSxRQUFRLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3JEO0FBQ0EsUUFBUSxPQUFPLENBQUMsRUFBRSxFQUFFO0FBQ3BCLFlBQVksSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkUsa0JBQWtCLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RCxZQUFZLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDbkMsWUFBWSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7QUFDMUMsWUFBWSxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzFFLFlBQVksR0FBRyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEMsWUFBWSxDQUFDLEVBQUUsQ0FBQztBQUNoQjtBQUNBLFNBQVM7QUFDVDtBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksSUFBSSxDQUFDLEdBQUc7QUFDWjtBQUNBLFFBQVEsS0FBSyxDQUFDLElBQUksR0FBRTtBQUNwQjtBQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDekM7QUFDQSxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUNwRDtBQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLElBQUksRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0FBQ2xFLGFBQWEsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUMxRDtBQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7QUFDeEMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7QUFDcEMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7QUFDcEMsUUFBUSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQztBQUMzQjtBQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDLFNBQVMsRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUNuRDtBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksS0FBSyxDQUFDLEdBQUc7QUFDYjtBQUNBLFFBQVEsS0FBSyxDQUFDLEtBQUssR0FBRTtBQUNyQjtBQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQzVCO0FBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7QUFDcEQ7QUFDQSxRQUFRLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0FBQ25FLGFBQWEsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0FBQzNEO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQztBQUN4QyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztBQUNuQyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztBQUNuQyxRQUFRLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO0FBQzVCO0FBQ0EsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFDO0FBQ3REO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7QUFDakM7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLEtBQUssQ0FBQyxHQUFHO0FBQ2I7QUFDQSxRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3BDO0FBQ0EsS0FBSztBQUNMO0FBQ0EsSUFBSSxHQUFHLENBQUMsR0FBRztBQUNYO0FBQ0EsUUFBUSxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDOUIsUUFBUSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDO0FBQ3hDO0FBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUM7QUFDdkI7QUFDQSxRQUFRLEtBQUssSUFBSSxHQUFHLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxHQUFHO0FBQzNDO0FBQ0EsWUFBWSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksT0FBTyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7QUFDdkY7QUFDQSxZQUFZLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO0FBQ2pDLFlBQVksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDNUI7QUFDQSxZQUFZLEtBQUssSUFBSSxDQUFDLEtBQUssR0FBRztBQUM5QjtBQUNBLGdCQUFnQixJQUFJLFFBQVEsR0FBRyxXQUFXLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQztBQUNqRSxnQkFBZ0IsSUFBSSxhQUFhLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUM7QUFDdkU7QUFDQSxnQkFBZ0IsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsR0FBRyxXQUFXLEVBQUUsQ0FBQztBQUNoRSxnQkFBZ0IsSUFBSSxDQUFDLEVBQUUsR0FBRyxRQUFRLEdBQUcsYUFBYSxDQUFDO0FBQ25EO0FBQ0EsYUFBYTtBQUNiO0FBQ0EsU0FBUztBQUNUO0FBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUN0RDtBQUNBLFFBQVEsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3pCLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztBQUN2RDtBQUNBLFFBQVEsT0FBTyxJQUFJLENBQUM7QUFDcEI7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLFNBQVMsQ0FBQyxHQUFHO0FBQ2pCO0FBQ0EsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUN2RDtBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksS0FBSyxDQUFDLEdBQUc7QUFDYjtBQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN2QixRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdkI7QUFDQSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEtBQUk7QUFDcEQ7QUFDQSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUM5QixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUM5QixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUM5QixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQztBQUNuQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQztBQUNuQztBQUNBLEtBQUs7QUFDTDtBQUNBOztBQzNVTyxNQUFNLEtBQUssU0FBUyxLQUFLLENBQUM7QUFDakM7QUFDQSxJQUFJLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHO0FBQzFCO0FBQ0EsUUFBUSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDbkI7QUFDQSxLQUFLLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssS0FBSyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUQsUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0FBQ3JDO0FBQ0EsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxTQUFTLEtBQUssU0FBUyxHQUFHLENBQUMsQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO0FBQ3JFLFFBQVEsSUFBSSxDQUFDLGFBQWEsR0FBRyxDQUFDLENBQUMsYUFBYSxJQUFJLENBQUMsQ0FBQztBQUNsRCxRQUFRLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUM7QUFDbEM7QUFDQSxRQUFRLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxTQUFTLElBQUksQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7QUFDMUQ7QUFDQTtBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxTQUFTLEtBQUssU0FBUyxHQUFHLENBQUMsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO0FBQ3hFLFFBQVEsSUFBSSxDQUFDLFFBQVEsR0FBRyxLQUFLLENBQUM7QUFDOUI7QUFDQSxRQUFRLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO0FBQzVCO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxHQUFHLEVBQUUsQ0FBQztBQUNqQyxRQUFRLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDOUIsUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztBQUNyQjtBQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO0FBQzdDO0FBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxHQUFHO0FBQ3RDO0FBQ0EsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7QUFDakQ7QUFDQSxZQUFZLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO0FBQy9CLGdCQUFnQixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO0FBQy9DLGdCQUFnQixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsU0FBUTtBQUN6RCxhQUFhO0FBQ2I7QUFDQTtBQUNBO0FBQ0E7QUFDQSxZQUFZLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQzFCLFlBQVksSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDekI7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxRQUFRLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDL0IsUUFBUSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzlCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLHlEQUF5RCxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUM1TDtBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDakQ7QUFDQSxRQUFRLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLG1CQUFtQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7QUFDdEosUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO0FBQ2xGO0FBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDL0gsUUFBUSxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsaUJBQWlCLEVBQUUsY0FBYyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDaEo7QUFDQSxRQUFRLElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3hELFFBQVEsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ25CLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7QUFDeEI7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3BCO0FBQ0EsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMzQztBQUNBLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUN0RCxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLFNBQVMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDM0I7QUFDQSxZQUFZLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3RGLGNBQWMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUM7QUFDN0Q7QUFDQSxTQUFTLElBQUksQ0FBQyxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUM5SDtBQUNBLFNBQVM7QUFDVDtBQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUM7QUFDckIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQztBQUN4QjtBQUNBO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNwQjtBQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsRUFBRTtBQUNyQyxZQUFZ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RztBQUNsQjtBQUNBLEtBQUssSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3RCO0FBQ0EsUUFBUSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDN0I7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLFFBQVEsQ0FBQyxHQUFHO0FBQ2hCO0FBQ0EsS0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxHQUFFO0FBQ3JDO0FBQ0E7QUFDQSxLQUFLLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQ3JDO0FBQ0EsTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFDO0FBQzVDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUNwQztBQUNBLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUc7QUFDMUIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFFO0FBQ3RCO0FBQ0EsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxLQUFLLEdBQUcsRUFBRSxFQUFFLEdBQUcsRUFBRSxFQUFDO0FBQ3pELFdBQVcsQ0FBQyxJQUFJLEtBQUssR0FBRyxFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsR0FBRyxHQUFHLEdBQUcsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsR0FBRyxHQUFHLEVBQUUsRUFBRSxHQUFHLEVB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QUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRTtBQUMvQixTQUFTO0FBQ1Q7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLEtBQUssQ0FBQyxHQUFHO0FBQ2I7QUFDQSxRQUFRLEtBQUssQ0FBQyxLQUFLLEdBQUU7QUFDckI7QUFDQSxRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFDO0FBQ3RCO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQUs7QUFDcEM7QUFDQSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEtBQUk7QUFDcEQ7QUFDQSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFJO0FBQ2xDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUk7QUFDbEMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFJO0FBQ3ZDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSTtBQUN2QztBQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLEdBQUU7QUFDN0M7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVjTyxNQUFNLFFBQVEsU0FBUyxLQUFLLENBQUM7QUFDcEM7QUFDQSxJQUFJLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHO0FBQzFCO0FBQ0EsUUFBUSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDbkI7QUFDQSxRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0FBQy9CO0FBQ0EsUUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCO0FBQ0EsUUFBUSxJQUFJLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFDO0FBQzNCLFFBQVEsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFDO0FBQ3BDO0FBQ0EsUUFBUSxJQUFJLENBQUMsT0FBTyxHQUFHLFlBQVksQ0FBQztBQUNwQyxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLElBQUksS0FBSyxTQUFTLEdBQUcsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7QUFDdkQ7QUFDQSxRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUM7QUFDMUMsUUFBUSxJQUFJLENBQUMsYUFBYSxHQUFHLENBQUMsQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFDO0FBQ2xEO0FBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksRUFBRSxFQUFFLENBQUM7QUFDNUIsUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksRUFBRSxFQUFFLENBQUM7QUFDNUI7QUFDQSxRQUFRLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO0FBQzdCLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLFFBQU87QUFDekMsUUFBUSxJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssU0FBUyxHQUFHLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSTtBQUM1RDtBQUNBO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUM7QUFDN0M7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzFEO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7QUFDN0M7QUFDQSxRQUFRLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxTQUFTLEdBQUc7QUFDdEM7QUFDQSxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUM7QUFDM0MsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLEdBQUcsUUFBUSxDQUFDO0FBQ3RELFlBQVksSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDMUIsWUFBWSxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUN6QjtBQUNBLFNBQVM7QUFDVDtBQUNBLFFBQVEsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU07QUFDNUI7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsOEJBQThCLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyx3QkFBd0IsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDbkksUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxJQUFJ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RztBQUNiO0FBQ0EsUUFBUSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7QUFDM0IsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JCO0FBQ0EsS0FBSztBQUNMO0FBQ0EsSUFBSSxPQUFPLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDbEI7QUFDQSxRQUFRLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztBQUMzQixRQUFRLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFDO0FBQzVCO0FBQ0EsS0FBSztBQUNMO0FBQ0EsSUFBSSxTQUFTLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDcEI7QUFDQSxRQUFRLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0FBQzNCLFFBQVEsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUM1QixRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDdkI7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBRztBQUNwQjtBQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQjtBQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTztBQUNsQztBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDaEUsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQy9FO0FBQ0EsUUFBUSxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBQ3pDO0FBQ0EsUUFBUSxLQUFLLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxHQUFHO0FBQ3hDLFlBQVksSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNELFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0FBQzNELFlBQVksSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0FBQzNELFNBQVM7QUFDVDtBQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDekU7QUFDQSxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztBQUN0QjtBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksUUFBUSxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ25CO0FBQ0EsUUFBUSxHQUFHLENBQUMsR0FBRyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xDO0FBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztBQUM5QyxRQUFRLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUN6QjtBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksTUFBTSxDQUFDLEVBQUUsRUFBRSxHQUFHO0FBQ2xCO0FBQ0EsUUFBUSxJQUFJLEVBQUUsS0FBSyxTQUFTLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUN6QztBQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLElBQUksRUFBRTtBQUNwQztBQUNBLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7QUFDOUI7QUFDQSxnQkFBZ0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQzNDO0FBQ0EsZ0JBQWdCLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzVFLGdCQUFnQixJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUM1RTtBQUNBLGdCQUFnQixJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUN2RTtBQUNBLGFBQWE7QUFDYjtBQUNBLFNBQVM7QUFDVDtBQUNBLFFBQVEsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3pCO0FBQ0EsUUFBUSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDN0I7QUFDQTtBQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztBQUNwRDtBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksU0FBUyxDQUFDLEdBQUc7QUFDakI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7QUFDbEUsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ2xFO0FBQ0EsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDO0FBQzVCO0FBQ0EsWUFBWSxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDOUMsWUFBWSxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDL0M7QUFDQSxZQUFZLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDN0QsWUFBWSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQzdELFNBQVMsTUFBTTtBQUNmLFlBQVksSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxD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RUFBRSxDQUFDO0FBQ25DLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRTtBQUN0RCxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUU7QUFDdEQsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFFO0FBQ3RELFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxHQUFFO0FBQ3pEO0FBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsU0FBUyxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFFO0FBQ2pGLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFDO0FBQzVGO0FBQ0EsUUFBUSxLQUFLLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxHQUFHO0FBQzlCO0FBQ0EsWUFBWSxLQUFLLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxFQUFFLE1B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QUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUMxRTtBQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDOUM7QUFDQSxRQUFRLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3RHO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdkQsUUFBUSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3pEO0FBQ0EsUUFBUSxJQUFJLEtBQUssR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztBQUN0QyxRQUFRLElBQUksS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQztBQUNoRDtBQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxLQUFLLElBQUksQ0FBQyxHQUFHLEtBQUssSUFBSSxDQUFDLEdBQUcs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Q0EsUUFBUSxNQUFNLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxFQUFFLEVBQUUsQ0FBQyxHQUFHO0FBQzNDO0FBQ0EsWUFBWSxDQUFDLEdBQUcsVUFBVSxLQUFLLElBQUksR0FBRyxDQUFDLEVBQUUsQ0FBQztBQUMxQyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7QUFDL0MsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEtBQUssQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO0FBQy9DLFlBQVksRUFBRSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQztBQUNoRCxZQUFZLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7QUFDaEQsWUFBWSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUksR0FBRyxFQUFFLEdBQUcsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLENBQUM7QUFDOUQ7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxRQUFRLE9BQU8sQ0FBQyxDQUFDO0FBQ2pCO0FBQ0EsS0FBSztBQUNMO0FBQ0EsSUFBSSxNQUFNLENBQUMsRUFBRSxFQUFFLEdBQUc7QUFDbEI7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDM0MsUUFBUSxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDNUQ7QUFDQSxRQUFRLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUNwQyxRQUFRLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDO0FBQ3JFO0FBQ0EsUUFBUSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxDQUFDO0FBQ2pDLFFBQVEsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsQ0FBQztBQUNqQztBQUNBLFFBQVEsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFLEdBQUcsR0FBRyxLQUFLLEVBQUUsQ0FBQztBQUNuQyxRQUFRLElBQUksRUFBRSxHQUFHLEdBQUcsRUFBRSxHQUFHLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNwQyxRQUFRLElBQUksRUFBRSxHQUFHLEVBQUUsRUFBRSxHQUFHLEdBQUcsS0FBSyxFQUFFLENBQUM7QUFDbkMsUUFBUSxJQUFJLEVBQUUsR0FBRyxHQUFHLEVBQUUsR0FBRyxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDcEM7QUFDQSxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxHQUFHLEVBQUUsRUFBRSxHQUFHLEdBQUcsRUFBRSxHQUFHLEtBQUssR0FBRyxFQUFFLEVBQUUsR0FBRyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUNyRjtBQUNBLFFBQVEsS0FBSyxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsR0FBRztBQUM5QjtBQUNBLFlBQVksSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQzlDLFlBQVksSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDO0FBQzlDLFlBQVksSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLENBQUM7QUFDbkMsWUFBWSxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQ3BDLFlBQVksSUFBSSxHQUFHLEdBQUcsRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZELFlBQVksSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxFQUFFLEdBQUcsS0FBSyxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLEtBQUssR0FBRyxHQUFHLEdBQUcsS0FBSyxHQUFHLEVBQUUsR0FBRyxHQUFHLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQ2pJO0FBQ0EsWUFBWSxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7QUFDbkssWUFBWSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUN6RDtBQUNBLFNBQVM7QUFDVDtBQUNBLFFBQVEsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksRUFB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SSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU07QUFDL0Q7QUFDQSxRQUFRLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLEdBQUcsQ0FBQyxDQUFDO0FBQzNDLFFBQVEsSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztBQUMvRDtBQUNBLFFBQVEsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hFO0FBQ0E7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDakQsUUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUMvQyxRQUFRLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQzlDLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDOUM7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztBQUN2RCxRQUFRLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztBQUMvRCxRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQztBQUNwRDtBQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUU7QUFDdkMsWUFBWSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUN4QyxZQUFZLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDO0FBQy9CLFNBQVM7QUFDVDtBQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHO0FBQzlCO0FBQ0EsWUFBWSxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFDO0FBQzdELFlBQVksSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUM7QUFDcEQsWUFBWSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBQztBQUNyRCxZQUFZLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFDO0FBQ3pELFlBQVksSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVE7QUFDakQsWUFBWSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUM1RTtBQUNBLFNBQVM7QUFDVDtBQUNBLFFBQVEsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0FBQ3BCLFFBQVEsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDMUM7QUFDQSxZQUFZLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdCLFlBQVksSUFBSSxHQUFH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O0FBQ0EsU0FBUztBQUNUO0FBQ0EsUUFBUSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7QUFDMUIsUUFBUSxJQUFJLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRTtBQUMvQztBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3JDO0FBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFFLFFBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBQztBQUM1RixRQUFRLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxHQUFFO0FBQzVEO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksU0FBUyxDQUFDLEVBQUU7QUFDaEIsUUFBUSxJQUFJLEdBQUcsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztBQUNuQyxRQUFRLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7QUFDbEMsWUFBWSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUks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QUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztBQUM1QjtBQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQ3BDO0FBQ0EsUUFBUSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzdCO0FBQ0EsUUFBUSxHQUFHLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDMUM7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLEtBQUssQ0FBQyxHQUFHO0FBQ2I7QUFDQSxRQUFRLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztBQUN0QjtBQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM5RDtBQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQ3BDO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDNUIsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUN6QyxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQztBQUNuQyxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUNwRDtBQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUM3QjtBQUNBLFFBQVEsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ2hDO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxHQUFHO0FBQ2pCO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxHQUFHLENBQUM7QUFDcEM7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLFlBQVksQ0FBQyxHQUFHO0FBQ3BCO0FBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO0FBQzVCLFFBQVEsTUFBTSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBQ3hFO0FBQ0EsS0FBSztBQUNMO0FBQ0EsSUFBSSxLQUFLLENBQUMsR0FBRztBQUNiO0FBQ0EsUUFBUSxLQUFLLENBQUMsS0FBSyxHQUFFO0FBQ3JCO0FBQ0E7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN2QixRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDeEIsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO0FBQ3hCO0FBQ0EsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxTQUFTLEVBQUUsT0FBTztBQUNyQztBQUNBLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQzlCLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxDQUFDO0FBQzVCO0FBQ0EsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENB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S0FBSyxDQUFDLEVBQUU7QUFDNUIsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ2YsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ2YsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ2YsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ2YsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxHQUFHLENBQUM7QUFDaEMsT0FBTztBQUNQO0FBQ0EsTUFBTSxJQUFJLElBQUksQ0FBQyxLQUFLLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUM7QUFDN0Q7QUFDQSxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBQy9DLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDekMsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUNyRCxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksR0FBRyxFQUFFLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQztBQUNyRCxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO0FBQ3pDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLEVB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QUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUM1RTtBQUNBO0FBQ0EsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztBQUMxRDtBQUNBO0FBQ0EsTUFBTSxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDdEQ7QUFDQSxNQUFNLElBQUksSUFBSSxHQUFHLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUM7QUFDaEQsTUFBTSxJQUFJLFVBQVUsR0FBRyxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBQzNEO0FBQ0EsTUFBTSxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbkQ7QUFDQSxNQUFNLElBQUksS0FBSyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBQ2xDO0FBQ0EsTUFBTSxJQUFJLEtBQUssQ0FBQztBQUNoQixNQUFNLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUU7QUFDcEQsUUFBUSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzlDLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNqRTtBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxD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SSxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUM7QUFDeEQsUUFBUSxNQUFNO0FBQ2QsTUFBTSxLQUFLLENBQUM7QUFDWjtBQUNBLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDO0FBQ2pDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDO0FBQ2xDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDO0FBQ3RDLFFBQVEsSUFBSSxJQUFJLENBQUMsS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUM7QUFDNUQsUUFBUSxNQUFNO0FBQ2QsS0FBSztBQUNMLEdBQUc7QUFDSDtBQUNBLEVBQUUsTUFBTSxDQUFDLEVBQUUsRUFBRTtBQUNiLElBQUksSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ2hGO0FBQ0E7QUFDQSxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUN0RCxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLEdBQUcsSUFBSSxD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LEdBQUcsQ0FBQyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN0RDtBQUNBLFFBQVEsT0FBTyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDM0Q7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLE1BQU0sQ0FBQyxJQUFJO0FBQ2Y7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDM0M7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0EsSUFBSSxLQUFLLENBQUMsR0FBRztBQUNiO0FBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7QUFDdEI7QUFDQSxLQUFLO0FBQ0w7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQzFCO0FBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLFFBQVEsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDNUIsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUMzQixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLElBQUksQ0FBQztBQUNyQztBQUNBLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDO0FBQ3ZDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDO0FBQ2hDLFFBQVEsSUFB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QyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDN0MsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDO0FBQ3JDLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUM7QUFDM0M7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdkI7QUFDQSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxNQUFNLENBQUM7QUFDaEQ7QUFDQSxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLFVBQVUsSUFBSSxNQUFNLENBQUM7QUFDakQ7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDaEgsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUM7QUFDdkM7QUFDQSxRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNwQjtBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksSUFBSSxFQUFFLEdBQUcsR0FBRztBQUNoQjtBQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEdBQUcsR0FBRyxDQUFDO0FBQ3BDO0FB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Q0EsSUFBSSxLQUFLLENBQUMsR0FBRztBQUNiO0FBQ0EsUUFBUSxLQUFLLENBQUMsS0FBSyxHQUFFO0FBQ3JCO0FBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBQztBQUN0QixRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxLQUFJO0FBQ2xDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxJQUFJLEtBQUk7QUFDekMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLElBQUksS0FBSTtBQUMxQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxLQUFJO0FBQ3RDO0FBQ0EsS0FBSztBQUNMO0FBQ0E7O0FDdEtPLE1BQU0sTUFBTSxTQUFTLEtBQUssQ0FBQztBQUNsQztBQUNBLElBQUksV0FBVyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUc7QUFDMUI7QUFDQSxRQUFRLEtBQUssRUFBRSxDQUFDLEdBQUU7QUFDbEI7QUFDQSxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxHQUFFO0FBQ2xDLFFBQVEsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQztBQUM1QyxRQUFRLElBQUksQ0FBQyxHQUFHLEdBQUcsS0FBSTtBQUN2QjtBQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFLO0FBQzNCLFFBQVEsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFJO0FBQzdCO0FBQ0E7QUFDQTtBQUNBLFFBQVEsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLE9BQU07QUFDOUI7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMs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QjtBQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsVUFBVSxLQUFLLFNBQVMsR0FBRyxDQUFDLENBQUMsVUFBVSxHQUFHLEtBQUk7QUFDNUQsUUFBUSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDbkI7QUFDQSxLQUFLO0FBQ0w7QUFDQTs7QUNWTyxNQUFNLElBQUksU0FBUyxLQUFLLENBQUM7QUFDaEM7QUFDQSxJQUFJLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHO0FBQzFCO0FBQ0EsUUFBUSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDbkI7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO0FBQ3JCLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBQzlCLFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7QUFDeEI7QUFDQSxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLEtBQUssSUFBSSxNQUFNLENBQUM7QUFDdkMsUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDOUI7QUFDQSxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7QUFDN0M7QUFDQSxRQUFRLElBQUksS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0M7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsNERBQTRELENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUN4TDtBQUNBLFFBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztBQUN6QztBQUNBLFFBQVEsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3BCO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFJLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBRztBQUNwQjtBQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUMvQjtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLFNBQVMsQ0FBQyxFQUFFLENBQUMsR0FBRztBQUNwQjtBQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDOUM7QUFDQSxRQUFRLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDOUI7QUFDQSxRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNwQjtBQUNBLFFBQVEsT0FBTyxJQUFJLENBQUM7QUFDcEI7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLEtBQUssQ0FBQyxHQUFHO0FBQ2I7QUFDQSxRQUFRLElBQUksSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLGFBQWEsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQjtBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksTUFBTSxDQUFDLEdBQUc7QUFDZDtBQUNBLFFBQVEsSUFBSSxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekMsYUFBYSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFCO0FBQ0EsS0FBSztBQUNMO0FBQ0EsSUFBSSxNQUFNLENBQUMsR0FBRztBQUNkO0FBQ0EsS0FBSztBQUNMO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDZjtBQUNBLFFBQVEsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDO0FBQzNCO0FBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO0FBQy9CO0FBQ0EsWUFBWSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQztBQUM1QixZQUFZLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFNO0FBQzVDO0FBQ0EsWUFBWSxRQUFRLENBQUM7QUFDckI7QUFDQSxnQkFBZ0IsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLE1BQU0sQ0FBQyxDQUFDLE1BQU07QUFDL0YsZ0JBQWdCLEtBQUssQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTTtBQUNwRyxnQkFBZ0IsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxN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Q0FBQyxDQUFDLENBQUM7QUFDbkIsUUFBUSxJQUFJLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN0QixRQUFRLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0IsUUFBUSxPQUFPLENBQUMsRUFBRSxFQUFFO0FBQ3BCLFNBQVMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3RELFNBQVM7QUFDVDtBQUNBLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsUUFBUSxPQUFPLENBQUMsRUFBRSxFQUFFO0FBQ3BCLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDO0FBQzVELFNBQVM7QUFDVDtBQUNBLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQy9CLFlBQVksRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUIsWUFBWSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDdEMsU0FBUztBQUNUO0FBQ0EsUUFBUSxPQUFPLEVBQUUsQ0FBQztBQUNsQjtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSSxPQUFPLENBQUMsRUFBRSxDQUFDLEdBQUc7QUFDbEI7QUFDQSxRQUFRLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sS0FBSztBQUN2QztBQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFLO0FBQzNCLFFBQVEsSUFBSSxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFO0FBQzdCLFlBQVksSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUM7QUFDOUMsWUFBWSxJQUFJLENBQUMsSUFBSSxHQUFFO0FBQ3ZCLFNBQVM7QUFDVDtBQUNBLFFBQVEsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRTtBQUNsQztBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ3BCO0FBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxLQUFLO0FBQ3RDLFFBQVEsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFJO0FBQzFCLFFBQVEsT0FBTyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsRUFBRTtBQUNsQztBQUNBLEtBQUs7QUFDTDtBQUNBLElBQUksU0FBUyxDQUFDLEVBQUUsQ0FBQyxHQUFHO0FBQ3BCO0FBQ0EsUUFBUSxJQUFJLEVBQUUsR0FBRyxLQUFLLENBQUM7QUFDdkIsUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxHQUFFO0FBQ3JDO0FBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUU7QUFDN0IsWUFBWSxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBQztBQUNsQyxZQUFZLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxJQUFJLENBQUMsR0FBRyxHQUFFO0FBQzVELFNBQVMsTUFBTTtBQUNmLFNBQVMsRUFBRSxHQUFHLElBQUksQ0FBQyxL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QyxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQy9DO0FBQ0EsWUFBWSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDckIsZ0JBQWdCLEdBQUcsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDOUQsZ0JBQWdCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQztBQUM3RCxhQUFhLE1BQU07QUFDbkIsZ0JBQWdCLEdBQUcsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDOUQsZ0JBQWdCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztBQUM3RCxhQUFhO0FBQ2I7QUFDQSxTQUFTO0FBQ1Q7QUFDQSxRQUFRLEdBQUcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdCO0FBQ0EsUUFBUSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMvQztBQUNBLFlBQVksSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxHQUFHLEVBQUUsR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDO0FBQzNELFlBQVksR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRDtBQUNBLFNBQVM7QUFDVDtBQUNBLEtBQUs7QUFDTDtBQUNBOztBQzFUTyxNQUFNLEtBQUssU0FBUyxLQUFLLENBQUM7QUFDakM7QUFDQSxJQUFJLFdBQVcsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHO0FBQzFCO0FBQ0EsUUFBUSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDbkI7QUFDQSxRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO0FBQy9CLFFBQVEsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsRUFBQztBQUMzQixRQUFRLElBQUksQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsRUFBQztBQUNwQztBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQixRQUFRLElBQUksQ0FBQyxNQUFNLEdBQUcsR0FBRTtBQUN4QjtBQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxJQUFJLENBQUMsQ0FBQztBQUNsQyxRQUFRLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSyxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ3ZEO0FBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssU0FBUyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDcEQsUUFBUSxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssU0FBUyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ25EO0FBQ0EsUUFBUSxJQUFJLENBQUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQztBQUMvQztBQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUM7QUFDdkI7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxRQUFPO0FBQ3pDO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDLFNBQVMsS0FBSyxTQUFTLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDckU7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUM5RjtBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDcEM7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztBQUM5QztBQUNBO0FBQ0EsUUFBUSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssU0FBUyxHQUFHO0FBQ3RDO0FBQ0EsWUFBWSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDO0FBQzNDLFlBQVksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQztBQUN0RCxZQUFZLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDO0FBQzFCLFlBQVksSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDekI7QUFDQSxTQUFTO0FBQ1Q7QUFDQTtBQUNBO0FBQ0EsUUFBUSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTTtBQUM1QjtBQUNBO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLEdBQUcsOEJBQThCLElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyx3QkFBd0IsR0FBRyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDM0ksUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQzNDO0FBQ0E7QUFDQTtBQUNBLFFBQVEsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsR0FBRTtBQUNqQztBQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFFO0FBQzlDLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFFO0FBQ2hELFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFFO0FBQ2hELFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFFO0FBQ2hELFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxH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UUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFDO0FBQ2xCO0FBQ0EsUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUU7QUFDdkQsUUFBUSxDQUFDLEdBQUcsS0FBSyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLEdBQUU7QUFDdkQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDO0FBQ2pDO0FBQ0EsUUFBUSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDO0FBQzVCO0FBQ0EsS0FBSztBQUNMO0FBQ0EsSUFBSSxJQUFJLENBQUMsRUFBRSxJQUFJLEdBQUc7QUFDbEI7QUFDQSxRQUFRLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxJQUFJLEdBQUcsT0FBTyxLQUFLLENBQUM7QUFDL0M7QUFDQSxRQUFRLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFNO0FBQzVCO0FBQ0EsUUFBUSxRQUFRLElBQUk7QUFDcEIsWUFBWSxLQUFLLENBQUM7QUFDbEI7QUFDQSxnQkFBZ0IsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQztBQUMxQyxnQkFBZ0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBQztBQUMzRCxnQkFBZ0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBQztBQUM3RCxnQkFBZ0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBQztBQUM3RCxnQkFBZ0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBQztBQUM3RCxnQkFBZ0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRTtBQUM5RDtBQUNBLFlBQVksTUFBTTtBQUNsQixZQUFZLEtBQUssQ0FBQztBQUNsQjtBQUNBLGdCQUFnQixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDO0FBQ2hELGdCQUFnQixJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFDO0FBQzlELGdCQUFnQixJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFDO0FBQzlELGdCQUFnQixJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFDO0FBQ2hFLGdCQUFnQixJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxFQUFDO0FBQ2hFLGdCQUFnQixJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxHQUFFO0FBQ3BFO0FBQ0EsWUFBWSxNQUFNO0FBQ2xCLFNBQVM7QUFDVDtBQUNBLFFBQVEsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUM7QUFDMUIsUUFBUSxPQUFPLElBQUksQ0FBQztBQUNwQjtBQUNBO0FBQ0E7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLE1BQU0sQ0FBQyxFQUFFLEVBQUUsR0FBRztBQUNsQjtBQUNBO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDM0M7QUFDQSxRQUFRLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUN6QjtBQUNBLFFBQVEsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0FBQzdCO0FBQ0EsS0FBSztBQUNMO0FBQ0EsSUFBSSxTQUFTLEdBQUc7QUFDaEI7QUFDQSxRQUFRLEtBQUssSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLEdBQUc7QUFDL0I7QUFDQSxZQUFZLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDMUQsWUFBWSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQzFEO0FBQ0EsWUFBWSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQzFELFlBQVksSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUMxRDtBQUNBLFNBQVM7QUFDVDtBQUNBLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUN0RCxRQUFRLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7QUFDdEQ7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsR0FBRztBQUNqQjtBQUNBO0FBQ0E7QUFDQSxRQUFRLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzVDO0FBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU07QUFDN0I7QUFDQSxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ3hFLFFBQVEsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7QUFDeEU7QUFDQSxLQUFLO0FBQ0w7QUFDQSxJQUFJLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsS0FBSyxHQUFHO0FBQy9CO0FBQ0EsUUFBUSxJQUFJLENBQUMsS0FBSyxTQUFTLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDN0M7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztBQUN2RyxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ3ZHO0FBQ0EsUUFBUSxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUU7QUFDcEg7QUFDQTtBQUNBO0FB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TUFBTTtBQUNsRCxZQUFZLEtBQUssS0FBSyxFQUFFLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDOUMsWUFBWSxLQUFLLE9BQU8sRUFBRSxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ2xELFlBQVksS0FBSyxPQUFPLEVBQUUsQ0FBQyxHQUFHLElBQUksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNsRCxZQUFZLEtBQUssVUFBVSxFQUFFLENBQUMsR0FBRyxJQUFJLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDeEQsWUFBWSxLQUFLLE1BQU0sRUFBRSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ2hELFlBQVksS0FBSyxNQUFNLEVBQUUsQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNoRCxZQUFZLEtBQUssU0FBUyxDQUFDLENBQUMsS0FBSyxRQUFRLEVBQUUsQ0FBQyxHQUFHLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNyRSxZQUFZLEtBQUssT0FBTyxFQUFFLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDbEQsWUFBWSxLQUFLLFdBQVcsQ0FBQyxDQUFDLEtBQUssUUFBUSxFQUFFLENBQUMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDekUsWUFBWSxLQUFLLE9BQU8sQ0FBQyxDQUFDLEtBQUssTUFBTSxFQUFFLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDL0QsWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFN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Q0EsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDO0FBQ3hDLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQztBQUM1QztBQUNBLElBQUksSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLENBQUMsUUFBUSxLQUFLLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztBQUNwRTtBQUNBLElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFDakI7QUFDQTtBQUNBLElBQUksSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO0FBQzNCLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLFNBQVMsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdDO0FBQ0EsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ3REO0FBQ0E7QUFDQSxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxFQUFFLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNoQyxJQUFJLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUNyRDtBQUNBO0FBQ0EsSUFBSSxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksRUFBRSxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDaEM7QUFDQSxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2Y7QUFDQSxJQUFJLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQ2hCO0FBQ0EsSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO0FBQ2pDLElBQUksSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUNoRDtBQUNBO0FBQ0EsSUFBSSxJQUFJLENBQUMsV0FBVyxHQUFHLENBQUMsQ0FBQyxLQUFLLEtBQUssU0FBUyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO0FBQzlELElBQUksSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ2xEO0FBQ0EsSUFBSSxJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsQ0FBQyxVQUFVLEtBQUssU0FBUyxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDO0FBQ3ZFO0FBQ0E7QUFDQSxJQUFJLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUM7QUFDdEMsSUFBSSxJQUFJLENBQUMsTUFBTTtBQUNmLE1BQU0sQ0FBQyxDQUFDLEdBQUcsS0FBSyxTQUFTLEdBQUcsQ0FBQyxDQUFDLEdB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QUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQzdDLE1BQU0sSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDMUM7QUFDQSxNQUFNLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO0FBQzFDO0FBQ0EsTUFBTSxJQUFJLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3BEO0FBQ0EsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7QUFDdkQsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUM7QUFDaEQsS0FBSztBQUNMO0FBQ0EsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM3QyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3pCLEdBQUc7QUFDSDtBQUNBLEVBQUUsTUFBTSxDQUFDLENBQUMsRUFBRTtBQUNaLElBQUksQ0FBQyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdEM7QUFDQSxJQUFJLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzVDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxH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
