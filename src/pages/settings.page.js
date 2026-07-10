import { createPageShell } from '../utils/dom.js';

export function settingsPage() {
  return createPageShell({
    eyebrow: 'Application',
    title: 'Settings',
    description:
      'Persistent preferences will live in the settings object store and remain available offline.',
    body: `
      <form class="settings-form" aria-label="Placeholder settings">
        <label class="field">
          <span>Measurement system</span>
          <select disabled>
            <option>Centimeters</option>
            <option>Inches</option>
          </select>
        </label>
        <label class="field">
          <span>Autosave interval</span>
          <select disabled>
            <option>Every 30 seconds</option>
            <option>Every minute</option>
          </select>
        </label>
      </form>
    `,
  });
}
