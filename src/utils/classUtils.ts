import { SchoolClass } from '../types';

/**
 * Maps roman numerals and variations to standard grade numbers for reliable matching.
 */
export function cleanClassString(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\bkelas\b/g, '')
    .replace(/\bclass\b/g, '')
    .replace(/\bviii\b/g, '8')
    .replace(/\bvii\b/g, '7')
    .replace(/\bix\b/g, '9')
    .replace(/viii/g, '8')
    .replace(/vii/g, '7')
    .replace(/ix/g, '9')
    .replace(/[^a-z0-9]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Finds the matching SchoolClass from "Kelas & Database" by ID, exact name, or normalized token.
 */
export function findMatchingClass(
  classIdOrName: string | undefined | null,
  existingClasses: SchoolClass[] = []
): SchoolClass | undefined {
  if (!classIdOrName || !existingClasses || existingClasses.length === 0) return undefined;
  const trimmed = classIdOrName.trim();
  if (!trimmed) return undefined;

  // 1. Direct ID match
  const directMatch = existingClasses.find((c) => c.id === trimmed);
  if (directMatch) return directMatch;

  // 2. Case-insensitive ID or Name match
  const lower = trimmed.toLowerCase();
  const nameMatch = existingClasses.find(
    (c) => (c.name && c.name.toLowerCase() === lower) || (c.id && c.id.toLowerCase() === lower)
  );
  if (nameMatch) return nameMatch;

  // 3. Normalized token comparison (handles dashes, en-dashes, Roman vs Arabic, spaces)
  const cleanTarget = cleanClassString(trimmed);
  if (cleanTarget) {
    return existingClasses.find((c) => {
      const cleanId = cleanClassString(c.id);
      const cleanName = cleanClassString(c.name);
      return cleanId === cleanTarget || cleanName === cleanTarget;
    });
  }

  return undefined;
}

/**
 * Checks if two class identifiers/names refer to the same class in "Kelas & Database".
 */
export function isSameClass(
  classA: string | undefined | null,
  classB: string | undefined | null,
  existingClasses: SchoolClass[] = []
): boolean {
  if (!classA || !classB) return false;
  const aTrim = classA.trim();
  const bTrim = classB.trim();
  if (!aTrim || !bTrim) return false;
  if (aTrim === bTrim || aTrim.toLowerCase() === bTrim.toLowerCase()) return true;

  const matchA = findMatchingClass(aTrim, existingClasses);
  const matchB = findMatchingClass(bTrim, existingClasses);
  if (matchA && matchB) return matchA.id === matchB.id;
  if (matchA && (matchA.id === bTrim || matchA.name.toLowerCase() === bTrim.toLowerCase())) return true;
  if (matchB && (matchB.id === aTrim || matchB.name.toLowerCase() === aTrim.toLowerCase())) return true;

  const cleanA = cleanClassString(aTrim);
  const cleanB = cleanClassString(bTrim);
  return Boolean(cleanA && cleanB && cleanA === cleanB);
}

/**
 * Converts grade number and letter to canonical ID and Name
 * e.g., '7A' -> { id: 'Kelas 7A', name: 'Kelas VII-A' }
 */
export function formatCanonicalClass(cleanCode: string, rawOriginal: string): { id: string; name: string } {
  const match = cleanCode.match(/^([789])([A-Z0-9]+)$/);
  if (match) {
    const grade = match[1];
    const section = match[2];
    const roman = grade === '7' ? 'VII' : grade === '8' ? 'VIII' : 'IX';
    return {
      id: `Kelas ${grade}${section}`,
      name: `Kelas ${roman}-${section}`
    };
  }

  const trimmed = rawOriginal.trim();
  const titleFormatted = trimmed.startsWith('Kelas') ? trimmed : `Kelas ${trimmed}`;
  return {
    id: titleFormatted,
    name: titleFormatted
  };
}

/**
 * Normalizes any raw class ID/name to a matching SchoolClass in "Kelas & Database".
 * If no matching class exists in existingClasses, generates a canonical SchoolClass.
 */
export function normalizeClassId(
  rawClassId: string | undefined | null,
  existingClasses: SchoolClass[] = []
): { classId: string; createdClass?: SchoolClass } {
  if (!rawClassId || !rawClassId.trim()) {
    const defaultId = existingClasses.length > 0 ? existingClasses[0].id : '';
    return { classId: defaultId };
  }

  const trimmedRaw = rawClassId.trim();
  const existingMatch = findMatchingClass(trimmedRaw, existingClasses);
  if (existingMatch) {
    return { classId: existingMatch.id };
  }

  const cleanTarget = cleanClassString(trimmedRaw);
  const canonical = formatCanonicalClass(cleanTarget || trimmedRaw, trimmedRaw);
  const newClass: SchoolClass = {
    id: canonical.id,
    name: canonical.name,
    homeroomTeacherId: ''
  };

  return {
    classId: newClass.id,
    createdClass: newClass
  };
}

/**
 * Displays the exact class name as configured in "Kelas & Database" across all UI screens & exports.
 */
export function getSchoolClassName(
  classId: string | undefined | null,
  existingClasses: SchoolClass[] = []
): string {
  if (!classId || !classId.trim()) return '-';
  const trimmed = classId.trim();
  if (trimmed.toLowerCase() === 'all') return 'Semua Kelas';

  const found = findMatchingClass(trimmed, existingClasses);
  if (found) return found.name;

  return trimmed;
}

/**
 * Formats a comma-separated list or array of class IDs using exact names from "Kelas & Database".
 */
export function formatClassListDisplay(
  classIds: string | string[] | undefined | null,
  existingClasses: SchoolClass[] = []
): string {
  if (!classIds) return '-';
  const items = Array.isArray(classIds)
    ? classIds
    : classIds.split(',').map((s) => s.trim()).filter(Boolean);

  if (items.length === 0) return '-';
  if (items.some((i) => i.toLowerCase() === 'all')) return 'Semua Kelas';

  return items.map((id) => getSchoolClassName(id, existingClasses)).join(', ');
}
