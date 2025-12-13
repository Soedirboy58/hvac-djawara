import { createClient } from '@/lib/supabase/client';
import type { SPKReport, CreateSPKDto, UpdateSPKDto, Documentation, UploadDocumentationDto } from '../types/spk.types';

export const spkService = {
  /**
   * Get SPK report by service order ID
   */
  async getSPKByOrderId(serviceOrderId: string): Promise<SPKReport | null> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('spk_reports')
      .select('*')
      .eq('service_order_id', serviceOrderId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    
    return data as SPKReport;
  },

  /**
   * Create SPK report
   */
  async createSPK(dto: CreateSPKDto): Promise<SPKReport> {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    const { data, error } = await supabase
      .from('spk_reports')
      .insert({
        service_order_id: dto.serviceOrderId,
        start_time: dto.startTime?.toISOString(),
        end_time: dto.endTime?.toISOString(),
        work_description: dto.workDescription,
        findings: dto.findings,
        actions_taken: dto.actionsTaken,
        materials_used: dto.materialsUsed,
        condition_before: dto.conditionBefore,
        condition_after: dto.conditionAfter,
        recommendations: dto.recommendations,
        completed_by: user.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as SPKReport;
  },

  /**
   * Update SPK report
   */
  async updateSPK(id: string, dto: UpdateSPKDto): Promise<SPKReport> {
    const supabase = createClient();
    
    const updateData: any = {};
    
    if (dto.startTime) updateData.start_time = dto.startTime.toISOString();
    if (dto.endTime) updateData.end_time = dto.endTime.toISOString();
    if (dto.workDescription) updateData.work_description = dto.workDescription;
    if (dto.findings) updateData.findings = dto.findings;
    if (dto.actionsTaken) updateData.actions_taken = dto.actionsTaken;
    if (dto.materialsUsed) updateData.materials_used = dto.materialsUsed;
    if (dto.conditionBefore) updateData.condition_before = dto.conditionBefore;
    if (dto.conditionAfter) updateData.condition_after = dto.conditionAfter;
    if (dto.recommendations) updateData.recommendations = dto.recommendations;
    if (dto.completedAt) updateData.completed_at = dto.completedAt.toISOString();
    
    const { data, error } = await supabase
      .from('spk_reports')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as SPKReport;
  },

  /**
   * Get documentation for order
   */
  async getDocumentation(serviceOrderId: string): Promise<Documentation[]> {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('documentation')
      .select('*')
      .eq('service_order_id', serviceOrderId)
      .order('uploaded_at', { ascending: false });
    
    if (error) throw error;
    return data as Documentation[];
  },

  /**
   * Upload documentation file
   */
  async uploadDocumentation(dto: UploadDocumentationDto): Promise<Documentation> {
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    
    // Upload file to storage
    const fileExt = dto.file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${user.id}/${dto.serviceOrderId}/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('documentation')
      .upload(filePath, dto.file);
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documentation')
      .getPublicUrl(filePath);
    
    // Save documentation record
    const { data, error } = await supabase
      .from('documentation')
      .insert({
        service_order_id: dto.serviceOrderId,
        spk_report_id: dto.spkReportId,
        file_type: dto.fileType,
        file_url: publicUrl,
        file_name: dto.file.name,
        description: dto.description,
        category: dto.category,
        uploaded_by: user.id,
      })
      .select()
      .single();
    
    if (error) throw error;
    return data as Documentation;
  },

  /**
   * Delete documentation
   */
  async deleteDocumentation(id: string, fileUrl: string): Promise<void> {
    const supabase = createClient();
    
    // Extract file path from URL
    const urlParts = fileUrl.split('/documentation/');
    if (urlParts.length > 1) {
      const filePath = urlParts[1];
      
      // Delete from storage
      await supabase.storage
        .from('documentation')
        .remove([filePath]);
    }
    
    // Delete record
    const { error } = await supabase
      .from('documentation')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },
};
