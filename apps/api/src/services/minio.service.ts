//  apps/api/src/services/minio.service.ts

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

// Instantiate S3 Client compatible with MinIO
const s3Client = new S3Client({
    endpoint: `http://${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`,
    region: 'us-east-1', // Required but arbitrary for MinIO
    forcePathStyle: true, // Crucial for MinIO compatibility
    credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY as string,
        secretAccessKey: process.env.MINIO_SECRET_KEY as string,
    },
});

const BUCKET_NAME = process.env.MINIO_BUCKET as string;

class MinioService {
    /**
     * Uploads a stream (e.g., audio from yt-dlp) to MinIO.
     * @param key The file path within the bucket.
     * @param body The audio stream.
     * @returns The MinIO Key (path).
     */
    async uploadStream(key: string, body: Readable): Promise<string> {
        try {
            console.log(`📤 Starting upload to MinIO: ${key}`);

            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                Body: body,
                ContentType: 'audio/mpeg',
            });

            await s3Client.send(command);
            console.log(`⬆️ Successfully uploaded audio to MinIO: ${key}`);
            return key;
        } catch (error: any) {
            console.error(`❌ MinIO upload failed for ${key}:`, error.message);
            throw new Error(`Failed to upload to MinIO: ${error.message}`);
        }
    }

    /**
     * Uploads a Buffer to MinIO. Uses ContentLength so the S3 SDK doesn't need to
     * infer it from a stream (avoids "x-amz-decoded-content-length: undefined" errors).
     */
    async uploadBuffer(key: string, buffer: Buffer): Promise<string> {
        try {
            console.log(`📤 Uploading buffer to MinIO: ${key} (${buffer.length} bytes)`);

            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: key,
                Body: buffer,
                ContentType: 'audio/mpeg',
                ContentLength: buffer.length,
            });

            await s3Client.send(command);
            console.log(`⬆️ Successfully uploaded buffer to MinIO: ${key}`);
            return key;
        } catch (error: any) {
            console.error(`❌ MinIO buffer upload failed for ${key}:`, error.message);
            throw new Error(`Failed to upload to MinIO: ${error.message}`);
        }
    }

    /**
     * Generates a pre-signed URL for temporary external access (used by Whisper).
     * @param key The file path within the bucket.
     * @param expiresInSeconds The URL validity duration in seconds.
     * @returns A temporary public URL.
     */
    async getPresignedUrl(key: string, expiresInSeconds: number = 3600): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        // Use the internal network endpoint for the MinIO service (minio:9000)
        // Note: For Whisper to access this, MinIO needs to be reachable by the URL
        // generated here. Since Whisper is in the same network, using the internal
        // hostname 'minio' should work if MinIO permissions allow it.
        // If it fails, you may need to use a public endpoint if MinIO is configured externally.
        const url = await getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
        
        // IMPORTANT: Replace the external IP/hostname (if generated) with the internal Docker hostname 'minio'
        // to ensure the Whisper service can reach it over the Docker network.
        const internalUrl = url.replace(/([^/]+):(\d+)\/([^/]+)/, `minio:${process.env.MINIO_PORT}/${BUCKET_NAME}`);
        return internalUrl;
    }


    /**
     * Deletes a file from MinIO.
     * @param key The file path within the bucket.
     */
    async deleteFile(key: string): Promise<void> {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        await s3Client.send(command);
        console.log(`🗑️ Successfully deleted audio from MinIO: ${key}`);
    }
}

export default new MinioService();