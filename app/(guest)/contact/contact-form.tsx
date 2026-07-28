"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";

export function ContactForm() {
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get("subject") || "";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(initialSubject);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Gagal mengirim pesan");
      setSuccess(true);
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-lg border bg-emerald-50 p-6 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
        <p className="font-semibold">Pesan terkirim!</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Tim kami akan menghubungi Anda segera.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="contact-name">Nama</Label>
        <Input
          id="contact-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Nama Anda"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="anda@email.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-subject">Subjek</Label>
        <Input
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder="Subjek pesan"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-message">Pesan</Label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={5}
          className="w-full rounded-md border border-slate-200 p-2 text-sm"
          placeholder="Tulis pesan Anda..."
        />
      </div>
      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
        Kirim Pesan
      </Button>
    </form>
  );
}
