'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function WalletConnectButton() {
   // Custom handler that you can extend
   const handleConnectClick = (openConnectModal: () => void) => {
      // Add any custom logic here before opening the modal
      console.log('Opening wallet connection modal...');

      // You can add analytics, logging, or any other custom behavior
      // For example:
      // trackEvent('wallet_connect_clicked');
      // checkUserEligibility();

      // Then open the modal
      openConnectModal();
   };

   return (
      <ConnectButton.Custom>
         {({
            account,
            chain,
            openAccountModal,
            openChainModal,
            openConnectModal,
            authenticationStatus,
            mounted,
         }) => {
            const ready = mounted && authenticationStatus !== 'loading';
            const connected =
               ready &&
               account &&
               chain &&
               (!authenticationStatus ||
                  authenticationStatus === 'authenticated');

            return (
               <div
                  {...(!ready && {
                     'aria-hidden': true,
                     'style': {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                     },
                  })}
               >
                  {(() => {
                     if (!connected) {
                        return (
                           <button
                              onClick={() => handleConnectClick(openConnectModal)}
                              className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary hover:bg-blue-600 text-white text-sm font-bold leading-normal tracking-[0.015em] transition-colors"
                           >
                              <span className="truncate">Connect Wallet</span>
                           </button>
                        );
                     }

                     if (chain.unsupported) {
                        return (
                           <button
                              onClick={openChainModal}
                              className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-red-500 hover:bg-red-600 text-white text-sm font-bold leading-normal tracking-[0.015em] transition-colors"
                           >
                              Wrong network
                           </button>
                        );
                     }

                     return (
                        <div className="flex gap-3">
                           <button
                              onClick={openChainModal}
                              className="flex items-center gap-2 h-9 px-3 rounded-lg bg-gray-100 dark:bg-[#1a1f2e] hover:bg-gray-200 dark:hover:bg-[#252b3d] transition-colors"
                           >
                              {chain.hasIcon && (
                                 <div
                                    style={{
                                       background: chain.iconBackground,
                                       width: 20,
                                       height: 20,
                                       borderRadius: 999,
                                       overflow: 'hidden',
                                    }}
                                 >
                                    {chain.iconUrl && (
                                       <img
                                          alt={chain.name ?? 'Chain icon'}
                                          src={chain.iconUrl}
                                          style={{ width: 20, height: 20 }}
                                       />
                                    )}
                                 </div>
                              )}
                              <span className="text-sm font-medium text-[#111418] dark:text-white">
                                 {chain.name}
                              </span>
                           </button>

                           <button
                              onClick={openAccountModal}
                              className="flex items-center gap-2 h-9 px-3 rounded-lg bg-primary hover:bg-blue-600 text-white transition-colors"
                           >
                              <span className="text-sm font-bold">
                                 {account.displayName}
                              </span>
                              {account.displayBalance && (
                                 <span className="text-xs opacity-80">
                                    {account.displayBalance}
                                 </span>
                              )}
                           </button>
                        </div>
                     );
                  })()}
               </div>
            );
         }}
      </ConnectButton.Custom>
   );
}
