/**
 * VeloX Time Travel - Injected Main World Script (ES5 Compatible)
 * Runs at document_start in the MAIN world to mock Date, Intl, performance, headers, and expose the console API.
 */
(function () {
  "use strict";

  if (window.__VELOX_TIME_TRAVEL_INITIALIZED__) {
    return;
  }
  window.__VELOX_TIME_TRAVEL_INITIALIZED__ = true;

  // Polyfill Object.assign if not available
  var extend = function (target) {
    target = target || {};
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      if (source) {
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
    }
    return target;
  };

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function padMs(n) {
    if (n < 10) return "00" + n;
    if (n < 100) return "0" + n;
    return String(n);
  }

  // Capture original native implementations
  var OriginalDate = window.Date;
  var OriginalIntlDateTimeFormat = window.Intl ? window.Intl.DateTimeFormat : null;

  // Capture native performance and method directly to avoid recursive self-calls
  var nativePerformance = window.performance;
  var nativePerformanceNowMethod = (nativePerformance && typeof nativePerformance.now === "function")
    ? nativePerformance.now
    : null;

  function getRealPerformanceNow() {
    if (nativePerformance && nativePerformanceNowMethod) {
      return nativePerformanceNowMethod.call(nativePerformance);
    }
    return (new OriginalDate()).getTime();
  }

  var OriginalFetch = window.fetch ? window.fetch : null;
  var OriginalXHR = window.XMLHttpRequest;

  var STORAGE_KEY = "__VELOX_TIME_TRAVEL_STATE__";
  var STATE_EVENT = "velox:time-travel-state-change";

  var currentState = {
    enabled: false,
    mode: "simple",
    targetIso: "",
    timezone: "",
    isFrozen: false,
    speedMultiplier: 1,
    startRealTime: 0,
    startMockTime: 0,
    injectHeaders: false,
    hudVisible: false,
    autoReload: false,
    theme: "light"
  };

  function readStoredState() {
    try {
      var raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return extend({}, currentState, parsed);
        }
      }
    } catch (e) {}
    return currentState;
  }

  function saveStoredState(state) {
    currentState = extend({}, currentState, state);
    window.__VELOX_TIME_TRAVEL_STATE__ = currentState;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    } catch (e) {}
  }

  currentState = readStoredState();
  window.__VELOX_TIME_TRAVEL_STATE__ = currentState;

  function getEffectiveNow() {
    if (!currentState.enabled || !currentState.startMockTime) {
      return OriginalDate.now ? OriginalDate.now() : (new OriginalDate()).getTime();
    }
    if (currentState.isFrozen) {
      return currentState.startMockTime;
    }
    var speed = currentState.speedMultiplier || 1;
    var realNow = OriginalDate.now ? OriginalDate.now() : (new OriginalDate()).getTime();
    var elapsedReal = realNow - (currentState.startRealTime || realNow);
    var elapsedMock = elapsedReal * speed;
    return Math.round(currentState.startMockTime + elapsedMock);
  }

  function getTimezoneParts(date, timezone) {
    if (!OriginalIntlDateTimeFormat) return null;
    try {
      var formatter = new OriginalIntlDateTimeFormat("en-GB", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        fractionalSecondDigits: 3,
        hour12: false,
        weekday: "short",
        timeZoneName: "longOffset"
      });
      var parts = formatter.formatToParts(date);
      var res = {};
      for (var i = 0; i < parts.length; i++) {
        res[parts[i].type] = parts[i].value;
      }
      return {
        year: parseInt(res.year, 10),
        month: parseInt(res.month, 10) - 1,
        day: parseInt(res.day, 10),
        hour: parseInt(res.hour, 10) === 24 ? 0 : parseInt(res.hour, 10),
        minute: parseInt(res.minute, 10),
        second: parseInt(res.second, 10),
        millisecond: res.fractionalSecond ? parseInt(res.fractionalSecond, 10) : 0,
        weekday: res.weekday || "Sun",
        offsetStr: res.timeZoneName || ""
      };
    } catch (e) {
      return null;
    }
  }

  function getOffsetMinutes(date, timezone) {
    if (!timezone) return date.getTimezoneOffset();
    try {
      var parts = getTimezoneParts(date, timezone);
      if (!parts || !parts.offsetStr) return date.getTimezoneOffset();
      if (parts.offsetStr === "GMT" || parts.offsetStr === "UTC") return 0;
      var match = parts.offsetStr.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
      if (!match) return 0;
      var sign = match[1] === "+" ? 1 : -1;
      var hours = parseInt(match[2], 10);
      var minutes = match[3] ? parseInt(match[3], 10) : 0;
      var offsetMinutes = sign * (hours * 60 + minutes);
      return -offsetMinutes; // Native JS: ahead of UTC has negative offset
    } catch (e) {
      return date.getTimezoneOffset();
    }
  }

  function parseWithTimezone(dateStr, timezone) {
    if (!timezone || typeof dateStr !== "string") {
      return OriginalDate.parse(dateStr);
    }
    if (/(?:[Zz]|UTC|GMT)$/i.test(dateStr) || /(?:[Zz]|UTC|GMT|:.*)\s*[+-]\d{1,2}(:?\d{1,2})?$/.test(dateStr)) {
      return OriginalDate.parse(dateStr);
    }
    var match = dateStr.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[T ](\d{1,2}):(\d{1,2})(?::(\d{1,2})(?:\.(\d+))?)?)?/);
    if (!match) {
      return OriginalDate.parse(dateStr);
    }
    var year = parseInt(match[1], 10);
    var month = parseInt(match[2], 10);
    var day = parseInt(match[3], 10);
    var hour = match[4] ? parseInt(match[4], 10) : 0;
    var min = match[5] ? parseInt(match[5], 10) : 0;
    var sec = match[6] ? parseInt(match[6], 10) : 0;
    var ms = match[7] ? parseInt(match[7].slice(0, 3), 10) : 0;

    var approxUtc = OriginalDate.UTC(year, month - 1, day, hour, min, sec, ms);
    try {
      var parts = getTimezoneParts(new OriginalDate(approxUtc), timezone);
      if (!parts) return approxUtc;
      var formattedUtc = OriginalDate.UTC(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond);
      var offsetDiff = formattedUtc - approxUtc;
      return approxUtc - offsetDiff;
    } catch (e) {
      return approxUtc;
    }
  }

  function overridePartOfDate(date, timezone, override) {
    var parts = getTimezoneParts(date, timezone);
    if (!parts) return date.setTime(NaN);
    var y = override.year !== undefined ? override.year : parts.year;
    var m = override.month !== undefined ? override.month : parts.month;
    var d = override.day !== undefined ? override.day : parts.day;
    var h = override.hour !== undefined ? override.hour : parts.hour;
    var min = override.minute !== undefined ? override.minute : parts.minute;
    var s = override.second !== undefined ? override.second : parts.second;
    var ms = override.ms !== undefined ? override.ms : parts.millisecond;

    var approxUtc = OriginalDate.UTC(y, m, d, h, min, s, ms);
    var checkParts = getTimezoneParts(new OriginalDate(approxUtc), timezone);
    if (checkParts) {
      var formattedUtc = OriginalDate.UTC(checkParts.year, checkParts.month, checkParts.day, checkParts.hour, checkParts.minute, checkParts.second, checkParts.millisecond);
      var offsetDiff = formattedUtc - approxUtc;
      return date.setTime(approxUtc - offsetDiff);
    }
    return date.setTime(approxUtc);
  }

  var weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var shortMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // ==========================================
  // FAKE DATE IMPLEMENTATION (ES5)
  // ==========================================
  function FakeDate() {
    var underlying;
    if (!(this instanceof FakeDate)) {
      return (new FakeDate()).toString();
    }

    if (arguments.length === 0) {
      underlying = new OriginalDate(getEffectiveNow());
    } else if (arguments.length === 1) {
      var arg = arguments[0];
      if (typeof arg === "string" && currentState.enabled && currentState.timezone) {
        var parsed = parseWithTimezone(arg, currentState.timezone);
        underlying = new OriginalDate(parsed);
      } else {
        underlying = new OriginalDate(arg);
      }
    } else if (arguments.length > 1 && typeof arguments[0] === "number") {
      if (currentState.enabled && currentState.timezone) {
        var yr = arguments[0];
        var mo = arguments[1] || 0;
        var dy = arguments[2] !== undefined ? arguments[2] : 1;
        var hr = arguments[3] || 0;
        var mn = arguments[4] || 0;
        var sc = arguments[5] || 0;
        var mls = arguments[6] || 0;
        var targetUtc = parseWithTimezone(yr + "-" + pad(mo + 1) + "-" + pad(dy) + "T" + pad(hr) + ":" + pad(mn) + ":" + pad(sc) + "." + padMs(mls), currentState.timezone);
        underlying = new OriginalDate(targetUtc);
      } else {
        var a = [];
        for (var i = 0; i < arguments.length; i++) {
          a.push(arguments[i]);
        }
        var bindArgs = [null].concat(a);
        underlying = new (Function.prototype.bind.apply(OriginalDate, bindArgs))();
      }
    } else {
      var b = [];
      for (var j = 0; j < arguments.length; j++) {
        b.push(arguments[j]);
      }
      var bArgs = [null].concat(b);
      underlying = new (Function.prototype.bind.apply(OriginalDate, bArgs))();
    }

    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(underlying, FakeDate.prototype);
    } else {
      underlying.__proto__ = FakeDate.prototype;
    }
    return underlying;
  }

  FakeDate.prototype = Object.create(OriginalDate.prototype);
  FakeDate.prototype.constructor = FakeDate;

  FakeDate.now = function () {
    return getEffectiveNow();
  };

  FakeDate.parse = function (str) {
    if (currentState.enabled && currentState.timezone) {
      return parseWithTimezone(str, currentState.timezone);
    }
    return OriginalDate.parse(str);
  };

  FakeDate.UTC = OriginalDate.UTC;

  // Prototype Overrides for Timezone awareness
  FakeDate.prototype.getTimezoneOffset = function () {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.getTimezoneOffset.call(this);
    }
    return getOffsetMinutes(this, currentState.timezone);
  };

  FakeDate.prototype.getFullYear = function () {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.getFullYear.call(this);
    }
    var parts = getTimezoneParts(this, currentState.timezone);
    return parts ? parts.year : OriginalDate.prototype.getFullYear.call(this);
  };

  FakeDate.prototype.getYear = function () {
    return this.getFullYear() - 1900;
  };

  FakeDate.prototype.getMonth = function () {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.getMonth.call(this);
    }
    var parts = getTimezoneParts(this, currentState.timezone);
    return parts ? parts.month : OriginalDate.prototype.getMonth.call(this);
  };

  FakeDate.prototype.getDate = function () {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.getDate.call(this);
    }
    var parts = getTimezoneParts(this, currentState.timezone);
    return parts ? parts.day : OriginalDate.prototype.getDate.call(this);
  };

  FakeDate.prototype.getDay = function () {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.getDay.call(this);
    }
    var parts = getTimezoneParts(this, currentState.timezone);
    if (!parts) return OriginalDate.prototype.getDay.call(this);
    var idx = weekdays.indexOf(parts.weekday);
    return idx >= 0 ? idx : OriginalDate.prototype.getDay.call(this);
  };

  FakeDate.prototype.getHours = function () {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.getHours.call(this);
    }
    var parts = getTimezoneParts(this, currentState.timezone);
    return parts ? parts.hour : OriginalDate.prototype.getHours.call(this);
  };

  FakeDate.prototype.getMinutes = function () {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.getMinutes.call(this);
    }
    var parts = getTimezoneParts(this, currentState.timezone);
    return parts ? parts.minute : OriginalDate.prototype.getMinutes.call(this);
  };

  FakeDate.prototype.getSeconds = function () {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.getSeconds.call(this);
    }
    var parts = getTimezoneParts(this, currentState.timezone);
    return parts ? parts.second : OriginalDate.prototype.getSeconds.call(this);
  };

  FakeDate.prototype.getMilliseconds = function () {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.getMilliseconds.call(this);
    }
    var parts = getTimezoneParts(this, currentState.timezone);
    return parts ? parts.millisecond : OriginalDate.prototype.getMilliseconds.call(this);
  };

  // Local Time Setters
  FakeDate.prototype.setFullYear = function (year, month, date) {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.setFullYear.apply(this, arguments);
    }
    return overridePartOfDate(this, currentState.timezone, {
      year: year,
      month: month,
      day: date
    });
  };

  FakeDate.prototype.setMonth = function (month, date) {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.setMonth.apply(this, arguments);
    }
    return overridePartOfDate(this, currentState.timezone, {
      month: month,
      day: date
    });
  };

  FakeDate.prototype.setDate = function (date) {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.setDate.call(this, date);
    }
    return overridePartOfDate(this, currentState.timezone, {
      day: date
    });
  };

  FakeDate.prototype.setHours = function (hours, min, sec, ms) {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.setHours.apply(this, arguments);
    }
    return overridePartOfDate(this, currentState.timezone, {
      hour: hours,
      minute: min,
      second: sec,
      ms: ms
    });
  };

  FakeDate.prototype.setMinutes = function (min, sec, ms) {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.setMinutes.apply(this, arguments);
    }
    return overridePartOfDate(this, currentState.timezone, {
      minute: min,
      second: sec,
      ms: ms
    });
  };

  FakeDate.prototype.setSeconds = function (sec, ms) {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.setSeconds.apply(this, arguments);
    }
    return overridePartOfDate(this, currentState.timezone, {
      second: sec,
      ms: ms
    });
  };

  FakeDate.prototype.setMilliseconds = function (ms) {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.setMilliseconds.call(this, ms);
    }
    return overridePartOfDate(this, currentState.timezone, {
      ms: ms
    });
  };

  // Locale and String representations
  FakeDate.prototype.toLocaleString = function (locales, options) {
    if (currentState.enabled && currentState.timezone && (!options || !options.timeZone)) {
      options = extend({}, options, { timeZone: currentState.timezone });
    }
    return OriginalDate.prototype.toLocaleString.call(this, locales, options);
  };

  FakeDate.prototype.toLocaleDateString = function (locales, options) {
    if (currentState.enabled && currentState.timezone && (!options || !options.timeZone)) {
      options = extend({}, options, { timeZone: currentState.timezone });
    }
    return OriginalDate.prototype.toLocaleDateString.call(this, locales, options);
  };

  FakeDate.prototype.toLocaleTimeString = function (locales, options) {
    if (currentState.enabled && currentState.timezone && (!options || !options.timeZone)) {
      options = extend({}, options, { timeZone: currentState.timezone });
    }
    return OriginalDate.prototype.toLocaleTimeString.call(this, locales, options);
  };

  FakeDate.prototype.toString = function () {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.toString.call(this);
    }
    try {
      var parts = getTimezoneParts(this, currentState.timezone);
      if (!parts) return OriginalDate.prototype.toString.call(this);
      var monthName = shortMonths[parts.month];
      var offset = (parts.offsetStr || "").replace(":", "");
      if (offset === "GMT" || offset === "UTC") offset = "GMT+0000";
      return parts.weekday + " " + monthName + " " + pad(parts.day) + " " + parts.year + " " +
        pad(parts.hour) + ":" + pad(parts.minute) + ":" + pad(parts.second) + " " +
        offset + " (" + currentState.timezone + ")";
    } catch (e) {
      return OriginalDate.prototype.toString.call(this);
    }
  };

  FakeDate.prototype.toDateString = function () {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.toDateString.call(this);
    }
    try {
      var parts = getTimezoneParts(this, currentState.timezone);
      if (!parts) return OriginalDate.prototype.toDateString.call(this);
      var monthName = shortMonths[parts.month];
      return parts.weekday + " " + monthName + " " + pad(parts.day) + " " + parts.year;
    } catch (e) {
      return OriginalDate.prototype.toDateString.call(this);
    }
  };

  FakeDate.prototype.toTimeString = function () {
    if (!currentState.enabled || !currentState.timezone) {
      return OriginalDate.prototype.toTimeString.call(this);
    }
    try {
      var parts = getTimezoneParts(this, currentState.timezone);
      if (!parts) return OriginalDate.prototype.toTimeString.call(this);
      var offset = (parts.offsetStr || "").replace(":", "");
      if (offset === "GMT" || offset === "UTC") offset = "GMT+0000";
      return pad(parts.hour) + ":" + pad(parts.minute) + ":" + pad(parts.second) + " " +
        offset + " (" + currentState.timezone + ")";
    } catch (e) {
      return OriginalDate.prototype.toTimeString.call(this);
    }
  };

  // Static prototype connection
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(FakeDate, OriginalDate);
  } else {
    FakeDate.__proto__ = OriginalDate;
  }

  // Copy own properties from original prototype so libraries like date-fns / dayjs work
  try {
    var ownProps = Object.getOwnPropertyNames(OriginalDate.prototype);
    for (var p = 0; p < ownProps.length; p++) {
      var prop = ownProps[p];
      if (!Object.prototype.hasOwnProperty.call(FakeDate.prototype, prop)) {
        try {
          var desc = Object.getOwnPropertyDescriptor(OriginalDate.prototype, prop);
          if (desc) Object.defineProperty(FakeDate.prototype, prop, desc);
        } catch (e) {}
      }
    }
  } catch (e) {}

  // ==========================================
  // INTL.DATETIMEFORMAT OVERRIDE (ES5)
  // ==========================================
  function FakeIntlDateTimeFormat(locales, options) {
    if (!OriginalIntlDateTimeFormat) return null;
    var opts = extend({}, options);
    if (currentState.enabled && currentState.timezone && !opts.timeZone) {
      opts.timeZone = currentState.timezone;
    }
    var instance = new OriginalIntlDateTimeFormat(locales, opts);
    if (currentState.enabled && currentState.timezone) {
      var origResolved = instance.resolvedOptions;
      instance.resolvedOptions = function () {
        var res = origResolved.call(instance);
        res.timeZone = currentState.timezone;
        return res;
      };
    }
    return instance;
  }
  if (OriginalIntlDateTimeFormat) {
    FakeIntlDateTimeFormat.prototype = OriginalIntlDateTimeFormat.prototype;
    FakeIntlDateTimeFormat.supportedLocalesOf = OriginalIntlDateTimeFormat.supportedLocalesOf;
  }

  // ==========================================
  // PERFORMANCE.NOW OVERRIDE (ES5 - RECURSION SAFE)
  // ==========================================
  var perfStartReal = getRealPerformanceNow();
  var perfStartMock = perfStartReal;

  function fakePerformanceNow() {
    if (!currentState.enabled || !nativePerformanceNowMethod) {
      return getRealPerformanceNow();
    }
    if (currentState.isFrozen) {
      return perfStartMock;
    }
    var speed = currentState.speedMultiplier || 1;
    var elapsedReal = getRealPerformanceNow() - perfStartReal;
    return perfStartMock + elapsedReal * speed;
  }

  // ==========================================
  // SAFE NETWORK HEADERS INJECTION (ES5)
  // ==========================================
  function isSameOrigin(url) {
    if (!url) return false;
    var urlStr = typeof url === "string" ? url : (url.url || "");
    if (!urlStr) return false;
    if (urlStr.indexOf("/") === 0 && urlStr.indexOf("//") !== 0) return true;
    try {
      var parsed = new URL(urlStr, window.location.href);
      return parsed.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  var networkPatched = false;
  function patchNetworkHeaders() {
    if (networkPatched) return;
    networkPatched = true;

    if (OriginalFetch) {
      window.fetch = function (input, init) {
        if (!currentState.enabled || !currentState.injectHeaders) {
          return OriginalFetch.apply(window, arguments);
        }
        // ONLY attach headers to same-origin requests to prevent CORS errors on external APIs!
        if (isSameOrigin(input)) {
          init = init || {};
          var headers = new Headers(init.headers || {});
          var mockNow = getEffectiveNow();
          headers.set("X-Mock-Date", (new OriginalDate(mockNow)).toISOString());
          headers.set("X-Mock-Timestamp", String(mockNow));
          if (currentState.timezone) {
            headers.set("X-Mock-Timezone", currentState.timezone);
          }
          headers.set("X-Mock-Speed", String(currentState.speedMultiplier || 1));
          init.headers = headers;
        }
        return OriginalFetch.call(window, input, init);
      };
    }

    if (OriginalXHR) {
      var origOpen = OriginalXHR.prototype.open;
      var origSend = OriginalXHR.prototype.send;

      OriginalXHR.prototype.open = function (method, url) {
        this._veloxIsSameOrigin = isSameOrigin(url);
        return origOpen.apply(this, arguments);
      };

      OriginalXHR.prototype.send = function () {
        if (currentState.enabled && currentState.injectHeaders && this._veloxIsSameOrigin) {
          try {
            var mockNow = getEffectiveNow();
            this.setRequestHeader("X-Mock-Date", (new OriginalDate(mockNow)).toISOString());
            this.setRequestHeader("X-Mock-Timestamp", String(mockNow));
            if (currentState.timezone) {
              this.setRequestHeader("X-Mock-Timezone", currentState.timezone);
            }
            this.setRequestHeader("X-Mock-Speed", String(currentState.speedMultiplier || 1));
          } catch (e) {}
        }
        return origSend.apply(this, arguments);
      };
    }
  }

  // ==========================================
  // APPLY / REMOVE PATCHES
  // ==========================================
  function applyPatches() {
    if (currentState.enabled) {
      window.Date = FakeDate;
      try {
        if (typeof globalThis !== "undefined") {
          globalThis.Date = FakeDate;
        }
      } catch (e) {}
      try {
        Date = FakeDate;
      } catch (e) {}

      if (OriginalIntlDateTimeFormat) {
        window.Intl.DateTimeFormat = FakeIntlDateTimeFormat;
        try {
          if (typeof globalThis !== "undefined" && globalThis.Intl) {
            globalThis.Intl.DateTimeFormat = FakeIntlDateTimeFormat;
          }
        } catch (e) {}
      }
      if (nativePerformance && nativePerformanceNowMethod) {
        nativePerformance.now = fakePerformanceNow;
      }
      patchNetworkHeaders();
    } else {
      window.Date = OriginalDate;
      try {
        if (typeof globalThis !== "undefined") {
          globalThis.Date = OriginalDate;
        }
      } catch (e) {}
      try {
        Date = OriginalDate;
      } catch (e) {}

      if (OriginalIntlDateTimeFormat) {
        window.Intl.DateTimeFormat = OriginalIntlDateTimeFormat;
        try {
          if (typeof globalThis !== "undefined" && globalThis.Intl) {
            globalThis.Intl.DateTimeFormat = OriginalIntlDateTimeFormat;
          }
        } catch (e) {}
      }
      if (nativePerformance && nativePerformanceNowMethod) {
        nativePerformance.now = nativePerformanceNowMethod;
      }
    }
    updateHud();
  }

  // ==========================================
  // IN-PAGE FLOATING HUD (SHADOW DOM - ES5)
  // ==========================================
  var hudHost = null;
  var hudShadow = null;
  var hudInterval = null;
  var hudDomListenerAttached = false;

  function updateHud() {
    // 1. GUARD: Floating HUD must ONLY exist in the top-level window.
    // Iframes (chat widgets, embeds, auth frames) must never display a floating HUD.
    if (window !== window.top) {
      var straySubFrameHost = document.getElementById("velox-time-travel-hud-host");
      if (straySubFrameHost && straySubFrameHost.parentNode) {
        straySubFrameHost.parentNode.removeChild(straySubFrameHost);
      }
      return;
    }

    // 2. TEARDOWN: If time travel is disabled or HUD is toggled off
    if (!currentState.enabled || !currentState.hudVisible) {
      var existingHosts = document.querySelectorAll("#velox-time-travel-hud-host");
      for (var i = 0; i < existingHosts.length; i++) {
        if (existingHosts[i].parentNode) {
          existingHosts[i].parentNode.removeChild(existingHosts[i]);
        }
      }
      if (hudHost && hudHost.parentNode) {
        hudHost.parentNode.removeChild(hudHost);
      }
      hudHost = null;
      hudShadow = null;
      if (hudInterval) {
        clearInterval(hudInterval);
        hudInterval = null;
      }
      return;
    }

    // 3. WAIT FOR DOM: If document.body is not yet ready (e.g. at document_start)
    if (!document.body) {
      if (!hudDomListenerAttached && document.readyState === "loading") {
        hudDomListenerAttached = true;
        document.addEventListener("DOMContentLoaded", function () {
          updateHud();
        });
      }
      return;
    }

    // 4. DEDUPLICATE: Ensure only ONE HUD host element exists in document
    var docHosts = document.querySelectorAll("#velox-time-travel-hud-host");
    if (docHosts.length > 1) {
      for (var d = 1; d < docHosts.length; d++) {
        if (docHosts[d].parentNode) {
          docHosts[d].parentNode.removeChild(docHosts[d]);
        }
      }
    }

    if (docHosts.length > 0) {
      hudHost = docHosts[0];
      hudShadow = hudHost.shadowRoot || hudHost;
    }

    // 5. CREATE: If no HUD host exists in DOM, create and mount it
    if (!hudHost) {
      hudHost = document.createElement("div");
      hudHost.id = "velox-time-travel-hud-host";
      hudHost.style.position = "fixed";
      hudHost.style.bottom = "20px";
      hudHost.style.right = "20px";
      hudHost.style.zIndex = "2147483647";
      hudHost.style.userSelect = "none";
      hudHost.style.webkitUserSelect = "none";
      hudHost.style.lineHeight = "normal";

      if (hudHost.attachShadow) {
        hudShadow = hudHost.attachShadow({ mode: "open" });
      } else {
        hudShadow = hudHost;
      }

      var style = document.createElement("style");
      style.textContent = [
        ".velox-hud {",
        "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
        "  font-size: 13px;",
        "  display: flex;",
        "  align-items: center;",
        "  gap: 8px;",
        "  cursor: grab;",
        "  backdrop-filter: blur(10px);",
        "  -webkit-backdrop-filter: blur(10px);",
        "  white-space: nowrap;",
        "  border-radius: 9999px;",
        "  padding: 5px 12px;",
        "  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;",
        "}",
        "/* Dark theme */",
        ".velox-hud.velox-theme-dark {",
        "  background: #0f1115;",
        "  color: #f3f4f6;",
        "  border: 1px solid #232834;",
        "  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 2px 8px rgba(0, 0, 0, 0.4);",
        "}",
        ".velox-hud.velox-theme-dark:hover { border-color: #3b4457; }",
        ".velox-hud.velox-theme-dark .velox-badge {",
        "  background: #191d26;",
        "  color: #cbd3e1;",
        "  border: 1px solid #2c3444;",
        "}",
        ".velox-hud.velox-theme-dark .velox-time { color: #ffffff; }",
        ".velox-hud.velox-theme-dark .velox-btn {",
        "  background: #1a1e28;",
        "  color: #c9d0dc;",
        "  border: 1px solid #2d3647;",
        "}",
        ".velox-hud.velox-theme-dark .velox-btn:hover {",
        "  background: #272f3e;",
        "  border-color: #3f4b62;",
        "  color: #ffffff;",
        "}",
        ".velox-hud.velox-theme-dark .velox-btn:active { background: #313b4e; }",
        ".velox-hud.velox-theme-dark .velox-btn-close { color: #798394; }",
        ".velox-hud.velox-theme-dark .velox-btn-close:hover { color: #f87171; }",
        "/* Light theme */",
        ".velox-hud.velox-theme-light {",
        "  background: #ffffff;",
        "  color: #0f1115;",
        "  border: 1px solid #d4d8e0;",
        "  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);",
        "}",
        ".velox-hud.velox-theme-light:hover { border-color: #b0b8c6; }",
        ".velox-hud.velox-theme-light .velox-badge {",
        "  background: #f0f2f5;",
        "  color: #384252;",
        "  border: 1px solid #d4d8e0;",
        "}",
        ".velox-hud.velox-theme-light .velox-time { color: #0f1115; }",
        ".velox-hud.velox-theme-light .velox-btn {",
        "  background: #f4f6f8;",
        "  color: #384252;",
        "  border: 1px solid #d4d8e0;",
        "}",
        ".velox-hud.velox-theme-light .velox-btn:hover {",
        "  background: #e5e9f0;",
        "  border-color: #b8c2d1;",
        "  color: #0f1115;",
        "}",
        ".velox-hud.velox-theme-light .velox-btn:active { background: #d8e0ec; }",
        ".velox-hud.velox-theme-light .velox-btn-close { color: #8c93a0; }",
        ".velox-hud.velox-theme-light .velox-btn-close:hover { color: #ef4444; }",
        "/* Shared elements */",
        ".velox-badge {",
        "  font-weight: 600;",
        "  font-size: 11px;",
        "  padding: 2px 7px;",
        "  border-radius: 9999px;",
        "  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;",
        "  letter-spacing: 0.2px;",
        "}",
        ".velox-time {",
        "  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;",
        "  font-weight: 600;",
        "  font-size: 13px;",
        "  letter-spacing: 0.5px;",
        "}",
        ".velox-btn {",
        "  border-radius: 6px;",
        "  padding: 3px 8px;",
        "  font-size: 11px;",
        "  font-weight: 600;",
        "  cursor: pointer;",
        "  font-family: inherit;",
        "  transition: background 0.15s, border-color 0.15s, color 0.15s;",
        "}",
        ".velox-btn-close {",
        "  background: transparent;",
        "  border: none;",
        "  cursor: pointer;",
        "  font-size: 16px;",
        "  line-height: 1;",
        "  padding: 2px 4px;",
        "  border-radius: 4px;",
        "  display: flex;",
        "  align-items: center;",
        "  justify-content: center;",
        "  transition: color 0.15s;",
        "}"
      ].join(" ");
      hudShadow.appendChild(style);

      var container = document.createElement("div");
      var initialThemeClass = (currentState.theme === "light") ? "velox-theme-light" : "velox-theme-dark";
      container.className = "velox-hud " + initialThemeClass;

      var badge = document.createElement("span");
      badge.className = "velox-badge";
      badge.id = "hudBadge";
      badge.textContent = "VeloX";

      var time = document.createElement("span");
      time.className = "velox-time";
      time.id = "hudTime";
      time.textContent = "--:--:--";

      var btnFreezeEl = document.createElement("button");
      btnFreezeEl.className = "velox-btn";
      btnFreezeEl.id = "hudBtnFreeze";
      btnFreezeEl.textContent = "Freeze";

      var btnResetEl = document.createElement("button");
      btnResetEl.className = "velox-btn";
      btnResetEl.id = "hudBtnReset";
      btnResetEl.textContent = "Reset";

      var btnCloseEl = document.createElement("button");
      btnCloseEl.className = "velox-btn-close";
      btnCloseEl.id = "hudBtnClose";
      btnCloseEl.title = "Hide HUD";
      btnCloseEl.textContent = "×";

      container.appendChild(badge);
      container.appendChild(time);
      container.appendChild(btnFreezeEl);
      container.appendChild(btnResetEl);
      container.appendChild(btnCloseEl);
      hudShadow.appendChild(container);

      var btnFreeze = hudShadow.getElementById("hudBtnFreeze");
      var btnReset = hudShadow.getElementById("hudBtnReset");
      var btnClose = hudShadow.getElementById("hudBtnClose");

      btnFreeze.addEventListener("click", function (e) {
        e.stopPropagation();
        window.__veloxTimeTravel.setFrozen(!currentState.isFrozen);
      });

      btnReset.addEventListener("click", function (e) {
        e.stopPropagation();
        window.__veloxTimeTravel.reset();
      });

      btnClose.addEventListener("click", function (e) {
        e.stopPropagation();
        window.__veloxTimeTravel.setHudVisible(false);
      });

      // Draggable HUD with viewport clamping
      var isDragging = false;
      var startX = 0;
      var startY = 0;

      container.addEventListener("mousedown", function (e) {
        if (e.target && e.target.tagName === "BUTTON") {
          return;
        }
        isDragging = true;
        var rect = hudHost.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        container.style.cursor = "grabbing";
        e.preventDefault();
      });

      document.addEventListener("mousemove", function (e) {
        if (!isDragging || !hudHost) return;
        var hostWidth = hudHost.offsetWidth || 280;
        var hostHeight = hudHost.offsetHeight || 38;
        var maxLeft = Math.max(0, (window.innerWidth || document.documentElement.clientWidth) - hostWidth - 8);
        var maxTop = Math.max(0, (window.innerHeight || document.documentElement.clientHeight) - hostHeight - 8);
        var newLeft = Math.max(8, Math.min(maxLeft, e.clientX - startX));
        var newTop = Math.max(8, Math.min(maxTop, e.clientY - startY));

        hudHost.style.bottom = "auto";
        hudHost.style.right = "auto";
        hudHost.style.left = newLeft + "px";
        hudHost.style.top = newTop + "px";
      });

      document.addEventListener("mouseup", function () {
        if (isDragging) {
          isDragging = false;
          if (container) {
            container.style.cursor = "grab";
          }
        }
      });

      document.body.appendChild(hudHost);
    }

    // 6. UPDATE CONTENT: Update badge, freeze label, theme mode and initial time display
    if (hudShadow) {
      var containerEl = hudShadow.querySelector(".velox-hud");
      if (containerEl) {
        var activeThemeClass = (currentState.theme === "light") ? "velox-theme-light" : "velox-theme-dark";
        containerEl.className = "velox-hud " + activeThemeClass;
      }
      var badge = hudShadow.getElementById("hudBadge");
      var btnFreezeEl = hudShadow.getElementById("hudBtnFreeze");
      var timeEl = hudShadow.getElementById("hudTime");

      if (badge) {
        if (currentState.timezone && currentState.timezone !== "System Default") {
          var tzName = currentState.timezone.split("/").pop().replace(/_/g, " ");
          badge.textContent = tzName.length > 12 ? tzName.substring(0, 11) + "\u2026" : tzName;
        } else {
          badge.textContent = currentState.isFrozen ? "Frozen" : "Active";
        }
      }
      if (btnFreezeEl) {
        btnFreezeEl.textContent = currentState.isFrozen ? "Resume" : "Freeze";
      }
      if (timeEl) {
        var initialDate = new FakeDate();
        timeEl.textContent = initialDate.toLocaleTimeString();
      }
    }

    // 7. TICKER: Run timer interval to keep HUD clock in sync with FakeDate
    if (!hudInterval) {
      hudInterval = setInterval(function () {
        if (!hudShadow) return;
        var tickTimeEl = hudShadow.getElementById("hudTime");
        if (tickTimeEl) {
          var now = new FakeDate();
          tickTimeEl.textContent = now.toLocaleTimeString();
        }
      }, 500);
    }
  }

  // ==========================================
  // CONSOLE API (window.__veloxTimeTravel)
  // ==========================================
  window.__veloxTimeTravel = {
    getState: function () {
      return extend({}, currentState);
    },
    enable: function () {
      saveStoredState({ enabled: true });
      applyPatches();
      document.dispatchEvent(new CustomEvent(STATE_EVENT));
    },
    disable: function () {
      saveStoredState({ enabled: false });
      applyPatches();
      document.dispatchEvent(new CustomEvent(STATE_EVENT));
    },
    setTime: function (dateOrIso) {
      var ts = typeof dateOrIso === "number" ? dateOrIso : parseWithTimezone(dateOrIso, currentState.timezone);
      if (isNaN(ts)) return false;
      var nowMs = (new OriginalDate()).getTime();
      saveStoredState({
        enabled: true,
        startMockTime: ts,
        startRealTime: nowMs,
        targetIso: (new OriginalDate(ts)).toISOString()
      });
      applyPatches();
      document.dispatchEvent(new CustomEvent(STATE_EVENT));
      return true;
    },
    setTimezone: function (tz) {
      saveStoredState({ timezone: tz || "" });
      applyPatches();
      document.dispatchEvent(new CustomEvent(STATE_EVENT));
    },
    setSpeed: function (multiplier) {
      var speed = parseFloat(multiplier) || 1;
      var currentMock = getEffectiveNow();
      var nowMs = (new OriginalDate()).getTime();
      saveStoredState({
        speedMultiplier: speed,
        startMockTime: currentMock,
        startRealTime: nowMs
      });
      applyPatches();
      document.dispatchEvent(new CustomEvent(STATE_EVENT));
    },
    setFrozen: function (freeze) {
      var currentMock = getEffectiveNow();
      var nowMs = (new OriginalDate()).getTime();
      saveStoredState({
        isFrozen: !!freeze,
        startMockTime: currentMock,
        startRealTime: nowMs
      });
      applyPatches();
      document.dispatchEvent(new CustomEvent(STATE_EVENT));
    },
    jump: function (delta) {
      var ms = 0;
      if (typeof delta === "number") {
        ms = delta;
      } else if (typeof delta === "string") {
        if (delta === "+15m") ms = 15 * 60 * 1000;
        else if (delta === "+1h") ms = 60 * 60 * 1000;
        else if (delta === "-1h") ms = -60 * 60 * 1000;
        else if (delta === "+1d") ms = 24 * 60 * 60 * 1000;
        else if (delta === "-1d") ms = -24 * 60 * 60 * 1000;
        else if (delta === "+7d") ms = 7 * 24 * 60 * 60 * 1000;
      }
      var newMock = getEffectiveNow() + ms;
      var nowMs = (new OriginalDate()).getTime();
      saveStoredState({
        startMockTime: newMock,
        startRealTime: nowMs,
        targetIso: (new OriginalDate(newMock)).toISOString()
      });
      applyPatches();
      document.dispatchEvent(new CustomEvent(STATE_EVENT));
    },
    setHudVisible: function (visible) {
      saveStoredState({ hudVisible: !!visible });
      updateHud();
      document.dispatchEvent(new CustomEvent(STATE_EVENT));
    },
    reset: function () {
      saveStoredState({
        enabled: false,
        isFrozen: false,
        speedMultiplier: 1,
        startMockTime: 0,
        startRealTime: 0
      });
      applyPatches();
      document.dispatchEvent(new CustomEvent(STATE_EVENT));
    }
  };

  // Cross-world event listener: reads from sessionStorage safely without object cloning barriers
  document.addEventListener(STATE_EVENT, function () {
    currentState = readStoredState();
    window.__VELOX_TIME_TRAVEL_STATE__ = currentState;
    applyPatches();
  });

  // Cross-context HTML5 postMessage listener for guaranteed delivery across worlds
  window.addEventListener("message", function (event) {
    if (!event || !event.data) return;
    if (event.data.type === "VELOX_STATE_CHANGE") {
      try {
        var newState = typeof event.data.state === "string" ? JSON.parse(event.data.state) : event.data.state;
        if (newState && typeof newState === "object") {
          currentState = extend({}, currentState, newState);
          window.__VELOX_TIME_TRAVEL_STATE__ = currentState;
          applyPatches();
        }
      } catch (e) {}
    }
  });

  window.addEventListener("pagehide", function () {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
    } catch (e) {}
  });

  if (currentState.enabled) {
    applyPatches();
  }
})();
