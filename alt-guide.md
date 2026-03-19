### 1. Non‑negotiable basics

**1. Every <img> must have an alt attribute.**

- Never ship <img> without alt.  

- For **decorative** images, use alt="" (empty) so screen readers skip them.  

- For **informative/functional** images, use meaningful text in alt="…".

Sources: Writing for accessibility, Audit Ticket Solutions, ACCESSIBILITY tab.

### 2. Decide first: is the image *informative* or *decorative*?

Use the W3C decision tree and Adobe’s internal guidance:

**Test:** If you removed the image, would any user lose information or context they can’t get elsewhere on the page/email?

- **If NO → Decorative** → alt=""

- **If YES → Informative/functional/complex/text** → write descriptive alt text.

References:
Alt Text - Segment 04 - Determine the Purpose of the Image,
Images Tutorial: Decision Tree.

### 3. How to write alt text by image type

Image type
When it needs alt text
How to write it
Example

**Functional / CTA** (buttons, linked images)
Always
Describe **action**, not pixels. Start with a verb.
alt="Buy now Photoshop" on a promo button image.

**Informative** (simple photos, diagrams)
If it adds meaning beyond nearby text
Describe the key content **in context**, not every detail.
Blog hero: alt="Team collaborating around a laptop in a design studio"

**Complex** (charts, infographics, UI flows)
If it communicates data or relationships
Short summary in alt, full explanation in surrounding text.
alt="Bar chart showing a 20% sales increase from 2023 to 2024" + data table in body.

**Screenshots / product UI**
If needed to understand a procedure
Describe what the user needs from the UI, not every pixel; start with “Screenshot of/ showing…”.
alt="Screenshot showing the Campaign Email Designer Styles panel with padding controls highlighted"

**Images of text**
Almost always
Alt text must contain the **exact same words** in the image (or clearly point to an on-page text equivalent).
Promo image: alt="2025 Adobe Experience Maker Awards. Extraordinary is just the beginning. Meet the finalists."

**Logos** (company/product/certification)
Almost always informative
Use the **name(s)** only. Do *not* add “logo” unless the fact it’s a logo is what you’re teaching.
alt="Adobe Commerce, PCI DSS Compliant, 3D Secure"

**Icons with meaning** (non-text)
If icon adds information or is the only label
Use the concept or action, not “icon”.
alt="Search" for a search magnifying glass used alone.

**Decorative** (purely visual, stock/background art)
Never descriptive alt
Use alt="". Don’t describe it at all.
<img src="..." alt=""> for a background flourish.

Key internal references:
Writing for accessibility,
Writing for Accessibility,
Alt Text - Segment 02 - Best Practices for Writing Alt Text.

### 4. Style rules for the alt text string

**Do:**

- Be **concise and specific** (aim for one short sentence; ≈125 characters is a good ceiling).  

- Make it **match the context** (what the image is doing in *this* email/page).  

- Use proper grammar and punctuation; start with a capital letter, end full sentences with a period.  

- Include important text that appears in the image (especially in awards, badges, UI prompts).

**Don’t:**

- Don’t start with **“Image of…”** or **“Picture of…”** (screen readers already say “image”).  

- Don’t repeat surrounding headings or link text **verbatim** (redundant alt is a WCAG failure on Adobe.com).  

- Don’t stuff keywords—SEO is secondary to clarity, and EAA/ADA compliance comes first.  

- Don’t add “logo” to logo alt text unless it’s a *logo-design* example.

Sources:
Writing for accessibility,
Alt Text - Segment 05 - Tools and Resources,
Alternative Text.

### 5. HTML emails: extra expectations

From Adobe’s internal email and EAA guidance:

**Every image in an email must have an alt attribute.**  

- Even decorative spacers should have alt="" so screen readers skip them.  

- Many email clients block images by default; alt text is often the **only** thing users see.

**Make alt text work *without* images.**  

- Hero/banner images: alt text should convey the core message or offer, not just “hero image”.  

- Product tiles: include product name and key value if that’s what the tile shows.

**Functional email graphics.**  

- Buttons as images: alt text = the **button label/action**.  

- Linked product shots: alt text should usually indicate what happens if you click (e.g., “Shop Lightroom plans”).

**Accessible content & EAA compliance (emails and web).**

Core rules from Adobe’s EAA work and Campaign/JO docs:

- Be **descriptive and concise**; describe the image’s **purpose** in the email, not every pixel.  

- Avoid “Image of…”; use **empty alt** (alt="") for purely decorative images.  

- Icons with meaning need meaningful labels like alt="Go to checkout", not alt="Arrow".  

- Complex images (charts, infographics) need a short alt + full description in email body or linked page.

References:
European Union Accessibility Act (EAA) 2025,
Design accessible content,
Email Standards.

**Example email markup**

<!-- Informative hero image in an email -->
<img
  src="https://landing.adobe.com/dam/2026/images/q2/hero-new-firefly.jpg"
  alt="Try Adobe Firefly — generative AI for fast, on-brand content."
  width="600"
  height="auto"
  style="display:block;border:0;"
>

<!-- Decorative divider -->
<img
  src="https://landing.adobe.com/dam/2026/images/shared/divider-grey.png"
  alt=""
  width="600"
  height="4"
  style="display:block;border:0;"
>

<!-- Image CTA button -->
<a href="https://www.adobe.com/go/offer">
  <img
    src="https://landing.adobe.com/dam/2026/images/q2/cta-buy-now.png"
    alt="Buy now and save 30%."
    width="200"
    height="48"
    style="display:block;border:0;"
  >
</a>

### 6. Special cases you’re likely to be asked about

**Logos in email or web**

- Default: **informative**, need alt text with the brand or product name.  

- Exception: if the exact same text is printed directly next to the logo, logo can be decorative (alt="").

Refs:
Alt Text - Segment 01 - What Is Alt Text and Why Is It Important?,
Slack discussions in #a11y-ask-taryn (e.g., logos and redundancy).

**Product icons**

- Icon **next to** the product name: usually decorative → alt="".  

- Icon **alone** (e.g., a grid of clickable product icons): needs alt with product name.

Ref: Intl authoring wiki: Accessibility updates.

**Decorative hero/feature images**

- If the nearby heading and body fully explain the feature and the image just illustrates it (common on marketing pages), mark as decorative (alt="").  

- Redundant alt that repeats the heading (e.g., alt="Edit and trim videos") is considered a violation on Adobe.com.

Ref: Slack thread on “What can you create in Illustrator?” & Premiere FTD pages in #a11y-ask-taryn (example).

### 7. Quick checklist you can paste into your spec

**For every image in HTML or HTML email:**

-  Is this image informative, functional, complex, text, or decorative?  

-  If decorative → alt="" present (never omit alt).  

-  If informative/functional → alt describes **purpose** in ≤1 short sentence.  

-  No “image of/picture of/logo of” in alt.  

-  Logos use just the name(s): “Adobe Acrobat”, “IBM”, “PCI DSS Compliant, 3D Secure”.  

-  Images of text: all important text is captured in alt or nearby HTML.  

-  Complex graphics: short summary in alt, full explanation in text.  

-  Email: would the message still make sense with images off? If not, fix the alt and/or copy.

### 8. Why this matters (for compliance language)

You can safely say internally:

- Adobe aligns to **WCAG 2.1 AA / 2.2 AA, ADA, and the EU Accessibility Act (EAA 2025)** for non-text content.  

- Correct use of alt attributes is required by the **Adobe Accessibility Standard** and the **Adobe Digital Accessibility Guide** for all customer-facing web and email content.  

- Misuse (missing alt, redundant alt, or descriptive alt on decorative images) is routinely flagged in accessibility audits and can create legal risk and poor user experience.

Refs:
Adobe Accessibility Standard,
Accessibility at Adobe Corporate Wiki,
European Union Accessibility Act (EAA) 2025.