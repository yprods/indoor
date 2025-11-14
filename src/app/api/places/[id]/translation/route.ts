import { NextRequest, NextResponse } from "next/server";
import { updatePlaceTranslation } from "@/lib/places";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  const placeId = Number.parseInt(resolvedParams.id, 10);
  if (Number.isNaN(placeId)) {
    return NextResponse.json({ error: "Invalid place id." }, { status: 400 });
  }

  try {
    const payload = await request.json();
    const { language, name, description } = payload ?? {};

    if (!language || !name) {
      return NextResponse.json({ error: "language and name are required." }, { status: 400 });
    }

    updatePlaceTranslation(language, placeId, String(name), String(description ?? ""));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update translation." },
      { status: 400 }
    );
  }
}

