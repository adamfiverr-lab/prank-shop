export function $(selector: string, parent: Element | Document = document): HTMLElement | null {
  return parent.querySelector(selector);
}

export function el(tag: string, attrs?: Record<string, string>, ...children: (string | Node)[]): HTMLElement {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'className') e.className = v;
      else if (k === 'textContent') e.textContent = v;
      else e.setAttribute(k, v);
    }
  }
  for (const child of children) {
    if (typeof child === 'string') e.appendChild(document.createTextNode(child));
    else e.appendChild(child);
  }
  return e;
}

export function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec.toString().padStart(2, '0')}s`;
}

export function formatGold(amount: number): string {
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}k`;
  return amount.toString();
}

export function qualityClass(quality: string): string {
  return `quality-${quality}`;
}

export function categoryClass(category: string): string {
  return `category-${category}`;
}
