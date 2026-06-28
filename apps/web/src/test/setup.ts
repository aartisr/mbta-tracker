import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';

const canvasContextStub = {
  clearRect() {},
  beginPath() {},
  ellipse() {},
  fill() {},
  moveTo() {},
  lineTo() {},
  quadraticCurveTo() {},
  closePath() {},
  stroke() {},
  arc() {},
  fillText() {},
  getImageData(_x = 0, _y = 0, width = 56, height = 56) {
    return {
      data: new Uint8ClampedArray(width * height * 4),
      width,
      height
    };
  },
  lineCap: 'round',
  lineJoin: 'round',
  fillStyle: '#000000',
  strokeStyle: '#000000',
  lineWidth: 1,
  globalAlpha: 1,
  font: '',
  textAlign: 'left',
  textBaseline: 'alphabetic'
};

if (typeof HTMLCanvasElement !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: () => canvasContextStub
  });
}

afterEach(() => {
  cleanup();
});