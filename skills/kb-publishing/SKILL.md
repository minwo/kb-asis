---
name: kb-publishing
description: KB AS-IS HTML 퍼블리싱 작업용 스킬. 이 프로젝트에서 정적 HTML 화면을 새로 만들거나 수정할 때 사용한다. 사용자가 기존 코딩 패턴, 기준 파일, comn-form.css 재사용, 인라인 스타일 금지, 새 클래스 생성 금지, coding-list 등록을 중요하게 볼 때 반드시 사용한다. 팝업, M 페이지, 상세 페이지, CTA, 정보 박스, Figma/이미지 기반 퍼블리싱 작업에 적합하다.
---

# KB Publishing

## 시작 순서
1. `WORKSTYLE.md`를 먼저 읽는다.
2. 사용자가 지정한 기준 파일이 있으면 그 파일을 먼저 읽는다.
3. 기준 파일이 없으면 같은 역할의 기존 HTML 1~2개를 찾는다.
4. `assets/css/comn-form.css`에서 필요한 클래스를 먼저 검색한다.

## 반드시 지킬 것
- `assets/css/comn-form.css` 안의 클래스만 우선 사용한다.
- 없는 클래스를 임의로 만들지 않는다.
- 인라인 스타일을 추가하지 않는다.
- 기존 사용자 패턴 클래스는 임의로 삭제하지 않는다.
- `codex-*` 같은 임시성 네이밍을 만들지 않는다.

## 구조 선택 규칙
- 팝업: 기존 팝업 파일의 헤더, 본문, CTA 구조를 그대로 따른다.
- 일반 페이지: `mo_kb_wrapper`, `cm-lt-wrapper` 또는 `cm-lt-wrapper2` 결을 우선한다.
- CTA: 같은 역할의 기존 CTA 구조를 먼저 복제한다.
- 리스트/상세행: 사용자가 별도 구조를 지정했으면 그 구조로 전체 통일한다.

## Figma/이미지 작업 규칙
- Figma나 이미지가 있어도 곧바로 새 구조를 만들지 않는다.
- 먼저 기존 파일과 가장 가까운 패턴을 찾고, 그 안에서 컨텐츠만 바꾼다.
- 색상, 간격, 타이포가 다르면 멀티 클래스로 먼저 맞춘다.
- 공통 CSS 수정은 마지막 수단이다.

## 신규 파일 작업 규칙
- 새 HTML 생성 시 `coding-list.meta.json`에 반드시 등록한다.
- 이후 `scripts/sync-coding-list.ps1`를 실행해 `coding-list.html`까지 반영한다.

## 수정 전 체크
- 기준 파일 확인했는가
- 같은 역할의 기존 화면을 확인했는가
- 사용할 클래스가 `comn-form.css`에 실제로 있는가
- 사용자가 금지한 항목이 없는가

## 수정 후 체크
- 새 클래스 생성하지 않았는가
- 인라인 스타일이 없는가
- 기준 파일 구조와 닮았는가
- Figma/이미지와 간격, 색상, 타이포를 한 번 더 비교했는가
- 신규 파일이면 coding-list까지 반영했는가

## 기준 파일 예시
- 팝업 기준: `DH03_LT_BF0134P_DA.html`
- 상세 페이지 기준: `DH03_LT_BF0136M_DA.html`
- 질문형 페이지 기준: `DH03_LT_BF0132M_DA.html`

## 사용할 때의 요청 예시
```text
Use kb-publishing at d:/kb-asis/skills/kb-publishing to update DH03_LT_BF0138P_DA.html.
기준 파일은 DH03_LT_BF0134P_DA.html.
comn-form.css만 사용하고 새 클래스는 만들지 마.
```
