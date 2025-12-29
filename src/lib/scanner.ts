import connectToDatabase from '@/lib/db';
import Competitor from '@/models/Competitor';
import Scan from '@/models/Scan';
import { analyzeCompetitorUpdate } from '@/lib/gemini';

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
    
    // Dynamically import puppeteer
    const puppeteer = (await import('puppeteer')).default;
    
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
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

    // 3. Analyze with Gemini
    const analysis = await analyzeCompetitorUpdate(
      competitor.name, 
      textContent, 
      lastScan ? lastScan.rawContent : null
    );

    // 4. Save Scan
    const newScan = await Scan.create({
      competitorId: competitor._id,
      rawContent: textContent,
      summary: analysis.summary,
      changesDetected: analysis.changes || [],
      impactScore: analysis.impact_score || 0
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
