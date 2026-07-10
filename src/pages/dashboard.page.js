import { createElementFromHtml } from '../utils/dom.js';

export function dashboardPage() {
  return createElementFromHtml(`
    <section class="page dashboard">
      <header class="dashboard-hero">
        <div class="dashboard-hero__copy">
          <p class="page-header__eyebrow">Your creative workspace</p>
          <h1>Make something<br /><em>worth wearing.</em></h1>
          <p>Start with a thought, shape it into a concept, and keep every exploration safely on this device.</p>
          <div class="dashboard-hero__actions">
            <a class="button" href="/design-clothes" data-route><i data-lucide="plus"></i> Start a new project</a>
            <button class="button button--ghost" type="button" data-search-open><i data-lucide="search"></i> Find anything</button>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="hero-art__orb hero-art__orb--one"></div>
          <div class="hero-art__orb hero-art__orb--two"></div>
          <div class="hero-art__board">
            <span class="hero-art__label">OFF / 01</span>
            <div class="hero-art__silhouette"></div>
            <div class="hero-art__line hero-art__line--one"></div>
            <div class="hero-art__line hero-art__line--two"></div>
            <span class="hero-art__caption">a quiet study in form</span>
          </div>
        </div>
      </header>

      <section class="dashboard-section" aria-labelledby="start-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Start creating</p>
            <h2 id="start-heading">Choose your canvas</h2>
          </div>
          <span class="section-heading__hint">More creative tools are on their way.</span>
        </div>
        <div class="launch-grid">
          <a class="launch-card launch-card--clothes" href="/design-clothes" data-route>
            <span class="launch-card__icon"><i data-lucide="shirt"></i></span>
            <span class="launch-card__body"><strong>Design Clothes</strong><small>Shape your next collection</small></span>
            <i class="launch-card__arrow" data-lucide="arrow-up-right"></i>
          </a>
          <a class="launch-card launch-card--logo" href="/create-logo" data-route>
            <span class="launch-card__icon"><i data-lucide="sparkles"></i></span>
            <span class="launch-card__body"><strong>Create Logo</strong><small>Give an idea its signature</small></span>
            <i class="launch-card__arrow" data-lucide="arrow-up-right"></i>
          </a>
          <a class="launch-card launch-card--sketch" href="/sketch-diagram" data-route>
            <span class="launch-card__icon"><i data-lucide="pen-line"></i></span>
            <span class="launch-card__body"><strong>Sketch Diagram</strong><small>Map the thinking behind it</small></span>
            <i class="launch-card__arrow" data-lucide="arrow-up-right"></i>
          </a>
        </div>
      </section>

      <section class="dashboard-split">
        <article class="continue-card">
          <div class="continue-card__top">
            <div>
              <p class="eyebrow">Continue last project</p>
              <h2>Your next piece starts here.</h2>
            </div>
            <span class="continue-card__state"><i data-lucide="clock-3"></i> Ready when you are</span>
          </div>
          <div class="continue-card__body">
            <div class="project-thumbnail" aria-hidden="true"><span></span><span></span><span></span></div>
            <div>
              <h3>No active project yet</h3>
              <p>Your latest concept will appear here for a fast return to work.</p>
              <a class="text-link" href="/projects" data-route>Open my projects <i data-lucide="arrow-up-right"></i></a>
            </div>
          </div>
        </article>
        <aside class="welcome-card">
          <span class="welcome-card__icon"><i data-lucide="cloud-off"></i></span>
          <p class="eyebrow">Private by default</p>
          <h2>Your work lives with you.</h2>
          <p>OffDesign keeps your workspace local and ready even when the connection disappears.</p>
          <a href="/settings" data-route>Explore offline storage <i data-lucide="arrow-up-right"></i></a>
        </aside>
      </section>

      <section class="dashboard-section" aria-labelledby="explore-heading">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Explore & learn</p>
            <h2 id="explore-heading">A thoughtful place to begin</h2>
          </div>
        </div>
        <div class="resource-grid">
          <a class="resource-card resource-card--wide" href="/templates" data-route>
            <span class="resource-card__icon"><i data-lucide="layout-template"></i></span>
            <span><strong>Clothing Templates</strong><small>Start from considered foundations.</small></span>
            <i data-lucide="arrow-up-right"></i>
          </a>
          <a class="resource-card" href="/fabric-library" data-route>
            <span class="resource-card__icon"><i data-lucide="layers"></i></span>
            <span><strong>Fabric Library</strong><small>Build a tactile material library.</small></span>
          </a>
          <a class="resource-card" href="/color-palette" data-route>
            <span class="resource-card__icon"><i data-lucide="palette"></i></span>
            <span><strong>Color Palette</strong><small>Collect colors that belong together.</small></span>
          </a>
          <a class="resource-card" href="/help" data-route>
            <span class="resource-card__icon"><i data-lucide="book-open"></i></span>
            <span><strong>Quick Start Guide</strong><small>Get familiar with your workspace.</small></span>
          </a>
          <a class="resource-card resource-card--tutorial" href="/help" data-route>
            <span class="resource-card__icon"><i data-lucide="wand-sparkles"></i></span>
            <span><strong>Tips & Tutorials</strong><small>Small prompts for better creative flow.</small></span>
          </a>
        </div>
      </section>
    </section>
  `);
}
