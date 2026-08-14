export interface Participant {
  id: string;
  name: string;
  role: string;
  avatarColor: string;
  isHost: boolean;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isHandRaised?: boolean;
}

export interface ChatMessage {
  senderId?: string;
  sender: string;
  role?: string;
  text: string;
  time: string;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface VirtualMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomTitle?: string;
  roomId?: string;
}
