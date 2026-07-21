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

function classifyPassageFormat(passage) {
  const text = String(passage || "");
  const reasons = [];
  if (!text.trim()) return { abnormal: true, reasons: ["empty"], label: "passage_format" };
  if (/[\u2460-\u2473\u2776-\u277F\u278A-\u2793\u2474-\u2487]/.test(text)) reasons.push("circled_markers");
  const hangulChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
  const latinChars = (text.match(/[A-Za-z]/g) || []).length;
  const letterTotal = hangulChars + latinChars;
  if (letterTotal > 40 && hangulChars / letterTotal >= 0.06) reasons.push("korean_mixed");
  const lines = text.replace(/\r\n/g, "\n").split("\n").map((l) => l.trim()).filter(Boolean);
  let koOnlyLines = 0;
  let glossLines = 0;
  for (const line of lines) {
    const h = (line.match(/[\uAC00-\uD7AF]/g) || []).length;
    const a = (line.match(/[A-Za-z]/g) || []).length;
    if (h >= 2 && a === 0) koOnlyLines++;
    if (h >= 2 && a >= 2 && h >= a * 0.5) glossLines++;
    if (/(?:^|\s)\*+[A-Za-z]/.test(line) && h >= 1) glossLines++;
  }
  if (koOnlyLines >= 1) reasons.push("title_or_ko_lines");
  if (glossLines >= 2) reasons.push("ko_gloss_lines");
  if (/(?:^|\n)\s*(?:\[[^\]]*\d+[^\]]*\]|\d+\s*번)\s*(?:\n|$)/.test(text)) reasons.push("unit_header_in_passage");
  return { abnormal: reasons.length > 0, reasons, label: reasons.length ? "passage_format" : "clean" };
}

function diagnose(rec) {
  const d = rec.data || {};
  const passage = d.passage || "";
  const sentences = Array.isArray(d.sentences) ? d.sentences : [];
  const format = classifyPassageFormat(passage);
  const title = d.title_ko || d.expected_title || d.topic_en || "";
  const emptyAnalysisCount = sentences.filter((s) => !Array.isArray(s.analysis) || !s.analysis.length).length;

  if (!passage.trim()) {
    return {
      id: rec.id || "",
      title,
      expectedCount: 0,
      actualCount: sentences.length,
      ok: false,
      category: "passage_format",
      formatReasons: ["empty"],
      reconcileEligible: false,
      message: "passage 없음",
      missing: [],
      invented: [],
      emptyAnalysisCount,
    };
  }
  if (format.abnormal) {
    return {
      id: rec.id || "",
      title,
      expectedCount: splitEnglishSentences(passage).length,
      actualCount: sentences.length,
      ok: false,
      category: "passage_format",
      formatReasons: format.reasons,
      reconcileEligible: false,
      message: "passage 형식 이상: " + format.reasons.join("+"),
      missing: [],
      invented: [],
      emptyAnalysisCount,
    };
  }

  const originals = splitEnglishSentences(passage);
  const gate = validatePassageSentenceFidelity(passage, sentences);
  const joinedSaved = compactAlpha(sentences.map(sentencePlainText).join(" "));
  const missing = originals.filter((o) => compactAlpha(o) && !joinedSaved.includes(compactAlpha(o)));
  const invented = sentences
    .map(sentencePlainText)
    .filter((p) => compactAlpha(p) && !compactAlpha(passage).includes(compactAlpha(p)));
  return {
    id: rec.id || "",
    title,
    expectedCount: originals.length,
    actualCount: sentences.length,
    ok: !!gate.ok,
    category: gate.ok ? "ok" : "sentence_damage",
    formatReasons: [],
    reconcileEligible: !gate.ok,
    message: gate.message || "",
    missing,
    invented,
    emptyAnalysisCount,
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
  ["id", "title", "category", "format_reasons", "reconcile_eligible", "expected_n", "saved_n", "ok", "missing", "invented", "empty_analysis", "message"],
];
let damaged = 0, formatBad = 0, sentenceBad = 0;
for (const rec of analysis) {
  const d = diagnose(rec);
  if (!d.ok) damaged++;
  if (d.category === "passage_format") formatBad++;
  if (d.category === "sentence_damage") sentenceBad++;
  damageRows.push([
    d.id,
    d.title,
    d.category,
    (d.formatReasons || []).join("+"),
    d.reconcileEligible ? "Y" : "N",
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
console.log(`① ${basename(file)}: total=${analysis.length} format=${formatBad} sentence=${sentenceBad} ok=${analysis.length - damaged}`);
console.log(`   CSV: ${damagePath}`);

const dryRows = [
  ["id", "title", "category", "skipped", "before_ok", "after_ok", "expected_n", "before_n", "after_n", "missing_before", "invented_before", "empty_after"],
];
let wouldFix = 0;
let skippedFormat = 0;
let emptyAfterTotal = 0;
for (const rec of analysis) {
  const before = diagnose(rec);
  if (!before.reconcileEligible) {
    if (before.category === "passage_format") skippedFormat++;
    dryRows.push([
      rec.id,
      before.title,
      before.category,
      before.category === "passage_format" ? "passage_format" : before.ok ? "already_ok" : "ineligible",
      before.ok ? "Y" : "N",
      before.ok ? "Y" : "N",
      before.expectedCount,
      before.actualCount,
      before.actualCount,
      before.missing.length,
      before.invented.length,
      before.emptyAnalysisCount,
    ]);
    continue;
  }
  const originals = splitEnglishSentences(rec.data.passage || "");
  const next = reconcileAnalysisSentences(originals, rec.data.sentences || []);
  const after = validatePassageSentenceFidelity(rec.data.passage || "", next);
  const emptyAfter = next.filter((s) => !s.analysis || !s.analysis.length).length;
  emptyAfterTotal += emptyAfter;
  if (!before.ok && after.ok) wouldFix++;
  dryRows.push([
    rec.id,
    before.title,
    before.category,
    "",
    before.ok ? "Y" : "N",
    after.ok ? "Y" : "N",
    originals.length,
    before.actualCount,
    next.length,
    before.missing.length,
    before.invented.length,
    emptyAfter,
  ]);
  if (apply) {
    rec.data.sentences = next;
    rec.data.passage_html = ensurePassageHtmlFidelity(rec.data.passage, rec.data.passage_html);
  }
}
const dryCsv = dryRows.map((r) => r.map(csvEscape).join(",")).join("\n");
const dryPath = join(outDir, `gwj_fidelity_dryrun_${stamp}.csv`);
writeFileSync(dryPath, "\uFEFF" + dryCsv, "utf8");
console.log(`② dry-run: wouldFix=${wouldFix} skippedFormat=${skippedFormat} emptyAfter(eligible only)=${emptyAfterTotal}`);
console.log(`   CSV: ${dryPath}`);

if (apply) {
  const out = {
    v: 1,
    exportedAt: new Date().toISOString(),
    count: records.length,
    repairedAt: new Date().toISOString(),
    note: "sentence reconcile applied only to sentence_damage; passage_format excluded",
    records,
  };
  const outPath = join(outDir, `gwj_backup_repaired_${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");
  console.log(`② apply: ${outPath}`);
} else {
  console.log("② apply 안 함 (--apply 로 적용). passage_format 은 절대 적용되지 않음.");
}
