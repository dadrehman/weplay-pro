import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WePlay-Pro | Superadmin Management Portal',
  description: 'Enterprise moderation and economy dashboard for WePlay Party Game Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-darkBg text-gray-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
