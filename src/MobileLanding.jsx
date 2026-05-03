import { useState, useEffect, useRef } from 'react'

// ── HR-relevant objects with emoji + label ──────────────
const OBJECTS = [
  { id:0,  emoji:'📄', label:'Resume',      x:12,  y:8   },
  { id:1,  emoji:'📅', label:'Calendar',    x:68,  y:6   },
  { id:2,  emoji:'📧', label:'99+ Emails',  x:82,  y:22  },
  { id:3,  emoji:'💻', label:'Laptop',      x:78,  y:55  },
  { id:4,  emoji:'📱', label:'Phone',       x:85,  y:75  },
  { id:5,  emoji:'💼', label:'Briefcase',   x:60,  y:85  },
  { id:6,  emoji:'🕐', label:'Deadline',    x:30,  y:88  },
  { id:7,  emoji:'</>', label:'Code',       x:8,   y:72  },
  { id:8,  emoji:'🪪', label:'ID Badge',    x:5,   y:42  },
  { id:9,  emoji:'☕', label:'Coffee',      x:18,  y:62  },
  { id:10, emoji:'⚽', label:'',            x:35,  y:18  },
  { id:11, emoji:'⚫', label:'',            x:55,  y:30  },
  { id:12, emoji:'🟠', label:'',            x:72,  y:40  },
  { id:13, emoji:'⚫', label:'',            x:20,  y:35  },
  { id:14, emoji:'🟠', label:'',            x:48,  y:72  },
]

// Random float animation params per object
const FLOATS = OBJECTS.map(() => ({
  duration: 3.5 + Math.random() * 3,
  dx:       (Math.random() - 0.5) * 18,
  dy:       (Math.random() - 0.5) * 18,
  rotate:   (Math.random() - 0.5) * 25,
  delay:    Math.random() * 2,
}))

export default function MobileLanding({ onSoundToggle, soundOn }) {
  const [thrown, setThrown]     = useState({})   // id → true when thrown
  const [returned, setReturned] = useState({})   // id → true when back
  const [allCleared, setAllCleared] = useState(false)
  const timerRefs = useRef({})

  const throwObject = (id) => {
    if (thrown[id]) {
      // Already thrown — bring it back
      setThrown(p  => ({ ...p,  [id]: false }))
      setReturned(p => ({ ...p, [id]: true  }))
      setTimeout(() => setReturned(p => ({ ...p, [id]: false })), 600)
      return
    }
    setThrown(p => ({ ...p, [id]: true }))
    // Auto-return after 4 seconds
    if (timerRefs.current[id]) clearTimeout(timerRefs.current[id])
    timerRefs.current[id] = setTimeout(() => {
      setThrown(p  => ({ ...p,  [id]: false }))
      setReturned(p => ({ ...p, [id]: true  }))
      setTimeout(() => setReturned(p => ({ ...p, [id]: false })), 700)
    }, 4000)
  }

  const throwAll = () => {
    const all = {}
    OBJECTS.forEach(o => { all[o.id] = true })
    setThrown(all)
    setAllCleared(true)
    // Return all after 5 seconds
    setTimeout(() => {
      setThrown({})
      setAllCleared(false)
      const ret = {}
      OBJECTS.forEach(o => { ret[o.id] = true })
      setReturned(ret)
      setTimeout(() => setReturned({}), 800)
    }, 5000)
  }

  // Cleanup timers
  useEffect(() => () => Object.values(timerRefs.current).forEach(clearTimeout), [])

  return (
    <div style={{
      position:'relative', width:'100vw', height:'100vh',
      background:'#E2E2E2',
      overflow:'hidden', userSelect:'none',
      fontFamily:'Georgia, serif',
    }}>

      {/* Floating CSS animation style */}
      <style>{`
        @keyframes floatObj {
          0%   { transform: translate(0px, 0px) rotate(0deg); }
          50%  { transform: translate(var(--dx), var(--dy)) rotate(var(--rot)); }
          100% { transform: translate(0px, 0px) rotate(0deg); }
        }
        @keyframes throwOut {
          0%   { transform: translate(0,0) scale(1)   rotate(0deg);   opacity:1; }
          60%  { transform: translate(var(--tx), var(--ty)) scale(1.15) rotate(var(--tr)); opacity:1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0.7) rotate(calc(var(--tr)*2)); opacity:0; }
        }
        @keyframes bounceBack {
          0%   { transform: scale(0.5); opacity:0; }
          60%  { transform: scale(1.12); opacity:1; }
          100% { transform: scale(1);   opacity:1; }
        }
        .obj-pill {
          display:flex; align-items:center; gap:6px;
          background:rgba(255,255,255,0.72);
          border-radius:999px;
          padding:8px 14px 8px 10px;
          box-shadow:0 4px 18px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.08);
          backdrop-filter:blur(4px);
          font-size:1.35rem;
          border:1px solid rgba(255,255,255,0.9);
          cursor:pointer;
          -webkit-tap-highlight-color:transparent;
          touch-action:manipulation;
          white-space:nowrap;
        }
        .obj-pill:active { transform:scale(0.92) !important; }
        .obj-label {
          font-family:Georgia,serif;
          font-size:0.7rem;
          color:#333;
          letter-spacing:0.03em;
          font-weight:600;
        }
        .obj-dot {
          width:22px; height:22px; border-radius:50%;
          box-shadow:0 2px 8px rgba(0,0,0,0.15);
          cursor:pointer;
          -webkit-tap-highlight-color:transparent;
        }
      `}</style>

      {/* TOP TEXT */}
      <div style={{
        position:'absolute', top:'9%', left:'50%',
        transform:'translateX(-50%)',
        textAlign:'center', zIndex:20, pointerEvents:'none',
        whiteSpace:'nowrap',
      }}>
        <div style={{ fontSize:'clamp(1.3rem,6vw,1.7rem)', fontWeight:700, color:'#111', letterSpacing:'0.01em' }}>
          Take a breath.
        </div>
      </div>

      {/* BOTTOM TEXT */}
      <div style={{
        position:'absolute', bottom:'22%', left:'50%',
        transform:'translateX(-50%)',
        textAlign:'center', zIndex:20, pointerEvents:'none',
        whiteSpace:'nowrap',
      }}>
        <div style={{ fontSize:'clamp(1.05rem,4.5vw,1.3rem)', fontWeight:700, color:'#111', letterSpacing:'0.01em' }}>
          Then meet me.
        </div>
      </div>

      {/* THROW ALL BUTTON */}
      <div style={{
        position:'absolute', bottom:'10%', left:'50%',
        transform:'translateX(-50%)',
        zIndex:20,
      }}>
        <button
          onClick={throwAll}
          style={{
            fontFamily:'Georgia,serif',
            fontSize:'0.82rem',
            fontWeight:600,
            color: allCleared ? '#888' : '#111',
            background:'rgba(255,255,255,0.80)',
            border:'1.5px solid rgba(0,0,0,0.18)',
            borderRadius:'999px',
            padding:'10px 24px',
            cursor:'pointer',
            letterSpacing:'0.06em',
            textTransform:'uppercase',
            boxShadow:'0 4px 16px rgba(0,0,0,0.10)',
            backdropFilter:'blur(6px)',
            WebkitTapHighlightColor:'transparent',
            touchAction:'manipulation',
            transition:'all 0.2s',
          }}
        >
          {allCleared ? 'returning...' : 'clear everything'}
        </button>
      </div>

      {/* EMAIL */}
      <div style={{
        position:'absolute', bottom:'4%', right:'5%',
        fontFamily:'Georgia,serif', fontSize:'0.72rem',
        fontWeight:600, color:'#444', letterSpacing:'0.03em',
        zIndex:20,
      }}>
        abhinavmittal33@gmail.com
      </div>

      {/* SOUND BUTTON */}
      <button
        onClick={onSoundToggle}
        style={{
          position:'absolute', bottom:'4%', left:'5%',
          zIndex:20,
          width:'44px', height:'44px',
          borderRadius:'50%',
          background:'rgba(255,255,255,0.80)',
          border:'1.5px solid rgba(0,0,0,0.18)',
          display:'flex', alignItems:'center', justifyContent:'center',
          cursor:'pointer',
          fontSize:'1.1rem',
          boxShadow:'0 4px 16px rgba(0,0,0,0.10)',
          backdropFilter:'blur(6px)',
          WebkitTapHighlightColor:'transparent',
          touchAction:'manipulation',
        }}
      >
        {soundOn ? '🔊' : '🔇'}
      </button>

      {/* OBJECTS */}
      {OBJECTS.map((obj, i) => {
        const fl = FLOATS[i]
        const isThrown   = thrown[obj.id]
        const isReturned = returned[obj.id]

        // Throw direction: away from center
        const cx = obj.x - 50
        const cy = obj.y - 50
        const mag = Math.sqrt(cx*cx + cy*cy) || 1
        const tx = `${(cx/mag) * 140}vw`
        const ty = `${(cy/mag) * 140}vh`
        const tr = `${(Math.random()-0.5)*720}deg`

        const isSmall = obj.label === ''

        const style = {
          position:'absolute',
          left:`${obj.x}%`,
          top:`${obj.y}%`,
          transform:'translate(-50%,-50%)',
          zIndex: isThrown ? 5 : 10,
          '--dx': `${fl.dx}px`,
          '--dy': `${fl.dy}px`,
          '--rot': `${fl.rotate}deg`,
          '--tx': tx,
          '--ty': ty,
          '--tr': tr,
          transition: isReturned ? 'none' : undefined,
        }

        if (isThrown) {
          style.animation = `throwOut 0.55s cubic-bezier(0.25,0.46,0.45,0.94) forwards`
        } else if (isReturned) {
          style.animation = `bounceBack 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards`
        } else {
          style.animation = `floatObj ${fl.duration}s ease-in-out ${fl.delay}s infinite`
        }

        if (isSmall) {
          // Small sphere dots
          const isOrange = obj.emoji === '🟠'
          return (
            <div
              key={obj.id}
              style={style}
              onClick={() => throwObject(obj.id)}
            >
              <div className="obj-dot" style={{
                background: isOrange
                  ? 'radial-gradient(circle at 35% 35%, #FF8C30, #E05800)'
                  : 'radial-gradient(circle at 35% 35%, #3A3A3A, #111)',
              }}/>
            </div>
          )
        }

        return (
          <div
            key={obj.id}
            style={style}
            onClick={() => throwObject(obj.id)}
          >
            <div className="obj-pill">
              <span style={{ lineHeight:1 }}>{obj.emoji}</span>
              {obj.label ? <span className="obj-label">{obj.label}</span> : null}
            </div>
          </div>
        )
      })}

    </div>
  )
}
