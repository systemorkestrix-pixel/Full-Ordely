export function bindActionButtons(container, handlers = {}) {
  container.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) {
      return;
    }

    const handler = handlers[button.dataset.action];
    if (handler) {
      handler(button.dataset);
    }
  });
}
