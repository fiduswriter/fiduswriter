importScripts('sw.js')
console.log("Hello !!!!!!")

let secondary_cache_name = "secondary_cache"
let reg_exp_img = new RegExp('(https?:\/\/.*\.(?:png|jpg|gif))')
let reg_exp_font = new RegExp('(https?:\/\/.*\.(?:woff|woff2|ttf))')
let reg_exp_google_font_api = new RegExp('(https?:\/\/fonts\.googleapis\..*)')
let reg_exp_docx = new RegExp('(https?:\/\/.*\.(?:docx))')


self.addEventListener('activate', event => {
  console.log('V1 now ready to handle fetches!');
  self.caches.keys().then((names)=>{
    console.log("These are the caches that are present:",names)
    if(names == secondary_cache_name)
      caches.delete(names)
  })

});

self.addEventListener('fetch', function(event) {
  console.log("Common request intercepted",event)
  if((reg_exp_img.test(event.request.url) || reg_exp_font.test(event.request.url) || reg_exp_google_font_api.test(event.request.url) ||reg_exp_docx.test(event.request.url) ) && event.request.method == "GET"){
    // console.log('Image URL Request Found',event.request.url)
    event.respondWith(
      caches.match(event.request).then((resp) => {
        console.log("Found something @ cache",resp)
        return resp || fetch(event.request).then((response) => {
          let response_to_cache = response.clone()
          console.log("Not found @ cache",response,event.request.url)
          return caches.open(secondary_cache_name).then((cache) => {
            cache.put(event.request, response_to_cache);
            return response;
          });  
        });
      })
    );
  }
});

