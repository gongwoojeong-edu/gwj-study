const assert = require('assert');
const { splitEnglishSentences, allowsWholePassageInput } = require('../assets/split-english-sentences.js');

function compact(s) {
  return String(s || '').replace(/\s+/g, '');
}

function lossless(text) {
  const parts = splitEnglishSentences(text);
  assert.strictEqual(compact(parts.join(' ')), compact(text), text);
  return parts;
}

const mr = lossless('Mr. Smith stayed home. He left.');
assert.deepStrictEqual(mr, ['Mr. Smith stayed home.', 'He left.']);

const ms = lossless('Dear Ms. MacAlpine, I was so excited. I look forward to hearing from you.');
assert.strictEqual(ms.length, 2);
assert.ok(ms[0].indexOf('Ms. MacAlpine') >= 0);

const quote = lossless('He said "Hello." She left.');
assert.deepStrictEqual(quote, ['He said "Hello."', 'She left.']);

const curly = lossless('He said “Hello.” She left.');
assert.strictEqual(curly.length, 2);
assert.ok(curly[0].indexOf('Hello.') >= 0);

const ellipsis = lossless('Wait... Then she spoke.');
assert.deepStrictEqual(ellipsis, ['Wait...', 'Then she spoke.']);

const ellipsisChar = lossless('Wait… Then she spoke.');
assert.strictEqual(ellipsisChar.length, 2);

const pmMid = lossless('We meet at 5 p.m. today in the hall.');
assert.strictEqual(pmMid.length, 1);

const pmEnd = lossless('The library closes at 7 p.m. This change would help.');
assert.strictEqual(pmEnd.length, 2);
assert.ok(/^The library closes at 7 p\.m\.$/.test(pmEnd[0]));

const decimal = lossless('The price is 3.14 dollars today.');
assert.strictEqual(decimal.length, 1);

const us = lossless('U.S. policy changed. It worked.');
assert.deepStrictEqual(us, ['U.S. policy changed.', 'It worked.']);

const date = lossless('July 29, Monday\nOur club arrived at the sanctuary. We stayed.');
assert.strictEqual(date.length, 3);
assert.strictEqual(date[0], 'July 29, Monday');

const wrap = lossless('I am writing in\nresponse to your ad in the Journal. Thank you.');
assert.strictEqual(wrap.length, 2);
assert.ok(wrap[0].indexOf('response to your ad') >= 0);

assert.strictEqual(allowsWholePassageInput({
  level: 'L08', series_title: '고1 부교재', volume_title: '1강'
}), true);
assert.strictEqual(allowsWholePassageInput({
  level: 'L09', series_title: '고2 모의고사', volume_title: '2026년 3월'
}), true);
assert.strictEqual(allowsWholePassageInput({
  level: 'L04', series_title: '중1 부교재', volume_title: '1과'
}), true);

console.log('split-english-sentences: ok');
