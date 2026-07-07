# BUSINESS RULES - PDF GENERATOR

### 1. Resource Guard
- **Concurrency Limit**: Pemrosesan render PDF dibatasi maksimal 3 proses render paralel per worker node untuk mencegah kebocoran memori RAM server.
- **Font Availability**: Template HTML wajib menyertakan font lokal (Google Fonts embed) untuk menjamin konsistensi tata letak visual di OS server Linux maupun Windows.
