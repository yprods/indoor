import { NextRequest, NextResponse } from "next/server";
import { getDashboards } from "@/lib/places";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const resolvedParams = await params;
  const placeId = Number.parseInt(resolvedParams.id, 10);
  if (Number.isNaN(placeId)) {
    return NextResponse.json({ error: "Invalid place id." }, { status: 400 });
  }

  const dashboards = getDashboards().filter((dashboard) =>
    dashboard.placeIds.includes(placeId)
  );

  return NextResponse.json({ dashboards });
}

