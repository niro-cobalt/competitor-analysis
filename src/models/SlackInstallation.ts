import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISlackInstallation extends Document {
  organizationId: string;
  teamId: string;
  teamName: string;
  botToken: string;
  botUserId: string;
  installedBy: string;
  installedByEmail: string;
  installedAt: Date;
}

const SlackInstallationSchema: Schema = new Schema({
  organizationId: { type: String, required: true, unique: true, index: true },
  teamId: { type: String, required: true },
  teamName: { type: String, required: true },
  botToken: { type: String, required: true },
  botUserId: { type: String, required: true },
  installedBy: { type: String, required: true },
  installedByEmail: { type: String, required: true },
  installedAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  collection: 'comp_slack_installations'
});

if (process.env.NODE_ENV === 'development' && mongoose.models.SlackInstallation) {
  delete mongoose.models.SlackInstallation;
}

const SlackInstallation: Model<ISlackInstallation> =
  mongoose.models.SlackInstallation ||
  mongoose.model<ISlackInstallation>('SlackInstallation', SlackInstallationSchema);

export default SlackInstallation;
