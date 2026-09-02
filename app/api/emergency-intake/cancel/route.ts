import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cancelChatbotReport } from '@/lib/chatbot/cancellation';

const GuestCancellationSchema = z.object({
  requestId: z.string().uuid(),
  accessToken: z.string().length(64),
}).strict();

export async function PATCH(request: NextRequest) {
  try {
    const input = GuestCancellationSchema.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ data: null, error: 'Invalid cancellation request.', message: 'Invalid cancellation request.' }, { status: 400 });
    const result = await cancelChatbotReport(input.data.requestId, { kind: 'guest', accessToken: input.data.accessToken });
    if (!result.ok) return NextResponse.json({ data: null, error: result.error, message: result.error }, { status: result.status });
    return NextResponse.json({ data: { request: result.request }, error: null, message: 'Report cancelled.', success: true });
  } catch (error) {
    console.error('Guest chatbot cancellation failed:', error instanceof Error ? error.name : 'unknown');
    return NextResponse.json({ data: null, error: 'Unable to cancel the report.', message: 'Unable to cancel the report.' }, { status: 500 });
  }
}
