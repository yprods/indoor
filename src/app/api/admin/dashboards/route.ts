import { NextResponse } from "next/server";
import { validateAdminPin } from "@/lib/admin";
import { createDashboard } from "@/lib/places";

export async function POST(request: Request) {
  const pin = request.headers.get("x-admin-pin");
  if (!validateAdminPin(pin)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const { name, description, placeIds } = payload ?? {};

    const normalizedName = typeof name === "string" ? name.trim() : "";
    const normalizedDescription =
      typeof description === "string" ? description : undefined;

    const normalizedPlaceIds = Array.isArray(placeIds)
      ? placeIds
          .map((value) => {
            const parsed = Number.parseInt(String(value), 10);
            return Number.isNaN(parsed) ? null : parsed;
          })
          .filter((value): value is number => value !== null)
      : [];

    const dashboard = createDashboard({
      name: normalizedName,
      description: normalizedDescription,
      placeIds: normalizedPlaceIds,
    });

    return NextResponse.json({ dashboard });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to create dashboard.",
      },
      { status: 400 }
    );
  }
}


