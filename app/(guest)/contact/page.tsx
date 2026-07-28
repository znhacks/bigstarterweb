import { ContactForm } from "./contact-form";
import { getTranslations } from "next-intl/server";
import { constructMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  const t = await getTranslations("metadata.guest.contact");
  return constructMetadata({
    title: t?.("title") || "Contact",
    description: t?.("description") || "Hubungi kami"
  });
}

export default function ContactPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Contact Us</h1>
          <p className="text-muted-foreground text-sm">
            Punya pertanyaan atau tertarik dengan Enterprise? Kirim pesan kepada tim kami.
          </p>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
