import { advisorPolicy } from "@/data/systemPrompt";

type Message = {
  role: "system" | "user";
  content: string;
};

export async function generateAnswer(messages: Message[]): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) return null;

  const input = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input,
        temperature: 0.2,
        max_output_tokens: 500
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      output_text?: string;
      output?: Array<{ content?: Array<{ text?: string }> }>;
    };

    if (typeof data.output_text === "string" && data.output_text.length > 0) {
      return data.output_text;
    }

    const text = data.output?.[0]?.content?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
}

export function buildMessages(question: string, context: string[]): Message[] {
  return [
    { role: "system", content: advisorPolicy.trim() },
    {
      role: "user",
      content: `Use the following market context when responding.\n${context.join("\n")}\n\nQuestion: ${question}`
    }
  ];
}
