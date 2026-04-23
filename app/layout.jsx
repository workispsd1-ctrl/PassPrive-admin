import "./globals.css";
import { Providers } from "./providers";
import { ToastProvider } from "../components/toastProvider";
import "react-phone-input-2/lib/style.css";
import "react-datepicker/dist/react-datepicker.css";

export const metadata = {
  title: "PassPrive - Admin",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#eef0fb] text-slate-900 antialiased">
        <Providers>{children}</Providers>
        <ToastProvider />
      </body>
    </html>
  );
}
