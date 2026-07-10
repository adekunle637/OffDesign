export function createInstallPrompt(mountPoint) {
  if (!mountPoint) {
    return;
  }

  let installEvent;
  const button = document.createElement('button');
  button.className = 'button button--secondary install-button';
  button.type = 'button';
  button.textContent = 'Install';
  button.hidden = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installEvent = event;
    button.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    installEvent = undefined;
    button.hidden = true;
  });

  button.addEventListener('click', async () => {
    if (!installEvent) {
      return;
    }

    installEvent.prompt();
    await installEvent.userChoice;
    installEvent = undefined;
    button.hidden = true;
  });

  mountPoint.replaceChildren(button);
}
