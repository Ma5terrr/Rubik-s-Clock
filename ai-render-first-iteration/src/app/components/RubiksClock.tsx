import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

interface RubiksClockProps {
  frontClocks?: number[];  // 9 values, each 0-11 (hours)
  backClocks?: number[];   // 9 values, each 0-11 (hours)
  frontPins?: boolean[];   // 4 values, true = down, false = up
  backPins?: boolean[];    // 4 values
  onWheelDrag?: (side: 'front' | 'back', wheelIndex: number, delta: number) => void;
  onPinClick?: (side: 'front' | 'back', pinIndex: number) => void;
}

export default function RubiksClock({
  frontClocks = Array(9).fill(0),
  backClocks = Array(9).fill(0),
  frontPins = [false, false, false, false],
  backPins = [false, false, false, false],
  onWheelDrag = () => {},
  onPinClick = () => {},
}: RubiksClockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const clockGroupsRef = useRef<{ front: THREE.Group[], back: THREE.Group[] }>({ front: [], back: [] });
  const pinMeshesRef = useRef<{ front: THREE.Group[], back: THREE.Group[] }>({ front: [], back: [] });
  const wheelMeshesRef = useRef<{ front: THREE.Group[], back: THREE.Group[] }>({ front: [], back: [] });
  const isDraggingRef = useRef<{ side: 'front' | 'back', wheel: number, lastY: number } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 10);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(5, 5, 8);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-5, -5, 5);
    scene.add(directionalLight2);

    // MAIN CIRCULAR BODY
    const bodyGeometry = new THREE.CylinderGeometry(3, 3, 0.6, 64);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b,
      metalness: 0.3,
      roughness: 0.7
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.rotation.x = Math.PI / 2;
    scene.add(body);

    // FRONT SIDE (Light Blue)
    const frontFaceGeometry = new THREE.CircleGeometry(3.1, 64);
    const frontFaceMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x60a5fa,
      metalness: 0.2,
      roughness: 0.8
    });
    const frontFace = new THREE.Mesh(frontFaceGeometry, frontFaceMaterial);
    frontFace.position.z = 0.31;
    scene.add(frontFace);

    // Front clock faces (3x3 grid)
    const gridSpacing = 1.6;
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = (col - 1) * gridSpacing;
        const y = (1 - row) * gridSpacing;
        const clockGroup = createClockFace(x, y, 0.32, 0xffffff);
        scene.add(clockGroup);
        clockGroupsRef.current.front.push(clockGroup);
      }
    }

    // BACK SIDE (Dark Gray)
    const backFaceGeometry = new THREE.CircleGeometry(3.1, 64);
    const backFaceMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b,
      metalness: 0.2,
      roughness: 0.8
    });
    const backFace = new THREE.Mesh(backFaceGeometry, backFaceMaterial);
    backFace.position.z = -0.31;
    backFace.rotation.y = Math.PI;
    scene.add(backFace);

    // Back clock faces
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const x = (col - 1) * gridSpacing;
        const y = (1 - row) * gridSpacing;
        const clockGroup = createClockFace(x, y, -0.32, 0x94a3b8);
        clockGroup.rotation.y = Math.PI;
        scene.add(clockGroup);
        clockGroupsRef.current.back.push(clockGroup);
      }
    }

    // FRONT PINS (4 pins around center clock)
    const pinRadius = 0.6;
    const pinPositions = [
      [-pinRadius, pinRadius],   // Top-left
      [pinRadius, pinRadius],    // Top-right
      [-pinRadius, -pinRadius],  // Bottom-left
      [pinRadius, -pinRadius],   // Bottom-right
    ];

    pinPositions.forEach((pos, index) => {
      const pin = createPin();
      pin.position.set(pos[0], pos[1], 0.32);
      pin.userData = { side: 'front', index, type: 'pin' };
      scene.add(pin);
      pinMeshesRef.current.front.push(pin);
    });

    // BACK PINS
    pinPositions.forEach((pos, index) => {
      const pin = createPin();
      pin.position.set(pos[0], pos[1], -0.32);
      pin.rotation.y = Math.PI;
      pin.userData = { side: 'back', index, type: 'pin' };
      scene.add(pin);
      pinMeshesRef.current.back.push(pin);
    });

    // FRONT WHEELS (4 wheels at edge positions, partially visible)
    // Positioned at 1:30, 4:30, 7:30, 10:30 clock positions
    const wheelPositions = [
      { angle: 45, index: 0 },      // 1:30 position
      { angle: 135, index: 1 },     // 4:30 position  
      { angle: 225, index: 2 },     // 7:30 position
      { angle: 315, index: 3 },     // 10:30 position
    ];

    wheelPositions.forEach(({ angle, index }) => {
      const rad = (angle * Math.PI) / 180;
      const wheelDistance = 2.9; // Position at edge so only part is visible
      const x = Math.cos(rad) * wheelDistance;
      const y = Math.sin(rad) * wheelDistance;
      
      const wheel = createWheel();
      wheel.position.set(x, y, 0.31);
      wheel.userData = { side: 'front', index, type: 'wheel' };
      scene.add(wheel);
      wheelMeshesRef.current.front.push(wheel);
    });

    // BACK WHEELS
    wheelPositions.forEach(({ angle, index }) => {
      const rad = (angle * Math.PI) / 180;
      const wheelDistance = 2.9;
      const x = Math.cos(rad) * wheelDistance;
      const y = Math.sin(rad) * wheelDistance;
      
      const wheel = createWheel();
      wheel.position.set(x, y, -0.31);
      wheel.rotation.y = Math.PI;
      wheel.userData = { side: 'back', index, type: 'wheel' };
      scene.add(wheel);
      wheelMeshesRef.current.back.push(wheel);
    });

    // Mouse interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      
      const allWheels = [
        ...wheelMeshesRef.current.front,
        ...wheelMeshesRef.current.back
      ];
      const allPins = [
        ...pinMeshesRef.current.front,
        ...pinMeshesRef.current.back
      ];
      
      const intersects = raycaster.intersectObjects([...allWheels, ...allPins], true);

      if (intersects.length > 0) {
        let target: any = intersects[0].object;
        while (target.parent && !target.userData.type) {
          target = target.parent;
        }

        if (target.userData.type === 'wheel') {
          isDraggingRef.current = {
            side: target.userData.side,
            wheel: target.userData.index,
            lastY: event.clientY
          };
        } else if (target.userData.type === 'pin') {
          onPinClick(target.userData.side, target.userData.index);
        }
      }
    };

    const onMouseMove = (event: MouseEvent) => {
      if (isDraggingRef.current) {
        const deltaY = event.clientY - isDraggingRef.current.lastY;
        const delta = Math.round(-deltaY * 0.05); // Snap to discrete steps
        if (delta !== 0) {
          onWheelDrag(isDraggingRef.current.side, isDraggingRef.current.wheel, delta);
          isDraggingRef.current.lastY = event.clientY;
        }
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = null;
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mouseleave', onMouseUp);

    // Camera rotation
    let isRotating = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let cameraTheta = 0;
    let cameraPhi = Math.PI / 2;
    const cameraDistance = 10;

    const onRotateStart = (event: MouseEvent) => {
      if (event.button === 2 || (event.button === 0 && !isDraggingRef.current)) {
        if (!isDraggingRef.current) {
          isRotating = true;
          lastMouseX = event.clientX;
          lastMouseY = event.clientY;
        }
      }
    };

    const onRotateMove = (event: MouseEvent) => {
      if (isRotating) {
        const deltaX = event.clientX - lastMouseX;
        const deltaY = event.clientY - lastMouseY;

        cameraTheta -= deltaX * 0.01;
        cameraPhi -= deltaY * 0.01;
        cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraPhi));

        camera.position.x = cameraDistance * Math.sin(cameraPhi) * Math.cos(cameraTheta);
        camera.position.y = cameraDistance * Math.cos(cameraPhi);
        camera.position.z = cameraDistance * Math.sin(cameraPhi) * Math.sin(cameraTheta);
        camera.lookAt(0, 0, 0);

        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
      }
    };

    const onRotateEnd = () => {
      isRotating = false;
    };

    renderer.domElement.addEventListener('mousedown', onRotateStart);
    renderer.domElement.addEventListener('mousemove', onRotateMove);
    renderer.domElement.addEventListener('mouseup', onRotateEnd);
    renderer.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('mouseleave', onMouseUp);
      renderer.domElement.removeEventListener('mousedown', onRotateStart);
      renderer.domElement.removeEventListener('mousemove', onRotateMove);
      renderer.domElement.removeEventListener('mouseup', onRotateEnd);
      if (containerRef.current && renderer.domElement.parentNode) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [onWheelDrag, onPinClick]);

  // Update clock faces
  useEffect(() => {
    clockGroupsRef.current.front.forEach((group, i) => {
      updateClockFace(group, frontClocks[i] || 0);
    });
    clockGroupsRef.current.back.forEach((group, i) => {
      updateClockFace(group, backClocks[i] || 0);
    });
  }, [frontClocks, backClocks]);

  // Update pins
  useEffect(() => {
    pinMeshesRef.current.front.forEach((pin, i) => {
      updatePinAppearance(pin, frontPins[i]);
    });
    pinMeshesRef.current.back.forEach((pin, i) => {
      updatePinAppearance(pin, backPins[i]);
    });
  }, [frontPins, backPins]);

  return <div ref={containerRef} className="w-full h-full" />;
}

function createClockFace(x: number, y: number, z: number, bgColor: number): THREE.Group {
  const group = new THREE.Group();
  group.position.set(x, y, z);

  // Clock background circle
  const bgGeometry = new THREE.CircleGeometry(0.65, 32);
  const bgMaterial = new THREE.MeshStandardMaterial({
    color: bgColor,
    metalness: 0.1,
    roughness: 0.9
  });
  const bg = new THREE.Mesh(bgGeometry, bgMaterial);
  group.add(bg);

  // Clock border ring
  const borderGeometry = new THREE.RingGeometry(0.65, 0.7, 32);
  const borderMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x000000,
    metalness: 0.5,
    roughness: 0.5
  });
  const border = new THREE.Mesh(borderGeometry, borderMaterial);
  border.position.z = 0.001;
  group.add(border);

  // Hour markers at 12, 3, 6, 9
  for (let hour of [0, 3, 6, 9]) {
    const angle = (hour * 30 - 90) * (Math.PI / 180);
    const markerX = Math.cos(angle) * 0.52;
    const markerY = Math.sin(angle) * 0.52;
    
    const markerGeometry = new THREE.CircleGeometry(0.06, 16);
    const markerMaterial = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.set(markerX, markerY, 0.002);
    group.add(marker);
  }

  // Center dot
  const centerGeometry = new THREE.CircleGeometry(0.08, 16);
  const centerMaterial = new THREE.MeshStandardMaterial({ color: 0x1e293b });
  const center = new THREE.Mesh(centerGeometry, centerMaterial);
  center.position.z = 0.003;
  group.add(center);

  // Hour hand
  const hourHandGeometry = new THREE.BoxGeometry(0.08, 0.3, 0.03);
  const hourHandMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1e293b,
    metalness: 0.3,
    roughness: 0.7
  });
  const hourHand = new THREE.Mesh(hourHandGeometry, hourHandMaterial);
  hourHand.position.set(0, 0.15, 0.004);
  hourHand.userData = { type: 'hourHand' };
  group.add(hourHand);

  // Minute hand
  const minuteHandGeometry = new THREE.BoxGeometry(0.06, 0.42, 0.03);
  const minuteHandMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x475569,
    metalness: 0.3,
    roughness: 0.7
  });
  const minuteHand = new THREE.Mesh(minuteHandGeometry, minuteHandMaterial);
  minuteHand.position.set(0, 0.21, 0.005);
  minuteHand.userData = { type: 'minuteHand' };
  group.add(minuteHand);

  return group;
}

function updateClockFace(group: THREE.Group, hour: number) {
  // Snap to 12 discrete positions (0-11)
  const snappedHour = Math.round(hour) % 12;
  const angle = snappedHour * 30; // 30 degrees per hour

  group.children.forEach((child) => {
    if (child.userData.type === 'hourHand') {
      child.rotation.z = -angle * (Math.PI / 180);
    } else if (child.userData.type === 'minuteHand') {
      child.rotation.z = -angle * (Math.PI / 180);
    }
  });
}

function createPin(): THREE.Group {
  const group = new THREE.Group();

  // Pin shaft (cylindrical)
  const shaftGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 16);
  const shaftMaterial = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.7,
    roughness: 0.3
  });
  const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
  shaft.rotation.x = Math.PI / 2;
  shaft.userData = { part: 'shaft' };
  group.add(shaft);

  // Pin head (button on top)
  const headGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);
  const headMaterial = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    metalness: 0.5,
    roughness: 0.4
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.z = 0.15;
  head.rotation.x = Math.PI / 2;
  head.userData = { part: 'head' };
  group.add(head);

  return group;
}

function updatePinAppearance(pin: THREE.Group, isDown: boolean) {
  pin.children.forEach((child) => {
    if (child.userData.part === 'head') {
      const material = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
      // Down = engaged = green, Up = disengaged = red
      material.color.setHex(isDown ? 0x22c55e : 0xef4444);
      
      // Make it look pressed down or raised up
      child.position.z = isDown ? 0.1 : 0.2;
    }
  });
}

function createWheel(): THREE.Group {
  const group = new THREE.Group();

  // Wheel base (thicker cylinder)
  const baseGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.15, 32);
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.5,
    roughness: 0.5
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.rotation.x = Math.PI / 2;
  group.add(base);

  // Grip ridges around the wheel
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const ridgeX = Math.cos(angle) * 0.32;
    const ridgeY = Math.sin(angle) * 0.32;
    
    const ridgeGeometry = new THREE.BoxGeometry(0.1, 0.16, 0.08);
    const ridgeMaterial = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.4,
      roughness: 0.6
    });
    const ridge = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
    ridge.position.set(ridgeX, ridgeY, 0);
    group.add(ridge);
  }

  return group;
}