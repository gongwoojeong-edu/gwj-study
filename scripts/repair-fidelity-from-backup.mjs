/**
 * Syntax Studio 책장 백업 JSON 원문 무결성 복구 (AI 0원 단계)
 *
 * Usage:
 *   node scripts/repair-fidelity-from-backup.mjs path/to/gwj_backup_YYYY-MM-DD.json
 *   node scripts/repair-fidelity-from-backup.mjs backup.json --apply
 *
 * 출력:
 *   - gwj_fidelity_damage_*.csv  (① 읽기만)
 *   - gwj_fidelity_dryrun_*.csv  (②)
 *   - gwj_backup_repaired_*.json (--apply 시)
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

function splitEnglishSentences(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];
  const parts = [];
  let buf = "";
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    buf += ch;
    if (ch === "." || ch === "!" || ch === "?") {
      const rest = trimmed.slice(i + 1);
      if (rest.length === 0 || /^\s/.test(rest)) {
        const s = buf.trim();
        if (s) parts.push(s);
        buf = "";
      }
    }
  }
  const tail = buf.trim();
  if (tail) parts.push(tail);
  if (parts.length <= 1 && trimmed.includes("\n")) {
    const lines = trimmed.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (lines.length > 1) return lines;
  }
  return parts.length > 0 ? parts : [trimmed];
}

function stripHtmlToPlain(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function compactAlpha(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, "")
    .trim();
}

function escapeXmlText(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sentencePlainText(s) {
  if (!s || typeof s !== "object") return "";
  return String(s.sentence_en || stripHtmlToPlain(s.sentence_html || "")).trim();
}

function sentenceCircleNumber(index) {
  const nums = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳";
  return nums[index] || String(index + 1);
}

function applyPlain(en) {
  return escapeXmlText(en).replace(/\n/g, "<br>");
}

function validatePassageSentenceFidelity(passage, sentences) {
  const list = Array.isArray(sentences) ? sentences : [];
  const expected = splitEnglishSentences(passage);
  if (!expected.length) return { ok: false, message: "원문 분리 실패", expectedCount: 0, actualCount: list.length };
  if (list.length !== expected.length) {
    return {
      ok: false,
      message: `문장 수 불일치: ${expected.length} vs ${list.length}`,
      expectedCount: expected.length,
      actualCount: list.length,
    };
  }
  const joined = list.map(sentencePlainText).join(" ");
  if (compactAlpha(passage) !== compactAlpha(joined)) {
    return { ok: false, message: "글자 불일치", expectedCount: expected.length, actualCount: list.length };
  }
  for (let i = 0; i < expected.length; i++) {
    if (compactAlpha(sentencePlainText(list[i])) !== compactAlpha(expected[i])) {
      return { ok: false, message: `${i + 1}번 문장 불일치`, expectedCount: expected.length, actualCount: list.length };
    }
  }
  return { ok: true, expectedCount: expected.length, actualCount: list.length };
}

function reconcileAnalysisSentences(originals, aiSentences) {
  const pool = (Array.isArray(aiSentences) ? aiSentences : []).map((s) => ({
    s,
    used: false,
    key: compactAlpha(sentencePlainText(s)),
  }));
  return originals.map((en, i) => {
    const want = compactAlpha(en);
    let best = pool.find((p) => !p.used && p.key && p.key === want) || null;
    if (!best) {
      let bestLen = 0;
      for (const p of pool) {
        if (p.used || !p.key) continue;
        if (want.includes(p.key) && p.key.length >= 12 && p.key.length > bestLen) {
          best = p;
          bestLen = p.key.length;
        }
      }
    }
    if (!best) {
      let bestLen = 0;
      for (const p of pool) {
        if (p.used || !p.key) continue;
        if (p.key.includes(want) && want.length >= 12 && want.length > bestLen) {
          best = p;
          bestLen = want.length;
        }
      }
    }
    if (best) best.used = true;
    const src = best ? best.s : {};
    const analysis = Array.isArray(src.analysis) ? src.analysis : [];
    let sentence_html = applyPlain(en);
    if (src.sentence_html && compactAlpha(stripHtmlToPlain(src.sentence_html)) === want) {
      sentence_html = src.sentence_html;
    }
    return {
      number: src.number || sentenceCircleNumber(i),
      pattern_name: src.pattern_name || "",
      sentence_en: en,
      sentence_html,
      analysis,
      translation: src.translation || "",
    };
  });
}

function ensurePassageHtmlFidelity(passage, passageHtml) {
  const plain = stripHtmlToPlain(passageHtml || "");
  if (compactAlpha(plain) === compactAlpha(passage)) return passageHtml || applyPlain(passage);
  return applyPlain(passage);
}

function csvEscape(v) {
  const s = String(v == null ? "" : v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function diagnose(rec) {
  const d = rec.data || {};
  const passage = d.passage || "";
  const sentences = Array.isArray(d.sentences) ? d.sentences : [];
  const originals = splitEnglishSentences(passage);
  const gate = passage
    ? validatePassageSentenceFidelity(passage, sentences)
    : { ok: false, message: "passage 없음", expectedCount: 0, actualCount: sentences.length };
  const joinedSaved = compactAlpha(sentences.map(sentencePlainText).join(" "));
  const missing = originals.filter((o) => compactAlpha(o) && !joinedSaved.includes(compactAlpha(o)));
  const invented = sentences
    .map(sentencePlainText)
    .filter((p) => compactAlpha(p) && !compactAlpha(passage).includes(compactAlpha(p)));
  return {
    id: rec.id || "",
    title: d.title_ko || d.expected_title || d.topic_en || "",
    expectedCount: originals.length,
    actualCount: sentences.length,
    ok: !!gate.ok,
    message: gate.message || "",
    missing,
    invented,
    emptyAnalysisCount: sentences.filter((s) => !Array.isArray(s.analysis) || !s.analysis.length).length,
  };
}

const file = process.argv[2];
const apply = process.argv.includes("--apply");
if (!file) {
  console.error("Usage: node scripts/repair-fidelity-from-backup.mjs <gwj_backup.json> [--apply]");
  process.exit(1);
}

const backup = JSON.parse(readFileSync(file, "utf8"));
const records = Array.isArray(backup.records) ? backup.records : Array.isArray(backup) ? backup : [];
const analysis = records.filter((r) => r && r.kind !== "collection" && r.data && r.data.passage);
const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const outDir = dirname(file);

const damageRows = [
  ["id", "title", "expected_n", "saved_n", "ok", "missing", "invented", "empty_analysis", "message"],
];
let damaged = 0;
for (const rec of analysis) {
  const d = diagnose(rec);
  if (!d.ok) damaged++;
  damageRows.push([
    d.id,
    d.title,
    d.expectedCount,
    d.actualCount,
    d.ok ? "Y" : "N",
    d.missing.map((m) => m.slice(0, 80)).join(" | "),
    d.invented.map((m) => m.slice(0, 80)).join(" | "),
    d.emptyAnalysisCount,
    d.message,
  ]);
}
const damageCsv = damageRows.map((r) => r.map(csvEscape).join(",")).join("\n");
const damagePath = join(outDir, `gwj_fidelity_damage_${stamp}.csv`);
writeFileSync(damagePath, "\uFEFF" + damageCsv, "utf8");
console.log(`① damage CSV: ${damagePath} (total=${analysis.length}, damaged=${damaged})`);

const dryRows = [
  ["id", "title", "before_ok", "after_ok", "expected_n", "before_n", "after_n", "missing_before", "invented_before", "empty_after"],
];
let wouldFix = 0;
let emptyAfterTotal = 0;
for (const rec of analysis) {
  const before = diagnose(rec);
  const originals = splitEnglishSentences(rec.data.passage || "");
  const next = reconcileAnalysisSentences(originals, rec.data.sentences || []);
  const after = validatePassageSentenceFidelity(rec.data.passage || "", next);
  const emptyAfter = next.filter((s) => !s.analysis || !s.analysis.length).length;
  emptyAfterTotal += emptyAfter;
  if (!before.ok && after.ok) wouldFix++;
  dryRows.push([
    rec.id,
    before.title,
    before.ok ? "Y" : "N",
    after.ok ? "Y" : "N",
    originals.length,
    before.actualCount,
    next.length,
    before.missing.length,
    before.invented.length,
    emptyAfter,
  ]);
  if (apply && !before.ok) {
    rec.data.sentences = next;
    rec.data.passage_html = ensurePassageHtmlFidelity(rec.data.passage, rec.data.passage_html);
  }
}
const dryCsv = dryRows.map((r) => r.map(csvEscape).join(",")).join("\n");
const dryPath = join(outDir, `gwj_fidelity_dryrun_${stamp}.csv`);
writeFileSync(dryPath, "\uFEFF" + dryCsv, "utf8");
console.log(`② dry-run CSV: ${dryPath} (wouldFix=${wouldFix}, emptyAfterTotal=${emptyAfterTotal})`);

if (apply) {
  const out = {
    v: 1,
    exportedAt: new Date().toISOString(),
    count: records.length,
    repairedAt: new Date().toISOString(),
    note: "sentence reconcile applied; empty analyses still need selective AI fill in app",
    records,
  };
  const outPath = join(outDir, `gwj_backup_repaired_${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`② apply: ${outPath}`);
  console.log("③ 다음: 앱에서 복원 후 「③ 빈분석AI」 실행 (레코드 전체 재생성 금지)");
} else {
  console.log("② apply 안 함. 적용하려면 --apply 추가");
}
