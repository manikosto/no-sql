import { NextResponse } from 'next/server';

export async function GET() {
  const isLocalLLM = !!process.env.LLM_BASE_URL;
  const llmProvider = isLocalLLM ? 'local' : 'openai';

  return NextResponse.json({
    isLocalLLM,
    llmProvider,
  });
}
