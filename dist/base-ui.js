(function($, win, doc){

    $.baseui = UI = {
        util: {},
        supports: {},
        fn: {}
    };

    // supports
    //---------------------------------------------------------
    UI.supports.transition = (function() {

        var transitionEnd = (function() {

            var element = doc.body || doc.documentElement,
                transEndEventNames = {
                    'WebkitTransition' : 'webkitTransitionEnd',
                    'MozTransition' : 'transitionend',
                    'OTransition' : 'oTransitionEnd otransitionend',
                    'transition' : 'transitionend'
                }, 
                transition = false;

            for (var name in transEndEventNames){
                if (element.style[name] !== undefined) {
                    transition = transEndEventNames[name];
                }
            }

            return transition;
        })();

        return transitionEnd && { end: transitionEnd };
    })();

    UI.supports.mutationObserver = (function() {
        return true && win.MutationObserver || win.WebKitMutationObserver;
    })();

    UI.supports.touch  = (('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch);
    

    // util
    //---------------------------------------------------------
    
    UI.util.clickevent = UI.supports.touch ? 'click':'click';

    UI.util.initByDataAttr = function(context) {

        $(context || doc).find("[data-baseui]:not([data-baseui-skip])").each(function(){
            
            var element = $(this), 
                data    = element.attr("data-baseui"),
                fn      = $.trim(data.split(">")[0]),
                options = UI.util.parseOptions(data);

            element.baseui(fn, options);

        }).attr("data-baseui-skip", "true");

    };

    UI.util.parseOptions = function(string) {

        var start = string.indexOf(">"), options = {};

        if (start != -1) {
            try {
                options = (new Function("", "var json = {" + string.substr(start+1) + "}; return JSON.parse(JSON.stringify(json));"))();
            } catch(e) {
                $.error(e.message);
            }
        }

        return options;
    };

    // misc
    //---------------------------------------------------------
    $.fn.baseui = function (fn, options) {

        if (!UI.fn[fn]) {
            //$.error("Base UI component [" + fn + "] does not exist.");
            return this;
        }

        var args = arguments;

        return this.each(function() {
            var $this = $(this), 
                obj   = $this.data(fn);

            if (!obj) { 
                obj = new UI.fn[fn](this, options);
                $this.data(fn, obj);
            }

            if (obj && typeof(options) == 'string') {
                obj[options].apply(obj, Array.prototype.slice.call(args, 2));
            }
        });

    };

    // auto data ui on dom manipulation
    $(function(){
        
        UI.util.initByDataAttr(doc);

        var target   = doc.body,
            MO       = UI.supports.mutationObserver || function(callback) { 
                        this.observe = function(target, config){
                            setTimeout(function(){ 
                                UI.util.initByDataAttr(doc); 
                            }, 1000);
                        };
            },
            observer = new MO(function(mutations) {
                mutations.forEach(function(mutation) {
                    if (mutation.addedNodes.length) {
                        UI.util.initByDataAttr(doc);
                    }
                });
            });

        observer.observe(target, { childList: true});
    });


})(jQuery, window, document);

/*! Hammer.JS - v1.0.0rc1 - 2013-01-31
 * http://eightmedia.github.com/hammer.js
 *
 * Copyright (c) 2013 Jorik Tangelder <jorik@eight.nl>;
 * Licensed under the MIT license */

(function( window, undefined ) {
    "use strict";

var Hammer = function(element, options) {
    return new Hammer.Instance(element, options || {});
};

// default settings
Hammer.defaults = {
    stop_browser_behavior: {    // set to false to disable this
        userSelect: "none", // this also triggers onselectstart=false for IE
        touchCallout: "none",
        touchAction: "none",
        contentZooming: "none",
        userDrag: "none",
        tapHighlightColor: "rgba(0,0,0,0)"
    }

    // more settings are defined at gestures.js
};

// detect touchevents
Hammer.HAS_POINTEREVENTS = window.navigator.msPointerEnabled;
Hammer.HAS_TOUCHEVENTS = ('ontouchstart' in window);

// eventtypes per touchevent (start, move, end)
// are filled by Hammer.event.determineEventTypes on setup
Hammer.EVENT_TYPES = {};

// direction defines
Hammer.DIRECTION_DOWN = 'down';
Hammer.DIRECTION_LEFT = 'left';
Hammer.DIRECTION_UP = 'up';
Hammer.DIRECTION_RIGHT = 'right';

// touch event defines
Hammer.TOUCH_START = 'start';
Hammer.TOUCH_MOVE = 'move';
Hammer.TOUCH_END = 'end';

// plugins namespace
Hammer.plugins = {};

// if the window events are set...
Hammer.READY = false;

/**
 * setup events to detect gestures on the document
 * @return
 */
function setup() {
    if(Hammer.READY) {
        return;
    }

    // find what eventtypes we add listeners to
    Hammer.event.determineEventTypes();

    // Register all gestures inside Hammer.gestures
    for(var name in Hammer.gestures) {
        if(Hammer.gestures.hasOwnProperty(name)) {
            Hammer.gesture.register(Hammer.gestures[name]);
        }
    }

    // Add touch events on the window
    Hammer.event.onTouch(window, Hammer.TOUCH_MOVE, Hammer.gesture.detect);
    Hammer.event.onTouch(window, Hammer.TOUCH_END, Hammer.gesture.endDetect);

    // Hammer is ready...!
    Hammer.READY = true;
}

/**
 * create new hammer instance
 * all methods should return the instance itself, so it is chainable.
 * @param   {HTMLElement}   element
 * @param   {Object}        [options={}]
 * @return  {Object}        instance
 */
Hammer.Instance = function(element, options) {
    var self = this;

    // setup HammerJS window events and register all gestures
    // this also sets up the default options
    setup();

    this.element = element;
    this._events = {};

    // merge options
    this.options = Hammer.utils.extend(
        Hammer.utils.extend({}, Hammer.defaults),
        options || {});

    // add some css to the element to prevent the browser from doing its native behavoir
    if(this.options.stop_browser_behavior) {
        Hammer.utils.stopDefaultBrowserBehavior(this);
    }

    // start detection on touchstart
    Hammer.event.onTouch(element, Hammer.TOUCH_START, function(ev) {
        return Hammer.gesture.startDetect(self, ev);
    });

    // return instance
    return this;
};


Hammer.Instance.prototype = {
    /**
     * these event methods are based on MicroEvent
     * the on, off and trigger event are only used by the inst
     * https://github.com/jeromeetienne/microevent.js
     *
     * bind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    on: function onEvent(gestures, handler){
        var ev, t;
        gestures = gestures.split(" ");
        for(t=0; t<gestures.length; t++) {
            ev = gestures[t];
            this._events[ev] = this._events[ev] || [];
            this._events[ev].push(handler);
        }
    },


    /**
     * unbind events to the instance
     * @param   string      gestures
     * @param   callback    callback
     * @return  {*}
     */
    off: function offEvent(gestures, handler){
        var ev, t;
        gestures = gestures.split(" ");
        for(t=0; t<gestures.length; t++) {
            ev = gestures[t];
            if(ev in this._events === false) {
                return;
            }
            this._events[ev].splice(this._events[ev].indexOf(handler), 1);
        }
    },

    /**
     * trigger gesture event
     * @param   string      type
     * @param   object      ev
     * @return  {*}
     */
    trigger: function triggerEvent(gesture, data){
        data.gesture = gesture;

        if(gesture in this._events === false) {
            return;
        }
        for(var i = 0; i < this._events[gesture].length; i++){
            this._events[gesture][i].call(this, data);
        }
    }
};

/**
 * this holds the last move event,
 * used to fix empty touchend issue
 * see the onTouch event for an explanation
 * @type {Object}
 */
var last_move_event = {};

/**
 * when the mouse is hold down, this is true
 * @type {Boolean}
 */
var mousedown = false;


Hammer.event = {
    /**
     * simple addEventListener
     * @param element
     * @param types
     * @param handler
     */
    bindDom: function(element, types, handler) {
        types = types.split(" ");
        for(var t=0; t<types.length; t++) {
            element.addEventListener(types[t], handler, false);
        }
    },


    /**
     * touch events with mouse fallback
     * @param   {HTMLElement}      element
     * @param   {Constant}       type        like Hammer.TOUCH_MOVE
     * @param   handler
     */
    onTouch: function onTouch(element, type, handler) {
        var self = this;
        var triggerHandler = function(ev) {
            // PointerEvents update
            if(Hammer.HAS_POINTEREVENTS) {
                Hammer.PointerEvent.updatePointer(type, ev);
            }

            // because touchend has no touches, and we often want to use these in our gestures,
            // we send the last move event as our eventData in touchend
            if(type === Hammer.TOUCH_END) {
                ev = last_move_event;
            }
            // store the last move event
            else {
                last_move_event = ev;
            }
            handler.call(this, self.collectEventData(element, type, ev));
        };

        // touchdevice
        if(Hammer.HAS_TOUCHEVENTS || Hammer.HAS_POINTEREVENTS) {
            this.bindDom(element, Hammer.EVENT_TYPES[type], triggerHandler);
        }
        // mouse
        else {
            this.bindDom(element, Hammer.EVENT_TYPES[type], function(ev) {
                // left mouse button must be pressed
                // ev.button === 1 is for IE
                if(ev.which === 1 || ev.button === 1) {
                    mousedown = true;
                    triggerHandler.apply(this, arguments);
                }

                if(ev.type == 'mouseup') {
                    mousedown = false;
                }
            });
        }
    },


    /**
     * we have different events for each device/browser
     * determine what we need and set them in the Hammer.EVENT_TYPES constant
     */
    determineEventTypes: function determineEventTypes() {
        // determine the eventtype we want to set
        var types;
        if(Hammer.HAS_POINTEREVENTS) {
            types = [
                'MSPointerDown',
                'MSPointerMove',
                'MSPointerUp MSPointerCancel'
            ];
        }
        else if(Hammer.HAS_TOUCHEVENTS) {
            types = [
                'touchstart',
                'touchmove',
                'touchend touchcancel'];
        }
        else {
            types = [
                'mousedown',
                'mousemove',
                'mouseup'];
        }

        Hammer.EVENT_TYPES[Hammer.TOUCH_START]  = types[0];
        Hammer.EVENT_TYPES[Hammer.TOUCH_MOVE]   = types[1];
        Hammer.EVENT_TYPES[Hammer.TOUCH_END]    = types[2];
    },


    /**
     * create touchlist depending on the event
     * @param   Event       ev
     */
    getTouchList: function getTouchList(ev, type) {
        if(Hammer.HAS_POINTEREVENTS) {
            return Hammer.PointerEvent.getPointers();
        }
        else if(Hammer.HAS_TOUCHEVENTS) {
            return ev.touches;
        }
        else {
            return [{
                identifier: 1,
                pageX: ev.pageX,
                pageY: ev.pageY,
                target: ev.target
            }];
        }
    },


    /**
     * collect event data for Hammer js
     * @param   domElement      element
     * @param   TOUCHTYPE       type        like Hammer.TOUCH_MOVE
     * @param   Event           ev
     */
    collectEventData: function collectEventData(element, type, ev) {
        var touches = this.getTouchList(ev, type);

        return {
            type    : type,
            time    : new Date().getTime(), // for IE
            target  : ev.target,
            touches : touches,
            srcEvent: ev,
            center  : Hammer.utils.getCenter(touches),
            preventDefault: function() { return ev.preventDefault(); }
        };
    }
};

var PI = Math.PI;

Hammer.utils = {
    /**
     * extend method,
     * also used for cloning when dest is an empty object
     * @param   {Object}    dest
     * @param   {Object}    src
     * @param   {Number}    [depth=0]
     * @return  {Object}    dest
     */
    extend: function extend(dest, src, depth) {
        depth = depth || 0;
        for (var key in src) {
            if(src.hasOwnProperty(key)) {
                if(depth && typeof(src[key]) == 'object') {
                    dest[key] = this.extend({}, src[key], depth-1);
                } else {
                    dest[key] = src[key];
                }
            }
        }

        return dest;
    },


    /**
     * faster Math.abs alternative
     * @param   value
     * @return  value
     */
    fastAbs: function fastAbs(value) {
        // equivalent to Math.abs();
        return (value ^ (value >> 31)) - (value >> 31);
    },


    /**
     * get the center of all the touches
     * @param   {TouchList}   touches
     * @return  {Object}      center
     */
    getCenter: function getCenter(touches) {
        var valuesX = [], valuesY = [];

        for(var t= 0,len=touches.length; t<len; t++) {
            valuesX.push(touches[t].pageX);
            valuesY.push(touches[t].pageY);
        }

        return {
            pageX: ((Math.min.apply(Math, valuesX) + Math.max.apply(Math, valuesX)) / 2),
            pageY: ((Math.min.apply(Math, valuesY) + Math.max.apply(Math, valuesY)) / 2)
        };
    },


    /**
     * calculate the distance between two points
     * @param   Number      pos1
     * @param   Number      pos2
     */
    getSimpleDistance: function getSimpleDistance(pos1, pos2) {
        return this.fastAbs(pos2 - pos1);
    },


    /**
     * calculate the angle between two coordinates
     * @param   Touch      touch1
     * @param   Touch      touch2
     */
    getAngle: function getAngle(touch1, touch2) {
        var y = touch2.pageY - touch1.pageY,
            x = touch2.pageX - touch1.pageX;
        return Math.atan2(y, x) * 180 / PI;
    },


    /**
     * angle to direction define
     * @param   Touch      touch1
     * @param   Touch      touch2
     * @return {Constant}  direction constant, like Hammer.DIRECTION_LEFT
     */
    getDirection: function getDirection(touch1, touch2) {
        var x = this.fastAbs(touch1.pageX - touch2.pageX),
            y = this.fastAbs(touch1.pageY - touch2.pageY);

        if(x >= y) {
            return touch1.pageX - touch2.pageX > 0 ? Hammer.DIRECTION_LEFT : Hammer.DIRECTION_RIGHT;
        }
        else {
            return touch1.pageY - touch2.pageY > 0 ? Hammer.DIRECTION_UP : Hammer.DIRECTION_DOWN;
        }
    },


    /**
     * calculate the distance between two touches
     * @param   Touch      touch1
     * @param   Touch      touch2
     */
    getDistance: function getDistance(touch1, touch2) {
        var x = touch2.pageX - touch1.pageX,
            y = touch2.pageY - touch1.pageY;
        return Math.sqrt((x*x) + (y*y));
    },


    /**
     * calculate the scale factor between two touchLists (fingers)
     * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
     * @param   TouchList   start
     * @param   TouchList   end
     * @return  float       scale
     */
    getScale: function getScale(start, end) {
        // need two fingers...
        if(start.length >= 2 && end.length >= 2) {
            return this.getDistance(end[0], end[1]) /
                this.getDistance(start[0], start[1]);
        }
        return 1;
    },


    /**
     * calculate the rotation degrees between two touchLists (fingers)
     * @param   TouchList   start
     * @param   TouchList   end
     * @return  float       rotation
     */
    getRotation: function getRotation(start, end) {
        // need two fingers
        if(start.length == 2 && end.length == 2) {
            return this.getAngle(end[1], end[0]) -
                this.getAngle(start[1], start[0]);
        }
        return 0;
    },


    /**
     * stop browser default behavior with css props
     * @param   Hammer.Instance inst
     * @return {*}
     */
    stopDefaultBrowserBehavior: function stopDefaultBrowserBehavior(inst) {
        var prop,
            vendors = ['webkit','khtml','moz','ms','o',''],
            css_props = inst.options.stop_browser_behavior;

        if(!css_props) {
            return;
        }

        // with css properties for modern browsers
        for(var i = 0; i < vendors.length; i++) {
            for(var p in css_props) {
                if(css_props.hasOwnProperty(p)) {
                    prop = p;
                    if(vendors[i]) {
                        prop = vendors[i] + prop.substring(0, 1).toUpperCase() + prop.substring(1);
                    }
                    inst.element.style[prop] = css_props[p];
                }
            }
        }

        // also the disable onselectstart
        if(css_props.userSelect == 'none') {
            inst.element.onselectstart = function() {
                return false;
            };
        }
    }
};

Hammer.gesture = {
    // contains all registred Hammer.gestures in the correct order
    gestures: [],

    // data of the current Hammer.gesture detection session
    current: null,

    // the previous Hammer.gesture session data
    // is a full clone of the previous gesture.current object
    previous: null,


    /**
     * start Hammer.gesture detection
     * @param   HammerInstane   inst
     * @param   Event           ev
     */
    startDetect: function startDetect(inst, ev) {
        var self = Hammer.gesture;
        // already busy with an Hammer.gesture detection on a element
        if(self.current) {
            return;
        }

        self.current = {
            inst        : inst, // reference to HammerInstance we're working for
            startEvent  : Hammer.utils.extend({}, ev), // start eventData for distances, timing etc
            lastEvent   : false, // last eventData
            name        : '' // current gesture we're in/detected, can be 'tap', 'hold' etc
        };

        return self.detect(ev);
    },


    /**
     * Hammer.gesture detection
     * @param   Event           ev
     */
    detect: function detect(ev) {
        var self = Hammer.gesture,
            retval;

        if(self.current) {
            // extend event data with calculations about scale, distance etc
            var eventData = self.extendEventData(ev);

            // instance options
            var inst_options = self.current.inst.options;

            // call Hammer.gesture handles
            for(var g=0,len=self.gestures.length; g<len; g++) {
                var gesture = self.gestures[g];

                // only when the instance options have enabled this gesture
                if(inst_options[gesture.name] !== false) {
                    // if a handle returns false
                    // we stop with the detection
                    retval = gesture.handler.call(gesture, eventData.type, eventData, self.current.inst);
                    if(retval === false) {
                        self.stop();
                        break;
                    }
                }
            }

            // store as previous event event
            self.current.lastEvent = eventData;
        }
    },


    /**
     * end Hammer.gesture detection
     * @param   Event           ev
     */
    endDetect: function endDetect(ev) {
        var self = Hammer.gesture;
        self.detect(ev);
        self.stop();
    },


    /**
     * clear the Hammer.gesture vars
     * this is called on endDetect, but can also be used when a final Hammer.gesture has been detected
     * to stop other Hammer.gestures from being fired
     */
    stop: function stop() {
        // clone current data to the store as the previous gesture
        // used for the double tap gesture, since this is an other gesture detect session
        this.previous = Hammer.utils.extend({}, this.current);

        // reset the current
        this.current = null;
    },


    /**
     * extend eventData for Hammer.gestures
     * @param   object   eventData
     * @return  object
     */
    extendEventData: function extendEventData(ev) {
        var startEv = this.current.startEvent;

        // if the touches change, set the new touches over the startEvent touches
        // this because touchevents don't have all the touches on touchstart, or the
        // user must place his fingers at the EXACT same time on the screen, which is not realistic
        if(startEv && ev.touches.length != startEv.touches.length) {
            // extend 1 level deep to get the touchlist with the touch objects
            startEv.touches = Hammer.utils.extend({}, ev.touches, 1);
        }

        Hammer.utils.extend(ev, {
            touchTime   : (ev.time - startEv.time),

            angle       : Hammer.utils.getAngle(startEv.center, ev.center),
            direction   : Hammer.utils.getDirection(startEv.center, ev.center),

            distance    : Hammer.utils.getDistance(startEv.center, ev.center),
            distanceX   : Hammer.utils.getSimpleDistance(startEv.center.pageX, ev.center.pageX),
            distanceY   : Hammer.utils.getSimpleDistance(startEv.center.pageY, ev.center.pageY),

            scale       : Hammer.utils.getScale(startEv.touches, ev.touches),
            rotation    : Hammer.utils.getRotation(startEv.touches, ev.touches),

            startEvent  : startEv
        });

        return ev;
    },


    /**
     * register new gesture
     * @param   Gesture instance, see gestures.js for documentation
     */
    register: function register(gesture) {
        // add an enable gesture options if there is no given
        var options = gesture.defaults || {};
        if(typeof(options[gesture.name]) == 'undefined') {
            options[gesture.name] = true;
        }

        // extend Hammer default options with the Hammer.gesture options
        Hammer.utils.extend(Hammer.defaults, options);

        // set it's index
        gesture.index = gesture.index || 1000;

        // add Hammer.gesture to the list
        this.gestures.push(gesture);

        // sort the list by index
        this.gestures.sort(function(a, b) {
            if (a.index < b.index)
                return -1;
            if (a.index > b.index)
                return 1;
            return 0;
        });
    }
};

Hammer.gestures = Hammer.gestures || {};

/**
 * Custom gestures
 * ==============================
 *
 * Gesture object
 * --------------------
 * The object structure of a gesture:
 *
 * { name: 'mygesture',
 *   index: 1337,
 *   defaults: {
 *     mygesture_option: true
 *   }
 *   handler: function(type, ev, inst) {
 *     // trigger gesture event
 *     inst.trigger(this.name, ev);
 *   }
 * }

 * @param   {String}    name
 * this should be the name of the gesture, lowercase
 * it is also being used to disable/enable the gesture per instance config.
 *
 * @param   {Number}    [index=1000]
 * the index of the gesture, where it is going to be in the stack of gestures detection
 * like when you build an gesture that depends on the drag gesture, it is a good
 * idea to place it after the index of the drag gesture.
 *
 * @param   {Object}    [defaults={}]
 * the default settings of the gesture. these are added to the instance settings,
 * and can be overruled per instance. you can also add the name of the gesture,
 * but this is also added by default (and set to true).
 *
 * @param   {Function}  handler
 * this handles the gesture detection of your custom gesture and receives the
 * following arguments:
 *      @param  {String}    type
 *      matches Hammer.TOUCH_START|MOVE|END
 *
 *      @param  {Object}    event
 *      event data containing the following properties:
 *          time        {Number}        time the event occurred
 *          target      {HTMLElement}   target element
 *          touches     {Array}         touches (fingers, pointers, mouse) on the screen
 *          center      {Object}        center position of the touches
 *                                      contains pageX and pageY
 *          touchTime   {Number}        the total time of the touches in the screen
 *          angle       {Number}        the angle we are moving
 *          direction   {String}        the direction we are moving.
 *                                      matches Hammer.DIRECTION_UP|DOWN|LEFT|RIGHT
 *          distance    {Number}        the distance we haved moved
 *          distanceX   {Number}        the distance on x axis we haved moved
 *          distanceY   {Number}        the distance on y axis we haved moved
 *          scale       {Number}        scaling of the touches, needs 2 touches
 *          rotation    {Number}        rotation of the touches, needs 2 touches
 *          srcEvent    {Object}        the source event, like TouchStart or MouseDown *
 *          startEvent  {Object}        contains the same properties as above,
 *                                      but from the first touch. this is used to calculate
 *                                      distances, touchTime, scaling etc
 *
 *      @param  {Hammer.Instance}    inst
 *      the instance we are doing the detection for. you can get the options from
 *      the inst.options object and trigger the gesture event by calling inst.trigger
 *
 *
 * Handle gestures
 * --------------------
 * inside the handler you can get/set Hammer.gesture.current. This is the current
 * detection session. It has the following properties
 *      @param  {String}    name
 *      contains the name of the gesture we have detected. it has not a real function,
 *      only to check in other gestures if something is detected.
 *      like in the drag gesture we set it to 'drag' and in the swipe gesture we can
 *      check if the current gesture is 'drag' by accessing Hammer.gesture.current.name
 *
 *      @readonly
 *      @param  {Hammer.Instance}    inst
 *      the instance we do the detection for
 *
 *      @readonly
 *      @param  {Object}    startEvent
 *      contains the properties of the first gesture detection in this session.
 *      Used for calculations about timing, distance, etc.
 *
 *      @readonly
 *      @param  {Object}    lastEvent
 *      contains all the properties of the last gesture detect in this session.
 *
 * after the gesture detection session has been completed (user has released the screen)
 * the Hammer.gesture.current object is copied into Hammer.gesture.previous,
 * this is usefull for gestures like doubletap, where you need to know if the
 * previous gesture was a tap
 *
 * options that have been set by the instance can be received by calling inst.options
 *
 * You can trigger a gesture event by calling inst.trigger("mygesture", event).
 * The first param is the name of your gesture, the second the event argument
 *
 *
 * Register gestures
 * --------------------
 * When an gesture is added to the Hammer.gestures object, it is auto registered
 * at the setup of the first Hammer instance. You can also call Hammer.gesture.register
 * manually and pass your gesture object as a param
 *
 */

/**
 * Hold
 * Touch stays at the same place for x time
 * @events  hold
 */
Hammer.gestures.Hold = {
    name: 'hold',
    index: 10,
    defaults: {
        hold_timeout: 500
    },
    timer: null,
    handler: function holdGesture(type, ev, inst) {
        switch(type) {
            case Hammer.TOUCH_START:
                var self = this;
                // clear any running timers
                clearTimeout(this.timer);

                // set the gesture so we can check in the timeout if it still is
                Hammer.gesture.current.name = this.name;

                // set timer and if after the timeout it still is hold,
                // we trigger the hold event
                this.timer = setTimeout(function() {
                    if(Hammer.gesture.current.name == self.name) {
                        inst.trigger(self.name, ev);
                    }
                }, inst.options.hold_timeout);
                break;

            // when you move or end we clear the timer
            case Hammer.TOUCH_MOVE:
            case Hammer.TOUCH_END:
                clearTimeout(this.timer);
                break;
        }
    }
};


/**
 * Tap/DoubleTap
 * Quick touch at a place or double at the same place
 * @events  tap, doubletap
 */
Hammer.gestures.Tap = {
    name: 'tap',
    index: 100,
    defaults: {
        tap_max_touchtime  : 250,
        tap_max_distance   : 10,
        doubletap_distance : 20,
        doubletap_interval : 300
    },
    handler: function tapGesture(type, ev, inst) {
        if(type == Hammer.TOUCH_END) {
            // previous gesture, for the double tap since these are two different gesture detections
            var prev = Hammer.gesture.previous;

            // when the touchtime is higher then the max touch time
            // or when the moving distance is too much
            if(ev.touchTime > inst.options.tap_max_touchtime ||
                ev.distance > inst.options.tap_max_distance) {
                return;
            }

            // check if double tap
            if(prev && prev.name == 'tap' &&
                (ev.time - prev.lastEvent.time) < inst.options.doubletap_interval &&
                ev.distance < inst.options.doubletap_distance) {
                Hammer.gesture.current.name = 'doubletap';
            }
            else {
                Hammer.gesture.current.name = 'tap';
            }

            inst.trigger(Hammer.gesture.current.name, ev);
        }
    }
};


/**
 * Drag
 * Move with x fingers (default 1) around on the page. Blocking the scrolling when
 * moving left and right is a good practice. When all the drag events are blocking
 * you disable scrolling on that area.
 * @events  drag, drapleft, dragright, dragup, dragdown
 */
Hammer.gestures.Drag = {
    name: 'drag',
    index: 50,
    defaults: {
        drag_min_distance : 10,
        // set 0 for unlimited, but this can conflict with transform
        drag_max_touches  : 1,
        // prevent default browser behavior when dragging occurs
        // be careful with it, it makes the element a blocking element
        // when you are using the drag gesture, it is a good practice to set this true
        drag_block_horizontal   : false,
        drag_block_vertical     : false
    },
    handler: function dragGesture(type, ev, inst) {
        // max touches
        if(inst.options.drag_max_touches > 0 &&
            ev.touches.length > inst.options.drag_max_touches) {
            return;
        }

        if(type == Hammer.TOUCH_MOVE){
            // when the distance we moved is too small we skip this gesture
            // or we can be already in dragging
            if(ev.distance < inst.options.drag_min_distance &&
                Hammer.gesture.current.name != this.name) {
                return;
            }

            Hammer.gesture.current.name = this.name;
            inst.trigger(this.name, ev); // basic drag event
            inst.trigger(this.name + ev.direction, ev);  // direction event, like dragdown

            // block the browser events
            if( (inst.options.drag_block_vertical && (
                    ev.direction == Hammer.DIRECTION_UP ||
                    ev.direction == Hammer.DIRECTION_DOWN)) ||
                (inst.options.drag_block_horizontal && (
                    ev.direction == Hammer.DIRECTION_LEFT ||
                    ev.direction == Hammer.DIRECTION_RIGHT))) {
                ev.preventDefault();
            }
        }
    }
};


/**
 * Swipe
 * called after dragging ends and the user moved for x ms a small distance
 * @events  swipe, swipeleft, swiperight, swipeup, swipedown
 */
Hammer.gestures.Swipe = {
    name: 'swipe',
    index: 51,
    defaults: {
        swipe_min_time     : 150,
        swipe_max_time     : 500,
        swipe_min_distance : 30
    },
    handler: function swipeGesture(type, ev, inst) {
        if(type == Hammer.TOUCH_END) {
            // when the distance we moved is too small we skip this gesture
            // or we can be already in dragging
            if(Hammer.gesture.current.name == 'drag' &&
                ev.touchTime > inst.options.swipe_min_time &&
                ev.touchTime < inst.options.swipe_max_time &&
                ev.distance > inst.options.swipe_min_distance) {
                // trigger swipe events
                inst.trigger(this.name, ev);
                inst.trigger(this.name + ev.direction, ev);
            }
        }
    }
};


/**
 * Transform
 * User want to scale or rotate with 2 fingers
 * @events  transform, pinch, pinchin, pinchout, rotate
 */
Hammer.gestures.Transform = {
    name: 'transform',
    index: 45,
    defaults: {
        // factor, no scale is 1, zoomin is to 0 and zoomout until higher then 1
        transform_min_scale     : 0.01,
        // rotation in degrees
        transform_min_rotation  : 1,
        // prevent default browser behavior when two touches are on the screen
        // but it makes the element a blocking element
        // when you are using the transform gesture, it is a good practice to set this true
        transform_always_block  : false
    },
    handler: function transformGesture(type, ev, inst) {
        // prevent default when two fingers are on the screen
        if(inst.options.transform_always_block && ev.touches.length == 2) {
            ev.preventDefault();
        }

        // at least multitouch
        if(type == Hammer.TOUCH_MOVE && ev.touches.length == 2) {
            var scale_threshold = Math.abs(1-ev.scale);
            var rotation_threshold = Math.abs(ev.rotation);

            // when the distance we moved is too small we skip this gesture
            // or we can be already in dragging
            if(scale_threshold < inst.options.transform_min_scale &&
                rotation_threshold < inst.options.transform_min_rotation) {
                return;
            }

            Hammer.gesture.current.name = this.name;
            inst.trigger(this.name, ev); // basic drag event

            // trigger rotate event
            if(rotation_threshold > inst.options.transform_min_rotation) {
                inst.trigger('rotate', ev);
            }

            // trigger pinch event
            if(scale_threshold > inst.options.transform_min_scale) {
                inst.trigger('pinch', ev);
                inst.trigger('pinch'+ ((ev.scale < 1) ? 'in' : 'out'), ev);  // direction event, like pinchin
            }
        }
    }
};


/**
 * Touch
 * Called as first, tells the user has touched the screen
 * @events  touch
 */
Hammer.gestures.Touch = {
    name: 'touch',
    index: -Infinity,
    handler: function touchGesture(type, ev, inst) {
        if(type ==  Hammer.TOUCH_START) {
            inst.trigger(this.name, ev);
        }
    }
};


/**
 * Release
 * Called as last, tells the user has released the screen
 * @events  release
 */
Hammer.gestures.Release = {
    name: 'release',
    index: Infinity,
    handler: function releaseGesture(type, ev, inst) {
        if(type ==  Hammer.TOUCH_END) {
            inst.trigger(this.name, ev);
        }
    }
};

// Expose Hammer to the global object
window.Hammer = Hammer;

})(window);

(function(Hammer) {
    /**
     * enable multitouch on the desktop by pressing the shiftkey
     * the other touch goes in the opposite direction so the center keeps at its place
     * it's recommended to enable Hammer.debug.showTouches for this one
     */
    Hammer.plugins.fakeMultitouch = function() {
        // keeps the start position to keep it centered
        var start_pos = false;

        /**
         * overwrites Hammer.event.getTouchList.
         * @param   {Event}     ev
         * @param   TOUCHTYPE   type
         * @return  {Array}     Touches
         */
        Hammer.event.getTouchList = function(ev, type) {
            // Android, iOS etc
            if(Hammer.HAS_POINTEREVENTS) {
                return Hammer.PointerEvent.getPointers();
            }
            else if(Hammer.HAS_TOUCHEVENTS) {
                return ev.touches;
            }

            // reset on start of a new touch
            if(type == Hammer.TOUCH_START) {
                start_pos = false;
            }

            // when the shift key is pressed, multitouch is possible on desktop
            // why shift? because ctrl and alt are taken by osx and linux
            if(ev.shiftKey) {
                // on touchstart we store the position of the mouse for multitouch
                if(!start_pos) {
                    start_pos = {
                        pageX: ev.pageX,
                        pageY: ev.pageY
                    };
                }

                // small misplacement to fix NaN/Infinity issues
                var distance_x = start_pos.pageX - ev.pageX;
                var distance_y = start_pos.pageY - ev.pageY;

                // fake second touch in the opposite direction
                return [{
                    identifier: 1,
                    pageX: start_pos.pageX - distance_x - 50,
                    pageY: start_pos.pageY - distance_y - -50,
                    target: ev.target
                },{
                    identifier: 2,
                    pageX: start_pos.pageX + distance_x - -50,
                    pageY: start_pos.pageY + distance_y - 50,
                    target: ev.target
                }];

                // normal single touch
            } else {
                start_pos = false;
                return [{
                    identifier: 1,
                    pageX: ev.pageX,
                    pageY: ev.pageY,
                    target: ev.target
                }];
            }
        };
    };

})(window.Hammer);

(function($) {
    /**
     * bind dom events
     * this overwrites addEventListener
     * @param el
     * @param types
     * @param handler
     */
    Hammer.event.bindDom = function(el, types, handler) {
        $(el).on(types, function(ev) {
            handler.call(this, ev.originalEvent);
        });
    };

    /**
     * the methods are called by the instance, but with the jquery plugin
     * we use the jquery event methods instead.
     * @this Hammer.Instance
     */
    Hammer.Instance.prototype.on = function(types, handler) {
        $(this.element).on(types, handler);
    };
    Hammer.Instance.prototype.off = function(types, handler) {
        $(this.element).off(types, handler);
    };


    /**
     * trigger events
     * this is called by the gestures to trigger an event like 'tap'
     * @this Hammer.Instance
     * @param gesture
     * @param data
     */
    Hammer.Instance.prototype.trigger = function(gesture, data){
        var event = jQuery.Event(gesture, data);
        event.type = gesture;
        $(this.element).trigger(event);
    };


    /**
     * jQuery plugin
     * @param   object  config
     * @return  jQuery
     */
    $.fn.hammer = function(config) {
        return this.each(function() {
            var el = $(this);
            if(!el.data("hammer")) {
                var inst = Hammer(this, config || {});
                el.data("hammer", inst);
            }
        });
    };

})(jQuery);

/*globals Hammer, jQuery */

/*
 * Hammer.js jQuery plugin based on Ha
 *
 * @author Łukasz Lipiński (uzza17@gmail.com)
 * @version 0.1
 * @license Released under the MIT license
 * @see https://github.com/lukaszlipinski/jquery.hammer
 */

(function($, Hammer) {
    "use strict";

    var event_names = [
            'hold', 'tap', 'doubletap', 
            'transformstart', 'transform', 'transformend', 
            'dragstart', 'drag', 'dragend', 
            'swipe', 'swipeleft', 'swiperight', 'swipeup', 'swipedown',
            'release'
        ],
        event_name, i, l = event_names.length;

    for (i = 0; i < l; i++) {
        event_name = event_names[i];

        (function(event_name) {
            $.event.special[event_name] = {
                add : function(e) {
                    var $currentTarget = $(this),
                        $targets = e.selector ? $currentTarget.find(e.selector) : $currentTarget;

                    $targets.each(function(index, el) {
                        var hammer = new Hammer(el),
                            $el = $(el);

                        $el.data("hammer", hammer);

                        hammer['on' + event_name] = (function($el) {
                            return function(event) {
                                $el.trigger($.Event(event_name, event));
                            };
                        }($el));
                    });
                },

                teardown: function(namespaces) {
                    var $el = $(this);

                    try{
                        $el.data('hammer').destroy();
                        $el.removeData('hammer');
                    }catch(e) {}
                }
            };
        }(event_name));
    }
}(jQuery, Hammer));

(function($, UI){


    function Button(element, options){

        var $this = this;

        this.element = $(element);
        this.options = $.extend({}, options);
        this.hidden  = $('<input type="hidden" name="" value="" />');
        
        if(this.options.active) this.element.addClass("active");

        if(this.options.name){
            this.hidden.attr("name", this.options.name).val($this.element.hasClass("active") ? 1:0);
            this.element.after(this.hidden);
        }

        this.element.on("click", function(e){
            e.preventDefault();
            
            $this.toggle();
            $(this).blur();
        });
    }
    
    $.extend(Button.prototype, {
        options: {
            active: false,
            name: false
        },

        toggle: function() {

            this.element.toggleClass("active");
            this.hidden.val(this.element.hasClass("active") ? 1:0);
        },

        activate: function(){
            this.element.addClass("active");
            this.hidden.val(1);
        },

        deactivate: function() {
            this.element.removeClass("active");
            this.hidden.val(0);
        },

        val: function() {
            return this.hidden.val();
        }
    });

    function ButtonRadioGroup(element, options) {
        
        var $this    = this, 
            $element = $(element);

        this.options = $.extend({}, this.options, options);
        this.hidden  = $('<input type="hidden" name="" value="" />');

        if(this.options.name){
            this.hidden.attr("name", this.options.name).val(this.options.value);
            $element.after(this.hidden);

            if(this.options.value !== false){
                $element.find(".button[data-value='"+this.options.value+"']:first").addClass("active");
            }
        }

        this.element = $element.on("click", ".button", function(e) {
            e.preventDefault();
            $element.find(".button").not(this).removeClass("active");
            $element.trigger("change", [$(this).addClass("active").blur()]);

            $this.hidden.val($(this).data("value"));
        });
    }

    $.extend(ButtonRadioGroup.prototype, {
        options: {
            name: false,
            value: false
        },

        val: function() {
            return this.hidden.val();
        }
    });

    UI.fn.button     = Button;
    UI.fn.radiogroup = ButtonRadioGroup;

})(jQuery, jQuery.baseui);

(function($, UI){


    var active   = false,
        Dropdown = function(element, options) {
        
        var $this = this;

        this.options = $.extend({}, this.options, options);
        this.element = $(element).on(UI.util.clickevent, ".dp-toggle", function(e){
            $this.toggle();
        });

        if (this.element.is(".dp-toggle")) {
            this.element.on("click", function(e){
                $this.toggle();
            });
        }
    };

    $.extend(Dropdown.prototype, {

        options: {

        },

        toggle: function() {
            this.element.toggleClass("active");
            active = this.element.hasClass("active") ? this.element : false;
        }

    });

    $(document).on(UI.util.clickevent, function() {
        $(".active[data-baseui^='dropdown']").not(active).removeClass("active");
        active = false;
    });

    UI.fn.dropdown = Dropdown;

})(jQuery, jQuery.baseui);

(function($, UI){
    

    var eventregistred = false;


    function signElements(element) {
        
        $(document).find("[data-baseui='focuselement']").removeClass("baseui-focused").trigger("blur");

        element.parents("[data-baseui='focuselement']").addClass("baseui-focused");

        if(element.is("[data-baseui='focuselement']")){
            element.addClass("baseui-focused").trigger("focus");
        }
    }


    UI.fn.focuselement = function(){

        if (!eventregistred) {

            $(document).on(UI.util.clickevent, function(e){

                signElements($(e.target));
            });

            eventregistred = true;
        }
    };

})(jQuery, jQuery.baseui);


(function($, UI){
  
  var growlContainer;

  /*
    Status object
  */

  function Status(message, options) {
      
    var $this = this,
        hover = false;

    this.settings = $.extend({
      "title": false,
      "message": message,
      "speed": 500,
      "timeout": 3000
    }, options);

    this.status = $('<div class="growlstatus" style="display:none;"><div class="growlstatus-close"></div>'+this.settings.message+'</div>');

    //append status
    growlContainer.prepend(this.status);

    //bind close button
    this.status.delegate(".growlstatus-close", UI.util.clickevent, function(){
      $this.close(true);
    });

    //show title
    if(this.settings.title!==false){
      this.status.prepend('<div class="growltitle">'+this.settings.title+'</div>');
    }

    this.status.hover(
      function(){
        hover = true;
      },
      function(){
        
        hover = false;

        if ($this.settings.timeout!==false) {
          window.setTimeout(function(){
            $this.close();
          }, $this.settings.timeout);
        }
      }
    ).fadeIn(this.settings.speed,function(){

      if($this.settings.timeout!==false){
        window.setTimeout(function(){
          $this.close();
        }, $this.settings.timeout);
      }
    });
    
    this.close = function(force){
    
      if(!hover || force){
        $this.status.animate({opacity:"0.0"}, $this.settings.speed).slideUp(function(){
              $this.status.remove();
        });
      }
    };
  }


  UI.growl = function(message, options) {
    
      var o = options || {};

      if(o.webnotification && window["webkitNotifications"]){
        
        if (webkitNotifications.checkPermission() === 0) {
          
          var title = o["title"] ? o.title:" ";

          return webkitNotifications.createNotification('data:image/gif;base64,R0lGODlhAQABAJEAAAAAAP///////wAAACH5BAEHAAIALAAAAAABAAEAAAICVAEAOw==', title, $('<div>'+message+'</div>').text()).show();
        }else{
          webkitNotifications.requestPermission();
        }
      }

      if (!growlContainer) {
        growlContainer = $('<div id="growlcontainer"></div>').appendTo("body");
      }

      return new Status(message, o);
  };

})(jQuery, jQuery.baseui);

(function($, UI){
    

    function MobileMenu(element, options){

        var $this = this;

        this.element = $(element);
        this.options = $.extend({}, options);

        this.element.on("click", ">li", function(){
            $this.element.find("li.active").not(this).removeClass("active");
            $(this).toggleClass("active");
        });
    }

    $.extend(MobileMenu.prototype, {

    });

    UI.fn.mobilemenu = MobileMenu;

})(jQuery, jQuery.baseui);

(function($, UI){
    

    var tpl = '<div class="modal-win animated"><div></div><div class="modal-close"></div></div>',
        current = false,
        overlay = false,
        persist = false,
        $win = $(window),
        $doc = $(document);

    UI.modal = function(content, options){
        
        var o = $.extend({
                'title'     : false,
                'closeOnEsc': true,
                'height'    : 'auto',
                'width'     : 'auto',
                'effect'    : false,

                //events
                'beforeShow'  : function(){},
                'beforeClose' : function(){},
                'onClose'     : function(){}
        }, options);

        if(current){
            UI.modal.close();
        }

        current = $(tpl).addClass(o.effect);

        var container = current.children().eq(0);

        if(o.height != 'auto'){
            container.css({
              'height'    : o.height,
              'overflow-y': 'auto'
            });
        }

        if(o.width != 'auto'){
            container.css({
              'width'     : o.width,
              'overflow-x': 'auto'
            });
        }

        if (typeof content === 'object') {
            // convert DOM object to a jQuery object
            content = content instanceof jQuery ? content : $(content);
            
            if(content.parent().length) {
                persist = content;
                persist.data("sb-persist-parent", content.parent());
            }
        } else if (typeof content === 'string' || typeof content === 'number') {
            // just insert the data as innerHTML
            content = $('<div></div>').html(content);
        } else {
            // unsupported data type!
            content = $('<div></div>').html('Modal Error: Unsupported data type: ' + typeof content);
        }
      
        container.append(content);

        overlay = $("<div>").addClass('modal-overlay').css({
            top: 0, left: 0, position: 'absolute', opacity:0.6
        }).prependTo('body');

        UI.modal.fit();

    };

    UI.modal.close = function(){
        
        if(!current) return;

        if (persist) {
            persist.appendTo(persist.data("sb-persist-parent"));
            persist = false;
        }

        current.remove();
        overlay.remove();

        current = false;
    };

    UI.modal.fit = function(){
        current.appendTo("body").css({
            'left' : ($win.width()/2-current.outerWidth()/2),
            'top'  : ($win.height()/2-current.outerHeight()/2),
            'visibility': "visible"
        });

        overlay.css({
            width: $doc.width(),
            height: $doc.height()
        });
    };

    $(document).on('keydown.modal', function (e) {
        if (current && e.keyCode === 27) { // ESC
            e.preventDefault();
            UI.modal.close();
        }
    }).delegate(".modal-close", UI.util.clickevent, function(){
        UI.modal.close();
    });

    $win.on('resize.modal', function(){
        
        if(!current) return;

        UI.modal.fit();
    });

})(jQuery, jQuery.baseui);

(function($, UI){
    
    var body       = $("body"),
        ModalPanel = {

        show: function(element, movebody) {
            
            element = $(element);

            if (element.length) {
                
                var content = element.find(".modal-panel-content:first");
                
                element.show().addClass("active");

                if(movebody) {
                    var html = $("html");
                    html.css("width", $("body").width()).addClass("has-active-modal-panel").width();
                    html.css("margin-left", content.width() * (content.hasClass("panel-right") ? -1:1));
                }
            }
            
            $(document).on("swiperight.modal-panel swipeleft.modal-panel", '.modal-panel',function(e) {
                
                var target = $(e.target);

                if (target.hasClass("modal-panel-content") || target.parents(".modal-panel-content:first").length) {
                    if(!target.hasClass("close-modal-panel")) return;
                }

                ModalPanel.hide();

            }).on('keydown.modal-panel', function (e) {
                if (e.keyCode === 27) { // ESC
                    ModalPanel.hide();
                }
            });
        },

        hide: function() {
            
            var html = $("html");

            if(html.hasClass("has-active-modal-panel")) {
                html.css({"margin-left": "", "margin-right": "", "width": ""}).removeClass("has-active-modal-panel");
            }

            $(".modal-panel").hide().removeClass("active");

            $(document).off(".modal-panel");
        }
    };

    UI.modalpanel =  ModalPanel;

})(jQuery, jQuery.baseui);

(function($, UI) {

    var $tooltip; // tooltip container


    var Tooltip = function(element, options) {
        
        var $this = this;

        this.options = $.extend({}, this.options, options);
        
        this.element = $(element).on({
            "mouseenter": function(e) { $this.show(); },
            "mouseleave": function(e) { $this.hide(); }
        });

        this.tip = typeof(this.options.src) === "function" ? this.options.src.call(this.element) : this.options.src;

        // disable title attribute
        this.element.attr("data-cached-title", this.element.attr("title")).attr("title", "");
    };

    $.extend(Tooltip.prototype, {

        tip: "",

        options: {
            "offset": 5,
            "pos": "b",
            "src": function() { return this.attr("title"); }
        },

        show: function() {

            if(!this.tip.length) return;

            $tooltip.css({"top": -2000, "visibility": "hidden"}).show();
            $tooltip.html('<div class="tooltip-inner">'+this.tip+'</div>');

            var pos      = $.extend({}, this.element.offset(), { width: this.element[0].offsetWidth, height: this.element[0].offsetHeight }),
                width    = $tooltip[0].offsetWidth,
                height   = $tooltip[0].offsetHeight,
                offset   = typeof(this.options.offset) === "function" ? this.options.offset.call(this.element) : this.options.offset,
                position = typeof(this.options.pos) === "function" ? this.options.pos.call(this.element) : this.options.pos,
                tcss     = {
                    "display":"none",
                    "visibility": "visible",
                    "top": (pos.top + pos.height + height),
                    "left": pos.left
                };

                switch (position[0]) {
                    case 'b':
                        $.extend(tcss, {top: pos.top + pos.height + offset, left: pos.left + pos.width / 2 - width / 2});
                        break;
                    case 't':
                        $.extend(tcss, {top: pos.top - height - offset, left: pos.left + pos.width / 2 - width / 2});
                        break;
                    case 'l':
                        $.extend(tcss, {top: pos.top + pos.height / 2 - height / 2, left: pos.left - width - offset});
                        break;
                    case 'r':
                        $.extend(tcss, {top: pos.top + pos.height / 2 - height / 2, left: pos.left + pos.width + offset});
                        break;
                }

            if (position.length == 2) {
                tcss.left = (position[1] == 'l') ? (pos.left):((pos.left + pos.width) - width);
            }

            $tooltip.css(tcss).attr("data-direction", position).show();

        },

        hide: function() {
            $tooltip.hide();
        },

        content: function() {
            return this.tip;
        }

    });

    UI.fn.tip = Tooltip;

    $(function(){
        $tooltip = $('<div class="baseui-tooltip"></div>').appendTo("body");
    });

})(jQuery, jQuery.baseui);

(function($, UI){


    var $this = null;
    
    UI.topbox = $this = {
        
        defaults: {
            'title'     : false,
            'closeOnEsc': true,
            'closeBtn'  : true,
            'theme'     : 'default',
            'height'    : 'auto',
            'width'     : 'auto',
            'speed'     : 500,
            'easing'    : 'swing',
            'buttons'   : false,
            
            //private
            '_status'   : true,

            //events
            'beforeShow'  : function(){},
            'beforeClose' : function(){},
            'onClose'     : function(){}
        },

        box: null,
        options: {},
        persist: false,
        
        show: function(content, options) {
            
            if(this.box) {this.clear();}
            
            this.options = $.extend({}, this.defaults, options);
			
            var tplDlg = '<div class="topbox-window '+$this.options.theme+'">';
                tplDlg+=  '<div class="topbox-close"></div>';
                tplDlg+=  '<div class="topbox-title" style="display:none;"></div>';
                tplDlg+=  '<div class="topbox-content"><div class="topbox-innercontent"></div></div>';
                tplDlg+=  '<div class="topbox-buttonsbar"><div class="topbox-buttons"></div></div>';
                tplDlg+= '</div>';
            
            this.box = $(tplDlg);

            if(!this.options.closeBtn) {
                this.box.find(".topbox-close").hide();
            } else {
                this.box.find(".topbox-close").bind(UI.util.clickevent,function(){
                    $this.close();
                });   
            }
            
            if(this.options.buttons){
                
                var btns = this.box.find(".topbox-buttons");
                
                $.each(this.options.buttons, function(caption, fn){
                    
					$('<button type="button" class="topbox-button">'+caption+'</button>').bind("click", function(e){
						e.preventDefault();
						fn.apply($this);
                    }).appendTo(btns);
                });
            }else{
               this.box.find(".topbox-buttonsbar").hide(); 
            }
            
            if($this.options.height != 'auto'){
                this.box.find(".topbox-innercontent").css({
                  'height'    : $this.options.height,
                  'overflow-y': 'auto'
                });
            }
            
            if($this.options.width != 'auto'){
                this.box.find(".topbox-innercontent").css({
                  'width'     : $this.options.width,
                  'overflow-x': 'auto'
                });
            }
      
            this.setContent(content).setTitle(this.options.title);
			
			
            this.box.css({
                'opacity'   : 0,
                'visibility': 'hidden'
            }).appendTo("body");
			
			this.options.beforeShow.apply(this);
			
            this.box.css({
                'left' : ($(window).width()/2-$this.box.width()/2),
                'top'  : ((-1.5) * $this.box.height())
            }).css({
                'visibility': 'visible'
            }).animate({
                top: 0,
                opacity: 1
            }, this.options.speed, this.options.easing, function(){
            
                //focus
                if($this.box.find(":input:first").length) {
                    $this.box.find(":input:first").focus();
                }
            
            });
            
            $(window).bind('resize.topbox', function(){
                
				$this.center();
				
				$this.overlay.hide().css({
					width: $(document).width(),
					height: $(document).height()
				}).show();
            });
            
            // bind esc
            if(this.options.closeOnEsc){
                $(document).bind('keydown.topbox', function (e) {
                    if (e.keyCode === 27) { // ESC
                        e.preventDefault();
                        $this.close();
                    }
                });
            }
            
            this.showOverlay();
			
            return this;
        },
        
        close: function(){
            
            if(!this.box) {return;}
            
            if(this.options.beforeClose.apply(this)===false){
                return this;
            }
            
            this.overlay.fadeOut();
            
            this.box.animate({ 
                'top'  : ((-1.5) * $this.box.height()),
                'opacity': 0
            }, this.options.speed, this.options.easing, function(){
                $this.clear();
            });
			
			this.options.onClose.apply(this);

            return this;
        },

        blockUI: function(content, options) {
            
            var o = $.extend({
                closeBtn: false,
                closeOnEsc: false
            }, options);
            
            this.show(content, o);
        },
		
		'confirm': function(content, fn, options){

			var defaults = {
				title : UI.topbox.i18n.Confirm,
				buttons: {}
			};

            defaults["buttons"][UI.topbox.i18n.Ok] = function(){ fn.apply($this);};
            defaults["buttons"][UI.topbox.i18n.Cancel] = function(){ this.close();};
			
			this.show(content, $.extend(defaults, options));
		
		},

        'input': function(message, fn, options){
            
            var defaults = {
                title : UI.topbox.i18n.Input,
                value : "",
                buttons: {}
            };

            defaults["buttons"][UI.topbox.i18n.Ok] = function(){
                        
                var val = this.box.find("input[type=text]:first").val();
                fn.apply($this,[val]);
            };

            defaults["buttons"][UI.topbox.i18n.Cancel] = function(){ this.close();};

            var content = '<form class="topbox-input-form">';
                content+= '<div class="topbox-input-message">'+message+'</div>';
                content+= '<input type="text" class="topbox-input" style="width:100%;" />';
                content+= '</form>';

            content = $(content).bind("submit", function(e){
                e.preventDefault();

                UI.topbox.box.find(".topbox-buttons button:first").trigger("click");
            });

            var o = $.extend(defaults, options);

            content.find("input[type=text]:first").val(o.value);

            this.show(content, o);
        
        },
		
		'alert': function(content, options){
			
            var defaults = {
                title : UI.topbox.i18n.Alert,
                buttons: {}
            };

            defaults["buttons"][UI.topbox.i18n.Ok] = function(){ this.close();};
            
            this.show(content, $.extend(defaults, options));
		},
        
        clear: function(){
            
            if(!this.box) {return;}
            
            if (this.persist) {
                this.persist.appendTo(this.persist.data("tb-persist-parent"));
                this.persist = false;
            }
            
            this.box.stop().remove();
            this.box = null;
            
            if(this.overlay){
                this.overlay.hide();
            }
            
            $(window).unbind('resize.topbox');
            $(document).unbind('keydown.topbox');
            
            return this;
        },
		
		center: function(){
			
			if(!this.box) {return;}
			
			this.box.css({
				'left': ($(window).width()/2-$this.box.width()/2)
			});
		},
        
        setTitle: function(title){ 
          
          if(!this.box) {return;}
          
          if(title){
            this.box.find(".topbox-title").html(title).show();
          }else{
            this.box.find(".topbox-title").html(title).hide();
          }
          
          return this;
        },

        setContent: function(content){ 
            
            if(!this.box) {return;}
            
            if (typeof content === 'object') {
				// convert DOM object to a jQuery object
				content = content instanceof jQuery ? content : $(content);
                
                if(content.parent().length) {
                    this.persist = content;
                    this.persist.data("tb-persist-parent", content.parent());
                }
			}
			else if (typeof content === 'string' || typeof content === 'number') {
				// just insert the data as innerHTML
				content = $('<div></div>').html(content);
			}
			else {
				// unsupported data type!
				content = $('<div></div>').html('SimpleModal Error: Unsupported data type: ' + typeof content);
			}
          
            content.appendTo(this.box.find(".topbox-innercontent").html(''));

            return this;
        },
        
        showOverlay: function(){
            
            if(!this.box) {return;}
            
            if(!this.overlay){
                if(!$("#topbox-overlay").length) {
                    $("<div>").attr('id','topbox-overlay').css({
                        top: 0,
                        left: 0,
                        position: 'absolute'
                    }).prependTo('body');
                                        
                }
                
                this.overlay = $("#topbox-overlay");
            }
            
            this.overlay.css({
                width: $(document).width(),
                height: $(document).height()
            }).show();
        }
    };

    UI.topbox.i18n = {
        "Cancel" : "Cancel",
        "Ok"     : "Ok",
        "Confirm": "Please confirm",
        "Input"  : "Please input",
        "Alert"  : "Alert"   
    };

    $.fn.uitopbox = function() {

        var args    = arguments;
        var options = args[0] ? args[0] : {};

        return this.each(function() {
            
			var ele = $(this);
			
			ele.bind("click", function(e) {
				
				e.preventDefault();
				
				var target = String(ele.data('target') || ele.attr("href")),
					type   = ele.data("type") || "html";
				
				//html source
				if(target[0]=="#" || type=="html") {
					UI.topbox.show($(target), options);
				}

			});
        });
    };
})(jQuery, jQuery.baseui);