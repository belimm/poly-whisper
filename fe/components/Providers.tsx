'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

import { config } from '../wagmi';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
   return (
      <WagmiProvider config={config}>
         <QueryClientProvider client={queryClient}>
            <RainbowKitProvider
               modalSize="compact"
               theme={darkTheme({
                  accentColor: '#3b82f6',
                  accentColorForeground: 'white',
                  borderRadius: 'medium',
                  fontStack: 'system',
                  overlayBlur: 'small',
               })}
               appInfo={{
                  appName: 'Whisper',
                  learnMoreUrl: 'https://yourdomain.com/learn',
               }}>
               {children}
            </RainbowKitProvider>
         </QueryClientProvider>
      </WagmiProvider>
   );
}
