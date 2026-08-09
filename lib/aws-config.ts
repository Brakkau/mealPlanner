import { S3Client } from "@aws-sdk/client-s3";

export function getBucketConfig() {
  return {
    bucketName: process.env.AWS_BUCKET_NAME ?? "",
    folderPrefix: process.env.AWS_FOLDER_PREFIX ?? ""
  };
}

export function createS3Client() {
  const endpoint = process.env.AWS_ENDPOINT_URL?.trim();
  const region = process.env.AWS_REGION || "eu-central-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();

  return new S3Client({
    region,
    ...(accessKeyId && secretAccessKey
      ? {
          credentials: {
            accessKeyId,
            secretAccessKey
          }
        }
      : {}),
    ...(endpoint
      ? {
          endpoint,
          forcePathStyle: true
        }
      : {})
  });
}
