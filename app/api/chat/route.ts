import { convertToModelMessages, streamText, UIMessage, stepCountIs } from 'ai';
import { addResource, getInformation } from './tools';
import { google } from '@ai-sdk/google';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: `You are a helpful assistant. Check your knowledge base before answering any questions.
    Only respond to questions using information from tool calls.
    if no relevant information is found in the tool calls, respond, "Sorry, I don't know."`,
    messages: convertToModelMessages(messages),
    tools: { addResource, getInformation },
    stopWhen: stepCountIs(5)
  });

  return result.toUIMessageStreamResponse();
}