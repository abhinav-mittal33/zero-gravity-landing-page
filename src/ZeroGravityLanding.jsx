import { useRef, useEffect, useMemo, Suspense, useCallback, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'


// ─── PHYSICS ─────────────────────────────────────────────────────────────────
class Body {
  constructor({ home, mass=1, radius=0.7 }) {
    this.home   = new THREE.Vector3(...home)
    this.pos    = new THREE.Vector3(...home)
    this.vel    = new THREE.Vector3((Math.random()-0.5)*0.02,(Math.random()-0.5)*0.02,0)
    this.rot    = new THREE.Euler(
      (Math.random()-0.5)*0.15,
      (Math.random()-0.5)*0.15,
      (Math.random()-0.5)*0.08
    )
    this.angVel = new THREE.Vector3(
      (Math.random()-0.5)*0.06,
      (Math.random()-0.5)*0.06,
      (Math.random()-0.5)*0.03
    )
    this.mass   = mass
    this.radius = radius
    this.phase   = Math.random()*Math.PI*2
    this.freq    = 0.18+Math.random()*0.22
    this._hitAt  = 0   // per-body sound cooldown
  }

  update(dt, t, cpRef, cR, all) {
    const PUSH=60, SPRING=0.05, DAMP=0.977, ADAMP=0.980
    // Mouse repulsion
    const cp = cpRef.current
    if (cp && cpRef.active) {
      const dx=this.pos.x-cp.x, dy=this.pos.y-cp.y, dz=this.pos.z-cp.z
      const dist=Math.sqrt(dx*dx+dy*dy+dz*dz)
      const reach=cR+this.radius
      if (dist<reach && dist>0.001) {
        const f=((reach-dist)/reach)*PUSH/this.mass
        const inv=1/dist
        this.vel.x+=dx*inv*f*dt
        this.vel.y+=dy*inv*f*dt
        this.vel.z+=dz*inv*f*dt*0.2
        this.angVel.x+=(Math.random()-0.5)*2.8/this.mass
        this.angVel.y+=(Math.random()-0.5)*2.8/this.mass
        this.angVel.z+=(Math.random()-0.5)*1.5/this.mass
        const nowMs = Date.now()
        if(cpRef.playHit && nowMs - this._hitAt > 250) {
          this._hitAt = nowMs
          cpRef.playHit()
        }
      }
    }
    // Gentle float
    this.vel.x+=Math.sin(t*this.freq+this.phase)*0.020*dt
    this.vel.y+=Math.cos(t*this.freq*0.7+this.phase*1.3)*0.020*dt
    // Spring home
    this.vel.x+=(this.home.x-this.pos.x)*SPRING*dt
    this.vel.y+=(this.home.y-this.pos.y)*SPRING*dt
    this.vel.z+=(this.home.z-this.pos.z)*SPRING*dt*4
    // Collision
    for (const b of all) {
      if (b===this) continue
      const dx=this.pos.x-b.pos.x, dy=this.pos.y-b.pos.y
      const d2=dx*dx+dy*dy, min=this.radius+b.radius
      if (d2<min*min && d2>0.0001) {
        const d=Math.sqrt(d2), pen=(min-d)*0.5
        this.vel.x+=dx/d*pen*3.5; this.vel.y+=dy/d*pen*3.5
        this.pos.x+=dx/d*pen*0.4; this.pos.y+=dy/d*pen*0.4
      }
    }
    this.vel.multiplyScalar(DAMP)
    this.angVel.multiplyScalar(ADAMP)
    this.pos.addScaledVector(this.vel,dt)
    this.rot.x+=this.angVel.x*dt
    this.rot.y+=this.angVel.y*dt
    this.rot.z+=this.angVel.z*dt
  }
}

// ─── MODEL ───────────────────────────────────────────────────────────────────
function Model({ path, bodyRef, scale=1, baseRot=[0,0,0] }) {
  const { scene } = useGLTF(path)
  const outerRef = useRef()  // physics transform applied here
  const cloned = useMemo(() => {
    const c = scene.clone(true)
    c.traverse(n => {
      if (!n.isMesh) return
      n.castShadow = true; n.receiveShadow = true
      if (!n.material) return
      n.material = n.material.clone()
      const col = n.material.color
      if (!col) return
      const r=col.r, g=col.g, b=col.b
      if (r>0.55 && g>0.28 && g<0.65 && b<0.12) {
        col.setRGB(1.0,0.42,0.0)
        n.material.roughness=0.40; n.material.metalness=0.0
      } else if (r<0.22 && g<0.22 && b<0.22) {
        col.setRGB(0.06,0.06,0.06)
        n.material.roughness=0.38; n.material.metalness=0.04
      } else if (r>0.72 && g>0.72 && b>0.60) {
        col.setRGB(0.93,0.93,0.93)
        n.material.roughness=0.48; n.material.metalness=0.0
      }
      n.material.needsUpdate=true
      // Fix z-fighting between layered faces
      n.material.polygonOffset = true
      n.material.polygonOffsetFactor = -4
      n.material.polygonOffsetUnits  = -4
    })
    return c
  }, [scene])
  useFrame(() => {
    const b=bodyRef.current
    if (!b||!outerRef.current) return
    // Physics controls the outer group position+rotation
    outerRef.current.position.copy(b.pos)
    outerRef.current.rotation.copy(b.rot)
  })
  // Outer group: physics rotation. Inner group: baseRot correction (permanent)
  return (
    <group ref={outerRef}>
      <group rotation={baseRot} scale={scale}>
        <primitive object={cloned} />
      </group>
    </group>
  )
}

// ─── GRADIENT SPHERE ─────────────────────────────────────────────────────────
function GradSphere({ bodyRef }) {
  const ref = useRef()
  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime:{value:0},
      uC0:{value:new THREE.Color('#FF6A00')},
      uC1:{value:new THREE.Color('#FFE2CC')},
    },
    vertexShader:`
      varying vec3 vN,vVD,vWP;
      void main(){
        vec4 wp=modelMatrix*vec4(position,1.0);
        vWP=wp.xyz; vVD=normalize(cameraPosition-wp.xyz);
        vN=normalize(mat3(modelMatrix)*normal);
        gl_Position=projectionMatrix*viewMatrix*wp;
      }`,
    fragmentShader:`
      uniform vec3 uC0,uC1; uniform float uTime;
      varying vec3 vN,vVD,vWP;
      void main(){
        vec3 N=normalize(vN),V=normalize(vVD);
        float fr=pow(1.0-max(dot(N,V),0.0),1.8);
        float t=smoothstep(-0.9,0.8,vWP.y);
        vec3 col=mix(uC0,uC1,t);
        col=mix(col,uC0*1.6,fr*0.6);
        col+=vec3(1.0)*pow(max(dot(N,V),0.0),5.0)*0.30;
        gl_FragColor=vec4(col,1.0);
      }`,
  }),[])
  useFrame(s=>{
    mat.uniforms.uTime.value=s.clock.elapsedTime
    const b=bodyRef.current
    if(!b||!ref.current) return
    ref.current.position.copy(b.pos)
    ref.current.rotation.copy(b.rot)
  })
  return(
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.70,64,64]}/>
      <primitive object={mat} attach="material"/>
    </mesh>
  )
}

// ─── DECO SPHERES ────────────────────────────────────────────────────────────
const DECO=[
  {p:[-3.1, 1.6,0],r:0.16,c:'#0C0C0C'},{p:[-1.8, 1.0,0],r:0.11,c:'#0C0C0C'},
  {p:[-0.6, 1.5,0],r:0.09,c:'#0C0C0C'},{p:[ 0.7, 1.8,0],r:0.13,c:'#0C0C0C'},
  {p:[ 2.2, 1.4,0],r:0.14,c:'#0C0C0C'},{p:[ 3.4, 0.6,0],r:0.10,c:'#0C0C0C'},
  {p:[ 3.0,-1.0,0],r:0.12,c:'#0C0C0C'},{p:[ 1.6,-2.0,0],r:0.16,c:'#0C0C0C'},
  {p:[ 0.2,-2.2,0],r:0.08,c:'#0C0C0C'},{p:[-1.4,-1.8,0],r:0.13,c:'#0C0C0C'},
  {p:[-2.8,-0.8,0],r:0.11,c:'#0C0C0C'},{p:[-0.5,-0.5,0],r:0.07,c:'#0C0C0C'},
  {p:[ 0.4, 0.2,0],r:0.06,c:'#0C0C0C'},{p:[ 1.1,-0.9,0],r:0.08,c:'#0C0C0C'},
  {p:[-0.9, 0.1,0.3],r:0.09,c:'#FF6A00'},{p:[ 0.6,-0.6,0.4],r:0.07,c:'#FF6A00'},
  {p:[ 2.4,-0.4,0.3],r:0.10,c:'#FF6A00'},{p:[-2.3, 0.3,0.2],r:0.07,c:'#FF6A00'},
  {p:[ 3.7,-0.4,0.2],r:0.08,c:'#FF6A00'},{p:[ 0.0, 0.5,0.3],r:0.06,c:'#FF6A00'},
]
const CIRCLE_R=1.2

function DecoSpheres({cpRef}) {
  const refs=useRef([])
  const bodies=useMemo(()=>DECO.map(d=>new Body({home:d.p,mass:0.3,radius:d.r*1.8})),[])
  useFrame((s,dt)=>{
    const t=s.clock.elapsedTime
    for(let i=0;i<bodies.length;i++){
      bodies[i].update(Math.min(dt,0.05),t,cpRef,CIRCLE_R,bodies)
      if(refs.current[i]) refs.current[i].position.copy(bodies[i].pos)
    }
  })
  return(<>{DECO.map((d,i)=>(
    <mesh key={i} ref={el=>refs.current[i]=el} castShadow>
      <sphereGeometry args={[d.r,20,20]}/>
      <meshStandardMaterial color={d.c} roughness={0.35} metalness={0.04}/>
    </mesh>
  ))}</>)
}

// ─── MOUSE RING ───────────────────────────────────────────────────────────────
function MouseRing({cpRef}) {
  const ringRef=useRef()
  const target=useRef(new THREE.Vector3(999,999,0))
  const current=useRef(new THREE.Vector3(999,999,0))
  const {camera,size}=useThree()
  useEffect(()=>{
    const onMove=e=>{
      const x=(e.clientX/size.width)*2-1
      const y=-(e.clientY/size.height)*2+1
      const v=new THREE.Vector3(x,y,0.5).unproject(camera)
      const d=v.sub(camera.position).normalize()
      const tt=-camera.position.z/d.z
      target.current.copy(camera.position).addScaledVector(d,tt)
    }
    window.addEventListener('mousemove',onMove)
    return()=>window.removeEventListener('mousemove',onMove)
  },[camera,size])
  useFrame(()=>{
    if(!cpRef.active) return
    current.current.lerp(target.current,0.16)
    cpRef.current=current.current.clone()
    if(ringRef.current) ringRef.current.position.copy(current.current)
  })
  return(
    <group ref={ringRef}>
      <mesh>
        <torusGeometry args={[CIRCLE_R,0.018,16,100]}/>
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.90}/>
      </mesh>
      <mesh>
        <torusGeometry args={[CIRCLE_R-0.045,0.007,8,100]}/>
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.25}/>
      </mesh>
    </group>
  )
}

// ─── SCENE OBJECTS ────────────────────────────────────────────────────────────
// Orientations baked into GLBs — initRot here is just a tiny organic tilt
// to make each object feel hand-placed, not perfectly aligned
const CFG=[
  { path:'/models/resume.glb',
    home:[-3.5, 1.9,0], mass:1.1, radius:0.72, scale:0.56 },
  { path:'/models/calendar.glb',
    home:[-1.4, 2.6,0], mass:1.2, radius:0.76, scale:0.58 },
  { path:'/models/email_99.glb',
    home:[ 1.0, 2.5,0], mass:1.0, radius:0.78, scale:0.50,
    baseRot:[Math.PI/2, 0, 0] },
  { path:'/models/laptop.glb',
    home:[ 3.2, 1.7,0], mass:1.5, radius:0.84, scale:0.52,
    baseRot:[Math.PI/2, 0, 0] },
  { path:'/models/phone.glb',
    home:[ 4.1,-0.1,0], mass:0.8, radius:0.58, scale:0.60,
    baseRot:[Math.PI/2, 0, 0] },
  { path:'/models/briefcase.glb',
    home:[ 3.3,-1.9,0], mass:1.4, radius:0.82, scale:0.55,
    baseRot:[0.3, 0.2, 0] },
  { path:'/models/clock.glb',
    home:[ 1.0,-2.7,0], mass:1.2, radius:0.72, scale:0.60 },
  { path:'/models/code_window.glb',
    home:[-1.0,-2.6,0], mass:1.0, radius:0.76, scale:0.54 },
  { path:'/models/id_badge.glb',
    home:[-3.1,-1.7,0], mass:0.9, radius:0.66, scale:0.57 },
  { path:'/models/coffee_cup.glb',
    home:[-4.1, 0.1,0], mass:0.9, radius:0.64, scale:0.60 },
  { path:'GRADIENT',
    home:[-2.6,-0.3,0.2], mass:1.8, radius:0.85, scale:1.0 },
]

function SceneObjects({cpRef}) {
  const bRefs=useRef(CFG.map(()=>({current:null})))
  const bodies=useMemo(()=>CFG.map(c=>new Body({home:c.home,mass:c.mass,radius:c.radius})),[])
  useEffect(()=>{bodies.forEach((b,i)=>bRefs.current[i].current=b)},[bodies])
  useFrame((s,dt)=>{
    const t=s.clock.elapsedTime
    for(const b of bodies) b.update(Math.min(dt,0.05),t,cpRef,CIRCLE_R,bodies)
  })
  return(<>
    {CFG.map((cfg,i)=>cfg.path==='GRADIENT'
      ?<GradSphere key={i} bodyRef={bRefs.current[i]}/>
      :<Suspense key={i} fallback={null}>
        <Model path={cfg.path} bodyRef={bRefs.current[i]} scale={cfg.scale} baseRot={cfg.baseRot||[0,0,0]}/>
      </Suspense>
    )}
  </>)
}

// ─── LIGHTING ────────────────────────────────────────────────────────────────
function Lights() {
  return(<>
    <ambientLight intensity={0.60}/>
    <directionalLight
      position={[5,8,6]} intensity={1.25} castShadow
      shadow-mapSize={[2048,2048]}
      shadow-camera-near={0.5} shadow-camera-far={50}
      shadow-camera-left={-14} shadow-camera-right={14}
      shadow-camera-top={12} shadow-camera-bottom={-12}
    />
    <directionalLight position={[-5,3,4]} intensity={0.40} color="#D5EAFF"/>
    <directionalLight position={[0,-4,-2]} intensity={0.13} color="#FF8844"/>
    <pointLight position={[-3,0,3]} intensity={0.30} color="#FF6A00" distance={9} decay={2}/>
    <pointLight position={[3,2,5]} intensity={0.20} color="#FFFFFF" distance={12} decay={2}/>
  </>)
}

// ─── ROOT ────────────────────────────────────────────────────────────────────
export default function ZeroGravityLanding() {
  const cpRef   = useRef(new THREE.Vector3(999,999,0))
  // Audio - module level so it survives re-renders

  const [started, setStarted] = useState(false)

  const handleStart = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    window.__ac = ctx
    ctx.resume()
    cpRef.active = true
    setStarted(true)
  }

  // Assign playHit directly - called from Body.update via cpRef
  cpRef.playHit = useCallback(() => {
    const ctx = window.__ac
    if (!ctx) return
    if (ctx.state !== 'running') return
    try {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      const t = ctx.currentTime
      o.type = 'triangle'
      o.frequency.setValueAtTime(300, t)
      o.frequency.exponentialRampToValueAtTime(80, t + 0.12)
      g.gain.setValueAtTime(0.0, t)
      g.gain.linearRampToValueAtTime(1.0, t + 0.003)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
      o.start(t); o.stop(t + 0.28)
    } catch(e) { console.error('audio err', e) }
  }, [])

  return(
    <div
      style={{
        position:'relative',width:'100vw',height:'100vh',
        background:'radial-gradient(ellipse 90% 70% at 50% 42%, #EBEBEB 0%, #C2C2C2 100%)',
        overflow:'hidden',cursor:'none',userSelect:'none',
      }}
    >

      {/* TOP TEXT */}
      <div style={{
        position:'absolute',top:'11%',left:'50%',
        transform:'translateX(-50%)',textAlign:'center',
        fontFamily:'Georgia, serif',
        fontSize:'clamp(1.25rem,2.2vw,1.75rem)',
        fontWeight:700,color:'#111111',
        lineHeight:1.4,letterSpacing:'0.01em',
        zIndex:10,pointerEvents:'none',whiteSpace:'nowrap',
      }}>
        Take a breath.
      </div>

      {/* BOTTOM TEXT */}
      <div style={{
        position:'absolute',bottom:'28%',left:'50%',
        transform:'translateX(-50%)',textAlign:'center',
        fontFamily:'Georgia, serif',
        fontSize:'clamp(1.1rem,1.9vw,1.48rem)',
        fontWeight:700,color:'#111111',
        lineHeight:1.4,letterSpacing:'0.01em',
        zIndex:10,pointerEvents:'none',whiteSpace:'nowrap',
      }}>
        Then meet me.
      </div>

      {/* EMAIL */}
      <div style={{
        position:'absolute',bottom:'5%',right:'4%',
        fontFamily:'Georgia, serif',
        fontSize:'clamp(0.75rem,1.05vw,0.95rem)',
        fontWeight:600,color:'#2A2A2A',
        letterSpacing:'0.03em',zIndex:10,
      }}>
        abhinavmittal33@gmail.com
      </div>

      {/* Full-screen blur splash */}
      {!started && (
        <div
          onClick={handleStart}
          style={{
            position:'absolute', inset:0, zIndex:100,
            display:'flex', alignItems:'center', justifyContent:'center',
            cursor:'pointer',
            backdropFilter:'blur(20px)',
            WebkitBackdropFilter:'blur(20px)',
            background:'rgba(210,210,210,0.40)',
          }}
        >
          <div style={{
            fontFamily:'"Palatino Linotype", Palatino, Georgia, serif',
            fontSize:'clamp(1.6rem,3.5vw,2.8rem)',
            fontWeight:400,
            color:'#111',
            letterSpacing:'0.04em',
            textAlign:'center',
            lineHeight:1.5,
            userSelect:'none',
          }}>
            click to start
          </div>
        </div>
      )}

      <Canvas
        shadows
        camera={{position:[0,0,11.5],fov:42,near:0.1,far:120}}
        gl={{antialias:true,alpha:false,powerPreference:'high-performance'}}
        dpr={[1,2]}
        style={{position:'absolute',inset:0}}
      >
        <color attach="background" args={['#DADADA']}/>
        <Lights/>
        <DecoSpheres cpRef={cpRef}/>
        <SceneObjects cpRef={cpRef}/>
        <MouseRing cpRef={cpRef}/>
      </Canvas>
    </div>
  )
}

CFG.filter(c=>c.path!=='GRADIENT').forEach(c=>useGLTF.preload(c.path))
