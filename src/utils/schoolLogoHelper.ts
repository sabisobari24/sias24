// Helper for School Card & Certificate Logo management and persistence
import defaultSchoolLogoAsset from '../assets/images/logo_1783497116979.jpg';
import { safeLocalStorageSet } from './storageHelper';

export const DEFAULT_SCHOOL_LOGO = defaultSchoolLogoAsset;
export const DEFAULT_REGIONAL_LOGO = '/logo-dki.png';

export function getEffectiveSchoolLogo(): string {
  if (typeof window === 'undefined') return DEFAULT_SCHOOL_LOGO;

  // 1. Check specific student card logo
  const cardLogo = localStorage.getItem('siakad_logo_kartu_pelajar');
  if (cardLogo && cardLogo.trim() !== '' && cardLogo !== '/logo.png') return cardLogo;

  // 2. Check Kop Surat right logo (official school logo)
  const kopRightLogo = localStorage.getItem('siakad_logo_right');
  if (kopRightLogo && kopRightLogo.trim() !== '' && kopRightLogo !== '/logo.png') return kopRightLogo;

  // 3. Check general school logo
  const generalLogo = localStorage.getItem('siakad_school_logo');
  if (generalLogo && generalLogo.trim() !== '' && generalLogo !== '/logo.png') return generalLogo;

  // 4. Check web custom school logo
  const webLogo = localStorage.getItem('siakad_web_logo');
  if (webLogo && webLogo.trim() !== '' && webLogo !== '/logo.png') return webLogo;

  // 5. Default bundled high-resolution logo
  return DEFAULT_SCHOOL_LOGO;
}

export function getEffectiveRegionalLogo(): string {
  if (typeof window === 'undefined') return DEFAULT_REGIONAL_LOGO;

  const leftKop = localStorage.getItem('siakad_logo_left');
  if (leftKop && leftKop.trim() !== '') return leftKop;

  const certLeft = localStorage.getItem('siakad_cert_logo_left');
  if (certLeft && certLeft.trim() !== '') return certLeft;

  return DEFAULT_REGIONAL_LOGO;
}

export function saveSchoolCardLogo(logoUrl: string): void {
  if (typeof window === 'undefined') return;

  try {
    if (logoUrl && logoUrl.trim() !== '') {
      safeLocalStorageSet('siakad_logo_kartu_pelajar', logoUrl);
      // Also sync to siakad_logo_right for Kop Surat and Certificate consistency
      safeLocalStorageSet('siakad_logo_right', logoUrl);
      safeLocalStorageSet('siakad_school_logo', logoUrl);

      // If certificate is set to auto-sync, update certificate logo as well
      const isAutoSync = localStorage.getItem('siakad_cert_logo_autosync') !== 'false';
      if (isAutoSync) {
        safeLocalStorageSet('siakad_cert_logo_right', logoUrl);
      }
    } else {
      localStorage.removeItem('siakad_logo_kartu_pelajar');
    }

    // Dispatch custom event to notify all components in real-time
    window.dispatchEvent(new CustomEvent('siakad_logo_updated', { detail: { logo: logoUrl } }));
  } catch (err) {
    console.warn('Error saving school card logo:', err);
  }
}

export function syncOfficialLogoToCertificates(logoUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    if (logoUrl && logoUrl.trim() !== '') {
      safeLocalStorageSet('siakad_cert_logo_right', logoUrl);
      safeLocalStorageSet('siakad_logo_right', logoUrl);
      safeLocalStorageSet('siakad_school_logo', logoUrl);
    }
    window.dispatchEvent(new CustomEvent('siakad_logo_updated', { detail: { logo: logoUrl } }));
  } catch (err) {
    console.warn('Error syncing official logo to certificates:', err);
  }
}
