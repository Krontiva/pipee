import '@/app/hub-embed.css'

// Purely aesthetic. When Pipee is rendered inside another page's frame (the
// Krontiva Hub embeds it), mark <html> so hub-embed.css restyles it to match
// the Hub. A direct visit is never framed, so nothing here runs for it and
// Pipee looks exactly as it always has. The sign-in screen is left alone even
// when framed. The check is repeated whenever the address changes without a
// reload (signing in inside the frame moves to the dashboard that way).
// Wrapped in try/catch so it can never break a page.
const script = `try{var w=window;if(w.self!==w.top){var ex=/^\\/login/,f=false,a=function(){var on=!ex.test(location.pathname),h=document.documentElement;if(on){h.setAttribute('data-hub-embed','');if(!f){f=true;var l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';document.head.appendChild(l)}}else{h.removeAttribute('data-hub-embed')}};a();['pushState','replaceState'].forEach(function(k){var o=history[k];history[k]=function(){var r=o.apply(this,arguments);a();return r}});w.addEventListener('popstate',a)}}catch(e){}`

export function HubEmbedFlag() {
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
