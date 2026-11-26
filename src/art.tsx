import {useId,useRef} from 'react'
import {flowers,wraps,ribbons,type Gift,type StemPosition} from './model'

export function Flower({type}: {type:number}) {
  const {color} = flowers[type]
  return <>
    <path d="M0 8Q-8 44 1 81" fill="none" stroke="#647650" strokeWidth="3"/>
    <path d="M-2 57Q-21 32-32 44Q-28 60-2 61M0 70Q13 43 27 49Q25 66 0 73" fill="#859165"/>
    {type===3 || type===7 ? <>
      {[-1,0,1].map((side)=> <g key={side} transform={'translate('+(side*11)+' '+(Math.abs(side)*9)+')'}>
        <path d="M0 34L0 -22" stroke="#70815a" strokeWidth="2"/>
        {[0,1,2,3,4].map((n)=><ellipse key={n} cx={n%2?4:-3} cy={n*7-20} rx={type===3?5:6} ry={type===3?8:5} fill={color} stroke="#81708b" strokeWidth=".7" transform={'rotate('+(n%2?24:-24)+')'}/>)}
      </g>)}
    </> : type===1 ? <>
      <path d="M-23 -14Q-13 -23 0 -14Q12 -24 23 -15Q25 16 0 24Q-24 18-23 -14" fill={color} stroke="#ac6976"/>
      <path d="M-15 -18Q8 -17 10 14M18 -18Q0 -7-4 21" fill="none" stroke="#bd7183"/>
    </> : <>
      {Array.from({length:[9,0,12,0,15,6,13][type]},(_,i)=>i).map((i,_,all)=><ellipse key={i} transform={'rotate('+(360*i/all.length)+')'} cy={type===0?-11:-16} rx={type===5?8:type===0?13:7} ry={type===5?19:type===0?14:13} fill={color} stroke={type===2?'#d3bb92':type===4?'#b4842d':'#aa6475'} strokeWidth=".75"/>)}
      <circle r={type===4?11:8} fill={type===4?'#724b38':type===0?'#a34258':type===6?'#ad5873':'#dbad50'}/>
      {type===0 && <path d="M-15 6Q-13 -14 7 -14Q20 -2 5 9Q-8 12-7 2Q-4 -7 7 -4" fill="none" stroke="#84354d" strokeWidth="2"/>}
    </>}
  </>
}

const foldArt = {
  'Classic fold':['M81 172Q177 126 280 174L183 337Z','M76 174Q139 204 183 339Q213 232 285 174L234 302L183 352L126 302Z','M76 174L182 245L285 174M182 245L183 338'],
  'Layered fan':['M54 159L103 170L112 142L179 158L237 142L249 169L306 157L183 347Z','M62 178L120 179L184 225L248 178L298 177L232 317L183 354L131 318Z','M62 178L183 270L298 177M120 179L183 270L248 178'],
  'Scalloped sleeve':['M78 166Q100 142 123 160Q148 136 173 151Q199 132 222 151Q248 138 281 164L183 346Z','M75 182Q91 164 113 187Q134 170 154 198Q178 180 198 197Q223 173 243 185Q266 162 285 178L231 313Q210 329 183 353Q153 328 132 316Z','M109 208Q178 250 250 204M183 251L183 339'],
  'Open cone':['M61 175Q183 124 301 174L183 349Z','M69 179Q207 242 294 175L183 354Z','M71 180Q202 271 183 352']
}

export function Bouquet({gift,onPick,onMove}: {gift:Gift;onPick?:(index:number)=>void;onMove?:(index:number,position:StemPosition)=>void}) {
  const patternId=useId()
  const svg=useRef<SVGSVGElement>(null)
  const drag=useRef<{pointer:number;index:number;dx:number;dy:number}|null>(null)
  const [back,front,creases]=foldArt[gift.fold as keyof typeof foldArt]||foldArt['Classic fold']
  const color=wraps[gift.wrap as keyof typeof wraps]
  const patterned=['Vintage floral','Lavender gingham','Midnight stars','Botanical vellum','Rose polka dots'].includes(gift.wrap)
  const paper=patterned?'url(#'+patternId+')':color
  const stems=gift.flowers.map((flower,index)=>{
    const spread=gift.arrangement==='Elegant vertical'?79:gift.arrangement==='Wildflower'?145:119
    const fraction=gift.flowers.length===1?0:index/(gift.flowers.length-1)*2-1
    const x=180+spread*fraction
    const y=92+Math.abs(fraction)*47+(gift.arrangement==='Wildflower'?(index%3)*23:gift.arrangement==='Romantic mixed'?(index%4)*12:(index%2)*11)
    return {...flower,...(flower.position||{x,y}),angle:fraction*19}
  })
  function point(clientX:number,clientY:number){
    const matrix=svg.current?.getScreenCTM()
    return matrix?new DOMPoint(clientX,clientY).matrixTransform(matrix.inverse()):null
  }
  function move(index:number,x:number,y:number){
    onMove?.(index,{x:Math.round(Math.max(34,Math.min(326,x))),y:Math.round(Math.max(38,Math.min(181,y)))})
  }
  return <svg ref={svg} viewBox="0 0 360 390" className="bouquet" role={onPick||onMove?'group':'img'} aria-label={gift.flowers.length ? gift.arrangement+' bouquet with '+gift.flowers.length+' stems' : 'Empty bouquet'}>
    <defs><pattern id={patternId} width="26" height="24" patternUnits="userSpaceOnUse">
      <rect width="26" height="24" fill={color}/>
      {gift.wrap==='Vintage floral'&&<path d="M11 11q-10-7-4-9q8 0 4 9q8-8 11-2q0 6-11 2q7 8 0 10q-6-2 0-10" fill="#c5848c"/>}
      {gift.wrap==='Lavender gingham'&&<path d="M0 5h26M0 17h26M5 0v24M17 0v24" stroke="#8966a8" strokeWidth="5" opacity=".27"/>}
      {gift.wrap==='Midnight stars'&&<path d="M8 2l1.4 4.6L14 8l-4.6 1.4L8 14 6.6 9.4 2 8l4.6-1.4ZM20 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="#ecd698"/>}
      {gift.wrap==='Botanical vellum'&&<path d="M4 20Q12 13 20 4M10 15Q3 8 12 8Q16 12 10 15M14 11Q19 6 23 10Q21 15 14 11" stroke="#6c8666" fill="none"/>}
      {gift.wrap==='Rose polka dots'&&<g fill="#a9536a"><circle cx="6" cy="6" r="2"/><circle cx="19" cy="18" r="2"/></g>}
    </pattern></defs>
    <ellipse cx="180" cy="355" rx="94" ry="13" fill="#775e43" opacity=".12"/>
    <path d={back} fill={paper} stroke="#8d735c"/>
    <path d={back} fill="#3d2c2b" opacity=".12"/>
    {stems.map(({x,y,angle,type},index)=><g key={index} className="bouquet-stem" style={{animationDelay:index*30+'ms'}}><path d={'M'+x+' '+y+'Q'+x+' 200 180 302'} stroke="#778653" strokeWidth="3" fill="none"/><g transform={'translate('+x+' '+y+') rotate('+angle+') scale(.84)'}><Flower type={type}/></g></g>)}
    <path d={front} fill={paper} stroke="#9c7f65"/>
    <path d={creases} fill="none" stroke={gift.wrap==='Midnight stars'?'#cabeac':'#8c6955'} opacity=".55"/>
    <path d="M182 285C105 241 133 308 177 289L149 332L173 325L184 291L210 329L226 323L188 286C240 312 258 246 182 285Z" fill={ribbons[gift.ribbon as keyof typeof ribbons]} stroke="#805165" strokeWidth="1.1"/>
    <circle cx="183" cy="286" r="8" fill={ribbons[gift.ribbon as keyof typeof ribbons]}/>
    {(onPick||onMove)&&stems.map(({x,y,type},index)=><circle key={index} className={onMove?'flower-hit movable-flower':'flower-hit'} cx={x} cy={y} r="19" fill="transparent" role="button" tabIndex={0} aria-label={(onMove?'Move ':'')+flowers[type].name+' stem '+(index+1)}
      onClick={()=>onPick?.(index)}
      onPointerDown={event=>{
        if(!onMove||event.button!==0||drag.current)return
        const p=point(event.clientX,event.clientY)
        if(!p)return
        drag.current={pointer:event.pointerId,index,dx:p.x-x,dy:p.y-y}
        event.currentTarget.setPointerCapture(event.pointerId)
      }}
      onPointerMove={event=>{
        const active=drag.current
        if(!active||active.pointer!==event.pointerId||active.index!==index)return
        const p=point(event.clientX,event.clientY)
        if(p)move(index,p.x-active.dx,p.y-active.dy)
      }}
      onLostPointerCapture={event=>{if(drag.current?.pointer===event.pointerId)drag.current=null}}
      onKeyDown={event=>{
        if(onMove){
          const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key]
          if(direction){
            event.preventDefault()
            const step=event.shiftKey?12:4
            move(index,x+direction[0]*step,y+direction[1]*step)
          }
        }else if(event.key==='Enter'||event.key===' '){event.preventDefault();onPick?.(index)}
      }}/>)}
  </svg>
}

export function GardenArt() {
  return <svg viewBox="0 0 670 555" className="garden-art" role="img" aria-label="Illustrated garden with a winding path, trees, and wildflowers">
    <defs><linearGradient id="sky" x2="0" y2="1"><stop stopColor="#f4e8d7"/><stop offset="1" stopColor="#ecd2b3"/></linearGradient><clipPath id="arch"><path d="M0 555V279a335 279 0 1 1 670 0v276Z"/></clipPath></defs>
    <g clipPath="url(#arch)">
      <path d="M0 0h670v555H0Z" fill="url(#sky)"/><circle cx="421" cy="120" r="65" fill="#f8e8b7"/>
      <path d="M0 309Q182 164 349 309Q520 170 670 303V555H0" fill="#a5aa7e"/><path d="M0 330Q130 235 293 338Q484 224 670 339V555H0" fill="#7c8f64"/>
      <path d="M0 391Q188 310 335 370Q493 284 670 382V555H0" fill="#637852"/>
      <path d="M347 350Q279 382 329 419Q374 452 248 555H522Q548 482 392 426Q318 392 361 350Z" fill="#d8b898"/>
      {[53,122,564,630].map((x,i)=><g key={x} transform={'translate('+x+' '+(207+i%2*39)+')'}><path d="M0 130Q4 65 0 10M2 72L-27 35M2 92L32 47" stroke="#6c5945" strokeWidth="7" fill="none"/><path d="M-57 12Q-58-34-17-44Q20-65 44-32Q79-16 63 27Q52 59 13 49Q-34 67-57 12" fill={i%2?'#87956c':'#687e56'} /></g>)}
      {Array.from({length:37},(_,i)=>{
        const x = (i*97+13)%672
        const y = 340+(i*47%198)
        if(x>268 && x<477 && y>391) return null
        return <g key={i} transform={'translate('+x+' '+y+') scale('+(.26+(y-340)/348)+')'}><Flower type={(i*5)%8}/></g>
      })}
      {[0,1,2,3,4,5].map((i)=><ellipse key={i} className="petal" style={{animationDelay:-i*1.2+'s'}} cx={183+i*61} cy={109+i%3*43} rx="4" ry="7" fill="#ce8b97" opacity=".8"/>)}
    </g>
  </svg>
}


