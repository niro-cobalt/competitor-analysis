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

    console.log(`Scanning URL with Puppeteer: ${competitor.url}`);

    // 1. Fetch current content using Puppeteer
    let textContent = '';
    let browser: any = null;

    try {
        if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
             // Production (Vercel)
             console.log("Running in production (Vercel) mode...");
             const chromium = (await import('@sparticuz/chromium')).default;
             const puppeteerCore = (await import('puppeteer-core')).default;
             
             // Check if specific version pack is needed, usually the package version matches
             // Using a remote URL forces download to /tmp, bypassing node_modules issues
             // Sequential execution in route.ts prevents ETXTBSY errors here
             const executablePath = await chromium.executablePath("https://github.com/Sparticuz/chromium/releases/download/v132.0.0/chromium-v132.0.0-pack.tar");

             browser = await puppeteerCore.launch({
                args: chromium.args,
                defaultViewport: { width: 1920, height: 1080 },
                executablePath: executablePath,
                headless: true,
             });

        } else {
            // Local Development
             console.log("Running in local development mode...");
             const puppeteer = (await import('puppeteer')).default;
             browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
             });
        }
    
      const page = await browser.newPage();
      
      // Set a real user agent
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Navigate
      await page.goto(competitor.url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Extract text
      textContent = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script, style, noscript');
        scripts.forEach(el => el.remove());
        return document.body.innerText.replace(/\s+/g, ' ').trim();
      });
      
    } catch (err: any) {
      console.error('Puppeteer error:', err);
      throw new Error(`Puppeteer failed: ${err.message}`);
    } finally {
        // Ensure browser is closed even if analyzeCompetitorUpdate fails later
        if (browser) await browser.close();
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
