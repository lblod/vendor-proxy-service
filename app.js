import { app } from 'mu';
import bodyParser from 'body-parser';
import {Readable} from 'stream'

app.use(bodyParser.json({ limit: '50mb' }))

app.get('/', (req, res) => {
    res.end('Hello from LMB Sparql Proxy')
});

app.post('/query', async (req,res) => {
    const authGroups = JSON.parse(req.headers['mu-auth-allowed-groups']);
    const orgGroup = authGroups.find((group) => group.name === 'org');
    if(!orgGroup) {
        res.status(401);
        res.json({error: 'You should me logged to access this service'});
    }
    const adminUnitUUid = orgGroup.variables[0];
    const query = req.body.query;
    if(!query) {
        res.status(400);
        return res.json({error: 'Please specify a query to perform'});
    }
    const loginResponse = await fetch('https://mandatenbeheer.lblod.info/vendor/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            organization: `http://data.lblod.info/id/bestuurseenheden/${adminUnitUUid}`,
            publisher: {
                'uri': 'http://data.lblod.info/vendors/75ad4503-1699-4e43-8cab-a494142ae571',
                'key': process.env.VENDOR_KEY
            }
        })
    })

    if(loginResponse.status !== 201) {
        res.status(loginResponse.status);
        return Readable.fromWeb(loginResponse.body).pipe(res);
    }
    const sessionCookie = loginResponse.headers.getSetCookie()[0];
    

    const formBody = [];
    const encodedKey = encodeURIComponent('query');
    const encodedValue = encodeURIComponent(query);
    formBody.push(encodedKey + "=" + encodedValue);

    const queryResponse = await fetch('https://mandatenbeheer.lblod.info/vendor/sparql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'cookie': sessionCookie
        },
        body: formBody
    })
    Readable.fromWeb(queryResponse.body).pipe(res);
})