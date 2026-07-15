export const editorDefinitions = {
  clothes: {
    id: 'clothes',
    title: 'Design Clothes',
    defaultProjectName: 'Untitled collection',
    emptyHint: 'Start with a template, material, image, or text.',
    categories: [
      { id: 'templates', label: 'Templates', icon: 'layout-template' },
      { id: 'fabrics', label: 'Fabric', icon: 'layers' },
      { id: 'colour', label: 'Colour', icon: 'palette' },
      { id: 'image', label: 'Image', icon: 'image' },
      { id: 'text', label: 'Text', icon: 'type' },
      { id: 'measurements', label: 'Measurements', icon: 'ruler' },
      { id: 'align', label: 'Alignment', icon: 'align-center' },
      { id: 'layers', label: 'Layers', icon: 'layers-3' },
      { id: 'effects', label: 'Effects', icon: 'sparkles' },
      { id: 'properties', label: 'Properties', icon: 'sliders-horizontal' },
    ],
  },
  logo: {
    id: 'logo',
    title: 'Create Logo',
    defaultProjectName: 'Untitled logo',
    emptyHint: 'Use text, shapes, colour, or an image to start your mark.',
    categories: [
      { id: 'text', label: 'Text', icon: 'type' },
      { id: 'shapes', label: 'Shapes', icon: 'shapes' },
      { id: 'colour', label: 'Colour', icon: 'palette' },
      { id: 'image', label: 'Image', icon: 'image' },
      { id: 'align', label: 'Alignment', icon: 'align-center' },
      { id: 'effects', label: 'Effects', icon: 'sparkles' },
      { id: 'layers', label: 'Layers', icon: 'layers-3' },
      { id: 'properties', label: 'Properties', icon: 'sliders-horizontal' },
    ],
  },
  sketch: {
    id: 'sketch',
    title: 'Sketch Diagram',
    defaultProjectName: 'Untitled diagram',
    emptyHint: 'Draw a thought, add a shape, or place an image.',
    categories: [
      { id: 'draw', label: 'Drawing', icon: 'pencil' },
      { id: 'brush', label: 'Brush', icon: 'paintbrush' },
      { id: 'pen', label: 'Pen', icon: 'pen-tool' },
      { id: 'shapes', label: 'Shapes', icon: 'shapes' },
      { id: 'image', label: 'Image', icon: 'image' },
      { id: 'text', label: 'Text', icon: 'type' },
      { id: 'colour', label: 'Colour', icon: 'palette' },
      { id: 'layers', label: 'Layers', icon: 'layers-3' },
      { id: 'properties', label: 'Properties', icon: 'sliders-horizontal' },
    ],
  },
};

export const objectToolSets = {
  text: ['Font', 'Font Size', 'Font Weight', 'Colour', 'Outline', 'Shadow', 'Gradient', 'Letter Spacing', 'Line Height', 'Alignment', 'Opacity'],
  image: ['Crop', 'Resize', 'Rotate', 'Flip', 'Opacity', 'Replace', 'Duplicate', 'Delete'],
  garment: ['Fabric', 'Texture', 'Pattern', 'Colour', 'Measurements', 'Resize', 'Rotate', 'Mirror', 'Cut', 'Join', 'Duplicate', 'Layer', 'Properties'],
  shape: ['Fill', 'Stroke', 'Resize', 'Rotate', 'Opacity', 'Duplicate', 'Delete'],
  drawing: ['Brush', 'Stroke', 'Colour', 'Opacity', 'Duplicate', 'Delete'],
};

export function getEditorDefinition(editorId) {
  return editorDefinitions[editorId] ?? editorDefinitions.clothes;
}
