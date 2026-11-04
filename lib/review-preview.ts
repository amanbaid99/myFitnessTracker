/** Keep the coach's opening and final recommendation, with the full text available on demand. */
export function reviewPreview(summary: string): { overview: string; focus: string | null } {
  const sentences = summary.trim().split(/(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean);
  const final = sentences.at(-1) ?? "";
  const recommendation = /^(aim|next|try|keep|focus|consider|prioriti[sz]e|allow|leave|take|schedule|build|maintain|avoid|continue|plan|add|make|use|target|complete|finish|rest|train|balance|you (?:can|could|should))\b/i.test(final);
  if (sentences.length < 3 || !recommendation) return { overview: sentences.slice(0, 2).join(" "), focus: null };
  return { overview: sentences.slice(0, 2).join(" "), focus: sentences.at(-1)! };
}

/**
 * The full review split for the weekly page: the final recommendation
 * (shown up front as Next focus) and the rest. Markdown lists or headings
 * are left whole so nothing is cut mid-structure. Pure.
 */
export function reviewParts(summary: string): { body: string; focus: string | null } {
  const text = summary.trim();
  if (/\n\s*([-*]|\d+[.)]|#)/.test(text) || /\*\*/.test(text)) return { body: text, focus: null };
  const { focus } = reviewPreview(text);
  if (!focus) return { body: text, focus: null };
  return { body: text.slice(0, text.lastIndexOf(focus)).trim(), focus };
}
