const staticCacheName = "ScroocCacheV1";
const dynamicCacheName = "ScroocDynamicCacheV1";
// const offlineCacheName = "ScroocOfflineCacheV1";
const assets = [
    '/',
    '/css/main_styles.css',
    '/js/ui.js',
    '//fonts.googleapis.com/css2?family=Titillium+Web:wght@300;400;600&display=swap',
    '/icons/search.svg',
    '/icons/favicon.svg',
    '/img/bg.png',
    '/img/og.png',
    '/img/generated.svg',
    '/icons/at.svg',
    '/icons/heartFull.svg',
    '/icons/comment.svg',
    '/icons/share.svg',
    '/icons/report.svg',
    '/manifest.json',
    '/img/fallback.html',
    '/img/fallbackImage.png',
    '/img/beepBoop.mp3',
    '/about',
    '/policies',
    '/register',
    '/createTopic',
    '/stats',
    '/proposals',
];
// fallback profile, explore, main, payment, search sorry you are currently offline page?

const limitCacheSize = (name, size) => {
    caches.open(name).then(cache => {
        cache.keys().then(keys => {
            if(keys.length > size) {
                cache.delete(keys[0]).then(limitCacheSize(name, size));
            }
        });
    });
}
const dynamicCacheLimit = 25;

// Install service worker
self.addEventListener('install', evt => {
    evt.waitUntil(
        caches.open(staticCacheName).then(cache => {
            cache.addAll(assets);
        })
    );
});

// Activate event
self.addEventListener('activate', evt => {
    evt.waitUntil(
        caches.keys().then(keys => {
            keys.map((key => {
                if (key !== staticCacheName && key !== dynamicCacheName) {
                    return caches.delete(key); //Deleting the old cache (cache v1)
                }
            }));
            // dodej nazaj ce se zbrise
            if(!keys.includes(staticCacheName)) {
                caches.open(staticCacheName).then(cache => {
                    cache.addAll(assets);
                });
            }
        })
    )
});

function offline(evt){
    return caches.match(evt.request).catch((error) => {
        if(/.jpeg|.jpg|.png|.webp/.test(evt.request.url)) {
            return caches.match('/img/fallbackImage.png');
        } else if(/.gif/.test(evt.request.url)) {
            return caches.match('/img/fallbackImage.png');
        } else if(/.mp3|.ogg|.aac|.wav/.test(evt.request.url)) {
            return caches.match('/img/beepBoop.mp3');
        } else {
            return caches.match('/img/fallback.html');
        } 
    });
} 

// Intercept fetch 
self.addEventListener('fetch', evt => {
    if(/.jpeg|.jpg|.png|.webp|.gif|.mp3|.ogg|.aac|.wav|.css|.js|.svg|fonts.googleapis.com/.test(evt.request)) {
        evt.respondWith(
            caches.match(evt.request).then(function(result) {
                caches.open(dynamicCacheName).then(cache => {
                    if (result) {
                        return result;
                    } else {
                        fetch(evt.request).then(fetchRes => {
                            cache.put(evt.request.url, fetchRes.clone());
                            limitCacheSize(dynamicCacheName, dynamicCacheLimit);
                            return fetchRes;
                        }).catch(function() {
                            offline(evt);
                        })     
                    }
                }) 
            })
        );
    } else {
        evt.respondWith(
            fetch(evt.request).then(fetchRes => {
                return caches.open(dynamicCacheName).then(cache => {
                    cache.put(evt.request.url, fetchRes.clone());
                    limitCacheSize(dynamicCacheName, dynamicCacheLimit);
                    return fetchRes;
                });
            }).catch(function() {
                offline(evt);
            })       
        );
    }
});