import { POST_STATUSES, type BlogFaq, type BlogPost } from "@/worker/db/schema";
import { SubmitButton, UnsavedGuard, VersionField } from "../_components/FormControls";
import { MediaPicker } from "../_components/MediaPicker";
import { RichText } from "../_components/RichText";
import { Card, CardHead, Field, Select, TextArea } from "../_components/ui";
import { versionOf } from "../_lib/concurrency";

/** Blank rows so an editor can add entries without any client-side JavaScript. */
const SPARE_FAQ_ROWS = 2;

function FaqRow({ index, faq }: { index: number; faq?: BlogFaq }) {
  return (
    <div className="rounded-[10px] border p-3" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
      <input type="hidden" name={`faq_id_${index}`} value={faq?.id ?? ""} />
      <Field label={`Question ${index + 1}`} name={`faq_question_${index}`} defaultValue={faq?.question} />
      <div className="mt-2">
        <RichText
          label="Answer"
          name={`faq_answer_${index}`}
          defaultValue={faq?.answer}
          minHeight={130}
          placeholder="The answer shown when this question is opened."
        />
      </div>
    </div>
  );
}

export function PostForm({
  post,
  faqs,
  action,
  submitLabel,
  categories = [],
}: {
  post?: BlogPost;
  faqs: BlogFaq[];
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  /** Categories already in use, offered as suggestions rather than a fixed list. */
  categories?: string[];
}) {
  const rows = faqs.length + SPARE_FAQ_ROWS;

  return (
    // No encType: a form whose action is a server function is always sent as
    // multipart, and setting it by hand makes React warn that it overrode it.
    <form action={action} className="grid gap-4 lg:grid-cols-3">
      <UnsavedGuard />
      {post ? <input type="hidden" name="id" value={post.id} /> : null}
      {post ? <VersionField value={versionOf(post)} /> : null}

      <div className="min-w-0 space-y-4 lg:col-span-2">
        <Card pad={false}>
          <CardHead title="Article" icon="article" />
          <div className="vw-card-pad space-y-4">
            <Field
              label="Heading"
              name="heading"
              defaultValue={post?.heading}
              required
              hint="The large title shown over the banner image."
            />
            <RichText
              label="Body"
              name="bodyHtml"
              defaultValue={post?.bodyHtml}
              minHeight={520}
              placeholder="Write the article. Paste from a document, or drop an image straight in."
              hint="Headings get an id automatically, which is what puts them in the table of contents. Use the HTML button to check the exact markup."
            />
          </div>
        </Card>

        <Card pad={false}>
          <CardHead
            title="Frequently asked questions"
            hint="Clear a question to remove it. Blank rows are ignored."
            icon="info"
          />
          <div className="vw-card-pad space-y-3">
            {Array.from({ length: rows }, (_, index) => (
              <FaqRow key={index} index={index} faq={faqs[index]} />
            ))}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card pad={false}>
          <CardHead title="Publishing" icon="check" />
          <div className="vw-card-pad space-y-3">
            <Select
              label="Status"
              name="status"
              defaultValue={post?.status ?? "draft"}
              options={POST_STATUSES.map((status) => ({ value: status, label: status }))}
              hint="Drafts are hidden from the site and return the usual not-found page."
            />

            <Field
              label="URL slug"
              name="slug"
              defaultValue={post?.slug}
              required
              prefix="/blogs/"
              hint={post ? "Changing this moves the article; its category and tag listings follow it." : undefined}
            />
            <Field
              label="Category"
              name="category"
              defaultValue={post?.category}
              list="blog-categories"
              hint="Pick one already in use, or type a new one."
            />
            <datalist id="blog-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <Field
              label="Date shown"
              name="publishedLabel"
              defaultValue={post?.publishedLabel}
              hint="Printed as typed, e.g. August 07, 2026."
            />
            <Field
              label="Author"
              name="author"
              defaultValue={post?.author}
              hint="Leave blank to hide the byline entirely."
            />
            <input type="hidden" name="position" value={post?.position ?? 0} />
          </div>
        </Card>

        <Card pad={false}>
          <CardHead title="Listing card" hint="How this article looks on the blog index" icon="grid" />
          <div className="vw-card-pad space-y-3">
            <Field label="Card title" name="cardTitle" defaultValue={post?.cardTitle} required />
            <TextArea
              label="Card excerpt"
              name="cardExcerpt"
              rows={3}
              defaultValue={post?.cardExcerpt}
              hint="Plain text. Printed exactly as typed."
            />
            <MediaPicker label="Card image" name="cardImage" defaultValue={post?.cardImage ?? ""} shape="card" />
          </div>
        </Card>

        <Card pad={false}>
          <CardHead title="Search and social" icon="search" />
          <div className="vw-card-pad space-y-3">
            <Field
              label="Title tag"
              name="seoTitle"
              defaultValue={post?.seoTitle}
              required
              hint="Shown in the browser tab and in search results."
            />
            <TextArea
              label="Meta description"
              name="metaDescription"
              rows={3}
              defaultValue={post?.metaDescription}
              hint="Plain text, around 155 characters."
            />
            <MediaPicker label="Banner image" name="bannerImage" defaultValue={post?.bannerImage ?? ""} />
            <MediaPicker
              label="Social share image"
              name="ogImage"
              defaultValue={post?.ogImage ?? ""}
              hint="Used by og:image and twitter:image."
            />
          </div>
        </Card>

        <div className="vw-actionbar">
          <SubmitButton icon="check">{submitLabel}</SubmitButton>
          <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
            The site updates within a minute.
          </span>
        </div>
      </div>
    </form>
  );
}
