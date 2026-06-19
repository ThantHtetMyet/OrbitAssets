import * as THREE from 'three'

function normalizeTypographyText(value) {
  const text = String(value || '').trim()
  return text.slice(0, 64)
}

function colorToHexString(material, fallback) {
  const color = material?.color
  if (!color?.isColor) {
    return fallback
  }
  return `#${color.getHexString()}`
}

function buildTypographyTexture(text, backgroundColor, textColor) {
  const labelText = normalizeTypographyText(text) || 'TEXT'
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const paddingX = 44
  let fontSize = 122
  ctx.font = `700 ${fontSize}px Arial, sans-serif`
  while (ctx.measureText(labelText).width > (canvas.width - (paddingX * 2)) && fontSize > 56) {
    fontSize -= 4
    ctx.font = `700 ${fontSize}px Arial, sans-serif`
  }

  const panelRadius = 26
  const panelX = 8
  const panelY = 8
  const panelWidth = canvas.width - 16
  const panelHeight = canvas.height - 16

  ctx.fillStyle = backgroundColor
  ctx.beginPath()
  ctx.moveTo(panelX + panelRadius, panelY)
  ctx.lineTo(panelX + panelWidth - panelRadius, panelY)
  ctx.quadraticCurveTo(panelX + panelWidth, panelY, panelX + panelWidth, panelY + panelRadius)
  ctx.lineTo(panelX + panelWidth, panelY + panelHeight - panelRadius)
  ctx.quadraticCurveTo(panelX + panelWidth, panelY + panelHeight, panelX + panelWidth - panelRadius, panelY + panelHeight)
  ctx.lineTo(panelX + panelRadius, panelY + panelHeight)
  ctx.quadraticCurveTo(panelX, panelY + panelHeight, panelX, panelY + panelHeight - panelRadius)
  ctx.lineTo(panelX, panelY + panelRadius)
  ctx.quadraticCurveTo(panelX, panelY, panelX + panelRadius, panelY)
  ctx.closePath()
  ctx.fill()

  ctx.strokeStyle = 'rgba(255,255,255,0.35)'
  ctx.lineWidth = 4
  ctx.stroke()

  ctx.fillStyle = textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${fontSize}px Arial, sans-serif`
  ctx.fillText(labelText, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

export const typographyAsset = {
  id: 'typography',
  name: 'Typography Text',
  icon: '🔤',
  tag: 'Infrastructure',
  width: 2.2,
  depth: 0.02,
  height: 0.6,
  colorPrimary: '#ffffff',
  colorSecondary: '#0f172a',
  extras: [
    { id: 'typography-text', name: 'Text', value: 'TEXT' },
  ],
  build: (params, primaryMaterial, secondaryMaterial) => {
    const group = new THREE.Group()
    const width = Math.max(0.8, Number(params.width) || 2.2)
    const height = Math.max(0.35, Number(params.height) || 0.6)
    const text = normalizeTypographyText(params?.extras?.['typography-text']) || 'TEXT'
    const textColor = colorToHexString(primaryMaterial, '#ffffff')
    const backgroundColor = `${colorToHexString(secondaryMaterial, '#0f172a')}cc`
    const texture = buildTypographyTexture(text, backgroundColor, textColor)

    const panelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    )
    group.add(panelMesh)
    return group
  },
}
