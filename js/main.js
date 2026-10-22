(function () {
  'use strict';

  var html = document.documentElement;
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var temGsap = !!(window.gsap && window.ScrollTrigger);
  var $ = function (s, ctx) { return (ctx || document).querySelector(s); };
  var $$ = function (s, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(s)); };

  /* ---------- Sempre ativo: navegação, progresso, botão fixo, spotlight ---------- */

  var nav = $('.nav');
  var barra = $('.progresso span');
  var ultimoY = 0;

  function aoRolar() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    nav.classList.toggle('solida', y > 40);
    nav.classList.toggle('escondida', y > ultimoY && y > window.innerHeight * 0.8);
    if (barra) barra.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    ultimoY = y;
  }
  window.addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();

  var fixo = $('.fixo');
  if (fixo && 'IntersectionObserver' in window) {
    var estado = { hero: true, fecho: false };
    var atualizaFixo = function () { fixo.classList.toggle('fora', estado.hero || estado.fecho); };
    new IntersectionObserver(function (es) { estado.hero = es[0].isIntersecting; atualizaFixo(); }).observe($('.hero-acoes'));
    new IntersectionObserver(function (es) { estado.fecho = es[0].isIntersecting; atualizaFixo(); }).observe($('.fecho'));
  }

  $$('.spot').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- Sem animação: mostra tudo e encerra ---------- */

  if (reduz || !temGsap) {
    html.classList.add('no-anim');
    var introFallback = $('.intro');
    if (introFallback) introFallback.remove();
    return;
  }

  var gsap = window.gsap;
  var ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Scroll suave ---------- */

  var lenis = null;
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var alvo = id === '#topo' || id === '#' ? 0 : $(id);
      if (alvo === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(alvo, { duration: 1.4 });
      else if (alvo === 0) window.scrollTo({ top: 0, behavior: 'smooth' });
      else alvo.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* ---------- Abertura + entrada do hero ---------- */

  var intro = $('.intro');
  var jaViu = false;
  try { jaViu = sessionStorage.getItem('thais-intro') === '1'; sessionStorage.setItem('thais-intro', '1'); } catch (err) {}

  gsap.set('.hero-titulo .linha > span', { yPercent: 115 });
  gsap.set('[data-hero]', { y: 28, autoAlpha: 0 });
  gsap.set('.hero-ovo', { scale: 0.82, autoAlpha: 0 });
  gsap.set('.hero-halo', { scale: 0.6, autoAlpha: 0 });
  gsap.set('.chip', { y: 24, scale: 0.9, autoAlpha: 0 });
  gsap.set('.nav', { autoAlpha: 0, y: -20 });

  var tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

  if (intro && !jaViu) {
    intro.style.animation = 'none';
    if (lenis) lenis.stop();
    var cobre = Math.max(window.innerWidth / 96, window.innerHeight / 120) * 2.6;
    tl.from('.intro-ovo', { scale: 0.2, autoAlpha: 0, duration: 1 })
      .from('.intro-nome span', { yPercent: 110, duration: 0.9 }, '-=0.6')
      .to('.intro-nome span', { yPercent: -110, duration: 0.5, ease: 'power3.in' }, '+=0.3')
      .to('.intro-ovo', { scale: cobre, backgroundColor: '#F5F0F4', borderColor: '#F5F0F4', duration: 1.1, ease: 'power3.inOut' }, '-=0.15')
      .set(intro, { autoAlpha: 0 })
      .call(function () { intro.remove(); if (lenis) lenis.start(); });
  } else if (intro) {
    intro.remove();
  }

  tl.addLabel('hero', intro && !jaViu ? '-=0.35' : 0)
    .to('.nav', { autoAlpha: 1, y: 0, duration: 1 }, 'hero')
    .to('.hero-titulo .linha > span', { yPercent: 0, duration: 1.3, stagger: 0.09 }, 'hero')
    .to('.hero-halo', { scale: 1, autoAlpha: 1, duration: 1.8 }, 'hero+=0.1')
    .to('.hero-ovo', { scale: 1, autoAlpha: 1, duration: 1.6 }, 'hero+=0.15')
    .to('[data-hero]', { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.1 }, 'hero+=0.35')
    .to('.chip', { y: 0, scale: 1, autoAlpha: 1, duration: 1, stagger: 0.14, ease: 'back.out(1.7)' }, 'hero+=0.8');

  /* Parallax do hero com o mouse */
  var hero = $('.hero');
  if (fino) {
    var camadas = $$('[data-prof]').map(function (el) {
      return {
        p: parseFloat(el.getAttribute('data-prof')),
        x: gsap.quickTo(el, 'x', { duration: 1, ease: 'power3' }),
        y: gsap.quickTo(el, 'y', { duration: 1, ease: 'power3' })
      };
    });
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      var nx = (e.clientX - r.left - r.width / 2) / r.width;
      var ny = (e.clientY - r.top - r.height / 2) / r.height;
      camadas.forEach(function (c) { c.x(nx * c.p * 28); c.y(ny * c.p * 28); });
    });
    hero.addEventListener('mouseleave', function () {
      camadas.forEach(function (c) { c.x(0); c.y(0); });
    });
  }

  /* Hero sai de cena devagar */
  gsap.to('.hero-grid', { y: -90, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-ovo img', { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ---------- Manifesto: palavras acendem ---------- */

  var manifesto = $('[data-palavras]');
  if (manifesto) {
    manifesto.innerHTML = manifesto.textContent.trim().split(/\s+/).map(function (w) {
      return '<span class="palavra">' + w + '</span>';
    }).join(' ');
    gsap.fromTo('.manifesto .palavra', { opacity: 0.12 }, {
      opacity: 1, stagger: 0.08, ease: 'none',
      scrollTrigger: { trigger: '.manifesto', start: 'top top', end: '+=140%', pin: '.manifesto-pin', scrub: true }
    });
  }

  /* ---------- Jornada ---------- */

  var mm = gsap.matchMedia();

  mm.add('(min-width: 861px)', function () {
    html.classList.add('horizontal');
    var trilha = $('.trilha');
    var etapas = $$('.etapa');
    var distancia = function () { return trilha.scrollWidth - window.innerWidth; };

    var tlJ = gsap.timeline({
      scrollTrigger: {
        trigger: '.jornada-pin', start: 'top top',
        end: function () { return '+=' + distancia() * 1.15; },
        pin: true, scrub: 1, invalidateOnRefresh: true,
        onUpdate: function (self) {
          etapas.forEach(function (el, i) { el.classList.toggle('ativa', self.progress >= i * 0.2 - 0.02); });
        }
      }
    });
    tlJ.to(trilha, { x: function () { return -distancia(); }, ease: 'none' }, 0)
       .fromTo('.fio-revela', { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'none' }, 0);
    etapas[0].classList.add('ativa');

    return function () {
      html.classList.remove('horizontal');
      etapas.forEach(function (el) { el.classList.remove('ativa'); });
    };
  });

  mm.add('(max-width: 860px)', function () {
    $$('.etapa').forEach(function (el) {
      gsap.from(el, { y: 40, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
  });

  /* ---------- Faixa: acelera com a velocidade do scroll ---------- */

  var loop = gsap.to('.faixa-trilho', { xPercent: -50, ease: 'none', duration: 32, repeat: -1 });
  var impulso = 0;
  ScrollTrigger.create({
    trigger: '.faixa', start: 'top bottom', end: 'bottom top',
    onUpdate: function (self) { impulso = Math.min(Math.abs(self.getVelocity()) / 220, 7); }
  });
  gsap.ticker.add(function () { impulso *= 0.93; loop.timeScale(1 + impulso); });

  /* ---------- Revelações ao entrar na tela ---------- */

  var revelaveis = '[data-revela], .lista-sinais li';
  gsap.set(revelaveis, { y: 48, autoAlpha: 0 });
  ScrollTrigger.batch(revelaveis, {
    start: 'top 90%', once: true,
    onEnter: function (lote) { gsap.to(lote, { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.08, ease: 'expo.out' }); }
  });

  /* ---------- Como funciona: linha que se preenche ---------- */

  gsap.to('.passos-linha span', { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.passos', start: 'top 60%', end: 'bottom 60%', scrub: true } });
  $$('.passo').forEach(function (p) {
    ScrollTrigger.create({
      trigger: p, start: 'top 62%',
      onEnter: function () { p.classList.add('ativo'); },
      onLeaveBack: function () { p.classList.remove('ativo'); }
    });
  });

  /* ---------- Sobre: foto revelada, parallax e tilt ---------- */

  gsap.fromTo('.sobre-foto-mascara',
    { clipPath: 'inset(100% 0% 0% 0%)' },
    { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: '.sobre', start: 'top 70%', once: true } });
  gsap.fromTo('.sobre-foto img', { scale: 1.3 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.sobre', start: 'top bottom', end: 'bottom top', scrub: true } });

  if (fino) {
    var foto = $('.sobre-foto');
    gsap.set(foto, { transformPerspective: 1000 });
    var rx = gsap.quickTo(foto, 'rotationX', { duration: 0.8, ease: 'power3' });
    var ry = gsap.quickTo(foto, 'rotationY', { duration: 0.8, ease: 'power3' });
    foto.addEventListener('mousemove', function (e) {
      var r = foto.getBoundingClientRect();
      rx(-((e.clientY - r.top) / r.height - 0.5) * 10);
      ry(((e.clientX - r.left) / r.width - 0.5) * 10);
    });
    foto.addEventListener('mouseleave', function () { rx(0); ry(0); });
  }

  /* ---------- Depoimentos: cartas empilhadas ---------- */

  var cartas = $$('.carta');
  cartas.forEach(function (c, i) {
    if (i === cartas.length - 1) return;
    gsap.fromTo(c, { scale: 1, filter: 'brightness(1)' }, {
      scale: 0.92, filter: 'brightness(0.78)', ease: 'none',
      scrollTrigger: { trigger: cartas[i + 1], start: 'top bottom', end: 'top 20%', scrub: true }
    });
  });

  var nota = $('[data-conta]');
  if (nota) {
    var alvoNota = parseFloat(nota.getAttribute('data-conta'));
    var contador = { v: 0 };
    nota.textContent = '0,0';
    gsap.to(contador, {
      v: alvoNota, duration: 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: nota, start: 'top 85%', once: true },
      onUpdate: function () { nota.textContent = contador.v.toFixed(1).replace('.', ','); }
    });
  }

  /* ---------- Fechamento ---------- */

  gsap.set('.fecho-titulo .linha > span', { yPercent: 115 });
  gsap.set('.bola', { scale: 0, rotation: -30 });
  gsap.timeline({ scrollTrigger: { trigger: '.fecho', start: 'top 65%', once: true } })
    .to('.fecho-titulo .linha > span', { yPercent: 0, duration: 1.3, stagger: 0.1, ease: 'expo.out' })
    .to('.bola', { scale: 1, rotation: 0, duration: 1.2, ease: 'elastic.out(1, 0.55)' }, 0.35);

  /* ---------- Botões magnéticos ---------- */

  if (fino) {
    $$('[data-magnetic]').forEach(function (el) {
      var forca = parseFloat(el.getAttribute('data-magnetic')) || 0.3;
      var mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3' });
      var my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3' });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * forca);
        my((e.clientY - (r.top + r.height / 2)) * forca);
      });
      el.addEventListener('mouseleave', function () { mx(0); my(0); });
    });
  }

  /* ---------- Cursor ---------- */

  if (fino) {
    html.classList.add('cursor-on');
    var cursor = $('.cursor');
    var ponto = $('.cursor-ponto');
    var anel = $('.cursor-anel');
    var rotulo = $('.cursor-anel em');
    var px = gsap.quickTo(ponto, 'x', { duration: 0.1 });
    var py = gsap.quickTo(ponto, 'y', { duration: 0.1 });
    var ax = gsap.quickTo(anel, 'x', { duration: 0.5, ease: 'power3' });
    var ay = gsap.quickTo(anel, 'y', { duration: 0.5, ease: 'power3' });
    gsap.set([ponto, anel], { x: -100, y: -100 });

    window.addEventListener('mousemove', function (e) {
      px(e.clientX); py(e.clientY); ax(e.clientX); ay(e.clientY);
    });
    document.addEventListener('mouseover', function (e) {
      var alvo = e.target.closest('[data-cursor]');
      var link = e.target.closest('a, button');
      cursor.classList.toggle('alvo', !!alvo);
      cursor.classList.toggle('link', !alvo && !!link);
      if (alvo) rotulo.textContent = alvo.getAttribute('data-cursor');
    });
    document.documentElement.addEventListener('mouseleave', function () { cursor.classList.add('oculto'); });
    document.documentElement.addEventListener('mouseenter', function () { cursor.classList.remove('oculto'); });
    var mapa = $('.mapa');
    if (mapa) {
      mapa.addEventListener('mouseenter', function () { cursor.classList.add('oculto'); });
      mapa.addEventListener('mouseleave', function () { cursor.classList.remove('oculto'); });
    }
  }

  /* ---------- Menu escuro sobre seções escuras ---------- */

  $$('.manifesto, .faixa, .sobre, .fecho').forEach(function (sec) {
    ScrollTrigger.create({ trigger: sec, start: 'top 40px', end: 'bottom 40px', toggleClass: { targets: nav, className: 'escura' } });
  });

  /* ---------- Recalcula depois de fontes e imagens ---------- */

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
