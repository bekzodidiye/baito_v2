/**
 * A short two-note chime for an arriving notification.
 *
 * Generated rather than loaded: an audio file would be another asset to ship,
 * cache and keep, for a third of a second of sound.
 *
 * Browsers refuse to start audio until the person has interacted with the
 * page, and some block it outright. Every path here fails silently — a
 * notification that cannot make a sound must still show its banner, so this
 * never throws into the caller.
 */
let ctx: AudioContext | null = null;

const context = (): AudioContext | null => {
  try {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctx) ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
};

const note = (ac: AudioContext, freq: number, startAt: number, seconds: number) => {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  // Ramped rather than switched: an abrupt start or stop is heard as a click.
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.12, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + seconds);
  osc.connect(gain).connect(ac.destination);
  osc.start(startAt);
  osc.stop(startAt + seconds + 0.02);
};

export const chime = (): void => {
  const ac = context();
  if (!ac) return;
  try {
    // Autoplay policy parks the context until a gesture has happened.
    if (ac.state === 'suspended') void ac.resume().catch(() => {});
    const t = ac.currentTime;
    note(ac, 880, t, 0.14);        // A5
    note(ac, 1174.66, t + 0.11, 0.20);  // D6
  } catch {
    // No sound is an acceptable outcome; the banner still appears.
  }
};
