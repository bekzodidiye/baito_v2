import React from 'react';
import { User, Building2, Lock, ArrowRight, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { WorkerDocsSection } from './WorkerDocsSection';
import { EmployerDocsSection } from './EmployerDocsSection';

interface DocumentsViewProps {
  selectedRole: 'worker' | 'employer' | null;
  triggerDemoDocsAll: () => void;
  passportSeries: string;
  setPassportSeries: (val: string) => void;
  passportNumber: string;
  setPassportNumber: (val: string) => void;
  jshshir: string;
  setJshshir: (val: string) => void;
  companyName: string;
  setCompanyName: (val: string) => void;
  stir: string;
  setStir: (val: string) => void;
  docFileName1: string;
  setDocFileName1: (val: string) => void;
  docFileName2: string;
  setDocFileName2: (val: string) => void;
  docFileName3: string;
  setDocFileName3: (val: string) => void;
  isDragging1: boolean;
  setIsDragging1: (val: boolean) => void;
  isDragging2: boolean;
  setIsDragging2: (val: boolean) => void;
  isDragging3: boolean;
  setIsDragging3: (val: boolean) => void;
  triggerDoc1Select: () => void;
  triggerDoc2Select: () => void;
  triggerDoc3Select: () => void;
  doc1InputRef: React.RefObject<HTMLInputElement | null>;
  doc2InputRef: React.RefObject<HTMLInputElement | null>;
  doc3InputRef: React.RefObject<HTMLInputElement | null>;
  handleDoc1Upload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDoc2Upload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDoc3Upload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  documentsSubmitRef: React.RefObject<HTMLButtonElement | null>;
  handleDocumentsSubmit: (e: React.FormEvent) => void;
  t: any;
  language?: string;
  isModal: boolean;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  selectedRole,
  triggerDemoDocsAll,
  passportSeries,
  setPassportSeries,
  passportNumber,
  setPassportNumber,
  jshshir,
  setJshshir,
  companyName,
  setCompanyName,
  stir,
  setStir,
  docFileName1,
  setDocFileName1,
  docFileName2,
  setDocFileName2,
  docFileName3,
  setDocFileName3,
  isDragging1,
  setIsDragging1,
  isDragging2,
  setIsDragging2,
  isDragging3,
  setIsDragging3,
  triggerDoc1Select,
  triggerDoc2Select,
  triggerDoc3Select,
  doc1InputRef,
  doc2InputRef,
  doc3InputRef,
  handleDoc1Upload,
  handleDoc2Upload,
  handleDoc3Upload,
  documentsSubmitRef,
  handleDocumentsSubmit,
  t,
  isModal,
}) => {
  return (
    <motion.div
      key="documents"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Stepper Progress Bar */}
      <div className="p-4 rounded-2xl bg-indigo-50/10 border border-slate-100 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-brand-primary shrink-0 shadow-3xs">
          {selectedRole === 'worker' ? (
            <User size={22} className="stroke-[2.2]" />
          ) : (
            <Building2 size={22} className="stroke-[2.2]" />
          )}
        </div>
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight leading-tight">
            {selectedRole === 'worker' ? t.identityTitle : t.employerTitle}
          </h2>
          <p className="text-[11px] text-slate-505 font-semibold leading-relaxed">
            {selectedRole === 'worker' ? t.identitySubtitle : t.employerSubtitle}
          </p>
        </div>
      </div>

      {/* Demo Autofill Banner */}
      <div className="flex justify-end px-1">
        <button
          type="button"
          onClick={triggerDemoDocsAll}
          className="text-[11px] font-black text-brand-primary hover:text-brand-primary/80 flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100/60 px-3 py-1.5 rounded-xl transition-all border-0 cursor-pointer shadow-3xs"
        >
          <span>✨ {t.demoDocText}</span>
        </button>
      </div>

      <form id="documents-form" noValidate onSubmit={handleDocumentsSubmit} className="space-y-5 max-w-[380px] mx-auto w-full">
        <button type="submit" ref={documentsSubmitRef} className="hidden" />
        
        {selectedRole === 'worker' ? (
          <WorkerDocsSection 
            passportSeries={passportSeries}
            setPassportSeries={setPassportSeries}
            passportNumber={passportNumber}
            setPassportNumber={setPassportNumber}
            jshshir={jshshir}
            setJshshir={setJshshir}
            docFileName1={docFileName1}
            setDocFileName1={setDocFileName1}
            docFileName2={docFileName2}
            setDocFileName2={setDocFileName2}
            docFileName3={docFileName3}
            setDocFileName3={setDocFileName3}
            isDragging1={isDragging1}
            setIsDragging1={setIsDragging1}
            isDragging2={isDragging2}
            setIsDragging2={setIsDragging2}
            isDragging3={isDragging3}
            setIsDragging3={setIsDragging3}
            triggerDoc1Select={triggerDoc1Select}
            triggerDoc2Select={triggerDoc2Select}
            triggerDoc3Select={triggerDoc3Select}
            doc1InputRef={doc1InputRef}
            doc2InputRef={doc2InputRef}
            doc3InputRef={doc3InputRef}
            handleDoc1Upload={handleDoc1Upload}
            handleDoc2Upload={handleDoc2Upload}
            handleDoc3Upload={handleDoc3Upload}
            t={t}
          />
        ) : (
          <EmployerDocsSection 
            companyName={companyName}
            setCompanyName={setCompanyName}
            stir={stir}
            setStir={setStir}
            docFileName1={docFileName1}
            setDocFileName1={setDocFileName1}
            docFileName2={docFileName2}
            setDocFileName2={setDocFileName2}
            isDragging1={isDragging1}
            setIsDragging1={setIsDragging1}
            isDragging2={isDragging2}
            setIsDragging2={setIsDragging2}
            triggerDoc1Select={triggerDoc1Select}
            triggerDoc2Select={triggerDoc2Select}
            doc1InputRef={doc1InputRef}
            doc2InputRef={doc2InputRef}
            handleDoc1Upload={handleDoc1Upload}
            handleDoc2Upload={handleDoc2Upload}
            t={t}
          />
        )}

        {/* Security/Encryption Banner Notice */}
        <div className="bg-brand-primary/10 border border-brand-primary/20 p-4 rounded-xl flex items-start gap-3">
          <span className="text-brand-primary mt-0.5 shrink-0">
            <Lock size={16} className="stroke-[2.5]" />
          </span>
          <p className="text-[11px] font-semibold text-brand-primary leading-tight">
            {t.sslNotice}
          </p>
        </div>

      </form>
    </motion.div>
  );
};
