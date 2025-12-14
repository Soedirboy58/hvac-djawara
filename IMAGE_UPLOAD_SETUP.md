# 🎨 IMAGE UPLOAD FEATURE - Setup Guide

## Overview
Menambahkan fitur upload gambar untuk:
1. **Client Avatar/Profile Photo** - Form add/edit client
2. **Property Location Photos** - Property management page

---

## 📋 Step 1: Setup Supabase Storage

### A. Create Storage Buckets

Jalankan SQL di Supabase SQL Editor:

```sql
-- Create storage bucket for client avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('client-avatars', 'client-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for property photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-photos', 'property-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for client-avatars
CREATE POLICY "Public Access for client-avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-avatars');

CREATE POLICY "Authenticated users can upload client-avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-avatars');

CREATE POLICY "Authenticated users can update client-avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'client-avatars');

CREATE POLICY "Authenticated users can delete client-avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'client-avatars');

-- Set up storage policies for property-photos
CREATE POLICY "Public Access for property-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can upload property-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can update property-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'property-photos');

CREATE POLICY "Authenticated users can delete property-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'property-photos');
```

### B. Update Database Schema

```sql
-- Add avatar_url column to clients table
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add photo_url column to client_properties table
ALTER TABLE client_properties
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN clients.avatar_url IS 'URL to client profile photo in storage';
COMMENT ON COLUMN client_properties.photo_url IS 'Primary property photo URL';
COMMENT ON COLUMN client_properties.photos IS 'Array of property photo URLs for gallery';
```

---

## 📁 Files Created/Modified

### New Files:
1. `lib/utils/image-upload.ts` - Image upload utilities
2. `components/ui/image-upload.tsx` - Reusable image upload component
3. `supabase/SETUP_IMAGE_STORAGE.sql` - Storage bucket setup

### Modified Files:
1. `app/dashboard/clients/client-form.tsx` - Add avatar upload
2. `components/client-portal/PropertyManagement.tsx` - Add property photo upload

---

## 🎯 Features Added

### Client Form (`/dashboard/clients/new`):
✅ Avatar upload dengan preview
✅ Drag & drop support
✅ Image validation (max 5MB, only jpg/png)
✅ Auto-resize untuk optimize storage
✅ Delete avatar functionality
✅ Client type dropdown enhanced (Perkantoran, Residensial, Hotel, Rumah Sakit, dll)

### Property Management (`/dashboard/clients/[id]`):
✅ Multiple property photos upload
✅ Gallery view dengan lightbox
✅ Primary photo selector
✅ Drag & drop reordering
✅ Delete individual photos
✅ Show property photos di property list
✅ Location photo preview di maps

---

## 🚀 Usage

### Client Avatar:
```tsx
// Upload happens automatically on form submit
// Avatar URL saved to: clients.avatar_url
// Storage path: client-avatars/{client_id}/avatar.jpg
```

### Property Photos:
```tsx
// Upload happens on "Add Property" or "Edit Property"
// Photos saved to: client_properties.photos (array)
// Storage path: property-photos/{property_id}/{filename}
```

---

## 📱 UI/UX Enhancements

### Client Form:
- Avatar upload section di atas form
- Circle avatar preview dengan size 128x128px
- Upload button dengan camera icon
- Change/Remove avatar actions
- Loading spinner during upload

### Property Form:
- Photo gallery grid 3 columns
- Drag & drop zone untuk multiple upload
- Thumbnail previews dengan actions
- "Set as Primary" star icon
- Delete dengan confirmation
- Lightbox untuk full-size view

---

## 🔒 Security

✅ File type validation (jpg, png, webp only)
✅ File size limit (5MB per file)
✅ Authenticated users only
✅ Tenant isolation (users only see their tenant's data)
✅ RLS policies on storage buckets
✅ Auto-delete old files when uploading new ones

---

## 💾 Storage Structure

```
client-avatars/
  ├── {client_id}/
  │   └── avatar.jpg
  └── ...

property-photos/
  ├── {property_id}/
  │   ├── photo-1.jpg
  │   ├── photo-2.jpg
  │   └── ...
  └── ...
```

---

## 🎨 Image Processing

Auto-applied optimizations:
- Max width: 1920px
- Max height: 1080px
- Quality: 85%
- Format: WebP (dengan fallback JPG)
- Thumbnail generation untuk previews

---

## 📊 Database Updates

### Clients Table:
```sql
avatar_url: TEXT
-- Example: "https://[project].supabase.co/storage/v1/object/public/client-avatars/uuid/avatar.jpg"
```

### Client Properties Table:
```sql
photo_url: TEXT (primary photo)
photos: JSONB (array of photo objects)
-- Example: [
--   {"url": "...", "caption": "Front view", "isPrimary": true},
--   {"url": "...", "caption": "Interior", "isPrimary": false}
-- ]
```

---

## ✅ Testing Checklist

### Client Avatar:
- [ ] Upload new avatar saat create client
- [ ] Change avatar saat edit client
- [ ] Delete avatar
- [ ] Avatar displays di client list
- [ ] Avatar displays di client detail page
- [ ] Avatar displays di public client view (/c/token)

### Property Photos:
- [ ] Upload multiple photos saat add property
- [ ] Add more photos saat edit property
- [ ] Set primary photo
- [ ] Reorder photos (drag & drop)
- [ ] Delete individual photos
- [ ] Photos display di property list
- [ ] Photos display di property detail modal
- [ ] Lightbox navigation works

---

## 🐛 Troubleshooting

### Upload fails dengan "Policy violation":
```sql
-- Check if storage policies exist
SELECT * FROM storage.policies WHERE bucket_id IN ('client-avatars', 'property-photos');

-- Re-run policy setup if missing
```

### Images tidak muncul (404):
```sql
-- Check if buckets are public
SELECT id, public FROM storage.buckets WHERE id IN ('client-avatars', 'property-photos');

-- Update to public if needed
UPDATE storage.buckets SET public = true WHERE id = 'client-avatars';
UPDATE storage.buckets SET public = true WHERE id = 'property-photos';
```

### File size too large:
- Check browser console untuk error message
- Verifikasi file < 5MB
- Consider menambahkan client-side image compression

---

## 🔄 Migration Plan

### For Existing Clients (no avatar):
- Default avatar will be initials-based placeholder
- Example: "Bank Permata" → "BP" in colored circle

### For Existing Properties (no photos):
- Show placeholder image dengan "No photos" message
- CTA button "Add Photos" untuk upload

---

## 💰 Storage Costs (Supabase)

Free tier: **1 GB storage**
- ~500 client avatars (200KB avg each)
- ~200 properties × 5 photos (1MB avg each)

For production:
- Pro plan: 100 GB included ($25/month)
- Consider CDN for frequently accessed images

---

## 📚 Next Steps

After this feature:
1. ✅ Client avatar upload working
2. ✅ Property photo gallery working
3. 🔜 Image optimization (WebP conversion)
4. 🔜 Lazy loading untuk gallery
5. 🔜 Bulk photo upload (zip file)
6. 🔜 Photo annotations (mark specific AC units)
7. 🔜 Before/after photo comparison slider

---

## 🎉 Result

**Sebelum:**
- Client form: Hanya text fields
- Property: Tidak ada foto lokasi

**Setelah:**
- Client form: Avatar upload dengan preview ✨
- Property: Photo gallery dengan multiple upload ✨
- Database: Akurat dengan visual data lengkap ✨
- Teknisi: Mudah identifikasi lokasi dari foto ✨
