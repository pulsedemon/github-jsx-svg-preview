/**
 * Scans GitHub diff and blob views for JSX/TSX files containing inline SVG,
 * and extracts the raw SVG markup from code lines.
 *
 * Supports both the new React-based GitHub UI (CSS modules) and the legacy
 * class-based UI.
 */

const SVGExtractor = (() => {
  const SVG_FILE_EXTENSIONS = /\.(jsx|tsx|js|ts)$/;
  const TEST_FILE_PATTERN = /\.(test|spec)\.(jsx|tsx|js|ts)$|__tests__\//;
  const LRM_RE = /[\u200E\u200F\u200B\u200C\u200D\uFEFF]/g;

  function getFileContainers() {
    const containers = [];
    const seen = new Set();

    // New GitHub UI: diff containers are div[id^="diff-"] with Diff-module class
    for (const el of document.querySelectorAll('div[id^="diff-"]')) {
      if (el.querySelector('table[data-diff-anchor]') && !seen.has(el)) {
        seen.add(el);
        containers.push(el);
      }
    }

    // Legacy GitHub UI: .file with data attributes
    for (const el of document.querySelectorAll('.file[data-tagsearch-path], .file[data-file-path]')) {
      if (!seen.has(el)) {
        seen.add(el);
        containers.push(el);
      }
    }

    return containers;
  }

  function getFilePath(fileContainer) {
    // New UI: h3 with DiffFileHeader-module__file-name class contains a link
    const h3 = fileContainer.querySelector('h3[class*="file-name"] a, h3[class*="file-name"]');
    if (h3) {
      return h3.textContent.replace(LRM_RE, '').trim();
    }

    // New UI: file path link in header
    const headerLink = fileContainer.querySelector('a[href*="#diff-"]');
    if (headerLink) {
      return headerLink.textContent.replace(LRM_RE, '').trim();
    }

    // Legacy UI
    return (
      fileContainer.getAttribute('data-tagsearch-path') ||
      fileContainer.getAttribute('data-file-path') ||
      fileContainer.querySelector('.file-info a, .file-header a[title]')?.title ||
      fileContainer.querySelector('.file-info a, .file-header a[title]')?.textContent?.trim() ||
      ''
    );
  }

  function isSvgCandidate(filePath) {
    return SVG_FILE_EXTENSIONS.test(filePath) && !TEST_FILE_PATTERN.test(filePath);
  }

  /**
   * Strips the leading diff marker (+, -, space) from a code line.
   */
  function stripDiffMarker(text) {
    if (text.length > 0 && (text[0] === '+' || text[0] === '-' || text[0] === ' ')) {
      return text.slice(1);
    }
    return text;
  }

  /**
   * Gets the visible "after" code lines from a file container.
   * Handles both new and legacy GitHub DOM structures.
   */
  function getCodeLines(fileContainer) {
    const lines = [];

    // New GitHub UI: code elements inside diff-text-cell TDs
    const codeEls = fileContainer.querySelectorAll(
      'code.diff-text.syntax-highlighted-line'
    );
    if (codeEls.length > 0) {
      for (const code of codeEls) {
        if (code.classList.contains('deletion')) continue;
        lines.push(stripDiffMarker(code.textContent));
      }
      return lines;
    }

    // Legacy GitHub UI: blob-code TDs
    const blobCells = fileContainer.querySelectorAll('.blob-code');
    for (const cell of blobCells) {
      if (cell.classList.contains('blob-code-deletion')) continue;
      const inner = cell.querySelector('.blob-code-inner') || cell;
      lines.push(inner.textContent);
    }

    return lines;
  }

  /**
   * Removes comment lines (single-line "//", block comments, and JSX
   * comments) from code lines so that commented-out SVG tags are not
   * collected.
   */
  function stripCommentLines(lines) {
    const result = [];
    let inBlockComment = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (inBlockComment) {
        if (trimmed.includes('*/')) {
          inBlockComment = false;
        }
        continue;
      }

      if (/^\s*\/\//.test(trimmed)) continue;
      if (/^\s*\/\*.*\*\/\s*$/.test(trimmed)) continue;
      if (/^\s*\{\/\*.*\*\/\}\s*$/.test(trimmed)) continue;

      if (/^\s*\/\*/.test(trimmed) && !trimmed.includes('*/')) {
        inBlockComment = true;
        continue;
      }

      if (/^\s*\{\/\*/.test(trimmed) && !trimmed.includes('*/')) {
        inBlockComment = true;
        continue;
      }

      result.push(line);
    }

    return result;
  }

  /**
   * Extracts all SVG blocks from an array of code lines.
   * Returns an array of raw SVG strings (still in JSX form).
   * Handles self-closing <svg .../> and filters out commented-out SVGs.
   */
  function extractSvgBlocks(rawLines) {
    const lines = stripCommentLines(rawLines);
    const svgs = [];
    let collecting = false;
    let depth = 0;
    let buffer = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!collecting) {
        const svgStart = trimmed.indexOf('<svg');
        if (svgStart !== -1) {
          const charAfter = trimmed[svgStart + 4];
          if (charAfter && !/[\s>/]/.test(charAfter)) continue;

          const fragment = trimmed.slice(svgStart);

          // Self-closing: <svg ... />
          if (isSelfClosing(fragment, 'svg')) {
            svgs.push(fragment);
            continue;
          }

          collecting = true;
          depth = 0;
          buffer = [fragment];
          depth += countOpening(fragment, 'svg') - countClosing(fragment, 'svg');

          if (depth <= 0 && fragment.includes('</svg>')) {
            svgs.push(buffer.join('\n'));
            collecting = false;
            buffer = [];
          }
          continue;
        }
      }

      if (collecting) {
        buffer.push(trimmed);
        depth += countOpening(trimmed, 'svg') - countClosing(trimmed, 'svg');

        if (depth <= 0 && (trimmed.includes('</svg>') || isSelfClosing(trimmed, 'svg'))) {
          svgs.push(buffer.join('\n'));
          collecting = false;
          buffer = [];
        }
      }
    }

    return svgs;
  }

  function countOpening(text, tag) {
    const re = new RegExp(`<${tag}[\\s>/]`, 'g');
    const matches = text.match(re) || [];
    // Subtract self-closing matches since they don't increase depth
    return matches.length - countSelfClosing(text, tag);
  }

  function countClosing(text, tag) {
    const re = new RegExp(`</${tag}>`, 'g');
    return (text.match(re) || []).length;
  }

  function countSelfClosing(text, tag) {
    const re = new RegExp(`<${tag}\\b[^>]*/\\s*>`, 'g');
    return (text.match(re) || []).length;
  }

  function isSelfClosing(text, tag) {
    const re = new RegExp(`<${tag}\\b[^>]*/\\s*>`);
    return re.test(text);
  }

  /**
   * Scans the page and returns results for each file containing SVGs.
   * Each result: { container: Element, filePath: string, svgs: string[] }
   */
  function scan() {
    const results = [];
    const containers = getFileContainers();

    for (const container of containers) {
      if (container.dataset.svgPreviewScanned === 'true') continue;

      const filePath = getFilePath(container);
      if (!isSvgCandidate(filePath)) continue;

      const lines = getCodeLines(container);
      const svgs = extractSvgBlocks(lines);

      if (svgs.length > 0) {
        results.push({ container, filePath, svgs });
      }

      container.dataset.svgPreviewScanned = 'true';
    }

    return results;
  }

  function resetScanFlags() {
    const containers = getFileContainers();
    for (const c of containers) {
      delete c.dataset.svgPreviewScanned;
    }
  }

  return { scan, resetScanFlags, extractSvgBlocks, stripCommentLines, getFileContainers };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SVGExtractor;
}
