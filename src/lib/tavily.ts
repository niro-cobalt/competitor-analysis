const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilyResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  response_time: number;
}

/**
 * Search for recent news about a competitor using Tavily Search API.
 * Returns grounded search results with source URLs and relevance scores.
 */
export async function searchTavily(
  competitorName: string,
  options: { maxResults?: number; timeRange?: string } = {}
): Promise<TavilyResponse> {
  if (!TAVILY_API_KEY) {
    console.warn('[Tavily] TAVILY_API_KEY not set, skipping Tavily search');
    return { query: competitorName, results: [], response_time: 0 };
  }

  const { maxResults = 5, timeRange = 'month' } = options;

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: `${competitorName} latest news announcements`,
        topic: 'news',
        search_depth: 'basic',
        max_results: maxResults,
        time_range: timeRange,
        include_answer: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    console.log(`[Tavily] Found ${data.results?.length ?? 0} results for "${competitorName}" in ${data.response_time}s`);

    return {
      query: data.query,
      answer: data.answer,
      results: (data.results || []).map((r: any) => ({
        title: r.title || '',
        url: r.url || '',
        content: r.content || '',
        score: r.score || 0,
      })),
      response_time: data.response_time || 0,
    };
  } catch (error) {
    console.error(`[Tavily] Search failed for "${competitorName}":`, error);
    return { query: competitorName, results: [], response_time: 0 };
  }
}
