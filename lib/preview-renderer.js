/**
 * Injects preview UI into GitHub file containers:
 * - An eye icon toggle button in the file header
 * - A collapsible preview panel showing rendered SVGs
 *
 * Supports both the new React-based GitHub UI and legacy layout.
 */

const PreviewRenderer = (() => {
  const SIZES = [
    { label: 'S', value: 32 },
    { label: 'M', value: 64 },
    { label: 'L', value: 128 },
  ];

  const BACKGROUNDS = [
    { label: 'Light', value: '#ffffff' },
    { label: 'Dark', value: '#1f2328' },
    { label: 'Check', value: 'checkerboard' },
  ];

  const EYE_ICON_SVG = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>`;

  /**
   * Find the header element within a file container.
   */
  function findHeader(container) {
    return (
      container.querySelector('[class*="diffHeaderWrapper"]') ||
      container.querySelector('[class*="diff-file-header"]') ||
      container.querySelector('.file-header, .file-info')
    );
  }

  /**
   * Find the actions area in the header where we can prepend our button.
   * In the new UI this is the right-aligned flex container with Viewed, etc.
   */
  function findActionsBar(header) {
    return (
      header.querySelector('div.d-flex.flex-justify-end') ||
      header.querySelector('[class*="file-path-section"]')?.parentElement?.querySelector('div:last-child') ||
      header.querySelector('.file-actions') ||
      header.querySelector('.js-file-header-dropdown')
    );
  }

  /**
   * Find the element before which the preview panel should be inserted.
   * In the new UI, the table wrapper is the second child of the container.
   */
  function findContentArea(container) {
    return (
      container.querySelector('table[data-diff-anchor]')?.parentElement ||
      container.querySelector('.js-file-content, .blob-wrapper, .data')
    );
  }

  /**
   * Inject a preview toggle button and panel for a file container.
   */
  function inject(container, svgs, autoShow) {
    if (container.querySelector('.svg-preview-btn')) return;

    const header = findHeader(container);
    if (!header) return;

    const btn = createToggleButton();
    const panel = createPreviewPanel(svgs);

    const actionsBar = findActionsBar(header);
    if (actionsBar) {
      actionsBar.prepend(btn);
    } else {
      header.appendChild(btn);
    }

    const contentArea = findContentArea(container);
    if (contentArea) {
      contentArea.parentNode.insertBefore(panel, contentArea);
    } else {
      header.after(panel);
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isVisible = panel.style.display !== 'none';
      panel.style.display = isVisible ? 'none' : '';
      btn.classList.toggle('svg-preview-btn--active', !isVisible);
    });

    if (autoShow) {
      panel.style.display = '';
      btn.classList.add('svg-preview-btn--active');
    }
  }

  function createToggleButton() {
    const btn = document.createElement('button');
    btn.className = 'svg-preview-btn btn-octicon';
    btn.title = 'Preview SVG';

    const parser = new DOMParser();
    const doc = parser.parseFromString(EYE_ICON_SVG, 'image/svg+xml');
    btn.appendChild(document.importNode(doc.documentElement, true));

    return btn;
  }

  function createPreviewPanel(svgs) {
    const panel = document.createElement('div');
    panel.className = 'svg-preview-panel';
    panel.style.display = 'none';

    const toolbar = createToolbar(panel);
    panel.appendChild(toolbar);

    const grid = document.createElement('div');
    grid.className = 'svg-preview-grid';

    for (const rawSvg of svgs) {
      const converted = JsxToSvg.convert(rawSvg);
      const svgEl = JsxToSvg.toElement(converted);

      const card = document.createElement('div');
      card.className = 'svg-preview-card';

      if (svgEl) {
        const wrapper = document.createElement('div');
        wrapper.className = 'svg-preview-icon';
        const imported = document.importNode(svgEl, true);
        imported.removeAttribute('class');
        imported.style.width = '100%';
        imported.style.height = '100%';
        wrapper.appendChild(imported);
        card.appendChild(wrapper);
      } else {
        const errMsg = document.createElement('div');
        errMsg.className = 'svg-preview-error';
        errMsg.textContent = 'Could not parse SVG';
        card.appendChild(errMsg);
      }

      grid.appendChild(card);
    }

    panel.appendChild(grid);
    return panel;
  }

  function createToolbar(panel) {
    const toolbar = document.createElement('div');
    toolbar.className = 'svg-preview-toolbar';

    const sizeGroup = document.createElement('div');
    sizeGroup.className = 'svg-preview-btn-group';

    for (const size of SIZES) {
      const btn = document.createElement('button');
      btn.className = 'svg-preview-size-btn';
      btn.textContent = size.label;
      btn.dataset.size = size.value;
      if (size.value === 64) btn.classList.add('svg-preview-size-btn--active');

      btn.addEventListener('click', () => {
        sizeGroup.querySelectorAll('.svg-preview-size-btn').forEach((b) =>
          b.classList.remove('svg-preview-size-btn--active')
        );
        btn.classList.add('svg-preview-size-btn--active');
        panel.querySelectorAll('.svg-preview-icon').forEach((icon) => {
          icon.style.width = `${size.value}px`;
          icon.style.height = `${size.value}px`;
        });
      });

      sizeGroup.appendChild(btn);
    }

    const bgGroup = document.createElement('div');
    bgGroup.className = 'svg-preview-btn-group';

    for (const bg of BACKGROUNDS) {
      const btn = document.createElement('button');
      btn.className = 'svg-preview-bg-btn';
      btn.textContent = bg.label;
      btn.dataset.bg = bg.value;
      if (bg.value === '#ffffff') btn.classList.add('svg-preview-bg-btn--active');

      btn.addEventListener('click', () => {
        bgGroup.querySelectorAll('.svg-preview-bg-btn').forEach((b) =>
          b.classList.remove('svg-preview-bg-btn--active')
        );
        btn.classList.add('svg-preview-bg-btn--active');
        panel.querySelectorAll('.svg-preview-card').forEach((card) => {
          if (bg.value === 'checkerboard') {
            card.classList.add('svg-preview-card--checkerboard');
            card.style.backgroundColor = '';
          } else {
            card.classList.remove('svg-preview-card--checkerboard');
            card.style.backgroundColor = bg.value;
          }
        });
      });

      bgGroup.appendChild(btn);
    }

    toolbar.appendChild(sizeGroup);
    toolbar.appendChild(bgGroup);
    return toolbar;
  }

  /**
   * Remove all injected preview UI from the page.
   */
  function removeAll() {
    document.querySelectorAll('.svg-preview-btn').forEach((el) => el.remove());
    document.querySelectorAll('.svg-preview-panel').forEach((el) => el.remove());
  }

  return { inject, removeAll };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PreviewRenderer;
}
