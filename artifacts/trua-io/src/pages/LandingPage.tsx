import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, useInView, useMotionValue, useSpring, useTransform, animate } from "framer-motion";
import {
  ArrowRight, Zap, Target, BarChart3, Globe2, Mail, Users, TrendingUp,
  MessageSquare, Shield, ChevronDown, Sparkles, Check, Star
} from "lucide-react";

/* ─── helpers ─────────────────────────────────────────────── */

function useCounter(to: number, duration = 2, enabled = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controls = animate(0, to, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return controls.stop;
  }, [to, duration, enabled]);
  return val;
}

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 200, damping: 20 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]), { stiffness: 200, damping: 20 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Marquee ──────────────────────────────────────────────── */
const TRUST_ITEMS = [
  "🇹🇿 Built for Tanzania",
  "🔒 PDPA 2022 Compliant",
  "🤖 Claude AI Powered",
  "🌍 English & Swahili",
  "📊 Real-time Analytics",
  "📨 Autonomous Outreach",
  "🛡️ Role-based Access",
  "⚡ AI Email Drafting",
];

function Marquee() {
  const items = [...TRUST_ITEMS, ...TRUST_ITEMS];
  return (
    <div className="overflow-hidden border-y border-white/10 bg-white/[0.03] py-4">
      <motion.div
        className="flex gap-10 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {items.map((item, i) => (
          <span key={i} className="text-sm font-medium text-white/50 tracking-wide flex items-center gap-2.5 shrink-0">
            {item}
            <span className="text-teal-500/60 text-xl leading-none">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ─── Stats counter ────────────────────────────────────────── */
function StatCard({ value, suffix, label, delay }: { value: number; suffix: string; label: string; delay: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const count = useCounter(value, 2.2, inView);
  return (
    <div ref={ref} className="text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={inView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.6, delay, ease: "backOut" }}
      >
        <p className="text-5xl font-display font-extrabold text-white tracking-tight">
          {count.toLocaleString()}{suffix}
        </p>
        <p className="text-white/50 text-sm font-medium mt-2 tracking-wide uppercase">{label}</p>
      </motion.div>
    </div>
  );
}

/* ─── Animated orb ─────────────────────────────────────────── */
function Orb({ className }: { className: string }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-[120px] pointer-events-none ${className}`}
      animate={{ scale: [1, 1.15, 1], opacity: [0.35, 0.55, 0.35] }}
      transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ─── Feature card ─────────────────────────────────────────── */
const FEATURES = [
  {
    icon: Target,
    title: "Smart Contact Management",
    desc: "Import CSV contacts and enrich them with AI-powered company data. Auto-detect industry, lead score, and deal stage for every Tanzanian prospect.",
    badge: "AI Enrichment",
    color: "from-teal-500/20 to-teal-500/5",
    glow: "group-hover:shadow-teal-500/20",
  },
  {
    icon: Mail,
    title: "Bilingual AI Email Drafting",
    desc: "Claude AI crafts personalized emails in English and Swahili in seconds. Every email is PDPA-compliant and includes an unsubscribe link.",
    badge: "Claude Sonnet",
    color: "from-blue-500/20 to-blue-500/5",
    glow: "group-hover:shadow-blue-500/20",
  },
  {
    icon: BarChart3,
    title: "Campaign Analytics",
    desc: "Track open rates, reply rates, and conversion funnels in real time. Know exactly which contacts are hot leads and which need nurturing.",
    badge: "Real-time",
    color: "from-violet-500/20 to-violet-500/5",
    glow: "group-hover:shadow-violet-500/20",
  },
  {
    icon: Zap,
    title: "Autonomous Campaign Scheduling",
    desc: "Set a launch date and let the platform take over. Campaigns auto-start on schedule and send at optimal times for Tanzanian time zones.",
    badge: "Set & Forget",
    color: "from-orange-500/20 to-orange-500/5",
    glow: "group-hover:shadow-orange-500/20",
  },
  {
    icon: Users,
    title: "Role-Based Team Access",
    desc: "Invite your sales team with Admin, Sales User, or Viewer roles. Admins control settings; viewers see dashboards without touching any data.",
    badge: "Multi-user",
    color: "from-pink-500/20 to-pink-500/5",
    glow: "group-hover:shadow-pink-500/20",
  },
  {
    icon: Shield,
    title: "PDPA 2022 Compliance",
    desc: "Built from the ground up for Tanzania's Personal Data Protection Act. Automatic unsubscribe links, consent records, and right-to-erasure built in.",
    badge: "Compliant",
    color: "from-green-500/20 to-green-500/5",
    glow: "group-hover:shadow-green-500/20",
  },
];

/* ─── How it works ─────────────────────────────────────────── */
const STEPS = [
  { n: "01", title: "Import your contacts", desc: "Upload a CSV or add contacts one-by-one. The AI automatically enriches each contact with industry data and a lead score." },
  { n: "02", title: "Create a campaign", desc: "Name your campaign, set a target audience, and pick a launch date. Schedule it to run automatically or start it on demand." },
  { n: "03", title: "AI drafts the emails", desc: "Claude generates personalized emails for every contact — in English or Swahili — with your brand voice and a PDPA-compliant footer." },
  { n: "04", title: "Track and iterate", desc: "Watch open rates, reply rates, and hot leads in real time. Use the analytics to refine your next campaign." },
];

/* ─── Testimonials ─────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    name: "Amina Rashid",
    role: "Head of Sales, Kilimanjaro Holdings",
    avatar: "AR",
    quote: "Trua IO cut our outreach time by 70%. The Swahili emails feel native — prospects actually respond thinking a human wrote them.",
    stars: 5,
    color: "from-teal-500/30",
  },
  {
    name: "David Omondi",
    role: "CEO, Savanna Tech Ltd",
    avatar: "DO",
    quote: "The campaign scheduler is a game changer. I set it up on Sunday night and walked in Monday with 12 warm replies already in my inbox.",
    stars: 5,
    color: "from-blue-500/30",
  },
  {
    name: "Fatuma Issa",
    role: "Business Development, Zanzibar Exports",
    avatar: "FI",
    quote: "Finally a tool built for the Tanzanian market. The PDPA compliance alone made it a no-brainer for our legal team to approve.",
    stars: 5,
    color: "from-violet-500/30",
  },
];

/* ─── Pricing ──────────────────────────────────────────────── */
const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "For individuals testing AI outreach",
    features: ["500 contacts", "2 active campaigns", "AI email drafting", "Basic analytics", "PDPA compliant"],
    cta: "Start Free",
    highlight: false,
  },
  {
    name: "Growth",
    price: "TZS 49,000",
    period: "/mo",
    desc: "For sales teams ready to scale",
    features: ["10,000 contacts", "Unlimited campaigns", "AI enrichment", "Advanced analytics", "Team roles (5 seats)", "Priority support"],
    cta: "Start 14-day Trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For large organisations",
    features: ["Unlimited contacts", "Unlimited campaigns", "Dedicated AI model", "Custom domain sending", "Unlimited seats", "SLA + onboarding"],
    cta: "Contact Sales",
    highlight: false,
  },
];

/* ─── Nav ──────────────────────────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-500 ${
        scrolled ? "bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-2xl" : "bg-transparent"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
          <span className="text-black font-display font-bold text-sm">T</span>
        </div>
        <span className="font-display font-bold text-white text-lg tracking-tight">
          Trua <span className="text-teal-400">IO</span>
        </span>
      </div>
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
        {["Features", "How it works", "Pricing", "Testimonials"].map((label) => (
          <a
            key={label}
            href={`#${label.toLowerCase().replace(/\s+/g, "-")}`}
            className="hover:text-white transition-colors duration-200"
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="flex items-center gap-3">
        <Link href="/sign-in">
          <button className="text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-2" data-testid="link-sign-in">
            Sign In
          </button>
        </Link>
        <Link href="/sign-up">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-black font-semibold text-sm px-4 py-2 rounded-lg transition-colors shadow-lg shadow-teal-500/25"
            data-testid="link-get-started"
          >
            Get Started <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </Link>
      </div>
    </motion.header>
  );
}

/* ─── Main ─────────────────────────────────────────────────── */
export default function LandingPage() {
  const heroRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, []);

  return (
    <div className="bg-black text-white overflow-x-hidden">
      <Navbar />

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 overflow-hidden">
        {/* Ambient background glow that follows cursor */}
        <div
          className="absolute inset-0 pointer-events-none transition-all duration-700"
          style={{
            background: `radial-gradient(ellipse 80% 60% at ${mousePos.x * 100}% ${mousePos.y * 100}%, rgba(29,158,117,0.12) 0%, transparent 70%)`,
          }}
        />

        {/* Static orbs */}
        <Orb className="w-[600px] h-[600px] bg-teal-500/20 -top-32 -left-40" />
        <Orb className="w-[400px] h-[400px] bg-teal-400/10 top-1/3 -right-20" />
        <Orb className="w-[300px] h-[300px] bg-blue-500/10 bottom-0 left-1/4" />

        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 border border-teal-500/30 bg-teal-500/10 text-teal-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wider uppercase"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Email Outreach · Tanzania's #1
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="text-6xl sm:text-7xl lg:text-8xl font-display font-extrabold leading-[0.95] tracking-tight mb-6"
          >
            <span className="text-white">Reach Tanzanian</span>
            <br />
            <span className="bg-gradient-to-r from-teal-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Businesses Faster
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="text-white/55 text-xl sm:text-2xl max-w-2xl mx-auto leading-relaxed mb-12 font-light"
          >
            AI email outreach in <strong className="text-white/80 font-semibold">English and Swahili</strong>, 
            campaign automation, and real-time analytics — built for the Tanzanian market.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
          >
            <Link href="/sign-up">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(29,158,117,0.4)" }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 bg-teal-500 hover:bg-teal-400 text-black font-bold text-base px-8 py-4 rounded-xl transition-colors shadow-2xl shadow-teal-500/30"
                data-testid="button-start-free"
              >
                Start Free Today <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
            <Link href="/sign-in">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 border border-white/15 text-white/70 hover:text-white hover:border-white/30 font-medium text-base px-8 py-4 rounded-xl transition-all backdrop-blur-sm"
                data-testid="button-sign-in-landing"
              >
                Sign In
              </motion.button>
            </Link>
          </motion.div>

          {/* Social proof mini strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-white/40"
          >
            <div className="flex items-center gap-1.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />)}
              <span className="ml-1">5.0 from 200+ users</span>
            </div>
            <span className="hidden sm:block text-white/20">·</span>
            <span>No credit card required</span>
            <span className="hidden sm:block text-white/20">·</span>
            <span>Free plan available</span>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-white/30 text-xs tracking-widest uppercase">Scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <ChevronDown className="w-5 h-5 text-white/30" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── MARQUEE ───────────────────────────────────────────── */}
      <Marquee />

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-b border-white/10 bg-gradient-to-b from-black to-zinc-950">
        <div className="max-w-4xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-4 divide-x-0 lg:divide-x divide-white/10">
          <StatCard value={12000} suffix="+" label="Emails Sent" delay={0} />
          <StatCard value={94} suffix="%" label="Deliverability" delay={0.1} />
          <StatCard value={38} suffix="%" label="Open Rate" delay={0.2} />
          <StatCard value={200} suffix="+" label="Tanzanian Businesses" delay={0.3} />
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="features" className="py-32 px-6 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-16">
            <span className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-4 block">Everything you need</span>
            <h2 className="text-4xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
              Built for the way Tanzanian
              <br />sales teams actually work
            </h2>
          </FadeUp>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, badge, color, glow }, i) => (
              <FadeUp key={title} delay={i * 0.08}>
                <TiltCard className="h-full">
                  <div className={`group relative h-full p-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:border-white/20 transition-all duration-300 hover:shadow-2xl ${glow} cursor-default overflow-hidden`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl`} />
                    <div className="relative z-10">
                      <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-5 group-hover:border-white/20 transition-colors">
                        <Icon className="w-5 h-5 text-teal-400" />
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <h3 className="font-display font-bold text-white text-lg">{title}</h3>
                      </div>
                      <p className="text-white/50 text-sm leading-relaxed">{desc}</p>
                      <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-400/80 bg-teal-500/10 border border-teal-500/20 px-2.5 py-1 rounded-full">
                        <Sparkles className="w-3 h-3" /> {badge}
                      </div>
                    </div>
                  </div>
                </TiltCard>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────── */}
      <section id="how-it-works" className="py-32 px-6 bg-black border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-20">
            <span className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-4 block">The process</span>
            <h2 className="text-4xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
              From zero to campaign
              <br />
              <span className="text-teal-400">in under 10 minutes</span>
            </h2>
          </FadeUp>

          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-teal-500/50 via-teal-500/20 to-transparent hidden md:block" />

            <div className="space-y-12">
              {STEPS.map(({ n, title, desc }, i) => (
                <FadeUp key={n} delay={i * 0.12}>
                  <div className="flex items-start gap-6 md:gap-10">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center z-10 relative">
                        <span className="font-display font-extrabold text-teal-400 text-lg">{n}</span>
                      </div>
                    </div>
                    <div className="pt-3 flex-1">
                      <h3 className="font-display font-bold text-white text-xl mb-2">{title}</h3>
                      <p className="text-white/50 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                </FadeUp>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section id="testimonials" className="py-32 px-6 bg-zinc-950 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-16">
            <span className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-4 block">Testimonials</span>
            <h2 className="text-4xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
              Trusted by Tanzania's
              <br />fastest-growing teams
            </h2>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, avatar, quote, stars, color }, i) => (
              <FadeUp key={name} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`relative p-6 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${color} to-transparent`} />
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(stars)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-white/70 text-sm leading-relaxed mb-6 italic">&ldquo;{quote}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center shrink-0">
                      <span className="text-teal-400 font-display font-bold text-sm">{avatar}</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{name}</p>
                      <p className="text-white/40 text-xs">{role}</p>
                    </div>
                  </div>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────── */}
      <section id="pricing" className="py-32 px-6 bg-black border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-16">
            <span className="text-teal-400 text-sm font-semibold tracking-widest uppercase mb-4 block">Pricing</span>
            <h2 className="text-4xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
              Simple, honest pricing
            </h2>
            <p className="text-white/40 mt-4 text-lg">Start free. Upgrade when you're ready.</p>
          </FadeUp>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(({ name, price, period, desc, features, cta, highlight }, i) => (
              <FadeUp key={name} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`relative rounded-2xl p-6 border transition-all flex flex-col ${
                    highlight
                      ? "border-teal-500/50 bg-teal-500/[0.07] shadow-2xl shadow-teal-500/10"
                      : "border-white/10 bg-white/[0.03]"
                  }`}
                >
                  {highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-teal-500 text-black text-xs font-bold px-4 py-1 rounded-full tracking-wide">
                      MOST POPULAR
                    </div>
                  )}
                  <p className="font-display font-bold text-white text-lg mb-1">{name}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className={`font-display font-extrabold text-3xl ${highlight ? "text-teal-400" : "text-white"}`}>{price}</span>
                    <span className="text-white/40 text-sm">{period}</span>
                  </div>
                  <p className="text-white/40 text-sm mb-6">{desc}</p>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5 text-sm text-white/60">
                        <Check className={`w-4 h-4 shrink-0 ${highlight ? "text-teal-400" : "text-white/30"}`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/sign-up">
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                        highlight
                          ? "bg-teal-500 hover:bg-teal-400 text-black shadow-lg shadow-teal-500/25"
                          : "border border-white/15 text-white/70 hover:border-white/30 hover:text-white"
                      }`}
                    >
                      {cta}
                    </motion.button>
                  </Link>
                </motion.div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section className="py-32 px-6 bg-zinc-950 border-t border-white/10 relative overflow-hidden">
        <Orb className="w-[500px] h-[500px] bg-teal-500/15 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <FadeUp>
            <h2 className="text-5xl sm:text-6xl font-display font-extrabold text-white tracking-tight mb-6 leading-tight">
              Your next customer is
              <br />
              <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
                one email away
              </span>
            </h2>
            <p className="text-white/45 text-xl mb-10">
              Join 200+ Tanzanian businesses using AI to grow their pipeline.
            </p>
            <Link href="/sign-up">
              <motion.button
                whileHover={{ scale: 1.07, boxShadow: "0 0 60px rgba(29,158,117,0.5)" }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-3 bg-teal-500 hover:bg-teal-400 text-black font-bold text-lg px-10 py-5 rounded-2xl transition-colors shadow-2xl shadow-teal-500/30"
              >
                Start Free Today <ArrowRight className="w-5 h-5" />
              </motion.button>
            </Link>
            <p className="text-white/25 text-sm mt-6">No credit card required · Setup in 5 minutes · Cancel anytime</p>
          </FadeUp>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-black px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center">
                  <span className="text-black font-display font-bold text-sm">T</span>
                </div>
                <span className="font-display font-bold text-white text-lg">Trua <span className="text-teal-400">IO</span></span>
              </div>
              <p className="text-white/35 text-sm leading-relaxed">
                AI-powered email outreach built for Tanzanian businesses. Reach more prospects, faster.
              </p>
            </div>
            {[
              { title: "Product", links: ["Features", "Pricing", "Analytics", "Campaigns", "AI Assistant"] },
              { title: "Company", links: ["About", "Blog", "Careers", "Contact"] },
              { title: "Legal", links: ["Privacy Policy", "Terms of Service", "PDPA Compliance", "Cookie Policy"] },
            ].map(({ title, links }) => (
              <div key={title}>
                <p className="text-white font-semibold text-sm mb-4">{title}</p>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-white/40 text-sm hover:text-white/70 transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-white/25 text-sm">© 2025 Trua IO. Built for Tanzanian businesses.</p>
            <p className="text-white/25 text-sm flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-500/50" /> PDPA 2022 Compliant
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
