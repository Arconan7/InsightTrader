import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import Dashboard from '@/pages/dashboard';
import SynthesizePage from '@/pages/synthesize';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  Link,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import { Sparkles, LayoutDashboard, Radio, Activity } from 'lucide-react';

const queryClient = new QueryClient();

function NavigationHeader() {
  const [location] = useLocation();

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-4 md:px-8 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white">InsightTrader</span>
              <span className="text-[11px] font-semibold text-emerald-400">Trade Signal</span>
            </div>
            <p className="text-[11px] text-slate-400">Political Intelligence & Nemotron AI</p>
          </div>
        </Link>
      </div>

      <nav className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
        <Link
          href="/"
          className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
            location === '/'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="h-3.5 w-3.5 text-emerald-400" />
          Signals Dashboard
        </Link>
        <Link
          href="/synthesize"
          className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
            location === '/synthesize'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="h-3.5 w-3.5 text-amber-400" />
          News Synthesis Studio
          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-500/20 text-amber-300">
            Nemotron
          </span>
        </Link>
      </nav>

      <div className="hidden sm:flex items-center gap-2 text-xs">
        <Badge variant="outline" className="border-slate-800 text-slate-400">
          <Activity className="h-3 w-3 mr-1 text-emerald-400 animate-pulse" />
          Live RSS Active
        </Badge>
      </div>
    </header>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
        <NavigationHeader />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/synthesize" component={SynthesizePage} />
            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
