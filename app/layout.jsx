import "./globals.css";
import { Providers } from "./providers";
import { ToastProvider } from "../components/toastProvider";
import "react-phone-input-2/lib/style.css";
import "react-datepicker/dist/react-datepicker.css";
import { Be_Vietnam_Pro, DM_Sans, Libre_Baskerville } from "next/font/google";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-be-vietnam-pro",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-dm-sans",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-libre-baskerville",
});

export const metadata = {
  title: "PassPrive - Admin",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${beVietnamPro.className} ${dmSans.variable} ${libreBaskerville.variable} min-h-screen bg-[#eef0fb] text-slate-900 antialiased`}>
        <Providers>{children}</Providers>
        <ToastProvider />
      </body>
    </html>
  );
}
