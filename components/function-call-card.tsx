'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2, Wrench } from 'lucide-react';
import { FunctionCallInfo } from '@/lib/types';

interface FunctionCallCardProps {
  functionCall: FunctionCallInfo;
  theme?: 'default' | 'kakao';
}

// MCP 결과 파싱 헬퍼
function parseResult(result: unknown): { formatted: string; isParsed: boolean } {
  if (!result) return { formatted: '', isParsed: false };
  
  try {
    // MCP 응답 형식: [{ type: 'text', text: '...' }]
    if (
      Array.isArray(result) && 
      result.length > 0 && 
      typeof result[0] === 'object' &&
      result[0] !== null &&
      'type' in result[0] &&
      result[0].type === 'text' &&
      'text' in result[0] &&
      typeof result[0].text === 'string'
    ) {
      const textContent = result[0].text;
      
      // JSON 문자열인지 확인
      try {
        const parsed = JSON.parse(textContent);
        return { formatted: JSON.stringify(parsed, null, 2), isParsed: true };
      } catch {
        // JSON이 아니면 그대로 반환
        return { formatted: textContent, isParsed: false };
      }
    }
    
    // 일반 객체/배열
    if (typeof result === 'object') {
      return { formatted: JSON.stringify(result, null, 2), isParsed: true };
    }
    
    return { formatted: String(result), isParsed: false };
  } catch {
    return { formatted: String(result), isParsed: false };
  }
}

// 함수명을 더 읽기 쉽게 포맷팅
function formatFunctionName(name: string): string {
  // serverId__toolName 형식에서 toolName만 추출
  const parts = name.split('__');
  if (parts.length > 1) {
    return parts.slice(1).join('__');
  }
  return name;
}

// 인자를 더 읽기 쉽게 포맷팅
function formatArgs(args: Record<string, unknown>): string {
  const entries = Object.entries(args);
  if (entries.length === 0) return '(인자 없음)';
  
  return entries.map(([key, value]) => {
    const valueStr = typeof value === 'string' ? `"${value}"` : JSON.stringify(value);
    return `${key}: ${valueStr}`;
  }).join(', ');
}

export function FunctionCallCard({ functionCall, theme = 'default' }: FunctionCallCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (functionCall.status) {
      case 'pending':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (functionCall.status) {
      case 'pending':
        return '실행 중...';
      case 'success':
        return '완료';
      case 'error':
        return '실패';
    }
  };

  const displayName = formatFunctionName(functionCall.name);
  const { formatted: resultFormatted, isParsed: isJsonResult } = parseResult(functionCall.result);

  return (
    <div
      className={`border rounded-lg p-3 my-2 ${
        theme === 'kakao'
          ? 'bg-yellow-50 border-yellow-200'
          : 'bg-muted/50 border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Wrench className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
          <div className="flex-1 min-w-0">
            {/* 함수명과 상태 */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-primary">
                {displayName}
              </span>
              <div className="flex items-center gap-1">
                {getStatusIcon()}
                <span className="text-xs font-medium text-muted-foreground">
                  {getStatusText()}
                </span>
              </div>
            </div>

            {/* 인자 표시 (간략) */}
            {Object.keys(functionCall.args).length > 0 && (
              <div className="mt-1.5 text-xs">
                <span className="text-muted-foreground font-medium">호출:</span>{' '}
                <span className="text-foreground/80">
                  {displayName}({formatArgs(functionCall.args)})
                </span>
              </div>
            )}

            {/* 결과 표시 (확장 시) */}
            {functionCall.status === 'success' && functionCall.result !== undefined && isExpanded && (
              <div className="mt-2 text-xs">
                <div className="flex items-center gap-1 mb-1">
                  <span className="font-medium text-muted-foreground">응답 데이터:</span>
                  {isJsonResult && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                      JSON
                    </span>
                  )}
                </div>
                <pre className="p-2.5 bg-background/80 border border-border/50 rounded text-[11px] overflow-auto max-h-48 leading-relaxed">
                  {resultFormatted}
                </pre>
              </div>
            )}

            {/* 에러 메시지 */}
            {functionCall.status === 'error' && functionCall.error && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
                <div className="flex items-center gap-1 mb-1">
                  <XCircle className="w-3 h-3 text-red-600" />
                  <span className="text-xs font-medium text-red-600">오류 발생</span>
                </div>
                <p className="text-xs text-red-700 dark:text-red-300">
                  {functionCall.error}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 펼치기/접기 버튼 (결과가 있을 때만) */}
        {functionCall.status === 'success' && functionCall.result !== undefined && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-accent rounded transition-colors flex-shrink-0"
            title={isExpanded ? '응답 데이터 접기' : '응답 데이터 보기'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

