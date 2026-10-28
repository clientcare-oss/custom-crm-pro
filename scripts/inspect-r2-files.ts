import { r2Client, R2_CONFIG } from "../server/_core/r2Client";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";

async function main() {
  console.log("Listing objects in R2 bucket:", R2_CONFIG.bucketName);
  try {
    let isTruncated: boolean | undefined = true;
    let continuationToken: string | undefined = undefined;
    const allObjects: any[] = [];

    while (isTruncated) {
      const command = new ListObjectsV2Command({
        Bucket: R2_CONFIG.bucketName,
        ContinuationToken: continuationToken,
      });

      const response = await r2Client.send(command);
      if (response.Contents) {
        allObjects.push(...response.Contents);
      }
      isTruncated = response.IsTruncated;
      continuationToken = response.NextContinuationToken;
    }

    console.log(`Total objects in R2 bucket: ${allObjects.length}`);
    for (const obj of allObjects) {
      console.log(`- Key: ${obj.Key}, Size: ${obj.Size}, LastModified: ${obj.LastModified}`);
    }
  } catch (error) {
    console.error("Error listing R2 objects:", error);
  }
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
