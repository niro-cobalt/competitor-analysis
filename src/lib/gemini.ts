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
});

export type CompetitorAnalysis = z.infer<typeof CompetitorAnalysisSchema>;

export async function analyzeCompetitorUpdate(
  competitorName: string,
  newContent: string,
  oldContent: string | null,
  instructions?: string,
  linkedinContent?: string
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
      ${linkedinContent.substring(0, 10000)} ... [truncated]
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
    
    Output a strictly valid JSON object matching this schema.
    `;
  } else {
    prompt += `
    Task: This is the first scan. Summarize what this competitor does and their key value propositions.
    
    Output a strictly valid JSON object matching this schema.
    `;
  }

  const jsonSchema = {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING' },
      changes: { type: 'ARRAY', items: { type: 'STRING' } },
      impact_score: { type: 'NUMBER' }
    },
    required: ['summary', 'changes', 'impact_score']
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
    hasMajorNews: z.boolean()
  })),
  tableSummary: z.array(z.object({
    competitorName: z.string(),
    status: z.string(),
    impactScore: z.number()
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
       - update: A concise text summary of what happened. IF there is news (newsSummary/newsItems), prioritized that. If not, summarize the website changes.
       - hasMajorNews: true if impactScore > 5 or there is significant news.
    3. tableSummary: A quick scan table.
       - competitorName: The name of the competitor.
       - status: "Major Update", "Minor Update", or "No Change".
       - impactScore: The numeric score (0-10).
    
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
              hasMajorNews: { type: 'BOOLEAN' }
            },
            required: ['competitorName', 'update', 'hasMajorNews']
          }
        },
        tableSummary: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              competitorName: { type: 'STRING' },
              status: { type: 'STRING', enum: ["Major Update", "Minor Update", "No Change"] },
              impactScore: { type: 'NUMBER' }
            },
            required: ['competitorName', 'status', 'impactScore']
          }
        }
      },
      required: ['executiveSummary', 'companyUpdates', 'tableSummary']
    };

    try {
        const result = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            responseMimeType: 'application/json',
            responseSchema: jsonSchema as any, // Cast to any if strict typing complains, or match the SDK type
          }
        });
    
        const text = result.text;
        if (!text) return '<p>Failed to generate report.</p>';

        // With structured output, we don't need to clean markdown usually, but safe to keep basic parse
        const parsedJson = JSON.parse(cleanJson(text));
        const data = EmailReportSchema.parse(parsedJson);

        // Programmatically inject the date
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Build HTML manually
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
            .major-badge { background-color: #fee2e2; color: #991b1b; font-size: 12px; padding: 2px 8px; border-radius: 9999px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
            .update-text { color: #4b5563; font-size: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
            th { text-align: left; padding: 12px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }
            td { padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151; }
            .score-cell { font-family: monospace; font-weight: 600; color: #6b7280; }
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
                  ${update.hasMajorNews ? '<span class="major-badge">Major Update</span>' : ''}
                </div>
                <div class="update-text">${update.update}</div>
              </div>
            `).join('')}

            <div class="section-title">Quick Glance</div>
            <table>
              <thead>
                <tr>
                  <th>Competitor</th>
                  <th>Status</th>
                  <th>Impact</th>
                </tr>
              </thead>
              <tbody>
                ${data.tableSummary.map(row => `
                  <tr>
                    <td>${row.competitorName}</td>
                    <td>${row.status}</td>
                    <td class="score-cell">${row.impactScore}/10</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

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
