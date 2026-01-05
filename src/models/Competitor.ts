import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompetitor extends Document {
  name: string;
  url: string;
  logo?: string;
  instructions?: string;
  lastScannedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorSchema: Schema = new Schema({
  name: { type: String, required: true },
  url: { type: String, required: true, unique: true },
  logo: { type: String },
  instructions: { type: String },
  lastScannedAt: { type: Date },
}, { 
  timestamps: true 
});

// Check if model is already compiled to prevent overwrite error during hot reload
const Competitor: Model<ICompetitor> = mongoose.models.Competitor || mongoose.model<ICompetitor>('Competitor', CompetitorSchema);

export default Competitor;
