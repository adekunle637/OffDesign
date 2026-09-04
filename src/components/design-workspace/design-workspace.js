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
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

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
              <svg class="workspace-cut-overlay" data-cut-overlay viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg>
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
    this.element.addEventListener('focusout', (event) => this.handleFocusOut(event), { signal });
    this.element.addEventListener('dblclick', (event) => this.handleDoubleClick(event), {
      signal,
    });
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

    const textPreset = target.closest('[data-text-preset]')?.dataset.textPreset;
    if (textPreset) {
      this.applyTextPreset(textPreset);
      return;
    }

    const cutTool = target.closest('[data-cut-tool]')?.dataset.cutTool;
    if (cutTool) {
      this.setCutTool(cutTool);
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
    if (!(
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    )) {
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

    if (target.matches('[data-text-content]')) {
      this.updateSelectedProperty('text', target.value);
      return;
    }

    if (target.matches('[data-font-family]')) {
      this.updateSelectedProperty('fontFamily', target.value);
      return;
    }

    if (target.matches('[data-font-weight]')) {
      this.updateSelectedProperty('fontWeight', target.value);
    }

    if (target.matches('[data-placement-target]')) {
      this.state.placementTargetId = target.value || null;
    }

    if (target.matches('[data-cut-precision]')) {
      this.state.cutPrecision = Number(target.value) || 1;
      this.markDirty();
    }

    if (target.matches('[data-cut-seam]')) {
      this.state.cutSeamAllowance = Number(target.value) || 0;
      this.markDirty();
    }
  }

  handleInput(event) {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.matches('[data-project-name]')) {
      this.state.projectName = target.value || this.definition.defaultProjectName;
      this.updateProjectName();
    }

    if (target instanceof HTMLElement && target.matches('[data-text-editor]')) {
      const object = this.findObject(target.closest('[data-object-id]')?.dataset.objectId);
      if (!object || object.kind !== 'text') {
        return;
      }
      const value = target.textContent?.slice(0, 160) ?? '';
      object.text = value;
      object.name = textObjectName(value);
    }
  }

  handleFocusOut(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.matches('[data-text-editor]')) {
      return;
    }
    target.contentEditable = 'false';
    const object = this.findObject(target.closest('[data-object-id]')?.dataset.objectId);
    if (!object || object.kind !== 'text') {
      return;
    }
    object.text = object.text.trim() || 'New text';
    object.name = textObjectName(object.text);
    this.markDirty();
    this.render();
  }

  handleDoubleClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const objectElement = target?.closest('[data-object-id]');
    if (!objectElement || !target?.closest('[data-text-editor]')) {
      return;
    }
    const object = this.findObject(objectElement.dataset.objectId);
    if (!object || object.kind !== 'text' || object.locked) {
      return;
    }
    event.preventDefault();
    this.selectObject(object.id);
    const editor = this.element.querySelector(`[data-object-id="${object.id}"] [data-text-editor]`);
    if (editor instanceof HTMLElement) {
      this.commit();
      editor.contentEditable = 'true';
      editor.focus();
      document.getSelection()?.selectAllChildren(editor);
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

    if (target.closest('[data-text-editor][contenteditable="true"]')) {
      return;
    }

    const cutAnchor = target.closest('[data-cut-anchor]');
    if (cutAnchor) {
      const object = this.findObject(cutAnchor.closest('[data-object-id]')?.dataset.objectId);
      if (!object?.cut || object.locked) {
        return;
      }
      this.commit();
      this.dragState = {
        kind: 'reshape-cut',
        objectId: object.id,
        anchor: cutAnchor.dataset.cutAnchor,
        committed: true,
      };
      event.preventDefault();
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
      const object = this.findObject(objectId);
      if (this.state.cutTool && isCuttableObject(object) && !object?.locked) {
        this.startCut(object, event);
        event.preventDefault();
        return;
      }
      this.selectObject(objectId, event.shiftKey);
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
    if (!artboard) {
      return;
    }

    if (this.dragState.kind === 'cut') {
      this.updateCutPreview(event);
      return;
    }

    if (this.dragState.kind === 'reshape-cut') {
      this.reshapeCutFromPointer(event);
      this.renderObjects();
      return;
    }

    if (!['object', 'resize'].includes(this.dragState.kind)) {
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
    if (this.dragState?.kind === 'cut') {
      this.finishCut();
      return;
    }
    if (this.dragState?.kind === 'reshape-cut') {
      this.markDirty();
      this.dragState = null;
      return;
    }
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

    if (event.key === 'Escape' && (this.state.cutTool || this.dragState?.kind === 'cut')) {
      this.cancelCut();
      return;
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
      'align-cut-pieces': () => this.alignCutPieces(),
      'join-cut-pieces': () => this.joinCutPieces(),
      'reshape-cut': () => this.toggleCutReshape(),
      'cancel-cut': () => this.cancelCut(),
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
      this.setSaveState('Choose an image file to upload');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      this.setSaveState('Choose an image smaller than 10 MB');
      return;
    }

    try {
      const source = await readFileAsDataUrl(file);
      if (!this.element.isConnected) {
        return;
      }
      const dimensions = await readImageDimensions(source);
      if (!this.element.isConnected) {
        return;
      }
      this.commit();
      const object = createImageObject(source, file.name, position, dimensions);
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
      if (property === 'text' && object.kind === 'text') {
        object.text = value.slice(0, 160) || 'New text';
        object.name = textObjectName(object.text);
        return;
      }
      if (property === 'width' || property === 'height') {
        object[property] = clamp(value, 2, 100);
        object.x = clamp(object.x, 0, 100 - object.width);
        object.y = clamp(object.y, 0, 100 - object.height);
        return;
      }
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
      crop: () => this.toggleImageFit(),
      mirror: () => this.toggleSelectedBoolean('flipped'),
      'open-colour': () => this.openCategory('colour'),
      'open-fabrics': () => this.openCategory('fabrics'),
      'open-measurements': () => this.openCategory('measurements'),
      'open-layers': () => this.openCategory('layers'),
      'open-properties': () => this.openCategory('properties'),
      'toggle-text-outline': () => this.toggleSelectedBoolean('outline'),
      'toggle-text-shadow': () => this.toggleSelectedBoolean('shadow'),
      'toggle-text-gradient': () => this.toggleSelectedBoolean('gradient'),
      'align-cut-pieces': () => this.alignCutPieces(),
      'join-cut-pieces': () => this.joinCutPieces(),
      'reshape-cut': () => this.toggleCutReshape(),
    };
    actions[action]?.();
  }

  applyTextPreset(preset) {
    const styles = {
      clean: {
        fontFamily: 'system-ui',
        fontWeight: '700',
        letterSpacing: 0,
        textTransform: 'none',
      },
      editorial: {
        fontFamily: 'Georgia',
        fontWeight: '700',
        letterSpacing: 0.4,
        textTransform: 'none',
      },
      street: {
        fontFamily: 'Arial Black, Impact, sans-serif',
        fontWeight: '900',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
      },
      script: { fontFamily: 'cursive', fontWeight: '700', letterSpacing: 0, textTransform: 'none' },
      mono: {
        fontFamily: 'ui-monospace, SFMono-Regular, monospace',
        fontWeight: '700',
        letterSpacing: 0.4,
        textTransform: 'uppercase',
      },
    };
    const style = styles[preset];
    const textObjects = this.selectedObjects().filter((object) => object.kind === 'text');
    if (!style || !textObjects.length) {
      this.setSaveState('Select a text layer to apply a style');
      return;
    }
    this.commit();
    textObjects.forEach((object) => Object.assign(object, style, { textPreset: preset }));
    this.markDirty();
    this.render();
  }

  toggleImageFit() {
    const images = this.selectedObjects().filter((object) => object.kind === 'image');
    if (!images.length) {
      return;
    }
    this.commit();
    images.forEach((object) => {
      object.imageFit = object.imageFit === 'contain' ? 'cover' : 'contain';
    });
    this.markDirty();
    this.render();
  }

  setCutTool(tool) {
    const cuttable = this.selectedObjects().find(isCuttableObject);
    if (!cuttable) {
      this.setSaveState('Select a garment or pattern piece before cutting');
      return;
    }
    this.state.cutTool = this.state.cutTool === tool ? null : tool;
    this.state.reshapePieceId = null;
    this.setSaveState(
      this.state.cutTool
        ? `${capitalize(this.state.cutTool)} cut active — drag across the selected piece`
        : 'Cut tool paused',
    );
    this.renderObjects();
    this.renderContextPanel();
  }

  startCut(object, event) {
    const start = this.pointInObject(object.id, event.clientX, event.clientY);
    if (!start) {
      return;
    }
    this.selectObject(object.id);
    this.dragState = {
      kind: 'cut',
      objectId: object.id,
      mode: this.state.cutTool,
      start,
      cut: null,
    };
    this.renderCutPreview();
  }

  updateCutPreview(event) {
    const state = this.dragState;
    const object = this.findObject(state.objectId);
    const end = this.pointInObject(state.objectId, event.clientX, event.clientY);
    if (!object || !end) {
      return;
    }
    state.cut = createCutGeometry(
      state.mode,
      state.start,
      end,
      this.state.cutPrecision,
      this.state.cutSeamAllowance,
    );
    this.renderCutPreview(object, state.cut);
  }

  finishCut() {
    const state = this.dragState;
    const object = this.findObject(state?.objectId);
    this.clearCutPreview();
    this.dragState = null;
    if (!object || !state?.cut || cutLength(state.cut) < 8) {
      this.setSaveState('Drag a longer line across the piece to make a cut');
      return;
    }

    this.commit();
    const pieces = createCutPieces(object, state.cut);
    const index = this.state.objects.findIndex((item) => item.id === object.id);
    this.state.objects.splice(index, 1, ...pieces);
    this.state.selectedIds = pieces.map((piece) => piece.id);
    this.state.reshapePieceId = null;
    this.openSelectionTools();
    this.markDirty();
    this.render();
  }

  cancelCut() {
    this.state.cutTool = null;
    this.state.reshapePieceId = null;
    this.dragState = null;
    this.clearCutPreview();
    this.renderObjects();
    this.renderContextPanel();
    this.setSaveState('Cut tool paused');
  }

  pointInObject(objectId, clientX, clientY) {
    const element = this.element.querySelector(`[data-object-id="${objectId}"]`);
    if (!(element instanceof HTMLElement)) {
      return null;
    }
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }
    return snapCutPoint(
      {
        x: clamp(((clientX - rect.left) / rect.width) * 100, 0, 100),
        y: clamp(((clientY - rect.top) / rect.height) * 100, 0, 100),
      },
      this.state.cutPrecision,
    );
  }

  renderCutPreview(object = null, cut = this.dragState?.cut) {
    const overlay = this.element.querySelector('[data-cut-overlay]');
    const target = object ?? this.findObject(this.dragState?.objectId);
    if (!(overlay instanceof SVGElement) || !target || !cut) {
      return;
    }
    const globalCut = cutToArtboardCoordinates(target, cut);
    overlay.innerHTML = `<path class="workspace-cut-overlay__shadow" d="${cutGuidePath(globalCut)}"/><path class="workspace-cut-overlay__line" d="${cutGuidePath(globalCut)}"/><circle class="workspace-cut-overlay__point" cx="${globalCut.start.x}" cy="${globalCut.start.y}" r="0.65"/><circle class="workspace-cut-overlay__point" cx="${globalCut.end.x}" cy="${globalCut.end.y}" r="0.65"/>`;
  }

  clearCutPreview() {
    const overlay = this.element.querySelector('[data-cut-overlay]');
    if (overlay) {
      overlay.innerHTML = '';
    }
  }

  toggleCutReshape() {
    const piece = this.selectedObjects().find(
      (object) => object.kind === 'pattern-piece' && object.cut,
    );
    if (!piece) {
      this.setSaveState('Select a cut pattern piece to reshape its seam');
      return;
    }
    this.state.reshapePieceId = this.state.reshapePieceId === piece.id ? null : piece.id;
    this.state.cutTool = null;
    this.renderObjects();
    this.renderContextPanel();
  }

  reshapeCutFromPointer(event) {
    const state = this.dragState;
    const object = this.findObject(state.objectId);
    const point = this.pointInObject(state.objectId, event.clientX, event.clientY);
    if (!object?.cut || !point) {
      return;
    }
    const cut = clone(object.cut);
    if (state.anchor === 'control') {
      cut.control = point;
    } else {
      cut[state.anchor] = snapPointToBoundary(point, this.state.cutPrecision);
    }
    this.state.objects
      .filter((item) => item.kind === 'pattern-piece' && item.cutGroup === object.cutGroup)
      .forEach((piece) => {
        piece.cut = clone(cut);
        piece.clipPaths = [
          ...piece.clipPaths.slice(0, -1),
          buildCutPiecePath(cut, piece.pieceSide),
        ];
      });
  }

  alignCutPieces() {
    const pieces = this.selectedObjects().filter((object) => object.kind === 'pattern-piece');
    if (pieces.length < 2 || !pieces.every((piece) => sameSourceFrame(piece, pieces[0]))) {
      this.setSaveState('Select related cut pieces to align their seam precisely');
      return;
    }
    this.commit();
    pieces.forEach((piece) => Object.assign(piece, clone(piece.sourceFrame)));
    this.markDirty();
    this.render();
  }

  joinCutPieces() {
    const pieces = this.selectedObjects().filter((object) => object.kind === 'pattern-piece');
    if (
      pieces.length !== 2 ||
      !pieces[0].cutGroup ||
      pieces[0].cutGroup !== pieces[1].cutGroup ||
      !sameSourceFrame(pieces[0], pieces[1])
    ) {
      this.setSaveState('Select the two matching cut pieces to align and join them');
      return;
    }
    this.commit();
    const joined = createJoinedPiece(pieces[0]);
    const ids = new Set(pieces.map((piece) => piece.id));
    const index = this.state.objects.findIndex((object) => ids.has(object.id));
    this.state.objects = this.state.objects.filter((object) => !ids.has(object.id));
    this.state.objects.splice(index, 0, joined);
    this.state.selectedIds = [joined.id];
    this.state.reshapePieceId = null;
    this.markDirty();
    this.render();
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

    if (object.kind === 'image' && !event.shiftKey) {
      const widthLimit = state.handle === 'se' ? 100 - state.object.x : right;
      const heightLimit = state.handle === 'se' ? 100 - state.object.y : bottom;
      const requestedWidth =
        state.handle === 'se' ? state.object.width + deltaX : state.object.width - deltaX;
      const boardRatio = rect.width / rect.height;
      const aspectRatio =
        object.aspectRatio ?? (state.object.width * boardRatio) / state.object.height;
      let width = clamp(requestedWidth, 2, widthLimit);
      let height = (width * boardRatio) / aspectRatio;
      if (height > heightLimit) {
        height = heightLimit;
        width = (height * aspectRatio) / boardRatio;
      }
      object.width = width;
      object.height = clamp(height, 2, heightLimit);
      if (state.handle === 'nw') {
        object.x = right - object.width;
        object.y = bottom - object.height;
      }
      return;
    }

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
    if (!image || !file.type.startsWith('image/') || file.size > MAX_IMAGE_SIZE) {
      if (file.size > MAX_IMAGE_SIZE) {
        this.setSaveState('Choose an image smaller than 10 MB');
      }
      return;
    }
    try {
      const source = await readFileAsDataUrl(file);
      const dimensions = await readImageDimensions(source);
      if (!this.element.isConnected) {
        return;
      }
      this.commit();
      image.source = source;
      image.name = file.name || 'Imported image';
      image.aspectRatio = dimensions.width / dimensions.height;
      this.markDirty();
      this.render();
    } catch {
      this.setSaveState('Image could not be replaced');
    }
  }

  placeSelectedDesignOnGarment() {
    const garment =
      this.selectedObjects().find((object) => object.kind === 'garment') ??
      this.findObject(this.state.placementTargetId) ??
      this.state.objects.find((object) => object.kind === 'garment');
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
    garment.printAssets = [...(garment.printAssets ?? legacyPrintAssets(garment)), artwork];
    delete garment.printAsset;
    this.state.placementTargetId = garment.id;
    this.state.selectedIds = [design.id];
    this.markDirty();
    this.render();
  }

  clearGarmentDesign() {
    const garments = this.selectedObjects().filter((object) => object.kind === 'garment');
    if (
      !garments.length ||
      !garments.some((object) => object.printAsset || object.printAssets?.length)
    ) {
      return;
    }
    this.commit();
    garments.forEach((object) => {
      delete object.printAsset;
      delete object.printAssets;
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
      .map((object) =>
        objectMarkup(
          object,
          this.state.selectedIds.includes(object.id),
          this.state.reshapePieceId === object.id,
        ),
      )
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
      return this.measurementsMarkup(selected);
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

  measurementsMarkup(selected) {
    const cuttable = selected.find(isCuttableObject);
    const pieces = selected.filter((object) => object.kind === 'pattern-piece');
    const cutActive = this.state.cutTool;
    const canJoin = pieces.length === 2 && pieces[0].cutGroup === pieces[1].cutGroup;
    return `
      <div class="workspace-measurements">
        <p class="workspace-panel-note">Choose a cut, then drag directly across a garment or a pattern piece. Every cut is non-destructive: the resulting pieces stay on the board, can be moved, re-cut, reshaped, aligned, and joined again.</p>
        ${cuttable ? `<div class="workspace-cut-tools" aria-label="Precision cut tools"><button class="workspace-cut-tool ${cutActive === 'straight' ? 'is-active' : ''}" type="button" data-cut-tool="straight"><i data-lucide="minus"></i> Straight</button><button class="workspace-cut-tool ${cutActive === 'slant' ? 'is-active' : ''}" type="button" data-cut-tool="slant"><i data-lucide="slash"></i> Slant</button><button class="workspace-cut-tool ${cutActive === 'curve' ? 'is-active' : ''}" type="button" data-cut-tool="curve"><i data-lucide="spline"></i> Curved</button>${cutActive ? '<button class="workspace-cut-tool" type="button" data-workspace-action="cancel-cut"><i data-lucide="x"></i> Stop cut</button>' : ''}</div><div class="workspace-cut-settings"><label>Precision<select data-cut-precision><option value="0.25" ${this.state.cutPrecision === 0.25 ? 'selected' : ''}>0.25%</option><option value="0.5" ${this.state.cutPrecision === 0.5 ? 'selected' : ''}>0.5%</option><option value="1" ${this.state.cutPrecision === 1 ? 'selected' : ''}>1%</option><option value="2" ${this.state.cutPrecision === 2 ? 'selected' : ''}>2%</option></select></label><label>Seam allowance<input type="number" min="0" max="5" step="0.1" value="${round(this.state.cutSeamAllowance)}" data-cut-seam />%</label></div><p class="workspace-panel-note">${cutActive ? `${capitalize(cutActive)} cut is active. Drag from one edge to another; for a curved seam, use Reshape cut to move the centre handle.` : 'Tip: Shift-select the two matching pieces to align or join them perfectly.'}</p>` : '<p class="workspace-panel-note">Select a garment, image, or existing pattern piece to enable precision cutting.</p>'}
        ${pieces.length ? `<div class="workspace-cut-actions"><button class="workspace-object-tool" type="button" data-workspace-action="reshape-cut">Reshape cut</button><button class="workspace-object-tool" type="button" data-workspace-action="align-cut-pieces" ${pieces.length < 2 ? 'disabled' : ''}>Align seam</button><button class="workspace-object-tool" type="button" data-workspace-action="join-cut-pieces" ${canJoin ? '' : 'disabled'}>Join selected</button></div>` : ''}
        ${this.propertyMarkup(selected[0])}
        <button class="workspace-switch" type="button" data-workspace-action="toggle-snap" aria-pressed="${this.state.artboard.snap}"><i data-lucide="magnet"></i> Board snap <span>${this.state.artboard.snap ? 'On' : 'Off'}</span></button>
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
    const boardDesign = selected.find((item) => item.kind !== 'garment');
    const garments = this.state.objects.filter((item) => item.kind === 'garment');
    const placementTarget =
      selected.find((item) => item.kind === 'garment') ??
      this.findObject(this.state.placementTargetId) ??
      garments[0];
    const canChooseGarment = boardDesign && garments.length;
    return `
      <div class="workspace-selection-summary"><span class="workspace-object-dot workspace-object-dot--${object.kind}"></span><div><strong>${escapeHtml(object.name)}</strong><small>${escapeHtml(object.kind)}${selected.length > 1 ? ` · ${selected.length} objects` : ''}</small></div></div>
      ${this.propertyMarkup(object)}
      ${canPlaceOnGarment ? '<div class="workspace-placement-callout"><i data-lucide="stamp"></i><span>Ready to place a copy of this design on the selected garment.</span><button type="button" data-workspace-action="place-on-garment">Place on garment</button></div>' : ''}
      ${!canPlaceOnGarment && canChooseGarment ? `<div class="workspace-placement-callout"><i data-lucide="stamp"></i><span>Place a copy on a garment while keeping this board layer editable.</span><select data-placement-target aria-label="Garment to receive this design">${garments.map((garment) => `<option value="${garment.id}" ${placementTarget?.id === garment.id ? 'selected' : ''}>${escapeHtml(garment.name)}</option>`).join('')}</select><button type="button" data-workspace-action="place-on-garment">Place on garment</button></div>` : ''}
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
        ${object.kind === 'text' ? textPropertiesMarkup(object) : ''}
        ${object.kind === 'image' ? `<label>Image fit<select data-object-property="imageFit"><option value="contain" ${object.imageFit === 'contain' ? 'selected' : ''}>Show whole image</option><option value="cover" ${object.imageFit === 'cover' ? 'selected' : ''}>Fill frame</option></select></label><label class="workspace-property--wide workspace-image-replace">Replace image<input class="visually-hidden" type="file" accept="image/*" data-image-replace /><span><i data-lucide="refresh-cw"></i> Choose another image</span></label>` : ''}
        ${object.kind === 'garment' ? garmentPropertiesMarkup(object) : ''}
        ${object.kind === 'pattern-piece' ? `<div class="workspace-pattern-piece-info workspace-property--wide"><span>Cut ${escapeHtml(capitalize(object.cut?.mode ?? 'straight'))}</span><span>Seam allowance ${round(object.cut?.seamAllowance ?? 0)}%</span><span>${escapeHtml(object.pieceSide === 'a' ? 'Piece A' : 'Piece B')}</span></div>` : ''}
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
    placementTargetId: null,
    cutTool: null,
    cutPrecision: 0.5,
    cutSeamAllowance: 0.5,
    reshapePieceId: null,
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
    name: textObjectName(text),
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
    textAlign: 'center',
    textTransform: 'none',
    textPreset: 'clean',
    outline: false,
    shadow: false,
    gradient: false,
    locked: false,
    hidden: false,
    flipped: false,
  };
}

function createImageObject(source, name, position = {}, dimensions = {}) {
  const initialPosition = position ?? {};
  const aspectRatio =
    dimensions.width && dimensions.height ? dimensions.width / dimensions.height : 1;
  const width = clamp(Math.min(30, (52 * aspectRatio) / 1.6), 2, 30);
  const height = clamp((width * 1.6) / aspectRatio, 8, 52);
  return {
    id: createId(),
    kind: 'image',
    name: name || 'Imported image',
    source,
    x: clamp(initialPosition.x ?? 34, 0, 100 - width),
    y: clamp(initialPosition.y ?? 30, 0, 100 - height),
    width,
    height,
    rotation: 0,
    opacity: 100,
    colour: '#ffffff',
    aspectRatio,
    imageFit: 'contain',
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

function createCutPieces(object, cut) {
  const sourceFrame = {
    x: object.x,
    y: object.y,
    width: object.width,
    height: object.height,
    rotation: object.rotation,
  };
  const inheritedPaths = object.kind === 'pattern-piece' ? (object.clipPaths ?? []) : [];
  const cutGroup = createId();
  return ['a', 'b'].map((pieceSide) => {
    const direction = pieceSide === 'a' ? -1.1 : 1.1;
    return {
      id: createId(),
      kind: 'pattern-piece',
      name: `${object.name} · cut ${pieceSide.toUpperCase()}`,
      source: object.source,
      x: clamp(sourceFrame.x + direction, 0, 100 - sourceFrame.width),
      y: clamp(sourceFrame.y, 0, 100 - sourceFrame.height),
      width: sourceFrame.width,
      height: sourceFrame.height,
      rotation: sourceFrame.rotation,
      opacity: object.opacity ?? 100,
      colour: object.colour ?? '#7856f3',
      clipPaths: [...inheritedPaths, buildCutPiecePath(cut, pieceSide)],
      cut: clone(cut),
      cutGroup,
      parentCutGroup: object.kind === 'pattern-piece' ? (object.cutGroup ?? null) : null,
      pieceSide,
      sourceFrame,
      locked: false,
      hidden: false,
      flipped: object.flipped ?? false,
    };
  });
}

function createJoinedPiece(piece) {
  const sourceFrame = clone(piece.sourceFrame);
  return {
    ...clone(piece),
    ...sourceFrame,
    id: createId(),
    name: `${piece.name.replace(/ · cut [AB]$/, '')} · joined`,
    clipPaths: piece.clipPaths.slice(0, -1),
    cut: null,
    cutGroup: piece.parentCutGroup ?? null,
    parentCutGroup: null,
    pieceSide: null,
    locked: false,
    hidden: false,
  };
}

function isCuttableObject(object) {
  return ['garment', 'image', 'pattern-piece'].includes(object?.kind) && Boolean(object?.source);
}

function sameSourceFrame(first, second) {
  const a = first?.sourceFrame;
  const b = second?.sourceFrame;
  return Boolean(
    a &&
    b &&
    first.source === second.source &&
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.rotation === b.rotation,
  );
}

function createCutGeometry(mode, initialStart, initialEnd, precision, seamAllowance) {
  let start = snapCutPoint(initialStart, precision);
  let end = snapCutPoint(initialEnd, precision);
  if (mode === 'straight') {
    if (Math.abs(end.x - start.x) >= Math.abs(end.y - start.y)) {
      end = { ...end, y: start.y };
    } else {
      end = { ...end, x: start.x };
    }
  }
  const [first, second] = lineRectangleIntersections(start, end);
  start = snapPointToBoundary(first ?? start, precision);
  end = snapPointToBoundary(second ?? end, precision);
  const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
  const distance = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  const curveBend = mode === 'curve' ? 12 : 0;
  const control = snapCutPoint(
    {
      x: midpoint.x - ((end.y - start.y) / distance) * curveBend,
      y: midpoint.y + ((end.x - start.x) / distance) * curveBend,
    },
    precision,
  );
  return {
    mode,
    start,
    end,
    control,
    seamAllowance: seamAllowance ?? 0,
  };
}

function lineRectangleIntersections(start, end) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  if (Math.abs(deltaX) < 0.01 && Math.abs(deltaY) < 0.01) {
    return [];
  }
  const candidates = [];
  const add = (x, y) => {
    if (x >= -0.01 && x <= 100.01 && y >= -0.01 && y <= 100.01) {
      const point = { x: clamp(x, 0, 100), y: clamp(y, 0, 100) };
      if (!candidates.some((item) => Math.hypot(item.x - point.x, item.y - point.y) < 0.01)) {
        candidates.push(point);
      }
    }
  };
  if (Math.abs(deltaX) > 0.01) {
    add(0, start.y + ((0 - start.x) / deltaX) * deltaY);
    add(100, start.y + ((100 - start.x) / deltaX) * deltaY);
  }
  if (Math.abs(deltaY) > 0.01) {
    add(start.x + ((0 - start.y) / deltaY) * deltaX, 0);
    add(start.x + ((100 - start.y) / deltaY) * deltaX, 100);
  }
  if (candidates.length < 2) {
    return candidates;
  }
  let pair = [candidates[0], candidates[1]];
  let greatestDistance = 0;
  candidates.forEach((point, index) => {
    candidates.slice(index + 1).forEach((other) => {
      const distance = Math.hypot(point.x - other.x, point.y - other.y);
      if (distance > greatestDistance) {
        greatestDistance = distance;
        pair = [point, other];
      }
    });
  });
  return pair;
}

function snapCutPoint(point, precision = 1) {
  const step = Math.max(Number(precision) || 1, 0.01);
  return {
    x: clamp(Math.round(point.x / step) * step, 0, 100),
    y: clamp(Math.round(point.y / step) * step, 0, 100),
  };
}

function snapPointToBoundary(point, precision = 1) {
  const snapped = snapCutPoint(point, precision);
  const distances = [
    { edge: 'left', value: snapped.x },
    { edge: 'right', value: 100 - snapped.x },
    { edge: 'top', value: snapped.y },
    { edge: 'bottom', value: 100 - snapped.y },
  ];
  const nearest = distances.reduce((current, candidate) =>
    candidate.value < current.value ? candidate : current,
  );
  if (nearest.edge === 'left') return { ...snapped, x: 0 };
  if (nearest.edge === 'right') return { ...snapped, x: 100 };
  if (nearest.edge === 'top') return { ...snapped, y: 0 };
  return { ...snapped, y: 100 };
}

function cutLength(cut) {
  return Math.hypot(cut.end.x - cut.start.x, cut.end.y - cut.start.y);
}

function boundaryPosition(point) {
  if (point.y <= 0.01) return point.x;
  if (point.x >= 99.99) return 100 + point.y;
  if (point.y >= 99.99) return 200 + (100 - point.x);
  return 300 + (100 - point.y);
}

function pointAtBoundaryPosition(position) {
  const value = ((position % 400) + 400) % 400;
  if (value <= 100) return { x: value, y: 0 };
  if (value <= 200) return { x: 100, y: value - 100 };
  if (value <= 300) return { x: 300 - value, y: 100 };
  return { x: 0, y: 400 - value };
}

function boundaryPathClockwise(start, end) {
  const startPosition = boundaryPosition(start);
  let endPosition = boundaryPosition(end);
  if (endPosition <= startPosition) {
    endPosition += 400;
  }
  const points = [start];
  [100, 200, 300, 400, 500, 600, 700].forEach((corner) => {
    if (corner > startPosition + 0.01 && corner < endPosition - 0.01) {
      points.push(pointAtBoundaryPosition(corner));
    }
  });
  points.push(end);
  return points;
}

function buildCutPiecePath(cut, pieceSide) {
  const arc =
    pieceSide === 'a'
      ? boundaryPathClockwise(cut.start, cut.end)
      : boundaryPathClockwise(cut.end, cut.start).reverse();
  const outline = arc.map((point, index) => `${index ? 'L' : 'M'}${formatPoint(point)}`).join(' ');
  const closingCut =
    cut.mode === 'curve'
      ? `Q${formatPoint(cut.control)} ${formatPoint(cut.start)}`
      : `L${formatPoint(cut.start)}`;
  return `${outline} ${closingCut} Z`;
}

function formatPoint(point) {
  return `${round(point.x)} ${round(point.y)}`;
}

function cutGuidePath(cut) {
  return cut.mode === 'curve'
    ? `M${formatPoint(cut.start)} Q${formatPoint(cut.control)} ${formatPoint(cut.end)}`
    : `M${formatPoint(cut.start)} L${formatPoint(cut.end)}`;
}

function cutToArtboardCoordinates(object, cut) {
  const toArtboard = (point) => ({
    x: object.x + (point.x / 100) * object.width,
    y: object.y + (point.y / 100) * object.height,
  });
  return {
    ...cut,
    start: toArtboard(cut.start),
    end: toArtboard(cut.end),
    control: toArtboard(cut.control),
  };
}

function patternPieceMarkup(object) {
  const clipPaths = object.clipPaths ?? [];
  const clipIds = clipPaths.map((_, index) => `clip-${object.id}-${index}`);
  const definitions = clipPaths
    .map(
      (path, index) =>
        `<clipPath id="${clipIds[index]}" clipPathUnits="userSpaceOnUse"><path d="${escapeAttribute(path)}" /></clipPath>`,
    )
    .join('');
  let image = `<image href="${escapeAttribute(object.source)}" x="0" y="0" width="100" height="100" preserveAspectRatio="none" />`;
  [...clipIds].reverse().forEach((id) => {
    image = `<g clip-path="url(#${id})">${image}</g>`;
  });
  const cutGuide = object.cut
    ? `<path class="workspace-pattern-piece__seam" d="${cutGuidePath(object.cut)}" />`
    : '';
  return `<div class="workspace-pattern-piece"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs>${definitions}</defs>${image}${cutGuide}</svg></div>`;
}

function cutAnchorMarkup(object) {
  if (!object.cut) {
    return '';
  }
  const anchors = [
    ['start', object.cut.start],
    ['end', object.cut.end],
    ...(object.cut.mode === 'curve' ? [['control', object.cut.control]] : []),
  ];
  return anchors
    .map(
      ([anchor, point]) =>
        `<button class="workspace-cut-anchor workspace-cut-anchor--${anchor}" type="button" data-cut-anchor="${anchor}" style="left:${point.x}%;top:${point.y}%" aria-label="Move ${anchor} cut point"></button>`,
    )
    .join('');
}

function objectMarkup(object, selected, showCutAnchors = false) {
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
    const printContent = garmentArtworkMarkup(object);
    content = `<div class="workspace-garment workspace-garment--mockup" data-texture="${escapeAttribute(object.texture ?? 'plain')}"><img class="workspace-garment__mockup" src="${escapeAttribute(object.source)}" alt="${escapeAttribute(object.name)} editable mockup" draggable="false" /><span class="workspace-garment__colour-wash" aria-hidden="true"></span><span class="workspace-garment__texture" aria-hidden="true"></span><span class="workspace-garment__print" style="--print-x:${printZone.x}%;--print-y:${printZone.y}%;--print-width:${printZone.width}%;--print-height:${printZone.height}%;--print-colour:${escapeAttribute(object.printColour ?? '#f7f2e8')};--print-scale:${object.printScale ?? 100}%">${printContent}</span></div>`;
  }
  if (object.kind === 'pattern-piece') {
    content = patternPieceMarkup(object);
  }
  if (object.kind === 'text') {
    const textStyles = [
      `font-family:${escapeAttribute(object.fontFamily)}`,
      `font-weight:${escapeAttribute(object.fontWeight)}`,
      `font-size:${object.fontSize}px`,
      `letter-spacing:${object.letterSpacing}px`,
      `line-height:${object.lineHeight}`,
      `text-align:${escapeAttribute(object.textAlign ?? 'center')}`,
      `text-transform:${escapeAttribute(object.textTransform ?? 'none')}`,
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
    content = `<p class="workspace-text-object" style="${textStyles}" data-text-editor contenteditable="false" spellcheck="true">${escapeHtml(object.text)}</p>`;
  }
  if (object.kind === 'image') {
    content = `<span class="workspace-image-wrap"><img class="workspace-image-object" style="object-fit:${escapeAttribute(object.imageFit ?? 'contain')}" src="${escapeAttribute(object.source)}" alt="${escapeAttribute(object.name)}" draggable="false" /></span>`;
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
  const cutAnchors = showCutAnchors ? cutAnchorMarkup(object) : '';
  return `<div class="workspace-object workspace-object--${escapeAttribute(object.kind)} ${state}" data-object-id="${object.id}" style="${style}" tabindex="0" role="button" aria-label="${escapeAttribute(object.name)}${object.locked ? ', locked' : ''}">${content}${cutAnchors}${selectedControls}</div>`;
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
    Cut: 'open-measurements',
    Join: 'join-cut-pieces',
    'Align seam': 'align-cut-pieces',
    'Reshape cut': 'reshape-cut',
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
    return {
      ...createGarmentArtworkFromImage(object.source, object.name),
      imageFit: object.imageFit ?? 'contain',
    };
  }
  if (object.kind === 'text') {
    return {
      kind: 'text',
      text: object.text,
      name: object.name,
      colour: object.colour,
      fontFamily: object.fontFamily,
      fontWeight: object.fontWeight,
      letterSpacing: object.letterSpacing,
      textTransform: object.textTransform,
      outline: object.outline,
      shadow: object.shadow,
      gradient: object.gradient,
    };
  }
  return null;
}

function garmentArtworkMarkup(garment) {
  const artworks = garment.printAssets?.length ? garment.printAssets : legacyPrintAssets(garment);
  if (!artworks.length) {
    return escapeHtml(garment.printText ?? 'YOUR MARK');
  }
  return artworks
    .map((artwork, index) => {
      if (artwork.kind === 'image') {
        return `<span class="workspace-garment__placed-artwork" style="--placed-artwork-index:${index}"><img class="workspace-garment__print-image" style="object-fit:${escapeAttribute(artwork.imageFit ?? 'contain')}" src="${escapeAttribute(artwork.source)}" alt="${escapeAttribute(artwork.name)} placed on ${escapeAttribute(garment.name)}" draggable="false" /></span>`;
      }
      if (artwork.kind === 'text') {
        const textStyle = [
          `--placed-design-colour:${escapeAttribute(artwork.colour ?? garment.printColour ?? '#f7f2e8')}`,
          `font-family:${escapeAttribute(artwork.fontFamily ?? 'system-ui')}`,
          `font-weight:${escapeAttribute(artwork.fontWeight ?? '900')}`,
          `letter-spacing:${artwork.letterSpacing ?? 0}px`,
          `text-transform:${escapeAttribute(artwork.textTransform ?? 'none')}`,
          artwork.outline
            ? '-webkit-text-stroke:1px color-mix(in srgb, var(--placed-design-colour) 70%, #111827)'
            : '',
          artwork.shadow ? 'text-shadow:0 2px 4px rgb(15 23 42 / 40%)' : '',
          artwork.gradient
            ? 'background:linear-gradient(135deg, var(--placed-design-colour), #f66e9e);-webkit-background-clip:text;background-clip:text;color:transparent'
            : '',
        ]
          .filter(Boolean)
          .join(';');
        return `<span class="workspace-garment__placed-artwork" style="--placed-artwork-index:${index}"><span class="workspace-garment__print-text" style="${textStyle}">${escapeHtml(artwork.text)}</span></span>`;
      }
      return '';
    })
    .join('');
}

function legacyPrintAssets(garment) {
  return garment.printAsset ? [garment.printAsset] : [];
}

function textPropertiesMarkup(object) {
  return `
    <label class="workspace-property--wide">Text<textarea rows="2" maxlength="160" data-text-content>${escapeHtml(object.text)}</textarea></label>
    <label>Font<select data-font-family><option value="system-ui" ${object.fontFamily === 'system-ui' ? 'selected' : ''}>System Sans</option><option value="Georgia" ${object.fontFamily === 'Georgia' ? 'selected' : ''}>Georgia</option><option value="Arial Black, Impact, sans-serif" ${object.fontFamily === 'Arial Black, Impact, sans-serif' ? 'selected' : ''}>Street</option><option value="cursive" ${object.fontFamily === 'cursive' ? 'selected' : ''}>Script</option><option value="ui-monospace, SFMono-Regular, monospace" ${object.fontFamily === 'ui-monospace, SFMono-Regular, monospace' ? 'selected' : ''}>Mono</option></select></label>
    <label>Weight<select data-font-weight><option value="500" ${object.fontWeight === '500' ? 'selected' : ''}>Regular</option><option value="700" ${object.fontWeight === '700' ? 'selected' : ''}>Bold</option><option value="900" ${object.fontWeight === '900' ? 'selected' : ''}>Black</option></select></label>
    <label>Size<input type="number" min="8" max="240" value="${round(object.fontSize)}" data-object-property="fontSize" /></label>
    <label>Tracking<input type="number" min="-10" max="30" value="${round(object.letterSpacing)}" data-object-property="letterSpacing" /></label>
    <label>Line height<input type="number" min="0.6" max="3" step="0.1" value="${round(object.lineHeight)}" data-object-property="lineHeight" /></label>
    <label>Align<select data-object-property="textAlign"><option value="left" ${object.textAlign === 'left' ? 'selected' : ''}>Left</option><option value="center" ${object.textAlign === 'center' ? 'selected' : ''}>Centre</option><option value="right" ${object.textAlign === 'right' ? 'selected' : ''}>Right</option></select></label>
    <label>Case<select data-object-property="textTransform"><option value="none" ${object.textTransform === 'none' ? 'selected' : ''}>Original</option><option value="uppercase" ${object.textTransform === 'uppercase' ? 'selected' : ''}>UPPERCASE</option><option value="lowercase" ${object.textTransform === 'lowercase' ? 'selected' : ''}>lowercase</option></select></label>
    <div class="workspace-text-style-presets workspace-property--wide" aria-label="Text style presets"><span>Quick styles</span>${['clean', 'editorial', 'street', 'script', 'mono'].map((preset) => `<button type="button" class="workspace-text-style-preset ${object.textPreset === preset ? 'is-active' : ''}" data-text-preset="${preset}">${capitalize(preset)}</button>`).join('')}</div>`;
}

function garmentPropertiesMarkup(object) {
  const placedCount = object.printAssets?.length ?? (object.printAsset ? 1 : 0);
  return `<label class="workspace-property--wide">Print text<input type="text" maxlength="28" value="${escapeAttribute(object.printText ?? 'YOUR MARK')}" data-object-property="printText" /></label><label>Print colour<input type="color" value="${escapeAttribute(object.printColour ?? '#f7f2e8')}" data-object-property="printColour" /></label><label>Print scale<input type="number" min="40" max="170" value="${round(object.printScale ?? 100)}" data-object-property="printScale" /></label><div class="workspace-garment-design-control"><span>${placedCount ? `${placedCount} placed design${placedCount === 1 ? '' : 's'} · the original board layer stays editable` : 'Add an image or text layer, then select it with this garment to place a copy on the cloth.'}</span><label class="workspace-inline-upload"><input class="visually-hidden" type="file" accept="image/*" data-image-input /><i data-lucide="image-up"></i> Add image layer</label>${placedCount ? '<button type="button" data-workspace-action="clear-garment-design">Remove placed designs</button>' : ''}</div>`;
}

function textObjectName(text) {
  const value =
    String(text ?? '')
      .replaceAll(/\s+/g, ' ')
      .trim() || 'New text';
  return value.length > 18 ? `${value.slice(0, 18)}…` : value;
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

function readImageDimensions(source) {
  return new Promise((resolve) => {
    const image = document.createElement('img');
    let complete = false;
    const finish = (dimensions = {}) => {
      if (complete) {
        return;
      }
      complete = true;
      resolve(dimensions);
    };
    image.onload = () => finish({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => finish();
    image.src = source;
    window.setTimeout(() => finish(), 1500);
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
