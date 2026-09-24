# 러버블 지시서 — 본문통합(`passage_input: whole`) + 문장분리 공유

아래 블록 전체를 구문랩(러버블) 채팅에 **그대로 붙여넣기** 하세요.  
SQL Editor가 아니라 **Edge Function `import-claude-handout`** 수정·배포 작업입니다.

---

## 붙여넣기 시작

```
구문랩 Supabase Edge Function `import-claude-handout`을 수정해 주세요.
프론트 UI 변경 금지. DB 스키마 변경 금지. SQL 마이그레이션 금지.
목표는 Syntax Studio에서 보내는 passage_input: "whole" | "sentence" 를 저장 단계에서 존중하는 것입니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) 새 파일 추가
경로: supabase/functions/_shared/splitEnglishSentences.js
(없으면 _shared 폴더 생성)

파일 내용 전체 (그대로 저장):

/**
 * 영어 문장 경계 분리 — Syntax Studio와 구문랩(import-claude-handout)이 같이 씀.
 * 약어(Mr./Ms./U.S./p.m.)·닫는 인용부호·말줄임(...)에서 문장을 잘라 내지 않고,
 * 글자는 버리지 않는다. 종결부호 없는 제목·날짜 줄은 다음 대문자 줄과 분리한다.
 *
 * 브라우저: <script src="assets/split-english-sentences.js"> → globalThis.GWJSplit
 * Node: require('./split-english-sentences.js')
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.GWJSplit = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var CLOSERS = /["'”’»)\]\]]/;
  var TITLE_ABBREV = {
    mr: 1, mrs: 1, ms: 1, dr: 1, prof: 1, sr: 1, jr: 1, st: 1,
    gen: 1, col: 1, lt: 1, sgt: 1, rev: 1, hon: 1
  };
  /** 뒤가 소문자면 문장 끝이 아님. 대문자로 새 문장이 시작하면 끊음 (7 p.m. This). */
  var SOFT_ABBREV = {
    am: 1, pm: 1, us: 1, uk: 1, usa: 1, eg: 1, ie: 1, etc: 1, vs: 1,
    inc: 1, ltd: 1, fig: 1, vol: 1, no: 1, pp: 1, al: 1,
    jan: 1, feb: 1, mar: 1, apr: 1, jun: 1, jul: 1, aug: 1,
    sep: 1, sept: 1, oct: 1, nov: 1, dec: 1
  };

  function closersEnd(text, i) {
    var j = i;
    while (j + 1 < text.length && CLOSERS.test(text[j + 1])) j++;
    return j;
  }

  function restAfter(text, i) {
    return text.slice(closersEnd(text, i) + 1);
  }

  function hasBoundary(text, i) {
    var rest = restAfter(text, i);
    return rest.length === 0 || /^\s/.test(rest);
  }

  function nextIsSentenceStart(text, i) {
    var rest = restAfter(text, i);
    if (!rest) return true;
    return /^\s+["'“‘(\[]*[A-Z]/.test(rest);
  }

  function abbrevWord(text, periodIndex) {
    var s = periodIndex;
    while (s > 0 && /[A-Za-z.]/.test(text[s - 1])) s--;
    return text.slice(s, periodIndex);
  }

  function periodShouldSplit(text, i) {
    var prev = text[i - 1] || '';
    var next = text[i + 1] || '';
    if (/\d/.test(prev) && /\d/.test(next)) return false;

    var word = abbrevWord(text, i);
    if (/^[A-Z]$/.test(word)) return false;
    if (/^[ap]$/i.test(word) && /^m(?:\.|\b)/i.test(text.slice(i + 1))) return false;

    var norm = word.toLowerCase().replace(/\./g, '');
    if (TITLE_ABBREV[word.toLowerCase()] || TITLE_ABBREV[norm]) return false;
    if (SOFT_ABBREV[norm]) return nextIsSentenceStart(text, i);
    return true;
  }

  function splitOnTerminators(text) {
    var parts = [];
    var buf = '';
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      buf += ch;
      if (ch !== '.' && ch !== '!' && ch !== '?' && ch !== '…') continue;

      var end = i;
      var dots = ch === '.' ? 1 : 0;
      if (ch === '.') {
        while (end + 1 < text.length && text[end + 1] === '.') {
          end++;
          buf += '.';
          dots++;
        }
        i = end;
      }

      if (!hasBoundary(text, i)) continue;
      if (dots === 1 && !periodShouldSplit(text, i)) continue;

      var j = closersEnd(text, i);
      if (j > i) {
        buf += text.slice(i + 1, j + 1);
        i = j;
      }
      var sentence = buf.trim();
      if (sentence) parts.push(sentence);
      buf = '';
    }
    var tail = buf.trim();
    if (tail) parts.push(tail);
    return parts;
  }

  /** 마침표 없이 끝난 줄 다음에 대문자 줄이 오면 제목·날짜로 분리 */
  function splitBareHeadingLines(text) {
    var lines = String(text || '').split('\n');
    var blocks = [];
    var buf = [];
    function flush() {
      var s = buf.join('\n').trim();
      buf = [];
      if (s) blocks.push(s);
    }
    for (var i = 0; i < lines.length; i++) {
      var cur = lines[i].trim();
      if (i > 0 && buf.length && cur) {
        var prev = buf[buf.length - 1].trim();
        var prevEnds = /[.!?…]["'”’»)\]\]]*$/.test(prev);
        var curStarts = /^["'“‘(\[]*[A-Z0-9]/.test(cur);
        if (prev && !prevEnds && curStarts) flush();
      }
      buf.push(lines[i]);
    }
    flush();
    return blocks.length ? blocks : [String(text || '')];
  }

  function splitEnglishSentences(text) {
    var trimmed = String(text || '').replace(/\r\n/g, '\n').trim();
    if (!trimmed) return [];

    var blocks = splitBareHeadingLines(trimmed);
    var parts = [];
    for (var b = 0; b < blocks.length; b++) {
      var chunk = splitOnTerminators(blocks[b]);
      for (var c = 0; c < chunk.length; c++) parts.push(chunk[c]);
    }

    if (parts.length <= 1 && trimmed.indexOf('\n') >= 0) {
      var lines = trimmed.split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (lines.length > 1) return lines;
    }
    return parts.length ? parts : [trimmed];
  }

  /**
   * 통입력(본문통합)은 전송 시 사용자가 선택한다.
   * 커리큘럼 제한 없음 — 호환용으로 true 유지.
   */
  function allowsWholePassageInput(/* meta */) {
    return true;
  }

  return {
    splitEnglishSentences: splitEnglishSentences,
    allowsWholePassageInput: allowsWholePassageInput
  };
});

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) 수정 파일: supabase/functions/import-claude-handout/index.ts

(A) 파일 상단, createClient import 바로 아래에 추가:

import "../_shared/splitEnglishSentences.js";

type SharedSplit = {
  splitEnglishSentences: (text: string) => string[];
  allowsWholePassageInput?: (meta: Record<string, unknown>) => boolean;
};

function sharedSplit(): SharedSplit {
  const api = (globalThis as { GWJSplit?: SharedSplit }).GWJSplit;
  if (!api?.splitEnglishSentences) {
    throw new Error("문장 분리 모듈(GWJSplit)을 불러오지 못했습니다");
  }
  return api;
}

※ Deno에서 side-effect import가 GWJSplit을 못 올리면,
   splitEnglishSentences.js를 ESM export 형태로 바꿔도 됩니다.
   핵심은 sharedSplit().splitEnglishSentences 가 동작하면 됩니다.

(B) splitIntoSentences() 안의 Step 4 (정규식 .split 부분)를 아래로 교체:

  // [Step 4] Syntax Studio와 같은 분리기 (약어·인용부호·말줄임)
  const parts = sharedSplit().splitEnglishSentences(englishText);

  기존 코드 삭제 대상 예시:
  // const parts = englishText.split(/(?<=[.!?])...

(C) Payload 인터페이스에 필드 추가:

  /** sentence = 문장별 행(기본). whole = 유닛당 지문 1행(본문통합) */
  passage_input?: "whole" | "sentence";

(D) validate() 안에 sentences 배열 검사 근처에 추가:

  if (p.passage_input != null && p.passage_input !== "whole" && p.passage_input !== "sentence") {
    return { ok: false, error: "passage_input must be whole or sentence" };
  }

(E) 핸들러에서 문장 배열을 만드는 부분 — const → let 으로 바꾸고, 한글 추출 직후에 본문통합 병합:

  // 기존
  // const sentences = splitIntoSentences(p.passage);
  // const koreanSentences = extractPayloadKoreanSentences(p, sentences.length);

  // 변경
  let sentences = splitIntoSentences(p.passage);
  if (sentences.length === 0)
    return json({ ok: false, error: "passage에서 문장을 찾지 못했습니다" }, 400);

  // ... (기존 코드: sentences 배열 보강 / existingFamily 조회 등은 그대로) ...

  let koreanSentences = extractPayloadKoreanSentences(p, sentences.length);
  if (p.passage_input === "whole") {
    const explicitKo = Array.isArray(p.sentences)
      ? p.sentences.map((s) => String(s?.ko || s?.translation || s?.korean || "")
          .replace(/^▶?\s*직독[·ㆍ]\s*의역\s*/i, "")
          .replace(/\s+/g, " ")
          .trim()).filter(Boolean)
      : [];
    const koJoined = (explicitKo.length ? explicitKo : koreanSentences).join("\n");
    sentences = [sentences.join(" ")];
    koreanSentences = [koJoined];
  }
  const isMulti = sentences.length > 1;

중요:
- passage_input === "whole" 일 때만 1행으로 합칩니다.
- 없거나 "sentence"면 기존처럼 문장별 행.
- analysis_html / structure_html / structure JSON 저장 로직은 건드리지 마세요.
- 인증·시리즈/권/유닛 생성 로직도 건드리지 마세요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) 배포
수정 후 Edge Function `import-claude-handout` 을 배포해 주세요.
(Supabase: supabase functions deploy import-claude-handout)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4) 완료 확인 (간단)
- 요청 body에 "passage_input":"whole" → textbook_passages에 해당 유닛 영어가 1행.
- "passage_input":"sentence" 또는 생략 → 기존처럼 문장 수만큼 행.
- Mr./U.S./p.m. 때문에 문장이 잘못 잘리지 않을 것.
- 배포 후 함수 URL은 기존과 동일:
  https://vyiwfkctilezvpafqjek.supabase.co/functions/v1/import-claude-handout

작업 끝나면 변경 파일 목록과 배포 여부를 짧게 알려 주세요.
```

## 붙여넣기 끝

---

### 참고 (사람용)
- Studio(gwj-study) PR에는 이미 `passage_input` 전송 UI가 있음.
- 이 지시서는 **구문랩이 whole를 1행으로 저장**하게 만드는 서버 쪽 작업.
- SQL Editor에 패치를 넣으면 안 됨.
