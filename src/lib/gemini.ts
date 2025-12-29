import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('Please define the GEMINI_API_KEY environment variable inside .env.local');
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const MODEL_NAME = 'gemini-2.0-flash-exp'; // Use a known working model for structured output until gemini-3 is fully stable/public aliases are confirmed

const CompetitorAnalysisSchema = z.object({
  summary: z.string(),
  changes: z.array(z.string()),
  impact_score: z.number().min(0).max(10),
});

export type CompetitorAnalysis = z.infer<typeof CompetitorAnalysisSchema>;

export async function analyzeCompetitorUpdate(
  competitorName: string,
  newContent: string,
  oldContent: string | null
): Promise<CompetitorAnalysis> {

  let prompt = `You are a competitive intelligence analyst.
  Competitor: ${competitorName}
  
  Here is the text content from their website (scraped).
  
  Current Content:
  ${newContent.substring(0, 20000)} ... [truncated]
  `;

  if (oldContent) {
    prompt += `
    
    Previous Content (from last scan):
    ${oldContent.substring(0, 20000)} ... [truncated]
    
    Task: Compare the current content with the previous content. Identify meaningful changes such as:
    1. New feature launches
    2. Pricing updates
    3. Messaging shifts
    4. New product announcements
    
    Ignore trivial changes like timestamps, copyright dates, or dynamic dynamic feed items (like random blog posts) unless they signal a major strategic shift.
    
    Output a strictly valid JSON object matching this schema:
    {
      "summary": "High level summary of what the competitor is offering based on the current content",
      "changes": ["Change 1", "Change 2", ...],
      "impact_score": number (0-10)
    }
    `;
  } else {
    prompt += `
    Task: This is the first scan. Summarize what this competitor does and their key value propositions.
    
    Output a strictly valid JSON object matching this schema:
    {
      "summary": "High level summary of the competitor",
      "changes": ["Initial scan - baseline established"],
      "impact_score": 0
    }
    `;
  }

  try {
    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
      }
    });

    console.log({ result, text: result.text });

    const responseText = result.text;

    if (!responseText) {
      throw new Error('No text returned from Gemini API');
    }

    const parsedJson = JSON.parse(responseText);
    
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

export async function generateEmailReport(scans: { competitor: string, summary: string, changes: string[], impactScore: number }[]): Promise<string> {
    const prompt = `
    You are writing a "Daily Competitor Intelligence Brief" email for stakeholders.
    
    Here are the results of today's monitoring scan:

    ${JSON.stringify(scans, null, 2)}

    Task: Write a professional, concise, and insightful executive summary email in HTML format.
    
    CRITICAL REQUIREMENT: You MUST include a section that lists EVERY SINGLE competitor scanned, even if there were no updates.
    
    Structure:
    1. Header: "Daily Competitor Intelligence Brief" with today's date.
    2. Executive Summary: High-level overview of the market landscape changes today.
    3. Major Updates (if any): Detailed breakdown of competitors with Impact Score > 0.
    4. Competitor Status Table: A table listing ALL competitors with columns: Name, Status (Updated/No Change), Impact Score.
    5. Footer: "View full dashboard: https://competitor-analysis-sigma.vercel.app/" (Make this a visible button or link).
    
    Style Guide (Use inline CSS):
    - Font: System UI, -apple-system, sans-serif.
    - Container: max-width 600px, margin auto, padding 20px, light gray background #f9fafb.
    - Card Style: White background, rounded corners, slight shadow, padding 20px, margin-bottom 15px.
    - Headings: Dark slate text (#111827), bold.
    - Table: 100% width, border-collapse collapse, margin-top 20px.
    - Status Badges: 
       - "Major Update" (Score > 6): Red background (#fee2e2), red text (#991b1b).
       - "Minor Update" (Score > 0): Yellow background (#fef3c7), yellow text (#92400e).
       - "No Change": Green background (#dcfce7), green text (#166534).
    - Do NOT include markdown code blocks (like \`\`\`html), return ONLY the raw HTML string.
    `;

    try {
        const result = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
    
        const text = result.text;
        if (!text) return '<p>Failed to generate report.</p>';
        
        // Cleanup if model returns markdown block
        return text.replace(/```html|```/g, '');

    } catch (error) {
        console.error("Report generation failed:", error);
        return '<p>Error generating report.</p>';
    }
}
