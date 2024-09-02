---
"lmb-sparql-proxy": minor
---

Add improved support for `Content-Type` and `Accept` headers.
This service now accepts two type of `Content-Type` headers:
- `application/x-www-form-urlencoded`
- `application/sparql-query`

By default, this service will now respond in the `application/sparql-results+json` format. You may send an `Accept` header to retrieve the results in another (supported) format.

These changes were made to ensure compatibility with different sparql clients.
