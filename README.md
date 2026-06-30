# Vempain Website (VWS)

This is the official repository for the Vempain Website (VWS), a web application designed to provide the public facing
interface for the Vempain platform. The VWS is built using modern web technologies and follows best practices
for security, performance, and scalability.

This service is intended to replace the [Vempain Simplex](https://github.com/Vempain/vempain-simplex).

## Features

- Simple user interface for accessing published Vempain content
- Support to limit access to specific content based on permissions
- Containerized deployment using Docker and Docker Compose
- Word cloud embed support (`word_cloud`) with backend-injected top tag data

## Licensing

The Vempain Website is open-source software licensed under the GPL 2.0 license.

[AGENTS.md](docs/AGENTS.md) has more detailed orientation and workflow guidance for agents working in this codebase.

## Word cloud embed flow

Author this tag in page content:

```html
<!--vps:embed:word_cloud:{"shape":"circle","fontSize":[14,56],"spiral":"rectangular","padding":1}-->
```

When `/api/public/page-content` is requested, backend now injects `data` (top 100 most used tags) into each `word_cloud`
embed payload:

```json
{
    "shape": "circle",
    "fontSize": [
        14,
        56
    ],
    "spiral": "rectangular",
    "padding": 1,
    "data": [
        {
            "text": "nature",
            "value": 24
        },
        {
            "text": "travel",
            "value": 17
        }
    ]
}
```

### Verification

1. Add a word cloud embed from the editor toolbar (**Cloud**).
2. Open the page on website frontend.
3. Confirm the embed renders as a word cloud and check `/api/public/page-content?file_path=...` response contains
   `word_cloud` payload with `data`.