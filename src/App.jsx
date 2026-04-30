import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, PointerLockControls } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { useEffect, useMemo, useRef, useState } from 'react'
import React from 'react'
import * as THREE from 'three'

class SceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message ?? 'Unknown render error' }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="scene-error">
          <h2>3D scene failed to start</h2>
          <p>{this.state.message}</p>
          <p>Try disabling browser extensions and reloading.</p>
        </div>
      )
    }
    return this.props.children
  }
}

function PlayerController({ enabled, controlsRef, blockedCircles = [], seatedPose }) {
  const { camera } = useThree()
  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    arrowup: false,
    arrowleft: false,
    arrowdown: false,
    arrowright: false,
  })
  const velocityY = useRef(0)
  const grounded = useRef(true)
  const forwardRef = useRef(new THREE.Vector3())
  const rightRef = useRef(new THREE.Vector3())
  const moveRef = useRef(new THREE.Vector3())
  const speed = 2.8
  const jumpSpeed = 4.6
  const gravity = 11.5
  const eyeHeight = 1.6

  useFrame((_, delta) => {
    if (!enabled || !controlsRef.current?.isLocked) return

    if (seatedPose) {
      camera.position.set(seatedPose.position[0], seatedPose.position[1], seatedPose.position[2])
      return
    }

    const forward = forwardRef.current
    const right = rightRef.current
    const move = moveRef.current
    move.set(0, 0, 0)
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, camera.up).normalize()

    if (keys.current.w || keys.current.arrowup) move.add(forward)
    if (keys.current.s || keys.current.arrowdown) move.sub(forward)
    if (keys.current.a || keys.current.arrowleft) move.sub(right)
    if (keys.current.d || keys.current.arrowright) move.add(right)

    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * delta)
      const nextX = THREE.MathUtils.clamp(camera.position.x + move.x, -4.2, 4.2)
      const nextZ = THREE.MathUtils.clamp(camera.position.z + move.z, -4.2, 4.2)
      const currentlyInside = blockedCircles.some((circle) => {
        const dx = camera.position.x - circle.x
        const dz = camera.position.z - circle.z
        return dx * dx + dz * dz < circle.r * circle.r
      })
      const blocked = blockedCircles.some((circle) => {
        const dx = nextX - circle.x
        const dz = nextZ - circle.z
        return dx * dx + dz * dz < circle.r * circle.r
      })

      if (!blocked || currentlyInside) {
        camera.position.x = nextX
        camera.position.z = nextZ
      }
    }

    velocityY.current -= gravity * delta
    camera.position.y += velocityY.current * delta

    if (camera.position.y <= eyeHeight) {
      camera.position.y = eyeHeight
      velocityY.current = 0
      grounded.current = true
    }
  })

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase()
      if (key in keys.current) {
        event.preventDefault()
        keys.current[key] = true
      }
      if (event.code === 'Space') {
        event.preventDefault()
        if (grounded.current) {
          velocityY.current = jumpSpeed
          grounded.current = false
        }
      }
    }
    const onKeyUp = (event) => {
      const key = event.key.toLowerCase()
      if (key in keys.current) keys.current[key] = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  return <PointerLockControls ref={controlsRef} enabled={enabled} />
}

function WingbackChair({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.95, 0.45, 0.9]} />
        <meshStandardMaterial color="#474b54" roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.12, -0.3]}>
        <boxGeometry args={[0.92, 1.25, 0.22]} />
        <meshStandardMaterial color="#535862" roughness={0.7} />
      </mesh>
      <mesh position={[-0.52, 0.92, -0.08]}>
        <boxGeometry args={[0.12, 0.92, 0.55]} />
        <meshStandardMaterial color="#3f434b" roughness={0.8} />
      </mesh>
      <mesh position={[0.52, 0.92, -0.08]}>
        <boxGeometry args={[0.12, 0.92, 0.55]} />
        <meshStandardMaterial color="#3f434b" roughness={0.8} />
      </mesh>
      <mesh position={[-0.3, 0.23, 0.27]}>
        <boxGeometry args={[0.14, 0.45, 0.14]} />
        <meshStandardMaterial color="#2a2d33" roughness={0.9} />
      </mesh>
      <mesh position={[0.3, 0.23, 0.27]}>
        <boxGeometry args={[0.14, 0.45, 0.14]} />
        <meshStandardMaterial color="#2a2d33" roughness={0.9} />
      </mesh>
    </group>
  )
}

function LivingRoomDecor() {
  return (
    <>
      <group position={[-3.35, 0.1, -4.35]} scale={[1.28, 1.28, 1.28]}>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.26, 0.34, 0.62, 20]} />
          <meshStandardMaterial color="#4d4036" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.76, 0]}>
          <sphereGeometry args={[0.18, 14, 12]} />
          <meshStandardMaterial color="#557f52" roughness={0.9} />
        </mesh>
        <mesh position={[0.25, 1.02, 0]} rotation={[0.08, 0, -0.5]}>
          <boxGeometry args={[0.14, 0.7, 0.04]} />
          <meshStandardMaterial color="#6ea469" roughness={0.88} />
        </mesh>
        <mesh position={[-0.25, 1.02, 0.02]} rotation={[0.08, 0, 0.5]}>
          <boxGeometry args={[0.14, 0.7, 0.04]} />
          <meshStandardMaterial color="#6ea469" roughness={0.88} />
        </mesh>
        <mesh position={[0.05, 1.08, 0.18]} rotation={[-0.35, 0.25, 0.1]}>
          <boxGeometry args={[0.12, 0.62, 0.04]} />
          <meshStandardMaterial color="#6a9f63" roughness={0.88} />
        </mesh>
        <mesh position={[-0.06, 1.08, -0.18]} rotation={[0.35, -0.25, 0.1]}>
          <boxGeometry args={[0.12, 0.62, 0.04]} />
          <meshStandardMaterial color="#6a9f63" roughness={0.88} />
        </mesh>
      </group>

      <group position={[3.35, 0.1, -4.35]} scale={[1.28, 1.28, 1.28]}>
        <mesh position={[0, 0.32, 0]}>
          <cylinderGeometry args={[0.26, 0.34, 0.62, 20]} />
          <meshStandardMaterial color="#4d4036" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.76, 0]}>
          <sphereGeometry args={[0.18, 14, 12]} />
          <meshStandardMaterial color="#557f52" roughness={0.9} />
        </mesh>
        <mesh position={[0.25, 1.02, 0]} rotation={[0.08, 0, -0.5]}>
          <boxGeometry args={[0.14, 0.7, 0.04]} />
          <meshStandardMaterial color="#6ea469" roughness={0.88} />
        </mesh>
        <mesh position={[-0.25, 1.02, 0.02]} rotation={[0.08, 0, 0.5]}>
          <boxGeometry args={[0.14, 0.7, 0.04]} />
          <meshStandardMaterial color="#6ea469" roughness={0.88} />
        </mesh>
        <mesh position={[0.05, 1.08, 0.18]} rotation={[-0.35, 0.25, 0.1]}>
          <boxGeometry args={[0.12, 0.62, 0.04]} />
          <meshStandardMaterial color="#6a9f63" roughness={0.88} />
        </mesh>
        <mesh position={[-0.06, 1.08, -0.18]} rotation={[0.35, -0.25, 0.1]}>
          <boxGeometry args={[0.12, 0.62, 0.04]} />
          <meshStandardMaterial color="#6a9f63" roughness={0.88} />
        </mesh>
      </group>

      <group position={[0, 0, 0.95]}>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[2.4, 0.1, 0.95]} />
          <meshStandardMaterial color="#3a2f2a" roughness={0.78} />
        </mesh>
        <mesh position={[-1.05, 0.25, -0.35]}>
          <boxGeometry args={[0.08, 0.5, 0.08]} />
          <meshStandardMaterial color="#231d1a" roughness={0.84} />
        </mesh>
        <mesh position={[1.05, 0.25, -0.35]}>
          <boxGeometry args={[0.08, 0.5, 0.08]} />
          <meshStandardMaterial color="#231d1a" roughness={0.84} />
        </mesh>
        <mesh position={[-1.05, 0.25, 0.35]}>
          <boxGeometry args={[0.08, 0.5, 0.08]} />
          <meshStandardMaterial color="#231d1a" roughness={0.84} />
        </mesh>
        <mesh position={[1.05, 0.25, 0.35]}>
          <boxGeometry args={[0.08, 0.5, 0.08]} />
          <meshStandardMaterial color="#231d1a" roughness={0.84} />
        </mesh>
      </group>

      <mesh position={[0, 0.55, 0.95]}>
        <cylinderGeometry args={[0.26, 0.26, 0.06, 24]} />
        <meshStandardMaterial color="#d9dbdf" roughness={0.32} metalness={0.12} />
      </mesh>
      <group position={[-0.85, 0.55, 0.95]}>
        <mesh position={[0, 0.18, 0]}>
          <cylinderGeometry args={[0.045, 0.05, 0.28, 16]} />
          <meshStandardMaterial color="#5f5247" roughness={0.78} />
        </mesh>
        <mesh position={[0, 0.37, 0]}>
          <cylinderGeometry args={[0.16, 0.14, 0.1, 20]} />
          <meshStandardMaterial color="#e5d8b0" roughness={0.45} />
        </mesh>
        <pointLight position={[0, 0.42, 0]} intensity={0.8} distance={3.4} color="#ffd787" />
      </group>
      <group position={[0.78, 0.55, 0.95]} scale={[0.45, 0.45, 0.45]}>
        <mesh position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.14, 0.2, 0.5, 18]} />
          <meshStandardMaterial color="#6c645d" roughness={0.88} />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <coneGeometry args={[0.32, 0.55, 18]} />
          <meshStandardMaterial color="#88ad7d" roughness={0.9} />
        </mesh>
        <mesh position={[0.18, 0.86, 0]}>
          <coneGeometry args={[0.24, 0.42, 18]} />
          <meshStandardMaterial color="#7da971" roughness={0.9} />
        </mesh>
        <mesh position={[-0.16, 0.83, 0.06]}>
          <coneGeometry args={[0.22, 0.4, 18]} />
          <meshStandardMaterial color="#7aa26a" roughness={0.9} />
        </mesh>
      </group>

      <group position={[3.15, 0, -0.55]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[0, 0.42, 0]}>
          <boxGeometry args={[2.4, 0.44, 0.88]} />
          <meshStandardMaterial color="#474b54" roughness={0.86} />
        </mesh>
        <mesh position={[0, 0.86, -0.3]}>
          <boxGeometry args={[2.35, 0.62, 0.24]} />
          <meshStandardMaterial color="#535862" roughness={0.84} />
        </mesh>
        <mesh position={[-1.2, 0.74, -0.02]}>
          <boxGeometry args={[0.18, 0.52, 0.82]} />
          <meshStandardMaterial color="#3f434b" roughness={0.88} />
        </mesh>
        <mesh position={[1.2, 0.74, -0.02]}>
          <boxGeometry args={[0.18, 0.52, 0.82]} />
          <meshStandardMaterial color="#3f434b" roughness={0.88} />
        </mesh>
        <mesh position={[-0.64, 0.7, 0.03]}>
          <boxGeometry args={[0.6, 0.22, 0.66]} />
          <meshStandardMaterial color="#535862" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.7, 0.03]}>
          <boxGeometry args={[0.6, 0.22, 0.66]} />
          <meshStandardMaterial color="#535862" roughness={0.9} />
        </mesh>
        <mesh position={[0.64, 0.7, 0.03]}>
          <boxGeometry args={[0.6, 0.22, 0.66]} />
          <meshStandardMaterial color="#535862" roughness={0.9} />
        </mesh>
        <mesh position={[-1.04, 0.17, 0.3]}>
          <boxGeometry args={[0.11, 0.34, 0.11]} />
          <meshStandardMaterial color="#2b2625" roughness={0.9} />
        </mesh>
        <mesh position={[1.04, 0.17, 0.3]}>
          <boxGeometry args={[0.11, 0.34, 0.11]} />
          <meshStandardMaterial color="#2b2625" roughness={0.9} />
        </mesh>
        <mesh position={[-1.04, 0.17, -0.3]}>
          <boxGeometry args={[0.11, 0.34, 0.11]} />
          <meshStandardMaterial color="#2b2625" roughness={0.9} />
        </mesh>
        <mesh position={[1.04, 0.17, -0.3]}>
          <boxGeometry args={[0.11, 0.34, 0.11]} />
          <meshStandardMaterial color="#2b2625" roughness={0.9} />
        </mesh>
      </group>

      <mesh position={[-4.86, 2.55, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.9, 1.85]} />
        <meshStandardMaterial color="#2a1f17" roughness={0.72} metalness={0.06} />
      </mesh>
      <mesh position={[-4.85, 2.55, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.55, 1.5]} />
        <meshStandardMaterial color="#6d86a8" emissive="#253b58" emissiveIntensity={0.18} roughness={0.65} />
      </mesh>
      <mesh position={[-4.72, 1.76, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[2.65, 0.08, 0.26]} />
        <meshStandardMaterial color="#6a5a49" roughness={0.86} />
      </mesh>
    </>
  )
}

function WalkingCat() {
  const catRef = useRef(null)
  const tagRef = useRef(null)
  const targetRef = useRef(new THREE.Vector3(0, 0.22, 0))
  const pauseTimer = useRef(0)
  const velocityRef = useRef(new THREE.Vector2(0, 0))
  const yawRef = useRef(0)
  const obstacleBlocks = [
    { x: 2, z: 1.7, r: 1.15 },
    { x: -2, z: 1.7, r: 1.15 },
    { x: 0, z: 0.95, r: 1.25 },
    { x: 3.15, z: -0.55, r: 1.55 },
  ]

  const getRandomTarget = () => {
    for (let i = 0; i < 30; i += 1) {
      const x = THREE.MathUtils.randFloatSpread(6.8)
      const z = THREE.MathUtils.randFloatSpread(6.8) - 0.2
      const insideChair = obstacleBlocks.some((c) => {
        const dx = x - c.x
        const dz = z - c.z
        return dx * dx + dz * dz < c.r * c.r
      })
      if (!insideChair) return new THREE.Vector3(x, 0.22, z)
    }
    return new THREE.Vector3(0, 0.22, 0)
  }

  useEffect(() => {
    targetRef.current = getRandomTarget()
  }, [])

  useFrame((state, delta) => {
    if (!catRef.current) return

    if (pauseTimer.current > 0) {
      pauseTimer.current -= delta
      return
    }

    const currentPos = catRef.current.position
    const toTarget = new THREE.Vector2(targetRef.current.x - currentPos.x, targetRef.current.z - currentPos.z)
    const dist = toTarget.length()

    if (dist < 0.12) {
      pauseTimer.current = THREE.MathUtils.randFloat(0.5, 1.4)
      targetRef.current = getRandomTarget()
      return
    }

    const dir = toTarget.normalize()
    const speed = 0.9
    velocityRef.current.lerp(dir.multiplyScalar(speed), 0.09)
    const nextX = currentPos.x + velocityRef.current.x * delta
    const nextZ = currentPos.z + velocityRef.current.y * delta
    const collidingBlock = obstacleBlocks.find((c) => {
      const dx = nextX - c.x
      const dz = nextZ - c.z
      return dx * dx + dz * dz < c.r * c.r
    })

    if (collidingBlock) {
      const push = new THREE.Vector2(nextX - collidingBlock.x, nextZ - collidingBlock.z).normalize()
      velocityRef.current.lerp(push.multiplyScalar(speed), 0.55)
      targetRef.current = getRandomTarget()
    }

    catRef.current.position.x = THREE.MathUtils.clamp(nextX, -3.7, 3.7)
    catRef.current.position.y = 0.16 + Math.sin(state.clock.elapsedTime * 9) * 0.008
    catRef.current.position.z = THREE.MathUtils.clamp(nextZ, -3.9, 3.9)
    if (tagRef.current) {
      tagRef.current.position.set(catRef.current.position.x, catRef.current.position.y + 0.38, catRef.current.position.z)
    }

    const yaw = Math.atan2(velocityRef.current.y, velocityRef.current.x)
    yawRef.current = THREE.MathUtils.damp(yawRef.current, -yaw, 5.2, delta)
    catRef.current.rotation.set(0, yawRef.current, 0)
  })

  return (
    <>
    <group ref={catRef}>
      <mesh position={[-0.05, 0.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.12, 0.56, 5, 14]} />
        <meshStandardMaterial color="#06080b" roughness={0.85} />
      </mesh>
      <mesh position={[0.42, 0.24, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial color="#07090d" roughness={0.85} />
      </mesh>
      <mesh position={[0.47, 0.41, 0.08]} rotation={[0.08, 0, -0.2]}>
        <coneGeometry args={[0.055, 0.14, 8]} />
        <meshStandardMaterial color="#07090d" roughness={0.85} />
      </mesh>
      <mesh position={[0.47, 0.41, -0.08]} rotation={[-0.08, 0, -0.2]}>
        <coneGeometry args={[0.055, 0.14, 8]} />
        <meshStandardMaterial color="#07090d" roughness={0.85} />
      </mesh>
      <mesh position={[0.545, 0.255, 0.06]}>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshStandardMaterial color="#f4f8ff" roughness={0.32} />
      </mesh>
      <mesh position={[0.545, 0.255, -0.06]}>
        <sphereGeometry args={[0.028, 12, 12]} />
        <meshStandardMaterial color="#f4f8ff" roughness={0.32} />
      </mesh>
      <mesh position={[0.565, 0.252, 0.06]}>
        <sphereGeometry args={[0.011, 10, 10]} />
        <meshStandardMaterial color="#0a0f18" roughness={0.45} />
      </mesh>
      <mesh position={[0.565, 0.252, -0.06]}>
        <sphereGeometry args={[0.011, 10, 10]} />
        <meshStandardMaterial color="#0a0f18" roughness={0.45} />
      </mesh>
      <mesh position={[0.58, 0.19, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.02, 0.05, 8]} />
        <meshStandardMaterial color="#d57b8d" roughness={0.6} />
      </mesh>
      <mesh position={[0.18, 0.065, 0.11]}>
        <capsuleGeometry args={[0.04, 0.16, 5, 8]} />
        <meshStandardMaterial color="#07090d" roughness={0.88} />
      </mesh>
      <mesh position={[0.18, 0.065, -0.11]}>
        <capsuleGeometry args={[0.04, 0.16, 5, 8]} />
        <meshStandardMaterial color="#07090d" roughness={0.88} />
      </mesh>
      <mesh position={[-0.16, 0.065, 0.11]}>
        <capsuleGeometry args={[0.04, 0.16, 5, 8]} />
        <meshStandardMaterial color="#07090d" roughness={0.88} />
      </mesh>
      <mesh position={[-0.16, 0.065, -0.11]}>
        <capsuleGeometry args={[0.04, 0.16, 5, 8]} />
        <meshStandardMaterial color="#07090d" roughness={0.88} />
      </mesh>
      <mesh position={[-0.44, 0.28, 0]} rotation={[0.12, 0, Math.PI / 2.6]}>
        <capsuleGeometry args={[0.03, 0.42, 5, 10]} />
        <meshStandardMaterial color="#07090d" roughness={0.85} />
      </mesh>
    </group>
    <group ref={tagRef} position={[0, 1.02, 0]}>
      <Html transform sprite distanceFactor={1.2} occlude={false}>
        <div className="cat-name-tag">Willow</div>
      </Html>
    </group>
    </>
  )
}

function PortalGardenSphere({ portalActive, selectedGarden }) {
  const palette = {
    chelsea: { color: '#6f8f5f', emissive: '#3c4d34' },
    aquarium: { color: '#215f88', emissive: '#153952' },
  }
  const style = palette[selectedGarden] ?? palette.chelsea

  const sphereRef = useRef(null)
  useFrame((_, delta) => {
    if (!sphereRef.current) return
    const targetScale = portalActive ? 24 : 0.001
    const next = THREE.MathUtils.damp(sphereRef.current.scale.x, targetScale, 3.3, delta)
    sphereRef.current.scale.setScalar(next)
  })

  return (
    <mesh ref={sphereRef} position={[0, 1.8, 0]} scale={[0.001, 0.001, 0.001]} castShadow={false} receiveShadow={false}>
      <sphereGeometry args={[1, 64, 64]} />
      <meshStandardMaterial
        side={THREE.BackSide}
        color={style.color}
        emissive={style.emissive}
        emissiveIntensity={0.65}
        roughness={1}
      />
    </mesh>
  )
}

function AromaParticles({ intensity, scentType, enabled }) {
  const pointsRef = useRef(null)
  const count = Math.max(35, Math.floor((intensity / 100) * 220))
  const scentPalette = {
    'Tea Tree': '#79d29f',
    Jasmine: '#ffe9a8',
    Rosemary: '#9fc7ff',
  }
  const color = scentPalette[scentType] ?? scentPalette['Tea Tree']
  const positions = useMemo(() => {
    const data = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      data[i * 3] = (Math.random() - 0.5) * 7.5
      data[i * 3 + 1] = Math.random() * 3.4 + 0.3
      data[i * 3 + 2] = (Math.random() - 0.5) * 7.5
    }
    return data
  }, [count])

  useFrame((_, delta) => {
    if (!pointsRef.current) return
    pointsRef.current.rotation.y += delta * 0.045
  })

  if (!enabled) return null

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.04 + (intensity / 100) * 0.07}
        transparent
        opacity={0.44 + (intensity / 100) * 0.42}
        depthWrite={false}
      />
    </points>
  )
}

function FlowerHead({ position = [0, 0, 0], color = '#ff84b7', scale = 1 }) {
  const petals = [0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3]
  return (
    <group position={position} scale={[scale, scale, scale]}>
      {petals.map((angle) => (
        <mesh key={angle} position={[Math.cos(angle) * 0.04, 0.12, Math.sin(angle) * 0.04]}>
          <sphereGeometry args={[0.026, 10, 10]} />
          <meshStandardMaterial color={color} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.018, 10, 10]} />
        <meshStandardMaterial color="#ffd76a" roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.008, 0.01, 0.1, 8]} />
        <meshStandardMaterial color="#4f8b49" roughness={0.88} />
      </mesh>
    </group>
  )
}

function FlowerBed({ position = [0, 0, 0], rotation = [0, 0, 0], width = 1.8, depth = 0.45 }) {
  const flowers = [
    { p: [-0.6, 0.03, -0.08], c: '#ff8db4', s: 1 },
    { p: [-0.38, 0.03, 0.06], c: '#f7d55a', s: 0.95 },
    { p: [-0.1, 0.03, -0.02], c: '#d595ff', s: 1.05 },
    { p: [0.14, 0.03, 0.08], c: '#ff8db4', s: 0.9 },
    { p: [0.4, 0.03, -0.08], c: '#7fc7ff', s: 1.03 },
    { p: [0.62, 0.03, 0.04], c: '#f7d55a', s: 0.92 },
  ]

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[width, 0.12, depth]} />
        <meshStandardMaterial color="#5a3c2a" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.11, 0]}>
        <boxGeometry args={[width * 0.95, 0.03, depth * 0.85]} />
        <meshStandardMaterial color="#3f2f21" roughness={0.95} />
      </mesh>
      {flowers.map((f, idx) => (
        <FlowerHead key={idx} position={f.p} color={f.c} scale={f.s} />
      ))}
    </group>
  )
}

function HedgeWallPanel({ position = [0, 0, 0], rotation = [0, 0, 0], width = 8, height = 4.2 }) {
  const leaves = useMemo(() => {
    const list = []
    for (let y = -2; y <= 2; y += 0.27) {
      for (let x = -3.95; x <= 3.95; x += 0.27) {
        const z = Math.sin(x * 3.2 + y * 2.7) * 0.035 + Math.cos((x - y) * 1.9) * 0.02
        const rotZ = Math.sin(x * 1.3 + y) * 0.25
        const col = (Math.round((x + y) * 10) % 2 === 0) ? '#35642f' : '#42783a'
        list.push([x, y, z, rotZ, col])
      }
    }
    return list
  }, [])

  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color="#335f2d" roughness={1} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      {leaves.map((leaf, idx) => (
        <mesh key={idx} position={[leaf[0], leaf[1], leaf[2] + 0.03]} rotation={[0, 0, leaf[3]]}>
          <planeGeometry args={[0.22, 0.34]} />
          <meshStandardMaterial color={leaf[4]} roughness={0.95} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function FlowerPot({ position = [0, 0, 0], scale = 1, blossom = '#ff8db4' }) {
  const stems = [
    { x: -0.05, z: 0.02, h: 0.24 },
    { x: 0.02, z: -0.04, h: 0.28 },
    { x: 0.06, z: 0.05, h: 0.22 },
  ]

  return (
    <group position={position} scale={[scale, scale, scale]}>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.16, 0.21, 0.28, 18]} />
        <meshStandardMaterial color="#5a3f30" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[0.13, 0.14, 0.06, 16]} />
        <meshStandardMaterial color="#3b2a1f" roughness={0.95} />
      </mesh>
      {stems.map((s, idx) => (
        <group key={idx} position={[s.x, 0.3, s.z]}>
          <mesh position={[0, s.h / 2, 0]}>
            <cylinderGeometry args={[0.008, 0.01, s.h, 8]} />
            <meshStandardMaterial color="#4f8b49" roughness={0.9} />
          </mesh>
          <FlowerHead position={[0, s.h, 0]} color={blossom} scale={0.8 + idx * 0.08} />
        </group>
      ))}
    </group>
  )
}

function ChelseaShowDecor({ active }) {
  if (!active) return null

  return (
    <group>
      <HedgeWallPanel position={[0, 2.5, -4.95]} width={9.8} height={4.6} />
      <HedgeWallPanel position={[-4.95, 2.5, 0]} rotation={[0, Math.PI / 2, 0]} width={9.8} height={4.6} />
      <HedgeWallPanel position={[4.95, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]} width={9.8} height={4.6} />
      <HedgeWallPanel position={[0, 2.5, 4.95]} rotation={[0, Math.PI, 0]} width={9.8} height={4.6} />
      <HedgeWallPanel position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} width={10} height={10} />
      <HedgeWallPanel position={[0, 4.97, 0]} rotation={[Math.PI / 2, 0, 0]} width={10} height={10} />

      <FlowerBed position={[-2.9, 0.18, -4.45]} width={1.45} depth={0.42} />
      <FlowerBed position={[0, 0.18, -4.45]} width={1.9} depth={0.42} />
      <FlowerBed position={[2.9, 0.18, -4.45]} width={1.45} depth={0.42} />

      <FlowerBed position={[-4.45, 0.18, -3.35]} rotation={[0, Math.PI / 2, 0]} width={1.8} depth={0.42} />
      <FlowerBed position={[-4.45, 0.18, -0.6]} rotation={[0, Math.PI / 2, 0]} width={2.05} depth={0.42} />
      <FlowerBed position={[-4.45, 0.18, 2.2]} rotation={[0, Math.PI / 2, 0]} width={1.8} depth={0.42} />

      <FlowerBed position={[4.45, 0.18, -3.35]} rotation={[0, -Math.PI / 2, 0]} width={1.8} depth={0.42} />
      <FlowerBed position={[4.45, 0.18, -0.6]} rotation={[0, -Math.PI / 2, 0]} width={2.05} depth={0.42} />
      <FlowerBed position={[4.45, 0.18, 2.2]} rotation={[0, -Math.PI / 2, 0]} width={1.8} depth={0.42} />

      <FlowerBed position={[-3.6, 0.18, -5.62]} width={1.7} depth={0.5} />
      <FlowerBed position={[0, 0.18, -5.62]} width={2.4} depth={0.5} />
      <FlowerBed position={[3.6, 0.18, -5.62]} width={1.7} depth={0.5} />
      <FlowerBed position={[-5.62, 0.18, -2.2]} rotation={[0, Math.PI / 2, 0]} width={2.2} depth={0.5} />
      <FlowerBed position={[-5.62, 0.18, 1.4]} rotation={[0, Math.PI / 2, 0]} width={1.9} depth={0.5} />
      <FlowerBed position={[5.62, 0.18, -2.2]} rotation={[0, -Math.PI / 2, 0]} width={2.2} depth={0.5} />
      <FlowerBed position={[5.62, 0.18, 1.4]} rotation={[0, -Math.PI / 2, 0]} width={1.9} depth={0.5} />

      <FlowerPot position={[-3.9, 0.04, -4.55]} scale={1.05} blossom="#ff8db4" />
      <FlowerPot position={[-2.2, 0.04, -4.58]} scale={0.9} blossom="#f7d55a" />
      <FlowerPot position={[2.2, 0.04, -4.58]} scale={0.9} blossom="#d595ff" />
      <FlowerPot position={[3.9, 0.04, -4.55]} scale={1.05} blossom="#7fc7ff" />
      <FlowerPot position={[-4.52, 0.04, -2.8]} scale={0.95} blossom="#ff8db4" />
      <FlowerPot position={[-4.52, 0.04, 0.35]} scale={0.92} blossom="#f7d55a" />
      <FlowerPot position={[4.52, 0.04, -2.8]} scale={0.95} blossom="#d595ff" />
      <FlowerPot position={[4.52, 0.04, 0.35]} scale={0.92} blossom="#7fc7ff" />
    </group>
  )
}

function AquariumLife({ active }) {
  const fishRef = useRef(null)
  const fishRef2 = useRef(null)
  const fishRef3 = useRef(null)
  const fishRef4 = useRef(null)
  const fishRef5 = useRef(null)
  const sharkRef = useRef(null)
  const turtleRef = useRef(null)

  useFrame(({ clock }) => {
    if (!active) return
    const t = clock.getElapsedTime()
    if (fishRef.current) {
      fishRef.current.position.set(-4.15, 2.0 + Math.sin(t * 1.4) * 0.4, Math.sin(t * 0.7) * 2.6)
      fishRef.current.rotation.y = -t * 0.9
    }
    if (fishRef2.current) {
      fishRef2.current.position.set(4.05, 1.7 + Math.sin(t * 1.2) * 0.26, -1.1 + Math.sin(t * 0.9) * 2.2)
      fishRef2.current.rotation.y = -t * 0.7 + Math.PI
    }
    if (fishRef3.current) {
      fishRef3.current.position.set(-4.1, 2.55 + Math.sin(t * 0.8) * 0.22, 1.2 + Math.cos(t * 1.05) * 1.9)
      fishRef3.current.rotation.y = t * 0.85
    }
    if (fishRef4.current) {
      fishRef4.current.position.set(4.1, 1.95 + Math.sin(t * 1.3) * 0.28, 0.4 + Math.cos(t * 0.8) * 2.1)
      fishRef4.current.rotation.y = -t * 0.78 + Math.PI
    }
    if (fishRef5.current) {
      fishRef5.current.position.set(-4.12, 2.15 + Math.cos(t * 1.1) * 0.24, -0.5 + Math.sin(t * 0.92) * 2.35)
      fishRef5.current.rotation.y = t * 0.88
    }
    if (sharkRef.current) {
      sharkRef.current.position.set(4.15, 2.4 + Math.sin(t * 0.8) * 0.25, Math.cos(t * 0.55) * 2.5)
      sharkRef.current.rotation.y = t * 0.52
    }
    if (turtleRef.current) {
      turtleRef.current.position.set(-4.1, 1.45 + Math.sin(t * 1.1) * 0.18, -2.8 + Math.cos(t * 0.65) * 1.55)
      turtleRef.current.rotation.y = -t * 0.48
    }
  })

  if (!active) return null

  return (
    <group>
      <group ref={fishRef}>
        <mesh scale={[1.45, 0.78, 0.62]}>
          <sphereGeometry args={[0.16, 20, 16]} />
          <meshStandardMaterial color="#ffb86f" roughness={0.35} />
        </mesh>
        <mesh position={[-0.26, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <coneGeometry args={[0.11, 0.2, 10]} />
          <meshStandardMaterial color="#ff9b45" roughness={0.4} />
        </mesh>
        <mesh position={[0.05, 0.12, 0]} rotation={[0, 0, 0.2]}>
          <coneGeometry args={[0.05, 0.14, 8]} />
          <meshStandardMaterial color="#ffbf76" roughness={0.45} />
        </mesh>
        <mesh position={[0.03, -0.03, 0.12]} rotation={[-Math.PI / 2, 0, 0.3]}>
          <coneGeometry args={[0.035, 0.12, 8]} />
          <meshStandardMaterial color="#ffbf76" roughness={0.5} />
        </mesh>
        <mesh position={[0.03, -0.03, -0.12]} rotation={[Math.PI / 2, 0, 0.3]}>
          <coneGeometry args={[0.035, 0.12, 8]} />
          <meshStandardMaterial color="#ffbf76" roughness={0.5} />
        </mesh>
        <mesh position={[0.19, 0.03, 0.045]}>
          <sphereGeometry args={[0.014, 10, 10]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.2, 0.03, 0.045]}>
          <sphereGeometry args={[0.007, 8, 8]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <Html transform sprite distanceFactor={0.8} position={[0, 0.36, 0]} occlude={false}>
          <div className="aquatic-tag">Fish</div>
        </Html>
      </group>
      <group ref={sharkRef}>
        <mesh scale={[1.62, 0.66, 0.72]}>
          <capsuleGeometry args={[0.18, 0.95, 6, 16]} />
          <meshStandardMaterial color="#6f8c9f" roughness={0.52} />
        </mesh>
        <mesh position={[0, 0.24, -0.08]} rotation={[0, 0, 0.12]}>
          <coneGeometry args={[0.11, 0.26, 12]} />
          <meshStandardMaterial color="#6f8c9f" roughness={0.55} />
        </mesh>
        <mesh position={[-0.45, 0.01, 0]} rotation={[0, Math.PI / 2, 0]}>
          <coneGeometry args={[0.12, 0.24, 12]} />
          <meshStandardMaterial color="#6f8c9f" roughness={0.55} />
        </mesh>
        <mesh position={[-0.08, -0.02, 0.16]} rotation={[-Math.PI / 2, 0, 0.2]}>
          <coneGeometry args={[0.065, 0.2, 10]} />
          <meshStandardMaterial color="#738ea0" roughness={0.56} />
        </mesh>
        <mesh position={[-0.08, -0.02, -0.16]} rotation={[Math.PI / 2, 0, 0.2]}>
          <coneGeometry args={[0.065, 0.2, 10]} />
          <meshStandardMaterial color="#738ea0" roughness={0.56} />
        </mesh>
        <Html transform sprite distanceFactor={0.9} position={[0, 0.42, 0]} occlude={false}>
          <div className="aquatic-tag">Shark</div>
        </Html>
      </group>
      <group ref={fishRef2}>
        <mesh scale={[1.35, 0.74, 0.6]}>
          <sphereGeometry args={[0.13, 16, 12]} />
          <meshStandardMaterial color="#9fd5ff" roughness={0.38} />
        </mesh>
        <mesh position={[-0.2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <coneGeometry args={[0.09, 0.16, 10]} />
          <meshStandardMaterial color="#74b9ee" roughness={0.5} />
        </mesh>
        <mesh position={[0.14, 0.02, 0.035]}>
          <sphereGeometry args={[0.012, 8, 8]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <Html transform sprite distanceFactor={0.75} position={[0, 0.3, 0]} occlude={false}>
          <div className="aquatic-tag">Fish</div>
        </Html>
      </group>
      <group ref={fishRef3}>
        <mesh position={[0, 0.02, 0]} scale={[0.95, 1.2, 0.95]}>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshStandardMaterial color="#d7885a" roughness={0.55} />
        </mesh>
        <mesh position={[0, -0.13, 0.05]} rotation={[0.2, 0, 0]}>
          <capsuleGeometry args={[0.015, 0.16, 4, 8]} />
          <meshStandardMaterial color="#c8794f" roughness={0.62} />
        </mesh>
        <mesh position={[0, -0.14, -0.02]} rotation={[-0.1, 0, 0]}>
          <capsuleGeometry args={[0.015, 0.16, 4, 8]} />
          <meshStandardMaterial color="#c8794f" roughness={0.62} />
        </mesh>
        <mesh position={[0.07, -0.13, 0.02]} rotation={[0.2, 0, 0.2]}>
          <capsuleGeometry args={[0.015, 0.16, 4, 8]} />
          <meshStandardMaterial color="#c8794f" roughness={0.62} />
        </mesh>
        <mesh position={[-0.07, -0.13, 0.02]} rotation={[0.2, 0, -0.2]}>
          <capsuleGeometry args={[0.015, 0.16, 4, 8]} />
          <meshStandardMaterial color="#c8794f" roughness={0.62} />
        </mesh>
        <mesh position={[0.045, 0.05, 0.04]}>
          <sphereGeometry args={[0.009, 8, 8]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <mesh position={[0.045, 0.05, -0.04]}>
          <sphereGeometry args={[0.009, 8, 8]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <Html transform sprite distanceFactor={0.72} position={[0, 0.28, 0]} occlude={false}>
          <div className="aquatic-tag">Squid</div>
        </Html>
      </group>
      <group ref={turtleRef}>
        <mesh scale={[1.3, 0.78, 1.08]}>
          <sphereGeometry args={[0.2, 18, 14]} />
          <meshStandardMaterial color="#5f8a4d" roughness={0.68} />
        </mesh>
        <mesh position={[0.24, 0.01, 0]} scale={[1.2, 0.85, 0.95]}>
          <sphereGeometry args={[0.085, 14, 12]} />
          <meshStandardMaterial color="#78a463" roughness={0.72} />
        </mesh>
        <mesh position={[0.04, -0.04, 0.21]} rotation={[-Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.03, 0.18, 4, 8]} />
          <meshStandardMaterial color="#719a5e" roughness={0.8} />
        </mesh>
        <mesh position={[0.04, -0.04, -0.21]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.03, 0.18, 4, 8]} />
          <meshStandardMaterial color="#719a5e" roughness={0.8} />
        </mesh>
        <mesh position={[-0.18, -0.02, 0.17]} rotation={[0, 0, -0.45]}>
          <capsuleGeometry args={[0.028, 0.16, 4, 8]} />
          <meshStandardMaterial color="#719a5e" roughness={0.8} />
        </mesh>
        <mesh position={[-0.18, -0.02, -0.17]} rotation={[0, 0, -0.45]}>
          <capsuleGeometry args={[0.028, 0.16, 4, 8]} />
          <meshStandardMaterial color="#719a5e" roughness={0.8} />
        </mesh>
        <Html transform sprite distanceFactor={0.9} position={[0, 0.42, 0]} occlude={false}>
          <div className="aquatic-tag">Turtle</div>
        </Html>
      </group>
      <group ref={fishRef4}>
        <mesh scale={[1.4, 0.76, 0.6]}>
          <sphereGeometry args={[0.14, 18, 14]} />
          <meshStandardMaterial color="#ff6fae" roughness={0.38} />
        </mesh>
        <mesh position={[-0.23, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <coneGeometry args={[0.09, 0.16, 10]} />
          <meshStandardMaterial color="#ff4f95" roughness={0.46} />
        </mesh>
        <mesh position={[0.02, 0.1, 0]} rotation={[0, 0, 0.22]}>
          <coneGeometry args={[0.04, 0.11, 8]} />
          <meshStandardMaterial color="#ff93c2" roughness={0.5} />
        </mesh>
        <mesh position={[0.14, 0.02, 0.035]}>
          <sphereGeometry args={[0.011, 8, 8]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <Html transform sprite distanceFactor={0.8} position={[0, 0.34, 0]} occlude={false}>
          <div className="aquatic-tag">Fish</div>
        </Html>
      </group>
      <group ref={fishRef5}>
        <mesh scale={[1.46, 0.8, 0.64]}>
          <sphereGeometry args={[0.15, 20, 16]} />
          <meshStandardMaterial color="#b48dff" roughness={0.36} />
        </mesh>
        <mesh position={[-0.25, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <coneGeometry args={[0.1, 0.18, 10]} />
          <meshStandardMaterial color="#8e67f0" roughness={0.45} />
        </mesh>
        <mesh position={[0.05, 0.11, 0]} rotation={[0, 0, 0.2]}>
          <coneGeometry args={[0.045, 0.12, 8]} />
          <meshStandardMaterial color="#c1a2ff" roughness={0.5} />
        </mesh>
        <mesh position={[0.03, -0.03, 0.11]} rotation={[-Math.PI / 2, 0, 0.32]}>
          <coneGeometry args={[0.03, 0.1, 8]} />
          <meshStandardMaterial color="#c1a2ff" roughness={0.55} />
        </mesh>
        <mesh position={[0.03, -0.03, -0.11]} rotation={[Math.PI / 2, 0, 0.32]}>
          <coneGeometry args={[0.03, 0.1, 8]} />
          <meshStandardMaterial color="#c1a2ff" roughness={0.55} />
        </mesh>
        <mesh position={[0.19, 0.03, 0.04]}>
          <sphereGeometry args={[0.013, 8, 8]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0.198, 0.03, 0.04]}>
          <sphereGeometry args={[0.006, 8, 8]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
        <Html transform sprite distanceFactor={0.82} position={[0, 0.36, 0]} occlude={false}>
          <div className="aquatic-tag">Fish</div>
        </Html>
      </group>
    </group>
  )
}

function LivingRoom({ portalActive, selectedGarden, scentType, aromaIntensity, aromaEnabled }) {
  const roomRef = useRef(null)
  const floorMat = useRef(null)
  const ceilingMat = useRef(null)
  const frontWallMat = useRef(null)
  const backWallMat = useRef(null)
  const leftWallMat = useRef(null)
  const rightWallMat = useRef(null)
  const chelseaActive = portalActive && selectedGarden === 'chelsea'
  const aquariumActive = portalActive && selectedGarden === 'aquarium'

  useEffect(() => {
    if (!roomRef.current) return
    roomRef.current.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true
        obj.receiveShadow = true
      }
    })
  }, [])

  useFrame((_, delta) => {
    const targetOpacity = portalActive && !chelseaActive && !aquariumActive ? 0 : 1
    for (const matRef of [frontWallMat, leftWallMat, rightWallMat]) {
      if (!matRef.current) continue
      matRef.current.opacity = THREE.MathUtils.damp(matRef.current.opacity, targetOpacity, 4.2, delta)
      if (chelseaActive) {
        matRef.current.color.set('#335f2d')
      } else if (aquariumActive) {
        matRef.current.color.set('#1f5078')
        matRef.current.emissive?.set('#153c5b')
        matRef.current.emissiveIntensity = 0.22
      } else if (matRef === frontWallMat) {
        matRef.current.color.set('#4a0c16')
        matRef.current.emissive?.set('#000000')
        matRef.current.emissiveIntensity = 0
      } else {
        matRef.current.color.set('#2f2118')
        matRef.current.emissive?.set('#000000')
        matRef.current.emissiveIntensity = 0
      }
    }
    if (backWallMat.current) {
      if (chelseaActive) {
        backWallMat.current.color.set('#335f2d')
      } else if (aquariumActive) {
        backWallMat.current.color.set('#1f5078')
      } else {
        backWallMat.current.color.set('#2f2118')
      }
    }
    if (floorMat.current) {
      if (chelseaActive) {
        floorMat.current.color.set('#335f2d')
      } else if (aquariumActive) {
        floorMat.current.color.set('#1f5078')
      } else {
        floorMat.current.color.set('#5b2e16')
      }
    }
    if (ceilingMat.current) {
      if (chelseaActive) {
        ceilingMat.current.color.set('#335f2d')
      } else if (aquariumActive) {
        ceilingMat.current.color.set('#1f5078')
      } else {
        ceilingMat.current.color.set('#f2e8d5')
      }
    }
  })

  return (
    <group ref={roomRef}>
      <color attach="background" args={['#06090f']} />

      <ambientLight intensity={0.55} />
      <directionalLight
        castShadow
        position={[3, 5, 2]}
        intensity={1.35}
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.00008}
        shadow-normalBias={0.02}
      />
      <pointLight castShadow position={[0, 3.2, -2]} intensity={0.8} color="#8fb1ff" shadow-mapSize-width={512} shadow-mapSize-height={512} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial ref={floorMat} color="#5b2e16" roughness={0.95} metalness={0.08} />
      </mesh>
      <mesh position={[0, 5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial ref={ceilingMat} color="#f2e8d5" roughness={0.9} metalness={0.08} />
      </mesh>

      <mesh position={[0, 2.5, -5]}>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial
          ref={frontWallMat}
          transparent
          opacity={1}
          color="#4a0c16"
          roughness={0.82}
          metalness={0.12}
        />
      </mesh>
      <mesh position={[0, 2.5, 5]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial ref={backWallMat} color="#2f2118" roughness={0.9} />
      </mesh>
      <mesh position={[-5, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial
          ref={leftWallMat}
          transparent
          opacity={1}
          color="#2f2118"
          roughness={0.9}
        />
      </mesh>
      <mesh position={[5, 2.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial
          ref={rightWallMat}
          transparent
          opacity={1}
          color="#2f2118"
          roughness={0.9}
        />
      </mesh>

      <PortalGardenSphere
        portalActive={portalActive && !chelseaActive && !aquariumActive}
        selectedGarden={selectedGarden}
      />
      <AromaParticles intensity={aromaIntensity} scentType={scentType} enabled={aromaEnabled} />
      <ChelseaShowDecor active={chelseaActive} />
      <AquariumLife active={aquariumActive} />

      <group rotation={[0, Math.PI, 0]}>
        <WingbackChair position={[-2, 0, -1.7]} />
        <WingbackChair position={[2, 0, -1.7]} />
      </group>
      <LivingRoomDecor />
      <WalkingCat />

      <Environment preset="city" />

      <EffectComposer>
        <Bloom intensity={0.35 + (aromaIntensity / 100) * 0.22} luminanceThreshold={0.35} mipmapBlur />
      </EffectComposer>
    </group>
  )
}

function SmartScreenPanel({
  selectedGarden,
  onSelectGarden,
  aromaIntensity,
  onAromaIntensity,
  scentType,
  onScentType,
  aromaEnabled,
  onToggleAroma,
  isPointerLocked,
}) {
  const [showScentOptions, setShowScentOptions] = useState(false)
  const scentOptions = ['Tea Tree', 'Jasmine', 'Rosemary']
  const livingRoomSelected = selectedGarden === 'living-room'

  return (
    <div className="monitor-ui-wrap">
      <div className="spatial-ui">
        <h2>Smart Home Destinations</h2>
        <p className="monitor-help">
          Aim crosshair and left-click to use controls.
        </p>
        <div className="spatial-buttons">
          <button
            className={livingRoomSelected ? 'is-active' : ''}
            onClick={() => onSelectGarden('living-room')}
          >
            Living Room{livingRoomSelected ? ' (Selected)' : ''}
          </button>
          <button
            className={selectedGarden === 'chelsea' ? 'is-active' : ''}
            onClick={() => onSelectGarden('chelsea')}
          >
            Chelsea Flower Show{selectedGarden === 'chelsea' ? ' (Selected)' : ''}
          </button>
          <button
            className={selectedGarden === 'aquarium' ? 'is-active' : ''}
            onClick={() => onSelectGarden('aquarium')}
          >
            Aquarium{selectedGarden === 'aquarium' ? ' (Selected)' : ''}
          </button>
        </div>

        <label>
          Aroma Intensity: <strong>{aromaIntensity}</strong>
          <input
            type="range"
            min={0}
            max={100}
            value={aromaIntensity}
            onChange={(event) => onAromaIntensity(Number(event.target.value))}
          />
        </label>

        <button
          className={`walk-mode-btn ${aromaEnabled ? 'aroma-on' : 'aroma-off'}`}
          onClick={onToggleAroma}
        >
          Aroma: {aromaEnabled ? 'On' : 'Off'}
        </button>

        <label>
          Scent Type:
          <button className="scent-toggle-btn" onClick={() => setShowScentOptions((prev) => !prev)}>
            {scentType} (Selected) {showScentOptions ? '▲' : '▼'}
          </button>
          {showScentOptions && (
            <div className="scent-options">
              {scentOptions.map((option) => (
                <button
                  key={option}
                  className={option === scentType ? 'is-active' : ''}
                  onClick={() => {
                    onScentType(option)
                    setShowScentOptions(false)
                  }}
                >
                  {option}{option === scentType ? ' (Selected)' : ''}
                </button>
              ))}
            </div>
          )}
        </label>

      </div>
    </div>
  )
}

function ChairSitMarkers({ onSit }) {
  return (
    <>
      <Html transform sprite position={[2, 1.85, 1.7]} distanceFactor={1.15} occlude={false}>
        <button className="sit-btn" onClick={() => onSit('left')}>
          Sit Down
        </button>
      </Html>
      <Html transform sprite position={[-2, 1.85, 1.7]} distanceFactor={1.15} occlude={false}>
        <button className="sit-btn" onClick={() => onSit('right')}>
          Sit Down
        </button>
      </Html>
    </>
  )
}

export default function App() {
  const [started, setStarted] = useState(false)
  const [selectedGarden, setSelectedGarden] = useState('living-room')
  const [portalActive, setPortalActive] = useState(false)
  const [aromaIntensity, setAromaIntensity] = useState(45)
  const [aromaEnabled, setAromaEnabled] = useState(false)
  const [scentType, setScentType] = useState('Tea Tree')
  const [isPointerLocked, setIsPointerLocked] = useState(false)
  const [isSliderDragActive, setIsSliderDragActive] = useState(false)
  const [seatedChair, setSeatedChair] = useState(null)
  const controlsRef = useRef(null)
  const sliderDragRef = useRef(null)
  const seatPoses = {
    left: { position: [2, 1.35, 1.7] },
    right: { position: [-2, 1.35, 1.7] },
  }

  useEffect(() => {
    const onPointerLockChange = () => {
      const locked = Boolean(document.pointerLockElement)
      setIsPointerLocked(locked)
      if (locked && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
    }
    document.addEventListener('pointerlockchange', onPointerLockChange)
    return () => document.removeEventListener('pointerlockchange', onPointerLockChange)
  }, [])

  useEffect(() => {
    const onMouseDown = (event) => {
      if (!started || !isPointerLocked || event.button !== 0) return
      const centerX = Math.floor(window.innerWidth / 2)
      const centerY = Math.floor(window.innerHeight / 2)
      const target = document.elementFromPoint(centerX, centerY)
      if (!target) return

      const interactive = target.closest('button, input')
      if (!interactive) return

      event.preventDefault()
      interactive.focus()

      if (interactive.tagName === 'INPUT' && interactive.type === 'range') {
        sliderDragRef.current = interactive
        setIsSliderDragActive(true)
        return
      }

      interactive.click()
    }

    const onMouseMove = (event) => {
      if (!sliderDragRef.current || !isPointerLocked) return
      const step = Number(sliderDragRef.current.step || 1)
      const sensitivity = 0.22
      const delta = event.movementX * sensitivity * step
      if (delta === 0) return
      setAromaIntensity((prev) => THREE.MathUtils.clamp(Math.round(prev + delta), 0, 100))
    }

    const onMouseUp = () => {
      if (!sliderDragRef.current) return
      sliderDragRef.current = null
      setIsSliderDragActive(false)
    }

    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [started, isPointerLocked])

  useEffect(() => {
    if (isPointerLocked) return
    sliderDragRef.current = null
    setIsSliderDragActive(false)
  }, [isPointerLocked])

  useEffect(() => {
    const onSeatExit = (event) => {
      if (event.code === 'Space' && seatedChair) {
        event.preventDefault()
        setSeatedChair(null)
      }
    }
    window.addEventListener('keydown', onSeatExit)
    return () => window.removeEventListener('keydown', onSeatExit)
  }, [seatedChair])

  return (
    <div className="app-shell">
      <SceneErrorBoundary>
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [0, 1.6, 3.5], fov: 65 }}>
          <LivingRoom
            portalActive={portalActive}
            selectedGarden={selectedGarden}
            scentType={scentType}
            aromaIntensity={aromaIntensity}
            aromaEnabled={aromaEnabled}
          />
          <PlayerController
            enabled={started}
            controlsRef={controlsRef}
            seatedPose={seatedChair ? seatPoses[seatedChair] : null}
            blockedCircles={[
              { x: 2, z: 1.7, r: 0.95 },
              { x: -2, z: 1.7, r: 0.95 },
            ]}
          />
          {started && !seatedChair && <ChairSitMarkers onSit={setSeatedChair} />}
          {started && (
            <Html transform position={[0, 2.3, -4.83]} distanceFactor={1.45} occlude={false} eps={0.0001}>
              <SmartScreenPanel
                selectedGarden={selectedGarden}
                onSelectGarden={(garden) => {
                  setSelectedGarden(garden)
                  setPortalActive(garden !== 'living-room')
                }}
                aromaIntensity={aromaIntensity}
                onAromaIntensity={setAromaIntensity}
                scentType={scentType}
                onScentType={setScentType}
                aromaEnabled={aromaEnabled}
                onToggleAroma={() => setAromaEnabled((prev) => !prev)}
                isPointerLocked={isPointerLocked}
              />
            </Html>
          )}
        </Canvas>
      </SceneErrorBoundary>

      {!started && (
        <div className="start-overlay">
          <div className="overlay-panel">
            <div className="overlay-panel-inner">
              <img className="start-side-logo" src="/bloom-buddy.svg" alt="Bloom Buddy logo" />
              <div className="overlay-content">
                <p>A calming future living room designed for elderly users to enjoy immersive nature visits from home.</p>
                <button
                  onClick={() => {
                    setStarted(true)
                    controlsRef.current?.lock()
                  }}
                >
                  Start Experience
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {started && isPointerLocked && <div className="crosshair" aria-hidden="true" />}
      {started && seatedChair && (
        <button className="stand-btn" onClick={() => setSeatedChair(null)}>
          Press Spacebar to stand up
        </button>
      )}

      <div className="hud-legend">
        <span>WASD: Move</span>
        <span>Space: Jump</span>
        <span>Mouse: Look</span>
        <span>Esc: Unlock mouse and click controls</span>
      </div>
    </div>
  )
}
