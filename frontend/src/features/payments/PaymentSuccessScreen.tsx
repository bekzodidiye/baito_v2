import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, Download, LayoutDashboard, Check } from 'lucide-react';
import { motion } from 'motion/react';

export const PaymentSuccessScreen: React.FC = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('#TRX-992841');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col items-center overflow-x-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/20 h-16 transition-all duration-300">
        <div className="flex items-center h-full px-5 w-full max-w-md mx-auto">
          <button 
            onClick={() => navigate(-1)}
            aria-label="Orqaga" 
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-surface-container transition-all duration-300 active:scale-95"
          >
            <ArrowLeft className="w-6 h-6 text-primary" />
          </button>
          <h1 className="ml-4 font-headline text-headline-md font-semibold text-on-surface">To'lov ma'lumoti</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-md px-5 pt-24 pb-8 flex-grow flex flex-col">
        {/* Main Receipt Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-surface-container-lowest rounded-2xl shadow-[0px_4px_20px_rgba(26,35,126,0.04)] border border-outline-variant/30 overflow-hidden mb-8"
        >
          {/* Success Header Section */}
          <div className="pt-12 pb-8 flex flex-col items-center text-center px-6">
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full bg-[#4CAF50]/10 flex items-center justify-center mb-4"
            >
              <CheckCircle2 className="w-12 h-12 text-[#4CAF50]" />
            </motion.div>
            <h2 className="text-headline-md font-bold text-on-surface mb-1">To'lov muvaffaqiyatli yakunlandi</h2>
            <p className="text-body-md text-on-surface-variant max-w-[240px]">Tranzaksiya muvaffaqiyatli amalga oshirildi va tizimda qayd etildi</p>
          </div>

          {/* Amount Section */}
          <div className="py-6 px-6 text-center bg-surface-container-low/50">
            <p className="text-label-lg text-outline uppercase tracking-widest font-bold mb-1">To'lov miqdori</p>
            <p className="text-display font-extrabold text-primary">2,450,000 UZS</p>
          </div>

          <div className="relative h-6 flex items-center">
            <div className="absolute left-[-12px] w-6 h-6 rounded-full bg-surface"></div>
            <div className="flex-grow border-t-2 border-dashed border-outline-variant/40 mx-4"></div>
            <div className="absolute right-[-12px] w-6 h-6 rounded-full bg-surface"></div>
            <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-outline-variant/40"></div>
          </div>

          {/* Transaction Details */}
          <div className="px-6 py-6 space-y-5">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex justify-between items-center">
              <span className="text-body-md text-on-surface-variant font-medium">Status</span>
              <span className="px-3 py-1 rounded-full bg-[#4CAF50]/10 text-[#4CAF50] text-label-lg font-bold">Muvaffaqiyatli</span>
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex justify-between items-center">
              <span className="text-body-md text-on-surface-variant font-medium">Sana va vaqt</span>
              <span className="text-body-md text-on-surface font-semibold">24 May, 2024 • 14:28</span>
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-between items-center">
              <span className="text-body-md text-on-surface-variant font-medium">Tranzaksiya ID</span>
              <div className="flex items-center gap-1">
                <span className="text-body-md text-on-surface font-semibold">#TRX-992841</span>
                <button 
                  onClick={handleCopy}
                  className={`flex items-center justify-center w-7 h-7 rounded-md active:scale-90 transition-all ${copied ? 'bg-green-50 text-green-600' : 'text-primary'}`}
                >
                  {copied ? <Check className="w-[18px] h-[18px]" /> : <Copy className="w-[18px] h-[18px]" />}
                </button>
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="h-[1px] bg-outline-variant/30 w-full"></motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="flex justify-between items-center">
              <span className="text-body-md text-on-surface-variant font-medium">To'lov usuli</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-5 rounded-sm bg-primary-container flex items-center justify-center p-0.5">
                  <img className="h-full object-contain" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKcAD2juASiLrRvrJ5kiBOHsxblma3Oks1DJViNBvP4wL5X9j2hayuYE6UqdaTg73rviQdTWwmcy9_fw8f_0tAzo8Qt-p26yXEV6hJe5InweG-jXf1b8d-C5AlL88hYJlZ8kG-WUQrUFBESaX1kOy-DFJVQlBdrq7rhLO87FFAZbHj-qgq9dPVGZ_mnuTPTpDfHgHbf50xxnQ1UF5rzfQ64hIFeNFfAlglurG3fTkGI5VSMEoMjYuA" alt="Card" />
                </div>
                <span className="text-body-md text-on-surface font-semibold">8600 **** 2210</span>
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex justify-between items-center">
              <span className="text-body-md text-on-surface-variant font-medium">Qabul qiluvchi</span>
              <span className="text-body-md text-on-surface font-semibold text-right">OOO "Global Tech"</span>
            </motion.div>
          </div>

          {/* Bottom Support Text */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="px-6 pb-6 text-center">
            <p className="text-label-md text-outline">Qo'llab-quvvatlash xizmati bilan bog'lanish uchun: <span className="text-primary font-bold">1155</span></p>
          </motion.div>
        </motion.div>

        {/* Action Buttons Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          className="mt-auto space-y-4"
        >
          <button className="w-full h-14 bg-primary text-on-primary rounded-xl font-headline text-title-md font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform">
            <Download className="w-6 h-6" />
            Kvitansiyani yuklab olish
          </button>
          <button 
            onClick={() => navigate('/')}
            className="w-full h-14 bg-transparent border-2 border-primary/20 text-primary rounded-xl font-headline text-title-md font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <LayoutDashboard className="w-6 h-6" />
            Dashboardga qaytish
          </button>
        </motion.div>
      </main>
      <div className="h-8 w-full"></div>
    </div>
  );
};
