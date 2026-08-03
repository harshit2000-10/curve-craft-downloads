import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as THREE from "three";

export default function LandingPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const demoCanvasRef = useRef<HTMLCanvasElement>(null);
  const demoStageRef = useRef<HTMLDivElement>(null);
  const demoTabsRef = useRef<HTMLDivElement>(null);
  const demoTipRef = useRef<HTMLDivElement>(null);
  const demoTipLabel = useRef<HTMLDivElement>(null);
  const demoTipValue = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const demoRafRef = useRef<number>(0);
  const demoDataRef = useRef([42, 58, 51, 73, 64, 88, 79, 95]);
  const demoTypeRef = useRef("bars");
  const demoSetDataRef = useRef<((d: number[]) => void) | null>(null);
  const demoApplyTypeRef = useRef<((t: string) => void) | null>(null);
  const mouseRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const heroRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const demoRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const heroResizeRef = useRef<(() => void) | null>(null);
  const demoResizeRef = useRef<(() => void) | null>(null);
  const demoCleanupRef = useRef<(() => void) | null>(null);
  const sceneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("in"); }),
      { threshold: 0.12 }
    );
    setTimeout(() => {
      document.querySelectorAll(".lp-reveal").forEach((el) => io.observe(el));
      initTilt();
    }, 300);

    const onMove = (e: MouseEvent) => {
      mouseRef.current.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseRef.current.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMove);

    sceneTimerRef.current = setTimeout(() => {
      try { initHeroScene(); } catch(err) { console.error("hero scene failed", err); }
      try { initDemoScene(); } catch(err) { console.error("demo scene failed", err); }
    }, 300);

    return () => {
      if (sceneTimerRef.current) { clearTimeout(sceneTimerRef.current); sceneTimerRef.current = null; }
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(demoRafRef.current);
      if (heroResizeRef.current) { window.removeEventListener("resize", heroResizeRef.current); heroResizeRef.current = null; }
      if (demoResizeRef.current) { window.removeEventListener("resize", demoResizeRef.current); demoResizeRef.current = null; }
      if (demoCleanupRef.current) { demoCleanupRef.current(); demoCleanupRef.current = null; }
      if (heroRendererRef.current) { heroRendererRef.current.dispose(); heroRendererRef.current = null; }
      if (demoRendererRef.current) { demoRendererRef.current.dispose(); demoRendererRef.current = null; }
      io.disconnect();
    };
  }, []);

  function initTilt() {
    document.querySelectorAll("[data-tilt]").forEach((card) => {
      const el = card as HTMLElement;
      el.addEventListener("mousemove", (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `rotateY(${px * 9}deg) rotateX(${-py * 9}deg) translateY(-4px)`;
        el.style.boxShadow = "0 30px 70px rgba(124,108,248,0.28)";
        el.style.borderColor = "rgba(124,108,248,0.5)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "rotateY(0) rotateX(0) translateY(0)";
        el.style.boxShadow = "0 18px 50px rgba(0,0,0,0.34)";
        el.style.borderColor = "";
      });
    });
  }

  function initHeroScene() {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    let w = stage.clientWidth || 600;
    let h = stage.clientHeight || 560;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    heroRendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    camera.position.set(0, 6.4, 13);
    camera.lookAt(0, 0.6, 0);

    const group = new THREE.Group();
    scene.add(group);

    scene.add(new THREE.AmbientLight(0x5a4fff, 0.55));
    const l1 = new THREE.PointLight(0x9d7cff, 120, 60); l1.position.set(7, 12, 8); scene.add(l1);
    const l2 = new THREE.PointLight(0x5eead4, 60, 60); l2.position.set(-9, 5, -3); scene.add(l2);
    const l3 = new THREE.PointLight(0xff7cc9, 30, 50); l3.position.set(0, 3, 9); scene.add(l3);

    const N = 11, gap = 1.06;
    const geo = new THREE.BoxGeometry(0.62, 1, 0.62);
    const cPurple = new THREE.Color(0x7c6cf8);
    const cTeal = new THREE.Color(0x5eead4);
    const bars: { m: THREE.Mesh; px: number; pz: number; d: number }[] = [];

    for (let ix = 0; ix < N; ix++) {
      for (let iz = 0; iz < N; iz++) {
        const mat = new THREE.MeshStandardMaterial({ color: cPurple.clone(), emissive: cPurple.clone(), emissiveIntensity: 0.35, metalness: 0.5, roughness: 0.3 });
        const m = new THREE.Mesh(geo, mat);
        const px = (ix - (N - 1) / 2) * gap;
        const pz = (iz - (N - 1) / 2) * gap;
        m.position.set(px, 0, pz);
        group.add(m);
        bars.push({ m, px, pz, d: Math.sqrt(px * px + pz * pz) });
      }
    }

    const grid = new THREE.GridHelper(N * gap + 1, N + 1, 0x2a2550, 0x1a1738);
    grid.position.y = -0.02;
    group.add(grid);

    const clock = new THREE.Clock();
    const tmp = new THREE.Color();

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      mouseRef.current.x += (mouseRef.current.tx - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.ty - mouseRef.current.y) * 0.05;

      for (let i = 0; i < bars.length; i++) {
        const b = bars[i];
        const wave = Math.sin(b.px * 0.55 + t * 1.4) * Math.cos(b.pz * 0.55 + t * 1.1);
        const ripple = Math.sin(b.d * 0.9 - t * 2.0);
        let hgt = 0.4 + (wave * 0.5 + 0.5) * 3.2 + ripple * 0.6;
        if (hgt < 0.18) hgt = 0.18;
        b.m.scale.y = hgt;
        b.m.position.y = hgt / 2;
        const norm = Math.min(1, hgt / 4.2);
        tmp.copy(cPurple).lerp(cTeal, norm);
        (b.m.material as THREE.MeshStandardMaterial).color.copy(tmp);
        (b.m.material as THREE.MeshStandardMaterial).emissive.copy(tmp);
        (b.m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.25 + norm * 0.6;
      }

      group.rotation.y = t * 0.12 + mouseRef.current.x * 0.5;
      group.rotation.x = -0.05 + mouseRef.current.y * 0.18;
      camera.position.x = mouseRef.current.x * 1.6;
      camera.position.y = 6.4 - mouseRef.current.y * 1.2;
      camera.lookAt(0, 0.6, 0);
      renderer.render(scene, camera);
    };
    animate();

    heroResizeRef.current = () => {
      w = stage.clientWidth; h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", heroResizeRef.current);
  }

  function initDemoScene() {
    const canvas = demoCanvasRef.current;
    const stage = demoStageRef.current;
    if (!canvas || !stage) return;
    let w = stage.clientWidth, h = stage.clientHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    demoRendererRef.current = renderer;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
    camera.position.set(0, 4.6, 11);
    camera.lookAt(0, 1.4, 0);

    const group = new THREE.Group();
    scene.add(group);

    scene.add(new THREE.AmbientLight(0x6a5fff, 0.7));
    const l1 = new THREE.PointLight(0x9d7cff, 90, 60); l1.position.set(5, 9, 7); scene.add(l1);
    const l2 = new THREE.PointLight(0x5eead4, 50, 60); l2.position.set(-7, 5, 3); scene.add(l2);

    const data = demoDataRef.current;
    const n = data.length;
    const gap = 1.18, maxV = 100, maxH = 4.4;
    const cLow = new THREE.Color(0x7c6cf8);
    const cHigh = new THREE.Color(0x5eead4);
    const xFor = (i: number) => (i - (n - 1) / 2) * gap;
    const hFor = (v: number) => Math.max(0.12, (v / maxV) * maxH);

    const grid = new THREE.GridHelper(n * gap + 1.4, n + 2, 0x2a2550, 0x18152e);
    grid.position.y = 0;
    group.add(grid);

    const barGeo = new THREE.BoxGeometry(0.66, 1, 0.66);
    const sphGeo = new THREE.SphereGeometry(0.34, 24, 24);
    const bars: THREE.Mesh[] = [];
    const spheres: THREE.Mesh[] = [];
    const tmp = new THREE.Color();

    for (let i = 0; i < n; i++) {
      const norm = data[i] / maxV;
      tmp.copy(cLow).lerp(cHigh, norm);
      const barMat = new THREE.MeshStandardMaterial({ color: tmp.clone(), emissive: tmp.clone(), emissiveIntensity: 0.3, metalness: 0.45, roughness: 0.3 });
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.position.x = xFor(i);
      bar.userData.i = i;
      group.add(bar);
      bars.push(bar);

      const sphMat = new THREE.MeshStandardMaterial({ color: cHigh.clone(), emissive: cHigh.clone(), emissiveIntensity: 0.55, metalness: 0.3, roughness: 0.25 });
      const sph = new THREE.Mesh(sphGeo, sphMat);
      sph.position.x = xFor(i);
      sph.userData.i = i;
      sph.visible = false;
      group.add(sph);
      spheres.push(sph);
    }

    const lineMat = new THREE.LineBasicMaterial({ color: 0x9d7cff, transparent: true, opacity: 0.9 });
    const linePts = bars.map((_, i) => new THREE.Vector3(xFor(i), hFor(data[i]), 0));
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePts);
    const ribbon = new THREE.Line(lineGeo, lineMat);
    ribbon.visible = false;
    group.add(ribbon);

    const target = data.map(hFor);
    const current = data.map(() => 0.12);

    demoSetDataRef.current = (newData: number[]) => {
      for (let i = 0; i < n; i++) {
        target[i] = hFor(newData[i]);
        const norm = newData[i] / maxV;
        tmp.copy(cLow).lerp(cHigh, norm);
        (bars[i].material as THREE.MeshStandardMaterial).color.copy(tmp);
        (bars[i].material as THREE.MeshStandardMaterial).emissive.copy(tmp);
      }
    };

    demoApplyTypeRef.current = (t: string) => {
      bars.forEach((b) => {
        b.visible = t === "bars" || t === "line";
        (b.material as THREE.MeshStandardMaterial).opacity = t === "line" ? 0.55 : 1;
        (b.material as THREE.MeshStandardMaterial).transparent = t === "line";
      });
      spheres.forEach((s) => { s.visible = t === "points"; });
      ribbon.visible = t === "line";
    };

    let dragging = false, lastX = 0, lastY = 0;
    let rotY = -0.5, rotX = 0.12, velY = 0;
    const onDown = (e: PointerEvent) => { dragging = true; lastX = e.clientX; lastY = e.clientY; stage.style.cursor = "grabbing"; };
    const onUp = () => { dragging = false; stage.style.cursor = "grab"; };
    const onDrag = (e: PointerEvent) => {
      if (!dragging) return;
      rotY += (e.clientX - lastX) * 0.008; velY = (e.clientX - lastX) * 0.008;
      rotX = Math.max(-0.2, Math.min(0.7, rotX + (e.clientY - lastY) * 0.005));
      lastX = e.clientX; lastY = e.clientY;
    };
    const raycaster = new THREE.Raycaster();
    const ptr = new THREE.Vector2();
    const demoMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
    let hovered = -1, hoverPx = 0, hoverPy = 0, hovering = false;
    const tip = demoTipRef.current;
    const tipL = demoTipLabel.current;
    const tipV = demoTipValue.current;

    const onStageMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      hoverPx = e.clientX - r.left; hoverPy = e.clientY - r.top;
      ptr.x = (hoverPx / r.width) * 2 - 1;
      ptr.y = -(hoverPy / r.height) * 2 + 1;
      hovering = true;
    };
    const onStageLeave = () => { hovering = false; hovered = -1; if (tip) tip.style.opacity = "0"; };

    stage.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointermove", onDrag);
    stage.addEventListener("pointermove", onStageMove);
    stage.addEventListener("pointerleave", onStageLeave);

    // Store teardown so the effect's cleanup can remove these — the window-scoped
    // listeners in particular outlive the canvas and would otherwise leak.
    demoCleanupRef.current = () => {
      stage.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointermove", onDrag);
      stage.removeEventListener("pointermove", onStageMove);
      stage.removeEventListener("pointerleave", onStageLeave);
    };

    const clock = new THREE.Clock();
    const animate = () => {
      demoRafRef.current = requestAnimationFrame(animate);
      if (!dragging) { rotY += 0.0028 + velY; velY *= 0.92; }
      group.rotation.y = rotY;
      group.rotation.x = rotX;

      const linePos = ribbon.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < n; i++) {
        current[i] += (target[i] - current[i]) * 0.12;
        bars[i].scale.y = current[i];
        bars[i].position.y = current[i] / 2;
        spheres[i].position.y = current[i] + 0.1;
        linePos.setY(i, current[i]);
      }
      linePos.needsUpdate = true;

      if (hovering) {
        raycaster.setFromCamera(ptr, camera);
        const targets = demoTypeRef.current === "points" ? spheres.filter((o) => o.visible) : bars.filter((o) => o.visible);
        const hits = raycaster.intersectObjects(targets);
        if (hits.length) {
          const idx = hits[0].object.userData.i;
          hovered = idx;
          if (tip) {
            tip.style.opacity = "1";
            tip.style.left = hoverPx + "px";
            tip.style.top = hoverPy + "px";
            if (tipL) tipL.textContent = demoMonths[idx];
            if (tipV) tipV.textContent = "$" + demoDataRef.current[idx] + "k";
          }
        } else {
          hovered = -1;
          if (tip) tip.style.opacity = "0";
        }
      }
      for (let i = 0; i < n; i++) {
        const on = i === hovered;
        (bars[i].material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 0.95 : 0.3;
        (spheres[i].material as THREE.MeshStandardMaterial).emissiveIntensity = on ? 1.1 : 0.55;
      }
      renderer.render(scene, camera);
    };
    animate();
    demoApplyTypeRef.current("bars");

    demoResizeRef.current = () => {
      w = stage.clientWidth; h = stage.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", demoResizeRef.current);
  }

  function setType(t: string) {
    demoTypeRef.current = t;
    const tabs = demoTabsRef.current;
    if (tabs) {
      tabs.querySelectorAll("button").forEach((b) => {
        const active = b.getAttribute("data-type") === t;
        b.style.background = active ? "linear-gradient(135deg,#7c5cff,#9d7cff)" : "transparent";
        b.style.color = active ? "#07070d" : "#b9b8d0";
      });
    }
    demoApplyTypeRef.current?.(t);
  }

  function shuffleData() {
    demoDataRef.current = demoDataRef.current.map(() => 30 + Math.round(Math.random() * 70));
    demoSetDataRef.current?.(demoDataRef.current);
  }

  return (
    <div style={{ minHeight: "100vh", color: "#ECECF1", fontFamily: "'Plus Jakarta Sans',sans-serif", overflowX: "hidden", position: "relative", backgroundColor: "#06060d" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        html, body { background: #06060d; margin: 0; padding: 0; }
        ::selection { background: rgba(124,108,248,0.4); color: #fff; }
        @keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes pulseGlow { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
        .lp-reveal { opacity: 0; transform: translateY(34px); transition: opacity 0.9s cubic-bezier(.16,1,.3,1), transform 0.9s cubic-bezier(.16,1,.3,1); }
        .lp-reveal.in { opacity: 1; transform: translateY(0); }
        .tiltcard { transition: transform 0.25s cubic-bezier(.16,1,.3,1), box-shadow 0.4s, border-color 0.4s; transform-style: preserve-3d; }

        :root { --lp-pad: 64px; }
        @media (max-width: 860px) {
          :root { --lp-pad: 20px; }
          .lp-nav { padding-left: 20px !important; padding-right: 20px !important; }
          .lp-nav-links a { display: none !important; }
          .lp-nav-links { gap: 14px !important; }
          .lp-hero { grid-template-columns: 1fr !important; min-height: auto !important; padding-top: 110px !important; gap: 44px !important; }
          .lp-hero-visual { height: 320px !important; }
          .lp-stats { flex-wrap: wrap !important; row-gap: 18px !important; }
          .lp-features-grid { grid-template-columns: 1fr !important; }
          .lp-features-grid > div { grid-column: auto !important; grid-row: auto !important; }
          .lp-how-grid { grid-template-columns: 1fr !important; gap: 44px !important; }
          .lp-how-line { display: none !important; }
          .lp-demo-grid { grid-template-columns: 1fr !important; }
          .lp-demo-card { padding: 22px !important; }
          .lp-footer { justify-content: center !important; text-align: center !important; }
        }
      `}</style>

      {/* bg glow */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0, background: "radial-gradient(900px 600px at 70% -5%, rgba(124,108,248,0.22), transparent 60%), radial-gradient(700px 500px at 10% 30%, rgba(94,234,212,0.10), transparent 55%)" }} />

      {/* NAV */}
      <nav className="lp-nav" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 44px", backdropFilter: "blur(14px)", background: "rgba(7,7,13,0.55)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "linear-gradient(135deg,#7c5cff,#9d7cff)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 22px rgba(124,108,248,0.55)", flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 17c3-1 4-9 7-9s4 7 7 4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /><circle cx="3" cy="17" r="1.6" fill="#fff" /><circle cx="17" cy="12" r="1.6" fill="#fff" /></svg>
          </div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>Curve&nbsp;Craft</span>
        </div>
        <div className="lp-nav-links" style={{ display: "flex", alignItems: "center", gap: 34, fontSize: 14.5, color: "#b9b8d0" }}>
          <a href="#features" style={{ color: "inherit", textDecoration: "none" }}>Features</a>
          <a href="#how" style={{ color: "inherit", textDecoration: "none" }}>How it works</a>
          <a href="#demo" style={{ color: "inherit", textDecoration: "none" }}>Demo</a>
          <button onClick={() => navigate("/app")} style={{ color: "#07070d", background: "linear-gradient(135deg,#7c5cff,#9d7cff)", padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14.5, fontFamily: "'Plus Jakarta Sans',sans-serif", boxShadow: "0 6px 20px rgba(124,108,248,0.35)", whiteSpace: "nowrap" }}>Open app</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="lp-hero" style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "grid", gridTemplateColumns: "1.05fr 1fr", alignItems: "center", gap: 30, padding: "140px var(--lp-pad) 60px" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "7px 14px", borderRadius: 100, border: "1px solid rgba(124,108,248,0.32)", background: "rgba(124,108,248,0.10)", fontSize: 13, color: "#c9c2ff", marginBottom: 26 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#5eead4", boxShadow: "0 0 10px #5eead4", animation: "pulseGlow 2s ease-in-out infinite", display: "inline-block" }} />
            Open-source · 100% in-browser · No data leaves your machine
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: "clamp(40px,5.2vw,72px)", lineHeight: 1.02, letterSpacing: "-0.03em", margin: "0 0 22px" }}>
            Turn any CSV into a<br /><span style={{ background: "linear-gradient(110deg,#7c5cff 10%,#9d7cff 45%,#5eead4 95%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>publication-ready graph</span>
          </h1>
          <p style={{ fontSize: 18.5, lineHeight: 1.6, color: "#a9a8c4", maxWidth: 520, margin: "0 0 36px" }}>
            Drop in a spreadsheet, get a beautiful, fully-customizable chart in seconds. Free, fast, and private — your data never touches a server.
          </p>
          <button onClick={() => navigate("/app")} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg,#7c5cff,#9d7cff)", color: "#07070d", fontWeight: 700, fontSize: 16, fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "15px 28px", borderRadius: 13, border: "none", cursor: "pointer", boxShadow: "0 10px 34px rgba(124,108,248,0.42)" }}>
            Craft a chart
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#07070d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="lp-stats" style={{ display: "flex", gap: 30, marginTop: 46 }}>
            <div><div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, color: "#fff" }}>12+</div><div style={{ fontSize: 13, color: "#8b8aa6" }}>chart types</div></div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
            <div><div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, color: "#fff" }}>0</div><div style={{ fontSize: 13, color: "#8b8aa6" }}>bytes uploaded</div></div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
            <div><div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 700, color: "#fff" }}>~2s</div><div style={{ fontSize: 13, color: "#8b8aa6" }}>CSV to chart</div></div>
          </div>
        </div>
        <div ref={stageRef} className="lp-hero-visual" style={{ position: "relative", height: 560, width: "100%" }}>
          <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
          <div style={{ position: "absolute", left: "8%", top: "12%", padding: "11px 15px", borderRadius: 13, background: "rgba(16,14,30,0.72)", border: "1px solid rgba(124,108,248,0.3)", backdropFilter: "blur(10px)", boxShadow: "0 12px 40px rgba(0,0,0,0.4)", animation: "floaty 6s ease-in-out infinite", pointerEvents: "none" }}>
            <div style={{ fontSize: 11, color: "#8b8aa6", marginBottom: 3 }}>Trend · Q4</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 18, fontWeight: 700, color: "#5eead4" }}>▲ 38.2%</div>
          </div>
          <div style={{ position: "absolute", right: "4%", bottom: "14%", padding: "11px 15px", borderRadius: 13, background: "rgba(16,14,30,0.72)", border: "1px solid rgba(94,234,212,0.28)", backdropFilter: "blur(10px)", boxShadow: "0 12px 40px rgba(0,0,0,0.4)", animation: "floaty 7s ease-in-out infinite 1s", pointerEvents: "none" }}>
            <div style={{ fontSize: 11, color: "#8b8aa6", marginBottom: 3 }}>Rendered locally</div>
            <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 600, color: "#fff" }}>no server ✓</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ position: "relative", zIndex: 1, padding: "90px var(--lp-pad) 40px", maxWidth: 1240, margin: "0 auto" }}>
        <div className="lp-reveal" style={{ textAlign: "center", marginBottom: 54 }}>
          <div style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7c5cff", fontWeight: 600, marginBottom: 14 }}>Why Curve Craft</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(30px,3.6vw,46px)", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>Everything you need, nothing you don't</h2>
        </div>
        <div className="lp-features-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22, perspective: 1200 }}>
          <div className="lp-reveal tiltcard" data-tilt="" style={{ gridRow: "span 2", padding: 30, borderRadius: 20, background: "linear-gradient(165deg,rgba(124,108,248,0.14),rgba(20,18,38,0.6))", border: "1px solid rgba(124,108,248,0.22)", boxShadow: "0 18px 50px rgba(0,0,0,0.34)" }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: "rgba(124,108,248,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M4 19V5m0 14h16M8 15l3-4 3 2 4-6" stroke="#9d7cff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 22, fontWeight: 700, margin: "0 0 12px" }}>12+ chart types</h3>
            <p style={{ fontSize: 15.5, lineHeight: 1.6, color: "#a9a8c4", margin: "0 0 22px" }}>Line, bar, scatter, area, stacked, donut and more — switch between them with a click and your data stays mapped.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {["Line", "Bar", "Scatter", "Area", "Donut"].map((t) => (
                <span key={t} style={{ fontSize: 12.5, padding: "6px 12px", borderRadius: 8, background: "rgba(255,255,255,0.06)", color: "#cfceea" }}>{t}</span>
              ))}
              <span style={{ fontSize: 12.5, padding: "6px 12px", borderRadius: 8, background: "rgba(94,234,212,0.12)", color: "#5eead4" }}>+7 more</span>
            </div>
          </div>
          <div className="lp-reveal tiltcard" data-tilt="" style={{ padding: 30, borderRadius: 20, background: "linear-gradient(165deg,rgba(94,234,212,0.12),rgba(20,18,38,0.6))", border: "1px solid rgba(94,234,212,0.2)", boxShadow: "0 18px 50px rgba(0,0,0,0.34)" }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: "rgba(94,234,212,0.16)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M12 2l8 4v5c0 5-3.4 8.5-8 11-4.6-2.5-8-6-8-11V6l8-4z" stroke="#5eead4" strokeWidth="2.1" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" stroke="#5eead4" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>Private by design</h3>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#a9a8c4", margin: 0 }}>Everything runs in your browser. No uploads, no accounts, no tracking — your spreadsheet never leaves the tab.</p>
          </div>
          <div className="lp-reveal tiltcard" data-tilt="" style={{ padding: 30, borderRadius: 20, background: "linear-gradient(165deg,rgba(255,124,201,0.10),rgba(20,18,38,0.6))", border: "1px solid rgba(255,124,201,0.18)", boxShadow: "0 18px 50px rgba(0,0,0,0.34)" }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: "rgba(255,124,201,0.14)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="#ff9dd6" strokeWidth="2.1" strokeLinejoin="round" /></svg>
            </div>
            <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>Instant rendering</h3>
            <p style={{ fontSize: 15, lineHeight: 1.6, color: "#a9a8c4", margin: 0 }}>Paste or drop a CSV and watch it become a chart in about two seconds. No loading spinners, no waiting.</p>
          </div>
          <div className="lp-reveal tiltcard" data-tilt="" style={{ gridColumn: "span 2", padding: 30, borderRadius: 20, background: "linear-gradient(110deg,rgba(124,108,248,0.12),rgba(20,18,38,0.6))", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 18px 50px rgba(0,0,0,0.34)", display: "flex", alignItems: "center", gap: 26 }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 20, fontWeight: 700, margin: "0 0 10px" }}>Export anywhere</h3>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "#a9a8c4", margin: 0 }}>Download as crisp SVG or high-resolution PNG, ready for papers, decks and dashboards.</p>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ padding: "14px 20px", borderRadius: 12, border: "1px solid rgba(124,108,248,0.3)", background: "rgba(124,108,248,0.08)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#c9c2ff" }}>SVG</div>
              <div style={{ padding: "14px 20px", borderRadius: 12, border: "1px solid rgba(94,234,212,0.3)", background: "rgba(94,234,212,0.08)", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#5eead4" }}>PNG</div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" style={{ position: "relative", zIndex: 1, padding: "80px var(--lp-pad)", maxWidth: 1240, margin: "0 auto" }}>
        <div className="lp-reveal" style={{ textAlign: "center", marginBottom: 58 }}>
          <div style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: "#5eead4", fontWeight: 600, marginBottom: 14 }}>Three steps</div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(30px,3.6vw,46px)", fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>From spreadsheet to chart</h2>
        </div>
        <div className="lp-how-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 24, position: "relative" }}>
          <div className="lp-how-line" style={{ position: "absolute", top: 36, left: "16%", right: "16%", height: 2, background: "linear-gradient(90deg,transparent,rgba(124,108,248,0.4),rgba(94,234,212,0.4),transparent)", zIndex: 0 }} />
          {[
            { num: "1", title: "Drop your CSV", desc: "Drag a file in or paste raw data. Columns are detected automatically.", bg: "linear-gradient(135deg,#7c5cff,#9d7cff)", shadow: "0 0 30px rgba(124,108,248,0.5)" },
            { num: "2", title: "Pick & tune", desc: "Choose a chart type, map axes, then tweak colors, labels and scale.", bg: "linear-gradient(135deg,#6f8bff,#5eead4)", shadow: "0 0 30px rgba(94,234,212,0.4)" },
            { num: "3", title: "Export & share", desc: "Download a publication-ready SVG or PNG and drop it anywhere.", bg: "linear-gradient(135deg,#5eead4,#a0ffd6)", shadow: "0 0 30px rgba(94,234,212,0.4)" },
          ].map(({ num, title, desc, bg, shadow }) => (
            <div key={num} className="lp-reveal" style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
              <div style={{ width: 72, height: 72, margin: "0 auto 22px", borderRadius: 20, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk',sans-serif", fontSize: 28, fontWeight: 700, color: "#07070d", boxShadow: shadow }}>{num}</div>
              <h3 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 21, fontWeight: 700, margin: "0 0 10px" }}>{title}</h3>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "#a9a8c4", margin: "0 auto", maxWidth: 300 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEMO */}
      <section id="demo" style={{ position: "relative", zIndex: 1, padding: "70px var(--lp-pad) 90px", maxWidth: 1240, margin: "0 auto" }}>
        <div className="lp-reveal lp-demo-card" style={{ borderRadius: 26, padding: 42, background: "linear-gradient(160deg,rgba(20,18,38,0.9),rgba(12,11,24,0.95))", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)", overflow: "hidden", position: "relative" }}>
          <div style={{ position: "absolute", top: "-40%", right: "-10%", width: 480, height: 480, borderRadius: "50%", background: "radial-gradient(circle,rgba(124,108,248,0.18),transparent 70%)", pointerEvents: "none" }} />
          <div className="lp-demo-grid" style={{ display: "grid", gridTemplateColumns: "0.85fr 1.15fr", gap: 40, alignItems: "center", position: "relative" }}>
            <div>
              <div style={{ fontSize: 13, letterSpacing: "0.18em", textTransform: "uppercase", color: "#7c5cff", fontWeight: 600, marginBottom: 14 }}>Live preview</div>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(26px,2.8vw,38px)", fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 16px" }}>Beautiful charts, zero setup</h2>
              <p style={{ fontSize: 16, lineHeight: 1.6, color: "#a9a8c4", margin: "0 0 28px" }}>This is the kind of crisp, customizable output you get straight out of the box — no design skills required.</p>
              <button onClick={() => navigate("/app")} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg,#7c5cff,#9d7cff)", color: "#07070d", fontWeight: 700, fontSize: 15.5, fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "14px 26px", borderRadius: 12, border: "none", cursor: "pointer", boxShadow: "0 10px 30px rgba(124,108,248,0.4)" }}>
                Try it with your data
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#07070d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
            <div style={{ background: "rgba(7,7,13,0.6)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 18, padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
                <div style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 600, fontSize: 15 }}>Monthly revenue</div>
                <div ref={demoTabsRef} style={{ display: "flex", gap: 5, padding: 4, borderRadius: 11, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {[{ t: "bars", label: "Bars" }, { t: "points", label: "Points" }, { t: "line", label: "Ribbon" }].map(({ t, label }) => (
                    <button key={t} data-type={t} onClick={() => setType(t)} style={{ border: "none", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, fontWeight: 600, padding: "6px 13px", borderRadius: 8, background: t === "bars" ? "linear-gradient(135deg,#7c5cff,#9d7cff)" : "transparent", color: t === "bars" ? "#07070d" : "#b9b8d0" }}>{label}</button>
                  ))}
                </div>
              </div>
              <div ref={demoStageRef} style={{ position: "relative", height: 320, width: "100%", cursor: "grab", borderRadius: 14, overflow: "hidden", background: "radial-gradient(120% 90% at 50% 0%, rgba(124,108,248,0.10), transparent 60%)" }}>
                <canvas ref={demoCanvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
                <div ref={demoTipRef} style={{ position: "absolute", pointerEvents: "none", opacity: 0, transform: "translate(-50%,-118%)", transition: "opacity 0.15s", padding: "7px 11px", borderRadius: 9, background: "rgba(10,9,20,0.92)", border: "1px solid rgba(124,108,248,0.4)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)", whiteSpace: "nowrap", zIndex: 3 }}>
                  <div ref={demoTipLabel} style={{ fontSize: 11, color: "#8b8aa6" }}>—</div>
                  <div ref={demoTipValue} style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 15, fontWeight: 700, color: "#5eead4" }}>—</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#7a7995", display: "flex", alignItems: "center", gap: 7 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1m0-12.8l-2.1 2.1M7.7 16.3l-2.1 2.1" stroke="#7a7995" strokeWidth="1.8" strokeLinecap="round" /></svg>
                  Drag to rotate · hover a bar
                </div>
                <button onClick={shuffleData} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid rgba(94,234,212,0.3)", background: "rgba(94,234,212,0.08)", color: "#5eead4", cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif", fontSize: 12.5, fontWeight: 600, padding: "7px 13px", borderRadius: 9 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 7h4l3 5m11 0h-4l-3-5m7 12h-4l-2-3M3 17h4l2-3" stroke="#5eead4" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /><path d="M17 4l3 3-3 3M17 14l3 3-3 3" stroke="#5eead4" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Shuffle data
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: "relative", zIndex: 1, padding: "30px var(--lp-pad) 0", maxWidth: 1240, margin: "0 auto" }}>
        <div className="lp-reveal" style={{ textAlign: "center", borderRadius: 26, padding: "64px 40px", background: "linear-gradient(135deg,rgba(124,108,248,0.18),rgba(94,234,212,0.10))", border: "1px solid rgba(124,108,248,0.25)", boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: "clamp(30px,4vw,52px)", fontWeight: 700, letterSpacing: "-0.025em", margin: "0 0 18px" }}>Turn any CSV into a<br />publication-ready graph</h2>
          <p style={{ fontSize: 17, color: "#c4c3dc", margin: "0 0 32px" }}>Free, open-source, and running entirely in your browser.</p>
          <button onClick={() => navigate("/app")} style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#fff", color: "#07070d", fontWeight: 700, fontSize: 17, fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "16px 34px", borderRadius: 14, border: "none", cursor: "pointer", boxShadow: "0 14px 40px rgba(124,108,248,0.4)" }}>
            Open Curve Craft
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#07070d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="lp-footer" style={{ position: "relative", zIndex: 1, padding: "50px var(--lp-pad)", maxWidth: 1240, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: 60, flexWrap: "wrap", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg,#7c5cff,#9d7cff)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M3 17c3-1 4-9 7-9s4 7 7 4" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" /></svg>
          </div>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 16 }}>Curve Craft</span>
        </div>
        <div style={{ fontSize: 13.5, color: "#7a7995" }}>Open-source · Runs locally · No data leaves your machine</div>
        <div style={{ display: "flex", gap: 22, fontSize: 14, color: "#a9a8c4" }}>
          <button onClick={() => navigate("/app")} style={{ color: "inherit", background: "none", border: "none", cursor: "pointer", fontSize: 14, fontFamily: "'Plus Jakarta Sans',sans-serif" }}>App</button>
          <a href="#features" style={{ color: "inherit", textDecoration: "none" }}>Features</a>
          <a href="#how" style={{ color: "inherit", textDecoration: "none" }}>How it works</a>
        </div>
      </footer>
    </div>
  );
}
