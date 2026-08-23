"use client";

/**
 * The rich text editor used for every field that reaches the site as raw HTML.
 *
 * It edits the real DOM through a contenteditable element rather than parsing
 * into a document model, which matters here: the stored markup carries the
 * site's own classes and attributes, and a schema-based editor would quietly
 * drop everything it did not recognise. What goes in comes back out.
 *
 * A source view sits behind a toggle so exact markup is always reachable, and
 * the value is mirrored into a hidden input so the existing server actions keep
 * receiving an ordinary form field.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";

interface Props {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
  minHeight?: number;
  placeholder?: string;
}

interface LibraryImage {
  url: string;
  filename: string;
  size: number;
}

/** Formatting the toolbar reports on, so buttons can show what is active. */
const STATE_COMMANDS = ["bold", "italic", "underline", "strikeThrough", "superscript", "subscript"] as const;

const BLOCKS = [
  { tag: "p", label: "Paragraph" },
  { tag: "h2", label: "Heading 2" },
  { tag: "h3", label: "Heading 3" },
  { tag: "h4", label: "Heading 4" },
  { tag: "h5", label: "Heading 5" },
  { tag: "blockquote", label: "Quote" },
  { tag: "pre", label: "Code block" },
] as const;

/** Deliberately small: a house palette beats an arbitrary colour wheel. */
const TEXT_COLOURS = [
  { value: "#0f172a", name: "Ink" },
  { value: "#475569", name: "Grey" },
  { value: "#b91c1c", name: "Red" },
  { value: "#c2410c", name: "Orange" },
  { value: "#a16207", name: "Gold" },
  { value: "#15803d", name: "Green" },
  { value: "#1d4ed8", name: "Blue" },
  { value: "#7e22ce", name: "Purple" },
] as const;

const HIGHLIGHTS = [
  { value: "#fef08a", name: "Yellow" },
  { value: "#bbf7d0", name: "Green" },
  { value: "#bfdbfe", name: "Blue" },
  { value: "#fecaca", name: "Red" },
  { value: "#e9d5ff", name: "Purple" },
  { value: "#f1f5f9", name: "Grey" },
] as const;

/** Bootstrap utilities, because that is what the site's own markup uses. */
const IMAGE_ALIGNMENTS = [
  { key: "none", label: "Inline", classes: [] as string[] },
  { key: "left", label: "Left", classes: ["float-start", "me-3", "mb-2"] },
  { key: "center", label: "Centre", classes: ["d-block", "mx-auto"] },
  { key: "right", label: "Right", classes: ["float-end", "ms-3", "mb-2"] },
] as const;

const ALIGNMENT_CLASSES = IMAGE_ALIGNMENTS.flatMap((entry) => entry.classes);

const WIDTHS = ["", "25%", "50%", "75%", "100%"] as const;

/**
 * The client-side half of the URL rule in worker/admin/rich-text.ts.
 *
 * Kept deliberately simple and deliberately strict: this exists to tell the
 * editor now rather than to be the security boundary, which is on the server
 * where a save cannot route around it.
 */
function isSafeHref(value: string): boolean {
  // Stripping them is the point: a NUL or a zero-width space inside a scheme is
  // how a "javascript:" href slips past a check that reads the scheme literally.
  // eslint-disable-next-line no-control-regex
  const flat = value.trim().replace(/[\u0000-\u0020\u007f\u200b-\u200d\ufeff]/g, "").toLowerCase();
  if (!flat) return false;
  if (flat.startsWith("//")) return false;
  if (flat.startsWith("/") || flat.startsWith("#") || flat.startsWith("?")) return true;
  if (/&[a-z0-9]+;/i.test(flat)) return false;

  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(flat);
  if (!scheme) return true;
  return ["http", "https", "mailto", "tel"].includes(scheme[1]);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’“”]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function escapeText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Word processors paste a wall of inline styles, conditional comments and
 * empty spans. Structure is worth keeping; that wrapping is not.
 */
function cleanPastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // The same set worker/admin/rich-text.ts drops, so the editor is not shown
  // markup that will disappear the moment it is saved.
  doc
    .querySelectorAll(
      "style, meta, link, script, base, iframe, object, embed, form, input, button, " +
        "select, textarea, svg, math, template, noscript, o\\:p",
    )
    .forEach((node) => node.remove());

  doc.body.querySelectorAll("*").forEach((node) => {
    for (const attribute of [...node.attributes]) {
      if (attribute.name.toLowerCase().startsWith("on")) node.removeAttribute(attribute.name);
    }
  });

  doc.body.querySelectorAll<HTMLElement>("*").forEach((node) => {
    node.removeAttribute("style");
    node.removeAttribute("lang");
    node.removeAttribute("dir");
    for (const attribute of [...node.attributes]) {
      // Word and Docs both hide their bookkeeping in data-* and mso classes.
      if (attribute.name.startsWith("data-") || /^(mso|Mso)/.test(attribute.value)) {
        node.removeAttribute(attribute.name);
      }
    }
    const className = node.getAttribute("class") || "";
    if (/mso|docs-internal/i.test(className)) node.removeAttribute("class");

    // A span carrying nothing is only there to hold the styles just removed.
    if (node.tagName === "SPAN" && node.attributes.length === 0) {
      node.replaceWith(...node.childNodes);
    }
  });

  return doc.body.innerHTML.replace(/<!--[\s\S]*?-->/g, "").trim();
}

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  undo: "M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8",
  redo: "M21 7v6h-6M21 13a9 9 0 1 1-3-7.7L21 8",
  bullet: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  number: "M10 6h11M10 12h11M10 18h11M4 4h1v5M4 14h2v1l-2 2v1h3",
  quote: "M7 7h4v6a4 4 0 0 1-4 4M15 7h4v6a4 4 0 0 1-4 4",
  link: "M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1",
  unlink: "M17 7l2-2a5 5 0 0 0-7-7M7 17l-2 2M3 3l18 18",
  image: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6",
  table: "M3 5h18v14H3zM3 10h18M3 15h18M9 5v14M15 5v14",
  rule: "M3 12h18",
  left: "M3 6h18M3 12h12M3 18h16",
  center: "M3 6h18M6 12h12M4 18h16",
  right: "M3 6h18M9 12h12M5 18h16",
  justify: "M3 6h18M3 12h18M3 18h18",
  indent: "M3 6h18M9 12h12M3 18h18M3 10l3 2-3 2",
  outdent: "M3 6h18M9 12h12M3 18h18M6 10l-3 2 3 2",
  clear: "M4 7h16M9 7l1 12h4l1-12M7 3h10",
  expand: "M4 9V4h5M20 15v5h-5M15 4h5v5M9 20H4v-5",
  palette: "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h4a4 4 0 0 0 4-4 6 6 0 0 0-8-6z",
  code: "M8 6l-5 6 5 6M16 6l5 6-5 6",
} as const;

type Panel = "" | "link" | "image" | "table" | "anchor" | "colour";

export function RichText({ label, name, defaultValue = "", hint, minHeight = 320, placeholder }: Props) {
  const editorRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  /** The newest markup, so the editor can be rebuilt after the source view. */
  const latest = useRef(defaultValue);
  /** Where the caret was before focus moved into a toolbar field. */
  const savedRange = useRef<Range | null>(null);
  /** The image a panel is currently editing, when one was clicked. */
  const imageNode = useRef<HTMLImageElement | null>(null);
  const fieldId = useId();

  const [value, setValue] = useState(defaultValue);
  const [source, setSource] = useState(false);
  const [full, setFull] = useState(false);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [block, setBlock] = useState("p");
  const [inTable, setInTable] = useState(false);
  const [panel, setPanel] = useState<Panel>("");
  const [linkHref, setLinkHref] = useState("https://");
  const [linkNewTab, setLinkNewTab] = useState(false);
  const [imageSrc, setImageSrc] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageWidth, setImageWidth] = useState("");
  const [imageAlign, setImageAlign] = useState("none");
  const [editingImage, setEditingImage] = useState(false);
  const [library, setLibrary] = useState<LibraryImage[] | null>(null);
  const [anchorId, setAnchorId] = useState("");
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const sync = useCallback(() => {
    const html = editorRef.current?.innerHTML ?? "";
    latest.current = html;
    if (hiddenRef.current) hiddenRef.current.value = html;
    if (source) setValue(html);
  }, [source]);

  /**
   * The contenteditable is filled imperatively rather than through React, so
   * typing never fights a re-render for control of the caret. Re-running when
   * the source view closes is what carries edits back across the toggle.
   */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || source) return;
    if (editor.innerHTML !== latest.current) editor.innerHTML = latest.current;
  }, [source]);

  /** Walks up from the caret to the first element the toolbar cares about. */
  const closestFromCaret = useCallback((match: RegExp): HTMLElement | null => {
    const editor = editorRef.current;
    const selection = document.getSelection();
    if (!editor || !selection || !selection.anchorNode) return null;
    if (!editor.contains(selection.anchorNode)) return null;

    let node: Node | null = selection.anchorNode;
    while (node && node.nodeType !== 1) node = node.parentNode;
    let element = node as HTMLElement | null;
    while (element && element !== editor && !match.test(element.tagName)) {
      element = element.parentElement;
    }
    return element && element !== editor ? element : null;
  }, []);

  /** Reads the caret's surroundings so the toolbar can reflect them. */
  const refreshState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || source) return;
    const selection = document.getSelection();
    if (!selection || !selection.anchorNode || !editor.contains(selection.anchorNode)) return;

    if (selection.rangeCount) savedRange.current = selection.getRangeAt(0).cloneRange();

    const next: Record<string, boolean> = {};
    for (const command of STATE_COMMANDS) {
      try {
        next[command] = document.queryCommandState(command);
      } catch {
        next[command] = false;
      }
    }
    next.insertUnorderedList = document.queryCommandState("insertUnorderedList");
    next.insertOrderedList = document.queryCommandState("insertOrderedList");
    setActive(next);

    const container = closestFromCaret(/^(P|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|PRE|LI|DIV)$/);
    setBlock(container ? container.tagName.toLowerCase() : "p");
    setInTable(Boolean(closestFromCaret(/^(TD|TH)$/)));
  }, [closestFromCaret, source]);

  useEffect(() => {
    document.addEventListener("selectionchange", refreshState);
    return () => document.removeEventListener("selectionchange", refreshState);
  }, [refreshState]);

  useEffect(() => {
    // Produce <b>/<i> rather than styled spans, which read far better as markup.
    try {
      document.execCommand("styleWithCSS", false, "false");
    } catch {
      /* not every engine exposes it; the default is already what we want */
    }
  }, []);

  useEffect(() => {
    if (!full) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFull(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [full]);

  /**
   * Puts the caret back where it was. Typing into a toolbar field moves focus
   * out of the editor, and a command applied to no selection does nothing.
   */
  const restore = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const range = savedRange.current;
    if (!range || !editor.contains(range.commonAncestorContainer)) return;
    const selection = document.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }, []);

  const run = useCallback(
    (command: string, argument?: string) => {
      restore();
      document.execCommand(command, false, argument);
      sync();
      refreshState();
    },
    [refreshState, restore, sync],
  );

  /** Colours are the one thing worth a span: there is no element for them. */
  const applyColour = useCallback(
    (command: "foreColor" | "hiliteColor", colour: string) => {
      restore();
      try {
        document.execCommand("styleWithCSS", false, "true");
        document.execCommand(command, false, colour);
      } finally {
        document.execCommand("styleWithCSS", false, "false");
      }
      sync();
      refreshState();
    },
    [refreshState, restore, sync],
  );

  /** Headings need stable ids: the blog table of contents is built from them. */
  const applyBlock = useCallback(
    (tag: string) => {
      run("formatBlock", `<${tag}>`);
      if (!/^h[2-5]$/.test(tag)) return;
      const heading = closestFromCaret(/^H[2-5]$/);
      if (heading && !heading.id) {
        const slug = slugify(heading.textContent || "");
        if (slug) {
          heading.id = slug;
          sync();
        }
      }
    },
    [closestFromCaret, run, sync],
  );

  const insertHtml = useCallback(
    (html: string) => {
      run("insertHTML", html);
      setPanel("");
    },
    [run],
  );

  const applyInlineCode = useCallback(() => {
    restore();
    const text = document.getSelection()?.toString() ?? "";
    if (!text) {
      setNotice("Select the text to mark as code first.");
      return;
    }
    run("insertHTML", `<code>${escapeText(text)}</code>`);
  }, [restore, run]);

  const openPanel = useCallback(
    (which: Panel) => {
      setNotice("");

      if (which === "link") {
        const anchor = closestFromCaret(/^A$/) as HTMLAnchorElement | null;
        setLinkHref(anchor?.getAttribute("href") || "https://");
        setLinkNewTab(anchor ? anchor.target === "_blank" : false);
      }

      if (which === "image") {
        // Opened from the toolbar rather than by clicking a picture.
        imageNode.current = null;
        setEditingImage(false);
        setImageSrc("");
        setImageAlt("");
        setImageWidth("");
        setImageAlign("none");
      }

      if (which === "anchor") {
        const heading = closestFromCaret(/^H[1-6]$/);
        setAnchorId(heading ? heading.id : "");
      }

      setPanel((current) => (current === which ? "" : which));
    },
    [closestFromCaret],
  );

  const applyLink = useCallback(() => {
    const href = linkHref.trim();
    if (!href) return;

    // The server sanitiser is the authority and will strip a scheme it does not
    // allow, but silently dropping the href after the editor has clicked Apply
    // is a confusing way to find out. Same rule, said earlier.
    if (!isSafeHref(href)) {
      setNotice("Links can point at https://, mailto:, tel:, or a path on this site.");
      return;
    }

    const existing = closestFromCaret(/^A$/) as HTMLAnchorElement | null;
    if (existing) {
      existing.setAttribute("href", href);
    } else {
      run("createLink", href);
    }

    // execCommand cannot set rel/target, so they are applied afterwards.
    const editor = editorRef.current;
    if (editor) {
      editor.querySelectorAll<HTMLAnchorElement>(`a[href="${CSS.escape(href)}"]`).forEach((anchor) => {
        if (linkNewTab) {
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
        } else {
          anchor.removeAttribute("target");
          anchor.removeAttribute("rel");
        }
      });
    }

    sync();
    setPanel("");
  }, [closestFromCaret, linkHref, linkNewTab, run, sync]);

  const applyAnchor = useCallback(() => {
    const heading = closestFromCaret(/^H[1-6]$/);
    if (!heading) {
      setNotice("Put the caret inside a heading first.");
      return;
    }
    const slug = slugify(anchorId || heading.textContent || "");
    if (slug) heading.id = slug;
    else heading.removeAttribute("id");
    sync();
    setPanel("");
  }, [anchorId, closestFromCaret, sync]);

  /* --- images ------------------------------------------------------------ */

  const describeImage = useCallback((image: HTMLImageElement) => {
    imageNode.current = image;
    setEditingImage(true);
    setImageSrc(image.getAttribute("src") || "");
    setImageAlt(image.getAttribute("alt") || "");
    setImageWidth(image.style.width || "");
    const classes = [...image.classList];
    const alignment = IMAGE_ALIGNMENTS.find(
      (entry) => entry.classes.length > 0 && entry.classes.every((name) => classes.includes(name)),
    );
    setImageAlign(alignment?.key ?? "none");
    setPanel("image");
    setNotice("");
  }, []);

  const dressImage = useCallback(
    (image: HTMLImageElement) => {
      image.setAttribute("alt", imageAlt);
      image.setAttribute("loading", "lazy");
      image.setAttribute("decoding", "async");
      image.classList.add("img-fluid");
      image.classList.remove(...ALIGNMENT_CLASSES);
      const alignment = IMAGE_ALIGNMENTS.find((entry) => entry.key === imageAlign);
      if (alignment?.classes.length) image.classList.add(...alignment.classes);
      if (imageWidth) image.style.width = imageWidth;
      else image.style.removeProperty("width");
      if (!image.getAttribute("style")) image.removeAttribute("style");
    },
    [imageAlign, imageAlt, imageWidth],
  );

  const applyImage = useCallback(() => {
    const src = imageSrc.trim();
    if (!src) {
      setNotice("Choose or upload an image first.");
      return;
    }

    const existing = imageNode.current;
    if (existing) {
      existing.setAttribute("src", src);
      dressImage(existing);
      sync();
      setPanel("");
      return;
    }

    // Built as a node so the same dressing rules apply to old and new images.
    const image = document.createElement("img");
    image.setAttribute("src", src);
    dressImage(image);
    insertHtml(image.outerHTML);
    setImageSrc("");
    setImageAlt("");
  }, [dressImage, imageSrc, insertHtml, sync]);

  const removeImage = useCallback(() => {
    imageNode.current?.remove();
    imageNode.current = null;
    setEditingImage(false);
    sync();
    setPanel("");
  }, [sync]);

  const upload = useCallback(async (file: File): Promise<string> => {
    setBusy(true);
    setNotice("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/admin/media/upload", { method: "POST", body });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) {
        setNotice(result.error || "Upload failed.");
        return "";
      }
      return result.url;
    } catch {
      setNotice("Upload failed.");
      return "";
    } finally {
      setBusy(false);
    }
  }, []);

  const uploadIntoPanel = useCallback(
    async (file: File) => {
      const url = await upload(file);
      if (!url) return;
      setImageSrc(url);
      setNotice("Uploaded. Add alt text, then insert.");
    },
    [upload],
  );

  /** Used by drag-and-drop and pasted screenshots, which skip the panel. */
  const uploadAndInsert = useCallback(
    async (file: File) => {
      const url = await upload(file);
      if (!url) return;
      const image = document.createElement("img");
      image.setAttribute("src", url);
      image.setAttribute("alt", "");
      image.setAttribute("loading", "lazy");
      image.setAttribute("decoding", "async");
      image.className = "img-fluid";
      run("insertHTML", image.outerHTML);
      setNotice("Image added. Click it to set alt text.");
    },
    [run, upload],
  );

  const loadLibrary = useCallback(async () => {
    setNotice("");
    try {
      const response = await fetch("/admin/media/upload");
      const result = (await response.json()) as { images?: LibraryImage[]; error?: string };
      if (!response.ok || !result.images) {
        setNotice(result.error || "Could not load the image library.");
        return;
      }
      setLibrary(result.images);
      if (result.images.length === 0) setNotice("Nothing uploaded yet.");
    } catch {
      setNotice("Could not load the image library.");
    }
  }, []);

  /* --- tables ------------------------------------------------------------ */

  const applyTable = useCallback(() => {
    const body = Array.from({ length: Math.max(1, rows) }, () =>
      `    <tr>${Array.from({ length: Math.max(1, cols) }, () => "<td>&nbsp;</td>").join("")}</tr>`,
    ).join("\n");
    const head = `    <tr>${Array.from({ length: Math.max(1, cols) }, (_, index) => `<th>Column ${index + 1}</th>`).join("")}</tr>`;
    insertHtml(`<table class="table">\n  <thead>\n${head}\n  </thead>\n  <tbody>\n${body}\n  </tbody>\n</table><p><br></p>`);
  }, [cols, insertHtml, rows]);

  type TableOp = "rowAbove" | "rowBelow" | "colBefore" | "colAfter" | "dropRow" | "dropCol" | "dropTable";

  const tableOp = useCallback(
    (operation: TableOp) => {
      const cell = closestFromCaret(/^(TD|TH)$/) as HTMLTableCellElement | null;
      const row = cell?.parentElement as HTMLTableRowElement | null;
      const table = cell?.closest("table");
      if (!cell || !row || !table) {
        setNotice("Put the caret inside a table first.");
        return;
      }

      const index = cell.cellIndex;
      const allRows = [...table.querySelectorAll("tr")];

      if (operation === "dropTable") {
        table.remove();
      } else if (operation === "rowAbove" || operation === "rowBelow") {
        const fresh = document.createElement("tr");
        for (let column = 0; column < row.cells.length; column += 1) {
          const added = document.createElement("td");
          added.innerHTML = "&nbsp;";
          fresh.appendChild(added);
        }
        row.parentElement?.insertBefore(fresh, operation === "rowAbove" ? row : row.nextSibling);
      } else if (operation === "colBefore" || operation === "colAfter") {
        for (const current of allRows) {
          const heading = Boolean(current.closest("thead")) || current.cells[0]?.tagName === "TH";
          const added = document.createElement(heading ? "th" : "td");
          added.innerHTML = heading ? "Column" : "&nbsp;";
          const at = operation === "colBefore" ? index : index + 1;
          current.insertBefore(added, current.children[at] ?? null);
        }
      } else if (operation === "dropRow") {
        if (allRows.length <= 1) table.remove();
        else row.remove();
      } else if (operation === "dropCol") {
        if ((allRows[0]?.children.length ?? 0) <= 1) {
          table.remove();
        } else {
          for (const current of allRows) current.children[index]?.remove();
        }
      }

      sync();
      refreshState();
    },
    [closestFromCaret, refreshState, sync],
  );

  /* --- input handling ---------------------------------------------------- */

  const onPaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const file = [...event.clipboardData.files].find((candidate) => candidate.type.startsWith("image/"));
      if (file) {
        event.preventDefault();
        void uploadAndInsert(file);
        return;
      }

      const html = event.clipboardData.getData("text/html");
      if (!html) return; // Plain text pastes are already what we want.
      event.preventDefault();
      run("insertHTML", cleanPastedHtml(html));
    },
    [run, uploadAndInsert],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const file = [...event.dataTransfer.files].find((candidate) => candidate.type.startsWith("image/"));
      if (!file) return;
      event.preventDefault();

      // Drop where the pointer is, not where the caret happened to be left.
      const document_ = document as Document & {
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
      };
      const range = document_.caretRangeFromPoint?.(event.clientX, event.clientY);
      if (range && editorRef.current?.contains(range.commonAncestorContainer)) {
        savedRange.current = range;
      }
      void uploadAndInsert(file);
    },
    [uploadAndInsert],
  );

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "IMG") describeImage(target as HTMLImageElement);
      else if (editingImage) {
        imageNode.current = null;
        setEditingImage(false);
      }
    },
    [describeImage, editingImage],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if (key === "k") {
        event.preventDefault();
        openPanel("link");
      } else if (key === "b" || key === "i" || key === "u") {
        // The browser handles these, but the toolbar state has to follow.
        setTimeout(refreshState, 0);
      }
    },
    [openPanel, refreshState],
  );

  const toSource = useCallback(() => {
    if (source) {
      setSource(false); // The effect above rebuilds the editor from `latest`.
    } else {
      sync();
      setSource(true);
    }
  }, [source, sync]);

  const text = value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characters = text.replace(/\s+/g, " ").trim().length;

  const button = (
    key: string,
    title: string,
    onClick_: () => void,
    content: React.ReactNode,
    isActive = false,
  ) => (
    <button
      key={key}
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick_}
      className="vw-rte-tool"
    >
      {content}
    </button>
  );

  const divider = <span className="vw-rte-sep" />;

  return (
    <div className={full ? "fixed inset-0 z-50 flex flex-col p-4" : ""} style={full ? { background: "var(--canvas)" } : undefined}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="vw-label" id={`${fieldId}-label`}>
          {label}
        </span>
        <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
          {words} word{words === 1 ? "" : "s"} · {characters} characters
        </span>
      </div>

      <div className={`vw-rte-shell ${full ? "flex min-h-0 flex-1 flex-col" : ""}`}>
        <div className="vw-rte-toolbar">
          {button("undo", "Undo", () => run("undo"), <Icon path={ICONS.undo} />)}
          {button("redo", "Redo", () => run("redo"), <Icon path={ICONS.redo} />)}
          {divider}

          <select
            value={BLOCKS.some((entry) => entry.tag === block) ? block : "p"}
            onChange={(event) => applyBlock(event.target.value)}
            onMouseDown={(event) => event.stopPropagation()}
            disabled={source}
            aria-label="Paragraph style"
            className="vw-rte-select"
          >
            {BLOCKS.map((entry) => (
              <option key={entry.tag} value={entry.tag}>
                {entry.label}
              </option>
            ))}
          </select>
          {divider}

          {button("bold", "Bold (Ctrl+B)", () => run("bold"), <strong>B</strong>, active.bold)}
          {button("italic", "Italic (Ctrl+I)", () => run("italic"), <em>I</em>, active.italic)}
          {button("underline", "Underline (Ctrl+U)", () => run("underline"), <span className="underline">U</span>, active.underline)}
          {button("strike", "Strikethrough", () => run("strikeThrough"), <span className="line-through">S</span>, active.strikeThrough)}
          {button("sup", "Superscript", () => run("superscript"), <span className="text-xs">x²</span>, active.superscript)}
          {button("sub", "Subscript", () => run("subscript"), <span className="text-xs">x₂</span>, active.subscript)}
          {button("code", "Inline code", applyInlineCode, <Icon path={ICONS.code} />)}
          {button("colour", "Text and highlight colour", () => openPanel("colour"), <Icon path={ICONS.palette} />, panel === "colour")}
          {divider}

          {button("ul", "Bulleted list", () => run("insertUnorderedList"), <Icon path={ICONS.bullet} />, active.insertUnorderedList)}
          {button("ol", "Numbered list", () => run("insertOrderedList"), <Icon path={ICONS.number} />, active.insertOrderedList)}
          {button("outdent", "Decrease indent", () => run("outdent"), <Icon path={ICONS.outdent} />)}
          {button("indent", "Increase indent", () => run("indent"), <Icon path={ICONS.indent} />)}
          {divider}

          {button("quote", "Quote", () => applyBlock("blockquote"), <Icon path={ICONS.quote} />)}
          {button("hr", "Divider", () => insertHtml("<hr>"), <Icon path={ICONS.rule} />)}
          {divider}

          {button("left", "Align left", () => run("justifyLeft"), <Icon path={ICONS.left} />)}
          {button("center", "Align centre", () => run("justifyCenter"), <Icon path={ICONS.center} />)}
          {button("right", "Align right", () => run("justifyRight"), <Icon path={ICONS.right} />)}
          {button("justify", "Justify", () => run("justifyFull"), <Icon path={ICONS.justify} />)}
          {divider}

          {button("link", "Link (Ctrl+K)", () => openPanel("link"), <Icon path={ICONS.link} />, panel === "link")}
          {button("unlink", "Remove link", () => run("unlink"), <Icon path={ICONS.unlink} />)}
          {button("image", "Image", () => openPanel("image"), <Icon path={ICONS.image} />, panel === "image")}
          {button("table", "Table", () => openPanel("table"), <Icon path={ICONS.table} />, panel === "table")}
          {button("anchor", "Heading id", () => openPanel("anchor"), <span className="text-xs font-semibold">#</span>, panel === "anchor")}
          {divider}
          {button("clear", "Clear formatting", () => run("removeFormat"), <Icon path={ICONS.clear} />)}

          <span className="ml-auto flex items-center gap-0.5">
            {button("full", full ? "Exit full screen (Esc)" : "Full screen", () => setFull((current) => !current), <Icon path={ICONS.expand} />, full)}
            <button
              type="button"
              onClick={toSource}
              className="vw-rte-tool font-mono"
              data-on={source}
            >
              HTML
            </button>
          </span>
        </div>

        {/* Row operations only make sense with the caret in a table, so they
            appear beside it rather than crowding the toolbar permanently. */}
        {inTable && !source ? (
          <div className="vw-rte-panel gap-1 text-xs" style={{ alignItems: "center" }}>
            <span className="mr-1 font-medium">Table</span>
            {(
              [
                ["rowAbove", "Row above"],
                ["rowBelow", "Row below"],
                ["colBefore", "Column left"],
                ["colAfter", "Column right"],
                ["dropRow", "Delete row"],
                ["dropCol", "Delete column"],
                ["dropTable", "Delete table"],
              ] as [TableOp, string][]
            ).map(([operation, title]) => (
              <button
                key={operation}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => tableOp(operation)}
                className="vw-btn vw-btn-secondary vw-btn-sm"
              >
                {title}
              </button>
            ))}
          </div>
        ) : null}

        {panel ? (
          <div className="vw-rte-panel">
            {panel === "colour" ? (
              <>
                <div>
                  <span className="mb-1 block">Text colour</span>
                  <div className="flex flex-wrap gap-1">
                    {TEXT_COLOURS.map((colour) => (
                      <button
                        key={colour.value}
                        type="button"
                        title={colour.name}
                        aria-label={`Text ${colour.name}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyColour("foreColor", colour.value)}
                        className="h-6 w-6 rounded"
                        // A thin outline keeps a pale swatch visible on white.
                        data-swatch="true"
                        style={{ background: colour.value }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <span className="mb-1 block">Highlight</span>
                  <div className="flex flex-wrap gap-1">
                    {HIGHLIGHTS.map((colour) => (
                      <button
                        key={colour.value}
                        type="button"
                        title={colour.name}
                        aria-label={`Highlight ${colour.name}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyColour("hiliteColor", colour.value)}
                        className="h-6 w-6 rounded"
                        // A thin outline keeps a pale swatch visible on white.
                        data-swatch="true"
                        style={{ background: colour.value }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyColour("hiliteColor", "transparent")}
                  className="vw-btn vw-btn-secondary vw-btn-sm"
                >
                  Clear highlight
                </button>
              </>
            ) : null}

            {panel === "link" ? (
              <>
                <label className="flex-1">
                  <span className="mb-1 block">Link address</span>
                  <input
                    value={linkHref}
                    onChange={(event) => setLinkHref(event.target.value)}
                    placeholder="https://example.com or /contact/"
                    className="w-full"
                  />
                </label>
                <label className="flex items-center gap-1.5 py-2" style={{ color: "var(--ink-soft)" }}>
                  <input
                    type="checkbox"
                    aria-label="Open the link in a new tab"
                    checked={linkNewTab}
                    onChange={(event) => setLinkNewTab(event.target.checked)}
                  />
                  Open in a new tab
                </label>
                <button type="button" onClick={applyLink} className="vw-btn vw-btn-primary vw-btn-sm">
                  Apply
                </button>
              </>
            ) : null}

            {panel === "image" ? (
              <>
                <label className="min-w-52 flex-1">
                  <span className="mb-1 block">Image address</span>
                  <input
                    value={imageSrc}
                    onChange={(event) => setImageSrc(event.target.value)}
                    placeholder="/media/…"
                    className="w-full"
                  />
                </label>
                <label className="min-w-40 flex-1">
                  <span className="mb-1 block">Alt text</span>
                  <input
                    value={imageAlt}
                    onChange={(event) => setImageAlt(event.target.value)}
                    placeholder="What the image shows"
                    className="w-full"
                  />
                </label>
                <label>
                  <span className="mb-1 block">Width</span>
                  <select
                    value={imageWidth}
                    onChange={(event) => setImageWidth(event.target.value)}
                    className=""
                  >
                    {WIDTHS.map((width) => (
                      <option key={width || "auto"} value={width}>
                        {width || "Original"}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block">Position</span>
                  <select
                    value={imageAlign}
                    onChange={(event) => setImageAlign(event.target.value)}
                    className=""
                  >
                    {IMAGE_ALIGNMENTS.map((entry) => (
                      <option key={entry.key} value={entry.key}>
                        {entry.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="vw-btn vw-btn-secondary vw-btn-sm cursor-pointer">
                  {busy ? "Uploading…" : "Upload"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void uploadIntoPanel(file);
                      event.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void loadLibrary()}
                  className="vw-btn vw-btn-secondary vw-btn-sm"
                >
                  Browse library
                </button>
                <button type="button" onClick={applyImage} className="vw-btn vw-btn-primary vw-btn-sm">
                  {editingImage ? "Update" : "Insert"}
                </button>
                {editingImage ? (
                  <button
                    type="button"
                    onClick={removeImage}
                    className="vw-btn vw-btn-danger-quiet vw-btn-sm"
                  >
                    Remove
                  </button>
                ) : null}

                {library && library.length > 0 ? (
                  <div className="vw-scroll max-h-44 w-full overflow-y-auto rounded p-2"
                    style={{ border: "1px solid var(--line)", background: "var(--surface)" }}>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
                      {library.map((entry) => (
                        <button
                          key={entry.url}
                          type="button"
                          title={`${entry.filename} · ${formatSize(entry.size)}`}
                          onClick={() => {
                            setImageSrc(entry.url);
                            setNotice("Selected. Add alt text, then insert.");
                          }}
                          className="overflow-hidden rounded border"
                          style={{
                            borderColor: imageSrc === entry.url ? "var(--accent)" : "var(--line)",
                            boxShadow: imageSrc === entry.url ? "var(--ring)" : undefined,
                          }}
                        >
                          {/* Plain img: these come from R2, not the asset pipeline. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={entry.url} alt="" className="h-16 w-full object-cover" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}

            {panel === "table" ? (
              <>
                <label>
                  <span className="mb-1 block">Rows</span>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={rows}
                    onChange={(event) => setRows(Number(event.target.value))}
                    className="w-20"
                  />
                </label>
                <label>
                  <span className="mb-1 block">Columns</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={cols}
                    onChange={(event) => setCols(Number(event.target.value))}
                    className="w-20"
                  />
                </label>
                <button type="button" onClick={applyTable} className="vw-btn vw-btn-primary vw-btn-sm">
                  Insert table
                </button>
              </>
            ) : null}

            {panel === "anchor" ? (
              <>
                <label className="flex-1">
                  <span className="mb-1 block">
                    Heading id — the table of contents links to it
                  </span>
                  <input
                    value={anchorId}
                    onChange={(event) => setAnchorId(event.target.value)}
                    placeholder="Leave blank to build one from the heading text"
                    className="vw-mono w-full"
                  />
                </label>
                <button type="button" onClick={applyAnchor} className="vw-btn vw-btn-primary vw-btn-sm">
                  Apply
                </button>
              </>
            ) : null}

            <button type="button" onClick={() => setPanel("")} className="vw-btn vw-btn-ghost vw-btn-sm">
              Close
            </button>
            {notice ? <span className="w-full" style={{ color: "var(--ink-soft)" }}>{notice}</span> : null}
          </div>
        ) : null}

        {source ? (
          <textarea
            value={value}
            onChange={(event) => {
              latest.current = event.target.value;
              if (hiddenRef.current) hiddenRef.current.value = event.target.value;
              setValue(event.target.value);
            }}
            spellCheck={false}
            aria-label={`${label} — HTML source`}
            style={{ minHeight: full ? undefined : minHeight }}
            className={`vw-rte-source vw-scroll px-3 py-2 font-mono text-xs leading-relaxed ${
              full ? "min-h-0 flex-1" : ""
            }`}
          />
        ) : (
          <div
            ref={editorRef}
            role="textbox"
            tabIndex={0}
            aria-multiline="true"
            aria-labelledby={`${fieldId}-label`}
            data-placeholder={placeholder ?? "Start writing, or paste from a document."}
            contentEditable
            suppressContentEditableWarning
            onInput={sync}
            onBlur={sync}
            onPaste={onPaste}
            onDrop={onDrop}
            onClick={onClick}
            onKeyDown={onKeyDown}
            onMouseUp={refreshState}
            style={{ minHeight: full ? undefined : minHeight }}
            className={`vw-rte-body vw-scroll overflow-y-auto px-4 py-3 text-sm leading-relaxed outline-none ${
              full ? "min-h-0 flex-1" : ""
            }`}
          />
        )}
      </div>

      {/* Updated through a ref while editing so large HTML does not re-render on every keystroke. */}
      <input type="hidden" name={name} ref={hiddenRef} defaultValue={defaultValue} />
      {hint ? <span className="vw-hint">{hint}</span> : null}

    </div>
  );
}
