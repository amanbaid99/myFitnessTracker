/** Keep the coach's opening and final recommendation, with the full text available on demand. */
export function reviewPreview(summary: string): { overview: string; focus: string | null } {
  const sentences = summary.trim().split(/(?<=[.!?])\s+(?=[A-Z0-9])/).filter(Boolean);
  const final = sentences.at(-1) ?? "";
  const recommendation = /^(aim|next|try|keep|focus|consider|prioriti[sz]e|allow|leave|take|schedule|build|maintain|avoid|continue|plan|add|make|use|target|complete|finish|rest|train|balance|you (?:can|could|should))\b/i.test(final);
  if (sentences.length < 3 || !recommendation) return { overview: sentences.slice(0, 2).join(" "), focus: null };
  return { overview: sentences.slice(0, 2).join(" "), focus: sentences.at(-1)! };
}
