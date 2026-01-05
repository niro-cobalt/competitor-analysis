import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IScan extends Document {
  competitorId: mongoose.Types.ObjectId;
  scannedAt: Date;
  rawContent: string;
  linkedinContent?: string;
  summary: string;
  changesDetected: string[]; // Array of strings describing changes
  impactScore: number;
  newsSummary?: string;
  newsItems?: string[];
}

const ScanSchema: Schema = new Schema({
  competitorId: { type: Schema.Types.ObjectId, ref: 'Competitor', required: true },
  scannedAt: { type: Date, default: Date.now },
  rawContent: { type: String }, // Can be large, maybe we truncate? 
  linkedinContent: { type: String },
  summary: { type: String },
  changesDetected: { type: [String], default: [] },
  impactScore: { type: Number, default: 0 },
  newsSummary: { type: String, default: '' },
  newsItems: { type: [String], default: [] }
}, { 
  timestamps: true 
});

const Scan: Model<IScan> = mongoose.models.Scan || mongoose.model<IScan>('Scan', ScanSchema);

export default Scan;
