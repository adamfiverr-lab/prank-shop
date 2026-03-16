let container: HTMLElement | null = null;

function ensureContainer(): HTMLElement {
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

export function showToast(message: string, type: 'success' | 'error' | 'info' | 'gold' = 'info'): void {
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  const c = ensureContainer();
  c.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}
