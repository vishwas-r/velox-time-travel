/**
 * VeloX Time Travel - Popup Controller (ES5 Compatible)
 * Direction A: Obsidian Monochrome with Light/Dark Theme & Developer Precision.
 */
(function () {
  "use strict";

  var Timezones = window.VeloX.Timezones;
  var TimeEngine = window.VeloX.TimeEngine;

  var masterToggle = document.getElementById("masterToggle");
  var themeToggleBtn = document.getElementById("themeToggleBtn");
  var statusDot = document.getElementById("statusDot");
  var statusText = document.getElementById("statusText");
  var liveTickerTime = document.getElementById("liveTickerTime");
  var heroTzLabel = document.getElementById("heroTzLabel");
  var heroDeltaLabel = document.getElementById("heroDeltaLabel");
  var heroDeltaSeparator = document.getElementById("heroDeltaSeparator");

  var modeSimple = document.getElementById("modeSimple");
  var modeAdvanced = document.getElementById("modeAdvanced");
  var simpleSection = document.getElementById("simpleSection");
  var advancedSection = document.getElementById("advancedSection");

  var targetDateTime = document.getElementById("targetDateTime");
  var btnToggleCalendar = document.getElementById("btnToggleCalendar");
  var tzOffsetBadge = document.getElementById("tzOffsetBadge");
  var timezoneSelect = document.getElementById("timezoneSelect");
  var btnMatchIp = document.getElementById("btnMatchIp");
  var freezeClockToggle = document.getElementById("freezeClockToggle");
  var autoReloadToggle = document.getElementById("autoReloadToggle");
  var btnApply = document.getElementById("btnApply");
  var btnReset = document.getElementById("btnReset");

  var speedBadge = document.getElementById("speedBadge");
  var speedButtons = document.querySelectorAll(".btn-speed");
  var timelineScrubber = document.getElementById("timelineScrubber");
  var scrubberOffsetDisplay = document.getElementById("scrubberOffsetDisplay");
  var presetContainer = document.getElementById("presetContainer");
  var hudToggle = document.getElementById("hudToggle");
  var headerToggle = document.getElementById("headerToggle");
  var btnOpenSidePanel = document.getElementById("btnOpenSidePanel");
  var authorLink = document.getElementById("authorLink");

  var activeTabId = null;
  var currentTabState = Object.assign ? Object.assign({}, TimeEngine.DEFAULT_STATE) : JSON.parse(JSON.stringify(TimeEngine.DEFAULT_STATE));
  var tickerTimer = null;
  var baseScrubberMs = 0;
  var fpInstance = null;

  function initFlatpickr() {
    if (typeof flatpickr === "undefined" || !targetDateTime) return;
    fpInstance = flatpickr(targetDateTime, {
      appendTo: document.body,
      enableTime: true,
      enableSeconds: true,
      time_24hr: true,
      dateFormat: "Y-m-d H:i:S",
      allowInput: true,
      disableMobile: true,
      onOpen: function (selectedDates, dateStr, instance) {
        if (!instance || !instance.calendarContainer) return;
        var cal = instance.calendarContainer;
        var calHeight = cal.offsetHeight || 280;
        var calWidth = cal.offsetWidth || 312;
        var winWidth = window.innerWidth || 360;
        var winHeight = window.innerHeight || 580;

        var left = Math.max(10, Math.round((winWidth - calWidth) / 2));
        var top = Math.max(70, Math.round((winHeight - calHeight) / 2));
        cal.style.left = left + "px";
        cal.style.top = top + "px";
        cal.style.right = "auto";
        cal.style.bottom = "auto";
      },
      onChange: function (selectedDates, dateStr) {
        updateTzBadge();
        var parsed = TimeEngine.parseInputWithTimezone(dateStr, timezoneSelect.value);
        if (parsed) baseScrubberMs = parsed;
      }
    });

    if (btnToggleCalendar) {
      btnToggleCalendar.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (fpInstance) {
          fpInstance.toggle();
        }
      });
    }

    var appBody = document.querySelector(".app-body");
    if (appBody) {
      appBody.addEventListener("scroll", function () {
        if (fpInstance && fpInstance.isOpen) {
          fpInstance.close();
        }
      });
    }

    function handleOutsideClick(e) {
      if (!fpInstance || !fpInstance.isOpen) return;
      var cal = fpInstance.calendarContainer;
      if (cal && (cal === e.target || cal.contains(e.target))) {
        return;
      }
      if (targetDateTime && (targetDateTime === e.target || targetDateTime.contains(e.target))) {
        return;
      }
      if (btnToggleCalendar && (btnToggleCalendar === e.target || btnToggleCalendar.contains(e.target))) {
        return;
      }
      fpInstance.close();
    }

    document.addEventListener("mousedown", handleOutsideClick, true);
    document.addEventListener("pointerdown", handleOutsideClick, true);
    document.addEventListener("click", handleOutsideClick, true);
  }

  function setPickerDate(val) {
    if (!targetDateTime) return;
    targetDateTime.value = val;
    if (fpInstance) {
      fpInstance.setDate(val, false);
    }
  }

  // ==========================================
  // THEME MANAGEMENT (LIGHT & DARK)
  // ==========================================
  function initTheme() {
    var savedTheme = "light";
    try {
      savedTheme = localStorage.getItem("velox_theme") || "light";
    } catch (e) {}
    currentTabState.theme = savedTheme;
    applyTheme(savedTheme, false);

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["velox_theme"], function (res) {
        if (res && res.velox_theme && res.velox_theme !== savedTheme) {
          currentTabState.theme = res.velox_theme;
          applyTheme(res.velox_theme, false);
        }
      });
    }
  }

  function applyTheme(theme, syncTab) {
    if (theme === "light") {
      document.body.classList.remove("theme-dark");
      document.body.classList.add("theme-light");
    } else {
      document.body.classList.remove("theme-light");
      document.body.classList.add("theme-dark");
    }
    try {
      localStorage.setItem("velox_theme", theme);
    } catch (e) {}
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ velox_theme: theme });
    }
    currentTabState.theme = theme;
    if (syncTab !== false && activeTabId) {
      applyStateToActiveTab(currentTabState, false);
    }
  }

  // ==========================================
  // POPUP INITIALIZATION
  // ==========================================
  function initTimezones() {
    timezoneSelect.innerHTML = "";
    var groups = {};
    var all = Timezones.ALL_TIMEZONES;

    for (var i = 0; i < all.length; i++) {
      var tz = all[i];
      var groupName = tz.group || "Other";
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(tz);
    }

    for (var g in groups) {
      if (Object.prototype.hasOwnProperty.call(groups, g)) {
        var optgroup = document.createElement("optgroup");
        optgroup.label = g;
        var tzList = groups[g];
        for (var j = 0; j < tzList.length; j++) {
          var item = tzList[j];
          var option = document.createElement("option");
          option.value = item.id;
          option.textContent = item.name;
          optgroup.appendChild(option);
        }
        timezoneSelect.appendChild(optgroup);
      }
    }
  }

  function initPresets() {
    presetContainer.innerHTML = "";
    var presets = TimeEngine.PRESETS;

    for (var i = 0; i < presets.length; i++) {
      (function (preset) {
        var card = document.createElement("div");
        card.className = "preset-card";
        card.innerHTML = [
          '<div class="d-flex justify-content-between align-items-center">',
          '  <span class="preset-title">' + preset.title + '</span>',
          '  <span class="preset-badge">' + preset.badge + '</span>',
          '</div>',
          '<div class="preset-desc">' + preset.desc + '</div>'
        ].join("");

        card.addEventListener("click", function () {
          applyPreset(preset);
        });
        presetContainer.appendChild(card);
      })(presets[i]);
    }
  }

  function applyPreset(preset) {
    var targetMs = (new Date()).getTime();
    if (preset.dateStr) {
      targetMs = TimeEngine.parseInputWithTimezone(preset.dateStr, preset.timezone || "");
    } else if (preset.relativeMs) {
      var currentEffective = TimeEngine.computeEffectiveTime(currentTabState);
      targetMs = currentEffective + preset.relativeMs;
    }

    if (preset.timezone !== undefined) {
      timezoneSelect.value = preset.timezone;
    }
    targetDateTime.value = TimeEngine.formatForInput(targetMs, timezoneSelect.value);
    if (fpInstance) fpInstance.setDate(targetDateTime.value, false);
    updateTzBadge();
    baseScrubberMs = targetMs;
    timelineScrubber.value = 0;
    scrubberOffsetDisplay.textContent = "0h offset";

    // Update state
    currentTabState.enabled = true;
    currentTabState.timezone = timezoneSelect.value;
    currentTabState.startMockTime = targetMs;
    currentTabState.startRealTime = (new Date()).getTime();
    currentTabState.targetIso = (new Date(targetMs)).toISOString();
    currentTabState.isFrozen = freezeClockToggle.checked;
    masterToggle.checked = true;

    applyStateToActiveTab(currentTabState, autoReloadToggle.checked);
    updateTicker();
  }

  function updateTzBadge() {
    var tz = timezoneSelect.value;
    var val = targetDateTime.value;
    var d = val ? new Date(val) : new Date();
    tzOffsetBadge.textContent = Timezones.getTimezoneDisplay(tz, d);
  }

  function updateTicker() {
    var effectiveMs = TimeEngine.computeEffectiveTime(currentTabState);
    var d = new Date(effectiveMs);
    var tz = currentTabState.timezone;

    if (currentTabState.enabled) {
      statusDot.className = currentTabState.isFrozen ? "status-indicator paused" : "status-indicator active";
      statusText.textContent = currentTabState.isFrozen
        ? "Frozen"
        : (currentTabState.speedMultiplier !== 1 ? "Active (" + currentTabState.speedMultiplier + "x)" : "Active");

      // Calculate relative difference from system clock
      var realNow = (new Date()).getTime();
      var diffMs = effectiveMs - realNow;
      var absDiffSec = Math.round(Math.abs(diffMs) / 1000);
      var days = Math.floor(absDiffSec / 86400);
      var hours = Math.floor((absDiffSec % 86400) / 3600);
      var mins = Math.floor((absDiffSec % 3600) / 60);

      var deltaParts = [];
      if (days > 0) deltaParts.push(days + "d");
      if (hours > 0) deltaParts.push(hours + "h");
      if (mins > 0 || deltaParts.length === 0) deltaParts.push(mins + "m");

      var deltaText = deltaParts.join(" ") + (diffMs >= 0 ? " ahead" : " behind");
      if (heroDeltaLabel && heroDeltaSeparator) {
        heroDeltaLabel.textContent = deltaText;
        heroDeltaLabel.style.display = "inline";
        heroDeltaSeparator.style.display = "inline";
      }
    } else {
      statusDot.className = "status-indicator";
      statusText.textContent = "System time";
      if (heroDeltaLabel && heroDeltaSeparator) {
        heroDeltaLabel.style.display = "none";
        heroDeltaSeparator.style.display = "none";
      }
    }

    if (heroTzLabel) {
      heroTzLabel.textContent = tz || "Browser timezone";
    }

    try {
      var timeOptions = {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      };
      if (tz) timeOptions.timeZone = tz;
      liveTickerTime.textContent = d.toLocaleTimeString("en-GB", timeOptions);
    } catch (e) {
      liveTickerTime.textContent = d.toLocaleTimeString();
    }
  }

  function syncUiWithState(state) {
    currentTabState = JSON.parse(JSON.stringify(TimeEngine.DEFAULT_STATE));
    for (var k in state) {
      if (Object.prototype.hasOwnProperty.call(state, k)) {
        currentTabState[k] = state[k];
      }
    }

    masterToggle.checked = !!currentTabState.enabled;

    if (currentTabState.mode === "advanced") {
      modeAdvanced.checked = true;
      simpleSection.classList.remove("d-none");
      advancedSection.classList.remove("d-none");
    } else {
      modeSimple.checked = true;
      simpleSection.classList.remove("d-none");
      advancedSection.classList.add("d-none");
    }

    timezoneSelect.value = currentTabState.timezone || "";
    var currentEffective = TimeEngine.computeEffectiveTime(currentTabState);
    targetDateTime.value = TimeEngine.formatForInput(currentEffective, currentTabState.timezone);
    if (fpInstance) fpInstance.setDate(targetDateTime.value, false);
    baseScrubberMs = currentEffective;
    updateTzBadge();

    freezeClockToggle.checked = !!currentTabState.isFrozen;
    autoReloadToggle.checked = !!currentTabState.autoReload;

    var speed = currentTabState.speedMultiplier || 1;
    speedBadge.textContent = speed + "x " + (speed === 1 ? "(Normal)" : "");
    for (var i = 0; i < speedButtons.length; i++) {
      var btn = speedButtons[i];
      if (parseFloat(btn.getAttribute("data-speed")) === speed) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    }

    hudToggle.checked = !!currentTabState.hudVisible;
    headerToggle.checked = !!currentTabState.injectHeaders;

    if (currentTabState.theme) {
      applyTheme(currentTabState.theme, false);
    }
    var rotateText = document.querySelector(".rotate-clock-text");
    if (rotateText) {
      rotateText.textContent = currentTabState.enabled ? "Reset" : "Sync Now";
    }

    updateTicker();
  }

  // Cross-browser injection script executed in active tab
  function injectStateScript(jsonStr) {
    var KEY = "__VELOX_TIME_TRAVEL_STATE__";
    var EVENT = "velox:time-travel-state-change";
    try {
      window.sessionStorage.setItem(KEY, jsonStr);
    } catch (e) {}
    try {
      var parsed = JSON.parse(jsonStr);
      window.__VELOX_TIME_TRAVEL_STATE__ = parsed;
      if (window.__veloxTimeTravel && typeof window.__veloxTimeTravel.setTime === "function") {
        if (parsed.enabled) {
          window.__veloxTimeTravel.setTime(parsed.startMockTime);
          if (parsed.timezone !== undefined) window.__veloxTimeTravel.setTimezone(parsed.timezone);
          if (parsed.isFrozen !== undefined) window.__veloxTimeTravel.setFrozen(parsed.isFrozen);
          if (parsed.speedMultiplier !== undefined) window.__veloxTimeTravel.setSpeed(parsed.speedMultiplier);
        } else {
          window.__veloxTimeTravel.disable();
        }
      }
    } catch (e) {}
    try {
      document.dispatchEvent(new CustomEvent(EVENT));
    } catch (e) {}
    try {
      window.postMessage({ type: "VELOX_STATE_CHANGE", state: jsonStr }, "*");
    } catch (e) {}
    return !!window.__VELOX_TIME_TRAVEL_INITIALIZED__;
  }

  function readStateScript() {
    var KEY = "__VELOX_TIME_TRAVEL_STATE__";
    if (window.__VELOX_TIME_TRAVEL_STATE__) return window.__VELOX_TIME_TRAVEL_STATE__;
    if (window.__veloxTimeTravel && typeof window.__veloxTimeTravel.getState === "function") {
      return window.__veloxTimeTravel.getState();
    }
    try {
      var raw = window.sessionStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  }

  function applyStateToActiveTab(state, shouldReload) {
    if (!activeTabId) return;

    var stateJson = JSON.stringify(state);
    var scripting = (typeof chrome !== "undefined" && chrome.scripting)
      ? chrome.scripting
      : ((typeof browser !== "undefined" && browser.scripting) ? browser.scripting : null);

    if (scripting && scripting.executeScript) {
      try {
        // Execute in MAIN world first so page window receives it directly
        scripting.executeScript({
          target: { tabId: activeTabId, allFrames: true },
          world: "MAIN",
          func: injectStateScript,
          args: [stateJson]
        }, function (results) {
          var isContentScriptActive = false;
          if (!chrome.runtime.lastError && results && results.length) {
            for (var i = 0; i < results.length; i++) {
              if (results[i] && results[i].result) {
                isContentScriptActive = true;
                break;
              }
            }
          }

          // Also execute in ISOLATED world for isolated sessionStorage
          try {
            scripting.executeScript({
              target: { tabId: activeTabId, allFrames: true },
              world: "ISOLATED",
              func: injectStateScript,
              args: [stateJson]
            });
          } catch (e2) {}

          try {
            chrome.tabs.sendMessage(activeTabId, { type: "VELOX_SET_STATE", state: state }, function () {});
          } catch (e3) {}

          if (shouldReload || (!isContentScriptActive && state.enabled)) {
            chrome.tabs.reload(activeTabId, function () {
              window.close();
            });
          }
        });
      } catch (err) {
        scripting.executeScript({
          target: { tabId: activeTabId, allFrames: true },
          func: injectStateScript,
          args: [stateJson]
        }, function () {
          try {
            chrome.tabs.sendMessage(activeTabId, { type: "VELOX_SET_STATE", state: state }, function () {});
          } catch (e) {}
          if (shouldReload) {
            chrome.tabs.reload(activeTabId, function () {
              window.close();
            });
          }
        });
      }
    } else {
      chrome.tabs.sendMessage(activeTabId, { type: "VELOX_SET_STATE", state: state }, function () {
        if (shouldReload) {
          chrome.tabs.reload(activeTabId, function () {
            window.close();
          });
        }
      });
    }
  }

  function readStateFromActiveTab(callback) {
    if (!activeTabId) return callback(null);

    var scripting = (typeof chrome !== "undefined" && chrome.scripting)
      ? chrome.scripting
      : ((typeof browser !== "undefined" && browser.scripting) ? browser.scripting : null);

    if (scripting && scripting.executeScript) {
      scripting.executeScript({
        target: { tabId: activeTabId },
        func: readStateScript
      }, function (results) {
        if (!chrome.runtime.lastError && results && results[0] && results[0].result) {
          callback(results[0].result);
        } else {
          chrome.tabs.sendMessage(activeTabId, { type: "VELOX_GET_STATE" }, function (res) {
            if (!chrome.runtime.lastError && res && res.state) {
              callback(res.state);
            } else {
              callback(null);
            }
          });
        }
      });
    } else {
      chrome.tabs.sendMessage(activeTabId, { type: "VELOX_GET_STATE" }, function (res) {
        if (!chrome.runtime.lastError && res && res.state) {
          callback(res.state);
        } else {
          callback(null);
        }
      });
    }
  }

  function setupEvents() {
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener("click", function () {
        var isLight = document.body.classList.contains("theme-light");
        var nextTheme = isLight ? "dark" : "light";
        applyTheme(nextTheme, true);
      });
    }

    var btnRotateReset = document.getElementById("btnRotateReset");
    if (btnRotateReset) {
      btnRotateReset.addEventListener("click", function () {
        btnRotateReset.classList.add("spinning");
        setTimeout(function () {
          btnRotateReset.classList.remove("spinning");
        }, 600);

        if (currentTabState.enabled) {
          btnReset.click();
        } else {
          var nowMs = (new Date()).getTime();
          setPickerDate(TimeEngine.formatForInput(nowMs, timezoneSelect.value));
          baseScrubberMs = nowMs;
          updateTzBadge();
        }
      });
    }

    if (authorLink) {
      authorLink.addEventListener("click", function (e) {
        e.preventDefault();
        var url = "https://vishwas.me";
        if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.create) {
          chrome.tabs.create({ url: url });
        } else if (typeof browser !== "undefined" && browser.tabs && browser.tabs.create) {
          browser.tabs.create({ url: url });
        } else {
          window.open(url, "_blank");
        }
      });
    }

    masterToggle.addEventListener("change", function () {
      currentTabState.enabled = masterToggle.checked;
      currentTabState.timezone = timezoneSelect.value;
      var parsedMs = TimeEngine.parseInputWithTimezone(targetDateTime.value, timezoneSelect.value);
      if (!parsedMs) parsedMs = (new Date()).getTime();
      currentTabState.startMockTime = parsedMs;
      currentTabState.startRealTime = (new Date()).getTime();
      currentTabState.targetIso = (new Date(parsedMs)).toISOString();
      currentTabState.isFrozen = freezeClockToggle.checked;
      currentTabState.autoReload = autoReloadToggle.checked;

      applyStateToActiveTab(currentTabState, currentTabState.autoReload);
      updateTicker();
    });

    modeSimple.addEventListener("change", function () {
      currentTabState.mode = "simple";
      simpleSection.classList.remove("d-none");
      advancedSection.classList.add("d-none");
      applyStateToActiveTab(currentTabState, false);
    });

    modeAdvanced.addEventListener("change", function () {
      currentTabState.mode = "advanced";
      simpleSection.classList.remove("d-none");
      advancedSection.classList.remove("d-none");
      applyStateToActiveTab(currentTabState, false);
    });

    targetDateTime.addEventListener("input", function () {
      updateTzBadge();
      var parsed = TimeEngine.parseInputWithTimezone(targetDateTime.value, timezoneSelect.value);
      if (parsed) {
        baseScrubberMs = parsed;
        if (fpInstance) fpInstance.setDate(targetDateTime.value, false);
      }
    });

    targetDateTime.addEventListener("change", function () {
      updateTzBadge();
      var parsed = TimeEngine.parseInputWithTimezone(targetDateTime.value, timezoneSelect.value);
      if (parsed) {
        baseScrubberMs = parsed;
        if (fpInstance) fpInstance.setDate(targetDateTime.value, false);
      }
    });

    timezoneSelect.addEventListener("change", function () {
      updateTzBadge();
      if (baseScrubberMs) {
        targetDateTime.value = TimeEngine.formatForInput(baseScrubberMs, timezoneSelect.value);
      }
    });

    var nudgeButtons = document.querySelectorAll("[data-nudge]");
    for (var i = 0; i < nudgeButtons.length; i++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var nudge = btn.getAttribute("data-nudge");
          var targetMs = TimeEngine.parseInputWithTimezone(targetDateTime.value, timezoneSelect.value) || (new Date()).getTime();
          if (nudge === "now") {
            targetMs = (new Date()).getTime();
          } else {
            targetMs = TimeEngine.calculateJump(targetMs, nudge);
          }
          targetDateTime.value = TimeEngine.formatForInput(targetMs, timezoneSelect.value);
    if (fpInstance) fpInstance.setDate(targetDateTime.value, false);
          baseScrubberMs = targetMs;
          timelineScrubber.value = 0;
          scrubberOffsetDisplay.textContent = "0h offset";
          updateTzBadge();
        });
      })(nudgeButtons[i]);
    }

    btnMatchIp.addEventListener("click", function () {
      btnMatchIp.textContent = "Detecting...";
      var xhr = new XMLHttpRequest();
      xhr.open("GET", "https://ipapi.co/json/", true);
      xhr.timeout = 3000;
      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            var data = JSON.parse(xhr.responseText);
            if (data && data.timezone) {
              timezoneSelect.value = data.timezone;
              updateTzBadge();
              btnMatchIp.textContent = "Detected";
              setTimeout(function () {
                btnMatchIp.textContent = "Auto-match IP";
              }, 2000);
              return;
            }
          } catch (e) {}
        }
        fallbackLocal();
      };
      xhr.onerror = function () { fallbackLocal(); };
      xhr.ontimeout = function () { fallbackLocal(); };
      xhr.send();

      function fallbackLocal() {
        var localTz = (window.Intl && Intl.DateTimeFormat)
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : "";
        if (localTz) timezoneSelect.value = localTz;
        updateTzBadge();
        btnMatchIp.textContent = "Local";
        setTimeout(function () {
          btnMatchIp.textContent = "Auto-match IP";
        }, 2000);
      }
    });

    for (var s = 0; s < speedButtons.length; s++) {
      (function (btn) {
        btn.addEventListener("click", function () {
          var speed = parseFloat(btn.getAttribute("data-speed"));
          currentTabState.speedMultiplier = speed;
          speedBadge.textContent = speed + "x " + (speed === 1 ? "(Normal)" : "");
          for (var k = 0; k < speedButtons.length; k++) {
            speedButtons[k].classList.remove("active");
          }
          btn.classList.add("active");

          if (currentTabState.enabled) {
            var currentEffective = TimeEngine.computeEffectiveTime(currentTabState);
            currentTabState.startMockTime = currentEffective;
            currentTabState.startRealTime = (new Date()).getTime();
            applyStateToActiveTab(currentTabState, false);
            updateTicker();
          }
        });
      })(speedButtons[s]);
    }

    timelineScrubber.addEventListener("input", function () {
      var hours = parseFloat(timelineScrubber.value);
      var sign = hours > 0 ? "+" : "";
      scrubberOffsetDisplay.textContent = sign + hours + "h offset";

      if (!baseScrubberMs) {
        baseScrubberMs = TimeEngine.parseInputWithTimezone(targetDateTime.value, timezoneSelect.value) || (new Date()).getTime();
      }
      var newMs = baseScrubberMs + (hours * 3600 * 1000);
      targetDateTime.value = TimeEngine.formatForInput(newMs, timezoneSelect.value);
    });

    freezeClockToggle.addEventListener("change", function () {
      currentTabState.isFrozen = freezeClockToggle.checked;
      if (currentTabState.enabled) {
        var currentEffective = TimeEngine.computeEffectiveTime(currentTabState);
        currentTabState.startMockTime = currentEffective;
        currentTabState.startRealTime = (new Date()).getTime();
        applyStateToActiveTab(currentTabState, false);
        updateTicker();
      }
    });

    hudToggle.addEventListener("change", function () {
      currentTabState.hudVisible = hudToggle.checked;
      applyStateToActiveTab(currentTabState, false);
    });

    headerToggle.addEventListener("change", function () {
      currentTabState.injectHeaders = headerToggle.checked;
      applyStateToActiveTab(currentTabState, false);
    });

    if (btnOpenSidePanel) {
      btnOpenSidePanel.addEventListener("click", function () {
        if (typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.open && activeTabId) {
          chrome.sidePanel.open({ tabId: activeTabId }).catch(function () {});
          window.close();
        } else if (typeof browser !== "undefined" && browser.sidebarAction && browser.sidebarAction.open) {
          browser.sidebarAction.open().catch(function () {});
          window.close();
        } else {
          alert("Side panel is available in the browser sidebar.");
        }
      });
    }

    btnApply.addEventListener("click", function () {
      var inputVal = targetDateTime.value;
      var tzVal = timezoneSelect.value;
      var parsedMs = TimeEngine.parseInputWithTimezone(inputVal, tzVal);

      if (!parsedMs) {
        alert("Please select a valid date and time.");
        return;
      }

      currentTabState.enabled = true;
      currentTabState.targetIso = (new Date(parsedMs)).toISOString();
      currentTabState.timezone = tzVal;
      currentTabState.isFrozen = freezeClockToggle.checked;
      currentTabState.startMockTime = parsedMs;
      currentTabState.startRealTime = (new Date()).getTime();
      currentTabState.autoReload = autoReloadToggle.checked;

      masterToggle.checked = true;
      applyStateToActiveTab(currentTabState, currentTabState.autoReload);
      updateTicker();

      var origText = btnApply.textContent;
      btnApply.textContent = "Applied";
      setTimeout(function () {
        btnApply.textContent = origText;
      }, 1500);
    });

    btnReset.addEventListener("click", function () {
      var mode = currentTabState.mode;
      currentTabState = JSON.parse(JSON.stringify(TimeEngine.DEFAULT_STATE));
      currentTabState.mode = mode;
      masterToggle.checked = false;
      syncUiWithState(currentTabState);
      applyStateToActiveTab(currentTabState, autoReloadToggle.checked);
    });
  }

  function init() {
    initTheme();
    initTimezones();
    initPresets();
    initFlatpickr();
    setupEvents();

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs && tabs[0] && tabs[0].id) {
        activeTabId = tabs[0].id;
        readStateFromActiveTab(function (state) {
          if (state) {
            syncUiWithState(state);
          } else {
            var initialVal = TimeEngine.formatForInput((new Date()).getTime());
            setPickerDate(initialVal);
            updateTzBadge();
          }
        });
      } else {
        var defaultVal = TimeEngine.formatForInput((new Date()).getTime());
        setPickerDate(defaultVal);
        updateTzBadge();
      }
    });

    tickerTimer = setInterval(updateTicker, 500);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
