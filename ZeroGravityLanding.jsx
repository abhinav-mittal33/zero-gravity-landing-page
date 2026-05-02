/**
 * ZeroGravityLanding.jsx
 * 
 * Drop-in component. Install:
 *   npm install three @react-three/fiber @react-three/drei
 * 
 * Place all .glb files from ~/Desktop/zero_gravity_models/ into:
 *   /public/models/
 * 
 * Then use: <ZeroGravityLanding />
 */

import { useRef, useEffect, useMemo, useState, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// PHYSICS ENGINE — simple verlet + impulse, no dependencies
// ─────────────────────────────────────────────────────────────────────────────
class PhysicsBody {
  constructor({ home, mass = 1.0, radius = 0.8, rotSpeed }) {
    this.home     = new THREE.Vector3(...home)
    this.pos      = new THREE.Vector3(...home)
    this.vel      = new THREE.Vector3(
      (Math.random() - 0.5) * 0.04,
      (Math.random() - 0.5) * 0.04,
      (Math.random() - 0.5) * 0.02
    )
    this.rot      = new THREE.Euler(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    )
    // Slow gentle default spin, matching the reference's leisurely float
    this.angVel   = new THREE.Vector3(
      (rotSpeed || 0.18) * (Math.random() - 0.5),
      (rotSpeed || 0.18) * (Math.random() - 0.5),
      (rotSpeed || 0.08) * (Math.random() - 0.5)
    )
    this.mass     = mass
    this.radius   = radius
    this.driftPh  = Math.random() * Math.PI * 2
    this.driftSpd = 0.25 + Math.random() * 0.35
    this.sleeping = false
  }

  applyImpulse(ix, iy, iz) {
    this.vel.x += ix / this.mass
    this.vel.y += iy / this.mass
    this.vel.z += iz / this.mass
    // Realistic spin from off-center impact
    this.angVel.x += (Math.random() - 0.5) * 0.5 / this.mass
    this.angVel.y += (Math.random() - 0.5) * 0.5 / this.mass
    this.angVel.z += (Math.random() - 0.5) * 0.3 / this.mass
    this.sleeping  = false
  }

  update(dt, t, circlePosRef, circleRadius, allBodies) {
    if (this.sleeping) return

    const PUSH    = 9.0   // mouse circle push force
    const SPRING  = 0.22  // spring back to home (gentle)
    const DAMP    = 0.91  // velocity damping per frame
    const ADAMP   = 0.96  // angular damping

    // 1 ── Mouse circle repulsion ─────────────────────────
    const cp = circlePosRef.current
    if (cp) {
      const dx = this.pos.x - cp.x
      const dy = this.pos.y - cp.y
      const dz = this.pos.z - cp.z
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz)
      const reach = circleRadius + this.radius

      if (dist < reach && dist > 0.001) {
        const strength = ((reach - dist) / reach) * PUSH / this.mass
        const inv = 1 / dist
        this.applyImpulse(dx*inv*strength*dt, dy*inv*strength*dt, dz*inv*strength*0.4*dt)
      }
    }

    // 2 ── Brownian drift (gentle, organic) ───────────────
    const drift = 0.03
    this.vel.x += Math.sin(t * this.driftSpd       + this.driftPh)        * drift * dt
    this.vel.y += Math.cos(t * this.driftSpd * 0.7 + this.driftPh * 1.4)  * drift * dt

    // 3 ── Spring back to home ─────────────────────────────
    this.vel.x += (this.home.x - this.pos.x) * SPRING * dt
    this.vel.y += (this.home.y - this.pos.y) * SPRING * dt
    this.vel.z += (this.home.z - this.pos.z) * SPRING * dt * 2.0

    // 4 ── Soft sphere–sphere collision ───────────────────
    for (const b of allBodies) {
      if (b === this) continue
      const dx = this.pos.x - b.pos.x
      const dy = this.pos.y - b.pos.y
      const dz = this.pos.z - b.pos.z
      const d2  = dx*dx + dy*dy + dz*dz
      const min = this.radius + b.radius
      if (d2 < min*min && d2 > 0.0001) {
        const d = Math.sqrt(d2)
        const pen = (min - d) * 0.5
        const nx = dx/d, ny = dy/d, nz = dz/d
        this.pos.x += nx * pen * 0.5
        this.pos.y += ny * pen * 0.5
        this.pos.z += nz * pen * 0.2
        this.vel.x += nx * pen * 2.5
        this.vel.y += ny * pen * 2.5
      }
    }

    // 5 ── Damp + integrate ────────────────────────────────
    this.vel.multiplyScalar(DAMP)
    this.angVel.multiplyScalar(ADAMP)

    this.pos.x += this.vel.x * dt
    this.pos.y += this.vel.y * dt
    this.pos.z += this.vel.z * dt
    this.rot.x += this.angVel.x * dt
    this.rot.y += this.angVel.y * dt
    this.rot.z += this.angVel.z * dt

    // 6 ── Sleep if nearly settled back at home ────────────
    const homeDist = this.pos.distanceTo(this.home)
    const speed    = this.vel.length()
    if (homeDist < 0.05 && speed < 0.008) {
      this.vel.set(0, 0, 0)
      this.sleeping = true
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GLB MODEL WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function Model({ path, bodyRef }) {
  const { scene } = useGLTF(path)

  // Deep clone so multiple instances don't share geometry
  const cloned = useMemo(() => {
    const c = scene.clone(true)
    c.traverse(n => {
      if (n.isMesh) {
        n.castShadow    = true
        n.receiveShadow = true
        if (n.material) {
          n.material = n.material.clone()
          n.material.roughness = Math.max(n.material.roughness, 0.38)
        }
      }
    })
    return c
  }, [scene])

  const groupRef = useRef()

  useFrame(() => {
    const b = bodyRef.current
    const g = groupRef.current
    if (!b || !g) return
    g.position.copy(b.pos)
    g.rotation.set(b.rot.x, b.rot.y, b.rot.z)
  })

  return <primitive ref={groupRef} object={cloned} />
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENT SPHERE (custom shader — the glowing centerpiece)
// ─────────────────────────────────────────────────────────────────────────────
function GradientSphere({ bodyRef }) {
  const meshRef  = useRef()
  const matRef   = useRef()

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:  { value: 0 },
      uColor0:{ value: new THREE.Color('#FF6A00') },
      uColor1:{ value: new THREE.Color('#FFFFFF') },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vViewDir  = normalize(cameraPosition - wp.xyz);
        vNormal   = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3  uColor0;
      uniform vec3  uColor1;
      varying vec3  vNormal;
      varying vec3  vViewDir;
      varying vec3  vWorldPos;
      void main() {
        vec3  N  = normalize(vNormal);
        vec3  V  = normalize(vViewDir);
        float fr = pow(1.0 - max(dot(N,V), 0.0), 1.8);
        // Vertical gradient: orange at bottom, white/cream at top
        float t  = smoothstep(-0.9, 0.7, vWorldPos.y);
        vec3  col = mix(uColor0, uColor1, t);
        // Fresnel adds orange rim glow
        col = mix(col, uColor0 * 1.5, fr * 0.55);
        // Bright specular-like highlight
        float spec = pow(max(dot(N, V), 0.0), 3.5);
        col += vec3(1.0) * spec * 0.3;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  }), [])

  useFrame((state) => {
    if (matRef.current)   matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    const b = bodyRef.current
    const m = meshRef.current
    if (!b || !m) return
    m.position.copy(b.pos)
    m.rotation.set(b.rot.x, b.rot.y, b.rot.z)
  })

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <sphereGeometry args={[0.75, 64, 64]} />
      <primitive ref={matRef} object={material} attach="material" />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// FLOATING DECORATION SPHERES  (scattered black + orange dots)
// ─────────────────────────────────────────────────────────────────────────────
const DECO_SPHERES = [
  { pos: [-3.2,  1.8, 0.0], r: 0.22, color: '#1A1A1A' },
  { pos: [-1.8,  1.2, 0.1], r: 0.14, color: '#1A1A1A' },
  { pos: [-0.8,  0.8, 0.2], r: 0.11, color: '#1A1A1A' },
  { pos: [ 0.4,  1.4, 0.1], r: 0.13, color: '#1A1A1A' },
  { pos: [ 2.2,  1.6, 0.0], r: 0.18, color: '#1A1A1A' },
  { pos: [ 3.6,  0.8, 0.1], r: 0.12, color: '#1A1A1A' },
  { pos: [ 1.0, -1.4, 0.2], r: 0.20, color: '#1A1A1A' },
  { pos: [-1.4, -1.8, 0.1], r: 0.15, color: '#1A1A1A' },
  { pos: [ 2.8, -1.2, 0.1], r: 0.10, color: '#1A1A1A' },
  { pos: [-0.2, -0.8, 0.3], r: 0.08, color: '#1A1A1A' },
  { pos: [-1.0,  0.2, 0.4], r: 0.11, color: '#FF6A00' },
  { pos: [ 0.6, -0.4, 0.5], r: 0.09, color: '#FF6A00' },
  { pos: [ 2.4,  0.0, 0.3], r: 0.14, color: '#FF6A00' },
  { pos: [-2.6,  0.6, 0.2], r: 0.09, color: '#FF6A00' },
  { pos: [ 3.8, -0.2, 0.3], r: 0.10, color: '#FF6A00' },
  { pos: [ 0.0,  0.0, 0.6], r: 0.07, color: '#FF6A00' },
]

function DecoSpheres({ circlePosRef }) {
  const refs   = useRef([])
  const bodies = useMemo(() =>
    DECO_SPHERES.map(s => new PhysicsBody({
      home:     s.pos,
      mass:     0.4,
      radius:   s.r * 1.5,
      rotSpeed: 0.0,
    })),
  [])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t  = state.clock.elapsedTime
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].update(dt, t, circlePosRef, 1.3, bodies)
      const m = refs.current[i]
      if (m) m.position.copy(bodies[i].pos)
    }
  })

  return (
    <>
      {DECO_SPHERES.map((s, i) => (
        <mesh key={i} ref={el => refs.current[i] = el} castShadow>
          <sphereGeometry args={[s.r, 24, 24]} />
          <meshStandardMaterial color={s.color} roughness={0.35} metalness={0.05} />
        </mesh>
      ))}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MOUSE CIRCLE — tilted ring that follows cursor
// ─────────────────────────────────────────────────────────────────────────────
const CIRCLE_RADIUS_WORLD = 1.3

function MouseCircle({ circlePosRef }) {
  const ringRef    = useRef()
  const targetPos  = useRef(new THREE.Vector3(0, 0, 0))
  const currentPos = useRef(new THREE.Vector3(0, 0, 0))
  const { camera, size } = useThree()

  useEffect(() => {
    const onMove = (e) => {
      const ndcX =  (e.clientX / size.width)  * 2 - 1
      const ndcY = -(e.clientY / size.height)  * 2 + 1
      const v = new THREE.Vector3(ndcX, ndcY, 0.5)
      v.unproject(camera)
      const dir = v.sub(camera.position).normalize()
      const t   = -camera.position.z / dir.z
      const wp  = camera.position.clone().addScaledVector(dir, t)
      targetPos.current.copy(wp)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [camera, size])

  useFrame((_, delta) => {
    // Smooth lag for the ring (feels physically connected, not glued)
    currentPos.current.lerp(targetPos.current, 0.14)
    circlePosRef.current = currentPos.current.clone()

    if (ringRef.current) {
      ringRef.current.position.copy(currentPos.current)
    }
  })

  return (
    <group ref={ringRef}>
      {/* Main tilted ring — the "hand" pushing objects */}
      <mesh rotation={[Math.PI / 2.6, 0, 0]}>
        <torusGeometry args={[CIRCLE_RADIUS_WORLD, 0.022, 16, 96]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.90} />
      </mesh>
      {/* Subtle inner glow ring */}
      <mesh rotation={[Math.PI / 2.6, 0, 0]}>
        <torusGeometry args={[CIRCLE_RADIUS_WORLD - 0.04, 0.008, 8, 96]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.30} />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENE — all objects positioned in the orbital ring
// ─────────────────────────────────────────────────────────────────────────────

// Object layout — arranged in a loose ring like the reference
// [path, home_xyz, mass, radius]
const SCENE_CONFIG = [
  { path: '/models/resume.glb',      home: [-3.8,  1.8, 0.3], mass: 1.2, radius: 0.85 },
  { path: '/models/calendar.glb',    home: [-1.6,  2.4, 0.2], mass: 1.4, radius: 0.90 },
  { path: '/models/email_99.glb',    home: [ 0.8,  2.6, 0.1], mass: 1.1, radius: 1.00 },
  { path: '/models/laptop.glb',      home: [ 3.0,  1.6, 0.3], mass: 1.6, radius: 1.10 },
  { path: '/models/phone.glb',       home: [ 4.2,  0.0, 0.2], mass: 0.9, radius: 0.70 },
  { path: '/models/briefcase.glb',   home: [ 3.4, -1.8, 0.3], mass: 1.5, radius: 0.95 },
  { path: '/models/clock.glb',       home: [ 1.0, -2.8, 0.2], mass: 1.3, radius: 0.85 },
  { path: '/models/code_window.glb', home: [-1.2, -2.6, 0.2], mass: 1.1, radius: 0.90 },
  { path: '/models/id_badge.glb',    home: [-3.4, -1.6, 0.3], mass: 1.0, radius: 0.75 },
  { path: '/models/coffee_cup.glb',  home: [-4.4,  0.2, 0.2], mass: 1.0, radius: 0.80 },
  // Gradient sphere — centerpiece, slightly in front
  { path: 'GRADIENT_SPHERE',         home: [-3.8, -0.4, 0.8], mass: 1.8, radius: 0.90 },
]

function SceneObjects({ circlePosRef }) {
  const bodyRefs = useRef(SCENE_CONFIG.map(() => ({ current: null })))

  const bodies = useMemo(() =>
    SCENE_CONFIG.map(c => new PhysicsBody({
      home:     c.home,
      mass:     c.mass,
      radius:   c.radius,
      rotSpeed: 0.22,
    })),
  [])

  // Set bodyRefs
  useEffect(() => {
    bodies.forEach((b, i) => { bodyRefs.current[i].current = b })
  }, [bodies])

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05)
    const t  = state.clock.elapsedTime
    for (const b of bodies) {
      b.update(dt, t, circlePosRef, CIRCLE_RADIUS_WORLD, bodies)
    }
  })

  return (
    <>
      {SCENE_CONFIG.map((cfg, i) => {
        if (cfg.path === 'GRADIENT_SPHERE') {
          return <GradientSphere key={i} bodyRef={bodyRefs.current[i]} />
        }
        return (
          <Suspense key={i} fallback={null}>
            <Model path={cfg.path} bodyRef={bodyRefs.current[i]} />
          </Suspense>
        )
      })}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// LIGHTING — soft studio look matching the reference
// ─────────────────────────────────────────────────────────────────────────────
function Lighting() {
  return (
    <>
      {/* Ambient — fills shadows softly */}
      <ambientLight intensity={0.50} />
      {/* Key light — top-left, warm */}
      <directionalLight
        position={[4, 6, 5]}
        intensity={1.10}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      {/* Fill light — right side, cool */}
      <directionalLight position={[-5, 3, 2]} intensity={0.35} color="#D0E8FF" />
      {/* Rim light — back bottom, subtle orange tint */}
      <directionalLight position={[0, -4, -3]} intensity={0.18} color="#FF8833" />
      {/* Subtle orange point — warm glow from the gradient sphere area */}
      <pointLight position={[-3, 0, 2]} intensity={0.25} color="#FF6A00" distance={8} />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ZeroGravityLanding() {
  const circlePosRef = useRef(new THREE.Vector3(0, 0, 0))

  return (
    <div style={{
      position:   'relative',
      width:      '100vw',
      height:     '100vh',
      background: 'radial-gradient(ellipse 80% 60% at 50% 40%, #E6E6E6 0%, #C8C8C8 100%)',
      overflow:   'hidden',
      cursor:     'none',
      userSelect: 'none',
    }}>

      {/* ── Top text ── */}
      <div style={{
        position:   'absolute',
        top:        '13%',
        left:       '50%',
        transform:  'translateX(-50%)',
        textAlign:  'center',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize:   'clamp(1.1rem, 2vw, 1.55rem)',
        fontWeight: '400',
        color:      '#1A1A1A',
        lineHeight: '1.45',
        letterSpacing: '0.01em',
        zIndex:     10,
        pointerEvents: 'none',
      }}>
        Take a breath.
      </div>

      {/* ── Bottom text ── */}
      <div style={{
        position:   'absolute',
        bottom:     '30%',
        left:       '50%',
        transform:  'translateX(-50%)',
        textAlign:  'center',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontSize:   'clamp(1.0rem, 1.8vw, 1.35rem)',
        fontWeight: '400',
        color:      '#1A1A1A',
        lineHeight: '1.4',
        letterSpacing: '0.01em',
        zIndex:     10,
        pointerEvents: 'none',
      }}>
        Then meet me.
      </div>

      {/* ── Email bottom-right ── */}
      <div style={{
        position:   'absolute',
        bottom:     '5.5%',
        right:      '4.5%',
        fontFamily: 'Georgia, serif',
        fontSize:   'clamp(0.75rem, 1.1vw, 0.95rem)',
        color:      '#333333',
        letterSpacing: '0.02em',
        zIndex:     10,
      }}>
        hello@yourportfolio.com
      </div>

      {/* ── Three.js Canvas ── */}
      <Canvas
        shadows
        camera={{ position: [0, 0, 9.5], fov: 48, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        dpr={[1, 2]}
        style={{ position: 'absolute', inset: 0 }}
      >
        <color attach="background" args={['#D8D8D8']} />

        <Lighting />
        <DecoSpheres circlePosRef={circlePosRef} />
        <SceneObjects circlePosRef={circlePosRef} />
        <MouseCircle circlePosRef={circlePosRef} />
      </Canvas>
    </div>
  )
}

// Preload all models
SCENE_CONFIG
  .filter(c => c.path !== 'GRADIENT_SPHERE')
  .forEach(c => useGLTF.preload(c.path))
