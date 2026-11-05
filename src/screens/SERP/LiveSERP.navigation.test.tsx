import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LiveSERP } from "./LiveSERP";
const web = (url: string) => ({ ok: true, json: async () => ({ requestedUrl: url, sourceUrl: url, title: new URL(url).pathname, html: '<p>Article content</p>', fetchedAt: '2026-10-26T00:00:00Z' }) });
const results = { ok: true, json: async () => ({ query: 'Weather', html: '<a data-iab-href="https://example.com/one" href="#">Read article</a>', fetchedAt: '2026-10-26T00:00:00Z' }) };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function clickLink(frame: HTMLElement, url: string, override: Partial<MessageEventInit> = {}) {
  const channel = frame.getAttribute('srcdoc')!.match(/nonce="([^"]+)"/)![1];
  fireEvent(window, new MessageEvent('message', { source: (frame as HTMLIFrameElement).contentWindow, origin: 'null', data: { type:'bing-iab-navigate', channel, url }, ...override }));
}
async function loadedFrame(title: string) {
  const frame = await screen.findByTitle(title);
  // Flush the document's load and effects before simulating its bridge messages.
  await act(async () => { fireEvent.load(frame); });
  return frame;
}

describe('IAB navigation within an app tab', () => {
  it('retains documents through back/forward, drops only the forward branch, and reports current metadata', async () => {
    const fetcher = vi.fn(async (value: string) => value.startsWith('/api/bing-serp') ? results : web(new URL(value, 'https://app.example').searchParams.get('url')!));
    vi.stubGlobal('fetch', fetcher);
    const ready = vi.fn();
    const backHome = vi.fn();
    render(<LiveSERP query="Weather" onPageReady={ready} onBack={backHome} backLabel="Back to Home" />);
    const serp = await loadedFrame('Bing results for Weather');
    clickLink(serp, 'https://example.com/one');
    const one = await screen.findByTitle('Web page: https://example.com/one'); fireEvent.load(one);
    expect(screen.getByRole('main', {name:'In-app browser'})).toBeVisible();
    expect(serp.closest('[inert]')).not.toBeNull();
    clickLink(one, 'https://example.com/two');
    const two = await screen.findByTitle('Web page: https://example.com/two'); fireEvent.load(two);
    fireEvent.click(screen.getByRole('button',{name:'Back'}));
    expect(within(screen.getByRole('region',{name:'Web page'})).getByTitle('Web page: https://example.com/one')).toBe(one);
    expect(ready).toHaveBeenLastCalledWith(expect.objectContaining({sourceUrl:'https://example.com/one'}),1);
    fireEvent.click(screen.getByRole('button',{name:'Back'}));
    expect(screen.getByRole('main',{name:'Search results'})).toBeVisible();
    expect(backHome).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Back to Home'}));
    expect(backHome).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button',{name:'Forward'}));
    expect(screen.getByTitle('Web page: https://example.com/one')).toBe(one);
    clickLink(one,'https://example.com/three');
    await screen.findByTitle('Web page: https://example.com/three');
    expect(two).not.toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Forward'})).not.toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it('ignores forged/background navigation and a late request cannot replace the restored SERP', async () => {
    let resolve!: (value: ReturnType<typeof web>) => void;
    const fetcher = vi.fn().mockResolvedValueOnce(results).mockImplementationOnce(() => new Promise(done => { resolve=done; }));
    vi.stubGlobal('fetch',fetcher);
    const {rerender} = render(<LiveSERP query="Weather" />);
    const serp = await loadedFrame('Bing results for Weather');
    clickLink(serp,'https://example.com/forged',{source:window});
    clickLink(serp,'javascript:alert(1)');
    rerender(<LiveSERP query="Weather" active={false} />);
    clickLink(serp,'https://example.com/inactive');
    expect(fetcher).toHaveBeenCalledTimes(1);
    rerender(<LiveSERP query="Weather" />);
    clickLink(serp,'https://example.com/slow');
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button',{name:'Back'}));
    await act(async () => resolve(web('https://example.com/slow')));
    expect(screen.getByRole('main',{name:'Search results'})).toBeVisible();
    expect(screen.getByTitle('Web page: https://example.com/slow').closest('[inert]')).not.toBeNull();
    expect(serp).toHaveAttribute('sandbox','allow-scripts');
    expect(serp.getAttribute('srcdoc')).toContain("script-src 'nonce-");
    expect(serp.getAttribute('sandbox')).not.toMatch(/same-origin|popups/);
  });
  it('keeps failed navigation in the app and supports retry and back', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(results).mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce(web('https://example.com/one'));
    vi.stubGlobal('fetch',fetcher);
    render(<LiveSERP query="Weather" />);
    const serp = await loadedFrame('Bing results for Weather');
    clickLink(serp,'https://example.com/one');
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('alert')).toHaveTextContent('This page can’t be previewed');
    fireEvent.click(screen.getByRole('button',{name:'Try again'}));
    await loadedFrame('Web page: https://example.com/one');
    expect(fetcher).toHaveBeenCalledTimes(3);
    fireEvent.click(screen.getByRole('button',{name:'Back'}));
    expect(screen.getByTitle('Bing results for Weather')).toBe(serp);
  });
});
