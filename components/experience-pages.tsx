"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentProps, CSSProperties } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Volume2, VolumeX } from "lucide-react";
import { ExperienceScene } from "@/components/experience-scene";
import { defaultContent, getSessionOverrides, navItems, resolveContent } from "@/lib/content";

type Theme = "luxury" | "space";

function useScrollDirector() {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    let lastY = window.scrollY;
    let targetY = lastY;
    const update = () => {
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(targetY / max, 0), 1);
      const velocity = targetY - lastY;
      root.style.setProperty("--scroll-y", `${targetY}px`);
      root.style.setProperty("--scroll-progress", String(progress));
      root.style.setProperty("--scroll-velocity", String(Math.max(-18, Math.min(18, velocity))));
      root.dataset.scrollDirection = velocity >= 0 ? "down" : "up";
      lastY += (targetY - lastY) * 0.16;
      frame = requestAnimationFrame(update);
    };
    const onScroll = () => { targetY = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });
    frame = requestAnimationFrame(update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
}

function useElementProgress() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const span = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / span));
      node.style.setProperty("--element-progress", progress.toFixed(4));
      if (node.classList.contains("space-journey")) node.style.setProperty("--journey-progress", progress.toFixed(4));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return ref;
}

function LazyVideo({ className, src, poster, label }: { className: string; src?: string; poster?: string; label?: string }) {
  const holder = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const node = holder.current;
    if (!node || !src) return;
    if (!("IntersectionObserver" in window)) { setActive(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setActive(true);
        node.play().catch(() => {});
      } else node.pause();
    }, { rootMargin: "320px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [src]);
  return <video ref={holder} className={className} autoPlay muted loop playsInline preload={active ? "metadata" : "none"} poster={poster} aria-label={label}>{active && src && <source src={src} />}</video>;
}

function CreativeLoader({ theme }: { theme: Theme }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setDone(true), 620);
    return () => window.clearTimeout(timer);
  }, []);
  if (done) return null;
  return <div className={`experience-loader experience-loader-${theme}`} aria-hidden="true">
    <div className="experience-loader-top"><span>{theme === "luxury" ? "ATELIER / 09" : "NOVA / 01"}</span><span>INITIALISING</span></div>
    <div className="experience-loader-center"><div className="experience-loader-mark"><i /><i /><i /></div><p>{theme === "luxury" ? "Entering the atelier" : "Establishing signal"}</p></div>
    <div className="experience-loader-bottom"><span>LOAD / 01</span><div><i /></div><span>LIVE</span></div>
  </div>;
}

function DeferredScene({ delayMs = 0, ...props }: ComponentProps<typeof ExperienceScene> & { delayMs?: number }) {
  const [ready, setReady] = useState(false);
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = holder.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) { setReady(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const timer = window.setTimeout(() => setReady(true), delayMs);
      (node as HTMLDivElement & { __timer?: number }).__timer = timer;
    }, { rootMargin: "360px 0px" });
    observer.observe(node);
    return () => {
      observer.disconnect();
      const timer = (node as HTMLDivElement & { __timer?: number }).__timer;
      if (timer) window.clearTimeout(timer);
    };
  }, [delayMs]);
  return <div ref={holder} className="scene-deferred">{ready ? <ExperienceScene {...props} /> : <div className="scene-deferred-placeholder" aria-hidden="true" />}</div>;
}

function SceneChapter({ index, eyebrow, title, copy }: { index: string; eyebrow: string; title: string; copy: string }) {
  return <article className="scene-chapter"><span>{index}</span><div><p className="eyebrow">{eyebrow}</p><h3>{title}</h3><p>{copy}</p></div></article>;
}

function splitLines(value: string) {
  return value.split(/\r?\n/).map((line, index) => <span key={`${line}-${index}`}>{line}{index < value.split(/\r?\n/).length - 1 && <br />}</span>);
}

function ExperienceCursor({ theme }: { theme: Theme }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = rootRef.current;
    if (!node || !window.matchMedia("(pointer:fine)").matches) return;
    let x = -80, y = -80, lastX = -80, lastY = -80;
    let angle = 0, speed = 0, fadeTimer = 0, raf = 0;
    const render = () => {
      raf = 0;
      node.style.setProperty("--cursor-x", `${x}px`);
      node.style.setProperty("--cursor-y", `${y}px`);
      node.style.setProperty("--trail-angle", `${angle}rad`);
      node.style.setProperty("--trail-length", `${Math.min(62, 26 + speed * 1.2)}px`);
      node.style.setProperty("--trail-opacity", `${Math.min(.58, .12 + speed / 110)}`);
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(render); };
    const move = (event: PointerEvent) => {
      x = event.clientX; y = event.clientY;
      const dx = x - lastX, dy = y - lastY;
      const distance = Math.hypot(dx, dy);
      if (distance > .25) angle = Math.atan2(dy, dx);
      speed = Math.min(150, distance);
      lastX = x; lastY = y;
      node.style.opacity = "1";
      if (fadeTimer) clearTimeout(fadeTimer);
      fadeTimer = window.setTimeout(() => { node.style.setProperty("--trail-opacity", ".12"); }, 100);
      schedule();
    };
    const leave = () => { fadeTimer = window.setTimeout(() => { node.style.opacity = "0"; }, 90); };
    const click = (event: PointerEvent) => {
      const count = theme === "luxury" ? 12 : 12;
      const prefix = theme === "luxury" ? "cursor-spark" : "cursor-space-spark";
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < count; i++) {
        const spark = document.createElement("i");
        const a = Math.random() * Math.PI * 2;
        const distance = 14 + Math.random() * 58;
        spark.className = prefix;
        spark.style.left = `${event.clientX}px`;
        spark.style.top = `${event.clientY}px`;
        spark.style.setProperty("--dx", `${Math.cos(a) * distance}px`);
        spark.style.setProperty("--dy", `${Math.sin(a) * distance}px`);
        spark.style.setProperty("--spark-rotate", `${(a * 180) / Math.PI + 90}deg`);
        spark.style.setProperty("--delay", `${i * 4}ms`);
        fragment.appendChild(spark);
      }
      document.body.appendChild(fragment);
      window.setTimeout(() => document.querySelectorAll(`.${prefix}`).forEach(el => el.remove()), 700);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerleave", leave, { passive: true });
    window.addEventListener("pointerdown", click, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (fadeTimer) clearTimeout(fadeTimer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerleave", leave);
      window.removeEventListener("pointerdown", click);
    };
  }, [theme]);
  return <div ref={rootRef} className={`experience-cursor cursor-${theme}`} aria-hidden="true"><i className="cursor-core" /><b className="cursor-trail" /><span className="cursor-tail" /></div>;
}

function RouteScreen({ theme, page, data }: { theme: Theme; page: string; data: any }) {
  const showEarth = theme === "space" && page === "Explore";
  const [earthReady, setEarthReady] = useState(false);
  const routes = theme === "luxury" ? navItems.luxury : navItems.space;
  const routeIndex = Math.max(0, routes.findIndex(([, label]) => label === page)) + 1;
  return <section className={`route-screen route-screen-${theme} ${showEarth ? "route-screen-earth" : ""}`}>
    <div className="route-screen-media"><img src={data.image} alt="" /></div>
    <div className="route-screen-shade" />
    <div className="route-screen-content">
      <p className="eyebrow">{data.tag}</p><h1>{data.title}</h1><p className="route-copy">{data.copy}</p>
      <div className="route-actions"><Link className={theme === "luxury" ? "lux-button" : "space-button"} href={theme === "luxury" ? "/luxury" : "/space"}>Back to overview <ArrowUpRight /></Link><span>0{routeIndex} / {page.toUpperCase()}</span></div>
      <div className="route-detail-strip">
        <div><span>{data.detailLabel || (theme === "luxury" ? "MATERIAL" : "VECTOR")}</span><b>{data.detailValue || (theme === "luxury" ? "Stone / brass / glass" : "Earth → orbit → deep field")}</b></div>
        <div><span>STATE</span><b>{data.state || "Available by request"}</b></div>
        <div><span>NODE</span><b>{data.tag}</b></div>
      </div>
    </div>
    <aside className="route-screen-aside">
      {showEarth ? <div className="route-screen-model"><div className="route-earth-poster" style={{ opacity: earthReady ? 0 : 1 }} aria-hidden="true" /><DeferredScene space model="earth" onReady={() => setEarthReady(true)} /><div className="earth-model-caption"><span>EARTH / SOL-03</span><b>LIVE ROTATION</b></div></div> : <div className="route-detail-card"><div className="route-detail-card-top"><span>0{routeIndex}</span><span>{data.tag}</span></div><div className="route-detail-line" /><p>{data.sideCopy || "A live archive node within the experience system."}</p><strong>{theme === "luxury" ? "PRIVATE / 2026" : `NODE / ${page.toUpperCase()}`}</strong></div>}
    </aside>
    <div className="route-screen-side"><span>SCROLL TO MOVE</span><i /></div>
  </section>;
}

function MediaInterlude({ theme, config }: { theme: Theme; config: any }) {
  return <section className={`media-interlude media-interlude-${theme}`}>
    {config.image && <img className="media-interlude-image" src={config.image} alt="" loading="lazy" decoding="async" />}
    <LazyVideo className="media-interlude-video" src={config.video} poster={config.image} label={`${theme} cinematic background film`} />
    <div className="media-interlude-shade" /><div className="media-interlude-copy"><p className="eyebrow">{config.label}</p><h2>{config.title}</h2><p>{config.copy}</p></div><span className="media-interlude-index">SCROLL / LIVE FILM</span>
  </section>;
}

function ImageRevealPanels({ theme, config }: { theme: Theme; config: any }) {
  const ref = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState(0);
  const [ready, setReady] = useState(false);
  const images = config.images || [];
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = node.getBoundingClientRect();
      const span = Math.max(1, rect.height - window.innerHeight);
      const progress = Math.max(0, Math.min(1, -rect.top / span));
      node.style.setProperty("--reveal", progress.toFixed(4));
      const label = node.querySelector<HTMLElement>("[data-reveal-value]");
      if (label) label.textContent = `${String(Math.round(progress * 100)).padStart(3, "0")}%`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll);
    return () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);
  useEffect(() => {
    if (!images.length) { setReady(true); return; }
    let active = true, count = 0;
    images.forEach((src: string) => { const img = new Image(); img.onload = img.onerror = () => { if (!active) return; count++; setLoaded(count); if (count >= images.length) setReady(true); }; img.src = src; });
    return () => { active = false; };
  }, [images.join("|")]);
  return <section ref={ref} className={`image-reveal-section ${theme}`} style={{ "--reveal": 0 } as CSSProperties}>
    <div className="reveal-stage"><div className={`reveal-wait ${ready ? "is-ready" : ""}`} aria-hidden={ready}><span>{theme === "luxury" ? "ATELIER / MATERIAL STUDY" : "NOVA / SYSTEMS IN MOTION"}</span><strong>{String(Math.min(loaded, images.length)).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</strong><i><b style={{ width: `${images.length ? (loaded / images.length) * 100 : 100}%` }} /></i><small>{ready ? "SEQUENCE READY / SCROLL TO RELEASE" : "LOADING VISUAL SEQUENCE"}</small></div>
      <div className="reveal-title"><p className="eyebrow">{config.label}</p><h2>{config.title}</h2><p>{config.copy}</p></div>
      <div className="reveal-panels">{images.map((src: string, i: number) => <div key={`${src}-${i}`} className="reveal-panel" style={{ "--i": i } as CSSProperties}><img className="reveal-panel-image" src={src} alt="" loading="lazy" decoding="async" /><span>0{i + 1}</span></div>)}</div>
      <div className="reveal-progress"><span /><em data-reveal-value>000%</em></div>
    </div>
  </section>;
}

function CollectionMotion({ config }: { config: any }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const node = sectionRef.current; if (!node) return;
    let frame = 0, target = 0, current = 0;
    const smooth = (v: number) => v * v * (3 - 2 * v);
    const tick = () => {
      current += (target - current) * .13;
      const a = smooth(Math.max(0, Math.min(1, (current - .27) / .12)));
      node.style.setProperty("--collection-progress", current.toFixed(4)); node.style.setProperty("--collection-bg0", (1 - a).toFixed(4)); node.style.setProperty("--collection-bg1", a.toFixed(4));
      const next = current < .34 ? 0 : current < .67 ? 1 : 2;
      setPhase(prev => prev === next ? prev : next);
      frame = Math.abs(target - current) > .001 ? requestAnimationFrame(tick) : 0;
    };
    const update = () => { const rect = node.getBoundingClientRect(); const span = Math.max(1, rect.height - window.innerHeight); target = Math.max(0, Math.min(1, -rect.top / span)); if (!frame) frame = requestAnimationFrame(tick); };
    window.addEventListener("scroll", update, { passive: true }); window.addEventListener("resize", update); update();
    return () => { if (frame) cancelAnimationFrame(frame); window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);
  const titles = config.phaseTitles?.length ? config.phaseTitles : [[config.eyebrow, "The archive keeps moving."], [config.eyebrow, "Gold remembers the hand."], [config.eyebrow, "The archive keeps moving."]];
  return <section ref={sectionRef} className="lux-collection-motion" style={{ "--collection-progress": 0 } as CSSProperties}>
    <div className="collection-sticky"><div className="collection-background" aria-hidden="true">{(config.backgroundImages || []).map((src: string, i: number) => <img key={src} className={`collection-background-layer collection-background-layer-${i}`} src={src} alt="" style={{ opacity: `var(--collection-bg${i}, ${i === 0 ? 1 : 0})` }} loading={i === 0 ? "eager" : "lazy"} />)}</div><div className="collection-background-shade" />
      <div className="collection-topline"><span>{config.topLeft}</span><span>{config.topRight}</span></div><div className="collection-scene-copy"><span>{config.sceneKicker}</span><strong key={phase}>{titles[phase]?.[0]}</strong><p key={`p-${phase}`}>{titles[phase]?.[1]}</p></div>
      <div className="collection-title"><p className="eyebrow">{config.eyebrow}</p><h2>{config.titleLine1}<br /><em>{config.titleEmphasis}</em></h2><p>{config.copy}</p></div>
      <div className="collection-track">{(config.items || []).map((item: any, i: number) => <article className="collection-card" key={`${item.title}-${i}`}><div className="collection-card-media"><img src={item.image} alt="" loading={i < 4 ? "eager" : "lazy"} decoding="async" /></div><div className="collection-card-copy"><span>0{String(i + 1).padStart(2, "0")} / {item.edition || "ATELIER EDITION"}</span><h3>{item.title}</h3><p>{item.label}</p></div></article>)}</div>
      <div className="collection-meter"><span /><b>0{phase + 1} / 03</b></div>
    </div>
  </section>;
}

function LuxuryFooter({ config }: { config: any }) {
  return <footer className="lux-footer"><div className="footer-marquee" aria-hidden="true">{config.marquee} {config.marquee} {config.marquee}</div><div className="footer-content"><div className="footer-lead"><p className="eyebrow">{config.eyebrow}</p><h3>{config.titleLead}<br /><em>{config.titleEmphasis}</em></h3><p>{splitLines(config.body)}</p></div><div className="footer-column"><h3>{config.visitTitle}</h3>{(config.visitLinks || []).map(([label, href]: string[]) => <Link key={href} href={href}>{label}</Link>)}</div><div className="footer-column"><h3>{config.exploreTitle}</h3>{(config.exploreLinks || []).map(([label, href]: string[]) => <Link key={href} href={href}>{label}</Link>)}</div></div><div className="footer-bottom"><p>{config.copyright}</p><span>{config.bottomNote} <b>↗</b></span></div></footer>;
}

function SpaceFooter({ config }: { config: any }) {
  return <footer className="space-footer"><div className="footer-marquee" aria-hidden="true">{config.marquee} {config.marquee} {config.marquee}</div><div className="footer-content"><div className="footer-lead"><p className="space-eyebrow">{config.eyebrow}</p><h3>{config.titleLead}<br /><em>{config.titleEmphasis}</em></h3><p>{splitLines(config.body)}</p></div><div className="footer-column"><h3>{config.transmitTitle}</h3>{(config.transmitLinks || []).map(([label, href]: string[]) => <Link key={href} href={href}>{label}</Link>)}</div><div className="footer-column"><h3>{config.contactTitle}</h3>{(config.contactLinks || []).map(([label, href]: string[]) => <Link key={href} href={href}>{label}</Link>)}</div></div><div className="footer-bottom"><p>{config.copyright}</p><span>{config.bottomNote} <b>↗</b></span></div></footer>;
}

function useExperienceContent(theme: Theme) {
  const defaults = defaultContent[theme];
  const [content, setContent] = useState<any>(defaults);
  useEffect(() => {
    let alive = true;
    getSessionOverrides<any>().then(overrides => { if (alive) setContent(resolveContent(defaults, overrides?.[theme] || {})); });
    return () => { alive = false; };
  }, [theme]);
  return content;
}

export function LuxuryShell({ page = "Overview" }: { page?: string }) {
  useScrollDirector();
  const content = useExperienceContent("luxury");
  const [muted, setMuted] = useState(true);
  if (page !== "Overview") return <main className="luxury-page"><CreativeLoader theme="luxury" /><ExperienceCursor theme="luxury" /><header className="lux-nav lux-nav-light"><Link className="wordmark" href="/luxury">{content.brand}</Link><nav className="lux-links">{(content.nav || navItems.luxury.slice(1).map(([label, href]) => [label, href])).map(([label, href]: string[]) => <Link key={href} href={href}>{label}</Link>)}</nav><span className="nav-index">{page.toUpperCase()} / 09</span></header><RouteScreen theme="luxury" page={page} data={content.pages?.[page]} /><LuxuryFooter config={content.footer} /></main>;
  return <main className="luxury-page" style={{ "--experience-grain": content.grain ?? .18, "--hero-height": `${content.heroHeight ?? 100}svh`, "--motion-speed": content.animationSpeed ?? 1 } as CSSProperties}>
    <CreativeLoader theme="luxury" /><ExperienceCursor theme="luxury" />
    <header className="lux-nav lux-nav-light"><Link className="wordmark" href="/luxury">{content.brand}</Link><nav className="lux-links">{(content.nav || navItems.luxury.slice(1).map(([label, href]) => [label, href])).map(([label, href]: string[]) => <Link key={href} href={href}>{label}</Link>)}</nav><span className="nav-index">{content.navLabel}</span></header>
    <section className="lux-hero cinematic-hero"><video className="hero-video" autoPlay muted={muted} loop playsInline preload="metadata" poster={content.heroImage}><source src={content.heroVideo} /><source src="/media/luxury-hero.mp4" /></video><div className="hero-shade" /><div className="hero-meta"><span>{content.meta?.line1}</span><span>{content.meta?.line2}</span></div><div className="lux-hero-copy"><p className="eyebrow">{content.meta?.eyebrow}</p><h1>{content.title}</h1><p>{content.subtitle}</p><Link href="/luxury/experience" className="lux-button">{content.cta}<ArrowDown /></Link></div><div className="scroll-note"><span>{content.meta?.scroll}</span><span className="line" /></div><button className="video-control" onClick={() => setMuted(v => !v)} aria-label={muted ? "Unmute film" : "Mute film"}>{muted ? <VolumeX /> : <Volume2 />}</button></section>
    <section className="lux-story editorial-story"><div className="section-kicker">{content.story.eyebrow}</div><div className="story-grid"><div><h2>{content.story.titleLead} <em>{content.story.titleEmphasis}</em> {content.story.titleTail}</h2><p className="lede">{content.story.lede}</p><p>{content.story.body}</p><Link className="text-link" href={content.story.linkHref}>{content.story.linkText}<ArrowUpRight /></Link></div><div className="story-orbit"><div className="orbit-ring" /><span>{content.story.orbitLabel}</span><strong>{content.story.orbitNumber}</strong></div></div><div className="pull-quote">{content.story.quote}</div></section>
    <section className="lux-object"><div className="object-copy"><p className="eyebrow">{content.object.eyebrow}</p><h2>{content.object.title}</h2><p>{content.object.description}</p><p className="spec-text">{splitLines(content.object.specification)}</p></div><div className="lion-stage"><ExperienceScene color={content.modelColor} model={content.object.model || "lion"} /></div></section>
    <CollectionMotion config={content.collection} /><MediaInterlude theme="luxury" config={content.interlude} /><ImageRevealPanels theme="luxury" config={content.reveal} />
    <section className="lux-chapters"><p className="eyebrow">{content.chapters.eyebrow}</p><div className="chapter-stack">{content.chapters.items.map((item: any) => <SceneChapter key={item.index} {...item} />)}</div></section>
    <section className="lux-stats lux-numbers"><div className="numbers-intro"><p className="eyebrow">{content.stats.eyebrow}</p><h2>{content.stats.titleLine1}<br /><em>{content.stats.titleLine2}</em></h2><p>{content.stats.copy}</p></div><div className="stats-grid">{content.stats.items.map(([number, label]: string[]) => <div key={label}><strong>{number}</strong><span>{label}</span></div>)}</div></section>
    <section className="lux-cta"><div><p className="eyebrow">{content.ctaSection.eyebrow}</p><h2>{content.ctaSection.titleLead} <em>{content.ctaSection.titleEmphasis}</em></h2><Link className="lux-button" href={content.ctaSection.buttonHref}>{content.ctaSection.button}<ArrowUpRight /></Link></div><div className="cta-scene"><DeferredScene delayMs={280} color={content.ctaSection.modelColor} model="lion" /></div></section>
    <LuxuryFooter config={content.footer} />
  </main>;
}

export function SpaceShell({ page = "Orbit" }: { page?: string }) {
  useScrollDirector();
  const content = useExperienceContent("space");
  const journeyRef = useElementProgress();
  const [planet, setPlanet] = useState(0);
  const [launch, setLaunch] = useState(false);
  if (page !== "Orbit") return <main className={`space-page ${page === "Orbit" ? "space-home" : "space-route"}`} style={{ "--space-earth-image": `url(${content.backgroundMedia || content.heroImage})`, "--space-route-image": `url(${content.pages?.Explore?.image || content.heroImage})` } as CSSProperties}><CreativeLoader theme="space" /><ExperienceCursor theme="space" /><header className="space-nav"><Link className="space-mark" href="/space"><span className="mark-orbit" /> {content.brand}</Link><nav>{(content.nav || navItems.space.slice(1).map(([href, label]) => [label, href])).map(([label, href]: string[]) => <Link key={href} href={href}>{label.toUpperCase()}</Link>)}</nav><button className="signal" onClick={() => setLaunch(v => !v)}>{launch ? content.hero.signalLaunch : content.hero.signalIdle}</button></header><RouteScreen theme="space" page={page} data={content.pages?.[page]} /><SpaceFooter config={content.footer} /></main>;
  const activePlanet = content.planets.items[planet] || content.planets.items[0];
  return <main className="space-page" style={{ "--space-accent": activePlanet?.color, "--space-earth-image": `url(${content.backgroundMedia || content.heroImage})`, "--space-route-image": `url(${content.pages?.Explore?.image || content.heroImage})` } as CSSProperties}>
    <CreativeLoader theme="space" /><ExperienceCursor theme="space" />
    <header className="space-nav"><Link className="space-mark" href="/space"><span className="mark-orbit" /> {content.brand}</Link><nav>{(content.nav || navItems.space.slice(1).map(([href, label]) => [label, href])).map(([label, href]: string[]) => <Link key={href} href={href}>{label.toUpperCase()}</Link>)}</nav><button className="signal" onClick={() => setLaunch(v => !v)}>{launch ? content.hero.signalLaunch : content.hero.signalIdle}</button></header>
    <section className="space-hero cinematic-hero"><video className="space-hero-video" autoPlay muted loop playsInline preload="metadata" poster={content.heroImage}><source src={content.heroVideo} /></video><div className="space-video-shade" /><DeferredScene delayMs={350} space color={activePlanet?.color} launch={launch} model="orbiter" /><div className="space-stars-copy"><p className="space-eyebrow">{content.hero.eyebrow}</p><h1>{content.title}</h1><p>{content.subtitle}</p><Link className="space-button" href="/space/missions">{content.cta}<ArrowDown /></Link></div><div className="coordinates">{splitLines(content.hero.coordinates)}</div><div className="flight-readout"><span>{content.hero.velocityLabel}</span><strong>{launch ? content.hero.launchedVelocity : content.hero.idleVelocity}</strong><span>{content.hero.cameraLink}</span></div></section>
    <MediaInterlude theme="space" config={content.interlude} />
    <section ref={journeyRef} className="space-journey space-depth"><div className="space-label">{content.journey.label}</div><h2>{content.journey.titleLead} <span>{content.journey.titleEmphasis}</span> {content.journey.titleTail}</h2><p>{content.journey.copy}</p><div className="journey-line">{content.journey.stops.map((stop: string, i: number) => <span key={stop}>{stop}</span>)}{content.journey.stops.slice(0, -1).map((stop: string) => <i key={`${stop}-line`} />)}<b className="journey-route-dot" aria-hidden="true" /></div><div className="space-chapters">{content.journey.chapters.map((item: any) => <SceneChapter key={item.index} {...item} />)}</div></section>
    <section className="planet-section space-command"><div className="planet-copy"><p className="space-eyebrow">{content.planets.eyebrow}</p><h2>{content.planets.titleLead} <span>{content.planets.titleEmphasis}</span></h2><p>{content.planets.copy}</p></div><div className="planet-grid">{content.planets.items.map((p: any, i: number) => <button key={p.name} className={`planet-card ${planet === i ? "active" : ""}`} onClick={() => setPlanet(i)}><div className="planet-dot" style={{ backgroundColor: p.color }} /><span className="planet-index">TARGET 0{i + 1}</span><h3>{p.name}</h3><p>{p.copy}</p><code>{p.code} / SIGNAL LOCKED</code></button>)}</div></section>
    <section className="mission-section"><div className="space-label">{content.missions.label}</div><h2>{content.missions.title}</h2><div className="mission-grid">{content.missions.items.map((mission: any, i: number) => <article className="mission-card" key={mission.id} onClick={() => setLaunch(true)}><span className="mission-year">MISSION 0{i + 1} / {mission.id}</span><h3>{mission.name}</h3><p>{mission.detail}</p><strong>{mission.status}</strong></article>)}</div></section>
    <section className="space-tech"><div className="space-label">{content.tech.label}</div><h2>{content.tech.title}</h2><div className="tech-grid">{content.tech.items.map((tech: any, i: number) => <article className="tech-card" key={`${tech.title}-${i}`}><span>0{i + 1}</span><h3>{tech.title}</h3><p>{tech.copy}</p><div className="tech-meter"><i style={{ width: `${tech.meter}%` }} /></div></article>)}</div></section>
    <ImageRevealPanels theme="space" config={content.reveal} />
    <section className="space-stats"><p className="space-eyebrow">{content.stats.eyebrow}</p><div className="stats-grid">{content.stats.items.map(([number, label]: string[]) => <div key={label}><strong>{number}</strong><span>{label}</span></div>)}</div></section>
    <section className="space-timeline"><div className="space-label">{content.timeline.label}</div><h2>{content.timeline.title}</h2><div className="timeline">{content.timeline.items.map(([year, copy]: string[], i: number) => <div key={`${year}-${copy}`} style={{ "--delay": `${i * 80}ms` } as CSSProperties}><span>{year}</span><p>{copy}</p></div>)}</div></section>
    <section className="space-cta"><div><DeferredScene delayMs={420} space model="orbiter" color={content.ctaSection.modelColor} launch={launch} /></div><div><p className="space-eyebrow">{content.ctaSection.eyebrow}</p><h2>{content.ctaSection.titleLead} <span>{content.ctaSection.titleEmphasis}</span></h2><button className="space-button" onClick={() => setLaunch(true)}>{content.ctaSection.button}<ArrowUpRight /></button></div></section>
    <SpaceFooter config={content.footer} />
  </main>;
}
