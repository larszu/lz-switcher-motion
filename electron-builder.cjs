// CommonJS on purpose: the packaged package.json must not say "type": "module"
// (see the av-planner skeleton's packaging trap); this repo has no "type" at all.
module.exports = {
  appId: 'de.zumpelars.switcher-motion',
  productName: 'LZ Switcher Motion',
  copyright: `Copyright © ${new Date().getFullYear()} Lars Zumpe`,
  files: ['dist/**/*', 'package.json'],
  directories: { output: 'release' },
  mac: {
    category: 'public.app-category.video',
    target: [
      { target: 'dmg', arch: 'universal' },
      { target: 'zip', arch: 'universal' },
    ],
    // atem-connection pulls in @julusian/freetype2, which ships one prebuilt
    // binary per platform under prebuilds/ (picked by path at runtime). Both
    // halves of the universal build carry the same files; without this rule
    // @electron/universal aborts ("same in both x64 and arm64 builds").
    // Same fix as cable-planner (measured there, v8.3.3).
    x64ArchFiles: '**/prebuilds/*darwin*/**',
    // The freetype2 source tree is unpacked next to the asar; merging the two
    // asars builds one glob over all those paths and minimatch rejects it as
    // too long (cable-planner suite v0.1.1). Skip the merge.
    mergeASARs: false,
    // Ad-hoc signature: arm64 macOS refuses completely unsigned binaries.
    identity: '-',
    hardenedRuntime: false,
    gatekeeperAssess: false,
  },
  win: { target: ['nsis', 'portable'] },
  linux: { target: ['AppImage', 'deb'], category: 'AudioVideo', maintainer: 'Lars Zumpe' },
  nsis: { oneClick: false, allowToChangeInstallationDirectory: true },
  publish: [{ provider: 'github', owner: 'larszu', repo: 'lz-switcher-motion', releaseType: 'release' }],
}
