# 러버블 지시서 — Textbook 생성 duplicate key (`textbooks_level_unit_no_key`)

Syntax Studio 일괄 전송 실패:

```
Textbook 생성 실패: duplicate key value violates unique constraint "textbooks_level_unit_no_key"
```

경로 예: `L09 › (고2) 2026 수능특강 영어 › 26강 › [유닛]`  
실패 예: 이야기가 키우는 공감 능력 / 문화 간 신호 해석의 차이 / 예술 작품 감상과 맥락

Studio·본문통합·분석/구조도 첨부와 무관. **구문랩 `import-claude-handout`의 Textbook(권) 생성/조회 로직** 문제입니다.

---

## 붙여넣기 시작

```
Edge Function import-claude-handout 의 Textbook(권/교재) 생성 로직을 고쳐 주세요.
프론트 UI·스키마 파괴적 변경은 최소화. 인증·분석/구조도 저장은 건드리지 마세요.

증상
- POST 시 "Textbook 생성 실패: duplicate key value violates unique constraint \"textbooks_level_unit_no_key\""
- 같은 level(L09) 아래 다른 시리즈에 이미 같은 unit_no(또는 volume_no) 숫자가 있으면 INSERT가 충돌합니다.
- 예: 시리즈 "(고2) 2026 수능특강 영어" / volume_title "26강" 전송 시 실패.

원인 가설 (확인 후 수정)
1) textbooks 테이블 UNIQUE가 (level_id, unit_no) 처럼 series를 무시함 → 시리즈가 달라도 같은 숫자면 충돌
2) 또는 Textbook INSERT 시 volume이 아니라 unit_no를 잘못 넣고, 기존 행과 충돌하는데 upsert/재조회를 안 함

해야 할 일

A) 제약/스키마 확인 (SQL로 보고만)
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname = 'textbooks_level_unit_no_key';

textbooks 컬럼과 실제 UNIQUE 키를 알려 주세요.

B) import-claude-handout 에서 Textbook(Volume) 확보 로직을 다음처럼 바꿔 주세요.
올바른 계층: Level → Series → Textbook(Volume) → Unit → Passage

1. series_id 로 시리즈를 먼저 찾거나 생성
2. Textbook은 반드시 series_id + volume_title(또는 series_id + volume_no) 로 조회
3. 있으면 그 id 재사용, 없을 때만 INSERT
4. INSERT 중 unique 충돌(23505)이 나면 INSERT 실패로 끝내지 말고 SELECT로 기존 행을 다시 읽어 계속 진행 (upsert/recover)
5. textbooks.unit_no 에 Unit의 unit_no를 넣지 마세요. Unit 번호는 units 테이블에만.
   volume 정렬 숫자가 필요하면 volume_no / textbook_no 등 volume 전용 필드를 쓰세요.

C) UNIQUE가 정말 (level, unit_no) 이고 series를 무시한다면
- 가능하면 UNIQUE를 (series_id, volume_no) 또는 (series_id, title) 로 바꾸는 마이그레이션을 제안·적용
- 당장 마이그레이션이 위험하면 B의 “충돌 시 재조회” + series 범위 조회로 전송이 막히지 않게 먼저 고치세요.
  (단, level 범위 UNIQUE면 다른 시리즈 동명/동번호 권이 잘못 재사용될 수 있으니 series_id 조건이 필수)

D) 회귀 확인
- 같은 L09 아래 서로 다른 시리즈에 각각 "26강" volume 생성/재전송이 성공해야 함
- 이미 있는 volume에 유닛 추가(덮어쓰기)도 성공
- passage_input whole/sentence, analysis_html, structure_html 동작 유지

작업 후: 변경 파일, 제약 정의(A 결과), 배포 여부를 짧게 보고해 주세요.
```

## 붙여넣기 끝

---

## Studio 쪽 임시 우회 (사람용)
- 본문통합 문제가 아님. 같은 3개 재전송해도 Textbook 단계에서 또 막힐 수 있음.
- 구문랩에 해당 시리즈·26강이 이미 있으면, 러버블 수정 전엔 Studio만으로 해결 어려움.
- 수정 배포 후 같은 경로로 3개만 다시 📚 전송하면 됨.
