
import connectToDatabase from '../src/lib/db';
import Competitor from '../src/models/Competitor';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Load env
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line: string) => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
} catch (e) {
  console.log("No .env.local found");
}

/* 
   CONFIGURATION
   Fill in the details for the competitors you want to update.
   Leave fields as undefined or null if you don't want to update them.
*/
const UPDATES: Record<string, { linkedinUrl?: string, twitterUrl?: string,   instructions?: string }> = {
  "Blitzy": {
    linkedinUrl: "https://www.linkedin.com/company/blitzyai",
    twitterUrl: "https://x.com/blitzyai/",
    instructions: "Focus on AI feature releases, and if they are moving from being a coding assistant to adding capabilities around architecture of applications."
  },
  "Tweezr": {
    linkedinUrl: "https://www.linkedin.com/company/tweezr",
    twitterUrl: "",
    instructions: "look for new features and capabilities. Look for conferences and events."
  },
  "Hypercubic": {
    linkedinUrl: "https://www.linkedin.com/company/hypercubic-ai",
    twitterUrl: "",
    instructions: ""
  },
  "replai": {
    linkedinUrl: "https://www.linkedin.com/company/replaiai",
    twitterUrl: "",
    instructions: ""
  },
  "dynatrace": {
    linkedinUrl: "https://www.linkedin.com/company/dynatrace",
    twitterUrl: "https://x.com/Dynatrace",
    instructions: "look for any conferences they attend, sponsor./n Look for new features"
  }
};

async function main() {
  await connectToDatabase();
  console.log("Connected to DB.");

  for (const [name, data] of Object.entries(UPDATES)) {
      const updateData: any = {};
      if (data.linkedinUrl) updateData.linkedinUrl = data.linkedinUrl;
      if (data.twitterUrl) updateData.twitterUrl = data.twitterUrl;
      if (data.instructions) updateData.instructions = data.instructions;

      if (Object.keys(updateData).length === 0) {
          console.log(`Skipping ${name} (no data provided)`);
          continue;
      }

      console.log(`Updating ${name}...`, updateData);
      const res = await Competitor.findOneAndUpdate(
          { name: name }, 
          { $set: updateData },
          { new: true }
      );

      if (res) {
          console.log(`✅ Updated ${name}`);
      } else {
          console.log(`❌ Could not find competitor: ${name}`);
      }
  }

  console.log("Done.");
  process.exit(0);
}

main().catch(console.error);
