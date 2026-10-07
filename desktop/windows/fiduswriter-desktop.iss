; Inno Setup script for the Fidus Writer desktop application.
;
; This is the application installer. It installs the Tauri-built executable and
; registers the Fidus Writer file types so double-clicking a document opens the
; app. The MIME -> extension mappings and ProgIDs are copied verbatim from
; ../fiduswriter-file-types/windows/fiduswriter.iss so both packages stay
; consistent; that repository's standalone installer remains available for users
; who only want the file associations.
;
; Build on Windows with:
;
;     iscc desktop\windows\fiduswriter-desktop.iss
;
; Requires the application to have been built first (pnpm run tauri build in
; fiduswriter-desktop/), which produces
; src-tauri\target\release\bundle\nsis\ and the bundled exe.
;
; CAVEAT: Windows 8 and later protect the "default application" setting per
; user (UserChoice). Registering the ProgID makes Fidus Writer appear under
; "Open with", but Windows may not let the installer make it the default. Users
; can set that in Settings -> Apps -> Default apps.

#define AppName "Fidus Writer"
#define AppVersion "0.1.0"
#define AppPublisher "Fidus Writer Project"
#define AppURL "https://www.fiduswriter.org/"

; The real application executable, installed into {app}. `%1` is the document
; path the shell reads at startup (see src-tauri/src/files.rs).
#define OpenCommand "FidusWriter.exe"

; Where `pnpm run tauri build` leaves the release executable. Overridden by the
; CI job, which builds in its own workspace.
#ifndef AppBuildDir
  #define AppBuildDir "..\..\fiduswriter-desktop\src-tauri\target\release"
#endif

[Setup]
AppId={{7E2F9C51-6D3A-4B7E-9C1A-F1D6C5A4B3E2}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
AppPublisherURL={#AppURL}
DefaultDirName={autopf}\Fidus Writer
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputBaseFilename=fiduswriter-desktop-{#AppVersion}-setup
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible

[Files]
; The Tauri-built executable, its WebView2 bootstrapper and the bundled
; application resources.
Source: "{#AppBuildDir}\fiduswriter-desktop.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#AppBuildDir}\*.dll"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
; The frontend bundle: JS chunks, CSS, fonts, MathLive assets, the grammar
; engine and the 35 language packs. It is not optional — the app cannot start
; without it.
Source: "..\..\fiduswriter-desktop\dist-frontend\*"; DestDir: "{app}\dist-frontend"; Flags: ignoreversion recursesubdirs createallsubdirs
; Icon, referenced by the DefaultIcon registry rows below.
Source: "fiduswriter.ico"; DestDir: "{app}"; Flags: ignoreversion

[Registry]
; ---- .fidus ----
Root: HKCU; Subkey: "Software\Classes\.fidus"; ValueType: string; ValueName: ""; ValueData: "FidusWriter.Document"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\.fidus"; ValueType: string; ValueName: "Content Type"; ValueData: "application/vnd.fiduswriter+zip"
Root: HKCU; Subkey: "Software\Classes\.fidus"; ValueType: string; ValueName: "PerceivedType"; ValueData: "document"
Root: HKCU; Subkey: "Software\Classes\.fidus\OpenWithProgids"; ValueType: string; ValueName: "FidusWriter.Document"; ValueData: ""
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Document"; ValueType: string; ValueName: ""; ValueData: "Fidus Writer document"
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Document"; ValueType: string; ValueName: "FriendlyTypeName"; ValueData: "Fidus Writer document"
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Document\Application"; ValueType: string; ValueName: "ApplicationName"; ValueData: "Fidus Writer"
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Document\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\fiduswriter.ico,0"
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Document\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#OpenCommand}"" ""%1"""

; ---- .fidusbook ----
Root: HKCU; Subkey: "Software\Classes\.fidusbook"; ValueType: string; ValueName: ""; ValueData: "FidusWriter.Book"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\.fidusbook"; ValueType: string; ValueName: "Content Type"; ValueData: "application/vnd.fiduswriter.book+zip"
Root: HKCU; Subkey: "Software\Classes\.fidusbook"; ValueType: string; ValueName: "PerceivedType"; ValueData: "document"
Root: HKCU; Subkey: "Software\Classes\.fidusbook\OpenWithProgids"; ValueType: string; ValueName: "FidusWriter.Book"; ValueData: ""
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Book"; ValueType: string; ValueName: ""; ValueData: "Fidus Writer book"
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Book"; ValueType: string; ValueName: "FriendlyTypeName"; ValueData: "Fidus Writer book"
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Book\Application"; ValueType: string; ValueName: "ApplicationName"; ValueData: "Fidus Writer"
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Book\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\fiduswriter.ico,0"
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Book\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#OpenCommand}"" ""%1"""

; ---- .fidustemplate ----
Root: HKCU; Subkey: "Software\Classes\.fidustemplate"; ValueType: string; ValueName: ""; ValueData: "FidusWriter.Template"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\.fidustemplate"; ValueType: string; ValueName: "Content Type"; ValueData: "application/vnd.fiduswriter.template+zip"
Root: HKCU; Subkey: "Software\Classes\.fidustemplate"; ValueType: string; ValueName: "PerceivedType"; ValueData: "document"
Root: HKCU; Subkey: "Software\Classes\.fidustemplate\OpenWithProgids"; ValueType: string; ValueName: "FidusWriter.Template"; ValueData: ""
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Template"; ValueType: string; ValueName: ""; ValueData: "Fidus Writer document template"
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Template"; ValueType: string; ValueName: "FriendlyTypeName"; ValueData: "Fidus Writer document template"
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Template\Application"; ValueType: string; ValueName: "ApplicationName"; ValueData: "Fidus Writer"
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Template\DefaultIcon"; ValueType: string; ValueName: ""; ValueData: "{app}\fiduswriter.ico,0"
Root: HKCU; Subkey: "Software\Classes\FidusWriter.Template\shell\open\command"; ValueType: string; ValueName: ""; ValueData: """{app}\{#OpenCommand}"" ""%1"""

; ---- MIME -> extension mappings (canonical and legacy strings) ----
Root: HKCU; Subkey: "Software\Classes\MIME\Database\Content Type\application/vnd.fiduswriter+zip"; ValueType: string; ValueName: ""; ValueData: ".fidus"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\MIME\Database\Content Type\application/vnd.fiduswriter+zip"; ValueType: string; ValueName: "Extension"; ValueData: ".fidus"
Root: HKCU; Subkey: "Software\Classes\MIME\Database\Content Type\application/vnd.fiduswriter.book+zip"; ValueType: string; ValueName: ""; ValueData: ".fidusbook"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\MIME\Database\Content Type\application/vnd.fiduswriter.book+zip"; ValueType: string; ValueName: "Extension"; ValueData: ".fidusbook"
Root: HKCU; Subkey: "Software\Classes\MIME\Database\Content Type\application/vnd.fiduswriter.template+zip"; ValueType: string; ValueName: ""; ValueData: ".fidustemplate"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\MIME\Database\Content Type\application/vnd.fiduswriter.template+zip"; ValueType: string; ValueName: "Extension"; ValueData: ".fidustemplate"
Root: HKCU; Subkey: "Software\Classes\MIME\Database\Content Type\application/fidus+zip"; ValueType: string; ValueName: ""; ValueData: ".fidus"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\MIME\Database\Content Type\application/fidus+zip"; ValueType: string; ValueName: "Extension"; ValueData: ".fidus"
Root: HKCU; Subkey: "Software\Classes\MIME\Database\Content Type\application/fidusbook+zip"; ValueType: string; ValueName: ""; ValueData: ".fidusbook"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\MIME\Database\Content Type\application/fidusbook+zip"; ValueType: string; ValueName: "Extension"; ValueData: ".fidusbook"
Root: HKCU; Subkey: "Software\Classes\MIME\Database\Content Type\application/fidustemplate+zip"; ValueType: string; ValueName: ""; ValueData: ".fidustemplate"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\Classes\MIME\Database\Content Type\application/fidustemplate+zip"; ValueType: string; ValueName: "Extension"; ValueData: ".fidustemplate"

; ---- registration in Windows "Default apps" (Settings -> Apps) ----
Root: HKCU; Subkey: "Software\FidusWriter\Capabilities"; ValueType: string; ValueName: "ApplicationName"; ValueData: "Fidus Writer"; Flags: uninsdeletekey
Root: HKCU; Subkey: "Software\FidusWriter\Capabilities"; ValueType: string; ValueName: "ApplicationDescription"; ValueData: "Fidus Writer document editor"
Root: HKCU; Subkey: "Software\FidusWriter\Capabilities\FileAssociations"; ValueType: string; ValueName: ".fidus"; ValueData: "FidusWriter.Document"
Root: HKCU; Subkey: "Software\FidusWriter\Capabilities\FileAssociations"; ValueType: string; ValueName: ".fidusbook"; ValueData: "FidusWriter.Book"
Root: HKCU; Subkey: "Software\FidusWriter\Capabilities\FileAssociations"; ValueType: string; ValueName: ".fidustemplate"; ValueData: "FidusWriter.Template"
Root: HKCU; Subkey: "Software\RegisteredApplications"; ValueType: string; ValueName: "Fidus Writer"; ValueData: "Software\FidusWriter\Capabilities"; Flags: uninsdeletevalue

[Run]
Filename: "ie4uinit.exe"; Parameters: "-show"; Flags: runhidden skipifdoesntexist
