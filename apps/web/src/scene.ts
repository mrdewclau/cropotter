import * as THREE from "three";
export type SceneController = {
  dispose: () => void;
  setPaused: (paused: boolean) => void;
};
export async function mountScene(
  host: HTMLElement,
  onPhase: (phase: number) => void,
  onUnavailable: () => void,
): Promise<SceneController> {
  await document.fonts.ready;
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "three-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 40);
  camera.position.z = 10;
  const assembly = new THREE.Group();
  assembly.rotation.set(-0.025, -0.06, -0.025);
  scene.add(assembly);
  const textures: THREE.Texture[] = [];
  function texture(
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D) => void,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    draw(canvas.getContext("2d")!);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    textures.push(map);
    return map;
  }
  function plane(
    width: number,
    height: number,
    color: number,
    z: number,
    map?: THREE.Texture,
  ) {
    const material = new THREE.MeshBasicMaterial({
      color,
      map,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      material,
    );
    mesh.position.z = z;
    assembly.add(mesh);
    return mesh;
  }
  const pageTexture = texture(612, 792, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 612, 792);
    ctx.fillStyle = "#243a79";
    ctx.font = 'bold 20px "DM Sans"';
    ctx.fillText("YOUR SHIPPING-LABEL PDF", 42, 55);
    ctx.fillStyle = "#b7bfce";
    ctx.fillRect(42, 78, 528, 2);
    for (let row = 0; row < 3; row++)
      ctx.fillRect(42, 687 + row * 16, row === 2 ? 260 : 410, 5);
    ctx.font = '14px "IBM Plex Mono"';
    ctx.fillText("FULL PAGE · EXTRA SPACE", 42, 761);
  });
  const labelTexture = texture(512, 768, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 768);
    ctx.strokeStyle = "#26344e";
    ctx.lineWidth = 3;
    ctx.strokeRect(18, 18, 476, 732);
    ctx.fillStyle = "#243a79";
    ctx.fillRect(18, 18, 476, 85);
    ctx.fillStyle = "#ffffff";
    ctx.font = 'bold 28px "DM Sans"';
    ctx.fillText("SHIPPING LABEL", 43, 72);
    ctx.fillStyle = "#6a7180";
    ctx.font = '18px "IBM Plex Mono"';
    ctx.fillText("SAMPLE · NOT FOR SHIPPING", 43, 142);
    ctx.fillStyle = "#19243c";
    ctx.font = 'bold 23px "DM Sans"';
    ctx.fillText("SHIP TO", 43, 209);
    ctx.font = 'bold 39px "DM Sans"';
    ctx.fillText("J. EXAMPLE", 43, 263);
    ctx.font = '26px "DM Sans"';
    ctx.fillText("123 SAMPLE STREET", 43, 313);
    ctx.fillText("ANYTOWN, ST 00000", 43, 352);
    ctx.fillRect(43, 390, 426, 2);
    let x = 46;
    for (let i = 0; x < 463; i++) {
      const w = [3, 6, 2, 4, 2, 7, 3][i % 7];
      ctx.fillRect(x, 440, w, 140);
      x += w + [3, 2, 4][i % 3];
    }
    ctx.font = '22px "IBM Plex Mono"';
    ctx.fillText("SAMPLE 1234 5678 90", 61, 622);
    ctx.fillRect(43, 660, 426, 2);
    ctx.font = 'bold 25px "DM Sans"';
    ctx.fillText("4 × 6 IN", 43, 708);
  });
  const shadow = plane(3.5, 4.5, 0x071126, -0.04);
  shadow.position.set(0.08, -0.09, -0.04);
  shadow.material.opacity = 0.28;
  const page = plane(3.4, 4.4, 0xffffff, 0, pageTexture);
  const label = plane(1.55, 2.325, 0xffffff, 0.04, labelTexture);
  const crop = new THREE.Group();
  crop.position.z = 0.08;
  assembly.add(crop);
  const orange = new THREE.MeshBasicMaterial({
    color: 0xfa8a52,
    transparent: true,
    depthWrite: false,
  });
  for (const x of [-1, 1])
    for (const y of [-1, 1]) {
      const horizontal = new THREE.Mesh(
        new THREE.PlaneGeometry(0.32, 0.035),
        orange,
      );
      horizontal.position.set(x * (0.81 - 0.14), y * 1.2, 0);
      crop.add(horizontal);
      const vertical = new THREE.Mesh(
        new THREE.PlaneGeometry(0.035, 0.32),
        orange,
      );
      vertical.position.set(x * 0.81, y * (1.2 - 0.14), 0);
      crop.add(vertical);
    }
  const scan = plane(1.65, 0.025, 0xfa8a52, 0.1);
  let raf = 0,
    disposed = false,
    visible = true,
    paused = false,
    available = true,
    elapsed = 0,
    last = 0,
    lastDraw = 0,
    phase = 0;
  const smooth = (x: number) => {
    const t = THREE.MathUtils.clamp(x, 0, 1);
    return t * t * (3 - 2 * t);
  };
  function draw() {
    const time = elapsed % 10000;
    const nextPhase = time < 1800 ? 1 : time < 4500 ? 2 : 3;
    if (nextPhase !== phase) {
      phase = nextPhase;
      onPhase(phase);
    }
    const fit = smooth((time - 1800) / 1200);
    const lift = smooth((time - 2900) / 1600);
    const fade = smooth(time / 350) * (1 - smooth((time - 9200) / 800));
    page.material.opacity = (1 - smooth((time - 2700) / 1300)) * fade;
    shadow.material.opacity = 0.3 * page.material.opacity;
    const scale = 1 + lift * 0.68;
    label.scale.setScalar(scale);
    label.material.opacity = fade;
    crop.scale.set(
      THREE.MathUtils.lerp(2.08, scale * 1.03, fit),
      THREE.MathUtils.lerp(1.8, scale * 1.03, fit),
      1,
    );
    orange.opacity =
      smooth((time - 1600) / 400) * (1 - smooth((time - 4400) / 500)) * fade;
    scan.material.opacity = (time >= 1800 && time < 3200 ? 0.9 : 0) * fade;
    scan.position.y = THREE.MathUtils.lerp(
      1.12,
      -1.12,
      THREE.MathUtils.clamp((time - 1800) / 1400, 0, 1),
    );
    renderer.render(scene, camera);
  }
  function frame(now: number) {
    raf = 0;
    if (disposed || !available || !visible || document.hidden || paused) {
      last = 0;
      return;
    }
    if (last) elapsed += Math.min(now - last, 80);
    last = now;
    if (now - lastDraw >= 32) {
      lastDraw = now;
      draw();
    }
    raf = requestAnimationFrame(frame);
  }
  function requestFrame() {
    if (
      !raf &&
      !disposed &&
      available &&
      visible &&
      !document.hidden &&
      !paused
    )
      raf = requestAnimationFrame(frame);
  }
  function resize() {
    if (!available || disposed) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const aspect = width / height,
      h = Math.max(5.15, 4.0 / aspect);
    camera.left = (-h * aspect) / 2;
    camera.right = (h * aspect) / 2;
    camera.top = h / 2;
    camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
    draw();
    requestFrame();
  }
  function visibility() {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    } else requestFrame();
  }
  function lost() {
    available = false;
    cancelAnimationFrame(raf);
    raf = 0;
    host.dataset.enhanced = "false";
    onPhase(3);
    onUnavailable();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    } else requestFrame();
  });
  io.observe(host);
  document.addEventListener("visibilitychange", visibility);
  renderer.domElement.addEventListener("webglcontextlost", lost);
  resize();
  host.dataset.enhanced = "true";
  return {
    setPaused(value) {
      paused = value;
      last = 0;
      if (paused) {
        cancelAnimationFrame(raf);
        raf = 0;
      } else requestFrame();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          geometries.add(object.geometry);
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((m) => materials.add(m));
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      host.dataset.enhanced = "false";
    },
  };
}
