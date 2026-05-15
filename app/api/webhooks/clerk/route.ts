import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.warn('WEBHOOK_SECRET is missing. Webhook verification will be bypassed for development, but THIS IS INSECURE FOR PRODUCTION.');
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  let evt: WebhookEvent;

  if (WEBHOOK_SECRET) {
    const wh = new Webhook(WEBHOOK_SECRET);
    try {
      evt = wh.verify(body, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as WebhookEvent;
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return new Response('Error occured', {
        status: 400,
      });
    }
  } else {
    // Development bypass if secret not set
    evt = payload as WebhookEvent;
  }

  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name, unsafe_metadata } = evt.data;
    
    const role = (unsafe_metadata?.role as string) || 'public_user';
    const metadataFirstName = unsafe_metadata?.firstName as string;
    const metadataLastName = unsafe_metadata?.lastName as string;

    const email = email_addresses[0]?.email_address || '';
    let fullName = first_name && last_name ? `${first_name} ${last_name}` : '';
    if (!fullName && metadataFirstName) {
      fullName = metadataLastName ? `${metadataFirstName} ${metadataLastName}` : metadataFirstName;
    }
    if (!fullName) fullName = 'Unknown User';

    try {
      await db.insert(users).values({
        id,
        fullName,
        email,
        role: role as any,
        status: 'PENDING',
        verificationStatus: 'PENDING',
      });
      console.log(`User ${id} successfully synced to database`);
    } catch (error) {
      console.error('Error saving user to database:', error);
      return new Response('Error saving user to database', { status: 500 });
    }
  }

  return new Response('', { status: 200 });
}
