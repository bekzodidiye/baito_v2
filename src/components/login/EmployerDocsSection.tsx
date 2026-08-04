import React from 'react';
import { Camera, Check } from 'lucide-react';

interface EmployerDocsSectionProps {
  companyName: string;
  setCompanyName: (val: string) => void;
  stir: string;
  setStir: (val: string) => void;
  docFileName1: string;
  setDocFileName1: (val: string) => void;
  docFileName2: string;
  setDocFileName2: (val: string) => void;
  isDragging1: boolean;
  setIsDragging1: (val: boolean) => void;
  isDragging2: boolean;
  setIsDragging2: (val: boolean) => void;
  triggerDoc1Select: () => void;
  triggerDoc2Select: () => void;
  doc1InputRef: React.RefObject<HTMLInputElement | null>;
  doc2InputRef: React.RefObject<HTMLInputElement | null>;
  handleDoc1Upload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDoc2Upload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  t: any;
}

export const EmployerDocsSection: React.FC<EmployerDocsSectionProps> = ({
  companyName,
  setCompanyName,
  stir,
  setStir,
  docFileName1,
  setDocFileName1,
  docFileName2,
  setDocFileName2,
  isDragging1,
  setIsDragging1,
  isDragging2,
  setIsDragging2,
  triggerDoc1Select,
  triggerDoc2Select,
  doc1InputRef,
  doc2InputRef,
  handleDoc1Upload,
  handleDoc2Upload,
  t,
}) => {
  return (
    <div className="space-y-4">
      {/* Company Name */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block px-1">
          {t.orgName}
        </label>
        <input
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Perfect Jobs MCHJ"
          className="w-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl py-3 px-4 text-xs font-bold focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder:text-slate-350 shadow-3xs text-slate-755"
        />
      </div>

      {/* STIR (INN) */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block px-1">
          {t.stir}
        </label>
        <input
          type="text"
          required
          maxLength={9}
          value={stir}
          onChange={(e) => setStir(e.target.value.replace(/\D/g, ''))}
          placeholder="123456789"
          className="w-full bg-white border border-slate-200/80 hover:border-slate-300 rounded-xl py-3 px-4 text-xs font-bold tracking-widest focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all placeholder:text-slate-350 shadow-3xs text-slate-755"
        />
      </div>

      {/* License Upload */}
      <div className="space-y-2 pt-2">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider block px-1">
          {t.license}
        </h3>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging1(true); }}
          onDragLeave={() => setIsDragging1(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging1(false);
            const file = e.dataTransfer.files?.[0];
            if (file) setDocFileName1(file.name);
          }}
          onClick={triggerDoc1Select}
          className={`border border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 relative group overflow-hidden ${
            docFileName1 
              ? 'border-emerald-500 bg-emerald-50/10' 
              : isDragging1 
                ? 'border-brand-primary bg-indigo-50/20' 
                : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-3xs'
          }`}
        >
          <input
            type="file"
            ref={doc1InputRef}
            onChange={handleDoc1Upload}
            accept="image/*,.pdf"
            className="hidden"
          />
          {docFileName1 ? (
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto shadow-3xs">
                <Check size={20} className="stroke-[2.5]" />
              </div>
              <p className="text-xs font-bold text-slate-755 line-clamp-1 px-4">{docFileName1}</p>
              <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {t.uploaded}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 group-hover:text-brand-primary group-hover:bg-indigo-50/30 flex items-center justify-center mx-auto transition-colors shadow-3xs">
                <Camera size={22} className="stroke-[2.2]" />
              </div>
              <p className="text-xs font-black text-slate-700">{t.docEmployerLicense}</p>
              <p className="text-[10px] font-semibold text-slate-400">
                {t.docEmployerLicenseDesc}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Logo Upload */}
      <div className="space-y-2 pt-1">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider block px-1">
          {t.logo}
        </h3>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging2(true); }}
          onDragLeave={() => setIsDragging2(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging2(false);
            const file = e.dataTransfer.files?.[0];
            if (file) setDocFileName2(file.name);
          }}
          onClick={triggerDoc2Select}
          className={`border border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 relative group overflow-hidden ${
            docFileName2 
              ? 'border-emerald-500 bg-emerald-50/10' 
              : isDragging2 
                ? 'border-brand-primary bg-indigo-50/20' 
                : 'border-slate-200 hover:border-slate-300 bg-white hover:shadow-3xs'
          }`}
        >
          <input
            type="file"
            ref={doc2InputRef}
            onChange={handleDoc2Upload}
            accept="image/*"
            className="hidden"
          />
          {docFileName2 ? (
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto shadow-3xs">
                <Check size={20} className="stroke-[2.5]" />
              </div>
              <p className="text-xs font-bold text-slate-755 line-clamp-1 px-4">{docFileName2}</p>
              <span className="inline-block text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {t.uploaded}
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 group-hover:text-brand-primary group-hover:bg-indigo-50/30 flex items-center justify-center mx-auto transition-colors shadow-3xs">
                <Camera size={22} className="stroke-[2.2]" />
              </div>
              <p className="text-xs font-black text-slate-700">{t.docEmployerLogo}</p>
              <p className="text-[10px] font-semibold text-slate-400">
                {t.docEmployerLogoDesc}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
