import { NextResponse } from "next/server";
import { createConnection, getNearbyPlaces } from "@/lib/places";
import { ORIENTATIONS } from "@/lib/orientation";
import type { Orientation } from "@/lib/orientation";
import { validateAdminPin } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const pin = request.headers.get("x-admin-pin");
    if (!validateAdminPin(pin)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const {
      fromId,
      toId,
      orientation,
      distance,
      landmark,
      bidirectional = true,
      language = "he",
    } = payload ?? {};

    const orientationValue =
      typeof orientation === "string" ? (orientation as Orientation) : undefined;

    if (!orientationValue || !ORIENTATIONS.includes(orientationValue)) {
      return NextResponse.json({ error: "orientation is invalid." }, { status: 400 });
    }

    createConnection({
      fromId: Number(fromId),
      toId: Number(toId),
      orientation: orientationValue,
      distance: Number(distance),
      landmark: typeof landmark === "string" ? landmark : undefined,
      bidirectional: Boolean(bidirectional),
    });

    const neighbors = {
      from: getNearbyPlaces(Number(fromId), language),
      to: getNearbyPlaces(Number(toId), language),
    };

    return NextResponse.json({ success: true, neighbors });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create connection.",
      },
      { status: 400 }
    );
  }
}

