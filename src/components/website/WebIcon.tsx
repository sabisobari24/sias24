import React from 'react';
import * as Lucide from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  'hands-praying': Lucide.HeartHandshake,
  'scale-balanced': Lucide.Scale,
  'language': Lucide.Languages,
  'flask-vial': Lucide.FlaskConical,
  'earth-americas': Lucide.Globe,
  'comments': Lucide.MessageSquare,
  'basketball': Lucide.Dribbble,
  'laptop-code': Lucide.Laptop,
};

interface WebIconProps {
  name: string;
  className?: string;
}

export function WebIcon({ name, className = "w-5 h-5" }: WebIconProps) {
  if (!name) {
    return <Lucide.Book className={className} />;
  }

  // Trim and check if it's an image URL or base64 data URL
  const trimmed = name.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return <img src={trimmed} alt="icon" className={`${className} object-contain`} referrerPolicy="no-referrer" />;
  }

  // Trim and check if it's an emoji (or contains emoji/non-alphanumeric/non-ascii symbols)
  const isEmoji = /\p{Emoji}/u.test(trimmed) && !/^[a-zA-Z0-9\s-_]+$/.test(trimmed);
  
  if (isEmoji) {
    return <span className="text-xl md:text-2xl shrink-0 select-none">{trimmed}</span>;
  }

  // Try standard maps first
  const cleanKey = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
  let IconComponent = ICON_MAP[trimmed] || ICON_MAP[cleanKey];

  if (!IconComponent) {
    // Search in all Lucide exports case-insensitively
    const foundKey = Object.keys(Lucide).find(
      (k) => k.toLowerCase() === cleanKey
    );
    if (foundKey) {
      IconComponent = (Lucide as any)[foundKey];
    }
  }

  if (IconComponent) {
    return <IconComponent className={className} />;
  }

  // Fallback to text if it's some other custom characters, or default icon
  if (trimmed.length <= 3) {
    return <span className="font-bold text-xs shrink-0 select-none">{trimmed}</span>;
  }

  return <Lucide.Book className={className} />;
}
