// CommonJS on purpose: the packaged package.json must not say "type": "module"
// (see the av-planner skeleton's packaging trap); this repo has no "type" at all.
module.exports = {
  appId: 'de.zumpelars.switcher-motion',
  productName: 'LZ Switcher Motion',
  copyright: `Copyright © ${new Date().getFullYear()} Lars Zumpe`,
  files: ['dist/**/*', 'package.json'],
  directories: { output: 'release' },
  mac: { target: [{ target: 'dmg', arch: ['universal'] }], category: 'public.app-category.video' },
  win: { target: ['nsis', 'portable'] },
  linux: { target: ['AppImage', 'deb'], category: 'AudioVideo', maintainer: 'Lars Zumpe' },
  nsis: { oneClick: false, allowToChangeInstallationDirectory: true },
  publish: [{ provider: 'github', owner: 'larszu', repo: 'lz-switcher-motion', releaseType: 'release' }],
}
