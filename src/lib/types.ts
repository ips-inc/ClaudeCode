export type ProjectKind = "gallery" | "review" | "transfer" | "drive";

export interface Project {
  id: string;
  kind: ProjectKind;
  title: string;
  slug: string;
  description: string | null;
  cover_asset_id: string | null;
  settings: Record<string, unknown>;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  project_id: string;
  parent_id: string | null;
  name: string;
  created_at: string;
}

export interface Asset {
  id: string;
  project_id: string;
  folder_id: string | null;
  filename: string;
  storage_path: string;
  mime: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  duration_s: number | null;
  version: number;
  version_of: string | null;
  position: number;
  created_at: string;
}

export interface ShareLink {
  id: string;
  project_id: string;
  slug: string;
  label: string | null;
  password_hash: string | null;
  expires_at: string | null;
  allow_downloads: boolean;
  download_size: "original" | "web";
  max_downloads: number | null;
  download_count: number;
  view_count: number;
  allow_comments: boolean;
  allow_favorites: boolean;
  revoked_at: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  asset_id: string;
  parent_id: string | null;
  share_link_id: string | null;
  author_name: string;
  is_admin: boolean;
  body: string;
  timecode_s: number | null;
  resolved_at: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  share_link_id: string;
  asset_id: string;
  client_name: string | null;
  created_at: string;
}

export const KIND_META: Record<
  ProjectKind,
  { label: string; blurb: string; replaces: string }
> = {
  gallery: {
    label: "Gallery",
    blurb: "Client photo gallery with proofing & downloads",
    replaces: "Pixieset",
  },
  review: {
    label: "Review",
    blurb: "Video & image review with timecoded comments",
    replaces: "Frame.io",
  },
  transfer: {
    label: "Transfer",
    blurb: "Send files with an expiring link",
    replaces: "WeTransfer",
  },
  drive: {
    label: "Drive",
    blurb: "Personal cloud folders for anything",
    replaces: "Dropbox",
  },
};
