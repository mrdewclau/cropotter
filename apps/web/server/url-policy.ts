import ipaddr from "ipaddr.js";
import { isIP } from "node:net";

export class LinkError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function isPublicAddress(value: string): boolean {
  try {
    const ip = ipaddr.parse(value);
    if (ip.range() !== "unicast") return false;
    if (ip.kind() === "ipv6") {
      const words = (ip as ipaddr.IPv6).parts;
      return (
        words[0] >= 0x2000 &&
        words[0] <= 0x3fff &&
        !(words[0] === 0x2001 && words[1] === 0x0db8)
      );
    }
    return true;
  } catch {
    return false;
  }
}

export function validatePdfUrl(value: string): URL {
  let url: URL;
  try {
    if (value.length > 8192) throw Error();
    url = new URL(value.trim());
  } catch {
    throw new LinkError(
      400,
      "INVALID_URL",
      "Paste a complete, direct HTTPS link to your PDF.",
    );
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443")
  )
    throw new LinkError(
      400,
      "UNSAFE_URL",
      "Use a direct HTTPS PDF link without a username, password or custom port.",
    );
  const host = url.hostname
    .replace(/^\[|\]$/g, "")
    .replace(/\.$/, "")
    .toLowerCase();
  if (
    !host ||
    host === "localhost" ||
    /\.(localhost|local|internal|test|invalid)$/.test(host) ||
    (isIP(host) && !isPublicAddress(host))
  )
    throw new LinkError(
      400,
      "PRIVATE_URL",
      "That link is not a public PDF address. Upload the file instead.",
    );
  return url;
}
