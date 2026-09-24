// Helper for School Card Logo management and persistence
import defaultSchoolLogoAsset from '../assets/images/logo_1783497116979.jpg';

export const DEFAULT_SCHOOL_LOGO = defaultSchoolLogoAsset;

export function getEffectiveSchoolLogo(): string {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_LOGO;

  // 1. Check specific student card logo
  const cardLogo = localStorage.getItem('siakad_logo_kartu_pelajar');
  if (cardLogo && cardLogo.trim() !== '') return cardLogo;

  // 2. Check Kop Surat right logo (official school logo)
  const kopRightLogo = localStorage.getItem('siakad_logo_right');
  if (kopRightLogo && kopRightLogo.trim() !== '') return kopRightLogo;

  // 3. Check general school logo
  const generalLogo = localStorage.getItem('siakad_school_logo');
  if (generalLogo && generalLogo.trim() !== '') return generalLogo;

  // 4. Default bundled high-resolution logo
  return DEFAULT_SCHOOL_LOGO;
}

export function saveSchoolCardLogo(logoUrl: string): void {
  if (typeof window === 'undefined') return;

  if (logoUrl && logoUrl.trim() !== '') {
    localStorage.setItem('siakad_logo_kartu_pelajar', logoUrl);
    // Also sync to siakad_logo_right for Kop Surat consistency
    localStorage.setItem('siakad_logo_right', logoUrl);
  } else {
    localStorage.removeItem('siakad_logo_kartu_pelajar');
  }

  // Dispatch custom event to notify all components
  window.dispatchEvent(new CustomEvent('siakad_logo_updated', { detail: { logo: logoUrl } }));
}
