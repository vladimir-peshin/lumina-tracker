export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.setAttribute('crossOrigin', 'anonymous') // needed for CORS on external images
    image.src = url
  })

export default async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    return null
  }

  // Set canvas purely to the size of the crop box
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  )

  // Determine an appropriate format and quality
  const extension = imageSrc.split('.').pop()?.toLowerCase();
  const format = ['png', 'jpg', 'jpeg'].includes(extension) ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : 'image/jpeg';

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      // Need base64 back for the existing backend
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result);
      }
      reader.readAsDataURL(blob);
    }, format, 0.9)
  })
}
