"use client";

import {
  ArrowUpRight,
  Boxes,
  CircleDot,
  Cloud,
  ExternalLink,
  GitBranch,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import SignOutButton from "@/components/sign-out-button";
import { Feature, FeatureStatus, featureStatuses } from "@/lib/features";
import { isTestingUrl } from "@/lib/testing-urls";

type BoardView = "overview" | "branches" | "environments";

function missingSides(feature: Feature) {
  const missing: string[] = [];
  if (!feature.webBranch) missing.push("Web");
  if (!feature.nativeBranch) missing.push("React Native");
  return missing;
}

const statusStyles: Record<
  FeatureStatus,
  { dot: string; pill: string; bar: string }
> = {
  Planned: {
    dot: "bg-slate-400",
    pill: "border-slate-200 bg-slate-50 text-slate-600",
    bar: "bg-slate-400",
  },
  "In development": {
    dot: "bg-amber-500",
    pill: "border-amber-200 bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
  },
  "Ready for testing": {
    dot: "bg-violet-500",
    pill: "border-violet-200 bg-violet-50 text-violet-700",
    bar: "bg-violet-500",
  },
  Released: {
    dot: "bg-emerald-500",
    pill: "border-emerald-200 bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
  },
};

type FeatureDraft = Omit<Feature, "id" | "updatedAt">;

const emptyDraft: FeatureDraft = {
  title: "",
  description: "",
  owner: "",
  team: "",
  status: "Planned",
  targetDate: "",
  webBranch: "",
  nativeBranch: "",
  previewUrl: "",
  progress: 0,
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StatusPill({ status }: { status: FeatureStatus }) {
  const style = statusStyles[status];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${style.pill}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}

function BranchRow({
  label,
  branch,
  accent,
  href,
}: {
  label: string;
  branch: string;
  accent: string;
  href?: string;
}) {
  const content = (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={`grid h-7 min-w-9 shrink-0 place-items-center rounded-lg px-1.5 text-[10px] font-bold ${accent}`}
      >
        {label}
      </span>
      <code className="truncate text-xs font-medium text-slate-600">
        {branch || "No branch"}
      </code>
      {href && <ExternalLink size={13} className="ml-auto shrink-0 text-slate-400" />}
    </div>
  );

  if (!href) return content;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block hover:opacity-80"
      onClick={(event) => event.stopPropagation()}
    >
      {content}
    </a>
  );
}

export default function Dashboard({
  initialFeatures,
  source,
  error,
  userEmail,
}: {
  initialFeatures: Feature[];
  source: "github" | "sample";
  error?: string;
  userEmail: string;
}) {
  const [features, setFeatures] = useState(initialFeatures);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FeatureStatus | "All">(
    "All",
  );
  const [selectedFeature, setSelectedFeature] = useState<Feature | null>(null);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<BoardView>("branches");

  useEffect(() => {
    if (source !== "sample") return;

    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("pncodedash-features");
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as Feature[];
          if (
            Array.isArray(parsed) &&
            parsed.every((item) => typeof item.webBranch === "string")
          ) {
            setFeatures(parsed);
          } else {
            window.localStorage.removeItem("pncodedash-features");
          }
        } catch {
          window.localStorage.removeItem("pncodedash-features");
        }
      }
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [source]);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(
        "pncodedash-features",
        JSON.stringify(features),
      );
    }
  }, [features, hydrated]);

  const filteredFeatures = useMemo(() => {
    const query = search.trim().toLowerCase();
    return features.filter((feature) => {
      const matchesStatus =
        statusFilter === "All" || feature.status === statusFilter;
      const matchesQuery =
        !query ||
        [
          feature.title,
          feature.description,
          feature.owner,
          feature.team,
          feature.webBranch,
          feature.nativeBranch,
          feature.projectName ?? "",
          feature.projectStatus ?? "",
          ...(feature.tickets ?? []).flatMap((ticket) => [
            ticket.name,
            ticket.id,
            ticket.status,
          ]),
        ].some((value) => value.toLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [features, search, statusFilter]);

  const previewCount = features.filter((feature) => feature.previewUrl).length;
  const unmatched = features.filter(
    (feature) => missingSides(feature).length > 0,
  );
  const missingPreview = features.filter((feature) => !feature.previewUrl);

  function openCreate() {
    setEditingFeature(null);
    setIsFormOpen(true);
  }

  function openEdit(feature: Feature) {
    setSelectedFeature(null);
    setEditingFeature(feature);
    setIsFormOpen(true);
  }

  function openView(next: BoardView) {
    setView(next);
    setMobileNavOpen(false);
  }

  function savePreview(id: string, previewUrl: string) {
    const nextUrl = previewUrl || undefined;
    setFeatures((current) =>
      current.map((feature) =>
        feature.id === id ? { ...feature, previewUrl: nextUrl } : feature,
      ),
    );
    setSelectedFeature((current) =>
      current?.id === id ? { ...current, previewUrl: nextUrl } : current,
    );
  }

  function saveFeature(draft: FeatureDraft) {
    if (editingFeature) {
      setFeatures((current) =>
        current.map((feature) =>
          feature.id === editingFeature.id
            ? {
                ...draft,
                id: feature.id,
                updatedAt: new Date().toISOString().slice(0, 10),
              }
            : feature,
        ),
      );
    } else {
      const id = `${draft.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")}-${Date.now().toString().slice(-4)}`;
      setFeatures((current) => [
        {
          ...draft,
          id,
          updatedAt: new Date().toISOString().slice(0, 10),
        },
        ...current,
      ]);
    }
    setIsFormOpen(false);
    setEditingFeature(null);
  }

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-slate-950">
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-[#111827] px-4 py-5 text-white transition-transform lg:translate-x-0 ${
          mobileNavOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#ff6b4a] shadow-[0_8px_25px_rgba(255,107,74,.3)]">
              <Boxes size={19} strokeWidth={2.5} />
            </div>
            <div>
              <div className="text-[15px] font-bold tracking-tight">
                PNCodeDash
              </div>
              <div className="text-[10px] font-medium uppercase tracking-[.18em] text-slate-400">
                Product delivery
              </div>
            </div>
          </div>
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="mt-10 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">
            Workspace
          </div>
          <NavItem
            icon={<LayoutDashboard size={17} />}
            label="Overview"
            active={view === "overview"}
            onClick={() => openView("overview")}
          />
          <NavItem
            icon={<GitBranch size={17} />}
            label="Branches"
            active={view === "branches"}
            onClick={() => openView("branches")}
          />
          <NavItem
            icon={<Cloud size={17} />}
            label="Environments"
            active={view === "environments"}
            onClick={() => openView("environments")}
          />
        </nav>

        <div className="mt-auto rounded-2xl border border-white/10 bg-white/[.06] p-4">
          <p className="text-xs leading-5 text-slate-400">
            A branch appears when its pull request is labeled ready for
            testing, or its GitHub Project status is ready to test. Branches
            on the same project are grouped together.
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-4 px-4 sm:px-7 lg:px-10">
            <button
              className="rounded-lg border border-slate-200 p-2 text-slate-600 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={19} />
            </button>
            <div className="relative hidden max-w-md flex-1 sm:block">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search features, owners, or branches..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-4 focus:ring-slate-100"
              />
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,.1)]" />
                {source === "github"
                  ? "Reading Pocketnest branches"
                  : "Showing sample data"}
              </div>
              <div className="hidden max-w-48 truncate text-xs font-medium text-slate-500 sm:block">
                {userEmail}
              </div>
              <SignOutButton />
              {source === "sample" && (
                <button
                  onClick={openCreate}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#ff6544] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,101,68,.24)] transition hover:-translate-y-0.5 hover:bg-[#f05838]"
                >
                  <Plus size={17} strokeWidth={2.5} />
                  <span className="hidden sm:inline">Add feature</span>
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-7 lg:px-10 lg:py-10">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#f05d3d]">
                <CircleDot size={13} />
                Pocketnest
              </div>
              <h1 className="text-3xl font-bold tracking-[-.035em] text-slate-950 sm:text-4xl">
                {view === "overview"
                  ? "Overview"
                  : view === "branches"
                    ? "Branches"
                    : "Environments"}
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                {view === "overview"
                  ? "How many branches are ready for testing, which have a testing environment, and which are missing a match."
                  : view === "branches"
                    ? "Branches ready for testing, grouped when they share a GitHub Project."
                    : "The testing environment entered for each branch."}
              </p>
            </div>
            {view === "branches" && source === "sample" && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
                {(["All", ...featureStatuses] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                      statusFilter === status
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {error}
            </div>
          )}

          {source === "sample" && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Set <code className="font-mono text-xs">GITHUB_TOKEN</code> to
              read pull requests from pocketnest-web and
              pocketnest-react-native.
            </div>
          )}

          {view === "overview" && (
            <Overview
              total={features.length}
              previewCount={previewCount}
              unmatchedCount={unmatched.length}
              missingPreviewCount={missingPreview.length}
              attention={filteredFeatures.filter(
                (feature) =>
                  missingSides(feature).length > 0 || !feature.previewUrl,
              )}
              onSelect={setSelectedFeature}
            />
          )}

          {view === "branches" && (
            <BranchList
              features={filteredFeatures}
              source={source}
              onSelect={setSelectedFeature}
            />
          )}

          {view === "environments" && (
            <EnvironmentList
              features={filteredFeatures}
              onSelect={setSelectedFeature}
            />
          )}
        </main>
      </div>

      {mobileNavOpen && (
        <button
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      {selectedFeature && (
        <FeatureDetail
          feature={selectedFeature}
          source={source}
          onClose={() => setSelectedFeature(null)}
          onEdit={() => openEdit(selectedFeature)}
          onPreviewSaved={savePreview}
        />
      )}

      {isFormOpen && (
        <FeatureForm
          feature={editingFeature}
          onClose={() => {
            setIsFormOpen(false);
            setEditingFeature(null);
          }}
          onSave={saveFeature}
        />
      )}
    </div>
  );
}

function Overview({
  total,
  previewCount,
  unmatchedCount,
  missingPreviewCount,
  attention,
  onSelect,
}: {
  total: number;
  previewCount: number;
  unmatchedCount: number;
  missingPreviewCount: number;
  attention: Feature[];
  onSelect: (feature: Feature) => void;
}) {
  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ready for testing"
          value={total}
          detail="Labeled branches on the board"
          icon={<GitBranch size={18} />}
          color="text-slate-700 bg-slate-100"
        />
        <StatCard
          label="With a testing environment"
          value={previewCount}
          detail={
            total === 0
              ? "No branches yet"
              : `${Math.round((previewCount / total) * 100)}% have a testing URL`
          }
          icon={<Cloud size={18} />}
          color="text-emerald-700 bg-emerald-100"
        />
        <StatCard
          label="Missing a match"
          value={unmatchedCount}
          detail="Web or React Native is not open"
          icon={<Boxes size={18} />}
          color="text-amber-700 bg-amber-100"
        />
        <StatCard
          label="No testing URL"
          value={missingPreviewCount}
          detail="Waiting for someone to add one"
          icon={<CircleDot size={18} />}
          color="text-violet-700 bg-violet-100"
        />
      </div>

      <div className="mt-8">
        <h2 className="text-base font-bold text-slate-900">Needs attention</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Branches missing a repository or a testing URL.
        </p>
        <div className="mt-4 space-y-3">
          {attention.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
              Every ready branch has a web match, a React Native match, and a
              testing URL.
            </div>
          )}
          {attention.map((feature) => {
            const gaps = [
              ...missingSides(feature).map((side) => `Missing ${side}`),
              ...(!feature.previewUrl ? ["No testing URL"] : []),
            ];
            return (
              <button
                key={feature.id}
                onClick={() => onSelect(feature)}
                className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left transition hover:border-slate-300"
              >
                <div className="min-w-0">
                  <div className="truncate font-mono text-sm font-semibold text-slate-950">
                    {feature.webBranch || feature.nativeBranch}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {gaps.join(" · ")}
                  </div>
                </div>
                <ArrowUpRight size={16} className="ml-auto shrink-0 text-slate-400" />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function BranchList({
  features,
  source,
  onSelect,
}: {
  features: Feature[];
  source: "github" | "sample";
  onSelect: (feature: Feature) => void;
}) {
  return (
    <>
      <p className="mt-8 text-xs text-slate-500">
        {features.length} {features.length === 1 ? "branch" : "branches"} shown
      </p>
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {features.map((feature) => (
          <FeatureCard
            key={feature.id}
            feature={feature}
            source={source}
            onSelect={() => onSelect(feature)}
          />
        ))}
      </div>
      {features.length === 0 && (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white py-20 text-center">
          <Search className="mx-auto text-slate-300" size={28} />
          <h3 className="mt-4 text-sm font-bold text-slate-800">
            No branches found
          </h3>
          <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
            {source === "github"
              ? "Label a pull request ready-for-testing, or set its GitHub Project status to Ready to test. Pull requests on the same project are shown together."
              : "Try another search or status filter."}
          </p>
        </div>
      )}
    </>
  );
}

function EnvironmentList({
  features,
  onSelect,
}: {
  features: Feature[];
  onSelect: (feature: Feature) => void;
}) {
  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {features.length === 0 && (
        <div className="px-5 py-16 text-center text-sm text-slate-500">
          No branches to show.
        </div>
      )}
      {features.map((feature) => (
        <div
          key={feature.id}
          className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:flex-row sm:items-center"
        >
          <button
            onClick={() => onSelect(feature)}
            className="min-w-0 flex-1 text-left"
          >
            <div className="truncate font-mono text-sm font-semibold text-slate-950">
              {feature.webBranch || "No web branch"}
            </div>
            {feature.nativeBranch !== feature.webBranch && (
              <div className="mt-1 truncate font-mono text-sm text-slate-600">
                {feature.nativeBranch || "No React Native branch"}
              </div>
            )}
            <div className="mt-1 text-[11px] text-slate-400">
              {feature.webBranch ? "Web" : "Missing web"}
              {" · "}
              {feature.nativeBranch ? "React Native" : "Missing React Native"}
            </div>
          </button>
          {feature.previewUrl ? (
            <a
              href={feature.previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
            >
              <Cloud size={14} />
              <span className="truncate">{feature.previewUrl}</span>
              <ExternalLink size={13} />
            </a>
          ) : (
            <button
              onClick={() => onSelect(feature)}
              className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500"
            >
              Add testing URL
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-white/[.1] text-white shadow-sm"
          : "text-slate-400 hover:bg-white/[.05] hover:text-white"
      }`}
    >
      <span className={active ? "text-[#ff8065]" : ""}>{icon}</span>
      {label}
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#ff6b4a]" />}
    </button>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
  color,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.02)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span className={`grid h-10 w-10 place-items-center rounded-xl ${color}`}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-[11px] font-medium text-slate-400">{detail}</p>
    </div>
  );
}

function branchNames(feature: Feature) {
  if (
    feature.webBranch &&
    feature.nativeBranch &&
    feature.webBranch !== feature.nativeBranch
  ) {
    return [feature.webBranch, feature.nativeBranch];
  }

  return [feature.webBranch || feature.nativeBranch || feature.title];
}

function FeatureCard({
  feature,
  source,
  onSelect,
}: {
  feature: Feature;
  source: "github" | "sample";
  onSelect: () => void;
}) {
  const status = statusStyles[feature.status];
  const branches = branchNames(feature);
  return (
    <article
      onClick={onSelect}
      className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,.02)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_14px_35px_rgba(15,23,42,.07)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <StatusPill status={feature.status} />
          {source === "github" ? (
            <div className="mt-4 space-y-1">
              {feature.projectName && (
                <p className="truncate text-sm font-semibold text-slate-950">
                  {feature.projectName}
                  {feature.projectStatus ? ` · ${feature.projectStatus}` : ""}
                </p>
              )}
              {branches.map((branch) => (
                <h3
                  key={branch}
                  className="truncate font-mono text-sm font-semibold tracking-tight text-slate-950"
                >
                  {branch}
                </h3>
              ))}
            </div>
          ) : (
            <>
              <h3 className="mt-4 text-lg font-bold tracking-[-.02em] text-slate-950">
                {feature.title}
              </h3>
              <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-slate-500">
                {feature.description}
              </p>
            </>
          )}
        </div>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-400 transition group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white">
          <ArrowUpRight size={16} />
        </span>
      </div>

      <div className="mt-5 grid gap-2.5 rounded-xl bg-slate-50/80 p-3.5 sm:grid-cols-2">
        <BranchRow
          label="Web"
          branch={feature.webBranch}
          href={feature.webUrl}
          accent="bg-sky-100 text-sky-700"
        />
        <BranchRow
          label="RN"
          branch={feature.nativeBranch}
          href={feature.nativeUrl}
          accent="bg-fuchsia-100 text-fuchsia-700"
        />
      </div>

      {feature.tickets && feature.tickets.length > 0 && (
        <p className="mt-3 truncate text-xs font-medium text-slate-600">
          {feature.tickets[0].name}
          {feature.tickets.length > 1
            ? ` +${feature.tickets.length - 1} more`
            : ""}
        </p>
      )}

      {source === "sample" && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-500">Delivery progress</span>
            <span className="text-slate-700">{feature.progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full ${status.bar}`}
              style={{ width: `${feature.progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-900 text-[9px] font-bold text-white">
          {initials(feature.owner)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-xs font-semibold text-slate-700">
            {feature.owner}
          </div>
          <div className="text-[10px] text-slate-400">{feature.team}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {source === "github" ? "Updated" : "Target"}
          </div>
          <div className="mt-0.5 text-xs font-semibold text-slate-700">
            {formatDate(feature.targetDate)}
          </div>
        </div>
        <span
          title={
            feature.previewUrl
              ? "Testing environment set"
              : "No testing environment"
          }
          className={`grid h-8 w-8 place-items-center rounded-lg ${
            feature.previewUrl
              ? "bg-emerald-50 text-emerald-600"
              : "bg-slate-50 text-slate-300"
          }`}
        >
          <Cloud size={15} />
        </span>
      </div>
    </article>
  );
}

function FeatureDetail({
  feature,
  source,
  onClose,
  onEdit,
  onPreviewSaved,
}: {
  feature: Feature;
  source: "github" | "sample";
  onClose: () => void;
  onEdit: () => void;
  onPreviewSaved: (id: string, previewUrl: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        className="absolute inset-0 bg-slate-950/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close details"
      />
      <aside className="relative h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
            {source === "github" ? "Branch" : "Feature details"}
          </span>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="mt-8">
          <StatusPill status={feature.status} />
          {source === "github" ? (
            <div className="mt-4 space-y-2">
              {branchNames(feature).map((branch) => (
                <h2
                  key={branch}
                  className="break-all font-mono text-xl font-semibold tracking-tight"
                >
                  {branch}
                </h2>
              ))}
            </div>
          ) : (
            <h2 className="mt-4 text-3xl font-bold tracking-[-.035em]">
              {feature.title}
            </h2>
          )}
          {source === "sample" && (
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {feature.description}
            </p>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <DetailTile label="Owner" value={feature.owner} />
          <DetailTile label="Team" value={feature.team} />
          <DetailTile
            label={source === "github" ? "Updated" : "Target date"}
            value={formatDate(feature.targetDate)}
          />
          {source === "sample" && (
            <DetailTile label="Progress" value={`${feature.progress}%`} />
          )}
        </div>

        {feature.projectName && (
          <div className="mt-8">
            <h3 className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
              GitHub project
            </h3>
            <a
              href={feature.projectUrl ?? "https://github.com/orgs/pocketnest/projects"}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {feature.projectName}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {feature.projectStatus || "No status"}
                </div>
              </div>
              <ExternalLink size={16} className="shrink-0 text-slate-400" />
            </a>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
            Branches
          </h3>
          <div className="mt-3 space-y-3 rounded-2xl border border-slate-200 p-4">
            <BranchRow
              label="Web"
              branch={feature.webBranch}
              href={feature.webUrl}
              accent="bg-sky-100 text-sky-700"
            />
            <div className="h-px bg-slate-100" />
            <BranchRow
              label="RN"
              branch={feature.nativeBranch}
              href={feature.nativeUrl}
              accent="bg-fuchsia-100 text-fuchsia-700"
            />
          </div>
        </div>

        {feature.tickets && (
          <div className="mt-8">
            <h3 className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
              ClickUp tickets
            </h3>
            <div className="mt-3 space-y-2">
              {feature.tickets.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs text-slate-500">
                  No ClickUp tickets tagged {feature.id}.
                </div>
              ) : (
                feature.tickets.map((ticket) => (
                  <a
                    key={ticket.id}
                    href={ticket.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">
                        {ticket.name}
                      </div>
                      <div className="mt-1 truncate text-xs text-slate-500">
                        {ticket.status}
                        {" · "}
                        {ticket.assignees}
                      </div>
                    </div>
                    <ExternalLink size={16} className="shrink-0 text-slate-400" />
                  </a>
                ))
              )}
            </div>
          </div>
        )}

        <div className="mt-8">
          <h3 className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">
            Testing environment
          </h3>
          <div className="mt-3 space-y-3">
            {source === "github" ? (
              <PreviewUrlEditor
                key={`${feature.id}:${feature.previewUrl ?? ""}`}
                featureId={feature.id}
                previewUrl={feature.previewUrl ?? ""}
                onSaved={onPreviewSaved}
              />
            ) : feature.previewUrl ? (
              <PreviewLink label="Testing environment" url={feature.previewUrl} />
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-xs text-slate-500">
                No testing URL yet.
              </div>
            )}
          </div>
        </div>

        {source === "sample" && (
          <button
            onClick={onEdit}
            className="mt-8 h-11 w-full rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Edit feature
          </button>
        )}
        <p className="mt-4 text-center text-[10px] text-slate-400">
          Last updated {formatDate(feature.updatedAt)}
        </p>
      </aside>
    </div>
  );
}

function PreviewUrlEditor({
  featureId,
  previewUrl,
  onSaved,
}: {
  featureId: string;
  previewUrl: string;
  onSaved: (id: string, previewUrl: string) => void;
}) {
  const [url, setUrl] = useState(previewUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    const next = url.trim();
    if (next && !isTestingUrl(next)) {
      setError("Enter an https testing environment URL.");
      return;
    }

    setSaving(true);
    setError("");
    const response = await fetch("/api/testing-urls", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: featureId, testingUrl: next }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    setSaving(false);

    if (!response.ok) {
      setError(body.error ?? "The testing environment URL could not be saved.");
      return;
    }

    onSaved(featureId, next);
  }

  return (
    <form onSubmit={save} className="space-y-3">
      {url.trim() && isTestingUrl(url.trim()) && (
        <PreviewLink label="Testing environment" url={url.trim()} />
      )}
      <input
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="https://testing.example.com"
        className="form-input"
      />
      <p className="text-xs leading-5 text-slate-500">
        Enter the environment people should use to test this branch. Anyone
        signed in can see it, including from another computer.
      </p>
      {error && <p className="text-xs font-medium text-amber-700">{error}</p>}
      <button
        type="submit"
        disabled={saving || url.trim() === previewUrl}
        className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:cursor-default disabled:bg-slate-300"
      >
        {saving ? "Saving..." : previewUrl ? "Save URL" : "Add URL"}
      </button>
    </form>
  );
}

function PreviewLink({ label, url }: { label: string; url?: string }) {
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 transition hover:border-emerald-300"
    >
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm">
        <Cloud size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold">{label}</div>
        <div className="mt-0.5 truncate text-[11px] text-emerald-700/70">{url}</div>
      </div>
      <ExternalLink size={16} />
    </a>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-1.5 truncate text-sm font-semibold text-slate-800">
        {value}
      </div>
    </div>
  );
}

function FeatureForm({
  feature,
  onClose,
  onSave,
}: {
  feature: Feature | null;
  onClose: () => void;
  onSave: (draft: FeatureDraft) => void;
}) {
  const [draft, setDraft] = useState<FeatureDraft>(
    feature
      ? {
          title: feature.title,
          description: feature.description,
          owner: feature.owner,
          team: feature.team,
          status: feature.status,
          targetDate: feature.targetDate,
          webBranch: feature.webBranch,
          nativeBranch: feature.nativeBranch,
          previewUrl: feature.previewUrl ?? "",
          progress: feature.progress,
        }
      : emptyDraft,
  );

  function update<K extends keyof FeatureDraft>(
    key: K,
    value: FeatureDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave({
      ...draft,
      previewUrl: draft.previewUrl?.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="my-6 w-full max-w-2xl rounded-3xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 sm:px-8">
          <div>
            <h2 className="text-xl font-bold tracking-tight">
              {feature ? "Edit feature" : "Add a feature"}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Keep product and engineering aligned on delivery.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="grid max-h-[68vh] gap-5 overflow-y-auto px-6 py-6 sm:grid-cols-2 sm:px-8">
          <Field label="Feature name" className="sm:col-span-2">
            <input
              required
              value={draft.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="e.g. Advanced permissions"
              className="form-input"
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              required
              rows={3}
              value={draft.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="What will this feature enable?"
              className="form-input resize-none py-3"
            />
          </Field>
          <Field label="Owner">
            <input
              required
              value={draft.owner}
              onChange={(event) => update("owner", event.target.value)}
              placeholder="Full name"
              className="form-input"
            />
          </Field>
          <Field label="Team">
            <input
              required
              value={draft.team}
              onChange={(event) => update("team", event.target.value)}
              placeholder="Product team"
              className="form-input"
            />
          </Field>
          <Field label="Status">
            <select
              value={draft.status}
              onChange={(event) =>
                update("status", event.target.value as FeatureStatus)
              }
              className="form-input"
            >
              {featureStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="Target date">
            <input
              required
              type="date"
              value={draft.targetDate}
              onChange={(event) => update("targetDate", event.target.value)}
              className="form-input"
            />
          </Field>
          <Field label="Web branch">
            <input
              required
              value={draft.webBranch}
              onChange={(event) => update("webBranch", event.target.value)}
              placeholder="feat/web-branch"
              className="form-input font-mono text-xs"
            />
          </Field>
          <Field label="React Native branch">
            <input
              required
              value={draft.nativeBranch}
              onChange={(event) => update("nativeBranch", event.target.value)}
              placeholder="feat/native-branch"
              className="form-input font-mono text-xs"
            />
          </Field>
          <Field label="Testing environment" className="sm:col-span-2">
            <input
              type="url"
              value={draft.previewUrl}
              onChange={(event) => update("previewUrl", event.target.value)}
              placeholder="https://testing.example.com"
              className="form-input"
            />
          </Field>
          <Field
            label={`Delivery progress · ${draft.progress}%`}
            className="sm:col-span-2"
          >
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={draft.progress}
              onChange={(event) =>
                update("progress", Number(event.target.value))
              }
              className="mt-2 w-full accent-[#ff6544]"
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5 sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-10 rounded-xl bg-[#ff6544] px-5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,101,68,.2)] hover:bg-[#f05838]"
          >
            {feature ? "Save changes" : "Add feature"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-xs font-bold text-slate-700">{label}</span>
      {children}
    </label>
  );
}
