"use client";

import {
  IconArrowLeft,
  IconArrowRight,
  IconBarbell,
  IconBike,
  IconCalendarEvent,
  IconCircleCheck,
  IconClock,
  IconPlus,
  IconSwimming,
  IconTargetArrow,
  IconTreadmill,
  IconX,
  IconYoga,
} from "@tabler/icons-react";
import axios from "axios";
import {
  ClipboardEvent,
  ComponentType,
  KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "/api";

type ActivityTypeId = "run" | "bike" | "swim" | "yoga" | "strength";
type ExerciseStatus = "planned" | "in_progress" | "done" | "skipped";
type IconComponent = ComponentType<{
  className?: string;
  size?: number | string;
  stroke?: number | string;
}>;

type UnitForms = {
  one: string;
  few: string;
  many: string;
};

type ActivityType = {
  id: ActivityTypeId;
  label: string;
  unitForms: UnitForms;
  icon: IconComponent;
};

type Exercise = {
  id: string;
  type: ActivityTypeId;
  title: string;
  target: number;
  progress: number;
};

type ExerciseApiItem = {
  id: string;
  date: string;
  type: string;
  title: string;
  target: number;
  progress: number;
};

const ACTIVITY_TYPES: ActivityType[] = [
  {
    id: "run",
    label: "Бег",
    unitForms: { one: "км", few: "км", many: "км" },
    icon: IconTreadmill,
  },
  {
    id: "bike",
    label: "Велосипед",
    unitForms: { one: "км", few: "км", many: "км" },
    icon: IconBike,
  },
  {
    id: "swim",
    label: "Плавание",
    unitForms: { one: "мин.", few: "мин.", many: "мин." },
    icon: IconSwimming,
  },
  {
    id: "yoga",
    label: "Йога",
    unitForms: { one: "мин.", few: "мин.", many: "мин." },
    icon: IconYoga,
  },
  {
    id: "strength",
    label: "Силовая",
    unitForms: {
      one: "повторение",
      few: "повторения",
      many: "повторений",
    },
    icon: IconBarbell,
  },
];

const STATUS_LABELS: Record<ExerciseStatus, string> = {
  planned: "Запланировано",
  in_progress: "В процессе",
  done: "Выполнено",
  skipped: "Пропущено",
};

const STATUS_ICONS: Record<ExerciseStatus, IconComponent> = {
  planned: IconCalendarEvent,
  in_progress: IconClock,
  done: IconCircleCheck,
  skipped: IconX,
};

function isActivityTypeId(value: string): value is ActivityTypeId {
  return (
    value === "run" ||
    value === "bike" ||
    value === "swim" ||
    value === "yoga" ||
    value === "strength"
  );
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function buildMonthDays(monthDate: Date): Date[] {
  const startOfMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth(),
    1,
  );
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  ).getDate();
  const firstWeekday = (startOfMonth.getDay() + 6) % 7;
  const calendarStart = new Date(startOfMonth);
  calendarStart.setDate(startOfMonth.getDate() - firstWeekday);
  const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const day = new Date(calendarStart);
    day.setDate(calendarStart.getDate() + index);
    return day;
  });
}

function getExerciseStatus(
  progress: number,
  target: number,
  dateKey: string,
  todayKey: string,
): ExerciseStatus {
  if (progress >= target) {
    return "done";
  }

  if (dateKey < todayKey) {
    return "skipped";
  }

  if (progress <= 0) {
    return "planned";
  }

  return "in_progress";
}

function isAllowedNumberInput(value: string, allowDecimal: boolean): boolean {
  const normalized = value.replace(",", ".");
  return allowDecimal
    ? /^\d*(\.\d*)?$/.test(normalized)
    : /^\d*$/.test(normalized);
}

function getPluralForm(value: number): keyof UnitForms {
  if (!Number.isInteger(value)) {
    return "many";
  }

  const abs = Math.abs(value);
  const lastTwo = abs % 100;
  const last = abs % 10;

  if (lastTwo >= 11 && lastTwo <= 14) {
    return "many";
  }

  if (last === 1) {
    return "one";
  }

  if (last >= 2 && last <= 4) {
    return "few";
  }

  return "many";
}

function getUnitLabel(type: ActivityType | undefined, value: number): string {
  if (!type) {
    return "";
  }

  return type.unitForms[getPluralForm(value)];
}

function mapApiExercise(
  item: ExerciseApiItem,
): { date: string; exercise: Exercise } | null {
  if (!isActivityTypeId(item.type)) {
    return null;
  }

  const target = Number(item.target);
  const progress = Number(item.progress);
  if (!Number.isFinite(target) || target <= 0 || !Number.isFinite(progress)) {
    return null;
  }

  return {
    date: item.date,
    exercise: {
      id: item.id,
      type: item.type,
      title: item.title,
      target,
      progress: Math.max(0, progress),
    },
  };
}

function groupExercisesByDate(
  items: ExerciseApiItem[],
): Record<string, Exercise[]> {
  const grouped: Record<string, Exercise[]> = {};

  for (const item of items) {
    const mapped = mapApiExercise(item);
    if (!mapped) {
      continue;
    }

    grouped[mapped.date] ??= [];
    grouped[mapped.date].push(mapped.exercise);
  }

  return grouped;
}

function readApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const payload = error.response?.data as
      | {
          message?: string;
          title?: string;
          detail?: string;
          errors?: Record<string, string[]>;
        }
      | undefined;

    if (payload?.message) {
      return payload.message;
    }

    if (payload?.detail) {
      return payload.detail;
    }

    if (payload?.title) {
      return payload.title;
    }

    if (payload?.errors) {
      const firstError = Object.values(payload.errors).flat()[0];
      if (firstError) {
        return firstError;
      }
    }

    if (error.response?.status) {
      return `${fallback} (HTTP ${error.response.status})`;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function Home() {
  const now = useMemo(() => new Date(), []);
  const todayKey = toDateKey(now);

  const [monthCursor, setMonthCursor] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1),
  );
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [exercisesByDay, setExercisesByDay] = useState<
    Record<string, Exercise[]>
  >({});
  const [newType, setNewType] = useState<ActivityTypeId>("run");
  const [newTarget, setNewTarget] = useState("5");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const monthDays = useMemo(() => buildMonthDays(monthCursor), [monthCursor]);
  const monthFromKey = monthDays.length > 0 ? toDateKey(monthDays[0]) : "";
  const monthToKey =
    monthDays.length > 0 ? toDateKey(monthDays[monthDays.length - 1]) : "";

  const selectedDate = fromDateKey(selectedDateKey);
  const selectedExercises = exercisesByDay[selectedDateKey] ?? [];
  const targetPreviewValue = Number(newTarget.replace(",", "."));
  const unitPreviewValue =
    Number.isFinite(targetPreviewValue) && targetPreviewValue > 0
      ? targetPreviewValue
      : 1;

  useEffect(() => {
    if (!monthFromKey || !monthToKey) {
      return;
    }

    let isCancelled = false;

    async function loadMonthExercises() {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const response = await axios.get<ExerciseApiItem[]>(
          `${API_BASE_URL}/exercises?from=${encodeURIComponent(monthFromKey)}&to=${encodeURIComponent(monthToKey)}`,
        );
        const payload = response.data;
        if (!isCancelled) {
          setExercisesByDay(groupExercisesByDate(payload));
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            `Не удалось загрузить упражнения из базы данных: ${readApiError(error, "Failed to load exercises.")}`,
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadMonthExercises();

    return () => {
      isCancelled = true;
    };
  }, [monthFromKey, monthToKey]);

  function shiftMonth(step: number) {
    setMonthCursor(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + step, 1),
    );
  }

  function handleProgressChange(exerciseId: string, progress: number) {
    const nextProgress = Math.max(progress, 0);

    setExercisesByDay((prev) => ({
      ...prev,
      [selectedDateKey]: (prev[selectedDateKey] ?? []).map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, progress: nextProgress }
          : exercise,
      ),
    }));

    void (async () => {
      try {
        const response = await axios.patch<ExerciseApiItem>(
          `${API_BASE_URL}/exercises/${exerciseId}/progress`,
          { progress: nextProgress },
          { headers: { "Content-Type": "application/json" } },
        );
        const updated = response.data;
        const mapped = mapApiExercise(updated);
        if (!mapped) {
          return;
        }

        setExercisesByDay((prev) => ({
          ...prev,
          [mapped.date]: (prev[mapped.date] ?? []).map((exercise) =>
            exercise.id === mapped.exercise.id ? mapped.exercise : exercise,
          ),
        }));
      } catch (error) {
        setErrorMessage(
          `Не удалось сохранить прогресс упражнения: ${readApiError(error, "Failed to update exercise progress.")}`,
        );
      }
    })();
  }

  async function handleAddExercise() {
    const type = ACTIVITY_TYPES.find((item) => item.id === newType);
    const normalizedTarget = Number(newTarget.replace(",", "."));
    const target = Math.max(normalizedTarget, 1);

    if (!type || !Number.isFinite(normalizedTarget)) {
      setErrorMessage("Цель упражнения должна быть числом.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const response = await axios.post<ExerciseApiItem>(
        `${API_BASE_URL}/exercises`,
        {
          date: selectedDateKey,
          type: type.id,
          title: `${type.label} тренировка`,
          target,
        },
        { headers: { "Content-Type": "application/json" } },
      );

      const created = response.data;
      const mapped = mapApiExercise(created);
      if (!mapped) {
        throw new Error("Created payload has invalid format.");
      }

      setExercisesByDay((prev) => ({
        ...prev,
        [mapped.date]: [...(prev[mapped.date] ?? []), mapped.exercise],
      }));

      setNewTarget(String(target));
    } catch (error) {
      setErrorMessage(
        `Не удалось добавить упражнение: ${readApiError(error, "Failed to add exercise.")}`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleTargetInputKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    allowDecimal: boolean,
  ) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }

    const allowedKeys = new Set([
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ]);

    if (allowedKeys.has(event.key)) {
      return;
    }

    if (/^\d$/.test(event.key)) {
      return;
    }

    if (allowDecimal && (event.key === "." || event.key === ",")) {
      const current = event.currentTarget.value;
      if (!current.includes(".") && !current.includes(",")) {
        return;
      }
    }

    event.preventDefault();
  }

  function handleTargetInputPaste(
    event: ClipboardEvent<HTMLInputElement>,
    allowDecimal: boolean,
  ) {
    const pastedText = event.clipboardData.getData("text");
    if (!isAllowedNumberInput(pastedText, allowDecimal)) {
      event.preventDefault();
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl border border-slate-900/10 bg-white/85 p-5 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] backdrop-blur sm:p-7">
          <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                План тренировок
              </p>
              <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                Спортивный календарь
              </h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <IconArrowLeft size={16} />
              </button>
              <p className="min-w-36 text-center text-sm font-semibold capitalize text-slate-900">
                {formatMonth(monthCursor)}
              </p>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                <IconArrowRight size={16} />
              </button>
            </div>
          </header>

          <div className="mb-3 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 sm:text-sm">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
              <span key={day} className="py-2">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {monthDays.map((day) => {
              const key = toDateKey(day);
              const isCurrentMonth = day.getMonth() === monthCursor.getMonth();
              const isSelected = key === selectedDateKey;
              const isToday = key === todayKey;
              const exercisesCount = exercisesByDay[key]?.length ?? 0;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDateKey(key)}
                  className={[
                    "relative flex min-h-19.5 cursor-pointer flex-col justify-between rounded-2xl border p-2 text-left transition sm:min-h-23",
                    isCurrentMonth
                      ? "border-slate-200 bg-white hover:border-slate-400"
                      : "border-slate-100 bg-slate-50/60 text-slate-400",
                    isSelected
                      ? "border-amber-400 ring-2 ring-amber-300/70"
                      : "ring-0",
                    isToday
                      ? "outline-2 outline-offset-2 outline-cyan-500"
                      : "",
                  ].join(" ")}
                >
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold sm:text-base">
                      {day.getDate()}
                    </span>
                    {exercisesCount > 0 && (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[11px] font-bold text-white">
                        {exercisesCount}
                      </span>
                    )}
                  </div>
                  {isToday && (
                    <span className="inline-block rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-semibold text-white sm:text-[11px]">
                      Сегодня
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-900/10 bg-white/90 p-5 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.35)] backdrop-blur sm:p-7">
          <header className="mb-6">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
              Управление
            </p>
            <h2 className="mt-1 text-2xl font-semibold capitalize text-slate-900">
              {formatDate(selectedDate)}
            </h2>
          </header>

          {errorMessage && (
            <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {errorMessage}
            </p>
          )}

          {isLoading ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              Загружаем упражнения...
            </p>
          ) : selectedExercises.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
              На этот день пока нет упражнений. Добавьте активность ниже.
            </p>
          ) : (
            <ul className="space-y-3">
              {selectedExercises.map((exercise) => {
                const type = ACTIVITY_TYPES.find(
                  (item) => item.id === exercise.type,
                );
                const TypeIcon = type?.icon ?? IconTargetArrow;
                const status = getExerciseStatus(
                  exercise.progress,
                  exercise.target,
                  selectedDateKey,
                  todayKey,
                );
                const StatusIcon = STATUS_ICONS[status];
                const unit = getUnitLabel(type, exercise.target);
                const progressPct = Math.min(
                  (exercise.progress / exercise.target) * 100,
                  100,
                );

                return (
                  <li
                    key={exercise.id}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-semibold text-slate-900">
                          <TypeIcon
                            size={18}
                            className="shrink-0 text-cyan-700"
                          />
                          <span className="truncate">{exercise.title}</span>
                        </p>
                        <p className="text-sm text-slate-500">
                          {type?.label} • {exercise.progress}/{exercise.target}{" "}
                          {unit}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                        <StatusIcon size={16} />
                        {STATUS_LABELS[status]}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                        <span>Прогресс</span>
                        <span>
                          {exercise.progress}/{exercise.target} {unit}
                        </span>
                      </div>
                      <div className="relative h-8 overflow-hidden rounded-lg border border-slate-200 bg-slate-200 focus-within:ring-2 focus-within:ring-cyan-300">
                        <div
                          className="absolute inset-y-0 left-0 bg-cyan-600"
                          style={{ width: `${progressPct}%` }}
                        />
                        <input
                          type="range"
                          min={0}
                          max={exercise.target}
                          step={exercise.type === "strength" ? 1 : 0.5}
                          value={exercise.progress}
                          onChange={(event) =>
                            handleProgressChange(
                              exercise.id,
                              Number(event.target.value),
                            )
                          }
                          className="progress-slider absolute inset-0 z-10 h-full w-full cursor-pointer bg-transparent opacity-0"
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <form
            className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void handleAddExercise();
            }}
          >
            <h3 className="mb-4 text-base font-semibold text-slate-900">
              <span className="inline-flex items-center gap-2">
                <IconPlus size={18} />
                Добавить упражнение
              </span>
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Тип активности
                <select
                  value={newType}
                  onChange={(event) =>
                    setNewType(event.target.value as ActivityTypeId)
                  }
                  className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-amber-300 focus:ring-2"
                >
                  {ACTIVITY_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label} ({getUnitLabel(type, unitPreviewValue)})
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Цель
                <input
                  type="number"
                  min={1}
                  step={newType === "strength" ? 1 : 0.5}
                  value={newTarget}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    const allowDecimal = newType !== "strength";

                    if (nextValue === "") {
                      setNewTarget("");
                      return;
                    }

                    if (isAllowedNumberInput(nextValue, allowDecimal)) {
                      setNewTarget(nextValue.replace(",", "."));
                    }
                  }}
                  onKeyDown={(event) =>
                    handleTargetInputKeyDown(event, newType !== "strength")
                  }
                  onPaste={(event) =>
                    handleTargetInputPaste(event, newType !== "strength")
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-amber-300 focus:ring-2"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="mt-4 w-full cursor-pointer rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              {isSaving ? "Сохраняем..." : "Добавить в день"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
