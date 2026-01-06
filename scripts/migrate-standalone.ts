
import mongoose from 'mongoose';
import path from 'path';

// Env vars provided via --env-file flag


// Define Models inline to avoid import issues or just import if aliases work
// Trying imports first. If they fail, I will define schemas inline.
// Given bun's support, imports might work if tsconfig is respected. 
// But to be 100% robust against alias resolution in standalone scripts:
// I will import using relative paths to be safe.

// Relative paths from scripts/migrate-standalone.ts -> src/...
// scripts/ is usually at root? No, I'll put it in root/scripts.
// So ../src/models/...

// Wait, I need to check where I put the file. I'll put it in `scripts/migrate-standalone.ts`.
// Imports will be `../src/models/...`

import Competitor from '../src/models/Competitor';
import Subscriber from '../src/models/Subscriber';
import EmailLog from '../src/models/EmailLog';
import connectToDatabase from '../src/lib/db';

async function runMigration() {
    console.log("Starting migration...");
    
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI not found in environment.");
        process.exit(1);
    }

    try {
        await connectToDatabase();
        console.log("Connected to Database.");

        const TARGET_ORG = 'toqen';

        console.log(`Assigning organization '${TARGET_ORG}' to data missing organizationId...`);

        const competitors = await Competitor.updateMany(
            { organizationId: { $exists: false } },
            { $set: { organizationId: TARGET_ORG } }
        );
        console.log(`Competitors updated: ${competitors.modifiedCount}`);

        const subscribers = await Subscriber.updateMany(
            { organizationId: { $exists: false } },
            { $set: { organizationId: TARGET_ORG } }
        );
        console.log(`Subscribers updated: ${subscribers.modifiedCount}`);

        const emails = await EmailLog.updateMany(
            { organizationId: { $exists: false } },
            { $set: { organizationId: TARGET_ORG } }
        );
        console.log(`EmailLogs updated: ${emails.modifiedCount}`);

        console.log("Migration finished.");
        process.exit(0);

    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

runMigration();
