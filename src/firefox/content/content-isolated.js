/**
 * VeloX Time Travel - Isolated World Content Script (ES5 Compatible)
 * Bridges communication between extension runtime and MAIN world via the shared DOM document.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "__VELOX_TIME_TRAVEL_STATE__";
  var STATE_EVENT = "velox:time-travel-state-change";

  function getStoredState() {
    try {
      var raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {}
    return null;
  }

  function setStoredState(state) {
    var jsonStr = JSON.stringify(state);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, jsonStr);
    } catch (e) {}
    try {
      document.dispatchEvent(new CustomEvent(STATE_EVENT));
    } catch (e) {}
    try {
      window.postMessage({ type: "VELOX_STATE_CHANGE", state: jsonStr }, "*");
    } catch (e) {}
  }

  var initial = getStoredState();
  if (initial && initial.enabled) {
    try {
      chrome.runtime.sendMessage({
        type: "VELOX_TAB_STATUS",
        state: initial
      });
    } catch (e) {}
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "VELOX_GET_STATE") {
      var state = getStoredState();
      sendResponse({ success: true, state: state });
      return true;
    }

    if (message.type === "VELOX_SET_STATE") {
      setStoredState(message.state);
      try {
        chrome.runtime.sendMessage({
          type: "VELOX_TAB_STATUS",
          state: message.state
        });
      } catch (e) {}
      sendResponse({ success: true });
      return true;
    }

    if (message.type === "VELOX_PING") {
      sendResponse({ success: true, active: true });
      return true;
    }
  });

  // Listen on document for state changes coming from MAIN world (HUD or console API)
  document.addEventListener(STATE_EVENT, function () {
    var state = getStoredState();
    if (state) {
      try {
        chrome.runtime.sendMessage({
          type: "VELOX_TAB_STATUS",
          state: state
        });
      } catch (e) {}
    }
  });
})();
