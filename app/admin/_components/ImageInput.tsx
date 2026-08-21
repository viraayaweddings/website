/**
 * An image field: what is there now, the stored path, and a way to replace it.
 *
 * Every screen that carries a picture used to lay this out for itself, with the
 * preview, the path box and the file input arranged slightly differently each
 * time. One component keeps them consistent and makes the rule — uploading
 * replaces the path — visible in the same place every time.
 */
import { MAX_UPLOAD_BYTES } from "@/worker/admin/media-store";
import { Icon } from "./icons";

const MAX_MB = Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024);
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

/** Stored values are either a site-relative file or an R2 media key. */
export function imagePreview(value: string): string {
  if (!value) return "";
  return value.startsWith("/") ? value : `/media/${value}`;
}

export function ImageInput({
  label,
  pathName,
  fileName,
  current = "",
  hint,
  required,
  /** Wide for banners, square-ish for cards. */
  shape = "wide",
}: {
  label: string;
  /** Field holding the path. Omit to offer upload only. */
  pathName?: string;
  fileName: string;
  current?: string;
  hint?: string;
  required?: boolean;
  shape?: "wide" | "card";
}) {
  const preview = imagePreview(current);
  const box = shape === "wide" ? "h-20 w-32" : "h-20 w-20";

  return (
    <div>
      <span className="vw-label">
        {label}
        {required ? <span style={{ color: "var(--bad)" }}> *</span> : null}
      </span>

      <div className="flex items-start gap-3">
        {preview ? (
          // Plain img: these come from R2 or site-public, not the asset pipeline.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className={`vw-thumb flex-none object-cover ${box}`} loading="lazy" />
        ) : (
          <span
            className={`vw-thumb grid flex-none place-items-center ${box}`}
            style={{ color: "var(--ink-faint)" }}
            aria-hidden="true"
          >
            <Icon name="image" size={18} />
          </span>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          {pathName ? (
            <input
              className="vw-input vw-mono"
              type="text"
              name={pathName}
              defaultValue={current}
              placeholder="/user/assets/images/… or a media key"
              aria-label={`${label} path`}
            />
          ) : null}
          <input type="file" name={fileName} accept={ACCEPT} required={required} className="vw-file" aria-label={`Upload a new ${label.toLowerCase()}`} />
        </div>
      </div>

      <span className="vw-hint">
        {hint ? `${hint} ` : ""}
        JPEG, PNG, WebP or AVIF up to {MAX_MB}MB. Uploading replaces whatever is stored.
      </span>
    </div>
  );
}
