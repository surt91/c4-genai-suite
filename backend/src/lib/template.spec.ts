import { renderTemplate } from './template';

describe('renderTemplate', () => {
  it('replaces variables with and without whitespace', () => {
    expect(renderTemplate("Today's date is {{date}}, user: {{ user }}.", { date: '2026-01-02', user: 'alice' })).toBe(
      "Today's date is 2026-01-02, user: alice.",
    );
  });

  it('resolves dotted paths', () => {
    const data = { user: { name: 'Alice', email: 'alice@example.com', address: { city: 'Berlin' } } };

    expect(renderTemplate('{{ user.email }} / {{user.address.city}}', data)).toBe('alice@example.com / Berlin');
  });

  it('replaces unknown variables, null and undefined with an empty string', () => {
    expect(
      renderTemplate('[{{ missing }}][{{ user.missing.deep }}][{{ a }}][{{ b }}]', { user: {}, a: null, b: undefined }),
    ).toBe('[][][][]');
  });

  it('converts other values to strings', () => {
    expect(renderTemplate('{{ n }} {{ yes }} {{ list }} {{ zero }}', { n: 42, yes: true, list: ['a', 'b'], zero: 0 })).toBe(
      '42 true a,b 0',
    );
  });

  it('inserts values without escaping', () => {
    expect(renderTemplate('{{ value }}', { value: `O'Brien <b>&</b> "x"` })).toBe(`O'Brien <b>&</b> "x"`);
  });

  it('does not render template values recursively', () => {
    expect(renderTemplate('{{ a }}', { a: '{{ b }}', b: 'nope' })).toBe('{{ b }}');
  });

  it('leaves everything else untouched', () => {
    const template = '{% if x %}y{% endif %} {{ x | upper }} {{ "literal" }} {# comment #} { single } $x';

    expect(renderTemplate(template, { x: 'q' })).toBe(template);
  });

  it('does not expose prototype properties', () => {
    expect(renderTemplate('[{{ user.constructor }}][{{ user.__proto__ }}][{{ fn }}]', { user: {}, fn: () => 1 })).toBe('[][][]');
  });
});
