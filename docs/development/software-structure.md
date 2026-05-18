# Software Structure

Understanding Fidus Writer's architecture.

## Overview

Fidus Writer is built with:
- **Backend**: Python, Django
- **Frontend**: JavaScript, ProseMirror
- **Database**: PostgreSQL (or MySQL/SQLite)
- **Real-time**: WebSockets (Django Channels)

## Directory Structure

```
fiduswriter/
├── fiduswriter/           # Main Django project
│   ├── base/             # Base app (common functionality)
│   ├── document/         # Document editing
│   ├── bibliography/     # Bibliography management
│   ├── usermedia/        # File uploads
│   ├── user/             # User management
│   └── ...               # Other apps
├── docs/                 # Documentation
├── requirements.txt      # Python dependencies
└── manage.py            # Django management script
```

## Apps

### Base App
Core functionality and common utilities.

### Document App
Document creation, editing, and collaboration.
- Models: Document, AccessRight
- Real-time collaboration via WebSockets
- ProseMirror editor integration

### Bibliography App
Citation and reference management.
- BibTeX import/export
- CSL style support

### User App
User authentication and management.

### Usermedia App
File upload and management.

## Frontend Architecture

### ProseMirror
Rich text editor with collaborative editing support.

### JavaScript Modules
ES6 modules with transpilation pipeline.

### WebSocket Communication
Real-time updates via Django Channels.

## Database Schema

Key models:
- User
- Document
- Bibliography
- AccessRight
- Image

## Export System

Multiple export formats:
- PDF
- EPUB
- HTML
- LaTeX
- DOCX

## Plugin System

Extend functionality through Django apps.

## Related Documentation

- [Plugin Development](plugin-development.md)
- [API Documentation](api.md)
- [Contributing Guide](../contributing.md)

---

**Last Updated:** December 8, 2025
