const EGYPTIAN_MOBILE_RE = /^(?:\+20|0)1[0125]\d{8}$/;

export function looksLikeEgyptianMobile(phone) {
  if (!phone) return false;
  return EGYPTIAN_MOBILE_RE.test(phone.trim());
}
