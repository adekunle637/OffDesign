export const clothingTemplateCategories = [
  { id: 'tops', label: 'Tops', icon: 'shirt' },
  { id: 'bottoms', label: 'Bottoms', icon: 'panel-top' },
  { id: 'dresses', label: 'Dresses', icon: 'sparkles' },
  { id: 'outerwear', label: 'Outerwear', icon: 'shield' },
  { id: 'footwear', label: 'Footwear', icon: 'footprints' },
  { id: 'accessories', label: 'Accessories', icon: 'gem' },
  { id: 'traditional', label: 'Traditional Wear', icon: 'landmark' },
];

// Templates are deliberately data-only. Adding a new starting point only requires
// adding one record here; the workspace, library, previews, and drag behaviour
// consume the same schema.
export const clothingTemplates = [
  { id: 'classic-t-shirt', category: 'tops', name: 'T-Shirt', icon: 'shirt', shape: 'tee', accent: '#7856f3', asset: '/templates/fluent/t-shirt.svg' },
  { id: 'oversized-t-shirt', category: 'tops', name: 'Oversized T-Shirt', icon: 'shirt', shape: 'oversized', accent: '#ab7cf6', asset: '/templates/fluent/t-shirt.svg' },
  { id: 'polo-shirt', category: 'tops', name: 'Polo Shirt', icon: 'shirt', shape: 'polo', accent: '#4d8cff', asset: '/templates/fluent/t-shirt.svg' },
  { id: 'long-sleeve', category: 'tops', name: 'Long Sleeve', icon: 'shirt', shape: 'long-sleeve', accent: '#e07855', asset: '/templates/fluent/t-shirt.svg' },
  { id: 'hoodie', category: 'tops', name: 'Hoodie', icon: 'shirt', shape: 'hoodie', accent: '#5b37d7', asset: '/templates/fluent/coat.svg' },
  { id: 'sweatshirt', category: 'tops', name: 'Sweatshirt', icon: 'shirt', shape: 'sweatshirt', accent: '#658d6f', asset: '/templates/fluent/t-shirt.svg' },
  { id: 'jersey', category: 'tops', name: 'Jersey', icon: 'shirt', shape: 'jersey', accent: '#2694aa', asset: '/templates/fluent/t-shirt.svg' },
  { id: 'trousers', category: 'bottoms', name: 'Trousers', icon: 'panel-top', shape: 'trousers', accent: '#343b58', asset: '/templates/fluent/jeans.svg' },
  { id: 'cargo-pants', category: 'bottoms', name: 'Cargo Pants', icon: 'panel-top', shape: 'cargo', accent: '#768153', asset: '/templates/fluent/jeans.svg' },
  { id: 'joggers', category: 'bottoms', name: 'Joggers', icon: 'panel-top', shape: 'joggers', accent: '#74618f', asset: '/templates/fluent/jeans.svg' },
  { id: 'shorts', category: 'bottoms', name: 'Shorts', icon: 'panel-top', shape: 'shorts', accent: '#e18d5a', asset: '/templates/fluent/jeans.svg' },
  { id: 'dress', category: 'dresses', name: 'Dress', icon: 'sparkles', shape: 'dress', accent: '#d4719a', asset: '/templates/fluent/dress.svg' },
  { id: 'skirt', category: 'dresses', name: 'Skirt', icon: 'sparkles', shape: 'skirt', accent: '#b25ba4', asset: '/templates/fluent/dress.svg' },
  { id: 'jacket', category: 'outerwear', name: 'Jacket', icon: 'shield', shape: 'jacket', accent: '#4a669a', asset: '/templates/fluent/coat.svg' },
  { id: 'blazer', category: 'outerwear', name: 'Blazer', icon: 'shield', shape: 'blazer', accent: '#263c6b', asset: '/templates/fluent/lab-coat.svg' },
  { id: 'sneakers', category: 'footwear', name: 'Sneakers', icon: 'footprints', shape: 'sneakers', accent: '#e76c5b', asset: '/templates/fluent/running-shoe.svg' },
  { id: 'slides', category: 'footwear', name: 'Slides', icon: 'footprints', shape: 'slides', accent: '#70a5b7', asset: '/templates/fluent/flat-shoe.svg' },
  { id: 'face-cap', category: 'accessories', name: 'Face Cap', icon: 'gem', shape: 'cap', accent: '#d19a4b', asset: '/templates/fluent/billed-cap.svg' },
  { id: 'bucket-hat', category: 'accessories', name: 'Bucket Hat', icon: 'gem', shape: 'bucket-hat', accent: '#b46a5c', asset: '/templates/fluent/womans-hat.svg' },
  { id: 'bag', category: 'accessories', name: 'Bag', icon: 'gem', shape: 'bag', accent: '#9f7050', asset: '/templates/fluent/handbag.svg' },
  { id: 'scarf', category: 'accessories', name: 'Scarf', icon: 'gem', shape: 'scarf', accent: '#d86e94', asset: '/templates/fluent/scarf.svg' },
  { id: 'agbada', category: 'traditional', name: 'Agbada', icon: 'landmark', shape: 'agbada', accent: '#b6853e', asset: '/templates/fluent/kimono.svg' },
  { id: 'kaftan', category: 'traditional', name: 'Kaftan', icon: 'landmark', shape: 'kaftan', accent: '#4b9985', asset: '/templates/fluent/kimono.svg' },
  { id: 'senator', category: 'traditional', name: 'Senator', icon: 'landmark', shape: 'senator', accent: '#465c9b', asset: '/templates/fluent/kimono.svg' },
  { id: 'native-wear', category: 'traditional', name: 'Native Wear', icon: 'landmark', shape: 'native', accent: '#9a5e4e', asset: '/templates/fluent/sari.svg' },
];

export function templatesForCategory(categoryId) {
  return clothingTemplates.filter((template) => template.category === categoryId);
}

export function getClothingTemplate(templateId) {
  return clothingTemplates.find((template) => template.id === templateId) ?? null;
}
