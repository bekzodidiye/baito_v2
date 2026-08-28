import React from 'react';
import { X, Camera, Check, Loader2, Plus, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CustomSelect } from '../../../components/login/CustomSelect';
import { uploadFileApi } from '../../../api/queries';

const MONTHS: Record<string, string[]> = {
  uz: ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'],
  ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};

interface ProfileDialogsProps {
  activeDialog: 'withdraw' | 'edit' | 'none';
  setActiveDialog: (dialog: 'withdraw' | 'edit' | 'none') => void;
  t: any;
  language: string;
  withdrawAmount: string;
  setWithdrawAmount: (amount: string) => void;
  withdrawSuccess: boolean;
  handleWithdrawSubmit: (e: React.FormEvent) => void;
  editForm: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    birthDay: string;
    birthMonth: string;
    birthYear: string;
    gender: string;
    region: string;
    profession: string;
    aboutMe: string;
    skills: string;
    passportSeries: string;
    passportNumber: string;
    pinfl: string;
    docFileName1: string;
    docFileName2: string;
    profileImage: string | null;
  };
  setEditForm: React.Dispatch<React.SetStateAction<any>>;
  handleSaveProfileSubmit: (e: React.FormEvent) => void;
  isEditing: boolean;
}

export const ProfileDialogs: React.FC<ProfileDialogsProps> = ({
  activeDialog,
  setActiveDialog,
  t,
  language,
  withdrawAmount,
  setWithdrawAmount,
  withdrawSuccess,
  handleWithdrawSubmit,
  editForm,
  setEditForm,
  handleSaveProfileSubmit,
  isEditing,
}) => {
  return (
    <AnimatePresence>
      {activeDialog !== 'none' && (
        <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveDialog('none')}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
          />

          {/* Content box */}
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white w-full max-w-md rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden relative z-10 flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-100 shrink-0">
              <h3 className="font-display font-black text-slate-800 text-base">
                {t.editProfile || "Profilni tahrirlash"}
              </h3>
              <button 
                onClick={() => setActiveDialog('none')}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {activeDialog === 'edit' && (
                <form id="editProfileForm" onSubmit={handleSaveProfileSubmit} className="space-y-5">
                  
                  <div className="flex flex-col items-center justify-center mb-6">
                    <div className="w-[88px] h-[88px] rounded-full border border-dashed border-slate-300 hover:border-brand-primary/40 flex items-center justify-center relative bg-white cursor-pointer transition-all active:scale-95 group shadow-3xs">
                      <input 
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 rounded-full"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Instant local preview
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setEditForm((prev: any) => ({ ...prev, profileImage: event.target?.result as string }));
                              }
                            };
                            reader.readAsDataURL(file);

                            // Upload to MinIO S3
                            try {
                              const uploadedUrl = await uploadFileApi(file);
                              setEditForm((prev: any) => ({ ...prev, profileImage: uploadedUrl }));
                            } catch (err) {
                              console.error('Avatar upload to MinIO failed:', err);
                            }
                          }
                        }}
                        disabled={isEditing}
                      />
                      {editForm.profileImage ? (
                        <img src={editForm.profileImage} alt="Avatar Preview" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <Camera size={30} className="text-slate-400 group-hover:text-brand-primary transition-colors stroke-[2.2]" />
                      )}
                      <div className="absolute bottom-0 right-0 bg-brand-primary text-white w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-xs z-20 pointer-events-none">
                        <Plus size={12} className="stroke-[3]" />
                      </div>
                    </div>
                    <p className="mt-2 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">PROFIL RASM (IXTIYORIY)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">Ism *</label>
                      <input 
                        id="input-firstName"
                        type="text"
                        required
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({...editForm, firstName: e.target.value})}
                        disabled={isEditing}
                        className="w-full bg-white border border-slate-200/80 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">Familiya *</label>
                      <input 
                        id="input-lastName"
                        type="text"
                        required
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({...editForm, lastName: e.target.value})}
                        disabled={isEditing}
                        className="w-full bg-white border border-slate-200/80 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">Tug'ilgan sana *</label>
                    <div className="grid grid-cols-3 gap-2">
                      <CustomSelect 
                        value={editForm.birthDay} 
                        onChange={(val) => setEditForm({...editForm, birthDay: val})} 
                        placeholder="Kun" 
                        options={Array.from({ length: 31 }, (_, i) => i + 1).map(d => ({ value: String(d), label: String(d) }))} 
                      />
                      <CustomSelect 
                        value={editForm.birthMonth} 
                        onChange={(val) => setEditForm({...editForm, birthMonth: val})} 
                        placeholder="Oy" 
                        options={(MONTHS[language as 'uz' | 'ru' | 'en'] || MONTHS.uz).map((m, idx) => ({ value: String(idx + 1), label: m }))} 
                      />
                      <CustomSelect 
                        value={editForm.birthYear} 
                        onChange={(val) => setEditForm({...editForm, birthYear: val})} 
                        placeholder="Yil" 
                        options={Array.from({ length: 55 }, (_, i) => 2012 - i).map(y => ({ value: String(y), label: String(y) }))} 
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">Jinsi *</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        type="button" 
                        onClick={() => setEditForm({...editForm, gender: 'male'})} 
                        className={`flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl border font-bold text-xs cursor-pointer ${editForm.gender === 'male' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-slate-200 bg-white text-slate-600'}`}
                      >
                        <span>👨🏻</span><span>Erkak</span>
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setEditForm({...editForm, gender: 'female'})} 
                        className={`flex items-center justify-center gap-2 py-2.5 px-3.5 rounded-xl border font-bold text-xs cursor-pointer ${editForm.gender === 'female' ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-slate-200 bg-white text-slate-600'}`}
                      >
                        <span>👩🏻</span><span>Ayol</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">Telefon *</label>
                      <input 
                        id="input-phone"
                        type="tel"
                        required
                        value={editForm.phone}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                        disabled={isEditing}
                        className="w-full bg-white border border-slate-200/80 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">Email (Ixtiyoriy)</label>
                      <input 
                        id="input-email"
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                        disabled={isEditing}
                        className="w-full bg-white border border-slate-200/80 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">Manzil (Viloyat) *</label>
                      <input 
                        id="input-region"
                        type="text"
                        required
                        value={editForm.region}
                        onChange={(e) => setEditForm({...editForm, region: e.target.value})}
                        disabled={isEditing}
                        className="w-full bg-white border border-slate-200/80 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">Kasb (Mutaxassislik) *</label>
                      <input 
                        id="input-profession"
                        type="text"
                        required
                        value={editForm.profession}
                        onChange={(e) => setEditForm({...editForm, profession: e.target.value})}
                        disabled={isEditing}
                        className="w-full bg-white border border-slate-200/80 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">O'zim haqimda *</label>
                    <textarea 
                      id="input-aboutMe"
                      required
                      value={editForm.aboutMe}
                      onChange={(e) => setEditForm({...editForm, aboutMe: e.target.value})}
                      disabled={isEditing}
                      rows={3}
                      className="w-full bg-white border border-slate-200/80 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800 resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 px-1 uppercase tracking-wider block">Ko'nikmalar (vergul bilan) *</label>
                    <input 
                      id="input-skills"
                      type="text"
                      required
                      value={editForm.skills}
                      onChange={(e) => setEditForm({...editForm, skills: e.target.value})}
                      disabled={isEditing}
                      placeholder="Masalan: Tezkor, Mas'uliyatli"
                      className="w-full bg-white border border-slate-200/80 focus:border-brand-primary rounded-xl py-2.5 px-3.5 text-xs font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 text-slate-800"
                    />
                  </div>



                </form>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-6 pt-4 border-t border-slate-100 bg-slate-50/50 shrink-0 rounded-b-[24px]">
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => !isEditing && setActiveDialog('none')}
                  disabled={isEditing}
                  className="flex-1 py-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-extrabold rounded-xl transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t.cancel || "Bekor qilish"}
                </button>
                <button 
                  type="submit"
                  form="editProfileForm"
                  disabled={isEditing}
                  className="flex-1 py-3.5 bg-brand-primary hover:bg-brand-primary/95 text-white text-xs font-extrabold rounded-xl transition-all shadow-md shadow-brand-primary/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isEditing ? (
                    <Loader2 size={16} className="animate-spin stroke-[2.5]" />
                  ) : (
                    <>
                      <span>{t.saveProfile || "Saqlash"}</span>
                      <Check size={16} className="stroke-[2.5]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
