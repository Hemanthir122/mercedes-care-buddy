// ─── Ollama / phi3 local AI chat — DISABLED (replaced by Vapi voice assistant) ─
//
// import { createServerFn } from "@tanstack/react-start";
// import { generateText } from "ai";
// import { createLovableAiGatewayProvider } from "./ai-gateway.server";
//
// type Input = {
//   question: string;
//   vehicle: unknown;
//   warnings: unknown;
// };
//
// export const askMercedes = createServerFn({ method: "POST" })
//   .inputValidator((d: Input) => d)
//   .handler(async ({ data }) => {
//     const gateway = createLovableAiGatewayProvider("");
//
//     const system = `
// You are a calm, friendly car assistant.
// ...
// `;
//
//     const { text: rawText } = await generateText({
//       model: gateway("phi3"),
//       system,
//       prompt: `Answer in MAX 2 short sentences. No lists. No technical words. No extra advice. Just answer this: ${data.question}`,
//     });
//
//     const sentences = rawText
//       .replace(/\n+/g, " ")
//       .split(/(?<=[.!?])\s+/)
//       .filter((s) => s.trim().length > 0);
//     const text = sentences.slice(0, 2).join(" ");
//
//     return { text };
//   });
// ─────────────────────────────────────────────────────────────────────────────
