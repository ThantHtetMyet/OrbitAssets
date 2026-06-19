import * as THREE from 'three'

function toThreeShape(points) {
  const vectors = points.map((point) => new THREE.Vector2(point.x, -point.z))
  return new THREE.Shape(vectors)
}

function smoothRoadOutline(points) {
  if (!Array.isArray(points) || points.length < 3) return points
  const rounded = []
  const cornerRatio = 0.16
  const cornerSamples = 5
  for (let i = 0; i < points.length; i += 1) {
    const prev = points[(i - 1 + points.length) % points.length]
    const curr = points[i]
    const next = points[(i + 1) % points.length]
    const prevVec = { x: prev.x - curr.x, z: prev.z - curr.z }
    const nextVec = { x: next.x - curr.x, z: next.z - curr.z }
    const prevLen = Math.hypot(prevVec.x, prevVec.z)
    const nextLen = Math.hypot(nextVec.x, nextVec.z)
    if (prevLen <= 0.0001 || nextLen <= 0.0001) {
      rounded.push({ x: curr.x, z: curr.z })
      continue
    }
    const offset = Math.min(1.2, Math.max(0.06, Math.min(prevLen, nextLen) * cornerRatio))
    const inPoint = {
      x: curr.x + ((prevVec.x / prevLen) * offset),
      z: curr.z + ((prevVec.z / prevLen) * offset),
    }
    const outPoint = {
      x: curr.x + ((nextVec.x / nextLen) * offset),
      z: curr.z + ((nextVec.z / nextLen) * offset),
    }
    rounded.push(inPoint)
    for (let s = 1; s <= cornerSamples; s += 1) {
      const t = s / (cornerSamples + 1)
      const inv = 1 - t
      rounded.push({
        x: (inv * inv * inPoint.x) + (2 * inv * t * curr.x) + (t * t * outPoint.x),
        z: (inv * inv * inPoint.z) + (2 * inv * t * curr.z) + (t * t * outPoint.z),
      })
    }
    rounded.push(outPoint)
  }
  return rounded.length >= 3 ? rounded : points
}

function getPolylineLength(points) {
  let total = 0
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]
    total += Math.hypot(b.x - a.x, b.z - a.z)
  }
  return total
}

function getPointAtDistance(points, distance) {
  if (!Array.isArray(points) || points.length === 0) return null
  if (distance <= 0) return { x: points[0].x, z: points[0].z }
  let consumed = 0
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1]
    const b = points[i]
    const segmentLength = Math.hypot(b.x - a.x, b.z - a.z)
    if (segmentLength <= 0.000001) continue
    if ((consumed + segmentLength) >= distance) {
      const t = (distance - consumed) / segmentLength
      return {
        x: a.x + ((b.x - a.x) * t),
        z: a.z + ((b.z - a.z) * t),
      }
    }
    consumed += segmentLength
  }
  const last = points[points.length - 1]
  return { x: last.x, z: last.z }
}

function smoothLanePolyline(polyline) {
  if (!Array.isArray(polyline) || polyline.length < 2) return polyline || []
  const totalLength = getPolylineLength(polyline)
  if (totalLength <= 0.0001) return polyline.map((point) => ({ x: point.x, z: point.z }))
  const spacing = 0.14
  const sampleCount = Math.max(10, Math.min(320, Math.floor(totalLength / spacing)))
  if (polyline.length < 3) {
    const samples = []
    for (let i = 0; i <= sampleCount; i += 1) {
      const t = i / sampleCount
      const point = getPointAtDistance(polyline, totalLength * t)
      if (point) {
        samples.push({ x: point.x, z: point.z })
      }
    }
    return samples
  }
  const curve = new THREE.CatmullRomCurve3(
    polyline.map((point) => new THREE.Vector3(point.x, 0, point.z)),
    false,
    'centripetal',
    0.25
  )
  return curve.getPoints(sampleCount).map((point) => ({
    x: point.x,
    z: point.z,
  }))
}

function createDashSegmentMesh(start, end, width, laneY, material) {
  const direction = new THREE.Vector3(end.x - start.x, 0, end.z - start.z)
  const length = direction.length()
  if (length <= 0.0001) return null
  direction.divideScalar(length)
  const normal = new THREE.Vector3(-direction.z, 0, direction.x).multiplyScalar(width / 2)

  const p1 = new THREE.Vector3(start.x, laneY, start.z).add(normal)
  const p2 = new THREE.Vector3(start.x, laneY, start.z).sub(normal)
  const p3 = new THREE.Vector3(end.x, laneY, end.z).sub(normal)
  const p4 = new THREE.Vector3(end.x, laneY, end.z).add(normal)
  const positions = new Float32Array([
    p1.x, p1.y, p1.z,
    p2.x, p2.y, p2.z,
    p3.x, p3.y, p3.z,
    p1.x, p1.y, p1.z,
    p3.x, p3.y, p3.z,
    p4.x, p4.y, p4.z,
  ])
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  const dashMesh = new THREE.Mesh(geometry, material)
  dashMesh.renderOrder = 10
  return dashMesh
}

function createDashedLaneMeshes(polyline, sharedMaterial, laneY) {
  const meshes = []
  const totalLength = getPolylineLength(polyline)
  if (totalLength < 0.55) return meshes

  const dashSize = 0.9
  const gapSize = 0.42
  const cycleLength = dashSize + gapSize
  const dashWidth = 0.18
  for (let dashStart = 0; dashStart < totalLength; dashStart += cycleLength) {
    const dashEnd = Math.min(totalLength, dashStart + dashSize)
    if ((dashEnd - dashStart) <= 0.03) continue
    const startPoint = getPointAtDistance(polyline, dashStart)
    const endPoint = getPointAtDistance(polyline, dashEnd)
    if (!startPoint || !endPoint) continue
    const dashMesh = createDashSegmentMesh(startPoint, endPoint, dashWidth, laneY, sharedMaterial)
    if (dashMesh) {
      meshes.push(dashMesh)
    }
  }
  return meshes
}

export const roadAsset = {
  id: 'road',
  name: 'Road Segment',
  icon: '🛣️',
  tag: 'Infrastructure',
  width: 4.4,
  depth: 8.0,
  height: 0.08,
  colorPrimary: '#3e434a', // asphalt
  colorSecondary: '#ffffff', // markings
  extras: [
    { id: 'lane-count', name: 'Lanes', min: 1, max: 3, step: 1, value: 2 },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const w = params.width
    const d = params.depth
    const lanes = params.extras['lane-count'] || 2

    const providedPoints = params.extras?.shapePoints
    const dashPolylines = params.extras?.dashPolylines || []

    if (Array.isArray(providedPoints) && providedPoints.length >= 3) {
      // Extrude road asphalt shape
      const smoothed = smoothRoadOutline(providedPoints)
      const footprintShape = toThreeShape(smoothed)
      const asphaltHeight = 0.06
      const asphaltMesh = new THREE.Mesh(
        new THREE.ExtrudeGeometry(footprintShape, {
          depth: asphaltHeight,
          bevelEnabled: false,
          steps: 1,
        }),
        primaryMaterial
      )
      asphaltMesh.rotation.x = -Math.PI / 2
      group.add(asphaltMesh)

      // Extrude dashed lane marks
      const laneY = asphaltHeight + 0.012
      const laneMaterial = secondaryMaterial.clone()
      laneMaterial.side = THREE.DoubleSide
      laneMaterial.depthWrite = false
      laneMaterial.depthTest = false
      laneMaterial.transparent = true
      laneMaterial.opacity = 0.98

      for (const polyline of dashPolylines) {
        const smoothedLane = smoothLanePolyline(polyline)
        const laneMeshes = createDashedLaneMeshes(smoothedLane, laneMaterial, laneY)
        for (const mesh of laneMeshes) {
          group.add(mesh)
        }
      }
    } else {
      // Default Rectangular Asphalt Bed
      const bedGeo = new THREE.BoxGeometry(w, 0.06, d)
      const bed = new THREE.Mesh(bedGeo, primaryMaterial)
      bed.position.y = 0.03
      group.add(bed)

      // Side Borders
      const borderGeo = new THREE.BoxGeometry(0.12, 0.08, d)
      const leftBorder = new THREE.Mesh(borderGeo, secondaryMaterial)
      leftBorder.position.set(-w / 2 + 0.06, 0.04, 0)
      group.add(leftBorder)

      const rightBorder = new THREE.Mesh(borderGeo, secondaryMaterial)
      rightBorder.position.set(w / 2 - 0.06, 0.04, 0)
      group.add(rightBorder)

      // Lane dividers
      const laneDiv = lanes - 1
      if (laneDiv > 0) {
        const lineGeo = new THREE.BoxGeometry(0.08, 0.002, 1.0)
        const dashMaterial = secondaryMaterial
        const startX = -w / 2 + 0.12
        const endX = w / 2 - 0.12
        const spacingX = (endX - startX) / lanes

        for (let l = 1; l <= laneDiv; l++) {
          const lx = startX + l * spacingX
          for (let zOffset = -d / 2 + 0.8; zOffset < d / 2; zOffset += 1.8) {
            const dash = new THREE.Mesh(lineGeo, dashMaterial)
            dash.position.set(lx, 0.062, zOffset)
            group.add(dash)
          }
        }
      }
    }

    return group
  },
}
