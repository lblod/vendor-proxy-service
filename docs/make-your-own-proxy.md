# How this proxy works

While this project is ready-to-use if you are already on a semtech stack, there's also a good chance you're not on a semtech stack, and still need to implement a similar proxy in order to integrate with the various authenticated endpoints that follow the LBLOD vendor login scheme.

This document is for you. We will break down the logic in this service so that you can easily build it yourself in your environment.

## The login flow

This is, of course, the entire point of the proxy. We're receiving a request that wants to access data from an endpoint which implements the vendor authentication flow. We need to perform the login negotation to receive a token, and then send the original request along to the target endpoint along with the token.

The login API is documented (in dutch) [here](https://lblod.github.io/pages-vendors/#/docs/vendor-sparql)


In this project, it's implemented in the `login` function:

```js
async function login(adminUnitUUid) {
  const queryBaseUrl = process.env.QUERY_BASE_URL;   
  return await fetch(`${queryBaseUrl}/vendor/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      organization: `http://data.lblod.info/id/bestuurseenheden/${adminUnitUUid}`,
      publisher: {
uri: process.env.VENDOR_URI,
        key: process.env.VENDOR_KEY,
      },
    }),
  });
}

```

As you can see, the login request is pretty simple. we need 3 pieces of data, along with the target endpoint:

- the vendor URI you were assigned in the target database (you should have received this along with your key)
- your secret vendor key
- the organization we're "acting on behalf of". 

The first two pieces are static. If you don't have these, contact the maintainers of the service you're interested in, they'll need to add your organization as a vendor and give you a key.
In our case, we fetch them from the environment, but you can of course use other ways to get the secret keys into your proxy (just make sure it's a safe way!).

The last piece, the organization, is dynamic. It probably depends on the user that is ultimately initiating the request, and the way you retrieve this "organization uri" is of course specific to your application. The only thing that matters is that you send a URI which the target environment recognizes (and which you are allowed to act on behalf of). 
To this end, applications in the LBLOD space use static URIs to describe various organizations within the Flemish government. 

For commonly used organizations, such as the flemish municipalities, you can find these URIs in Wegwijs: 


In more special cases, you should refer to the service's documentation or contact its maintainers to learn which URIs you can use.

In this service's implementation, we fetch the UUID of the end-user's organization from the request headers, and construct the URI. This is because our UUIDs are constructed such that it matches the unique part of the organization's URI. But in your application, this could very well be different (you could store the LBLOD-uri as a property on your internal represenation of the organization, for example).


## Sending along the request


Once we have the login response from the previous section, we can now authenticate the original request and send it along:

```js
// syntax specific to express.js, but your framework will likely have something that looks similar.
// you can choose whatever path you like, of course, but in the case of jsonAPI target endpoints (see below) 
// it's important that the incoming request's path is preserved
app.get('/query-json/*', async (req, res) => {

// rewrite the target path to take away this particular proxy's endpoint path
const path = req.path.replace('/query-json', '');

const adminUnitUUid = await yourSpecificWayOfGettingTheOrganizationURI();


// see previous section
const loginResponse = await login(adminUnitUUid);

// error handling
if (loginResponse.status !== 201) {
  res.status(loginResponse.status);
  res.setHeader('content-type', loginResponse.headers.get('content-type'));
  return Readable.fromWeb(loginResponse.body).pipe(res);
}
const sessionCookie = loginResponse.headers.getSetCookie()[0];
const requestOptions = {
  method: 'POST',
  headers: {
    Accept: req.get('accept'),
    // this is the important part
    cookie: sessionCookie,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
};
// our target endpoint. Of course, load this into your proxy as you see fit, we use the process environment here
const queryBaseUrl = process.env.QUERY_BASE_URL;  

// pass along the original request to the target
const queryResponse = await fetch(`${queryBaseUrl}${path}`, requestOptions);
res.setHeader('content-type', queryResponse.headers.get('content-type'));
Readable.fromWeb(queryResponse.body).pipe(res);

```


## Sparql vs jsonAPI endpoints

Most authenticated services you will encounter will expect SPARQL queries, but you might also find some that expect jsonAPI. Sparql endpoints usually have a more general usecase in mind, where jsonAPI endpoints may be used to specifically support certain frontend features. In either case, the login workflow is the same, but the way you pass along the request can differ slightly.

In this project, you can see this distinction in the endpoints the proxy provides. We have a `POST` route `/query`, which will forward the sparql query in its post body to `/vendor/sparql` on the target service, following the convention described in [the vendor pages](https://lblod.github.io/pages-vendors/#/docs/vendor-sparql)
However, it's important to realize that you can set this up however you like. All the proxy needs to do is forward the request to the right endpoint and path.
For instance, our `/query` route does some normalization of the body format. This is not strictly necessary, but it helps reduce pressure on the target endpoint if we can error early to our clients.

We also have 2 jsonAPI endpoints: a `GET` and a `POST` route, although we currently don't have a usecase for the `POST`. 
With jsonAPI, the path of the incoming request matters just as much as the request body, so we need to make sure it's a wildcard route that can pass along the path. Besides that it also does some optional request validation, but nothing groundbreaking here either.

The service you end up using may have additional quirks it expects, but that's an application concern, and shouldn't be included in the proxy's logic.



