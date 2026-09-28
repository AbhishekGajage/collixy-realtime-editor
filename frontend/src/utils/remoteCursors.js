/**
 * remoteCursors.js — Manages live multi-cursor decorations in Monaco Editor.
 *
 * Each remote user gets a uniquely-coloured cursor line and an optional
 * selection highlight, plus a floating name label that fades after 3 s of
 * inactivity. The CSS classes referenced here are defined in index.css.
 */

// ─── Colour palette (10 hues, reused round-robin) ─────────────────────
const CURSOR_COLORS = [
  { cursor: '#FF6B6B', selection: 'rgba(255,107,107,0.18)', label: '#FF6B6B' },
  { cursor: '#4ECDC4', selection: 'rgba(78,205,196,0.18)',  label: '#4ECDC4' },
  { cursor: '#FFD93D', selection: 'rgba(255,217,61,0.18)',  label: '#FFD93D' },
  { cursor: '#6C5CE7', selection: 'rgba(108,92,231,0.18)',  label: '#6C5CE7' },
  { cursor: '#A8E6CF', selection: 'rgba(168,230,207,0.18)', label: '#A8E6CF' },
  { cursor: '#FF8A5C', selection: 'rgba(255,138,92,0.18)',  label: '#FF8A5C' },
  { cursor: '#EA73F4', selection: 'rgba(234,115,244,0.18)', label: '#EA73F4' },
  { cursor: '#78E08F', selection: 'rgba(120,224,143,0.18)', label: '#78E08F' },
  { cursor: '#F8A5C2', selection: 'rgba(248,165,194,0.18)', label: '#F8A5C2' },
  { cursor: '#63C7FF', selection: 'rgba(99,199,255,0.18)',  label: '#63C7FF' },
];

let colorIndex = 0;

// ─── Per-editor state map ──────────────────────────────────────────────
// Key = Monaco editor instance, Value = Map<userId, cursorState>
const editorsMap = new WeakMap();

function getEditorState(editor) {
  if (!editorsMap.has(editor)) {
    editorsMap.set(editor, new Map());
  }
  return editorsMap.get(editor);
}

function assignColor(userId) {
  const color = CURSOR_COLORS[colorIndex % CURSOR_COLORS.length];
  colorIndex++;
  return color;
}

// ─── Inject a one-off <style> with dynamic CSS for a specific user ────
const injectedStyles = new Set();

function injectCursorStyles(userId, color) {
  const safeId = CSS.escape(userId);
  if (injectedStyles.has(safeId)) return;
  injectedStyles.add(safeId);

  const style = document.createElement('style');
  style.textContent = `
    /* Cursor line (the thin vertical bar) */
    .remote-cursor-${safeId} {
      background: ${color.cursor} !important;
      width: 2px !important;
      margin-left: -1px;
      z-index: 100;
      animation: remoteCursorBlink 1s step-end infinite;
    }

    /* Selection highlight */
    .remote-selection-${safeId} {
      background: ${color.selection} !important;
      border-radius: 2px;
    }

    /* Name label (floats above the cursor) */
    .remote-cursor-label-${safeId}::after {
      content: attr(data-username);
      position: absolute;
      top: -18px;
      left: 0;
      background: ${color.label};
      color: #000;
      font-size: 11px;
      font-weight: 600;
      font-family: 'Inter', sans-serif;
      padding: 1px 6px;
      border-radius: 3px 3px 3px 0;
      white-space: nowrap;
      pointer-events: none;
      z-index: 200;
      line-height: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.25);
      opacity: 1;
      transition: opacity 0.3s ease;
    }
  `;
  document.head.appendChild(style);
}

// ─── Public API ────────────────────────────────────────────────────────

/**
 * Update (or create) a remote user's cursor decoration in the editor.
 *
 * @param {import('monaco-editor').editor.IStandaloneCodeEditor} editor
 * @param {string} userId   - Socket ID of the remote user
 * @param {string} username - Display name for the cursor label
 * @param {{ lineNumber: number, column: number }} cursor
 * @param {{ startLineNumber: number, startColumn: number, endLineNumber: number, endColumn: number } | null} selection
 */
export function updateRemoteCursor(editor, userId, username, cursor, selection) {
  if (!editor || !cursor) return;

  const cursorStates = getEditorState(editor);

  // Lazily assign colour
  if (!cursorStates.has(userId)) {
    cursorStates.set(userId, {
      color: assignColor(userId),
      decorationIds: [],
      labelTimer: null,
      showLabel: true,
    });
  }

  const state = cursorStates.get(userId);
  const safeId = CSS.escape(userId);

  // Inject CSS the first time we see this user
  injectCursorStyles(userId, state.color);

  // ── Build decoration array ──────────────────────────────────────
  const decorations = [];

  // 1) Cursor bar (a zero-width range at the cursor position)
  decorations.push({
    range: {
      startLineNumber: cursor.lineNumber,
      startColumn: cursor.column,
      endLineNumber: cursor.lineNumber,
      endColumn: cursor.column,
    },
    options: {
      className: `remote-cursor-${safeId}`,
      beforeContentClassName: state.showLabel
        ? `remote-cursor-label-${safeId}`
        : undefined,
      stickiness: 1, // NeverGrowsWhenTypingAtEdges
      // Attach the username as a data-attribute for the CSS ::after label
      hoverMessage: { value: username },
    },
  });

  // 2) Selection highlight (optional)
  if (selection && (
    selection.startLineNumber !== selection.endLineNumber ||
    selection.startColumn !== selection.endColumn
  )) {
    decorations.push({
      range: {
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn,
      },
      options: {
        className: `remote-selection-${safeId}`,
        hoverMessage: { value: `${username}'s selection` },
        stickiness: 1,
      },
    });
  }

  // ── Apply to the editor ─────────────────────────────────────────
  state.decorationIds = editor.deltaDecorations(
    state.decorationIds,
    decorations
  );

  // ── Username data-attribute (for the CSS ::after content) ───────
  // deltaDecorations creates DOM nodes whose class we set above.
  // We search by class and set the data-username attribute so the
  // CSS `content: attr(data-username)` rule can render the name.
  requestAnimationFrame(() => {
    const els = document.querySelectorAll(`.remote-cursor-label-${safeId}`);
    els.forEach((el) => {
      el.setAttribute('data-username', username);
    });
  });

  // ── Auto-hide label after 3 s of inactivity ────────────────────
  if (state.labelTimer) clearTimeout(state.labelTimer);
  state.showLabel = true;
  state.labelTimer = setTimeout(() => {
    state.showLabel = false;
    // Re-render decorations without the label class
    const minimalDecorations = [{
      range: {
        startLineNumber: cursor.lineNumber,
        startColumn: cursor.column,
        endLineNumber: cursor.lineNumber,
        endColumn: cursor.column,
      },
      options: {
        className: `remote-cursor-${safeId}`,
        stickiness: 1,
        hoverMessage: { value: username },
      },
    }];
    state.decorationIds = editor.deltaDecorations(
      state.decorationIds,
      minimalDecorations
    );
  }, 3000);
}

/**
 * Remove all decorations for a user who left the room.
 */
export function removeRemoteCursor(editor, userId) {
  if (!editor) return;
  const cursorStates = getEditorState(editor);
  const state = cursorStates.get(userId);
  if (state) {
    editor.deltaDecorations(state.decorationIds, []);
    if (state.labelTimer) clearTimeout(state.labelTimer);
    cursorStates.delete(userId);
  }
}

/**
 * Remove ALL remote cursor decorations (called on unmount / room exit).
 */
export function removeAllRemoteCursors(editor) {
  if (!editor) return;
  const cursorStates = getEditorState(editor);
  cursorStates.forEach((state) => {
    editor.deltaDecorations(state.decorationIds, []);
    if (state.labelTimer) clearTimeout(state.labelTimer);
  });
  cursorStates.clear();
}

/**
 * Extract cursor position + selection from the Monaco editor instance.
 * Returns a payload ready to be emitted via socket.
 */
export function getLocalCursorPayload(editor) {
  if (!editor) return null;

  const position = editor.getPosition();
  const selection = editor.getSelection();

  if (!position) return null;

  return {
    cursor: {
      lineNumber: position.lineNumber,
      column: position.column,
    },
    selection: selection
      ? {
          startLineNumber: selection.startLineNumber,
          startColumn: selection.startColumn,
          endLineNumber: selection.endLineNumber,
          endColumn: selection.endColumn,
        }
      : null,
  };
}
