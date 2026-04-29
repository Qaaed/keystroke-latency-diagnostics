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

type NavbarProps = {
  user: User | null;
  activePage: "test" | "profile";
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
  selectedKeyboard = KEYBOARD_OPTIONS[0],
  customKeyboard = "",
  onKeyboardChange,
  onCustomKeyboardChange,
  onSignOut,
}: NavbarProps) {
  const [isKeyboardMenuOpen, setIsKeyboardMenuOpen] = useState(false);
  const [keyboardSearch, setKeyboardSearch] = useState("");
  const keyboardMenuRef = useRef<HTMLDivElement>(null);

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
      className={`flex flex-col gap-4 rounded-lg border border-zinc-700/70 bg-zinc-900 px-4 py-3 font-mono text-zinc-100 shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] md:flex-row md:items-center md:justify-between ${
        bordered || showStatus ? "mb-1" : ""
      }`}
    >
      <div>
        <Link
          href="/"
          prefetch={false}
          className="text-xs font-semibold uppercase text-zinc-200 transition-colors hover:text-white"
        >
          Keystroke Latency Diagnostics
        </Link>
        {showStatus && (
          <div className="mt-2 flex items-center gap-3 text-sm">
            <div className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-100 opacity-30" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-zinc-100" />
            </div>
            <span className="text-zinc-400">Database connected</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        {showKeyboardSelector && (
          <div className="flex flex-wrap items-center gap-2">
            <label
              htmlFor="keyboard-search"
              className="text-xs font-semibold uppercase text-zinc-400"
            >
              Keyboard
            </label>
            <div ref={keyboardMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsKeyboardMenuOpen((isOpen) => !isOpen)}
                className="flex h-8 w-56 items-center justify-between gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-2 font-mono text-xs font-medium text-zinc-100 outline-none transition-colors hover:border-zinc-500 focus:border-zinc-300"
                aria-haspopup="listbox"
                aria-expanded={isKeyboardMenuOpen}
              >
                <span className="truncate">
                  {selectedKeyboard === OTHER_KEYBOARD_VALUE
                    ? customKeyboard || "Other keyboard"
                    : selectedKeyboard}
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
                className="h-8 w-40 rounded-md border border-zinc-700 bg-zinc-950 px-2 font-mono text-xs font-medium text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 hover:border-zinc-500 focus:border-zinc-300"
              />
            )}
          </div>
        )}

        {activePage === "profile" && (
          <Link
            href="/"
            prefetch={false}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-700 bg-zinc-950 text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
            aria-label="Back to typing test"
            title="Back to typing test"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            >
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <path d="M7 10h.01M11 10h.01M15 10h.01M19 10h.01M7 14h.01M11 14h6" />
            </svg>
          </Link>
        )}

        <Link
          href="/profile"
          prefetch={false}
          className="flex items-center gap-2 text-zinc-200 transition-colors hover:text-white"
          aria-label="Open profile"
        >
          <span className="hidden text-sm font-semibold md:block">
            {user?.displayName || "User"}
          </span>
          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt=""
              className="h-8 w-8 rounded-full border border-zinc-700"
            />
          )}
        </Link>
        <button
          onClick={onSignOut}
          className="text-xs font-semibold uppercase text-zinc-400 transition-colors hover:text-white"
        >
          Sign Out
        </button>
      </div>
    </nav>
  );
}
