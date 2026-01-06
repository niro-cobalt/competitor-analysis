import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { getUserOrganization } from '@/lib/utils';

// Accept any for the generic to match what getKindeServerSession returns
export async function syncKindeUser(kindeUser: any): Promise<void> {
    if (!kindeUser) {
        console.log('[SyncUser] No user to sync.');
        return;
    }

    try {
        console.log('[SyncUser] Connecting to DB...');
        await connectToDatabase();
        console.log('[SyncUser] DB Connected.');
        
        const orgId = getUserOrganization(kindeUser);
        console.log('[SyncUser] Syncing user:', kindeUser.id, kindeUser.email, 'Org:', orgId);
        
        // Upsert user
        const result = await User.findOneAndUpdate(
            { kindeId: kindeUser.id },
            {
                $set: {
                    email: kindeUser.email,
                    firstName: kindeUser.given_name,
                    lastName: kindeUser.family_name,
                    picture: kindeUser.picture,
                    organizationId: orgId,
                    lastSeenAt: new Date()
                },
                $setOnInsert: {
                    // Any fields to set only on creation
                }
            },
            { upsert: true, new: true, lean: true }
        );
        console.log('[SyncUser] User synced successfully:', result?._id);
        
    } catch (error) {
        // Log but don't crash app flow
        console.error('[SyncUser] Failed to sync user to DB:', error);
    }
}
