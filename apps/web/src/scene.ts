import * as THREE from "three";
export async function mountScene(host: HTMLElement): Promise<() => void> {
  const image = new Image();
  image.src = "/brand/CropOtter-stamp-web.webp";
  await image.decode();
  await document.fonts.ready;
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute("aria-hidden", "true");
  renderer.domElement.className = "three-canvas";
  host.append(renderer.domElement);
  const scene = new THREE.Scene(),
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
  camera.position.set(0, 0.35, 11);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 2));
  const key = new THREE.DirectionalLight(0xffffff, 3.5);
  key.position.set(-3, 5, 8);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xd4dcec, 1.1);
  fill.position.set(4, -2, 3);
  scene.add(fill);
  const group = new THREE.Group();
  scene.add(group);
  group.rotation.set(-0.18, -0.2, -0.15);
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 960;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#FFFEFA";
  ctx.fillRect(0, 0, 640, 960);
  ctx.fillStyle = "#243A79";
  ctx.font = '20px "IBM Plex Mono", monospace';
  ctx.textAlign = "center";
  ctx.fillText("A PROPER LITTLE FIT", 320, 90);
  ctx.drawImage(image, 55, 218, 530, 393);
  ctx.fillRect(56, 160, 528, 3);
  ctx.fillRect(56, 685, 528, 3);
  for (let i = 0, x = 125; i < 44; i++) {
    const width = i % 3 === 0 ? 7 : 3;
    ctx.fillRect(x, 745, width, 75);
    x += width + 4;
  }
  ctx.font = '19px "IBM Plex Mono", monospace';
  ctx.fillText("FORMATTED / 4 × 6 IN", 320, 885);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const paperGeometry = new THREE.BoxGeometry(2.95, 4.425, 0.025);
  const papers: THREE.Mesh[] = [];
  for (let i = 2; i >= 0; i--) {
    const material = new THREE.MeshStandardMaterial({
      color: i === 0 ? 0xfffefa : 0xede5d6,
      roughness: 0.95,
    });
    const paper = new THREE.Mesh(paperGeometry, material);
    paper.position.set(i * 0.12, i * 0.055, -i * 0.085);
    paper.rotation.z = i * 0.045;
    group.add(paper);
    papers.push(paper);
  }
  const front = new THREE.Mesh(
    new THREE.PlaneGeometry(2.94, 4.415),
    new THREE.MeshBasicMaterial({ map: texture }),
  );
  front.position.z = 0.014;
  group.add(front);
  const tab = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.5, 0.06),
    new THREE.MeshStandardMaterial({ color: 0xd85c32, roughness: 0.8 }),
  );
  tab.position.set(1.5, -1.5, 0.08);
  tab.rotation.z = 0.13;
  group.add(tab);
  let raf = 0,
    visible = true,
    disposed = false;
  const target = { x: -0.18, y: -0.2 };
  function frame() {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, target.x, 0.12);
    group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, target.y, 0.12);
    renderer.render(scene, camera);
    if (
      Math.abs(group.rotation.x - target.x) +
        Math.abs(group.rotation.y - target.y) >
      0.0002
    )
      raf = requestAnimationFrame(frame);
  }
  function requestFrame() {
    if (!raf && !disposed && visible && !document.hidden)
      raf = requestAnimationFrame(frame);
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    requestFrame();
  }
  function pointer(e: PointerEvent) {
    if (e.pointerType === "touch") return;
    const r = host.getBoundingClientRect();
    target.y = -0.2 + ((e.clientX - r.left - r.width / 2) / r.width) * 0.24;
    target.x = -0.18 - ((e.clientY - r.top - r.height / 2) / r.height) * 0.16;
    requestFrame();
  }
  function leave() {
    target.x = -0.18;
    target.y = -0.2;
    requestFrame();
  }
  function visibility() {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else requestFrame();
  }
  function lost() {
    host.dataset.enhanced = "false";
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (!visible) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else requestFrame();
  });
  io.observe(host);
  host.addEventListener("pointermove", pointer, { passive: true });
  host.addEventListener("pointerleave", leave, { passive: true });
  document.addEventListener("visibilitychange", visibility);
  renderer.domElement.addEventListener("webglcontextlost", lost);
  resize();
  renderer.render(scene, camera);
  host.dataset.enhanced = "true";
  return () => {
    disposed = true;
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    host.removeEventListener("pointermove", pointer);
    host.removeEventListener("pointerleave", leave);
    document.removeEventListener("visibilitychange", visibility);
    renderer.domElement.removeEventListener("webglcontextlost", lost);
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((m) => m.dispose());
      }
    });
    texture.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    host.dataset.enhanced = "false";
  };
}
