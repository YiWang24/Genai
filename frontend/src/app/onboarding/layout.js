import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { APP_NAME } from "@/lib/constants";

export const metadata = {
  title: "Onboarding - SmartDiet Copilot",
};

export default function OnboardingLayout({ children }) {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-primary/10 bg-white dark:bg-background-dark px-6 md:px-20 py-4 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
              <Icon name="nutrition" />
            </div>
            <Link href="/">
              <h2 className="text-slate-900 dark:text-slate-100 text-xl font-bold leading-tight tracking-tight">
                {APP_NAME}
              </h2>
            </Link>
          </div>
          <div className="flex flex-1 justify-end gap-8">
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-primary transition-colors"
              >
                Help Center
              </a>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
              <button
                type="button"
                className="text-slate-900 dark:text-slate-100 text-sm font-semibold"
                aria-label="Sign in"
              >
                Sign In
              </button>
            </div>
          </div>
        </header>
        <main className="flex flex-1 justify-center py-10 px-4">
          {children}
        </main>
        <footer className="py-10 border-t border-primary/5 text-center">
          <p className="text-slate-400 text-sm">
            © 2024 SmartDiet Copilot. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
