import base64, re, os, mimetypes

html = open('index.html', encoding='utf-8').read()

def datauri(path):
    path = path.split('?')[0].split('#')[0]
    if not os.path.exists(path):
        return None
    mime, _ = mimetypes.guess_type(path)
    if path.endswith('.woff2'): mime = 'font/woff2'
    if not mime: mime = 'application/octet-stream'
    b = base64.b64encode(open(path,'rb').read()).decode()
    return f'data:{mime};base64,{b}'

def inline_css(css_text, base):
    def rep(m):
        raw = m.group(1).strip('\'"')
        if raw.startswith('data:') or raw.startswith('http'): return m.group(0)
        p = os.path.normpath(os.path.join(base, raw))
        u = datauri(p)
        return f'url("{u}")' if u else m.group(0)
    return re.sub(r'url\(([^)]+)\)', rep, css_text)

# 1. CSS
def css_rep(m):
    href = m.group(1)
    if not os.path.exists(href): return m.group(0)
    txt = open(href, encoding='utf-8').read()
    txt = inline_css(txt, os.path.dirname(href))
    return f'<style>\n{txt}\n</style>'
html = re.sub(r'<link[^>]+rel="stylesheet"[^>]*href="([^"]+)"[^>]*>', css_rep, html)

# 2. JS
def js_rep(m):
    src = m.group(1)
    if not os.path.exists(src): return m.group(0)
    txt = open(src, encoding='utf-8').read()
    return '<script>\n' + txt.replace('</script>', '<\\/script>') + '\n</script>'
html = re.sub(r'<script[^>]+src="([^"]+)"[^>]*></script>', js_rep, html)

# 3. картинки в разметке
def img_rep(m):
    pre, src, post = m.group(1), m.group(2), m.group(3)
    if src.startswith('data:') or src.startswith('http'): return m.group(0)
    u = datauri(src)
    return f'{pre}{u}{post}' if u else m.group(0)
html = re.sub(r'(<img[^>]+src=")([^"]+)("[^>]*>)', img_rep, html)

# 4. пути к ассетам внутри JS (эмодзи, флаги, сцены, карта) -> словарь data-uri
assets = {}
for root in ['assets/emoji','assets/flags','assets/map','assets/scenes','assets/scenes/en']:
    if not os.path.isdir(root): continue
    for f in sorted(os.listdir(root)):
        p = os.path.join(root,f)
        if os.path.isfile(p):
            u = datauri(p)
            if u: assets[p] = u

shim = '<script>window.__A=' + __import__('json').dumps(assets) + ';\n' \
    '(function(){function fix(u){if(!u)return u;u=String(u).replace(/^\\.\\//,"");' \
    'return window.__A[u]||u;}' \
    'var d=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,"src");' \
    'Object.defineProperty(HTMLImageElement.prototype,"src",{get:function(){return d.get.call(this)},' \
    'set:function(v){d.set.call(this,fix(v))}});' \
    'var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){' \
    'if(n==="src"||n==="href")v=fix(v);return sa.call(this,n,v)};' \
    'var sp=Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype,"backgroundImage");' \
    'if(sp&&sp.set){Object.defineProperty(CSSStyleDeclaration.prototype,"backgroundImage",{get:sp.get,' \
    'set:function(v){v=String(v).replace(/url\\(([\'"]?)([^\'")]+)\\1\\)/g,function(m,q,u){return \'url("\'+fix(u)+\'")\'});' \
    'sp.set.call(this,v)}});}' \
    'function scan(n){if(!n||n.nodeType!==1)return;' \
    'if(n.tagName==="IMG"){var a=n.getAttribute("src");if(a&&!/^data:/.test(a)&&window.__A[a])d.set.call(n,window.__A[a]);}' \
    'var q=n.querySelectorAll?n.querySelectorAll("img"):[];' \
    'for(var i=0;i<q.length;i++){var b=q[i].getAttribute("src");if(b&&!/^data:/.test(b)&&window.__A[b])d.set.call(q[i],window.__A[b]);}}' \
    'new MutationObserver(function(ms){ms.forEach(function(m){' \
    'for(var i=0;i<m.addedNodes.length;i++)scan(m.addedNodes[i]);' \
    'if(m.type==="attributes")scan(m.target);})})' \
    '.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["src"]});' \
    'document.addEventListener("DOMContentLoaded",function(){scan(document.body)});' \
    '})();</script>'

html = html.replace('<script src="https://telegram.org/js/telegram-web-app.js"></script>', '')
html = html.replace('</head>', shim + '\n</head>', 1)

open('ContextFlow-offline.html','w',encoding='utf-8').write(html)
print('готово:', round(os.path.getsize('ContextFlow-offline.html')/1024/1024,1), 'МБ')
print('встроено ассетов:', len(assets))
