export function createElementFromHtml(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild;
}

export function createPageShell({ eyebrow, title, description, body }) {
  return createElementFromHtml(`
    <section class="page">
      <header class="page-header">
        <p class="page-header__eyebrow">${eyebrow}</p>
        <h1>${title}</h1>
        <p class="page-header__description">${description}</p>
      </header>
      ${body}
    </section>
  `);
}
