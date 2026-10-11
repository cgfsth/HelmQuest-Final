// Polyfill for urijs to fix Cesium dependency issue
// This provides a default export that Cesium expects

// Simple URI implementation for Cesium compatibility
class URI {
  constructor(uri) {
    this._uri = uri || '';
  }

  toString() {
    return this._uri;
  }

  valueOf() {
    return this._uri;
  }

  absoluteTo(base) {
    if (!base) return this;
    // Simple absolute URL resolution
    if (this._uri.startsWith('http://') || this._uri.startsWith('https://')) {
      return this;
    }
    if (this._uri.startsWith('/')) {
      const url = new URL(base);
      return new URI(`${url.protocol}//${url.host}${this._uri}`);
    }
    const url = new URL(base);
    const path = url.pathname;
    const dir = path.substring(0, path.lastIndexOf('/'));
    return new URI(`${url.protocol}//${url.host}${dir}/${this._uri}`);
  }
}

export default URI;
