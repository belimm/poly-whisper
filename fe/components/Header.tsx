/* eslint-disable react/jsx-no-comment-textnodes */
'use client';

import WalletConnectButton from './WalletConnectButton';

interface HeaderProps {
   isConnected?: boolean;
}

export default function Header({ isConnected = false }: HeaderProps) {
   return (
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#e5e7eb] dark:border-border-dark bg-white dark:bg-surface-dark px-6 py-3 shrink-0 z-20">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 text-[#111418] dark:text-white group">
               <div className="size-8 flex items-center justify-center text-primary group-hover:text-white transition-colors duration-700">
                  <span className="material-symbols-outlined text-3xl">
                     graphic_eq
                  </span>
               </div>
               <a href="/">
                  <h2 className="text-lg font-bold leading-tight tracking-[-0.015em] hidden sm:block cursor-pointer text-color-sweep">
                     WHISPER{' '}
                     <span className="text-gray-400 font-normal mx-2">//</span>{' '}
                     POLYMARKET INTELLIGENCE
                  </h2>
               </a>
            </div>
            <label className="hidden md:flex flex-col min-w-40 !h-9 max-w-64">
               <div className="flex w-full flex-1 items-stretch rounded-lg h-full border border-[#e5e7eb] dark:border-border-dark bg-gray-50 dark:bg-[#101922] overflow-hidden">
                  <div className="text-[#617589] flex items-center justify-center pl-3">
                     <span className="material-symbols-outlined text-[20px]">
                        search
                     </span>
                  </div>
                  <input
                     className="flex w-full min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-[#111418] dark:text-white focus:outline-0 border-none h-full placeholder:text-[#617589] px-3 text-sm font-normal leading-normal"
                     placeholder="Search markets, users..."
                  />
               </div>
            </label>
         </div>
         <div className="flex flex-1 justify-end gap-6">
            <div className="flex items-center gap-2 mr-4">
               <div
                  className={`size-2 rounded-full transition-colors ${
                     isConnected ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
               <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                  {isConnected ? 'Live' : 'Disconnected'}
               </span>
            </div>
            <div className="hidden lg:flex items-center gap-6">
               <a
                  className="text-[#111418] dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal transition-colors"
                  href="#">
                  Dashboard
               </a>
               {/* <a
                  className="text-[#111418] dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal transition-colors"
                  href="#">
                  Alerts
               </a> */}
               <a
                  className="text-[#111418] dark:text-gray-300 hover:text-primary dark:hover:text-primary text-sm font-medium leading-normal transition-colors"
                  href="#">
                  Settings
               </a>
            </div>
            <div className="flex items-center gap-3">
               <WalletConnectButton />
            </div>
         </div>
      </header>
   );
}

