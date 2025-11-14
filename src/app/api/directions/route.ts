import { NextResponse } from "next/server";
import { getDirections } from "@/lib/places";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");
  const language = url.searchParams.get("language") ?? "en";

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "from and to parameters are required." }, { status: 400 });
  }

  const fromId = Number.parseInt(fromParam, 10);
  const toId = Number.parseInt(toParam, 10);

  if (Number.isNaN(fromId) || Number.isNaN(toId)) {
    return NextResponse.json({ error: "from and to must be valid numeric identifiers." }, { status: 400 });
  }

  try {
    const directions = getDirections(fromId, toId, language);
    return NextResponse.json(directions);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to calculate directions.",
      },
      { status: 400 }
    );
  }
}

