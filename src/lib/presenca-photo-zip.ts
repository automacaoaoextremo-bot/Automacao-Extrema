// ZIP sem compressão, em lotes pequenos. Não carrega todas as fotos do evento de uma vez.
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes:Uint8Array){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export function photoZip(files:{name:string;bytes:Uint8Array}[]):Blob {
  const parts:BlobPart[]=[]; const central:BlobPart[]=[]; let offset=0,centralSize=0;
  for(const file of files){const name=new TextEncoder().encode(file.name);const crc=crc32(file.bytes);const local=new Uint8Array(30+name.length);const v=new DataView(local.buffer);
    v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,crc,true);v.setUint32(18,file.bytes.length,true);v.setUint32(22,file.bytes.length,true);v.setUint16(26,name.length,true);local.set(name,30);
    const dir=new Uint8Array(46+name.length);const d=new DataView(dir.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,33,true);d.setUint32(16,crc,true);d.setUint32(20,file.bytes.length,true);d.setUint32(24,file.bytes.length,true);d.setUint16(28,name.length,true);d.setUint32(42,offset,true);dir.set(name,46);
    parts.push(local,new Uint8Array(file.bytes));central.push(dir);offset+=local.length+file.bytes.length;centralSize+=dir.length;
  }
  const end=new Uint8Array(22);const e=new DataView(end.buffer);e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,centralSize,true);e.setUint32(16,offset,true);return new Blob([...parts,...central,end],{type:"application/zip"});
}
