; =====================================================================
; ABSENTA ENTERPRISE WINDOWS INSTALLER WIZARD SCRIPT (INNO SETUP)
; Google Enterprise Standard & Native Windows GUI Wizard
; =====================================================================

#define MyAppName "Absenta School Engine"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "PT Baraya Project / HKI Protected"
#define MyAppURL "https://absenta.id"
#define MyAppExeName "AbsentaSetupEngine.exe"

[Setup]
AppId={{8A5C2B90-1234-4567-89AB-CDEF01234567}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\Absenta School Engine
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=Setup-Absenta-v1.0
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Files]
Source: "..\dist_windows_package\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\Launch Absenta Web Dashboard"; Filename: "http://localhost:{code:GetPort}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Code]
var
  ConfigPage: TInputQueryWizardPage;

procedure InitializeWizard;
begin
  // Create Custom GUI Wizard Page for .env Parameters
  ConfigPage := CreateInputQueryPage(wpSelectDir,
    'Konfigurasi Server Sekolah',
    'Masukkan informasi lisensi dan nama sekolah Anda',
    'Silakan isi form di bawah ini untuk mengonfigurasi file .env secara otomatis:');

  ConfigPage.Add('Nama Sekolah:', False);
  ConfigPage.Add('Kunci Lisensi (License Key):', False);
  ConfigPage.Add('Port Server (Default 5000):', False);

  // Set Default Values
  ConfigPage.Values[0] := 'SMK Negeri 1 Plered';
  ConfigPage.Values[1] := 'ABSENTA-ENTERPRISE-PROD-2026';
  ConfigPage.Values[2] := '5000';
end;

function GetPort(Param: String): String;
begin
  Result := ConfigPage.Values[2];
  if Result = '' then Result := '5000';
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  EnvContent: String;
  EnvFilePath: String;
begin
  if CurStep = ssPostInstall then
  begin
    // Generate .env File from Wizard Form Values
    EnvFilePath := ExpandConstant('{app}\.env');
    EnvContent := 'PORT=' + ConfigPage.Values[2] + #13#10 +
                  'HOST=0.0.0.0' + #13#10 +
                  'NODE_ENV=production' + #13#10 +
                  'DATABASE_URL="file:./prisma/dev.db"' + #13#10 +
                  'LICENSE_KEY="' + ConfigPage.Values[1] + '"' + #13#10 +
                  'SCHOOL_NAME="' + ConfigPage.Values[0] + '"' + #13#10 +
                  'SETUP_COMPLETED=true' + #13#10;
    
    SaveStringToFile(EnvFilePath, EnvContent, False);
  end;
end;

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Nyalakan {#MyAppName} Sekarang"; Flags: nowait postinstall skipifsilent
Filename: "http://localhost:{code:GetPort}"; Description: "Buka Dashboard Absenta di Browser"; Flags: shellexec postinstall skipifsilent
