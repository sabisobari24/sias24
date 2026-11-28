import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
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
      const cleaned = String(opt || '').trim();
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
    ? rawCorrect.map((x) => String(x || '').trim()).filter(Boolean)
    : typeof rawCorrect === 'string' && rawCorrect.trim()
      ? [rawCorrect.trim()]
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
      const partial = options.find((o) =>
        o.replace(/^[A-Ea-e][.):\s]+/, '').trim().toLowerCase() === cleanAns
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
          const result = await mammoth.extractRawText({ buffer: buf });
          documentText = (result.value || '').trim();
        } catch (docErr) {
          console.error('Mammoth DOCX extract error:', docErr);
          return res.status(400).json({
            error: 'Gagal membaca isi file DOCX. Pastikan file DOCX valid dan tidak terkunci password.',
          });
        }
      } else if (!documentText && cleanBase64 && isPlainText) {
        documentText = Buffer.from(cleanBase64, 'base64').toString('utf-8').trim();
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
        `Tugas Anda: Baca dan ekstrak SELURUH butir soal dari dokumen yang diberikan, lalu ubah ke format JSON terstruktur untuk Bank Soal CBT.`,
        `Aturan ketat:`,
        `1. Pertahankan makna, angka, rumus, dan teks asli soal secara akurat dalam Bahasa Indonesia.`,
        `2. Klasifikasikan tipe soal menjadi salah satu dari:`,
        `   - "pilihan_ganda": soal pilihan ganda 1 jawaban benar (wajib memiliki 4 atau 5 opsi berawalan "A. ", "B. ", "C. ", "D. ").`,
        `   - "pilihan_ganda_kompleks": pilihan ganda dengan lebih dari 1 jawaban benar.`,
        `   - "campuran": isian singkat / menjodohkan dengan jawaban ringkas.`,
        `   - "essay": soal uraian / essay terbuka.`,
        `3. Untuk "pilihan_ganda" dan "pilihan_ganda_kompleks", isi "correctAnswers" menggunakan teks opsi PERSIS seperti yang tercantum di "options" (misal ["B. 45 cm"]). Jika kunci jawaban tercantum di bagian bawah dokumen atau ditandai, gunakan kunci jawaban tersebut. Jika tidak tercantum, tentukan jawaban paling tepat secara akademis.`,
        `4. Jika soal mengandung rumus matematika/kimia/fisika terpisah, isi field "formula" (opsional).`,
        `5. Jangan sertakan nomor urut soal (misal "1. ") di awal teks pertanyaan karena sistem CBT menomori otomatis.`,
      ]
        .filter(Boolean)
        .join('\n');

      const ai = new GoogleGenAI({ apiKey });
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

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: [{ role: 'user', parts }],
        config: {
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
          responseMimeType: 'application/json',
          responseSchema: {
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
          },
        },
      });

      const rawText = response.text || '{}';
      let parsed: { questions?: any[] } = {};
      try {
        parsed = JSON.parse(rawText);
      } catch {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        }
      }

      const rawQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];
      if (rawQuestions.length === 0) {
        return res.status(422).json({
          error: 'Tidak ada butir soal yang berhasil dikenali dari dokumen tersebut.',
        });
      }

      const timestamp = Date.now();
      const normalizedQuestions: GeneratedQuestionPayload[] = rawQuestions
        .map((q, idx) => {
          const type = normalizeQuestionType(q?.type);
          const cleanedText = String(q?.text || '')
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

      return res.json({
        questions: normalizedQuestions,
        count: normalizedQuestions.length,
      });
    } catch (err: any) {
      console.error('Error generating CBT questions from document:', err);
      return res.status(500).json({
        error: err?.message || 'Terjadi kesalahan saat memproses dokumen soal.',
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
