import React from 'react';
import DOMPurify from 'dompurify';

interface FormattedTextProps {
  content: string | string[];
  className?: string;
  asParagraphs?: boolean;
}

/**
 * Extracts plain readable text from an HTML string without rendering raw HTML tags.
 */
export function stripHtmlToText(input?: string | string[]): string {
  if (!input) return '';
  const raw = Array.isArray(input) ? input.join(' ') : String(input);
  const noTags = raw
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, ' ')
    .replace(/<[^>]*>/g, '');
  return noTags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * FormattedText: Safely renders rich text and formatted HTML tags,
 * protecting against Stored and Reflected XSS attacks with strict DOMPurify rules.
 */
export default function FormattedText({ content, className = '', asParagraphs = false }: FormattedTextProps) {
  if (!content) return null;

  // Handle array of paragraphs
  if (Array.isArray(content)) {
    return (
      <div className={`space-y-3 ${className}`}>
        {content.map((p, idx) => (
          <div key={idx}>
            <FormattedText content={p} asParagraphs={true} />
          </div>
        ))}
      </div>
    );
  }

  // Quick filter for dangerous script/onerror/deface keywords
  if (
    typeof content === 'string' &&
    (content.includes('dhimasganteng') ||
      content.includes('deface.js') ||
      /<script[\s\S]*?>/i.test(content) ||
      /onerror\s*=/i.test(content) ||
      /onload\s*=/i.test(content) ||
      /javascript:/i.test(content))
  ) {
    // Return empty or harmless text if an exploit attempt is detected
    return null;
  }

  // Check if string contains HTML tags
  const hasHtml = /<[a-z][\s\S]*>/i.test(content);

  if (hasHtml) {
    const cleanHtml = DOMPurify.sanitize(content, {
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'link', 'base', 'meta', 'applet'],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onkeydown', 'onchange'],
      ALLOW_DATA_ATTR: false
    });

    return (
      <div 
        className={`formatted-content max-w-none leading-relaxed [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_s]:line-through [&_strike]:line-through [&_h3]:text-base [&_h3]:font-extrabold [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_li]:my-0.5 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-600 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-slate-600 [&_blockquote]:my-2 [&_a]:text-blue-600 [&_a]:underline [&_a]:font-semibold [&_mark]:bg-amber-200 [&_mark]:px-1 [&_mark]:rounded ${className}`}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    );
  }

  // Plain text with line breaks
  const lines = content.split('\n');

  if (asParagraphs || lines.length > 1) {
    return (
      <div className={`space-y-2.5 ${className}`}>
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1.5" />;
          return (
            <p key={idx} className="leading-relaxed">
              {line}
            </p>
          );
        })}
      </div>
    );
  }

  return <span className={className}>{content}</span>;
}
