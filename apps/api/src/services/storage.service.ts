// api/src/services/storage.service.ts

import * as Minio from 'minio';
import { Readable } from 'stream';

class StorageService {
  // FIX: Make client optional (?) because it might not be initialized if creds are missing
  private client?: Minio.Client;
  private bucketName = process.env.MINIO_BUCKET || 'clinicfact-uploads';

  constructor() {
    const accessKey = process.env.MINIO_ACCESS_KEY;
    const secretKey = process.env.MINIO_SECRET_KEY;

    if (!accessKey || !secretKey) {
      console.error('❌ MinIO credentials not set. File upload will not work.');
      console.log('Please set MINIO_ACCESS_KEY and MINIO_SECRET_KEY in .env');
      return;
    }

    this.client = new Minio.Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey,
      secretKey,
    });

    console.log(`📦 MinIO client initialized: ${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`);
    this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      // FIX: Check if client exists before using it
      if (!this.client) return;

      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        console.log(`✅ Created MinIO bucket: ${this.bucketName}`);
      } else {
        console.log(`✅ MinIO bucket exists: ${this.bucketName}`);
      }
    } catch (error: any) {
      if (error.code === 'AccessDenied') {
        console.error('❌ MinIO Access Denied - Check credentials in .env');
      } else {
        console.error('❌ Error checking/creating MinIO bucket:', error.message);
      }
    }
  }

  /**
   * Helper to clean file keys before usage
   * Removes bucket name prefix if present and decodes URI characters
   */
  private cleanKey(key: string): string {
    let clean = key;
    // Strip bucket name if it was accidentally saved in the key
    if (clean.startsWith(`${this.bucketName}/`)) {
      clean = clean.replace(`${this.bucketName}/`, '');
    }
    // Fix double encoding (e.g., %2520 -> %20 -> space)
    return decodeURIComponent(clean);
  }

  /**
   * Upload a file to MinIO
   * Returns: The unique Key (filename) to store in the DB
   */
  async uploadFile(
    file: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    try {
      if (!this.client) throw new Error('MinIO client not initialized');

      // 1. Sanitize filename (replace spaces/special chars with underscores)
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      // 2. Add Timestamp to make it unique
      const uniqueKey = `${Date.now()}-${sanitizedName}`;

      await this.client.putObject(
        this.bucketName,
        uniqueKey,
        file,
        file.length,
        {
          'Content-Type': mimeType,
        }
      );

      // 3. Return ONLY the key, not the bucket path
      return uniqueKey;
    } catch (error: any) {
      console.error('❌ Error uploading file:', error);
      throw new Error(`Failed to upload file: ${error?.message || error}`);
    }
  }

  /**
   * Upload from stream
   */
  async uploadStream(
    stream: Readable,
    fileName: string,
    mimeType: string,
    size?: number
  ): Promise<string> {
    try {
      if (!this.client) throw new Error('MinIO client not initialized');

      const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueKey = `${Date.now()}-${sanitizedName}`;

      await this.client.putObject(
        this.bucketName,
        uniqueKey,
        stream,
        size,
        {
          'Content-Type': mimeType,
        }
      );

      return uniqueKey;
    } catch (error: any) {
      console.error('❌ Error uploading stream:', error);
      throw new Error(`Failed to upload stream: ${error?.message || error}`);
    }
  }

  /**
   * Download a file from MinIO
   */
  async downloadFile(fileKey: string): Promise<Buffer> {
    try {
      if (!this.client) throw new Error('MinIO client not initialized');

      const finalKey = this.cleanKey(fileKey);
      console.log(`📦 Downloading '${finalKey}' from bucket '${this.bucketName}'`);

      const stream = await this.client.getObject(this.bucketName, finalKey);
      const chunks: Buffer[] = [];

      return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    } catch (error: any) {
      console.error(`❌ Error downloading file (${fileKey}):`, error.message);
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Get a readable stream for a file
   */
  async getFileStream(fileKey: string): Promise<Readable> {
    try {
      if (!this.client) throw new Error('MinIO client not initialized');
      const finalKey = this.cleanKey(fileKey);
      return await this.client.getObject(this.bucketName, finalKey);
    } catch (error) {
      console.error('❌ Error getting file stream:', error);
      throw new Error('Failed to get file stream');
    }
  }

  /**
   * Delete a file from MinIO
   */
  async deleteFile(fileKey: string): Promise<void> {
    try {
      if (!this.client) throw new Error('MinIO client not initialized');
      const finalKey = this.cleanKey(fileKey);
      await this.client.removeObject(this.bucketName, finalKey);
    } catch (error) {
      console.error('❌ Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get a presigned URL for temporary access
   */
  async getFileUrl(fileKey: string, expirySeconds = 3600): Promise<string> {
    try {
      if (!this.client) throw new Error('MinIO client not initialized');
      const finalKey = this.cleanKey(fileKey);
      return await this.client.presignedGetObject(
        this.bucketName,
        finalKey,
        expirySeconds
      );
    } catch (error) {
      console.error('❌ Error generating presigned URL:', error);
      throw new Error('Failed to generate file URL');
    }
  }

  /**
   * Get file metadata
   */
  async getFileInfo(fileKey: string) {
    try {
      if (!this.client) throw new Error('MinIO client not initialized');
      const finalKey = this.cleanKey(fileKey);
      return await this.client.statObject(this.bucketName, finalKey);
    } catch (error) {
      console.error('❌ Error getting file info:', error);
      throw new Error('Failed to get file info');
    }
  }

  /**
   * List files with prefix
   */
  async listFiles(prefix: string = ''): Promise<string[]> {
    try {
      if (!this.client) throw new Error('MinIO client not initialized');
      const files: string[] = [];
      const stream = this.client.listObjects(this.bucketName, prefix, true);

      return new Promise((resolve, reject) => {
        stream.on('data', (obj) => {
          if (obj.name) files.push(obj.name);
        });
        stream.on('end', () => resolve(files));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('❌ Error listing files:', error);
      throw new Error('Failed to list files');
    }
  }

  /**
   * Copy a file
   */
  async copyFile(sourceKey: string, destFileName: string): Promise<string> {
    try {
      if (!this.client) throw new Error('MinIO client not initialized');
      const finalSourceKey = this.cleanKey(sourceKey);
      const sanitizedDest = destFileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const finalDestKey = `${Date.now()}-${sanitizedDest}`;

      const conds = new Minio.CopyConditions();
      await this.client.copyObject(
        this.bucketName,
        finalDestKey,
        `/${this.bucketName}/${finalSourceKey}`,
        conds
      );

      return finalDestKey;
    } catch (error) {
      console.error('❌ Error copying file:', error);
      throw new Error('Failed to copy file');
    }
  }
}

export default new StorageService();