import Button from "@/components/ui/Button";
import { ROUTES } from "@/lib/constants";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12rem] top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-emerald-200/45 blur-3xl dark:bg-emerald-900/20" />
        <div className="absolute bottom-[-10rem] right-[-12rem] h-[24rem] w-[24rem] rounded-full bg-cyan-200/45 blur-3xl dark:bg-cyan-900/20" />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-7xl items-center px-6 py-12 lg:px-20 lg:py-16">
        <div className="grid w-full items-center gap-12 lg:grid-cols-2">
          <div className="order-2 flex flex-col gap-8 lg:order-1">
            <div className="flex flex-col gap-4">
              <span className="hero-reveal hero-delay-1 w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-800">
                AI-Powered Nutrition
              </span>
              <h1 className="text-5xl font-black leading-[0.98] tracking-tight text-slate-900 dark:text-slate-100 lg:text-7xl">
                <span className="hero-reveal hero-delay-2 block">
                  Your AI Dietitian
                </span>
                <span className="hero-reveal hero-delay-3 block">
                  that plans meals
                </span>
                <span className="block">
                  <span className="hero-reveal hero-delay-4">from </span>
                  <span className="hero-gradient-text hero-reveal hero-delay-5">
                    what you have.
                  </span>
                </span>
              </h1>
              <p className="hero-reveal hero-delay-6 max-w-lg text-lg leading-relaxed text-slate-600 dark:text-slate-400 lg:text-xl">
                Transform your ingredients into healthy, personalized meal plans
                with the power of agentic AI. Stop wondering what&apos;s for
                dinner.
              </p>
            </div>
            <div className="hero-reveal hero-delay-7 flex flex-wrap gap-4">
              <Button href={`${ROUTES.auth}?mode=register`} variant="primaryLarge" size="lg">
                Get Started Free
              </Button>
              <Button href="#how-it-works" variant="outline" size="lg">
                See Demo
              </Button>
            </div>
            <div className="hero-reveal hero-delay-8 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-800">
                Currently in Beta
              </span>
              <span>Join the early access list and shape the roadmap.</span>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <div className="hero-reveal hero-delay-4 hero-float-slow relative aspect-square w-full overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-[0_16px_40px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-900">
              <div
                className="relative flex h-full w-full items-center justify-center rounded-2xl bg-cover bg-center shadow-inner"
                style={{
                  backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuAyA2qLza7BS_4AMh0s3FxvWwj-93X6kigRLx3joK5csXzw1UHi2wsNVX9LklQTv8PLW6ENBKXoYAbZWjI1GVaQw6bUvHTF4w1r3kx0gAIzj-ai7s79c4GgOZjaJD7MpGtc6VCFMnbLD3vZvluR_xYtIdphZCBzLvuFYSvAlhvJYZrXEuT3njwc17RRPRidSi1uhNoSx2vtGCIn6fOFxvn5zW8HmWzF3v-UTNfOHrQSFpF3CaxchSx56aeZJm3RdwzSi9l_k4kD4z0P")`,
                }}
                aria-hidden
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent" />
                <div className="absolute right-4 top-4 rounded-xl border border-emerald-200 bg-white/95 p-4 shadow-md backdrop-blur">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">
                      nutrition
                    </span>
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                        Daily Goal
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        85% Complete
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-primary p-4 text-white shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined">
                      chip_extraction
                    </span>
                    <span className="text-sm font-medium">
                      Found: 12 recipes using your current stock
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
