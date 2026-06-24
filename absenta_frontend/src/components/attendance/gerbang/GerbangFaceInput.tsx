import React from 'react';
import { RefreshCw } from 'lucide-react';
import { BiometricHudOverlay } from '../ai/BiometricHudOverlay';
import { SmartStudentPicker, type Student } from '../../common/SmartStudentPicker';
import { Button, Switch } from '../../ui';

interface VerificationData {
  success: boolean;
  duplicate?: boolean;
  score?: number;
  threshold?: number;
  message?: string;
  timestamp?: number;
}

interface IdentifiedStudentData {
  siswa_id?: string;
  id?: string;
  nama_siswa?: string;
  siswa_info?: {
    id?: string;
    nama?: string;
    foto_url?: string;
    nama_kelas?: string;
  };
  Kelas?: {
    nama_kelas?: string;
  };
}

interface GerbangFaceInputProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  currentDetections: unknown;
  displaySize: { width: number; height: number };
  isIdentifying: boolean;
  isFlashing: boolean;
  isAutoScanActive: boolean;
  setIsAutoScanActive: (val: boolean) => void;
  lastVerification: VerificationData | null;
  lastIdentifiedStudent: IdentifiedStudentData | null;
  inputDirection: 'GERBANG_DATANG' | 'GERBANG_PULANG';
  cameraFacing: 'environment' | 'user';
  onSwitchCamera: () => void;
  faceSiswaId: string;
  setFaceSiswaId: (val: string) => void;
  selectedFaceSiswaId: string;
  setSelectedFaceSiswaId: (val: string) => void;
  onSelectStudent: (student: Student) => void;
  handleFaceVerifyTap: () => void;
  tapSubmitting: boolean;
  handleFaceEnroll: () => void;
  enrollSubmitting: boolean;
}

const GerbangFaceInputComponent: React.FC<GerbangFaceInputProps> = ({
  videoRef,
  currentDetections,
  displaySize,
  isIdentifying,
  isFlashing,
  isAutoScanActive,
  setIsAutoScanActive,
  lastVerification,
  lastIdentifiedStudent,
  inputDirection,
  cameraFacing,
  onSwitchCamera,
  faceSiswaId,
  setFaceSiswaId,
  selectedFaceSiswaId,
  setSelectedFaceSiswaId,
  onSelectStudent,
  handleFaceVerifyTap,
  tapSubmitting,
  handleFaceEnroll,
  enrollSubmitting,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Mode Selection */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isAutoScanActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`}
            ></div>
            <span className="text-sm font-bold text-blue-800 dark:text-blue-300">
              Auto-Scan (Standby Mode)
            </span>
          </div>
          <Switch
            checked={isAutoScanActive}
            onCheckedChange={(val) => {
              setIsAutoScanActive(val);
              if (val) {
                setFaceSiswaId('');
                setSelectedFaceSiswaId('');
              }
            }}
          />
        </div>
        {!isAutoScanActive && (
          <div className="flex-1 pb-60 md:pb-0 z-[60]">
            <SmartStudentPicker
              value={faceSiswaId}
              onChange={setFaceSiswaId}
              onSelect={(s: Student) => {
                setSelectedFaceSiswaId(s.id);
                onSelectStudent(s);
              }}
              scope="global"
              placeholder="Scan 1:1: Cari siswa..."
            />
          </div>
        )}
      </div>

      {/* Camera Preview */}
      <div className="relative overflow-hidden rounded-xl bg-black w-full aspect-[4/3] shadow-2xl group border-4 border-gray-100 dark:border-gray-800">
        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-x-[-1]"
          muted
          playsInline
        />
        <BiometricHudOverlay
          detections={currentDetections}
          displaySize={displaySize}
          isGathering={isIdentifying}
        />

        {/* Flash Overlay */}
        {isFlashing && <div className="absolute inset-0 z-10 flash-overlay pointer-events-none" />}

        {/* Scanning Indicators */}
        {isAutoScanActive && (
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 items-start">
            <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 animate-in fade-in zoom-in duration-500">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
              <span className="text-[10px] font-black text-white tracking-widest uppercase">
                Autonomous Scanning Active
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-600/60 backdrop-blur-md px-2 py-1 rounded-full border border-blue-400/30 ml-2">
              <div className="i-lucide-cpu w-3 h-3 text-blue-200" />
              <span className="text-[9px] font-bold text-blue-100 uppercase">Browser AI Enabled</span>
            </div>
          </div>
        )}

        {/* SCREEN EDGE GLOW (Secondary Feedback) */}
        {lastVerification && Date.now() - (lastVerification.timestamp || 0) < 3000 && (
          <div
            className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-500 ring-[12px] ring-inset animate-edge-glow ${
              lastVerification.success ? 'ring-green-500/60' : 'ring-red-500/60'
            }`}
          />
        )}

        {/* PROMINENT IDENTIFIED STUDENT SUCCESS/FAIL CARD */}
        {lastVerification && Date.now() - (lastVerification.timestamp || 0) < 5000 && (
          <div className="absolute inset-x-0 bottom-6 z-50 px-6 animate-spring-up overflow-hidden">
            <div
              className={`backdrop-blur-3xl border-2 p-6 rounded-3xl shadow-[0_30px_70px_rgba(0,0,0,0.6)] flex flex-col items-center gap-4 text-center transition-all ${
                lastVerification.duplicate
                  ? 'bg-amber-600/40 border-amber-400/50'
                  : lastVerification.success
                  ? 'bg-green-600/40 border-green-400/50'
                  : 'bg-red-600/40 border-red-400/50'
              }`}
            >
              {/* Large Avatar / Status Icon */}
              <div className="relative">
                <div
                  className={`w-28 h-28 rounded-full border-4 flex items-center justify-center overflow-hidden shadow-2xl transition-transform duration-500 transform hover:scale-105 ${
                    lastVerification.duplicate
                      ? 'border-amber-400 bg-amber-500'
                      : lastVerification.success
                      ? 'border-green-400 bg-green-500'
                      : 'border-red-400 bg-red-500'
                  }`}
                >
                  {lastVerification.success && lastIdentifiedStudent?.siswa_info?.foto_url ? (
                    <img
                      src={lastIdentifiedStudent.siswa_info.foto_url}
                      alt="Siswa"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div
                      className={`${
                        lastVerification.success ? 'i-lucide-user' : 'i-lucide-user-minus'
                      } w-14 h-14 text-white opacity-80`}
                    />
                  )}
                </div>
                {/* Status Mini-Badge */}
                <div
                  className={`absolute -bottom-1 -right-1 w-10 h-10 rounded-full border-4 border-black/40 flex items-center justify-center shadow-lg ${
                    lastVerification.duplicate
                      ? 'bg-amber-500'
                      : lastVerification.success
                      ? 'bg-green-500'
                      : 'bg-red-500'
                  }`}
                >
                  {lastVerification.success ? (
                    <div className="i-lucide-check w-5 h-5 text-white stroke-[4]" />
                  ) : (
                    <div className="i-lucide-x w-5 h-5 text-white stroke-[4]" />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                {/* Personal Greeting */}
                <h3 className="text-white font-black text-2xl uppercase tracking-tighter leading-none">
                  {lastVerification.duplicate
                    ? 'SUDAH TEREKAM'
                    : lastVerification.success
                    ? inputDirection === 'GERBANG_DATANG'
                      ? 'Selamat Belajar!'
                      : 'Hati-hati di Jalan!'
                    : 'Wajah Tidak Dikenal'}
                </h3>
                <h4 className="text-white font-bold text-3xl mt-2 tracking-tight">
                  {lastVerification.success
                    ? lastIdentifiedStudent?.siswa_info?.nama ||
                      lastIdentifiedStudent?.nama_siswa ||
                      'STUDENT'
                    : lastVerification.message || 'COBA LAGI'}
                </h4>
                {lastVerification.success && (
                  <div className="flex items-center justify-center gap-3 text-white/80 text-sm font-black mt-2">
                    <span className="bg-white/20 px-3 py-1 rounded-full">
                      {lastIdentifiedStudent?.siswa_info?.nama_kelas ||
                        lastIdentifiedStudent?.Kelas?.nama_kelas ||
                        '---'}
                    </span>
                  </div>
                )}
              </div>

              {/* Match Percentage Progress Bar */}
              {lastVerification.score && (
                <div className="w-full max-w-[200px] mt-2">
                  <div className="flex justify-between items-center mb-1 px-1">
                    <span className="text-[10px] font-black text-white/60 tracking-widest uppercase">
                      Similarity
                    </span>
                    <span className="text-[10px] font-black text-white bg-white/10 px-1.5 rounded">
                      {(lastVerification.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        lastVerification.success ? 'bg-green-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${lastVerification.score * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Premium Scan Overlay Mask */}
        <div
          className={`absolute inset-x-12 top-1/6 bottom-1/6 border-2 rounded-[48px] pointer-events-none transition-all duration-300 ${
            isIdentifying ? 'border-yellow-400/50 scale-[1.02]' : 'border-white/15'
          }`}
        >
          <div
            className={`absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 rounded-tl-[44px] ${
              isIdentifying ? 'border-yellow-400 shadow-[0_0_15px_#facc15]' : 'border-blue-400'
            }`}
          ></div>
          <div
            className={`absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 rounded-tr-[44px] ${
              isIdentifying ? 'border-yellow-400 shadow-[0_0_15px_#facc15]' : 'border-blue-400'
            }`}
          ></div>
          <div
            className={`absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 rounded-bl-[44px] ${
              isIdentifying ? 'border-yellow-400 shadow-[0_0_15px_#facc15]' : 'border-blue-400'
            }`}
          ></div>
          <div
            className={`absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 rounded-br-[44px] ${
              isIdentifying ? 'border-yellow-400 shadow-[0_0_15px_#facc15]' : 'border-blue-400'
            }`}
          ></div>

          {/* Moving Laser Line */}
          <div
            className={`absolute top-0 left-4 right-4 h-1 bg-gradient-to-r from-transparent to-transparent animate-scan ${
              isIdentifying
                ? 'via-yellow-400 shadow-[0_0_25px_#facc15]'
                : 'via-blue-400 shadow-[0_0_25px_#60a5fa]'
            }`}
          ></div>

          {/* Processing Label */}
          {isIdentifying && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-yellow-500/20 backdrop-blur-md px-6 py-2 rounded-full border border-yellow-400/30 animate-pulse">
                <span className="text-yellow-400 font-black text-[10px] uppercase tracking-[0.3em] shadow-black drop-shadow-lg">
                  Mengidentifikasi...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Camera Switch */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={onSwitchCamera}
            className="bg-black/40 backdrop-blur-md text-white p-2.5 rounded-full border border-white/20 hover:bg-black/60 transition-all opacity-50 hover:opacity-100"
            type="button"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Manual Controls Below Camera (Only in 1:1 mode) */}
      {!isAutoScanActive && (
        <div className="flex gap-3">
          <Button
            onClick={handleFaceVerifyTap}
            isLoading={tapSubmitting}
            disabled={!selectedFaceSiswaId}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-xl shadow-lg shadow-blue-500/20"
          >
            AMBIL FOTO & VERIFIKASI
          </Button>
          <Button
            onClick={handleFaceEnroll}
            isLoading={enrollSubmitting}
            disabled={!selectedFaceSiswaId}
            variant="outline"
            className="px-6 font-black h-14 rounded-xl border-gray-200"
          >
            REKAM ULANG
          </Button>
        </div>
      )}

      {isAutoScanActive && (
        <div className="text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">
            Sistem siap mengenali wajah secara otomatis...
          </p>
        </div>
      )}
    </div>
  );
};

GerbangFaceInputComponent.displayName = 'GerbangFaceInput';
export const GerbangFaceInput = React.memo(GerbangFaceInputComponent);
