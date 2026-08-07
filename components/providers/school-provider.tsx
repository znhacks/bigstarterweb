"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/components/providers/session-provider";
import type { UserSchool } from "@/interfaces/school";

export interface SchoolContextType {
  userSchools: UserSchool[];
  activeSchoolId: string | null;
  activeSchool: UserSchool | null;
  setActiveSchoolId: (schoolId: string) => void;
  isLoading: boolean;
  refetchSchools: () => Promise<void>;
}

const SchoolContext = createContext<SchoolContextType | null>(null);

const STORAGE_KEY = "activeSchoolId";
const COOKIE_NAME = "active_school_id";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
}

function setCookie(name: string, value: string, days: number = 30) {
  if (typeof document === "undefined") return;
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = `expires=${d.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
}

export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const { user, loaded: sessionLoaded } = useSession();
  const router = useRouter();

  const [userSchools, setUserSchools] = useState<UserSchool[]>([]);
  const [activeSchoolId, setActiveSchoolIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserSchools = useCallback(async () => {
    if (!user?.id) {
      setUserSchools([]);
      setActiveSchoolIdState(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Fetch user & tenant connected schools via Server Action (bypasses RLS)
      const { getUserSchoolsAction } = await import("@/app/actions/tenant");
      const list: UserSchool[] = await getUserSchoolsAction();

      setUserSchools(list);

      // Determine stored activeSchoolId from localStorage or cookie
      const savedLocal = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
      const savedCookie = getCookie(COOKIE_NAME);
      const savedId = savedLocal || savedCookie;

      let validId: string | null = null;
      if (savedId && list.some((s) => s.school_id === savedId)) {
        validId = savedId;
      } else if (list.length > 0) {
        validId = list[0].school_id;
      }

      setActiveSchoolIdState(validId);
      if (validId) {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, validId);
        }
        setCookie(COOKIE_NAME, validId);
      }
    } catch (err) {
      console.error("Error loading user schools:", err);
      setUserSchools([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (sessionLoaded) {
      fetchUserSchools();
    }
  }, [sessionLoaded, fetchUserSchools]);

  const setActiveSchoolId = useCallback(
    (newSchoolId: string) => {
      setActiveSchoolIdState(newSchoolId);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, newSchoolId);
        window.dispatchEvent(new CustomEvent("activeSchoolChange", { detail: { schoolId: newSchoolId } }));
      }
      setCookie(COOKIE_NAME, newSchoolId);
      router.refresh();
    },
    [router]
  );

  const activeSchool = useMemo(() => {
    if (!activeSchoolId) return null;
    return userSchools.find((s) => s.school_id === activeSchoolId) || null;
  }, [userSchools, activeSchoolId]);

  return (
    <SchoolContext.Provider
      value={{
        userSchools,
        activeSchoolId,
        activeSchool,
        setActiveSchoolId,
        isLoading,
        refetchSchools: fetchUserSchools
      }}>
      {children}
    </SchoolContext.Provider>
  );
}

export function useSchoolContext(): SchoolContextType {
  const ctx = useContext(SchoolContext);
  if (!ctx) {
    throw new Error("useSchoolContext harus digunakan di dalam <SchoolProvider>.");
  }
  return ctx;
}
