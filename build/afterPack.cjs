// Flip Electron fuses on the packaged binary to harden it:
//  - no RunAsNode / NODE_OPTIONS / --inspect: the exe cannot be turned into a plain Node runtime
//  - asar integrity validation + only-load-from-asar: a modified app bundle refuses to start
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses')
const path = require('path')

exports.default = async function afterPack(context) {
  const { electronPlatformName, appOutDir, packager } = context
  const productName = packager.appInfo.productFilename

  let target
  if (electronPlatformName === 'win32') {
    target = path.join(appOutDir, `${productName}.exe`)
  } else if (electronPlatformName === 'darwin') {
    target = path.join(appOutDir, `${productName}.app`)
  } else {
    target = path.join(appOutDir, packager.executableName || productName.toLowerCase())
  }

  await flipFuses(target, {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: electronPlatformName === 'darwin',
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true
  })

  console.log(`  • flipped Electron fuses  target=${path.relative(process.cwd(), target)}`)
}
