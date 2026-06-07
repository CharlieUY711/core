"use client";

import React, { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (earthRef.current) {
      earthRef.current.rotation.y += 0.0008; // rotación suave
    }
  });

  return (
    <mesh ref={earthRef}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        color="#0A0F1F"
        emissive="#00111F"
        emissiveIntensity={0.4}
        roughness={1}
        metalness={0.1}
      />
    </mesh>
  );
}

function workspace({ lat, lng, intensity }: { lat: number; lng: number; intensity: number }) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const radius = 1.01;
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return (
    <mesh position={[x, y, z]}>
      <sphereGeometry args={[0.02 * intensity, 16, 16]} />
      <meshBasicMaterial color="#00E5FF" />
    </mesh>
  );
}

function RouteLine({ from, to }: { from: any; to: any }) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(from.x, from.y, from.z),
    new THREE.Vector3(0, 0, 0), // curva hacia el centro para efecto arco
    new THREE.Vector3(to.x, to.y, to.z),
  ]);

  const points = curve.getPoints(50);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line>
      <bufferGeometry attach="geometry" {...geometry} />
      <lineBasicMaterial attach="material" color="#00E5FF" linewidth={2} />
    </line>
  );
}

function convertLatLng(lat: number, lng: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const radius = 1.01;
  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

export function CoreGlobe({
  routes,
  hubs,
}: {
  routes: any[];
  hubs: any[];
}) {
  return (
    <div className="w-full h-full">
      <Canvas camera={{ position: [0, 0, 3] }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />

        <Suspense fallback={null}>
          <Earth />

          {hubs.map((workspace, i) => (
            <workspace key={i} lat={workspace.lat} lng={workspace.lng} intensity={workspace.intensity} />
          ))}

          {routes.map((route, i) => {
            const from = convertLatLng(route.from.lat, route.from.lng);
            const to = convertLatLng(route.to.lat, route.to.lng);
            return <RouteLine key={i} from={from} to={to} />;
          })}
        </Suspense>

        <OrbitControls enableZoom={false} />
      </Canvas>
    </div>
  );
}

