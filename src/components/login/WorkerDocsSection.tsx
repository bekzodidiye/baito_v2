import React from 'react';
import { Camera, Check } from 'lucide-react';

interface WorkerDocsSectionProps {
  passportSeries: string;
  setPassportSeries: (val: string) => void;
  passportNumber: string;
  setPassportNumber: (val: string) => void;
  jshshir: string;
  setJshshir: (val: string) => void;
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
  t: any;
}

export const WorkerDocsSection: React.FC<WorkerDocsSectionProps> = (props) => {
  const {
    passportSeries, setPassportSeries, passportNumber, setPassportNumber,
    jshshir, setJshshir, docFileName1, setDocFileName1, docFileName2, setDocFileName2,
    docFileName3, setDocFileName3, isDragging1, setIsDragging1, isDragging2, setIsDragging2,
    isDragging3, setIsDragging3, triggerDoc1Select, triggerDoc2Select, triggerDoc3Select,
    doc1InputRef, doc2InputRef, doc3InputRef, handleDoc1Upload, handleDoc2Upload, handleDoc3Upload, t
  } = props;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4 space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block px-1">{t.series}</label>
          <input type="text" required maxLength={2} value={passportSeries} onChange={(e) => setPassportSeries(e.target.value.toUpperCase())} placeholder="AB" className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-black text-center outline-none focus:border-brand-primary" />
        </div>
        <div className="col-span-8 space-y-1">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block px-1">{t.passportNumber}</label>
          <input type="text" required maxLength={7} value={passportNumber} onChange={(e) => setPassportNumber(e.target.value.replace(/\D/g, ''))} placeholder="1234567" className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold outline-none focus:border-brand-primary" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block px-1">{t.jshshir}</label>
        <input type="text" required maxLength={14} value={jshshir} onChange={(e) => setJshshir(e.target.value.replace(/\D/g, ''))} placeholder="12345678901234" className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold outline-none focus:border-brand-primary" />
      </div>

      <div className="space-y-2 pt-1">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider block px-1">PASSPORT RASMLARI *</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block px-1">{t.passportFront}</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging1(true); }}
              onDragLeave={() => setIsDragging1(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging1(false); const f = e.dataTransfer.files?.[0]; if (f) setDocFileName1(f.name); }}
              onClick={triggerDoc1Select}
              className={`border border-dashed rounded-xl aspect-video p-2 flex flex-col items-center justify-center text-center cursor-pointer ${docFileName1 ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white'}`}
            >
              <input type="file" ref={doc1InputRef} onChange={handleDoc1Upload} accept="image/*,.pdf" className="hidden" />
              {docFileName1 ? <Check size={16} className="text-emerald-500" /> : <Camera size={16} className="text-slate-400" />}
              <span className="text-[10px] font-bold text-slate-600 mt-1">{docFileName1 || 'Old tomon'}</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 block px-1">{t.passportBack}</label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging2(true); }}
              onDragLeave={() => setIsDragging2(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging2(false); const f = e.dataTransfer.files?.[0]; if (f) setDocFileName2(f.name); }}
              onClick={triggerDoc2Select}
              className={`border border-dashed rounded-xl aspect-video p-2 flex flex-col items-center justify-center text-center cursor-pointer ${docFileName2 ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white'}`}
            >
              <input type="file" ref={doc2InputRef} onChange={handleDoc2Upload} accept="image/*,.pdf" className="hidden" />
              {docFileName2 ? <Check size={16} className="text-emerald-500" /> : <Camera size={16} className="text-slate-400" />}
              <span className="text-[10px] font-bold text-slate-600 mt-1">{docFileName2 || 'Orqa tomon'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1 pt-1">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-wider block px-1">{t.selfie}</h3>
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging3(true); }}
          onDragLeave={() => setIsDragging3(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging3(false); const f = e.dataTransfer.files?.[0]; if (f) setDocFileName3(f.name); }}
          onClick={triggerDoc3Select}
          className={`border border-dashed rounded-xl p-4 text-center cursor-pointer ${docFileName3 ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-200 bg-white'}`}
        >
          <input type="file" ref={doc3InputRef} onChange={handleDoc3Upload} accept="image/*" className="hidden" />
          <Camera size={20} className="text-slate-400 mx-auto mb-1" />
          <p className="text-xs font-bold text-slate-700">{docFileName3 || t.selfie}</p>
        </div>
      </div>
    </div>
  );
};
