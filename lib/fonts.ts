// lib/fonts.ts
import {
  Geist,
  Inter,
  Montserrat,
  Overpass_Mono,
  Poppins,
  Roboto,
  PT_Sans,
  Plus_Jakarta_Sans,
  Hedvig_Letters_Serif,
  Kumbh_Sans,
  Outfit,
  Cairo
} from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  preload: true
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
  preload: true
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
  preload: false
});

const plus_jakarta_sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "800"],
  variable: "--font-plus-jakarta-sans",
  display: "swap",
  preload: false
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-montserrat",
  display: "swap",
  preload: false
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
  preload: false
});

const overpass_mono = Overpass_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-overpass-mono",
  display: "swap",
  preload: false
});

const ptSans = PT_Sans({
  variable: "--font-pt-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false
});

const hedvig_letters_serif = Hedvig_Letters_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-hedvig-letters-serif",
  display: "swap",
  preload: false
});

const kumbh_sans = Kumbh_Sans({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-kumbh-sans",
  display: "swap",
  preload: false
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-outfit",
  display: "swap",
  preload: false
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
  preload: false
});

export const fontVariables = cn(
  geist.variable,
  inter.variable,
  roboto.variable,
  montserrat.variable,
  poppins.variable,
  overpass_mono.variable,
  ptSans.variable,
  plus_jakarta_sans.variable,
  hedvig_letters_serif.variable,
  kumbh_sans.variable,
  outfit.variable,
  cairo.variable
);
