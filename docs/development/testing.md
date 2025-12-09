# Testing Guide

Guide for writing and running tests in Fidus Writer.

## Running Tests

### All Tests

```bash
python manage.py test
```

### Specific App

```bash
python manage.py test document
```

### Specific Test

```bash
python manage.py test document.tests.test_editor.EditorTest.test_create_document
```

### With Coverage

```bash
coverage run --source='.' manage.py test
coverage report
coverage html  # Generate HTML report
```

### Parallel Testing

```bash
python manage.py test --parallel
```

## Writing Tests

### Unit Tests

```python
from django.test import TestCase
from document.models import Document

class DocumentTest(TestCase):
    def test_create_document(self):
        doc = Document.objects.create(title="Test")
        self.assertEqual(doc.title, "Test")
```

### Integration Tests

```python
from django.test import TestCase, Client

class DocumentViewTest(TestCase):
    def setUp(self):
        self.client = Client()
        
    def test_document_list_view(self):
        response = self.client.get('/documents/')
        self.assertEqual(response.status_code, 200)
```

### Browser Tests

```python
from selenium import webdriver
from django.test import LiveServerTestCase

class BrowserTest(LiveServerTestCase):
    def setUp(self):
        self.browser = webdriver.Chrome()
        
    def test_create_document(self):
        self.browser.get(self.live_server_url)
        # Test browser interactions
```

## Test Database

Tests use a separate test database automatically created and destroyed.

## Fixtures

```python
class DocumentTest(TestCase):
    fixtures = ['test_users.json', 'test_documents.json']
```

## Mocking

```python
from unittest.mock import patch

class EmailTest(TestCase):
    @patch('django.core.mail.send_mail')
    def test_send_email(self, mock_send):
        # Test without actually sending emails
        send_notification()
        mock_send.assert_called_once()
```

## Continuous Integration

Tests run automatically on GitHub Actions for PRs and commits.

## Related Documentation

- [Contributing Guide](../contributing.md)
- [Development Guide](README.md)

---

**Last Updated:** December 8, 2025
