'use client';

import { ReactNode, useState } from 'react';

interface MobileSectionProps {
   title: string;
   icon: string;
   iconColor?: string;
   children: ReactNode;
   defaultOpen?: boolean;
   statusBadge?: ReactNode;
}

export default function MobileSection({
   title,
   icon,
   iconColor = 'text-primary',
   children,
   defaultOpen = true,
   statusBadge,
}: MobileSectionProps) {
   const [isOpen, setIsOpen] = useState(defaultOpen);

   return (
      <div className="flex flex-col bg-background-light dark:bg-background-dark border-b border-[#e5e7eb] dark:border-border-dark md:border-0">
         {/* Header - Always visible, clickable on mobile */}
         <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center justify-between px-4 py-3 bg-white dark:bg-surface-dark border-b border-[#e5e7eb] dark:border-border-dark md:cursor-default active:bg-gray-50 dark:active:bg-white/5 transition-colors md:active:bg-transparent">
            <div className="flex items-center gap-2">
               <span className={`material-symbols-outlined ${iconColor} text-[20px]`}>
                  {icon}
               </span>
               <h3 className="text-sm font-bold tracking-wider uppercase text-[#111418] dark:text-gray-100">
                  {title}
               </h3>
            </div>
            <div className="flex items-center gap-2">
               {statusBadge}
               <span className="material-symbols-outlined text-gray-400 text-[20px] md:hidden transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  expand_more
               </span>
            </div>
         </button>

         {/* Content - Collapsible on mobile, always visible on desktop */}
         <div
            className={`md:flex md:flex-col md:flex-1 md:overflow-y-auto ${
               isOpen ? 'block' : 'hidden md:block'
            }`}>
            {children}
         </div>
      </div>
   );
}

