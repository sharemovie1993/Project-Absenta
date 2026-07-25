package com.absenta.app.ui.features.cooperative

import android.content.Context
import android.content.Intent
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.widget.Toast
import androidx.core.content.FileProvider
import com.absenta.app.data.api.CoopTransaction
import java.io.File
import java.io.FileOutputStream

object ThermalSlipGenerator {

    fun generateAndShare(
        context: Context,
        savingName: String,
        memberNo: String,
        memberName: String,
        tx: CoopTransaction,
        coopName: String = "KOPERASI SEKOLAH",
        coopLegalNo: String = "",
        coopAddress: String = "",
        coopPhone: String = ""
    ) {
        try {
            // Width of 58mm in points: 58 / 25.4 * 72 = 164 points
            // Height is dynamic. We can make it 350 points.
            val pageWidth = 164
            val pageHeight = 350
            val pdfDocument = PdfDocument()
            val pageInfo = PdfDocument.PageInfo.Builder(pageWidth, pageHeight, 1).create()
            val page = pdfDocument.startPage(pageInfo)
            val canvas: Canvas = page.canvas

            val paintText = Paint().apply {
                color = Color.BLACK
                textSize = 6f
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.NORMAL)
            }

            val paintBold = Paint().apply {
                color = Color.BLACK
                textSize = 6.5f
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            }

            val paintHeader = Paint().apply {
                color = Color.BLACK
                textSize = 8f
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            }

            var y = 15f

            // Helper to draw centered text
            fun drawCentered(text: String, currentPaint: Paint) {
                val textWidth = currentPaint.measureText(text)
                val x = (pageWidth - textWidth) / 2
                canvas.drawText(text, x, y, currentPaint)
                y += currentPaint.textSize + 2.5f
            }

            // Draw Header
            drawCentered(coopName.uppercase(), paintHeader)
            if (coopLegalNo.isNotEmpty()) {
                drawCentered("BH: $coopLegalNo", paintText)
            }
            if (coopAddress.isNotEmpty()) {
                val chunks = coopAddress.chunked(30)
                chunks.forEach { drawCentered(it, paintText) }
            }
            if (coopPhone.isNotEmpty()) {
                drawCentered("Telp: $coopPhone", paintText)
            }

            // Divider line
            drawCentered("=========================", paintText)
            y += 2f

            // Transaction Info
            val isDeposit = tx.type == "DEPOSIT"
            val typeStr = if (isDeposit) "SETORAN TUNAI" else "PENARIKAN TUNAI"
            drawCentered(typeStr, paintBold)
            y += 4f

            canvas.drawText("No. Ref : ${tx.reference_no ?: "-"}", 6f, y, paintText)
            y += 8f
            canvas.drawText("Tanggal : ${tx.created_at.take(16).replace("T", " ")}", 6f, y, paintText)
            y += 8f
            canvas.drawText("Anggota : $memberNo", 6f, y, paintText)
            y += 8f
            val nameTrunc = if (memberName.length > 18) memberName.take(18) + ".." else memberName
            canvas.drawText("Nama    : $nameTrunc", 6f, y, paintText)
            y += 8f
            canvas.drawText("Rekening: $savingName", 6f, y, paintText)
            y += 8f

            drawCentered("-------------------------", paintText)
            y += 2f

            // Amount
            val amountVal = tx.amount?.toDoubleOrNull() ?: 0.0
            val amountStr = String.format("Rp %,.0f", amountVal)
            canvas.drawText("NOMINAL :", 6f, y, paintBold)
            val amtWidth = paintBold.measureText(amountStr)
            canvas.drawText(amountStr, pageWidth - 6f - amtWidth, y, paintBold)
            y += 12f

            // Terbilang
            canvas.drawText("Terbilang:", 6f, y, paintText)
            y += 8f
            val terbilangWords = TerbilangHelper.toIndonesianWords(amountVal)
            val wordsChunks = terbilangWords.chunked(25)
            wordsChunks.forEach {
                canvas.drawText(it, 10f, y, paintText)
                y += 8f
            }

            if (!tx.description.isNullOrBlank()) {
                val memoTrunc = if (tx.description.length > 25) tx.description.take(25) + ".." else tx.description
                canvas.drawText("Memo: $memoTrunc", 6f, y, paintText)
                y += 10f
            }

            drawCentered("-------------------------", paintText)
            y += 4f

            // Signatures
            canvas.drawText("Anggota,", 10f, y, paintText)
            canvas.drawText("Petugas,", pageWidth - 55f, y, paintText)
            y += 22f

            val signName = if (memberName.length > 12) memberName.take(12) + ".." else memberName
            canvas.drawText("($signName)", 6f, y, paintText)
            canvas.drawText("(  KASIR  )", pageWidth - 60f, y, paintText)
            y += 15f

            // Footer
            drawCentered("Terima Kasih", paintText)
            drawCentered("Simpanan Anda adalah", paintText)
            drawCentered("Investasi Masa Depan", paintText)

            pdfDocument.finishPage(page)

            // Save PDF to cache directory
            val cacheDir = context.cacheDir
            val pdfFile = File(cacheDir, "Slip_${tx.type}_${tx.id.take(8)}.pdf")
            val outputStream = FileOutputStream(pdfFile)
            pdfDocument.writeTo(outputStream)
            outputStream.flush()
            outputStream.close()
            pdfDocument.close()

            // Share PDF
            val authority = "com.absenta.app.fileprovider"
            val fileUri: Uri = FileProvider.getUriForFile(context, authority, pdfFile)

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(Intent.EXTRA_STREAM, fileUri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(shareIntent, "Cetak/Bagikan Struk"))

        } catch (e: Exception) {
            e.printStackTrace()
            Toast.makeText(context, "Gagal mencetak struk: ${e.localizedMessage}", Toast.LENGTH_LONG).show()
        }
    }
}
