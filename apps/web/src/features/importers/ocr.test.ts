import { describe, expect, it } from 'vitest';
import { joinPages, pickUncertain } from './ocr';

describe('OCR helpers', () => {
  it('keeps low-confidence words with letters or digits, trimmed and de-duplicated per page', () => {
    const words = [{ text: 'Ward', confidence: 96, page: 0 }, { text: '7B,', confidence: 41.6, page: 0 }, { text: '7B', confidence: 50, page: 0 }, { text: '—', confidence: 10, page: 0 }, { text: 'Fernhi1l', confidence: 63, page: 1 }];
    expect(pickUncertain(words)).toEqual([{ text: '7B', confidence: 42, page: 0 }, { text: 'Fernhi1l', confidence: 63, page: 1 }]);
  });
  it('joins pages with blank lines and tidies spacing', () => {
    expect(joinPages(['Line one  \nLine two\n\n\n\nPara', '', '  Page two '])).toBe('Line one\nLine two\n\nPara\n\nPage two');
  });
});
