# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.



# Context STT Frontend

음성 대화를 녹음하고 STT로 변환한 뒤, AI가 발언의 맥락을 분석하여 여러 맥락 후보를 제시하는 **정보 손실 없는 대화 도우미**의 Frontend 프로젝트입니다.

---

## 주요 기능

- 회원가입 / 로그인
- 마이크를 이용한 음성 녹음
- 실시간 녹음 상태 표시
- STT 음성 → 텍스트 변환
- 변환된 발언 전문 확인
- 단어별 STT 결과 확인 및 교정
- 전체 발언 재녹음
- AI 기반 발언 맥락 분석
- 여러 맥락 후보 표시
- 맥락 후보 선택
- 선택한 맥락 직접 수정
- 맥락 최종 확정
- 대화 기록 저장 및 조회

---

## 기술 스택

- React
- Vite
- JavaScript
- CSS
- Fetch API
- MediaRecorder API

Backend API와 통신하여 STT 및 AI 맥락 분석 기능을 사용합니다.

---

# 로컬 실행 방법

## 1. 저장소 Clone

처음 프로젝트를 받는 경우:

```bash
git clone https://github.com/KMU-LionHub/frontend.git
```

프로젝트 폴더로 이동합니다.

```bash
cd frontend
```

---

## 2. 개발 브랜치 이동

현재 통합 테스트에 사용하는 브랜치는 다음과 같습니다.

```bash
git switch feat/auth
```

최신 코드를 받아옵니다.

```bash
git pull origin feat/auth
```

---

## 3. 패키지 설치

처음 실행하는 경우 필요한 패키지를 설치합니다.

```bash
npm install
```

`node_modules`가 이미 존재하더라도 `package.json` 또는 `package-lock.json`이 변경된 경우 다시 실행하는 것을 권장합니다.

---

## 4. Frontend 실행

```bash
npm run dev
```

터미널에 출력되는 Local 주소로 접속합니다.

예:

```text
http://localhost:5173
```

다른 프로그램이 5173 포트를 사용하고 있다면 다음과 같이 다른 포트로 실행될 수 있습니다.

```text
http://localhost:5174
```

---

# Backend 연결

현재 Frontend는 기본적으로 다음 Backend 서버에 요청을 보냅니다.

```text
http://localhost:8080
```

따라서 로그인, STT, AI 맥락 분석 등의 전체 기능을 테스트하려면 **Backend 서버도 반드시 실행되어 있어야 합니다.**

전체 구조는 다음과 같습니다.

```text
Browser
   │
   ▼
React + Vite
localhost:5173
   │
   │ HTTP API
   ▼
Spring Boot Backend
localhost:8080
   │
   ├── MySQL
   ├── Google Speech-to-Text
   └── AI Context Analysis
```

---

# 테스트 방법

Backend가 먼저 실행되어 있는지 확인한 뒤 Frontend를 실행합니다.

## 기본 테스트 순서

1. 회원가입 또는 로그인
2. 브라우저 마이크 권한 허용
3. 녹음 화면으로 이동
4. 마이크 버튼 클릭
5. 음성 입력
6. 녹음 종료
7. STT 변환 결과 확인
8. 단어별 전사 결과 확인 및 교정
9. 필요하면 전체 발언 재녹음
10. AI 분석 시작
11. AI 맥락 후보 확인
12. 원하는 맥락 후보 선택
13. 필요하면 선택한 맥락 수정
14. 맥락 최종 확정
15. 대화 기록 화면에서 저장된 기록 확인

---

# AI 맥락 분석 테스트 예시

맥락이 여러 가지로 해석될 수 있는 문장을 사용하면 후보 분석을 확인하기 쉽습니다.

예:

```text
오늘 배를 타러 갔는데 배가 너무 아팠어.
```

정상적으로 처리되면 녹음 종료 후 다음 과정이 진행됩니다.

```text
음성 녹음
   ↓
STT 변환
   ↓
발언 생성
   ↓
전사 단어 검토·교정 또는 재발언
   ↓
사용자가 AI 분석 시작
   ↓
AI 맥락 분석
   ↓
맥락 후보 표시
   ↓
후보 선택
   ↓
필요 시 직접 수정
   ↓
맥락 확정
```

---

# 마이크 권한

음성 녹음을 사용하려면 브라우저에서 마이크 권한을 허용해야 합니다.

Chrome에서 권한 요청 창이 나타나면 **허용**을 선택해주세요.

마이크가 동작하지 않는 경우 브라우저 주소창의 사이트 설정에서 마이크 권한을 확인해주세요.

---

# 기존에 Clone한 팀원이 최신 코드 받기

이미 프로젝트를 가지고 있다면 다시 Clone할 필요가 없습니다.

프로젝트 폴더에서:

```bash
git fetch origin
```

브랜치를 이동합니다.

```bash
git switch feat/auth
```

최신 코드를 받습니다.

```bash
git pull origin feat/auth
```

패키지 변경사항이 있을 수 있으므로:

```bash
npm install
```

실행:

```bash
npm run dev
```

---

# 문제 해결

## Backend 연결 실패

브라우저 Console에 다음과 비슷한 오류가 발생한다면:

```text
Failed to fetch
ERR_CONNECTION_REFUSED
```

Backend가 실행되어 있는지 확인해주세요.

Backend 기본 주소:

```text
http://localhost:8080
```

---

## 401 Unauthorized

로그인 토큰이 없거나 만료되었을 가능성이 있습니다.

로그아웃 후 다시 로그인해주세요.

---

## 마이크가 작동하지 않는 경우

다음을 확인해주세요.

- 브라우저 마이크 권한
- macOS 마이크 권한
- 다른 프로그램이 마이크를 점유하고 있는지
- 브라우저 새로고침 후 재시도

---

## STT가 실패하는 경우

STT 처리는 Backend에서 수행됩니다.

Frontend 문제인지 Backend 문제인지 확인하기 위해 Chrome DevTools의 Console과 Backend 로그를 함께 확인해주세요.

Backend 로그 확인 예:

```bash
docker compose logs backend --tail=250
```

실시간 로그:

```bash
docker compose logs -f backend
```

---

## AI 맥락 후보가 나타나지 않는 경우

Chrome DevTools를 열고:

```text
Console
```

에서 다음 로그를 확인해주세요.

```text
AI ANALYSIS RESPONSE
NORMALIZED CONTEXTS
```

`NORMALIZED CONTEXTS`에 후보 배열이 존재하는지 확인합니다.

---

# 개발자 도구

Chrome에서 개발자 도구를 열려면:

```text
Option + Command + I
```

Console 탭에서 Frontend 오류 및 API 요청 관련 로그를 확인할 수 있습니다.

Network 탭에서는 Backend API 요청과 응답 상태 코드를 확인할 수 있습니다.

---

# 프로젝트 구조

```text
frontend
├── public
├── src
│   ├── api
│   ├── components
│   ├── db
│   ├── pages
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

---

# 주요 화면

### 녹음

음성을 녹음하고 STT 결과를 확인합니다.

### 발언 전문 및 단어 주석 수정

STT로 변환된 발언 내용을 확인하고 필요한 경우 직접 수정할 수 있습니다.

### 분석 진행 상태

녹음 종료 후 AI 맥락 분석 진행 상태를 표시합니다.

### AI 맥락 후보 분석

AI가 분석한 여러 맥락 후보를 확인하고 원하는 후보를 선택할 수 있습니다.

선택한 후보는 직접 수정한 뒤 최종 확정할 수도 있습니다.

### 대화 기록

이전에 분석한 대화 및 선택한 맥락 정보를 확인할 수 있습니다.

---

# 주의사항

API Key, 비밀번호, 인증 파일 등 민감한 정보는 GitHub에 업로드하지 마세요.

특히 다음 파일 또는 값은 커밋하지 않습니다.

```text
.env
Google Cloud Credentials
OpenRouter API Key
JWT Secret
Database Password
```

민감한 설정은 Backend 환경 변수 또는 별도의 로컬 설정 파일을 사용합니다.

---

# Repository

Frontend Repository:

```text
https://github.com/KMU-LionHub/frontend
```

현재 개발 및 통합 테스트 브랜치:

```text
feat/auth
```
