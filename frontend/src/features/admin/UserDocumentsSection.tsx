import React, { useState } from 'react';
import { Shield, Eye, X, FileBadge, ShieldAlert, Check, Copy } from 'lucide-react';
import { ADMIN_TEXTS } from './admin.i18n';
import { useAuthStore } from '../../store/useAuthStore';
import { AdminUser } from './types';

interface UserDocumentsSectionProps {
  user: AdminUser;
}

export const UserDocumentsSection: React.FC<UserDocumentsSectionProps> = ({ user }) => {
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [copiedPinfl, setCopiedPinfl] = useState(false);
  const language = useAuthStore(st => st.language);
  const a = ADMIN_TEXTS[language] || ADMIN_TEXTS.uz;

  const docs = [
    { title: a.passportFront, src: user.passportDocFront },
    { title: a.passportBack, src: user.passportDocBack },
    { title: a.selfieWithPassport, src: user.selfieWithDoc },
  ];

  const hasAnyDoc = Boolean(user.passportDocFront || user.passportDocBack || user.selfieWithDoc);

  const copyPinfl = () => {
    if (!user.passportJshshir) return;
    navigator.clipboard?.writeText(user.passportJshshir);
    setCopiedPinfl(true);
    setTimeout(() => setCopiedPinfl(false), 1800);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
      <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 gap-3">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary border border-brand-primary/20 flex items-center justify-center">
            <FileBadge size={13} />
          </div>
          {a.passportAndIdDocs}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-xl border border-slate-200/80 flex items-center gap-1.5 shadow-2xs">
            <span className="text-slate-400 font-semibold">JSHSHIR:</span>
            <strong className="text-slate-900 font-mono tracking-wider">{user.passportJshshir || a.notEntered}</strong>
            {user.passportJshshir && (
              <button
                type="button"
                onClick={copyPinfl}
                className="text-slate-400 hover:text-brand-primary transition-colors p-0.5 cursor-pointer ml-0.5"
                title="JSHSHIR nusxalash"
              >
                {copiedPinfl ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
              </button>
            )}
          </span>
        </div>
      </div>

      {!hasAnyDoc ? (
        <div className="p-4 sm:p-5 flex items-center gap-3.5 bg-slate-50/40 text-slate-500">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldAlert size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-xs font-bold text-slate-800 block">Hujjatlar yuklanmagan</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">Pasport yoki ID karta fotosuratlari hali taqdim etilmagan</span>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-xl bg-slate-100 text-slate-500 border border-slate-200/80 shrink-0">
            {a.notUploaded}
          </span>
        </div>
      ) : (
        <div className="p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {docs.map((doc, idx) => (
            <div key={idx} className="space-y-1.5">
              <div
                onClick={() => doc.src && setActiveImage(doc.src)}
                className={`group relative bg-slate-50 rounded-2xl overflow-hidden aspect-[4/3] border border-slate-200/80 transition-all ${
                  doc.src ? 'cursor-pointer hover:shadow-md hover:border-brand-primary/40' : 'cursor-default'
                }`}
              >
                {doc.src ? (
                  <img
                    src={doc.src}
                    alt={doc.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
                      if (target.src !== fallback) {
                        target.src = fallback;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 bg-slate-100/50">
                    <Shield size={20} className="text-slate-300" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{a.notUploaded}</span>
                  </div>
                )}
                {doc.src && (
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 backdrop-blur-2xs">
                    <div className="w-9 h-9 bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center text-white shadow-xs">
                      <Eye size={18} />
                    </div>
                  </div>
                )}
              </div>
              <div className="text-center">
                <span className="text-[11px] font-bold text-slate-600 block truncate">{doc.title}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeImage && (
        <div
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
        >
          <div className="relative max-w-3xl w-full max-h-[85vh] bg-transparent rounded-2xl flex flex-col items-center">
            <button
              onClick={() => setActiveImage(null)}
              className="absolute -top-12 right-0 p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-full cursor-pointer transition-colors backdrop-blur-md"
              title="Yopish"
            >
              <X size={20} />
            </button>
            <img
              src={activeImage}
              alt=""
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/20"
              onError={(e) => {
                const target = e.currentTarget;
                const fallback = 'https://ui-avatars.com/api/?name=U&background=F1F5F9&color=94A3B8&size=150';
                if (target.src !== fallback) {
                  target.src = fallback;
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
