import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Check, Copy, Landmark, CreditCard, ShieldCheck, AlertTriangle, Loader2, RefreshCw,
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

/** Synthesizes authentic thermal printer stepper motor pulses and cutter snip */
const playThermalPrinterSound = () => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const printDuration = 3.0;

    // 1. Rhythmic stepper motor micro-pulses (26 distinct mechanical steps)
    const stepCount = 26;
    const interval = printDuration / stepCount;

    for (let i = 0; i < stepCount; i++) {
      const t = now + (i * interval);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      // Varied mechanical resonance frequency between 140Hz and 200Hz
      osc.frequency.setValueAtTime(140 + (i % 5) * 15, t);

      // Distinct audible punchy stepper click
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.05);
    }

    // 2. Paper thermal feed bandpass noise (crisp thermal paper sliding hiss)
    const bufferSize = Math.floor(ctx.sampleRate * printDuration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.035;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;
    filter.Q.value = 2.2;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06, now);
    noiseGain.gain.linearRampToValueAtTime(0.08, now + 1.2);
    noiseGain.gain.linearRampToValueAtTime(0.0001, now + printDuration);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + printDuration);

    // 3. Cutter blade snip sound at end of print (sharp physical auto-cutter chop)
    const cutTime = now + printDuration;
    const cutOsc = ctx.createOscillator();
    const cutGain = ctx.createGain();
    cutOsc.type = 'triangle';
    cutOsc.frequency.setValueAtTime(750, cutTime);
    cutOsc.frequency.exponentialRampToValueAtTime(80, cutTime + 0.08);
    cutGain.gain.setValueAtTime(0.20, cutTime);
    cutGain.gain.exponentialRampToValueAtTime(0.0001, cutTime + 0.09);

    cutOsc.connect(cutGain);
    cutGain.connect(ctx.destination);
    cutOsc.start(cutTime);
    cutOsc.stop(cutTime + 0.10);
  } catch {
    // Autoplay restrictions or test environment - safely ignore
  }
};

/** Synthesizes authentic crisp paper tear / rip sound */
const playPaperTearSound = () => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const tearDuration = 0.55;

    // 1. Paper fiber friction tear noise
    const bufferSize = Math.floor(ctx.sampleRate * tearDuration);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      const ripPhase = Math.sin(i * 0.05) * 0.35 + 0.65;
      output[i] = (Math.random() * 2 - 1) * ripPhase * 0.12;
    }
    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2800, now);
    filter.frequency.linearRampToValueAtTime(1400, now + tearDuration);
    filter.Q.value = 1.8;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.02, now);
    noiseGain.gain.linearRampToValueAtTime(0.18, now + 0.07); // Initial rip bite
    noiseGain.gain.setValueAtTime(0.12, now + 0.22);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + tearDuration);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + tearDuration);

    // 2. Physical snap release
    const snapOsc = ctx.createOscillator();
    const snapGain = ctx.createGain();
    snapOsc.type = 'sawtooth';
    snapOsc.frequency.setValueAtTime(950, now);
    snapOsc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

    snapGain.gain.setValueAtTime(0.10, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    snapOsc.connect(snapGain);
    snapGain.connect(ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.13);
  } catch {
    // Autoplay restrictions or test environment - safely ignore
  }
};

/** Synthesizes two-tone POS register payment confirmation chime */
const playSuccessChime = () => {
  if (typeof window === 'undefined') return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    // Tone 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.36);

    // Tone 2: A5 (880 Hz)
    const t2 = now + 0.14;
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, t2);
    gain2.gain.setValueAtTime(0.14, t2);
    gain2.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t2);
    osc2.stop(t2 + 0.56);
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
  const [allCopied, setAllCopied] = useState(false);

  useEffect(() => {
    setIsPrinting(true);
    playThermalPrinterSound();
    const timer = setTimeout(() => {
      setIsPrinting(false);
    }, 3100);
    return () => clearTimeout(timer);
  }, [dispenseKey]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['invoice', token],
    queryFn: () => fetchInvoiceApi(token),
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
    mutationFn: () => declareInvoicePaymentApi(token, { method, reference: reference.trim() || undefined }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['invoice', token], updated);
      playSuccessChime();
    },
  });

  const handleConfirmPayment = () => {
    if (!method || pay.isPending) return;
    setIsTearing(true);
    playPaperTearSound();
    pay.mutate();
    setTimeout(() => {
      setIsTearing(false);
    }, 1250);
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

          {/* Terminal hardware visor boshqaruvi */}
          <div className="baito-terminal-visor">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-xs">
                B
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Baito Pay Terminal
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                    T-8000 POS
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {isTearing ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Chek yirtildi · Tasdiqlandi
                    </span>
                  ) : isPrinting ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      Chop etilmoqda...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {declared ? "Online · To'langan" : "Online · Tayyor"}
                    </span>
                  )}
                  <span className="text-slate-300">·</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Termik dispenser
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Qayta chiqarish hardware tugmasi */}
              <button
                type="button"
                onClick={() => {
                  if (!isPrinting && !isTearing) {
                    getAudioContext();
                    setDispenseKey((k) => k + 1);
                  }
                }}
                disabled={isPrinting || isTearing}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  isPrinting || isTearing
                    ? 'border-amber-200 bg-amber-50 text-amber-700 cursor-not-allowed opacity-90'
                    : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-brand-primary/50 text-slate-700 hover:text-brand-primary shadow-2xs hover:shadow-xs active:scale-95 cursor-pointer'
                }`}
                title="Invoysni qayta chiqarish (Feed)"
              >
                <RefreshCw
                  size={13}
                  className={
                    isPrinting || isTearing
                      ? 'animate-spin text-amber-600'
                      : 'text-slate-500 group-hover:text-brand-primary transition-transform group-hover:rotate-180 duration-500'
                  }
                />
                <span>{isTearing ? 'Yirtilmoqda...' : isPrinting ? 'Chop etilmoqda...' : 'Qayta chiqarish'}</span>
              </button>
            </div>
          </div>

          {/* Yuqori texnologik qora shisha OLED diagnostika ekrani */}
          <div className="baito-terminal-oled">
            <div className="flex items-center justify-between text-[11px] leading-tight font-mono mb-1.5">
              <span className={`font-bold flex items-center gap-1.5 ${
                isTearing ? 'text-cyan-400' : isPrinting ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isTearing ? 'bg-cyan-400 animate-ping' : isPrinting ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                }`} />
                {isTearing
                  ? 'BAITO-SYS · [TO\'LOV TASDIQLANDI]'
                  : isPrinting
                  ? 'BAITO-SYS · [CHOP ETILMOQDA]'
                  : 'BAITO-SYS v4.2 · POS'}
              </span>
              <span className={`font-semibold tracking-wider ${
                isTearing ? 'text-emerald-400 font-bold' : isPrinting ? 'text-amber-300 animate-pulse' : 'text-sky-400'
              }`}>
                {isTearing ? 'CHEK: YIRTILDI' : isPrinting ? 'FEED: 85 mm/s' : 'BULUT: ULANGAN'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
              <span>
                {isTearing ? (
                  <>HOLAT: <strong className="text-emerald-400">CHEK YIRTIB OLINDI</strong></>
                ) : isPrinting ? (
                  <>TERMIK BOSMA: <strong className="text-amber-300">STEPPER MOTOR</strong></>
                ) : (
                  <>HOLAT: <strong className={declared || data.status === 'paid' ? 'text-emerald-400' : 'text-amber-300'}>
                    {declared || data.status === 'paid' ? "TO'LANGAN" : "KUTILMOQDA"}
                  </strong></>
                )}
              </span>
              <span className={isTearing ? 'text-emerald-400 font-bold' : isPrinting ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                {isTearing ? '200 OK' : isPrinting ? 'UZATILMOQDA...' : declared ? 'TO\'LOV QAYD ETILDI' : 'STANDBY (OK)'}
              </span>
            </div>
          </div>

          {/* Slot og'zi, po'lat pichoq va chuqurlashtirilgan chiqarish tirqishi */}
          <div className="invoice-dispenser-mouth baito-printer-throat">
            <div className="invoice-dispenser-front-lip baito-cutter-blade" />
            <div className="invoice-slit-recess baito-slot-cavity" title="Chiqish sloti">
              <div className="baito-roller-bar" />
              <div className="baito-optical-sensor" title="Optik qog'oz datchigi" />
            </div>
          </div>
        </div>

        {/* Slot ichidan chiqib keluvchi invoys kartasi */}
        <div className="invoice-dispense-mask baito-paper-window">
          {/* Agar to'lov tasdiqlansa, yirtilib pastga tushib ketuvchi chek animatsiyasi */}
          {isTearing && (
            <div
              aria-hidden="true"
              className="invoice-dispensed-card baito-dispensed-paper baito-paper-tearing-and-falling absolute top-0 left-0 right-0 z-30 pointer-events-none select-none bg-white rounded-b-2xl border-x border-b border-slate-200/90 shadow-2xl overflow-hidden"
            >
              <div className="baito-torn-top-edge" />
              <div className="invoice-pass-header relative pt-8 pb-6 px-6 sm:pt-10 sm:pb-8 sm:px-8 border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-sky-50/40">
                <div className="relative z-10 flex items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-black tracking-widest text-slate-800 uppercase">
                      BAITO PASS
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      YIRTILMOQDA
                    </span>
                  </div>
                </div>
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      Hisob-faktura
                    </p>
                    <p className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 tabular-nums">
                      № {data.invoiceNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                      To'lov summasi
                    </p>
                    <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tabular-nums">
                      {money(data.amount)} so'm
                    </p>
                  </div>
                </div>
              </div>
              <div className="px-6 py-8 text-center bg-slate-50/60">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                  <Check size={14} className="stroke-[3]" />
                  <span>Chek muvaffaqiyatli yirtib olindi</span>
                </div>
              </div>
              <div className="invoice-sawtooth-bottom" />
            </div>
          )}

          <div
            key={dispenseKey}
            className="invoice-dispensed-card baito-dispensed-paper bg-white rounded-b-2xl rounded-t-none border-x border-b border-t-0 border-slate-200/90 shadow-xl overflow-hidden"
          >
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
                  <span
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-full flex items-center gap-1.5 ${
                      declared || data.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        declared || data.status === 'paid'
                          ? 'bg-emerald-500'
                          : 'bg-amber-500 animate-pulse'
                      }`}
                    />
                    {declared || data.status === 'paid' ? "TO'LANGAN" : 'KUTILMOQDA'}
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

        {declared ? (
          <div className="relative px-6 sm:px-8 py-10 text-center">
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

            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
              <Check size={28} className="stroke-[2.5]" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">To'lov qayd etildi</h2>
            {/* Said plainly, because it is the truth: this records their word,
                and an accountant should know the difference between that and a
                cleared payment. */}
            <p className="text-slate-600 text-[15px] max-w-md mx-auto">
              Rahmat. Ma'muriyatga xabar berildi — to'lov bank ko'chirmasi bilan
              solishtirilgandan so'ng yakuniy tasdiqlanadi.
            </p>
            {data.paidReference && (
              <p className="mt-4 text-sm text-slate-500">
                To'lov topshirig'i: <span className="font-semibold text-slate-700">{data.paidReference}</span>
              </p>
            )}

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.print) {
                    window.print();
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                <span>Chekni chop etish</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Visual payment method block removed per user request; radio inputs kept visually hidden for accessibility & test contracts */}
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
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 transition-all outline-none"
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
                disabled={!method || pay.isPending}
                className="mt-6 w-full bg-brand-primary text-white font-semibold text-[16px] py-4 rounded-xl shadow-lg shadow-brand-primary/20 hover:opacity-95 active:scale-[0.99] transition-all flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:active:scale-100"
              >
                {pay.isPending ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Yuborilmoqda...
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
          </>
        )}

            {/* Baito hisob-faktura xavfsizlik va muhr paneli */}
            <div className="px-6 sm:px-8 py-3.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck size={14} className="text-slate-400" />
              <span>Baito · xavfsiz to'lov va rasmiy elektron hisob-faktura</span>
            </div>

            {/* Termik chek tishli qirqim chekkasi */}
            <div className="invoice-sawtooth-bottom" />
          </div>
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-slate-400">
        Baito · savollar bo'lsa hisob-faktura kelgan xatga javob yozing
      </p>
    </Shell>
  );
};
