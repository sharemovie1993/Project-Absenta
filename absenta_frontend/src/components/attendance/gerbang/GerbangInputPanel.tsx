import React from 'react';
import { Send } from 'lucide-react';
import { Card, CardContent, Tabs, TabsList, TabsTrigger, TabsContent, Input, Button } from '../../ui';
import { SmartStudentPicker, type Student } from '../../common/SmartStudentPicker';
/**
 * Komponen presentational-only untuk input Gerbang (HID/QR/Face).
 * Tidak mengandung logic bisnis, efek, fetch, atau socket.
 * Semua keputusan dan handler berasal dari parent.
 */
export interface GerbangInputPanelProps {
  activeTab: 'HID' | 'QR' | 'FACE';
  onTabChange: (tab: 'HID' | 'QR' | 'FACE') => void;
  hidValue: string;
  onHidChange: (v: string) => void;
  onHidSubmit: (val?: string) => void;
  qrValue: string;
  onQrChange: (v: string) => void;
  onQrSubmit: () => void;
  faceLoading: boolean;
  onFaceVerify: () => void;
  onStudentSelect?: (student: Student) => void;
  disabled?: boolean;
}

export const GerbangInputPanel = React.memo(function GerbangInputPanel({
  activeTab,
  onTabChange,
  hidValue,
  onHidChange,
  onHidSubmit,
  qrValue,
  onQrChange,
  onQrSubmit,
  faceLoading,
  onFaceVerify,
  onStudentSelect,
  disabled,
}: GerbangInputPanelProps) {
  return (
    <Card className="mt-2">
      <CardContent>
        <Tabs value={activeTab} onValueChange={onTabChange as any}>
          <TabsList>
            <TabsTrigger value="HID">HID Keyboard</TabsTrigger>
            <TabsTrigger value="QR">Scan QR</TabsTrigger>
            <TabsTrigger value="FACE">Face Biometrik</TabsTrigger>
          </TabsList>
          <TabsContent value="HID">
            <div className="mt-2 flex items-center gap-2">
              <SmartStudentPicker
                className="w-full md:w-64"
                placeholder="ID / Nama / RFID Siswa"
                value={hidValue}
                onChange={onHidChange}
                onEnter={onHidSubmit}
                onSelect={(s) => {
                   if (onStudentSelect) onStudentSelect(s);
                   else onHidChange(s.id);
                }}
                disabled={!!disabled}
              />
              <Button 
                onClick={() => onHidSubmit(hidValue)} 
                disabled={!!disabled}
              >
                <Send className="w-4 h-4 mr-2" />
                Kirim
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="QR">
            <div className="mt-2 flex items-center gap-2">
              <Input
                className="w-full md:w-64 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
                placeholder="Token QR (opsional)"
                value={qrValue}
                onChange={(e) => onQrChange(e.target.value)}
                disabled={!!disabled}
              />
              <Button size="sm" variant="outline" onClick={onQrSubmit} disabled={!!disabled}>Mulai Scan / Submit</Button>
            </div>
          </TabsContent>
          <TabsContent value="FACE">
            <div className="mt-2 flex items-center justify-end gap-2">
              <Button size="sm" onClick={onFaceVerify} disabled={!!disabled || !!faceLoading}>Verifikasi & Tap</Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});
