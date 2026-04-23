"use client";

/**
 * Client-side comprehension question generation via the Anthropic API,
 * using the user-provided key stored in local prefs. No server dependency.
 * User is warned in settings that the key is stored locally and included
 * in request headers only from their own browser.
 */

export type AIQuestion = {
  id: string;
  bloom_level: "remember" | "understand" | "apply" | "analyze" | "evaluate";
  question_text: string;
  options: { id: string; text: string; is_correct: boolean }[];
  explanation: string;
  source_span: string;
};

const SYSTEM_PROMPT = `אתה כותב שאלות הבנת הנקרא בעברית. דבר רק מתוך הקטע — אל תשתמש בידע חיצוני. לכל שאלה ציטוט מדויק מהטקסט (source_span חייב להיות תת-מחרוזת). 5 שאלות בדיוק, ברמות Bloom: זכירה, הבנה, יישום, ניתוח, הערכה (אם הקטע מאפשר; אחרת — הבנה/ניתוח נוספות). 4 אפשרויות ברב-ברירה, בדיוק אחת נכונה, מסיחים סבירים. עברית בינונית-אקדמית. JSON בלבד.`;

const TOOL_SCHEMA = {
  name: "generate_questions",
  description: "Generate 5 reading-comprehension questions for a Hebrew passage",
  input_schema: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        items: {
          type: "object",
          properties: {
            bloom_level: { type: "string", enum: ["remember", "understand", "apply", "analyze", "evaluate"] },
            question_text: { type: "string" },
            options: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  text: { type: "string" },
                  is_correct: { type: "boolean" },
                },
                required: ["id", "text", "is_correct"],
              },
            },
            source_span: { type: "string" },
            explanation: { type: "string" },
          },
          required: ["bloom_level", "question_text", "options", "source_span", "explanation"],
        },
      },
    },
    required: ["questions"],
  },
};

export async function generateQuestions(params: {
  apiKey: string;
  passageTitle: string;
  passageBody: string;
}): Promise<AIQuestion[]> {
  const { apiKey, passageTitle, passageBody } = params;
  if (!apiKey.trim()) throw new Error("no_key");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      tools: [TOOL_SCHEMA],
      tool_choice: { type: "tool", name: "generate_questions" },
      messages: [
        {
          role: "user",
          content: `<passage title="${passageTitle}">\n${passageBody}\n</passage>\n\nצור 5 שאלות.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`api_error:${res.status}:${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const toolUse = data.content?.find((c: { type: string }) => c.type === "tool_use");
  if (!toolUse) throw new Error("no_tool_use");

  const questions = toolUse.input?.questions;
  if (!Array.isArray(questions)) throw new Error("bad_shape");

  // Verify source spans exist in passage (hallucination guard)
  const verified = questions.filter((q: AIQuestion) => passageBody.includes(q.source_span));
  if (verified.length < 3) throw new Error("hallucinated");

  return verified.map((q: AIQuestion, i: number) => ({
    ...q,
    id: `ai-q-${i}-${Date.now()}`,
  }));
}
