if (!self.define) {
  let s,
    e = {};
  const a = (a, t) => (
    (a = new URL(a + ".js", t).href),
    e[a] ||
      new Promise((e) => {
        if ("document" in self) {
          const s = document.createElement("script");
          ((s.src = a), (s.onload = e), document.head.appendChild(s));
        } else ((s = a), importScripts(a), e());
      }).then(() => {
        let s = e[a];
        if (!s) throw new Error(`Module ${a} didn’t register its module`);
        return s;
      })
  );
  self.define = (t, n) => {
    const i =
      s ||
      ("document" in self ? document.currentScript.src : "") ||
      location.href;
    if (e[i]) return;
    let c = {};
    const d = (s) => a(s, i),
      r = { module: { uri: i }, exports: c, require: d };
    e[i] = Promise.all(t.map((s) => r[s] || d(s))).then((s) => (n(...s), c));
  };
}
define(["./workbox-3c9d0171"], function (s) {
  "use strict";
  (importScripts(),
    self.skipWaiting(),
    s.clientsClaim(),
    s.precacheAndRoute(
      [
        {
          url: "/_next/static/1HQPotFaILdBdDmSxSshC/_buildManifest.js",
          revision: "58da726255309713491f9fbcd694e072",
        },
        {
          url: "/_next/static/1HQPotFaILdBdDmSxSshC/_ssgManifest.js",
          revision: "b6652df95db52feb4daf4eca35380933",
        },
        {
          url: "/_next/static/chunks/1410.4d153576e7a46d42.js",
          revision: "4d153576e7a46d42",
        },
        {
          url: "/_next/static/chunks/1421-a64338eb4f271f92.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/1515-9f375c4f5c2fb1a4.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/1779-490f6ecd62554bb4.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/184-f978832c72444594.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/2039-758fda79d88eb5ef.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/2049-860462bf72109a20.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/2204.fdf002857e1859da.js",
          revision: "fdf002857e1859da",
        },
        {
          url: "/_next/static/chunks/252-43977ea5556ef942.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/2670-a5f78feab5cbf0a4.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/3046-4c93c3e7acdc395e.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/348-aa05b7d44db3e558.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/362-bee014b03e4adbe5.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/3984-f24a8021bdcb5e6d.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/413-4e80fdac02afa5e3.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/4482-43adb3fe51dec461.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/4696-47129f0070050016.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/4723-258f0b941de37bea.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/4794.4616305585b1978f.js",
          revision: "4616305585b1978f",
        },
        {
          url: "/_next/static/chunks/5517-c0bcbff2cdb5595d.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/5765.674e33c08a460070.js",
          revision: "674e33c08a460070",
        },
        {
          url: "/_next/static/chunks/5777.165f75e1bc327cca.js",
          revision: "165f75e1bc327cca",
        },
        {
          url: "/_next/static/chunks/6109.81e4ab3378f5565c.js",
          revision: "81e4ab3378f5565c",
        },
        {
          url: "/_next/static/chunks/6595-4f00d83776774280.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/7118-60231640d2971749.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/7213-bc44a848d956c3d6.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/745-5219ae729e0e3996.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/7722-4c44485a851cf1f6.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/7761-c60e2a1b9fe8c11e.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/7993-b90cbaae73db9c2a.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/8227.5be928b12cdf29f0.js",
          revision: "5be928b12cdf29f0",
        },
        {
          url: "/_next/static/chunks/9126-e304476c81f2b2e3.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/9391-450726c6d86a5eb7.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/9501-89beea9d917b59fb.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/(main)/favorites/page-6c4535773ce3f48e.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/(main)/folder/%5BfolderId%5D/file/%5BfileId%5D/%5Bslug%5D/page-b0960235be0d4cad.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/(main)/folder/%5BfolderId%5D/page-2bf2778e85a82c07.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/(main)/layout-c5317f09b8454cce.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/(main)/page-feb564226c5ac817.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/(main)/search/page-f5ed36d6e1fdc9e8.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/(main)/share/%5BshareId%5D/page-53920093e23a5686.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/(main)/storage/loading-1cc08489a0304775.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/(main)/storage/page-848d19a090449c64.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/(main)/template-c28645d1d42a0f57.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/(main)/trash/page-dbe369629da3cee3.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/_not-found/page-7f596e381f6e0878.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/admin/layout-b6abdb3cf02f3941.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/admin/logs/layout-c17d58b164098ecc.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/admin/logs/page-7d63b3d4462102de.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/admin/page-872d449121eefe5e.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/layout-b433e04e45c1cfa0.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/login/layout-35f582c0815f074d.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/login/page-ad09a990ee5d8bab.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/request/%5Btoken%5D/page-bfd5de11e5aa8ffe.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/app/setup/page-fc6dd6f6e58a2660.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/bdd89074-98b85fb7ac17c121.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/framework-20afca218c33ed8b.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/main-109e191df0768673.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/main-app-c50aba623ef73d38.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/pages/_app-6f878c315b19d853.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/pages/_error-8b76ef1b466641f0.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/chunks/polyfills-42372ed130431b0a.js",
          revision: "846118c33b2c0e922d7b3a7676f81f6f",
        },
        {
          url: "/_next/static/chunks/webpack-c9c108f88e9712d1.js",
          revision: "1HQPotFaILdBdDmSxSshC",
        },
        {
          url: "/_next/static/css/014dfbd8f7502d55.css",
          revision: "014dfbd8f7502d55",
        },
        {
          url: "/_next/static/css/08850d20f66a437f.css",
          revision: "08850d20f66a437f",
        },
        {
          url: "/_next/static/css/3ec7f687e882425f.css",
          revision: "3ec7f687e882425f",
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
    s.cleanupOutdatedCaches(),
    s.registerRoute(
      "/",
      new s.NetworkFirst({
        cacheName: "start-url",
        plugins: [
          {
            cacheWillUpdate: async ({ response: s }) =>
              s && "opaqueredirect" === s.type
                ? new Response(s.body, {
                    status: 200,
                    statusText: "OK",
                    headers: s.headers,
                  })
                : s,
          },
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new s.CacheFirst({
        cacheName: "google-fonts-webfonts",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new s.StaleWhileRevalidate({
        cacheName: "google-fonts-stylesheets",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new s.StaleWhileRevalidate({
        cacheName: "static-font-assets",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new s.StaleWhileRevalidate({
        cacheName: "static-image-assets",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2592e3 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\/_next\/static.+\.js$/i,
      new s.CacheFirst({
        cacheName: "next-static-js-assets",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new s.StaleWhileRevalidate({
        cacheName: "next-image",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new s.CacheFirst({
        cacheName: "static-audio-assets",
        plugins: [
          new s.RangeRequestsPlugin(),
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:mp4|webm)$/i,
      new s.CacheFirst({
        cacheName: "static-video-assets",
        plugins: [
          new s.RangeRequestsPlugin(),
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:js)$/i,
      new s.StaleWhileRevalidate({
        cacheName: "static-js-assets",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:css|less)$/i,
      new s.StaleWhileRevalidate({
        cacheName: "static-style-assets",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new s.StaleWhileRevalidate({
        cacheName: "next-data",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new s.NetworkFirst({
        cacheName: "static-data-assets",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      ({ sameOrigin: s, url: { pathname: e } }) =>
        !(!s || e.startsWith("/api/auth/callback") || !e.startsWith("/api/")),
      new s.NetworkFirst({
        cacheName: "apis",
        networkTimeoutSeconds: 10,
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      ({ request: s, url: { pathname: e }, sameOrigin: a }) =>
        "1" === s.headers.get("RSC") &&
        "1" === s.headers.get("Next-Router-Prefetch") &&
        a &&
        !e.startsWith("/api/"),
      new s.NetworkFirst({
        cacheName: "pages-rsc-prefetch",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      ({ request: s, url: { pathname: e }, sameOrigin: a }) =>
        "1" === s.headers.get("RSC") && a && !e.startsWith("/api/"),
      new s.NetworkFirst({
        cacheName: "pages-rsc",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      ({ url: { pathname: s }, sameOrigin: e }) => e && !s.startsWith("/api/"),
      new s.NetworkFirst({
        cacheName: "pages",
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      "GET",
    ),
    s.registerRoute(
      ({ sameOrigin: s }) => !s,
      new s.NetworkFirst({
        cacheName: "cross-origin",
        networkTimeoutSeconds: 10,
        plugins: [
          new s.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      "GET",
    ),
    (self.__WB_DISABLE_DEV_LOGS = !0));
});
