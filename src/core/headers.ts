/** States of the "Cycle Bases headers" command, in the order each run steps through them. */
export type HeadersMode = "auto" | "hide" | "show";

/**
 * Step a pane to the next headers mode: auto (each view's `header` option), all hidden, all shown.
 * Kept as classes on the pane so styles.css does the hiding; plain DOM so it runs under jsdom.
 */
export function cycleHeaders(el: HTMLElement): HeadersMode {
  const next: HeadersMode = el.classList.contains("agate-headers-hide")
    ? "show"
    : el.classList.contains("agate-headers-show")
      ? "auto"
      : "hide";
  el.classList.toggle("agate-headers-hide", next === "hide");
  el.classList.toggle("agate-headers-show", next === "show");
  return next;
}
