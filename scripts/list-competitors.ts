
import connectToDatabase from '../src/lib/db';
import Competitor from '../src/models/Competitor';
import mongoose from 'mongoose';

// Load env
const fs = require('fs');
const path = require('path');
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach((line: string) => {
    const [key, value] = line.split('=');
    if (key && value) process.env[key.trim()] = value.trim();
  });
} catch (e) {}

async function list() {
    await connectToDatabase();
    const comps = await Competitor.find({});
    console.log("LOG_COMPETITORS: " + JSON.stringify(comps.map(c => c.name)));
    process.exit(0);
}

list();
