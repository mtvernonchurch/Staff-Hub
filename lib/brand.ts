/** Swap the church logo by replacing public/logo.svg, or set NEXT_PUBLIC_LOGO_URL to a hosted file. */
export const LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL?.trim() || "/logo.svg";
