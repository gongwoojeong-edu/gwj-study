# 러버블 지시서 — Passage code UNIQUE 충돌 (`textbook_passages_code_key`)

## 증상
Syntax Studio 📚 전송 실패:
```
Passage 생성 실패: duplicate key value violates unique constraint "textbook_passages_code_key"
```
결과: 유닛은 만들어졌는데 **문장(본문) 테이블이 비어 있음**  
예: `lab.gwj-edu.com/teacher/bookshelf/L05/3/37/1`

## 원인
`item_code` 예: `1번-1` → `safeSlug` 후 `1-1`.  
`textbook_passages.code`는 **전역 UNIQUE**라 다른 교재의 `1-1`과 충돌 → INSERT 실패 → 빈 유닛.

---

## 붙여넣기 시작

```
Edge Function import-claude-handout 수정·배포.
UI/스키마 변경 금지. 인증·분석/구조도·passage_input(whole) 로직은 유지.

버그
- Passage 생성 실패: textbook_passages_code_key
- item_code "1번-1" → safeSlug "1-1" 이 전역 충돌
- 유닛만 생성되고 textbook_passages 행이 비는 경우 발생

수정 (supabase/functions/import-claude-handout/index.ts)

1) preferredCode를 시리즈+권+유닛번호+item 으로 네임스페이스화:

const rawItem = (p.item_code || `${unit!.unit_no}-${startNo}`).trim();
const preferredCode = [
  safeSlug(seriesTitle),
  safeSlug(volumeTitle),
  safeSlug(String(unit!.unit_no)),
  safeSlug(rawItem),
].filter(Boolean).join("-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 100)
  || `unit-${unit!.unit_no}-${startNo}`;

2) 레거시 짧은 코드(legacyShort = safeSlug(rawItem))도 같은 유닛/교재 family 조회에 포함해 덮어쓰기.

3) passage_input === "whole" 병합을 코드 할당·isMulti 계산보다 먼저 수행.

4) 신규 codeRoot 충돌 검사는 code.like 한 방이 아니라, 실제로 넣을 코드 목록(.in("code", codes))으로 전역 검사 후 -alt 부여.

5) Passage INSERT 시 23505 / textbook_passages_code_key 가 나면 실패로 끝내지 말고:
   - 같은 unit_id 에 그 code가 있으면 english/korean 덮어쓰기
   - 다른 유닛이면 preferredCode-altN 으로 코드 바꿔 재시도 (최대 40회)
   헬퍼 이름 예: insertPassageRecovering

참고 패치 파일(gwj-study): scripts/lab-passage-code-dup-fix.patch
동일 내용이면 git apply 해도 됩니다.

배포: supabase functions deploy import-claude-handout
배포 후 Studio에서 실패했던 자료를 다시 📚 전송해 문장이 채워지는지 확인.
빈 유닛(L05/3/37/1 등)은 재전송으로 채워지거나, 새 코드로 같은 유닛에 행이 생깁니다.
```

## 붙여넣기 끝
