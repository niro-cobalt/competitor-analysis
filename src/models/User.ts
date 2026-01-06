import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  kindeId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  organizationId?: string;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  kindeId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  picture: { type: String },
  organizationId: { type: String },
  lastSeenAt: { type: Date, default: Date.now },
}, { 
  timestamps: true,
  collection: 'comp_watch_users' // Explicit collection name
});

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
