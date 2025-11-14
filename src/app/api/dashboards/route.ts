import { NextResponse } from "next/server";
import { getDashboards } from "@/lib/places";

export async function GET() {
  const dashboards = getDashboards();
  return NextResponse.json({ dashboards });
}


