if (!self.define) {
  let e,
    n = {};
  const s = (s, a) => (
    (s = new URL(s + ".js", a).href),
    n[s] ||
      new Promise((n) => {
        if ("document" in self) {
          const e = document.createElement("script");
          ((e.src = s), (e.onload = n), document.head.appendChild(e));
        } else ((e = s), importScripts(s), n());
      }).then(() => {
        let e = n[s];
        if (!e) throw new Error(`Module ${s} didn’t register its module`);
        return e;
      })
  );
  self.define = (a, c) => {
    const i =
      e ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (n[i]) return;
    let t = {};
    const r = (e) => s(e, i),
      o = { module: { uri: i }, exports: t, require: r };
    n[i] = Promise.all(a.map((e) => o[e] || r(e))).then((e) => (c(...e), t));
  };
}
define(["./workbox-3c9d0171"], function (e) {
  "use strict";
  (importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: "/_next/static/chunks/1068-40dd2d88a7b8422e.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/1288-2050ba85c62cc7b4.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/2018.adaf8feac440f014.js",
          revision: "adaf8feac440f014",
        },
        {
          url: "/_next/static/chunks/2178-52452631a14dc51f.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/2245-c08bdd38c45e2d21.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/2434-809f8bbf6a37fd92.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/2441-d73ee46103840d70.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/264-87e2c8a8bd7e48e8.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/2767-e880af63a5b30728.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/2956-817d139b442892df.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/3050-39f76595cdbd7b40.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/3140-f4e92481cc7221c9.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/3281.23bbbcd46643bdc5.js",
          revision: "23bbbcd46643bdc5",
        },
        {
          url: "/_next/static/chunks/3400.1561e47922f973ad.js",
          revision: "1561e47922f973ad",
        },
        {
          url: "/_next/static/chunks/3890-d7f3ac9df2ebbc45.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/4033.96b0ab06160b411c.js",
          revision: "96b0ab06160b411c",
        },
        {
          url: "/_next/static/chunks/440-18fa2c94ebd17a98.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/4752-a1225850344505e0.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/5728-1bbf0ef50efa41d7.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/5847-3bdb5e8a09c0aa2d.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/605-26206991c5ac2781.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/6556.a87ac9a4fdd42c38.js",
          revision: "a87ac9a4fdd42c38",
        },
        {
          url: "/_next/static/chunks/7099-e7d1f811801cbecc.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/7224-207a78e0951171d3.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/7611-0d4e80fc674792ee.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/783.63e3aad8b6c8021f.js",
          revision: "63e3aad8b6c8021f",
        },
        {
          url: "/_next/static/chunks/8250-6bb66ee65b196d15.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/8509-753f8ab1258215ff.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/8674-f2dc3c1efc64c963.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/8684-942238c8e100e5fb.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/8945.d3ca5fb342033198.js",
          revision: "d3ca5fb342033198",
        },
        {
          url: "/_next/static/chunks/9528-21b205b18efca4bd.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/(main)/favorites/page-41e6c4c696bbe0d1.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/(main)/folder/%5BfolderId%5D/file/%5BfileId%5D/%5Bslug%5D/page-82ee427a78a969ea.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/(main)/folder/%5BfolderId%5D/page-f2cebab551efa22c.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/(main)/layout-733ca8e433825b61.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/(main)/page-cc6fb25dbe303485.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/(main)/search/page-63ffd88ad23d3b0f.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/(main)/share/%5BshareId%5D/page-48c438653da15ff4.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/(main)/storage/loading-b6a4288564550449.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/(main)/storage/page-d4e10c25a00b7751.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/(main)/template-ae02c1aa73735e51.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/(main)/trash/page-129ed7a4338d9f80.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-21739530d939ed0c.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/admin/layout-f939146f49d99d80.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/admin/logs/layout-ee3f7dac0238dd9d.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/admin/logs/page-1b193c1ff666fe41.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/admin/page-d3b334e5c5b0d92f.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/layout-828299b11d06bdc8.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/login/layout-7f1a5379c2752099.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/login/page-b4fbb7f3fea8d189.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/app/request/%5Btoken%5D/page-c2943637938d3e83.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/e834249a-aa492399e857058b.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/framework-20afca218c33ed8b.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/main-67c3e4e6e83b9504.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/main-app-911f5ce007a869ee.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/pages/_app-11c552afb55e26af.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/pages/_error-f2af3adb81d3a702.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-1354f790f719186a.js",
          revision: "jCLocWhaJfPBpx2ne_j_n",
        },
        {
          url: "/_next/static/css/014dfbd8f7502d55.css",
          revision: "014dfbd8f7502d55",
        },
        {
          url: "/_next/static/css/0741f644d5f5bb13.css",
          revision: "0741f644d5f5bb13",
        },
        {
          url: "/_next/static/css/08850d20f66a437f.css",
          revision: "08850d20f66a437f",
        },
        {
          url: "/_next/static/css/43b1d6179d462ed5.css",
          revision: "43b1d6179d462ed5",
        },
        {
          url: "/_next/static/css/48f9bad70a7fa3c1.css",
          revision: "48f9bad70a7fa3c1",
        },
        {
          url: "/_next/static/jCLocWhaJfPBpx2ne_j_n/_buildManifest.js",
          revision: "21eb77c0aecea837580d0c0f887a2f82",
        },
        {
          url: "/_next/static/jCLocWhaJfPBpx2ne_j_n/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/media/fa-brands-400.86ee2658.woff2",
          revision: "86ee2658",
        },
        {
          url: "/_next/static/media/fa-brands-400.8eaf0c88.ttf",
          revision: "8eaf0c88",
        },
        {
          url: "/_next/static/media/fa-regular-400.849b82e2.woff2",
          revision: "849b82e2",
        },
        {
          url: "/_next/static/media/fa-regular-400.bd1cf947.ttf",
          revision: "bd1cf947",
        },
        {
          url: "/_next/static/media/fa-solid-900.7a5aa5ab.ttf",
          revision: "7a5aa5ab",
        },
        {
          url: "/_next/static/media/fa-solid-900.ee698398.woff2",
          revision: "ee698398",
        },
        {
          url: "/_next/static/media/fa-v4compatibility.59487ca3.woff2",
          revision: "59487ca3",
        },
        {
          url: "/_next/static/media/fa-v4compatibility.c63df8a6.ttf",
          revision: "c63df8a6",
        },
        {
          url: "/swe-worker-5c72df51bb1f6ee0.js",
          revision: "5a47d90db13bb1309b25bdf7b363570e",
        },
      ],
      { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] },
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      "/",
      new e.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({ response: e }) =>
              e && "opaqueredirect" === e.type
                ? new Response(e.body, {
                    status: 200,
                    statusText: "OK",
                    headers: e.headers,
                  })
                : e,
          },
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2592e3 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/static.+\.js$/i,
      new e.CacheFirst({
        cacheName: "next-static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:mp4|webm)$/i,
      new e.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ sameOrigin: e, url: { pathname: n } }) =>
        !(!e || n.startsWith("/api/auth/callback") || !n.startsWith("/api/")),
      new e.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: n }, sameOrigin: s }) =>
        "1" === e.headers.get("RSC") &&
        "1" === e.headers.get("Next-Router-Prefetch") &&
        s &&
        !n.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages-rsc-prefetch",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: n }, sameOrigin: s }) =>
        "1" === e.headers.get("RSC") && s && !n.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages-rsc",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ url: { pathname: e }, sameOrigin: n }) => n && !e.startsWith("/api/"),
      new e.NetworkFirst({
        cacheName: "pages",
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    e.registerRoute(
      ({ sameOrigin: e }) => !e,
      new e.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      "GET",
    ),
    (self.__WB_DISABLE_DEV_LOGS = !0));
});
