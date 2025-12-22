import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Helper to load image as base64
function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      } else {
        reject(new Error("Failed to get canvas context"));
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

interface WorkLogData {
  order_number?: string;
  orderNumber?: string;
  service_title?: string;
  serviceTitle?: string;
  client_name?: string;
  clientName?: string;
  location?: string;
  scheduled_date?: string;
  scheduledDate?: string;
  technician_name?: string;
  technicianName?: string;
  
  // Conditional work type
  work_type?: string;
  check_type?: string;
  ac_units_data?: Array<{
    nama_ruang?: string;
    merk_ac?: string;
    kapasitas_ac?: string;
    daya_listrik?: string;
    kondisi_compressor?: string;
    kondisi_evaporator?: string;
    kondisi_condenser?: string;
    suhu_ruangan?: string;
    suhu_supply?: string;
    suhu_return?: string;
    catatan?: string;
  }>;
  maintenance_units_data?: Array<{
    id?: string;
    nama_ruang?: string;
    merk_ac?: string;
    kapasitas_ac?: string;
    kondisi_ac?: string;
    status_ac?: string;
    catatan_rekomendasi?: string;
    photos?: Array<{ preview: string; caption?: string }>;
  }>;
  
  // Traditional fields (for troubleshooting/instalasi/lain-lain)
  problem?: string;
  tindakan?: string;
  rincian_pekerjaan?: string;
  rincian_kerusakan?: string;
  catatan_rekomendasi?: string;
  lama_kerja?: number;
  jarak_tempuh?: number;
  
  spareparts?: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;
  photos?: string[];
  photo_captions?: string[];
  photoCaptions?: string[];
  signature_technician?: string;
  signatureTechnician?: string;
  signature_client?: string;
  signatureClient?: string;
  signature_technician_name?: string;
  signatureTechnicianName?: string;
  signature_client_name?: string;
  signatureClientName?: string;
  signature_date?: string;
  signatureDate?: string;
}

export async function generateTechnicalReportPDF(data: WorkLogData): Promise<Blob> {
  const doc = new jsPDF();
  
  // Color palette
  const colors = {
    primary: [41, 128, 185] as [number, number, number],      // Blue
    success: [39, 174, 96] as [number, number, number],        // Green
    warning: [243, 156, 18] as [number, number, number],       // Orange
    danger: [231, 76, 60] as [number, number, number],         // Red
    dark: [44, 62, 80] as [number, number, number],            // Dark blue-gray
    light: [236, 240, 241] as [number, number, number],        // Light gray
    border: [200, 200, 200] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };
  
  // Normalize field names (support both snake_case and camelCase)
  const orderNumber = data.order_number || data.orderNumber || 'N/A';
  const serviceTitle = data.service_title || data.serviceTitle || 'N/A';
  const clientName = data.client_name || data.clientName || 'N/A';
  const location = data.location || 'N/A';
  const scheduledDate = data.scheduled_date || data.scheduledDate || new Date().toISOString();
  const technicianName = data.technician_name || data.technicianName || 'N/A';
  const signatureTechnician = data.signature_technician || data.signatureTechnician;
  const signatureClient = data.signature_client || data.signatureClient;
  const signatureTechnicianName = data.signature_technician_name || data.signatureTechnicianName;
  const signatureClientName = data.signature_client_name || data.signatureClientName;
  const signatureDate = data.signature_date || data.signatureDate;
  const photoCaptions = data.photo_captions || data.photoCaptions;
  
  // Helper function to draw colored box
  const drawBox = (x: number, y: number, width: number, height: number, fillColor: number[], borderColor?: number[]) => {
    doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
    if (borderColor) {
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.setLineWidth(0.5);
    }
    doc.rect(x, y, width, height, borderColor ? 'FD' : 'F');
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  const contentLeft = 15;
  const contentRight = 15;
  const contentWidth = pageWidth - contentLeft - contentRight;

  const drawSectionTitle = (title: string, y: number) => {
    // Consistent, clean heading: small left accent bar + text (no lines crossing the title)
    drawBox(contentLeft, y - 5, 3, 6, colors.primary);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(colors.dark[0], colors.dark[1], colors.dark[2]);
    doc.text(title, contentLeft + 6, y);
    doc.setTextColor(0, 0, 0);
  };

  const drawSignaturePanel = (opts: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    signatureDataUrl?: string;
    name?: string;
  }) => {
    const { x, y, width, height, title, signatureDataUrl, name } = opts;

    // outer border
    drawBox(x, y, width, height, colors.white, colors.border);

    // header strip
    drawBox(x, y, width, 10, colors.light, colors.border);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(title, x + width / 2, y + 7, { align: "center" });

    // signature area
    const sigBoxX = x + 6;
    const sigBoxY = y + 12;
    const sigBoxW = width - 12;
    const sigBoxH = height - 22;

    // faint guide line when empty
    if (!signatureDataUrl) {
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.3);
      doc.line(sigBoxX + 10, sigBoxY + sigBoxH / 2, sigBoxX + sigBoxW - 10, sigBoxY + sigBoxH / 2);
    } else {
      try {
        // Fit signature into box while keeping a stable visual size
        const imgW = Math.min(50, sigBoxW);
        const imgH = 14;
        const imgX = sigBoxX + (sigBoxW - imgW) / 2;
        const imgY = sigBoxY + 6;
        doc.addImage(signatureDataUrl, "PNG", imgX, imgY, imgW, imgH);
      } catch (e) {
        console.error("Failed to add signature image:", e);
      }
    }

    // name
    const displayName = (name || "").trim();
    if (displayName) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      const nameLines = doc.splitTextToSize(displayName, width - 10);
      doc.text(nameLines.slice(0, 2), x + width / 2, y + height - 4, { align: "center" });
    }
  };
  
  // Header (more compact & professional)
  drawBox(0, 0, pageWidth, 22, colors.dark);
  drawBox(0, 22, pageWidth, 2, colors.primary);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("BERITA ACARA SERAH TERIMA", pageWidth / 2, 10, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Laporan Pekerjaan Teknis", pageWidth / 2, 16, { align: "center" });

  doc.setTextColor(0, 0, 0);

  let yPos = 34;
  
  // Order Info Table
  drawSectionTitle("INFORMASI PEKERJAAN", yPos);
  yPos += 4;
  
  autoTable(doc, {
    startY: yPos,
    body: [
      ["No. Order", orderNumber, "Lokasi", location],
      ["Layanan", serviceTitle, "Tanggal", new Date(scheduledDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' })],
      ["Klien", clientName, "Teknisi", technicianName],
    ],
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: colors.border,
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28, fillColor: colors.light },
      1: { cellWidth: 52 },
      2: { fontStyle: 'bold', cellWidth: 22, fillColor: colors.light },
      3: { cellWidth: 78 },
    },
    margin: { left: 15, right: 15 },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  
  // Laporan Pekerjaan Section
  drawSectionTitle("LAPORAN PEKERJAAN", yPos);
  yPos += 4;
  
  // Prepare table data based on work type
  let tableData: any[][] = [];
  
  // Jenis Pekerjaan - use rincian_pekerjaan if available, else map work_type
  const workTypeLabel = data.rincian_pekerjaan || 
                       (data.work_type === 'pemeliharaan' ? 'Pemeliharaan AC' :
                        data.work_type === 'pengecekan' ? 'Pengecekan Performa AC' :
                        data.work_type === 'troubleshooting' ? 'Troubleshooting' :
                        data.work_type === 'instalasi' ? 'Instalasi AC' : 'Lain-lain');
  tableData.push(["Jenis Pekerjaan", workTypeLabel]);
  
  // Rincian Pekerjaan for PEMELIHARAAN (unit details)
  if (data.work_type === 'pemeliharaan' && data.maintenance_units_data && data.maintenance_units_data.length > 0) {
    let unitsText = "";
    data.maintenance_units_data.forEach((unit, idx) => {
      unitsText += `\nUnit ${idx + 1}: ${unit.nama_ruang || 'N/A'}`;
      unitsText += `\n  • Merk: ${unit.merk_ac || 'N/A'}, Kapasitas: ${unit.kapasitas_ac || 'N/A'}`;
      unitsText += `\n  • Kondisi AC: ${unit.kondisi_ac || 'N/A'}`;
      unitsText += `\n  • Status: ${unit.status_ac || 'N/A'}`;
      if (unit.catatan_rekomendasi) {
        unitsText += `\n  • Catatan: ${unit.catatan_rekomendasi}`;
      }
      if (idx < data.maintenance_units_data!.length - 1) unitsText += "\n";
    });
    tableData.push(["Rincian Pekerjaan", unitsText.trim()]);
  }
  
  // Rincian Pekerjaan for PENGECEKAN PERFORMA (unit details)
  if (data.work_type === 'pengecekan' && data.check_type === 'performa' && data.ac_units_data && data.ac_units_data.length > 0) {
    let unitsText = "";
    data.ac_units_data.forEach((unit, idx) => {
      unitsText += `\nUnit ${idx + 1}: ${unit.nama_ruang || 'N/A'}`;
      unitsText += `\n  • Merk: ${unit.merk_ac || 'N/A'}, Kapasitas: ${unit.kapasitas_ac || 'N/A'}`;
      unitsText += `\n  • Daya: ${unit.daya_listrik || 'N/A'}`;
      unitsText += `\n  • Kondisi - Compressor: ${unit.kondisi_compressor || 'N/A'}, Evaporator: ${unit.kondisi_evaporator || 'N/A'}, Condenser: ${unit.kondisi_condenser || 'N/A'}`;
      unitsText += `\n  • Suhu - Ruangan: ${unit.suhu_ruangan || 'N/A'}°C, Supply: ${unit.suhu_supply || 'N/A'}°C, Return: ${unit.suhu_return || 'N/A'}°C`;
      if (unit.catatan) {
        unitsText += `\n  • Catatan: ${unit.catatan}`;
      }
      if (idx < data.ac_units_data!.length - 1) unitsText += "\n";
    });
    tableData.push(["Rincian Pekerjaan", unitsText.trim()]);
  }
  
  // Problem - ALWAYS show if exists
  tableData.push(["Problem", data.problem || "-"]);
  
  // Tindakan - ALWAYS show if exists  
  tableData.push(["Tindakan", data.tindakan || "-"]);
  
  // Rincian Kerusakan AC - ALWAYS show if exists
  tableData.push(["Rincian Kerusakan AC", data.rincian_kerusakan || "-"]);
  
  // Waktu & Tanggal pengerjaan
  if (data.lama_kerja || data.jarak_tempuh) {
    let waktuText = "";
    if (data.lama_kerja) waktuText += `Lama Kerja: ${data.lama_kerja} jam`;
    if (data.jarak_tempuh) waktuText += waktuText ? ` | Jarak: ${data.jarak_tempuh} km` : `Jarak Tempuh: ${data.jarak_tempuh} km`;
    tableData.push(["Waktu & Tanggal Pengerjaan", waktuText]);
  }
  
  // Catatan/Rekomendasi (general, not unit-specific)
  if (data.catatan_rekomendasi) {
    tableData.push(["Catatan / Rekomendasi", data.catatan_rekomendasi]);
  }
  
  // Create table (ALWAYS - we now have at least work_type)
  autoTable(doc, {
    startY: yPos,
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: colors.border,
      lineWidth: 0.3,
    },
    columnStyles: {
      0: { 
        fontStyle: 'bold', 
        cellWidth: 50, 
        fillColor: colors.light,
        valign: 'top'
      },
      1: { 
        cellWidth: 130,
        valign: 'top'
      },
    },
    margin: { left: 15, right: 15 },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  

  
  // Spareparts Table with improved styling
  if (data.spareparts && data.spareparts.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    drawSectionTitle("SPAREPART YANG DIGUNAKAN", yPos);
    yPos += 4;
    
    autoTable(doc, {
      startY: yPos,
      head: [["No", "Nama Sparepart", "Jumlah", "Satuan", "Keterangan"]],
      body: data.spareparts.map((sp, idx) => [
        (idx + 1).toString(),
        sp.name,
        sp.quantity.toString(),
        sp.unit,
        sp.notes || "-",
      ]),
      theme: "grid",
      headStyles: { 
        fillColor: colors.dark,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: colors.border,
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 70 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 25 },
        4: { cellWidth: 50 },
      },
      margin: { left: 15, right: 15 },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Photo Documentation with improved layout
  if (data.photos && data.photos.length > 0) {
    doc.addPage();
    yPos = 20;
    
    // Section header (compact)
    drawBox(0, 0, pageWidth, 16, colors.dark);
    drawBox(0, 16, pageWidth, 2, colors.primary);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("DOKUMENTASI FOTO PEKERJAAN", pageWidth / 2, 11, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    yPos = 24;
    
    // Display photos in grid (2 columns) with border
    let col = 0;
    for (let i = 0; i < data.photos.length; i++) {
      const photo = data.photos[i];
      const caption = photoCaptions?.[i] || `Foto ${i + 1}`;
      
      const xPos = col === 0 ? 15 : 108;
      
      // Photo frame
      drawBox(xPos, yPos, 87, 70, colors.white, colors.border);
      
      try {
        // Try to add image (may fail for some formats)
        await loadImage(photo).then((img) => {
          doc.addImage(img, "JPEG", xPos + 2, yPos + 2, 83, 55);
        }).catch(() => {
          // If image load fails, show placeholder
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text("Foto tidak dapat dimuat", xPos + 43.5, yPos + 30, { align: "center" });
          doc.setTextColor(0, 0, 0);
        });
      } catch (e) {
        console.error("Failed to add photo:", e);
      }
      
      // Caption with background
      drawBox(xPos + 2, yPos + 58, 83, 10, colors.light);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const captionLines = doc.splitTextToSize(caption, 80);
      const captionText = captionLines.length > 2 ? captionLines.slice(0, 2) : captionLines;
      doc.text(captionText, xPos + 43.5, yPos + 62, { align: "center" });
      
      col++;
      if (col >= 2) {
        col = 0;
        yPos += 78;
        
        // New page if needed
        if (yPos > 210) {
          doc.addPage();
          yPos = 20;
        }
      }
    }
    
    if (col > 0) yPos += 78; // Add space if last row not complete
  }
  
  // Add photos from maintenance units (per-unit photos) with improved layout
  if (data.work_type === 'pemeliharaan' && data.maintenance_units_data) {
    let hasUnitPhotos = false;
    
    for (let unitIdx = 0; unitIdx < data.maintenance_units_data.length; unitIdx++) {
      const unit = data.maintenance_units_data[unitIdx];
      if (unit.photos && unit.photos.length > 0) {
        if (!hasUnitPhotos) {
          doc.addPage();
          yPos = 20;
          
          // Section header
          drawBox(0, 0, pageWidth, 16, colors.dark);
          drawBox(0, 16, pageWidth, 2, colors.success);
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(11);
          doc.text("DOKUMENTASI FOTO PER UNIT", pageWidth / 2, 11, { align: "center" });
          doc.setTextColor(0, 0, 0);
          
          yPos = 24;
          hasUnitPhotos = true;
        }
        
        // Unit header with colored badge
        drawBox(contentLeft, yPos - 2, contentWidth, 10, colors.light, colors.success);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
        doc.text(`Unit ${unitIdx + 1}: ${unit.nama_ruang || 'N/A'}`, contentLeft + 5, yPos + 4);
        doc.setTextColor(0, 0, 0);
        yPos += 15;
        
        // Display unit photos in 2x2 grid with frames
        let col = 0;
        for (let photoIdx = 0; photoIdx < unit.photos.length; photoIdx++) {
          const photo = unit.photos[photoIdx];
          const xPos = col === 0 ? 15 : 108;
          
          // Photo frame
          drawBox(xPos, yPos, 87, 70, colors.white, colors.border);
          
          try {
            await loadImage(photo.preview).then((img) => {
              doc.addImage(img, "JPEG", xPos + 2, yPos + 2, 83, 55);
            }).catch(() => {
              doc.setFontSize(8);
              doc.setTextColor(150, 150, 150);
              doc.text("Foto tidak dapat dimuat", xPos + 43.5, yPos + 30, { align: "center" });
              doc.setTextColor(0, 0, 0);
            });
          } catch (e) {
            console.error("Failed to add unit photo:", e);
          }
          
          // Caption with background
          if (photo.caption) {
            drawBox(xPos + 2, yPos + 58, 83, 10, colors.light);
            doc.setFontSize(7);
            doc.setFont("helvetica", "normal");
            const captionLines = doc.splitTextToSize(photo.caption, 80);
            const captionText = captionLines.length > 2 ? captionLines.slice(0, 2) : captionLines;
            doc.text(captionText, xPos + 43.5, yPos + 62, { align: "center" });
          }
          
          col++;
          if (col >= 2) {
            col = 0;
            yPos += 78;
            
            if (yPos > 210) {
              doc.addPage();
              yPos = 20;
            }
          }
        }
        
        if (col > 0) yPos += 78;
        yPos += 5; // Space between units
      }
    }
  }
  
  // Signatures Table
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }
  
  // Signature section title
  drawSectionTitle("TANDA TANGAN", yPos);
  yPos += 6;
  
  // Two-column signature panels (manual layout for reliable spacing)
  const panelGap = 8;
  const panelWidth = (contentWidth - panelGap) / 2;
  const panelHeight = 38;
  const panelY = yPos;

  drawSignaturePanel({
    x: contentLeft,
    y: panelY,
    width: panelWidth,
    height: panelHeight,
    title: "Pemilik/Penanggung Jawab",
    signatureDataUrl: signatureClient,
    name: signatureClientName || clientName || "",
  });

  drawSignaturePanel({
    x: contentLeft + panelWidth + panelGap,
    y: panelY,
    width: panelWidth,
    height: panelHeight,
    title: "Teknisi",
    signatureDataUrl: signatureTechnician,
    name: signatureTechnicianName || technicianName || "",
  });

  yPos = panelY + panelHeight + 6;
  
  // Date badge
  drawBox(15, yPos, 80, 8, colors.light, colors.border);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`Tanggal: ${signatureDate ? new Date(signatureDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' }) : ""}`, 55, yPos + 5, { align: "center" });
  
  // Footer note
  yPos += 15;
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("Dokumen ini dibuat secara elektronik dan sah tanpa tanda tangan basah", 105, yPos, { align: "center" });
  doc.setTextColor(0, 0, 0);
  
  // Footer with page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      105,
      290,
      { align: "center" }
    );
  }
  
  return doc.output("blob");
}