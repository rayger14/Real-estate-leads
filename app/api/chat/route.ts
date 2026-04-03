import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { properties } from "@/data/properties";
import { marketUpdates } from "@/data/marketUpdates";
import { retrieveContext, composeFallbackAnswer } from "@/lib/rag";
import { buildMessages, generateAnswer } from "@/lib/llm";
import { canUsePaidModel } from "@/lib/budget";

const chatSchema = z.object({
  question: z.string().min(2),
  cityFocus: z.string().optional()
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = chatSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid chat payload", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const filteredUpdates = parsed.data.cityFocus
    ? marketUpdates.filter((u) => u.city.toLowerCase().includes(parsed.data.cityFocus!.toLowerCase()))
    : marketUpdates;

  const context = retrieveContext(parsed.data.question, filteredUpdates, properties);
  const messages = buildMessages(parsed.data.question, context);
  const ipKey = request.headers.get("x-forwarded-for") ?? "local-dev";
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY);
  const allowPaid = canUsePaidModel(ipKey, Number(process.env.OPENAI_DAILY_CALL_LIMIT ?? 40));
  const modelAnswer = allowPaid && hasOpenAiKey ? await generateAnswer(messages) : null;
  const fallbackReason = !hasOpenAiKey ? "missing_openai_api_key" : allowPaid ? "provider_unavailable" : "daily_budget_exceeded";

  return NextResponse.json({
    answer: modelAnswer ?? composeFallbackAnswer(parsed.data.question, context),
    usedFallback: !modelAnswer || !allowPaid,
    fallbackReason: modelAnswer ? null : fallbackReason,
    costControl: {
      paidModelUsed: Boolean(modelAnswer && allowPaid),
      reason: allowPaid ? "within_daily_limit" : "daily_budget_exceeded"
    },
    guardrails: [
      "Informational guidance only; not legal or tax advice",
      "Fair housing and privacy-safe lead strategy required",
      "Confirm pricing with current comps and licensed professionals"
    ]
  });
}
