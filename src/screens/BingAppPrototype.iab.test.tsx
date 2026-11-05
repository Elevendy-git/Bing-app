import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BingAppPrototype } from './BingAppPrototype';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});

describe('IAB activity ownership',()=>{
  it.each([false,true])('opens Feed images/headlines directly in IAB and preserves Home (%s private)',async privateMode=>{
    const articles=[1,2,3].map(index=>({id:`news-${index}`,title:`Feed article ${index}`,url:`https://example.com/article-${index}`,
      imageSrc:`https://example.com/${index}.jpg`,imageAlt:`Photo ${index}`,publisher:'Publisher',publisherLogoSrc:null,publishedAt:'2026-10-27T00:00:00Z'}));
    const fetcher=vi.fn(async(path:string)=>{
      const endpoint=new URL(path,'http://localhost');
      const url=endpoint.searchParams.get('url')??'';
      return {ok:true,json:async()=>endpoint.pathname==='/api/msn-feed'
        ? {source:'msn',market:'en-us',fetchedAt:'2026-10-27T00:00:00Z',nextCursor:null,items:articles}
        : {requestedUrl:url,sourceUrl:url,title:articles.find(article=>article.url===url)?.title,faviconUrl:'https://example.com/favicon.png',
          html:'<p>Article body</p>',fetchedAt:'2026-10-27T00:00:00Z'}};
    });
    vi.stubGlobal('fetch',fetcher);
    const popup=vi.spyOn(window,'open');
    render(<BingAppPrototype initialRecentState="empty" initialHomeState="scrolled" initialPrivateMode={privateMode} feedSource="msn" />);
    const home=screen.getByRole('main',{name:'Bing homepage'});
    const scroll=within(home).getByRole('region',{name:'Homepage content'});
    await screen.findByRole('button',{name:'Open article image: Feed article 1'});
    const originalScroll=scroll.scrollTop;
    for (const [index,buttonName] of [[1,'Open article image: Feed article 1'],[3,'Feed article 3']] as const) {
      if(index===3)fireEvent.click(screen.getByRole('button',{name:'Go to slide 2'}));
      fireEvent.click(screen.getByRole('button',{name:buttonName}));
      const iframe=await screen.findByTitle(`Web page: https://example.com/article-${index}`);
      fireEvent.load(iframe);
      expect(screen.getByRole('main',{name:'In-app browser'})).toBeVisible();
      expect(fetcher.mock.calls.some(([path])=>path.startsWith(`/api/web-page?url=${encodeURIComponent(`https://example.com/article-${index}`)}`))).toBe(true);
      fireEvent.click(screen.getByRole('button',{name:'Back to Home'}));
      await waitFor(()=>expect(screen.getByRole('main',{name:'Bing homepage'})).toBeVisible());
      expect(screen.getByRole('region',{name:'Homepage content'})).toBe(scroll);
      expect(scroll.scrollTop).toBe(originalScroll);
    }
    expect(fetcher.mock.calls.filter(([path])=>path.startsWith('/api/bing-serp'))).toHaveLength(0);
    expect(popup).not.toHaveBeenCalled();
    popup.mockRestore();
    fireEvent.click(within(home).getByRole('button',{name:'Recent'}));
    if(privateMode){
      await waitFor(()=>expect(screen.getByRole('region',{name:'InPrivate activity'})).toBeVisible());
      fireEvent.click(screen.getByRole('button',{name:'Turn off'}));
    }else{
      const tabs=screen.getByRole('group',{name:'Open tabs cards'});
      expect(within(tabs).getAllByRole('article')).toHaveLength(2);
      expect(tabs).toHaveTextContent('Feed article 1');
      expect(tabs).toHaveTextContent('Feed article 3');
      const history=screen.getByRole('group',{name:'History list'});
      expect(history).toHaveTextContent('https://example.com/article-1');
      expect(history).toHaveTextContent('https://example.com/article-3');
    }
    fireEvent.click(screen.getByRole('button',{name:'New tab'}));
    // URL visits belong to browsing history, not Search's query history.
    await waitFor(()=>expect(screen.getByRole('main',{name:'Search page'})).toBeVisible());
    expect(within(screen.getByRole('main',{name:'Search page'})).queryByText('History',{exact:true})).not.toBeInTheDocument();
  });

  it.each([false,true])('keeps webpage visits in their owning tab and respects private mode (%s)',async privateMode=>{
    const fetcher=vi.fn(async(path:string)=>{
      const endpoint=new URL(path,'http://localhost');
      const query=endpoint.searchParams.get('query')??'';
      return {ok:true,json:async()=>endpoint.pathname==='/api/bing-serp'
        ? {query,html:'<p>Search results</p>',fetchedAt:'2026-10-26T00:00:00Z'}
        : endpoint.pathname==='/api/web-page'
          ? {requestedUrl:'https://example.com/article',sourceUrl:'https://example.com/article',title:'Real article title',faviconUrl:'https://example.com/favicon.png',html:'<p>Original article content</p>',fetchedAt:'2026-10-26T00:00:00Z'}
          : [query,[query]]};
    });
    vi.stubGlobal('fetch',fetcher);
    render(<BingAppPrototype initialPage="recent" initialRecentState="empty" initialPrivateMode={privateMode} />);
    if(privateMode){
      fireEvent.click(screen.getByRole('button',{name:'Home'}));
      fireEvent.focus(screen.getByRole('searchbox',{name:'Search Bing'}));
    }else fireEvent.click(screen.getByRole('button',{name:'New tab'}));
    const input=screen.getByRole('searchbox',{name:'Search query'});
    fireEvent.change(input,{target:{value:'Weather'}});fireEvent.keyDown(input,{key:'Enter'});
    await waitFor(()=>expect(document.querySelector('[aria-label="Search page"]')).not.toBeInTheDocument());
    const serp=await screen.findByTitle('Bing results for Weather');fireEvent.load(serp);
    const channel=serp.getAttribute('srcdoc')!.match(/nonce="([^"]+)"/)![1];
    fireEvent(window,new MessageEvent('message',{source:(serp as HTMLIFrameElement).contentWindow,data:{type:'bing-iab-navigate',channel,url:'https://example.com/article'}}));
    const page=await screen.findByTitle('Web page: https://example.com/article');fireEvent.load(page);
    fireEvent.click(screen.getByRole('button',{name:'Recent'}));
    if(privateMode){
      await waitFor(()=>expect(screen.getByRole('region',{name:'InPrivate activity'})).toBeVisible());
      expect(screen.queryByRole('group',{name:'Open tabs cards'})).not.toBeInTheDocument();
    }else{
      const tabs=screen.getByRole('group',{name:'Open tabs cards'});
      expect(within(tabs).getAllByRole('article')).toHaveLength(1);
      expect(tabs).toHaveTextContent('Real article title');
      expect(tabs.querySelector('iframe')).toHaveAttribute('srcdoc','<p>Original article content</p>');
      const history=screen.getByRole('group',{name:'History list'});
      expect(history).toHaveTextContent('https://example.com/article');
      expect(history).toHaveTextContent('Weather');
      fireEvent.click(within(tabs).getByRole('button',{name:'Select Real article title tab: search-1'}));
      expect(screen.getByRole('main',{name:'In-app browser'})).toBeVisible();
      expect(screen.getByTitle('Web page: https://example.com/article')).toBe(page);
      fireEvent.click(screen.getByRole('button',{name:'Back'}));
      expect(screen.getByRole('main',{name:'Search results'})).toBeVisible();
      fireEvent.click(screen.getByRole('button',{name:'Recent'}));
      const searchCount=fetcher.mock.calls.filter(([path])=>path.startsWith('/api/bing-serp')).length;
      fireEvent.click(within(screen.getByRole('group',{name:'History list'})).getByRole('button',{name:'Real article title'}));
      expect(screen.getByRole('main',{name:'In-app browser'})).toBeVisible();
      expect(fetcher.mock.calls.filter(([path])=>path.startsWith('/api/bing-serp'))).toHaveLength(searchCount);
    }
  });
});
