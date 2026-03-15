import Button from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants";

export default function CtaSection() {
  return (
    <section id="cta" className="px-6 py-20 lg:px-20">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900 dark:bg-primary/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent" />
        <div className="relative px-8 py-16 lg:p-20 flex flex-col items-center text-center gap-8">
          <h2 className="max-w-2xl text-4xl font-black tracking-tight text-white lg:text-5xl">
            Ready to plan meals from what is already in your kitchen?
          </h2>
          <p className="max-w-xl text-lg text-slate-300 lg:text-xl">
            Start with one fridge scan, set your targets, and get a practical
            meal plan in minutes. Early access is open.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              href={`${ROUTES.auth}?mode=register`}
              variant="primary"
              size="lg"
              className="!bg-primary !text-white hover:!scale-[1.05]"
            >
              Get Early Access
            </Button>
            <Button href="#how-it-works" variant="ghost" size="lg">
              See How It Works
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
