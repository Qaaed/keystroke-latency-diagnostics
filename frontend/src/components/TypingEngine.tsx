import { useState, useEffect, useRef, useMemo } from "react";

// Common words for the test
const WORD_LIST = [
  "the",
  "be",
  "to",
  "of",
  "and",
  "a",
  "in",
  "that",
  "have",
  "it",
  "for",
  "not",
  "on",
  "with",
  "as",
  "you",
  "do",
  "at",
  "this",
  "but",
  "by",
  "from",
  "they",
  "we",
  "say",
  "she",
  "or",
  "an",
  "will",
  "my",
  "one",
  "all",
  "would",
  "there",
  "their",
  "what",
  "so",
  "up",
  "out",
  "if",
  "about",
  "who",
  "get",
  "go",
  "me",
  "when",
  "make",
  "can",
  "like",
  "time",
  "no",
  "just",
  "know",
  "take",
  "people",
  "into",
  "year",
  "your",
  "good",
  "some",
  "could",
  "them",
  "see",
  "other",
  "than",
  "then",
  "now",
  "look",
  "only",
  "come",
  "its",
  "over",
  "think",
  "also",
];

const generateWords = (count: number) => {
  return Array.from(
    { length: count },
    () => WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)],
  ).join(" ");
};

export default function TypingEngine({ onReset }: { onReset: () => void }) {
  const [targetText, setTargetText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(15); // 15 second test
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize text on mount
  useEffect(() => {
    setTargetText(generateWords(30));
  }, []);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      setIsFinished(true);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // THE GATEKEEPER: Filter out unwanted keys (Arrows, Tab, Alt, etc.)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isFinished) return;

    // 1. INSTANTLY BLOCK MODIFIER COMBOS (Alt, Ctrl, Meta)
    if (e.altKey || e.ctrlKey || e.metaKey) {
      // We don't necessarily want to preventDefault here if they are trying
      // to do a system command like Cmd+R to refresh, but we DO NOT want to
      // count it as a valid typing input.
      return;
    }

    // 2. Allow single character typing (letters, numbers, spacebar)
    const isTypingChar = e.key.length === 1;

    // 3. Allow specific control keys
    const isAllowedControl = ["Backspace", "Shift"].includes(e.key);

    // If it's not a typing char and not a permitted control key, block it!
    if (!isTypingChar && !isAllowedControl) {
      e.preventDefault();
    }
  };

  // Handle typing
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isFinished) return;
    if (!isActive && e.target.value.length > 0) setIsActive(true);
    setUserInput(e.target.value);
  };

  // Reset test
  const handleReset = () => {
    setIsActive(false);
    setIsFinished(false);
    setTimeLeft(15);
    setUserInput("");
    setTargetText(generateWords(30));
    inputRef.current?.focus();
    //parent to wipe the telemetry logs!
    onReset();
  };

  // Calculate local accuracy (Target characters matched vs Total typed)
  const accuracy = useMemo(() => {
    if (userInput.length === 0) return 100;
    let correct = 0;
    for (let i = 0; i < userInput.length; i++) {
      if (userInput[i] === targetText[i]) correct++;
    }
    return Math.round((correct / userInput.length) * 100);
  }, [userInput, targetText]);

  return (
    <div
      className="w-full relative bg-slate-900/30 p-8 rounded-lg border border-slate-800 cursor-text min-h-[200px]"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Hidden text area to capture mobile & desktop input natively */}
      <textarea
        ref={inputRef}
        value={userInput}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        className="absolute inset-0 opacity-0 cursor-text resize-none w-full h-full z-10"
        disabled={isFinished}
        autoFocus
      />

      {/* Top Bar: Timer & Accuracy */}
      <div className="flex justify-between items-center mb-6 text-xl font-bold font-mono">
        <div
          className={`transition-colors ${timeLeft < 5 ? "text-red-500" : "text-blue-400"}`}
        >
          {timeLeft}s
        </div>
        <div className="flex items-center gap-4 text-slate-400 text-sm">
          <span>ACC: {accuracy}%</span>
          <button
            onClick={handleReset}
            className="hover:text-white transition-colors z-20 relative px-2 py-1 bg-slate-800 rounded"
          >
            ↻ Restart
          </button>
        </div>
      </div>

      {/* The Visual Text Layer */}
      <div className="text-2xl md:text-3xl font-mono leading-relaxed tracking-wide select-none break-words">
        {targetText.split("").map((char, index) => {
          let colorClass = "text-slate-600"; // Default untyped

          if (index < userInput.length) {
            colorClass =
              userInput[index] === char
                ? "text-slate-200" // Typed correct
                : "text-red-500 bg-red-500/20 rounded-sm"; // Typed incorrect
          }

          // Blinking cursor
          const isCursor = index === userInput.length && !isFinished;

          return (
            <span
              key={index}
              className={`${colorClass} ${isCursor ? "border-l-2 border-blue-500 -ml-[2px]" : ""}`}
            >
              {char}
            </span>
          );
        })}
      </div>

      {/* Game Over Overlay */}
      {isFinished && (
        <div className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg border border-blue-500/30">
          <h2 className="text-2xl font-bold text-white mb-2">Test Complete</h2>
          <p className="text-slate-400 mb-6">
            Hit Sync to save your hardware telemetry.
          </p>
          <button
            onClick={handleReset}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded font-bold transition-all"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
