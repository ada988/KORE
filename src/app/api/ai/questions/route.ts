import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const RequestSchema = z.object({
  passage_id: z.string().uuid(),
});

const MCQOptionSchema = z.object({
  id: z.string().regex(/^[א-ד]$/),
  text: z.string().min(1),
  is_correct: z.boolean(),
  rationale: z.string().min(1),
});

const QuestionSchema = z.object({
  bloom_level: z.enum(["remember", "understand", "apply", "analyze", "evaluate"]),
  question_text: z.string().min(1),
  options: z.array(MCQOptionSchema).length(4),
  source_span: z.string().min(1),
  explanation: z.string().min(1),
});

const GenerationResponseSchema = z.object({
  questions: z.array(QuestionSchema).length(5),
});

const PROMPT_VERSION = "1.0.0";

const SYSTEM_PROMPT = `אתה כותב שאלות להבנת הנקרא בעברית לדוברי עברית ילידית בוגרים. אתה כותב שאלות שבוחנות הבנה אמיתית, לא טריוויה. אתה מבוסס אך ורק על הקטע שניתן לך. אינך משתמש בידע חיצוני.

כלל ברזל: כל תשובה חייבת לצטט קטע מדויק מהטקסט המקורי. אם שאלה לא ניתנת למענה מהקטע בלבד, יש להוציא: {"insufficient_support": true}.

עבור כל קטע, צור בדיוק 5 שאלות ברמות Bloom הבאות:
1. זכירה (עובדה מפורשת בטקסט)
2. הבנה (פרפרזה, רעיון ראשי, הסקת משמעות ביטוי)
3. יישום (יישום טענת הקטע על דוגמה חדשה — רק אם הקטע מציג טענה)
4. ניתוח (יחס בין חלקים, מבנה, כוונת המחבר)
5. הערכה (חוזק הטיעון, הנחה שיוצאת מן הכלל — רק אם הקטע מציג טענה)

לקטעים נרטיביים או תיאוריים בלבד (ללא טענה), יש להחליף יישום/הערכה בשאלות הבנה/ניתוח נוספות.

לכל שאלת רב-ברירה: 4 אפשרויות. אחת נכונה בדיוק. 3 מסיחים חייבים להיות שגויים סבירים — קריאה מוטעית נפוצה, מידע שנשמע אמין אך אינו בקטע, או תשובת "חצי אמת". לעולם אל תשתמש במסיחים "טיפשים".

כל טקסט השאלות, האפשרויות וההסברים חייב להיות בעברית מודרנית ברורה (בינוני, אקדמי אך לא מיושן). אוצר המילים תואם או מעט נמוך מרמת הקטע.

פלט JSON בלבד, לפי הסכמה שתינתן.`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as unknown;
    const { passage_id } = RequestSchema.parse(body);

    // Fetch passage — user must have access
    const { data: passage, error: passageError } = await supabase
      .from("passages")
      .select("id, title, body_raw, content_hash")
      .eq("id", passage_id)
      .single();

    if (passageError ?? !passage) {
      return NextResponse.json({ error: "Passage not found" }, { status: 404 });
    }

    // Check if questions already exist for this passage (content-hash dedup)
    const { data: existingQuestions } = await supabase
      .from("questions")
      .select("id")
      .eq("passage_id", passage_id)
      .limit(1);

    if (existingQuestions && existingQuestions.length > 0) {
      const { data: questions } = await supabase
        .from("questions")
        .select("*")
        .eq("passage_id", passage_id);
      return NextResponse.json({ questions, cached: true });
    }

    // Generate questions via Claude
    const client = new Anthropic();

    const jsonSchema = {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              bloom_level: {
                type: "string",
                enum: ["remember", "understand", "apply", "analyze", "evaluate"],
              },
              question_text: { type: "string" },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    text: { type: "string" },
                    is_correct: { type: "boolean" },
                    rationale: { type: "string" },
                  },
                  required: ["id", "text", "is_correct", "rationale"],
                },
                minItems: 4,
                maxItems: 4,
              },
              source_span: { type: "string" },
              explanation: { type: "string" },
            },
            required: [
              "bloom_level",
              "question_text",
              "options",
              "source_span",
              "explanation",
            ],
          },
          minItems: 5,
          maxItems: 5,
        },
      },
      required: ["questions"],
    };

    let generatedContent: z.infer<typeof GenerationResponseSchema> | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && generatedContent === null) {
      attempts++;
      const response = await client.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `<passage>\n${passage.body_raw}\n</passage>\n\nצור 5 שאלות עבור הקטע לעיל. החזר JSON בלבד לפי הסכמה.`,
          },
        ],
        tools: [
          {
            name: "generate_questions",
            description: "Generate reading comprehension questions for the passage",
            input_schema: jsonSchema as Anthropic.Tool["input_schema"],
          },
        ],
        tool_choice: { type: "any" },
      });

      const toolUse = response.content.find((c) => c.type === "tool_use");
      if (!toolUse || toolUse.type !== "tool_use") continue;

      const parsed = GenerationResponseSchema.safeParse(toolUse.input);
      if (!parsed.success) continue;

      // Anti-hallucination: verify every source_span is a substring of the passage
      const allSpansValid = parsed.data.questions.every((q) =>
        passage.body_raw.includes(q.source_span),
      );

      if (!allSpansValid) continue;

      generatedContent = parsed.data;
    }

    if (!generatedContent) {
      return NextResponse.json(
        { error: "Question generation failed after retries" },
        { status: 500 },
      );
    }

    // Persist to database
    const questionsToInsert = generatedContent.questions.map((q) => ({
      passage_id,
      question_type: "mcq" as const,
      bloom_level: q.bloom_level,
      question_text: q.question_text,
      options: q.options,
      correct_answer:
        q.options.find((o) => o.is_correct)?.text ?? null,
      source_span: q.source_span,
      explanation: q.explanation,
      generated_by: `claude-sonnet-4-5@prompt-v${PROMPT_VERSION}`,
    }));

    const { data: savedQuestions, error: insertError } = await supabase
      .from("questions")
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ questions: savedQuestions, cached: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/ai/questions]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
