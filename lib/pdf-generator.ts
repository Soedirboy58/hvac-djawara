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
    jenis_unit?: string;

    // New ACUnitDataTable fields
    voltage_supply?: string;
    arus_supply?: string;
    tekanan_refrigerant?: string;
    temperatur_supply?: string;
    temperatur_return?: string;
    deskripsi_lain?: string;

    // Legacy / older keys (kept for backward compatibility)
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
  catatan_perbaikan?: string;
  catatan_rekomendasi?: string;
  lama_kerja?: number;
  jarak_tempuh?: number;
  
  spareparts?: Array<{
    name: string;
    quantity: number;
    unit: string;
    notes?: string;
  }>;

  // Installation / measurement fields (stored directly on work log)
  mcb_1?: number;
  mcb_2?: number;
  mcb_3?: number;
  mcb_4?: number;
  mcb_5?: number;
  volt_1?: number;
  volt_2?: number;
  volt_3?: number;
  volt_4?: number;
  volt_5?: number;
  ampere_total_1?: number;
  ampere_total_2?: number;
  ampere_total_3?: number;
  ampere_total_4?: number;
  ampere_total_5?: number;
  ampere_kompressor_1?: number;
  ampere_kompressor_2?: number;
  ampere_kompressor_3?: number;
  ampere_kompressor_4?: number;
  ampere_kompressor_5?: number;
  ampere_kipas_1?: number;
  ampere_kipas_2?: number;
  ampere_kipas_3?: number;
  ampere_kipas_4?: number;
  ampere_kipas_5?: number;
  tekanan_tinggi_1?: number;
  tekanan_tinggi_2?: number;
  tekanan_tinggi_3?: number;
  tekanan_tinggi_4?: number;
  tekanan_tinggi_5?: number;
  tekanan_rendah_1?: number;
  tekanan_rendah_2?: number;
  tekanan_rendah_3?: number;
  tekanan_rendah_4?: number;
  tekanan_rendah_5?: number;
  kondensor_in_out_1?: number;
  kondensor_in_out_2?: number;
  kondensor_in_out_3?: number;
  kondensor_in_out_4?: number;
  kondensor_in_out_5?: number;
  evaporator_in_out_1?: number;
  evaporator_in_out_2?: number;
  evaporator_in_out_3?: number;
  evaporator_in_out_4?: number;
  evaporator_in_out_5?: number;
  temp_ruang_1?: number;
  temp_ruang_2?: number;
  temp_ruang_3?: number;
  temp_ruang_4?: number;
  temp_ruang_5?: number;
  lain_lain?: string;
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
  const normalizeCheckType = (value: any) => {
    const v = String(value || '').toLowerCase().trim();
    if (!v) return '';
    if (v === 'survey') return 'survey_instalasi';
    if (v === 'performa') return 'kinerja_ac';
    return v;
  };

  const pengecekanLabel = (ctRaw: any) => {
    const ct = normalizeCheckType(ctRaw);
    if (ct === 'survey_instalasi') return 'Pengecekan - Survey Instalasi';
    if (ct === 'kinerja_ac') return 'Pengecekan - Kinerja AC';
    if (ct === 'kinerja_coldstorage') return 'Pengecekan - Kinerja Coldstorage';
    if (ct === 'lain') return 'Pengecekan - Lain-lain';
    return 'Pengecekan';
  };

  const workTypeLabel = data.rincian_pekerjaan || 
                       (data.work_type === 'pemeliharaan' ? 'Pemeliharaan AC' :
                        data.work_type === 'pengecekan' ? pengecekanLabel(data.check_type) :
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
  
  // Rincian Pekerjaan - AC unit details
  // NOTE: Form saves ac_units_data for: pengecekan(kinerja), troubleshooting, instalasi.
  if (
    data.ac_units_data &&
    data.ac_units_data.length > 0 &&
    (
      (data.work_type === 'pengecekan' && (normalizeCheckType(data.check_type) === 'kinerja_ac' || normalizeCheckType(data.check_type) === 'kinerja_coldstorage')) ||
      data.work_type === 'troubleshooting' ||
      data.work_type === 'instalasi'
    )
  ) {
    let unitsText = "";

    const isPresent = (v: any) => v !== undefined && v !== null && String(v).trim() !== "";

    data.ac_units_data.forEach((unit, idx) => {
      unitsText += `\nUnit ${idx + 1}: ${unit.nama_ruang || 'N/A'}`;

      const metaParts: string[] = [];
      metaParts.push(`Merk: ${unit.merk_ac || 'N/A'}`);
      metaParts.push(`Kapasitas: ${unit.kapasitas_ac || 'N/A'}`);
      if (isPresent(unit.jenis_unit)) metaParts.push(`Jenis: ${unit.jenis_unit}`);
      unitsText += `\n  • ${metaParts.join(', ')}`;

      // Prefer the new ACUnitDataTable fields when present
      const hasNewPerformanceFields = [
        unit.voltage_supply,
        unit.arus_supply,
        unit.tekanan_refrigerant,
        unit.temperatur_supply,
        unit.temperatur_return,
      ].some(isPresent);

      if (hasNewPerformanceFields) {
        if (isPresent(unit.voltage_supply) || isPresent(unit.arus_supply)) {
          unitsText += `\n  • Tegangan/Arus: ${isPresent(unit.voltage_supply) ? unit.voltage_supply + ' V' : 'N/A'} / ${isPresent(unit.arus_supply) ? unit.arus_supply + ' A' : 'N/A'}`;
        }
        if (isPresent(unit.tekanan_refrigerant)) {
          unitsText += `\n  • Tekanan Refrigerant: ${unit.tekanan_refrigerant} PSI`;
        }
        if (isPresent(unit.temperatur_supply) || isPresent(unit.temperatur_return)) {
          unitsText += `\n  • Temperatur: Supply ${isPresent(unit.temperatur_supply) ? unit.temperatur_supply + '°C' : 'N/A'} / Return ${isPresent(unit.temperatur_return) ? unit.temperatur_return + '°C' : 'N/A'}`;
        }
        if (isPresent(unit.deskripsi_lain)) {
          unitsText += `\n  • Catatan: ${unit.deskripsi_lain}`;
        }
      } else {
        // Fallback to legacy keys (older pengecekan performa structure)
        if (isPresent(unit.daya_listrik)) {
          unitsText += `\n  • Daya: ${unit.daya_listrik}`;
        }
        if (isPresent(unit.kondisi_compressor) || isPresent(unit.kondisi_evaporator) || isPresent(unit.kondisi_condenser)) {
          unitsText += `\n  • Kondisi - Compressor: ${unit.kondisi_compressor || 'N/A'}, Evaporator: ${unit.kondisi_evaporator || 'N/A'}, Condenser: ${unit.kondisi_condenser || 'N/A'}`;
        }
        if (isPresent(unit.suhu_ruangan) || isPresent(unit.suhu_supply) || isPresent(unit.suhu_return)) {
          unitsText += `\n  • Suhu - Ruangan: ${unit.suhu_ruangan || 'N/A'}°C, Supply: ${unit.suhu_supply || 'N/A'}°C, Return: ${unit.suhu_return || 'N/A'}°C`;
        }
        if (isPresent(unit.catatan)) {
          unitsText += `\n  • Catatan: ${unit.catatan}`;
        }
      }

      if (idx < data.ac_units_data!.length - 1) unitsText += "\n";
    });

    tableData.push(["Rincian Pekerjaan", unitsText.trim()]);
  }
  
  // Troubleshooting-specific fields
  if (data.problem) tableData.push(["Problem", data.problem]);
  if (data.tindakan) tableData.push(["Tindakan", data.tindakan]);

  // Laporan Data Teknis fields
  if (data.rincian_kerusakan) tableData.push(["Hasil Pengecekan", data.rincian_kerusakan]);
  if (data.catatan_perbaikan) tableData.push(["Catatan Khusus", data.catatan_perbaikan]);
  if (data.catatan_rekomendasi) tableData.push(["Rekomendasi", data.catatan_rekomendasi]);
  
  // Waktu & Tanggal pengerjaan
  if (data.lama_kerja || data.jarak_tempuh) {
    let waktuText = "";
    if (data.lama_kerja) waktuText += `Lama Kerja: ${data.lama_kerja} jam`;
    if (data.jarak_tempuh) waktuText += waktuText ? ` | Jarak: ${data.jarak_tempuh} km` : `Jarak Tempuh: ${data.jarak_tempuh} km`;
    tableData.push(["Waktu & Tanggal Pengerjaan", waktuText]);
  }
  
  // Rincian rute / informasi lain-lain
  if (data.lain_lain) {
    tableData.push(["Informasi Tambahan", data.lain_lain]);
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

  // Measurement table (instalasi / pengukuran teknis)
  const hasAnyMeasurement = [
    data.mcb_1, data.mcb_2, data.mcb_3, data.mcb_4, data.mcb_5,
    data.volt_1, data.volt_2, data.volt_3, data.volt_4, data.volt_5,
    data.ampere_total_1, data.ampere_total_2, data.ampere_total_3, data.ampere_total_4, data.ampere_total_5,
    data.ampere_kompressor_1, data.ampere_kompressor_2, data.ampere_kompressor_3, data.ampere_kompressor_4, data.ampere_kompressor_5,
    data.ampere_kipas_1, data.ampere_kipas_2, data.ampere_kipas_3, data.ampere_kipas_4, data.ampere_kipas_5,
    data.tekanan_tinggi_1, data.tekanan_tinggi_2, data.tekanan_tinggi_3, data.tekanan_tinggi_4, data.tekanan_tinggi_5,
    data.tekanan_rendah_1, data.tekanan_rendah_2, data.tekanan_rendah_3, data.tekanan_rendah_4, data.tekanan_rendah_5,
    data.kondensor_in_out_1, data.kondensor_in_out_2, data.kondensor_in_out_3, data.kondensor_in_out_4, data.kondensor_in_out_5,
    data.evaporator_in_out_1, data.evaporator_in_out_2, data.evaporator_in_out_3, data.evaporator_in_out_4, data.evaporator_in_out_5,
    data.temp_ruang_1, data.temp_ruang_2, data.temp_ruang_3, data.temp_ruang_4, data.temp_ruang_5,
  ].some((v) => v !== undefined && v !== null && v !== ("" as any));

  if (hasAnyMeasurement || (data.lain_lain && String(data.lain_lain).trim())) {
    if (yPos > 235) {
      doc.addPage();
      yPos = 20;
    }

    drawSectionTitle("DATA PENGUKURAN TEKNIS", yPos);
    yPos += 4;

    const rows: Array<{ label: string; unit: string; values: Array<number | undefined> }> = [
      { label: "MCB", unit: "A", values: [data.mcb_1, data.mcb_2, data.mcb_3, data.mcb_4, data.mcb_5] },
      { label: "Volt", unit: "V", values: [data.volt_1, data.volt_2, data.volt_3, data.volt_4, data.volt_5] },
      { label: "Ampere Total", unit: "A", values: [data.ampere_total_1, data.ampere_total_2, data.ampere_total_3, data.ampere_total_4, data.ampere_total_5] },
      { label: "Ampere Kompressor", unit: "A", values: [data.ampere_kompressor_1, data.ampere_kompressor_2, data.ampere_kompressor_3, data.ampere_kompressor_4, data.ampere_kompressor_5] },
      { label: "Ampere Kipas", unit: "A", values: [data.ampere_kipas_1, data.ampere_kipas_2, data.ampere_kipas_3, data.ampere_kipas_4, data.ampere_kipas_5] },
      { label: "Tekanan Tinggi", unit: "psi", values: [data.tekanan_tinggi_1, data.tekanan_tinggi_2, data.tekanan_tinggi_3, data.tekanan_tinggi_4, data.tekanan_tinggi_5] },
      { label: "Tekanan Rendah", unit: "psi", values: [data.tekanan_rendah_1, data.tekanan_rendah_2, data.tekanan_rendah_3, data.tekanan_rendah_4, data.tekanan_rendah_5] },
      { label: "Kondensor In/Out", unit: "°C", values: [data.kondensor_in_out_1, data.kondensor_in_out_2, data.kondensor_in_out_3, data.kondensor_in_out_4, data.kondensor_in_out_5] },
      { label: "Evaporator In/Out", unit: "°C", values: [data.evaporator_in_out_1, data.evaporator_in_out_2, data.evaporator_in_out_3, data.evaporator_in_out_4, data.evaporator_in_out_5] },
      { label: "Temp Ruang", unit: "°C", values: [data.temp_ruang_1, data.temp_ruang_2, data.temp_ruang_3, data.temp_ruang_4, data.temp_ruang_5] },
    ];

    const body = rows
      .filter((r) => r.values.some((v) => v !== undefined && v !== null && v !== ("" as any)))
      .map((r) => [
        r.label,
        r.values[0] ?? "-",
        r.values[1] ?? "-",
        r.values[2] ?? "-",
        r.values[3] ?? "-",
        r.values[4] ?? "-",
        r.unit,
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Parameter", "1", "2", "3", "4", "5", "Satuan"]],
      body: body.length > 0 ? body : [["-", "-", "-", "-", "-", "-", "-"]],
      theme: "grid",
      headStyles: {
        fillColor: colors.light,
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "center",
        lineColor: colors.border,
        lineWidth: 0.3,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        lineColor: colors.border,
        lineWidth: 0.3,
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: "bold" },
        1: { cellWidth: 18, halign: "center" },
        2: { cellWidth: 18, halign: "center" },
        3: { cellWidth: 18, halign: "center" },
        4: { cellWidth: 18, halign: "center" },
        5: { cellWidth: 18, halign: "center" },
        6: { cellWidth: 20, halign: "center" },
      },
      margin: { left: 15, right: 15 },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 6;

    if (data.lain_lain && String(data.lain_lain).trim()) {
      const extraLines = doc.splitTextToSize(String(data.lain_lain), contentWidth - 10);
      const lineH = 4;
      const boxH = 6 + extraLines.length * lineH;
      if (yPos + boxH > 270) {
        doc.addPage();
        yPos = 20;
      }
      drawBox(contentLeft, yPos, contentWidth, boxH, colors.white, colors.border);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(extraLines, contentLeft + 5, yPos + 4);
      yPos += boxH + 6;
    }
  }
  

  
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

  // Introductory statement (as requested)
  const signatureIntroText =
    "Dengan ini teknisi kami telah mengerjakan dan menyelesaikan pekerjaan dengan baik tanpa ada kendala dan kerusakan unit yang disebabkan oleh teknisi kami";
  const introLines = doc.splitTextToSize(signatureIntroText, contentWidth - 10);
  const introLineHeight = 4;
  const introBoxHeight = 6 + introLines.length * introLineHeight;

  // Add new page if intro + panels won't fit
  const requiredHeightForSign = introBoxHeight + 6 + 38 + 6 + 8 + 18;
  if (yPos + requiredHeightForSign > 270) {
    doc.addPage();
    yPos = 20;
    drawSectionTitle("TANDA TANGAN", yPos);
    yPos += 6;
  }

  drawBox(contentLeft, yPos, contentWidth, introBoxHeight, colors.white, colors.border);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(introLines, contentLeft + 5, yPos + 4);
  yPos += introBoxHeight + 6;
  
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