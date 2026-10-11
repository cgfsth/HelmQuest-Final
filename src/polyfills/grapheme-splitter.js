// Polyfill for grapheme-splitter to fix Cesium dependency issue
// This provides a default export that Cesium expects

class GraphemeSplitter {
  constructor() {
    // Simple implementation that splits by character
    // This is a basic polyfill for Cesium compatibility
  }

  splitGraphemes(str) {
    // Return array of characters as a basic implementation
    return str.split('');
  }

  iterateGraphemes(str, callback) {
    const graphemes = this.splitGraphemes(str);
    for (let i = 0; i < graphemes.length; i++) {
      callback(graphemes[i], i, graphemes);
    }
  }
}

export default GraphemeSplitter;
