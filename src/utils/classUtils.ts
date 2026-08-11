import { SchoolClass } from '../types';

/**
 * Maps roman numerals and variations to standard grade numbers
 */
function cleanClassString(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .replace(/kelas/g, '')
    .replace(/class/g, '')
    .replace(/vii/g, '7')
    .replace(/viii/g, '8')
    .replace(/ix/g, '9')
    .replace(/[^a-z0-9]/g, '')
    .trim()
    .toUpperCase();
}

/**
 * Converts grade number and letter to canonical ID and Name
 * e.g., '7A' -> { id: 'Kelas 7A', name: 'Kelas VII-A' }
 */
export function formatCanonicalClass(cleanCode: string, rawOriginal: string): { id: string; name: string } {
  // Extract number and letter if possible
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

  // Fallback for non-standard class codes
  const trimmed = rawOriginal.trim();
  const titleFormatted = trimmed.startsWith('Kelas') ? trimmed : `Kelas ${trimmed}`;
  return {
    id: titleFormatted,
    name: titleFormatted
  };
}

/**
 * Normalizes any raw class ID/name to a matching SchoolClass in the system.
 * If no matching class exists in existingClasses, it generates a new canonical SchoolClass.
 */
export function normalizeClassId(
  rawClassId: string | undefined | null,
  existingClasses: SchoolClass[] = []
): { classId: string; createdClass?: SchoolClass } {
  if (!rawClassId || !rawClassId.trim()) {
    const defaultId = existingClasses.length > 0 ? existingClasses[0].id : 'Kelas 7A';
    return { classId: defaultId };
  }

  const trimmedRaw = rawClassId.trim();

  // 1. Direct ID match
  const directMatch = existingClasses.find((c) => c.id === trimmedRaw);
  if (directMatch) {
    return { classId: directMatch.id };
  }

  // 2. Direct Name match
  const nameMatch = existingClasses.find((c) => c.name.toLowerCase() === trimmedRaw.toLowerCase());
  if (nameMatch) {
    return { classId: nameMatch.id };
  }

  // 3. Clean token comparison (e.g. '7-A', '7A', 'VII-A', 'Kelas 7A', 'Kelas VII-A' all -> '7A')
  const cleanTarget = cleanClassString(trimmedRaw);
  if (cleanTarget) {
    const tokenMatch = existingClasses.find((c) => {
      const cleanId = cleanClassString(c.id);
      const cleanName = cleanClassString(c.name);
      return cleanId === cleanTarget || cleanName === cleanTarget;
    });

    if (tokenMatch) {
      return { classId: tokenMatch.id };
    }
  }

  // 4. Class not found in existing list -> Auto-create canonical class
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
 * Helper to display the class name safely across all UI screens
 */
export function getSchoolClassName(classId: string | undefined | null, existingClasses: SchoolClass[] = []): string {
  if (!classId) return 'Tanpa Kelas';
  const found = existingClasses.find((c) => c.id === classId || c.name === classId);
  if (found) return found.name;

  // Try normalized lookup
  const cleanTarget = cleanClassString(classId);
  if (cleanTarget) {
    const tokenMatch = existingClasses.find((c) => {
      const cleanId = cleanClassString(c.id);
      const cleanName = cleanClassString(c.name);
      return cleanId === cleanTarget || cleanName === cleanTarget;
    });
    if (tokenMatch) return tokenMatch.name;
  }

  return classId;
}
