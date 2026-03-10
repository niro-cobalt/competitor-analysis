import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { searchTavily, type TavilySearchResult } from './tavily';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('Please define the GEMINI_API_KEY environment variable inside .env.local');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-3-flash';

/**
 * Clean up JSON string by removing markdown code blocks and whitespace
 */
function cleanJson(text: string): string {
    if (!text) return "{}";
    // Remove markdown code blocks like ```json ... ``` or just ``` ... ```
    let clean = text.replace(/```json\s*|\s*```/g, '');
    clean = clean.replace(/```\s*/g, ''); 
    
    // Attempt to extract just the JSON object if there is extra text
    const firstOpen = clean.indexOf('{');
    const lastClose = clean.lastIndexOf('}');
    
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
        clean = clean.substring(firstOpen, lastClose + 1);
    }
    
    return clean.trim();
}

const CompetitorAnalysisSchema = z.object({
  summary: z.string(),
  changes: z.array(z.string()),
  impact_score: z.number().min(0).max(10),
  links: z.array(z.string())
});

export type CompetitorAnalysis = z.infer<typeof CompetitorAnalysisSchema>;

export async function analyzeCompetitorUpdate(
  competitorName: string,
  newContent: string,
  oldContent: string | null,
  instructions?: string,
  linkedinContent?: string,
  twitterContent?: string,
  additionalContent?: string
): Promise<CompetitorAnalysis> {

  let prompt = `You are a competitive intelligence analyst.
  Competitor: ${competitorName}
  
  Here is the text content from their website (scraped).
  
  Current Website Content:
  ${newContent.substring(0, 15000)} ... [truncated]
  `;

  if (linkedinContent) {
      prompt += `
      
      LinkedIn Page Content:
      ${linkedinContent.substring(0, 5000)} ... [truncated]
      `;
  }

  if (twitterContent) {
      prompt += `
      
      Twitter/X Feed Content:
      ${twitterContent.substring(0, 5000)} ... [truncated]
      `;
  }

  if (additionalContent) {
      prompt += `
      
      ADDITIONAL MONITORED SOURCES (e.g. Executives, Newsroom):
      ${additionalContent.substring(0, 10000)} ... [truncated]
      `;
  }

  if (instructions) {
      prompt += `
      
      SPECIAL INSTRUCTIONS FOR THIS COMPETITOR:
      ${instructions}
      
      Strictly follow the above instructions when analyzing changes.
      `;
  }

  if (oldContent) {
    prompt += `
    
    Previous Content (from last scan):
    ${oldContent.substring(0, 20000)} ... [truncated]
    
    Task: Compare the current content with the previous content. Identify meaningful changes such as:
    1. New feature launches
    2. Pricing updates
    3. Messaging shifts
    4. New product announcements
    5. Notable updates from their LinkedIn page
    
    Ignore trivial changes like timestamps, copyright dates, or dynamic dynamic feed items (like random blog posts) unless they signal a major strategic shift.
    
    Requirement regarding Links:
    - Extract distinct URLs from the content that act as sources for your findings (e.g. link to a new blog post, a specific page, or a tweet).
    - Return them in the 'links' array.
    
    Output a strictly valid JSON object matching this schema.
    `;
  } else {
    prompt += `
    Task: This is the first scan. Summarize what this competitor does and their key value propositions.
    
    Requirement regarding Links:
    - Extract distinct URLs from the content that act as sources for your findings.
    
    Output a strictly valid JSON object matching this schema.
    `;
  }

  const jsonSchema = {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING' },
      changes: { type: 'ARRAY', items: { type: 'STRING' } },
      impact_score: { type: 'NUMBER' },
      links: { type: 'ARRAY', items: { type: 'STRING' } }
    },
    required: ['summary', 'changes', 'impact_score', 'links']
  };

  try {
    // Fix 6: Enable Google Search grounding for analysis to verify claims
    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: jsonSchema as any,
        tools: [{ googleSearch: {} }]
      }
    });

    console.log({ result, text: result.text });

    const responseText = result.text;

    if (!responseText) {
      throw new Error('No text returned from Gemini API');
    }

    const parsedJson = JSON.parse(cleanJson(responseText));
    
    // Validate with Zod
    const validatedData = CompetitorAnalysisSchema.parse(parsedJson);

    return validatedData;

  } catch (error) {
    console.error("Gemini Analysis or Validation Error:", error);
    // Return a safe fallback or rethrow depending on desired behavior.
    // Rethrowing ensures the caller knows the analysis failed.
    throw error;
  }
}

// Fix 5: Structured news items with per-item source URLs
const NewsItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  sourceUrl: z.string(),
  date: z.string(),
});

const NewsSearchSchema = z.object({
  summary: z.string(),
  newsItems: z.array(NewsItemSchema),
});

export type NewsItem = z.infer<typeof NewsItemSchema>;
export type NewsSearchResult = z.infer<typeof NewsSearchSchema>;

/**
 * Extract grounding source URLs from Gemini's grounding metadata (Fix 1)
 */
function extractGroundingUrls(result: any): string[] {
  try {
    const metadata = result?.candidates?.[0]?.groundingMetadata;
    if (!metadata) return [];

    const urls: string[] = [];

    // Extract from grounding chunks
    if (metadata.groundingChunks) {
      for (const chunk of metadata.groundingChunks) {
        if (chunk.web?.uri) {
          urls.push(chunk.web.uri);
        }
      }
    }

    // Extract from grounding supports
    if (metadata.groundingSupports) {
      for (const support of metadata.groundingSupports) {
        if (support.groundingChunkIndices && metadata.groundingChunks) {
          for (const idx of support.groundingChunkIndices) {
            const chunk = metadata.groundingChunks[idx];
            if (chunk?.web?.uri && !urls.includes(chunk.web.uri)) {
              urls.push(chunk.web.uri);
            }
          }
        }
      }
    }

    return urls;
  } catch {
    return [];
  }
}

export async function searchCompetitorNews(competitorName: string): Promise<NewsSearchResult> {
  // Fix 4: Date constraints to prevent stale training data contamination
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Fetch Tavily results in parallel with Gemini (provides independent grounding source)
  const tavilyPromise = searchTavily(competitorName, { maxResults: 5, timeRange: 'month' });

  // Build Tavily context for the prompt (will be populated if Tavily returns first, otherwise empty)
  let tavilyContext = '';
  let tavilyResults: TavilySearchResult[] = [];

  try {
    const tavilyResponse = await tavilyPromise;
    tavilyResults = tavilyResponse.results;

    if (tavilyResults.length > 0) {
      tavilyContext = `

      VERIFIED NEWS FROM TAVILY SEARCH (use these as your PRIMARY source of truth):
      ${tavilyResults.map((r, i) => `
      [${i + 1}] Title: ${r.title}
          URL: ${r.url}
          Content: ${r.content.substring(0, 500)}
          Relevance Score: ${r.score}
      `).join('\n')}

      IMPORTANT: Prioritize reporting news items that appear in the Tavily results above. Use the URLs from Tavily as sourceUrl values.
      `;
    }
  } catch (err) {
    console.warn(`[Tavily] Pre-fetch failed for ${competitorName}, proceeding with Gemini only:`, err);
  }

  // Fix 3: Strengthened prompt with strict grounding requirements
  const prompt = `
  You are a competitive intelligence analyst.
  Find the latest meaningful news, press releases, and major announcements for: ${competitorName}.
  ${tavilyContext}

  CRITICAL RULES:
  - ONLY report facts that you found in actual search results. Do NOT use your training data or prior knowledge.
  - Each news item MUST include the source URL where you found the information. If you cannot find a source URL, do NOT include the item.
  - Only include news from the last 30 days (between ${thirtyDaysAgo} and ${today}).
  - If you find NO verifiable news from search results, return an empty newsItems array and say so in the summary.
  - Do NOT guess, speculate, or infer events that are not explicitly stated in search results.

  Focus on:
  - Strategic partnerships
  - New product launches
  - Funding rounds or acquisitions
  - Leadership changes
  - Major legal or regulatory news

  Ignore:
  - Generic marketing SEO fluff
  - Minor bug fixes or changelogs
  - Stock market daily fluctuations unless extreme

  For each news item, provide:
  - title: A short headline
  - description: 1-2 sentence summary of the news
  - sourceUrl: The URL where this news was found (MUST be a real URL from search results)
  - date: The date of the news (YYYY-MM-DD format, or "unknown" if not clear)

  Output a strictly valid JSON object matching this schema.
  `;

  const jsonSchema = {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING' },
      newsItems: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            description: { type: 'STRING' },
            sourceUrl: { type: 'STRING' },
            date: { type: 'STRING' }
          },
          required: ['title', 'description', 'sourceUrl', 'date']
        }
      }
    },
    required: ['summary', 'newsItems']
  };

  try {
    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: jsonSchema as any,
        tools: [{ googleSearch: {} }] // Enable Google Search Grounding
      }
    });

    console.log(`News search for ${competitorName}:`, result.text);

    if (!result.text) {
        return { summary: "No news found (empty response)", newsItems: [] };
    }

    const parsedJson = JSON.parse(cleanJson(result.text));
    const parsed = NewsSearchSchema.parse(parsedJson);

    // Fix 1: Extract grounding URLs from Gemini metadata
    const groundingUrls = extractGroundingUrls(result);
    console.log(`[Grounding] Gemini URLs for ${competitorName}:`, groundingUrls);

    // Combine grounding sources: Gemini grounding URLs + Tavily result URLs
    const tavilyUrls = tavilyResults.map(r => r.url);
    const allGroundingUrls = [...new Set([...groundingUrls, ...tavilyUrls])];
    console.log(`[Grounding] Combined grounding URLs (${allGroundingUrls.length}) for ${competitorName}`);

    // Fix 2: Filter out ungrounded claims
    // Keep items whose sourceUrl matches a grounding URL from either Gemini or Tavily
    let filteredItems = parsed.newsItems;
    if (allGroundingUrls.length > 0) {
      filteredItems = parsed.newsItems.filter(item => {
        // Check if the item's sourceUrl domain matches any grounding URL domain
        try {
          const itemDomain = new URL(item.sourceUrl).hostname.replace('www.', '');
          return allGroundingUrls.some(gUrl => {
            try {
              const gDomain = new URL(gUrl).hostname.replace('www.', '');
              return itemDomain === gDomain || gUrl.includes(itemDomain) || item.sourceUrl === gUrl;
            } catch { return false; }
          });
        } catch {
          // Invalid URL — not grounded
          return false;
        }
      });

      const removedCount = parsed.newsItems.length - filteredItems.length;
      if (removedCount > 0) {
        console.log(`[Grounding] Filtered out ${removedCount} ungrounded news items for ${competitorName}`);
      }
    }

    return {
      summary: parsed.summary,
      newsItems: filteredItems
    };

  } catch (error) {
    console.error(`News search failed for ${competitorName}:`, error);
    // Fail gracefully — if Gemini fails but Tavily succeeded, return Tavily results directly
    if (tavilyResults.length > 0) {
      console.log(`[Fallback] Using Tavily results directly for ${competitorName}`);
      return {
        summary: `News sourced from Tavily search (Gemini unavailable)`,
        newsItems: tavilyResults.map(r => ({
          title: r.title,
          description: r.content.substring(0, 200),
          sourceUrl: r.url,
          date: 'unknown'
        }))
      };
    }
    return { summary: "Failed to fetch news", newsItems: [] };
  }
}


function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function sanitizeUrl(url: string): string {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) return '#';
        return parsed.href;
    } catch {
        return '#';
    }
}

const EmailReportSchema = z.object({
  executiveSummary: z.string(),
  companyUpdates: z.array(z.object({
    competitorName: z.string(),
    hasChanges: z.boolean(),
    impactScore: z.number().min(0).max(10),
    keyChanges: z.array(z.string()),
    update: z.string(),
    links: z.array(z.string())
  }))
});

export async function generateEmailReport(scans: { competitor: string, summary: string, changes: string[], impactScore: number, newsSummary?: string, newsItems?: NewsItem[] }[]): Promise<string> {
    const prompt = `
    You are a competitive intelligence analyst generating a CHANGE-FOCUSED briefing.
    Here are the results of the latest monitoring scan:
    ${JSON.stringify(scans, null, 2)}

    Task: Analyze these results and generate a structured briefing that emphasizes WHAT CHANGED since the last scan.

    Requirements:
    1. executiveSummary: A high-level overview focusing on the most important new developments. Lead with the highest-impact changes. If nothing meaningful changed across all competitors, say so clearly.
    2. companyUpdates: A list of updates for EACH competitor:
       - competitorName: The name of the competitor.
       - hasChanges: true if there are meaningful new developments (changes array is non-empty, impactScore > 2, or there is notable news). false if nothing meaningful changed.
       - impactScore: The impact score from the scan data (0-10). Use the impactScore from the input data.
       - keyChanges: A short bullet list (1-3 items) of the most important specific changes detected. If no changes, return an empty array.
       - update: If hasChanges is true, provide a detailed summary focusing on what's NEW — new features, pricing changes, messaging shifts, partnerships, etc. Prioritize news (newsSummary/newsItems) if available. If hasChanges is false, write a single brief sentence like "No significant changes detected since last scan."
       - links: An array of URL strings that ground the update. Use links provided in the input data. IF NO LINKS are available, return an empty array. DO NOT HALLUCINATE LINKS.

    Sorting: Order companyUpdates by impactScore descending (highest impact first).

    Strictly follow these rules:
    - ABSOLUTELY NO HALLUCINATIONS. If you are not 100% sure about a link, do not include it.
    - All updates must be grounded in the provided text.
    - Clearly distinguish between NEW information and previously known status quo.

    Do NOT use markdown code blocks in the output. Return raw JSON.
    `;

    const jsonSchema = {
      type: 'OBJECT',
      properties: {
        executiveSummary: { type: 'STRING' },
        companyUpdates: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              competitorName: { type: 'STRING' },
              hasChanges: { type: 'BOOLEAN' },
              impactScore: { type: 'NUMBER' },
              keyChanges: { type: 'ARRAY', items: { type: 'STRING' } },
              update: { type: 'STRING' },
              links: { type: 'ARRAY', items: { type: 'STRING' } }
            },
            required: ['competitorName', 'hasChanges', 'impactScore', 'keyChanges', 'update', 'links']
          }
        }
      },
      required: ['executiveSummary', 'companyUpdates']
    };

    try {
        // Fix 7: Enable Google Search grounding for email report generation
        const result = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: jsonSchema as any,
            temperature: 0.0,
            tools: [{ googleSearch: {} }]
          }
        });
    
        const text = result.text;
        if (!text) return '<p>Failed to generate report.</p>';

        const parsedJson = JSON.parse(cleanJson(text));
        const data = EmailReportSchema.parse(parsedJson);

        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const withChanges = data.companyUpdates.filter(u => u.hasChanges);
        const withoutChanges = data.companyUpdates.filter(u => !u.hasChanges);

        const getImpactColor = (score: number) => {
            if (score >= 7) return { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', label: 'High' };
            if (score >= 4) return { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', label: 'Medium' };
            return { bg: '#f0fdf4', border: '#86efac', text: '#166534', label: 'Low' };
        };

        const renderCompanyCard = (update: typeof data.companyUpdates[0]) => {
            const impact = getImpactColor(update.impactScore);
            const cardBorder = update.hasChanges ? impact.border : '#e5e7eb';
            const cardBg = update.hasChanges ? '#ffffff' : '#f9fafb';

            return `
              <div class="company-card" style="border-color: ${cardBorder}; background-color: ${cardBg};">
                <div class="company-name">
                  ${escapeHtml(update.competitorName)}
                  <span style="display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; background-color: ${impact.bg}; color: ${impact.text}; border: 1px solid ${impact.border};">
                    ${impact.label} Impact (${update.impactScore}/10)
                  </span>
                </div>
                ${update.hasChanges && update.keyChanges.length > 0 ? `
                <div style="margin-bottom: 10px;">
                  ${update.keyChanges.map(change => `
                    <div style="padding: 4px 0; font-size: 14px; color: #1f2937;">
                      <span style="color: #2563eb; font-weight: 600;">&#8227;</span> ${escapeHtml(change)}
                    </div>
                  `).join('')}
                </div>
                ` : ''}
                <div class="update-text">${escapeHtml(update.update)}</div>
                ${update.links && update.links.length > 0 ? `
                <div class="source-links">
                    Sources:
                    ${update.links.map((link, i) => `<a href="${sanitizeUrl(link)}" class="source-link" target="_blank" rel="noopener noreferrer">Link ${i + 1}</a>`).join('')}
                </div>
                ` : ''}
              </div>
            `;
        };

        let html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827; background-color: #f9fafb; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
            .header { margin-bottom: 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; color: #1f2937; letter-spacing: -0.025em; }
            .date { color: #6b7280; font-size: 14px; margin-top: 8px; }
            .section-title { font-size: 18px; font-weight: 600; color: #374151; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
            .summary-card { background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 25px; font-size: 16px; color: #4b5563; }
            .changes-banner { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 15px 20px; margin-bottom: 25px; font-size: 14px; color: #1e40af; }
            .company-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px; }
            .company-name { font-weight: 700; color: #111827; font-size: 16px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
            .update-text { color: #4b5563; font-size: 15px; }
            .source-links { margin-top: 10px; font-size: 12px; color: #6b7280; }
            .source-link { color: #2563eb; text-decoration: none; margin-right: 10px; }
            .source-link:hover { text-decoration: underline; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #9ca3af; font-size: 14px; }
            .cta-button { display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-top: 20px; font-size: 14px; }
            .cta-button:hover { background-color: #1d4ed8; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Competitor Intelligence Brief</h1>
              <div class="date">${today}</div>
            </div>

            <div class="changes-banner">
              <strong>${withChanges.length} of ${data.companyUpdates.length}</strong> competitors had new developments detected.
              ${withChanges.length > 0 ? `Top change: <strong>${escapeHtml(withChanges[0]?.competitorName ?? '')}</strong> (impact ${withChanges[0]?.impactScore}/10)` : 'No significant changes across the board.'}
            </div>

            <div class="summary-card">
              ${escapeHtml(data.executiveSummary)}
            </div>

            ${withChanges.length > 0 ? `
            <div class="section-title">Changes Detected</div>
            ${withChanges.map(renderCompanyCard).join('')}
            ` : ''}

            ${withoutChanges.length > 0 ? `
            <div class="section-title" style="color: #9ca3af;">No Changes Detected</div>
            ${withoutChanges.map(renderCompanyCard).join('')}
            ` : ''}

            <div class="footer">
              <a href="https://competitor-analysis-sigma.vercel.app/" class="cta-button">View Full Dashboard</a>
              <p style="margin-top: 20px;">Generated by Competitor Analysis AI</p>
            </div>
          </div>
        </body>
        </html>
        `;

        return html;

    } catch (error) {
        console.error("Report generation failed:", error);
        return '<p>Error generating report. Please check the dashboard.</p>';
    }
}

export async function generateWeeklyReport(
  scans: { summary: string, changes: string[], date: Date }[],
  options: { style?: string, includeTldr?: boolean } = {}
): Promise<string> {
  const { style = 'informative', includeTldr = true } = options;
  const prompt = `
  You are a competitive intelligence analyst.
  Here are the updates from the last week for a specific competitor:
  ${JSON.stringify(scans.map(s => ({
      date: s.date,
      summary: s.summary,
      changes: s.changes
  })), null, 2)}

  Task: synthesize these updates into a concise "Weekly Summary".
  
  Style Guide:
  - Tone: ${style} (e.g. if 'chatty', use a conversational tone; if 'minimalistic', be extremely brief; if 'techy', use technical jargon; if 'informative', be professional and detailed).

  Requirements:
  1. Focus on the most important strategic shifts (pricing, new features, message changes).
  2. Ignore repetitive or minor updates.
  3. If there were no meaningful updates, say "No significant updates this week."
  4. Keep it under 50 words usually, unless there was a massive launch.
  ${options.includeTldr ? '5. Start with a very short "TL;DR" sentence.' : '5. DO NOT include a "TL;DR".'}
  6. Output format: A single paragraph of plain text.
  `;

  try {
      const result = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'text/plain',
          temperature: 0.1
        }
      });
  
      const text = result.text;
      return text || "No summary available.";

  } catch (error) {
      console.error("Weekly summary generation failed:", error);
      return "Failed to generate summary.";
  }
}
