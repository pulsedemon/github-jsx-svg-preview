/**
 * @jest-environment jsdom
 */
const SVGExtractor = require('../lib/svg-extractor');

describe('SVGExtractor.extractSvgBlocks', () => {
  const extract = SVGExtractor.extractSvgBlocks;

  test('extracts a single SVG block', () => {
    const lines = [
      'export const Icon = () => (',
      '  <svg viewBox="0 0 24 24">',
      '    <path d="M0 0"/>',
      '  </svg>',
      ');',
    ];
    const result = extract(lines);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('<svg');
    expect(result[0]).toContain('</svg>');
  });

  test('extracts multiple SVG blocks from one file', () => {
    const lines = [
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/></svg>',
      'some code',
      '<svg viewBox="0 0 16 16"><rect width="16" height="16"/></svg>',
    ];
    const result = extract(lines);
    expect(result).toHaveLength(2);
  });

  test('handles nested SVG depth correctly', () => {
    const lines = [
      '<svg viewBox="0 0 24 24">',
      '  <svg viewBox="0 0 12 12">',
      '    <circle cx="6" cy="6" r="3"/>',
      '  </svg>',
      '  <path d="M0 0"/>',
      '</svg>',
    ];
    const result = extract(lines);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('</svg>');
    expect(result[0]).toContain('<path');
  });

  test('handles self-closing <svg ... />', () => {
    const lines = [
      'export const Empty = () => <svg viewBox="0 0 24 24" />;',
    ];
    const result = extract(lines);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('<svg');
  });

  test('ignores single-line comments containing SVG', () => {
    const lines = [
      '// <svg viewBox="0 0 24 24"><path d="M0 0"/></svg>',
      '<svg viewBox="0 0 16 16"><rect/></svg>',
    ];
    const result = extract(lines);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('16 16');
  });

  test('ignores JSX comments containing SVG', () => {
    const lines = [
      '{/* <svg viewBox="0 0 24 24"><path d="M0 0"/></svg> */}',
      '<svg viewBox="0 0 16 16"><rect/></svg>',
    ];
    const result = extract(lines);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('16 16');
  });

  test('ignores multi-line block comments', () => {
    const lines = [
      '/*',
      '<svg viewBox="0 0 24 24">',
      '  <path d="M0 0"/>',
      '</svg>',
      '*/',
      '<svg viewBox="0 0 16 16"><rect/></svg>',
    ];
    const result = extract(lines);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('16 16');
  });

  test('returns empty array for non-SVG code', () => {
    const lines = [
      'export const Button = () => <button>Click</button>;',
    ];
    expect(extract(lines)).toHaveLength(0);
  });

  test('handles SVG split across many lines', () => {
    const lines = [
      '  <svg',
      '    viewBox="0 0 24 24"',
      '    fill="none"',
      '    stroke="currentColor">',
      '    <path d="M5 12h14"/>',
      '  </svg>',
    ];
    const result = extract(lines);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('viewBox');
    expect(result[0]).toContain('</svg>');
  });

  test('handles single-line SVG with open and close on same line', () => {
    const lines = [
      '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>',
    ];
    const result = extract(lines);
    expect(result).toHaveLength(1);
  });

  test('ignores <svg inside string literals in code', () => {
    const lines = [
      "const svgStart = trimmed.indexOf('<svg');",
      "if (fragment.includes('</svg>')) {",
    ];
    expect(extract(lines)).toHaveLength(0);
  });

  test('ignores <svgElement (partial tag name match)', () => {
    const lines = [
      '<svgElement viewBox="0 0 24 24"></svgElement>',
    ];
    expect(extract(lines)).toHaveLength(0);
  });

  test('collects outer SVG containing inner self-closing <svg />', () => {
    const lines = [
      '<svg viewBox="0 0 24 24">',
      '  <svg viewBox="0 0 12 12" />',
      '  <path d="M0 0"/>',
      '</svg>',
    ];
    const result = extract(lines);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('<path');
    expect(result[0]).toContain('</svg>');
  });
});

describe('SVGExtractor.scan (DOM-based)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    SVGExtractor.resetScanFlags();
  });

  function makeDiffLine(text, type = 'addition') {
    return `<tr><td><code class="diff-text syntax-highlighted-line ${type}">${text}</code></td></tr>`;
  }

  test('nested new-UI containers scope SVGs to their own file', () => {
    document.body.innerHTML = `
      <div id="diff-abc">
        <h3 class="file-name"><a href="#diff-abc">src/icons/AppleIcon.tsx</a></h3>
        <table data-diff-anchor="diff-abc">
          ${makeDiffLine('export function AppleIcon() {')}
          ${makeDiffLine('  return (')}
          ${makeDiffLine('    &lt;svg viewBox="0 0 24 24"&gt;')}
          ${makeDiffLine('      &lt;path d="M18 10c0-4-3-7-7-7S4 6 4 10"/&gt;')}
          ${makeDiffLine('    &lt;/svg&gt;')}
          ${makeDiffLine('  );')}
          ${makeDiffLine('}')}
        </table>
        <div id="diff-def">
          <h3 class="file-name"><a href="#diff-def">src/icons/SpotifyIcon.tsx</a></h3>
          <table data-diff-anchor="diff-def">
            ${makeDiffLine('export function SpotifyIcon() {')}
            ${makeDiffLine('  return (')}
            ${makeDiffLine('    &lt;svg viewBox="0 0 24 24"&gt;')}
            ${makeDiffLine('      &lt;circle cx="12" cy="12" r="10"/&gt;')}
            ${makeDiffLine('    &lt;/svg&gt;')}
            ${makeDiffLine('  );')}
            ${makeDiffLine('}')}
          </table>
        </div>
      </div>
    `;

    const results = SVGExtractor.scan();

    expect(results).toHaveLength(2);

    const apple = results.find(r => r.filePath.includes('AppleIcon'));
    const spotify = results.find(r => r.filePath.includes('SpotifyIcon'));

    expect(apple).toBeDefined();
    expect(apple.svgs).toHaveLength(1);
    expect(apple.svgs[0]).toContain('M18');
    expect(apple.svgs[0]).not.toContain('circle');

    expect(spotify).toBeDefined();
    expect(spotify.svgs).toHaveLength(1);
    expect(spotify.svgs[0]).toContain('circle');
    expect(spotify.svgs[0]).not.toContain('M18');
  });

  test('sibling (non-nested) containers each get their own SVGs', () => {
    document.body.innerHTML = `
      <div id="diff-aaa">
        <h3 class="file-name"><a href="#diff-aaa">src/icons/StarIcon.tsx</a></h3>
        <table data-diff-anchor="diff-aaa">
          ${makeDiffLine('&lt;svg viewBox="0 0 24 24"&gt;')}
          ${makeDiffLine('  &lt;polygon points="12,2 15,9 22,9 17,14 19,22 12,17 5,22 7,14 2,9 9,9"/&gt;')}
          ${makeDiffLine('&lt;/svg&gt;')}
        </table>
      </div>
      <div id="diff-bbb">
        <h3 class="file-name"><a href="#diff-bbb">src/icons/HeartIcon.tsx</a></h3>
        <table data-diff-anchor="diff-bbb">
          ${makeDiffLine('&lt;svg viewBox="0 0 24 24"&gt;')}
          ${makeDiffLine('  &lt;path d="M12 21C12 21 4 13 4 8"/&gt;')}
          ${makeDiffLine('&lt;/svg&gt;')}
        </table>
      </div>
    `;

    const results = SVGExtractor.scan();
    expect(results).toHaveLength(2);

    const star = results.find(r => r.filePath.includes('StarIcon'));
    const heart = results.find(r => r.filePath.includes('HeartIcon'));

    expect(star.svgs).toHaveLength(1);
    expect(star.svgs[0]).toContain('polygon');

    expect(heart.svgs).toHaveLength(1);
    expect(heart.svgs[0]).toContain('M12 21');
  });

  test('nested legacy containers scope SVGs to their own file', () => {
    document.body.innerHTML = `
      <div class="file" data-tagsearch-path="src/icons/AppleIcon.tsx">
        <div class="file-header">
          <div class="file-info"><a title="src/icons/AppleIcon.tsx">src/icons/AppleIcon.tsx</a></div>
        </div>
        <div class="js-file-content">
          <table>
            <tr><td class="blob-code blob-code-addition"><span class="blob-code-inner">&lt;svg viewBox="0 0 24 24"&gt;</span></td></tr>
            <tr><td class="blob-code blob-code-addition"><span class="blob-code-inner">  &lt;path d="M18 10"/&gt;</span></td></tr>
            <tr><td class="blob-code blob-code-addition"><span class="blob-code-inner">&lt;/svg&gt;</span></td></tr>
          </table>
        </div>
        <div class="file" data-tagsearch-path="src/icons/SpotifyIcon.tsx">
          <div class="file-header">
            <div class="file-info"><a title="src/icons/SpotifyIcon.tsx">src/icons/SpotifyIcon.tsx</a></div>
          </div>
          <div class="js-file-content">
            <table>
              <tr><td class="blob-code blob-code-addition"><span class="blob-code-inner">&lt;svg viewBox="0 0 24 24"&gt;</span></td></tr>
              <tr><td class="blob-code blob-code-addition"><span class="blob-code-inner">  &lt;circle cx="12" cy="12" r="10"/&gt;</span></td></tr>
              <tr><td class="blob-code blob-code-addition"><span class="blob-code-inner">&lt;/svg&gt;</span></td></tr>
            </table>
          </div>
        </div>
      </div>
    `;

    const results = SVGExtractor.scan();
    expect(results).toHaveLength(2);

    const apple = results.find(r => r.filePath.includes('AppleIcon'));
    const spotify = results.find(r => r.filePath.includes('SpotifyIcon'));

    expect(apple.svgs).toHaveLength(1);
    expect(apple.svgs[0]).not.toContain('circle');

    expect(spotify.svgs).toHaveLength(1);
    expect(spotify.svgs[0]).toContain('circle');
  });
});

describe('SVGExtractor.stripCommentLines', () => {
  const strip = SVGExtractor.stripCommentLines;

  test('removes single-line JS comments', () => {
    const result = strip(['// this is a comment', 'code here']);
    expect(result).toEqual(['code here']);
  });

  test('removes single-line block comments', () => {
    const result = strip(['/* comment */', 'code here']);
    expect(result).toEqual(['code here']);
  });

  test('removes multi-line block comments', () => {
    const result = strip(['/*', 'inside comment', '*/', 'code here']);
    expect(result).toEqual(['code here']);
  });

  test('removes JSX comments', () => {
    const result = strip(['{/* jsx comment */}', 'code here']);
    expect(result).toEqual(['code here']);
  });

  test('removes multi-line JSX comments', () => {
    const result = strip(['{/*', '<svg viewBox="0 0 24 24"></svg>', '*/}', 'code here']);
    expect(result).toEqual(['code here']);
  });

  test('preserves non-comment lines', () => {
    const input = ['const a = 1;', 'const b = 2;'];
    expect(strip(input)).toEqual(input);
  });
});
