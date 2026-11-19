/**
 * One copy behaviour for every "copy BibTeX" button on the page.
 *
 * A button marked `data-bibtex-copy` copies the record of the BibTeX block
 * inside its nearest `[data-bibtex-scope]`: the block itself (its corner
 * icon) or a dialog that holds one (the dialog's Copy BibTeX button). The
 * text is the block's `data-bibtex`, the record as written, never the
 * rendered markup, so wrapping and colouring cannot change what is copied.
 *
 * Feedback is a `data-state` on the button ("done" or "fallback") and a
 * short message in its `[data-bibtex-copy-label]`, both reset after a moment.
 * One listener on the document serves every button, including any added
 * later, so the script can be included any number of times.
 */

const RESET_MS = 1400;

let installed = false;

function showFeedback(
  button: HTMLElement,
  state: "done" | "fallback",
  message: string,
) {
  const label = button.querySelector<HTMLElement>("[data-bibtex-copy-label]");
  if (label && label.dataset.idle === undefined)
    label.dataset.idle = label.textContent ?? "";
  button.dataset.state = state;
  if (label) label.textContent = message;
  window.clearTimeout(Number(button.dataset.resetTimer));
  button.dataset.resetTimer = String(
    window.setTimeout(() => {
      delete button.dataset.state;
      if (label) label.textContent = label.dataset.idle ?? "";
    }, RESET_MS),
  );
}

function copy(button: HTMLElement, block: HTMLElement) {
  const text = block.dataset.bibtex ?? "";
  // Select the record so the "Press ⌘C" fallback has something to copy.
  const fallBack = () => {
    const code = block.querySelector("code");
    if (code) window.getSelection()?.selectAllChildren(code);
    showFeedback(button, "fallback", "Press ⌘C");
  };
  // `navigator.clipboard` is undefined outside a secure context (such as the
  // dev server opened over a LAN address), so calling it directly would
  // throw before the promise could reject.
  if (!navigator.clipboard) {
    fallBack();
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => showFeedback(button, "done", "Copied"))
    .catch(fallBack);
}

export function installBibtexCopy() {
  if (installed) return;
  installed = true;
  document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const button = target?.closest<HTMLElement>("[data-bibtex-copy]");
    if (!button) return;
    const scope = button.closest<HTMLElement>("[data-bibtex-scope]");
    const block = scope?.matches("[data-bibtex]")
      ? scope
      : scope?.querySelector<HTMLElement>("[data-bibtex]");
    if (block) copy(button, block);
  });
}
