import express from 'express';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import mammoth from 'mammoth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

type CbtQuestionType = 'pilihan_ganda' | 'pilihan_ganda_kompleks' | 'campuran' | 'essay';

interface GeneratedQuestionPayload {
  id: string;
  type: CbtQuestionType;
  text: string;
  options: string[];
  correctAnswers: string[];
  weight: number;
  formula?: string;
}

function normalizeQuestionType(rawType?: string): CbtQuestionType {
  const val = String(rawType || '').toLowerCase().trim();
  if (val === 'pilihan_ganda_kompleks' || val.includes('kompleks')) return 'pilihan_ganda_kompleks';
  if (val === 'campuran' || val.includes('isian') || val.includes('singkat')) return 'campuran';
  if (val === 'essay' || val.includes('uraian')) return 'essay';
  return 'pilihan_ganda';
}

function normalizeOptionList(rawOptions: unknown): string[] {
  if (!Array.isArray(rawOptions)) return [];
  return rawOptions
    .map((opt, idx) => {
      const cleaned = String(opt || '')
        .replace(/\[KUNCI_(?:MERAH|TERTANDAI)\]/gi, '')
        .trim();
      if (!cleaned) return '';
      const letter = String.fromCharCode(65 + idx);
      const withoutPrefix = cleaned.replace(/^[A-Ea-e][.):\s]+/, '').trim();
      return `${letter}. ${withoutPrefix || cleaned}`;
    })
    .filter(Boolean)
    .slice(0, 5);
}

function alignCorrectAnswers(
  type: CbtQuestionType,
  options: string[],
  rawCorrect: unknown
): string[] {
  const list = Array.isArray(rawCorrect)
    ? rawCorrect.map((x) => String(x || '').replace(/\[KUNCI_(?:MERAH|TERTANDAI)\]/gi, '').trim()).filter(Boolean)
    : typeof rawCorrect === 'string' && rawCorrect.trim()
      ? [rawCorrect.replace(/\[KUNCI_(?:MERAH|TERTANDAI)\]/gi, '').trim()]
      : [];

  if (type === 'pilihan_ganda' || type === 'pilihan_ganda_kompleks') {
    if (options.length === 0) return [];
    const matched: string[] = [];

    for (const ans of list) {
      const exact = options.find((o) => o.toLowerCase() === ans.toLowerCase());
      if (exact && !matched.includes(exact)) {
        matched.push(exact);
        continue;
      }

      const letterMatch = ans.match(/^([A-Ea-e])(?:[.):\s]|$)/);
      if (letterMatch) {
        const idx = letterMatch[1].toUpperCase().charCodeAt(0) - 65;
        if (options[idx] && !matched.includes(options[idx])) {
          matched.push(options[idx]);
          continue;
        }
      }

      const cleanAns = ans.replace(/^[A-Ea-e][.):\s]+/, '').trim().toLowerCase();
      const partial = options.find(
        (o) => o.replace(/^[A-Ea-e][.):\s]+/, '').trim().toLowerCase() === cleanAns
      );
      if (partial && !matched.includes(partial)) {
        matched.push(partial);
      }
    }

    if (matched.length === 0) {
      matched.push(options[0]);
    }
    return type === 'pilihan_ganda' ? [matched[0]] : matched;
  }

  return list.length > 0 ? [list[0]] : ['Sesuai kunci jawaban pada dokumen soal.'];
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function isRedHexColor(hex: string): boolean {
  const clean = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return r >= 150 && g <= 95 && b <= 95;
}

function convertOmmlToReadableText(omml: string): string {
  let out = omml;
  // Convert fractions <m:f>...<m:num>A</m:num>...<m:den>B</m:den>...</m:f> iteratively (handles nested fractions too)
  for (let pass = 0; pass < 4; pass++) {
    const next = out.replace(
      /<m:f\b[^>]*>[\s\S]*?<m:num\b[^>]*>([\s\S]*?)<\/m:num>[\s\S]*?<m:den\b[^>]*>([\s\S]*?)<\/m:den>[\s\S]*?<\/m:f>/g,
      (_, numXml, denXml) => {
        const num = decodeXmlEntities(numXml.replace(/<[^>]+>/g, '')).trim();
        const den = decodeXmlEntities(denXml.replace(/<[^>]+>/g, '')).trim();
        if (!num && !den) return '';
        const fmtNum = /[\s+\-×÷]/.test(num) ? `(${num})` : num;
        const fmtDen = /[\s+\-×÷]/.test(den) ? `(${den})` : den;
        return ` ${fmtNum}/${fmtDen} `;
      }
    );
    if (next === out) break;
    out = next;
  }

  // Superscripts & subscripts
  out = out.replace(
    /<m:sSup\b[^>]*>[\s\S]*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:sup\b[^>]*>([\s\S]*?)<\/m:sup>[\s\S]*?<\/m:sSup>/g,
    (_, baseXml, supXml) => {
      const base = decodeXmlEntities(baseXml.replace(/<[^>]+>/g, '')).trim();
      const sup = decodeXmlEntities(supXml.replace(/<[^>]+>/g, '')).trim();
      return `${base}^${sup}`;
    }
  );
  out = out.replace(
    /<m:sSub\b[^>]*>[\s\S]*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<m:sub\b[^>]*>([\s\S]*?)<\/m:sub>[\s\S]*?<\/m:sSub>/g,
    (_, baseXml, subXml) => {
      const base = decodeXmlEntities(baseXml.replace(/<[^>]+>/g, '')).trim();
      const sub = decodeXmlEntities(subXml.replace(/<[^>]+>/g, '')).trim();
      return `${base}_${sub}`;
    }
  );

  // Radicals
  out = out.replace(
    /<m:rad\b[^>]*>[\s\S]*?<m:e\b[^>]*>([\s\S]*?)<\/m:e>[\s\S]*?<\/m:rad>/g,
    (_, bodyXml) => {
      const body = decodeXmlEntities(bodyXml.replace(/<[^>]+>/g, '')).trim();
      return `√(${body})`;
    }
  );

  return decodeXmlEntities(out.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function extractZipEntryBuffer(zipBuffer: Buffer, targetName: string): Buffer | null {
  try {
    // Locate End of Central Directory record (PK\x05\x06) scanning backwards
    let eocdOffset = -1;
    const minOffset = Math.max(0, zipBuffer.length - 65557);
    for (let i = zipBuffer.length - 22; i >= minOffset; i--) {
      if (
        zipBuffer[i] === 0x50 &&
        zipBuffer[i + 1] === 0x4b &&
        zipBuffer[i + 2] === 0x05 &&
        zipBuffer[i + 3] === 0x06
      ) {
        eocdOffset = i;
        break;
      }
    }
    if (eocdOffset === -1) return null;

    const totalEntries = zipBuffer.readUInt16LE(eocdOffset + 10);
    const centralDirOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
    let cursor = centralDirOffset;

    for (let idx = 0; idx < totalEntries && cursor + 46 <= zipBuffer.length; idx++) {
      if (
        zipBuffer[cursor] !== 0x50 ||
        zipBuffer[cursor + 1] !== 0x4b ||
        zipBuffer[cursor + 2] !== 0x01 ||
        zipBuffer[cursor + 3] !== 0x02
      ) {
        break;
      }

      const compressionMethod = zipBuffer.readUInt16LE(cursor + 10);
      const compressedSize = zipBuffer.readUInt32LE(cursor + 20);
      const fileNameLen = zipBuffer.readUInt16LE(cursor + 28);
      const extraLen = zipBuffer.readUInt16LE(cursor + 30);
      const commentLen = zipBuffer.readUInt16LE(cursor + 32);
      const localHeaderOffset = zipBuffer.readUInt32LE(cursor + 42);

      const entryName = zipBuffer.toString('utf8', cursor + 46, cursor + 46 + fileNameLen);
      cursor += 46 + fileNameLen + extraLen + commentLen;

      if (entryName === targetName) {
        if (localHeaderOffset + 30 > zipBuffer.length) return null;
        const localNameLen = zipBuffer.readUInt16LE(localHeaderOffset + 26);
        const localExtraLen = zipBuffer.readUInt16LE(localHeaderOffset + 28);
        const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
        const compressedData = zipBuffer.subarray(dataStart, dataStart + compressedSize);
        if (compressionMethod === 0) return compressedData;
        if (compressionMethod === 8) return zlib.inflateRawSync(compressedData);
        return null;
      }
    }
  } catch (err) {
    console.warn('ZIP parse warning:', err);
  }
  return null;
}

function extractRichDocxText(docxBuffer: Buffer): string {
  const xmlBuf = extractZipEntryBuffer(docxBuffer, 'word/document.xml');
  if (!xmlBuf) return '';
  const xml = xmlBuf.toString('utf8');

  const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
  const lines: string[] = [];

  for (const pXml of paragraphs) {
    // Replace OMML math blocks inside this paragraph with readable math notation first
    let working = pXml.replace(/<m:oMathPara\b[\s\S]*?<\/m:oMathPara>/g, (m) => ` ${convertOmmlToReadableText(m)} `);
    working = working.replace(/<m:oMath\b[\s\S]*?<\/m:oMath>/g, (m) => ` ${convertOmmlToReadableText(m)} `);

    // Detect whether any run in this paragraph uses red color or highlight (answer key marker)
    let hasRedColor = false;
    let hasHighlight = false;
    const runMatches = working.match(/<w:r\b[\s\S]*?<\/w:r>/g) || [];
    for (const rXml of runMatches) {
      const colorMatch = rXml.match(/<w:color\b[^>]*w:val="([^"]+)"/i);
      if (colorMatch && isRedHexColor(colorMatch[1])) {
        hasRedColor = true;
      }
      const highlightMatch = rXml.match(/<w:highlight\b[^>]*w:val="([^"]+)"/i);
      if (highlightMatch && highlightMatch[1].toLowerCase() !== 'none') {
        hasHighlight = true;
      }
    }

    // Preserve line breaks/tabs inside paragraph and decode all text runs
    const normalizedP = working
      .replace(/<w:tab\b[^>]*\/>/g, ' ')
      .replace(/<w:br\b[^>]*\/>/g, '\n')
      .replace(/<[^>]+>/g, '');

    const textLine = decodeXmlEntities(normalizedP)
      .replace(/[ \t]+/g, ' ')
      .trim();

    if (!textLine) continue;

    if (hasRedColor) {
      lines.push(`${textLine} [KUNCI_MERAH]`);
    } else if (hasHighlight) {
      lines.push(`${textLine} [KUNCI_TERTANDAI]`);
    } else {
      lines.push(textLine);
    }
  }

  return lines.join('\n').trim();
}

function decodePlainTextBuffer(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString('utf16le').replace(/^\uFEFF/, '').trim();
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    // Swap bytes for UTF-16BE
    const swapped = Buffer.allocUnsafe(buf.length - 2);
    for (let i = 2; i + 1 < buf.length; i += 2) {
      swapped[i - 2] = buf[i + 1];
      swapped[i - 1] = buf[i];
    }
    return swapped.toString('utf16le').replace(/^\uFEFF/, '').trim();
  }
  return buf.toString('utf8').replace(/^\uFEFF/, '').trim();
}

function parseQuestionsJsonWithSalvage(rawText: string): any[] {
  if (!rawText || !rawText.trim()) return [];
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    const direct = JSON.parse(cleaned);
    if (Array.isArray(direct?.questions)) return direct.questions;
    if (Array.isArray(direct)) return direct;
  } catch {
    // Continue to regex/salvage below
  }

  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      if (Array.isArray(parsed?.questions)) return parsed.questions;
    } catch {
      // Output may have been truncated mid-array; salvage complete question objects
    }
  }

  const arrayStart = cleaned.indexOf('[');
  if (arrayStart === -1) return [];

  const salvaged: any[] = [];
  let inString = false;
  let escapeNext = false;
  let depth = 0;
  let objStart = -1;

  for (let i = arrayStart + 1; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escapeNext = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && objStart !== -1) {
        const candidate = cleaned.slice(objStart, i + 1);
        try {
          const item = JSON.parse(candidate);
          if (item && typeof item === 'object' && item.text) {
            salvaged.push(item);
          }
        } catch {
          // Skip malformed fragment
        }
        objStart = -1;
      }
    }
  }

  return salvaged;
}

function formatFriendlyGeminiError(err: any): { status: number; message: string } {
  const rawMsg = String(err?.message || err || '');
  const lower = rawMsg.toLowerCase();
  const statusCode = Number(err?.status || err?.code || 0);

  if (statusCode === 503 || lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand')) {
    return {
      status: 503,
      message: 'Server AI pemroses soal sedang mengalami lonjakan trafik sementara (503). Silakan klik Generate kembali beberapa detik lagi.',
    };
  }
  if (statusCode === 429 || lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return {
      status: 429,
      message: 'Batas antrean permintaan AI sementara tercapai (429). Mohon tunggu sebentar lalu coba lagi.',
    };
  }
  if (lower.includes('api key') || lower.includes('permission_denied') || statusCode === 401 || statusCode === 403) {
    return {
      status: 500,
      message: 'Konfigurasi kunci API server belum valid atau izin ditolak.',
    };
  }
  if (lower.includes('too large') || lower.includes('payload') || statusCode === 413) {
    return {
      status: 400,
      message: 'Ukuran dokumen terlalu besar untuk diproses sekaligus. Coba kompres PDF atau bagi dokumen menjadi 2 bagian.',
    };
  }
  return {
    status: 500,
    message: 'Terjadi kendala saat memproses dokumen soal. Pastikan file tidak terenkripsi dan coba lagi.',
  };
}

function isRetryableGeminiError(err: any): boolean {
  const statusCode = Number(err?.status || err?.code || 0);
  const msg = String(err?.message || '').toLowerCase();
  return (
    statusCode === 429 ||
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('unavailable') ||
    msg.includes('high demand') ||
    msg.includes('resource_exhausted') ||
    msg.includes('timeout') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset')
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));

  app.post('/api/cbt/generate-questions', async (req, res) => {
    try {
      const {
        fileName = 'dokumen-soal',
        mimeType = '',
        fileBase64 = '',
        extractedText = '',
        subject = 'Mata Pelajaran',
        bankTitle = '',
        defaultWeight = 10,
      } = req.body || {};

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY belum tersedia di server environment.',
        });
      }

      const lowerName = String(fileName).toLowerCase();
      const cleanBase64 = String(fileBase64 || '').replace(/^data:[^;]+;base64,/, '').trim();
      let documentText = String(extractedText || '').trim();

      const isPdf = mimeType === 'application/pdf' || lowerName.endsWith('.pdf');
      const isDocx =
        mimeType.includes('wordprocessingml') ||
        lowerName.endsWith('.docx');
      const isPlainText =
        mimeType.startsWith('text/') ||
        lowerName.endsWith('.txt') ||
        lowerName.endsWith('.md') ||
        lowerName.endsWith('.csv');

      if (!documentText && cleanBase64 && isDocx) {
        try {
          const buf = Buffer.from(cleanBase64, 'base64');
          const richXmlText = extractRichDocxText(buf);
          let mammothText = '';
          try {
            const result = await mammoth.extractRawText({ buffer: buf });
            mammothText = (result.value || '').trim();
          } catch {
            /* richXmlText already extracted */
          }
          documentText = richXmlText && richXmlText.length >= Math.floor(mammothText.length * 0.7)
            ? richXmlText
            : mammothText || richXmlText;
        } catch (docErr) {
          console.error('DOCX extract error:', docErr);
          return res.status(400).json({
            error: 'Gagal membaca isi file DOCX. Pastikan file DOCX valid dan tidak terkunci password.',
          });
        }
      } else if (!documentText && cleanBase64 && isPlainText) {
        const buf = Buffer.from(cleanBase64, 'base64');
        documentText = decodePlainTextBuffer(buf);
      } else if (!documentText && cleanBase64 && lowerName.endsWith('.doc')) {
        return res.status(400).json({
          error: 'Format .doc (Word lama) belum didukung langsung. Simpan file sebagai .docx atau .pdf terlebih dahulu.',
        });
      }

      if (!isPdf && !documentText) {
        return res.status(400).json({
          error: 'Dokumen kosong atau format belum didukung. Gunakan file PDF, DOCX, atau TXT.',
        });
      }

      const promptInstruction = [
        `Anda adalah sistem konversi Bank Soal CBT Kurikulum Merdeka untuk SMPN 50 Jakarta.`,
        `Mata pelajaran: ${subject}.`,
        bankTitle ? `Judul Bank Soal: ${bankTitle}.` : '',
        `Tugas Anda: Baca dan ekstrak SELURUH butir soal dari dokumen yang diberikan tanpa terlewat satu nomor pun, lalu ubah ke format JSON terstruktur untuk Bank Soal CBT.`,
        `Aturan ketat:`,
        `1. Pertahankan makna, angka, satuan, pecahan, pangkat, dan teks asli soal secara akurat dalam Bahasa Indonesia. Tulis pecahan/pangkat dengan jelas (misal 18/24, 4 2/3, 2^3, √16).`,
        `2. Klasifikasikan tipe soal menjadi salah satu dari:`,
        `   - "pilihan_ganda": soal pilihan ganda 1 jawaban benar (wajib memiliki opsi berawalan "A. ", "B. ", "C. ", "D. ", dst.).`,
        `   - "pilihan_ganda_kompleks": pilihan ganda dengan lebih dari 1 jawaban benar.`,
        `   - "campuran": isian singkat / menjodohkan dengan jawaban ringkas.`,
        `   - "essay": soal uraian / essay terbuka.`,
        `3. DETEKSI KUNCI JAWABAN: Jika pada PDF terdapat opsi jawaban yang berwarna MERAH / dicetak tebal berbeda / digarisbawahi, atau pada teks DOCX terdapat penanda [KUNCI_MERAH] / [KUNCI_TERTANDAI], atau ada daftar kunci jawaban di dokumen, WAJIB gunakan opsi bertanda tersebut sebagai "correctAnswers". Isi "correctAnswers" menggunakan teks opsi PERSIS seperti yang tercantum di "options" (misal ["B. 45 cm"]), tanpa menyertakan label [KUNCI_MERAH]. Jika kunci tidak ditandai, tentukan jawaban paling tepat secara akademis.`,
        `4. Jika soal mengandung rumus matematika/kimia/fisika terpisah, isi field "formula" secara ringkas (opsional).`,
        `5. Jangan sertakan nomor urut soal (misal "1. " atau "12.") di awal teks pertanyaan karena sistem CBT menomori otomatis.`,
      ]
        .filter(Boolean)
        .join('\n');

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
      const parts: any[] = [];

      if (isPdf && cleanBase64) {
        parts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: cleanBase64,
          },
        });
      }
      if (documentText) {
        parts.push({
          text: `ISI DOKUMEN SOAL (${fileName}):\n\n${documentText.slice(0, 120000)}`,
        });
      }
      parts.push({ text: promptInstruction });

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: {
                  type: Type.STRING,
                  description: 'pilihan_ganda, pilihan_ganda_kompleks, campuran, atau essay',
                },
                text: {
                  type: Type.STRING,
                  description: 'Teks pertanyaan lengkap tanpa nomor soal di depan',
                },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Daftar opsi jawaban (A., B., C., D., dst.) untuk pilihan ganda; kosong untuk isian/essay',
                },
                correctAnswers: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Kunci jawaban sesuai opsi persis atau jawaban referensi essay/isian',
                },
                weight: {
                  type: Type.NUMBER,
                  description: 'Bobot poin soal (default 10)',
                },
                formula: {
                  type: Type.STRING,
                  description: 'Rumus matematika terpisah jika ada',
                },
              },
              required: ['type', 'text', 'options', 'correctAnswers'],
            },
          },
        },
        required: ['questions'],
      };

      const attempts: Array<{ model: string; useLowThinking: boolean; delayMs: number }> = [
        { model: 'gemini-4-hydrogen', useLowThinking: true, delayMs: 0 },
        { model: 'gemini-4-hydrogen', useLowThinking: true, delayMs: 900 },
        { model: 'gemini-3.1-flash-lite', useLowThinking: false, delayMs: 500 },
        { model: 'gemini-3.1-flash-lite', useLowThinking: false, delayMs: 1400 },
      ];

      let response: any = null;
      let lastErr: any = null;

      for (const attempt of attempts) {
        if (attempt.delayMs > 0) {
          await sleep(attempt.delayMs);
        }
        try {
          const config: any = {
            responseMimeType: 'application/json',
            responseSchema,
            maxOutputTokens: 32768,
          };
          if (attempt.useLowThinking) {
            config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
          }
          response = await ai.models.generateContent({
            model: attempt.model,
            contents: [{ role: 'user', parts }],
            config,
          });
          if (response?.text) break;
        } catch (err: any) {
          lastErr = err;
          console.warn(`Gemini generate-questions attempt failed (${attempt.model}):`, err?.message || err);
          if (!isRetryableGeminiError(err)) {
            throw err;
          }
        }
      }

      if (!response?.text) {
        throw lastErr || new Error('503 UNAVAILABLE');
      }

      const rawText = response.text || '{}';
      const rawQuestions = parseQuestionsJsonWithSalvage(rawText);
      if (rawQuestions.length === 0) {
        return res.status(422).json({
          error: 'Tidak ada butir soal yang berhasil dikenali dari dokumen tersebut. Pastikan file berisi teks atau PDF soal yang jelas terbaca.',
        });
      }

      const timestamp = Date.now();
      const normalizedQuestions: GeneratedQuestionPayload[] = rawQuestions
        .map((q, idx) => {
          const type = normalizeQuestionType(q?.type);
          const cleanedText = String(q?.text || '')
            .replace(/\[KUNCI_(?:MERAH|TERTANDAI)\]/gi, '')
            .trim()
            .replace(/^\d+[.)]\s+/, '')
            .trim();
          if (!cleanedText) return null;

          const options =
            type === 'pilihan_ganda' || type === 'pilihan_ganda_kompleks'
              ? normalizeOptionList(q?.options)
              : [];

          if ((type === 'pilihan_ganda' || type === 'pilihan_ganda_kompleks') && options.length < 2) {
            return null;
          }

          const correctAnswers = alignCorrectAnswers(type, options, q?.correctAnswers);
          const weightNum = Number(q?.weight);
          const weight = Number.isFinite(weightNum) && weightNum > 0 ? Math.round(weightNum) : Number(defaultWeight) || 10;
          const formula = typeof q?.formula === 'string' && q.formula.trim() ? q.formula.trim() : undefined;

          return {
            id: `q-doc-${timestamp}-${idx}`,
            type,
            text: cleanedText,
            options,
            correctAnswers,
            weight,
            ...(formula ? { formula } : {}),
          } as GeneratedQuestionPayload;
        })
        .filter((item): item is GeneratedQuestionPayload => item !== null);

      if (normalizedQuestions.length === 0) {
        return res.status(422).json({
          error: 'Format butir soal dalam dokumen belum memenuhi struktur pilihan ganda/isian/essay.',
        });
      }

      return res.json({
        questions: normalizedQuestions,
        count: normalizedQuestions.length,
      });
    } catch (err: any) {
      console.error('Error generating CBT questions from document:', err);
      const friendly = formatFriendlyGeminiError(err);
      return res.status(friendly.status).json({
        error: friendly.message,
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'mpa',
    });

    app.use((req, _res, next) => {
      if (req.url === '/login') {
        req.url = '/login.html';
      }
      next();
    });

    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));

    app.get('/login', (_req, res) => {
      res.sendFile(path.join(distDir, 'login.html'));
    });

    app.get('/login.html', (_req, res) => {
      res.sendFile(path.join(distDir, 'login.html'));
    });

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        return res.sendFile(indexFile);
      }
      return res.status(404).send('Not found');
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
