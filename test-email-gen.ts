import fs from 'fs';
import path from 'path';

// Load env before anything else
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
} catch (e) {
  console.warn("Could not load .env.local", e);
}

// Mock data
const mockScans = [
  { 
    competitor: "Stripe", 
    summary: "Stripe has launched a new crypto payout feature.", 
    changes: ["New feature: Crypto Payouts", "Updated API docs"], 
    impactScore: 8, 
    newsSummary: "Stripe announces major expansion into crypto markets.", 
    newsItems: ["Stripe enables crypto payouts for platforms", "Partnership with Polygon"] 
  },
  { 
    competitor: "Adyen", 
    summary: "No major changes detected on the homepage.", 
    changes: [], 
    impactScore: 0 
  },
  {
      competitor: "PayPal",
      summary: "Updated pricing page with minor fee adjustments.",
      changes: ["Fee update", "Legal terms update"],
      impactScore: 3,
      newsSummary: "Quarterly earnings report released.",
      newsItems: ["Q4 Earnings beat expectations"]
  }
];

async function test() {
  console.log("Loading environment variables...");
  if (!process.env.GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY is missing even after dotenv load.");
      process.exit(1);
  }

  // Dynamic import to ensure env vars are set
  const { generateEmailReport } = await import('./src/lib/gemini');

  console.log("Generating report with structured output...");
  try {
      const html = await generateEmailReport(mockScans);
      console.log("---------------------------------------------------");
      console.log("Generated HTML length:", html.length);
      console.log("Preview (first 500 chars):", html.substring(0, 500));
      console.log("---------------------------------------------------");

      // rudimentary checks
      const checks = [
          { feature: "Stripe", present: html.includes("Stripe") },
          { feature: "Adyen", present: html.includes("Adyen") },
          { feature: "PayPal", present: html.includes("PayPal") },
          { feature: "Table", present: html.includes("<table") },
          { feature: "Major Badge", present: html.includes("Major Update") },
          { feature: "Structure", present: html.includes("class=\"summary-card\"") }
      ];

      const allPassed = checks.every(c => c.present);

      if (allPassed) {
        console.log("✅ All basic structural checks passed.");
      } else {
        console.error("❌ Some checks failed:");
        checks.forEach(c => {
            if (!c.present) console.error(`   - Missing: ${c.feature}`);
        });
      }
      
      // Save to file for manual inspection if needed
      // const fs = require('fs');
      // fs.writeFileSync('test_email_output.html', html);

  } catch (error) {
      console.error("Test failed with error:", error);
  }
}

test();
