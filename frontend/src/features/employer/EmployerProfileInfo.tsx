import React from 'react';
import { Building2, Phone, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

interface EmployerProfileInfoProps {
  companyName: string;
  phone: string;
  language: 'uz' | 'ru' | 'en';
}

export const EmployerProfileInfo: React.FC<EmployerProfileInfoProps> = ({
  companyName,
  phone,
  language,
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden"
    >
      <div className="p-4 sm:p-5 border-b border-slate-50 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
          <Building2 size={18} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            {language === 'uz' ? "Tashkilot nomi" : language === 'ru' ? "Название организации" : "Organization name"}
          </p>
          <p className="text-sm font-black text-slate-800">{companyName} MChJ</p>
        </div>
      </div>

      <div className="p-4 sm:p-5 border-b border-slate-50 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
          <Phone size={18} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            {language === 'uz' ? "Telefon raqam" : language === 'ru' ? "Номер телефона" : "Phone number"}
          </p>
          <p className="text-sm font-black text-slate-800">{phone}</p>
        </div>
      </div>

      <div className="p-4 sm:p-5 border-b border-slate-50 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
          <MapPin size={18} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
            {language === 'uz' ? "Manzil" : language === 'ru' ? "Адрес" : "Address"}
          </p>
          <p className="text-sm font-black text-slate-800">Toshkent sh., Yunusobod t., 14-kvartal</p>
        </div>
      </div>
    </motion.div>
  );
};
