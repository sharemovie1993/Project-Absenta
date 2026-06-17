package com.absenta.app.ui.features.cooperative

object TerbilangHelper {
    private val words = arrayOf("", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas")

    fun toIndonesianWords(number: Double): String {
        val num = number.toLong()
        if (num == 0L) return "Nol Rupiah"
        val result = terbilang(num).trim().replace("\\s+".toRegex(), " ")
        return if (result.isNotEmpty()) "$result Rupiah" else ""
    }

    private fun terbilang(num: Long): String {
        return when {
            num < 0L -> ""
            num < 12L -> words[num.toInt()]
            num < 20L -> terbilang(num - 10L) + " Belas"
            num < 100L -> words[(num / 10L).toInt()] + " Puluh " + terbilang(num % 10L)
            num < 200L -> "Seratus " + terbilang(num - 100L)
            num < 1000L -> words[(num / 100L).toInt()] + " Ratus " + terbilang(num % 100L)
            num < 2000L -> "Seribu " + terbilang(num - 1000L)
            num < 1000000L -> terbilang(num / 1000L) + " Ribu " + terbilang(num % 1000L)
            num < 1000000000L -> terbilang(num / 1000000L) + " Juta " + terbilang(num % 1000000L)
            num < 1000000000000L -> terbilang(num / 1000000000L) + " Miliar " + terbilang(num % 1000000000L)
            else -> ""
        }
    }
}
