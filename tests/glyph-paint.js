/* Decode browser screenshot PNGs without adding a runtime dependency. Only
   non-interlaced 8-bit RGB/RGBA is accepted; unsupported encodings fail. */
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
function png(bytes) {
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  let width,height,channels; const data=[];
  for(let at=8;at<bytes.length;) {
    const size=bytes.readUInt32BE(at),type=bytes.toString('ascii',at+4,at+8),chunk=bytes.subarray(at+8,at+8+size);at+=size+12;
    if(type==='IHDR') { width=chunk.readUInt32BE(0);height=chunk.readUInt32BE(4);assert.equal(chunk[8],8);assert.equal(chunk[12],0);channels=chunk[9]===2?3:chunk[9]===6?4:0;assert.ok(channels,'RGB/RGBA screenshot required'); }
    if(type==='IDAT')data.push(chunk);
    if(type==='IEND')break;
  }
  const source=zlib.inflateSync(Buffer.concat(data)),stride=width*channels,pixels=Buffer.alloc(stride*height);
  assert.equal(source.length,(stride+1)*height);
  const paeth=(a,b,c)=>{const p=a+b-c,x=Math.abs(p-a),y=Math.abs(p-b),z=Math.abs(p-c);return x<=y&&x<=z?a:y<=z?b:c;};
  for(let y=0;y<height;y++) {
    const filter=source[y*(stride+1)];assert.ok(filter<=4);
    for(let x=0;x<stride;x++) {
      const a=x>=channels?pixels[y*stride+x-channels]:0,b=y?pixels[(y-1)*stride+x]:0,c=y&&x>=channels?pixels[(y-1)*stride+x-channels]:0;
      const prediction=[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter];
      pixels[y*stride+x]=(source[y*(stride+1)+x+1]+prediction)&255;
    }
  }
  return {width,height,channels,pixels,pixel(x,y){return [...pixels.subarray((y*width+x)*channels,(y*width+x)*channels+3)];}};
}
function luminance(rgb) {const linear=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;}
function contrast(a,b) {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function glyphPaint(visible,backing,slots,deferContrast=false) {
  const a=png(visible),b=png(backing);assert.equal(a.width,b.width);assert.equal(a.height,b.height);
  return slots.map(slot=>{
    const [x,y,w,h]=slot.rect;let changed=0,minimum=Infinity;
    for(let py=Math.max(0,Math.ceil(y));py<Math.min(a.height,Math.floor(y+h));py++)for(let px=Math.max(0,Math.ceil(x));px<Math.min(a.width,Math.floor(x+w));px++) {
      const normal=a.pixel(px,py),base=b.pixel(px,py);
      if(normal.some((v,i)=>Math.abs(v-base[i])>2))changed++;
      minimum=Math.min(minimum,contrast(slot.inkRGB,base));
    }
    assert.ok(changed>0,'glyph visibly paints: '+JSON.stringify(slot));
    if(!slot.disabled&&!deferContrast)assert.ok(minimum>=(slot.minimumContrast||3),'ink contrast '+minimum+': '+JSON.stringify(slot));
    return {kind:slot.kind,rect:slot.rect,disabled:slot.disabled,paintedPixels:changed,minimumContrast:minimum};
  });
}
function imageParity(first,second,maxChannelDelta=0,regions=null) {
  const a=png(first),b=png(second);assert.equal(a.width,b.width);assert.equal(a.height,b.height);assert.equal(a.channels,b.channels);let changed=0,maximum=0;const coordinates=[];
  for(let offset=0;offset<a.pixels.length;offset+=a.channels){let delta=0;for(let c=0;c<3;c++)delta=Math.max(delta,Math.abs(a.pixels[offset+c]-b.pixels[offset+c]));if(delta){const x=(offset/a.channels)%a.width,y=Math.floor(offset/a.channels/a.width);if(regions&&!regions.some(([rx,ry,w,h])=>x>=Math.floor(rx)&&x<Math.ceil(rx+w)&&y>=Math.floor(ry)&&y<Math.ceil(ry+h)))continue;changed++;maximum=Math.max(maximum,delta);coordinates.push([x,y,delta]);}}
  assert.ok(maximum<=maxChannelDelta,'forced raster delta '+maximum+' exceeds '+maxChannelDelta+': '+JSON.stringify(coordinates.slice(0,12)));return {width:a.width,height:a.height,changedPixels:changed,maxChannelDelta:maximum,coordinates};
}
module.exports={glyphPaint,imageParity};
