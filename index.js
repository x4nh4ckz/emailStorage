const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const vhttps = require('vhttps');
// const vhost = require('vhost');
const cors = require('cors');
const bp = require('body-parser');
const db = require('./models');
const {getAddress, verifyMessage} = require('ethers/lib/utils');

const privateKey = fs.readFileSync('/etc/letsencrypt/live/emails.launchpad.marketmaking.pro/privkey.pem', 'utf8');
const certificate = fs.readFileSync('/etc/letsencrypt/live/emails.launchpad.marketmaking.pro/cert.pem', 'utf8');
// const ca = fs.readFileSync('/etc/letsencrypt/live/emails.launchpad.marketmaking.pro/chain.pem', 'utf8');

const credentials = {
	key: privateKey,
	cert: certificate
};

const TEMPLATE_ADDRESS = '{address}';
const TEMPLATE_EMAIL = '{email}';

const SIGN_MESSAGE_TEMPLATE = `I confirm that wallet ${TEMPLATE_ADDRESS} belongs to me, and provided email is valid. Email: ${TEMPLATE_EMAIL}`;

const app = express.Router();

app.use(cors({origin: true}));
app.use(bp.json());
app.use(bp.urlencoded({ extended: true }));

const validateEmail = (email) => {
  return email
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

app.get('/signMessageTemplate', async (_, res) => {
  res.json({ message: SIGN_MESSAGE_TEMPLATE });
});

app.get('/participant/:address/exists', async (req, res) => {
  const exists = await db.Partisipant.findAll({
    where: {
      address: req.params.address.toString()
    }
  })[0];

  res.json({
    exists: !!exists,
  });
});

app.get('/.well-known/acme-challenge/fcr0jU0w5byFaD6zjf80d5CuSZel5FFrxfmXLz3y_3I', (req, res) => {
  res.status(200).end('fcr0jU0w5byFaD6zjf80d5CuSZel5FFrxfmXLz3y_3I.mvOByQTfFh6umIzAu9kNHmPXI9TKQyZfcjgQqe4dgBo');
});

app.post('/participant', async (req, res) => {
  const params = req.body;

  console.log(params);

  if (!params || !params.address || !params.email || !params.signature) {
    res.status(400).end('Invalid request body');
    return;
  }

  if (!validateEmail(params.email)) {
    res.status(400).end('Invalid email');
    return;
  }

  let signer = '';

  const signMessage = SIGN_MESSAGE_TEMPLATE.replace(TEMPLATE_ADDRESS, params.address).replace(TEMPLATE_EMAIL, params.email);

  try {
    signer = verifyMessage(signMessage, params.signature);
  } catch {
    res.status(400).end('Invalid signature');
    return;
  }

  if (getAddress(params.address) !== signer) {
    res.status(400).end('Invalid signer');
    return;
  }

  db.Partisipant.findAll({
    where: {
      address: params.address
    }
  }).then(async data => {
    const exists = data[0];
    console.log('address: ')
    console.log(exists);

    if (!!exists) {
      res.status(500).end('Email was already assigned to following address');
      return;
    }

    await db.Partisipant.create({ address: params.address, email: params.email, signature: params.signature })
      .then((_) => res.end('Successfully saved'))
      .catch((_) => {
        res.status(400).end('Failed to save')
      });
  });
});

// const server = vhttps.init();
// server.use('emails.launchpad.marketmaking.pro', credentials, app);
// server.listen(443);

// const httpServer = http.createServer(app);
// const httpsServer = https.createServer(credentials, app);

// httpServer.listen(80);
// httpsServer.listen(443);

// const server = vhttps.init();

// server.use('emails.launchpad.marketmaking.pro', credentials, app);

// server.listen(443);

var virtHost = module.exports = express();
virtHost.use(vhost('emails.launchpad.marketmaking.pro', app));

const httpsServer = vhttps.createServer(credentials, [], virtHost);

httpsServer.listen(443);

// virtHost.listen(443, () => {
//   console.log('running on :443');
// });