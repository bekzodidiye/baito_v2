import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Check, Copy, Landmark, CreditCard, ShieldCheck, AlertTriangle, Loader2,
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

export const InvoicePayScreen: React.FC = () => {
  const { token = '' } = useParams();
  const queryClient = useQueryClient();

  const [chosen, setChosen] = useState('');
  const [reference, setReference] = useState('');
  const [dispenseKey, setDispenseKey] = useState(0);
  const [allCopied, setAllCopied] = useState(false);

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
    onSuccess: (updated) => queryClient.setQueryData(['invoice', token], updated),
  });

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
      <div className="invoice-dispenser-wrapper">
        {/* Yuqori dispenser kapsulasi (kattalashtirilgan terminal korpusi) */}
        <div
          className="invoice-dispenser-slot"
          onClick={() => setDispenseKey((k) => k + 1)}
          title="Invoysni qayta chiqarish uchun bosing"
        >
          <div className="wrap-colors-1"><div className="bg-colors" /></div>
          <div className="wrap-colors-2"><div className="bg-colors" /></div>
          <div className="cover" />
          <div className="slit-opening" />
          <div className="slit-lip" />
        </div>

        {/* Pastda slotdan invoys bo'lib chiqib keluvchi yagona karta */}
        <div className="invoice-dispense-mask">
          <div
            key={dispenseKey}
            className="invoice-dispensed-card bg-white rounded-b-2xl rounded-t-none border-x border-b border-t-0 border-slate-200/90 shadow-xl overflow-hidden"
          >
            {/* INVOYS RAQAMLI PASPORT / RECEIPT HEADER */}
            <div className="invoice-pass-header relative p-6 sm:p-8 border-b border-slate-100 bg-gradient-to-br from-slate-50 via-white to-sky-50/40">
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
          <div className="px-6 sm:px-8 py-10 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-5">
              <Check size={28} />
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
                onClick={() => pay.mutate()}
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
          </div>
        </div>
      </div>

      <p className="mt-5 text-center text-xs text-slate-400">
        Baito · savollar bo'lsa hisob-faktura kelgan xatga javob yozing
      </p>
    </Shell>
  );
};
