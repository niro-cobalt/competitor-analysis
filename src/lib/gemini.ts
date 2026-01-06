import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('Please define the GEMINI_API_KEY environment variable inside .env.local');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const MODEL_NAME = 'gemini-2.0-flash-exp'; // Use a known working model for structured output until gemini-3 is fully stable/public aliases are confirmed

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
  twitterContent?: string
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
    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: jsonSchema as any
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

const NewsSearchSchema = z.object({
  summary: z.string(),
  newsItems: z.array(z.string()),
});

export type NewsSearchResult = z.infer<typeof NewsSearchSchema>;

export async function searchCompetitorNews(competitorName: string): Promise<NewsSearchResult> {
  const prompt = `
  You are a competitive intelligence analyst.
  Find the latest meaningful news, press releases, and major announcements for: ${competitorName}.
  
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

  Output a strictly valid JSON object matching this schema.
  `;

  const jsonSchema = {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING' },
      newsItems: { type: 'ARRAY', items: { type: 'STRING' } }
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
    return NewsSearchSchema.parse(parsedJson);

  } catch (error) {
    console.error(`Values search failed for ${competitorName}:`, error);
    // Fail gracefully
    return { summary: "Failed to fetch news", newsItems: [] };
  }
}


const EmailReportSchema = z.object({
  executiveSummary: z.string(),
  companyUpdates: z.array(z.object({
    competitorName: z.string(),
    update: z.string(),
    links: z.array(z.string())
  }))
});

export async function generateEmailReport(scans: { competitor: string, summary: string, changes: string[], impactScore: number, newsSummary?: string, newsItems?: string[] }[]): Promise<string> {
    const prompt = `
    You are a competitive intelligence analyst.
    Here are the results of today's monitoring scan:
    ${JSON.stringify(scans, null, 2)}

    Task: Analyze these results and generate a structured daily briefing.
    
    Requirements:
    1. executiveSummary: A high-level overview of the market landscape changes today.
    2. companyUpdates: A list of updates for EACH competitor.
       - competitorName: The name of the competitor.
       - update: A concise text summary of what happened. IF there is news (newsSummary/newsItems), prioritize that. If not, summarize the website changes.
       - links: An array of URL strings that ground the update. Use links provided in the input data (if any are apparent or derived from context). IF NO LINKS are available in the input, return an empty array. DO NOT HALLUCINATE LINKS.
    
    Strictly follow these rules:
    - ABSOLUTELY NO HALLUCINATIONS. If you are not 100% sure about a link, do not include it.
    - All updates must be grounded in the provided text.
    
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
              update: { type: 'STRING' },
              links: { type: 'ARRAY', items: { type: 'STRING' } }
            },
            required: ['competitorName', 'update', 'links']
          }
        }
      },
      required: ['executiveSummary', 'companyUpdates']
    };

    try {
        const result = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: jsonSchema as any,
            temperature: 0.0
          }
        });
    
        const text = result.text;
        if (!text) return '<p>Failed to generate report.</p>';

        const parsedJson = JSON.parse(cleanJson(text));
        const data = EmailReportSchema.parse(parsedJson);

        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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
            .company-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 15px; transition: all 0.2s; }
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
              <h1>Daily Competitor Intelligence Brief</h1>
              <div class="date">${today}</div>
            </div>

            <div class="summary-card">
              ${data.executiveSummary}
            </div>

            <div class="section-title">Company Updates</div>
            ${data.companyUpdates.map(update => `
              <div class="company-card">
                <div class="company-name">
                  ${update.competitorName}
                </div>
                <div class="update-text">${update.update}</div>
                <div class="source-links">
                    Sources:
                    ${update.links && update.links.length > 0 ? 
                        update.links.map((link, i) => `<a href="${link}" class="source-link" target="_blank">Link ${i + 1}</a>`).join('') 
                        : '<span style="color: #9ca3af; font-style: italic;">No source links provided</span>'
                    }
                </div>
              </div>
            `).join('')}

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

export async function generateWeeklyReport(scans: { summary: string, changes: string[], date: Date }[]): Promise<string> {
  const prompt = `
  You are a competitive intelligence analyst.
  Here are the updates from the last week for a specific competitor:
  ${JSON.stringify(scans.map(s => ({
      date: s.date,
      summary: s.summary,
      changes: s.changes
  })), null, 2)}

  Task: synthesize these updates into a concise "Weekly Summary".
  
  Requirements:
  1. Focus on the most important strategic shifts (pricing, new features, message changes).
  2. Ignore repetitive or minor updates.
  3. If there were no meaningful updates, say "No significant updates this week."
  4. Keep it under 50 words usually, unless there was a massive launch.
  5. Output format: A single paragraph of plain text.
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
