/** The map ends where the screen ends.
 *
 *  Its height was `md:h-[calc(100vh-64px)]` — 64px taken off for the bottom
 *  navigation bar. That bar is `h-16 md:hidden`, so on a desktop it is not
 *  rendered at all and nothing stood in those 64px: a strip of empty white lay
 *  across the bottom of the window, and the collapsed job sheet, which hangs
 *  off the map's own bottom edge, stopped 64px short of the screen.
 *
 *  Measured at 1663x965: the map came to 901px, the bar to 0.
 *
 *  Both files are read here so the two cannot drift apart — if the bar ever
 *  becomes visible on a desktop, this test is what says the height has to
 *  account for it again.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.resolve(__dirname, file), 'utf8');

const BOTTOM_NAV = '../BottomNav.tsx';
const MAP = './MapViewScreen.tsx';

/** The `className = "..."` default the jobs screen renders the map with. */
const defaultMapClasses = (): string => {
  const match = read(MAP).match(/className\s*=\s*"([^"]*100vh[^"]*)"/);
  if (!match) throw new Error('default map height not found in MapViewScreen.tsx');
  return match[1];
};

/** The classes on the `<nav>` the bar draws itself as. */
const bottomNavClasses = (): string => {
  const match = read(BOTTOM_NAV).match(/className=\{`([^`]*)`/);
  if (!match) throw new Error('root className not found in BottomNav.tsx');
  return match[1];
};

describe('the bottom navigation bar', () => {
  it('is drawn on phones only', () => {
    expect(bottomNavClasses()).toContain('md:hidden');
  });

  it('is the 64px the map used to subtract', () => {
    // h-16 = 4rem = 64px. The number below depends on this one.
    expect(bottomNavClasses()).toMatch(/\bh-16\b/);
  });
});

describe('the height of the jobs map', () => {
  it('reserves room for the bar on a phone, where the bar is', () => {
    const classes = defaultMapClasses();
    expect(classes).toContain('h-[calc(100vh-56px-64px)]'); // header + bar
    expect(classes).toContain('mt-14'); // and clears the fixed header
  });

  it('reserves none on a desktop, where the bar is not', () => {
    const desktop = defaultMapClasses().match(/\bmd:h-\S+/)?.[0];
    expect(desktop).toBe('md:h-screen');
  });

  it('subtracts nothing at all from the desktop height', () => {
    // Anything of the form md:h-[calc(100vh-...)] is a strip of dead space
    // unless something is standing in it. Nothing is.
    expect(defaultMapClasses()).not.toMatch(/md:h-\[calc\([^\]]*-/);
  });

  it('starts at the top of the window on a desktop', () => {
    // A top margin would push the bottom back off the screen again.
    expect(defaultMapClasses()).toContain('md:mt-0');
  });
});

describe('the screens that fill the window agree with each other', () => {
  it('messages already reaches the bottom the same way', () => {
    // The precedent this follows: same shell, same breakpoint, md:h-screen.
    const messages = fs.readFileSync(
      path.resolve(__dirname, '../messages/MessagesScreen.tsx'), 'utf8',
    );
    expect(messages).toContain('md:h-screen');
  });
});
