import React, { useState } from 'react';
import './invoice-card.css';

export interface InvoiceCardProps {
  invoiceNumber?: string;
  amount?: number | string;
  company?: string;
  jobTitle?: string;
  date?: string;
  status?: 'pending' | 'invoiced' | 'paid' | 'payment_declared';
  loop?: boolean;
  className?: string;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoiceNumber = 'INV-2026-4471',
  amount = '250 000',
  company = 'Baito Logistics',
  jobTitle = 'Kuryerlik xizmati',
  date = '27/08/2026',
  status = 'invoiced',
  loop = false,
  className = '',
}) => {
  const [flipped, setFlipped] = useState(false);

  const formattedAmount =
    typeof amount === 'number'
      ? amount.toLocaleString('ru-RU').replace(/\s/g, "'")
      : String(amount).replace(/\s/g, "'");

  const dateChars = date.split('');

  return (
    <div className={`invoice-card-root ${className}`}>
      <div>
        {/* Yuqori dispenser kapsulasi (aylanuvchi rangli neon nur) */}
        <div className="invoice-output">
          <div className="wrap-colors-1"><div className="bg-colors" /></div>
          <div className="wrap-colors-2"><div className="bg-colors" /></div>
          <div className="cover" />
        </div>

        {/* 3D Holat maydoni */}
        <div className="invoice-area">
          <div className="invoice-ticket-mask">
            <div
              onClick={() => setFlipped(!flipped)}
              title="Aylantirish uchun bosing"
              className={`invoice-ticket ${loop ? 'is-looping' : 'is-static'} ${
                flipped ? 'is-flipped' : ''
              }`}
            >
              <div className="invoice-ticket-flip-container">
                <div className="invoice-float">
                  {/* OLD TOMONI (FRONT) */}
                  <div className="invoice-front">
                    <div className="invoice-ticket-body">
                      <div className="invoice-reflex" />

                      {/* 3D Wireframe Kubik SVG */}
                      <svg
                        className="invoice-icon-cube"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          style={{ ['--i' as any]: 1 }}
                          className="path-center"
                          d="M12 12.75L14.25 11.437M12 12.75L9.75 11.437M12 12.75V15"
                          stroke="black"
                          strokeWidth={1}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          style={{ ['--i' as any]: 2 }}
                          className="path-t"
                          d="M9.75 3.562L12 2.25L14.25 3.563"
                          stroke="black"
                          strokeWidth={1}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          style={{ ['--i' as any]: 3 }}
                          className="path-tr"
                          d="M21 7.5L18.75 6.187M21 7.5V9.75M21 7.5L18.75 8.813"
                          stroke="black"
                          strokeWidth={1}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          style={{ ['--i' as any]: 4 }}
                          className="path-br"
                          d="M21 14.25V16.5L18.75 17.813"
                          stroke="black"
                          strokeWidth={1}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          style={{ ['--i' as any]: 5 }}
                          className="path-b"
                          d="M12 21.75L14.25 20.437M12 21.75V19.5M12 21.75L9.75 20.437"
                          stroke="black"
                          strokeWidth={1}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          style={{ ['--i' as any]: 6 }}
                          className="path-bl"
                          d="M5.25 17.813L3 16.5V14.25"
                          stroke="black"
                          strokeWidth={1}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          style={{ ['--i' as any]: 7 }}
                          className="path-tl"
                          d="M3 7.5L5.25 6.187M3 7.5L5.25 8.813M3 7.5V9.75"
                          stroke="black"
                          strokeWidth={1}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>

                      {/* Header */}
                      <header>
                        <div className="ticket-name">
                          <div>
                            <span style={{ ['--i' as any]: 1 }}>B</span>
                            <span style={{ ['--i' as any]: 2 }}>A</span>
                            <span style={{ ['--i' as any]: 3 }}>I</span>
                            <span style={{ ['--i' as any]: 4 }}>T</span>
                            <span style={{ ['--i' as any]: 5 }}>O</span>
                          </div>
                          <div>
                            <span className="bold" style={{ ['--i' as any]: 6 }}>P</span>
                            <span className="bold" style={{ ['--i' as any]: 7 }}>A</span>
                            <span className="bold" style={{ ['--i' as any]: 8 }}>S</span>
                            <span className="bold" style={{ ['--i' as any]: 9 }}>S</span>
                          </div>
                        </div>
                        <div className="invoice-barcode" />
                      </header>

                      {/* Contents */}
                      <div className="contents">
                        <div className="flex flex-col items-start w-full z-10 -mt-4 text-left">
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                            Hisob-faktura
                          </span>
                          <span className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                            {formattedAmount} <span className="text-xs font-bold text-slate-600">UZS</span>
                          </span>

                          <div className="mt-3 text-xs text-slate-700 max-w-[200px] truncate">
                            <p className="font-semibold text-slate-900 truncate">{jobTitle}</p>
                            <p className="text-[11px] text-slate-500 truncate">{company}</p>
                          </div>

                          <div className="mt-4 flex items-center gap-2">
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-900 text-white">
                              {status === 'paid' ? "TO'LANGAN" : "KUTILMOQDA"}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              #{invoiceNumber.replace('INV-', '')}
                            </span>
                          </div>
                        </div>

                        {/* Kichik QR Kod */}
                        <div className="invoice-qrcode">
                          <svg className="w-14 h-14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h4v4h-4v-4zm-4 4h4v4h-4v-4zm4 4h4v4h-4v-4zm-4-8h4v4h-4v-4z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ORQA TOMONI (BACK) */}
                  <div className="invoice-back">
                    <div className="invoice-ticket-body">
                      <div className="invoice-reflex" />
                      <header>
                        <div className="ticket-name">
                          <div>
                            <span style={{ ['--i' as any]: 1 }}>B</span>
                            <span style={{ ['--i' as any]: 2 }}>A</span>
                            <span style={{ ['--i' as any]: 3 }}>I</span>
                            <span style={{ ['--i' as any]: 4 }}>T</span>
                            <span style={{ ['--i' as any]: 5 }}>O</span>
                          </div>
                          <b>
                            <span className="bold" style={{ ['--i' as any]: 6 }}>C</span>
                            <span className="bold" style={{ ['--i' as any]: 7 }}>H</span>
                            <span className="bold" style={{ ['--i' as any]: 8 }}>E</span>
                            <span className="bold" style={{ ['--i' as any]: 9 }}>K</span>
                          </b>
                        </div>
                        <time>
                          {dateChars.map((ch, idx) => (
                            <span
                              key={idx}
                              style={{ ['--i' as any]: 10 + idx }}
                              className={ch === '/' ? 'slash' : 'bold'}
                            >
                              {ch}
                            </span>
                          ))}
                        </time>
                      </header>

                      <div className="contents flex-col justify-between py-4">
                        <div className="w-full text-left space-y-1.5 px-2">
                          <div className="flex justify-between text-xs border-b border-slate-200/60 pb-1">
                            <span className="text-slate-500">Invoys raqami:</span>
                            <span className="font-mono font-bold text-slate-800">#{invoiceNumber.replace(/^INV-/, '')}</span>
                          </div>
                          <div className="flex justify-between text-xs border-b border-slate-200/60 pb-1">
                            <span className="text-slate-500">Holat:</span>
                            <span className="font-bold text-emerald-600">Tasdiqlangan</span>
                          </div>
                          <div className="flex justify-between text-xs pb-1">
                            <span className="text-slate-500">To'lov:</span>
                            <span className="font-bold text-slate-800">Bank o'tkazmasi</span>
                          </div>
                        </div>

                        {/* Katta animatsiyali QR kod */}
                        <div className="invoice-qrcode mt-2">
                          <svg className="w-24 h-24 text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h4v4h-4v-4zm-4 4h4v4h-4v-4zm4 4h4v4h-4v-4zm-4-8h4v4h-4v-4z" />
                          </svg>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">
                          To'lovni tekshirish uchun QR kodni skanerlang
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Noise overlay */}
        <div className="invoice-noise">
          <svg height="100%" width="100%">
            <defs>
              <pattern height={500} width={500} patternUnits="userSpaceOnUse" id="invoice-noise-pattern">
                <filter y={0} x={0} id="invoice-noise-filter">
                  <feTurbulence stitchTiles="stitch" numOctaves={3} baseFrequency="0.65" type="fractalNoise" />
                  <feBlend mode="screen" />
                </filter>
                <rect filter="url(#invoice-noise-filter)" height={500} width={500} />
              </pattern>
            </defs>
            <rect fill="url(#invoice-noise-pattern)" height="100%" width="100%" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default InvoiceCard;
