import connectToDatabase from '@/lib/db';
import Competitor from '@/models/Competitor';
import Scan from '@/models/Scan';
import { analyzeCompetitorUpdate, searchCompetitorNews } from '@/lib/gemini';

export async function scanCompetitor(competitorId: string) {
  const startTime = Date.now();
  await connectToDatabase();
  
  const competitor = await Competitor.findById(competitorId);
  if (!competitor) {
    throw new Error('Competitor not found');
  }

  try {
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
        console.warn(`Primary scan failed for ${competitor.url}`, err);
        throw new Error(`Failed to scan website: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    if (!textContent || textContent.length < 50) {
       throw new Error('Failed to extract sufficient content from the page.');
    }

    // 2. Fetch Social Content & Additional URLs (Parallel)
    let linkedinContent = '';
    let twitterContent = '';
    let additionalContent = '';
    
    const extraPromises: Promise<void>[] = [];

    // Linkedin
    if (competitor.linkedinUrl) {
        extraPromises.push((async () => {
            try {
                const jinaUrl = `https://r.jina.ai/${competitor.linkedinUrl}`;
                const headers: Record<string, string> = process.env.JINA_API_KEY ? { 'Authorization': `Bearer ${process.env.JINA_API_KEY}` } : {};
                const res = await fetch(jinaUrl, { headers, next: { revalidate: 0 } });
                if (res.ok) linkedinContent = await res.text();
            } catch (e) {
                console.warn('LinkedIn scraping failed', e);
            }
        })());
    }

    // Twitter
    if (competitor.twitterUrl) {
        extraPromises.push((async () => {
            try {
                const jinaUrl = `https://r.jina.ai/${competitor.twitterUrl}`;
                const headers: Record<string, string> = process.env.JINA_API_KEY ? { 'Authorization': `Bearer ${process.env.JINA_API_KEY}` } : {};
                const res = await fetch(jinaUrl, { headers, next: { revalidate: 0 } });
                if (res.ok) twitterContent = await res.text();
            } catch (e) {
                console.warn('Twitter scraping failed', e);
            }
        })());
    }

    // Additional URLs
    if (competitor.additionalUrls && competitor.additionalUrls.length > 0) {
        extraPromises.push((async () => {
            const results = await Promise.all(competitor.additionalUrls.map(async (url: string) => {
                 try {
                    const jinaUrl = `https://r.jina.ai/${url}`;
                    const headers: Record<string, string> = process.env.JINA_API_KEY ? { 'Authorization': `Bearer ${process.env.JINA_API_KEY}` } : {};
                    const res = await fetch(jinaUrl, { headers, next: { revalidate: 0 } });
                    if (res.ok) {
                        const text = await res.text();
                        return `--- SOURCE: ${url} ---\n${text.substring(0, 5000)}\n\n`;
                    }
                    return '';
                } catch (e) {
                    console.warn(`Failed to scrape additional URL: ${url}`, e);
                    return '';
                }
            }));
            additionalContent = results.join('');
        })());
    }

    await Promise.all(extraPromises);

    // 3. Get previous scan
    // Fix: Ensure we compare against a SUCCESSFUL scan with content, otherwise diff will be huge/wrong.
    const lastScan = await Scan.findOne({ 
        competitorId,
        status: 'success',
        rawContent: { $exists: true, $ne: "" }
    }).sort({ createdAt: -1 });

    // Analyze changes with Gemini
    const analysis = await analyzeCompetitorUpdate(
        competitor.name,
        textContent, 
        lastScan ? lastScan.rawContent : null,
        competitor.instructions,
        linkedinContent,
        twitterContent,
        additionalContent
    );

    // Search for news
    const news = await searchCompetitorNews(competitor.name);

    // Create new scan record
    const newScan = await Scan.create({
      competitorId: competitor._id,
      rawContent: textContent,
      linkedinContent: linkedinContent,
      twitterContent: twitterContent,
      additionalContent: additionalContent,
      summary: analysis.summary,
      changesDetected: analysis.changes || [],
      impactScore: analysis.impact_score || 0,
      links: analysis.links || [],
      newsSummary: news.summary,
      newsItems: news.newsItems,
      status: 'success',
      durationMs: Date.now() - startTime
    });

    // Update competitor last scanned time
    await Competitor.findByIdAndUpdate(competitorId, { lastScannedAt: new Date() });

    return newScan;

  } catch (error) {
    console.error(`Scan failed for ${competitor.name}:`, error);
    const durationMs = Date.now() - startTime;
    
    // Save failed scan record
    await Scan.create({
        competitorId: competitor._id,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
        scannedAt: new Date()
    });

    throw error; // Re-throw to handle in API
  }
}
