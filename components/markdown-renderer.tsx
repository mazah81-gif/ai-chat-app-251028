'use client';

import { Streamdown } from 'streamdown';
import { CodeBlock } from './code-block';
import { ReactNode } from 'react';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

interface CodeProps {
  children?: ReactNode;
  className?: string;
  inline?: boolean;
}

export function MarkdownRenderer({ content, isStreaming = false }: MarkdownRendererProps) {
  return (
    <Streamdown
      parseIncompleteMarkdown={isStreaming}
      isAnimating={isStreaming}
      controls={false}
      components={{
        code: ({ children, className, inline }: CodeProps) => {
          // Inline code (e.g., `code`)
          if (inline) {
            return <code className={className}>{children}</code>;
          }
          
          // Code block (e.g., ```language)
          return (
            <CodeBlock className={className}>
              {String(children).replace(/\n$/, '')}
            </CodeBlock>
          );
        },
      }}
    >
      {content}
    </Streamdown>
  );
}

