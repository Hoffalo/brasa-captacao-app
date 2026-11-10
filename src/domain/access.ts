/** Access rule: only verified accounts of the organization's Google Workspace domain get in. */
export function isAllowedEmail(email: string | null | undefined, emailVerified: boolean | null | undefined, allowedDomain: string): boolean {
  if (!email || emailVerified === false) return false;
  return email.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`);
}
