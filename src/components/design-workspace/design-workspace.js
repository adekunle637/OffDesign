import { fabricCategories, fabricTextures } from '../../data/fabrics/fabric-library.js';
import {
  getClothingTemplate,
  clothingTemplateCategories,
  templatesForCategory,
} from '../../data/templates/clothing-templates.js';
import { getDesign, saveDesignMetadata } from '../../data/repositories/design-repository.js';
import { createElementFromHtml } from '../../utils/dom.js';
import { hydrateIcons } from '../icon/icon.js';
import { getEditorDefinition, objectToolSets } from './workspace-config.js';

const MAX_HISTORY = 60;
const AUTO_SAVE_DELAY = 700;

export function createDesignWorkspace(editorId) {
  const workspace = new DesignWorkspace(getEditorDefinition(editorId));
  return workspace.element;
}

class DesignWorkspace {
  constructor(definition) {
    this.definition = definition;
    this.projectId = `workspace:${definition.id}:current`;
    this.state = createDefaultState(definition);
    this.history = [];
    this.future = [];
    this.dragState = null;
    this.autoSaveTimer = null;
    this.saveQueue = Promise.resolve();
    this.abortController = new AbortController();
    this.element = createElementFromHtml(this.markup());
    this.bindEvents();
    this.render();
    this.restoreSavedProject();
  }

  markup() {
    return `
      <section class="design-workspace" data-editor="${this.definition.id}" aria-label="${this.definition.title} workspace">
        <header class="workspace-toolbar" aria-label="Project toolbar">
          <div class="workspace-toolbar__history">
            <button class="workspace-icon-button" type="button" data-workspace-action="undo" aria-label="Undo" title="Undo"><i data-lucide="undo-2"></i></button>
            <button class="workspace-icon-button" type="button" data-workspace-action="redo" aria-label="Redo" title="Redo"><i data-lucide="redo-2"></i></button>
          </div>
          <label class="workspace-project-name">
            <span class="visually-hidden">Project name</span>
            <input type="text" maxlength="80" data-project-name aria-label="Project name" />
          </label>
          <div class="workspace-toolbar__actions">
            <label class="workspace-toolbar-button" title="Import a local image">
              <input class="visually-hidden" type="file" accept="image/*" data-image-input />
              <i data-lucide="upload"></i><span>Import</span>
            </label>
            <button class="workspace-toolbar-button" type="button" data-workspace-action="export"><i data-lucide="download"></i><span>Export</span></button>
            <button class="workspace-toolbar-button workspace-toolbar-button--search" type="button" data-search-open><i data-lucide="search"></i><span>Search</span></button>
            <span class="workspace-save-state" data-workspace-save-state aria-live="polite"><i data-lucide="check-circle-2"></i> Saved locally</span>
            <button class="button button--compact workspace-save-button" type="button" data-workspace-action="save"><i data-lucide="save"></i> Save project</button>
          </div>
        </header>

        <div class="workspace-stage" data-workspace-stage>
          <div class="workspace-stage__controls" aria-label="Canvas controls">
            <button class="workspace-icon-button" type="button" data-workspace-action="toggle-pan" aria-label="Pan canvas" title="Pan canvas"><i data-lucide="move"></i></button>
            <span class="workspace-stage__divider"></span>
            <button class="workspace-icon-button" type="button" data-workspace-action="zoom-out" aria-label="Zoom out"><i data-lucide="zoom-out"></i></button>
            <button class="workspace-zoom-readout" type="button" data-workspace-action="reset-zoom" title="Reset zoom" data-zoom-readout>100%</button>
            <button class="workspace-icon-button" type="button" data-workspace-action="zoom-in" aria-label="Zoom in"><i data-lucide="zoom-in"></i></button>
            <span class="workspace-stage__divider"></span>
            <button class="workspace-icon-button" type="button" data-workspace-action="toggle-grid" aria-label="Toggle grid" title="Grid"><i data-lucide="grid-3x3"></i></button>
            <button class="workspace-icon-button" type="button" data-workspace-action="toggle-rulers" aria-label="Toggle rulers" title="Rulers"><i data-lucide="ruler"></i></button>
            <button class="workspace-icon-button" type="button" data-workspace-action="toggle-guides" aria-label="Toggle guides" title="Guides"><i data-lucide="between-horizontal-start"></i></button>
          </div>
          <div class="workspace-stage__viewport" data-workspace-viewport>
            <div class="workspace-artboard" data-workspace-artboard tabindex="0" aria-label="Editable artboard. Drop images or templates here.">
              <div class="workspace-ruler workspace-ruler--horizontal" aria-hidden="true"></div>
              <div class="workspace-ruler workspace-ruler--vertical" aria-hidden="true"></div>
              <div class="workspace-guide workspace-guide--vertical" aria-hidden="true"></div>
              <div class="workspace-guide workspace-guide--horizontal" aria-hidden="true"></div>
              <div class="workspace-artboard__objects" data-workspace-objects></div>
              <p class="workspace-artboard__empty" data-workspace-empty>${this.definition.emptyHint}</p>
            </div>
          </div>
        </div>

        <nav class="workspace-bottom-toolbar" data-expanded="false" aria-label="Editing categories">
          <button class="workspace-toolbar-toggle" type="button" data-workspace-action="toggle-toolbar" aria-label="Expand editing toolbar"><i data-lucide="chevron-up"></i></button>
          <div class="workspace-bottom-toolbar__scroll" data-workspace-categories></div>
        </nav>
        <section class="workspace-context-panel" data-workspace-context aria-label="Editing tools"></section>
      </section>
    `;
  }

  bindEvents() {
    const { signal } = this.abortController;

    this.element.addEventListener('click', (event) => this.handleClick(event), { signal });
    this.element.addEventListener('change', (event) => this.handleChange(event), { signal });
    this.element.addEventListener('input', (event) => this.handleInput(event), { signal });
    this.element.addEventListener('dragstart', (event) => this.handleDragStart(event), { signal });
    this.element.addEventListener('dragover', (event) => this.handleDragOver(event), { signal });
    this.element.addEventListener('drop', (event) => this.handleDrop(event), { signal });
    this.element.addEventListener('pointerdown', (event) => this.handlePointerDown(event), {
      signal,
    });
    window.addEventListener('pointermove', (event) => this.handlePointerMove(event), { signal });
    window.addEventListener('pointerup', () => this.finishPointerAction(), { signal });
    window.addEventListener('keydown', (event) => this.handleKeyboardShortcut(event), { signal });
  }

  async restoreSavedProject() {
    try {
      const record = await getDesign(this.projectId);
      if (!this.element.isConnected) {
        return;
      }
      if (record?.workspace) {
        this.state = sanitizeState(record.workspace, this.definition);
        this.openSelectionTools();
      }
      this.setSaveState('Saved locally');
      this.render();
      this.addPendingTemplate();
    } catch {
      this.setSaveState('Local draft ready');
      this.addPendingTemplate();
    }
  }

  addPendingTemplate() {
    try {
      const templateId = sessionStorage.getItem('offdesign:pending-template');
      if (!templateId) {
        return;
      }
      sessionStorage.removeItem('offdesign:pending-template');
      this.addTemplate(templateId);
    } catch {
      // The workspace does not rely on session storage to create templates.
    }
  }

  handleClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) {
      return;
    }

    const action = target.closest('[data-workspace-action]')?.dataset.workspaceAction;
    if (action) {
      this.runAction(action);
      return;
    }

    const category = target.closest('[data-workspace-category]')?.dataset.workspaceCategory;
    if (category) {
      this.openCategory(category);
      return;
    }

    const templateId = target.closest('[data-template-id]')?.dataset.templateId;
    if (templateId) {
      this.addTemplate(templateId);
      return;
    }

    const templateCategory = target.closest('[data-template-category]')?.dataset.templateCategory;
    if (templateCategory) {
      this.state.templateCategory = templateCategory;
      this.renderContextPanel();
      return;
    }

    const fabricColour = target.closest('[data-fabric-colour]')?.dataset.fabricColour;
    if (fabricColour) {
      const swatch = target.closest('[data-fabric-colour]');
      this.applyFabric(fabricColour, swatch?.dataset.fabricTexture);
      return;
    }

    const texture = target.closest('[data-fabric-texture]')?.dataset.fabricTexture;
    if (texture) {
      this.applyTexture(texture);
      return;
    }

    const shape = target.closest('[data-add-shape]')?.dataset.addShape;
    if (shape) {
      this.addShape(shape);
      return;
    }

    const drawing = target.closest('[data-add-drawing]')?.dataset.addDrawing;
    if (drawing) {
      this.addDrawing(drawing);
      return;
    }

    const layerAction = target.closest('[data-layer-action]');
    if (layerAction) {
      this.runLayerAction(layerAction.dataset.layerAction, layerAction.dataset.objectId);
      return;
    }

    const objectAction = target.closest('[data-object-action]')?.dataset.objectAction;
    if (objectAction) {
      this.runObjectAction(objectAction);
    }
  }

  handleChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return;
    }

    if (target.matches('[data-project-name]')) {
      this.commit();
      this.state.projectName = target.value.trim() || this.definition.defaultProjectName;
      this.markDirty();
      return;
    }

    if (target.matches('[data-image-input]') && target.files?.[0]) {
      this.importImage(target.files[0]);
      target.value = '';
      return;
    }

    if (target.matches('[data-image-replace]') && target.files?.[0]) {
      this.replaceSelectedImage(target.files[0]);
      target.value = '';
      return;
    }

    if (target.matches('[data-background-colour]')) {
      this.setArtboardBackground('solid', target.value);
      return;
    }

    if (target.matches('[data-object-colour]')) {
      this.applyColour(target.value);
      return;
    }

    if (target.matches('[data-object-property]')) {
      this.updateSelectedProperty(target.dataset.objectProperty, target.value);
      return;
    }

    if (target.matches('[data-font-family]')) {
      this.updateSelectedProperty('fontFamily', target.value);
      return;
    }

    if (target.matches('[data-font-weight]')) {
      this.updateSelectedProperty('fontWeight', target.value);
    }
  }

  handleInput(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.matches('[data-project-name]')) {
      this.state.projectName = target.value || this.definition.defaultProjectName;
      this.updateProjectName();
    }
  }

  handleDragStart(event) {
    const target =
      event.target instanceof Element ? event.target.closest('[data-template-id]') : null;
    if (!target || !event.dataTransfer) {
      return;
    }

    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/x-offdesign-template', target.dataset.templateId ?? '');
  }

  handleDragOver(event) {
    if (event.target instanceof Element && event.target.closest('[data-workspace-artboard]')) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  handleDrop(event) {
    if (!(event.target instanceof Element) || !event.target.closest('[data-workspace-artboard]')) {
      return;
    }

    event.preventDefault();
    const templateId = event.dataTransfer?.getData('application/x-offdesign-template');
    if (templateId) {
      this.addTemplate(templateId, this.positionFromClient(event.clientX, event.clientY));
      return;
    }

    const [file] = [...(event.dataTransfer?.files ?? [])].filter((item) =>
      item.type.startsWith('image/'),
    );
    if (file) {
      this.importImage(file, this.positionFromClient(event.clientX, event.clientY));
    }
  }

  handlePointerDown(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || event.button > 0) {
      return;
    }

    if (target.closest('[data-object-popover]')) {
      return;
    }

    const resizeHandle = target.closest('[data-object-resize]');
    if (resizeHandle) {
      const objectElement = resizeHandle.closest('[data-object-id]');
      const objectId = objectElement?.dataset.objectId;
      const object = this.findObject(objectId);
      if (!object || object.locked) {
        return;
      }
      this.selectObject(object.id);
      this.dragState = {
        kind: 'resize',
        objectId: object.id,
        handle: resizeHandle.dataset.objectResize,
        origin: { x: event.clientX, y: event.clientY },
        object: { x: object.x, y: object.y, width: object.width, height: object.height },
        committed: false,
      };
      event.preventDefault();
      return;
    }

    const objectElement = target.closest('[data-object-id]');
    if (objectElement) {
      const objectId = objectElement.dataset.objectId;
      this.selectObject(objectId, event.shiftKey);
      const object = this.findObject(objectId);
      if (!object?.locked) {
        this.dragState = {
          kind: 'object',
          objectIds: [...this.state.selectedIds],
          origin: { x: event.clientX, y: event.clientY },
          positions: this.state.selectedIds.map((id) => {
            const selected = this.findObject(id);
            return { id, x: selected.x, y: selected.y };
          }),
          committed: false,
        };
      }
      event.preventDefault();
      return;
    }

    if (target.closest('[data-workspace-artboard]')) {
      if (this.state.panMode || event.shiftKey) {
        this.dragState = {
          kind: 'pan',
          origin: { x: event.clientX, y: event.clientY },
          pan: { x: this.state.artboard.panX, y: this.state.artboard.panY },
        };
      } else {
        this.state.selectedIds = [];
        this.renderSelection();
      }
    }
  }

  handlePointerMove(event) {
    if (!this.dragState || !this.element.isConnected) {
      return;
    }

    if (this.dragState.kind === 'pan') {
      this.state.artboard.panX = this.dragState.pan.x + event.clientX - this.dragState.origin.x;
      this.state.artboard.panY = this.dragState.pan.y + event.clientY - this.dragState.origin.y;
      this.renderArtboardTransform();
      return;
    }

    const artboard = this.element.querySelector('[data-workspace-artboard]');
    if (!artboard || !['object', 'resize'].includes(this.dragState.kind)) {
      return;
    }

    if (!this.dragState.committed) {
      this.commit();
      this.dragState.committed = true;
    }

    const rect = artboard.getBoundingClientRect();
    const deltaX = ((event.clientX - this.dragState.origin.x) / rect.width) * 100;
    const deltaY = ((event.clientY - this.dragState.origin.y) / rect.height) * 100;
    if (this.dragState.kind === 'resize') {
      this.resizeObjectFromPointer(event, artboard);
      this.renderObjects();
      return;
    }

    this.dragState.positions.forEach((position) => {
      const object = this.findObject(position.id);
      if (!object) {
        return;
      }
      object.x = clamp(position.x + this.snapValue(deltaX), 0, 100 - object.width);
      object.y = clamp(position.y + this.snapValue(deltaY), 0, 100 - object.height);
    });
    this.renderObjects();
  }

  finishPointerAction() {
    if (['object', 'resize'].includes(this.dragState?.kind) && this.dragState.committed) {
      this.markDirty();
    }
    this.dragState = null;
  }

  handleKeyboardShortcut(event) {
    if (!this.element.isConnected || isTypingInField(event.target)) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
      event.preventDefault();
      this.redo();
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.deleteSelected();
    }
  }

  runAction(action) {
    const actions = {
      undo: () => this.undo(),
      redo: () => this.redo(),
      save: () => this.saveProject(),
      export: () => this.exportProject(),
      'zoom-in': () => this.setZoom(this.state.artboard.zoom + 0.1),
      'zoom-out': () => this.setZoom(this.state.artboard.zoom - 0.1),
      'reset-zoom': () => this.setZoom(1),
      'toggle-grid': () => this.toggleArtboardOption('grid'),
      'toggle-rulers': () => this.toggleArtboardOption('rulers'),
      'toggle-guides': () => this.toggleArtboardOption('guides'),
      'toggle-pan': () => {
        this.state.panMode = !this.state.panMode;
        this.renderStageControls();
      },
      'toggle-toolbar': () => {
        this.state.toolbarExpanded = !this.state.toolbarExpanded;
        this.renderBottomToolbar();
        this.renderContextPanel();
      },
      'add-text': () => this.addText(),
      'background-white': () => this.setArtboardBackground('white', '#ffffff'),
      'background-transparent': () => this.setArtboardBackground('transparent', 'transparent'),
      'background-gradient-violet': () =>
        this.setArtboardBackground('gradient', 'linear-gradient(135deg, #eeeaff, #c3dfff)'),
      'background-gradient-warm': () =>
        this.setArtboardBackground('gradient', 'linear-gradient(135deg, #fff1e7, #ffd4cb)'),
      'duplicate-object': () => this.duplicateSelected(),
      'delete-object': () => this.deleteSelected(),
      'lock-object': () => this.toggleSelectedBoolean('locked'),
      'hide-object': () => this.toggleSelectedBoolean('hidden'),
      'flip-object': () => this.toggleSelectedBoolean('flipped'),
      'rotate-object': () => this.rotateSelected(15),
      'bring-forward': () => this.moveSelectedLayer(1),
      'send-backward': () => this.moveSelectedLayer(-1),
      'align-center': () => this.alignSelected('center'),
      'align-middle': () => this.alignSelected('middle'),
      'toggle-snap': () => {
        this.state.artboard.snap = !this.state.artboard.snap;
        this.renderContextPanel();
        this.markDirty();
      },
      'clear-garment-design': () => this.clearGarmentDesign(),
      'place-on-garment': () => this.placeSelectedDesignOnGarment(),
    };

    actions[action]?.();
  }

  openCategory(category) {
    if (this.state.activeCategory === category) {
      this.state.toolbarExpanded = !this.state.toolbarExpanded;
    } else {
      this.state.activeCategory = category;
      this.state.toolbarExpanded = true;
    }
    this.renderBottomToolbar();
    this.renderContextPanel();
  }

  addTemplate(templateId, position = null) {
    const template = getClothingTemplate(templateId);
    if (!template) {
      return;
    }

    this.commit();
    const object = createGarmentObject(template, position);
    this.state.objects.push(object);
    this.state.selectedIds = [object.id];
    this.openSelectionTools();
    this.markDirty();
    this.render();
  }

  addText() {
    const input = this.element.querySelector('[data-text-entry]');
    const value = input instanceof HTMLInputElement ? input.value.trim() : 'New text';
    if (!value) {
      return;
    }

    this.commit();
    const textObjects =
      this.definition.id === 'logo'
        ? [...value]
            .filter((character) => character.trim())
            .map((character, index) => createTextObject(character, { x: 31 + index * 8, y: 42 }))
        : [createTextObject(value)];
    this.state.objects.push(...textObjects);
    this.state.selectedIds = textObjects.map((object) => object.id);
    this.openSelectionTools();
    this.markDirty();
    this.render();
  }

  addShape(shape) {
    this.commit();
    const object = createShapeObject(shape);
    this.state.objects.push(object);
    this.state.selectedIds = [object.id];
    this.openSelectionTools();
    this.markDirty();
    this.render();
  }

  addDrawing(tool) {
    this.commit();
    const object = createDrawingObject(tool);
    this.state.objects.push(object);
    this.state.selectedIds = [object.id];
    this.openSelectionTools();
    this.markDirty();
    this.render();
  }

  async importImage(file, position = null) {
    if (!file.type.startsWith('image/')) {
      return;
    }

    try {
      const source = await readFileAsDataUrl(file);
      if (!this.element.isConnected) {
        return;
      }
      this.commit();
      const garment = this.selectedObjects().find((object) => object.kind === 'garment');
      if (garment) {
        garment.printAsset = createGarmentArtworkFromImage(source, file.name);
        this.state.selectedIds = [garment.id];
        this.openSelectionTools();
        this.markDirty();
        this.render();
        return;
      }
      const object = createImageObject(source, file.name, position);
      this.state.objects.push(object);
      this.state.selectedIds = [object.id];
      this.openSelectionTools();
      this.markDirty();
      this.render();
    } catch {
      this.setSaveState('Image could not be imported');
    }
  }

  selectObject(objectId, additive = false) {
    if (!this.findObject(objectId)) {
      return;
    }
    this.state.selectedIds = additive ? toggleId(this.state.selectedIds, objectId) : [objectId];
    this.openSelectionTools();
    this.renderSelection();
  }

  openSelectionTools() {
    if (!this.state.selectedIds.length) {
      return;
    }
    this.state.activeCategory = 'selection';
    this.state.toolbarExpanded = true;
  }

  updateSelectedProperty(property, rawValue) {
    if (!this.state.selectedIds.length) {
      return;
    }
    this.commit();
    const numericProperties = new Set([
      'width',
      'height',
      'rotation',
      'opacity',
      'fontSize',
      'letterSpacing',
      'lineHeight',
    ]);
    const value = numericProperties.has(property) ? Number(rawValue) : rawValue;
    this.selectedObjects().forEach((object) => {
      object[property] = property === 'opacity' ? clamp(value, 0, 100) : value;
    });
    this.markDirty();
    this.render();
  }

  applyColour(colour, application = 'fill') {
    if (this.state.selectedIds.length) {
      this.commit();
      this.selectedObjects().forEach((object) => {
        object.colour = colour;
        if (application === 'fabric') {
          object.fabric = colour;
        }
      });
      this.markDirty();
      this.render();
    } else {
      this.setArtboardBackground('solid', colour);
    }
  }

  applyFabric(colour, texture) {
    if (!this.state.selectedIds.length) {
      this.setArtboardBackground('solid', colour);
      return;
    }
    this.commit();
    this.selectedObjects().forEach((object) => {
      object.colour = colour;
      object.fabric = colour;
      if (texture) {
        object.texture = texture;
      }
    });
    this.markDirty();
    this.render();
  }

  applyTexture(texture) {
    const garments = this.selectedObjects().filter((object) => object.kind === 'garment');
    if (!garments.length) {
      this.setSaveState('Select a garment to change its texture');
      return;
    }
    this.commit();
    garments.forEach((object) => {
      object.texture = texture;
    });
    this.markDirty();
    this.render();
  }

  setArtboardBackground(kind, value) {
    this.commit();
    this.state.artboard.backgroundKind = kind;
    this.state.artboard.backgroundValue = value;
    this.markDirty();
    this.renderArtboard();
    this.renderContextPanel();
  }

  runLayerAction(action, objectId) {
    this.selectObject(objectId);
    const actions = {
      lock: () => this.toggleSelectedBoolean('locked'),
      hide: () => this.toggleSelectedBoolean('hidden'),
      up: () => this.moveSelectedLayer(1),
      down: () => this.moveSelectedLayer(-1),
    };
    actions[action]?.();
  }

  runObjectAction(action) {
    const actions = {
      duplicate: () => this.duplicateSelected(),
      delete: () => this.deleteSelected(),
      lock: () => this.toggleSelectedBoolean('locked'),
      hide: () => this.toggleSelectedBoolean('hidden'),
      flip: () => this.toggleSelectedBoolean('flipped'),
      rotate: () => this.rotateSelected(15),
      crop: () => this.updateSelectedProperty('crop', 'center'),
      mirror: () => this.toggleSelectedBoolean('flipped'),
      'open-colour': () => this.openCategory('colour'),
      'open-fabrics': () => this.openCategory('fabrics'),
      'open-measurements': () => this.openCategory('measurements'),
      'open-layers': () => this.openCategory('layers'),
      'open-properties': () => this.openCategory('properties'),
      'toggle-text-outline': () => this.toggleSelectedBoolean('outline'),
      'toggle-text-shadow': () => this.toggleSelectedBoolean('shadow'),
      'toggle-text-gradient': () => this.toggleSelectedBoolean('gradient'),
    };
    actions[action]?.();
  }

  resizeObjectFromPointer(event, artboard) {
    const state = this.dragState;
    const object = this.findObject(state.objectId);
    if (!object) {
      return;
    }
    const rect = artboard.getBoundingClientRect();
    const deltaX = this.snapValue(((event.clientX - state.origin.x) / rect.width) * 100);
    const deltaY = this.snapValue(((event.clientY - state.origin.y) / rect.height) * 100);
    const right = state.object.x + state.object.width;
    const bottom = state.object.y + state.object.height;

    if (state.handle === 'se') {
      object.width = clamp(state.object.width + deltaX, 2, 100 - state.object.x);
      object.height = clamp(state.object.height + deltaY, 2, 100 - state.object.y);
      return;
    }

    object.width = clamp(state.object.width - deltaX, 2, right);
    object.height = clamp(state.object.height - deltaY, 2, bottom);
    object.x = right - object.width;
    object.y = bottom - object.height;
  }

  async replaceSelectedImage(file) {
    const image = this.selectedObjects().find((object) => object.kind === 'image');
    if (!image || !file.type.startsWith('image/')) {
      return;
    }
    try {
      const source = await readFileAsDataUrl(file);
      if (!this.element.isConnected) {
        return;
      }
      this.commit();
      image.source = source;
      image.name = file.name || 'Imported image';
      this.markDirty();
      this.render();
    } catch {
      this.setSaveState('Image could not be replaced');
    }
  }

  placeSelectedDesignOnGarment() {
    const garment = this.selectedObjects().find((object) => object.kind === 'garment');
    const design = this.selectedObjects().find((object) => object.kind !== 'garment');
    if (!garment || !design) {
      this.setSaveState('Select a garment and a design to place it');
      return;
    }
    const artwork = createGarmentArtwork(design);
    if (!artwork) {
      this.setSaveState('This object cannot be placed on a garment yet');
      return;
    }
    this.commit();
    garment.printAsset = artwork;
    this.state.objects = this.state.objects.filter((object) => object.id !== design.id);
    this.state.selectedIds = [garment.id];
    this.markDirty();
    this.render();
  }

  clearGarmentDesign() {
    const garments = this.selectedObjects().filter((object) => object.kind === 'garment');
    if (!garments.length || !garments.some((object) => object.printAsset)) {
      return;
    }
    this.commit();
    garments.forEach((object) => {
      delete object.printAsset;
    });
    this.markDirty();
    this.render();
  }

  toggleSelectedBoolean(property) {
    if (!this.state.selectedIds.length) {
      return;
    }
    this.commit();
    this.selectedObjects().forEach((object) => {
      object[property] = !object[property];
    });
    this.markDirty();
    this.render();
  }

  rotateSelected(amount) {
    if (!this.state.selectedIds.length) {
      return;
    }
    this.commit();
    this.selectedObjects().forEach((object) => {
      object.rotation = (object.rotation + amount) % 360;
    });
    this.markDirty();
    this.render();
  }

  duplicateSelected() {
    const selection = this.selectedObjects();
    if (!selection.length) {
      return;
    }
    this.commit();
    const copies = selection.map((object) => ({
      ...clone(object),
      id: createId(),
      x: clamp(object.x + 4, 0, 100 - object.width),
      y: clamp(object.y + 4, 0, 100 - object.height),
      locked: false,
      hidden: false,
    }));
    this.state.objects.push(...copies);
    this.state.selectedIds = copies.map((object) => object.id);
    this.openSelectionTools();
    this.markDirty();
    this.render();
  }

  deleteSelected() {
    if (!this.state.selectedIds.length) {
      return;
    }
    this.commit();
    const ids = new Set(this.state.selectedIds);
    this.state.objects = this.state.objects.filter((object) => !ids.has(object.id));
    this.state.selectedIds = [];
    this.markDirty();
    this.render();
  }

  moveSelectedLayer(direction) {
    const selectedId = this.state.selectedIds.at(-1);
    if (!selectedId) {
      return;
    }
    const index = this.state.objects.findIndex((object) => object.id === selectedId);
    const targetIndex = clamp(index + direction, 0, this.state.objects.length - 1);
    if (index === targetIndex) {
      return;
    }
    this.commit();
    const [object] = this.state.objects.splice(index, 1);
    this.state.objects.splice(targetIndex, 0, object);
    this.markDirty();
    this.render();
  }

  alignSelected(mode) {
    const selection = this.selectedObjects();
    if (!selection.length) {
      return;
    }
    this.commit();
    selection.forEach((object) => {
      if (mode === 'center') {
        object.x = (100 - object.width) / 2;
      }
      if (mode === 'middle') {
        object.y = (100 - object.height) / 2;
      }
    });
    this.markDirty();
    this.render();
  }

  toggleArtboardOption(option) {
    this.state.artboard[option] = !this.state.artboard[option];
    this.markDirty();
    this.renderArtboard();
    this.renderStageControls();
  }

  setZoom(value) {
    this.state.artboard.zoom = clamp(Math.round(value * 10) / 10, 0.5, 2);
    this.renderArtboardTransform();
    this.renderStageControls();
    this.markDirty();
  }

  undo() {
    const previous = this.history.pop();
    if (!previous) {
      return;
    }
    this.future.push(this.snapshot());
    this.state = previous;
    this.markDirty();
    this.render();
  }

  redo() {
    const next = this.future.pop();
    if (!next) {
      return;
    }
    this.history.push(this.snapshot());
    this.state = next;
    this.markDirty();
    this.render();
  }

  commit() {
    this.history.push(this.snapshot());
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }
    this.future = [];
  }

  snapshot() {
    return clone(this.state);
  }

  markDirty() {
    this.setSaveState('Saving locally…');
    window.clearTimeout(this.autoSaveTimer);
    this.autoSaveTimer = window.setTimeout(() => this.saveProject(), AUTO_SAVE_DELAY);
  }

  saveProject() {
    window.clearTimeout(this.autoSaveTimer);
    const workspace = this.snapshot();
    this.setSaveState('Saving locally…');
    this.saveQueue = this.saveQueue
      .catch(() => undefined)
      .then(() =>
        saveDesignMetadata({
          id: this.projectId,
          name: workspace.projectName,
          editor: this.definition.id,
          status: 'local',
          workspace,
        }),
      )
      .then(() => {
        if (this.element.isConnected) {
          this.setSaveState('Saved locally');
        }
      })
      .catch(() => {
        if (this.element.isConnected) {
          this.setSaveState('Save failed locally');
        }
      });
    return this.saveQueue;
  }

  exportProject() {
    const contents = JSON.stringify(
      {
        format: 'offdesign-workspace',
        version: 1,
        exportedAt: new Date().toISOString(),
        editor: this.definition.id,
        project: this.snapshot(),
      },
      null,
      2,
    );
    const blob = new Blob([contents], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileSafeName(this.state.projectName)}.offdesign.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    this.setSaveState('Export ready');
  }

  positionFromClient(clientX, clientY) {
    const artboard = this.element.querySelector('[data-workspace-artboard]');
    if (!artboard) {
      return null;
    }
    const rect = artboard.getBoundingClientRect();
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100 - 10, 2, 78),
      y: clamp(((clientY - rect.top) / rect.height) * 100 - 10, 2, 72),
    };
  }

  snapValue(value) {
    return this.state.artboard.snap ? Math.round(value / 2) * 2 : value;
  }

  findObject(id) {
    return this.state.objects.find((object) => object.id === id) ?? null;
  }

  selectedObjects() {
    const ids = new Set(this.state.selectedIds);
    return this.state.objects.filter((object) => ids.has(object.id));
  }

  setSaveState(message) {
    const status = this.element.querySelector('[data-workspace-save-state]');
    if (status) {
      status.innerHTML = `<i data-lucide="${message.includes('Saved') ? 'check-circle-2' : 'hard-drive'}"></i> ${escapeHtml(message)}`;
    }
    const shellStatus = document.querySelector('[data-save-status]');
    if (shellStatus) {
      shellStatus.textContent =
        message === 'Saved locally' ? 'Saved locally — offline ready' : message;
    }
    hydrateIcons(this.element);
  }

  render() {
    this.updateProjectName();
    this.renderArtboard();
    this.renderStageControls();
    this.renderBottomToolbar();
    this.renderContextPanel();
    hydrateIcons(this.element);
  }

  updateProjectName() {
    const field = this.element.querySelector('[data-project-name]');
    if (field && document.activeElement !== field) {
      field.value = this.state.projectName;
    }
  }

  renderArtboard() {
    const artboard = this.element.querySelector('[data-workspace-artboard]');
    if (!artboard) {
      return;
    }
    artboard.dataset.background = this.state.artboard.backgroundKind;
    artboard.dataset.grid = String(this.state.artboard.grid);
    artboard.dataset.rulers = String(this.state.artboard.rulers);
    artboard.dataset.guides = String(this.state.artboard.guides);
    artboard.style.setProperty('--artboard-background', this.state.artboard.backgroundValue);
    this.renderArtboardTransform();
    this.renderObjects();
  }

  renderArtboardTransform() {
    const artboard = this.element.querySelector('[data-workspace-artboard]');
    if (!artboard) {
      return;
    }
    const { panX, panY, zoom } = this.state.artboard;
    artboard.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }

  renderObjects() {
    const objects = this.element.querySelector('[data-workspace-objects]');
    const empty = this.element.querySelector('[data-workspace-empty]');
    if (!objects || !empty) {
      return;
    }
    objects.innerHTML = this.state.objects
      .map((object) => objectMarkup(object, this.state.selectedIds.includes(object.id)))
      .join('');
    empty.hidden = this.state.objects.length > 0;
    hydrateIcons(this.element);
  }

  renderSelection() {
    this.renderObjects();
    this.renderBottomToolbar();
    this.renderContextPanel();
  }

  renderStageControls() {
    const readout = this.element.querySelector('[data-zoom-readout]');
    if (readout) {
      readout.textContent = `${Math.round(this.state.artboard.zoom * 100)}%`;
    }
    this.element
      .querySelector('[data-workspace-action="toggle-pan"]')
      ?.toggleAttribute('aria-pressed', this.state.panMode);
    ['grid', 'rulers', 'guides'].forEach((option) => {
      this.element
        .querySelector(`[data-workspace-action="toggle-${option}"]`)
        ?.toggleAttribute('aria-pressed', this.state.artboard[option]);
    });
  }

  renderBottomToolbar() {
    const toolbar = this.element.querySelector('.workspace-bottom-toolbar');
    const container = this.element.querySelector('[data-workspace-categories]');
    const toggle = toolbar?.querySelector('[data-workspace-action="toggle-toolbar"]');
    if (!toolbar || !container || !toggle) {
      return;
    }
    toolbar.dataset.expanded = String(this.state.toolbarExpanded);
    toggle.setAttribute(
      'aria-label',
      this.state.toolbarExpanded ? 'Collapse editing toolbar' : 'Expand editing toolbar',
    );
    toggle.innerHTML = `<i data-lucide="${this.state.toolbarExpanded ? 'chevron-down' : 'chevron-up'}"></i>`;
    const categories = this.toolbarCategories();
    container.innerHTML = categories
      .map(
        (category) => `
      <button class="workspace-category ${this.state.activeCategory === category.id ? 'is-active' : ''}" type="button" data-workspace-category="${category.id}" aria-pressed="${this.state.activeCategory === category.id}">
        <i data-lucide="${category.icon}"></i>
        <span class="workspace-category__label">${category.label}</span>
        <span class="workspace-category__tools">${(category.tools ?? []).slice(0, 3).join(' · ')}</span>
      </button>
    `,
      )
      .join('');
    hydrateIcons(this.element);
  }

  toolbarCategories() {
    const selected = this.selectedObjects();
    if (!selected.length) {
      return this.definition.categories;
    }
    const kind = selected[0].kind;
    return [
      {
        id: 'selection',
        label: selected.length > 1 ? `${selected.length} selected` : selected[0].name,
        icon: 'mouse-pointer-2',
        tools: objectToolSets[kind] ?? objectToolSets.shape,
      },
      ...this.definition.categories,
    ];
  }

  renderContextPanel() {
    const panel = this.element.querySelector('[data-workspace-context]');
    if (!panel) {
      return;
    }
    panel.hidden = !this.state.toolbarExpanded;
    if (!this.state.toolbarExpanded) {
      return;
    }
    const selected = this.selectedObjects();
    const category = this.state.activeCategory;
    const categoryLabel =
      this.toolbarCategories().find((item) => item.id === category)?.label ?? 'Tools';
    panel.innerHTML = `
      <div class="workspace-context-panel__header">
        <div><p class="eyebrow">${selected.length ? 'Object-aware editing' : this.definition.title}</p><h2>${escapeHtml(categoryLabel)}</h2></div>
        ${selected.length ? `<span class="workspace-selection-count">${selected.length} selected</span>` : ''}
      </div>
      <div class="workspace-context-panel__body">${this.contextMarkup(category, selected)}</div>
    `;
    hydrateIcons(this.element);
  }

  contextMarkup(category, selected) {
    if (category === 'selection') {
      return this.selectionToolsMarkup(selected);
    }
    if (category === 'templates') {
      return this.templatesMarkup();
    }
    if (category === 'fabrics') {
      return this.fabricsMarkup();
    }
    if (category === 'colour') {
      return this.colourMarkup();
    }
    if (category === 'image') {
      return `
        <div class="workspace-tool-grid">
          <label class="workspace-drop-zone"><input class="visually-hidden" type="file" accept="image/*" data-image-input /><i data-lucide="image-up"></i><strong>Upload image</strong><span>Choose a local file or drop it onto the artboard.</span></label>
          ${selected[0]?.kind === 'image' ? objectQuickActions(['crop', 'flip', 'duplicate', 'lock', 'delete']) : '<p class="workspace-panel-note">Images stay on this device and can be moved, resized, rotated, flipped, duplicated, locked, or deleted.</p>'}
        </div>`;
    }
    if (category === 'text') {
      return `
        <div class="workspace-text-entry"><label for="workspace-text-entry">Text</label><div><input id="workspace-text-entry" type="text" maxlength="80" value="New text" data-text-entry /><button class="button button--compact" type="button" data-workspace-action="add-text"><i data-lucide="plus"></i> Add</button></div></div>
        ${selected[0]?.kind === 'text' ? this.selectionToolsMarkup(selected) : `<p class="workspace-panel-note">${this.definition.id === 'logo' ? 'Logo text is placed as independent editable characters.' : 'Add text, then select it for typography, spacing, gradient, outline, shadow, and opacity controls.'}</p>`}`;
    }
    if (category === 'draw' || category === 'brush' || category === 'pen') {
      const tools =
        category === 'draw'
          ? ['Pencil', 'Eraser']
          : category === 'brush'
            ? ['Brush', 'Marker']
            : ['Pen', 'Bezier'];
      return `<div class="workspace-tool-grid">${tools.map((tool) => `<button class="workspace-tool-card" type="button" data-add-drawing="${tool.toLowerCase()}"><i data-lucide="${category === 'brush' ? 'paintbrush' : category === 'pen' ? 'pen-tool' : 'pencil'}"></i><strong>${tool}</strong><span>Add a movable ${tool.toLowerCase()} placeholder.</span></button>`).join('')}</div>`;
    }
    if (category === 'shapes') {
      return `<div class="workspace-tool-grid">${['rectangle', 'circle', 'triangle', 'line'].map((shape) => `<button class="workspace-tool-card" type="button" data-add-shape="${shape}"><i data-lucide="${shape === 'circle' ? 'circle' : shape === 'line' ? 'minus' : 'square'}"></i><strong>${capitalize(shape)}</strong><span>Add editable shape</span></button>`).join('')}</div>`;
    }
    if (category === 'layers') {
      return this.layersMarkup();
    }
    if (category === 'measurements') {
      return `<div class="workspace-measurements"><p class="workspace-panel-note">Select a garment to tune individual pattern-piece measurements. Cut and join actions are modelled as non-destructive object operations for future garment-section tooling.</p>${this.propertyMarkup(selected[0])}<button class="workspace-switch" type="button" data-workspace-action="toggle-snap" aria-pressed="${this.state.artboard.snap}"><i data-lucide="magnet"></i> Snap to grid <span>${this.state.artboard.snap ? 'On' : 'Off'}</span></button></div>`;
    }
    if (category === 'align') {
      return `<div class="workspace-action-row"><button class="workspace-tool-card" type="button" data-workspace-action="align-center"><i data-lucide="align-center"></i><strong>Centre</strong></button><button class="workspace-tool-card" type="button" data-workspace-action="align-middle"><i data-lucide="align-vertical-justify-center"></i><strong>Middle</strong></button><button class="workspace-tool-card" type="button" data-workspace-action="toggle-snap"><i data-lucide="magnet"></i><strong>Snap</strong></button></div>`;
    }
    if (category === 'effects') {
      return `<div class="workspace-action-row"><button class="workspace-tool-card" type="button" data-object-action="rotate"><i data-lucide="rotate-cw"></i><strong>Rotate</strong><span>15°</span></button><button class="workspace-tool-card" type="button" data-object-action="flip"><i data-lucide="flip-horizontal-2"></i><strong>Mirror</strong></button><button class="workspace-tool-card" type="button" data-object-action="duplicate"><i data-lucide="copy"></i><strong>Duplicate</strong></button></div>`;
    }
    return this.propertyMarkup(selected[0]);
  }

  templatesMarkup() {
    const templates = templatesForCategory(this.state.templateCategory);
    return `
      <div class="workspace-template-categories">${clothingTemplateCategories.map((category) => `<button class="workspace-template-category ${category.id === this.state.templateCategory ? 'is-active' : ''}" type="button" data-template-category="${category.id}"><i data-lucide="${category.icon}"></i>${category.label}</button>`).join('')}</div>
      <p class="workspace-panel-note">Locally bundled studio mockups with editable colour, fabric, print area, sizing, and layers. Drag onto the board or tap to place it centrally.</p>
      <div class="workspace-template-grid">${templates.map((template) => `<button class="workspace-template-card" type="button" draggable="true" data-template-id="${template.id}" style="--template-accent:${template.accent}"><span class="workspace-template-card__preview"><img src="${template.mockup}" alt="${escapeAttribute(template.name)} studio mockup" draggable="false" /></span><strong>${template.name}</strong><small>${template.material}</small></button>`).join('')}</div>
    `;
  }

  fabricsMarkup() {
    const selectedGarment = this.selectedObjects().find((object) => object.kind === 'garment');
    return `
      <p class="workspace-panel-note">Choose a colour or texture for the selected garment. Colour changes preserve the garment's seams, folds, and shadows.</p>
      <div class="workspace-fabric-list">${fabricCategories.map((category) => `<div class="workspace-fabric-row"><strong>${category.label}</strong><span>${category.swatches.map((colour) => `<button class="workspace-swatch" type="button" data-fabric-colour="${colour}" data-fabric-texture="${category.texture}" style="--swatch:${colour}" aria-label="Apply ${category.label} swatch ${colour}"></button>`).join('')}</span></div>`).join('')}</div>
      <div class="workspace-texture-heading"><p class="workspace-mini-heading">Surface texture</p><span>${selectedGarment ? `Current: ${escapeHtml(capitalize(selectedGarment.texture ?? 'plain'))}` : 'Select a garment'}</span></div>
      <div class="workspace-texture-grid">${fabricTextures.map((texture) => `<button class="workspace-texture-card ${selectedGarment?.texture === texture.id ? 'is-active' : ''}" type="button" data-fabric-texture="${texture.id}" data-texture-preview="${texture.id}" aria-pressed="${selectedGarment?.texture === texture.id}"><span class="workspace-texture-card__preview"></span><strong>${texture.label}</strong><small>${texture.description}</small></button>`).join('')}</div>`;
  }

  colourMarkup() {
    const selected = this.selectedObjects()[0];
    return `
      <div class="workspace-colour-layout">
        <section><p class="workspace-mini-heading">${selected ? 'Selected object' : 'Artboard background'}</p><label class="workspace-colour-picker"><input type="color" value="${escapeAttribute(colourInputValue(selected, this.state))}" ${selected ? 'data-object-colour' : 'data-background-colour'} /><span>${selected ? 'Custom colour' : 'Custom background'}</span></label><div class="workspace-colour-values"><span>HEX</span><code>${escapeHtml(selected?.colour ?? this.state.artboard.backgroundValue)}</code><span>Opacity</span><code>${selected?.opacity ?? 100}%</code></div></section>
        <section><p class="workspace-mini-heading">Artboard</p><div class="workspace-background-options"><button type="button" data-workspace-action="background-white">White</button><button type="button" data-workspace-action="background-transparent">Transparent</button><button type="button" data-workspace-action="background-gradient-violet">Gradient</button><button type="button" data-workspace-action="background-gradient-warm">Warm gradient</button></div><p class="workspace-panel-note">Solid, HEX/RGB/HSL-ready custom colour, opacity, and gradients are preserved in every saved workspace.</p></section>
      </div>`;
  }

  selectionToolsMarkup(selected) {
    const object = selected[0];
    if (!object) {
      return '<p class="workspace-panel-note">Select an object on the artboard to see its editing controls.</p>';
    }
    const tools = objectToolSets[object.kind] ?? objectToolSets.shape;
    const canPlaceOnGarment =
      selected.some((item) => item.kind === 'garment') &&
      selected.some((item) => item.kind !== 'garment');
    return `
      <div class="workspace-selection-summary"><span class="workspace-object-dot workspace-object-dot--${object.kind}"></span><div><strong>${escapeHtml(object.name)}</strong><small>${escapeHtml(object.kind)}${selected.length > 1 ? ` · ${selected.length} objects` : ''}</small></div></div>
      ${this.propertyMarkup(object)}
      ${canPlaceOnGarment ? '<div class="workspace-placement-callout"><i data-lucide="stamp"></i><span>Ready to place this design on the selected garment.</span><button type="button" data-workspace-action="place-on-garment">Place on garment</button></div>' : ''}
      <div class="workspace-object-tools">${tools.map((tool) => `<button type="button" class="workspace-object-tool" data-object-action="${objectActionFromLabel(tool)}">${tool}</button>`).join('')}</div>
    `;
  }

  propertyMarkup(object) {
    if (!object) {
      return '<p class="workspace-panel-note">Select an object to inspect its dimensions, rotation, opacity, and layer state.</p>';
    }
    return `
      <div class="workspace-properties-grid">
        <label>Width<input type="number" min="2" max="100" value="${round(object.width)}" data-object-property="width" /></label>
        <label>Height<input type="number" min="2" max="100" value="${round(object.height)}" data-object-property="height" /></label>
        <label>Rotate<input type="number" min="-360" max="360" value="${round(object.rotation)}" data-object-property="rotation" /></label>
        <label>Opacity<input type="number" min="0" max="100" value="${round(object.opacity)}" data-object-property="opacity" /></label>
        ${object.kind === 'text' ? `<label>Font<select data-font-family><option value="system-ui" ${object.fontFamily === 'system-ui' ? 'selected' : ''}>System Sans</option><option value="Georgia" ${object.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia</option><option value="monospace" ${object.fontFamily === 'monospace' ? 'selected' : ''}>Mono</option></select></label><label>Weight<select data-font-weight><option value="500" ${object.fontWeight === '500' ? 'selected' : ''}>Regular</option><option value="700" ${object.fontWeight === '700' ? 'selected' : ''}>Bold</option><option value="900" ${object.fontWeight === '900' ? 'selected' : ''}>Black</option></select></label><label>Size<input type="number" min="8" max="240" value="${round(object.fontSize)}" data-object-property="fontSize" /></label><label>Tracking<input type="number" min="-10" max="30" value="${round(object.letterSpacing)}" data-object-property="letterSpacing" /></label>` : ''}
        ${object.kind === 'image' ? `<label class="workspace-property--wide workspace-image-replace">Replace image<input class="visually-hidden" type="file" accept="image/*" data-image-replace /><span><i data-lucide="refresh-cw"></i> Choose another image</span></label>` : ''}
        ${object.kind === 'garment' ? `<label class="workspace-property--wide">Print text<input type="text" maxlength="28" value="${escapeAttribute(object.printText ?? 'YOUR MARK')}" data-object-property="printText" /></label><label>Print colour<input type="color" value="${escapeAttribute(object.printColour ?? '#f7f2e8')}" data-object-property="printColour" /></label><label>Print scale<input type="number" min="40" max="170" value="${round(object.printScale ?? 100)}" data-object-property="printScale" /></label><div class="workspace-garment-design-control"><span>${object.printAsset ? `Placed design: ${escapeHtml(object.printAsset.name)}` : 'No uploaded design yet'}</span><label class="workspace-inline-upload"><input class="visually-hidden" type="file" accept="image/*" data-image-input /><i data-lucide="image-up"></i> Upload design</label>${object.printAsset ? '<button type="button" data-workspace-action="clear-garment-design">Remove design</button>' : ''}</div>` : ''}
      </div>`;
  }

  layersMarkup() {
    if (!this.state.objects.length) {
      return '<p class="workspace-panel-note">Your layers appear here in stacking order. Add a template, shape, image, drawing, or text object to begin.</p>';
    }
    return `<div class="workspace-layer-list">${[...this.state.objects]
      .reverse()
      .map(
        (object) =>
          `<div class="workspace-layer ${this.state.selectedIds.includes(object.id) ? 'is-selected' : ''}"><button type="button" class="workspace-layer__main" data-layer-action="select" data-object-id="${object.id}"><span class="workspace-object-dot workspace-object-dot--${object.kind}"></span><span><strong>${escapeHtml(object.name)}</strong><small>${escapeHtml(object.kind)}</small></span></button><div class="workspace-layer__actions"><button type="button" data-layer-action="hide" data-object-id="${object.id}" aria-label="${object.hidden ? 'Show' : 'Hide'} ${escapeAttribute(object.name)}"><i data-lucide="${object.hidden ? 'eye-off' : 'eye'}"></i></button><button type="button" data-layer-action="lock" data-object-id="${object.id}" aria-label="${object.locked ? 'Unlock' : 'Lock'} ${escapeAttribute(object.name)}"><i data-lucide="${object.locked ? 'lock' : 'unlock'}"></i></button><button type="button" data-layer-action="up" data-object-id="${object.id}" aria-label="Move ${escapeAttribute(object.name)} forward"><i data-lucide="chevron-up"></i></button><button type="button" data-layer-action="down" data-object-id="${object.id}" aria-label="Move ${escapeAttribute(object.name)} backward"><i data-lucide="chevron-down"></i></button></div></div>`,
      )
      .join('')}</div>`;
  }
}

function createDefaultState(definition) {
  return {
    projectName: definition.defaultProjectName,
    activeCategory: definition.categories[0].id,
    toolbarExpanded: false,
    templateCategory: 'essentials',
    selectedIds: [],
    panMode: false,
    artboard: {
      backgroundKind: 'white',
      backgroundValue: '#ffffff',
      zoom: 1,
      panX: 0,
      panY: 0,
      grid: false,
      snap: true,
      rulers: true,
      guides: false,
    },
    objects: [],
  };
}

function sanitizeState(value, definition) {
  const fallback = createDefaultState(definition);
  if (!value || typeof value !== 'object') {
    return fallback;
  }
  const validCategories = new Set(definition.categories.map((category) => category.id));
  return {
    ...fallback,
    ...value,
    projectName: typeof value.projectName === 'string' ? value.projectName : fallback.projectName,
    activeCategory: validCategories.has(value.activeCategory)
      ? value.activeCategory
      : fallback.activeCategory,
    selectedIds: Array.isArray(value.selectedIds) ? value.selectedIds : [],
    objects: Array.isArray(value.objects) ? value.objects.filter(isWorkspaceObject) : [],
    artboard: { ...fallback.artboard, ...(value.artboard ?? {}) },
  };
}

function isWorkspaceObject(object) {
  return (
    object &&
    typeof object.id === 'string' &&
    typeof object.kind === 'string' &&
    typeof object.x === 'number'
  );
}

function createGarmentObject(template, position) {
  return {
    id: createId(),
    kind: 'garment',
    name: template.name,
    templateId: template.id,
    templateShape: template.shape,
    icon: template.icon,
    source: template.mockup,
    material: template.material,
    printZone: template.printZone,
    x: position?.x ?? 38,
    y: position?.y ?? 28,
    width: 25,
    height: 35,
    rotation: 0,
    opacity: 100,
    colour: template.accent,
    fabric: template.accent,
    texture: 'plain',
    printText: 'YOUR MARK',
    printColour: '#f7f2e8',
    printScale: 100,
    locked: false,
    hidden: false,
    flipped: false,
  };
}

function createTextObject(text, position = {}) {
  return {
    id: createId(),
    kind: 'text',
    name: text.length > 18 ? `${text.slice(0, 18)}…` : text,
    text,
    x: position.x ?? 34,
    y: position.y ?? 42,
    width: Math.max(16, Math.min(42, text.length * 5.5)),
    height: 13,
    rotation: 0,
    opacity: 100,
    colour: '#252342',
    fontFamily: 'system-ui',
    fontWeight: '700',
    fontSize: 34,
    letterSpacing: 0,
    lineHeight: 1.1,
    outline: false,
    shadow: false,
    gradient: false,
    locked: false,
    hidden: false,
    flipped: false,
  };
}

function createImageObject(source, name, position = {}) {
  return {
    id: createId(),
    kind: 'image',
    name: name || 'Imported image',
    source,
    x: position.x ?? 34,
    y: position.y ?? 30,
    width: 32,
    height: 32,
    rotation: 0,
    opacity: 100,
    colour: '#ffffff',
    locked: false,
    hidden: false,
    flipped: false,
  };
}

function createShapeObject(shape) {
  return {
    id: createId(),
    kind: 'shape',
    name: capitalize(shape),
    shape,
    x: 37,
    y: 37,
    width: shape === 'line' ? 32 : 22,
    height: shape === 'line' ? 4 : 22,
    rotation: 0,
    opacity: 100,
    colour: '#7856f3',
    locked: false,
    hidden: false,
    flipped: false,
  };
}

function createDrawingObject(tool) {
  return {
    id: createId(),
    kind: 'drawing',
    name: `${capitalize(tool)} stroke`,
    drawingTool: tool,
    x: 35,
    y: 42,
    width: 30,
    height: 18,
    rotation: 0,
    opacity: 100,
    colour: '#252342',
    locked: false,
    hidden: false,
    flipped: false,
  };
}

function objectMarkup(object, selected) {
  const style = [
    `left:${object.x}%`,
    `top:${object.y}%`,
    `width:${object.width}%`,
    `height:${object.height}%`,
    `--object-colour:${object.colour ?? '#7856f3'}`,
    `--quick-actions-flip:${object.flipped ? -1 : 1}`,
    `opacity:${(object.opacity ?? 100) / 100}`,
    `transform:rotate(${object.rotation ?? 0}deg) ${object.flipped ? 'scaleX(-1)' : ''}`,
    object.hidden ? 'display:none' : '',
  ].join(';');
  const state = `${selected ? 'is-selected' : ''} ${object.locked ? 'is-locked' : ''}`;
  let content = '';
  if (object.kind === 'garment') {
    const printZone = object.printZone ?? { x: 50, y: 50, width: 34, height: 16 };
    const printContent = garmentArtworkMarkup(object.printAsset, object);
    content = `<div class="workspace-garment workspace-garment--mockup" data-texture="${escapeAttribute(object.texture ?? 'plain')}"><img class="workspace-garment__mockup" src="${escapeAttribute(object.source)}" alt="${escapeAttribute(object.name)} editable mockup" draggable="false" /><span class="workspace-garment__colour-wash" aria-hidden="true"></span><span class="workspace-garment__texture" aria-hidden="true"></span><span class="workspace-garment__print" style="--print-x:${printZone.x}%;--print-y:${printZone.y}%;--print-width:${printZone.width}%;--print-height:${printZone.height}%;--print-colour:${escapeAttribute(object.printColour ?? '#f7f2e8')};--print-scale:${object.printScale ?? 100}%">${printContent}</span></div>`;
  }
  if (object.kind === 'text') {
    const textStyles = [
      `font-family:${escapeAttribute(object.fontFamily)}`,
      `font-weight:${escapeAttribute(object.fontWeight)}`,
      `font-size:${object.fontSize}px`,
      `letter-spacing:${object.letterSpacing}px`,
      `line-height:${object.lineHeight}`,
      object.outline
        ? '-webkit-text-stroke:1px color-mix(in srgb, var(--object-colour) 70%, #111827)'
        : '',
      object.shadow ? 'text-shadow:0 3px 8px rgb(15 23 42 / 35%)' : '',
      object.gradient
        ? 'background:linear-gradient(135deg, var(--object-colour), #f66e9e);-webkit-background-clip:text;background-clip:text;color:transparent'
        : '',
    ]
      .filter(Boolean)
      .join(';');
    content = `<p class="workspace-text-object" style="${textStyles}">${escapeHtml(object.text)}</p>`;
  }
  if (object.kind === 'image') {
    content = `<span class="workspace-image-wrap"><img class="workspace-image-object" src="${escapeAttribute(object.source)}" alt="${escapeAttribute(object.name)}" draggable="false" /><span class="workspace-image-object__colour-wash" aria-hidden="true"></span></span>`;
  }
  if (object.kind === 'shape') {
    content = `<span class="workspace-shape workspace-shape--${escapeAttribute(object.shape)}"></span>`;
  }
  if (object.kind === 'drawing') {
    content = `<svg class="workspace-drawing" viewBox="0 0 100 40" aria-hidden="true"><path d="M4 30 C 22 1, 33 38, 53 18 S 75 1, 96 24" fill="none" stroke="currentColor" stroke-linecap="round" /></svg>`;
  }
  const selectedControls = selected
    ? `<span class="workspace-object__handle workspace-object__handle--nw" data-object-resize="nw" aria-hidden="true"></span><span class="workspace-object__handle workspace-object__handle--se" data-object-resize="se" aria-hidden="true"></span><span class="workspace-object__quick-actions" data-object-popover aria-label="${escapeAttribute(object.name)} quick actions"><button type="button" data-object-action="duplicate" aria-label="Duplicate ${escapeAttribute(object.name)}" title="Duplicate"><i data-lucide="copy"></i></button><button class="workspace-object__delete" type="button" data-object-action="delete" aria-label="Delete ${escapeAttribute(object.name)}" title="Delete"><i data-lucide="trash-2"></i></button></span>`
    : '';
  return `<div class="workspace-object workspace-object--${escapeAttribute(object.kind)} ${state}" data-object-id="${object.id}" style="${style}" tabindex="0" role="button" aria-label="${escapeAttribute(object.name)}${object.locked ? ', locked' : ''}">${content}${selectedControls}</div>`;
}

function objectQuickActions(actions) {
  return `<div class="workspace-action-row">${actions.map((action) => `<button class="workspace-tool-card" type="button" data-object-action="${action}"><i data-lucide="${action === 'delete' ? 'trash-2' : action === 'duplicate' ? 'copy' : action === 'flip' ? 'flip-horizontal-2' : action === 'lock' ? 'lock' : 'crop'}"></i><strong>${capitalize(action)}</strong></button>`).join('')}</div>`;
}

function objectActionFromLabel(label) {
  const lookup = {
    Duplicate: 'duplicate',
    Delete: 'delete',
    Lock: 'lock',
    Flip: 'flip',
    Mirror: 'mirror',
    Rotate: 'rotate',
    Crop: 'crop',
    Colour: 'open-colour',
    Fill: 'open-colour',
    Stroke: 'open-colour',
    Fabric: 'open-fabrics',
    Texture: 'open-fabrics',
    Pattern: 'open-fabrics',
    Measurements: 'open-measurements',
    Layer: 'open-layers',
    Properties: 'open-properties',
    Font: 'open-properties',
    'Font Size': 'open-properties',
    'Font Weight': 'open-properties',
    'Letter Spacing': 'open-properties',
    'Line Height': 'open-properties',
    Alignment: 'open-properties',
    Resize: 'open-properties',
    Opacity: 'open-properties',
    Replace: 'open-properties',
    Outline: 'toggle-text-outline',
    Shadow: 'toggle-text-shadow',
    Gradient: 'toggle-text-gradient',
  };
  return lookup[label] ?? 'noop';
}

function createGarmentArtworkFromImage(source, name) {
  return { kind: 'image', source, name: name || 'Uploaded design' };
}

function createGarmentArtwork(object) {
  if (object.kind === 'image') {
    return createGarmentArtworkFromImage(object.source, object.name);
  }
  if (object.kind === 'text') {
    return { kind: 'text', text: object.text, name: object.name, colour: object.colour };
  }
  return null;
}

function garmentArtworkMarkup(artwork, garment) {
  if (artwork?.kind === 'image') {
    return `<img class="workspace-garment__print-image" src="${escapeAttribute(artwork.source)}" alt="${escapeAttribute(artwork.name)} placed on ${escapeAttribute(garment.name)}" draggable="false" />`;
  }
  if (artwork?.kind === 'text') {
    return `<span class="workspace-garment__print-text" style="--placed-design-colour:${escapeAttribute(artwork.colour ?? garment.printColour ?? '#f7f2e8')}">${escapeHtml(artwork.text)}</span>`;
  }
  return escapeHtml(garment.printText ?? 'YOUR MARK');
}

function colourInputValue(selected, state) {
  if (selected?.colour?.startsWith('#')) {
    return selected.colour;
  }
  if (state.artboard.backgroundKind === 'solid' && state.artboard.backgroundValue.startsWith('#')) {
    return state.artboard.backgroundValue;
  }
  return '#7856f3';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function toggleId(ids, id) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(Number(value) * 10) / 10;
}

function capitalize(value) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function createId() {
  return `object-${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

function fileSafeName(value) {
  return (
    (value || 'offdesign-project')
      .replaceAll(/[^a-z0-9-_]+/gi, '-')
      .replaceAll(/^-|-$/g, '')
      .toLowerCase() || 'offdesign-project'
  );
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function isTypingInField(target) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}
