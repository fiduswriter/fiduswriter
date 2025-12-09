# Plugin Development Guide

Create custom plugins to extend Fidus Writer functionality.

## Plugin Structure

```
my_plugin/
├── __init__.py
├── apps.py
├── models.py
├── views.py
├── urls.py
├── templates/
├── static/
│   ├── css/
│   └── js/
└── package.json5
```

## Creating a Plugin

### 1. Create Django App

```bash
python manage.py startapp my_plugin
```

### 2. Configure App

```python
# apps.py
from django.apps import AppConfig

class MyPluginConfig(AppConfig):
    name = 'my_plugin'
    default_auto_field = 'django.db.models.BigAutoField'
```

### 3. Add to INSTALLED_APPS

```python
INSTALLED_APPS = [
    # ...
    'my_plugin',
]
```

### 4. Add Models (if needed)

```python
# models.py
from django.db import models

class MyModel(models.Model):
    name = models.CharField(max_length=100)
```

### 5. Add Views

```python
# views.py
from django.shortcuts import render

def my_view(request):
    return render(request, 'my_plugin/template.html')
```

### 6. Add URLs

```python
# urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('my-plugin/', views.my_view, name='my_plugin'),
]
```

### 7. Add JavaScript (optional)

```javascript
// static/js/my-plugin.js
export class MyPlugin {
    constructor() {
        console.log('Plugin loaded');
    }
}
```

## JavaScript API

Access Fidus Writer's JavaScript APIs:

```javascript
import {EditorState} from "prosemirror-state"

export class MyEditorPlugin {
    constructor(editor) {
        this.editor = editor
        this.init()
    }
    
    init() {
        // Add custom functionality
    }
}
```

## Hooks

Register hooks to extend functionality:

```python
# In apps.py
def ready(self):
    from . import signals
```

## Publishing Plugins

1. Create GitHub repository
2. Add to PyPI (optional)
3. Document installation and usage

## Example Plugins

See official plugins:
- book - Book export functionality
- ojs - Open Journal Systems integration

## Related Documentation

- [Development Guide](README.md)
- [Contributing Guide](../contributing.md)

---

**Last Updated:** December 8, 2025
