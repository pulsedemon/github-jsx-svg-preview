const enabledToggle = document.getElementById('enabled');
const autoPreviewToggle = document.getElementById('autoPreview');
const svgCountEl = document.getElementById('svgCount');

chrome.storage.local.get(['enabled', 'autoPreview'], (result) => {
  enabledToggle.checked = result.enabled !== false;
  autoPreviewToggle.checked = result.autoPreview !== false;
});

enabledToggle.addEventListener('change', () => {
  chrome.storage.local.set({ enabled: enabledToggle.checked });
  notifyContentScript();
});

autoPreviewToggle.addEventListener('change', () => {
  chrome.storage.local.set({ autoPreview: autoPreviewToggle.checked });
  notifyContentScript();
});

function notifyContentScript() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'settingsChanged',
        enabled: enabledToggle.checked,
        autoPreview: autoPreviewToggle.checked,
      });
    }
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]?.id) {
    chrome.tabs.sendMessage(tabs[0].id, { type: 'getSvgCount' }, (response) => {
      if (chrome.runtime.lastError) {
        svgCountEl.textContent = '0';
        return;
      }
      svgCountEl.textContent = response?.count ?? '0';
    });
  }
});
