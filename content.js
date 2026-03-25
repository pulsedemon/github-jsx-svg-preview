/**
 * Main content script for GitHub JSX SVG Preview.
 * Orchestrates scanning, conversion, and rendering of SVG previews.
 */

(() => {
  let settings = { enabled: true, autoPreview: true };
  let svgCount = 0;
  let scanDebounceTimer = null;

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
      svgCount += svgs.length;
    }
  }

  function debouncedScan() {
    clearTimeout(scanDebounceTimer);
    scanDebounceTimer = setTimeout(scanPage, 300);
  }

  function fullRescan() {
    svgCount = 0;
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
    const urlObserver = new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        setTimeout(fullRescan, 500);
      }
    });
    urlObserver.observe(document.querySelector('head > title') || document.head, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function listenForMessages() {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'getSvgCount') {
        sendResponse({ count: svgCount });
        return true;
      }

      if (message.type === 'settingsChanged') {
        const wasEnabled = settings.enabled;
        settings.enabled = message.enabled;
        settings.autoPreview = message.autoPreview;

        if (!settings.enabled) {
          PreviewRenderer.removeAll();
          SVGExtractor.resetScanFlags();
          svgCount = 0;
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
