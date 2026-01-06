import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISubscriber extends Document {
  email: string;
  organizationId: string;
  createdAt: Date;
}

const SubscriberSchema: Schema = new Schema({
  email: { type: String, required: true },
  organizationId: { type: String, required: true, index: true },
}, { 
  timestamps: true 
});

// Compound index to ensure unique email per organization
SubscriberSchema.index({ email: 1, organizationId: 1 }, { unique: true });

const Subscriber: Model<ISubscriber> = mongoose.models.Subscriber || mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);

export default Subscriber;
