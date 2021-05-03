# City Coins on Stacks

- [City Coins on Stacks](#city-coins-on-stacks)
  - [Contributing](#contributing)
  - [Testing](#testing)
  - [Launch Requirements](#launch-requirements)
  - [References](#references)
  - [Original README](#original-readme)
    - [How to Use](#how-to-use)
    - [How to Develop](#how-to-develop)

This repository contains code to recreate the [Proof of Transfer consensus mechanism](https://docs.stacks.co/understand-stacks/proof-of-transfer) via a smart contract on the [Stacks blockchain](https://www.stacks.co/).

The contract is further modified to support the creation of a "city coin", following the properties outlined below and within the [Product Requirements Document](./citycoin-prd.md).

## Contributing

PRs are welcome! Please see the [open issues here](https://github.com/citycoins/citycoin/issues) and comment if interested.

All code submitted should be thoroughly commented and tested where applicable.

Configurable options for the smart contract or the web UI should be listed as constants.

## Testing

To test the contract, use `clarity-cli` ([setup instructions here](./setup-clarity-cli.md)) and the bash script in the `./tests/` directory:

```bash
cd tests/ && ./run-tests.sh
```

## Launch Requirements

- [ ] draft whitepaper created based on current [product requirements document](./citycoin-prd.md)
- [ ] successful legal review of policies and regulations around a fair launch and city acquisition of custodied tokens
- [ ] contract deployed to testnet implementing and successfully demonstrating all points above
- [ ] basic UI for mining/stacking deployed on a public-facing website (TBD)
- [ ] contract code and UI audit by an independent 3rd party
- [ ] successful UI deployment to the Stacks blockchain mainnet
- [ ] activation of the mining function by independent miners :tada:

## References

- [Stacks Proof of Transfer Whitepaper](https://gaia.blockstack.org/hub/1AxyPunHHAHiEffXWESKfbvmBpGQv138Fp/stacks.pdf)
- [City Coins Product Requirements Document](./citycoin-prd.md)
- [Clarity Language Reference](https://docs.stacks.co/references/language-overview)
- [Build apps with Stacks](https://docs.stacks.co/build-apps/overview)

## Original README

A PoX-Lite Stackable Token (POXL).

**This code is for educational and demonstration purposes only.  IT HAS NOT BEEN
AUDITED.**

### How to Use

Tokens are minted through a mining process.  Anyone can call the `(mine-tokens)`
public function to commit STX to the contract in a bid to win the current Stacks
block's POXL reward.  A batch of POXL tokens are only minted if at least one
miner attempts to do so.

The POXL token is mined in a two-phase process.  First, miners commit STX to the
contract in a bid to "win" the current Stacks block's POXLs by calling the
`(mine-tokens)` public function.  The POXL coinbase is set at 500.000000 POXLs in perpetuity,
but a batch is only minted if at least one miner attempts to mine.  Second, after the token maturity
window passes (100 Stacks blocks), miners check to see if the VRF seed at
the end of this window selected them to receive the POXLs.  If so, then the
winning miner may claim the POXLs at any time afterwards.  Note that both the
act of mining and then claiming the POXLs are required to increase the total POXL supply
-- unclaimed POXLs are never minted.

Like STX, these tokens can be Stacked to produce a STX yield.  The POXL holder
calls `(stack-tokens)` to lock up their POXLs and earn the right to claim a 
portion of all STX committed by miners over a given number of reward cycles.
This portion is determined on a reawrd cycle basis by what fraction of the
locked POXLs the Stacker has locked versus all other Stackers.

This contract confirms to the draft version of [SIP
010](https://github.com/stacksgov/sips/pull/5/) for token transfers, making
it possible to trade POXLs via a standard API.

### How to Develop

To run (and hack on) the tests, you will need to build and install `clarity-cli` from the
[Stacks Blockchain](https://github.com/blockstack/stacks-blockchain) repo, and
put it in your `$PATH`.  From there, you can run the tests as follows:

```bash
$ cd tests/ && ./run-tests.sh
```

The test framework is very rudimentary -- it simply concatenates the
`poxl.clar` contract with another snippet of Clarity code containing the
unit tests, grabs a list of test functions from a `list-tests` function, and
executes them in order via the `clarity-cli` binary.
