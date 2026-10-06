"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { secondaryButtonClass } from "@/components/admin/styles";
import { ADMIN_UPLOAD_ACCEPT } from "@/lib/media-upload";

export function MediaUploader({ driver }: { driver: "local" | "r2" }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError("");
    const body = new FormData();
    for (const file of files) body.append("files", file);
    try {
      const response = await fetch("/api/admin/media/", { method: "POST", body });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="mb-4 rounded-lg border border-dashed border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy">Upload images, videos, or PDFs</p>
          <p className="mt-1 text-xs text-muted">
            {driver === "r2"
              ? "Files go to Cloudflare R2."
              : "Files are stored under public/uploads and served from /uploads/."}
          </p>
        </div>
        <label className={secondaryButtonClass}>
          {uploading ? "Uploading…" : "Choose files"}
          <input
            className="sr-only"
            type="file"
            accept={ADMIN_UPLOAD_ACCEPT}
            multiple
            disabled={uploading}
            onChange={(event) => {
              void upload(event.target.files);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      {error ? <p className="mt-3 text-sm text-signal">{error}</p> : null}
    </div>
  );
}
