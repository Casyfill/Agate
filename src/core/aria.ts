/**
 * Vega writes a spec's `description` (and mark, axis and legend descriptions) into `aria-label`
 * for screen readers. Obsidian shows a hover tooltip for every element with an `aria-label`, so a
 * long spec description pops up whenever the pointer is over the chart. Keep the text for
 * assistive technology as `aria-description`, which Obsidian does not turn into a tooltip.
 */
export function moveAriaLabels(root: Element): void {
  const els = [root, ...Array.from(root.querySelectorAll("[aria-label]"))];
  for (const el of els) moveAriaLabel(el);
}

function moveAriaLabel(el: Element): void {
  const label = el.getAttribute("aria-label");
  if (label === null) return;
  el.removeAttribute("aria-label");
  el.setAttribute("aria-description", label);
}

/**
 * Move the labels Vega has set and keep moving the ones it sets later (the SVG renderer writes
 * them as marks enter). Returns the observer so the caller can disconnect it.
 */
export function quietAriaLabels(root: Element): MutationObserver | null {
  moveAriaLabels(root);
  if (typeof MutationObserver === "undefined") return null;
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "attributes") moveAriaLabel(r.target as Element);
      else r.addedNodes.forEach((n) => n.nodeType === 1 && moveAriaLabels(n as Element));
    }
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-label"] });
  return observer;
}
