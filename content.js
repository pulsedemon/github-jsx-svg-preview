/**
 * Main content script for GitHub JSX SVG Preview.
 * Orchestrates scanning, conversion, and rendering of SVG previews.
 */

(() => {
  let settings = { enabled: true, autoPreview: true };
  let scanDebounceTimer = null;

  function getSvgCount() {
    return document.querySelectorAll('.svg-preview-panel .svg-preview-card').length;
  }

  function init() {
    chrome.storage.local.get(['enabled', 'autoPreview'], (result) => {
      settings.enabled = result.enabled !== false;
      settings.autoPreview = result.autoPreview !== false;

      if (settings.enabled) {
        scanPage();
      }
    });

    observePageChanges();
    listenForMessages();
  }

  function scanPage() {
    if (!settings.enabled) return;

    const results = SVGExtractor.scan();

    for (const { container, svgs } of results) {
      PreviewRenderer.inject(container, svgs, settings.autoPreview);
    }
  }

  function debouncedScan() {
    clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(scanPage, 300);
  }

  function fullRescan() {
    PreviewRenderer.removeAll();
    SVGExtractor.resetScanFlags();
    scanPage();
  }

  function looksLikeDiffContent(node) {
    if (node.nodeType !== Node.ELEMENT_NODE) return false;

    // New GitHub UI
    if (node.id?.startsWith('diff-')) return true;
    if (node.querySelector?.('div[id^="diff-"]')) return true;
    if (node.querySelector?.('table[data-diff-anchor]')) return true;
    if (node.querySelector?.('code.diff-text')) return true;
    if (node.className?.includes?.('Diff-module')) return true;

    // Legacy GitHub UI
    if (node.classList?.contains('file')) return true;
    if (node.querySelector?.('.file')) return true;
    if (node.classList?.contains('blob-code')) return true;

    return false;
  }

  function observePageChanges() {
    const observer = new MutationObserver((mutations) => {
      if (!settings.enabled) return;

      let hasNewFileContent = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (looksLikeDiffContent(node)) {
            hasNewFileContent = true;
            break;
          }
        }
        if (hasNewFileContent) break;
      }

      if (hasNewFileContent) {
        debouncedScan();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener('turbo:load', fullRescan);
    document.addEventListener('turbo:render', fullRescan);

    let lastUrl = location.href;

    function onUrlChange() {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(fullRescan, 500);
      }
    }

    window.addEventListener('popstate', onUrlChange);

    if (typeof navigation !== 'undefined') {
      navigation.addEventListener('navigatesuccess', onUrlChange);
    }

    // Fallback: watch <title> changes as a proxy for SPA navigation.
    // Scoped to the <title> element only (not all of <head>).
    const titleEl = document.querySelector('head > title');
    if (titleEl) {
      const urlObserver = new MutationObserver(onUrlChange);
      urlObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }
  }

  function listenForMessages() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'getSvgCount') {
        sendResponse({ count: getSvgCount() });
        return true;
      }

      if (message.type === 'settingsChanged') {
        const wasEnabled = settings.enabled;
        settings.enabled = message.enabled;
        settings.autoPreview = message.autoPreview;

        if (!settings.enabled) {
          PreviewRenderer.removeAll();
          SVGExtractor.resetScanFlags();
        } else if (!wasEnabled && settings.enabled) {
          fullRescan();
        }
        return true;
      }

      return false;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
