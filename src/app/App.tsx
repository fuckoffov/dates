import { useMemo, useState, useEffect } from "react";
import { HISTORY_DATES, type HistoryDate } from "./data/dates";
import { Button } from "./components/ui/button";
import { Card } from "./components/ui/card";
import { Progress } from "./components/ui/progress";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { Label } from "./components/ui/label";
import { Input } from "./components/ui/input";
import { Check, X, RotateCcw, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./components/ui/dialog";

type Difficulty = "easy" | "medium" | "hard";

type Question = {
  prompt: string;
  correct: string;
  options: string[];
  source: HistoryDate;
};

type Category = {
  id: string;
  title: string;
  description: string;
  filter: (d: HistoryDate) => boolean;
};

const TOTAL_QUESTIONS = 50;

function firstYear(d: HistoryDate): number {
  const m = d.date.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : 0;
}

// Билеты для экзаменационного режима (каждый билет - набор из 12 индексов событий)
const EXAM_TICKETS: number[][] = [
  [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55], // Билет 1
  [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56], // Билет 2
  [2, 7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57], // Билет 3
  [3, 8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58], // Билет 4
  [4, 9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59], // Билет 5
  [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60], // Билет 6
  [6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61], // Билет 7
  [7, 12, 17, 22, 27, 32, 37, 42, 47, 52, 57, 62], // Билет 8
  [8, 13, 18, 23, 28, 33, 38, 43, 48, 53, 58, 63], // Билет 9
  [9, 14, 19, 24, 29, 34, 39, 44, 49, 54, 59, 64], // Билет 10
];

const CATEGORY_COLORS: Record<string, string> = {
  all: "#6366f1",
  empire: "#f59e0b",
  revolution: "#8b5cf6",
  wwii: "#dc2626",
  ussr: "#06b6d4",
  modern: "#10b981",
};

const CATEGORIES: Category[] = [
  {
    id: "all",
    title: "Все даты",
    description: "Полный набор событий из базы",
    filter: () => true,
  },
  {
    id: "empire",
    title: "Российская империя и начало XX века",
    description: "1880–1916: до Февральской революции",
    filter: (d) => firstYear(d) >= 1880 && firstYear(d) <= 1916,
  },
  {
    id: "revolution",
    title: "Революция и довоенный СССР",
    description: "1917–1940: от Октября до начала ВОВ",
    filter: (d) => firstYear(d) >= 1917 && firstYear(d) <= 1940,
  },
  {
    id: "wwii",
    title: "Великая Отечественная и Вторая мировая",
    description: "1941–1945: военные годы",
    filter: (d) => firstYear(d) >= 1941 && firstYear(d) <= 1945,
  },
  {
    id: "ussr",
    title: "Послевоенный СССР",
    description: "1946–1991: от Фултона до распада СССР",
    filter: (d) => firstYear(d) >= 1946 && firstYear(d) <= 1991,
  },
  {
    id: "modern",
    title: "Современная Россия",
    description: "1992–2024: после распада СССР",
    filter: (d) => firstYear(d) >= 1992,
  },
];

const DIFFICULTIES: { id: Difficulty; title: string; description: string; recommended?: boolean }[] = [
  { id: "easy", title: "Лёгкий", description: "2 варианта ответа" },
  { id: "medium", title: "Средний", description: "4 варианта ответа", recommended: true },
  { id: "hard", title: "Сложный", description: "Введите дату вручную (число, месяц, год)" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(
  category: Category,
  difficulty: Difficulty,
  count: number,
): Question[] {
  const pool = HISTORY_DATES.filter(category.filter);
  const picked = shuffle(pool).slice(0, count);
  const optionsCount = difficulty === "easy" ? 2 : difficulty === "medium" ? 4 : 0;
  return picked.map((item) => {
    let options: string[] = [];
    if (optionsCount > 0) {
      const correctYear = firstYear(item);
      const yearRange = 3; // диапазон ±3 года

      // Ищем события с близкими годами
      const closeDates = HISTORY_DATES.filter((d) => {
        if (d.date === item.date) return false;
        const year = firstYear(d);
        return Math.abs(year - correctYear) <= yearRange;
      });

      let distractors: string[] = [];

      if (closeDates.length >= optionsCount - 1) {
        // Достаточно близких дат в базе
        distractors = shuffle(closeDates)
          .slice(0, optionsCount - 1)
          .map((d) => d.date);
      } else {
        // Генерируем синтетические близкие даты
        const usedYears = new Set([correctYear]);
        while (distractors.length < optionsCount - 1) {
          const offset = distractors.length < 2 ? distractors.length + 1 : -(distractors.length - 1);
          let fakeYear = correctYear + offset;

          // Избегаем дубликатов
          let attempts = 0;
          while (usedYears.has(fakeYear) && attempts < 10) {
            fakeYear = correctYear + (Math.random() > 0.5 ? 1 : -1) * (Math.floor(Math.random() * yearRange) + 1);
            attempts++;
          }

          usedYears.add(fakeYear);
          distractors.push(fakeYear.toString());
        }
      }

      options = shuffle([item.date, ...distractors]);
    }
    return {
      prompt: item.event,
      correct: item.date,
      options,
      source: item,
    };
  });
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/ё/g, "е")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getMonth(m: string) {
  if (m.startsWith("янв")) return 1;
  if (m.startsWith("фев")) return 2;
  if (m.startsWith("мар")) return 3;
  if (m.startsWith("апр")) return 4;
  if (m.startsWith("ма")) return 5;
  if (m.startsWith("июн")) return 6;
  if (m.startsWith("июл")) return 7;
  if (m.startsWith("авг")) return 8;
  if (m.startsWith("сен")) return 9;
  if (m.startsWith("окт")) return 10;
  if (m.startsWith("ноя")) return 11;
  if (m.startsWith("дек")) return 12;
  return 0;
}

function parseRussianDates(inputStr: string) {
  const dates: { year?: number, month?: number, day?: number }[] = [];
  
  let str = inputStr.toLowerCase().replace(/г\./g, "").replace(/года?/g, "").trim();
  
  const regexDDMMYYYY = /\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/g;
  str = str.replace(regexDDMMYYYY, (_, d, m, y) => {
    dates.push({ year: parseInt(y, 10), month: parseInt(m, 10), day: parseInt(d, 10) });
    return " ";
  });
  
  const regexDDMonthYYYY = /\b(\d{1,2})\s+(янв[а-яё]*|фев[а-яё]*|март[а-яё]*|мар[а-яё]*|апр[а-яё]*|ма[яй]|июн[а-яё]*|июл[а-яё]*|авг[а-яё]*|сен[а-яё]*|окт[а-яё]*|ноя[а-яё]*|дек[а-яё]*)\s+(\d{4})\b/g;
  str = str.replace(regexDDMonthYYYY, (_, d, m, y) => {
    dates.push({ year: parseInt(y, 10), month: getMonth(m), day: parseInt(d, 10) });
    return " ";
  });

  const regexMonthYYYY = /(?:^|[^\dа-яёa-z])(янв[а-яё]*|фев[а-яё]*|март[а-яё]*|мар[а-яё]*|апр[а-яё]*|ма[яй]|июн[а-яё]*|июл[а-яё]*|авг[а-яё]*|сен[а-яё]*|окт[а-яё]*|ноя[а-яё]*|дек[а-яё]*)\s+(\d{4})\b/g;
  str = str.replace(regexMonthYYYY, (_, m, y) => {
    dates.push({ year: parseInt(y, 10), month: getMonth(m) });
    return " ";
  });

  const regexDDMonth = /\b(\d{1,2})\s+(янв[а-яё]*|фев[а-яё]*|март[а-яё]*|мар[а-яё]*|апр[а-яё]*|ма[яй]|июн[а-яё]*|июл[а-яё]*|авг[а-яё]*|сен[а-яё]*|окт[а-яё]*|ноя[а-яё]*|дек[а-яё]*)(?=[^а-яёa-z]|$)/g;
  str = str.replace(regexDDMonth, (_, d, m) => {
    dates.push({ month: getMonth(m), day: parseInt(d, 10) });
    return " ";
  });

  const regexYYYY = /\b(\d{4})\b/g;
  str = str.replace(regexYYYY, (_, y) => {
    dates.push({ year: parseInt(y, 10) });
    return " ";
  });

  const maxYear = dates.map(d => d.year).filter(y => y !== undefined) as number[];
  if (maxYear.length > 0) {
    const defaultYear = Math.max(...maxYear);
    dates.forEach(d => {
      if (d.year === undefined) d.year = defaultYear;
    });
  }
  
  return dates.filter(d => d.year !== undefined) as { year: number, month?: number, day?: number }[];
}

function checkHardAnswer(input: string, correct: string): boolean {
  if (normalize(input) === normalize(correct)) return true;

  const inputDates = parseRussianDates(input);
  const correctDates = parseRussianDates(correct);

  if (inputDates.length === 0 || correctDates.length === 0) {
    return normalize(input) === normalize(correct);
  }

  const allMatch = inputDates.every(iDate => {
    return correctDates.some(cDate => {
      if (iDate.year !== cDate.year) return false;
      if (iDate.month !== undefined && cDate.month !== undefined && iDate.month !== cDate.month) return false;
      if (iDate.day !== undefined && cDate.day !== undefined && iDate.day !== cDate.day) return false;
      return true;
    });
  });

  return allMatch;
}

export default function App() {
  const [category, setCategory] = useState<Category | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [mistakes, setMistakes] = useState<Question[]>([]);
  const [isMarathonMode, setIsMarathonMode] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [buttonDelay, setButtonDelay] = useState(0);
  const [canProceed, setCanProceed] = useState(true);
  const [showExamDialog, setShowExamDialog] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);

  const createExamCategory = (ticketNumber: number): Category => {
    const ticketIndices = EXAM_TICKETS[ticketNumber - 1];
    return {
      id: `exam-${ticketNumber}`,
      title: `Экзаменационный билет ${ticketNumber}`,
      description: "Фиксированный набор из 12 дат",
      filter: (d) => {
        const index = HISTORY_DATES.indexOf(d);
        return ticketIndices.includes(index);
      },
    };
  };

  const handleTicketSelect = (ticketNumber: number) => {
    setSelectedTicket(ticketNumber);
    setCategory(createExamCategory(ticketNumber));
    setShowExamDialog(false);
  };

  const current = questions[index];
  const progress = useMemo(
    () => (questions.length ? (index / questions.length) * 100 : 0),
    [index, questions.length],
  );

  const startTest = (cat: Category, diff: Difficulty) => {
    setCategory(cat);
    setDifficulty(diff);
    const isExamMode = cat.id.startsWith("exam-");
    const questionCount = isExamMode ? 12 : TOTAL_QUESTIONS;
    setQuestions(buildQuestions(cat, diff, questionCount));
    setIndex(0);
    setSelected(null);
    setTyped("");
    setChecked(false);
    setScore(0);
    setFinished(false);
    setMistakes([]);
    setIsMarathonMode(false);
    setTimer(0);
    setIsTimerRunning(true);
    setButtonDelay(0);
    setCanProceed(true);
  };

  const handleCheck = () => {
    if (difficulty === "hard") {
      if (!typed.trim()) return;
      setChecked(true);
      const isCorrect = checkHardAnswer(typed, current.correct);
      if (isCorrect) {
        setScore((s) => s + 1);
        setCanProceed(true);
      } else {
        setMistakes((m) => [...m, current]);
        setCanProceed(false);
        setButtonDelay(0);
      }
    } else {
      if (!selected) return;
      setChecked(true);
      if (selected === current.correct) {
        setScore((s) => s + 1);
        setCanProceed(true);
      } else {
        setMistakes((m) => [...m, current]);
        setCanProceed(false);
        setButtonDelay(0);
      }
    }
  };

  const handleNext = () => {
    if (index + 1 >= questions.length) {
      setFinished(true);
      setIsTimerRunning(false);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setTyped("");
    setChecked(false);
    setCanProceed(true);
    setButtonDelay(0);
  };

  const handleRestart = () => {
    if (!category || !difficulty) return;
    startTest(category, difficulty);
  };

  const handleBackToCategories = () => {
    setCategory(null);
    setDifficulty(null);
    setQuestions([]);
    setIndex(0);
    setSelected(null);
    setTyped("");
    setChecked(false);
    setScore(0);
    setFinished(false);
  };

  const handleBackToDifficulty = () => {
    setDifficulty(null);
    setQuestions([]);
    setIndex(0);
    setSelected(null);
    setTyped("");
    setChecked(false);
    setScore(0);
    setFinished(false);
  };

  const startMarathon = () => {
    setQuestions(mistakes);
    setIndex(0);
    setSelected(null);
    setTyped("");
    setChecked(false);
    setScore(0);
    setFinished(false);
    setMistakes([]);
    setIsMarathonMode(true);
    setTimer(0);
    setIsTimerRunning(true);
    setButtonDelay(0);
    setCanProceed(true);
  };

  // Таймер
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Задержка кнопки для неправильных ответов
  useEffect(() => {
    if (!checked || canProceed) return;
    const interval = setInterval(() => {
      setButtonDelay((d) => {
        if (d >= 100) {
          setCanProceed(true);
          return 100;
        }
        return d + 20; // 20% каждые 100мс = 0.5 секунды
      });
    }, 100);
    return () => clearInterval(interval);
  }, [checked, canProceed]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getBestTime = (): number | null => {
    const key = `bestTime_${category?.id}_${difficulty}`;
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : null;
  };

  const saveBestTime = (time: number) => {
    if (!category || !difficulty) return;
    const key = `bestTime_${category.id}_${difficulty}`;
    const best = getBestTime();
    if (!best || time < best) {
      localStorage.setItem(key, time.toString());
    }
  };

  const saveProgress = () => {
    if (!category || !difficulty) return;

    const categoryKey = `category_${category.id}`;
    const attempts = parseInt(localStorage.getItem(`${categoryKey}_attempts`) || "0", 10);
    localStorage.setItem(`${categoryKey}_attempts`, (attempts + 1).toString());

    const percentage = Math.round((score / questions.length) * 100);
    const bestScore = parseInt(localStorage.getItem(`${categoryKey}_bestScore`) || "0", 10);
    if (percentage > bestScore) {
      localStorage.setItem(`${categoryKey}_bestScore`, percentage.toString());
    }
  };

  const getCategoryProgress = (categoryId: string) => {
    const categoryKey = `category_${categoryId}`;
    const attempts = parseInt(localStorage.getItem(`${categoryKey}_attempts`) || "0", 10);

    if (attempts === 0) return null;

    return {
      bestScore: parseInt(localStorage.getItem(`${categoryKey}_bestScore`) || "0", 10),
      attempts,
    };
  };

  useEffect(() => {
    if (finished && timer > 0) {
      saveBestTime(timer);
      saveProgress();
    }
  }, [finished]);

  const hardCorrect = checked && difficulty === "hard" && checkHardAnswer(typed, current.correct);
  const isCorrect = checked && (difficulty === "hard" ? hardCorrect : selected === current.correct);
  const headerSubtitle = !category
    ? "Выберите категорию"
    : !difficulty
      ? `${category.title} — выберите сложность`
      : isMarathonMode
        ? `Работа над ошибками • ${questions.length} ${questions.length === 1 ? 'вопрос' : questions.length < 5 ? 'вопроса' : 'вопросов'}`
        : category.title;

  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-background flex flex-col items-center justify-start sm:justify-center p-4 sm:p-6 md:p-8 font-sans transition-colors duration-200">
      <div className="w-full max-w-3xl flex-1 flex flex-col justify-center">
        <div className="flex justify-end mb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => document.documentElement.classList.toggle('dark')}
            className="rounded-full bg-white/50 dark:bg-card/50 backdrop-blur"
          >
            <span className="dark:hidden">🌙</span>
            <span className="hidden dark:inline">☀️</span>
          </Button>
        </div>
        <header className="mb-6 sm:mb-10 flex flex-col items-center text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white dark:bg-card shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl mb-3 sm:mb-4">
            🏛️
          </div>
          <h1 className="text-slate-900 dark:text-slate-50 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mb-2 sm:mb-3">
            Исторические даты
          </h1>
          <span className="inline-block px-3 py-1 sm:px-4 sm:py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs sm:text-sm font-medium">
            {headerSubtitle}
          </span>
        </header>

        {!category ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CATEGORIES.map((cat) => {
                const count = HISTORY_DATES.filter(cat.filter).length;
                const disabled = count < 4;
                const progress = getCategoryProgress(cat.id);
                const color = CATEGORY_COLORS[cat.id] || "#94a3b8";

                return (
                  <Card
                    key={cat.id}
                    className={`relative overflow-hidden p-5 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none rounded-2xl transition-all duration-200 ${
                      disabled
                        ? "opacity-50 grayscale"
                        : "cursor-pointer hover:shadow-md hover:-translate-y-1"
                    }`}
                    style={{ borderBottom: `4px solid ${color}` }}
                    onClick={() => !disabled && setCategory(cat)}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex-1">
                        <div className="text-slate-900 dark:text-slate-50 font-semibold text-lg leading-tight">
                          {cat.title}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">
                          {cat.description}
                        </div>
                      </div>
                      <div className="text-slate-400 dark:text-slate-500 text-xs font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md shrink-0">
                        {Math.min(count, TOTAL_QUESTIONS)} вопр.
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-auto">
                      {progress ? (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                            Лучший: {progress.bestScore}%
                          </span>
                          <span className="text-slate-400 dark:text-slate-500">
                            {progress.attempts} {progress.attempts === 1 ? 'попытка' : progress.attempts < 5 ? 'попытки' : 'попыток'}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-400 dark:text-slate-500">
                          Ещё не проходили
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card
              className="p-5 bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 dark:border-slate-700 shadow-md dark:shadow-none rounded-2xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200"
              onClick={() => setShowExamDialog(true)}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-lg font-semibold flex items-center gap-2">
                    🎓 Экзаменационный режим
                  </div>
                  <div className="text-slate-400 dark:text-slate-300 mt-1 text-sm">Фиксированный набор из 12 дат для проверки знаний</div>
                </div>
              </div>
            </Card>

            <Dialog open={showExamDialog} onOpenChange={setShowExamDialog}>
              <DialogContent className="rounded-2xl dark:bg-card dark:border-slate-800" aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle className="text-xl dark:text-slate-50">Выберите билет</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-3 mt-4 max-h-[60vh] overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <Card
                      key={num}
                      className="p-4 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none rounded-xl cursor-pointer hover:border-primary dark:hover:border-primary hover:bg-primary/5 transition-colors"
                      onClick={() => handleTicketSelect(num)}
                    >
                      <div className="flex flex-col items-center justify-center text-center">
                        <span className="text-slate-900 dark:text-slate-50 font-medium mb-1">Билет {num}</span>
                        <span className="text-slate-400 dark:text-slate-500 text-xs">12 дат</span>
                      </div>
                    </Card>
                  ))}
                  <Card
                    className="p-4 col-span-2 bg-slate-900 dark:bg-slate-800 text-white border border-slate-700 dark:border-slate-700 shadow-sm dark:shadow-none rounded-xl cursor-pointer hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                    onClick={() => {
                      const randomTicket = Math.floor(Math.random() * 10) + 1;
                      handleTicketSelect(randomTicket);
                    }}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-medium">🎲 Случайный билет</span>
                    </div>
                  </Card>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : !difficulty ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {DIFFICULTIES.map((diff) => (
                <Card
                  key={diff.id}
                  className="p-6 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none rounded-2xl cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all flex flex-col items-center text-center"
                  onClick={() => startTest(category, diff.id)}
                >
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 text-xl">
                    {diff.id === "easy" ? "🌱" : diff.id === "medium" ? "⚡" : "🔥"}
                  </div>
                  <div className="text-slate-900 dark:text-slate-50 font-semibold text-lg mb-2 flex items-center justify-center gap-2">
                    {diff.title}
                  </div>
                  {diff.recommended && (
                    <span className="text-primary dark:text-primary bg-primary/10 px-2 py-0.5 rounded-full text-xs font-medium mb-3">
                      Рекомендуется
                    </span>
                  )}
                  <div className="text-slate-500 dark:text-slate-400 text-sm mt-auto">{diff.description}</div>
                </Card>
              ))}
            </div>
            <div className="pt-4 text-center">
              <Button variant="ghost" className="rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-50" onClick={handleBackToCategories}>
                ← Вернуться к категориям
              </Button>
            </div>
          </div>
        ) : !finished ? (
          <Card className="p-6 md:p-10 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-3xl">
            <div className="flex items-center justify-between mb-6 text-slate-500 dark:text-slate-400 font-medium text-sm">
              <span className="bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                Вопрос {index + 1} из {questions.length}
              </span>
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>{score}</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-400"></span>{formatTime(timer)}</span>
                {difficulty === "hard" && (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Подсказка"
                          className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                          <Info className="w-4 h-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="rounded-xl dark:bg-slate-800 dark:text-slate-50 border-none">
                        Укажите число, месяц и год
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
            
            <Progress value={progress} className="mb-8 h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 [&>div]:bg-primary dark:[&>div]:bg-primary" />

            <div className="mb-8 py-10 px-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl text-center border border-slate-100 dark:border-slate-800">
              <p className="text-slate-400 dark:text-slate-500 text-sm font-medium mb-3 uppercase tracking-wider">К какой дате относится событие?</p>
              <h2 className="text-slate-900 dark:text-slate-50 text-2xl md:text-3xl font-bold leading-tight">
                {current.prompt}
              </h2>
            </div>

            {difficulty === "hard" ? (
              <div className="space-y-4 max-w-md mx-auto relative pb-8">
                <Input
                  autoFocus
                  placeholder="Введите дату..."
                  value={typed}
                  onChange={(e) => {
                    setTyped(e.target.value);
                    if (checked) {
                      setChecked(false);
                      setButtonDelay(0);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && typed.trim()) {
                      if (checked) handleNext();
                      else handleCheck();
                    }
                  }}
                  disabled={checked}
                  className={`text-center text-lg md:text-xl py-6 rounded-2xl transition-all duration-200 focus-visible:ring-2 ${
                    !checked
                      ? "border-slate-200 dark:border-slate-800 focus-visible:ring-primary focus-visible:border-primary dark:bg-card dark:text-slate-50"
                      : isCorrect
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 ring-emerald-500 dark:ring-emerald-400"
                        : "border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-50 ring-rose-500 dark:ring-rose-400"
                  }`}
                />
                
                {checked && !isCorrect && (
                  <div className="absolute -bottom-2 left-0 right-0 text-center animate-in fade-in slide-in-from-top-2 duration-300">
                    <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-sm font-medium shadow-sm">
                      <Check className="w-4 h-4" />
                      {current.correct}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <RadioGroup
                value={selected || ""}
                onValueChange={(val) => {
                  setSelected(val);
                  if (checked) {
                    setChecked(false);
                    setButtonDelay(0);
                  }
                }}
                disabled={checked}
                className="grid gap-3 grid-cols-1 md:grid-cols-2"
              >
                {current.options.map((opt) => {
                  const isSelected = selected === opt;
                  const isRight = checked && opt === current.correct;
                  const isWrong = checked && isSelected && !isRight;

                  return (
                    <Label
                      key={opt}
                      className={`
                        relative flex items-center justify-between p-5 md:p-6 rounded-2xl cursor-pointer
                        border-2 transition-all duration-200 hover:shadow-md
                        ${
                          checked
                            ? isRight
                              ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-50 shadow-sm"
                              : isWrong
                                ? "border-rose-500 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-50"
                                : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-card/50 text-slate-400 dark:text-slate-500 opacity-50"
                            : isSelected
                              ? "border-primary bg-primary/5 dark:bg-primary/10 text-primary dark:text-slate-50"
                              : "border-slate-200 dark:border-slate-800 bg-white dark:bg-card text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                        }
                      `}
                    >
                      <RadioGroupItem value={opt} className="sr-only" />
                      <span className="text-lg md:text-xl font-medium">{opt}</span>
                      
                      {checked && (isRight || isWrong) && (
                        <div className={`
                          flex items-center justify-center w-8 h-8 rounded-full shadow-sm shrink-0 ml-4
                          ${isRight ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"}
                        `}>
                          {isRight ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
                        </div>
                      )}
                    </Label>
                  );
                })}
              </RadioGroup>
            )}

            <div className="mt-10 flex gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => { setFinished(true); setIsTimerRunning(false); }}
                className="flex-1 rounded-2xl text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 border-slate-200 dark:border-slate-800"
              >
                Завершить
              </Button>
              <Button
                size="lg"
                onClick={checked ? handleNext : handleCheck}
                disabled={(!checked && difficulty !== "hard" && !selected) || (!checked && difficulty === "hard" && !typed.trim()) || (checked && !canProceed)}
                className={`
                  flex-1 rounded-2xl text-lg font-medium shadow-sm transition-all duration-200 relative overflow-hidden
                  ${checked && isCorrect ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                `}
              >
                {!canProceed && checked && (
                  <div
                    className="absolute left-0 top-0 h-full bg-black/10 transition-all duration-100"
                    style={{ width: `${buttonDelay}%` }}
                  />
                )}
                <span className="relative z-10">
                  {checked ? (index < questions.length - 1 ? "Дальше →" : "Завершить") : "Проверить"}
                </span>
              </Button>
            </div>
            
            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <Button variant="ghost" size="sm" className="rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" onClick={handleBackToDifficulty}>
                ← Назад к выбору сложности
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="p-8 md:p-12 bg-white dark:bg-card border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none rounded-3xl text-center">
            <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center text-5xl bg-slate-50 dark:bg-slate-800 rounded-full shadow-inner">
              {score === questions.length ? "🏆" : score > questions.length / 2 ? "👍" : "📚"}
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-50 mb-3">
              {isMarathonMode ? 'Марафон завершён' : 'Тест завершён!'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-lg mb-8">
              Ваш результат: <span className="font-semibold text-slate-900 dark:text-slate-50">{score}</span> из {questions.length} ({(score / questions.length * 100).toFixed(0)}%)
              <br />
              <span className="text-sm">Время: {formatTime(timer)}</span>
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
              <Button
                variant="outline"
                size="lg"
                onClick={handleBackToCategories}
                className="rounded-2xl border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                К категориям
              </Button>
              <Button
                size="lg"
                onClick={handleRestart}
                className="rounded-2xl gap-2 font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Пройти заново
              </Button>
              {mistakes.length > 0 ? (
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={startMarathon}
                  className="rounded-2xl gap-2 font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                >
                  <RotateCcw className="w-4 h-4" />
                  Марафон ошибок ({mistakes.length})
                </Button>
              ) : (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-block cursor-not-allowed">
                        <Button
                          variant="secondary"
                          size="lg"
                          disabled
                          className="rounded-2xl gap-2 font-medium opacity-50"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Марафон ошибок
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="dark:bg-slate-800 dark:text-slate-50 border-none">
                      У вас нет ошибок!
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </Card>
        )}
      </div>

      {!category && (
        <footer className="mt-12 text-center text-slate-400 text-sm font-medium">
          Всего дат в базе: {HISTORY_DATES.length}
        </footer>
      )}
    </div>
  );
}
