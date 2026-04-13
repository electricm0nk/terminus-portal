// TDD baseline — smoke test (red first, then Vitest configured to pass)
import { describe, it, expect } from 'vitest';

describe('baseline', () => {
  it('passes arithmetic', () => {
    expect(1 + 1).toBe(2);
  });
});
