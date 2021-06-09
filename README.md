# CityCoins on Stacks

## Abstract

Support a city by mining, buying, or holding their CityCoin, all while generating yield in STX and BTC.

Coming *very* soon!

- [CityCoins on Stacks](#citycoins-on-stacks)
  - [Abstract](#abstract)
  - [Contributing](#contributing)
  - [Testing](#testing)
  - [Definitions and Resources](#definitions-and-resources)
  - [References](#references)

## Contributing

For more information on the project, its goals, and technical details, please review the [Product Requirements Document](./citycoin-prd.md).

PRs are welcome! Please see the [open issues](https://github.com/citycoins/citycoin/issues) and comment if interested, or submit a PR for review.

All code submitted should be thoroughly commented and tested where applicable. Configurable options for the smart contract or the web UI should be listed as constants.

- Website: https://citycoins.co
- App UI Template: deployed at a unique domain per city, e.g. https://minemiamicoin.com ([repo](https://github.com/citycoins/citycoin-ui))
- Smart Contract Template, cloned and deployed with details for each city: [citycoin.clar](./contracts/citycoin.clar)

## Testing

Contracts are tested via [clarinet](https://github.com/hirosystems/clarinet) and javascript.

To test the contract using `clarinet`, first [install the tool](https://github.com/hirosystems/clarinet#installation) to make it available on your system.

The following commands are used to run the tests:

- `npm run clarinet:prepare`
- `npm run clarinet:test`, `npm test`, `npm run test`
- `npm run clarinet:check`
- `npm run clarinet:console`

A bash script is provided to prepare the tests as part of `clarinet:prepare`, and executes the following steps:

1. copies all contract files from `./contracts` to `./contracts/clarinet`
2. modifies address used in impl-trait by replacing it with a different address. e.g.
`(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-10-ft-standard.ft-trait)`
is converted to:
`(impl-trait 'ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.sip-10-ft-standard.ft-trait)`
3. appends at the end of file content of test add-on file with the same name, stored in `./contracts/test_addons`

**Note:** `clarinet:test`, `clarinet:check`, and `clarinet:console` automatically execute `clarinet:prepare`.

## Definitions and Resources

Some quick definitions and additional resources related to the technology behind the project.

- [Stacks Blockchain:](https://stacks.co) Stacks makes Bitcoin programmable, enabling decentralized apps and smart contracts that inherit all of Bitcoin’s powers.
- [Proof of Transfer (PoX):](https://hackernoon.com/wtf-is-proof-of-transfer-and-why-should-anyone-care-wd2330p9) The consensus mechanism for the Stacks blockchain, which is modified to implement the citycoins. 
- [Clarity Language:](https://clarity-lang.org/) A smart contract language developed by Blockstack (now [Hiro](https://hiro.so)) and Algorand, designed to be more safe, secure, and predictable.
- [Smart Contract:](https://en.wikipedia.org/wiki/Smart_contract) A computer program or a transaction protocol which is intended to automatically execute, control or document legally relevant events and actions according to the terms of a contract or an agreement.
- [Fungible Token:](https://github.com/stacksgov/sips/blob/hstove-feat/sip-10-ft/sips/sip-010/sip-010-fungible-token-standard.md) Digital assets that can be sent, received, combined, and divided.

## References

- [Stacks 2.0 Whitepaper](https://gaia.blockstack.org/hub/1AxyPunHHAHiEffXWESKfbvmBpGQv138Fp/stacks.pdf)
- [Clarity Language Reference](https://docs.stacks.co/references/language-overview)
- [Clarity Function Reference](https://docs.stacks.co/references/language-functions)
- [Build apps with Stacks](https://docs.stacks.co/build-apps/overview)
