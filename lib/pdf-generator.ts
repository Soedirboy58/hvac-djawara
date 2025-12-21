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
  
  // Header with colored background
  drawBox(0, 0, 210, 40, colors.primary);
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("BERITA ACARA SERAH TERIMA", 105, 18, { align: "center" });
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("Laporan Pekerjaan Teknis", 105, 26, { align: "center" });
  
  doc.setFontSize(10);
  doc.text("HVAC Djawara Service", 105, 33, { align: "center" });
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  let yPos = 50;
  
  // Order Info Table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("INFORMASI PEKERJAAN", 20, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 5;
  
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
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("LAPORAN PEKERJAAN", 20, yPos);
  doc.setTextColor(0, 0, 0);
  yPos += 5;
  
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
      lineColor: colors.primary,
      lineWidth: 0.5,
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
    didParseCell: function(data) {
      // Color code kondisi and status
      if (data.cell.text && data.cell.text.length > 0) {
        const text = data.cell.text[0];
        if (text.includes('normal') || text.includes('selesai')) {
          data.cell.styles.textColor = colors.success;
        } else if (text.includes('kotor') || text.includes('perlu')) {
          data.cell.styles.textColor = colors.warning;
        }
      }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 10;
  

  
  // Spareparts Table with improved styling
  if (data.spareparts && data.spareparts.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("SPAREPART YANG DIGUNAKAN", 20, yPos);
    doc.setTextColor(0, 0, 0);
    yPos += 5;
    
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
        fillColor: colors.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
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
    
    // Section header
    drawBox(0, 0, 210, 15, colors.primary);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("DOKUMENTASI FOTO PEKERJAAN", 105, 10, { align: "center" });
    doc.setTextColor(0, 0, 0);
    
    yPos = 25;
    
    // Display photos in grid (2 columns) with border
    let col = 0;
    for (let i = 0; i < data.photos.length; i++) {
      const photo = data.photos[i];
      const caption = photoCaptions?.[i] || `Foto ${i + 1}`;
      
      const xPos = col === 0 ? 15 : 108;
      
      // Photo frame
      drawBox(xPos, yPos, 87, 70, [255, 255, 255], [200, 200, 200]);
      
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
      drawBox(xPos + 2, yPos + 58, 83, 10, [245, 245, 245]);
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
          drawBox(0, 0, 210, 15, colors.success);
          doc.setTextColor(255, 255, 255);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text("DOKUMENTASI FOTO PER UNIT", 105, 10, { align: "center" });
          doc.setTextColor(0, 0, 0);
          
          yPos = 25;
          hasUnitPhotos = true;
        }
        
        // Unit header with colored badge
        drawBox(15, yPos - 2, 180, 10, colors.light, colors.success);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
        doc.text(`Unit ${unitIdx + 1}: ${unit.nama_ruang || 'N/A'}`, 20, yPos + 4);
        doc.setTextColor(0, 0, 0);
        yPos += 15;
        
        // Display unit photos in 2x2 grid with frames
        let col = 0;
        for (let photoIdx = 0; photoIdx < unit.photos.length; photoIdx++) {
          const photo = unit.photos[photoIdx];
          const xPos = col === 0 ? 15 : 108;
          
          // Photo frame
          drawBox(xPos, yPos, 87, 70, [255, 255, 255], [180, 180, 180]);
          
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
            drawBox(xPos + 2, yPos + 58, 83, 10, [250, 250, 250]);
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
  
  // Signature section header
  drawBox(0, yPos - 5, 210, 12, colors.primary);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TANDA TANGAN", 105, yPos + 2, { align: "center" });
  doc.setTextColor(0, 0, 0);
  
  yPos += 10;
  
  // Create signature table
  const sigStartY = yPos;
  
  autoTable(doc, {
    startY: sigStartY,
    head: [["Pemilik/Penanggung Jawab", "Teknisi"]],
    body: [["", ""]],
    theme: "grid",
    headStyles: {
      fillColor: colors.light,
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineColor: colors.primary,
      lineWidth: 0.5,
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 5,
      minCellHeight: 40,
      lineColor: colors.primary,
      lineWidth: 0.5,
    },
    columnStyles: {
      0: { cellWidth: 95, halign: 'center' },
      1: { cellWidth: 85, halign: 'center' },
    },
    margin: { left: 15, right: 15 },
    tableWidth: 'auto',
    didDrawCell: function(data) {
      // Draw signatures in the body cells
      if (data.section === 'body' && data.row.index === 0) {
        if (data.column.index === 0 && signatureClient) {
          // Client signature (left)
          try {
            doc.addImage(signatureClient, "PNG", data.cell.x + 15, data.cell.y + 5, 60, 20);
          } catch (e) {
            console.error("Failed to add client signature:", e);
          }
          // Name below signature
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(signatureClientName || clientName || '', data.cell.x + data.cell.width / 2, data.cell.y + 32, { align: 'center' });
        } else if (data.column.index === 1 && signatureTechnician) {
          // Technician signature (right)
          try {
            doc.addImage(signatureTechnician, "PNG", data.cell.x + 15, data.cell.y + 5, 60, 20);
          } catch (e) {
            console.error("Failed to add technician signature:", e);
          }
          // Name below signature
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");
          doc.text(signatureTechnicianName || technicianName || '', data.cell.x + data.cell.width / 2, data.cell.y + 32, { align: 'center' });
        }
      }
    }
  });
  
  yPos = (doc as any).lastAutoTable.finalY + 5;
  
  // Date badge
  drawBox(15, yPos, 80, 8, colors.light, colors.primary);
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