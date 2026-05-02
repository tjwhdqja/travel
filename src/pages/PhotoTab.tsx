import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface Photo {
  id: string
  url: string
  uploaded_by: string
  created_at: string
}

interface Props {
  tripId: string
  userName: string
}

export default function PhotoTab({ tripId, userName }: Props) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selected, setSelected] = useState<Photo | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchPhotos()
  }, [tripId])

  async function fetchPhotos() {
    const { data } = await supabase
      .from('photos')
      .select('*')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false })
    setPhotos(data ?? [])
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return
    setUploading(true)

    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${tripId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage.from('photos').upload(path, file)
      if (error) continue

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
      const { data: photo } = await supabase
        .from('photos')
        .insert([{ trip_id: tripId, url: urlData.publicUrl, uploaded_by: userName }])
        .select()
        .single()

      if (photo) setPhotos(prev => [photo, ...prev])
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function deletePhoto(photo: Photo) {
    const path = photo.url.split('/photos/')[1]
    await supabase.storage.from('photos').remove([path])
    await supabase.from('photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    setSelected(null)
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
      >
        {uploading ? '업로드 중...' : '📷 사진 올리기'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleUpload}
        className="hidden"
      />

      {loading ? (
        <p className="text-center text-gray-400 py-8">불러오는 중...</p>
      ) : photos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📷</div>
          <p>아직 사진이 없어요</p>
          <p className="text-sm mt-1">여행 사진을 올려보세요!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map(photo => (
            <div
              key={photo.id}
              onClick={() => setSelected(photo)}
              className="aspect-square rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition"
            >
              <img src={photo.url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div className="relative w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <img src={selected.url} alt="" className="w-full rounded-2xl object-contain max-h-[70vh]" />
            <div className="flex items-center justify-between mt-3 px-1">
              <p className="text-white text-sm">{selected.uploaded_by}</p>
              <button
                onClick={() => deletePhoto(selected)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                삭제
              </button>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
