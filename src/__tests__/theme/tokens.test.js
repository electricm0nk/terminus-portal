// TDD Red: token structure tests — must fail before themes are created
import { describe, it, expect } from 'vitest';
import terminal from '../../themes/terminal.js';
import spaceops from '../../themes/spaceops.js';

const REQUIRED_KEYS = [
  'bg', 'bgSurface', 'bgCard',
  'text', 'textMuted',
  'accent', 'accentDim',
  'border', 'borderActive',
  'statusOnline', 'statusUnreachable', 'statusChecking', 'statusNoCheck',
  'fontFamily', 'scanlines',
];

describe('Terminal theme tokens', () => {
  it('has all 15 required keys', () => {
    REQUIRED_KEYS.forEach((key) => {
      expect(terminal, `terminal missing key: ${key}`).toHaveProperty(key);
    });
  });

  it('has scanlines: true', () => {
    expect(terminal.scanlines).toBe(true);
  });
});

describe('Space Ops theme tokens', () => {
  it('has all 15 required keys', () => {
    REQUIRED_KEYS.forEach((key) => {
      expect(spaceops, `spaceops missing key: ${key}`).toHaveProperty(key);
    });
  });

  it('has scanlines: false', () => {
    expect(spaceops.scanlines).toBe(false);
  });
});
