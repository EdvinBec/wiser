import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { TimetableEventType } from "@/types/TimetableEventType";

export type Locale = "en" | "sl";

type Dict = {
  common: {
    manageFilters: string;
    save: string;
    cancel: string;
    clear: string;
    clearAll: string;
    selectAll: string;
    searchSubjectsPlaceholder: string;
    pickGroupsHelper: string;
    noSubjectsMatch: string;
    loadingTimetable: string;
    manageFiltersTitle: string;
    noEventSelected: string;
    themeLight: string;
    themeDark: string;
    switchToLight: string;
    switchToDark: string;
    disclaimerPrefix: string;
    timetable: string;
    latestCheckLabel: string;
    staleDataWarning: string;
  };
  header: {
    showBy: string;
    day: string;
    week: string;
    weekLabel: string;
  };
  details: {
    type: string;
    time: string;
    instructor: string;
    room: string;
    group: string;
  };
  types: Record<TimetableEventType, string>;
  locale: string; // for Intl formatting
};

const dicts: Record<Locale, Dict> = {
  en: {
    common: {
      manageFilters: "Manage filters",
      save: "Save",
      cancel: "Cancel",
      clear: "Clear",
      clearAll: "Clear all",
      selectAll: "Select all",
      searchSubjectsPlaceholder: "Search subjects…",
      pickGroupsHelper:
        "Pick your groups per subject. Keep it simple — adjust anytime.",
      noSubjectsMatch: "No subjects match your search.",
      loadingTimetable: "Loading timetable…",
      manageFiltersTitle: "Manage filters",
      noEventSelected: "No event selected.",
      themeLight: "Light",
      themeDark: "Dark",
      switchToLight: "Switch to light mode",
      switchToDark: "Switch to dark mode",
      disclaimerPrefix: "This app uses data from the",
      timetable: " timetable and is not affiliated with Wise Technologies.",
      latestCheckLabel: "Latest check",
      staleDataWarning: "Data might not be up to date. Last update was more than 30 minutes ago.",
    },
    header: {
      showBy: "Show by:",
      day: "Day",
      week: "Week",
      weekLabel: "Week",
    },
    details: {
      type: "Type",
      time: "Time",
      instructor: "Instructor",
      room: "Room",
      group: "Group",
    },
    types: {
      Lecture: "Lecture",
      Tutorial: "Tutorial",
      Lab: "Lab",
      LabExercise: "Lab exercise",
      Seminar: "Seminar",
      SeminarExercise: "Seminar exercise",
      Exercise: "Exercise",
      Exam: "Exam",
      Consultation: "Consultation",
      ComputerExercise: "Computer exercise",
    },
    locale: "en-GB",
  },
  sl: {
    common: {
      manageFilters: "Upravljaj filtre",
      save: "Shrani",
      cancel: "Prekliči",
      clear: "Počisti",
      clearAll: "Počisti vse",
      selectAll: "Izberi vse",
      searchSubjectsPlaceholder: "Išči predmete…",
      pickGroupsHelper:
        "Izberi svoje skupine za vsak predmet. Preprosto — lahko kadarkoli spremeniš.",
      noSubjectsMatch: "Noben predmet ne ustreza iskanju.",
      loadingTimetable: "Nalaganje urnika…",
      manageFiltersTitle: "Upravljanje filtrov",
      noEventSelected: "Ni izbranega dogodka.",
      themeLight: "Svetla",
      themeDark: "Temna",
      switchToLight: "Preklopi na svetlo temo",
      switchToDark: "Preklopi na temno temo",
      disclaimerPrefix: "Aplikacija uporablja podatke iz",
      timetable: "urnika in ni povezana s podjetjem Wise Technologies.",
      latestCheckLabel: "Zadnji zajem",
      staleDataWarning: "Podatki morda niso najnovejši. Zadnja posodobitev je bila pred več kot 30 minutami.",
    },
    header: {
      showBy: "Prikaz:",
      day: "Dan",
      week: "Teden",
      weekLabel: "Teden",
    },
    details: {
      type: "Vrsta",
      time: "Čas",
      instructor: "Predavatelj",
      room: "Prostor",
      group: "Skupina",
    },
    types: {
      Lecture: "Predavanje",
      Tutorial: "Vaje",
      Lab: "Laboratorij",
      LabExercise: "Laboratorijske vaje",
      Seminar: "Seminar",
      SeminarExercise: "Seminarske vaje",
      Exercise: "Vaje",
      Exam: "Izpit",
      Consultation: "Govorilne ure",
      ComputerExercise: "Računalniške vaje",
    },
    locale: "sl-SI",
  },
};

type Ctx = {
  locale: Locale;
  t: Dict;
  setLocale: (l: Locale) => void;
};

const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    try {
      const saved = localStorage.getItem("localeV2") || localStorage.getItem("localeV1");
      if (saved === "en" || saved === "sl") return saved;
    } catch {}
    return "sl";
  });

  useEffect(() => {
    try {
      localStorage.setItem("localeV2", locale);
    } catch {}
  }, [locale]);

  const value = useMemo<Ctx>(
    () => ({ locale, t: dicts[locale], setLocale }),
    [locale]
  );
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
