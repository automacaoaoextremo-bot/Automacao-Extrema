export const TIMELINE_MIMES: Record<string,{extension:string;max:number}> = {
 'image/jpeg': {extension:'.jpg',max:5*1024*1024},
 'image/png': {extension:'.png',max:5*1024*1024},
 'image/webp': {extension:'.webp',max:5*1024*1024},
 'video/mp4': {extension:'.mp4',max:25*1024*1024},
 'video/webm': {extension:'.webm',max:25*1024*1024},
 'audio/ogg': {extension:'.ogg',max:10*1024*1024},
 'audio/opus': {extension:'.opus',max:10*1024*1024},
 'audio/webm': {extension:'.webm',max:10*1024*1024},
 'audio/mp4': {extension:'.m4a',max:10*1024*1024},
 'audio/mpeg': {extension:'.mp3',max:10*1024*1024},
 'audio/x-m4a': {extension:'.m4a',max:10*1024*1024},
};
export const TIMELINE_BUCKET='ae-ai-request-media';
