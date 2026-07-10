import { describe, expect, it } from 'vitest';
import { routes } from '../../src/app/routes.js';

describe('routes', () => {
  it('defines a single fallback route', () => {
    expect(routes.filter((route) => route.path === '*')).toHaveLength(1);
  });

  it('keeps navigable route paths unique', () => {
    const navPaths = routes.filter((route) => route.nav).map((route) => route.path);
    expect(new Set(navPaths).size).toBe(navPaths.length);
  });
});
