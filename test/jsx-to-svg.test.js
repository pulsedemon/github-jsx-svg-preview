/**
 * @jest-environment jsdom
 */

const JsxToSvg = require('../lib/jsx-to-svg');

describe('JsxToSvg.convert', () => {
  const convert = JsxToSvg.convert;

  test('converts camelCase SVG attributes to kebab-case', () => {
    const input = '<svg strokeWidth="2" strokeLinecap="round" fillRule="evenodd"></svg>';
    const result = convert(input);
    expect(result).toContain('stroke-width="2"');
    expect(result).toContain('stroke-linecap="round"');
    expect(result).toContain('fill-rule="evenodd"');
  });

  test('converts className to class', () => {
    const input = '<svg className="my-icon" viewBox="0 0 24 24"></svg>';
    const result = convert(input);
    expect(result).toContain('class="my-icon"');
    expect(result).not.toContain('className');
  });

  test('replaces fill="currentColor" with default preview color', () => {
    const input = '<svg fill="currentColor"><path d="M0 0"/></svg>';
    const result = convert(input);
    expect(result).toContain('fill="#656d76"');
    expect(result).not.toContain('currentColor');
  });

  test('replaces stroke="currentColor" with default preview color', () => {
    const input = '<svg stroke="currentColor"><path d="M0 0"/></svg>';
    const result = convert(input);
    expect(result).toContain('stroke="#656d76"');
  });

  test('adds xmlns when missing', () => {
    const input = '<svg viewBox="0 0 24 24"><path d="M0 0"/></svg>';
    const result = convert(input);
    expect(result).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  test('preserves existing xmlns', () => {
    const input = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"></svg>';
    const result = convert(input);
    const count = (result.match(/xmlns=/g) || []).length;
    expect(count).toBe(1);
  });

  test('converts xlink:href from JSX camelCase', () => {
    const input = '<svg><use xlinkHref="#icon"/></svg>';
    const result = convert(input);
    expect(result).toContain('xlink:href="#icon"');
  });
});

describe('JsxToSvg.stripJsxExpressions', () => {
  const strip = JsxToSvg.stripJsxExpressions;

  test('removes simple JSX expressions', () => {
    expect(strip('className={cn}')).toBe('');
  });

  test('removes spread expressions', () => {
    expect(strip('{...props}')).toBe('');
  });

  test('removes spread expressions with function calls', () => {
    expect(strip('{...getProps()}')).toBe('');
  });

  test('handles nested braces (style={{ }})', () => {
    const input = 'style={{ color: "red", fontSize: 12 }}';
    expect(strip(input)).toBe('');
  });

  test('handles arrow functions with braces', () => {
    const input = 'onClick={() => { doStuff(); return true; }}';
    expect(strip(input)).toBe('');
  });

  test('removes attribute name before expression', () => {
    const input = '<svg className={styles.icon} viewBox="0 0 24 24">';
    const result = strip(input);
    expect(result).toContain('viewBox="0 0 24 24"');
    expect(result).not.toContain('className');
  });

  test('preserves string-quoted attributes', () => {
    const input = '<svg viewBox="0 0 24 24" fill="none">';
    expect(strip(input)).toBe(input);
  });

  test('removes standalone JSX expression children', () => {
    const input = '<text>{label}</text>';
    expect(strip(input)).toBe('<text></text>');
  });

  test('handles multiple expressions in sequence', () => {
    const input = 'a={1} b={2} c="3"';
    const result = strip(input);
    expect(result.trim()).toBe('c="3"');
    expect(result).not.toContain('a=');
    expect(result).not.toContain('b=');
  });
});

describe('JsxToSvg.toElement', () => {
  test('returns an SVG element for valid SVG', () => {
    const el = JsxToSvg.toElement('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0"/></svg>');
    expect(el).not.toBeNull();
    expect(el.tagName).toBe('svg');
  });

  test('returns null for invalid SVG', () => {
    const el = JsxToSvg.toElement('<svg><this is not valid');
    expect(el).toBeNull();
  });
});
