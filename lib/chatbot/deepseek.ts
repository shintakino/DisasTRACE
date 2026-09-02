import 'server-only';
import { runDeepSeekGateway, type DeepSeekResult } from '@/lib/chatbot/deepseek-gateway';

/** The provider selects an approved ID only; its prose is never rendered. */
export async function getDeepSeekSuggestion(input: {
  message: string;
  candidates: { id: string; keywords: string[] }[];
}): Promise<DeepSeekResult> {
  return runDeepSeekGateway(input, {
    apiKey: process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API,
  });
}

export type { DeepSeekResult, DeepSeekUsage } from '@/lib/chatbot/deepseek-gateway';
