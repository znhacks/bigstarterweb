import * as React from "react";
import { Loader2, MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { tenantConfig } from "@/config/tenant";

interface AddressContactSettingsFormProps {
  isReadOnly: boolean;
  isSaving: boolean;
  businessEmail: string;
  setBusinessEmail: (val: string) => void;
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  taxId: string;
  setTaxId: (val: string) => void;
  addressLine1: string;
  setAddressLine1: (val: string) => void;
  addressLine2: string;
  setAddressLine2: (val: string) => void;
  city: string;
  setCity: (val: string) => void;
  stateProvince: string;
  setStateProvince: (val: string) => void;
  postalCode: string;
  setPostalCode: (val: string) => void;
  countryCode: string;
  setCountryCode: (val: string) => void;
  onSave: () => Promise<void>;
  tCommon: (key: string) => string;
}

export function AddressContactSettingsForm({
  isReadOnly,
  isSaving,
  businessEmail,
  setBusinessEmail,
  phoneNumber,
  setPhoneNumber,
  taxId,
  setTaxId,
  addressLine1,
  setAddressLine1,
  addressLine2,
  setAddressLine2,
  city,
  setCity,
  stateProvince,
  setStateProvince,
  postalCode,
  setPostalCode,
  countryCode,
  setCountryCode,
  onSave,
  tCommon
}: AddressContactSettingsFormProps) {
  const isUS = countryCode === "US";
  const isID = countryCode === "ID";

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col items-start justify-between gap-6 lg:flex-row">
        {/* Sisi Kiri: Judul & Deskripsi */}
        <div className="space-y-1 lg:max-w-xs">
          <h2 className="text-foreground text-base font-semibold">Profile & Address</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Provide business contact information, registration tax ID, and legal billing address.
          </p>
        </div>

        {/* Sisi Kanan: Input Form */}
        <div className="w-full space-y-4 lg:max-w-xl">
          {/* Baris 1: Kontak Bisnis */}
          {(tenantConfig.features.enableBusinessContact || tenantConfig.features.enableTaxId) && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {tenantConfig.features.enableBusinessContact && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Business Email</Label>
                    <Input
                      type="email"
                      disabled={isReadOnly || isSaving}
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      placeholder="billing@company.com"
                      className="border-border/80 h-10 focus-visible:ring-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Phone Number</Label>
                    <Input
                      type="text"
                      disabled={isReadOnly || isSaving}
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+62..."
                      className="border-border/80 h-10 focus-visible:ring-1"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Baris 2: Pajak & Negara */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {tenantConfig.features.enableTaxId && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Tax ID / VAT / NPWP</Label>
                <Input
                  type="text"
                  disabled={isReadOnly || isSaving}
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="Tax Registration Number"
                  className="border-border/80 h-10 focus-visible:ring-1"
                />
              </div>
            )}

            {tenantConfig.features.enableAddress && (
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs font-semibold">
                  <MapPin className="text-muted-foreground h-3.5 w-3.5" /> Country
                </Label>
                <select
                  disabled={isReadOnly || isSaving}
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="border-border/80 text-foreground bg-background focus-visible:ring-ring h-10 w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none">
                  <option value="">Select Country...</option>
                  <option value="ID">Indonesia</option>
                  <option value="US">United States</option>
                  <option value="SG">Singapore</option>
                </select>
              </div>
            )}
          </div>

          {/* Bagian Alamat (Hanya tampil jika diaktifkan di config) */}
          {tenantConfig.features.enableAddress && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Address Line 1</Label>
                  <Input
                    type="text"
                    disabled={isReadOnly || isSaving}
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Street, Building No."
                    className="border-border/80 h-10 focus-visible:ring-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Address Line 2 (Optional)</Label>
                  <Input
                    type="text"
                    disabled={isReadOnly || isSaving}
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    placeholder="Suite, floor, etc."
                    className="border-border/80 h-10 focus-visible:ring-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">City</Label>
                  <Input
                    type="text"
                    disabled={isReadOnly || isSaving}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                    className="border-border/80 h-10 focus-visible:ring-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">
                    {isUS ? "State" : isID ? "Province" : "State / Province"}
                  </Label>
                  <Input
                    type="text"
                    disabled={isReadOnly || isSaving}
                    value={stateProvince}
                    onChange={(e) => setStateProvince(e.target.value)}
                    placeholder={isID ? "e.g. DKI Jakarta" : "State/Province"}
                    className="border-border/80 h-10 focus-visible:ring-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">
                    {isUS ? "ZIP Code" : isID ? "Postal Code" : "Postal / ZIP Code"}
                  </Label>
                  <Input
                    type="text"
                    disabled={isReadOnly || isSaving}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder={isID ? "e.g. 12190" : "Postal Code"}
                    className="border-border/80 h-10 focus-visible:ring-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tombol Simpan */}
      {!isReadOnly && (
        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={isSaving}
            variant="secondary"
            size="sm"
            className="bg-secondary text-secondary-foreground hover:bg-secondary/80 inline-flex items-center gap-2 rounded-lg px-5 text-xs">
            {isSaving && <Loader2 className="h-3 w-3 animate-spin" />}
            {tCommon("save")}
          </Button>
        </div>
      )}
    </div>
  );
}
