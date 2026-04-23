import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const RequestSchema = z.object({
  text: z.string().min(1).max(50_000),
  passage_id: z.string().uuid().optional(),
});

/**
 * Server-side Hebrew nakdan (vowelization + homograph disambiguation).
 * Calls DICTA's Nakdan API, caches result in Supabase by content hash.
 * Users never see this endpoint directly — it's called during passage ingestion.
 */
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
    const { text } = RequestSchema.parse(body);

    const dictaApiKey = process.env.DICTA_API_KEY;
    if (!dictaApiKey) {
      return NextResponse.json(
        { error: "Nakdan API not configured" },
        { status: 503 },
      );
    }

    const response = await fetch(
      "https://nakdan.dicta.org.il/api/nakdan",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${dictaApiKey}`,
        },
        body: JSON.stringify({
          data: text,
          genre: "modern",
          addmorph: true,
          keepmekunot: false,
          matchpartialwords: false,
        }),
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Nakdan API error", status: response.status },
        { status: 502 },
      );
    }

    const result = await response.json() as unknown;
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[api/nakdan]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
