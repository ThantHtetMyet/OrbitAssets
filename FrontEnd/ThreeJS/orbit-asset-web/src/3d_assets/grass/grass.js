import * as THREE from 'three'

function computeShapeBounds(points) {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minZ = Math.min(minZ, point.z)
    maxZ = Math.max(maxZ, point.z)
  }
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    width: Math.max(0.01, maxX - minX),
    depth: Math.max(0.01, maxZ - minZ),
  }
}

function getShapeArea(points) {
  let sum = 0
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i]
    const next = points[(i + 1) % points.length]
    sum += (current.x * next.z) - (next.x * current.z)
  }
  return Math.abs(sum) / 2
}

function toThreeShape(points) {
  const vectors = points.map((point) => new THREE.Vector2(point.x, -point.z))
  return new THREE.Shape(vectors)
}

function isPointInsidePolygon(point, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const pi = polygon[i]
    const pj = polygon[j]
    const intersects =
      ((pi.z > point.z) !== (pj.z > point.z)) &&
      (point.x < ((pj.x - pi.x) * (point.z - pi.z)) / ((pj.z - pi.z) || 0.000001) + pi.x)
    if (intersects) {
      inside = !inside
    }
  }
  return inside
}

export const grassAsset = {
  id: 'grass',
  name: 'Grass Patch',
  icon: '🌱',
  tag: 'Landscape',
  width: 3.0,
  depth: 3.0,
  height: 0.25,
  colorPrimary: '#58a34e', // grass color
  colorSecondary: '#3f7a3a', // soil / base layers
  extras: [
    { id: 'blade-density', name: 'Density', min: 100, max: 1000, step: 50, value: 300 },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const density = params.extras['blade-density'] || 300
    const w = params.width
    const d = params.depth

    const providedPoints = params.extras?.shapePoints
    let shapePoints
    if (Array.isArray(providedPoints) && providedPoints.length >= 3) {
      shapePoints = providedPoints
    } else {
      const hw = w / 2
      const hd = d / 2
      shapePoints = [
        { x: -hw, z: -hd },
        { x: hw, z: -hd },
        { x: hw, z: hd },
        { x: -hw, z: hd },
      ]
    }

    const bounds = computeShapeBounds(shapePoints)
    const footprintShape = toThreeShape(shapePoints)
    const soilHeight = 0.11
    const topHeight = 0.05

    // Soil Base Layer
    const soilGeo = new THREE.ExtrudeGeometry(footprintShape, {
      depth: soilHeight,
      bevelEnabled: false,
      steps: 1,
    })
    const soil = new THREE.Mesh(soilGeo, secondaryMaterial)
    soil.rotation.x = -Math.PI / 2
    group.add(soil)

    // Top Grass Layer
    const topGeo = new THREE.ExtrudeGeometry(footprintShape, {
      depth: topHeight,
      bevelEnabled: false,
      steps: 1,
    })
    const topMesh = new THREE.Mesh(topGeo, primaryMaterial)
    topMesh.rotation.x = -Math.PI / 2
    topMesh.position.y = soilHeight
    group.add(topMesh)

    // Blades Instancing scattered inside shape
    const bladeGeo = new THREE.ConeGeometry(0.015, 0.16, 3)
    const bladeMesh = new THREE.InstancedMesh(bladeGeo, primaryMaterial, density)
    
    const helper = new THREE.Object3D()
    for (let i = 0; i < density; i++) {
      let px = 0
      let pz = 0
      let accepted = false
      for (let attempt = 0; attempt < 25; attempt += 1) {
        px = bounds.minX + (Math.random() * bounds.width)
        pz = bounds.minZ + (Math.random() * bounds.depth)
        if (isPointInsidePolygon({ x: px, z: pz }, shapePoints)) {
          accepted = true
          break
        }
      }
      if (!accepted && shapePoints.length > 0) {
        px = shapePoints[0].x
        pz = shapePoints[0].z
      }

      helper.position.set(px, soilHeight + topHeight, pz)
      helper.rotation.set(
        (Math.random() - 0.5) * 0.35,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.35
      )
      const s = 0.6 + Math.random() * 0.8
      helper.scale.set(s, s, s)
      helper.updateMatrix()
      bladeMesh.setMatrixAt(i, helper.matrix)
    }
    bladeMesh.instanceMatrix.needsUpdate = true
    group.add(bladeMesh)

    return group
  },
}
