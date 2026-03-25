/**
 * Converts JSX SVG markup into valid HTML SVG that a browser can render.
 * Handles attribute renaming, expression stripping, and sensible defaults.
 */

const JsxToSvg = (() => {
  const CAMEL_TO_KEBAB_ATTRS = {
    className: 'class',
    htmlFor: 'for',
    tabIndex: 'tabindex',
    strokeWidth: 'stroke-width',
    strokeLinecap: 'stroke-linecap',
    strokeLinejoin: 'stroke-linejoin',
    strokeDasharray: 'stroke-dasharray',
    strokeDashoffset: 'stroke-dashoffset',
    strokeMiterlimit: 'stroke-miterlimit',
    strokeOpacity: 'stroke-opacity',
    fillRule: 'fill-rule',
    fillOpacity: 'fill-opacity',
    clipRule: 'clip-rule',
    clipPath: 'clip-path',
    clipPathUnits: 'clipPathUnits',
    colorInterpolation: 'color-interpolation',
    colorInterpolationFilters: 'color-interpolation-filters',
    floodColor: 'flood-color',
    floodOpacity: 'flood-opacity',
    fontFamily: 'font-family',
    fontSize: 'font-size',
    fontStyle: 'font-style',
    fontWeight: 'font-weight',
    imageRendering: 'image-rendering',
    letterSpacing: 'letter-spacing',
    lightingColor: 'lighting-color',
    markerEnd: 'marker-end',
    markerMid: 'marker-mid',
    markerStart: 'marker-start',
    pointerEvents: 'pointer-events',
    shapeRendering: 'shape-rendering',
    stopColor: 'stop-color',
    stopOpacity: 'stop-opacity',
    textAnchor: 'text-anchor',
    textDecoration: 'text-decoration',
    textRendering: 'text-rendering',
    transformOrigin: 'transform-origin',
    wordSpacing: 'word-spacing',
    writingMode: 'writing-mode',
    dominantBaseline: 'dominant-baseline',
    alignmentBaseline: 'alignment-baseline',
    baselineShift: 'baseline-shift',
    vectorEffect: 'vector-effect',
    paintOrder: 'paint-order',
    colorProfile: 'color-profile',
    glyphOrientationHorizontal: 'glyph-orientation-horizontal',
    glyphOrientationVertical: 'glyph-orientation-vertical',
    enableBackground: 'enable-background',

    xlinkHref: 'xlink:href',
    xlinkActuate: 'xlink:actuate',
    xlinkArcrole: 'xlink:arcrole',
    xlinkRole: 'xlink:role',
    xlinkShow: 'xlink:show',
    xlinkTitle: 'xlink:title',
    xlinkType: 'xlink:type',
    xmlBase: 'xml:base',
    xmlLang: 'xml:lang',
    xmlSpace: 'xml:space',
    xmlnsXlink: 'xmlns:xlink',
  };

  const DEFAULT_PREVIEW_COLOR = '#656d76';

  /**
   * Walk the string and remove all top-level `{...}` JSX expressions,
   * correctly handling nested braces (e.g. style={{ color: 'red' }},
   * onClick={() => { doStuff() }}, {...getProps()}).
   *
   * Also strips the `attrName=` prefix preceding an expression so that
   * `className={cn}` becomes '' rather than leaving an orphaned `className=`.
   */
  function stripJsxExpressions(input) {
    let result = '';
    let i = 0;

    while (i < input.length) {
      if (input[i] === '{') {
        let depth = 1;
        i++;
        while (i < input.length && depth > 0) {
          const ch = input[i];
          if (ch === "'" || ch === '"' || ch === '`') {
            i++;
            while (i < input.length && input[i] !== ch) {
              if (input[i] === '\\') i++;
              i++;
            }
            i++;
            continue;
          }
          if (ch === '{') depth++;
          else if (ch === '}') depth--;
          i++;
        }
        // Also strip the preceding `attrName=` if present
        const stripped = result.replace(/\w[\w-]*=\s*$/, '');
        result = stripped;
      } else {
        result += input[i];
        i++;
      }
    }

    return result;
  }

  /**
   * Convert a JSX SVG string into valid HTML SVG markup.
   */
  function convert(jsxSvg) {
    let svg = stripJsxExpressions(jsxSvg);

    // Rename camelCase attributes to their kebab-case/namespaced equivalents
    for (const [camel, kebab] of Object.entries(CAMEL_TO_KEBAB_ATTRS)) {
      const re = new RegExp(`\\b${camel}=`, 'g');
      svg = svg.replace(re, `${kebab}=`);
    }

    // Replace fill="currentColor" and stroke="currentColor" with a visible default
    svg = svg.replace(/fill="currentColor"/g, `fill="${DEFAULT_PREVIEW_COLOR}"`);
    svg = svg.replace(/stroke="currentColor"/g, `stroke="${DEFAULT_PREVIEW_COLOR}"`);

    // Ensure the SVG has xmlns
    if (!svg.includes('xmlns=')) {
      svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    return svg.trim();
  }

  /**
   * Parse the SVG string and return a safe DOM element for rendering.
   * Uses DOMParser to avoid innerHTML injection risks.
   */
  function toElement(svgString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const errorNode = doc.querySelector('parsererror');
    if (errorNode) {
      return null;
    }
    return doc.documentElement;
  }

  return { convert, toElement, stripJsxExpressions, CAMEL_TO_KEBAB_ATTRS };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = JsxToSvg;
}
