import { validateHeaderValue } from 'http';
import { attachmentContentDisposition } from './content-disposition';

describe('attachmentContentDisposition', () => {
  it.each(['Bericht – 2026.pdf', '报告.pdf', 'emoji 🎉.pdf', 'a "quoted" name.pdf'])('is a valid header for %s', (name) => {
    expect(() => validateHeaderValue('Content-Disposition', attachmentContentDisposition(name))).not.toThrow();
  });

  it('contains the exact name encoded and an ASCII fallback', () => {
    expect(attachmentContentDisposition('Über "x".pdf')).toBe(
      `attachment; filename="_ber _x_.pdf"; filename*=UTF-8''%C3%9Cber%20%22x%22.pdf`,
    );
  });

  it('documents that the previous header value was invalid', () => {
    expect(() => validateHeaderValue('Content-Disposition', 'attachment; filename="报告.pdf"')).toThrow();
  });
});
