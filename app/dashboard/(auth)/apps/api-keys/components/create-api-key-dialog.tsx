"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Copy, PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(80)
});

export function CreateApiKeyDialog({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // The full secret is shown exactly once, right after creation.
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" }
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const tenantId =
      typeof window !== "undefined" ? localStorage.getItem("active_org_id") : null;
    if (!tenantId) {
      toast.error("No active organization. Select an organization in the sidebar first.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        credentials: "include",
        body: JSON.stringify({ name: values.name })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Failed to create API key.");
      setCreatedKey(json.key);
      onCreated?.();
      toast.success("API key created.");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create API key.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      // Reset both form and the one-time secret when the dialog closes.
      setCreatedKey(null);
      form.reset({ name: "" });
    }
  }

  function copyKey() {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    toast.success("Copied to clipboard.");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle /> Create API Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        {createdKey ? (
          <div className="space-y-4">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <DialogTitle>API key created</DialogTitle>
              </div>
              <DialogDescription>
                Copy your key now. For security, the full secret is shown only this once.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input readOnly value={createdKey} className="font-mono" />
              <Button variant="outline" size="icon" onClick={copyKey}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground text-xs">
              Use it as <code className="font-mono">Authorization: Bearer {createdKey.slice(0, 12)}…</code>
            </p>
            <Button className="w-full" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create new API key</DialogTitle>
              <DialogDescription>
                Give the key a name so you can recognize it later. Keys grant access to your
                organization&rsquo;s data via the public API.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API key name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Production server" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? "Creating…" : "Create API key"}
                </Button>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
