import { Injectable } from '@nestjs/common';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { loadEnv } from '@manzhushaka/config';

@Injectable()
export class BosStorageService {
  private readonly env = loadEnv();
  private readonly client =
    this.env.BOS_ENDPOINT && this.env.BOS_ACCESS_KEY_ID && this.env.BOS_SECRET_ACCESS_KEY
      ? new S3Client({
          endpoint: this.env.BOS_ENDPOINT,
          region: this.env.BOS_REGION,
          forcePathStyle: true,
          credentials: {
            accessKeyId: this.env.BOS_ACCESS_KEY_ID,
            secretAccessKey: this.env.BOS_SECRET_ACCESS_KEY,
          },
        })
      : null;

  isConfigured() {
    return Boolean(this.client && this.env.BOS_BUCKET);
  }

  async createDownloadUrl(key: string) {
    if (!this.client || !this.env.BOS_BUCKET) throw new Error('BOS 尚未配置。');
    if (!key || key.includes('..') || key.startsWith('/')) throw new Error('对象 Key 不合法。');
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.env.BOS_BUCKET, Key: key }),
      { expiresIn: this.env.BOS_SIGNED_URL_TTL_SECONDS },
    );
  }

  async putObject(key: string, body: Uint8Array | string, contentType: string) {
    if (!this.client || !this.env.BOS_BUCKET) throw new Error('BOS 尚未配置。');
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.env.BOS_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      }),
    );
  }
}
