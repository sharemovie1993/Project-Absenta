PoE Splitter 5V
    │
    ├── 5V → WT32 pin 5V
    └── GND → WT32 GND

RC522
    │
    ├── SDA  → IO12
    ├── SCK  → IO14
    ├── MOSI → IO15
    ├── MISO → IO2
    ├── RST  → IO4
    ├── 3.3V → 3V3
    └── GND  → GND


Library Arduino IDE

Gunakan:

MFRC522 by GithubCommunity

dan Ethernet:

ETH.h bawaan ESP32

Alur Normal
Pertama kali
PC
 │
USB TTL
 │
WT32-ETH01

Upload firmware awal yang sudah mendukung OTA.

Berikutnya
Arduino IDE
     │
LAN
     │
WT32-ETH01

Upload langsung lewat jaringan.


Arsitektur yang Bagus
PoE Splitter
     │
Micro USB DIP
     │
WT32 (5V + GND)

CH340E
 ├── TX
 ├── RX
 └── GND



 PoE Switch
    │
LAN
    │
PoE Splitter
    ├── RJ45 → WT32 LAN
    └── Micro USB → CP2102
                         │
                         ├── 5V
                         ├── GND
                         ├── TX
                         └── RX
                              │
                             WT32