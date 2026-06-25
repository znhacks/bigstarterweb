"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect } from "react";

// 1. DAFTAR BAHASA YANG DIDUKUNG (Tambahkan di sini jika ingin menambah bahasa baru, misal: | "Français" | "日本語")
export type LanguageType = "English" | "Bahasa Indonesia" | "Español";

// 2. KONTRAK TIPE DATA (Memastikan semua bahasa memiliki struktur & kunci terjemahan yang sama persis)
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

// 3. KAMUS TERJEMAHAN (Cukup tambahkan blok bahasa baru di bawah ini untuk mendaftarkan bahasa baru)
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
      avatar: "Avatar Anda",
      avatarDesc:
        "Untuk mengubah avatar Anda, klik gambar pada kotak ini dan pilih berkas dari komputer Anda untuk diunggah.",
      language: "Bahasa Anda",
      languageDesc:
        "Untuk mengubah bahasa aplikasi pada akun Anda, pilih bahasa dari daftar lalu klik simpan.",
      name: "Nama Anda",
      email: "Email Anda",
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
  setLanguage: (lang: LanguageType) => void;
  t: TranslationSchema;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageType>("English");

  useEffect(() => {
    const savedLang = localStorage.getItem("app_language") as LanguageType;
    if (savedLang && dictionaries[savedLang]) {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = (lang: LanguageType) => {
    setLanguageState(lang);
    localStorage.setItem("app_language", lang);
  };

  const t = dictionaries[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
