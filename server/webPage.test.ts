// @vitest-environment node
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleWebPage } from './webPage';
import { fetchWebPage } from './webPageFetch';
import { fetchMsnArticle } from './msnArticle';
vi.mock('./webPageFetch', async original => ({ ...await original<typeof import('./webPageFetch')>(), fetchWebPage: vi.fn() }));
vi.mock('./msnArticle', async original => ({ ...await original<typeof import('./msnArticle')>(), fetchMsnArticle: vi.fn() }));
let server: Server, origin: string;
beforeEach(async () => {
  vi.mocked(fetchWebPage).mockReset().mockResolvedValue({ sourceUrl:'https://example.com/final',source:'<title>Original page title</title><p>This is the original page content returned by the remote website.</p>' });
  vi.mocked(fetchMsnArticle).mockReset();
  server=createServer((req,res)=>{void handleWebPage(req,res,()=>{res.writeHead(404);res.end('{}');});});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  origin=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));});
const call=(url:string,method='GET')=>new Promise<{status:number;body:Record<string,string>;cache?:string}>((resolve,reject)=>{
  const req=request(origin+url,{method,headers:{Cookie:'private=value',Authorization:'Bearer private'}},res=>{let data='';res.setEncoding('utf8');res.on('data',chunk=>data+=chunk);res.on('end',()=>resolve({status:res.statusCode!,body:JSON.parse(data),cache:res.headers['cache-control']}));});
  req.on('error',reject);req.end();
});
describe('IAB page endpoint',()=>{
  it('returns final page identity and original content without forwarding client credentials',async()=>{
    const result=await call('/api/web-page?url=https%3A%2F%2Fexample.com%2Fstart');
    expect(result.status).toBe(200);expect(result.cache).toBe('no-store');
    expect(result.body).toMatchObject({requestedUrl:'https://example.com/start',sourceUrl:'https://example.com/final',title:'Original page title'});
    expect(result.body.html).toContain('original page content');
    expect(fetchWebPage).toHaveBeenCalledWith('https://example.com/start',expect.any(AbortSignal));
  });
  it('rejects local/system destinations and unsupported methods before making requests',async()=>{
    for(const url of ['http://127.0.0.1/','http://[::1]/','https://user:pass@example.com/','file:///etc/passwd','https://example.com:4433/']){
      expect((await call('/api/web-page?'+new URLSearchParams({url}))).status).toBe(400);
    }
    expect((await call('/api/web-page?url=https://example.com/','POST')).status).toBe(405);
    expect(fetchWebPage).not.toHaveBeenCalled();
  });
  it('uses the public article body for script-rendered MSN feed pages',async()=>{
    const url='https://www.msn.com/en-us/news/world/story/ar-AA123';
    vi.mocked(fetchMsnArticle).mockResolvedValueOnce({sourceUrl:url,source:'<title>MSN article</title><p>This is the original MSN article body, not the empty application shell.</p>'});
    const result=await call('/api/web-page?'+new URLSearchParams({url}));
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({requestedUrl:url,sourceUrl:url,title:'MSN article'});
    expect(result.body.html).toContain('original MSN article body');
    expect(fetchWebPage).not.toHaveBeenCalled();
    expect(fetchMsnArticle).toHaveBeenCalledWith(expect.objectContaining({id:'AA123',locale:'en-us'}),expect.any(AbortSignal));
  });
  it('reports failures without returning errors, credentials or fabricated content from upstream',async()=>{
    vi.mocked(fetchWebPage).mockRejectedValueOnce(Error('private upstream detail'));
    const result=await call('/api/web-page?url=https://example.com/');
    expect(result.status).toBe(502);expect(result.body).toEqual({error:'This page cannot be previewed'});
  });
});
