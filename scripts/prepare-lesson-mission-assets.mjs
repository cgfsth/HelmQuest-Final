import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import sharp from 'sharp';
import {LESSON_MISSION_SPECS} from '../backend/content/lessonMissions.js';
import {lessonMissionIllustrations} from '../backend/content/lessonMissionIllustrations.js';
const directory=resolve('public/lesson-missions');mkdirSync(directory,{recursive:true});
const keys=[...new Set(LESSON_MISSION_SPECS.flatMap(spec=>spec.buoys.map(b=>b.image)))];
for(const key of keys){
  if(!lessonMissionIllustrations[key])throw new Error('Missing diagram '+key);
  const svg=lessonMissionIllustrations[key]();writeFileSync(resolve(directory,key+'.svg'),svg);
  await sharp(Buffer.from(svg)).webp({quality:88}).toFile(resolve(directory,key+'.webp'));
}
console.log(`Prepared ${keys.length} original lesson reference diagrams (SVG and WebP).`);
