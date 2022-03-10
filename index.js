const express = require('express');
const vhost = require('vhost');
const cors = require('cors');
const bp = require('body-parser');
const db = require('./models');
const {getAddress, verifyMessage} = require('ethers/lib/utils');

const TEMPLATE_ADDRESS = '{address}';
const TEMPLATE_EMAIL = '{email}';

const SIGN_MESSAGE_TEMPLATE = `I confirm that wallet ${TEMPLATE_ADDRESS} belongs to me, and provided email is valid. Email: ${TEMPLATE_EMAIL}`;

const app = express();

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

app.get('/.well-known/acme-challenge/W4Xb5QLa3z494zEmOD8E42Tjn8mEXoaNcGb6NAxPfS0', (req, res) => {
  res.status(200).end('W4Xb5QLa3z494zEmOD8E42Tjn8mEXoaNcGb6NAxPfS0.mvOByQTfFh6umIzAu9kNHmPXI9TKQyZfcjgQqe4dgBo');
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

var virtHost = module.exports = express();
virtHost.use(vhost('emails.launchpad.marketmaking.pro', app));

virtHost.listen(80, () => {
  console.log('running on :80');
})