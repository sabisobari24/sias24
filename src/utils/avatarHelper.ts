// Formal non-cartoon gender-matched student portrait avatar utilities

export function isFemaleGender(gender?: string): boolean {
  const g = String(gender || '').trim().toLowerCase();
  return g === 'perempuan' || g === 'p' || g === 'female' || g === 'wanita';
}

export function isCartoonOrPlaceholderAvatar(url?: string): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed) return true;
  const lower = trimmed.toLowerCase();
  return (
    lower.includes('dicebear.com') ||
    lower.includes('ui-avatars.com') ||
    lower.includes('avataaars') ||
    lower.includes('adventurer')
  );
}

const MALE_PORTRAIT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" width="240" height="320">
  <defs>
    <linearGradient id="bgM" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bgM)"/>
  <circle cx="120" cy="122" r="90" fill="#3b82f6" fill-opacity="0.16"/>
  <!-- Neck -->
  <path d="M101 168 L139 168 L143 216 L97 216 Z" fill="#cbd5e1"/>
  <!-- Short neat male hair & head silhouette -->
  <path d="M77 110 C76 74 96 54 120 54 C144 54 164 74 163 110 C163 116 161 122 159 127 C157 104 148 92 132 88 C122 85 104 86 92 94 C84 99 80 110 80 127 C78 122 77 116 77 110 Z" fill="#1e293b"/>
  <!-- Ears -->
  <ellipse cx="79" cy="124" rx="5" ry="10" fill="#cbd5e1"/>
  <ellipse cx="161" cy="124" rx="5" ry="10" fill="#cbd5e1"/>
  <!-- Clean neutral face silhouette -->
  <path d="M82 114 C82 91 98 78 120 78 C142 78 158 91 158 114 C158 145 142 174 120 176 C98 174 82 145 82 114 Z" fill="#e2e8f0"/>
  <!-- Subtle brow & hair overlap -->
  <path d="M81 108 C84 82 100 68 120 68 C140 68 156 82 159 108 C151 94 139 87 120 87 C101 87 89 94 81 108 Z" fill="#1e293b"/>
  <!-- Formal SMP white shirt shoulders -->
  <path d="M26 320 C32 246 66 210 100 206 L120 232 L140 206 C174 210 208 246 214 320 Z" fill="#f8fafc"/>
  <!-- Shirt collar -->
  <path d="M98 206 L120 242 L103 248 L88 216 Z" fill="#e2e8f0"/>
  <path d="M142 206 L120 242 L137 248 L152 216 Z" fill="#e2e8f0"/>
  <!-- Navy tie -->
  <path d="M113 230 L127 230 L124 244 L128 296 L120 310 L112 296 L116 244 Z" fill="#1e3a8a"/>
</svg>`;

const FEMALE_PORTRAIT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 320" width="240" height="320">
  <defs>
    <linearGradient id="bgF" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="240" height="320" fill="url(#bgF)"/>
  <circle cx="120" cy="122" r="90" fill="#6366f1" fill-opacity="0.16"/>
  <!-- Neat shoulder-length female hair back silhouette -->
  <path d="M68 134 C66 80 88 52 120 52 C152 52 174 80 172 134 L176 208 C176 214 162 218 148 214 L92 214 C78 218 64 214 64 208 Z" fill="#1e293b"/>
  <!-- Neck -->
  <path d="M103 166 L137 166 L141 214 L99 214 Z" fill="#cbd5e1"/>
  <!-- Clean neutral face silhouette -->
  <path d="M84 114 C84 90 100 76 120 76 C140 76 156 90 156 114 C156 144 140 172 120 174 C100 172 84 144 84 114 Z" fill="#e2e8f0"/>
  <!-- Neat parted front hair contour -->
  <path d="M82 114 C82 82 99 66 120 66 C141 66 158 82 158 114 C152 98 140 88 124 85 C110 88 94 97 82 114 Z" fill="#1e293b"/>
  <!-- Formal SMP white shirt shoulders -->
  <path d="M26 320 C32 246 66 210 100 206 L120 232 L140 206 C174 210 208 246 214 320 Z" fill="#f8fafc"/>
  <!-- Shirt collar -->
  <path d="M98 206 L120 242 L103 248 L88 216 Z" fill="#e2e8f0"/>
  <path d="M142 206 L120 242 L137 248 L152 216 Z" fill="#e2e8f0"/>
  <!-- Navy tie -->
  <path d="M113 230 L127 230 L124 244 L128 296 L120 310 L112 296 L116 244 Z" fill="#1e3a8a"/>
</svg>`;

const MALE_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(MALE_PORTRAIT_SVG)}`;
const FEMALE_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(FEMALE_PORTRAIT_SVG)}`;

export function getGenderAvatarSvgDataUrl(gender?: string): string {
  return isFemaleGender(gender) ? FEMALE_DATA_URL : MALE_DATA_URL;
}

export function resolveStudentAvatarUrl(avatarUrl?: string, gender?: string): string {
  if (!isCartoonOrPlaceholderAvatar(avatarUrl)) {
    return String(avatarUrl).trim();
  }
  return getGenderAvatarSvgDataUrl(gender);
}
