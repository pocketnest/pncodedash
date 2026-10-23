export type FeatureStatus =
  | "Planned"
  | "In development"
  | "Ready for testing"
  | "Released";

export type ClickUpTicket = {
  id: string;
  name: string;
  status: string;
  url: string;
  assignees: string;
};

export type Feature = {
  id: string;
  title: string;
  description: string;
  owner: string;
  team: string;
  status: FeatureStatus;
  targetDate: string;
  webBranch: string;
  nativeBranch: string;
  webUrl?: string;
  nativeUrl?: string;
  previewUrl?: string;
  previewUrlFromDeployment?: boolean;
  webPreviewUrl?: string;
  nativePreviewUrl?: string;
  tickets?: ClickUpTicket[];
  projectName?: string;
  projectStatus?: string;
  projectUrl?: string;
  progress: number;
  updatedAt: string;
};

export const featureStatuses: FeatureStatus[] = [
  "Planned",
  "In development",
  "Ready for testing",
  "Released",
];

export const seedFeatures: Feature[] = [
  {
    id: "smart-recommendations",
    title: "Smart recommendations",
    description:
      "Personalized product suggestions based on browsing and purchase signals.",
    owner: "Maya Chen",
    team: "Discovery",
    status: "In development",
    targetDate: "2026-11-06",
    webBranch: "feat/smart-recommendations",
    nativeBranch: "feat/smart-recommendations",
    previewUrl: "https://recommendations.preview.example.com",
    progress: 68,
    updatedAt: "2026-10-18",
  },
  {
    id: "checkout-refresh",
    title: "One-page checkout",
    description:
      "A faster checkout flow with inline validation and express payment options.",
    owner: "Liam Foster",
    team: "Conversion",
    status: "Ready for testing",
    targetDate: "2026-10-29",
    webBranch: "feat/one-page-checkout",
    nativeBranch: "feat/one-page-checkout",
    previewUrl: "https://checkout.preview.example.com",
    progress: 92,
    updatedAt: "2026-10-19",
  },
  {
    id: "team-workspaces",
    title: "Team workspaces",
    description:
      "Shared workspaces with member roles, invitations, and consolidated billing.",
    owner: "Noah Williams",
    team: "Platform",
    status: "In development",
    targetDate: "2026-11-18",
    webBranch: "feat/team-workspaces",
    nativeBranch: "feat/team-workspaces",
    previewUrl: "https://workspaces.preview.example.com",
    progress: 44,
    updatedAt: "2026-10-17",
  },
  {
    id: "usage-insights",
    title: "Usage insights",
    description:
      "An analytics view that helps customers understand adoption and engagement.",
    owner: "Priya Shah",
    team: "Insights",
    status: "Planned",
    targetDate: "2026-12-04",
    webBranch: "feat/usage-insights",
    nativeBranch: "feat/usage-insights",
    progress: 18,
    updatedAt: "2026-10-14",
  },
  {
    id: "saved-views",
    title: "Saved views",
    description:
      "Save frequently used filter combinations and share them with teammates.",
    owner: "Ethan Park",
    team: "Core product",
    status: "Ready for testing",
    targetDate: "2026-10-26",
    webBranch: "feat/saved-views",
    nativeBranch: "feat/saved-views",
    previewUrl: "https://saved-views.preview.example.com",
    progress: 86,
    updatedAt: "2026-10-19",
  },
  {
    id: "notification-center",
    title: "Notification center",
    description:
      "A unified feed for account events, mentions, and product announcements.",
    owner: "Sofia Reyes",
    team: "Engagement",
    status: "Released",
    targetDate: "2026-10-12",
    webBranch: "feat/notification-center",
    nativeBranch: "feat/notification-center",
    previewUrl: "https://notifications.preview.example.com",
    progress: 100,
    updatedAt: "2026-10-12",
  },
];
