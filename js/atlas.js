/* ==========================================================
   ContextFlow · atlas.js — ЗОНА: ночной атлас (главный экран v4)
   Созвездия ситуаций вместо горы с уровнями.
   Сцена-звезда привязана к уроку по точному совпадению title
   flow-диалога из lessons.js; «скоро» — узлы без урока.
   ========================================================== */

const ICONS = {"Срочное": "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"COL\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M13 2 4.5 13.5h6L9.8 22l8.7-11.5h-6L13 2z\"/></svg>", "Документы": "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"COL\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z\"/><path d=\"M14 2v5h5\"/><path d=\"M9 13h6M9 17h6\"/></svg>", "Быт и жильё": "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"COL\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 11 12 3l9 8\"/><path d=\"M5 10v10h5v-6h4v6h5V10\"/></svg>", "Работа и люди": "<svg width=\"14\" height=\"14\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"COL\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"8\" width=\"18\" height=\"12\" rx=\"2\"/><path d=\"M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2\"/><path d=\"M3 13h18\"/></svg>"};

const Atlas = {
  cur: 0,
  sel: null,
  bornT: 0,
  raf: 0,
  rm: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
  refs: null, // title -> {st, i}

  /* ---- созвездия: [title, x, y, soon] ---- */
  SECTIONS: [
    { name: 'Срочное', color: '#E8B4B8', nodes: [
      ['Экстренный звонок 112', .32, .14, 0], ['Украли паспорт', .56, .26, 0],
      ['Полиция и ДТП', .78, .40, 0], ['У врача', .48, .50, 0],
      ['Медицинская страховка', .70, .62, 0], ['В аптеке', .40, .74, 0],
      ['Вызвать скорую', .18, .30, 0], ['Пожарная тревога', .64, .82, 0],
      ['Карта не сработала', .12, .52, 0], ['Багаж не прилетел', .88, .22, 0],
      ['Телефон украли', .86, .72, 0] ] },
    { name: 'Документы', color: '#4A7B7C', nodes: [
      ['Регистрация после приезда', .20, .12, 0], ['Заполнить анкету', .46, .22, 0],
      ['Визовый офис', .74, .14, 0], ['Продление визы', .84, .38, 0],
      ['СИМ-карта и контракт', .56, .44, 0], ['Найти банк', .26, .40, 0],
      ['Открыть счёт', .30, .64, 0], ['Перевод денег', .62, .70, 0],
      ['Паспортный контроль', .86, .58, 0], ['Налоговый номер', .40, .84, 0],
      ['Справка об адресе', .12, .78, 0] ] },
    { name: 'Быт и жильё', color: '#D4A574', nodes: [
      ['Показать квартиру', .16, .10, 0], ['Договор аренды и хозяин', .40, .16, 0],
      ['Соседи', .64, .10, 0], ['Назвать количество', .86, .22, 0],
      ['Оплата на кассе', .78, .42, 0], ['Что-то сломалось', .52, .36, 0],
      ['Проблема с интернетом', .26, .32, 0], ['Вернуть товар', .18, .54, 0],
      ['Выбрать цвет', .42, .60, 0], ['Купить куртку', .68, .58, 0],
      ['Заказать обед', .56, .78, 0], ['У барной стойки', .82, .86, 0],
      ['Депозит', .30, .88, 0], ['Счёт за квартиру', .10, .72, 0],
      ['Посылка на почте', .90, .70, 0] ] },
    { name: 'Работа и люди', color: '#F5E6C8', nodes: [
      ['Собеседование на работу', .58, .10, 0], ['На языковых курсах', .82, .24, 0],
      ['Рассказать о работе', .56, .32, 0], ['Объяснить дорогу', .80, .48, 0],
      ['Разговор о погоде', .52, .54, 0], ['Не расслышал', .24, .42, 0],
      ['Разговор о семье', .30, .64, 0], ['Первое приветствие', .56, .76, 0],
      ['Узнать время', .24, .86, 0], ['Первый день на работе', .10, .20, 0] ] }
  ],
  CROSS: [[0, 1, 1, 2], [1, 6, 2, 0], [1, 2, 3, 0], [0, 0, 2, 6]],

  /* ---- ссылка на урок по названию диалога ---- */
  buildRefs() {
    const refs = {};
    this.reviews = {};   // st -> {st, i, title}
    this.stageOfSec = {}; // st -> номер секции с большинством flow
    const secFlowCount = {};
    for (let st = 1; st <= 5; st++) {
      const arr = getCourse(S.lang, st);
      let prep = [];
      arr.forEach((lv, i) => {
        const isReview = /^Контроль|^Повтори фразы/.test(lv.title);
        if (isReview) { this.reviews[st] = { st, i, title: lv.title }; prep = []; return; }
        if (lv.type === 'words' || lv.type === 'build') {
          if (!isReview) { const numM = /·\s*(\d)/.exec(lv.title); prep.push({ i, kind: (lv.type === 'words' ? 'Слова' : 'Фразы') + (numM ? ' · ' + numM[1] : '') }); }
          return;
        }
        if (lv.type === 'dialog' && lv.variant === 'flow') {
          refs[lv.title] = { st, i, prep };
          prep = [];
          this.SECTIONS.forEach((sec, ci) => {
            if (sec.nodes.some(n => n[0] === lv.title)) {
              secFlowCount[st] = secFlowCount[st] || {};
              secFlowCount[st][ci] = (secFlowCount[st][ci] || 0) + 1;
            }
          });
        }
      });
    }
    // этап -> секция с максимумом flow
    Object.keys(secFlowCount).forEach(st => {
      let best = 0, bn = -1;
      Object.keys(secFlowCount[st]).forEach(ci => {
        if (secFlowCount[st][ci] > bn) { bn = secFlowCount[st][ci]; best = +ci; }
      });
      this.stageOfSec[st] = best;
    });
    this.refs = refs;
  },

  open() {
    if (!S.lang) { Lang.open(); return; }
    if (this._opening) return;
    this._opening = true;
    this.buildRefs();
    this.cur = 0; this.sel = null; this.bornT = performance.now();
    if (typeof current === 'undefined' || current !== 'sc-map') go('sc-map');
    this.pills();
    this.size();
    if (!this.ro && typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(() => this.size());
      this.ro.observe($('atlas-cv').parentElement);
    }
    const cv = $('atlas-cv');
    cv.onpointerdown = (e)=>{
      const r = cv.getBoundingClientRect();
      this.tap(e.clientX - r.left, e.clientY - r.top, e.clientX, e.clientY);
    };
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    this.raf = requestAnimationFrame(t => this.draw(t));
    if (S.sound.amb) Sound.ambience('quiet');
    this._opening = false;
  },
  exit() { Sound.fx('back'); go('sc-hub'); Hub.render(); },

  pills() {
    const box = $('atlas-dots');
    if (!box.childElementCount) {
      this.SECTIONS.forEach((sec, i) => {
        const b = el('button', 'atlas-dot');
        b.setAttribute('aria-label', sec.name);
        b.innerHTML = '<i style="background:' + sec.color + '"></i>';
        b.onclick = () => this.pick(i);
        box.appendChild(b);
      });
    }
    this.legend();
  },
  legend() {
    const cur = $('atlas-cur');
    cur.textContent = this.SECTIONS[this.cur].name;
    cur.style.color = this.SECTIONS[this.cur].color;
    cur.classList.remove('rev'); void cur.offsetWidth; cur.classList.add('rev');
    document.querySelectorAll('.atlas-dot').forEach((d, j) => d.classList.toggle('on', j === this.cur));
  },
  pick(i) {
    this.cur = i; this.sel = null; this.bornT = performance.now();
    $('atlas-panel').classList.remove('show');
    this.legend();
  },

  size() {
    const cv = $('atlas-cv');
    const r = cv.parentElement.getBoundingClientRect();
    if (r.width && (cv.width !== Math.round(r.width * 2) || cv.height !== Math.round(r.height * 2))) {
      cv.width = Math.round(r.width * 2); cv.height = Math.round(r.height * 2);
    }
  },

  posXY(x0, y0, t, seed) {
    const cv = $('atlas-cv');
    const W = cv.width / 2, H = cv.height / 2;
    let x = (x0 * .88 + .06) * W, y = (y0 * .82 + .09) * H;
    if (!this.rm) {
      x += Math.sin(t / (1400 + this.rnd(seed || 1, 7) * 800) + (seed || 0) * 2.1) * 2.5;
      y += Math.cos(t / (1600 + this.rnd(7, seed || 1) * 800) + (seed || 0) * 1.7) * 2.5;
    }
    return [x, y];
  },

  pos(ci, ni, t) {
    const cv = $('atlas-cv');
    const W = cv.width / 2, H = cv.height / 2;
    const n = this.SECTIONS[ci].nodes[ni];
    let x = (n[1] * .88 + .06) * W;
    let y = (n[2] * .82 + .09) * H;
    if (!this.rm) {
      x += Math.sin(t / (1400 + this.rnd(ci, ni) * 800) + ni * 2.1 + ci) * 2.5;
      y += Math.cos(t / (1600 + this.rnd(ni, ci) * 800) + ni * 1.7 + ci * 2) * 2.5;
    }
    return [x, y];
  },

  star(x, p, r, rot) {
    x.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = rot + k * Math.PI / 4, rr = (k % 2 === 0) ? r : r * .38;
      const px = p[0] + Math.cos(a) * rr, py = p[1] + Math.sin(a) * rr;
      if (k === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath();
  },
  dashline(x, a, b, seed, p) {
    if (p === undefined) p = 1;
    const mx0 = (a[0] + b[0]) / 2, my0 = (a[1] + b[1]) / 2;
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.sqrt(dx * dx + dy * dy) || 1;
    const off = Math.sin(seed * 7.3) * L * .12;
    const cx = mx0 - dy / L * off, cy = my0 + dx / L * off;
    const N = 22, K = Math.max(1, Math.round(N * p));
    x.setLineDash([3.5, 4.5]);
    x.beginPath();
    for (let k = 0; k <= K; k++) {
      const u = k / N, v = 1 - u;
      const qx = v * v * a[0] + 2 * v * u * cx + u * u * b[0];
      const qy = v * v * a[1] + 2 * v * u * cy + u * u * b[1];
      if (k === 0) x.moveTo(qx, qy); else x.lineTo(qx, qy);
    }
    x.stroke();
    x.setLineDash([]);
  },
  rnd(a, b) {
    const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return x - Math.floor(x);
  },
  hexA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  },

  draw(t) {
    this.raf = requestAnimationFrame(tt => this.draw(tt));
    const cv = $('atlas-cv');
    if (!cv || !cv.width) return;
    if (!$('sc-map').classList.contains('on')) return;
    const x = cv.getContext('2d');
    const W = cv.width / 2, H = cv.height / 2;
    x.setTransform(2, 0, 0, 2, 0, 0);
    x.clearRect(0, 0, W, H);

    /* млечный путь */
    x.save();
    x.translate(W * .5, H * .42); x.rotate(-.45); x.scale(1, .32);
    const mg = x.createRadialGradient(0, 0, 10, 0, 0, Math.max(W, H) * .75);
    mg.addColorStop(0, 'rgba(200,214,226,.075)');
    mg.addColorStop(.45, 'rgba(200,214,226,.03)');
    mg.addColorStop(1, 'rgba(200,214,226,0)');
    x.fillStyle = mg;
    x.fillRect(-W * 1.5, -W * 3, W * 3, W * 6);
    x.restore();
    /* дальние звёзды */
    for (let s = 0; s < 84; s++) {
      const al = this.rm ? .06 : .025 + (.04 + (s % 5) * .016) * Math.abs(Math.sin(t / (650 + (s % 7) * 170) + s * 1.31));
      x.fillStyle = 'rgba(255,255,255,' + al.toFixed(3) + ')';
      const sx = (s * 97.3) % W, sy = (s * 57.7 + Math.sin(t / 2400 + s) * 3) % H;
      x.fillRect(sx, sy, 1.1, 1.1);
    }
    /* искры — редкие всполохи неба */
    if (!this.rm) {
      for (let k = 0; k < 2; k++) {
        const per = 5600, ph = Math.floor((t + k * per / 2) / per);
        const u = ((t + k * per / 2) % per) / 1400;
        if (u < 1) {
          const px = W * (.06 + .88 * this.rnd(ph + k, 7)), py = H * (.08 + .84 * this.rnd(3, ph + k));
          const env = Math.sin(u * Math.PI);
          const r = (1.6 + 2.6 * this.rnd(ph, k + 2)) * (.45 + .55 * env);
          x.fillStyle = 'rgba(245,230,200,' + (.5 * env).toFixed(3) + ')';
          this.star(x, [px, py], r, this.rnd(k, ph) * Math.PI / 4);
          x.fill();
          x.fillStyle = 'rgba(255,255,255,' + (.75 * env).toFixed(3) + ')';
          x.beginPath(); x.arc(px, py, .8 * env + .3, 0, 7); x.fill();
        }
      }
    }
    /* падающая звезда */
    if (!this.rm) {
      const per = 7000, ph = Math.floor(t / per), u = (t % per) / 900;
      if (u < 1) {
        const r1 = this.rnd(ph, 3), r2 = this.rnd(5, ph);
        const x0 = W * (.15 + r1 * .6), y0 = H * (.08 + r2 * .3);
        const dx = (.22 + .2 * r2) * W * u, dy = (.16 + .14 * r1) * H * u;
        const fade = Math.sin(u * Math.PI);
        x.strokeStyle = 'rgba(245,230,200,' + (.45 * fade).toFixed(3) + ')';
        x.lineWidth = 1; x.setLineDash([4, 5]);
        x.beginPath(); x.moveTo(x0, y0); x.lineTo(x0 + dx, y0 + dy); x.stroke();
        x.setLineDash([]);
        x.fillStyle = 'rgba(245,230,200,' + (.8 * fade).toFixed(3) + ')';
        x.beginPath(); x.arc(x0 + dx, y0 + dy, 1.6, 0, 7); x.fill();
      }
    }
    /* координатные засечки старой карты */
    x.strokeStyle = 'rgba(255,255,255,.10)'; x.lineWidth = 1;
    for (let gx = 44; gx < W - 8; gx += 44) {
      x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, 5); x.stroke();
      x.beginPath(); x.moveTo(gx, H); x.lineTo(gx, H - 5); x.stroke();
    }
    x.font = 'italic 8px Georgia, "Times New Roman", serif'; x.textAlign = 'left';
    x.fillStyle = 'rgba(168,176,180,.34)';
    for (let gy = 44; gy < H - 8; gy += 44) {
      x.beginPath(); x.moveTo(0, gy); x.lineTo(5, gy); x.stroke();
      x.beginPath(); x.moveTo(W, gy); x.lineTo(W - 5, gy); x.stroke();
      x.fillText(String(10 + Math.round(gy / 44)), 8, gy + 3);
    }
    /* луна с пунктирным ореолом */
    const mox = W - 34, moy = 30;
    x.strokeStyle = 'rgba(245,230,200,.22)'; x.lineWidth = 1; x.setLineDash([2, 3]);
    x.beginPath(); x.arc(mox, moy, 11, 0, 7); x.stroke(); x.setLineDash([]);
    x.fillStyle = 'rgba(245,230,200,.55)';
    x.beginPath();
    x.arc(mox, moy, 7, Math.PI * .5, Math.PI * 1.5);
    x.arc(mox + 3.2, moy, 5.2, Math.PI * 1.5, Math.PI * .5, true);
    x.closePath(); x.fill();
    /* роза ветров */
    const rx0 = 30, ry0 = H - 34;
    x.strokeStyle = 'rgba(245,230,200,.3)'; x.lineWidth = 1; x.setLineDash([2, 3]);
    x.beginPath(); x.arc(rx0, ry0, 12, 0, 7); x.stroke(); x.setLineDash([]);
    this.star(x, [rx0, ry0], 9, 0);
    x.strokeStyle = 'rgba(245,230,200,.45)'; x.stroke();
    x.fillStyle = 'rgba(245,230,200,.5)'; x.beginPath(); x.arc(rx0, ry0, 1.4, 0, 7); x.fill();
    x.font = 'italic 8px Georgia, "Times New Roman", serif'; x.textAlign = 'center';
    x.fillStyle = 'rgba(245,230,200,.4)';
    x.fillText('N', rx0, ry0 - 15);
    /* маршруты между созвездиями */
    x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 1;
    this.CROSS.forEach((e, i) => this.dashline(x, this.pos(e[0], e[1], t), this.pos(e[2], e[3], t), i + 9));

    this.SECTIONS.forEach((c, ci) => {
      const on = ci === this.cur, col = c.color;
      x.strokeStyle = on ? this.hexA(col, .55) : 'rgba(255,255,255,.08)';
      x.lineWidth = on ? 1.1 : 1;
      const edges = this.edgesOf(ci);
      edges.forEach((e, i) => {
        const pe = on && !this.rm ? Math.min(1, Math.max(0, (t - this.bornT - i * 90 - this.rnd(ci, i) * 140) / (420 + this.rnd(i, ci) * 260))) : 1;
        if (pe > 0) this.dashline(x, this.pos(ci, e[0], t), this.pos(ci, e[1], t), ci * 10 + i, pe);
      });

      if (on) this.revNode(ci).forEach((n, ni) => {
        const pc = this.rm ? 1 : Math.min(1, Math.max(0, (t - this.bornT - 700 - this.rnd(ci, ni + 9) * 250) / (380 + this.rnd(ni, ci) * 200)));
        if (pc <= 0) return;
        x.globalAlpha = pc;
        const p = this.posXY(n[1], n[2], t, 9 + ni);
        const isSel = on && this.sel && this.sel[0] === ci && this.sel[1] === n[0];
        x.strokeStyle = '#F5E6C8'; x.lineWidth = 1.2; x.setLineDash([2, 3]); if (!this.rm) x.lineDashOffset = -t / 90;
        x.beginPath(); x.arc(p[0], p[1], 4, 0, 7); x.stroke(); x.setLineDash([]); x.lineDashOffset = 0;
        x.fillStyle = '#F5E6C8'; x.beginPath(); x.arc(p[0], p[1], 1.4, 0, 7); x.fill();
        x.font = 'italic 9.5px Georgia, "Times New Roman", serif';
        x.textAlign = 'center'; x.fillStyle = 'rgba(245,230,200,.8)';
        const cbx = Math.round((n[1] * .88 + .06) * W), cby = Math.round((n[2] * .82 + .09) * H);
        const twr = x.measureText(n[3].title).width;
        const txr = Math.min(Math.max(cbx, twr / 2 + 6), W - twr / 2 - 6);
        x.fillText(n[3].title, txr, cby + 16);
        x.globalAlpha = 1;
      });
      c.nodes.forEach((n, ni) => {
        const p = this.pos(ci, ni, t);
        const isSel = on && this.sel && this.sel[0] === ci && this.sel[1] === ni;
        const ps = on && !this.rm ? Math.min(1, Math.max(0, (t - this.bornT - 200 - this.rnd(ci, ni) * 600) / (300 + this.rnd(ni, ci) * 300))) : 1;
        if (on) {
          if (ps <= 0) return;
          const r = (isSel ? 6 : 4.2) * (ps * (2 - ps)), rot = ni * .7 + t / 4000;
          const hasLesson = !n[3] && this.refs && this.refs[n[0]];
          if (hasLesson) {
            x.shadowColor = this.hexA(col, .8); x.shadowBlur = this.rm ? (isSel ? 16 : 9) : (isSel ? 14 + 3 * Math.sin(t / 500) : 8 + 2.5 * Math.sin(t / 700 + ni * 1.3));
            x.fillStyle = col; this.star(x, p, r, rot); x.fill(); x.shadowBlur = 0;
          } else {
            x.strokeStyle = '#F5E6C8'; x.lineWidth = 1.4; x.setLineDash([2.5, 3]);
            x.beginPath(); x.arc(p[0], p[1], r + 2, 0, 7); x.stroke(); x.setLineDash([]);
            x.fillStyle = '#F5E6C8'; x.beginPath(); x.arc(p[0], p[1], 1.7, 0, 7); x.fill();
          }
          if (isSel) {
            x.strokeStyle = 'rgba(236,232,225,.55)'; x.lineWidth = 1;
            x.setLineDash([4, 5]); if (!this.rm) x.lineDashOffset = -t / 60;
            x.beginPath(); x.arc(p[0], p[1], r + 6, 0, 7); x.stroke();
            x.setLineDash([]); x.lineDashOffset = 0;
          }
          const bx = Math.round((n[1] * .88 + .06) * W), by = Math.round((n[2] * .82 + .09) * H);
          const r0 = isSel ? 6 : 4.2;
          const above = n[2] > .55;
          const ly = above ? by - r0 - 8 : by + r0 + 14;
          x.font = 'italic 9.5px Georgia, "Times New Roman", serif';
          x.textAlign = 'center';
          const tw = x.measureText(n[0]).width;
          x.globalAlpha = ps;
          x.fillStyle = 'rgba(13,16,19,.72)';
          x.fillRect(bx - tw / 2 - 4, ly - 9, tw + 8, 13);
          x.fillStyle = isSel ? '#ece8e1' : this.hexA('#a8b0b4', .9);
          x.fillText(n[0], bx, ly);
          x.globalAlpha = 1;
        } else {
          x.globalAlpha = this.rm ? .28 : .24 + .1 * Math.abs(Math.sin(t / (900 + (ni % 5) * 140) + ni * 1.7 + ci));
          x.fillStyle = n[3] ? '#F5E6C8' : col;
          x.beginPath(); x.arc(p[0], p[1], 2.6, 0, 7); x.fill();
          x.globalAlpha = 1;
        }
      });
    });
  },

  revNode(ci) {
    const out = [];
    Object.keys(this.reviews || {}).forEach(st => {
      if (this.stageOfSec[st] === ci) {
        const r = this.reviews[st];
        out.push(['rev:' + st, .92, .12 + out.length * .1, r]);
      }
    });
    return out;
  },

  /* связи внутри созвездия: цепочка + пара перекрёстных, стабильно по индексам */
  edgesOf(ci) {
    const n = this.SECTIONS[ci].nodes.length, e = [];
    for (let i = 0; i < n - 1; i++) e.push([i, i + 1]);
    if (n > 4) e.push([0, 3], [1, Math.min(4, n - 1)]);
    return e;
  },

  tap(px, py, cx, cy) {
    const t = performance.now();
    let best = null, bd = 1e9;
    this.SECTIONS.forEach((c, ci) => {
      c.nodes.forEach((n, ni) => {
        const p = this.pos(ci, ni, t);
        const d = (p[0] - px) * (p[0] - px) + (p[1] - py) * (p[1] - py);
        if (d < bd) { bd = d; best = [ci, ni]; }
      });
      this.revNode(ci).forEach((n, ri) => {
        const p = this.posXY(n[1], n[2], t, 9 + ri);
        const d = (p[0] - px) * (p[0] - px) + (p[1] - py) * (p[1] - py);
        if (d < bd) { bd = d; best = [ci, ri, true, n[3]]; }
      });
    });
    if (!best || bd > 900) return;
    if (best[0] !== this.cur) return; // чужая тема молчит — сначала точки внизу
    this.sel = best;
    if (typeof sparksAt === 'function' && cx != null) sparksAt(cx, cy);
    const panel = $('atlas-panel'), nm = $('atlas-nm'), goB = $('atlas-go');
    panel.classList.add('show');
    if (best[2]) { // ревью-комета
      const r = best[3];
      nm.innerHTML = r.title + '<small>повторение тем этапа · проверка</small>';
      goB.className = 'atlas-go'; goB.textContent = 'Повторить';
      goB.onclick = () => { S.stage = r.st; save(); Sound.fx('step'); Lesson.start(r.st, r.i); };
      Sound.fx('step');
      return;
    }
    goB.onclick = () => this.startSel();
    const n = this.SECTIONS[best[0]].nodes[best[1]];
    const ref = this.refs && this.refs[n[0]];
    if (ref && ref.prep && ref.prep.length) {
      const chain = ref.prep.map(p =>
        '<button class="chain-b" data-i="' + p.i + '" data-st="' + ref.st + '">' + p.kind + '</button>').join('');
      nm.innerHTML = n[0] +
        '<small>подготовка → диалог</small>' +
        '<div class="chain">' + chain +
        '<button class="chain-b on">Диалог</button></div>';
      panel.querySelectorAll('.chain-b').forEach(b => {
        b.onclick = () => {
          if (b.classList.contains('on')) { this.startSel(); return; }
          const st = +b.dataset.st, i = +b.dataset.i;
          S.stage = st; save(); Sound.fx('step'); Lesson.start(st, i);
        };
      });
      goB.className = 'atlas-go'; goB.textContent = 'Начать';
    } else {
      nm.innerHTML = n[0] + (ref
        ? '<small>прожить голосом · ~5 минут</small>'
        : '<small>взойдёт в следующем большом обновлении</small>');
      if (ref) { goB.className = 'atlas-go'; goB.textContent = 'Начать'; }
      else { goB.className = 'atlas-go soonb'; goB.textContent = 'скоро'; }
    }
    Sound.fx('step');
  },

  startSel() {
    if (!this.sel) return;
    const n = this.SECTIONS[this.sel[0]].nodes[this.sel[1]];
    const ref = this.refs && this.refs[n[0]];
    if (!ref) return;
    S.stage = ref.st; save();
    Sound.fx('step');
    Lesson.start(ref.st, ref.i);
  }
};
