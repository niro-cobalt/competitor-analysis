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

    // 2. Fetch Social Content (Parallel)
    let linkedinContent = '';
    let twitterContent = '';
    
    const socialPromises: Promise<void>[] = [];

    if (competitor.linkedinUrl) {
        socialPromises.push((async () => {
            try {
                console.log(`Scanning LinkedIn: ${competitor.linkedinUrl}`);
                const jinaUrl = `https://r.jina.ai/${competitor.linkedinUrl}`;
                const headers: Record<string, string> = process.env.JINA_API_KEY ? { 'Authorization': `Bearer ${process.env.JINA_API_KEY}` } : {};
                const res = await fetch(jinaUrl, { headers, next: { revalidate: 0 } });
                if (res.ok) linkedinContent = await res.text();
            } catch (e) {
                console.warn('LinkedIn scraping failed', e);
            }
        })());
    }

    if (competitor.twitterUrl) {
        socialPromises.push((async () => {
            try {
                console.log(`Scanning Twitter: ${competitor.twitterUrl}`);
                const jinaUrl = `https://r.jina.ai/${competitor.twitterUrl}`;
                const headers: Record<string, string> = process.env.JINA_API_KEY ? { 'Authorization': `Bearer ${process.env.JINA_API_KEY}` } : {};
                const res = await fetch(jinaUrl, { headers, next: { revalidate: 0 } });
                if (res.ok) twitterContent = await res.text();
            } catch (e) {
                console.warn('Twitter scraping failed', e);
            }
        })());
    }

    await Promise.all(socialPromises);

    // 3. Get previous scan
    const lastScan = await Scan.findOne({ competitorId }).sort({ createdAt: -1 });

    // 4. Analyze with Gemini (Website + Social Content)
    const [analysis, newsAnalysis] = await Promise.all([
        analyzeCompetitorUpdate(
            competitor.name, 
            textContent, 
            lastScan ? lastScan.rawContent : null,
            competitor.instructions,
            linkedinContent,
            twitterContent
        ),
        searchCompetitorNews(competitor.name)
    ]);

    // 5. Save Scan
    const newScan = await Scan.create({
      competitorId: competitor._id,
      rawContent: textContent,
      linkedinContent,
      twitterContent,
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
