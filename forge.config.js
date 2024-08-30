module.exports = {
  packagerConfig: {
    icon: 'icon',
    extendInfo: {
      CFBundleDocumentTypes: [
      {
        CFBundleTypeExtensions: ["glide"],
        CFBundleTypeName: "Glide File",
        CFBundleTypeIconFile: "electron.icns",
        CFBundleTypeRole: "Editor",
        LSHandlerRank: "Owner",
        LSItemContentTypes: ["public.html"]
      }
      ]
    },
  },
  rebuildConfig: {},
  makers: [
  {
    name: '@electron-forge/maker-squirrel',
    config: {},
  },
  {
    name: '@electron-forge/maker-zip',
    platforms: ['darwin'],
  },
  {
    name: '@electron-forge/maker-deb',
    config: {},
  },
  {
    name: '@electron-forge/maker-rpm',
    config: {},
  },
  ],
};
