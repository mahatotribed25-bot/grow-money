import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Inter } from 'next/font/google';
import { UserPresence } from '@/components/UserPresence';
import { SettingsProvider } from '@/context/settings-context';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Grow Money',
  description: 'Elite Investment & Loan Ledger Node',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} font-body antialiased h-full`}>
        <FirebaseClientProvider>
          <SettingsProvider>
            <UserPresence />
            {children}
            <Toaster />
          </SettingsProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
