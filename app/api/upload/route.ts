export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import r2 from "@/lib/r2";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const key = `uploads/${crypto.randomUUID()}/${file.name}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: Buffer.from(bytes),
      ContentType: file.type,
    })
  );

  return NextResponse.json({ key });
}
