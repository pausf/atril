module.exports = {
  appId: 'dev.atril.app',
  productName: 'Atril',
  directories: { output: 'dist' },
  files: ['out/**', 'package.json'],
  asarUnpack: ['**/node_modules/node-pty/**'],
  npmRebuild: true,
  extraResources: [{ from: 'resources', to: '.' }],
  mac: {
    target: [
      { target: 'dmg', arch: ['arm64'] },
      { target: 'zip', arch: ['arm64'] }
    ],
    icon: 'build/icon.icns',
    hardenedRuntime: true,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: false,
    identity: process.env.ATRIL_SIGN_IDENTITY || '-'
  }
}
