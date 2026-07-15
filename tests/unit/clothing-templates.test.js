import { describe, expect, it } from 'vitest';
import {
  clothingTemplateCategories,
  clothingTemplates,
  templatesForCategory,
} from '../../src/data/templates/clothing-templates.js';

describe('clothing template library', () => {
  it('keeps every template in a declared category with a bundled local asset', () => {
    const categoryIds = new Set(clothingTemplateCategories.map((category) => category.id));

    clothingTemplates.forEach((template) => {
      expect(categoryIds.has(template.category)).toBe(true);
      expect(template.asset).toMatch(/^\/templates\/fluent\/.+\.svg$/);
    });
  });

  it('exposes templates by category without editor-specific branching', () => {
    expect(templatesForCategory('tops')).toHaveLength(7);
    expect(templatesForCategory('traditional')).toHaveLength(4);
  });
});
