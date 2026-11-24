/**
 * VeloX Time Travel - Time Engine & Utilities (ES5 Compatible)
 */
(function (root) {
  "use strict";

  root.VeloX = root.VeloX || {};

  var STORAGE_KEY = "__VELOX_TIME_TRAVEL_STATE__";
  var STATE_EVENT = "velox:time-travel-state-change";

  var DEFAULT_STATE = {
    enabled: false,
    mode: "simple", // "simple" | "advanced"
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

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function computeEffectiveTime(state) {
    if (!state || !state.enabled || !state.startMockTime) {
      return (new Date()).getTime();
    }
    if (state.isFrozen) {
      return state.startMockTime;
    }
    var speed = state.speedMultiplier || 1;
    var nowMs = (new Date()).getTime();
    var elapsedReal = nowMs - (state.startRealTime || nowMs);
    var elapsedMock = elapsedReal * speed;
    return Math.round(state.startMockTime + elapsedMock);
  }

  function formatForInput(dateOrMs, timezone) {
    var d = typeof dateOrMs === "number" ? new Date(dateOrMs) : dateOrMs;
    if (!d || isNaN(d.getTime())) return "";

    if (!timezone) {
      var y = d.getFullYear();
      var m = pad(d.getMonth() + 1);
      var day = pad(d.getDate());
      var h = pad(d.getHours());
      var min = pad(d.getMinutes());
      var sec = pad(d.getSeconds());
      return y + "-" + m + "-" + day + " " + h + ":" + min + ":" + sec;
    }

    try {
      var formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      var parts = formatter.formatToParts(d);
      var p = {};
      for (var i = 0; i < parts.length; i++) {
        p[parts[i].type] = parts[i].value;
      }
      var hour = p.hour === "24" ? "00" : p.hour;
      return p.year + "-" + p.month + "-" + p.day + " " + hour + ":" + p.minute + ":" + p.second;
    } catch (e) {
      return d.toISOString().slice(0, 19).replace("T", " ");
    }
  }

  function parseDateTimeComponents(str) {
    if (!str) return null;
    var s = String(str).trim();
    if (!s) return null;

    var isPm = /\bpm\b/i.test(s);
    var isAm = /\bam\b/i.test(s);
    s = s.replace(/\s*(am|pm)\s*/i, "").trim();

    // Normalize delimiters inside time: ' : ' or ' . ' to ':'
    s = s.replace(/\s*[:.]\s*/g, ":");
    // Normalize ' / ' or ' - ' to '-'
    s = s.replace(/\s*[\/\-]\s*/g, "-");
    // Remove comma and collapse spaces
    s = s.replace(/,/g, " ").replace(/\s+/g, " ");

    var year = 0, month = 0, day = 0, hour = 0, min = 0, sec = 0;

    var isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s]+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?/);
    if (isoMatch) {
      year = parseInt(isoMatch[1], 10);
      month = parseInt(isoMatch[2], 10) - 1;
      day = parseInt(isoMatch[3], 10);
      hour = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
      min = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
      sec = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
    } else {
      var dmyMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:[T\s]+(\d{1,2})(?::(\d{1,2}))?(?::(\d{1,2}))?)?/);
      if (dmyMatch) {
        var p1 = parseInt(dmyMatch[1], 10);
        var p2 = parseInt(dmyMatch[2], 10);
        year = parseInt(dmyMatch[3], 10);
        if (p1 > 12) {
          day = p1;
          month = p2 - 1;
        } else if (p2 > 12) {
          month = p1 - 1;
          day = p2;
        } else {
          day = p1;
          month = p2 - 1;
        }
        hour = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
        min = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
        sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
      } else {
        var d = new Date(str);
        if (!isNaN(d.getTime())) {
          return {
            year: d.getFullYear(),
            month: d.getMonth(),
            day: d.getDate(),
            hour: d.getHours(),
            min: d.getMinutes(),
            sec: d.getSeconds()
          };
        }
        return null;
      }
    }

    if (isPm && hour < 12) hour += 12;
    if (isAm && hour === 12) hour = 0;

    return {
      year: year,
      month: month,
      day: day,
      hour: hour,
      min: min,
      sec: sec
    };
  }

  function parseInputWithTimezone(inputStr, timezone) {
    if (!inputStr) return null;

    var parts = parseDateTimeComponents(inputStr);
    if (!parts) return null;

    if (!timezone) {
      var localDate = new Date(parts.year, parts.month, parts.day, parts.hour, parts.min, parts.sec);
      return isNaN(localDate.getTime()) ? null : localDate.getTime();
    }

    var approxUtc = Date.UTC(parts.year, parts.month, parts.day, parts.hour, parts.min, parts.sec);

    try {
      var formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: timezone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false
      });

      var fParts = formatter.formatToParts(new Date(approxUtc));
      var p = {};
      for (var i = 0; i < fParts.length; i++) {
        p[fParts[i].type] = parseInt(fParts[i].value, 10);
      }
      var formattedHour = p.hour === 24 ? 0 : p.hour;
      var formattedLocalAsUtc = Date.UTC(p.year, p.month - 1, p.day, formattedHour, p.minute, p.second);
      var offsetMs = formattedLocalAsUtc - approxUtc;

      return approxUtc - offsetMs;
    } catch (e) {
      return approxUtc;
    }
  }

  function calculateJump(currentMs, jumpKey) {
    var ONE_MIN = 60 * 1000;
    var ONE_HOUR = 60 * ONE_MIN;
    var ONE_DAY = 24 * ONE_HOUR;

    switch (jumpKey) {
      case "+15m": return currentMs + 15 * ONE_MIN;
      case "+1h":  return currentMs + ONE_HOUR;
      case "+1d":  return currentMs + ONE_DAY;
      case "+7d":  return currentMs + 7 * ONE_DAY;
      case "+30d": return currentMs + 30 * ONE_DAY;
      case "-1h":  return currentMs - ONE_HOUR;
      case "-1d":  return currentMs - ONE_DAY;
      default:     return currentMs;
    }
  }

  var PRESETS = [
    {
      id: "leap-year",
      title: "Leap Day",
      badge: "Calendar",
      desc: "Feb 29, 2028 12:00",
      dateStr: "2028-02-29T12:00:00",
      timezone: ""
    },
    {
      id: "year-end",
      title: "Year-End (New Year Eve)",
      badge: "Boundary",
      desc: "Dec 31, 2026 23:59:50 (10s to midnight)",
      dateStr: "2026-12-31T23:59:50",
      timezone: ""
    },
    {
      id: "london-dst",
      title: "London DST Jump",
      badge: "DST",
      desc: "Mar 29, 2026 00:59:55 (5s before 1hr jump)",
      dateStr: "2026-03-29T00:59:55",
      timezone: "Europe/London"
    },
    {
      id: "ny-dst",
      title: "New York DST Jump",
      badge: "DST",
      desc: "Mar 8, 2026 01:59:55 (5s before 1hr jump)",
      dateStr: "2026-03-08T01:59:55",
      timezone: "America/New_York"
    },
    {
      id: "jwt-expired",
      title: "Token Expiry (+1 Hour)",
      badge: "Auth",
      desc: "Jump 1 hour from now",
      relativeMs: 3600000
    },
    {
      id: "trial-expired",
      title: "Trial Expiry (+14 Days)",
      badge: "Billing",
      desc: "Jump 14 days from now",
      relativeMs: 14 * 24 * 3600000
    }
  ];

  root.VeloX.TimeEngine = {
    STORAGE_KEY: STORAGE_KEY,
    STATE_EVENT: STATE_EVENT,
    DEFAULT_STATE: DEFAULT_STATE,
    computeEffectiveTime: computeEffectiveTime,
    formatForInput: formatForInput,
    parseInputWithTimezone: parseInputWithTimezone,
    parseDateTimeComponents: parseDateTimeComponents,
    calculateJump: calculateJump,
    PRESETS: PRESETS
  };
})(typeof window !== "undefined" ? window : this);
