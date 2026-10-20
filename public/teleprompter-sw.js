// Service worker minimo: deixa o teleprompter instalavel como aplicativo.
// Nao guarda nada em cache: toda abertura busca a versao mais nova no servidor.
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener("fetch", function (e) { e.respondWith(fetch(e.request)); });
