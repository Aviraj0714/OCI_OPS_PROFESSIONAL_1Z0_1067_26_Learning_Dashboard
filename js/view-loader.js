/*
  View loader: injects a preserved original page (css+html+js) into an
  isolated Shadow DOM host, and runs its script with `document`/`window`
  identifiers shadowed by scoped proxies so that:
    - getElementById / querySelector / querySelectorAll resolve only
      within that page's own shadow tree (no cross-page collisions)
    - document.body / document.documentElement map to the shadow host
      (so theme-toggle attributes like data-theme keep working)
    - a DOMContentLoaded / load listener registered by the page's own
      script fires immediately, since the shell's document already
      finished loading long ago.
  Each page is only ever instantiated once (cached) and is shown/hidden
  with a class toggle, so timers/canvas loops set up by a page keep their
  state instead of being torn down on every navigation.
*/
(function(){
  const cache = {}; // id -> { host, shadow }
  const pending = {}; // id -> script load promise

  function loadPageScript(id){
    if (window.PAGES && window.PAGES[id]) return Promise.resolve();
    if (pending[id]) return pending[id];
    pending[id] = new Promise((resolve, reject)=>{
      const s = document.createElement('script');
      s.src = `data/pages/${id}.js`;
      s.onload = ()=> resolve();
      s.onerror = ()=> reject(new Error('Failed to load ' + id));
      document.head.appendChild(s);
    });
    return pending[id];
  }

  function makeScopedDocument(root, hostEl){
    return new Proxy(document, {
      get(target, prop, receiver){
        if (prop === 'getElementById') return root.getElementById.bind(root);
        if (prop === 'querySelector') return root.querySelector.bind(root);
        if (prop === 'querySelectorAll') return root.querySelectorAll.bind(root);
        if (prop === 'body' || prop === 'documentElement') return hostEl;
        if (prop === 'activeElement') return root.activeElement || null;
        if (prop === 'addEventListener'){
          return function(type, cb, opts){
            if (type === 'DOMContentLoaded' || type === 'load'){
              setTimeout(()=>{ try{ cb(); }catch(e){ console.error(e); } }, 0);
              return;
            }
            return target.addEventListener.call(target, type, cb, opts);
          };
        }
        const val = Reflect.get(target, prop);
        return typeof val === 'function' ? val.bind(target) : val;
      }
    });
  }

  function makeScopedWindow(hostEl){
    return new Proxy(window, {
      get(target, prop){
        if (prop === 'addEventListener'){
          return function(type, cb, opts){
            if (type === 'DOMContentLoaded' || type === 'load'){
              setTimeout(()=>{ try{ cb(); }catch(e){ console.error(e); } }, 0);
              return;
            }
            return target.addEventListener.call(target, type, cb, opts);
          };
        }
        const val = Reflect.get(target, prop);
        return typeof val === 'function' ? val.bind(target) : val;
      },
      set(target, prop, value){ target[prop] = value; return true; }
    });
  }

  async function mount(id, container){
    if (cache[id]) return cache[id];
    await loadPageScript(id);
    const data = window.PAGES[id];
    if (!data) throw new Error('No page data for ' + id);

    const host = document.createElement('div');
    host.className = 'page-host';
    host.style.minHeight = '100%';
    container.appendChild(host);

    const shadow = host.attachShadow({mode:'open'});
    const styleEl = document.createElement('style');
    styleEl.textContent = data.css;
    shadow.appendChild(styleEl);
    const bodyWrap = document.createElement('div');
    bodyWrap.className = 'page-body';
    bodyWrap.innerHTML = data.html;
    shadow.appendChild(bodyWrap);

    try{
      const scopedDoc = makeScopedDocument(shadow, host);
      const scopedWin = makeScopedWindow(host);
      const fn = new Function('document', 'window', data.js);
      fn(scopedDoc, scopedWin);
    }catch(e){
      console.error('Error running script for', id, e);
    }

    cache[id] = { host, shadow, title: data.title };
    return cache[id];
  }

  window.ViewLoader = { mount, cache };
})();
