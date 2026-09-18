import { BookmarkPlus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { FavoritePlace } from '../types/auth'
import type { Coordinates } from '../types/weather'

type Props = {
  coordinates: Coordinates
  favorites: FavoritePlace[]
  error: string | null
  isLoading: boolean
  onSelect: (coordinates: Coordinates) => void
  onSave: (name: string, coordinates: Coordinates, id?: string) => Promise<FavoritePlace>
  onRemove: (id: string) => Promise<void>
}

export function FavoritePlacesControls({ coordinates, favorites, error, isLoading, onSelect, onSave, onRemove }: Props) {
  const [selectedId, setSelectedId] = useState('')
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const selected = favorites.find((favorite) => favorite.id === selectedId)

  function select(id: string) {
    setSelectedId(id)
    const favorite = favorites.find((item) => item.id === id)
    if (favorite) {
      setName(favorite.name)
      onSelect(favorite.coordinates)
    }
  }

  async function save() {
    if (!name.trim()) return
    setIsSaving(true)
    try {
      const favorite = await onSave(name.trim(), coordinates, selectedId || undefined)
      setSelectedId(favorite.id)
      setName(favorite.name)
    } finally { setIsSaving(false) }
  }

  async function remove() {
    if (!selected) return
    setIsSaving(true)
    try { await onRemove(selected.id); setSelectedId(''); setName('') } finally { setIsSaving(false) }
  }

  return <section className="favorite-controls" aria-labelledby="favorites-heading"><p className="eyebrow">Saved points</p><h3 id="favorites-heading">Favorite places</h3><label><span>Saved place</span><select value={selectedId} onChange={(event) => select(event.target.value)} disabled={isLoading || isSaving}><option value="">New favorite</option>{favorites.map((favorite) => <option key={favorite.id} value={favorite.id}>{favorite.name}</option>)}</select></label><label><span>Name</span><input value={name} maxLength={80} placeholder="Home, office, or trailhead" onChange={(event) => setName(event.target.value)} /></label><div className="form-actions"><button className="primary-button" type="button" disabled={isSaving || !name.trim()} onClick={save}><BookmarkPlus aria-hidden="true" size={17} /> {selected ? 'Update place' : 'Save place'}</button>{selected && <button className="icon-button" type="button" disabled={isSaving} onClick={remove} title="Delete saved place"><Trash2 aria-hidden="true" size={17} /><span className="sr-only">Delete saved place</span></button>}</div>{error && <p className="form-message" role="alert">{error}</p>}</section>
}