export interface IABFindRequest { query: string; index: number; requestId: number }
export interface IABFindResult extends IABFindRequest { total: number }

/** Serialized into the isolated snapshot. Keep this function free of module-scope dependencies. */
export function installIABFindBridge(win: Window & typeof globalThis, doc: Document, channel: string, parentOrigin: string) {
  let latestRequest = -1;
  let marks: HTMLElement[] = [];
  const allName = `bing-iab-find-${channel}`, activeName = `${allName}-active`;
  const registry = win.CSS?.highlights;
  const highlightSupported = Boolean(registry && win.Highlight);
  const style = doc.createElement("style");
  style.textContent = `::highlight(${allName}){background:#ffdf66;color:#171717}::highlight(${activeName}){background:#ffb347;color:#171717}`;
  doc.head.append(style);
  const clear = () => {
    registry?.delete(allName); registry?.delete(activeName);
    for (const mark of marks) {
      const parent = mark.parentNode;
      mark.replaceWith(...Array.from(mark.childNodes));
      parent?.normalize();
    }
    marks = [];
  };
  const receive = (event: MessageEvent) => {
    const data = event.data;
    if (event.source !== win.parent || event.origin !== parentOrigin || !data || data.channel !== channel) return;
    if (data.type === "bing-iab-find-clear") { clear(); return; }
    if (data.type !== "bing-iab-find" || typeof data.query !== "string" || data.query.length > 4096
      || !Number.isSafeInteger(data.index) || !Number.isSafeInteger(data.requestId) || data.requestId < latestRequest || data.requestId < 0) return;
    latestRequest = data.requestId;
    clear();
    const query: string = data.query;
    const segments: { node: Text; start: number; end: number }[] = [];
    let text = "", previousBlock: Element | null = null;
    const visibility = new WeakMap<Element, boolean>();
    const visible = (element: Element): boolean => {
      const cached = visibility.get(element);
      if (cached !== undefined) return cached;
      const css = win.getComputedStyle(element);
      const result = !element.matches('[hidden], [aria-hidden="true"], script, style, noscript, textarea, input, select')
        && css.display !== "none" && css.visibility !== "hidden" && css.visibility !== "collapse"
        && (!element.parentElement || visible(element.parentElement));
      visibility.set(element, result);
      return result;
    };
    const block = (element: Element): Element => {
      for (let current: Element | null = element; current && current !== doc.body; current = current.parentElement) {
        const display = win.getComputedStyle(current).display;
        if (display && !display.startsWith("inline") && display !== "contents") return current;
      }
      return doc.body;
    };
    if (query && doc.body) {
      const walker = doc.createTreeWalker(doc.body, win.NodeFilter.SHOW_TEXT | win.NodeFilter.SHOW_ELEMENT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.nodeType === win.Node.ELEMENT_NODE) {
          if ((node as Element).tagName === "BR" && visible(node as Element)) text += "\n";
          continue;
        }
        const element = node.parentElement;
        if (!node.nodeValue || !element || !visible(element)) continue;
        const currentBlock = block(element);
        if (previousBlock && previousBlock !== currentBlock) text += "\n";
        previousBlock = currentBlock;
        const start = text.length;
        text += node.nodeValue;
        segments.push({ node: node as Text, start, end: text.length });
      }
    }
    const expression = query ? new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu") : null;
    let total = 0;
    if (expression) while (expression.exec(text)) total++;
    const index = total ? ((data.index % total) + total) % total : -1;
    const ranges: Range[] = [];
    let activeRange: Range | null = null;
    const spans = new Map<Text, { start: number; end: number; active: boolean }[]>();
    if (expression) {
      expression.lastIndex = 0;
      let match: RegExpExecArray | null, position = 0, cursor = 0;
      while ((match = expression.exec(text))) {
        const start = match.index, end = start + match[0].length, selected = position === index;
        // Count every match, but bound painted ranges on very large documents.
        if (position++ >= 1000 && !selected) continue;
        while (segments[cursor] && segments[cursor].end <= start) cursor++;
        const first = segments[cursor];
        let last = cursor;
        while (segments[last] && segments[last].end < end) last++;
        if (!first || !segments[last]) continue;
        const range = doc.createRange();
        // Block separators are synthetic; map a boundary beside one to visible text.
        range.setStart(first.node, Math.max(0, start - first.start));
        range.setEnd(segments[last].node, Math.max(0, end - segments[last].start));
        ranges.push(range);
        if (selected) activeRange = range;
        if (!highlightSupported) for (let part = cursor; part <= last; part++) {
          const segment = segments[part];
          const span = { start: Math.max(0, start - segment.start), end: Math.min(segment.end, end) - segment.start, active: selected };
          if (span.end > span.start) spans.set(segment.node, [...(spans.get(segment.node) ?? []), span]);
        }
      }
    }
    let activeElement: HTMLElement | null = activeRange?.startContainer.parentElement ?? null;
    if (highlightSupported) {
      registry.set(allName, new win.Highlight(...ranges));
      const selected = new win.Highlight(...(activeRange ? [activeRange] : []));
      selected.priority = 1;
      registry.set(activeName, selected);
    } else for (const [node, parts] of spans) {
      for (const part of parts.reverse()) {
        node.splitText(part.end);
        const hit = node.splitText(part.start);
        const mark = doc.createElement("mark");
        mark.setAttribute("data-iab-find", part.active ? "active" : "match");
        mark.style.cssText = `background:${part.active ? "#ffb347" : "#ffdf66"};color:#171717;padding:0;font:inherit;`;
        hit.replaceWith(mark); mark.append(hit); marks.push(mark);
        if (part.active) activeElement = mark;
      }
    }
    if (highlightSupported && activeRange?.getBoundingClientRect) {
      activeElement?.scrollIntoView?.({ block: "nearest", inline: "nearest", behavior: "instant" });
      const rect = activeRange.getBoundingClientRect();
      win.scrollBy({ top: rect.top + rect.height / 2 - win.innerHeight / 2, behavior: "instant" });
    } else activeElement?.scrollIntoView?.({ block: "center", inline: "nearest", behavior: "instant" });
    win.parent.postMessage({ type: "bing-iab-find-result", channel, query, total, index, requestId: data.requestId }, parentOrigin);
  };
  win.addEventListener("message", receive);
  return () => { win.removeEventListener("message", receive); clear(); style.remove(); };
}
