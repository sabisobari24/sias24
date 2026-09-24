import React from 'react';
import DOMPurify from 'dompurify';

interface FormattedTextProps {
  content: string | string[];
  className?: string;
  asParagraphs?: boolean;
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
        className={`formatted-content max-w-none leading-relaxed ${className}`}
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
