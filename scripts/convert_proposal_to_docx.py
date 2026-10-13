import os
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, hex_color):
    tcPr = cell._element.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{hex_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._element.get_or_add_tcPr()
    tcMar = parse_xml(
        f'<w:tcMar {nsdecls("w")}>'
        f'<w:top w:w="{top}" w:type="dxa"/>'
        f'<w:bottom w:w="{bottom}" w:type="dxa"/>'
        f'<w:left w:w="{left}" w:type="dxa"/>'
        f'<w:right w:w="{right}" w:type="dxa"/>'
        f'</w:tcMar>'
    )
    tcPr.append(tcMar)

def set_table_borders(table, color="D3D3D3", sz="4"):
    tblPr = table._element.xpath('w:tblPr')
    if tblPr:
        borders = parse_xml(
            f'<w:tblBorders {nsdecls("w")}>'
            f'<w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'<w:insideV w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
            f'</w:tblBorders>'
        )
        tblPr[0].append(borders)

def add_styled_paragraph(doc, text="", style='Normal', space_before=0, space_after=4, line_spacing=1.15, align=WD_ALIGN_PARAGRAPH.LEFT):
    p = doc.add_paragraph(style=style)
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    return p

def format_inlines(paragraph, text, default_color=RGBColor(38, 38, 38), default_size=Pt(11), default_font="Calibri"):
    # Splits text by markdown formatting (**bold**, *italic*, `code`)
    # Regex pattern to match bold (**...**), italic (*...*), or regular text
    tokens = re.split(r'(\*\*.*?\*\*|\*.*?\*|`.*?`)', text)
    for token in tokens:
        if not token:
            continue
        run = paragraph.add_run()
        run.font.name = default_font
        run.font.size = default_size
        run.font.color.rgb = default_color
        
        if token.startswith('**') and token.endswith('**') and len(token) >= 4:
            run.text = token[2:-2]
            run.bold = True
        elif token.startswith('*') and token.endswith('*') and len(token) >= 2:
            run.text = token[1:-1]
            run.italic = True
        elif token.startswith('`') and token.endswith('`') and len(token) >= 2:
            run.text = token[1:-1]
            run.font.name = "Consolas"
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(180, 40, 40)
        else:
            run.text = token

def create_proposal_docx(md_path, docx_path):
    doc = Document()
    
    # 1. Page Margins Setup (1 inch / 2.54 cm all around)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        
        # Add Page Numbering in Footer
        footer = section.footer
        f_p = footer.paragraphs[0]
        f_p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        f_run = f_p.add_run("Proposal Implementasi Platform Absenta — SMKN 1 Plered")
        f_run.font.name = "Calibri"
        f_run.font.size = Pt(9)
        f_run.font.italic = True
        f_run.font.color.rgb = RGBColor(128, 128, 128)

    # Styles definition
    styles = doc.styles
    normal_style = styles['Normal']
    normal_style.font.name = 'Calibri'
    normal_style.font.size = Pt(11)
    normal_style.font.color.rgb = RGBColor(38, 38, 38)
    
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    i = 0
    n = len(lines)
    
    # Colors
    NAVY = RGBColor(27, 54, 93)       # #1B365D - Formal Primary Navy
    SLATE = RGBColor(46, 117, 182)    # #2E75B6 - Heading 2
    DARK_GRAY = RGBColor(60, 60, 60)
    HEADER_FILL = "1B365D"            # Navy table header
    ZEBRA_FILL = "F2F5F9"             # Soft blue-gray row alternate
    BORDER_COLOR = "CBD5E1"           # Slate light border
    
    in_mermaid = False
    
    while i < n:
        raw_line = lines[i].rstrip('\r\n')
        line = raw_line.strip()
        
        # Skip empty lines
        if not line:
            i += 1
            continue
            
        # Mermaid code block detection
        if line.startswith('```mermaid'):
            in_mermaid = True
            mermaid_lines = []
            i += 1
            while i < n and not lines[i].strip().startswith('```'):
                mermaid_lines.append(lines[i].rstrip('\r\n'))
                i += 1
            i += 1 # skip ending ```
            in_mermaid = False
            
            # Render a stylized Flowchart Diagram Box in Word
            p_box = add_styled_paragraph(doc, space_before=6, space_after=2, align=WD_ALIGN_PARAGRAPH.CENTER)
            run_title = p_box.add_run("📊 DIAGRAM ALUR INTEGRASI PLATFORM ABSENTA (OTOMATIS & TERPADU)")
            run_title.bold = True
            run_title.font.name = "Calibri"
            run_title.font.size = Pt(10.5)
            run_title.font.color.rgb = NAVY
            
            # Diagram Table Representation
            diag_tbl = doc.add_table(rows=6, cols=3)
            diag_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
            set_table_borders(diag_tbl, color="B0C4DE", sz="6")
            
            flow_steps = [
                ("1. Gerbang Sekolah", "Siswa tap kartu / scan cepat saat tiba.", "⬇️ Otomatis Mengalir ke Jam KBM"),
                ("2. Kelas & Bengkel", "Guru buka HP, cukup verifikasi bangku kosong (10 detik).", "⬇️ Deteksi Anomali & Rekap Nilai"),
                ("3. Kesiswaan & BP/BK", "Alarm Dini (EWS) menyala jika siswa alpa 3 kali atau bolos.", "⬇️ Panggilan Preventif Sebelum Parah"),
                ("4. Praktik PKL di DUDI", "Siswa absen radius lokasi industri + kirim foto kerja harian.", "⬇️ Pembimbing DUDI Nilai via HP"),
                ("5. Sarpras & Bengkel", "Peminjaman alat kejuruan tercatat barcode peminjam aktif.", "⬇️ Alat Aman, Zero Kerugian Aset"),
                ("6. Kurikulum & Leger", "Perangkat ajar AI standar seragam + Leger Rapor 1-klik.", "✅ Selesai Otomatis Tanpa Catat Dobel")
            ]
            
            col_widths = [Inches(1.8), Inches(3.2), Inches(2.2)]
            for r_idx, (col1, col2, col3) in enumerate(flow_steps):
                row = diag_tbl.rows[r_idx]
                for c_idx, text in enumerate([col1, col2, col3]):
                    cell = row.cells[c_idx]
                    cell.width = col_widths[c_idx]
                    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                    set_cell_margins(cell, top=100, bottom=100, left=120, right=120)
                    bg = "F0F4F8" if r_idx % 2 == 0 else "FFFFFF"
                    set_cell_background(cell, bg)
                    p_cell = cell.paragraphs[0]
                    p_cell.paragraph_format.space_before = Pt(1)
                    p_cell.paragraph_format.space_after = Pt(1)
                    p_cell.paragraph_format.line_spacing = 1.05
                    r_text = p_cell.add_run(text)
                    r_text.font.name = "Calibri"
                    r_text.font.size = Pt(9.5)
                    if c_idx == 0:
                        r_text.bold = True
                        r_text.font.color.rgb = NAVY
                    elif c_idx == 2:
                        r_text.font.italic = True
                        r_text.font.color.rgb = RGBColor(30, 100, 30)
            
            doc.add_paragraph().paragraph_format.space_after = Pt(4)
            continue
            
        # Horizontal Rule (Divider)
        if line == '---':
            p = add_styled_paragraph(doc, space_before=4, space_after=6)
            run = p.add_run("_________________________________________________________________________________")
            run.font.name = "Calibri"
            run.font.size = Pt(8)
            run.font.color.rgb = RGBColor(190, 200, 210)
            i += 1
            continue
            
        # Header 1 (# ...)
        if line.startswith('# '):
            title_text = line[2:].strip().replace('📄 ', '')
            p = add_styled_paragraph(doc, space_before=10, space_after=3, align=WD_ALIGN_PARAGRAPH.CENTER)
            run = p.add_run(title_text)
            run.font.name = "Calibri"
            run.font.size = Pt(18)
            run.bold = True
            run.font.color.rgb = NAVY
            i += 1
            continue
            
        # Header 2 (## ...)
        if line.startswith('## '):
            subtitle_text = line[3:].strip()
            # If it's the subtitle right under title
            if "Solusi Terpadu" in subtitle_text:
                p = add_styled_paragraph(doc, space_before=0, space_after=12, align=WD_ALIGN_PARAGRAPH.CENTER)
                run = p.add_run(subtitle_text)
                run.font.name = "Calibri"
                run.font.size = Pt(12)
                run.font.color.rgb = DARK_GRAY
                run.italic = True
            else:
                p = add_styled_paragraph(doc, space_before=14, space_after=4)
                p.paragraph_format.keep_with_next = True
                run = p.add_run(subtitle_text)
                run.font.name = "Calibri"
                run.font.size = Pt(13.5)
                run.bold = True
                run.font.color.rgb = NAVY
            i += 1
            continue
            
        # Header 3 (### ...)
        if line.startswith('### '):
            h3_text = line[4:].strip()
            p = add_styled_paragraph(doc, space_before=10, space_after=3)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(h3_text)
            run.font.name = "Calibri"
            run.font.size = Pt(12)
            run.bold = True
            run.font.color.rgb = SLATE
            i += 1
            continue

        # Markdown Table Detection
        if line.startswith('|') and '|' in line[1:]:
            table_lines = []
            while i < n and lines[i].strip().startswith('|'):
                table_lines.append(lines[i].strip())
                i += 1
                
            if len(table_lines) >= 2:
                # Parse header
                header_raw = [c.strip() for c in table_lines[0].strip('|').split('|')]
                # Skip separator line (row 1)
                data_rows = []
                for row_line in table_lines[2:]:
                    row_cells = [c.strip() for c in row_line.strip('|').split('|')]
                    data_rows.append(row_cells)
                    
                table = doc.add_table(rows=len(data_rows) + 1, cols=len(header_raw))
                table.alignment = WD_TABLE_ALIGNMENT.CENTER
                set_table_borders(table, color=BORDER_COLOR, sz="4")
                
                # Format Header
                hdr_row = table.rows[0]
                trPr = hdr_row._tr.get_or_add_trPr()
                trPr.append(parse_xml(f'<w:tblHeader {nsdecls("w")}/>'))
                
                for col_idx, h_text in enumerate(header_raw):
                    cell = hdr_row.cells[col_idx]
                    set_cell_background(cell, HEADER_FILL)
                    set_cell_margins(cell, top=140, bottom=140, left=150, right=150)
                    cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                    p_hdr = cell.paragraphs[0]
                    p_hdr.paragraph_format.space_before = Pt(1)
                    p_hdr.paragraph_format.space_after = Pt(1)
                    p_hdr.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    format_inlines(p_hdr, h_text, default_color=RGBColor(255, 255, 255), default_size=Pt(10))
                    for r in p_hdr.runs:
                        r.bold = True
                        
                # Format Data Rows
                for row_idx, r_data in enumerate(data_rows):
                    row = table.rows[row_idx + 1]
                    bg_color = ZEBRA_FILL if row_idx % 2 == 1 else "FFFFFF"
                    for col_idx, c_text in enumerate(r_data):
                        if col_idx < len(row.cells):
                            cell = row.cells[col_idx]
                            set_cell_background(cell, bg_color)
                            set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
                            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                            p_cell = cell.paragraphs[0]
                            p_cell.paragraph_format.space_before = Pt(1)
                            p_cell.paragraph_format.space_after = Pt(1)
                            p_cell.paragraph_format.line_spacing = 1.15
                            
                            # Alignment: if it's paraf or short text, center
                            if "......." in c_text or len(c_text) < 5:
                                p_cell.alignment = WD_ALIGN_PARAGRAPH.CENTER
                            else:
                                p_cell.alignment = WD_ALIGN_PARAGRAPH.LEFT
                                
                            format_inlines(p_cell, c_text, default_color=RGBColor(38, 38, 38), default_size=Pt(9.5))
                            
                p_space = doc.add_paragraph()
                p_space.paragraph_format.space_after = Pt(4)
                continue
                
        # Bullet list item (* or -)
        if line.startswith('* ') or line.startswith('- '):
            bullet_text = line[2:].strip()
            p = add_styled_paragraph(doc, space_before=1, space_after=3)
            p.paragraph_format.left_indent = Inches(0.25)
            # Add bullet symbol
            run_b = p.add_run("•  ")
            run_b.bold = True
            run_b.font.color.rgb = NAVY
            format_inlines(p, bullet_text, default_color=RGBColor(38, 38, 38), default_size=Pt(10.5))
            i += 1
            continue
            
        # Numbered list item (1. 2. etc.)
        match_num = re.match(r'^(\d+)\.\s+(.*)', line)
        if match_num:
            num_str = match_num.group(1)
            num_text = match_num.group(2)
            p = add_styled_paragraph(doc, space_before=2, space_after=3)
            p.paragraph_format.left_indent = Inches(0.25)
            run_num = p.add_run(f"{num_str}.  ")
            run_num.bold = True
            run_num.font.color.rgb = NAVY
            format_inlines(p, num_text, default_color=RGBColor(38, 38, 38), default_size=Pt(10.5))
            i += 1
            continue

        # Sub-bullet with spaces or bold label
        if line.startswith('   - ') or line.startswith('  - '):
            sub_text = line.lstrip(' -').strip()
            p = add_styled_paragraph(doc, space_before=1, space_after=2)
            p.paragraph_format.left_indent = Inches(0.5)
            run_b = p.add_run("–  ")
            run_b.font.color.rgb = SLATE
            format_inlines(p, sub_text, default_color=RGBColor(50, 50, 50), default_size=Pt(10))
            i += 1
            continue
            
        # Document Metadata Box (Nomor Dokumen, Hal, Pengusul, Ditujukan Kepada)
        if line.startswith('**Nomor Dokumen:**') or line.startswith('**Hal:**') or line.startswith('**Pengusul:**') or line.startswith('**Ditujukan Kepada:**'):
            meta_lines = []
            while i < n and (lines[i].strip().startswith('**') or lines[i].strip().startswith('Yth.') or lines[i].strip().startswith('cc.')):
                meta_lines.append(lines[i].strip())
                i += 1
                
            meta_tbl = doc.add_table(rows=len(meta_lines), cols=1)
            meta_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
            set_table_borders(meta_tbl, color="B0C4DE", sz="6")
            for m_idx, m_text in enumerate(meta_lines):
                c = meta_tbl.rows[m_idx].cells[0]
                c.width = Inches(6.5)
                set_cell_background(c, "F6F9FC")
                set_cell_margins(c, top=60, bottom=60, left=150, right=150)
                p_m = c.paragraphs[0]
                p_m.paragraph_format.space_before = Pt(1)
                p_m.paragraph_format.space_after = Pt(1)
                format_inlines(p_m, m_text, default_color=RGBColor(30, 30, 30), default_size=Pt(10))
            doc.add_paragraph().paragraph_format.space_after = Pt(4)
            continue

        # Regular Paragraph
        p = add_styled_paragraph(doc, space_before=2, space_after=4, align=WD_ALIGN_PARAGRAPH.LEFT)
        format_inlines(p, line, default_color=RGBColor(38, 38, 38), default_size=Pt(11))
        i += 1

    # Save Word document
    doc.save(docx_path)
    print(f"[OK] Dokumen Word berhasil dibuat: {docx_path}")

if __name__ == "__main__":
    md_file = r"d:\BarayaProject\Project Absenta\docs\PROPOSAL_PENGAJUAN_PLATFORM_ABSENTA.md"
    docx_file = r"d:\BarayaProject\Project Absenta\docs\PROPOSAL_PENGAJUAN_PLATFORM_ABSENTA.docx"
    create_proposal_docx(md_file, docx_file)
