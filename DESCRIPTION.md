# Vempain Website (VWS)

Vempain Website is an open-source content publishing and delivery platform that enables organisations to present
structured content — pages, image galleries, files, and geographic locations — through a clean, searchable public
interface. It succeeds [Vempain Simplex](https://github.com/Vempain/vempain-simplex) and is built for security,
performance, and scalability.

---

## Features

### Content Browsing
- Pages are organised into a hierarchical directory tree, making it easy to navigate large collections of content.
- A collapsible sidebar shows the full directory structure; selecting any node loads the corresponding section or page
  immediately.
- Each page supports rich embedded content, custom per-page styling, and optional access restrictions.

### Image & File Galleries
- Galleries group related files (images, documents, and other media) and present them with thumbnail previews and
  metadata overlays.
- Infinite-scroll pagination loads additional files on demand, keeping the initial page load fast.
- File metadata — including MIME type, subjects, and other attributes — is displayed alongside each item.

### Subject Tagging & Search
- Every piece of content can be tagged with one or more subjects, enabling fine-grained discovery.
- A global search modal provides text-based full-page search with paginated results.
- A dedicated subject search lets visitors filter content by selecting one or multiple tags, narrowing results
  interactively.

### Geographic Locations
- Pages and files may be associated with a GPS location, including altitude, compass bearing, and satellite count.
- Location data is presented both as a compact badge (showing coordinates and direction) and as an interactive map
  (powered by OpenStreetMap via Leaflet), allowing visitors to visualise exactly where a photo or piece of content was
  captured.

### Access Control & Authentication
- Content can be restricted to authenticated users through an Access Control List (ACL) system.
- Visitors log in via a modal using username and password; sessions are secured with short-lived JWT tokens.
- Public content remains freely accessible without any login requirement.

### Theming & Customisation
- A default site-wide JSON theme controls global visual styling.
- Individual pages can override the global theme with their own CSS, enabling distinct looks for different sections of
  the site.

### Deployment & Operations
- The entire application is containerised with Docker and orchestrated with Docker Compose, making setup and updates
  straightforward.
- Traefik acts as an internal router; Apache handles public HTTPS termination using Let's Encrypt certificates.
- A `/health` endpoint enables container orchestration systems and monitoring tools to check service availability.
- Static files and assets are served from a mounted host directory, decoupling content storage from application
  upgrades.
- Structured application logs are written to a configurable host directory for easy monitoring and audit trails.

---

## Licensing

Vempain Website is free and open-source software, released under the
[GNU General Public License v2.0](LICENSE).
