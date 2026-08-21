import { app } from 'mu';
import bodyParser from 'body-parser';
import { Readable } from 'stream';

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.text({ type: 'application/sparql-query' }));
app.use(bodyParser.json({ type: 'application/json' }));


app.get('/', (req, res) => {
  res.end('Hello from Vendor Sparql Proxy');
});

if (!process.env.AUTH_GROUP) {
  console.warn('WARNING! No AUTH_GROUP is configured, so running without authentication checks');
}

app.post('/query', async (req, res) => {
  const missingVariables = getMissingVariables();
  if (missingVariables.length > 0) {
    res.status(500);
    return res.json({
      error: `Missing ${missingVariables.join(' ')} environment variable`,
    });
  }
  const adminUnitUUid = getAdminUnitUuid(req);
  if (!adminUnitUUid) {
    res.status(401);
    return res.json({ error: 'You should be logged to access this service' });
  }

  let query;
  if (req.is('urlencoded')) {
    query = req.body.query;
  } else if (req.is('application/sparql-query')) {
    query = req.body;
  } else {
    res.status(415).send('Unsupported Media Type');
    return;
  }
  if (!query) {
    res.status(400);
    return res.json({ error: 'Please specify a query to perform' });
  }
  const loginResponse = await login(adminUnitUUid);

  if (loginResponse.status !== 201) {
    res.status(loginResponse.status);
    res.setHeader('content-type', loginResponse.headers.get('content-type'));
    return Readable.fromWeb(loginResponse.body).pipe(res);
  }
  const sessionCookie = loginResponse.headers.getSetCookie()[0];

  const formBody = [];
  const encodedKey = encodeURIComponent('query');
  const encodedValue = encodeURIComponent(query);
  formBody.push(encodedKey + '=' + encodedValue);

  const queryBaseUrl = process.env.QUERY_BASE_URL;  
  const queryResponse = await fetch(`${queryBaseUrl}/vendor/sparql`, {
    method: 'POST',
    headers: {
      Accept: req.get('accept'),
      'Content-Type': 'application/x-www-form-urlencoded',
      cookie: sessionCookie,
    },
    body: formBody,
  });
  res.setHeader('content-type', queryResponse.headers.get('content-type'));
  Readable.fromWeb(queryResponse.body).pipe(res);
});

app.get('/query-json/*', async (req, res) => {
  const path = req.path.replace('/query-json', '');
  const missingVariables = getMissingVariables();
  if (missingVariables.length > 0) {
    res.status(500);
    return res.json({
      error: `Missing ${missingVariables.join(' ')} environment variable`,
    });
  }
  const adminUnitUUid = getAdminUnitUuid(req);
  if (!adminUnitUUid) {
    res.status(401);
    return res.json({ error: 'You should be logged to access this service' });
  }
  const loginResponse = await login(adminUnitUUid);

  if (loginResponse.status !== 201) {
    res.status(loginResponse.status);
    res.setHeader('content-type', loginResponse.headers.get('content-type'));
    return Readable.fromWeb(loginResponse.body).pipe(res);
  }
  const sessionCookie = loginResponse.headers.getSetCookie()[0];
  const requestOptions = {
    method: 'GET',
    headers: {
      Accept: req.get('accept'),
      cookie: sessionCookie,
    },
  };
  const queryBaseUrl = process.env.QUERY_BASE_URL;  
  const queryResponse = await fetch(`${queryBaseUrl}${path}`, requestOptions);
  res.setHeader('content-type', queryResponse.headers.get('content-type'));
  Readable.fromWeb(queryResponse.body).pipe(res);
});


app.post('/query-json/*', async (req, res) => {
  const path = req.path.replace('/query-json', '');
  const missingVariables = getMissingVariables();
  if (missingVariables.length > 0) {
    res.status(500);
    return res.json({
      error: `Missing ${missingVariables.join(' ')} environment variable`,
    });
  }
  const adminUnitUUid = getAdminUnitUuid(req);
  if (!adminUnitUUid) {
    res.status(401);
    return res.json({ error: 'You should be logged to access this service' });
  }

  let body;
  if (req.is('application/json')) {
    body = req.body.body;
  } else {
    res.status(415).send('Unsupported Media Type');
    return;
  }
  if (!path ) {
    res.status(400);
    return res.json({ error: 'Please specify a path to send to perform' });
  }

  const loginResponse = await login(adminUnitUUid);

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
      cookie: sessionCookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  };
  const queryBaseUrl = process.env.QUERY_BASE_URL;  
  const queryResponse = await fetch(`${queryBaseUrl}${path}`, requestOptions);
  res.setHeader('content-type', queryResponse.headers.get('content-type'));
  Readable.fromWeb(queryResponse.body).pipe(res);
});


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

function getAdminUnitUuid(req){
  let adminUnitUUid = process.env.ADMINISTRATIVE_UNIT_ID;
  if (process.env.AUTH_GROUP) {
    const authGroupToCheck = process.env.AUTH_GROUP;
    const authGroups = JSON.parse(req.get('mu-auth-allowed-groups'));
    
    const orgGroup = authGroups.find(
      (group) => group.name === authGroupToCheck
    );
    if (!orgGroup) {
      return;
    }
    if (!adminUnitUUid) {
      adminUnitUUid = orgGroup?.variables[0];
    }
  }
  return adminUnitUUid;
}

function getMissingVariables(){
  const missingVariables = [];
  if (!process.env.QUERY_BASE_URL) {
    missingVariables.push('QUERY_BASE_URL');
  }
  if (!process.env.VENDOR_URI) {
    missingVariables.push('VENDOR_URI');
  }
  if (!process.env.VENDOR_KEY) {
    missingVariables.push('VENDOR_KEY');
  }
  if (!process.env.AUTH_GROUP && !process.env.ADMINISTRATIVE_UNIT_ID) {
    missingVariables.push('AUTH_GROUP or ADMINISTRATIVE_UNIT_ID');
  }
  return missingVariables;
}