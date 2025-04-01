import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sledovač cien',
  description: 'Sledujte ceny produktov na internete',
  icons: {
    icon: '/euro_icon.ico'
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <head>
        <link rel="icon" href="/euro_icon.ico" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
