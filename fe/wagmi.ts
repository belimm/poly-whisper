import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
   metaMaskWallet,
   phantomWallet,
   rainbowWallet,
   walletConnectWallet,
   
} from '@rainbow-me/rainbowkit/wallets';
import { polygon, polygonAmoy } from 'wagmi/chains';

export const config = getDefaultConfig({
   appName: 'Whisper // Polymarket Intelligence',
   projectId:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
   chains: [polygon, polygonAmoy],
   wallets: [
      {
         groupName: 'Recommended',
         wallets: [walletConnectWallet],
      },
   ],
   ssr: true,
});
