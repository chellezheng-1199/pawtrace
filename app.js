/* ============================================================
   宠迹 PawTrace — 应用逻辑
   纯前端 · localStorage 持久化 · 预置演示数据
   ============================================================ */
(function () {
  'use strict';

  /* ----------------------------------------------------------
     常量与字典
  ---------------------------------------------------------- */
  var STORAGE_KEY = 'pawtrace_data_v1';

  var SPECIES = {
    cat:     { label: '猫咪', emoji: '🐱', breeds: ['英短', '美短', '布偶', '暹罗', '橘猫', '狸花', '缅因', '金渐层', '其他'] },
    dog:     { label: '狗狗', emoji: '🐶', breeds: ['柯基', '金毛', '泰迪', '柴犬', '边牧', '哈士奇', '拉布拉多', '比熊', '其他'] },
    rabbit:  { label: '兔兔', emoji: '🐰', breeds: ['垂耳兔', '侏儒兔', '安哥拉兔', '其他'] },
    hamster: { label: '仓鼠', emoji: '🐹', breeds: ['金丝熊', '三线', '布丁', '其他'] },
    bird:    { label: '鸟儿', emoji: '🦜', breeds: ['虎皮鹦鹉', '玄凤', '牡丹鹦鹉', '其他'] },
    turtle:  { label: '乌龟', emoji: '🐢', breeds: ['巴西龟', '草龟', '其他'] }
  };

  var CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '南京', '西安', '长沙', '苏州'];
  var CITY_ADJ = {
    '上海': ['苏州', '杭州', '南京'],
    '北京': ['天津', '廊坊'],
    '广州': ['深圳', '佛山'],
    '深圳': ['广州', '东莞'],
    '杭州': ['上海', '苏州', '南京'],
    '成都': ['重庆'],
    '重庆': ['成都'],
    '武汉': ['长沙'],
    '长沙': ['武汉'],
    '南京': ['上海', '苏州', '杭州'],
    '苏州': ['上海', '南京', '杭州'],
    '西安': []
  };

  var VACCINES = ['猫三联', '狂犬疫苗', '犬四联', '犬六联', '犬八联', '猫鼻支', '其他'];
  var VACCINE_DAYS = { '猫三联': 365, '狂犬疫苗': 365, '犬四联': 365, '犬六联': 365, '犬八联': 365, '猫鼻支': 365, '其他': 365 };
  var DEWORMS = [
    { label: '体内驱虫', days: 90, emoji: '💊' },
    { label: '体外驱虫', days: 30, emoji: '💧' }
  ];

  var PET_EMOJIS = ['🐱', '🐶', '🐰', '🐹', '🦜', '🐢', '🐹', '🐈', '🐕', '🐇', '🦮', '🐈‍⬛'];
  var TONES = ['av-tone-0', 'av-tone-1', 'av-tone-2', 'av-tone-3', 'av-tone-4', 'av-tone-5'];

  /* ----------------------------------------------------------
     工具函数
  ---------------------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function uid() { return 'id_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toYMD(d) {
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }
  function parseDate(s) {
    var p = String(s).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  function todayYMD() { return toYMD(new Date()); }
  function shiftDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return toYMD(d); }

  function fmtMD(s) { var d = parseDate(s); return (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
  function fmtFull(s) { var d = parseDate(s); return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日'; }
  function fmtAgo(ts) {
    var diff = (Date.now() - ts) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 86400 * 7) return Math.floor(diff / 86400) + ' 天前';
    var d = new Date(ts);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function daysUntil(s) {
    var a = parseDate(todayYMD());
    var b = parseDate(s);
    return Math.round((b - a) / 86400000);
  }
  function ageText(birthday) {
    var b = parseDate(birthday), now = new Date();
    var months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
    if (now.getDate() < b.getDate()) months--;
    if (months < 0) months = 0;
    if (months < 12) return months + ' 个月';
    var y = Math.floor(months / 12), m = months % 12;
    return m === 0 ? y + ' 岁' : y + ' 岁 ' + m + ' 个月';
  }
  function todayTs(offsetH) { var d = new Date(); d.setHours(d.getHours() - (offsetH || 0)); return d.getTime(); }

  /* ----------------------------------------------------------
     数据层
  ---------------------------------------------------------- */
  function blankData() {
    return { user: { name: '铲屎官', city: '上海', onboarded: false }, pets: [], activePetId: null,
      records: { weight: [], vaccine: [], deworm: [] }, posts: [], follows: [] };
  }

  function seed() {
    var d = blankData();
    d.user.onboarded = true;
    var pet = {
      id: 'pet_demo', name: '团子', species: 'cat', breed: '英短', birthday: shiftDays(-420),
      gender: 'girl', avatar: '🐱', tone: 0
    };
    d.pets.push(pet);
    d.activePetId = pet.id;

    // 体重（约 1 岁多的猫，0.4 → 4.3kg）
    var wBase = [ ['-330', 0.5], ['-270', 0.9], ['-210', 1.5], ['-150', 2.2], ['-110', 2.8], ['-70', 3.4], ['-30', 3.9], ['-4', 4.3] ];
    wBase.forEach(function (r) {
      d.records.weight.push({ id: uid(), petId: pet.id, date: shiftDays(+r[0]), kg: r[1] });
    });

    // 疫苗（基础免疫 + 加强提醒）
    d.records.vaccine.push({ id: uid(), petId: pet.id, name: '猫三联', date: shiftDays(-280), nextDate: shiftDays(95) });
    d.records.vaccine.push({ id: uid(), petId: pet.id, name: '狂犬疫苗', date: shiftDays(-200), nextDate: shiftDays(165) });
    d.records.vaccine.push({ id: uid(), petId: pet.id, name: '猫三联', date: shiftDays(-359), nextDate: shiftDays(6) }); // 加强针即将到期

    // 驱虫
    d.records.deworm.push({ id: uid(), petId: pet.id, type: '体内驱虫', date: shiftDays(-60), nextDate: shiftDays(30) });
    d.records.deworm.push({ id: uid(), petId: pet.id, type: '体外驱虫', date: shiftDays(-30), nextDate: shiftDays(-5) }); // 已到期

    d.posts = seedPosts();
    return d;
  }

  function seedPosts() {
    var now = Date.now();
    var p = [];
    function post(name, avatar, tone, city, agoH, text, media, mediaTone, likes, comments) {
      p.push({ id: uid(), authorName: name, avatar: avatar, tone: tone, city: city, time: now - agoH * 3600000,
        text: text, media: media, mediaTone: mediaTone, likes: likes, liked: false,
        comments: (comments || []).map(function (c) { return { name: c[0], text: c[1] }; }) });
    }
    post('布丁妈妈', '🐱', 1, '上海', 2, '团子今天体检，医生夸它很健康！就是有点超重，要开始控制猫粮啦 🍚', '🐈', 2, 24, [['可乐爸', '布丁也圆圆的哈哈哈'], ['团子妈', '求推荐低卡猫粮！']]);
    post('旺财的爹', '🐶', 3, '上海', 5, '周末带旺财去滨江草地跑了 5 公里，回来倒头就睡，腿都软了 🦴', '🐕', 3, 41, [['奶茶姐', '柯基跑 5 公里？你认真的吗']]);
    post('球球饲养员', '🐹', 4, '杭州', 9, '给球球换了新跑轮，它快乐到模糊，仓鼠的快乐就是这么简单 ✨', '🐹', 4, 15, []);
    post('雪球姐姐', '🐰', 2, '苏州', 26, '垂耳兔真的会“晕倒”式睡觉！第一次看到吓我一跳 😂', '🐇', 2, 33, [['布丁妈妈', '太可爱了！']]);
    post('金毛Sammy', '🐶', 0, '北京', 30, '第一次带Sammy游泳，金毛果然是水里的鱼，拉都拉不上来 🌊', '🦮', 5, 58, [['旺财的爹', '羡慕会游泳的狗']]);
    post('皮皮爸', '🦜', 5, '广州', 50, '皮皮学会了说“早上好”，今天对着窗帘叫了 20 遍 😅', '🦜', 5, 27, []);
    return p;
  }

  /* 同城宠友（静态演示成员，关注状态持久化） */
  var COMMUNITY = [
    { id: 'u1', name: '布丁妈妈', avatar: '🐱', tone: 1, city: '上海', petName: '布丁', species: 'cat', breed: '英短', years: 3, tags: ['猫粮评测', '绝育经验', '猫咪行为'], bio: '养英短 3 年，主攻猫粮成分和绝育护理～' },
    { id: 'u2', name: '旺财的爹', avatar: '🐶', tone: 3, city: '上海', petName: '旺财', species: 'dog', breed: '柯基', years: 2, tags: ['遛狗搭子', '犬训练'], bio: '柯基旺财的铲屎官，周末常去滨江，求狗搭子！' },
    { id: 'u3', name: '球球饲养员', avatar: '🐹', tone: 4, city: '杭州', petName: '球球', species: 'hamster', breed: '金丝熊', years: 1, tags: ['仓鼠饲养', '造景'], bio: '仓鼠造景爱好者，欢迎交流垫材和跑轮～' },
    { id: 'u4', name: '雪球姐姐', avatar: '🐰', tone: 2, city: '苏州', petName: '雪球', species: 'rabbit', breed: '垂耳兔', years: 2, tags: ['兔子食谱', '日常'], bio: '垂耳兔雪球，分享兔兔科学喂养～' },
    { id: 'u5', name: '金毛Sammy', avatar: '🐶', tone: 0, city: '北京', petName: 'Sammy', species: 'dog', breed: '金毛', years: 4, tags: ['犬游泳', '犬营养'], bio: '金毛 Sammy，运动型选手，游泳健将！' },
    { id: 'u6', name: '皮皮爸', avatar: '🦜', tone: 5, city: '广州', petName: '皮皮', species: 'bird', breed: '玄凤', years: 1, tags: ['鹦鹉训练', '叫声教学'], bio: '玄凤鹦鹉皮皮，正在学说话，欢迎来云吸～' },
    { id: 'u7', name: '奶茶姐', avatar: '🐱', tone: 3, city: '上海', petName: '奶茶', species: 'cat', breed: '橘猫', years: 2, tags: ['猫咪行为', '平价好物'], bio: '橘猫奶茶，能吃是福！分享平价养猫好物～' },
    { id: 'u8', name: '小龟慢慢', avatar: '🐢', tone: 2, city: '成都', petName: '慢慢', species: 'turtle', breed: '草龟', years: 5, tags: ['龟龟饲养', '冬眠'], bio: '养龟 5 年，慢慢长命百岁～' }
  ];

  var data = load();

  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    var s = seed();
    save(s);
    return s;
  }
  function save(d) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d || data)); } catch (e) {}
  }

  /* ----------------------------------------------------------
     派生数据
  ---------------------------------------------------------- */
  function activePet() {
    for (var i = 0; i < data.pets.length; i++) if (data.pets[i].id === data.activePetId) return data.pets[i];
    return data.pets[0] || null;
  }
  function petRecords(type, petId) {
    return data.records[type].filter(function (r) { return r.petId === petId; })
      .sort(function (a, b) { return parseDate(a.date) - parseDate(b.date); });
  }
  function weightSeries(petId) {
    return petRecords('weight', petId);
  }
  function latestWeight(petId) {
    var s = weightSeries(petId);
    return s.length ? s[s.length - 1] : null;
  }
  function weightDelta(petId) {
    var s = weightSeries(petId);
    if (s.length < 2) return null;
    return Math.round((s[s.length - 1].kg - s[s.length - 2].kg) * 100) / 100;
  }

  function reminders(petId) {
    var list = [];
    data.records.vaccine.filter(function (r) { return r.petId === petId; }).forEach(function (r) {
      var du = daysUntil(r.nextDate);
      if (du <= 7) list.push({ kind: '疫苗', name: r.name, days: du, overdue: du < 0 });
    });
    data.records.deworm.filter(function (r) { return r.petId === petId; }).forEach(function (r) {
      var du = daysUntil(r.nextDate);
      if (du <= 7) list.push({ kind: '驱虫', name: r.type, days: du, overdue: du < 0 });
    });
    list.sort(function (a, b) { return a.days - b.days; });
    return list;
  }

  function timelineEvents(petId) {
    var pet = activePet();
    var ev = [];
    if (pet) ev.push({ date: pet.birthday, type: 'mile', title: pet.name + ' 出生 🎂', desc: '欢迎来到这个世界', tag: '出生' });
    data.records.weight.filter(function (r) { return r.petId === petId; }).forEach(function (r) {
      ev.push({ date: r.date, type: 'weight', title: '体重 ' + r.kg + ' kg', desc: '记录了一次体重', tag: '体重' });
    });
    data.records.vaccine.filter(function (r) { return r.petId === petId; }).forEach(function (r) {
      ev.push({ date: r.date, type: 'vac', title: '接种 ' + r.name, desc: '完成疫苗接种', tag: '疫苗' });
    });
    data.records.deworm.filter(function (r) { return r.petId === petId; }).forEach(function (r) {
      ev.push({ date: r.date, type: 'dw', title: r.type, desc: '完成驱虫护理', tag: '驱虫' });
    });
    // 满月 / 满岁里程碑
    if (pet) {
      var b = parseDate(pet.birthday);
      var months = 0;
      var cur = new Date(b);
      var now = new Date();
      while (true) {
        var m = new Date(b); m.setMonth(b.getMonth() + months);
        if (m > now) break;
        if (months > 0 && months % 12 === 0) {
          ev.push({ date: toYMD(m), type: 'mile', title: pet.name + ' 满 ' + (months / 12) + ' 岁 🎉', desc: '一起走过 ' + (months / 12) + ' 年', tag: '生日' });
        }
        months++;
      }
    }
    ev.sort(function (a, b) { return parseDate(b.date) - parseDate(a.date); });
    return ev;
  }

  function isNear(cityA, cityB) {
    return (CITY_ADJ[cityA] || []).indexOf(cityB) >= 0;
  }
  function matchScore(member, pet, city) {
    var s = 30;
    if (member.species === pet.species) s += 30;
    if (member.breed === pet.breed) s += 15;
    if (member.city === city) s += 25;
    else if (isNear(member.city, city)) s += 12;
    if (member.years >= 3) s += 4;
    return Math.min(s, 99);
  }

  /* ----------------------------------------------------------
     体重图表（SVG，参考 dataviz：单序列线性 + 面积 + hover）
  ---------------------------------------------------------- */
  function weightChartHTML(series) {
    if (!series.length) return '<div class="chart-empty">还没有体重记录，点「记体重」开始记录吧 🐾</div>';
    var W = 640, H = 230, L = 44, R = 16, T = 18, B = 34;
    var vals = series.map(function (s) { return s.kg; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (min === max) { min -= 0.5; max += 0.5; }
    var pad = (max - min) * 0.18 || 0.5;
    min -= pad; max += pad;
    var n = series.length;
    var px = function (i) { return n === 1 ? L + (W - L - R) / 2 : L + i * (W - L - R) / (n - 1); };
    var py = function (v) { return T + (1 - (v - min) / (max - min)) * (H - T - B); };

    var pts = series.map(function (s, i) { return { x: px(i), y: py(s.kg), kg: s.kg, date: s.date }; });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' ');
    var area = 'M' + pts[0].x.toFixed(1) + ' ' + (H - B) + ' L' + pts.map(function (p) { return p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' L') + ' L' + pts[pts.length - 1].x.toFixed(1) + ' ' + (H - B) + ' Z';

    var grid = '';
    for (var g = 1; g <= 3; g++) {
      var gy = T + g * (H - T - B) / 4;
      var gv = max - g * (max - min) / 4;
      grid += '<line x1="' + L + '" y1="' + gy.toFixed(1) + '" x2="' + (W - R) + '" y2="' + gy.toFixed(1) + '" stroke="var(--gridline)" stroke-width="1"/>';
      grid += '<text x="' + (L - 8) + '" y="' + (gy + 4).toFixed(1) + '" text-anchor="end" font-size="11" fill="var(--muted-ink)">' + gv.toFixed(1) + '</text>';
    }

    var dots = pts.map(function (p, i) {
      return '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="4" fill="var(--surface-1)" stroke="var(--series-1)" stroke-width="2.5"><title>' + fmtFull(p.date) + ' · ' + p.kg + ' kg</title></circle>';
    }).join('');

    // 直接标注首尾
    var labels = '';
    if (n >= 2) {
      labels += '<text x="' + pts[0].x.toFixed(1) + '" y="' + (pts[0].y - 10).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" fill="var(--text-secondary)">' + pts[0].kg + '</text>';
      labels += '<text x="' + pts[n - 1].x.toFixed(1) + '" y="' + (pts[n - 1].y - 10).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="var(--series-1)">' + pts[n - 1].kg + ' kg</text>';
    } else if (n === 1) {
      labels += '<text x="' + pts[0].x.toFixed(1) + '" y="' + (pts[0].y - 10).toFixed(1) + '" text-anchor="middle" font-size="12" font-weight="700" fill="var(--series-1)">' + pts[0].kg + ' kg</text>';
    }

    var html = '<svg class="paw-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="体重趋势图" data-points="' + esc(JSON.stringify(pts)) + '">';
    html += grid;
    html += '<path d="' + area + '" fill="var(--series-1-fill)"/>';
    html += '<path d="' + line + '" fill="none" stroke="var(--series-1)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    html += dots + labels;
    html += '<line id="crosshair" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--baseline)" stroke-width="1" stroke-dasharray="3 3" style="display:none"/>';
    html += '<circle id="hl-dot" r="6" fill="var(--series-1)" stroke="var(--surface-1)" stroke-width="2.5" style="display:none"/>';
    html += '</svg>';
    html += '<div class="chart-tip" style="display:none;position:absolute;transform:translate(-50%,-100%);background:var(--ink);color:#fff;padding:6px 11px;border-radius:9px;font-size:12px;line-height:1.45;pointer-events:none;white-space:nowrap;box-shadow:0 8px 20px rgba(0,0,0,.25);z-index:5"></div>';
    return html;
  }

  function setupWeightChart(root) {
    var svg = $('svg.paw-chart', root);
    if (!svg) return;
    var pts;
    try { pts = JSON.parse(svg.getAttribute('data-points')); } catch (e) { return; }
    if (!pts || !pts.length) return;
    var tip = $('.chart-tip', root);
    var cross = $('#crosshair', svg);
    var hl = $('#hl-dot', svg);
    var VB_W = 640, VB_H = 230;
    svg.addEventListener('mousemove', function (e) {
      var rect = svg.getBoundingClientRect();
      var sx = (e.clientX - rect.left) / rect.width * VB_W;
      var best = pts[0], bd = Infinity;
      for (var i = 0; i < pts.length; i++) { var dd = Math.abs(pts[i].x - sx); if (dd < bd) { bd = dd; best = pts[i]; } }
      cross.setAttribute('x1', best.x); cross.setAttribute('x2', best.x);
      cross.style.display = '';
      hl.setAttribute('cx', best.x); hl.setAttribute('cy', best.y);
      hl.style.display = '';
      tip.style.display = 'block';
      tip.style.left = (best.x / VB_W * rect.width) + 'px';
      tip.style.top = (best.y / VB_H * rect.height - 12) + 'px';
      tip.innerHTML = esc(fmtFull(best.date)) + '<br><b>' + best.kg + ' kg</b>';
    });
    svg.addEventListener('mouseleave', function () {
      cross.style.display = 'none'; hl.style.display = 'none'; tip.style.display = 'none';
    });
  }

  /* ----------------------------------------------------------
     视图渲染
  ---------------------------------------------------------- */
  function currentView() {
    var h = (location.hash || '').replace('#', '');
    return h && VIEWS[h] ? h : 'home';
  }

  var lastView = '';
  function render() {
    var v = currentView();
    var app = $('#app');
    app.innerHTML = VIEWS[v]();
    // 高亮导航
    $$('.nav-link').forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-nav') === v); });
    $$('.bn-item').forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('data-nav') === v); });
    $('#cityLabel').textContent = data.user.city;
    if (v === 'health') setupWeightChart(app);
    if (v !== lastView) window.scrollTo(0, 0);
    lastView = v;
  }

  var VIEWS = {
    /* ---------------- 首页 ---------------- */
    home: function () {
      var pet = activePet();
      if (!pet) return VIEWS.emptyState('还没有宠物', '先为你的毛孩子建立档案吧', '🐾', '立即创建', 'addPet');

      var lw = latestWeight(pet.id);
      var delta = weightDelta(pet.id);
      var rem = reminders(pet.id);
      var vDone = data.records.vaccine.filter(function (r) { return r.petId === pet.id; }).length;
      var dDone = data.records.deworm.filter(function (r) { return r.petId === pet.id; }).length;

      var deltaHtml = delta == null ? '' : (delta >= 0
        ? '<span class="delta-up">▲ ' + delta + ' kg</span>'
        : '<span class="delta-down">▼ ' + Math.abs(delta) + ' kg</span>');

      var remHtml = rem.length
        ? rem.slice(0, 4).map(function (r) {
            var cls = r.overdue ? 'badge-red' : 'badge-amber';
            var txt = r.overdue ? '已到期 ' + Math.abs(r.days) + ' 天' : '还剩 ' + r.days + ' 天';
            return '<div class="remind-item"><span class="remind-ico">' + (r.kind === '疫苗' ? '💉' : '🐛') + '</span>' +
              '<div class="remind-body"><div class="t">' + esc(r.name) + ' · ' + esc(r.kind) + '</div><div class="s">' + txt + '，记得安排</div></div>' +
              '<span class="badge ' + cls + '">' + txt + '</span></div>';
          }).join('')
        : '<div class="empty" style="padding:22px"><span class="e">🎉</span><div class="t">近期没有待办</div><div class="s">疫苗和驱虫都安排妥当啦</div></div>';

      return (
        '<div class="hero">' +
          '<div class="hi">你好，' + esc(data.user.name) + ' 👋</div>' +
          '<h1>和 ' + esc(pet.name) + ' 的每一天都值得记录</h1>' +
        '</div>' +

        '<div class="card" style="margin-top:14px">' +
          '<div class="pet-card">' +
            '<div class="avatar avatar-lg ' + TONES[pet.tone] + '">' + pet.avatar + '</div>' +
            '<div class="pet-meta">' +
              '<div class="name">' + esc(pet.name) +
                '<span class="badge badge-brand">' + SPECIES[pet.species].label + '</span>' +
                '<span class="badge badge-gray">' + esc(pet.breed) + '</span>' +
              '</div>' +
              '<div class="desc">' + esc(pet.gender === 'girl' ? '👧 妹妹' : '👦 弟弟') + ' · ' + ageText(pet.birthday) + ' · ' + esc(data.user.city) + '</div>' +
              '<div class="pet-quick">' +
                '<button class="btn btn-soft btn-sm" data-action="addWeight">⚖️ 记体重</button>' +
                '<button class="btn btn-soft btn-sm" data-action="addVaccine">💉 记疫苗</button>' +
                '<button class="btn btn-soft btn-sm" data-action="addDeworm">🐛 记驱虫</button>' +
                '<button class="btn btn-ghost btn-sm" data-action="addPet">＋ 新宠物</button>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +

        '<div class="stat-grid" style="margin-top:14px">' +
          '<div class="stat-tile"><div class="k">⚖️ 最新体重</div><div class="v">' + (lw ? lw.kg : '—') + '<small>kg</small></div><div class="d">' + deltaHtml + '</div></div>' +
          '<div class="stat-tile"><div class="k">💉 疫苗记录</div><div class="v">' + vDone + '<small>针</small></div><div class="d">已累计接种</div></div>' +
          '<div class="stat-tile"><div class="k">🐛 驱虫记录</div><div class="v">' + dDone + '<small>次</small></div><div class="d">定期守护健康</div></div>' +
        '</div>' +

        '<div class="section-head"><h2>⏰ 健康提醒</h2><button class="btn btn-ghost btn-sm" data-nav-go="health">查看档案 →</button></div>' +
        '<div class="card">' + remHtml + '</div>' +

        '<div class="section-head"><h2>🐾 同城动态</h2><button class="btn btn-ghost btn-sm" data-nav-go="feed">全部 →</button></div>' +
        '<div class="feed">' + data.posts.slice(0, 2).map(postHTML).join('') + '</div>'
      );
    },

    /* ---------------- 健康档案 ---------------- */
    health: function () {
      var pet = activePet();
      if (!pet) return VIEWS.emptyState('还没有宠物', '先建立档案再记录健康数据', '💉', '立即创建', 'addPet');

      var switcher = data.pets.length > 1
        ? '<div class="filter-row" style="margin-bottom:14px">' +
            data.pets.map(function (p) {
              return '<button class="chip ' + (p.id === data.activePetId ? 'chip-active' : '') + '" data-action="switchPet" data-id="' + p.id + '">' + p.avatar + ' ' + esc(p.name) + '</button>';
            }).join('') +
          '</div>'
        : '';

      var ws = weightSeries(pet.id);
      var lw = latestWeight(pet.id);
      var delta = weightDelta(pet.id);
      var deltaHtml = delta == null ? '' : (delta >= 0
        ? '<span class="delta-up">较上次 +' + delta + ' kg</span>'
        : '<span class="delta-down">较上次 ' + delta + ' kg</span>');

      var wList = ws.slice().reverse().map(function (r) {
        return '<div class="rec-item"><span class="ico ico-blue">⚖️</span>' +
          '<div class="body"><div class="t">' + fmtMD(r.date) + '</div><div class="s">' + fmtFull(r.date) + '</div></div>' +
          '<span class="val">' + r.kg + ' kg</span>' +
          '<button class="del" data-action="delRecord" data-type="weight" data-id="' + r.id + '" title="删除">✕</button></div>';
      }).join('');

      var vList = petRecords('vaccine', pet.id).slice().reverse().map(function (r) {
        var du = daysUntil(r.nextDate);
        var b = du < 0 ? '<span class="badge badge-red">已到期</span>' : (du <= 7 ? '<span class="badge badge-amber">' + du + ' 天后到期</span>' : '<span class="badge badge-green">下次 ' + fmtMD(r.nextDate) + '</span>');
        return '<div class="rec-item"><span class="ico ico-green">💉</span>' +
          '<div class="body"><div class="t">' + esc(r.name) + '</div><div class="s">接种于 ' + fmtMD(r.date) + '</div></div>' +
          '<span class="val" style="font-size:13px">' + b + '</span>' +
          '<button class="del" data-action="delRecord" data-type="vaccine" data-id="' + r.id + '" title="删除">✕</button></div>';
      }).join('');

      var dList = petRecords('deworm', pet.id).slice().reverse().map(function (r) {
        var du = daysUntil(r.nextDate);
        var b = du < 0 ? '<span class="badge badge-red">已到期</span>' : (du <= 7 ? '<span class="badge badge-amber">' + du + ' 天后到期</span>' : '<span class="badge badge-green">下次 ' + fmtMD(r.nextDate) + '</span>');
        var emoji = r.type.indexOf('体外') >= 0 ? '💧' : '💊';
        return '<div class="rec-item"><span class="ico ico-amber">' + emoji + '</span>' +
          '<div class="body"><div class="t">' + esc(r.type) + '</div><div class="s">最近一次 ' + fmtMD(r.date) + '</div></div>' +
          '<span class="val" style="font-size:13px">' + b + '</span>' +
          '<button class="del" data-action="delRecord" data-type="deworm" data-id="' + r.id + '" title="删除">✕</button></div>';
      }).join('');

      return (
        switcher +
        '<div class="card">' +
          '<div class="section-title-sm" style="margin-top:0"><h3>⚖️ 体重趋势</h3>' +
            '<button class="btn btn-soft btn-sm" data-action="addWeight">＋ 记录</button></div>' +
          '<div class="chart-meta">' +
            '<span class="big">' + (lw ? lw.kg : '—') + '<small> kg</small></span>' +
            (lw ? '<span class="badge badge-blue">' + fmtMD(lw.date) + ' 记录</span>' : '') + deltaHtml +
          '</div>' +
          '<div class="weight-chart" style="position:relative;margin-top:6px">' + weightChartHTML(ws) + '</div>' +
        '</div>' +

        '<div class="section-title-sm"><h3>💉 疫苗记录</h3>' +
          '<button class="btn btn-soft btn-sm" data-action="addVaccine">＋ 添加</button></div>' +
        '<div class="rec-list">' + (vList || '<div class="empty" style="padding:20px"><span class="e">💉</span><div class="t">暂无疫苗记录</div></div>') + '</div>' +

        '<div class="section-title-sm"><h3>🐛 驱虫记录</h3>' +
          '<button class="btn btn-soft btn-sm" data-action="addDeworm">＋ 添加</button></div>' +
        '<div class="rec-list">' + (dList || '<div class="empty" style="padding:20px"><span class="e">🐛</span><div class="t">暂无驱虫记录</div></div>') + '</div>'
      );
    },

    /* ---------------- 成长时间线 ---------------- */
    timeline: function () {
      var pet = activePet();
      if (!pet) return VIEWS.emptyState('还没有宠物', '建立档案后自动生成成长时间线', '⏱️', '立即创建', 'addPet');

      var ev = timelineEvents(pet.id);
      var html = ev.map(function (e) {
        var ico = e.type === 'mile' ? '🎂' : (e.type === 'weight' ? '⚖️' : (e.type === 'vac' ? '💉' : '🐛'));
        return '<div class="tl-item' + (e.type === 'mile' ? ' mile' : '') + '">' +
          '<div class="tl-date">' + ico + ' ' + fmtFull(e.date) + '</div>' +
          '<div class="tl-title">' + esc(e.title) + '</div>' +
          '<div class="tl-desc">' + esc(e.desc) + '</div>' +
          '<span class="tl-tag badge badge-' + (e.type === 'mile' ? 'amber' : (e.type === 'weight' ? 'blue' : (e.type === 'vac' ? 'green' : 'brand'))) + '">' + e.tag + '</span>' +
        '</div>';
      }).join('');

      return (
        '<div class="section-head" style="margin-top:0"><h2>⏱️ ' + esc(pet.name) + ' 的成长时间线</h2></div>' +
        '<div class="card"><div class="chart-meta" style="margin-bottom:4px">' +
          '<span class="big">' + ev.length + '<small> 个里程碑</small></span>' +
          '<span class="badge badge-brand">' + ageText(pet.birthday) + '</span>' +
        '</div></div>' +
        '<div class="card" style="margin-top:14px"><div class="timeline">' + html + '</div></div>'
      );
    },

    /* ---------------- 同城宠友 ---------------- */
    friends: function () {
      var pet = activePet();
      if (!pet) return VIEWS.emptyState('还没有宠物', '先建立档案才能匹配同城宠友', '🧭', '立即创建', 'addPet');

      var city = data.user.city;
      var speciesFilter = currentSpeciesFilter;

      var members = COMMUNITY.filter(function (m) {
        return !speciesFilter || m.species === speciesFilter;
      }).map(function (m) {
        var s = matchScore(m, pet, city);
        return { m: m, score: s };
      }).sort(function (a, b) { return b.score - a.score; });

      var filterChips = '<button class="chip ' + (!speciesFilter ? 'chip-active' : '') + '" data-action="friendFilter" data-id="">全部</button>' +
        Object.keys(SPECIES).map(function (k) {
          return '<button class="chip ' + (speciesFilter === k ? 'chip-active' : '') + '" data-action="friendFilter" data-id="' + k + '">' + SPECIES[k].emoji + ' ' + SPECIES[k].label + '</button>';
        }).join('');

      var cards = members.map(function (o) {
        var m = o.m;
        var followed = data.follows.indexOf(m.id) >= 0;
        var same = m.city === city;
        var locBadge = same ? '<span class="badge badge-brand">同城</span>'
          : (isNear(m.city, city) ? '<span class="badge badge-blue">附近</span>' : '<span class="badge badge-gray">' + m.city + '</span>');
        return '<div class="friend-card">' +
          '<div class="friend-top">' +
            '<div class="avatar avatar-md ' + TONES[m.tone] + '">' + m.avatar + '</div>' +
            '<div class="friend-info"><div class="n">' + esc(m.name) + locBadge + '</div>' +
              '<div class="loc">📍 ' + esc(m.city) + ' · ' + m.petName + '（' + SPECIES[m.species].label + ' · ' + esc(m.breed) + '）</div></div>' +
          '</div>' +
          '<div class="friend-bio">' + esc(m.bio) + '</div>' +
          '<div class="friend-tags">' + m.tags.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
          '<div>' +
            '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);font-weight:600;margin-bottom:4px"><span>匹配度</span><span>' + o.score + '%</span></div>' +
            '<div class="match-bar"><span style="width:' + o.score + '%"></span></div>' +
          '</div>' +
          '<div class="friend-actions">' +
            '<button class="btn ' + (followed ? 'btn-ghost' : 'btn-primary') + ' btn-sm" data-action="follow" data-id="' + m.id + '">' + (followed ? '✓ 已关注' : '＋ 关注') + '</button>' +
            '<button class="btn btn-soft btn-sm" data-action="sayHi" data-id="' + m.id + '">👋 打招呼</button>' +
          '</div>' +
        '</div>';
      }).join('');

      return (
        '<div class="section-head" style="margin-top:0"><h2>🧭 同城宠友</h2>' +
          '<button class="btn btn-ghost btn-sm" data-action="setCity">📍 ' + esc(city) + '</button></div>' +
        '<div class="filter-row">' + filterChips + '</div>' +
        '<p style="font-size:13px;color:var(--muted);margin-bottom:14px">基于「' + esc(pet.breed) + ' · ' + esc(data.user.city) + '」为你匹配，同城优先 · 共 ' + members.length + ' 位宠友</p>' +
        '<div class="friend-grid">' + cards + '</div>'
      );
    },

    /* ---------------- 养宠日常 ---------------- */
    feed: function () {
      var posts = data.posts.slice().sort(function (a, b) { return b.time - a.time; });
      return (
        '<div class="section-head" style="margin-top:0"><h2>🐾 养宠日常</h2>' +
          '<button class="btn btn-primary btn-sm" data-action="addPost">＋ 发动态</button></div>' +
        '<div class="feed">' + posts.map(postHTML).join('') + '</div>'
      );
    },

    emptyState: function (t, s, e, btnText, action) {
      return '<div class="empty">' +
        '<div class="e">' + e + '</div><div class="t">' + t + '</div><div class="s">' + s + '</div>' +
        '<button class="btn btn-primary" style="margin-top:16px" data-action="' + action + '">' + btnText + '</button>' +
      '</div>';
    }
  };

  var currentSpeciesFilter = '';

  function postHTML(p) {
    var commentHtml = p.comments.map(function (c) {
      return '<div class="comment"><div class="avatar avatar-sm ' + TONES[0] + '">🙂</div><div><div class="c-name">' + esc(c.name) + '</div><div class="c-text">' + esc(c.text) + '</div></div></div>';
    }).join('');
    return '<article class="post">' +
      '<div class="post-head">' +
        '<div class="avatar avatar-md ' + TONES[p.tone] + '">' + p.avatar + '</div>' +
        '<div><div class="n">' + esc(p.authorName) + '</div><div class="m">📍 ' + esc(p.city) + ' · ' + fmtAgo(p.time) + '</div></div>' +
      '</div>' +
      '<div class="post-body"><div class="post-text">' + esc(p.text) + '</div>' +
        (p.media ? '<div class="post-media ' + TONES[p.mediaTone] + '"><span>' + p.media + '</span></div>' : '') +
      '</div>' +
      '<div class="post-actions">' +
        '<button class="post-act ' + (p.liked ? 'liked' : '') + '" data-action="like" data-id="' + p.id + '">' + (p.liked ? '❤️' : '🤍') + ' ' + p.likes + '</button>' +
        '<button class="post-act" data-action="focusComment" data-id="' + p.id + '">💬 ' + p.comments.length + '</button>' +
        '<button class="post-act" data-action="share" data-id="' + p.id + '">🔗 分享</button>' +
      '</div>' +
      (p.comments.length ? '<div class="post-comments">' + commentHtml + '</div>' : '') +
      '<div class="post-comments" style="border-top:1px solid var(--line)">' +
        '<div class="comment-box"><input class="input comment-input" data-id="' + p.id + '" placeholder="说点什么…" style="flex:1" /></div>' +
      '</div>' +
    '</article>';
  }

  /* ----------------------------------------------------------
     弹窗系统
  ---------------------------------------------------------- */
  function openModal(html) {
    var root = $('#modal-root');
    root.innerHTML = '<div class="modal-overlay"><div class="modal" role="dialog" aria-modal="true">' + html + '</div></div>';
    root.querySelector('.modal-overlay').addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
    document.body.style.overflow = 'hidden';
    var first = root.querySelector('input, select, textarea');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }
  function closeModal() {
    $('#modal-root').innerHTML = '';
    document.body.style.overflow = '';
  }

  function modalShell(title, bodyHtml, footHtml) {
    return '<div class="modal-head"><h3>' + title + '</h3><button class="modal-close" data-action="closeModal">✕</button></div>' +
      bodyHtml + (footHtml ? '<div class="modal-foot">' + footHtml + '</div>' : '');
  }

  function toast(msg) {
    var root = $('#toast-root');
    var el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 1800);
    setTimeout(function () { el.remove(); }, 2200);
  }

  /* ----------------------------------------------------------
     各类弹窗内容
  ---------------------------------------------------------- */
  function addPetModal() {
    var speciesKeys = Object.keys(SPECIES);
    var html = modalShell('🐾 创建宠物档案',
      '<div class="onboard-hero"><div class="big">🐾</div><h3>欢迎来到宠迹</h3><p>先为你的毛孩子建立一份成长档案吧</p></div>' +
      '<form data-form="addPet">' +
        '<div class="field"><label>选择物种</label><div class="seg" id="petSpecies">' +
          speciesKeys.map(function (k, i) { return '<button type="button" class="chip ' + (i === 0 ? 'chip-active' : '') + '" data-species="' + k + '">' + SPECIES[k].emoji + ' ' + SPECIES[k].label + '</button>'; }).join('') +
        '</div></div>' +
        '<div class="field"><label>品种</label><select class="select input" name="breed" id="breedSelect"></select></div>' +
        '<div class="form-row">' +
          '<div class="field"><label>名字 <span class="req">*</span></label><input class="input" name="name" placeholder="如：团子" required /></div>' +
          '<div class="field"><label>性别</label><div class="seg">' +
            '<button type="button" class="chip chip-active" data-gender="girl">👧 妹妹</button>' +
            '<button type="button" class="chip" data-gender="boy">👦 弟弟</button>' +
          '</div></div>' +
        '</div>' +
        '<div class="field"><label>生日 / 到家日</label><input class="input" type="date" name="birthday" value="' + shiftDays(-365) + '" /></div>' +
        '<div class="field"><label>所在城市</label><select class="select input" name="city">' +
          CITIES.map(function (c) { return '<option value="' + c + '"' + (c === data.user.city ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>选个头像</label><div class="emoji-pick" id="petEmoji">' +
          PET_EMOJIS.map(function (e, i) { return '<button type="button" class="ep ' + (i === 0 ? 'sel' : '') + '" data-emoji="' + e + '">' + e + '</button>'; }).join('') +
        '</div></div>' +
      '</form>',
      '<button class="btn btn-ghost" data-action="closeModal">取消</button>' +
      '<button class="btn btn-primary" data-submit="addPet">保存档案</button>');

    // 动态绑定品种 + 选择器
    setTimeout(function () {
      var species = 'cat', gender = 'girl', emoji = PET_EMOJIS[0];
      function refreshBreeds() { var b = SPECIES[species].breeds; var sel = $('#breedSelect'); sel.innerHTML = b.map(function (x) { return '<option>' + x + '</option>'; }).join(''); }
      refreshBreeds();
      var seg = $('#petSpecies');
      seg.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-species]');
        if (!btn) return;
        species = btn.getAttribute('data-species');
        $$('#petSpecies .chip').forEach(function (c) { c.classList.toggle('chip-active', c === btn); });
        refreshBreeds();
      });
      // gender 选择
      $$('.modal [data-gender]').forEach(function (g) {
        g.addEventListener('click', function () {
          gender = g.getAttribute('data-gender');
          $$('.modal [data-gender]').forEach(function (x) { x.classList.toggle('chip-active', x === g); });
        });
      });
      var ep = $('#petEmoji');
      ep.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-emoji]');
        if (!btn) return;
        emoji = btn.getAttribute('data-emoji');
        $$('#petEmoji .ep').forEach(function (x) { x.classList.toggle('sel', x === btn); });
      });

      // 保存
      $('[data-submit="addPet"]').addEventListener('click', function () {
        var form = $('.modal [data-form="addPet"]');
        var name = form.name.value.trim();
        if (!name) { toast('请填写名字～'); return; }
        var pet = {
          id: uid(), name: name, species: species, breed: form.breed.value, birthday: form.birthday.value || todayYMD(),
          gender: gender, avatar: emoji, tone: Math.floor(Math.random() * TONES.length)
        };
        data.pets.push(pet);
        data.activePetId = pet.id;
        data.user.city = form.city.value;
        if (!data.user.onboarded) { data.user.onboarded = true; }
        save(); closeModal(); render(); toast('档案创建成功 🎉');
      });
    }, 30);
    return html;
  }

  function weightModal() {
    var html = modalShell('⚖️ 记录体重',
      '<form data-form="weight">' +
        '<div class="field"><label>体重 (kg) <span class="req">*</span></label>' +
        '<input class="input" name="kg" type="number" step="0.1" min="0.1" max="200" placeholder="如：4.3" required /></div>' +
        '<div class="field"><label>日期</label><input class="input" type="date" name="date" value="' + todayYMD() + '" /></div>' +
      '</form>',
      '<button class="btn btn-ghost" data-action="closeModal">取消</button><button class="btn btn-primary" data-submit="weight">保存</button>');
    setTimeout(function () {
      $('[data-submit="weight"]').addEventListener('click', function () {
        var form = $('.modal [data-form="weight"]');
        var kg = parseFloat(form.kg.value);
        if (!kg || kg <= 0) { toast('请输入有效体重'); return; }
        data.records.weight.push({ id: uid(), petId: data.activePetId, date: form.date.value || todayYMD(), kg: Math.round(kg * 10) / 10 });
        save(); closeModal(); render(); toast('已记录体重 ' + Math.round(kg * 10) / 10 + ' kg');
      });
    }, 30);
    return html;
  }

  function vaccineModal() {
    var html = modalShell('💉 记录疫苗',
      '<form data-form="vaccine">' +
        '<div class="field"><label>疫苗名称</label><select class="select input" name="name" id="vacName">' +
          VACCINES.map(function (v) { return '<option>' + v + '</option>'; }).join('') + '</select></div>' +
        '<div class="field"><label>接种日期</label><input class="input" type="date" name="date" value="' + todayYMD() + '" /></div>' +
        '<div class="field"><label>下次接种日期（用于提醒）</label><input class="input" type="date" name="nextDate" id="vacNext" /></div>' +
      '</form>',
      '<button class="btn btn-ghost" data-action="closeModal">取消</button><button class="btn btn-primary" data-submit="vaccine">保存</button>');
    setTimeout(function () {
      function syncNext() { var n = $('#vacName').value; var days = VACCINE_DAYS[n] || 365; $('#vacNext').value = shiftDays(days); }
      syncNext();
      $('#vacName').addEventListener('change', syncNext);
      $('[data-submit="vaccine"]').addEventListener('click', function () {
        var form = $('.modal [data-form="vaccine"]');
        data.records.vaccine.push({ id: uid(), petId: data.activePetId, name: form.name.value, date: form.date.value || todayYMD(), nextDate: form.nextDate.value || shiftDays(365) });
        save(); closeModal(); render(); toast('已记录疫苗 ✅');
      });
    }, 30);
    return html;
  }

  function dewormModal() {
    var html = modalShell('🐛 记录驱虫',
      '<form data-form="deworm">' +
        '<div class="field"><label>驱虫类型</label><div class="seg" id="dwType">' +
          DEWORMS.map(function (d, i) { return '<button type="button" class="chip ' + (i === 0 ? 'chip-active' : '') + '" data-dw="' + d.label + '" data-days="' + d.days + '">' + d.emoji + ' ' + d.label + '</button>'; }).join('') +
        '</div></div>' +
        '<div class="field"><label>日期</label><input class="input" type="date" name="date" value="' + todayYMD() + '" /></div>' +
        '<div class="field"><label>下次驱虫日期（用于提醒）</label><input class="input" type="date" name="nextDate" id="dwNext" /></div>' +
      '</form>',
      '<button class="btn btn-ghost" data-action="closeModal">取消</button><button class="btn btn-primary" data-submit="deworm">保存</button>');
    setTimeout(function () {
      var curType = DEWORMS[0].label, curDays = DEWORMS[0].days;
      function syncNext() { $('#dwNext').value = shiftDays(curDays); }
      syncNext();
      $('#dwType').addEventListener('click', function (e) {
        var btn = e.target.closest('[data-dw]');
        if (!btn) return;
        curType = btn.getAttribute('data-dw'); curDays = +btn.getAttribute('data-days');
        $$('#dwType .chip').forEach(function (c) { c.classList.toggle('chip-active', c === btn); });
        syncNext();
      });
      $('[data-submit="deworm"]').addEventListener('click', function () {
        var form = $('.modal [data-form="deworm"]');
        data.records.deworm.push({ id: uid(), petId: data.activePetId, type: curType, date: form.date.value || todayYMD(), nextDate: form.nextDate.value || shiftDays(curDays) });
        save(); closeModal(); render(); toast('已记录驱虫 ✅');
      });
    }, 30);
    return html;
  }

  function postModal() {
    var pet = activePet();
    var mediaEmojis = ['🐱', '🐶', '🐰', '🐹', '🦜', '🐢', '🐈', '🐕', '🦮', '🌿', '🍖', '🎾', '🛁', '☀️'];
    var html = modalShell('🐾 分享养宠日常',
      '<form data-form="post">' +
        '<div class="field"><label>这一刻想说什么？</label>' +
        '<textarea class="input" name="text" placeholder="分享' + (pet ? esc(pet.name) : '宝贝') + '的可爱瞬间…" required></textarea></div>' +
        '<div class="field"><label>配个表情封面</label><div class="emoji-pick" id="postEmoji">' +
          mediaEmojis.map(function (e, i) { return '<button type="button" class="ep ' + (i === 0 ? 'sel' : '') + '" data-emoji="' + e + '">' + e + '</button>'; }).join('') +
        '</div></div>' +
      '</form>',
      '<button class="btn btn-ghost" data-action="closeModal">取消</button><button class="btn btn-primary" data-submit="post">发布</button>');
    setTimeout(function () {
      var emoji = mediaEmojis[0];
      $('#postEmoji').addEventListener('click', function (e) {
        var btn = e.target.closest('[data-emoji]');
        if (!btn) return;
        emoji = btn.getAttribute('data-emoji');
        $$('#postEmoji .ep').forEach(function (x) { x.classList.toggle('sel', x === btn); });
      });
      $('[data-submit="post"]').addEventListener('click', function () {
        var form = $('.modal [data-form="post"]');
        var text = form.text.value.trim();
        if (!text) { toast('写点内容再发布吧～'); return; }
        data.posts.push({ id: uid(), authorName: data.user.name, avatar: pet ? pet.avatar : '🐾', tone: pet ? pet.tone : 0,
          city: data.user.city, time: Date.now(), text: text, media: emoji, mediaTone: Math.floor(Math.random() * TONES.length),
          likes: 0, liked: false, comments: [] });
        save(); closeModal(); render(); toast('发布成功 🎉');
      });
    }, 30);
    return html;
  }

  function cityModal() {
    var html = modalShell('📍 切换城市',
      '<form data-form="city"><div class="field"><label>选择你所在的城市（用于同城匹配）</label>' +
      '<div class="seg" style="gap:10px">' +
        CITIES.map(function (c) { return '<button type="button" class="chip ' + (c === data.user.city ? 'chip-active' : '') + '" data-city="' + c + '">' + c + '</button>'; }).join('') +
      '</div></div></form>',
      '<button class="btn btn-primary btn-block" data-action="closeModal">完成</button>');
    setTimeout(function () {
      $$('.modal [data-city]').forEach(function (b) {
        b.addEventListener('click', function () {
          data.user.city = b.getAttribute('data-city');
          save(); render();
          $$('.modal [data-city]').forEach(function (x) { x.classList.toggle('chip-active', x === b); });
        });
      });
    }, 30);
    return html;
  }

  /* ----------------------------------------------------------
     全局事件（委托）
  ---------------------------------------------------------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action], [data-nav-go]');

    // 导航跳转（data-nav-go）
    if (el && el.getAttribute('data-nav-go')) {
      location.hash = el.getAttribute('data-nav-go');
      return;
    }
    if (!el || !el.getAttribute('data-action')) return;

    var action = el.getAttribute('data-action');
    var id = el.getAttribute('data-id');

    switch (action) {
      case 'addPet': openModal(addPetModal()); break;
      case 'addWeight': if (activePet()) openModal(weightModal()); else toast('请先创建宠物档案'); break;
      case 'addVaccine': if (activePet()) openModal(vaccineModal()); else toast('请先创建宠物档案'); break;
      case 'addDeworm': if (activePet()) openModal(dewormModal()); else toast('请先创建宠物档案'); break;
      case 'addPost': if (activePet()) openModal(postModal()); else toast('请先创建宠物档案'); break;
      case 'setCity': openModal(cityModal()); break;
      case 'closeModal': closeModal(); break;

      case 'delRecord':
        var type = el.getAttribute('data-type');
        data.records[type] = data.records[type].filter(function (r) { return r.id !== id; });
        save(); render(); toast('已删除记录');
        break;

      case 'switchPet':
        data.activePetId = id; save(); render();
        break;

      case 'friendFilter':
        currentSpeciesFilter = id; render();
        break;

      case 'follow':
        var i = data.follows.indexOf(id);
        if (i >= 0) { data.follows.splice(i, 1); toast('已取消关注'); }
        else { data.follows.push(id); toast('关注成功，去看看 TA 的动态吧 🐾'); }
        save(); render();
        break;

      case 'sayHi':
        var m = COMMUNITY.filter(function (x) { return x.id === id; })[0];
        toast('已向 ' + (m ? m.name : 'TA') + ' 打了个招呼 👋');
        break;

      case 'like':
        var p = data.posts.filter(function (x) { return x.id === id; })[0];
        if (p) { p.liked = !p.liked; p.likes += p.liked ? 1 : -1; if (p.likes < 0) p.likes = 0; save(); render(); }
        break;

      case 'share':
        toast('链接已复制，去分享给铲屎官朋友吧 🔗');
        break;

      case 'focusComment':
        var inp = $('.comment-input[data-id="' + id + '"]');
        if (inp) inp.focus();
        break;
    }
  });

  // 评论提交（回车）
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var inp = e.target.closest('.comment-input');
    if (!inp) return;
    var id = inp.getAttribute('data-id');
    var text = inp.value.trim();
    if (!text) return;
    var p = data.posts.filter(function (x) { return x.id === id; })[0];
    if (p) { p.comments.push({ name: data.user.name, text: text }); save(); render(); }
  });

  // 顶部「发动态」按钮
  $('#addPostTopBtn').addEventListener('click', function () {
    if (activePet()) openModal(postModal()); else toast('请先创建宠物档案');
  });
  $('#cityBtn').addEventListener('click', function () { openModal(cityModal()); });

  // 路由
  window.addEventListener('hashchange', render);

  /* ----------------------------------------------------------
     启动
  ---------------------------------------------------------- */
  if (!data.user.onboarded || !data.pets.length) {
    // 首次进入弹出建档引导
    render();
    openModal(addPetModal());
  } else {
    render();
  }
})();
