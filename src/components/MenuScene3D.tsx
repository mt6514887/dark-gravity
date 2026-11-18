import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createOmegaBossModel, createSentinelDroneModel } from '../game/models';
import { createProceduralTextures } from '../game/textures';

export const MenuScene3D: React.FC = () => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050912);
    scene.fog = new THREE.FogExp2(0x050912, 0.022);

    const camera = new THREE.PerspectiveCamera(
      52,
      (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight),
      0.1,
      150
    );
    camera.position.set(8, 5.5, 14);
    camera.lookAt(0, 3.2, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const textures = createProceduralTextures(renderer.capabilities.getMaxAnisotropy());

    // Lighting
    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.7);
    scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffedd5, 1.6);
    key.position.set(12, 18, 10);
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xef4444, 1.1);
    rim.position.set(-14, 10, -12);
    scene.add(rim);

    // Metallic deck floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 80),
      new THREE.MeshStandardMaterial({
        map: textures.stationFloor,
        roughness: 0.35,
        metalness: 0.75,
      })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Centerpiece Omega Warden + orbiting Drones + flying red diamond bolts
    const boss = createOmegaBossModel(textures);
    boss.group.position.set(3.2, 0, -2.5);
    boss.group.rotation.y = -0.45;
    scene.add(boss.group);

    const drone1 = createSentinelDroneModel(textures);
    drone1.group.position.set(-4.5, 1.2, 2.2);
    scene.add(drone1.group);

    const drone2 = createSentinelDroneModel(textures);
    drone2.group.position.set(-1.5, 2.4, -7.5);
    scene.add(drone2.group);

    // Diamond red energy projectiles streaking across frame
    const boltGeo = new THREE.OctahedronGeometry(0.18, 0);
    boltGeo.scale(0.65, 0.65, 2.6);
    const bolts: { mesh: THREE.Mesh; speed: number; offset: number }[] = [];
    for (let i = 0; i < 8; i++) {
      const m = new THREE.Mesh(
        boltGeo,
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0xef4444 : 0x38bdf8 })
      );
      m.position.set(-12 + i * 3, 2.4 + (i % 3) * 0.9, -4 + (i % 2) * 3);
      m.rotation.y = Math.PI / 2.2;
      scene.add(m);
      bolts.push({ mesh: m, speed: 12 + i * 1.4, offset: i * 1.7 });
    }

    // Starfield
    const starPos = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 90;
      starPos[i * 3 + 1] = 4 + Math.random() * 40;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 90 - 15;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    scene.add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xbae6fd, size: 0.25, transparent: true, opacity: 0.75 })
      )
    );

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;

    const handleResize = () => {
      if (disposed || !container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = Math.max(1, container.clientHeight || window.innerHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      elapsed += dt;

      camera.position.x = 7.5 + Math.sin(elapsed * 0.22) * 2.2;
      camera.position.y = 5.2 + Math.cos(elapsed * 0.18) * 0.6;
      camera.lookAt(0.5, 3.3, -2);

      boss.parts.spinners?.forEach((s) => (s.rotation.z += dt * 1.4));
      drone1.group.position.y = 1.2 + Math.sin(elapsed * 2.2) * 0.35;
      drone1.parts.spinners?.forEach((s) => (s.rotation.z += dt * 2.5));
      drone2.group.position.y = 2.4 + Math.cos(elapsed * 1.8) * 0.35;

      bolts.forEach((b) => {
        const t = ((elapsed * b.speed + b.offset) % 36) - 18;
        b.mesh.position.x = t;
      });

      renderer.render(scene, camera);

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      scene.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          const m = o as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      textures.dispose();
      renderer.dispose();
      container.innerHTML = '';
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 z-0 pointer-events-none" />;
};
