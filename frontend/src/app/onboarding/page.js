"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import ProgressStepper from "@/components/onboarding/ProgressStepper";
import {
  getCurrentUserId,
  getGoals,
  getProfile,
  hasAuthSession,
  upsertGoals,
  upsertProfile,
} from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import {
  calculateNutritionTargets,
  inferGoalType,
} from "@/lib/nutrition-targets.mjs";

const GOAL_OPTIONS = [
  {
    key: "lose_weight",
    title: "Cut calories, keep muscle",
    description: "Moderate calorie deficit with higher protein to support satiety and retention.",
    icon: "trending_down",
  },
  {
    key: "gain_muscle",
    title: "Fuel muscle gain",
    description: "Small calorie surplus with stronger protein support for training recovery.",
    icon: "fitness_center",
  },
  {
    key: "maintenance",
    title: "Stay balanced",
    description: "Maintain current weight with steady macros for everyday performance.",
    icon: "balance",
  },
];

const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const ACTIVITY_OPTIONS = [
  {
    value: "sedentary",
    label: "Sedentary",
    description: "Desk-heavy days, minimal exercise.",
  },
  {
    value: "light",
    label: "Lightly active",
    description: "Light movement or 1-3 workouts each week.",
  },
  {
    value: "moderate",
    label: "Moderately active",
    description: "Regular training or daily movement.",
  },
  {
    value: "very_active",
    label: "Very active",
    description: "Physically demanding days or intense training.",
  },
];

const DIET_OPTIONS = [
  { value: "no_specific_diet", label: "No specific diet" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
  { value: "gluten_free", label: "Gluten-free" },
  { value: "dairy_free", label: "Dairy-free" },
  { value: "low_sodium", label: "Low sodium" },
  { value: "mediterranean", label: "Mediterranean" },
];

const ALLERGY_OPTIONS = [
  { value: "peanut", label: "Peanut" },
  { value: "tree_nut", label: "Tree nut" },
  { value: "milk", label: "Milk" },
  { value: "egg", label: "Egg" },
  { value: "fish", label: "Fish" },
  { value: "shellfish", label: "Shellfish" },
  { value: "sesame", label: "Sesame" },
  { value: "soy", label: "Soy" },
  { value: "wheat", label: "Wheat/Gluten" },
  { value: "mustard", label: "Mustard" },
  { value: "sulphites", label: "Sulphites" },
];

const PREVIEW_FIELD_LABELS = {
  biologicalSex: "sex at birth",
  age: "age",
  heightCm: "height",
  weightKg: "weight",
};

function formatList(values, options) {
  if (!values?.length) return "None selected";
  const map = new Map(options.map((item) => [item.value, item.label]));
  return values.map((value) => map.get(value) || value).join(", ");
}

function PreviewMetric({ label, value, accentClass = "text-slate-900", suffix = "" }) {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/20 px-4 py-3 backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">{label}</p>
      <p className={`mt-2 text-2xl font-black tracking-tight ${accentClass}`}>
        {value}
        {suffix}
      </p>
    </div>
  );
}

function PillButton({ active, onClick, children, activeClassName, inactiveClassName = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition ${
        active ? activeClassName : inactiveClassName
      }`}
    >
      {children}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const userId = getCurrentUserId();
  const [goalType, setGoalType] = useState("lose_weight");
  const [form, setForm] = useState({
    age: "",
    biological_sex: "",
    height_cm: "",
    weight_kg: "",
    activity_level: "moderate",
    dietary_preferences: [],
    allergies: [],
    cook_time_preference_minutes: 30,
    budget_limit: 30,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!hasAuthSession()) {
      router.replace(`${ROUTES.auth}?mode=login`);
      return;
    }
    setAuthorized(true);
  }, [router]);

  useEffect(() => {
    if (!authorized) return;
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [profile, goals] = await Promise.all([
          getProfile(userId).catch(() => null),
          getGoals(userId).catch(() => null),
        ]);

        if (!active) return;

        if (profile) {
          setForm((prev) => ({
            ...prev,
            age: profile.age ?? "",
            biological_sex: profile.biological_sex || "",
            height_cm: profile.height_cm ?? "",
            weight_kg: profile.weight_kg ?? "",
            activity_level: profile.activity_level || prev.activity_level,
            dietary_preferences: profile.dietary_preferences || [],
            allergies: profile.allergies || [],
            cook_time_preference_minutes:
              profile.cook_time_preference_minutes || prev.cook_time_preference_minutes,
          }));
        }

        if (goals) {
          if (profile) {
            setGoalType(
              inferGoalType(
                { caloriesTarget: goals.calories_target },
                {
                  age: profile.age,
                  heightCm: profile.height_cm,
                  weightKg: profile.weight_kg,
                  biologicalSex: profile.biological_sex,
                  activityLevel: profile.activity_level,
                },
              ),
            );
          }

          setForm((prev) => ({
            ...prev,
            dietary_preferences:
              prev.dietary_preferences.length > 0
                ? prev.dietary_preferences
                : goals.dietary_restrictions || [],
            allergies: prev.allergies.length > 0 ? prev.allergies : goals.allergies || [],
            budget_limit: goals.budget_limit ?? prev.budget_limit,
            cook_time_preference_minutes:
              goals.max_cook_time_minutes ?? prev.cook_time_preference_minutes,
          }));
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || "Failed to load onboarding data");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [authorized, userId]);

  const preview = useMemo(
    () =>
      calculateNutritionTargets({
        age: form.age,
        biologicalSex: form.biological_sex,
        heightCm: form.height_cm,
        weightKg: form.weight_kg,
        activityLevel: form.activity_level,
        goalType,
      }),
    [form.age, form.biological_sex, form.height_cm, form.weight_kg, form.activity_level, goalType],
  );

  const readinessCopy = preview.ready
    ? "Evidence-based target calculated from your profile."
    : `Add ${preview.missingFields.map((field) => PREVIEW_FIELD_LABELS[field]).join(", ")} to unlock the live target.`;

  const canSubmit = preview.ready && !saving && !loading;
  const dietSummary = formatList(form.dietary_preferences, DIET_OPTIONS);
  const allergySummary = formatList(form.allergies, ALLERGY_OPTIONS);
  const selectedGoal = GOAL_OPTIONS.find((item) => item.key === goalType) || GOAL_OPTIONS[0];

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleInList(field, value) {
    setForm((prev) => {
      const exists = prev[field].includes(value);
      return {
        ...prev,
        [field]: exists ? prev[field].filter((item) => item !== value) : [...prev[field], value],
      };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;

    if (!preview.ready) {
      setError("Age, sex at birth, height, and weight are required for a scientific target.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const profilePayload = {
        age: Number(form.age),
        biological_sex: form.biological_sex,
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
        activity_level: form.activity_level || null,
        dietary_preferences: form.dietary_preferences,
        allergies: form.allergies,
        cook_time_preference_minutes: Number(form.cook_time_preference_minutes) || null,
      };

      const goalsPayload = {
        calories_target: preview.caloriesTarget,
        protein_g_target: preview.proteinGTarget,
        carbs_g_target: preview.carbsGTarget,
        fat_g_target: preview.fatGTarget,
        dietary_restrictions: form.dietary_preferences,
        allergies: form.allergies,
        budget_limit: Number(form.budget_limit) || null,
        max_cook_time_minutes: Number(form.cook_time_preference_minutes) || null,
      };

      await upsertProfile(userId, profilePayload);
      await upsertGoals(userId, goalsPayload);

      router.push("/dashboard");
    } catch (err) {
      setError(err.message || "Failed to save onboarding profile");
    } finally {
      setSaving(false);
    }
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Checking session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,_#ecfdf5_0%,_#f7fdf9_40%,_#f0fdf4_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[34px] border border-white/70 bg-white/70 px-6 py-8 shadow-[0_30px_120px_-55px_rgba(15,23,42,0.4)] backdrop-blur xl:px-10">
          <div className="pointer-events-none absolute -left-24 top-8 h-56 w-56 rounded-full bg-emerald-200/45 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-sky-200/35 blur-3xl" />

          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
                <Icon name="neurology" className="text-base text-emerald-600" />
                Smart target setup
              </div>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                  Build a nutrition profile that actually reacts to your body.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
                  We calculate your daily calorie and macro preview from Health Canada energy equations,
                  your activity, and the goal you choose here. No more fixed placeholders.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.8)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Formula base</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">EER + AMDR</p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-4 shadow-[0_18px_42px_-36px_rgba(15,23,42,0.8)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Goal mode</p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{selectedGoal.title}</p>
                </div>
                <div className="rounded-2xl border border-white/80 bg-gradient-to-br from-emerald-500 to-emerald-400 px-4 py-4 text-white shadow-[0_24px_48px_-32px_rgba(34,197,94,0.7)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-50/80">Preview status</p>
                  <p className="mt-2 text-lg font-bold">{preview.ready ? "Live" : "Waiting on inputs"}</p>
                </div>
              </div>
            </div>

            <div className="w-full max-w-md rounded-[28px] border border-emerald-200/60 bg-gradient-to-br from-emerald-600 to-teal-600 px-6 py-5 text-white shadow-[0_24px_64px_-34px_rgba(16,185,129,0.5)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/80">
                    Daily target preview
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight">
                    {preview.ready ? preview.caloriesTarget : "--"} kcal
                  </p>
                </div>
                <div className="rounded-2xl bg-white/20 px-3 py-2 text-right">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Goal shift</p>
                  <p className="mt-1 text-lg font-bold">
                    {preview.ready ? `${preview.calorieDelta > 0 ? "+" : ""}${preview.calorieDelta}` : "--"}
                  </p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/20 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Protein</p>
                  <p className="mt-2 text-xl font-black">{preview.ready ? preview.proteinGTarget : "--"}g</p>
                </div>
                <div className="rounded-2xl bg-white/20 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Carbs</p>
                  <p className="mt-2 text-xl font-black">{preview.ready ? preview.carbsGTarget : "--"}g</p>
                </div>
                <div className="rounded-2xl bg-white/20 px-3 py-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Fat</p>
                  <p className="mt-2 text-xl font-black">{preview.ready ? preview.fatGTarget : "--"}g</p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-6 text-emerald-100/90">{readinessCopy}</p>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.75fr)]">
          <div className="space-y-6">
            <ProgressStepper step={1} totalSteps={2} labels={["Fill Form", "Complete"]} />

            <form onSubmit={handleSubmit} className="space-y-6">
              <section className="rounded-[30px] border border-white/80 bg-white/80 p-6 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.7)] backdrop-blur sm:p-8">
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                      <Icon name="person" className="text-[26px]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Body inputs</p>
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">Tell us about your baseline</h2>
                    </div>
                  </div>
                  <p className="text-sm leading-7 text-slate-600">
                    Age, sex at birth, height, and weight are required because the daily target is calculated from an
                    evidence-based energy estimate, not a static template.
                  </p>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-700">Age *</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.age}
                      onChange={(e) => setField("age", e.target.value)}
                      placeholder="e.g. 29"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-700">Sex at birth *</span>
                    <div className="grid grid-cols-2 gap-3">
                      {SEX_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setField("biological_sex", option.value)}
                          className={`rounded-2xl border px-4 py-3 text-left font-semibold transition ${
                            form.biological_sex === option.value
                              ? "border-emerald-500 bg-emerald-500 text-white shadow-[0_16px_36px_-26px_rgba(34,197,94,0.9)]"
                              : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-white"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-700">Height (cm) *</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.height_cm}
                      onChange={(e) => setField("height_cm", e.target.value)}
                      placeholder="175"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-700">Weight (kg) *</span>
                    <input
                      type="number"
                      min="1"
                      required
                      value={form.weight_kg}
                      onChange={(e) => setField("weight_kg", e.target.value)}
                      placeholder="72"
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>
                </div>

                <div className="mt-6">
                  <p className="text-sm font-semibold text-slate-700">Activity level</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {ACTIVITY_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setField("activity_level", option.value)}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          form.activity_level === option.value
                            ? "border-sky-400 bg-sky-50 shadow-[0_16px_36px_-28px_rgba(56,189,248,0.9)]"
                            : "border-slate-200 bg-white hover:border-sky-200 hover:bg-slate-50"
                        }`}
                      >
                        <p className="font-bold text-slate-900">{option.label}</p>
                        <p className="mt-1 text-sm leading-6 text-slate-600">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="rounded-[30px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.7)] backdrop-blur sm:p-8">
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-sky-100 p-3 text-sky-700">
                      <Icon name="flag" className="text-[26px]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Goal tuning</p>
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">Choose how the target should move</h2>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {GOAL_OPTIONS.map((goal) => (
                    <button
                      type="button"
                      key={goal.key}
                      onClick={() => setGoalType(goal.key)}
                      className={`rounded-[24px] border px-5 py-5 text-left transition ${
                        goalType === goal.key
                          ? "border-emerald-400 bg-gradient-to-br from-emerald-500 to-emerald-400 text-white shadow-[0_22px_40px_-28px_rgba(34,197,94,0.8)]"
                          : "border-slate-200 bg-slate-50 text-slate-900 hover:border-emerald-200 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Icon
                          name={goal.icon}
                          className={`text-[28px] ${goalType === goal.key ? "text-white" : "text-emerald-600"}`}
                        />
                        {goalType === goal.key && (
                          <span className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.22em]">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="mt-4 text-lg font-black tracking-tight">{goal.title}</p>
                      <p className={`mt-2 text-sm leading-6 ${goalType === goal.key ? "text-emerald-50/90" : "text-slate-600"}`}>
                        {goal.description}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-[30px] border border-white/80 bg-white/85 p-6 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.7)] backdrop-blur sm:p-8">
                <div className="flex flex-col gap-2 border-b border-slate-100 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-orange-100 p-3 text-orange-700">
                      <Icon name="restaurant_menu" className="text-[26px]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Constraints</p>
                      <h2 className="text-2xl font-black tracking-tight text-slate-950">Diet, allergies, and planning guardrails</h2>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-8 xl:grid-cols-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Dietary preferences</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {DIET_OPTIONS.map((item) => (
                        <PillButton
                          key={item.value}
                          active={form.dietary_preferences.includes(item.value)}
                          onClick={() => toggleInList("dietary_preferences", item.value)}
                          activeClassName="border-emerald-500 bg-emerald-500 text-white shadow-[0_14px_28px_-22px_rgba(34,197,94,0.9)]"
                          inactiveClassName="border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-white"
                        >
                          {item.label}
                        </PillButton>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-700">Allergies</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ALLERGY_OPTIONS.map((item) => (
                        <PillButton
                          key={item.value}
                          active={form.allergies.includes(item.value)}
                          onClick={() => toggleInList("allergies", item.value)}
                          activeClassName="border-rose-500 bg-rose-500 text-white shadow-[0_14px_28px_-22px_rgba(244,63,94,0.9)]"
                          inactiveClassName="border-slate-200 bg-slate-50 text-slate-700 hover:border-rose-200 hover:bg-white"
                        >
                          {item.label}
                        </PillButton>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid gap-5 md:grid-cols-2">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-700">Max cooking time (minutes)</span>
                    <input
                      type="number"
                      min="5"
                      max="180"
                      value={form.cook_time_preference_minutes}
                      onChange={(e) => setField("cook_time_preference_minutes", e.target.value)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-slate-700">Weekly grocery budget ($)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={form.budget_limit}
                      onChange={(e) => setField("budget_limit", e.target.value)}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 transition focus:border-emerald-400 focus:bg-white"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-[30px] border border-emerald-200/50 bg-gradient-to-br from-emerald-600 to-teal-600 p-6 text-white shadow-[0_24px_72px_-40px_rgba(16,185,129,0.5)] sm:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-100/80">Ready to save</p>
                    <h2 className="mt-2 text-3xl font-black tracking-tight">Lock in your personalized nutrition profile.</h2>
                    <p className="mt-3 text-sm leading-7 text-white/80">
                      This saves both your body profile and your current nutrition constraints, so the planner,
                      dashboard, and recipes all work from the same target.
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex min-w-[240px] items-center justify-center rounded-2xl bg-white px-8 py-4 text-lg font-black text-emerald-700 shadow-[0_16px_36px_-20px_rgba(0,0,0,0.25)] transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/30 disabled:text-white/50"
                  >
                    {saving ? "Saving..." : loading ? "Loading..." : "Create My Nutrition Profile"}
                  </button>
                </div>

                {error && (
                  <div className="mt-5 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                    {error}
                  </div>
                )}
              </section>
            </form>
          </div>

          <aside className="lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-[32px] border border-white/80 bg-white/85 p-6 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.8)] backdrop-blur sm:p-7">
              <div className="rounded-[28px] bg-gradient-to-br from-emerald-600 to-teal-600 p-5 text-white shadow-[0_26px_60px_-38px_rgba(16,185,129,0.5)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100/80">
                      Live nutrition preview
                    </p>
                    <p className="mt-2 text-4xl font-black tracking-tight">
                      {preview.ready ? preview.caloriesTarget : "--"}
                    </p>
                    <p className="mt-1 text-sm text-white/70">Daily calories</p>
                  </div>
                  <div className="rounded-2xl bg-white/20 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Maintenance</p>
                    <p className="mt-1 text-lg font-bold">{preview.ready ? preview.maintenanceCalories : "--"} kcal</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <PreviewMetric label="Protein" value={preview.ready ? preview.proteinGTarget : "--"} suffix="g" accentClass="text-white" />
                  <PreviewMetric label="Carbs" value={preview.ready ? preview.carbsGTarget : "--"} suffix="g" accentClass="text-white" />
                  <PreviewMetric label="Fat" value={preview.ready ? preview.fatGTarget : "--"} suffix="g" accentClass="text-white" />
                </div>

                <div className="mt-5 rounded-2xl border border-white/20 bg-white/15 px-4 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/80">Goal adjustment</span>
                    <span className="font-bold text-white">
                      {preview.ready ? `${preview.calorieDelta > 0 ? "+" : ""}${preview.calorieDelta} kcal/day` : "--"}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
                    <div
                      className={`h-full rounded-full ${
                        goalType === "gain_muscle"
                          ? "bg-sky-300"
                          : goalType === "maintenance"
                            ? "bg-white"
                            : "bg-emerald-200"
                      }`}
                      style={{ width: preview.ready ? `${Math.min(100, Math.max(18, Math.abs(preview.calorieDelta) / 6))}%` : "18%" }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">What feeds the formula</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-sm text-slate-500">Goal mode</p>
                      <p className="mt-1 font-bold text-slate-900">{selectedGoal.title}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3">
                      <p className="text-sm text-slate-500">Activity</p>
                      <p className="mt-1 font-bold text-slate-900">
                        {ACTIVITY_OPTIONS.find((option) => option.value === form.activity_level)?.label || "Moderately active"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 sm:col-span-2">
                      <p className="text-sm text-slate-500">Dietary preferences</p>
                      <p className="mt-1 font-semibold text-slate-900">{dietSummary}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-4 py-3 sm:col-span-2">
                      <p className="text-sm text-slate-500">Allergies</p>
                      <p className="mt-1 font-semibold text-slate-900">{allergySummary}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/80 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white p-3 text-emerald-600">
                      <Icon name="science" className="text-[24px]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">Scientific basis</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        Energy is estimated with adult EER equations from Health Canada&apos;s DRI guidance. Macro
                        targets are then distributed within AMDR ranges with a higher protein floor for your chosen goal.
                      </p>
                    </div>
                  </div>
                </div>

                {!preview.ready && (
                  <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5">
                    <p className="text-sm font-bold text-amber-900">Still missing</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {preview.missingFields.map((field) => (
                        <span
                          key={field}
                          className="rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-800"
                        >
                          {PREVIEW_FIELD_LABELS[field]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
