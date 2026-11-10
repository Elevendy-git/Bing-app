import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installIABFindBridge, type IABFindResult } from "./iabFindBridge";
import { withIABNavigation } from "./webNavigation";

const channel = "test-document-1", origin = window.location.origin;
let dispose: (() => void) | undefined;
let reply = vi.fn();
function send(query: string, index = 0, requestId = 1, override: Partial<MessageEventInit> = {}) {
  window.dispatchEvent(new MessageEvent("message", { source: window.parent, origin,
    data: { type: "bing-iab-find", channel, query, index, requestId }, ...override }));
  return reply.mock.calls.at(-1)?.[0] as (IABFindResult & { type: string; channel: string }) | undefined;
}
function setup(html: string) {
  document.body.innerHTML = html;
  dispose = installIABFindBridge(window, document, channel, origin);
}
beforeEach(() => {
  reply = vi.fn();
  vi.spyOn(window.parent, "postMessage").mockImplementation(reply);
});
afterEach(() => {
  dispose?.(); dispose = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe("Find in an opaque IAB document", () => {
  it("finds literal punctuation and text split across inline elements without changing links", () => {
    setup('<p>Build <a href="https://example.com">C<b>++</b></a> with c++.</p>');
    const anchor = document.querySelector("a");
    expect(send("c++")).toMatchObject({ query: "c++", total: 2, index: 0, requestId: 1 });
    expect(Array.from(document.querySelectorAll('mark[data-iab-find="active"]')).map(hit => hit.textContent).join("")).toBe("C++");
    expect(document.querySelector("a")).toBe(anchor);
    expect(anchor).toHaveAttribute("href", "https://example.com");
    expect(reply.mock.calls[0][1]).toBe(origin);
  });

  it("counts only visible content, excluding attributes, scripts, styles and hidden ancestors", () => {
    setup('<p data-label="needle">Visible needle</p><div hidden><b>needle</b></div><div style="display:none"><span>needle</span></div>'
      + '<div aria-hidden="true">needle</div><div style="visibility:hidden">needle</div><script>needle</script><style>.needle{}</style>'
      + '<textarea>needle</textarea><select><option>needle</option></select><img alt="needle">');
    expect(send("needle")).toMatchObject({ total: 1, index: 0 });
    expect(document.querySelectorAll("mark[data-iab-find]")).toHaveLength(1);
  });

  it("keeps block and line-break boundaries, and preserves Unicode text offsets", () => {
    setup("<p>red</p><p>blue</p><p>green<br>yellow</p><p>İcat cat</p>");
    expect(send("redblue")).toMatchObject({ total: 0, index: -1 });
    expect(send("greenyellow", 0, 2)).toMatchObject({ total: 0, index: -1 });
    expect(send("cat", 0, 3)).toMatchObject({ total: 2, index: 0 });
    expect(document.querySelector('mark[data-iab-find="active"]')?.previousSibling?.textContent).toBe("İ");
  });

  it("wraps navigation, clears old highlights, and restores the original text and markup", () => {
    const html = '<p><mark>Original</mark> alpha <a href="https://example.com">alpha</a> alpha</p>';
    setup(html);
    expect(send("alpha", -1)).toMatchObject({ total: 3, index: 2 });
    expect(send("alpha", 3, 2)).toMatchObject({ total: 3, index: 0 });
    expect(send("missing", 0, 3)).toMatchObject({ total: 0, index: -1 });
    expect(document.body.innerHTML).toBe(html);
    send("alpha", 1, 4);
    expect(send("", 0, 5)).toMatchObject({ query: "", total: 0, index: -1 });
    expect(document.body.innerHTML).toBe(html);
    send("alpha", 0, 6);
    window.dispatchEvent(new MessageEvent("message", { source: window.parent, origin, data: { type: "bing-iab-find-clear", channel } }));
    expect(document.body.innerHTML).toBe(html);
    expect(reply).toHaveBeenCalledTimes(6);
  });

  it("ignores forged, stale and malformed commands without changing the active match", () => {
    setup("<p>alpha beta</p>");
    send("alpha", 0, 10);
    send("beta", 0, 9);
    send("beta", 0, 11, { source: null });
    send("beta", 0, 11, { origin: "https://forged.example" });
    send("beta", 0, 11, { data: { type: "bing-iab-find", channel: "old-document", query: "beta", index: 0, requestId: 11 } });
    send("beta", 0.5, 11);
    send("beta", 0, -1);
    send("x".repeat(4097), 0, 11);
    expect(reply).toHaveBeenCalledOnce();
    expect(document.querySelector('mark[data-iab-find="active"]')).toHaveTextContent("alpha");
    dispose?.(); dispose = undefined;
    send("beta", 0, 12);
    expect(reply).toHaveBeenCalledOnce();
    expect(document.querySelectorAll("mark[data-iab-find]")).toHaveLength(0);
  });

  it("uses Custom Highlights without DOM mutations, counts all matches and paints a distant active match", () => {
    class TestHighlight {
      priority = 0;
      ranges: Range[];
      constructor(...ranges: Range[]) { this.ranges = ranges; }
    }
    const registry = new Map<string, TestHighlight>();
    registry.set("other-feature", new TestHighlight());
    vi.stubGlobal("CSS", { highlights: registry });
    vi.stubGlobal("Highlight", TestHighlight);
    const html = `<p>${"alpha ".repeat(1105)}</p>`;
    setup(html);
    expect(send("alpha", 1100)).toMatchObject({ total: 1105, index: 1100 });
    expect(document.body.innerHTML).toBe(html);
    const all = registry.get(`bing-iab-find-${channel}`)!;
    const active = registry.get(`bing-iab-find-${channel}-active`)!;
    expect(all.ranges).toHaveLength(1001);
    expect(active.ranges).toHaveLength(1);
    expect(active.ranges[0].startOffset).toBe(1100 * 6);
    expect(active.ranges[0].toString()).toBe("alpha");
    expect(active.priority).toBe(1);
    send("", 0, 2);
    dispose?.(); dispose = undefined;
    expect([...registry.keys()]).toEqual(["other-feature"]);
  });

  it("serializes the bridge without relying on module scope and preserves the snapshot CSP", () => {
    document.body.innerHTML = '<p><a href="https://example.com">Needle</a></p>';
    const isolatedInstall = new Function("window", "document", `return (${installIABFindBridge.toString()})(window, document, ${JSON.stringify(channel)}, ${JSON.stringify(origin)});`);
    dispose = isolatedInstall(window, document) as () => void;
    expect(send("needle")).toMatchObject({ total: 1, index: 0 });
    const html = withIABNavigation('<meta http-equiv="Content-Security-Policy" content="old"><p>Needle</p>', channel, origin);
    expect(html).toContain(`(${installIABFindBridge.toString()})(window, document`);
    expect(html).toMatch(/^<meta http-equiv="Content-Security-Policy"/);
    expect(html).not.toContain('content="old"');
    expect(html).toContain(`script-src 'nonce-${channel}'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`);
  });
});
