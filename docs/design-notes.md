# Wedding invitation design

The UI restores the original Save the Date inspiration with the user-requested palette: warm cream `#FDFBF7`, crimson `#7A2828`, forest green `#2C4C3B`, muted gold `#C5A880`, Playfair Display headings, and Lato body text.

The floral mandap illustration is centered above SAVE THE DATE, the names, combined date/location subtitle, and itinerary. A double gold frame, floral kolam corners, fleur ornaments, and delicate vine dividers repeat the invitation's traditional, symmetrical character. Names remain large and readable native HTML. A cream RSVP card has a double gold border and full-width crimson button with white text.

Events and travel cards use three columns on desktop and stack on mobile. Gold dividers change from vertical to horizontal. The music icon is Lucide Music2; rings, couple, and temple icons are SVGs.

## Artwork

The local PNGs in `public/images/` were created with Image Gen using the supplied invitation as an edit reference. They are adapted illustrations, with transparent backgrounds, rather than exact crops:

- `wedding-mandap.png`: couple, jasmine and marigold mandap, banana leaves, brass lamps.
- `floral-kolam.png`: top corner flowers and gold kolam.
- `floral-kolam-bottom.png`: bottom corner flowers and gold kolam.

Next.js serves responsive optimized images. Decorative corners have empty alt text; the hero has descriptive alt text. All visible copy and form controls are native HTML.

## Verification

The supplied invitation and final rendered browser screenshots were inspected with `view_image`, comparing the arch composition, palette, serif typography, gold frame/dividers, event alignment, RSVP card, and travel cards. The latest requested aesthetic is faithfully implemented. Intentional adaptations are the larger names, combined date/location subtitle, and the added RSVP/travel sections.

Playwright Chromium was used because no built-in browser is available. Checks covered native viewport widths 320, 390, 768, and 1440 pixels, image loading, exact color tokens, desktop/mobile event columns, no horizontal overflow, white button text, boolean form payloads, confirmation replacement, and no page errors. Form confirmation used a simulated browser response. The API integration test uses a local Supabase HTTP fixture and verifies both attendance values, validation, and provider errors.

Production build, lint, and fixture integration checks pass. A live insert through the local production server succeeded and saved one clearly labeled synthetic, nonattending reply with zero guests. The agent did not apply any remote migration; insert access was already working when tested.
