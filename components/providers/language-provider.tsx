"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export type LanguageType = "English" | "Bahasa Indonesia" | "Español";

export interface TranslationSchema {
  common: {
    save: string;
    cancel: string;
    delete: string;
    active: string;
    inactive: string;
    success: string;
    error: string;
    loading: string;
  };
  // Tambahan Konfigurasi Mata Uang & Lokalitas
  currency: {
    code: string;
    symbol: string;
    rate: number; // Kurs konversi dari USD
    locale: string;
  };
  sidebar: {
    dashboards: string;
    classic: string;
    organization: string;
    general: string;
    member: string;
    billing: string;
    newOrg: string;
    noOrg: string;
    loadingOrg: string;
  };
  userMenu: {
    upgrade: string;
    account: string;
    billing: string;
    notifications: string;
    logout: string;
    credits: string;
  };
  accountSettings: {
    title: string;
    subTitle: string;
    avatar: string;
    avatarDesc: string;
    language: string;
    languageDesc: string;
    name: string;
    email: string;
    emailDesc: string;
    delete: string;
    deleteDesc: string;
    deleteButton: string;
    dialogTitle: string;
    dialogDesc: string;
  };
}

export const dictionaries: Record<LanguageType, TranslationSchema> = {
  English: {
    common: {
      save: "Save",
      cancel: "Cancel",
      delete: "Delete",
      active: "Active",
      inactive: "Inactive",
      success: "Success",
      error: "Error",
      loading: "Loading..."
    },
    currency: {
      code: "USD",
      symbol: "$",
      rate: 1,
      locale: "en-US"
    },
    sidebar: {
      dashboards: "Dashboards",
      classic: "Classic Dashboard",
      organization: "Organization",
      general: "General",
      member: "Member",
      billing: "Billing",
      newOrg: "New Organization",
      noOrg: "No organization",
      loadingOrg: "Loading org..."
    },
    userMenu: {
      upgrade: "Upgrade to Pro",
      account: "Account",
      billing: "Billing",
      notifications: "Notifications",
      logout: "Log out",
      credits: "Credits"
    },
    accountSettings: {
      title: "Account settings",
      subTitle: "Manage your general account settings.",
      avatar: "Your avatar",
      avatarDesc:
        "To change your avatar click the picture in this block and select a file from your computer to upload.",
      language: "Your language",
      languageDesc:
        "To change the language of the app for your account, select a language from the list and click save.",
      name: "Your name",
      email: "Your email",
      emailDesc:
        "To change your email, enter the new email and hit save. You will have to confirm the new email before it will become active.",
      delete: "Delete account",
      deleteDesc:
        "Permanently delete your account. Once you delete your account, there is no going back. To confirm, please enter your password below:",
      deleteButton: "Delete account",
      dialogTitle: "Are you absolutely sure?",
      dialogDesc:
        "This action will permanently delete your account and all associated profiles from our database. This action cannot be undone."
    }
  },
  "Bahasa Indonesia": {
    common: {
      save: "Simpan",
      cancel: "Batal",
      delete: "Hapus",
      active: "Aktif",
      inactive: "Tidak Aktif",
      success: "Sukses",
      error: "Error",
      loading: "Memuat..."
    },
    currency: {
      code: "IDR",
      symbol: "Rp",
      rate: 15000, // Simulasi kurs: $1 = Rp 15.000
      locale: "id-ID"
    },
    sidebar: {
      dashboards: "Dashboard",
      classic: "Dashboard Klasik",
      organization: "Organisasi",
      general: "Umum",
      member: "Anggota",
      billing: "Tagihan",
      newOrg: "Organisasi Baru",
      noOrg: "Tidak ada organisasi",
      loadingOrg: "Memuat org..."
    },
    userMenu: {
      upgrade: "Upgrade ke Pro",
      account: "Akun",
      billing: "Tagihan",
      notifications: "Notifikasi",
      logout: "Keluar akun",
      credits: "Kredit"
    },
    accountSettings: {
      title: "Pengaturan Akun",
      subTitle: "Kelola pengaturan umum akun Anda.",
      avatar: "Avatar",
      avatarDesc:
        "To change your avatar click the picture in this block and select a file from your computer to upload.",
      language: "Bahasa",
      languageDesc:
        "Untuk mengubah bahasa aplikasi pada akun, pilih bahasa dari daftar lalu klik simpan.",
      name: "Nama",
      email: "Email",
      emailDesc:
        "Untuk mengubah email Anda, masukkan email baru lalu klik simpan. Anda harus mengonfirmasi email baru sebelum email tersebut aktif.",
      delete: "Hapus akun",
      deleteDesc:
        "Hapus akun Anda secara permanen. Setelah dihapus, data tidak dapat dikembalikan. Untuk konfirmasi, silakan klik tombol di samping:",
      deleteButton: "Hapus akun",
      dialogTitle: "Apakah Anda benar-benar yakin?",
      dialogDesc:
        "Tindakan ini akan menghapus akun Anda beserta seluruh profil dari database secara permanen. Tindakan ini tidak dapat dibatalkan."
    }
  },
  Español: {
    common: {
      save: "Guardar",
      cancel: "Cancelar",
      delete: "Eliminar",
      active: "Activo",
      inactive: "Inactivo",
      success: "Éxito",
      error: "Error",
      loading: "Cargando..."
    },
    currency: {
      code: "EUR",
      symbol: "€",
      rate: 0.92, // Kurs: $1 = €0.92
      locale: "es-ES"
    },
    sidebar: {
      dashboards: "Tableros",
      classic: "Tablero Clásico",
      organization: "Organización",
      general: "General",
      member: "Miembro",
      billing: "Facturación",
      newOrg: "Nueva Organización",
      noOrg: "Sin organización",
      loadingOrg: "Cargando org..."
    },
    userMenu: {
      upgrade: "Actualizar a Pro",
      account: "Cuenta",
      billing: "Facturación",
      notifications: "Notificaciones",
      logout: "Cerrar sesión",
      credits: "Créditos"
    },
    accountSettings: {
      title: "Configuración de la cuenta",
      subTitle: "Administre la configuración general de su cuenta.",
      avatar: "Tu avatar",
      avatarDesc:
        "Para cambiar tu avatar, haz clic en la foto en este bloque y selecciona un archivo de tu computadora para cargar.",
      language: "Tu idioma",
      languageDesc:
        "Para cambiar el idioma de la aplicación para tu cuenta, selecciona un idioma de la lista y haz clic en guardar.",
      name: "Tu nombre",
      email: "Tu correo electrónico",
      emailDesc:
        "Para cambiar tu correo electrónico, ingresa el nuevo correo electrónico y presiona guardar. Deberás confirmar el nuevo correo electrónico antes de que se active.",
      delete: "Eliminar cuenta",
      deleteDesc:
        "Eliminar permanentemente tu cuenta. Una vez que elimines tu cuenta, no hay marcha atrás. Para confirmar, ingresa tu contraseña a continuación:",
      deleteButton: "Eliminar cuenta",
      dialogTitle: "¿Estás absolutamente seguro?",
      dialogDesc:
        "Esta acción eliminará permanentemente tu cuenta y todos los perfiles asociados de nuestra base de datos. Esta acción no se puede deshacer."
    }
  }
};

interface LanguageContextType {
  language: LanguageType;
  setLanguage: (lang: LanguageType) => Promise<void>;
  t: TranslationSchema;
  formatPrice: (usdAmount: number) => string; // Helper pemformat harga dinamis
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageType>("English");

  useEffect(() => {
    const fetchUserLanguage = async () => {
      try {
        // 1. Coba ambil dari profil Supabase
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (user && user.user_metadata?.language) {
          const userLang = user.user_metadata.language as LanguageType;
          if (dictionaries[userLang]) {
            setLanguageState(userLang);
            localStorage.setItem("app_language", userLang);
            return;
          }
        }

        // 2. Coba ambil dari localStorage jika ada
        const savedLang = localStorage.getItem("app_language") as LanguageType;
        if (savedLang && dictionaries[savedLang]) {
          setLanguageState(savedLang);
          return;
        }

        // 3. FITUR BARU: Deteksi Bahasa Browser Pengguna Secara Otomatis
        if (typeof window !== "undefined") {
          const browserLang = window.navigator.language.toLowerCase();
          if (browserLang.startsWith("id")) {
            setLanguageState("Bahasa Indonesia");
            localStorage.setItem("app_language", "Bahasa Indonesia");
          } else if (browserLang.startsWith("es")) {
            setLanguageState("Español");
            localStorage.setItem("app_language", "Español");
          } else {
            setLanguageState("English");
            localStorage.setItem("app_language", "English");
          }
        }
      } catch (e) {
        console.error("Gagal mendeteksi bahasa otomatis:", e);
      }
    };

    fetchUserLanguage();
  }, []);

  const setLanguage = async (lang: LanguageType) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);

    try {
      await supabase.auth.updateUser({
        data: { language: lang }
      });
    } catch (e) {
      console.error(e);
    }
  };

  const t = dictionaries[language];

  // 4. FITUR BARU: Helper Pemformat Mata Uang Berdasarkan Negara Terpilih
  const formatPrice = (usdAmount: number) => {
    const convertedAmount = Math.round(usdAmount * t.currency.rate);
    return new Intl.NumberFormat(t.currency.locale, {
      style: "currency",
      currency: t.currency.code,
      maximumFractionDigits: t.currency.code === "IDR" ? 0 : 2
    }).format(convertedAmount);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatPrice }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
