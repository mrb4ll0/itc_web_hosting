export type OrganisationRole = "company" | "authority";

function hashBase36(source: string): string {
  let hash = 2166136261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619) & 0x7fffffff;
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(4, "0");
}

export function generatePlatformRegistrationId(role: OrganisationRole, organisationName: string, category: string, email: string): string {
  const prefix = role === "authority" ? "AUTH" : "COMP";
  const cleanName = organisationName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const namePart = cleanName.padEnd(4, "0").slice(0, 4);
  const source = [role, organisationName.trim().toLowerCase(), category.trim().toLowerCase(), email.trim().toLowerCase()].join("|");
  const suffix = hashBase36(source);
  return `${prefix}-${namePart}-${suffix.slice(-4)}`;
}

export function collisionPlatformRegistrationId(baseId: string, uid: string): string {
  return `${baseId}-${hashBase36(`collision|${uid}`).slice(-4)}`;
}

export function isPlatformRegistrationId(value: string, role: OrganisationRole): boolean {
  return new RegExp(`^${role === "authority" ? "AUTH" : "COMP"}-[A-Z0-9]{4}-[A-Z0-9]{4}(?:-[A-Z0-9]{4})?$`).test(value);
}
