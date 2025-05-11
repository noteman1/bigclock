const CACHE_NAME = 'bigclock-v1';
const urlsToCache = [
  '/bigclock/',
  '/bigclock/index.html',
  '/bigclock/manifest.json',
  '/bigclock/icon-192x192.png',
  '/bigclock/icon-512x512.png'
];

// 서비스워커 설치 및 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('캐시 열기 성공');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// 서비스워커 활성화 및 이전 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 네트워크 요청 가로채기 및 캐시 먼저 확인
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // 캐시에서 찾았으면 반환
        if (response) {
          return response;
        }
        
        // 캐시에 없으면 네트워크로 요청
        return fetch(event.request).then(
          (response) => {
            // 유효한 응답인지 확인 (응답이 유효하지 않으면 그냥 반환)
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 응답 복제 (스트림은 한 번만 사용할 수 있음)
            const responseToCache = response.clone();

            // 캐시에 응답 저장
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // 네트워크 요청 실패 시 기본 페이지 제공 (옵션)
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          // 기타 리소스는 실패 처리
          return new Response('오프라인 상태입니다.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});