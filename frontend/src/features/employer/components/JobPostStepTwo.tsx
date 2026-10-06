import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Users, Calendar as CalendarIcon, Clock, DollarSign, Truck, CheckCircle, AlertTriangle } from 'lucide-react';
import { DateTimePickerModal } from '../../../components/common/DateTimePickerModal';
import { formatDateDisplay } from './JobPostStepTwo.utils';
import { parseWorkDates } from '../../../utils/workDates';

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

  const formattedDateText = formatDateDisplay(workDate, language as 'uz' | 'ru' | 'en');
  const dayCount = parseWorkDates(workDate).length;

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
            {language === 'uz' ? "Ish sanasi *" : language === 'ru' ? "Дата работы *" : "Work Date *"}
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
            {language === 'uz' ? "Ish muddati *" : language === 'ru' ? "Продолжительность *" : "Duration *"}
          </label>
          <div
            onClick={() => setIsPickerOpen(true)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-brand-primary/60 rounded-xl px-3.5 py-3 text-sm font-extrabold text-slate-800 cursor-pointer flex items-center justify-between transition-colors"
          >
            <span>{dayCount > 0
              ? (language === 'ru' ? `${dayCount} дн.` : language === 'en' ? (dayCount === 1 ? '1 day' : `${dayCount} days`) : `${dayCount} kunlik`)
              : (language === 'ru' ? '1 дн.' : language === 'en' ? '1 day' : '1 kunlik')}</span>
            <Clock size={16} className="text-slate-400 shrink-0" />
          </div>
        </div>
      </div>

      {/* Boshlanish va Tugash vaqti */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={14} className="stroke-[2.5] text-brand-primary" />
            {language === 'uz' ? "Boshlanish vaqti *" : language === 'ru' ? "Время начала *" : "Start Time *"}
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
            {language === 'uz' ? "Tugash vaqti *" : language === 'ru' ? "Время окончания *" : "End Time *"}
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
            {language === 'uz' ? "Kerakli ishchilar soni *" : language === 'ru' ? "Количество работников *" : "Workers needed *"}
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
            {/* Not "umumiy": a three-day shift takes this figure three
                times over, once per day, and all three are charged to the
                employer. Nothing has to be in an in-app balance first. */}
            {language === 'uz' ? "Bir kunlik to'lov (so'm) *" : language === 'ru' ? "Ежедневная оплата (UZS) *" : "Daily Pay (UZS) *"}
          </label>
          <input
              aria-label="200000" type="number" placeholder="200000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} />
          {/* What the posting will actually cost. The employer types one
              day's wage and needs the whole run frozen at hire, so the
              multiplication belongs here rather than in a rejection later. */}
          {dayCount > 1 && Number(hourlyRate) > 0 && (
            <p className="text-xs text-slate-500">
              {dayCount} {language === 'uz' ? 'kun' : language === 'ru' ? 'дн.' : 'days'} &times;{' '}
              {Number(hourlyRate).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} ={' '}
              <span className="font-bold text-slate-700 tabular-nums">
                {(Number(hourlyRate) * dayCount).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')}{' '}
                {language === 'ru' ? 'сум' : language === 'en' ? 'UZS' : "so'm"}
              </span>{' '}
              {language === 'uz' ? 'jami' : language === 'ru' ? 'всего' : 'total'}
            </p>
          )}
        </div>
      </div>

      {/* Transport xarajati */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Truck size={14} className="stroke-[2.5] text-brand-primary" />
          {language === 'uz' ? "Transport xarajati (so'm)" : language === 'ru' ? "Транспортные расходы" : "Transport Expenses"}
        </label>
        <input
              aria-label="15000" type="number" placeholder="15000" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2" value={transportRate} onChange={(e) => setTransportRate(e.target.value)} />
      </div>

      {/* Talablar va shartlar */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <CheckCircle size={14} className="stroke-[2.5] text-emerald-600" />
          {language === 'uz' ? "Talablar va shartlar" : language === 'ru' ? "Требования" : "Requirements"}
        </label>
        <textarea rows={2} placeholder={language === 'ru' ? "1. Возраст 18–35\n2. Дисциплинированность" : language === 'en' ? "1. Aged 18-35\n2. Reliable" : "1. Yosh 18-35\n2. Intizomli bo'lish"} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 resize-none" value={requirements} onChange={(e) => setRequirements(e.target.value)} />
      </div>

      {/* Muhim eslatma */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle size={14} className="stroke-[2.5] text-amber-600" />
          {language === 'uz' ? "Muhim eslatma (ishchilar uchun)" : language === 'ru' ? "Важное примечание" : "Important Note"}
        </label>
        <textarea rows={2} placeholder={language === 'ru' ? "Обязательно иметь при себе оригинал паспорта." : language === 'en' ? "You must bring your original passport." : "Pasport asli nusxasi bilan kelish shart."} className="w-full bg-amber-50/50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-amber-950 focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 resize-none" value={importantNote} onChange={(e) => setImportantNote(e.target.value)} />
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
