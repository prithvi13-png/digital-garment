const TARGET_ORIGIN = "https://digital-factory-erp.vercel.app";

export default {
  async fetch(request) {
    const incomingUrl = new URL(request.url);
    const targetUrl = new URL(request.url);
    targetUrl.protocol = "https:";
    targetUrl.hostname = "digital-factory-erp.vercel.app";
    targetUrl.port = "";

    const headers = new Headers(request.headers);
    headers.set("host", "digital-factory-erp.vercel.app");
    headers.set("x-forwarded-host", incomingUrl.host);
    headers.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

    const upstreamReq = new Request(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "follow",
      cf: {
        cacheTtl: 0,
        cacheEverything: false,
      },
    });

    const upstreamRes = await fetch(upstreamReq);
    const resHeaders = new Headers(upstreamRes.headers);
    resHeaders.set("x-live-origin", TARGET_ORIGIN);

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: resHeaders,
    });
  },
};
