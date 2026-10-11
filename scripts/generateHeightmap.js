import fs from 'fs';
import { fromFile } from 'geotiff';
import { PNG } from 'pngjs';

const TIFF_FILE = './public/davao-dem.tif';
const PNG_FILE = './public/davao-heightmap.png';

async function main() {
  const tiff = await fromFile(TIFF_FILE);
  const image = await tiff.getImage();

  const width = image.getWidth();
  const height = image.getHeight();

  console.log('Size:', width, height);

  const data = await image.readRasters({ interleave: true });

  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < data.length; i++) {
    const v = data[i];

    if (Number.isNaN(v)) continue;

    min = Math.min(min, v);
    max = Math.max(max, v);
  }

  console.log('Elevation range:', min, max);

  const png = new PNG({
    width,
    height
  });

  for (let i = 0; i < data.length; i++) {
    const v = data[i];

    const normalized =
      Math.max(
        0,
        Math.min(
          255,
          ((v - min) / (max - min)) * 255
        )
      );

    const idx = i * 4;

    png.data[idx + 0] = normalized;
    png.data[idx + 1] = normalized;
    png.data[idx + 2] = normalized;
    png.data[idx + 3] = 255;
  }

  png.pack().pipe(
    fs.createWriteStream(PNG_FILE)
  );
}

main();
