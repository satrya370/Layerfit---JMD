# Bold Comparison / Price Ad — HTML & CSS

Single creative 1080×1080. Recreates the supplied Dutch vacuum-product advertising example with editable HTML text, CSS composition, and a replaceable photo.

## Open
Open `index.html` in a browser. `styles.css` and `assets/` must be in the same folder.

## Rendering
Use Puppeteer or Playwright at viewport 1080×1080 and `deviceScaleFactor: 1`; wait for fonts and image loading, then take a screenshot.

## Changing content
Call `window.setCreative({ headline, accent, subheadline, imageUrl, logoUrl, rating, reviewCount, priceLabel, price, ... })` in the browser before screenshot. The `headline` string replaces the whole headline, and `accent` appends red emphasized copy.

For real campaigns, review counts, star ratings, and prices **must be verified input data**. Pass `{ reviewEnabled:false, priceEnabled:false }` if they are unavailable. The example values are faithfully copied from the user-supplied reference and are not verified LayerFit product claims.

## Note
`assets/product-scene.jpg` and `assets/brand-logo.png` were cropped from the provided screenshot to make this a functioning demo; use original image assets for actual brand work. This version implements only the 1:1 format.
