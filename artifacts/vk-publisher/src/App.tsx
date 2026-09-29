import { useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileText,
  Globe2,
  LogOut,
  PenLine,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  UsersRound,
} from 'lucide-react';
import {
  getGetAuthSessionQueryKey,
  getHealthCheckQueryKey,
  getListVkDestinationsQueryKey,
  useCreateVkPost,
  useGetAuthSession,
  useHealthCheck,
  useListVkDestinations,
  useLogout,
  type VkDestination,
} from '@workspace/api-client-react';
import {
  Route,
  Switch,
  Router as WouterRouter,
  useLocation,
} from 'wouter';

const queryClient = new QueryClient();

const initials = (name: string) =>
  name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'error' in error) {
    const value = (error as { error?: unknown }).error;
    if (typeof value === 'string') return value;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

function Avatar({ name, avatarUrl, size = 'md', testId }: {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  testId: string;
}) {
  const sizes = { sm: 'h-8 w-8 text-[11px]', md: 'h-10 w-10 text-xs', lg: 'h-14 w-14 text-base' };
  return avatarUrl ? (
    <img src={avatarUrl} alt="" className={`${sizes[size]} shrink-0 rounded-full object-cover ring-2 ring-white/80`} data-testid={testId} />
  ) : (
    <div className={`${sizes[size]} shrink-0 rounded-full bg-[hsl(var(--primary)/.12)] text-[hsl(var(--primary))] font-bold flex items-center justify-center ring-2 ring-white/80`} data-testid={testId}>
      {initials(name)}
    </div>
  );
}

function Brand({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3" data-testid="brand-vk-publisher">
      <div className={`relative flex h-9 w-9 items-center justify-center rounded-xl shadow-sm ${inverse ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))]' : 'bg-[hsl(var(--primary))] text-white'}`}>
        <PenLine size={17} strokeWidth={2.5} />
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />
      </div>
      {!compact && <div><p className={`text-[15px] font-bold tracking-[-0.02em] ${inverse ? 'text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--foreground))]'}`}>VK Publisher</p><p className={`text-[10px] uppercase tracking-[0.16em] ${inverse ? 'text-[hsl(var(--sidebar-foreground)/.55)]' : 'text-[hsl(var(--muted-foreground))]'}`}>Personal workspace</p></div>}
    </div>
  );
}

function LoadingScreen() {
  return (
    <main className="shell-grid min-h-[100dvh] bg-[hsl(var(--background))] p-5 sm:p-10">
      <div className="mx-auto max-w-5xl animate-in-fade">
        <div className="h-9 w-36 animate-pulse rounded-xl bg-[hsl(var(--muted))]" />
        <div className="mt-16 grid gap-8 lg:grid-cols-[1fr_420px]">
          <div><div className="h-16 w-4/5 animate-pulse rounded-lg bg-[hsl(var(--muted))]" /><div className="mt-5 h-5 w-3/5 animate-pulse rounded bg-[hsl(var(--muted))]" /><div className="mt-12 h-32 w-full animate-pulse rounded-2xl bg-[hsl(var(--muted))]" /></div>
          <div className="h-[390px] animate-pulse rounded-3xl bg-[hsl(var(--muted))]" />
        </div>
      </div>
    </main>
  );
}

function SessionError({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="shell-grid flex min-h-[100dvh] items-center justify-center bg-[hsl(var(--background))] p-6">
      <section className="w-full max-w-md rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-[var(--shadow-card)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]"><CircleAlert size={22} /></div>
        <h1 className="mt-5 font-display text-3xl text-[hsl(var(--foreground))]">We could not check your session</h1>
        <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">VK Publisher needs a quick connection to confirm who is signed in. Try again when you are ready.</p>
        <button type="button" onClick={onRetry} className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 text-sm font-bold text-white transition hover:brightness-105" data-testid="button-retry-session"><RefreshCw size={16} /> Try again</button>
      </section>
    </main>
  );
}

function LoginState() {
  return (
    <main className="shell-grid min-h-[100dvh] bg-[hsl(var(--background))] px-5 py-6 sm:px-10 sm:py-9">
      <header className="mx-auto flex max-w-6xl items-center justify-between"><Brand /><span className="hidden text-xs font-semibold text-[hsl(var(--muted-foreground))] sm:block">A quiet place to publish</span></header>
      <div className="mx-auto grid max-w-6xl items-center gap-14 pb-8 pt-16 sm:pt-24 lg:grid-cols-[1fr_410px] lg:gap-24 lg:pt-28">
        <section className="animate-in-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.15em] text-[hsl(var(--primary))]"><span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" /> VK publishing, made clear</div>
          <h1 className="max-w-xl font-display text-5xl leading-[.99] tracking-[-.045em] text-[hsl(var(--foreground))] sm:text-7xl">Publish with <em className="text-[hsl(var(--primary))] not-italic">certainty.</em></h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">One focused workspace for your personal page and the communities you care for. See exactly where your words are going before they leave.</p>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs font-semibold text-[hsl(var(--foreground)/.72)]">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={16} className="text-[hsl(var(--primary))]" /> Secure VK ID sign-in</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-[hsl(var(--primary))]" /> Review before posting</span>
          </div>
        </section>
        <section className="relative animate-in-up delay-1">
          <div className="absolute -inset-3 rounded-[2rem] bg-[hsl(var(--primary)/.07)]" />
          <div className="relative overflow-hidden rounded-[1.7rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-6 py-5"><div><p className="text-sm font-bold">Your publishing desk</p><p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">Ready when you are</p></div><div className="rounded-xl bg-[hsl(var(--secondary))] p-2.5 text-[hsl(var(--primary))]"><FileText size={18} /></div></div>
            <div className="space-y-5 p-6">
              <div><div className="mb-2 flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Destination</span><span className="text-[11px] text-[hsl(var(--muted-foreground))]">Private until shared</span></div><div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-3"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Globe2 size={17} /></div><span className="text-sm font-semibold">Choose a page or community</span></div></div>
              <div><span className="mb-2 block text-[11px] font-bold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))]">Message</span><div className="h-28 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.55)] p-3 text-sm text-[hsl(var(--muted-foreground))]">Your message will appear here...</div></div>
              <a href="/api/auth/vk/start" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-sm font-bold text-white transition hover:brightness-105" data-testid="link-sign-in-vk"><span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/20 text-xs font-bold">vk</span> Sign in with VK ID <ExternalLink size={15} /></a>
              <p className="flex items-start gap-2 text-[11px] leading-4 text-[hsl(var(--muted-foreground))]"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-[hsl(var(--primary))]" /> We only request the access needed to publish to destinations you choose.</p>
            </div>
          </div>
        </section>
      </div>
      <p className="mx-auto mt-6 max-w-6xl text-center text-xs text-[hsl(var(--muted-foreground))]">Built for deliberate publishing. Your VK account stays yours.</p>
    </main>
  );
}

function DestinationSkeleton() {
  return <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-3"><div className="h-9 w-9 animate-pulse rounded-full bg-[hsl(var(--muted))]" /><div className="flex-1"><div className="h-3 w-28 animate-pulse rounded bg-[hsl(var(--muted))]" /><div className="mt-2 h-2 w-16 animate-pulse rounded bg-[hsl(var(--muted))]" /></div></div>)}</div>;
}

function DestinationItem({ destination, selected, onSelect }: { destination: VkDestination; selected: boolean; onSelect: () => void }) {
  const disabled = !destination.canPost;
  return (
    <button type="button" disabled={disabled} onClick={onSelect} className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.07)]' : 'border-transparent hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--background))]'} ${disabled ? 'cursor-not-allowed opacity-45' : ''}`} data-testid={`button-destination-${destination.ownerId}`} aria-pressed={selected}>
      <Avatar name={destination.name} avatarUrl={destination.avatarUrl} size="sm" testId={`img-destination-avatar-${destination.ownerId}`} />
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{destination.name}</span><span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">{destination.type === 'personal' ? <UserRound size={11} /> : <UsersRound size={11} />}{destination.type === 'personal' ? 'Personal page' : 'Community'}{disabled && <><span className="text-[hsl(var(--border))]">·</span> No publishing access</>}</span></span>
      {selected && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white"><Check size={13} strokeWidth={3} /></span>}
    </button>
  );
}

function Workspace({ profile }: { profile: { id: number; name: string; avatarUrl: string | null } }) {
  const queryClient = useQueryClient();
  const destinationsQuery = useListVkDestinations({ query: { queryKey: getListVkDestinationsQueryKey() } });
  const healthQuery = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), staleTime: 60000 } });
  const logout = useLogout();
  const createPost = useCreateVkPost();
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string; detail?: string } | null>(null);
  const destinations = destinationsQuery.data ?? [];
  const postableDestinations = useMemo(() => destinations.filter((destination) => destination.canPost), [destinations]);
  const selected = destinations.find((destination) => destination.ownerId === selectedOwnerId) ?? null;
  const canPublish = Boolean(selected?.canPost && message.trim() && !createPost.isPending);

  const handlePublish = () => {
    if (!selected || !message.trim()) return;
    setFeedback(null);
    createPost.mutate({ data: { ownerId: selected.ownerId, message: message.trim() } }, {
      onSuccess: (result) => {
        setFeedback({ kind: 'success', text: `Published to ${selected.name}`, detail: `Post #${result.postId} · ${new Date(result.publishedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}` });
        setMessage('');
      },
      onError: (error) => setFeedback({ kind: 'error', text: getErrorMessage(error, 'VK could not publish this post.'), detail: 'Your message is still here. Nothing was lost.' }),
    });
  };

  const handleLogout = () => {
    logout.mutate(undefined, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAuthSessionQueryKey() }) });
  };

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[254px] flex-col bg-[hsl(var(--sidebar))] px-5 py-6 lg:flex">
        <Brand inverse />
        <div className="mt-14"><p className="px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[hsl(var(--sidebar-foreground)/.45)]">Workspace</p><div className="mt-3 flex items-center gap-3 rounded-xl bg-[hsl(var(--sidebar-accent))] px-3 py-3 text-sm font-semibold text-[hsl(var(--sidebar-accent-foreground))]"><PenLine size={17} className="text-[hsl(var(--sidebar-primary))]" /> Compose</div></div>
        <div className="mt-auto border-t border-[hsl(var(--sidebar-border))] pt-5"><div className="flex items-center gap-3 px-2"><Avatar name={profile.name} avatarUrl={profile.avatarUrl} size="sm" testId="img-profile-avatar-sidebar" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-[hsl(var(--sidebar-foreground))]" data-testid="text-profile-name-sidebar">{profile.name}</p><p className="mt-0.5 text-[11px] text-[hsl(var(--sidebar-foreground)/.5)]">VK ID connected</p></div><button type="button" onClick={handleLogout} disabled={logout.isPending} className="rounded-lg p-2 text-[hsl(var(--sidebar-foreground)/.55)] transition hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]" aria-label="Sign out" data-testid="button-logout"><LogOut size={16} /></button></div></div>
      </aside>
      <div className="lg:pl-[254px]">
        <header className="sticky top-0 z-10 flex h-[72px] items-center justify-between border-b border-[hsl(var(--border)/.8)] bg-[hsl(var(--background)/.92)] px-5 backdrop-blur-md sm:px-8 lg:px-12">
          <div className="lg:hidden"><Brand compact /></div>
          <div className="hidden lg:block"><p className="text-xs font-semibold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">Publishing desk</p><p className="mt-1 text-sm text-[hsl(var(--foreground)/.72)]">A clear moment before you share</p></div>
          <div className="flex items-center gap-4"><div className="hidden items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] sm:flex" data-testid="status-api-health"><span className={`h-2 w-2 rounded-full ${healthQuery.isError ? 'bg-[hsl(var(--destructive))]' : 'bg-emerald-500'}`} />{healthQuery.isError ? 'Connection needs attention' : 'VK connection ready'}</div><div className="flex items-center gap-2 lg:hidden"><Avatar name={profile.name} avatarUrl={profile.avatarUrl} size="sm" testId="img-profile-avatar-mobile" /><button type="button" onClick={handleLogout} disabled={logout.isPending} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))]" aria-label="Sign out" data-testid="button-logout-mobile"><LogOut size={16} /></button></div></div>
        </header>
        <main className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <div className="animate-in-up"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]"><Sparkles size={14} /> New post</div><h1 className="mt-3 font-display text-4xl tracking-[-.04em] text-[hsl(var(--foreground))] sm:text-5xl" data-testid="heading-compose">What would you like to share?</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">Choose a destination, write your message, and take one last look. You are in control at every step.</p></div>
          <div className="mt-9 grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_370px]">
            <section className="animate-in-up delay-1 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[var(--shadow-card)]" aria-labelledby="message-title">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-4 sm:px-7"><div><h2 id="message-title" className="text-sm font-bold">Message</h2><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Text-only posts are supported right now.</p></div><span className={`font-mono text-xs ${message.length > 14500 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--muted-foreground))]'}`} data-testid="text-message-count">{message.length.toLocaleString()} / 15,000</span></div>
              <div className="p-5 sm:p-7"><textarea value={message} onChange={(event) => { setMessage(event.target.value.slice(0, 15000)); setFeedback(null); }} placeholder="Start with what matters..." className="min-h-[250px] w-full resize-y rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.55)] p-4 text-base leading-7 text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground)/.65)] transition focus:border-[hsl(var(--primary))] focus:bg-[hsl(var(--card))] focus:outline-none sm:min-h-[310px]" data-testid="textarea-post-message" aria-label="Post message" />
                {feedback && <div className={`mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${feedback.kind === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.06)] text-[hsl(var(--destructive))]'}`} role={feedback.kind === 'error' ? 'alert' : 'status'} data-testid={`status-publish-${feedback.kind}`}><span className="mt-0.5">{feedback.kind === 'success' ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}</span><span><strong className="font-bold">{feedback.text}</strong>{feedback.detail && <span className="mt-0.5 block text-xs opacity-75">{feedback.detail}</span>}</span></div>}
                <div className="mt-5 flex flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-center"><p className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><ShieldCheck size={15} className="text-[hsl(var(--primary))]" /> You will review the destination before publishing.</p><button type="button" onClick={handlePublish} disabled={!canPublish} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-6 text-sm font-bold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-publish-post">{createPost.isPending ? <><Clock3 size={17} /> Publishing...</> : <><Send size={16} /> Publish post</>}</button></div>
              </div>
            </section>
            <aside className="animate-in-up delay-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[var(--shadow-card)] sm:p-6" aria-labelledby="destination-title">
              <div className="flex items-start justify-between"><div><h2 id="destination-title" className="text-sm font-bold">Publish to</h2><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Only destinations with publishing access are selectable.</p></div><button type="button" onClick={() => destinationsQuery.refetch()} disabled={destinationsQuery.isFetching} className="rounded-lg p-2 text-[hsl(var(--muted-foreground))] transition hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--primary))]" aria-label="Refresh destinations" data-testid="button-refresh-destinations"><RefreshCw size={15} className={destinationsQuery.isFetching ? 'animate-spin' : ''} /></button></div>
              <div className="mt-5 space-y-1.5">
                {destinationsQuery.isLoading ? <DestinationSkeleton /> : destinationsQuery.isError ? <div className="rounded-xl border border-[hsl(var(--destructive)/.22)] bg-[hsl(var(--destructive)/.05)] p-4"><div className="flex gap-2 text-sm font-semibold text-[hsl(var(--destructive))]"><CircleAlert size={16} /> Could not load destinations</div><p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">{getErrorMessage(destinationsQuery.error, 'Please try again.')}</p><button type="button" onClick={() => destinationsQuery.refetch()} className="mt-3 text-xs font-bold text-[hsl(var(--primary))] underline underline-offset-4" data-testid="button-retry-destinations">Try again</button></div> : destinations.length === 0 ? <div className="rounded-xl border border-dashed border-[hsl(var(--border))] p-6 text-center"><Globe2 size={22} className="mx-auto text-[hsl(var(--muted-foreground))]" /><p className="mt-3 text-sm font-semibold">No destinations yet</p><p className="mt-1 text-xs leading-5 text-[hsl(var(--muted-foreground))]">Connect a VK page or community with publishing rights to get started.</p></div> : destinations.map((destination) => <DestinationItem key={destination.ownerId} destination={destination} selected={selectedOwnerId === destination.ownerId} onSelect={() => { setSelectedOwnerId(destination.ownerId); setFeedback(null); }} />)}
              </div>
              {destinations.length > 0 && postableDestinations.length === 0 && <div className="mt-4 flex gap-2 rounded-xl bg-[hsl(var(--accent)/.13)] p-3 text-xs leading-5 text-[hsl(var(--accent-foreground))]"><CircleAlert size={15} className="mt-0.5 shrink-0" /> You have access to view these destinations, but none currently allow publishing.</div>}
              {selected && <div className="mt-5 border-t border-[hsl(var(--border))] pt-4" data-testid={`status-selected-destination-${selected.ownerId}`}><p className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><CheckCircle2 size={14} className="text-emerald-600" /> Ready to publish to <span className="font-bold text-[hsl(var(--foreground))]">{selected.name}</span></p></div>}
            </aside>
          </div>
          <footer className="mt-12 flex flex-col gap-3 border-t border-[hsl(var(--border))] pt-5 text-[11px] text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><ShieldCheck size={14} /> Your message stays in this workspace until you publish.</span><span data-testid="text-profile-id">VK ID · {profile.id}</span></footer>
        </main>
      </div>
    </div>
  );
}

function Home() {
  const sessionQuery = useGetAuthSession({ query: { queryKey: getGetAuthSessionQueryKey() } });
  if (sessionQuery.isLoading) return <LoadingScreen />;
  if (sessionQuery.isError) return <SessionError onRetry={() => sessionQuery.refetch()} />;
  if (!sessionQuery.data?.authenticated || !sessionQuery.data.profile) return <LoginState />;
  return <Workspace profile={sessionQuery.data.profile} />;
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
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
