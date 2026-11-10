// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assertBingSerpQuery, BingSerpQueryMismatchError } from "./bingSerpValidation";

const organic = (title: string, snippet: string, href = "https://example.com/") => `<li class="b_algo"><h2><a href="${href}">${title}</a></h2><div class="b_caption"><p>${snippet}</p></div></li>`;
const page = (rows: string, query = "weather") => `<title>${query} - Search</title><form id="sb_form" action="/search"><input id="sb_form_q" name="q" value="${query}"></form><main id="b_content"><ol id="b_results">${rows}</ol></main>`;
const claude = organic("Claude by Anthropic | The AI for problem solvers", "Claude is an artificial intelligence trained by Anthropic.", "https://claude.com/");

describe("Bing result query validation", () => {
  it("rejects unrelated organic content even when the title, controls and chrome echo the requested query", () => {
    const source = page(claude) + '<nav><a href="/search?q=weather">weather</a></nav>';
    expect(() => assertBingSerpQuery(source, "weather")).toThrow(BingSerpQueryMismatchError);
  });

  it("accepts actual weather titles and snippets", () => {
    expect(() => assertBingSerpQuery(page(organic("Today's local forecast", "Your local weather and ten-day outlook")), "weather")).not.toThrow();
  });

  it("accepts partial significant terms for a multiword query, case, punctuation, diacritics and normalized whitespace", () => {
    const source = page(organic("Montreal forecast", "Temperatures for the city"), "  HOW\t IS THE Montréal weather? ");
    expect(() => assertBingSerpQuery(source, "How is the Montréal   weather?")).not.toThrow();
    expect(() => assertBingSerpQuery(page(organic("Café opening hours", "Find coffee nearby"), "ＣＡＦÉ  hours"), "café hours")).not.toThrow();
  });

  it("accepts a matching destination hostname including Bing's encoded redirect links", () => {
    expect(() => assertBingSerpQuery(page(organic("Local forecast", "Daily temperatures", "https://weather.com/today")), "weather")).not.toThrow();
    const destination = "https://weather.com/today";
    const href = `https://www.bing.com/ck/a?u=a1${Buffer.from(destination).toString("base64url")}`;
    expect(() => assertBingSerpQuery(page(organic("Local forecast", "Daily temperatures", href)), "weather")).not.toThrow();
  });

  it.each(["天气", "C++", "2 + 2", "AI", "what is it"])('leaves queries without significant Latin words to Bing: %s', query => {
    expect(() => assertBingSerpQuery(page(claude, query), query)).not.toThrow();
  });

  it("leaves answer-only pages to Bing", () => {
    expect(() => assertBingSerpQuery(page('<li class="b_ans"><div>72°F</div></li>'), "weather")).not.toThrow();
  });

  it.each([
    '<input id="sb_form_q" value="claude">',
    '<form action="/search"><input name="q" value="claude"></form>',
    '<form role="search"><input name="q" value="claude"></form>',
    '<textarea id="sb_form_q">claude</textarea>',
    '<input id="sb_form_q" value="">',
  ])("rejects a mismatched recognized query control: %s", control => {
    expect(() => assertBingSerpQuery(control + page(organic("weather", "Today")), "weather")).toThrow(BingSerpQueryMismatchError);
  });

  it("does not mistake an unrelated form field for Bing's query control", () => {
    expect(() => assertBingSerpQuery('<form action="/feedback"><input name="q" value="comment"></form>' + page(organic("weather", "Today")), "weather")).not.toThrow();
  });

  it("does not accept requested query terms appearing only in result URL paths or parameters", () => {
    expect(() => assertBingSerpQuery(page(organic("Claude AI", "Ask an assistant", "https://claude.com/weather?q=weather")), "weather")).toThrow(BingSerpQueryMismatchError);
    const destination = "https://claude.com/article?query=weather";
    const href = `https://www.bing.com/ck/a?u=a1${Buffer.from(destination).toString("base64url")}`;
    expect(() => assertBingSerpQuery(page(organic("Claude AI", "Ask an assistant", href)), "weather")).toThrow(BingSerpQueryMismatchError);
  });

  it("ignores hidden content, query-echo links, and other non-title/snippet row controls", () => {
    const echoes = '<span>weather</span><button>weather</button><script>weather</script><cite>claude.com/weather</cite><div hidden><p>weather</p></div><p style="display:none">weather</p><p><a href="/search?q=weather">weather</a></p>';
    expect(() => assertBingSerpQuery(page(claude.replace("</li>", `${echoes}</li>`)), "weather")).toThrow(BingSerpQueryMismatchError);
  });
});
