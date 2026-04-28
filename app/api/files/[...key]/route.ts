export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import r2 from "@/lib/r2";

type Params = { params: Promise<{ key: string[] }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { key } = await params;
  const objectKey = key.join("/");

  const url = await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: objectKey,
    }),
    { expiresIn: 3600 }
  );

  return NextResponse.redirect(url);
}
