"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

type SceneModel = "lion" | "orbiter" | "earth" | "auto";

function ScrollCameraRig({
  space,
  model,
}: {
  space: boolean;
  model: SceneModel;
}) {
  const { camera, pointer } = useThree();
  const scrollRef = useRef(0);

  useEffect(() => {
    let max = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    const update = () => {
      scrollRef.current = Math.min(1, Math.max(0, window.scrollY / max));
    };
    const resize = () => {
      max = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      update();
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("load", resize, { once: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useFrame(() => {
    // Keep the sculpture / globe optically centered. Only the orbital spacecraft gets
    // the page-scroll camera choreography; the old global-scroll camera was making
    // the lion and Earth drift as the whole document moved.
    const scroll = model === "orbiter" ? scrollRef.current : 0;
    const parallax =
      model === "orbiter" ? (space ? 0.36 : 0.18) : space ? 0.12 : 0.08;
    const targetX =
      pointer.x * parallax + (model === "orbiter" ? scroll * 0.22 : 0);
    const targetY =
      pointer.y * (space ? 0.08 : 0.055) +
      (model === "orbiter" ? scroll * 0.12 : 0);
    const baseZ =
      model === "earth" ? 5.7 : model === "lion" ? 5.9 : space ? 7.4 : 6.2;
    const targetZ = baseZ - (model === "orbiter" ? scroll * 0.35 : 0);

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetX, 0.06);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.06);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.06);
    camera.lookAt(0, model === "orbiter" ? scroll * 0.05 : 0, 0);
  });

  return null;
}

function fitObject(object: THREE.Object3D, targetSize: number) {
  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxAxis;
  object.position.sub(center);
  object.scale.setScalar(scale);
}

function cloneMaterials(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (Array.isArray(mesh.material))
      mesh.material = mesh.material.map((material) => material.clone());
    else if (mesh.material) mesh.material = mesh.material.clone();
    mesh.castShadow = false;
    mesh.receiveShadow = false;
  });
}

function LionHead({ onSelect }: { onSelect?: () => void }) {
  const { scene } = useGLTF("/models/lion/lion-head.glb");
  const model = useMemo(() => {
    const clone = scene.clone(true);
    cloneMaterials(clone);
    fitObject(clone, 2.72);
clone.rotation.set(0, 0, 0);

clone.position.set(0, -0.18, 0);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      materials.forEach((material) => {
        if (!material || !("color" in material)) return;
        const m = material as THREE.MeshStandardMaterial;
        m.color.set("#b27f3d");
        m.metalness = 0.7;
        m.roughness = 0.23;
        m.envMapIntensity = 1.5;
        // The supplied model contains a built-in plinth; crop only its lower portion while preserving the lion.
        m.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.68)];
        m.clipShadows = false;
        if ("emissive" in m) {
          m.emissive.set("#2d1709");
          m.emissiveIntensity = 0.06;
        }
      });
    });
    return clone;
  }, [scene]);

  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.045;
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.3) * 0.016;
    ref.current.position.y = Math.sin(clock.elapsedTime * 0.52) * 0.022;
  });

  return (
    <group ref={ref} onClick={onSelect}>
      <primitive object={model} />
      <pointLight
        position={[2.6, 2.5, 4.5]}
        intensity={7.8}
        distance={9}
        color="#fff4db"
      />
      <pointLight
        position={[-2.8, 1.0, 2.4]}
        intensity={4.1}
        distance={8}
        color="#d8a65d"
      />
      <directionalLight
        position={[0, 1.4, 5.8]}
        intensity={4.4}
        color="#fffaf0"
      />
    </group>
  );
}

function OrbiterModel({ launch }: { launch: boolean }) {
  const source = useLoader(FBXLoader, "/models/space/solar-orbiter.fbx");
  const model = useMemo(() => {
    const clone = source.clone(true);
    cloneMaterials(clone);
    fitObject(clone, 3.75);
    clone.rotation.set(-0.3, 0.22, 0.08);
    clone.position.set(0.2, -0.05, 0);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const label =
        `${mesh.name || ""} ${Array.isArray(mesh.material) ? mesh.material.map((m) => m?.name).join(" ") : mesh.material?.name || ""}`.toLowerCase();
      const solar =
        label.includes("cell") ||
        label.includes("panel") ||
        label.includes("foil") ||
        label.includes("shield");
      const emissive =
        label.includes("light") ||
        label.includes("camera") ||
        label.includes("vm_");
      const materials = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      materials.forEach((material) => {
        if (!material || !("color" in material)) return;
        const m = material as THREE.MeshStandardMaterial;
        m.color.set(solar ? "#123d5a" : "#c9d6df");
        m.metalness = solar ? 0.38 : 0.86;
        m.roughness = solar ? 0.28 : 0.24;
        m.envMapIntensity = 1.15;
        if (emissive) {
          m.emissive.set("#54e7ff");
          m.emissiveIntensity = 1.45;
        }
      });

      if (
        label.includes("beam") ||
        label.includes("lightcone") ||
        label.includes("light_cone") ||
        label.includes("cone") ||
        label.includes("laser")
      ) {
        mesh.scale.set(0.35, 0.35, 0.35);
      }
    });
    return clone;
  }, [source]);

  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.06;
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.24) * 0.035;
    ref.current.position.x = THREE.MathUtils.lerp(
      ref.current.position.x,
      launch ? 1.3 : 0.2,
      0.025,
    );
    ref.current.position.z = THREE.MathUtils.lerp(
      ref.current.position.z,
      launch ? -0.7 : 0,
      0.025,
    );
  });

  return (
    <group ref={ref} scale={0.82}>
      <primitive object={model} />
      <pointLight
        position={[0, 0, 1.8]}
        intensity={0.58}
        distance={2.7}
        color="#4de5ff"
      />
    </group>
  );
}

function EarthModel() {
  // Lightweight satellite-style Earth: the Three.js planet textures are small,
  // equirectangular maps with real land/ocean/cloud detail, so we avoid the old
  // 56 MB GLB and the transparent/stylised material stack entirely.
  const dayMap = useLoader(
    THREE.TextureLoader,
    "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg",
  );
  const normalMap = useLoader(
    THREE.TextureLoader,
    "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg",
  );
  const cloudMap = useLoader(
    THREE.TextureLoader,
    "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png",
  );
  const ref = useRef<THREE.Group>(null);

  useMemo(() => {
    dayMap.colorSpace = THREE.SRGBColorSpace;
    dayMap.anisotropy = 4;
    normalMap.colorSpace = THREE.NoColorSpace;
    normalMap.anisotropy = 2;
    cloudMap.colorSpace = THREE.NoColorSpace;
    cloudMap.anisotropy = 2;
    return null;
  }, [dayMap, normalMap, cloudMap]);

  useFrame(({ clock }, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.018;
    ref.current.rotation.x = Math.sin(clock.elapsedTime * 0.14) * 0.005;
  });

  return (
    <group ref={ref} scale={1.4} position={[0, 0.25, 0]}>
      <mesh>
        <sphereGeometry args={[1, 64, 48]} />
        <meshStandardMaterial
          map={dayMap}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.52, 0.52)}
          roughness={0.74}
          metalness={0.02}
        />
      </mesh>
      <mesh scale={1.012}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial
          map={cloudMap}
          transparent
          opacity={0.52}
          depthWrite={false}
          roughness={1}
          metalness={0}
        />
      </mesh>
      <mesh scale={1.035}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial
          color="#6ed8ff"
          transparent
          opacity={0.075}
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <hemisphereLight args={["#e9fbff", "#071421", 0.55]} />
      <directionalLight
        position={[4.5, 3.2, 5.5]}
        intensity={3.2}
        color="#fff7e5"
      />
      <directionalLight
        position={[-3.4, -1.2, 2.3]}
        intensity={0.35}
        color="#398dcc"
      />
    </group>
  );
}

function AtmosphericField({ space }: { space: boolean }) {
  const ref = useRef<THREE.Points>(null);
  const count = space ? 360 : 180;
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = i * 1.61803398875;
      const radius = space ? 3.5 + (i % 31) * 0.15 : 2.8 + (i % 17) * 0.12;
      data[i * 3] = Math.cos(a) * radius;
      data[i * 3 + 1] = ((i % 29) - 14) * (space ? 0.19 : 0.16);
      data[i * 3 + 2] = Math.sin(a) * radius - 1.8;
    }
    return data;
  }, [count, space]);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * (space ? 0.008 : -0.006);
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={space ? "#63e6ff" : "#d6aa64"}
        size={space ? 0.018 : 0.014}
        transparent
        opacity={space ? 0.58 : 0.24}
        depthWrite={false}
      />
    </points>
  );
}

function OrbitLines({ space }: { space: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current)
      ref.current.rotation.z = clock.elapsedTime * (space ? 0.018 : -0.012);
  });
  return (
    <group ref={ref}>
      {[1.9, 2.7].map((radius, i) => (
        <mesh key={radius} rotation={[Math.PI / 2 + i * 0.16, i * 0.42, 0]}>
          <torusGeometry args={[radius, i === 0 ? 0.011 : 0.007, 8, 96]} />
          <meshBasicMaterial
            color={space ? "#4bdfff" : "#cfa25a"}
            transparent
            opacity={space ? 0.2 : 0.16}
          />
        </mesh>
      ))}
    </group>
  );
}

function SceneReady({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}

export function ExperienceScene({
  space = false,
  color = "#b9874f",
  launch = false,
  onDiscover,
  onReady,
  model = "auto",
}: {
  space?: boolean;
  color?: string;
  launch?: boolean;
  onDiscover?: () => void;
  onReady?: () => void;
  model?: SceneModel;
}) {
  const activeModel = model === "auto" ? (space ? "orbiter" : "lion") : model;
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  useEffect(() => {
    const node = hostRef.current;
    if (!node || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin: "220px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      ref={hostRef}
      className={`scene-canvas ${space ? "scene-space" : "scene-luxury"}`}
      aria-label={
        activeModel === "earth"
          ? "Interactive Earth model"
          : activeModel === "orbiter"
            ? "Interactive Solar Orbiter model"
            : "Interactive luxury lion sculpture"
      }
    >
      <Canvas
        frameloop={active ? "always" : "never"}
        dpr={[1, 1]}
        camera={{
          position: [
            0,
            0.05,
            activeModel === "earth"
              ? 5.35
              : activeModel === "lion"
                ? 5.8
                : space
                  ? 7.4
                  : 6.2,
          ],
          fov: activeModel === "earth" ? 36 : 38,
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          stencil: false,
          depth: true,
          localClippingEnabled: false,
        }}
        performance={{ min: 0.55, max: 1, debounce: 120 }}
      >
        <ScrollCameraRig space={space} model={activeModel} />
        <ambientLight
          intensity={activeModel === "earth" ? 0.72 : space ? 0.32 : 1.45}
        />
        <directionalLight
          position={[4, 6, 7]}
          intensity={space ? 3.5 : 2.8}
          color={space ? "#d7f8ff" : "#fff8eb"}
        />
        <directionalLight
          position={[-4, 2, 2]}
          intensity={space ? 1.1 : 0.9}
          color={space ? "#39d8ff" : color}
        />
        <Suspense fallback={null}>
          <SceneReady onReady={onReady} />
          {activeModel !== "lion" && activeModel !== "earth" && (
            <AtmosphericField space={space} />
          )}
          {activeModel !== "lion" && activeModel !== "earth" && (
            <OrbitLines space={space} />
          )}
          {activeModel === "lion" && <LionHead onSelect={onDiscover} />}
          {activeModel === "orbiter" && <OrbiterModel launch={launch} />}
          {activeModel === "earth" && <EarthModel />}
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableRotate={true}
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.38}
          zoomSpeed={0}
          minDistance={5.35}
          maxDistance={5.35}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload("/models/lion/lion-head.glb");

export default ExperienceScene;
