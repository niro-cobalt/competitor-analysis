import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEmailLog extends Document {
  subject: string;
  recipient: string;
  content: string;
  status: 'sent' | 'failed';
  error?: string;
  sentAt: Date;
}

const EmailLogSchema: Schema = new Schema({
  subject: { type: String, required: true },
  recipient: { type: String, required: true },
  content: { type: String, required: true },
  status: { type: String, enum: ['sent', 'failed'], required: true },
  error: { type: String },
  sentAt: { type: Date, default: Date.now },
}, { 
  timestamps: true 
});

const EmailLog: Model<IEmailLog> = mongoose.models.EmailLog || mongoose.model<IEmailLog>('EmailLog', EmailLogSchema);

export default EmailLog;
