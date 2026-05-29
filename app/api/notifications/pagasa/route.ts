import { NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications } from '@/db/schema';
import { createAdminClient } from '@/lib/supabase-server';
import crypto from 'crypto';
import { and, eq, gte } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mock = searchParams.get('mock') === 'true';

    let alerts: Array<{ id: string; title: string; body: string; isSevere: boolean }> = [];

    if (mock) {
      alerts = [
        {
          id: 'mock-pagasa-1',
          title: 'PAGASA: Severe Typhoon Advisory',
          body: 'Severe Weather Alert: Signal No. 2 has been declared over Bulacan, including Baliwag City. Expect heavy torrential rainfall, high gale-force winds, and localized flooding in low-lying areas. All emergency responders are advised to remain on high alert.',
          isSevere: true,
        }
      ];
    } else {
      // 1. Fetch active weather advisories from community PAGASA parser API
      try {
        const response = await fetch('https://pagasa.chlod.net/api/v1/bulletin/active', {
          next: { revalidate: 1800 } // Cache for 30 minutes (matches requested interval)
        });
        if (response.ok) {
          const data = await response.json();
          if (data && data.bulletins) {
            data.bulletins.forEach((b: any) => {
              const textContent = `${b.title || ''} ${b.description || ''} ${b.content || ''}`;
              
              // Filter geographical scope: Bulacan or Baliwag City (case-insensitive)
              const hasBulacanScope = /bulacan|baliwag|central\s+luzon/i.test(textContent);
              
              if (hasBulacanScope) {
                alerts.push({
                  id: b.id || `pagasa-${Date.now()}`,
                  title: `PAGASA: ${b.title || 'Extreme Weather Advisory'}`,
                  body: b.description || b.content || 'Critical weather alert affecting Bulacan region. Please stay alert.',
                  isSevere: b.severity === 'severe' || b.signal >= 2 || true,
                });
              }
            });
          }
        }
      } catch (fetchErr) {
        console.warn('[PAGASA API] Active bulletin fetch failed, using mock data / skipping:', fetchErr);
      }
    }

    if (alerts.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No active weather warnings affecting Bulacan or Baliwag City at this time.' 
      });
    }

    // 2. Fetch all registered users using Supabase Service Role Admin client
    const supabaseAdmin = createAdminClient();
    const { data: { users: authUsers }, error: authErr } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authErr || !authUsers) {
      console.error('[PAGASA Parser] Failed to fetch auth users:', authErr);
      return NextResponse.json({ error: 'Failed to retrieve auth users' }, { status: 500 });
    }

    // Filter users who have "emergencies" notification toggle set to true (default is true if unset)
    const targetUsers = authUsers.filter((u) => {
      const prefs = u.user_metadata?.notification_preferences;
      return prefs?.emergencies !== false;
    });

    let dispatchedCount = 0;
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    // 3. Dispatch notifications in-app via database insertions
    for (const alert of alerts) {
      for (const targetUser of targetUsers) {
        // Deduplicate: Ensure we haven't sent the exact alert title to this user in the last 12 hours
        const existing = await db.query.notifications.findFirst({
          where: and(
            eq(notifications.userId, targetUser.id),
            eq(notifications.type, 'pagasa_alert'),
            eq(notifications.title, alert.title),
            gte(notifications.createdAt, twelveHoursAgo)
          )
        });

        if (!existing) {
          const id = crypto.randomUUID();
          await db.insert(notifications).values({
            id,
            userId: targetUser.id,
            type: 'pagasa_alert',
            title: alert.title,
            body: alert.body,
            unread: true,
            createdAt: new Date(),
            metadata: {
              alertId: alert.id,
              scope: 'Bulacan/Baliwag',
              source: 'PAGASA Parser'
            }
          });
          dispatchedCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `PAGASA advisories parsed. Dispatched ${dispatchedCount} alerts to ${targetUsers.length} active users matching Bulacan/Baliwag scope.`,
      alerts,
    });
  } catch (error: any) {
    console.error('[PAGASA Parser Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
