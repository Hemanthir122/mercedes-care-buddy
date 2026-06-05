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
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);

    const system = `You are the Mercedes-Benz AI Care Companion inside the MBUX infotainment system.
Your job:
1. Explain warning lights in simple, friendly language.
2. Tell the driver if the vehicle is safe to drive.
3. Explain severity and urgency.
4. Recommend next steps and approximate time windows.
5. Suggest visiting a Mercedes service center when appropriate.

Be concise (2-4 short sentences). Never use heavy jargon. Sound calm and premium, like a Mercedes concierge.

Current vehicle telemetry:
${JSON.stringify(data.vehicle, null, 2)}

Active warnings:
${JSON.stringify(data.warnings, null, 2)}`;

    const { text } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      system,
      prompt: data.question,
    });
    return { text };
  });
