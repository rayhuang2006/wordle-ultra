/**
 * Fast path for typing and deleting letters.
 * Only the five cells in the currently active row may be touched. Completed
 * rows, the keyboard, and statistics retain their DOM identities.
 *
 * The function deliberately has no browser globals so it can be unit tested.
 */
export function updateTypingRow(board, guessIndex, current) {
  if (!Number.isInteger(guessIndex) || guessIndex < 0 || guessIndex > 5) return false;
  if (!/^[a-z]{0,5}$/.test(current)) return false;
  const row = board.children[guessIndex];
  if (!row || row.children.length !== 5) return false;

  row.setAttribute("aria-label", `第 ${guessIndex + 1} 次猜測：${current || "尚未輸入"}`);

  for (let col = 0; col < 5; col++) {
    const tile = row.children[col];
    const letter = (current[col] || "").toUpperCase();
    const appearance = letter ? "filled" : "empty";
    if (tile.textContent !== letter) tile.textContent = letter;
    if (tile.dataset.state !== appearance) tile.dataset.state = appearance;
  }
  return true;
}
