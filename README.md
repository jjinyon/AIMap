# AI 장소 추천 React 모바일 앱

현재 위치와 기분을 바탕으로 주변 장소를 추천하고, 지도 경로와 음성 안내를 제공하는 React 기반 모바일 PWA 프로토타입입니다.

## 로컬 실행

```powershell
npm.cmd run dev
```

브라우저에서 접속합니다.

```text
http://127.0.0.1:5173/
```

PowerShell에서 `npm` 실행 정책 오류가 나면 `npm.cmd`를 사용하세요.

## 앱 설치

Chrome 또는 Edge에서 로컬 앱을 연 뒤 주소창의 설치 버튼을 누르거나, 화면 상단의 `+` 버튼이 보이면 눌러 설치합니다.

## 화면 구조

- 데스크톱에서는 모바일 기기 프레임 안에 앱 화면을 보여줍니다.
- 모바일 브라우저에서는 실제 앱처럼 전체 화면 레이아웃으로 표시합니다.
- React 컴포넌트는 `src/pages`, `src/components`, `src/hooks`, `src/services`로 나뉘어 있습니다.

## 검증

```powershell
npm.cmd run check
npm.cmd run build
```
