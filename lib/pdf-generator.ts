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
  
  // Order Info Card
  drawBox(15, yPos - 3, 180, 42, colors.light, colors.primary);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("📋 INFORMASI PEKERJAAN", 20, yPos + 3);
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  
  // Left column
  doc.setFont("helvetica", "bold");
  doc.text("No. Order", 20, yPos + 11);
  doc.text("Layanan", 20, yPos + 18);
  doc.text("Klien", 20, yPos + 25);
  
  doc.setFont("helvetica", "normal");
  doc.text(`: ${orderNumber}`, 50, yPos + 11);
  doc.text(`: ${serviceTitle}`, 50, yPos + 18);
  doc.text(`: ${clientName}`, 50, yPos + 25);
  
  // Right column
  doc.setFont("helvetica", "bold");
  doc.text("Lokasi", 110, yPos + 11);
  doc.text("Tanggal", 110, yPos + 18);
  doc.text("Teknisi", 110, yPos + 25);
  
  doc.setFont("helvetica", "normal");
  const locationText = location.length > 30 ? location.substring(0, 30) + '...' : location;
  doc.text(`: ${locationText}`, 130, yPos + 11);
  doc.text(`: ${new Date(scheduledDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'short', year: 'numeric' })}`, 130, yPos + 18);
  doc.text(`: ${technicianName}`, 130, yPos + 25);
  
  yPos += 50;
  
  // Technical Details - Conditional based on work_type
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("🔧 DETAIL PEKERJAAN", 20, yPos);
  yPos += 8;
  doc.setTextColor(0, 0, 0);
  
  // Handle PEMELIHARAAN work type with visual cards
  if (data.work_type === 'pemeliharaan' && data.maintenance_units_data && data.maintenance_units_data.length > 0) {
    for (let i = 0; i < data.maintenance_units_data.length; i++) {
      const unit = data.maintenance_units_data[i];
      
      if (yPos > 240) {
        doc.addPage();
        yPos = 20;
      }
      
      // Unit card with colored header
      const cardHeight = 45;
      drawBox(15, yPos - 2, 180, cardHeight, [250, 250, 255], colors.primary);
      
      // Unit header
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(15, yPos - 2, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(`🏢 Unit ${i + 1}: ${unit.nama_ruang || 'N/A'}`, 20, yPos + 3);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      yPos += 12;
      
      // Unit details in 2 columns
      doc.setFont("helvetica", "bold");
      doc.text("Merk AC", 20, yPos);
      doc.text("Kapasitas", 20, yPos + 6);
      doc.text("Kondisi AC", 20, yPos + 12);
      
      doc.setFont("helvetica", "normal");
      doc.text(`: ${unit.merk_ac || 'N/A'}`, 45, yPos);
      doc.text(`: ${unit.kapasitas_ac || 'N/A'}`, 45, yPos + 6);
      
      // Status kondisi dengan warna
      const kondisiText = unit.kondisi_ac || 'N/A';
      doc.text(`: `, 45, yPos + 12);
      if (kondisiText.includes('bersih')) {
        doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
      } else if (kondisiText.includes('kotor')) {
        doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
      }
      doc.text(kondisiText, 48, yPos + 12);
      doc.setTextColor(0, 0, 0);
      
      // Right column
      doc.setFont("helvetica", "bold");
      doc.text("Status AC", 110, yPos + 12);
      doc.setFont("helvetica", "normal");
      doc.text(`: `, 135, yPos + 12);
      
      const statusText = unit.status_ac || 'N/A';
      if (statusText.includes('normal') || statusText.includes('selesai')) {
        doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
        doc.text(`✓ ${statusText}`, 138, yPos + 12);
      } else {
        doc.setTextColor(colors.warning[0], colors.warning[1], colors.warning[2]);
        doc.text(`⚠ ${statusText}`, 138, yPos + 12);
      }
      doc.setTextColor(0, 0, 0);
      
      yPos += 18;
      
      // Catatan/Rekomendasi jika ada
      if (unit.catatan_rekomendasi) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("📝 Catatan/Rekomendasi:", 20, yPos);
        yPos += 4;
        doc.setFont("helvetica", "normal");
        const catatanLines = doc.splitTextToSize(unit.catatan_rekomendasi, 170);
        doc.text(catatanLines, 20, yPos);
        yPos += catatanLines.length * 4;
      }
      
      yPos += 8;
    }
  }
  
  // Handle PENGECEKAN PERFORMA work type with table format
  else if (data.work_type === 'pengecekan' && data.check_type === 'performa' && data.ac_units_data && data.ac_units_data.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("📊 Data Pengecekan Performa AC", 20, yPos);
    yPos += 7;
    
    for (let i = 0; i < data.ac_units_data.length; i++) {
      const unit = data.ac_units_data[i];
      
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      // Unit card
      drawBox(15, yPos - 2, 180, 38, [255, 250, 240], [243, 156, 18]);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text(`Unit ${i + 1}: ${unit.nama_ruang || 'N/A'}`, 20, yPos + 3);
      
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      yPos += 8;
      
      // Info dasar
      doc.text(`Merk: ${unit.merk_ac || 'N/A'} | Kapasitas: ${unit.kapasitas_ac || 'N/A'} | Daya: ${unit.daya_listrik || 'N/A'}`, 20, yPos);
      yPos += 5;
      
      // Kondisi komponen
      doc.text(`Compressor: ${unit.kondisi_compressor || 'N/A'} | Evaporator: ${unit.kondisi_evaporator || 'N/A'} | Condenser: ${unit.kondisi_condenser || 'N/A'}`, 20, yPos);
      yPos += 5;
      
      // Suhu dengan visual indicator
      doc.setFont("helvetica", "bold");
      doc.text("🌡️ Temperatur:", 20, yPos);
      doc.setFont("helvetica", "normal");
      doc.text(`Ruangan: ${unit.suhu_ruangan || 'N/A'}°C | Supply: ${unit.suhu_supply || 'N/A'}°C | Return: ${unit.suhu_return || 'N/A'}°C`, 48, yPos);
      yPos += 5;
      
      if (unit.catatan) {
        doc.setFontSize(7);
        doc.text(`Catatan: ${unit.catatan}`, 20, yPos);
        yPos += 4;
      }
      
      yPos += 5;
    }
  }
  
  // Handle traditional fields (TROUBLESHOOTING, INSTALASI, LAIN-LAIN)
  else {
    if (data.problem || data.tindakan) {
      const detailHeight = 50;
      drawBox(15, yPos - 2, 180, detailHeight, [255, 250, 250], [231, 76, 60]);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      
      if (data.problem) {
        doc.text("❗ Problem:", 20, yPos + 3);
        yPos += 6;
        doc.setFont("helvetica", "normal");
        const problemLines = doc.splitTextToSize(data.problem, 170);
        doc.text(problemLines, 20, yPos);
        yPos += problemLines.length * 5 + 4;
      }
      
      if (data.tindakan) {
        doc.setFont("helvetica", "bold");
        doc.text("✅ Tindakan:", 20, yPos);
        yPos += 6;
        doc.setFont("helvetica", "normal");
        const tindakanLines = doc.splitTextToSize(data.tindakan, 170);
        doc.text(tindakanLines, 20, yPos);
        yPos += tindakanLines.length * 5 + 4;
      }
      
      yPos += 10;
    }
  }
  
  // Common fields for all work types
  if (data.rincian_pekerjaan) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    drawBox(15, yPos - 2, 180, 25, [250, 255, 250], [39, 174, 96]);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("📋 Rincian Pekerjaan:", 20, yPos + 3);
    yPos += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const rincianLines = doc.splitTextToSize(data.rincian_pekerjaan, 170);
    doc.text(rincianLines, 20, yPos);
    yPos += rincianLines.length * 4 + 10;
  }
  
  if (data.rincian_kerusakan) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("⚠️ Rincian Kerusakan:", 20, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const kerusakanLines = doc.splitTextToSize(data.rincian_kerusakan, 170);
    doc.text(kerusakanLines, 20, yPos);
    yPos += kerusakanLines.length * 4 + 8;
  }
  
  if (data.catatan_rekomendasi && data.work_type !== 'pemeliharaan') {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("💡 Catatan/Rekomendasi:", 20, yPos);
    yPos += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const catatanLines = doc.splitTextToSize(data.catatan_rekomendasi, 170);
    doc.text(catatanLines, 20, yPos);
    yPos += catatanLines.length * 4 + 8;
  }
  
  // Time & Distance info box
  if (data.lama_kerja || data.jarak_tempuh) {
    if (yPos > 260) {
      doc.addPage();
      yPos = 20;
    }
    
    drawBox(15, yPos - 2, 85, 14, [240, 240, 255], colors.primary);
    
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    if (data.lama_kerja) {
      doc.text(`⏱️ Lama Kerja: ${data.lama_kerja} jam`, 20, yPos + 4);
    }
    if (data.jarak_tempuh) {
      doc.text(`🚗 Jarak Tempuh: ${data.jarak_tempuh} km`, 20, yPos + 10);
    }
    
    yPos += 20;
  }
  
  // Spareparts Table with improved styling
  if (data.spareparts && data.spareparts.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
    doc.text("🔧 SPAREPART YANG DIGUNAKAN", 20, yPos);
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
    doc.text("📸 DOKUMENTASI FOTO PEKERJAAN", 105, 10, { align: "center" });
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
          doc.text("📷 DOKUMENTASI FOTO PER UNIT", 105, 10, { align: "center" });
          doc.setTextColor(0, 0, 0);
          
          yPos = 25;
          hasUnitPhotos = true;
        }
        
        // Unit header with colored badge
        drawBox(15, yPos - 2, 180, 10, colors.light, colors.success);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
        doc.text(`🏢 Unit ${unitIdx + 1}: ${unit.nama_ruang || 'N/A'}`, 20, yPos + 4);
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
  
  // Signatures with improved layout
  if (yPos > 200) {
    doc.addPage();
    yPos = 20;
  }
  
  // Signature section header
  drawBox(0, yPos - 5, 210, 12, colors.primary);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("✍️ TANDA TANGAN", 105, yPos + 2, { align: "center" });
  doc.setTextColor(0, 0, 0);
  
  yPos += 15;
  
  // Signature boxes
  // Technician signature
  drawBox(20, yPos, 70, 45, [255, 255, 255], colors.primary);
  if (signatureTechnician) {
    try {
      doc.addImage(signatureTechnician, "PNG", 25, yPos + 5, 60, 25);
    } catch (e) {
      console.error("Failed to add technician signature:", e);
    }
  }
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("Teknisi", 55, yPos + 35, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(signatureTechnicianName || technicianName || '', 55, yPos + 40, { align: "center" });
  
  // Client signature
  drawBox(120, yPos, 70, 45, [255, 255, 255], colors.success);
  if (signatureClient) {
    try {
      doc.addImage(signatureClient, "PNG", 125, yPos + 5, 60, 25);
    } catch (e) {
      console.error("Failed to add client signature:", e);
    }
  }
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(colors.success[0], colors.success[1], colors.success[2]);
  doc.text("Klien / PIC", 155, yPos + 35, { align: "center" });
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(signatureClientName || "", 155, yPos + 40, { align: "center" });
  
  yPos += 50;
  
  // Date badge
  drawBox(20, yPos, 60, 8, colors.light, colors.primary);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`📅 Tanggal: ${signatureDate ? new Date(signatureDate).toLocaleDateString("id-ID", { day: '2-digit', month: 'long', year: 'numeric' }) : ""}`, 50, yPos + 5, { align: "center" });
  
  // Footer note
  yPos += 15;
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100, 100, 100);
  doc.text("Dokumen ini dibuat secara elektronik dan sah tanpa tanda tangan basah", 105, yPos, { align: "center" });
  doc.setTextColor(0, 0, 0);
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      105,
      290,
      { align: "center" }
    );
  }
  
  return doc.output("blob");
}
