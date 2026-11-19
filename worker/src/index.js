// Pages site Worker: serves pages from the go-pages R2 bucket on your own domain.
// /w/<token>/<name>      latest version, anyone with the link
// /w/<token>/vN/<name>   frozen version N
// /p/...                 reserved for private pages (Cloudflare Access later), 404 for now
// Everything else is 404, and nothing is ever listed or indexed.

const TOKEN = /^[A-Za-z0-9_-]{22}$/;
const VERSION = /^v\d+$/;

const BASE_HEADERS = {
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: { ...BASE_HEADERS, "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export default {
  async fetch(request, env) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405, headers: { ...BASE_HEADERS, Allow: "GET, HEAD" } });
    }

    const url = new URL(request.url);
    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: { ...BASE_HEADERS, "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] !== "w" || parts.length < 3 || !TOKEN.test(parts[1])) return notFound();
    if (parts.some((p) => p === "." || p === "..")) return notFound();

    const key = parts.map(decodeURIComponent).join("/");
    const object = await env.PAGES.get(key, { onlyIf: request.headers, range: request.headers });
    if (object === null) return notFound();

    const headers = new Headers(BASE_HEADERS);
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    // Frozen versions never change; the latest link must always revalidate so edits show up on refresh.
    headers.set("Cache-Control", VERSION.test(parts[2]) ? "public, max-age=31536000, immutable" : "no-cache");

    if (!("body" in object)) return new Response(null, { status: 304, headers });
    if (request.method === "HEAD") return new Response(null, { headers });
    const partial = request.headers.has("Range") && object.range;
    if (partial) {
      const { offset = 0, length = object.size - offset } = object.range;
      headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    }
    return new Response(object.body, { status: partial ? 206 : 200, headers });
  },
};
