# -*- mode: python ; coding: utf-8 -*-
#from fiduswriter.base import settings
from PyInstaller.utils.hooks import collect_submodules

#hidden_imports = []

#for l in settings.INSTALLED_APPS:
#    hidden_imports += collect_submodules(l)

#fw_modules = collect_submodules('document.urls')
#print("FW MODULES")
#print(fw_modules)
def extra_datas(mydir):
    print('extra_datas')
    def rec_glob(p, files):
        import os
        import glob
        for d in glob.glob(p):
            if os.path.isfile(d):
                files.append(d)
            rec_glob("%s/*" % d, files)
    files = []
    rec_glob("%s/*" % mydir, files)
    extra_datas = []
    print('files')
    print(files)
    for f in files:
        extra_datas.append((f, f))
    return extra_datas

a = Analysis(
    ['fiduswriter/manage.py'],
    pathex=[],
    binaries=[],
    #datas=[
    #    ('fiduswriter/version.txt', '.'),
    #    ('fiduswriter/document/fixtures/*', './document/fixtures/'),
    #],
    datas = extra_datas('fiduswriter'),
    hiddenimports=['document.urls'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='fiduswriter',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
coll = COLLECT(
    exe,
    a.binaries,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='fiduswriter',
)
