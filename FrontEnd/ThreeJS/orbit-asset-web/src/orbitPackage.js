export const ORBIT_PACKAGE_TYPE = 'orbit-asset-package'
export const ORBIT_PACKAGE_SCHEMA_VERSION = '2.0'
export const ORBIT_PACKAGE_LEGACY_FORMAT = 'OrbitAsset'

function cloneSerializable(value, fallback) {
  if (value === undefined) {
    return fallback
  }
  return JSON.parse(JSON.stringify(value))
}

function toPositiveNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeAxisConfig(axisConfig, fallbackValue, fallbackMax) {
  const source = axisConfig && typeof axisConfig === 'object' ? axisConfig : {}
  const defaultValue = toPositiveNumber(source.default, fallbackValue)
  return {
    min: toPositiveNumber(source.min, 0.1),
    max: toPositiveNumber(source.max, fallbackMax),
    step: toPositiveNumber(source.step, 0.05),
    default: defaultValue,
  }
}

export function buildOrbitPackage({
  asset,
  object,
  extras = {},
  resizable = {},
  exportMode = 'default',
  render = null,
  capabilities = null,
  packageId = null,
}) {
  if (!asset?.id) {
    throw new Error('Cannot build an .orbit package without an asset id.')
  }

  const normalizedObject = {
    type: String(object?.type || asset.id),
    widthM: toPositiveNumber(object?.widthM, toPositiveNumber(asset.width, 1)),
    depthM: toPositiveNumber(object?.depthM, toPositiveNumber(asset.depth, 1)),
    heightM: toPositiveNumber(object?.heightM, toPositiveNumber(asset.height, 1)),
    yawDeg: Number.isFinite(Number(object?.yawDeg)) ? Number(object.yawDeg) : 0,
    colorHex: typeof object?.colorHex === 'string' ? object.colorHex : (asset.colorPrimary || null),
    colorSecondaryHex: typeof object?.colorSecondaryHex === 'string' ? object.colorSecondaryHex : (asset.colorSecondary || null),
  }

  const normalizedExtras = cloneSerializable(extras, {})
  const normalizedPackageId = String(packageId || `orbit-${asset.id}-${Date.now()}`)
  const packageData = {
    packageId: normalizedPackageId,
    packageType: ORBIT_PACKAGE_TYPE,
    schemaVersion: ORBIT_PACKAGE_SCHEMA_VERSION,
    format: ORBIT_PACKAGE_LEGACY_FORMAT,
    version: ORBIT_PACKAGE_SCHEMA_VERSION,
    sourceApp: 'OrbitAssets',
    exportedAt: new Date().toISOString(),
    asset: {
      id: String(asset.id),
      name: String(asset.name || asset.id),
      tag: asset.tag || null,
      icon: asset.icon || null,
    },
    assetId: String(asset.id),
    name: String(asset.name || asset.id),
    tag: asset.tag || null,
    icon: asset.icon || null,
    object: normalizedObject,
    extras: normalizedExtras,
    resizable: {
      widthM: normalizeAxisConfig(resizable.widthM, normalizedObject.widthM, 15),
      depthM: normalizeAxisConfig(resizable.depthM, normalizedObject.depthM, 15),
      heightM: normalizeAxisConfig(resizable.heightM, normalizedObject.heightM, 10),
    },
    preview: {
      icon: asset.icon || null,
      iconKey: String(asset.id),
    },
    render: render || {
      kind: 'procedural',
      assetId: String(asset.id),
    },
    capabilities: capabilities || {
      supportsPlacement: true,
      supportsResize: true,
      supportsPrimaryColor: true,
      supportsSecondaryColor: true,
      supportsShapeEditor: asset.id === 'grass' || asset.id === 'road',
    },
    provenance: {
      exportMode,
      packageId: normalizedPackageId,
    },
  }

  return packageData
}
