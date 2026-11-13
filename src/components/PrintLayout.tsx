
'use client';

import React from 'react';
import { Icons } from './icons';
import config from '@/lib/config.json';

interface PrintLayoutProps {
  letterheadUrl: string;
  children: React.ReactNode;
}

export const PrintLayout = React.forwardRef<HTMLDivElement, PrintLayoutProps>(
  ({ letterheadUrl, children }, ref) => {
    const hasLetterhead = !!letterheadUrl;

    return (
      <div ref={ref} className="font-sans bg-white text-black">
         <div 
           className="w-[210mm] min-h-[297mm] mx-auto bg-no-repeat bg-top bg-contain flex flex-col" 
           style={hasLetterhead ? { backgroundImage: `url(${letterheadUrl})` } : {}}
         >
             {!hasLetterhead ? (
               /* Beautiful Stone Expert Header for plain paper */
               <div className="w-full px-8 pt-8 pb-6 border-b-2 flex items-center justify-between bg-white" style={{ borderColor: '#dfb96c' }}>
                 <div className="flex items-center gap-4">
                   <Icons.logo className="h-16 w-16 shrink-0 shadow-md rounded-xl p-1 bg-slate-900 border border-amber-500/30 object-contain" />
                   <div>
                     <h1 className="text-3xl font-black tracking-wider leading-none font-sans" style={{ color: '#dfb96c' }}>STONE EXPERT</h1>
                     <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">Imported & Local Marble & Granite</p>
                     <p className="text-[9px] uppercase tracking-wider text-slate-400 mt-0.5">Professional Team & Premium Polishing Services</p>
                   </div>
                 </div>
                 <div className="text-right text-[11px] text-slate-700 leading-normal font-medium">
                   <p className="font-bold text-slate-900">Contact / رابطہ:</p>
                   <p>Phone: {config.businessPhoneNumber || "+92 339 9991052"}</p>
                   <p>WhatsApp: +{config.businessWhatsAppNumber || "923399991052"}</p>
                   <p>Email: info@stoneexpert.com</p>
                 </div>
               </div>
             ) : null}

             <div className={hasLetterhead ? "pt-[14rem] px-8 pb-8 flex-1 flex flex-col" : "pt-6 px-8 pb-8 flex-1 flex flex-col"}>
                {children}
            </div>
         </div>
      </div>
    );
  }
);

PrintLayout.displayName = 'PrintLayout';
