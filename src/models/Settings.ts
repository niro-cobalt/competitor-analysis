import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISettings extends Document {
  organizationId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  userAvatar?: string;
  emailFrequency: 'daily' | 'weekly' | 'monthly';
  emailStyle: 'informative' | 'chatty' | 'minimalistic' | 'techy';
  includeTldr: boolean;
  cronJobId?: number;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema: Schema = new Schema({
  organizationId: { type: String, required: true },
  userId: { type: String, required: true, unique: true, index: true },
  userEmail: { type: String, required: true },
  userName: { type: String },
  userAvatar: { type: String },
  emailFrequency: { 
    type: String, 
    enum: ['daily', 'weekly', 'monthly'], 
    default: 'weekly' 
  },
  emailStyle: { 
    type: String, 
    enum: ['informative', 'chatty', 'minimalistic', 'techy'], 
    default: 'informative' 
  },
  includeTldr: { type: Boolean, default: true },
  cronJobId: { type: Number },
}, { 
  timestamps: true,
  collection: 'comp_settings'
});

// Check if model is already compiled to prevent overwrite error during hot reload
// In development, we want to overwrite the model if the schema changed (hacky but works for dev)
if (process.env.NODE_ENV === 'development' && mongoose.models.Settings) {
  delete mongoose.models.Settings;
}

const Settings: Model<ISettings> = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);

export default Settings;
