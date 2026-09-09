import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Inter } from 'next/font/google';
import { UserPresence } from '@/components/UserPresence';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });


export const metadata: Metadata = {
  title: 'grow money',
  description: 'Secure authentication for your applications.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <head>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      </head>
      <body className={`${inter.variable} font-body antialiased h-full bg-background`}>
        <FirebaseClientProvider>
          <UserPresence />
          {children}
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}