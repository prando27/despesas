import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

const BUCKET = process.env.BUCKET_NAME || "despesas-receipts";

const s3 = new S3Client({
  region: process.env.BUCKET_REGION || "auto",
  endpoint: process.env.BUCKET_ENDPOINT,
  forcePathStyle: process.env.BUCKET_FORCE_PATH_STYLE !== "false",
  credentials: {
    accessKeyId: process.env.BUCKET_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.BUCKET_SECRET_ACCESS_KEY || "",
  },
});

export async function uploadReceipt(userId: string, imageBase64: string, mediaType: string): Promise<string> {
  const buffer = Buffer.from(imageBase64, "base64");
  const ext = mediaType === "image/png" ? "png" : "jpg";
  const key = `receipts/${userId}/${randomUUID()}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mediaType,
  }));
  return key;
}

export async function getReceiptUrl(key: string): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }), { expiresIn: 3600 });
}

export async function getReceiptBuffer(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await s3.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  }));
  const bytes = await response.Body!.transformToByteArray();
  return {
    buffer: Buffer.from(bytes),
    contentType: response.ContentType || "image/jpeg",
  };
}
