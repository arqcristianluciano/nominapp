import { supabase } from '@/lib/supabase'

export type UserDocumentType = 'cedula' | 'passport' | 'contract' | 'other'

export interface UserDocument {
  id: string
  user_id: string
  doc_type: UserDocumentType
  file_path: string
  display_name: string | null
  uploaded_at: string
}

const BUCKET = 'user_documents'
const TABLE = 'user_documents'
const DEFAULT_EXPIRY_SEC = 60 * 60 // 1 hour

export const userDocumentsService = {
  async upload(
    userId: string,
    file: File,
    docType: UserDocumentType,
    displayName?: string,
  ): Promise<UserDocument> {
    const filePath = `${userId}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file)
    if (uploadError) throw uploadError

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        user_id: userId,
        doc_type: docType,
        file_path: filePath,
        display_name: displayName ?? file.name,
      })
      .select()
      .single()

    if (error) {
      // Rollback storage upload on DB failure
      await supabase.storage.from(BUCKET).remove([filePath])
      throw error
    }

    return data as UserDocument
  },

  async list(userId: string): Promise<UserDocument[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as UserDocument[]
  },

  async getDownloadUrl(
    filePath: string,
    expiresInSec: number = DEFAULT_EXPIRY_SEC,
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, expiresInSec)
    if (error) throw error
    if (!data?.signedUrl) throw new Error('No signed URL returned')
    return data.signedUrl
  },

  async delete(id: string, filePath: string): Promise<void> {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove([filePath])
    if (storageError) throw storageError

    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
  },
}
