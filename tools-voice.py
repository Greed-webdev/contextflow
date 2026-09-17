#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Готовит озвучку заранее — файлами.

Зачем: во встроенном браузере Telegram НЕТ синтеза речи (speechSynthesis).
Поэтому кнопка «Послушать» не может произнести текст на лету.
Решение: заранее начитываем все фразы курса в аудиофайлы и просто проигрываем их.

Запуск:  python3 tools-voice.py
Итог:    assets/voice/en/<код>.m4a  +  assets/voice/index.json
"""
import json, os, re, subprocess, sys, hashlib, unicodedata
import imageio_ffmpeg
FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

ROOT   = os.path.dirname(os.path.abspath(__file__))
OUTDIR = os.path.join(ROOT, 'assets', 'voice')
MODELS = {                       # язык курса -> модель голоса piper
    'en': 'en_US-lessac-medium',
}

def slug(text):
    """Короткое, стабильное имя файла для фразы."""
    t = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode()
    t = re.sub(r"[^a-zA-Z0-9]+", '-', t).strip('-').lower()[:40]
    h = hashlib.md5(text.encode('utf-8')).hexdigest()[:6]
    return (t + '-' + h) if t else h

def collect():
    """Достаём из lessons.js все строки, которые нужно уметь произносить."""
    src = open(os.path.join(ROOT, 'js', 'lessons.js'), encoding='utf-8').read()
    node = r"""
    const fs=require('fs'); const vm=require('vm');
    const src=fs.readFileSync(process.argv[1],'utf8');
    const sb={window:{},document:{}}; const ctx=vm.createContext(sb);
    vm.runInContext(src+';sb_out=(typeof COURSE!=="undefined")?COURSE:null;',ctx);
    const C=sb.sb_out||ctx.sb_out;
    const out={};
    for(const L of Object.keys(C)){
      const set=new Set();
      for(const st of Object.keys(C[L])) for(const lv of C[L][st]){
        (lv.words||[]).forEach(w=>{ if(w.t) set.add(w.t); });
        (lv.tasks||[]).forEach(t=>{ if(t.answer) set.add(t.answer); if(t.full) set.add(t.full); });
        (lv.turns||[]).forEach(t=>{
          if(t.text) set.add(t.text);
          (t.options||[]).forEach(o=>set.add(o));
        });
        (lv.lost&&lv.lost.nodes||[]).forEach(n=>{
          if(n.them) set.add(n.them);
          if(n.best) set.add(n.best);
          (n.opts||[]).forEach(o=>set.add(o));
        });
      }
      out[L]=[...set].filter(Boolean);
    }
    process.stdout.write(JSON.stringify(out));
    """
    p = subprocess.run(['node', '-e', node, os.path.join(ROOT, 'js', 'lessons.js')],
                       capture_output=True, text=True)
    if p.returncode != 0:
        print('не смог прочитать lessons.js:', p.stderr[-500:]); sys.exit(1)
    return json.loads(p.stdout)

def ensure_model(name):
    onnx = f'/tmp/{name}.onnx'
    if not os.path.exists(onnx):
        print(f'  качаю голос {name}…')
        subprocess.run([sys.executable, '-m', 'piper.download_voices', name],
                       cwd='/tmp', capture_output=True)
    return onnx

def main():
    data = collect()
    index = {}
    for langcode, phrases in data.items():
        model = MODELS.get(langcode)
        if not model:
            print(f'· {langcode}: голоса пока нет, пропускаю'); continue
        onnx = ensure_model(model)
        d = os.path.join(OUTDIR, langcode)
        os.makedirs(d, exist_ok=True)
        index[langcode] = {}
        print(f'· {langcode}: {len(phrases)} фраз')
        for i, ph in enumerate(phrases, 1):
            name = slug(ph)
            m4a  = os.path.join(d, name + '.m4a')
            index[langcode][ph] = name
            if os.path.exists(m4a):
                continue
            wav = '/tmp/_v.wav'
            # piper читает текст со stdin
            subprocess.run([sys.executable, '-m', 'piper', '-m', onnx, '-f', wav],
                           input=ph, text=True, capture_output=True)
            if not os.path.exists(wav):
                print(f'   пропуск: {ph[:40]}'); continue
            subprocess.run([FFMPEG, '-y', '-i', wav, '-c:a', 'aac', '-b:a', '32k',
                            '-ac', '1', '-ar', '22050', m4a], capture_output=True)
            os.remove(wav)
            if i % 25 == 0:
                print(f'   {i}/{len(phrases)}')
    os.makedirs(OUTDIR, exist_ok=True)
    with open(os.path.join(OUTDIR, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=0)
    total = sum(len(v) for v in index.values())
    size  = subprocess.run(['du', '-sh', OUTDIR], capture_output=True, text=True).stdout.split()[0]
    print(f'\nготово: {total} файлов, {size}')

if __name__ == '__main__':
    main()
