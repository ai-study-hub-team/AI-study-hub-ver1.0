import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function Chatbot3D() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      35,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );

    camera.position.set(0, 1.0, 7);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 2.2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x7fe8ff, 1.5);
    fillLight.position.set(-5, 3, 4);
    scene.add(fillLight);

    const loader = new GLTFLoader();
    let chatbotModel: THREE.Group | null = null;
    const baseY = -2.1;

    loader.load(
      "/models/ai-chatbot.glb",
      (gltf) => {
        chatbotModel = gltf.scene;

        chatbotModel.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;

          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materials.forEach((material) => {
            if (!(material instanceof THREE.MeshStandardMaterial)) return;

            if (material.map) {
              material.map.colorSpace = THREE.SRGBColorSpace;
              material.map.needsUpdate = true;
            }

            if (material.emissiveMap) {
              material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
              material.emissiveMap.needsUpdate = true;
            }

            material.metalness = Math.min(material.metalness ?? 0.1, 0.25);
            material.roughness = Math.max(material.roughness ?? 0.45, 0.38);
            material.needsUpdate = true;
          });

          child.castShadow = true;
          child.receiveShadow = true;
        });

        chatbotModel.scale.set(0.9, 0.9, 0.9);
        chatbotModel.position.set(0, 10, 0);
        camera.position.set(0, -0.5, 8.5);
        chatbotModel.rotation.set(0, 0, 0);

        scene.add(chatbotModel);
      },
      undefined,
      (error) => {
        console.error("Load ai-chatbot.glb failed:", error);
      },
    );

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 4;
    controls.target.set(0, -0.5, 0);

    const handleResize = () => {
      if (!container) return;

      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    let animationId = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (chatbotModel) {
        chatbotModel.position.y =
          baseY + Math.sin(Date.now() * 0.002) * 0.08;
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);

      controls.dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-[280px] md:h-[340px]" />;
}