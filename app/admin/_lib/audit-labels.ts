/**
 * Plain-language labels for `audit_log.action` values.
 *
 * Every action `recordAudit` can write needs an entry. `humanAuditAction` does
 * fall back to the verb after the dot, but that drops the object: eight actions
 * were reaching the activity log through it, so `activity.deleted` printed as
 * "Deleted" and `content.imported` as "Imported" -- in a column where the row
 * beside them says "Article created", a bare verb reads as though something
 * unnamed had gone. The fallback is for an action added and not yet labelled,
 * not the normal path.
 *
 * `tests/audit-labels.test.mjs` fails when a `recordAudit` call names an action
 * that is not in this map.
 */

const LABELS: Record<string, string> = {
  "user.login": "Signed in",
  "user.created": "User created",
  "user.updated": "User updated",
  "user.password_reset": "Password reset",
  "user.deleted": "User deleted",
  "lead.status_changed": "Status changed",
  "lead.notes_updated": "Notes updated",
  "lead.deleted": "Submission deleted",
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
  "lead.bulk_status": "Bulk status change",
  "hotel.bulk_deleted": "Venues bulk deleted",
  "hotel.moved": "Venue URL changed",
  "blog.bulk_deleted": "Articles bulk deleted",
  "user.bulk_deleted": "Users bulk deleted",
  "hero.bulk_deleted": "Slides bulk deleted",
  "media.deleted": "Image deleted",
  "media.bulk_deleted": "Images bulk deleted",
  "media.replaced": "Image replaced",
  "page.updated": "Page updated",
  "page.image_replaced": "Page picture replaced",
  "page.reset": "Page reset",
  "page.bulk_published": "Pages shown or hidden",
  "page.bulk_reset": "Pages reset",
  "city.created": "City page created",
  "city.deleted": "City page deleted",
  "city.bulk_deleted": "City pages bulk deleted",
  "calculator.imported": "Calculator data imported",
  "calculator.city_created": "Calculator city created",
  "calculator.city_updated": "Calculator city updated",
  "calculator.city_deleted": "Calculator city deleted",
  "calculator.city_bulk_deleted": "Calculator cities bulk deleted",
  "calculator.hotel_created": "Calculator hotel created",
  "calculator.hotel_updated": "Calculator hotel updated",
  "calculator.hotel_deleted": "Calculator hotel deleted",
  "calculator.hotel_bulk_deleted": "Calculator hotels bulk deleted",
  "calculator.prices_updated": "Prices updated",
  "venue_type.saved": "Wedding type saved",
  "venue_type.deleted": "Wedding type deleted",
  "calculator.tax_saved": "Tax rate saved",
  "calculator.tax_deleted": "Tax rate deleted",
  "calculator.tax_bulk_deleted": "Tax rates bulk deleted",
  "calculator.currency_saved": "Currency saved",
  "calculator.currency_deleted": "Currency deleted",
  "calculator.currency_bulk_deleted": "Currencies bulk deleted",
  "activity.pruned": "Activity log pruned",
  "activity.bulk_deleted": "Activity entries deleted",
  "activity.deleted": "Activity entry deleted",
  "labels.updated": "Section headings updated",
  "settings.updated": "Contact details updated",
  "content.imported": "Site content imported",
  "page.created": "Page created",
  "lead.exported": "Submissions exported",
  "user.password_changed": "Own password changed",
  "user.password_change_failed": "Own password change refused",
  "user.profile_updated": "Own name changed",
  "user.sessions_cleared": "Signed out everywhere",
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
