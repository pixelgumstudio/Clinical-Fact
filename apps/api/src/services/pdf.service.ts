// api/src/services/pdf.service.ts

import storageService from './storage.service';

// 1. Require the library safely
let pdfLib: any;
try {
  pdfLib = require('pdf-parse');
} catch (error) {
  console.error('❌ Critical: "pdf-parse" not found. Run "npm install pdf-parse"');
}

interface PdfExtractionResult {
  text: string;
  pages: number;
  info: any;
  metadata: any;
  pdfType?: 'pure_text' | 'scanned' | 'hybrid';
  textExtractability?: number; // 0-100%
}

interface PdfDetectionResult {
  pdfType: 'pure_text' | 'scanned' | 'hybrid';
  textExtractability: number;
  pageCount: number;
  recommendOCR: boolean;
}

class PdfService {
  /**
   * Intelligently resolves the PDF parser function/class from the imported library
   */
  private getParser() {
    // Case A: The library itself is the function (Standard CommonJS)
    if (typeof pdfLib === 'function') {
      return pdfLib;
    }
    
    // Case B: The library is inside .default (ES Module Interop)
    if (pdfLib && typeof pdfLib.default === 'function') {
      return pdfLib.default;
    }

    // Case C: The library is inside .PDFParse (Some forks)
    if (pdfLib && typeof pdfLib.PDFParse === 'function') {
      return pdfLib.PDFParse;
    }

    // Debugging: If we can't find it, log what we DO have
    console.error('❌ Could not resolve pdf-parse function. Library exports:', Object.keys(pdfLib || {}));
    throw new Error('pdf-parse library is installed but incompatible. Check server logs.');
  }

  /**
   * Executes the parser against the installed pdf-parse version's real API.
   * v2.x (what package.json's "^2.4.5" actually resolves to) exports a `PDFParse`
   * CLASS with async getText()/getInfo() methods — not the v1.x plain callable
   * function this file originally targeted. Confirmed against the installed
   * package's .d.ts: the class takes a LoadParameters object (`{ data }`), and
   * getText() returns a TextResult (`{ text, total, pages[] }`) — there is no
   * `.numpages` field, which is what previously made page counts always read 0.
   */
  private async runParser(buffer: Buffer): Promise<{ text: string; pageCount: number; info: any }> {
    const parser = this.getParser();
    const data = new Uint8Array(buffer);

    // v2.x: a class exposing getText()/getInfo(). These MUST be called sequentially,
    // not concurrently (e.g. via Promise.all) — calling both at once on the same
    // instance races pdfjs-dist's worker postMessage transport and throws
    // "Cannot transfer object of unsupported type." (confirmed by reproduction).
    if (parser.prototype && typeof parser.prototype.getText === 'function') {
      const instance = new parser({ data });
      try {
        const textResult = await instance.getText();
        const infoResult = await instance.getInfo();
        return {
          text: textResult.text || '',
          pageCount: textResult.total ?? infoResult.total ?? 0,
          info: infoResult.info || {},
        };
      } finally {
        await instance.destroy();
      }
    }

    // v1.x fallback: plain function returning { text, numpages, info } directly
    const legacyResult = await parser(buffer);
    return {
      text: legacyResult.text || '',
      pageCount: legacyResult.numpages || 0,
      info: legacyResult.info || {},
    };
  }

  /**
   * NEW: Detect PDF type (text-based vs scanned/image-based)
   * Returns: pure_text, scanned, or hybrid
   */
  async detectPdfType(pdfBuffer: Buffer): Promise<PdfDetectionResult> {
    try {
      console.log(`🔍 Detecting PDF type...`);

      if (!pdfLib) throw new Error('pdf-parse library is missing.');

      const data = await this.runParser(pdfBuffer);
      const pageCount = data.pageCount || 0;
      const extractedText = data.text ? data.text.trim() : '';
      const textLength = extractedText.length;

      // Calculate text extractability percentage
      const textExtractability = Math.min(100, (textLength / (pageCount * 500)) * 100);

      // Classification logic
      let pdfType: 'pure_text' | 'scanned' | 'hybrid';
      let recommendOCR = false;

      if (textLength === 0 && pageCount > 0) {
        // No text extracted = scanned/image-based PDF
        pdfType = 'scanned';
        recommendOCR = true;
        console.log('📸 Detected: SCANNED PDF (image-based) - OCR recommended');
      } else if (textExtractability >= 80) {
        // High text content = pure text PDF
        pdfType = 'pure_text';
        console.log('📄 Detected: PURE TEXT PDF (text-based)');
      } else {
        // Some text, some images = hybrid
        pdfType = 'hybrid';
        console.log('🔀 Detected: HYBRID PDF (mixed content)');
      }

      return {
        pdfType,
        textExtractability: Math.round(textExtractability),
        pageCount,
        recommendOCR,
      };

    } catch (error: any) {
      console.error('❌ PDF Type Detection Error:', error);
      // Default to scanned if detection fails
      return {
        pdfType: 'scanned',
        textExtractability: 0,
        pageCount: 0,
        recommendOCR: true,
      };
    }
  }

  /**
   * Extract text from a PDF buffer directly (without downloading from storage)
   * NOW: Includes type detection + progress callback
   */
  async extractTextFromBuffer(pdfBuffer: Buffer, onProgress?: (progress: number) => void): Promise<PdfExtractionResult> {
    try {
      console.log(`📄 PDF Processing from buffer (${pdfBuffer.length} bytes)`);

      if (!pdfLib) throw new Error('pdf-parse library is missing.');

      // Update progress: Detection started
      onProgress?.(10);

      // First, detect PDF type
      const detection = await this.detectPdfType(pdfBuffer);
      onProgress?.(30);

      // Parse the PDF
      const data = await this.runParser(pdfBuffer);
      onProgress?.(60);

      // Validation & Cleaning
      const cleanText = data.text ? data.text.trim() : '';
      const pageCount = data.pageCount || 0;

      // Check for "Scanned PDF" scenario (Empty text)
      if (cleanText.length === 0 && pageCount > 0) {
        console.warn('⚠️ PDF is scanned (image-based) - text extraction returned 0 characters.');
      }

      console.log(`✅ Extracted ${cleanText.length} chars from ${pageCount} pages (${detection.pdfType})`);

      onProgress?.(90);

      return {
        text: cleanText,
        pages: pageCount,
        info: data.info || {},
        pdfType: detection.pdfType,
        textExtractability: detection.textExtractability,
        metadata: {
          title: data.info?.Title,
          author: data.info?.Author,
          subject: data.info?.Subject,
          keywords: data.info?.Keywords,
          creationDate: data.info?.CreationDate,
          modificationDate: data.info?.ModDate,
        }
      };

    } catch (error: any) {
      console.error('❌ PDF Extraction Error:', error);

      // Provide actionable error messages
      if (error.message.includes('Invalid PDF')) {
        throw new Error('File is corrupted or not a valid PDF.');
      }

      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * Main extraction method - downloads file from storage and extracts text
   * NOW: Supports progress tracking callback
   */
  async extractText(fileKey: string, onProgress?: (progress: number) => void): Promise<PdfExtractionResult> {
    try {
      console.log(`📄 PDF Processing: ${fileKey}`);

      if (!pdfLib) throw new Error('pdf-parse library is missing.');

      // 1. Download
      onProgress?.(5);
      const pdfBuffer = await storageService.downloadFile(fileKey);
      onProgress?.(15);

      // 2. Use the buffer extraction method with progress callback
      return await this.extractTextFromBuffer(pdfBuffer, (progress) => {
        // Scale progress from 15-95 for extraction phase
        onProgress?.(15 + (progress * 0.8));
      });

    } catch (error: any) {
      console.error('❌ PDF Extraction Error:', error);
      throw new Error(`PDF processing failed: ${error.message}`);
    }
  }

  /**
   * NEW: Check if PDF is scanned (needs OCR)
   */
  async isScannedPdf(fileKey: string): Promise<boolean> {
    try {
      const pdfBuffer = await storageService.downloadFile(fileKey);
      const detection = await this.detectPdfType(pdfBuffer);
      return detection.pdfType === 'scanned' || detection.recommendOCR;
    } catch (error: any) {
      console.error('❌ Error checking if PDF is scanned:', error);
      return false;
    }
  }

  async extractTextFromPages(fileKey: string, _startPage: number, _endPage: number): Promise<string> {
    const result = await this.extractText(fileKey);
    return result.text; 
  }

  async getMetadata(fileKey: string): Promise<any> {
    const result = await this.extractText(fileKey);
    return result.metadata;
  }
}

export default new PdfService(); 