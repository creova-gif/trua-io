import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Contacts from "@/pages/Contacts";
import Campaigns from "@/pages/Campaigns";
import Emails from "@/pages/Emails";
import Analytics from "@/pages/Analytics";
import AiBot from "@/pages/AiBot";
import Settings from "@/pages/Settings";
import LandingPage from "@/pages/LandingPage";

const queryClient = new QueryClient();

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#1D9E75",
    colorForeground: "#2C2C2A",
    colorMutedForeground: "#6b6b68",
    colorDanger: "#dc2626",
    colorBackground: "#F1EFE8",
    colorInput: "#e8e6de",
    colorInputForeground: "#2C2C2A",
    colorNeutral: "#d4d2ca",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#2C2C2A] font-display font-semibold",
    headerSubtitle: "text-[#6b6b68]",
    socialButtonsBlockButtonText: "text-[#2C2C2A] font-medium",
    formFieldLabel: "text-[#2C2C2A] font-medium",
    footerActionLink: "text-[#1D9E75] hover:text-[#178a63]",
    footerActionText: "text-[#6b6b68]",
    dividerText: "text-[#6b6b68]",
    identityPreviewEditButton: "text-[#1D9E75]",
    formFieldSuccessText: "text-[#1D9E75]",
    alertText: "text-[#2C2C2A]",
    logoBox: "mb-1",
    logoImage: "h-8 w-auto",
    socialButtonsBlockButton: "border border-[#d4d2ca] bg-white hover:bg-[#f5f3ec]",
    formButtonPrimary: "bg-[#1D9E75] hover:bg-[#178a63] text-white font-semibold",
    formFieldInput: "bg-[#e8e6de] border-[#d4d2ca] text-[#2C2C2A] placeholder:text-[#9b9a96]",
    footerAction: "bg-[#f5f3ec]",
    dividerLine: "bg-[#d4d2ca]",
    alert: "bg-[#fef2f2] border-[#fee2e2]",
    otpCodeFieldInput: "border-[#d4d2ca] bg-[#e8e6de] text-[#2C2C2A]",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <AppLayout>
          <Component />
        </AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function AppRouter() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back to Trua IO",
            subtitle: "Sign in to your outreach workspace",
          },
        },
        signUp: {
          start: {
            title: "Start your outreach",
            subtitle: "Create your Trua IO account",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
            <Route path="/contacts" component={() => <ProtectedRoute component={Contacts} />} />
            <Route path="/campaigns" component={() => <ProtectedRoute component={Campaigns} />} />
            <Route path="/emails" component={() => <ProtectedRoute component={Emails} />} />
            <Route path="/analytics" component={() => <ProtectedRoute component={Analytics} />} />
            <Route path="/ai-bot" component={() => <ProtectedRoute component={AiBot} />} />
            <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <AppRouter />
    </WouterRouter>
  );
}

export default App;
