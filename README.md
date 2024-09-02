# vendor-proxy-service

This microservice aims to be a proxy for any vendor endpoint developed according to https://lblod.github.io/pages-vendors/#/docs/vendor-sparql.

## Setup

In order to configure it, you will need to provide the following environment variables:

- `QUERY_BASE_URL`: The base url of your vendor endpoint, so if you query endpoint is `https://mandatenbeheer.lblod.info/vendor/query` your query base url will be `https://mandatenbeheer.lblod.info`.
- `VENDOR_KEY`: The key provided by the vendor for authentication.
- `VENDOR_URI`: The uri provided by the vendor for authentication.

You will also need to provide one of the following two environment variables. These are used to identify the administrative unit to authenticate with.
- `ADMINISTRATIVE_UNIT_ID`: the id of the administrative unit to authenticate with.
- `AUTH_GROUP`: The auth group to check for the administrative unit the user belongs to. Not used if `ADMINISTRATIVE_UNIT_ID` is defined.

You will also need to add the service to your dispatcher as the service needs to get your authGroups in order to determine which administrative unit do you belong, something like this
```
 options "/vendor-proxy/*path", _ do
    conn
    |> Plug.Conn.put_resp_header( "access-control-allow-headers", "content-type,accept" )
    |> Plug.Conn.put_resp_header( "access-control-allow-methods", "*" )
    |> send_resp( 200, "{ \"message\": \"ok\" }" )
  end

  match "/vendor-proxy/*path" do
    forward conn, path, "http://vendor-proxy/"
  end
```

The options part is only needed if you will do some cors requests

## Usage
Once that is done you will be able to access your service with a GET request at `/` that will respond with a hello world message.

To query your endpoint you can send a POST request to `/query`.
You can pass the SPARQL along in two ways:
- With an `application/x-www-form-urlencoded` body: encode the sparql query into the `query` field, like so: `query=SELECT%20%2A%20WHERE%20%7B%0A%20%20%3Fs%20%3Fp%20%3Fo.%0A%7D%20%0ALIMIT%2010`
- With an `application/sparql-query` body: you can simply put the sparql query unencoded in the body, like so:
```sparql
SELECT * WHERE { ?a ?b ?c } LIMIT 100
```

The service will then redirect the response of the vendor endpoint to your client.
If you do not pass an `accept` header, the endpoint will respond in the `application/sparql-results+json` format.


## Errors

Possible errors that can arise when using the service but they should be pretty self explanatory:

- Status code `500` and body `{error: 'Missing X environment variable}`: the environment variable specified is missing.
- Status code `401` and body `{error: 'You should me logged to access this service'}`: the service couldn't determine which administrative unit you belong to
- Status code `400` and body `{error: 'Please specify a query to perform'}`: you didn't include a query in your POST body.
- Other errors: The service also redirects the errors from the vendor endpoints, so you may be receiving other errors, hopefully they are self explanatory, if they are not contact the administrator of your endpoint
