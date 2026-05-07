import { Link } from "wouter";
import { ArrowRight, Zap, Target, BarChart3, Globe2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-display font-bold text-sm">T</span>
          </div>
          <span className="font-display font-semibold text-foreground text-lg">
            Trua <span className="text-primary">IO</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm" data-testid="link-sign-in">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm" data-testid="link-get-started">Get Started <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full mb-6 border border-primary/20">
          <Zap className="w-3.5 h-3.5" />
          AI-Powered Email Outreach for Tanzania
        </div>

        <h1 className="text-5xl sm:text-6xl font-display font-bold text-foreground max-w-3xl leading-tight mb-6">
          Reach Tanzanian Businesses with <span className="text-primary">AI Precision</span>
        </h1>

        <p className="text-muted-foreground text-xl max-w-2xl mb-10 leading-relaxed">
          Trua IO helps your sales team craft personalized outreach emails in English and Swahili, manage contacts, and track campaign performance — all powered by AI.
        </p>

        <div className="flex items-center gap-4">
          <Link href="/sign-up">
            <Button size="lg" data-testid="button-start-free" className="text-base px-8">
              Start Free Today <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline" data-testid="button-sign-in-landing">
              Sign In
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-card border-t border-border">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Target,
              title: "Smart Contact Management",
              desc: "Import CSV contacts and enrich them with AI-powered company data for the Tanzanian market.",
            },
            {
              icon: Zap,
              title: "AI Email Drafting",
              desc: "Generate personalized emails in English and Swahili that resonate with your prospects.",
            },
            {
              icon: BarChart3,
              title: "Campaign Analytics",
              desc: "Track open rates, reply rates, and conversion funnel with real-time dashboards.",
            },
            {
              icon: Globe2,
              title: "PDPA 2022 Compliant",
              desc: "Built from the ground up to meet Tanzania's Personal Data Protection Act requirements.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="p-5 rounded-xl border border-border bg-background">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-foreground mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-6 border-t border-border text-center text-muted-foreground text-sm">
        © 2024 Trua IO. Built for Tanzanian businesses.
      </footer>
    </div>
  );
}
