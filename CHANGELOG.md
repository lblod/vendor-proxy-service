# lmb-sparql-proxy

## 0.2.0

### Minor Changes

- [#3](https://github.com/lblod/vendor-proxy-service/pull/3) [`5d30f06`](https://github.com/lblod/vendor-proxy-service/commit/5d30f0621b5447e222c75924ed08ef4627dd74e8) Thanks [@elpoelma](https://github.com/elpoelma)! - Add improved support for `Content-Type` and `Accept` headers.
  This service now accepts two type of `Content-Type` headers:

  - `application/x-www-form-urlencoded`
  - `application/sparql-query`

  By default, this service will now respond in the `application/sparql-results+json` format. You may send an `Accept` header to retrieve the results in another (supported) format.

  These changes were made to ensure compatibility with different sparql clients.

## 0.1.0

### Minor Changes

- [`b11f0cf`](https://github.com/lblod/vendor-proxy-service/commit/b11f0cf9fb7fbe3674044c70f12d9da6469a2bae) Thanks [@abeforgit](https://github.com/abeforgit)! - add changeset setup
