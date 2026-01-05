
import connectToDatabase from '../src/lib/db';
import Competitor from '../src/models/Competitor';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

// Load env
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line: string) => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
} catch (e) {}

async function check() {
    await connectToDatabase();
    const comps = await Competitor.find({ twitterUrl: { $exists: true, $ne: "" } });
    console.log("Competitors with Twitter URL:", JSON.stringify(comps.map(c => ({ name: c.name, twitterUrl: c.twitterUrl })), null, 2));
    process.exit(0);
}

check();
