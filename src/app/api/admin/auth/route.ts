import { NextResponse } from "next/server";
import { validateAdminPin } from "@/lib/admin";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { pin } = payload ?? {};
    if (!validateAdminPin(typeof pin === "string" ? pin : undefined)) {
      return NextResponse.json({ error: "Invalid PIN." }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to validate PIN." },
      { status: 400 }
    );
  }
}


