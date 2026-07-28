export const clothingTemplateCategories = [
  { id: 'essentials', label: 'Essentials', icon: 'shirt' },
  { id: 'outerwear', label: 'Outerwear', icon: 'shield' },
  { id: 'performance', label: 'Performance', icon: 'badge' },
  { id: 'headwear', label: 'Headwear', icon: 'circle-dot' },
];

// These production-style bases use local raster mockups, rather than remote or
// vector placeholder artwork. The editor reads this same data for the library,
// in-editor previews, editable print areas, and offline asset caching.
export const clothingTemplates = [
  { id: 'studio-tee', category: 'essentials', name: 'Studio T-shirt', icon: 'shirt', shape: 'tee', accent: '#6f56d8', mockup: '/templates/mockups/tee-studio.png', material: 'Combed cotton', printZone: { x: 50, y: 51, width: 38, height: 18 } },
  { id: 'night-hoodie', category: 'outerwear', name: 'Night Hoodie', icon: 'shirt', shape: 'hoodie', accent: '#4d5ec9', mockup: '/templates/mockups/hoodie-studio.png', material: 'Brushed fleece', printZone: { x: 50, y: 50, width: 34, height: 15 } },
  { id: 'club-jersey', category: 'performance', name: 'Club Jersey', icon: 'badge', shape: 'jersey', accent: '#188da7', mockup: '/templates/mockups/jersey-studio.png', material: 'Breathable mesh', printZone: { x: 50, y: 52, width: 34, height: 17 } },
  { id: 'field-cap', category: 'headwear', name: 'Field Cap', icon: 'circle-dot', shape: 'cap', accent: '#bd7c3e', mockup: '/templates/mockups/cap-studio.png', material: 'Structured twill', printZone: { x: 50, y: 48, width: 30, height: 14 } },
];

export function templatesForCategory(categoryId) {
  return clothingTemplates.filter((template) => template.category === categoryId);
}

export function getClothingTemplate(templateId) {
  return clothingTemplates.find((template) => template.id === templateId) ?? null;
}
