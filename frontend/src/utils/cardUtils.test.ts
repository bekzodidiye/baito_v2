import { describe, it, expect } from 'vitest';
import { getBankName } from './cardUtils';

/**
 * This decides what a person is told about their own card. Getting it wrong is
 * not dangerous, but it is the kind of wrong that makes someone distrust the
 * screen their money is on.
 */
describe('getBankName', () => {
  it.each([
    ['860002', 'NBU'],
    ['860011', 'Agrobank'],
    ['860049', 'Kapitalbank'],
    ['986002', 'NBU'],
    ['986025', 'TBC Bank'],
    ['986029', 'Anorbank'],
  ])('maps the BIN %s to %s', (bin, expected) => {
    expect(getBankName(`${bin}1234567890`)).toBe(expected);
  });

  it('ignores the spaces a card number is displayed with', () => {
    expect(getBankName('8600 0200 0000 0000')).toBe('NBU');
    expect(getBankName('8600020000000000')).toBe('NBU');
  });

  it('falls back by scheme when the BIN is not one it knows', () => {
    expect(getBankName('8600990000000000')).toBe("O'zbekiston Banki");
    expect(getBankName('9860990000000000')).toBe("O'zbekiston Banki");
    expect(getBankName('4111111111111111')).toBe('Visa Card');
    expect(getBankName('5555555555554444')).toBe('Mastercard');
  });

  it('says nothing until there is enough of a number to say it from', () => {
    // Six digits is the BIN. Before that any answer would be a guess shown to
    // someone mid-typing.
    expect(getBankName('')).toBe('');
    expect(getBankName('86000')).toBe('');
    expect(getBankName('8600 0')).toBe('');
    expect(getBankName('860002')).toBe('NBU');
  });

  it('gives a neutral label rather than a wrong one for an unknown scheme', () => {
    expect(getBankName('7777777777777777')).toBe('Bank nomi');
  });
});
