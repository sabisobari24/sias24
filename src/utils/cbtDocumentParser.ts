import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { CbtQuestion } from '../types';

if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
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

async function inflateRawBytesBrowser(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream tidak tersedia di browser.');
  }
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const safeCopy = new Uint8Array(compressed.byteLength);
  safeCopy.set(compressed);
  await writer.write(safeCopy);
  await writer.close();
  const ab = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(ab);
}

async function extractZipEntriesBrowser(
  zipBytes: Uint8Array,
  targetNames: string[]
): Promise<Record<string, Uint8Array>> {
  const result: Record<string, Uint8Array> = {};
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);

  let eocdOffset = -1;
  const minOffset = Math.max(0, zipBytes.length - 65557);
  for (let i = zipBytes.length - 22; i >= minOffset; i--) {
    if (
      zipBytes[i] === 0x50 &&
      zipBytes[i + 1] === 0x4b &&
      zipBytes[i + 2] === 0x05 &&
      zipBytes[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return result;

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirOffset = view.getUint32(eocdOffset + 16, true);
  let cursor = centralDirOffset;
  const textDecoder = new TextDecoder('utf-8');

  for (let idx = 0; idx < totalEntries && cursor + 46 <= zipBytes.length; idx++) {
    if (
      zipBytes[cursor] !== 0x50 ||
      zipBytes[cursor + 1] !== 0x4b ||
      zipBytes[cursor + 2] !== 0x01 ||
      zipBytes[cursor + 3] !== 0x02
    ) {
      break;
    }

    const compressionMethod = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const fileNameLen = view.getUint16(cursor + 28, true);
    const extraLen = view.getUint16(cursor + 30, true);
    const commentLen = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);

    const entryName = textDecoder.decode(zipBytes.subarray(cursor + 46, cursor + 46 + fileNameLen));
    cursor += 46 + fileNameLen + extraLen + commentLen;

    if (targetNames.includes(entryName)) {
      if (localHeaderOffset + 30 > zipBytes.length) continue;
      const localNameLen = view.getUint16(localHeaderOffset + 26, true);
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const compressedData = zipBytes.subarray(dataStart, dataStart + compressedSize);
      if (compressionMethod === 0) {
        result[entryName] = compressedData;
      } else if (compressionMethod === 8) {
        try {
          result[entryName] = await inflateRawBytesBrowser(compressedData);
        } catch {
          // Skip failed inflate
        }
      }
    }
  }

  return result;
}

interface NumberingMap {
  numToAbstract: Record<string, string>;
  abstractFormats: Record<string, Record<string, string>>;
}

function parseNumberingXml(numberingXml: string): NumberingMap {
  const numToAbstract: Record<string, string> = {};
  const abstractFormats: Record<string, Record<string, string>> = {};

  const abstractMatches = numberingXml.match(/<w:abstractNum\b[\s\S]*?<\/w:abstractNum>/g) || [];
  for (const abs of abstractMatches) {
    const absIdMatch = abs.match(/w:abstractNumId="([^"]+)"/);
    if (!absIdMatch) continue;
    const absId = absIdMatch[1];
    abstractFormats[absId] = {};

    const lvlMatches = abs.match(/<w:lvl\b[\s\S]*?<\/w:lvl>/g) || [];
    for (const lvl of lvlMatches) {
      const ilvlMatch = lvl.match(/w:ilvl="([^"]+)"/);
      const fmtMatch = lvl.match(/<w:numFmt\b[^>]*w:val="([^"]+)"/);
      if (ilvlMatch && fmtMatch) {
        abstractFormats[absId][ilvlMatch[1]] = fmtMatch[1];
      }
    }
  }

  const numMatches = numberingXml.match(/<w:num\b[\s\S]*?<\/w:num>/g) || [];
  for (const num of numMatches) {
    const numIdMatch = num.match(/w:numId="([^"]+)"/);
    const absRefMatch = num.match(/<w:abstractNumId\b[^>]*w:val="([^"]+)"/);
    if (numIdMatch && absRefMatch) {
      numToAbstract[numIdMatch[1]] = absRefMatch[1];
    }
  }

  return { numToAbstract, abstractFormats };
}

function formatNumberingPrefix(fmt: string, count: number): string {
  if (fmt === 'upperLetter') {
    const idx = Math.max(0, (count - 1) % 26);
    return `${String.fromCharCode(65 + idx)}. `;
  }
  if (fmt === 'lowerLetter') {
    const idx = Math.max(0, (count - 1) % 26);
    return `${String.fromCharCode(97 + idx)}. `;
  }
  if (fmt === 'decimal' || fmt === 'decimalZero') {
    return `${count}. `;
  }
  return '';
}

async function extractDocxTextClient(arrayBuffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(arrayBuffer);
  const decoder = new TextDecoder('utf-8');
  let richText = '';

  try {
    const entries = await extractZipEntriesBrowser(bytes, [
      'word/document.xml',
      'word/numbering.xml',
    ]);
    const docBytes = entries['word/document.xml'];
    if (docBytes) {
      const xml = decoder.decode(docBytes);
      const numberingInfo = entries['word/numbering.xml']
        ? parseNumberingXml(decoder.decode(entries['word/numbering.xml']))
        : null;

      const listCounters: Record<string, number> = {};
      const paragraphs = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
      const lines: string[] = [];

      for (const pXml of paragraphs) {
        let autoPrefix = '';
        const numPrMatch = pXml.match(/<w:numPr\b[\s\S]*?<\/w:numPr>/);
        if (numPrMatch && numberingInfo) {
          const numIdMatch = numPrMatch[0].match(/<w:numId\b[^>]*w:val="([^"]+)"/);
          const ilvlMatch = numPrMatch[0].match(/<w:ilvl\b[^>]*w:val="([^"]+)"/);
          const numId = numIdMatch?.[1];
          const ilvl = ilvlMatch?.[1] || '0';
          if (numId) {
            const counterKey = `${numId}:${ilvl}`;
            // Reset deeper sub-levels when a higher level advances
            if (ilvl === '0') {
              Object.keys(listCounters).forEach((k) => {
                if (k.startsWith(`${numId}:`) && k !== counterKey) {
                  delete listCounters[k];
                }
              });
            }
            listCounters[counterKey] = (listCounters[counterKey] || 0) + 1;
            const absId = numberingInfo.numToAbstract[numId];
            const fmt = (absId && numberingInfo.abstractFormats[absId]?.[ilvl]) || '';
            autoPrefix = formatNumberingPrefix(fmt, listCounters[counterKey]);
          }
        }

        let working = pXml.replace(
          /<m:oMathPara\b[\s\S]*?<\/m:oMathPara>/g,
          (m) => ` ${convertOmmlToReadableText(m)} `
        );
        working = working.replace(
          /<m:oMath\b[\s\S]*?<\/m:oMath>/g,
          (m) => ` ${convertOmmlToReadableText(m)} `
        );

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

        const normalizedP = working
          .replace(/<w:tab\b[^>]*\/>/g, ' ')
          .replace(/<w:br\b[^>]*\/>/g, '\n')
          .replace(/<[^>]+>/g, '');

        const rawLine = decodeXmlEntities(normalizedP)
          .replace(/[ \t]+/g, ' ')
          .trim();
        if (!rawLine) continue;

        // Avoid double prefix if text already begins with "1." or "A."
        const alreadyHasPrefix =
          /^(\d+[.)]|[A-Ea-e][.)])\s/.test(rawLine);
        const textLine = autoPrefix && !alreadyHasPrefix ? `${autoPrefix}${rawLine}` : rawLine;

        if (hasRedColor) {
          lines.push(`${textLine} [KUNCI_MERAH]`);
        } else if (hasHighlight) {
          lines.push(`${textLine} [KUNCI_TERTANDAI]`);
        } else {
          lines.push(textLine);
        }
      }

      richText = lines.join('\n').trim();
    }
  } catch (err) {
    console.warn('Client XML DOCX parse fallback:', err);
  }

  let mammothText = '';
  try {
    const htmlRes = await mammoth.convertToHtml({ arrayBuffer });
    if (htmlRes.value) {
      mammothText = htmlToStructuredExamText(htmlRes.value);
    }
  } catch {
    try {
      const rawRes = await mammoth.extractRawText({ arrayBuffer });
      mammothText = (rawRes.value || '').trim();
    } catch {
      /* ignore */
    }
  }

  if (richText && richText.length >= Math.floor(mammothText.length * 0.7)) {
    return richText;
  }
  return mammothText || richText;
}

function htmlToStructuredExamText(html: string): string {
  if (typeof DOMParser === 'undefined') {
    return html.replace(/<[^>]+>/g, '\n').trim();
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const lines: string[] = [];

  const walkList = (olOrUl: Element, depth: number) => {
    let idx = 0;
    const isOrdered = olOrUl.tagName.toLowerCase() === 'ol';
    const listType = olOrUl.getAttribute('type') || '';
    for (const child of Array.from(olOrUl.children)) {
      if (child.tagName.toLowerCase() !== 'li') continue;
      idx++;
      const clone = child.cloneNode(true) as Element;
      const nestedLists = Array.from(clone.querySelectorAll(':scope > ol, :scope > ul'));
      nestedLists.forEach((nl) => nl.remove());

      const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
      if (text) {
        let prefix = '';
        if (!/^(\d+[.)]|[A-Ea-e][.)])\s/.test(text)) {
          if (listType === 'A' || (depth >= 1 && idx <= 5)) {
            prefix = `${String.fromCharCode(64 + idx)}. `;
          } else if (listType === 'a') {
            prefix = `${String.fromCharCode(96 + idx)}. `;
          } else if (isOrdered) {
            prefix = `${idx}. `;
          }
        }
        lines.push(`${prefix}${text}`);
      }

      for (const nested of Array.from(child.children)) {
        const tag = nested.tagName.toLowerCase();
        if (tag === 'ol' || tag === 'ul') {
          walkList(nested, depth + 1);
        }
      }
    }
  };

  for (const el of Array.from(doc.body.children)) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'ol' || tag === 'ul') {
      walkList(el, 0);
    } else if (tag === 'table') {
      for (const row of Array.from(el.querySelectorAll('tr'))) {
        for (const cell of Array.from(row.querySelectorAll('td, th'))) {
          const t = (cell.textContent || '').replace(/\s+/g, ' ').trim();
          if (t) lines.push(t);
        }
      }
    } else {
      const t = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (t) lines.push(t);
    }
  }

  return lines.join('\n').trim();
}

async function extractPdfTextClient(arrayBuffer: ArrayBuffer): Promise<string> {
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    type LineBucket = { y: number; items: Array<{ x: number; str: string }> };
    const buckets: LineBucket[] = [];

    for (const rawItem of textContent.items as any[]) {
      if (!rawItem || typeof rawItem.str !== 'string') continue;
      const str = rawItem.str;
      if (!str.trim()) continue;
      const transform = rawItem.transform || [1, 0, 0, 1, 0, 0];
      const x = Number(transform[4]) || 0;
      const y = Number(transform[5]) || 0;

      let bucket = buckets.find((b) => Math.abs(b.y - y) <= 3.5);
      if (!bucket) {
        bucket = { y, items: [] };
        buckets.push(bucket);
      }
      bucket.items.push({ x, str });
    }

    buckets.sort((a, b) => b.y - a.y);
    for (const bucket of buckets) {
      bucket.items.sort((a, b) => a.x - b.x);
      let line = '';
      for (const item of bucket.items) {
        if (!line) {
          line = item.str;
        } else if (line.endsWith(' ') || item.str.startsWith(' ')) {
          line += item.str;
        } else {
          line += ' ' + item.str;
        }
      }
      const cleaned = line.replace(/\s+/g, ' ').trim();
      if (cleaned) allLines.push(cleaned);
    }
  }

  return allLines.join('\n').trim();
}

function decodePlainTextBufferBrowser(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2)).replace(/^\uFEFF/, '').trim();
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2)).replace(/^\uFEFF/, '').trim();
  }
  return new TextDecoder('utf-8').decode(bytes).replace(/^\uFEFF/, '').trim();
}

function splitInlineMultipleOptions(line: string): string[] {
  // Splits lines like "A. Monitor    B. Mouse" or "A. 10   B. 20   C. 30   D. 40"
  const optStartPattern = /(?:^|\s{2,}|\t)([A-Ea-e][.)])\s+/g;
  const matches = [...line.matchAll(optStartPattern)];
  if (matches.length <= 1) return [line];

  const parts: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index ?? 0) + (matches[i][0].startsWith(' ') || matches[i][0].startsWith('\t') ? matches[i][0].search(/[A-Ea-e]/) : 0);
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? line.length) : line.length;
    const chunk = line.slice(start, end).trim();
    if (chunk) parts.push(chunk);
  }
  return parts.length > 0 ? parts : [line];
}

function parseAnswerKeyBlock(lines: string[]): Record<number, string> {
  const keyMap: Record<number, string> = {};
  const joined = lines.join(' ');
  const pairRegex = /(\d{1,3})\s*[.):\-]?\s*([A-Ea-e])(?=\s|$|,|;)/g;
  let m: RegExpExecArray | null;
  while ((m = pairRegex.exec(joined)) !== null) {
    const num = parseInt(m[1], 10);
    const letter = m[2].toUpperCase();
    if (num >= 1 && num <= 200) {
      keyMap[num] = letter;
    }
  }
  return keyMap;
}

export function parseStructuredExamText(rawText: string, defaultWeight = 10): CbtQuestion[] {
  const normalizedLines: string[] = [];
  for (const raw of rawText.split(/\r?\n/)) {
    const trimmed = raw.replace(/\s+/g, ' ').trim();
    if (!trimmed) continue;
    for (const sub of splitInlineMultipleOptions(trimmed)) {
      if (sub) normalizedLines.push(sub);
    }
  }

  if (normalizedLines.length === 0) return [];

  // Detect separate trailing "KUNCI JAWABAN" section if present
  let keySectionStart = -1;
  for (let i = Math.floor(normalizedLines.length * 0.35); i < normalizedLines.length; i++) {
    if (/^(?:kunci\s+jawaban|pedoman\s+penskoran|pembahasan\s+dan\s+kunci)/i.test(normalizedLines[i])) {
      keySectionStart = i;
      break;
    }
  }

  const answerKeyTable =
    keySectionStart !== -1 ? parseAnswerKeyBlock(normalizedLines.slice(keySectionStart + 1)) : {};
  const contentLines =
    keySectionStart !== -1 ? normalizedLines.slice(0, keySectionStart) : normalizedLines;

  interface DraftQuestion {
    num: number;
    textLines: string[];
    options: Array<{ letter: string; text: string; isMarked: boolean }>;
    inlineKeyLetter?: string;
    inlineKeyText?: string;
    inEssaySection?: boolean;
  }

  const drafts: DraftQuestion[] = [];
  let current: DraftQuestion | null = null;
  let lastOptionIdx = -1;
  let inEssaySection = false;

  const isOptionLine = (line: string) =>
    /^(?:\(([A-Ea-e])\)|([A-Ea-e])[.)])\s+(.+)$/.exec(line);

  const isInlineKeyLine = (line: string) =>
    /^(?:kunci(?:\s+jawaban)?|jawaban(?:\s+benar)?)\s*[:=-]\s*(.+)$/i.exec(line);

  const isQuestionHeader = (line: string) => {
    const m = /^(?:(?:soal|no\.?)\s*)?(\d{1,3})\s*[.)]\s+(.+)$/i.exec(line);
    if (!m) return null;
    const num = parseInt(m[1], 10);
    // Avoid mistaking years like "2025." or giant numbers as question numbers
    if (num < 1 || num > 150) return null;
    // If we already have options on the current question OR no current question yet OR sequential/near-sequential number
    const prevNum = current?.num ?? 0;
    if (!current || current.options.length >= 2 || (num >= prevNum && num <= prevNum + 5) || num === 1) {
      return { num, body: m[2].trim() };
    }
    return null;
  };

  for (const line of contentLines) {
    // Skip common school exam cover headers
    if (
      /^(?:smp\s+negeri|penilaian\s+akhir|asesmen\s+sumatif|ujian\s+sekolah|mata\s+pelajaran|kelas\s*[:/]|tahun\s+pelajaran|waktu\s*:|pilihlah\s+salah\s+satu|berilah\s+tanda)/i.test(
        line
      ) &&
      !current
    ) {
      continue;
    }

    if (/^(?:[ABII]+\.\s*)?(?:soal\s+)?(?:uraian|essay|isian\s+singkat)/i.test(line)) {
      inEssaySection = true;
      continue;
    }

    const qHeader = isQuestionHeader(line);
    if (qHeader) {
      if (current) drafts.push(current);
      current = {
        num: qHeader.num,
        textLines: [qHeader.body.replace(/\[KUNCI_(?:MERAH|TERTANDAI)\]/gi, '').trim()],
        options: [],
        inEssaySection,
      };
      lastOptionIdx = -1;
      continue;
    }

    if (!current) continue;

    const keyMatch = isInlineKeyLine(line);
    if (keyMatch) {
      const val = keyMatch[1].replace(/\[KUNCI_(?:MERAH|TERTANDAI)\]/gi, '').trim();
      const letterOnly = val.match(/^([A-Ea-e])(?:[.)\s]|$)/);
      if (letterOnly) {
        current.inlineKeyLetter = letterOnly[1].toUpperCase();
      } else {
        current.inlineKeyText = val;
      }
      continue;
    }

    const optMatch = isOptionLine(line);
    if (optMatch) {
      const letter = (optMatch[1] || optMatch[2]).toUpperCase();
      const rawBody = optMatch[3].trim();
      const isMarked = /\[KUNCI_(?:MERAH|TERTANDAI)\]/i.test(rawBody);
      const cleanBody = rawBody.replace(/\[KUNCI_(?:MERAH|TERTANDAI)\]/gi, '').trim();
      current.options.push({ letter, text: cleanBody, isMarked });
      lastOptionIdx = current.options.length - 1;
      continue;
    }

    // Continuation line for either last option or question body
    const cleanCont = line.replace(/\[KUNCI_(?:MERAH|TERTANDAI)\]/gi, '').trim();
    if (!cleanCont) continue;
    if (lastOptionIdx >= 0 && current.options[lastOptionIdx]) {
      current.options[lastOptionIdx].text = `${current.options[lastOptionIdx].text} ${cleanCont}`.trim();
      if (/\[KUNCI_(?:MERAH|TERTANDAI)\]/i.test(line)) {
        current.options[lastOptionIdx].isMarked = true;
      }
    } else {
      current.textLines.push(cleanCont);
    }
  }

  if (current) drafts.push(current);

  const timestamp = Date.now();
  const weight = Number.isFinite(Number(defaultWeight)) && Number(defaultWeight) > 0 ? Math.round(Number(defaultWeight)) : 10;

  return drafts
    .map((d, idx) => {
      const text = d.textLines.join('\n').trim();
      if (!text) return null;

      if (d.options.length >= 2) {
        const normalizedOpts = d.options
          .slice(0, 5)
          .map((opt, oIdx) => `${String.fromCharCode(65 + oIdx)}. ${opt.text}`);

        const markedIndices = d.options
          .slice(0, 5)
          .map((opt, oIdx) => (opt.isMarked ? oIdx : -1))
          .filter((v) => v >= 0);

        let type: CbtQuestion['type'] = markedIndices.length > 1 ? 'pilihan_ganda_kompleks' : 'pilihan_ganda';
        let correctAnswers: string[] = [];

        if (markedIndices.length > 0) {
          correctAnswers = markedIndices.map((oIdx) => normalizedOpts[oIdx]).filter(Boolean);
        } else if (d.inlineKeyLetter) {
          const foundIdx = d.options.findIndex((o) => o.letter === d.inlineKeyLetter);
          const pick = foundIdx >= 0 ? normalizedOpts[foundIdx] : normalizedOpts[0];
          if (pick) correctAnswers = [pick];
        } else if (answerKeyTable[d.num]) {
          const targetLetter = answerKeyTable[d.num];
          const foundIdx = d.options.findIndex((o) => o.letter === targetLetter);
          const pick = foundIdx >= 0 ? normalizedOpts[foundIdx] : normalizedOpts[0];
          if (pick) correctAnswers = [pick];
        } else if (normalizedOpts[0]) {
          correctAnswers = [normalizedOpts[0]];
        }

        return {
          id: `q-local-${timestamp}-${idx}`,
          type,
          text,
          options: normalizedOpts,
          correctAnswers,
          weight,
        } as CbtQuestion;
      }

      const type: CbtQuestion['type'] =
        d.inlineKeyText && d.inlineKeyText.length <= 40 && !d.inEssaySection ? 'campuran' : 'essay';

      return {
        id: `q-local-${timestamp}-${idx}`,
        type,
        text,
        options: [],
        correctAnswers: [d.inlineKeyText || 'Sesuai kunci jawaban pada dokumen soal.'],
        weight,
      } as CbtQuestion;
    })
    .filter((q): q is CbtQuestion => q !== null);
}

export async function parseCbtQuestionsFromFile(
  file: File,
  defaultWeight = 10
): Promise<CbtQuestion[]> {
  const lowerName = file.name.toLowerCase();
  const mime = (file.type || '').toLowerCase();
  const arrayBuffer = await file.arrayBuffer();

  let rawText = '';
  if (mime.includes('wordprocessingml') || lowerName.endsWith('.docx')) {
    rawText = await extractDocxTextClient(arrayBuffer);
  } else if (mime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    rawText = await extractPdfTextClient(arrayBuffer);
  } else if (
    mime.startsWith('text/') ||
    lowerName.endsWith('.txt') ||
    lowerName.endsWith('.md') ||
    lowerName.endsWith('.csv')
  ) {
    rawText = decodePlainTextBufferBrowser(arrayBuffer);
  } else if (lowerName.endsWith('.doc')) {
    throw new Error('Format .doc (Word lama) belum didukung. Silakan simpan ulang file sebagai .docx atau .pdf terlebih dahulu.');
  } else {
    throw new Error('Format file belum didukung. Gunakan dokumen .docx, .pdf, atau .txt.');
  }

  if (!rawText || !rawText.trim()) {
    throw new Error('Dokumen tidak mengandung teks soal yang dapat dibaca (pastikan bukan hasil scan gambar murni atau file terenkripsi).');
  }

  const parsed = parseStructuredExamText(rawText, defaultWeight);
  if (parsed.length === 0) {
    throw new Error('Struktur nomor soal (1., 2., ...) atau pilihan (A., B., C., D.) belum terdeteksi dalam dokumen.');
  }
  return parsed;
}
