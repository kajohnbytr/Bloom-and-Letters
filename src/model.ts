import {createClient} from '@supabase/supabase-js'
import {z} from 'zod'

export const flowers = [
  {name:'Rose', meaning:'Love and admiration', description:'Velvety spirals for someone dear.', color:'#bd596c'},
  {name:'Tulip', meaning:'Perfect love and new beginnings', description:'An elegant cup on a slender stem.', color:'#e9a1a6'},
  {name:'Daisy', meaning:'Innocence and happiness', description:'White petals around a golden heart.', color:'#fff9eb'},
  {name:'Lavender', meaning:'Peace and devotion', description:'Tiny violet blooms on fragrant spires.', color:'#9c85b5'},
  {name:'Sunflower', meaning:'Loyalty and warmth', description:'A bright face that turns toward the light.', color:'#e6b74c'},
  {name:'Lily', meaning:'Sincerity and devotion', description:'Star-shaped petals with a delicate center.', color:'#e9c7b9'},
  {name:'Peony', meaning:'Romance and prosperity', description:'Soft ruffles in layers of pink.', color:'#d686a1'},
  {name:"Baby's Breath", meaning:'Everlasting love', description:'Little clouds of ivory blossoms.', color:'#fff7dd'}
]
export const wraps = {'Classic cream':'#e9d8ad','Blush pink':'#e9b8b8','Kraft paper':'#ba916e','Sage green':'#a9b498','Vintage floral':'#e5d8b9','Lavender gingham':'#e9dcee','Midnight stars':'#313858','Botanical vellum':'#dce6cb','Rose polka dots':'#f0c9cd'}
export const folds=['Classic fold','Layered fan','Scalloped sleeve','Open cone']
export type StemPosition={x:number;y:number}
export const ribbons = {Pink:'#bf718a',Burgundy:'#802c49',White:'#fff9ed',Lavender:'#a992c5',Sage:'#738666'}
export const arrangements = ['Classic rounded','Wildflower','Elegant vertical','Romantic mixed']
export const themes = ['Classic handwritten','Vintage parchment','Minimalist love letter','Floral stationery','Romantic pink']
export const fonts = ['Caveat','Cormorant Garamond','DM Sans']
export const colors = {'Warm ink':'#40312d','Dusty rose':'#773749','Forest':'#344d38'}
export const empty = () => ({
  flowers:[] as {type:number;note:string;position?:StemPosition}[], fold:folds[0], wrap:'Classic cream', ribbon:'Pink', arrangement:'Classic rounded',
  noteMode:'flowers' as 'flowers'|'bouquet', bouquetNote:'', recipient:'', sender:'', title:'', body:'', theme:themes[0], font:fonts[0], size:26, align:'left',
  color:colors['Warm ink'] as string, decoration:true, date:'', photo:'', scheduled:'', expires:''
})
export type Gift = ReturnType<typeof empty>
export type GiftRow = {id:string; data:Gift; token:string|null; revoked:boolean; created_at:string; updated_at:string; gift_publications:{scheduled_at:string|null;expires_at:string|null}|null}
export const publishSchema = z.object({
  flowers:z.array(z.object({type:z.number().int().min(0).max(7),note:z.string().max(200)})).min(1,'Pick at least one flower.').max(24),
  recipient:z.string().trim().min(1,'Enter the recipient’s name.'),title:z.string().trim().min(1,'Give the letter a title.'),
  body:z.string().trim().min(1,'Write a message.')
})
const env = import.meta.env
export const db = env.VITE_SUPABASE_URL && env.VITE_SUPABASE_ANON_KEY ? createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_ANON_KEY) : null
export function shareUrl(token:string) {
  return new URL('/gift/'+token,env.VITE_PUBLIC_ORIGIN || location.origin).href
}

