'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Eye, Image as ImageIcon, Play, RefreshCw, Save, Sparkles, Trash2, Upload, Video } from 'lucide-react'
import { defaultContent, getOverrides, getSessionOverrides, getSessionToken, resolveContent, saveOverrides, uploadMedia, getMediaLibrary } from '@/lib/content'
import { ExperienceScene } from '@/components/experience-scene'

type Kind = 'luxury' | 'space'
type Panel = 'dashboard' | 'editor' | 'media' | 'preview'
type Asset = { name: string; url: string; type: string; size?: number; modifiedAt?: string }

const humanize = (value: string) => value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const isMediaField = (key: string) => /(image|video|media|poster|background|asset)/i.test(key) && !/(href|link)/i.test(key)
const isLongText = (key: string, value: string) => value.length > 80 || /(copy|description|subtitle|body|quote|specification|detail|text|title|lede)/i.test(key)
const isColorField = (key: string, value: string) => /(color|colour)$/i.test(key) || /^#[\da-fA-F]{6}$/.test(value)
const isUrl = (value: string) => /^(https?:\/\/|\/)/i.test(value)

function AdminCursor() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    let x = -40, y = -40, raf = 0
    const render = () => { raf = 0; node.style.transform = `translate3d(${x + 14}px, ${y + 14}px, 0)` }
    const move = (event: PointerEvent) => { x = event.clientX; y = event.clientY; if (!raf) raf = requestAnimationFrame(render) }
    window.addEventListener('pointermove', move, { passive: true })
    return () => { if (raf) cancelAnimationFrame(raf); window.removeEventListener('pointermove', move) }
  }, [])
  return <div ref={ref} className="admin-funny-cursor" aria-hidden="true"><span>✦</span><i>edit mode</i></div>
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function setAtPath<T>(root: T, path: (string | number)[], value: unknown): T {
  const next: any = clone(root)
  let cursor = next
  path.forEach((segment, index) => {
    if (index === path.length - 1) cursor[segment as any] = value
    else cursor = cursor[segment as any]
  })
  return next
}

function Field({ label, value, path, onChange, onUpload }: { label: string; value: any; path: (string | number)[]; onChange: (path: (string | number)[], value: any) => void; onUpload: (path: (string | number)[], file: File) => void }) {
  if (typeof value === 'boolean') return <label className="studio-toggle"><span>{label}</span><button type="button" className={value ? 'on' : ''} onClick={() => onChange(path, !value)}><i /> {value ? 'On' : 'Off'}</button></label>
  if (typeof value === 'number') return <label><span>{label}</span><input className="studio-number" type="number" value={value} onChange={e => onChange(path, Number(e.target.value))} step="any" /></label>
  if (typeof value === 'string') {
    const mediaKey = [...path].reverse().find(segment => typeof segment === 'string') as string | undefined
    const media = (mediaKey ? isMediaField(mediaKey) : false) || (isUrl(value) && /\.(?:avif|webp|png|jpe?g|gif|svg|mp4|mov|webm|m4v)(?:$|[?#])/i.test(value))
    const color = isColorField(String(path[path.length - 1]), value)
    return <label><span>{label}</span><div className="studio-field-row">
      {color ? <><input className="studio-color" type="color" value={/^#[\da-fA-F]{6}$/.test(value) ? value : '#b9874f'} onChange={e => onChange(path, e.target.value)} /><input className="studio-input" value={value} onChange={e => onChange(path, e.target.value)} /></> : isLongText(String(path[path.length - 1]), value) ? <textarea className="studio-textarea" value={value} onChange={e => onChange(path, e.target.value)} /> : <input className="studio-input" value={value} onChange={e => onChange(path, e.target.value)} />}
      {media && <label className="studio-upload"><Upload size={13} /><input type="file" accept={/video/i.test(String(mediaKey || '')) ? 'video/*' : 'image/*,video/*'} onChange={e => e.target.files?.[0] && onUpload(path, e.target.files[0])} /></label>}
    </div></label>
  }
  return null
}

function ContentTree({ value, path = [], label = 'Content', onChange, onUpload, depth = 0 }: { value: any; path?: (string | number)[]; label?: string; onChange: (path: (string | number)[], value: any) => void; onUpload: (path: (string | number)[], file: File) => void; depth?: number }) {
  const [open, setOpen] = useState(depth < 1)
  const primitiveArray = Array.isArray(value) && value.every(item => ['string', 'number', 'boolean'].includes(typeof item))
  if (value === null || value === undefined || typeof value !== 'object') return <Field label={humanize(label)} value={value ?? ''} path={path} onChange={onChange} onUpload={onUpload} />
  if (primitiveArray) return <section className="studio-array"><div className="studio-array-head"><span>{humanize(label)}</span><div><button type="button" onClick={() => onChange(path, [...value, typeof value[0] === 'number' ? 0 : 'New item'])}>+ Add</button></div></div>{value.map((item, index) => <div key={`${String(item)}-${index}`} className="studio-array-item"><Field label={`${index + 1}`} value={item} path={[...path, index]} onChange={onChange} onUpload={onUpload} /><button type="button" className="icon-button danger" onClick={() => onChange(path, value.filter((_: any, i: number) => i !== index))}><Trash2 size={14} /></button></div>)}</section>
  const entries = Object.entries(value)
  return <section className={`studio-node ${depth > 0 ? 'nested' : ''}`}><button type="button" className="studio-node-head" onClick={() => setOpen(v => !v)}><span><b>{depth === 0 ? 'SECTION' : 'GROUP'}</b>{humanize(label)}</span>{open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button>{open && <div className="studio-node-body">{entries.map(([key, child]) => <ContentTree key={key} value={child} path={[...path, key]} label={key} onChange={onChange} onUpload={onUpload} depth={depth + 1} />)}</div>}</section>
}

export default function AdminPage() {
  const [tab, setTab] = useState<Kind>('luxury')
  const [panel, setPanel] = useState<Panel>('dashboard')
  const [draft, setDraft] = useState<any>(clone(defaultContent.luxury))
  const [saved, setSaved] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [expandedMedia, setExpandedMedia] = useState(true)
  const session = useMemo(() => getSessionToken()?.slice(0, 8) || 'offline', [])

  async function syncFromApi(kind: Kind = tab) {
    setSyncing(true)
    try {
      const overrides = await getSessionOverrides<any>()
      setDraft(resolveContent((defaultContent as any)[kind], overrides?.[kind] || {}))
      setToast('Live content synced from the site API.')
    } catch {
      setToast('Sync failed. Local fallback is still available.')
    } finally { setSyncing(false); window.setTimeout(() => setToast(''), 1800) }
  }

  useEffect(() => { syncFromApi(tab) }, [tab])
  useEffect(() => { getMediaLibrary().then(setAssets) }, [])

  const update = (path: (string | number)[], value: any) => setDraft((current: any) => setAtPath(current, path, value))

  const handleUpload = async (path: (string | number)[], file: File) => {
    try {
      const asset = await uploadMedia(file)
      setAssets(current => [asset, ...current])
      update(path, asset.url)
      setToast(`${file.name} uploaded and assigned.`)
    } catch (error: any) { setToast(error?.message || 'Upload failed.') }
    window.setTimeout(() => setToast(''), 2200)
  }

  async function save() {
    const current = getOverrides<any>()
    const next = { ...current, [tab]: draft }
    const ok = await saveOverrides(next)
    setSaved(ok)
    setToast(ok ? 'Published. Both the API payload and local fallback are updated.' : 'Saved locally. API publish failed.')
    window.setTimeout(() => { setSaved(false); setToast('') }, 2200)
  }

  const switchAssetTo = (path: (string | number)[], asset: Asset) => { update(path, asset.url); setToast(`${asset.name} assigned.`); window.setTimeout(() => setToast(''), 1400) }

  const reset = () => { setDraft(clone((defaultContent as any)[tab])); setToast('Seeded content restored in the editor. Press Publish to make it live.'); window.setTimeout(() => setToast(''), 1800) }

  const panelTitle = panel === 'dashboard' ? 'The control room' : panel === 'media' ? 'Media, without the dead ends' : panel === 'preview' ? 'Live preview' : `${humanize(tab)} / content studio`
  const mediaCount = assets.length

  return <main className="admin-page admin-studio-page"><AdminCursor />
    <aside className="admin-rail">
      <div className="admin-logo"><span>✳</span> / CONTROL</div>
      <div className="rail-status"><i /> LIVE CMS<br /><small>{session} / API LINKED</small></div>
      <nav>
        <p>WORKSPACE</p>
        <button className={panel === 'dashboard' ? 'active' : ''} onClick={() => setPanel('dashboard')}>◈ Control room</button>
        <button className={panel === 'editor' ? 'active' : ''} onClick={() => setPanel('editor')}>✦ Content studio</button>
        <button className={panel === 'media' ? 'active' : ''} onClick={() => setPanel('media')}>▧ Media vault <small>{mediaCount}</small></button>
        <button className={panel === 'preview' ? 'active' : ''} onClick={() => setPanel('preview')}>◎ Live preview</button>
        <p>EXPERIENCES</p>
        <button className={tab === 'luxury' ? 'active' : ''} onClick={() => { setTab('luxury'); setPanel('editor') }}>✦ Luxury / 01</button>
        <button className={tab === 'space' ? 'active' : ''} onClick={() => { setTab('space'); setPanel('editor') }}>◌ Space / 02</button>
      </nav>
      <div className="rail-bottom">Every field is live.<br /><span>Text. Images. Video. Sections.</span></div>
    </aside>

    <section className="admin-main">
      <header className="admin-header studio-header"><div><span className="crumb">CONTROL ROOM / {tab.toUpperCase()} / {session}</span><h1>{panelTitle} <Sparkles /></h1><p>One source of truth for the public experience.</p></div><div className="admin-actions"><button className="ghost-button" onClick={() => syncFromApi()} disabled={syncing}><RefreshCw size={14} className={syncing ? 'spin' : ''} /> Sync</button><span className="saved-state">{saved ? <><Check /> Published</> : 'Draft changes'}</span><button className="save-button" onClick={save}><Save /> Publish changes</button></div></header>

      {panel === 'dashboard' && <div className="studio-dashboard">
        <div className="studio-hero-card"><div><span>CONTENT ENGINE / {session}</span><h2>Edit it once. See it everywhere.</h2><p>Homepage sections, route pages, cards, technical systems, timelines, footer copy, and every media slot all resolve through the same session API.</p><button onClick={() => setPanel('editor')}>Open Content Studio <ArrowRightIcon /></button></div><div className="studio-signal"><i /><strong>API CONNECTED</strong><small>Session-scoped publishing is active.</small></div></div>
        <div className="workspace-grid"><article className="workspace-card luxury-card"><span>✦ LUXURY / 01</span><h3>{draft?.title}</h3><p>Objects, materials, atmosphere, collection, process and private viewing.</p><button onClick={() => { setTab('luxury'); setPanel('editor') }}>Edit Luxury <Eye size={15} /></button></article><article className="workspace-card space-card"><span>◌ SPACE / 02</span><h3>{tab === 'space' ? draft?.title : defaultContent.space.title}</h3><p>Orbit, celestial targets, mission logs, instruments, flight data and timeline.</p><button onClick={() => { setTab('space'); setPanel('editor') }}>Edit Space <Eye size={15} /></button></article></div>
        <div className="studio-tiles"><div><span>MEDIA VAULT</span><strong>{mediaCount}</strong><p>Server-backed uploads available to both sites.</p></div><div><span>EDITABLE SURFACES</span><strong>ALL</strong><p>Text, images, videos, arrays, cards and route metadata.</p></div><div><span>DELIVERY</span><strong>API + LOCAL</strong><p>Published payload mirrors to the browser fallback.</p></div></div>
      </div>}

      {panel === 'editor' && <div className="studio-editor-layout"><div className="studio-editor-main"><div className="studio-toolbar"><div><span>LIVE CONTENT TREE</span><strong>{tab === 'luxury' ? 'Everything in the Atelier' : 'Everything in NOVA'}</strong></div><div><button onClick={reset}>Reset seeded</button><button className="mobile-preview" onClick={() => setPanel('preview')}><Eye size={14} /> Preview</button></div></div><div className="studio-note"><Sparkles size={14} /><span>Every text value, section, image, video, card, list and route field below is editable. Media fields accept URLs and server uploads.</span></div><ContentTree value={draft} label={tab.toUpperCase()} onChange={update} onUpload={handleUpload} /></div><aside className="studio-side"><div className="live-preview-card"><div className="live-preview-head"><span>LIVE SIGNAL</span><i /><b>CONNECTED</b></div><div className="mini-preview"><ExperienceScene space={tab === 'space'} color={draft?.modelColor || (tab === 'space' ? '#3b82f6' : '#b9874f')} model={tab === 'space' ? 'orbiter' : 'lion'} /><div><span>{tab === 'space' ? 'ORBIT' : 'ATELIER'}</span><h3>{draft?.title}</h3><p>{draft?.subtitle}</p></div></div><button onClick={() => setPanel('preview')}><Eye size={14} /> Open full preview</button></div><div className="inspector-card"><span>SESSION</span><strong>{session}</strong><p>Publish changes to update the same token-backed experience used by this browser.</p><button onClick={save}><Save size={14} /> Publish now</button></div></aside></div>}

      {panel === 'media' && <div className="studio-media"><div className="media-hero"><div><span>MEDIA VAULT</span><h2>Images and videos are first-class content.</h2><p>Upload real files to the server, then assign them to any image or video field in the Content Studio.</p></div><label className="upload-hero-button"><Upload size={16} /> Upload media<input type="file" accept="image/*,video/*" onChange={async e => { if (!e.target.files?.[0]) return; try { const asset = await uploadMedia(e.target.files[0]); setAssets(current => [asset, ...current]); setToast(`${asset.name} is ready in the vault.`) } catch (error:any) { setToast(error?.message || 'Upload failed.') } window.setTimeout(() => setToast(''), 1800) }} /></label></div><div className="media-help"><ImageIcon size={14} /><span>Open Content Studio and use the upload icon next to any image/video field to assign an asset directly.</span></div><div className="media-section-head"><button onClick={() => setExpandedMedia(v => !v)}>{expandedMedia ? <ChevronDown size={16} /> : <ChevronRight size={16} />} {assets.length} server assets</button><span>SESSION / {session}</span></div>{expandedMedia && <div className="asset-wall studio-asset-wall">{assets.length ? assets.map(asset => <article key={asset.url}><div className="asset-preview">{asset.type.startsWith('video') ? <video src={asset.url} muted autoPlay loop playsInline /> : <img src={asset.url} alt={asset.name} />}</div><div className="asset-meta"><strong>{asset.name}</strong><small>{asset.type} · {asset.size ? `${Math.round(asset.size / 1024)} KB` : 'server asset'}</small></div><button onClick={() => { navigator.clipboard?.writeText(asset.url); setToast('Asset URL copied.'); window.setTimeout(() => setToast(''), 1000) }}>Copy URL</button><button className="danger-link" onClick={() => setToast('Assets stay on the server; remove is intentionally disabled in this build.')}>Remove</button></article>) : <div className="empty-assets">No uploads yet. Seeded public media still works until you replace it.</div>}</div>}</div>}

      {panel === 'preview' && <div className="full-preview-panel"><div className="preview-browser-bar"><span>LIVE SITE / {tab.toUpperCase()}</span><div><a href={tab === 'luxury' ? '/luxury' : '/space'} target="_blank" rel="noreferrer">Open public site ↗</a><button onClick={() => setPanel('editor')}>Back to editor</button></div></div><div className={`preview-viewport preview-${tab}`}>{tab === 'luxury' ? <LuxuryPreview content={draft} /> : <SpacePreview content={draft} />}</div></div>}
    </section>
    {toast && <div className="admin-toast"><span>{toast}</span><button onClick={() => setToast('')}>Dismiss</button></div>}
  </main>
}

function ArrowRightIcon() { return <span aria-hidden="true">↗</span> }

function LuxuryPreview({ content }: { content: any }) {
  return <div className="content-preview-mock"><div className="preview-backdrop" style={{ backgroundImage: `linear-gradient(90deg,rgba(10,8,6,.86),rgba(10,8,6,.18)),url(${content.heroImage})` }} /><div className="preview-nav"><strong>{content.brand}</strong><span>{content.navLabel}</span></div><div className="preview-hero-copy"><span>{content.meta?.eyebrow}</span><h2>{content.title}</h2><p>{content.subtitle}</p><button>{content.cta}</button></div><div className="preview-blocks"><article><span>{content.story?.eyebrow}</span><h3>{content.story?.titleLead} <em>{content.story?.titleEmphasis}</em> {content.story?.titleTail}</h3><p>{content.story?.lede}</p></article><article><span>{content.object?.eyebrow}</span><h3>{content.object?.title}</h3><p>{content.object?.description}</p></article><article><span>COLLECTION</span><h3>{content.collection?.titleLine1} <em>{content.collection?.titleEmphasis}</em></h3><p>{content.collection?.copy}</p></article></div></div>
}

function SpacePreview({ content }: { content: any }) {
  return <div className="content-preview-mock space-preview-mock"><div className="preview-backdrop" style={{ backgroundImage: `linear-gradient(90deg,rgba(2,6,18,.9),rgba(2,6,18,.14)),url(${content.heroImage})` }} /><div className="preview-nav"><strong>{content.brand}</strong><span>{content.navLabel}</span></div><div className="preview-hero-copy"><span>{content.hero?.eyebrow}</span><h2>{content.title}</h2><p>{content.subtitle}</p><button>{content.cta}</button></div><div className="preview-blocks"><article><span>{content.journey?.label}</span><h3>{content.journey?.titleLead} <em>{content.journey?.titleEmphasis}</em> {content.journey?.titleTail}</h3><p>{content.journey?.copy}</p></article><article><span>{content.missions?.label}</span><h3>{content.missions?.title}</h3><p>{content.missions?.items?.map((item:any) => item.name).join(' · ')}</p></article><article><span>{content.timeline?.label}</span><h3>{content.timeline?.title}</h3><p>{content.timeline?.items?.map((item:any) => item[0]).join(' → ')}</p></article></div></div>
}
