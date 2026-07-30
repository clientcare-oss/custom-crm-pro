import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const R2_CONFIG = {
  endpoint:
    process.env.R2_ENDPOINT ||
    "https://fa65a33e99b08d8202d3afa0b305a1c4.r2.cloudflarestorage.com",
  accessKeyId:
    process.env.R2_ACCESS_KEY_ID || "3e4da7eb0cfc3cbf06c5fe73f7f13786",
  secretAccessKey:
    process.env.R2_SECRET_ACCESS_KEY ||
    "a40e5c8c274e67bf19c3ec3b1a75927588322c29e298003b5abd7ddcdafc8be2",
  bucketName: process.env.R2_BUCKET_NAME || "custom-crm-pro",
};

export const r2Client = new S3Client({
  region: "auto",
  endpoint: R2_CONFIG.endpoint,
  credentials: {
    accessKeyId: R2_CONFIG.accessKeyId,
    secretAccessKey: R2_CONFIG.secretAccessKey,
  },
});

/**
 * Generates a presigned PUT URL for uploading a file directly to R2.
 */
export async function getR2SignedUploadUrl(
  key: string,
  contentType: string = "application/octet-stream",
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Generates a presigned GET URL for downloading a file directly from R2.
 */
export async function getR2SignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
  });

  return await getSignedUrl(r2Client, command, { expiresIn });
}

/**
 * Uploads data directly to R2 using S3Client.
 */
export async function uploadToR2(
  key: string,
  data: Buffer | Uint8Array | string,
  contentType: string = "application/octet-stream"
): Promise<void> {
  const body =
    typeof data === "string"
      ? Buffer.from(data)
      : data instanceof Buffer
      ? data
      : Buffer.from(data);

  const command = new PutObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await r2Client.send(command);
}

/**
 * Deletes an object from R2.
 */
export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: R2_CONFIG.bucketName,
    Key: key,
  });

  await r2Client.send(command);
}
