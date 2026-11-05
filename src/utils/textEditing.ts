const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** Keep input within the service's UTF-16 limit without cutting a visible character. */
export function limitTextLength(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  let end = 0;
  for (const { index, segment } of graphemes.segment(value)) {
    if (index + segment.length > maxLength) break;
    end = index + segment.length;
  }
  return value.slice(0, end);
}

/** DOM selections use UTF-16 offsets; delete whole visible characters instead. */
export function deleteBackward(value: string, start: number, end = start) {
  let from = Math.max(0, Math.min(start, value.length));
  let to = Math.max(from, Math.min(end, value.length));
  if (from === to && from === 0) return { value, caret: 0 };
  const selected = to > from;
  for (const { index, segment } of graphemes.segment(value)) {
    const after = index + segment.length;
    if (selected) {
      if (index < from && after > from) from = index;
      if (index < to && after > to) to = after;
    } else if (index < from && after >= from) {
      from = index;
      to = after;
      break;
    }
  }
  return { value: value.slice(0, from) + value.slice(to), caret: from };
}
