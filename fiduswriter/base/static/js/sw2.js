importScripts('sw.js') // eslint-disable-line

const secondary_cache_name = "secondary_cache"
const reg_exp_img = new RegExp("(https?:\/\/.*\.(?:png|jpg|gif))") // eslint-disable-line
const reg_exp_font = new RegExp("(https?:\/\/.*\.(?:woff|woff2|ttf))") // eslint-disable-line
const reg_exp_google_font_api = new RegExp("(https?:\/\/fonts\.googleapis\..*)") // eslint-disable-line
const reg_exp_docx = new RegExp("(https?:\/\/.*\.(?:docx))") // eslint-disable-line


self.addEventListener('activate', _event => {
  self.caches.keys().then((names)=>{
    if (names == secondary_cache_name)
      caches.delete(names)
  })
})


self.addEventListener('fetch', function(event) {
  if ((reg_exp_img.test(event.request.url) || reg_exp_font.test(event.request.url) || reg_exp_google_font_api.test(event.request.url) ||reg_exp_docx.test(event.request.url)) && event.request.method == "GET") {
    event.respondWith(
      caches.match(event.request).then((resp) => {
        return resp || fetch(event.request).then((response) => {
          const response_to_cache = response.clone()
          return caches.open(secondary_cache_name).then((cache) => {
            cache.put(event.request, response_to_cache)
            return response
          })
        })
      })
    )
  }
})

