// lib/timezones.ts

export interface TimezoneOption {
  value: string;
  label: string;
}

export function getAllTimezones(): TimezoneOption[] {
  // Mengambil 400+ nama zona waktu IANA resmi dari browser/sistem
  const timezones = Intl.supportedValuesOf("timeZone");

  return timezones
    .map((tz) => {
      try {
        // Dapatkan format offset dinamis, contoh: "GMT+07:00" atau "GMT-05:00"
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: tz,
          timeZoneName: "longOffset"
        });

        const parts = formatter.formatToParts(new Date());
        const tzPart = parts.find((p) => p.type === "timeZoneName");
        const offset = tzPart ? tzPart.value : "GMT";

        // Rapikan nama kota (contoh: "Asia/Jakarta" -> "Jakarta")
        const friendlyName = tz.split("/").pop()?.replace(/_/g, " ") || tz;
        const region = tz.split("/")[0] || "";

        return {
          value: tz,
          label: `${region ? `${region} - ` : ""}${friendlyName} (${offset})`
        };
      } catch {
        return {
          value: tz,
          label: tz
        };
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label)); // Urutkan berdasarkan abjad
}
