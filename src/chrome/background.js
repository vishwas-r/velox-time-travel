/**
 * VeloX Time Travel - Background Service Worker (ES5 Compatible)
 * Handles tab events, icon badges, and side panel initialization.
 */
(function () {
  "use strict";

  if (typeof chrome !== "undefined" && chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(function () {});
  }

  function updateBadge(tabId, state) {
    if (!tabId || typeof chrome === "undefined" || !chrome.action) return;

    if (state && state.enabled) {
      if (state.isFrozen) {
        chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#f59e0b" });
        chrome.action.setBadgeText({ tabId: tabId, text: "PAUSE" });
      } else if (state.speedMultiplier && state.speedMultiplier !== 1) {
        chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#8b5cf6" });
        chrome.action.setBadgeText({ tabId: tabId, text: String(state.speedMultiplier) + "x" });
      } else {
        chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#10b981" });
        chrome.action.setBadgeText({ tabId: tabId, text: "ON" });
      }
      chrome.action.setTitle({
        tabId: tabId,
        title: "VeloX Time Travel: Active (" + (state.timezone || "Browser TZ") + ")"
      });
    } else {
      chrome.action.setBadgeText({ tabId: tabId, text: "" });
      chrome.action.setTitle({
        tabId: tabId,
        title: "VeloX Time Travel: Inactive"
      });
    }
  }

  chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.type === "VELOX_TAB_STATUS" && sender.tab && sender.tab.id) {
      updateBadge(sender.tab.id, message.state);
      sendResponse({ received: true });
      return true;
    }
  });

  chrome.tabs.onActivated.addListener(function (activeInfo) {
    chrome.tabs.sendMessage(activeInfo.tabId, { type: "VELOX_GET_STATE" }, function (res) {
      if (!chrome.runtime.lastError && res && res.state) {
        updateBadge(activeInfo.tabId, res.state);
      } else {
        updateBadge(activeInfo.tabId, null);
      }
    });
  });

  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
    if (changeInfo.status === "complete") {
      chrome.tabs.sendMessage(tabId, { type: "VELOX_GET_STATE" }, function (res) {
        if (!chrome.runtime.lastError && res && res.state) {
          updateBadge(tabId, res.state);
        } else {
          updateBadge(tabId, null);
        }
      });
    }
  });
})();
