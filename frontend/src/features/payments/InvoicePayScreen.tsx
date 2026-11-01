import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Check, Copy, Landmark, CreditCard, ShieldCheck, AlertTriangle, Loader2, RefreshCw, Printer,
} from 'lucide-react';
import { LoadingOrb } from "@/components/ui/loading-orb";
import '@/components/ui/invoice-card.css';
import { fetchInvoiceApi, declareInvoicePaymentApi } from '../../api/queries';

/** Paying an invoice, opened from the button in the billing email.
 *
 *  Deliberately outside the app's shell: no bottom nav, no drawer, no login.
 *  Whoever opens this arrived from an email, is very likely an accountant with
 *  no account here, and has exactly one thing to do. Everything they would
 *  otherwise have to type — the amount, the account number, the MFO — is
 *  already on the page.
 */

const money = (n: number) => (Number(n) || 0).toLocaleString('ru-RU').replace(/ /g, ' ');

const METHOD_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  bank_transfer: Landmark,
  card: CreditCard,
};

/** A value the payer has to get into their bank app, and the one button that
 *  reliably gets it there. Typing an account number by hand is the step this
 *  page exists to remove. */
const CopyRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Insecure context, or permission refused.
    }
  };

  return (
    <div
      onClick={copy}
      title={`${label}dan nusxa olish`}
      className="group flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-brand-primary/50 hover:shadow-xs transition-all cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-[15px] font-semibold text-slate-900 break-all tabular-nums font-mono mt-0.5">{value}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {copied && (
          <span className="text-xs font-semibold text-emerald-600">
            Nusxalandi!
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            copy();
          }}
          aria-label={`${label}dan nusxa olish`}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
            copied
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : 'border border-slate-200 text-slate-400 group-hover:text-brand-primary group-hover:border-brand-primary/40 group-hover:bg-brand-primary/5'
          }`}
        >
          {copied ? <Check size={16} className="text-emerald-600 stroke-[2.5]" /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-100 py-6 px-4 sm:py-10">
    <div className="max-w-xl mx-auto">{children}</div>
  </div>
);

// Shared AudioContext singleton with user gesture unlocking
let sharedAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
};

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('click', unlockAudio, { passive: true, once: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true, once: true });
  window.addEventListener('keydown', unlockAudio, { passive: true, once: true });
}

/** Synthesizes authentic mechanical thermal POS printer paper feed and guillotine cutter */
const playThermalPrinterSound = () => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const printDuration = 2.8;

    // 1. Modern 24V POS printer stepper motor PWM whine (true micro-stepping whine, NOT low 84Hz hum)
    const motorOsc = ctx.createOscillator();
    const motorGain = ctx.createGain();
    motorOsc.type = 'triangle';
    motorOsc.frequency.setValueAtTime(520, now);
    motorOsc.frequency.linearRampToValueAtTime(560, now + 0.15);
    motorOsc.frequency.setValueAtTime(540, now + printDuration - 0.25);
    motorGain.gain.setValueAtTime(0.012, now);
    motorGain.gain.linearRampToValueAtTime(0.018, now + 0.1);
    motorGain.gain.linearRampToValueAtTime(0.012, now + printDuration - 0.25);
    motorGain.gain.exponentialRampToValueAtTime(0.0001, now + printDuration);
    motorOsc.connect(motorGain);
    motorGain.connect(ctx.destination);
    motorOsc.start(now);
    motorOsc.stop(now + printDuration);

    // 2. High-speed thermal paper feed line advances (rapid friction ticks: 32 lines)
    const stepCount = 32;
    const stepInterval = (printDuration - 0.35) / stepCount;

    for (let i = 0; i < stepCount; i++) {
      const t = now + (i * stepInterval);
      const clickLen = 0.018;
      const bufSize = Math.floor(ctx.sampleRate * clickLen);
      const clickBuf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
      const data = clickBuf.getChannelData(0);
      for (let j = 0; j < bufSize; j++) {
        data[j] = (Math.random() * 2 - 1) * Math.exp(-j / (bufSize * 0.28));
      }
      const clickSrc = ctx.createBufferSource();
      clickSrc.buffer = clickBuf;

      const clickFilter = ctx.createBiquadFilter();
      clickFilter.type = 'bandpass';
      clickFilter.frequency.setValueAtTime(3200 + (i % 4) * 140, t);
      clickFilter.Q.value = 3.2;

      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.09, t);
      clickGain.gain.exponentialRampToValueAtTime(0.001, t + clickLen);

      clickSrc.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(ctx.destination);

      clickSrc.start(t);
      clickSrc.stop(t + clickLen);
    }

    // 3. Ceramic print head thermal friction hiss (paper dragging over heating element)
    const frictionLen = printDuration - 0.22;
    const frictionBufSize = Math.floor(ctx.sampleRate * frictionLen);
    const frictionBuf = ctx.createBuffer(1, frictionBufSize, ctx.sampleRate);
    const fData = frictionBuf.getChannelData(0);
    for (let j = 0; j < frictionBufSize; j++) {
      const mod = 1 + 0.3 * Math.sin(j * 0.02);
      fData[j] = (Math.random() * 2 - 1) * 0.035 * mod;
    }
    const frictionSrc = ctx.createBufferSource();
    frictionSrc.buffer = frictionBuf;

    const frictionFilter = ctx.createBiquadFilter();
    frictionFilter.type = 'bandpass';
    frictionFilter.frequency.setValueAtTime(3400, now);
    frictionFilter.Q.value = 1.8;

    const frictionGain = ctx.createGain();
    frictionGain.gain.setValueAtTime(0.015, now);
    frictionGain.gain.linearRampToValueAtTime(0.045, now + 0.12);
    frictionGain.gain.setValueAtTime(0.045, now + frictionLen - 0.15);
    frictionGain.gain.exponentialRampToValueAtTime(0.001, now + frictionLen);

    frictionSrc.connect(frictionFilter);
    frictionFilter.connect(frictionGain);
    frictionGain.connect(ctx.destination);

    frictionSrc.start(now);
    frictionSrc.stop(now + frictionLen);

    // 4. Auto-cutter guillotine blade chop ("ka-CHINK!") at end of print
    const cutStart = now + printDuration - 0.22;

    const bladeOsc = ctx.createOscillator();
    const bladeGain = ctx.createGain();
    bladeOsc.type = 'triangle';
    bladeOsc.frequency.setValueAtTime(1200, cutStart);
    bladeOsc.frequency.exponentialRampToValueAtTime(340, cutStart + 0.06);
    bladeGain.gain.setValueAtTime(0.14, cutStart);
    bladeGain.gain.exponentialRampToValueAtTime(0.001, cutStart + 0.07);
    bladeOsc.connect(bladeGain);
    bladeGain.connect(ctx.destination);
    bladeOsc.start(cutStart);
    bladeOsc.stop(cutStart + 0.08);

    const impactLen = 0.055;
    const impactBufSize = Math.floor(ctx.sampleRate * impactLen);
    const impactBuf = ctx.createBuffer(1, impactBufSize, ctx.sampleRate);
    const iData = impactBuf.getChannelData(0);
    for (let j = 0; j < impactBufSize; j++) {
      iData[j] = (Math.random() * 2 - 1) * Math.exp(-j / (impactBufSize * 0.25));
    }
    const impactSrc = ctx.createBufferSource();
    impactSrc.buffer = impactBuf;

    const impactFilter = ctx.createBiquadFilter();
    impactFilter.type = 'lowpass';
    impactFilter.frequency.setValueAtTime(1600, cutStart + 0.05);

    const impactGain = ctx.createGain();
    impactGain.gain.setValueAtTime(0.26, cutStart + 0.05);
    impactGain.gain.exponentialRampToValueAtTime(0.001, cutStart + 0.05 + impactLen);

    impactSrc.connect(impactFilter);
    impactFilter.connect(impactGain);
    impactGain.connect(ctx.destination);

    impactSrc.start(cutStart + 0.05);
    impactSrc.stop(cutStart + 0.05 + impactLen);
  } catch {
    // Autoplay restrictions or test environment - safely ignore
  }
};

/** Synthesizes authentic crisp paper tear / rip sound with fiber snap & blade resonance */
const playPaperTearSound = () => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Initial tooth bite & perforation drag (0 - 45ms): high friction scrape
    const biteLen = 0.055;
    const biteBufSize = Math.floor(ctx.sampleRate * biteLen);
    const biteBuf = ctx.createBuffer(1, biteBufSize, ctx.sampleRate);
    const biteData = biteBuf.getChannelData(0);
    for (let i = 0; i < biteBufSize; i++) {
      biteData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (biteBufSize * 0.4));
    }
    const biteSrc = ctx.createBufferSource();
    biteSrc.buffer = biteBuf;
    const biteFilter = ctx.createBiquadFilter();
    biteFilter.type = 'bandpass';
    biteFilter.frequency.setValueAtTime(3200, now);
    biteFilter.Q.value = 2.8;
    const biteGain = ctx.createGain();
    biteGain.gain.setValueAtTime(0.14, now);
    biteGain.gain.exponentialRampToValueAtTime(0.001, now + biteLen);
    biteSrc.connect(biteFilter);
    biteFilter.connect(biteGain);
    biteGain.connect(ctx.destination);
    biteSrc.start(now);
    biteSrc.stop(now + biteLen);

    // 2. Main fibrous tear rip: micro-fractures (rapid cellulose fiber crackles)
    const ripDuration = 0.28;
    const ripBufSize = Math.floor(ctx.sampleRate * ripDuration);
    const ripBuf = ctx.createBuffer(1, ripBufSize, ctx.sampleRate);
    const ripData = ripBuf.getChannelData(0);
    for (let i = 0; i < ripBufSize; i++) {
      const pulseMod = Math.pow(Math.sin(i * 0.12), 4) * 0.7 + 0.3;
      ripData[i] = (Math.random() * 2 - 1) * pulseMod * 0.22;
    }
    const ripSrc = ctx.createBufferSource();
    ripSrc.buffer = ripBuf;
    const ripFilter = ctx.createBiquadFilter();
    ripFilter.type = 'highpass';
    ripFilter.frequency.setValueAtTime(1900, now + 0.03);
    ripFilter.frequency.exponentialRampToValueAtTime(950, now + ripDuration);
    const ripGain = ctx.createGain();
    ripGain.gain.setValueAtTime(0.001, now);
    ripGain.gain.linearRampToValueAtTime(0.28, now + 0.05); // sharp tactile rip bite
    ripGain.gain.setValueAtTime(0.22, now + 0.15);
    ripGain.gain.exponentialRampToValueAtTime(0.001, now + ripDuration);
    ripSrc.connect(ripFilter);
    ripFilter.connect(ripGain);
    ripGain.connect(ctx.destination);
    ripSrc.start(now + 0.02);
    ripSrc.stop(now + ripDuration);

    // 3. Steel cutter blade recoil ping ("twang/thwip" of the spring blade releasing)
    const bladeT = now + 0.13;
    const pingOsc = ctx.createOscillator();
    const pingGain = ctx.createGain();
    pingOsc.type = 'sine';
    pingOsc.frequency.setValueAtTime(560, bladeT);
    pingOsc.frequency.exponentialRampToValueAtTime(420, bladeT + 0.07);
    pingGain.gain.setValueAtTime(0.06, bladeT);
    pingGain.gain.exponentialRampToValueAtTime(0.001, bladeT + 0.07);
    pingOsc.connect(pingGain);
    pingGain.connect(ctx.destination);
    pingOsc.start(bladeT);
    pingOsc.stop(bladeT + 0.08);

    // 4. Aerodynamic sheet whoosh (soft air displacement as paper falls)
    const airT = now + 0.16;
    const airLen = 0.32;
    const airBufSize = Math.floor(ctx.sampleRate * airLen);
    const airBuf = ctx.createBuffer(1, airBufSize, ctx.sampleRate);
    const airData = airBuf.getChannelData(0);
    for (let i = 0; i < airBufSize; i++) {
      airData[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * (i / airBufSize));
    }
    const airSrc = ctx.createBufferSource();
    airSrc.buffer = airBuf;
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'lowpass';
    airFilter.frequency.setValueAtTime(420, airT);
    const airGain = ctx.createGain();
    airGain.gain.setValueAtTime(0.04, airT);
    airGain.gain.exponentialRampToValueAtTime(0.001, airT + airLen);
    airSrc.connect(airFilter);
    airFilter.connect(airGain);
    airGain.connect(ctx.destination);
    airSrc.start(airT);
    airSrc.stop(airT + airLen);
  } catch {
    // Autoplay restrictions or test environment - safely ignore
  }
};

/** Synthesizes crystal-clear two-tone POS confirmation chime */
const playSuccessChime = () => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Tone 1: C6 (1046.5 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.39);

    // Tone 2: G6 (1567.98 Hz)
    const t2 = now + 0.12;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1567.98, t2);
    gain2.gain.setValueAtTime(0.15, t2);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.66);
  } catch {
    // Autoplay restrictions or test environment - safely ignore
  }
};

export const InvoicePayScreen: React.FC = () => {
  const { token = '' } = useParams();
  const queryClient = useQueryClient();

  const [chosen, setChosen] = useState('');
  const [reference, setReference] = useState('');
  const [dispenseKey, setDispenseKey] = useState(0);
  const [isPrinting, setIsPrinting] = useState(true);
  const [isTearing, setIsTearing] = useState(false);
  const [showPaidReceipt, setShowPaidReceipt] = useState(false);
  const [allCopied, setAllCopied] = useState(false);

  useEffect(() => {
    setIsPrinting(true);
    playThermalPrinterSound();
    const timer = setTimeout(() => {
      setIsPrinting(false);
    }, 2850);
    return () => clearTimeout(timer);
  }, [dispenseKey]);

  const isDemo = token === 'demo';

  const DEMO_INVOICE = {
    invoiceNumber: 'INV-20261003-DEMO88',
    amount: 520_000,
    company: 'Korzinka.uz MChJ',
    jobTitle: 'Senior Frontend Developer',
    workDate: '2026-10-03',
    workTime: '09:00 - 18:00',
    location: 'Toshkent, Chilonzor',
    requisites: [
      { label: 'Qabul qiluvchi', value: 'Baito MChJ' },
      { label: 'Hisob raqami', value: '20208000900000000001' },
      { label: 'MFO', value: '00873' },
      { label: 'INN / STIR', value: '123456789' },
    ],
    methods: [{ id: 'bank_transfer', label: "Bank o'tkazmasi", hint: "Rekvizitlar tayyor — bank ilovangizga nusxalang" }],
    status: 'invoiced',
    paidMethod: null,
    paidReference: null,
    declaredAt: null,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['invoice', token],
    queryFn: () => (isDemo ? Promise.resolve(DEMO_INVOICE) : fetchInvoiceApi(token)),
    enabled: !!token,
    retry: false,
  });

  // Derived, not mirrored into state by an effect. Preselecting in an effect
  // left one render where the button was already enabled and the method was
  // still empty — a fast tap in that window posted method:"" and the server
  // rejected it. Reading the default at render time closes the window.
  const methods: { id: string; label: string; hint: string }[] = data?.methods || [];
  const method = chosen || methods[0]?.id || '';

  const pay = useMutation({
    mutationFn: () =>
      isDemo
        ? Promise.resolve({
            ...DEMO_INVOICE,
            status: 'payment_declared',
            declaredAt: new Date().toISOString(),
            paidMethod: method,
            paidReference: reference.trim() || 'PO-4471',
          })
        : declareInvoicePaymentApi(token, { method, reference: reference.trim() || undefined }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['invoice', token], updated);
      playSuccessChime();
    },
  });

  const handleConfirmPayment = () => {
    if (!method || pay.isPending) return;
    setIsTearing(true);
    playPaperTearSound();
    const isJsdom = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom');
    if (!isJsdom && typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        // Safe fallback for environments without smooth scroll
      }
    }
    const startTime = Date.now();
    pay.mutate(undefined, {
      onSuccess: () => {
        const isJsdom = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom');
        const minTearDuration = isJsdom ? 150 : 1400;
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, minTearDuration - elapsed);
        setTimeout(() => {
          setIsTearing(false);
          setShowPaidReceipt(true);
          setDispenseKey((k) => k + 1);
        }, remaining);
      },
      onError: () => {
        setIsTearing(false);
      },
    });
  };

  if (isLoading) {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-slate-200 p-12 min-h-[300px] flex flex-col items-center justify-center">
          <LoadingOrb size={32} variant="working" />
        </div>
      </Shell>
    );
  }

  if (isError || !data) {
    return (
      <Shell>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={26} />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Hisob-faktura ochilmadi</h1>
          <p className="text-slate-600 text-[15px]">
            {(error as Error)?.message
              || "Havola yaroqsiz yoki muddati tugagan. Yangi hisob-faktura so'rang."}
          </p>
        </div>
      </Shell>
    );
  }

  const declared = !!data.declaredAt;
  const isPaidReceiptReady = showPaidReceipt || (!isTearing && (declared || data.status === 'paid'));
  const requisites: { label: string; value: string }[] = data.requisites || [];

  const copyAllRequisites = async () => {
    const text = requisites.map((r) => `${r.label}: ${r.value}`).join('\n')
      + `\nHisob-faktura: № ${data?.invoiceNumber || ''}`
      + `\nTo'lov summasi: ${money(data?.amount || 0)} so'm`;
    try {
      await navigator.clipboard.writeText(text);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    } catch {
      // Insecure context or permission denied
    }
  };

  return (
    <Shell>
      <div className="invoice-dispenser-wrapper baito-terminal-apparatus">
        {/* Yuqori dispenser terminal korpusi (oq, 3D zamonaviy Baito terminali) */}
        <div className="invoice-dispenser-housing baito-terminal-casing">
          {/* Subtle top glossy light-reflection bevel line */}
          <div className="baito-casing-top-highlight" />

          {/* Minimalist 3D POS Hardware Faceplate */}
          <div className="baito-terminal-visor">
            {/* Tactile debossed brand mark */}
            <div className="baito-hardware-brand" title="Baito POS Terminal">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              <span className="text-[11px] font-black tracking-widest text-slate-100 uppercase">
                BAITO POS
              </span>
            </div>

            {/* Center: High-Precision Physical Optical Jewel Status LED */}
            <div
              className={`baito-hardware-led ${
                isTearing
                  ? 'baito-led-tearing'
                  : isPaidReceiptReady
                  ? 'baito-led-confirmed'
                  : isPrinting
                  ? 'baito-led-feeding'
                  : 'baito-led-ready'
              }`}
              title="Terminal holati datchigi"
            >
              <span className="baito-led-jewel" />
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-600">
                {isTearing
                  ? "Kesilmoqda"
                  : isPaidReceiptReady
                  ? "Tasdiqlandi"
                  : isPrinting
                  ? "Chop etilmoqda"
                  : "Tayyor"}
              </span>
            </div>

            {/* Right: Tactile 3D Physical Feed Button */}
            <button
              type="button"
              onClick={() => {
                if (!isPrinting && !isTearing) {
                  getAudioContext();
                  setDispenseKey((k) => k + 1);
                }
              }}
              disabled={isPrinting || isTearing}
              className="baito-hardware-feed-btn"
              title="Qog'ozni qayta uzatish (Feed)"
            >
              <RefreshCw
                size={12}
                className={
                  isPrinting || isTearing
                    ? 'animate-spin text-amber-500'
                    : 'text-slate-500'
                }
              />
              <span>{isTearing ? 'Kesilmoqda...' : isPrinting ? 'Uzatilmoqda...' : 'Qayta chiqarish'}</span>
            </button>
          </div>

          {/* Slot og'zi, po'lat pichoq va chuqurlashtirilgan chiqarish tirqishi */}
          <div className="invoice-dispenser-mouth baito-printer-throat">
            <div className={`invoice-dispenser-front-lip baito-cutter-blade ${isTearing ? 'is-cutting' : ''}`} />
            <div className="invoice-slit-recess baito-slot-cavity" title="Chiqish sloti">
              <div className="baito-roller-bar" />
            </div>
          </div>
        </div>

        {/* Slot ichidan chiqib keluvchi chek/kvitansiya kartasi */}
        <div className={`invoice-dispense-mask baito-paper-window ${isTearing ? 'is-tearing' : ''}`}>
          {isPaidReceiptReady ? (
            /* ==========================================================
               YANGI CHOP ETILGAN TO'LOV KVITANSIYASI (PAID RECEIPT)
               To'lov tasdiqlangach aparat tirqishidan yangi chiqib keluvchi chek
               ========================================================== */
            <div
              key={dispenseKey}
              className="invoice-dispensed-card baito-dispensed-paper bg-white rounded-b-2xl rounded-t-none border-x border-b border-t-0 border-slate-200/90 shadow-xl overflow-hidden"
            >
              {/* Invoys Raqamli Pasport / Kvitansiya Header */}
              <div className="invoice-pass-header relative pt-8 pb-6 px-6 sm:pt-10 sm:pb-8 sm:px-8 border-b border-slate-100 bg-gradient-to-br from-emerald-50/50 via-white to-slate-50/50">
                <div className="invoice-reflex" />

                {/* 3D Wireframe kubik bezak */}
                <svg
                  className="invoice-icon-cube text-emerald-500/20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path style={{ ['--i' as any]: 1 }} className="path-center" d="M12 12.75L14.25 11.437M12 12.75L9.75 11.437M12 12.75V15" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                  <path style={{ ['--i' as any]: 2 }} className="path-t" d="M9.75 3.562L12 2.25L14.25 3.563" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                  <path style={{ ['--i' as any]: 3 }} className="path-tr" d="M21 7.5L18.75 6.187M21 7.5V9.75M21 7.5L18.75 8.813" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                  <path style={{ ['--i' as any]: 4 }} className="path-br" d="M21 14.25V16.5L18.75 17.813" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                  <path style={{ ['--i' as any]: 5 }} className="path-b" d="M12 21.75L14.25 20.437M12 21.75V19.5M12 21.75L9.75 20.437" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                  <path style={{ ['--i' as any]: 6 }} className="path-bl" d="M5.25 17.813L3 16.5V14.25" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                  <path style={{ ['--i' as any]: 7 }} className="path-tl" d="M3 7.5L5.25 6.187M3 7.5L5.25 8.813M3 7.5V9.75" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* Rasmiy Yashil Shtamp - TO'LANGAN / PAID */}
                <div className="baito-paid-rubber-stamp" title="Rasmiy tasdiqlangan elektron to'lov muhr">
                  <div className="text-[13px] font-black tracking-widest text-emerald-800 leading-none">
                    TO'LANGAN
                  </div>
                  <div className="text-[9px] font-bold text-emerald-700 tracking-wider mt-0.5">
                    PAID · 200 OK
                  </div>
                  <div className="text-[8px] font-semibold text-emerald-600/80 tracking-widest mt-0.5">
                    BAITO ELEKTRON CHEK
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black tracking-widest text-slate-800 uppercase">
                      BAITO PASS
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-100/80 border border-emerald-200 px-2 py-0.5 rounded">
                      TO'LOV KVITANSIYASI
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-full flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      TO'LANGAN
                    </span>

                    {/* Shtrix-kod */}
                    <div className="h-6 flex items-center gap-[2px] opacity-75" title={`Shtrix-kod: ${data.invoiceNumber}`}>
                      <span className="w-[2px] h-full bg-slate-900" />
                      <span className="w-[1px] h-full bg-slate-900" />
                      <span className="w-[3px] h-full bg-slate-900" />
                      <span className="w-[1px] h-full bg-slate-900" />
                      <span className="w-[2px] h-full bg-slate-900" />
                      <span className="w-[1.5px] h-full bg-slate-900" />
                      <span className="w-[3px] h-full bg-slate-900" />
                      <span className="w-[1px] h-full bg-slate-900" />
                      <span className="w-[2px] h-full bg-slate-900" />
                    </div>
                  </div>
                </div>

                {/* Invoys raqami va Kompaniya */}
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Hisob-faktura
                    </p>
                    <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
                      № {data.invoiceNumber}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <Building2 size={16} className="text-slate-400" />
                    <span className="text-xs font-semibold">{data.company}</span>
                  </div>
                </div>

                {/* To'lov summasi, xizmat nomi va QR-kod */}
                <div className="relative z-10 mt-5 pt-5 border-t border-slate-200/60 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Tasdiqlangan summa
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-0.5 tabular-nums tracking-tight">
                      {money(data.amount)} <span className="text-sm font-semibold text-slate-500">so'm</span>
                    </p>
                    {data.jobTitle && (
                      <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{data.jobTitle}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">
                          {data.workDate ? `${data.workDate} · ` : ''}{data.location || ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* QR-kod vidjeti */}
                  <div
                    className="shrink-0 p-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col items-center"
                    title="QR-kod orqali tekshirish"
                  >
                    <svg className="w-11 h-11 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h4v4h-4v-4zm-4 4h4v4h-4v-4zm4 4h4v4h-4v-4zm-4-8h4v4h-4v-4z" />
                    </svg>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                      Baito QR
                    </span>
                  </div>
                </div>
              </div>

              {/* PERFORATSIYA (Chek qirqim chizig'i) */}
              <div className="relative flex items-center justify-between py-1 bg-white">
                <div className="w-6 h-6 -ml-3 rounded-full bg-slate-100 border-r border-slate-200/90 shadow-inner" />
                <div className="flex-1 border-b-2 border-dashed border-slate-200" />
                <div className="w-6 h-6 -mr-3 rounded-full bg-slate-100 border-l border-slate-200/90 shadow-inner" />
              </div>

              {/* To'lov Tasdiqlanganligi Tafsilotlari */}
              <div className="relative px-6 sm:px-8 py-8 text-center bg-white">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
                  <Check size={28} className="stroke-[2.5]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">To'lov qayd etildi</h2>
                <p className="text-slate-600 text-[15px] max-w-md mx-auto">
                  Rahmat. Ma'muriyatga xabar berildi — to'lov bank ko'chirmasi bilan
                  solishtirilgandan so'ng yakuniy tasdiqlanadi.
                </p>
                {data.paidReference && (
                  <p className="mt-4 text-sm text-slate-500">
                    To'lov topshirig'i: <span className="font-semibold text-slate-700">{data.paidReference}</span>
                  </p>
                )}

                {/* Kvitansiya ma'lumotlari jadvali */}
                <div className="mt-6 max-w-md mx-auto rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 text-left space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Hisob-faktura:</span>
                    <span className="font-mono font-semibold text-slate-800">№ {data.invoiceNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">To'lovchi korxona:</span>
                    <span className="font-semibold text-slate-800">{data.company}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">To'langan summa:</span>
                    <span className="font-bold text-emerald-600 tabular-nums">{money(data.amount)} so'm</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Holat:</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                      <Check size={12} className="stroke-[3]" /> Qayd etilgan
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && window.print) {
                        window.print();
                      }
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    <Printer size={15} />
                    <span>Chekni chop etish</span>
                  </button>
                </div>
              </div>

              {/* Baito hisob-faktura xavfsizlik va muhr paneli */}
              <div className="px-6 sm:px-8 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>Baito · rasmiy elektron to'lov kvitansiyasi tasdiqlandi</span>
              </div>

              {/* Termik chek tishli qirqim chekkasi */}
              <div className="invoice-sawtooth-bottom" />
            </div>
          ) : (
            /* ==========================================================
               TO'LOV KUTILAYOTGAN INVOYS KARTASI (UNPAID INVOICE)
               Agar to'lov tasdiqlansa, to'liq yirtilib pastga tushib ketadi
               ========================================================== */
            <div
              key={isTearing ? 'tearing-card' : dispenseKey}
              className={`invoice-dispensed-card baito-dispensed-paper ${
                isTearing ? 'baito-paper-tearing-and-falling' : ''
              } bg-white rounded-b-2xl rounded-t-none border-x border-b border-t-0 border-slate-200/90 shadow-xl overflow-hidden`}
            >
              {isTearing && <div className="baito-torn-top-edge" />}

              {/* INVOYS RAQAMLI PASPORT / RECEIPT HEADER */}
              <div className="invoice-pass-header relative pt-8 pb-6 px-6 sm:pt-10 sm:pb-8 sm:px-8 border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-sky-50/40">
                <div className="invoice-reflex" />

                {/* 3D Wireframe Kubik fon dekoratsiyasi */}
                <svg
                  className="invoice-icon-cube"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path style={{ ['--i' as any]: 1 }} className="path-center" d="M12 12.75L14.25 11.437M12 12.75L9.75 11.437M12 12.75V15" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                  <path style={{ ['--i' as any]: 2 }} className="path-t" d="M9.75 3.562L12 2.25L14.25 3.563" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                  <path style={{ ['--i' as any]: 3 }} className="path-tr" d="M21 7.5L18.75 6.187M21 7.5V9.75M21 7.5L18.75 8.813" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                  <path style={{ ['--i' as any]: 4 }} className="path-br" d="M21 14.25V16.5L18.75 17.813" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                  <path style={{ ['--i' as any]: 5 }} className="path-b" d="M12 21.75L14.25 20.437M12 21.75V19.5M12 21.75L9.75 20.437" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                  <path style={{ ['--i' as any]: 6 }} className="path-bl" d="M5.25 17.813L3 16.5V14.25" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                  <path style={{ ['--i' as any]: 7 }} className="path-tl" d="M3 7.5L5.25 6.187M3 7.5L5.25 8.813M3 7.5V9.75" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                </svg>

                {/* Pass logotipi, Shtrix-kod va Holat indikatori */}
                <div className="relative z-10 flex items-center justify-between gap-4 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-pulse" />
                    <span className="text-xs font-black tracking-widest text-slate-800 uppercase">
                      BAITO PASS
                    </span>
                    <span className="hidden sm:inline-block text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                      Digital Invoice
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-full flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      KUTILMOQDA
                    </span>

                    {/* Shtrix-kod */}
                    <div className="h-6 flex items-center gap-[2px] opacity-75" title={`Shtrix-kod: ${data.invoiceNumber}`}>
                      <span className="w-[2px] h-full bg-slate-900" />
                      <span className="w-[1px] h-full bg-slate-900" />
                      <span className="w-[3px] h-full bg-slate-900" />
                      <span className="w-[1px] h-full bg-slate-900" />
                      <span className="w-[2px] h-full bg-slate-900" />
                      <span className="w-[1.5px] h-full bg-slate-900" />
                      <span className="w-[3px] h-full bg-slate-900" />
                      <span className="w-[1px] h-full bg-slate-900" />
                      <span className="w-[2px] h-full bg-slate-900" />
                    </div>
                  </div>
                </div>

                {/* Invoys raqami va Kompaniya */}
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Hisob-faktura
                    </p>
                    <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
                      № {data.invoiceNumber}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-slate-700 bg-white/95 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs">
                    <Building2 size={16} className="text-slate-400" />
                    <span className="text-xs font-semibold">{data.company}</span>
                  </div>
                </div>

                {/* To'lov summasi, xizmat nomi va QR-kod */}
                <div className="relative z-10 mt-5 pt-5 border-t border-slate-200/60 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      To'lov summasi
                    </p>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-0.5 tabular-nums tracking-tight">
                      {money(data.amount)} <span className="text-sm font-semibold text-slate-500">so'm</span>
                    </p>
                    {data.jobTitle && (
                      <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{data.jobTitle}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500">
                          {data.workDate ? `${data.workDate} · ` : ''}{data.location || ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* QR-kod vidjeti */}
                  <div
                    className="shrink-0 p-2 bg-white rounded-xl border border-slate-200/80 shadow-2xs flex flex-col items-center"
                    title="QR-kod orqali tekshirish"
                  >
                    <svg className="w-11 h-11 text-slate-800" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h4v4h-4v-4zm-4 4h4v4h-4v-4zm4 4h4v4h-4v-4zm-4-8h4v4h-4v-4z" />
                    </svg>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                      Baito QR
                    </span>
                  </div>
                </div>
              </div>

              {/* PERFORATSIYA (Chek qirqim chizig'i) */}
              <div className="relative flex items-center justify-between py-1 bg-white">
                <div className="w-6 h-6 -ml-3 rounded-full bg-slate-100 border-r border-slate-200/90 shadow-inner" />
                <div className="flex-1 border-b-2 border-dashed border-slate-200" />
                <div className="w-6 h-6 -mr-3 rounded-full bg-slate-100 border-l border-slate-200/90 shadow-inner" />
              </div>

              {/* To'lov usuli (accessibility) */}
              <fieldset className="sr-only" aria-hidden="true">
                <legend>To'lov usuli</legend>
                {methods.map((m) => (
                  <input
                    key={m.id}
                    type="radio"
                    name="method"
                    value={m.id}
                    checked={method === m.id}
                    onChange={() => setChosen(m.id)}
                    className="sr-only"
                  />
                ))}
              </fieldset>

              {/* To'lov rekvizitlari */}
              {requisites.length > 0 && (
                <div className="px-6 sm:px-8 py-5 border-b border-slate-100 bg-slate-50/30">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                        To'lov rekvizitlari
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Bank ilovangizga nusxalang
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copyAllRequisites}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
                        allCopied
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-brand-primary/50 hover:text-brand-primary hover:bg-slate-50 shadow-2xs'
                      }`}
                    >
                      {allCopied ? (
                        <>
                          <Check size={14} className="text-emerald-600 stroke-[2.5]" />
                          <span>Barchasi nusxalandi!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={13} />
                          <span>Barchasini nusxalash</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-2">
                    {requisites.map((r) => (
                      <CopyRow key={r.label} label={r.label} value={r.value} />
                    ))}
                  </div>
                </div>
              )}

              {/* To'lovni tasdiqlash formasi */}
              <div className="px-6 sm:px-8 py-6">
                <label htmlFor="reference" className="block text-sm font-semibold text-slate-800 mb-2">
                  To'lov topshirig'i raqami <span className="font-normal text-slate-400">(ixtiyoriy)</span>
                </label>
                <div className="relative">
                  <input
                    id="reference"
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    maxLength={120}
                    placeholder="Masalan: 4471"
                    disabled={isTearing}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none disabled:opacity-60"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Ko'rsatsangiz, to'lovingiz bank ko'chirmasidan tezroq topiladi va tasdiqlanadi.
                </p>

                {pay.isError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-center gap-2">
                    <AlertTriangle size={16} className="shrink-0" />
                    <span>{(pay.error as Error).message}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleConfirmPayment}
                  disabled={!method || pay.isPending || isTearing}
                  className="mt-6 w-full bg-brand-primary text-white font-semibold text-[16px] py-4 rounded-xl shadow-lg shadow-brand-primary/20 hover:opacity-95 active:scale-[0.99] transition-all flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:active:scale-100"
                >
                  {pay.isPending || isTearing ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      {isTearing ? "Chek yirtilmoqda..." : "Yuborilmoqda..."}
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={18} />
                      To'lovni tasdiqlash
                    </>
                  )}
                </button>
                <p className="mt-3 text-xs text-slate-500 text-center">
                  Tugmani bosish to'lovni amalga oshirganingizni bildiradi.
                </p>
              </div>

              {/* Baito hisob-faktura xavfsizlik va muhr paneli */}
              <div className="px-6 sm:px-8 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
                <ShieldCheck size={14} className="text-slate-400" />
                <span>Baito · xavfsiz to'lov va rasmiy elektron hisob-faktura</span>
              </div>

              {/* Termik chek tishli qirqim chekkasi */}
              <div className="invoice-sawtooth-bottom" />
            </div>
          )}
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-slate-400">
        Baito · savollar bo'lsa hisob-faktura kelgan xatga javob yozing
      </p>
    </Shell>
  );
};
