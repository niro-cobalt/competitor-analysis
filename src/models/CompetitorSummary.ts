import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICompetitorSummary extends Document {
  competitorId: Schema.Types.ObjectId;
  organizationId: string;
  summary: string;
  weekStart: Date;
  weekEnd: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CompetitorSummarySchema: Schema = new Schema({
  competitorId: { type: Schema.Types.ObjectId, ref: 'Competitor', required: true },
  organizationId: { type: String, required: true, index: true },
  summary: { type: String, required: true },
  weekStart: { type: Date, required: true },
  weekEnd: { type: Date, required: true },
}, { 
  timestamps: true 
});

// Index to easily find the latest summary for a competitor
CompetitorSummarySchema.index({ competitorId: 1, createdAt: -1 });

const CompetitorSummary: Model<ICompetitorSummary> = mongoose.models.CompetitorSummary || mongoose.model<ICompetitorSummary>('CompetitorSummary', CompetitorSummarySchema);

export default CompetitorSummary;
