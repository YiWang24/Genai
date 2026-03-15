import Icon from "@/components/ui/Icon";

const pipelineSteps = [
  {
    icon: "photo_camera",
    title: "Scan & Perceive",
    description:
      "Upload a fridge or receipt photo. Vision + OCR converts it into structured ingredients and quantities.",
  },
  {
    icon: "hub",
    title: "Agentic Planning",
    description:
      "The planner aligns what you have with your goals, macros, dietary rules, and spoilage urgency.",
  },
  {
    icon: "task_alt",
    title: "Reflect & Execute",
    description:
      "Receive a verified plan with recipe steps, nutrition summary, and a grocery list for missing items.",
  },
];

const featureCards = [
  {
    icon: "monitoring",
    title: "Macro Optimization",
    description:
      "Automatically balances calories, protein, carbs, and fats against your target profile.",
  },
  {
    icon: "eco",
    title: "Waste Reduction",
    description:
      "Prioritizes expiring ingredients first to reduce food waste and save grocery spend.",
  },
  {
    icon: "health_and_safety",
    title: "Allergy Compliance",
    description:
      "Runs hard constraint checks against allergies and dietary restrictions before recommendations.",
  },
  {
    icon: "event_available",
    title: "Smart Scheduling",
    description:
      "Builds prep windows and execution tasks so your plan fits real kitchen time constraints.",
  },
];

const useCases = [
  {
    icon: "work",
    title: "Busy professionals",
    description: "Spend less time deciding what to cook and more time shipping work.",
  },
  {
    icon: "fitness_center",
    title: "Fitness enthusiasts",
    description: "Stay on macro targets with meal recommendations tuned to training goals.",
  },
  {
    icon: "savings",
    title: "Budget-conscious households",
    description:
      "Lower grocery waste and reduce unnecessary purchases with inventory-aware planning.",
  },
];

export default function FeaturesGrid() {
  return (
    <section
      id="how-it-works"
      className="bg-slate-50 px-6 pb-24 pt-28 dark:bg-slate-900/30 lg:px-20"
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex flex-col gap-4 text-center lg:text-left">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            How It Works
          </p>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 lg:text-4xl">
            Your agentic nutrition pipeline in 3 steps
          </h2>
          <p className="max-w-3xl text-lg text-slate-600 dark:text-slate-400">
            We translate scans and goals into an actionable meal decision flow:
            perceive, plan, and execute.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {pipelineSteps.map(({ icon, title, description }, index) => (
            <div
              key={title}
              className="group relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-8 transition-all hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 dark:border-slate-800 dark:bg-slate-800/50"
            >
              <span className="absolute right-6 top-6 text-xs font-bold text-slate-300">
                0{index + 1}
              </span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                <Icon name={icon} className="text-2xl" />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-10 mt-24 flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Feature Toolbox
          </p>
          <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Built to optimize nutrition decisions automatically
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {featureCards.map(({ icon, title, description }) => (
            <div
              key={title}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-800/50"
            >
              <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon name={icon} className="text-2xl" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {title}
                </h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8 mt-24 flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            Use Cases
          </p>
          <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Designed for real-world meal planning pressure
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {useCases.map(({ icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-800/50"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                <Icon name={icon} className="text-2xl" />
              </div>
              <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {title}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
