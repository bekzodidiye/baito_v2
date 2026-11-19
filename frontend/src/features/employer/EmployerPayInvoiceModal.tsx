import React, { useEffect, useRef, useState } from 'react';
import { money } from '../../utils/money';
import { X, Check, Loader2, Upload, FileText, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../utils/toast';
import { uploadFileApi } from '../../api/queries';
import { apiClient } from '../../api/client';
import type { Job } from '../../types';

interface EmployerPayInvoiceModalProps {
  job: Job | null;
  language: 'uz' | 'ru' | 'en';
  onClose: () => void;
  onDeclared: () => void;
}

/* Settling one invoice from inside the app.
   
   The same declaration the link in the invoice email makes, for an employer who
   is already signed in. It says "yuborildi", never "to'landi": pressing confirm
   here records the payer's word and their receipt, and an administrator still
   has to match it against the bank statement before the job is closed. Saying
   anything stronger at this point would be a promise the app cannot keep. */
export const EmployerPayInvoiceModal: React.FC<EmployerPayInvoiceModalProps> = ({
  job,
  language,
  onClose,
  onDeclared,
}) => {
  const t = (uz: string, ru: string, en: string) =>
    language === 'uz' ? uz : language === 'ru' ? ru : en;

  const fileRef = useRef<HTMLInputElement>(null);
  const [reference, setReference] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [receiptName, setReceiptName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOpen = !!job;

  // Reset per invoice. Without this, a receipt attached for one job would still
  // be sitting in the form when the next one is opened.
  useEffect(() => {
    if (!isOpen) return;
    setReference('');
    setReceiptUrl('');
    setReceiptName('');
    setIsUploading(false);
    setIsSubmitting(false);
  }, [isOpen, job?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadFileApi(file, 'document');
      setReceiptUrl(url);
      setReceiptName(file.name);
    } catch (err) {
      console.error('Receipt upload failed:', err);
      showToast(t("Chekni yuklab bo'lmadi", 'Не удалось загрузить чек', 'Could not upload the receipt'), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job || isSubmitting || isUploading) return;

    // The receipt is the point of this form. The API would take the
    // declaration without one, but an administrator would then have nothing to
    // reconcile, so it is required here rather than silently optional.
    if (!receiptUrl) {
      showToast(t('Chekni yuklang', 'Загрузите чек', 'Attach the receipt'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient(`/jobs/${job.id}/payout/declare`, {
        method: 'POST',
        body: JSON.stringify({
          method: 'bank_transfer',
          reference: reference.trim() || undefined,
          receiptUrl,
        }),
      });
      showToast(t("To'lov yuborildi", 'Оплата отправлена', 'Payment submitted'));
      onDeclared();
      onClose();
    } catch (err: any) {
      showToast(
        err?.message || t('Xatolik yuz berdi', 'Произошла ошибка', 'Something went wrong'),
        'error',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const amount = job?.invoiceAmount != null
    ? money(job.invoiceAmount, language)
    : '—';

  return (
    <AnimatePresence>
      {isOpen && job && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={!isSubmitting && !isUploading ? onClose : undefined}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white w-full max-w-md rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden relative z-10 p-6 flex flex-col max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="font-display font-black text-slate-800 text-sm flex items-center gap-2">
                <Wallet size={16} className="text-amber-500" />
                {t("To'lovni qayd etish", 'Отметить оплату', 'Record payment')}
              </h3>
              <button
                onClick={onClose}
                disabled={isSubmitting || isUploading}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* The invoice, read-only: it is ours, not something to retype. */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-5 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {t('Hisob-faktura', 'Счёт', 'Invoice')}
                </span>
                <span className="text-xs font-black text-slate-800">{job.invoiceNumber || '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {t('Summa', 'Сумма', 'Amount')}
                </span>
                <span className="text-sm font-black text-brand-primary">{amount}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  {t('Ish', 'Работа', 'Job')}
                </span>
                <span className="text-xs font-bold text-slate-600 truncate max-w-[60%]">{job.title}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">
                  {t("To'lov raqami", 'Номер платежа', 'Payment reference')}
                  <span className="ml-1 normal-case tracking-normal font-bold text-slate-300">
                    {t('(ixtiyoriy)', '(необязательно)', '(optional)')}
                  </span>
                </label>
                <input
                  aria-label={t("To'lov raqami", 'Номер платежа', 'Payment reference')}
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  disabled={isSubmitting}
                  placeholder={t("Bank topshiriq raqami", 'Номер платёжного поручения', 'Bank order number')}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800 disabled:opacity-50 placeholder:font-medium placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">
                  {t('Chek', 'Чек', 'Receipt')}
                </label>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={isUploading || isSubmitting}
                  className={`w-full rounded-xl border border-dashed px-3.5 py-4 flex items-center justify-center gap-2 text-xs font-bold transition-colors cursor-pointer disabled:cursor-not-allowed ${
                    receiptUrl
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-brand-primary hover:text-brand-primary'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{t('Yuklanmoqda…', 'Загрузка…', 'Uploading…')}</span>
                    </>
                  ) : receiptUrl ? (
                    <>
                      <FileText size={14} />
                      <span className="truncate max-w-[70%]">{receiptName}</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>{t('Chekni yuklash', 'Загрузить чек', 'Upload receipt')}</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFile}
                  aria-label={t('Chek faylini tanlash', 'Выбрать файл чека', 'Choose a receipt file')}
                  className="hidden"
                />
              </div>

              <p className="text-[11px] font-medium text-slate-500 leading-relaxed bg-sky-50 border border-sky-100 rounded-xl px-3.5 py-3">
                {t(
                  "Tasdiqlaganingizdan so'ng to'lov administrator tomonidan tekshiriladi. Tekshiruvdan o'tgach, ish yakunlangan hisoblanadi.",
                  'После подтверждения платёж проверит администратор. После проверки работа считается завершённой.',
                  'Once you confirm, an administrator checks the payment. The job is closed after that check.',
                )}
              </p>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting || isUploading}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  {t('Bekor qilish', 'Отмена', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploading || !receiptUrl}
                  className="flex-1 py-3 bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-bold rounded-xl transition-all shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin stroke-[2.5]" />
                  ) : (
                    <Check size={14} className="stroke-[2.5]" />
                  )}
                  <span>{t('Chekni tasdiqlash', 'Подтвердить чек', 'Confirm receipt')}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
