import { describe, expect, it } from 'vitest';
import {
  clothingTemplateCategories,
  clothingTemplates,
  templatesForCategory,
} from '../../src/data/templates/clothing-templates.js';

describe('clothing template library', () => {
  it('keeps every template in a declared category with a bundled local raster mockup', () => {
    const categoryIds = new Set(clothingTemplateCategories.map((category) => category.id));

    clothingTemplates.forEach((template) => {
      expect(categoryIds.has(template.category)).toBe(true);
      expect(template.mockup).toMatch(/^\/templates\/mockups\/.+\.png$/);
      expect(template.printZone).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
    });
  });

  it('exposes templates by category without editor-specific branching', () => {
    expect(templatesForCategory('essentials')).toHaveLength(1);
    expect(templatesForCategory('headwear')).toHaveLength(1);
  });
});
