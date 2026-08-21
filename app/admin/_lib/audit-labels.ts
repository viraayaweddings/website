/** Plain-language labels for audit_log.action values. */

const LABELS: Record<string, string> = {
  "user.login": "Signed in",
  "user.created": "User created",
  "user.updated": "User updated",
  "user.password_reset": "Password reset",
  "user.deleted": "User deleted",
  "lead.status_changed": "Status changed",
  "lead.notes_updated": "Notes updated",
  "lead.deleted": "Submission deleted",
  "lead.bulk_status": "Bulk status change",
  "lead.bulk_deleted": "Bulk delete",
  "lead.email_resent": "Notification resent",
  "lead.email_resend_failed": "Notification resend failed",
  "hotel.created": "Venue created",
  "hotel.updated": "Venue updated",
  "hotel.deleted": "Venue deleted",
  "blog.created": "Article created",
  "blog.updated": "Article updated",
  "blog.deleted": "Article deleted",
  "blog.reordered": "Article reordered",
  "blog_section.updated": "Section listing updated",
  "city.updated": "City page updated",
  "hero.slide_created": "Slide created",
  "hero.slide_updated": "Slide updated",
  "hero.slide_deleted": "Slide deleted",
  "hero.reordered": "Slide reordered",
  "media.deleted": "Image deleted",
  "labels.updated": "Section headings updated",
  "settings.updated": "Contact details updated",
};

export function humanAuditAction(action: string): string {
  if (LABELS[action]) return LABELS[action];
  const [, verb = action] = action.split(".");
  return verb.replace(/_/g, " ").replace(/^./, (character) => character.toUpperCase());
}

export function auditActionTone(action: string): "bad" | "ok" | "accent" | "neutral" {
  if (action.includes("deleted") || action.includes("resend_failed")) return "bad";
  if (action.includes("created") || action.includes("resent")) return "ok";
  if (action.startsWith("user.")) return "accent";
  return "neutral";
}
