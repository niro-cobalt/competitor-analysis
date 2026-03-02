import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmailLog extends Document {
  subject: string;
  recipient: string;
  content: string;
  structuredData?: any;
  status: 'sent' | 'failed';
  error?: string;
  organizationId: string;
  sentAt: Date;
}

const EmailLogSchema: Schema = new Schema({
  subject: { type: String, required: true },
  recipient: { type: String, required: true },
  content: { type: String, required: true },
  structuredData: { type: Schema.Types.Mixed },
  status: { type: String, enum: ['sent', 'failed'], required: true },
  error: { type: String },
  organizationId: { type: String, required: true, index: true },
  sentAt: { type: Date, default: Date.now },
}, {
  timestamps: true
});

// Auto-expire email logs after 90 days
EmailLogSchema.index({ sentAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const EmailLog: Model<IEmailLog> = mongoose.models.EmailLog || mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);

export default EmailLog;
