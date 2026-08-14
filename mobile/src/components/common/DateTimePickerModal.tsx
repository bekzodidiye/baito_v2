import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X } from 'lucide-react';
import { MONTH_NAMES_UZ, WEEKDAYS_UZ, parseInitial24hTime, getDaysInMonth, getFirstDayOfWeek } from './DateTimePickerModal.utils';

interface DateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  workDateValue: string;
  startTimeValue: string;
  endTimeValue: string;
  onSave: (datesStr: string, startStr: string, endStr: string, durationLabel: string) => void;
  language?: string;
}

export const DateTimePickerModal: React.FC<DateTimePickerModalProps> = ({
  isOpen, onClose, workDateValue, startTimeValue, endTimeValue, onSave
}) => {
  if (!isOpen) return null;

  const initialDates = workDateValue ? workDateValue.split(', ').filter(Boolean) : [new Date().toISOString().split('T')[0]];
  const [selectedDates, setSelectedDates] = useState<string[]>(initialDates);
  const initialDateObj = selectedDates[0] ? new Date(selectedDates[0]) : new Date();
  const [currYear, setCurrYear] = useState(initialDateObj.getFullYear() || 2026);
  const [currMonth, setCurrMonth] = useState(initialDateObj.getMonth() ?? 7);

  const [timeTab, setTimeTab] = useState<'start' | 'end'>('start');
  const startT = parseInitial24hTime(startTimeValue || '09:00');
  const endT = parseInitial24hTime(endTimeValue || '18:00');
  const [startHour, setStartHour] = useState(startT.hour);
  const [startMin, setStartMin] = useState(startT.minute);
  const [endHour, setEndHour] = useState(endT.hour);
  const [endMin, setEndMin] = useState(endT.minute);

  const daysInMonth = getDaysInMonth(currYear, currMonth);
  const firstDayOfWeek = getFirstDayOfWeek(currYear, currMonth);

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      if (selectedDates.length > 1) setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr].sort());
    }
  };

  const curHour = timeTab === 'start' ? startHour : endHour;
  const curMin = timeTab === 'start' ? startMin : endMin;
  const setCurHour = (val: number) => (timeTab === 'start' ? setStartHour(val) : setEndHour(val));
  const setCurMin = (val: number) => (timeTab === 'start' ? setStartMin(val) : setEndMin(val));

  const incHour = () => setCurHour((curHour + 1) % 24);
  const decHour = () => setCurHour((curHour - 1 + 24) % 24);
  const incMin = () => setCurMin(curMin + 5 >= 60 ? 0 : curMin + 5);
  const decMin = () => setCurMin(curMin - 5 < 0 ? 55 : curMin - 5);

  const handleDone = () => {
    const datesStr = selectedDates.join(', ');
    const sStr = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const eStr = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    onSave(datesStr, sStr, eStr, `${selectedDates.length} kunlik`);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl border w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="p-4 px-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-brand-primary text-white text-[10px] font-black uppercase rounded-full">{selectedDates.length} KUNLIK ISH</span>
              <span className="text-xs font-black text-slate-800 flex items-center gap-2">
                <CalendarIcon size={15} className="text-brand-primary" /> {selectedDates.length} ta kun | <Clock size={15} className="text-brand-primary" /> {String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')} - {String(endHour).padStart(2, '0')}:{String(endMin).padStart(2, '0')}
              </span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 cursor-pointer shrink-0 ml-2"><X size={18} /></button>
          </div>

          <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto">
            <div className="md:col-span-7 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <button onClick={() => setCurrMonth(m => (m === 0 ? 11 : m - 1))} className="p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"><ChevronLeft size={18} /></button>
                <span className="font-extrabold text-slate-800 text-sm">{MONTH_NAMES_UZ[currMonth]} {currYear}</span>
                <button onClick={() => setCurrMonth(m => (m === 11 ? 0 : m + 1))} className="p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"><ChevronRight size={18} /></button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAYS_UZ.map((wd, i) => (<span key={i} className="text-[10px] font-extrabold text-slate-400 py-1">{wd}</span>))}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (<div key={`empty-${i}`} className="h-8" />))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dNum = i + 1;
                  const dateStr = `${currYear}-${String(currMonth + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
                  const isSel = selectedDates.includes(dateStr);
                  return (
                    <button key={dNum} onClick={() => toggleDate(dateStr)} className={`h-8 w-8 mx-auto rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center ${isSel ? 'bg-brand-primary text-white shadow-md' : 'hover:bg-slate-100 text-slate-700'}`}>{dNum}</button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-5 flex flex-col justify-between border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-5">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-2">Ish vaqti (24-soat)</span>
                <div className="flex p-1 bg-slate-100 rounded-xl mb-4">
                  <button onClick={() => setTimeTab('start')} className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg ${timeTab === 'start' ? 'bg-white text-brand-primary shadow-xs' : 'text-slate-500'}`}>Boshlanish ({String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')})</button>
                  <button onClick={() => setTimeTab('end')} className={`flex-1 py-1.5 text-xs font-extrabold rounded-lg ${timeTab === 'end' ? 'bg-white text-brand-primary shadow-xs' : 'text-slate-500'}`}>Tugash ({String(endHour).padStart(2, '0')}:{String(endMin).padStart(2, '0')})</button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <button onClick={incHour} className="w-full py-1 bg-slate-100 hover:bg-slate-200 rounded-lg flex justify-center cursor-pointer"><ChevronUp size={16} /></button>
                    <div className="w-full py-2.5 bg-slate-50 border rounded-xl font-black text-lg text-slate-800">{String(curHour).padStart(2, '0')}</div>
                    <button onClick={decHour} className="w-full py-1 bg-slate-100 hover:bg-slate-200 rounded-lg flex justify-center cursor-pointer"><ChevronDown size={16} /></button>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <button onClick={incMin} className="w-full py-1 bg-slate-100 hover:bg-slate-200 rounded-lg flex justify-center cursor-pointer"><ChevronUp size={16} /></button>
                    <div className="w-full py-2.5 bg-slate-50 border rounded-xl font-black text-lg text-slate-800">{String(curMin).padStart(2, '0')}</div>
                    <button onClick={decMin} className="w-full py-1 bg-slate-100 hover:bg-slate-200 rounded-lg flex justify-center cursor-pointer"><ChevronDown size={16} /></button>
                  </div>
                </div>
              </div>

              <button onClick={handleDone} className="mt-6 md:mt-5 w-full py-3.5 bg-brand-primary hover:bg-brand-primary/95 text-white font-black text-xs rounded-2xl shadow-md cursor-pointer shrink-0">Saqlash</button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
