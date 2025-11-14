import { NextResponse } from "next/server";
import { addLanguage, getLanguages } from "@/lib/places";

export async function GET() {
  const languages = getLanguages();
  return NextResponse.json({ languages });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { code, label } = payload ?? {};

    if (!code || !label) {
      return NextResponse.json({ error: "code and label are required." }, { status: 400 });
    }

    addLanguage(String(code), String(label));
    const languages = getLanguages();
    return NextResponse.json({ languages });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to add language.",
      },
      { status: 400 }
    );
  }
}

