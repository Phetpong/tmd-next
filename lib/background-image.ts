import sharp from "sharp";

/** Validate the decoded format and publish a still image without source metadata. */
export async function prepareBackgroundImage(input: Buffer) {
  const image = sharp(input, { limitInputPixels: 40_000_000, animated: false });
  const meta = await image.metadata();
  if (
    !meta.width || !meta.height ||
    !["jpeg", "png", "webp"].includes(meta.format || "") ||
    (meta.pages || 1) > 1
  ) throw new Error("รูปภาพไม่ถูกต้องหรือเป็นภาพเคลื่อนไหว");
  return image.rotate().resize({width:3508,height:4961,fit:"inside",withoutEnlargement:true}).webp({quality:90}).toBuffer();
}
