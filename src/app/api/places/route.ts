import { NextResponse } from "next/server";
import { getPlaces } from "@/lib/places";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const language = url.searchParams.get("language") ?? "en";
  const search = url.searchParams.get("search") ?? undefined;
  const dashboardParam = url.searchParams.get("dashboardId");
  const parsedDashboardId =
    dashboardParam !== null ? Number.parseInt(dashboardParam, 10) : undefined;
  const dashboardId =
    typeof parsedDashboardId === "number" && !Number.isNaN(parsedDashboardId) ? parsedDashboardId : undefined;

  const places = getPlaces(language, search, dashboardId);

  return NextResponse.json({ places });
}

