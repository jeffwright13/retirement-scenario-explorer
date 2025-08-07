/**
 * Updates the top-of-page scenario header with title and notes.
 *
 * If metadata includes a title or notes, this function inserts them
 * into the corresponding DOM elements and makes the header visible.
 * Otherwise, it clears the contents and hides the header.
 *
 * @param {Object} metadata - Optional metadata object with scenario info
 * @param {string} [metadata.title] - Scenario title to display
 * @param {string} [metadata.notes] - Additional notes or description
 */
export function updateHeaderFromMetadata(metadata) {
  const header = document.getElementById("scenario-header");
  const title = document.getElementById("scenario-title");
  const notes = document.getElementById("scenario-notes");

  if (metadata?.title || metadata?.notes) {
    title.textContent = metadata.title || "";
    notes.textContent = metadata.notes || "";
    header.classList.remove("hidden");
  } else {
    title.textContent = "";
    notes.textContent = "";
    header.classList.add("hidden");
  }
}
