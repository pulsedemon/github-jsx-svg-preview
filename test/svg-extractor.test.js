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

  test('preserves non-comment lines', () => {
    const input = ['const a = 1;', 'const b = 2;'];
    expect(strip(input)).toEqual(input);
  });
});
