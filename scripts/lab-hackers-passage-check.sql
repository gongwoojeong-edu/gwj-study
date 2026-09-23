-- ============================================================
-- 구문랩 SQL 점검·보정 (Supabase SQL Editor용)
-- 문장 분리기 / 본문통합 Edge Function 코드는 SQL로 넣을 수 없음.
-- 이 스크립트는 DB에 이미 들어간 textbook_passages 를 점검·병합할 때 씁니다.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1) 해커스 24번·29번: 유닛별 문장(행) 개수·본문 미리보기
-- ────────────────────────────────────────────────────────────
SELECT
  s.level,
  s.title AS series_title,
  t.title AS volume_title,
  u.title AS unit_title,
  u.unit_no,
  p.passage_no,
  p.code,
  left(regexp_replace(coalesce(p.english, ''), '\s+', ' ', 'g'), 120) AS english_head,
  length(coalesce(p.english, '')) AS english_len,
  left(regexp_replace(coalesce(p.korean, ''), '\s+', ' ', 'g'), 80) AS korean_head
FROM textbook_passages p
JOIN textbook_units u ON u.id = p.unit_id
JOIN textbooks t ON t.id = p.textbook_id
JOIN textbook_series s ON s.id = t.series_id
WHERE (s.title ILIKE '%해커스%' OR t.title ILIKE '%해커스%')
  AND (
    u.title ~ '(^|[^0-9])24($|번|[^0-9])'
    OR u.title ~ '(^|[^0-9])29($|번|[^0-9])'
    OR p.code ~ '(^|-)(24|29)($|-)'
  )
ORDER BY s.level, t.title, u.unit_no, p.passage_no;


-- ────────────────────────────────────────────────────────────
-- 2) 같은 유닛에서 문장 행이 몇 개인지 요약 (중간 누락 후보)
--    기대: 문장별이면 보통 5~10행. 1행만 있으면 본문통합 상태.
--    2~3행만 있으면 중간이 빠진 전송일 수 있음.
-- ────────────────────────────────────────────────────────────
SELECT
  s.level,
  s.title AS series_title,
  t.title AS volume_title,
  u.title AS unit_title,
  u.id AS unit_id,
  count(*) AS row_count,
  string_agg(p.passage_no::text, ',' ORDER BY p.passage_no) AS passage_nos,
  string_agg(p.code, ' | ' ORDER BY p.passage_no) AS codes
FROM textbook_passages p
JOIN textbook_units u ON u.id = p.unit_id
JOIN textbooks t ON t.id = p.textbook_id
JOIN textbook_series s ON s.id = t.series_id
WHERE (s.title ILIKE '%해커스%' OR t.title ILIKE '%해커스%')
  AND (
    u.title ~ '(^|[^0-9])24($|번|[^0-9])'
    OR u.title ~ '(^|[^0-9])29($|번|[^0-9])'
    OR p.code ~ '(^|-)(24|29)($|-)'
  )
GROUP BY s.level, s.title, t.title, u.title, u.id
ORDER BY s.level, u.title;


-- ────────────────────────────────────────────────────────────
-- 3) (선택) 특정 유닛을 본문통합 1행으로 합치기
--    아래 :unit_id 를 2) 결과의 unit_id 로 바꾼 뒤 실행.
--    주의: 단어추출·문장학습이 문장 행을 쓰는 커리면 합치지 마세요.
--    먼저 BEGIN; … ROLLBACK; 으로 확인 권장.
-- ────────────────────────────────────────────────────────────
/*
BEGIN;

-- ▼ 여기만 교체
-- SELECT 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid AS unit_id;
WITH target AS (
  SELECT 'PASTE-UNIT-ID-HERE'::uuid AS unit_id
),
ordered AS (
  SELECT
    p.*,
    row_number() OVER (ORDER BY p.passage_no, p.created_at) AS rn
  FROM textbook_passages p
  JOIN target t ON t.unit_id = p.unit_id
),
merged AS (
  SELECT
    (SELECT id FROM ordered WHERE rn = 1) AS keep_id,
    string_agg(english, ' ' ORDER BY rn) AS english_all,
    nullif(string_agg(korean, E'\n' ORDER BY rn) FILTER (WHERE korean IS NOT NULL AND btrim(korean) <> ''), '') AS korean_all,
    array_agg(id ORDER BY rn) AS all_ids
  FROM ordered
)
UPDATE textbook_passages p
SET
  english = m.english_all,
  korean = m.korean_all,
  -- code 는 기존 첫 행 유지 ( -1/-2 접미사 행이면 루트만 남기고 싶을 때 수동 조정 )
  updated_at = now()
FROM merged m
WHERE p.id = m.keep_id;

-- 첫 행 제외 삭제
WITH target AS (
  SELECT 'PASTE-UNIT-ID-HERE'::uuid AS unit_id
),
ordered AS (
  SELECT p.id, row_number() OVER (ORDER BY p.passage_no, p.created_at) AS rn
  FROM textbook_passages p
  JOIN target t ON t.unit_id = p.unit_id
)
DELETE FROM textbook_passages p
USING ordered o
WHERE p.id = o.id AND o.rn > 1;

-- 확인
-- SELECT passage_no, code, left(english, 200), left(korean, 120)
-- FROM textbook_passages WHERE unit_id = 'PASTE-UNIT-ID-HERE'::uuid;

COMMIT;
-- 문제 있으면 ROLLBACK;
*/


-- ────────────────────────────────────────────────────────────
-- 4) Edge Function(본문통합·문장분리) 배포는 SQL이 아님
--    Dashboard → Edge Functions → import-claude-handout
--    또는: supabase functions deploy import-claude-handout
--    패치 파일: gwj-study/scripts/lab-whole-passage.patch
-- ────────────────────────────────────────────────────────────
