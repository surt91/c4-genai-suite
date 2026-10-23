import { parseHeaders } from './headers';

describe('parseHeaders', () => {
  it('parses one header per line and keeps "=" in values', () => {
    expect(parseHeaders('Authorization=Basic dXNlcjpwYXNz==\r\nX-Api-Key = abc=def\n\n')).toEqual({
      Authorization: 'Basic dXNlcjpwYXNz==',
      'X-Api-Key': 'abc=def',
    });
  });

  it('still supports "," and ";" as separator between pairs', () => {
    expect(parseHeaders('a=1,b=2; c=3')).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('keeps "," and ";" inside values', () => {
    expect(parseHeaders('Accept=text/html, application/json\nCookie=x;y')).toEqual({
      Accept: 'text/html, application/json',
      Cookie: 'x;y',
    });
  });

  it('ignores invalid lines and empty input', () => {
    expect(parseHeaders('novalue\n=value\nkey=')).toEqual({});
    expect(parseHeaders(undefined)).toEqual({});
  });
});
