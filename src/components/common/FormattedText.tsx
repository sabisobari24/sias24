import React from 'react';

interface FormattedTextProps {
  content: string | string[];
  className?: string;
  asParagraphs?: boolean;
}

/**
 * FormattedText: Helper component to safely render rich text, formatted HTML tags,
 * or paragraphs with proper line-height and alignment.
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

  // Check if string contains HTML tags
  const hasHtml = /<[a-z][\s\S]*>/i.test(content);

  if (hasHtml) {
    return (
      <div 
        className={`formatted-content max-w-none leading-relaxed ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
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
