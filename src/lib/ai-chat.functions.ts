import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

type Input = {
  question: string;
  vehicle: unknown;
  warnings: unknown;
};

export const askMercedes = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => d)
  .handler(async ({ data }) => {
    const gateway = createLovableAiGatewayProvider("");

    const system = `
You are a calm, friendly car assistant.

You help drivers who are not technical.

GOAL:
- Keep the driver calm
- Give only what they need to do next
- Never sound technical
- Never explain like a lesson

STRICT RULES:
- Maximum 2 sentences only
- Sentence 1: reassurance
- Sentence 2: simple action (if needed)
- No technical words (battery voltage, sensors, diagnostics, etc.)
- No long explanations
- No panic language

STYLE:
- Very short
- Friendly
- Human-like
- Calm and confident

EXAMPLE OUTPUT:
"All good, nothing serious. Just try restarting the car while pressing the brake properly."

Car status: ${JSON.stringify(data.vehicle)}
Warnings: ${JSON.stringify(data.warnings)}
`;

    const { text: rawText } = await generateText({
      model: gateway("phi3"),
      system,
      prompt: `Answer in MAX 2 short sentences. No lists. No technical words. No extra advice. Just answer this: ${data.question}`,
    });

    // Trim to max 2 sentences — phi3 tends to ramble
    const sentences = rawText
      .replace(/\n+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);
    const text = sentences.slice(0, 2).join(" ");

    return { text };
  });