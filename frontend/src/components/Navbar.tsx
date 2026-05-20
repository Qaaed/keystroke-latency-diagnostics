"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { User } from "firebase/auth";

export const KEYBOARD_OPTIONS = [
  "GMMK Modular 60%",
  "Laptop keyboard",
  "Office keyboard",
  "GMMK Pro",
  "Glorious GMMK 2",
  "Keychron K2",
  "Keychron K3",
  "Keychron K6",
  "Keychron K8",
  "Keychron Q1",
  "Keychron Q2",
  "Keychron Q3",
  "Keychron Q5",
  "Keychron V1",
  "Keychron V2",
  "Wooting 60HE",
  "Wooting 80HE",
  "Ducky One 2 Mini",
  "Ducky One 3",
  "Razer BlackWidow V4",
  "Razer Huntsman Mini",
  "Razer Huntsman V3 Pro",
  "Corsair K70",
  "Corsair K65",
  "SteelSeries Apex 7",
  "SteelSeries Apex Pro",
  "Logitech G Pro X TKL",
  "Logitech G915 TKL",
  "Logitech MX Mechanical",
  "NuPhy Air75",
  "NuPhy Halo75",
  "Akko 5075B Plus",
  "Akko MOD 007",
  "Royal Kludge RK61",
  "Royal Kludge RK84",
  "Anne Pro 2",
  "Drop ALT",
  "Drop CTRL",
  "Leopold FC660M",
  "Varmilo VA87M",
  "HHKB Professional Hybrid",
  "Apple Magic Keyboard",
] as const;

export const OTHER_KEYBOARD_VALUE = "__other__";
export const KEYBOARD_PLACEHOLDER = "Not selected";

type NavbarProps = {
  user: User | null;
  activePage: "test" | "profile" | "leaderboard";
  bordered?: boolean;
  showStatus?: boolean;
  showKeyboardSelector?: boolean;
  selectedKeyboard?: string;
  customKeyboard?: string;
  onKeyboardChange?: (value: string) => void;
  onCustomKeyboardChange?: (value: string) => void;
  onSignOut: () => void;
};

export default function Navbar({
  user,
  activePage,
  bordered = false,
  showStatus = false,
  showKeyboardSelector = false,
  selectedKeyboard = "",
  customKeyboard = "",
  onKeyboardChange,
  onCustomKeyboardChange,
  onSignOut,
}: NavbarProps) {
  const [isKeyboardMenuOpen, setIsKeyboardMenuOpen] = useState(false);
  const [keyboardSearch, setKeyboardSearch] = useState("");
  const keyboardMenuRef = useRef<HTMLDivElement>(null);
  const shouldShowKeyboardSelector =
    activePage === "test" && showKeyboardSelector;
  const keyboardLabel = selectedKeyboard
    ? selectedKeyboard === OTHER_KEYBOARD_VALUE
      ? customKeyboard || "Other keyboard"
      : selectedKeyboard
    : KEYBOARD_PLACEHOLDER;
  const navItems = [
    { href: "/", label: "Test", page: "test" },
    { href: "/leaderboard", label: "Leaderboard", page: "leaderboard" },
    { href: "/profile", label: "Profile", page: "profile" },
  ] as const;
  const githubRepoUrl =
    "https://github.com/Qaaed/keystroke-latency-diagnostics";

  const filteredKeyboardOptions = useMemo(() => {
    const normalizedSearch = keyboardSearch.trim().toLowerCase();
    if (!normalizedSearch) return KEYBOARD_OPTIONS;

    return KEYBOARD_OPTIONS.filter((keyboard) =>
      keyboard.toLowerCase().includes(normalizedSearch),
    );
  }, [keyboardSearch]);

  useEffect(() => {
    if (!isKeyboardMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        keyboardMenuRef.current &&
        !keyboardMenuRef.current.contains(event.target as Node)
      ) {
        setIsKeyboardMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isKeyboardMenuOpen]);

  const handleKeyboardSelect = (value: string) => {
    onKeyboardChange?.(value);
    setKeyboardSearch("");
    setIsKeyboardMenuOpen(false);
  };

  return (
    <nav
      className={`rounded-lg border border-zinc-800 bg-zinc-950/95 font-mono text-zinc-100 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] ${
        bordered || showStatus ? "mb-1" : ""
      }`}
    >
      <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="block truncate text-xs font-semibold uppercase tracking-wide text-zinc-100 transition-colors hover:text-white"
            >
              Keynostics
            </Link>
            <a
              href={githubRepoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-7 w-7 flex-none items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
              aria-label="Open GitHub repository"
              title="GitHub repository"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.58.1.79-.25.79-.56v-2.14c-3.2.7-3.88-1.36-3.88-1.36-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.17 1.18A10.98 10.98 0 0 1 12 6.05c.98 0 1.96.13 2.88.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.42.36.79 1.07.79 2.16v3.14c0 .31.21.67.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z"
                />
              </svg>
            </a>
          </div>
          {showStatus && (
            <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-30" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              <span>Database connected</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <div className="flex rounded-md border border-zinc-800 bg-black/30 p-1">
            {navItems.map((item) => (
              <Link
                key={item.page}
                href={item.href}
                className={`rounded px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
                  activePage === item.page
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-md border border-zinc-800 bg-black/30 px-2 py-1">
            <Link
              href="/profile"
              className="flex min-w-0 items-center gap-2 text-zinc-200 transition-colors hover:text-white"
              aria-label="Open profile"
            >
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-7 w-7 rounded-full border border-zinc-700"
                />
              ) : (
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-xs text-zinc-500">
                  {(user?.displayName || user?.email || "U").slice(0, 1)}
                </span>
              )}
              <span className="hidden max-w-36 truncate text-xs font-semibold md:block">
                {user?.displayName || user?.email || "User"}
              </span>
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              className="border-l border-zinc-800 pl-2 text-xs font-semibold uppercase text-zinc-500 transition-colors hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {shouldShowKeyboardSelector && (
        <div className="border-t border-zinc-800 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-xl text-xs leading-5 text-zinc-500">
              Track typing speed, accuracy, and key latency across your keyboard.
            </p>
            <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <label
              htmlFor="keyboard-search"
              className="text-xs font-semibold uppercase text-zinc-500"
            >
              Keyboard
            </label>
            <div ref={keyboardMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsKeyboardMenuOpen((isOpen) => !isOpen)}
                className="flex h-8 w-60 items-center justify-between gap-2 rounded-md border border-zinc-700 bg-black px-2 font-mono text-xs font-medium text-zinc-100 outline-none transition-colors hover:border-zinc-500 focus:border-zinc-300"
                aria-haspopup="listbox"
                aria-expanded={isKeyboardMenuOpen}
              >
                <span
                  className={`truncate ${
                    selectedKeyboard ? "text-zinc-100" : "text-zinc-500"
                  }`}
                >
                  {keyboardLabel}
                </span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  className={`h-4 w-4 flex-none text-zinc-500 transition-transform ${
                    isKeyboardMenuOpen ? "rotate-180" : ""
                  }`}
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {isKeyboardMenuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 shadow-2xl shadow-black/40">
                  <div className="border-b border-zinc-800 p-2">
                    <input
                      id="keyboard-search"
                      value={keyboardSearch}
                      onChange={(event) => setKeyboardSearch(event.target.value)}
                      placeholder="Search keyboards..."
                      autoFocus
                      className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 font-mono text-xs text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-500"
                    />
                  </div>

                  <div
                    role="listbox"
                    className="max-h-72 overflow-y-auto p-1"
                    aria-label="Keyboard options"
                  >
                    {filteredKeyboardOptions.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-zinc-500">
                        No keyboards found.
                      </p>
                    ) : (
                      filteredKeyboardOptions.map((keyboard) => (
                        <button
                          key={keyboard}
                          type="button"
                          role="option"
                          aria-selected={selectedKeyboard === keyboard}
                          onClick={() => handleKeyboardSelect(keyboard)}
                          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left font-mono text-xs transition-colors ${
                            selectedKeyboard === keyboard
                              ? "bg-zinc-800 text-white"
                              : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                          }`}
                        >
                          <span className="truncate">{keyboard}</span>
                          {selectedKeyboard === keyboard && (
                            <span className="ml-3 text-zinc-500">Selected</span>
                          )}
                        </button>
                      ))
                    )}

                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedKeyboard === OTHER_KEYBOARD_VALUE}
                      onClick={() => handleKeyboardSelect(OTHER_KEYBOARD_VALUE)}
                      className={`mt-1 flex w-full items-center justify-between rounded-md border-t border-zinc-800 px-3 py-2 text-left font-mono text-xs transition-colors ${
                        selectedKeyboard === OTHER_KEYBOARD_VALUE
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                      }`}
                    >
                      <span>Other keyboard</span>
                      {selectedKeyboard === OTHER_KEYBOARD_VALUE && (
                        <span className="ml-3 text-zinc-500">Selected</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {selectedKeyboard === OTHER_KEYBOARD_VALUE && (
              <input
                value={customKeyboard}
                onChange={(event) =>
                  onCustomKeyboardChange?.(event.target.value)
                }
                placeholder="Add keyboard"
                className="h-8 w-44 rounded-md border border-zinc-700 bg-black px-2 font-mono text-xs font-medium text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 hover:border-zinc-500 focus:border-zinc-300"
              />
            )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
