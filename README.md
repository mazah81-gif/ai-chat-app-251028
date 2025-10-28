# AI 채팅 앱

Google Gemini API를 사용한 간단한 AI 채팅 애플리케이션입니다.

## 주요 기능

- ✨ 실시간 스트리밍 응답
- 💬 대화형 채팅 인터페이스
- 💾 LocalStorage를 통한 채팅 내역 저장
- 🎨 깔끔한 전체 화면 UI
- 📝 마크다운 렌더링 지원 (코드 블록, 테이블, 리스트 등)
- 📋 Notion/ChatGPT 스타일 코드 블록 (언어 라벨 + 복사 버튼)
- ⚡ 스트리밍 중 실시간 마크다운 파싱
- 🎨 카카오톡 테마 토글 기능
- 📚 채팅 히스토리 관리 (사이드바)
- ➕ 새 채팅 생성 기능
- 🗑️ 개별 채팅 삭제 기능
- 🔧 **MCP (Model Context Protocol) 통합**
  - MCP 서버 관리 UI
  - 함수 호출 시각화
  - STDIO/SSE/HTTP 전송 방식 지원
  - 로컬 개발 환경 최적화

## 기술 스택

- **프레임워크**: Next.js 15 (App Router)
- **LLM**: Google Gemini (`gemini-2.0-flash-001`)
- **SDK**: `@google/genai`
- **MCP**: `@modelcontextprotocol/sdk` (Model Context Protocol)
- **마크다운**: `streamdown` (AI 스트리밍 최적화)
- **스타일링**: Tailwind CSS
- **아이콘**: Lucide React

## 시작하기

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

**중요: 이 단계를 건너뛰면 앱이 작동하지 않습니다!**

`.env.local` 파일을 생성하고 Google Gemini API 키를 입력합니다:

**API 키 발급 방법:**
1. [Google AI Studio](https://aistudio.google.com/app/apikey) 방문
2. Google 계정으로 로그인
3. "Create API Key" 버튼 클릭
4. 생성된 API 키를 복사

**Windows PowerShell:**
```powershell
Copy-Item .env.example .env.local
notepad .env.local
```

**Mac/Linux:**
```bash
cp .env.example .env.local
nano .env.local
```

`.env.local` 파일을 열고 `your_api_key_here`를 실제 API 키로 교체:

```env
GEMINI_API_KEY=AIzaSyC-실제키를여기에붙여넣으세요
```

⚠️ **주의**: API 키를 설정한 후 반드시 개발 서버를 재시작해야 합니다!

### 3. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 앱을 확인합니다.

## 사용 방법

### 채팅 관리
1. **새 채팅**: 좌측 사이드바의 "새 채팅" 버튼 클릭
2. **채팅 전환**: 사이드바에서 이전 채팅 선택
3. **채팅 삭제**: 각 채팅 항목 호버 시 나타나는 휴지통 아이콘 클릭
4. **사이드바 토글**: 좌측 상단 메뉴 아이콘 클릭 (모바일)

### 메시지 전송
1. 하단 입력창에 메시지를 입력합니다
2. 전송 버튼(또는 Enter 키)을 눌러 메시지를 전송합니다
3. AI의 응답이 실시간으로 스트리밍됩니다

### 코드 블록
- AI 응답의 코드 블록에 언어 라벨이 자동으로 표시됩니다
- 각 코드 블록 헤더의 "복사" 버튼으로 코드를 클립보드에 복사할 수 있습니다

### 테마
- 우측 상단의 말풍선 아이콘을 클릭하면 카카오톡 테마로 전환됩니다
- 선택한 테마는 자동으로 저장됩니다

## 프로젝트 구조

```
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts      # Gemini API 스트리밍 엔드포인트
│   ├── page.tsx               # 메인 채팅 UI
│   ├── layout.tsx
│   └── globals.css            # 전역 스타일 (마크다운 포함)
├── components/
│   ├── chat-sidebar.tsx       # 채팅 히스토리 사이드바
│   ├── code-block.tsx         # 코드 블록 컴포넌트
│   └── markdown-renderer.tsx  # 마크다운 렌더링 컴포넌트
├── lib/
│   ├── types.ts               # TypeScript 타입 정의
│   ├── storage.ts             # 채팅 히스토리 관리
│   └── theme.ts               # 테마 관리 유틸리티
└── .env.example               # 환경 변수 템플릿
```

## 개발 명령어

```bash
# 개발 서버 실행
pnpm dev

# 프로덕션 빌드
pnpm build

# 프로덕션 서버 실행
pnpm start

# 타입 체크
pnpm typecheck

# 린트
pnpm lint

# 코드 포맷팅
pnpm format
```

## 보안 참고사항

⚠️ **주의**: 이 앱은 채팅 내역을 브라우저의 LocalStorage에 저장합니다. 
- 공용 또는 공유 PC에서 사용 시 민감한 정보를 입력하지 마세요
- LocalStorage는 암호화되지 않으므로 중요한 정보는 저장하지 않는 것이 좋습니다

## 배포

Vercel을 사용한 배포를 권장합니다:

1. GitHub에 코드를 푸시합니다
2. [Vercel](https://vercel.com)에서 프로젝트를 import합니다
3. 환경 변수(`GEMINI_API_KEY`)를 설정합니다
4. 배포를 진행합니다

### ⚠️ MCP 기능 제한사항

**Vercel 및 서버리스 환경에서의 MCP 제한:**

- ❌ **STDIO 전송 방식은 작동하지 않습니다**
  - Vercel, AWS Lambda 등 서버리스 환경에서는 외부 프로세스(`uvx`, `npx` 등)를 실행할 수 없습니다
  - `spawn uvx ENOENT` 에러가 발생합니다
  
- ✅ **대안:**
  - **로컬 개발 환경**에서만 STDIO 기반 MCP 서버 사용
  - **배포 환경**에서는 SSE 또는 HTTP 전송 방식의 MCP 서버 사용
  - MCP 기능 없이 기본 채팅 기능만 사용

**권장 사용 방법:**
```
로컬 개발: STDIO MCP 서버 (uvx mcp-server-time 등)
프로덕션: SSE/HTTP MCP 서버 또는 MCP 기능 비활성화
```

## 라이선스

MIT
