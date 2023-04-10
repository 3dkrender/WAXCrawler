![3DK Logo](https://3dkrender.com/wp-content/uploads/2021/05/3DK_LOGO_400x120.png)

# WAX Crawler
 
 WAX Blockchain explorer to parse blocks and transactions and push data into a data base.

 This project is for educational purposes and is part of the tutorial that you can consult here:

The example has a database connection to store the number of the first block to be processed and to store the desired information.

## Dependecies

Includes the "StateReceiver" library developed by EOSDAC.

https://github.com/eosdac/eosio-statereceiver

This tool requires access to a SHIP WAX node (Full-State history node)

## Install

- Create a PostgreSQL data base and add credentials to .env file
- Create tables (see sql files included)
- Add URL to RPC and SHIP node to .env file
- Install modules

```
npm install
```

# Run Crawler

For WAX mainnet

```
npm run mainnet
```

Form WAX testnet
```
npm run testnet
```

## Disclaimer

> This project is for educational purposes and is part of the tutorial that you can consult here. At no time is it intended to be a tool to be used as is. This tool should be adapted to the needs of each specific case. These modifications should be made at your own risk.
