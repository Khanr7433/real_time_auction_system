import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { ToastProvider } from '@/components/Toast';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ThemeProvider, ThemeScript } from '@/components/ui/theme-provider';

export const metadata: Metadata = {
  title: 'BidNow - Real-Time Online Auction System',
  description: 'Live bidding platform with real-time updates and countdown timers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-foreground transition-colors duration-200 relative isolate overflow-x-clip">
        {/* Ambient Top Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden"
        >
          <div className="h-[460px] w-[1000px] bg-[radial-gradient(ellipse_at_top,rgba(255,125,12,0.15),rgba(255,125,12,0.03)_50%,transparent_80%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(255,125,12,0.18),rgba(255,125,12,0.04)_50%,transparent_80%)] [mask-image:linear-gradient(to_bottom,white_40%,transparent_100%)]" />
        </div>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <ToastProvider>
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </ToastProvider>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
