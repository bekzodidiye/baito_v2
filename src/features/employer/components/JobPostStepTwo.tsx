import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Calendar as CalendarIcon, Clock, DollarSign, Truck, CheckCircle, AlertTriangle } from 'lucide-react';
import { DateTimePickerModal } from '../../../components/common/DateTimePickerModal';
import { formatDateDisplay } from './JobPostStepTwo.utils';

interface JobPostStepTwoProps {
  language: string;
  neededWorkers: string;
  setNeededWorkers: (val: string) => void;
  workDate: string;
  setWorkDate: (val: string) => void;
  startTime: string;
  setStartTime: (val: string) => void;
  endTime: string;
  setEndTime: (val: string) => void;
  durationLabel: string;
  setDurationLabel: (val: string) => void;
  hourlyRate: string;
  setHourlyRate: (val: string) => void;
  transportRate: string;
  setTransportRate: (val: string) => void;
  requirements: string;
  setRequirements: (val: string) => void;
  importantNote: string;
  setImportantNote: (val: string) => void;
}

export const JobPostStepTwo: React.FC<JobPostStepTwoProps> = (props) => {
  const { language, neededWorkers, setNeededWorkers, workDate, setWorkDate, startTime, setStartTime, endTime, setEndTime, durationLabel, setDurationLabel, hourlyRate, setHourlyRate, transportRate, setTransportRate, requirements, setRequirements, importantNote, setImportantNote } = props;

  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handlePickerSave = (datesStr: string, startStr: string, endStr: string, durLabel: string) => {
    setWorkDate(datesStr);
    setStartTime(startStr);
    setEndTime(endStr);
    setDurationLabel(durLabel);
  };

  const formattedDateText = formatDateDisplay(workDate);

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-5 bg-white p-5 sm:p-6 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-100"
    >
      {/* Synchronized Display Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Ish Sanasi */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarIcon size={14} className="stroke-[2.5] text-brand-primary" />
            {language === 'uz' ? "Ish sanasi *" : "Work Date *"}
          </label>
          <div
            onClick={() => setIsPickerOpen(true)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-brand-primary/60 rounded-xl px-3.5 py-3 text-sm font-extrabold text-slate-800 cursor-pointer flex items-center justify-between transition-colors"
          >
            <span className="truncate pr-2">{formattedDateText}</span>
            <CalendarIcon size={16} className="text-slate-400 shrink-0" />
          </div>
        </div>

        {/* Ish Muddati */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={14} className="stroke-[2.5] text-brand-primary" />
            {language === 'uz' ? "Ish muddati *" : "Duration *"}
          </label>
          <div
            onClick={() => setIsPickerOpen(true)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-brand-primary/60 rounded-xl px-3.5 py-3 text-sm font-extrabold text-slate-800 cursor-pointer flex items-center justify-between transition-colors"
          >
            <span>{durationLabel || '1 kunlik'}</span>
            <Clock size={16} className="text-slate-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* Boshlanish va Tugash vaqti */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={14} className="stroke-[2.5] text-brand-primary" />
            {language === 'uz' ? "Boshlanish vaqti *" : "Start Time *"}
          </label>
          <div
            onClick={() => setIsPickerOpen(true)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-brand-primary/60 rounded-xl px-3.5 py-3 text-sm font-extrabold text-slate-800 cursor-pointer flex items-center justify-between transition-colors"
          >
            <span>{startTime || '09:00'}</span>
            <Clock size={16} className="text-slate-400 shrink-0" />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={14} className="stroke-[2.5] text-brand-primary" />
            {language === 'uz' ? "Tugash vaqti *" : "End Time *"}
          </label>
          <div
            onClick={() => setIsPickerOpen(true)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-brand-primary/60 rounded-xl px-3.5 py-3 text-sm font-extrabold text-slate-800 cursor-pointer flex items-center justify-between transition-colors"
          >
            <span>{endTime || '18:00'}</span>
            <Clock size={16} className="text-slate-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* Ishchilar soni va Maosh */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Users size={14} className="stroke-[2.5] text-brand-primary" />
            {language === 'uz' ? "Kerakli ishchilar soni *" : "Workers needed *"}
          </label>
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-1.5 w-max">
            <button type="button" onClick={() => setNeededWorkers(String(Math.max(1, parseInt(neededWorkers || '1') - 1)))} className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-600 active:scale-95">-</button>
            <span className="font-display font-black text-base w-6 text-center text-slate-900">{neededWorkers || '1'}</span>
            <button type="button" onClick={() => setNeededWorkers(String(parseInt(neededWorkers || '1') + 1))} className="w-8 h-8 rounded-lg bg-brand-primary text-white flex items-center justify-center font-bold active:scale-95 border-none">+</button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign size={14} className="stroke-[2.5] text-brand-primary" />
            {language === 'uz' ? "Umumiy to'lov (so'm) *" : "Total Salary (UZS) *"}
          </label>
          <input type="number" placeholder="200000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
        </div>
      </div>

      {/* Transport xarajati */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Truck size={14} className="stroke-[2.5] text-brand-primary" />
          {language === 'uz' ? "Transport xarajati (so'm)" : "Transport Expenses"}
        </label>
        <input type="number" placeholder="15000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none" value={transportRate} onChange={(e) => setTransportRate(e.target.value)} />
      </div>

      {/* Talablar va shartlar */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle size={14} className="stroke-[2.5] text-emerald-600" />
          {language === 'uz' ? "Talablar va shartlar" : "Requirements"}
        </label>
        <textarea rows={2} placeholder={language === 'uz' ? "1. Yosh 18-35\n2. Intizomli bo'lish" : "1. Age 18-35"} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary outline-none resize-none" value={requirements} onChange={(e) => setRequirements(e.target.value)} />
      </div>

      {/* Muhim eslatma */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle size={14} className="stroke-[2.5] text-amber-600" />
          {language === 'uz' ? "Muhim eslatma (ishchilar uchun)" : "Important Note"}
        </label>
        <textarea rows={2} placeholder={language === 'uz' ? "Pasport asli nusxasi bilan kelish shart." : "Passport required."} className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-amber-950 focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 outline-none resize-none" value={importantNote} onChange={(e) => setImportantNote(e.target.value)} />
      </div>

      {/* Premium Modal */}
      <DateTimePickerModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        workDateValue={workDate}
        startTimeValue={startTime}
        endTimeValue={endTime}
        onSave={handlePickerSave}
        language={language}
      />
    </motion.div>
  );
};
