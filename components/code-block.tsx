'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  children: string;
  className?: string;
}

export function CodeBlock({ children, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  // Extract language from className (format: language-xxx)
  const language = className?.replace('language-', '') || 'text';
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="code-block-container">
      <div className="code-block-header">
        <span className="code-block-language">{language}</span>
        <button
          onClick={handleCopy}
          className="code-block-copy-button"
          title={copied ? '복사됨!' : '코드 복사'}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              <span className="code-block-copy-text">복사됨</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="code-block-copy-text">복사</span>
            </>
          )}
        </button>
      </div>
      <pre className="code-block-pre">
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

