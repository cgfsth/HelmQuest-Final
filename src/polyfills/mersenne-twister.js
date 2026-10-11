// Simple polyfill for mersenne-twister to fix Cesium dependency issue
// This provides a default export that Cesium expects
class MersenneTwister {
  constructor(seed) {
    if (seed === undefined) {
      seed = new Date().getTime();
    }
    this.N = 624;
    this.M = 397;
    this.MATRIX_A = 0x9908b0df;
    this.UPPER_MASK = 0x80000000;
    this.LOWER_MASK = 0x7fffffff;
    this.mt = new Array(this.N);
    this.mti = this.N + 1;
    this.init_genrand(seed);
  }

  init_genrand(s) {
    this.mt[0] = s >>> 0;
    for (this.mti = 1; this.mti < this.N; this.mti++) {
      const s = this.mt[this.mti - 1] ^ (this.mt[this.mti - 1] >>> 30);
      this.mt[this.mti] = (((s & 0xffff0000) >>> 16) * 1812433253) + ((s & 0x0000ffff) * 1812433253) + this.mti;
      this.mt[this.mti] >>>= 0;
    }
  }

  genrand_int32() {
    let y;
    if (this.mti >= this.N) {
      let kk;
      if (this.mti === this.N + 1) {
        this.init_genrand(5489);
      }
      for (kk = 0; kk < this.N - this.M; kk++) {
        y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
        this.mt[kk] = this.mt[kk + this.M] ^ (y >>> 1) ^ ((y & 1) ? this.MATRIX_A : 0);
      }
      for (; kk < this.N - 1; kk++) {
        y = (this.mt[kk] & this.UPPER_MASK) | (this.mt[kk + 1] & this.LOWER_MASK);
        this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ (y >>> 1) ^ ((y & 1) ? this.MATRIX_A : 0);
      }
      y = (this.mt[this.N - 1] & this.UPPER_MASK) | (this.mt[0] & this.LOWER_MASK);
      this.mt[this.N - 1] = this.mt[this.M - 1] ^ (y >>> 1) ^ ((y & 1) ? this.MATRIX_A : 0);
      this.mti = 0;
    }
    y = this.mt[this.mti++];
    y ^= (y >>> 11);
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= (y >>> 18);
    return y >>> 0;
  }

  random() {
    return this.genrand_int32() * (1.0 / 4294967296.0);
  }
}

export default MersenneTwister;
