
import mongoose from 'mongoose';
import { Schema, model, models } from 'mongoose';

// Mock Scan Model
const ScanSchema = new Schema({
  competitorId: String,
  status: String,
  rawContent: String,
  createdAt: { type: Date, default: Date.now }
});

const Scan = models.Scan || model('Scan', ScanSchema);

async function testWebLogic() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.log("No MONGODB_URI, skipping DB test. Mocking logic verification.");
    return;
  }
  
  try {
    await mongoose.connect(uri);
    console.log("Connected to DB.");

    // Create dummy data
    const competitorId = new mongoose.Types.ObjectId().toString();
    
    // 1. Old successful scan
    await Scan.create({ competitorId, status: 'success', rawContent: 'content 1', createdAt: new Date('2023-01-01') });
    // 2. Newer failed scan
    await Scan.create({ competitorId, status: 'failed', rawContent: '', createdAt: new Date('2023-01-02') });
    // 3. Newer scan with empty content (buggy)
    await Scan.create({ competitorId, status: 'success', rawContent: '', createdAt: new Date('2023-01-03') });

    // Run the query
    const lastScan = await Scan.findOne({ 
        competitorId,
        status: 'success',
        rawContent: { $exists: true, $ne: "" }
    }).sort({ createdAt: -1 });

    if (!lastScan) {
        console.error("FAILED: Could not find any scan.");
    } else if (lastScan.rawContent === 'content 1') {
        console.log("SUCCESS: Correctly ignored failed and empty scans. Found content 1.");
    } else {
        console.error("FAILED: Found wrong scan:", lastScan);
    }

    // Cleanup
    await Scan.deleteMany({ competitorId });
    await mongoose.disconnect();

  } catch (e) {
    console.error("Test failed:", e);
  }
}

// Logic verify for Monday check
function testDateLogic() {
    console.log("Testing Date Logic...");
    const monday = new Date('2023-10-23T10:00:00Z'); // A Monday
    const tuesday = new Date('2023-10-24T10:00:00Z'); // A Tuesday

    const isMonday1 = monday.getDay() === 1;
    const isMonday2 = tuesday.getDay() === 1;

    if (isMonday1 && !isMonday2) {
        console.log("SUCCESS: Date check logic is correct.");
    } else {
        console.error("FAILED: Date check logic is wrong.", { isMonday1, isMonday2 });
    }
}

testDateLogic();
testWebLogic();
