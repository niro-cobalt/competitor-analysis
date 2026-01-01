import connectToDatabase from '@/lib/db';
import Competitor from '@/models/Competitor';
import Scan from '@/models/Scan';
import { analyzeCompetitorUpdate, searchCompetitorNews } from '@/lib/gemini';

export async function scanCompetitor(competitorId: string) {
  try {
    await connectToDatabase();
    const competitor = await Competitor.findById(competitorId);
    if (!competitor) {
      throw new Error('Competitor not found');
    }

    console.log(`Scanning URL with Jina Reader: ${competitor.url}`);

    // 1. Fetch current content using Jina Reader (returns Markdown)
    let textContent = '';
    
    try {
        const jinaUrl = `https://r.jina.ai/${competitor.url}`;
        
        const headers: Record<string, string> = {
            'X-Target-Selector': 'body', // Optional hint to Jina
        };

        if (process.env.JINA_API_KEY) {
            headers['Authorization'] = `Bearer ${process.env.JINA_API_KEY}`;
        }

        const response = await fetch(jinaUrl, {
            headers: headers,
            next: { revalidate: 0 } // Disable cache for fresh scans
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch page via Jina: ${response.status} ${response.statusText}`);
        }

        // Jina returns clean Markdown
        textContent = await response.text();

    } catch (err: any) {
        console.error('Scraping error:', err);
        throw new Error(`Scraping failed: ${err.message}`);
    }

    if (!textContent) {
       throw new Error('Failed to extract any content from the page.');
    }

    // 2. Get previous scan
    const lastScan = await Scan.findOne({ competitorId }).sort({ createdAt: -1 });

    // 3. Analyze with Gemini (Website Content)
    const [analysis, newsAnalysis] = await Promise.all([
        analyzeCompetitorUpdate(
            competitor.name, 
            textContent, 
            lastScan ? lastScan.rawContent : null
        ),
        searchCompetitorNews(competitor.name)
    ]);

    // 4. Save Scan
    const newScan = await Scan.create({
      competitorId: competitor._id,
      rawContent: textContent,
      summary: analysis.summary,
      changesDetected: analysis.changes || [],
      impactScore: analysis.impact_score || 0,
      newsSummary: newsAnalysis.summary,
      newsItems: newsAnalysis.newsItems,
    });

    // 5. Update Competitor last scanned time
    competitor.lastScannedAt = new Date();
    await competitor.save();

    return newScan;

  } catch (error) {
    console.error(`Scan failed for competitor ${competitorId}:`, error);
    throw error;
  }
}
