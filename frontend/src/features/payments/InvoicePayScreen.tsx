import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2, Check, Copy, Landmark, CreditCard, ShieldCheck, AlertTriangle, Loader2,
} from 'lucide-react';
import { LoadingOrb } from "@/components/ui/loading-orb";
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
      // Insecure context, or permission refused. The value is on screen and
      // selectable either way, so this fails quietly rather than alarming
      // somebody in the middle of paying.
    }
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-[15px] font-semibold text-slate-900 break-all tabular-nums">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={`${label}dan nusxa olish`}
        className="shrink-0 mt-1 w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-brand-primary transition-colors cursor-pointer"
      >
        {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
      </button>
    </div>
  );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-slate-100 py-6 px-4 sm:py-12">
    <div className="max-w-2xl mx-auto">{children}</div>
  </div>
);

export const InvoicePayScreen: React.FC = () => {
  const { token = '' } = useParams();
  const queryClient = useQueryClient();

  const [chosen, setChosen] = useState('');
  const [reference, setReference] = useState('');

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
          <LoadingOrb size={36} variant="working" />
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

  return (
    <Shell>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 sm:px-8 pt-7 pb-6 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Hisob-faktura
              </p>
              <p className="text-[15px] font-semibold text-slate-900 mt-0.5 tabular-nums">
                № {data.invoiceNumber}
              </p>
            </div>
            <div className="flex items-center gap-2 text-slate-400">
              <Building2 size={16} />
              <span className="text-sm font-medium text-slate-600">{data.company}</span>
            </div>
          </div>

          {/* The number they came for, and the one they will not have to type. */}
          <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 px-5 py-4">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              To'lov summasi
            </p>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-1 tabular-nums">
              {money(data.amount)} <span className="text-lg font-semibold text-slate-500">so'm</span>
            </p>
          </div>

          {data.jobTitle && (
            <p className="mt-4 text-sm text-slate-500">
              {data.jobTitle}
              {data.workDate ? ` · ${data.workDate}` : ''}
              {data.location ? ` · ${data.location}` : ''}
            </p>
          )}
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
            <div className="px-6 sm:px-8 py-6 border-b border-slate-100">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                Nima orqali to'laysiz
              </h2>
              <div className="space-y-3">
                {methods.map((m) => {
                  const Icon = METHOD_ICONS[m.id] || Landmark;
                  const selected = method === m.id;
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                        selected ? 'border-brand-primary bg-slate-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon size={20} className={selected ? 'text-brand-primary' : 'text-slate-400'} />
                      <span className="flex-1">
                        <span className="block text-[15px] font-semibold text-slate-900">{m.label}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{m.hint}</span>
                      </span>
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selected ? 'border-brand-primary' : 'border-slate-300'
                      }`}>
                        {selected && <span className="w-2.5 h-2.5 rounded-full bg-brand-primary" />}
                      </span>
                      <input
                        type="radio"
                        name="method"
                        value={m.id}
                        checked={selected}
                        onChange={() => setChosen(m.id)}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {requisites.length > 0 && (
              <div className="px-6 sm:px-8 py-6 border-b border-slate-100">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  To'lov rekvizitlari
                </h2>
                <p className="text-xs text-slate-500 mb-3">
                  Bank ilovangizga nusxalang — qo'lda terishning hojati yo'q.
                </p>
                {requisites.map((r) => (
                  <CopyRow key={r.label} label={r.label} value={r.value} />
                ))}
              </div>
            )}

            <div className="px-6 sm:px-8 py-6">
              <label htmlFor="reference" className="block text-sm font-semibold text-slate-800 mb-2">
                To'lov topshirig'i raqami <span className="font-normal text-slate-400">(ixtiyoriy)</span>
              </label>
              <input
                id="reference"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={120}
                placeholder="Masalan: 4471"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] text-slate-900 focus:bg-white focus:border-brand-primary focus:ring-0 transition-colors"
              />
              <p className="mt-2 text-xs text-slate-500">
                Ko'rsatsangiz, to'lovingiz bank ko'chirmasidan tezroq topiladi.
              </p>

              {pay.isError && (
                <p className="mt-4 text-sm text-red-600">{(pay.error as Error).message}</p>
              )}

              <button
                type="button"
                onClick={() => pay.mutate()}
                disabled={!method || pay.isPending}
                className="mt-5 w-full bg-brand-primary text-white font-semibold text-[16px] py-4 rounded-xl shadow-lg shadow-brand-primary/20 hover:opacity-95 active:scale-[0.99] transition-all flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50 disabled:active:scale-100"
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
      </div>

      <p className="mt-5 text-center text-xs text-slate-400">
        Baito · savollar bo'lsa hisob-faktura kelgan xatga javob yozing
      </p>
    </Shell>
  );
};
