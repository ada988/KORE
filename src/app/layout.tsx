import type { Metadata, Viewport } from "next";
import {
  Heebo,
  Frank_Ruhl_Libre,
  Assistant,
  Rubik,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

/* ── Hebrew primary fonts ── */
const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "500", "700", "900"],
  variable: "--font-heebo",
  display: "swap",
  preload: true,
});

const frankRuhlLibre = Frank_Ruhl_Libre({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-frank",
  display: "swap",
  preload: false,
});

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "600", "800"],
  variable: "--font-assistant",
  display: "swap",
  preload: false,
});

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-rubik",
  display: "swap",
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
  preload: false,
});

const fontVariables = [
  heebo.variable,
  frankRuhlLibre.variable,
  assistant.variable,
  rubik.variable,
  jetbrainsMono.variable,
].join(" ");

export const metadata: Metadata = {
  title: {
    default: "קוֹרֵא — KORÉ",
    template: "%s | קוֹרֵא",
  },
  description:
    "אפליקציית הקריאה המהירה וההבנה בעברית. לקרוא מהר זה מיתוס. לקרוא טוב יותר זה מדע.",
  applicationName: "קוֹרֵא",
  keywords: ["קריאה מהירה", "עברית", "הבנת הנקרא", "פסיכומטרי", "RSVP"],
  authors: [{ name: "KORÉ" }],
  openGraph: {
    type: "website",
    locale: "he_IL",
    siteName: "קוֹרֵא",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0c10" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${fontVariables} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Restore client-side route after GitHub Pages 404 redirect */}
        <script dangerouslySetInnerHTML={{ __html: `
          (function(l){
            if(l.search[1]==='/'){
              var d=l.search.slice(1).split('&').map(function(s){return s.replace(/~and~/g,'&')});
              window.history.replaceState(null,null,
                l.pathname.slice(0,-1)+d[0]+(d.slice(1).join('&')?'?'+d.slice(1).join('&'):'')+l.hash);
            }
          }(window.location))
        `}} />
      </head>
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: "var(--font-heebo)" }}
      >
        {children}
      </body>
    </html>
  );
}
