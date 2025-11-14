import { NextResponse } from "next/server";
import { createPlace, getPlaces } from "@/lib/places";
import { validateAdminPin } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const pin = request.headers.get("x-admin-pin");
    if (!validateAdminPin(pin)) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = await request.json();
    const {
      slug,
      floor,
      zone,
      type,
      x,
      y,
      name,
      description,
      imageUrl,
      language = "he",
    } = payload ?? {};

    const place = createPlace({
      slug: String(slug ?? ""),
      floor: String(floor ?? ""),
      zone: String(zone ?? ""),
      type: typeof type === "string" ? type : undefined,
      x: Number(x),
      y: Number(y),
      imageUrl: typeof imageUrl === "string" && imageUrl.trim() ? imageUrl : undefined,
      name: typeof name === "string" ? name : undefined,
      description: typeof description === "string" ? description : undefined,
      language: typeof language === "string" ? language : undefined,
    });

    const places = getPlaces(language);

    return NextResponse.json({ place, places });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create place.",
      },
      { status: 400 }
    );
  }
}

