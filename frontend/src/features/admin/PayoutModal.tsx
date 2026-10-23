import React, { useEffect, useState } from 'react';
import { money as sum } from '../../utils/money';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import {
  X, Wallet, Receipt, Send, CheckCircle2, AlertTriangle, Loader2, FileText, Building2,
} from 'lucide-react';
import { apiClient } from '../../api/client';
import { uploadFileApi } from '../../api/queries';
import { showToast } from '../../utils/toast';

/** Settling a finished shift.
 *
 *  Two steps, because they are two different acts. Step one records that money
 *  left a bank account and takes it off what the platform owes the worker —
 *  irreversible. Step two bills the company for it. If the invoice fails to
 *  send, nothing about the payment should unwind, so the modal lets you close
 *  after step one and come back.
 */

interface PayoutContext {
  job: {
    id: string; title: string; company: string; status: string;
    salary?: string | null; workDate?: string | null; workTime?: string | null;
    hourlyRate?: string | null; location?: string | null;
  };
  worker: { id: string; name: string; phone: string; balance: number } | null;
  employer: { id: string; name: string; email: string | null; companyName: string | null } | null;
  payout: Payout | null;
  bankDetailsSet: boolean;
  smtpConfigured: boolean;
  /** The rate the company is billed on top of the wage, from the admin panel. */
  platformFeePercent: number;
}

interface Payout {
  id: string; jobId: string; amount: number; receiptUrl: string; status: string;
  invoiceNumber: string | null; invoiceAmount: number | null;
  invoiceSentTo: string | null; invoiceSentAt: string | null;
}

interface Props {
  jobId: string;
  onClose: () => void;
  onDone?: () => void;
}

const som = (n: number) => sum(n, useAuthStore.getState().language);

export const PayoutModal: React.FC<Props> = ({ jobId, onClose, onDone }) => {
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;
  const [ctx, setCtx] = useState<PayoutContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<1 | 2>(1);

  // step 1
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  // step 2
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoiceNote, setInvoiceNote] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiClient(`/admin/jobs/${jobId}/payout`);
        if (!alive) return;
        setCtx(data);
        // Pre-fill with what is owed rather than leaving it blank: the common
        // case is paying the balance in full, and a typed number is a chance
        // to fat-finger a zero.
        if (data.worker) setAmount(String(data.worker.balance ?? ''));
        if (data.employer?.email) setInvoiceEmail(data.employer.email);
        if (data.payout) {
          setStep(2);
          setInvoiceAmount(String(data.payout.invoiceAmount ?? data.payout.amount ?? ''));
        }
      } catch {
        showToast("Ma'lumotni yuklab bo'lmadi", 'error');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [jobId]);

  const handleReceipt = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFileApi(file, 'document');
      setReceiptUrl(url);
      setReceiptName(file.name);
    } catch {
      showToast('Chekni yuklab bo`lmadi', 'error');
    } finally {
      setUploading(false);
    }
  };

  const submitPayout = async () => {
    setSaving(true);
    try {
      const created: Payout = await apiClient(`/admin/jobs/${jobId}/payout`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(amount),
          receiptUrl,
          note: note || null,
          workerId: ctx?.worker?.id || null,
        }),
      });
      setCtx((c) => (c ? { ...c, payout: created } : c));
      setInvoiceAmount(String(created.amount));
      setConfirming(false);
      setStep(2);
      showToast("To'lov tasdiqlandi", 'success');
      onDone?.();
    } catch (e: any) {
      showToast(e?.message || "To'lovni tasdiqlab bo'lmadi", 'error');
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  const sendInvoice = async () => {
    setSending(true);
    try {
      const updated: Payout = await apiClient(`/admin/jobs/${jobId}/payout/invoice`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(invoiceAmount),
          email: invoiceEmail || null,
          note: invoiceNote || null,
        }),
      });
      setCtx((c) => (c ? { ...c, payout: updated } : c));
      showToast('Hisob-faktura yuborildi', 'success');
      onDone?.();
    } catch (e: any) {
      showToast(e?.message || 'Hisob-faktura yuborilmadi', 'error');
    } finally {
      setSending(false);
    }
  };

  // The commission the company is billed on top of the wage. The server adds it
  // when the invoice goes out; this mirrors the same arithmetic so the
  // administrator is not pressing send on a number they cannot see.
  const feePercent = ctx?.platformFeePercent ?? 0;
  const invoiceBase = Number(invoiceAmount) > 0 ? Number(invoiceAmount) : 0;
  const invoiceFee = Math.floor(invoiceBase * (feePercent / 100));
  const invoiceTotal = invoiceBase + invoiceFee;

  const balance = ctx?.worker?.balance ?? 0;
  const amountNum = Number(amount);
  const amountValid = amountNum > 0 && amountNum <= balance;
  const canConfirm = amountValid && !!receiptUrl && !saving;
  const alreadyInvoiced = !!ctx?.payout?.invoiceSentAt;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">

        <div className="flex items-start justify-between p-5 border-b border-slate-100 shrink-0">
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
              <Wallet size={20} className="text-brand-primary shrink-0" />
              To'lovni tasdiqlash
            </h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {ctx?.job.title} · {ctx?.job.company}
            </p>
          </div>
          <button onClick={onClose} aria-label="Yopish"
            className="p-2 -mr-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Two steps, shown as two so nobody wonders what happens after confirming. */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 shrink-0">
          {([1, 2] as const).map((n) => (
            <div key={n} className={`flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full ${
              step === n ? 'bg-brand-primary text-white'
                : step > n ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
            }`}>
              {step > n ? <CheckCircle2 size={13} /> : <span>{n}</span>}
              {n === 1 ? 'Ishchiga to`lov' : 'Korxonaga hisob-faktura'}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="py-14 flex justify-center text-slate-400">
              <Loader2 size={26} className="animate-spin" />
            </div>
          ) : !ctx ? null : step === 1 ? (
            <div className="space-y-4">
              {!ctx.worker ? (
                <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 rounded-2xl p-4">
                  Bu ishga ishchi yollanmagan — to'lov qilib bo'lmaydi.
                </p>
              ) : (
                <>
                  <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">{a.roleWorker}</p>
                      <p className="font-bold text-slate-900 truncate">{ctx.worker.name}</p>
                      <p className="text-xs text-slate-500">{ctx.worker.phone}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wider font-bold">Balans</p>
                      <p className="font-black text-brand-primary tabular-nums">{som(balance)}</p>
                    </div>
                  </div>

                  <label className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      To'lov summasi *
                    </span>
                    <input
                      type="number" inputMode="numeric" value={amount} min={1} max={balance}
                      onChange={(e) => setAmount(e.target.value)}
                      className="mt-1.5 w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-900 tabular-nums focus:bg-white transition-colors"
                      placeholder="0"
                    />
                    {amount !== '' && !amountValid && (
                      <span className="text-xs text-rose-600 mt-1 block">
                        {amountNum > balance
                          ? `Balansdan katta (${som(balance)})`
                          : 'Summa 0 dan katta bo`lishi kerak'}
                      </span>
                    )}
                  </label>

                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      To'lov cheki *
                    </span>
                    <label className="mt-1.5 flex items-center gap-3 p-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                      <input type="file" accept="image/*,application/pdf" className="sr-only"
                        onChange={(e) => handleReceipt(e.target.files?.[0])} />
                      {uploading ? <Loader2 size={20} className="animate-spin text-slate-400" />
                        : receiptUrl ? <FileText size={20} className="text-emerald-600" />
                        : <Receipt size={20} className="text-slate-400" />}
                      <span className={`text-sm font-semibold truncate ${receiptUrl ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {uploading ? 'Yuklanmoqda…' : receiptName || 'Chekni yuklash (rasm yoki PDF)'}
                      </span>
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Izoh</span>
                    <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                      className="mt-1.5 w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:bg-white transition-colors"
                      placeholder="Ixtiyoriy" />
                  </label>

                  <p className="text-xs text-slate-500 bg-amber-50 border border-amber-100 rounded-2xl p-3 flex gap-2">
                    <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-px" />
                    Tasdiqlansa, summa ishchi balansidan yechiladi va bu amalni orqaga qaytarib bo'lmaydi.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-emerald-900 text-sm">
                    Ishchiga {som(ctx.payout?.amount ?? 0)} to'landi
                  </p>
                  {ctx.payout?.receiptUrl && (
                    <a href={ctx.payout.receiptUrl} target="_blank" rel="noreferrer"
                      className="text-xs text-emerald-700 underline">{a.openReceipt}</a>
                  )}
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5 text-sm">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                  <Building2 size={13} /> Ish tafsilotlari
                </p>
                {[
                  ['Korxona', ctx.employer?.companyName || ctx.job.company],
                  ['Ish', ctx.job.title],
                  ['Sana', ctx.job.workDate || '—'],
                  ['Vaqt', ctx.job.workTime || '—'],
                  ['Manzil', ctx.job.location || '—'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-semibold text-slate-800 text-right truncate">{v}</span>
                  </div>
                ))}
              </div>

              {alreadyInvoiced ? (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm">
                  <p className="font-bold text-slate-900">
                    Hisob-faktura {ctx.payout?.invoiceNumber} yuborilgan
                  </p>
                  <p className="text-slate-500 text-xs mt-1">
                    {ctx.payout?.invoiceSentTo} · {som(ctx.payout?.invoiceAmount ?? 0)}
                  </p>
                </div>
              ) : (
                <>
                  {!ctx.bankDetailsSet && (
                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-2xl p-3 flex gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-px" />
                      Bank rekvizitlari kiritilmagan — hisob-fakturada to'lov ma'lumotlari bo'lmaydi.
                      To'lovlar bo'limidan kiriting.
                    </p>
                  )}
                  {!ctx.smtpConfigured && (
                    <p className="text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-2xl p-3 flex gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-px" />
                      Pochta serveri sozlanmagan — hozircha yuborib bo'lmaydi.
                    </p>
                  )}

                  <label className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Ish haqi (korxona to'laydigan) *
                    </span>
                    <input type="number" inputMode="numeric" value={invoiceAmount} min={1}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      className="mt-1.5 w-full h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 font-bold text-slate-900 tabular-nums focus:bg-white transition-colors" />
                    <span className="text-xs text-slate-400 mt-1 block">
                      Ishchi rejadagidan ko'proq ishlagan bo'lsa, shu yerda ko'proq yozing.
                    </span>

                    {/* The commission is added on top server-side. Showing the
                        rate and the total here means the figure the administrator
                        presses send on is the figure the company receives. */}
                    {invoiceBase > 0 && (
                      <div className="mt-2.5 rounded-2xl bg-slate-50 border border-slate-200 p-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">{a.wageLabel}</span>
                          <span className="font-semibold tabular-nums">{som(invoiceBase)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Xizmat haqi ({feePercent}%)</span>
                          <span className="font-semibold tabular-nums">{som(invoiceFee)}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
                          <span className="text-slate-600 font-bold">Korxonaga yuboriladi</span>
                          <span className="font-black text-brand-primary tabular-nums">{som(invoiceTotal)}</span>
                        </div>
                      </div>
                    )}
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Korxona pochtasi *
                    </span>
                    <input type="email" value={invoiceEmail} onChange={(e) => setInvoiceEmail(e.target.value)}
                      className="mt-1.5 w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:bg-white transition-colors"
                      placeholder="buxgalteriya@korxona.uz" />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Izoh</span>
                    <input type="text" value={invoiceNote} onChange={(e) => setInvoiceNote(e.target.value)}
                      className="mt-1.5 w-full h-11 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm focus:bg-white transition-colors"
                      placeholder="Ixtiyoriy" />
                  </label>

                  {/* What the company will receive, before it is sent. */}
                  {Number(invoiceAmount) > 0 && (
                    <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
                      <div className="bg-slate-50 border-b border-slate-200/80 text-slate-800 px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <FileText size={14} className="text-brand-primary" />
                        <span>Hisob-faktura (oldindan ko'rish)</span>
                      </div>
                      <div className="p-4 space-y-1.5 text-sm">
                        <div className="flex justify-between"><span className="text-slate-500">{a.companyColumn}</span>
                          <span className="font-semibold">{ctx.employer?.companyName || ctx.job.company}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">{a.jobLabel}</span>
                          <span className="font-semibold">{ctx.job.title}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">{a.dateLabel}</span>
                          <span className="font-semibold">{ctx.job.workDate || '—'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">{a.wageLabel}</span>
                          <span className="font-semibold tabular-nums">{som(invoiceBase)}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Xizmat haqi ({feePercent}%)</span>
                          <span className="font-semibold tabular-nums">{som(invoiceFee)}</span></div>
                        <div className="flex justify-between border-t border-slate-100 pt-2 mt-2">
                          <span className="text-slate-500 font-bold">Jami</span>
                          <span className="font-black text-brand-primary tabular-nums">{som(invoiceTotal)}</span></div>
                        <p className="text-xs text-slate-400 pt-1">
                          Bank rekvizitlari xatga avtomatik qo'shiladi.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 shrink-0">
          {step === 1 ? (
            confirming ? (
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-900 text-center">
                  Haqiqatan {som(amountNum)} to'lovni tasdiqlaysizmi?
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirming(false)} disabled={saving}
                    className="flex-1 h-12 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50">
                    Bekor qilish
                  </button>
                  <button onClick={submitPayout} disabled={saving}
                    className="flex-1 h-12 rounded-2xl bg-brand-primary text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />}
                    Ha, tasdiqlayman
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirming(true)} disabled={!canConfirm}
                className="w-full h-12 rounded-2xl bg-brand-primary text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                <Wallet size={17} /> To'lovni tasdiqlash
              </button>
            )
          ) : alreadyInvoiced ? (
            <button onClick={onClose}
              className="w-full h-12 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors">
              Yopish
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={onClose}
                className="flex-1 h-12 rounded-2xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                Keyinroq
              </button>
              <button onClick={sendInvoice}
                disabled={sending || !ctx?.smtpConfigured || !invoiceEmail || Number(invoiceAmount) <= 0}
                className="flex-[2] h-12 rounded-2xl bg-brand-primary text-white font-bold hover:bg-brand-primary/95 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xs shadow-brand-primary/20 active:scale-95">
                {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                Korxonaga yuborish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
