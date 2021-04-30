# Citycoins on Stacks

- [Mining](#mining)
- [Stacking](#stacking)
- [Code Requirements - Contract Modifications](#code-requirements---contract-modifications)
- [Code Requirements - UI/UX](#code-requirements---uiux)
- [Code Quality](#code-quality)
- [Launch Requirements](#launch-requirements)
- [References](#references)
- [Original README content](#original-readme-content)
    - [How to Use](#how-to-use)
    - [How to Develop](#how-to-develop)

This repository contains code to recreate the [Proof of Transfer consensus mechanism](https://docs.stacks.co/understand-stacks/proof-of-transfer) via a smart contract on the [Stacks blockchain](https://www.stacks.co/).

The contract is further modified to support the creation of a 'citycoin', following the properties outlined below.

## Mining

- for each Stacks block in the Stacks blockchain, miners can mine a fixed amount of citycoins
- anyone can mine the citycoin by submitting STX to the contract
- the winning miner for a given Stacks block is selected by a VRF, weighted by the miner's STX bid compared to the total STX bid in a given Stacks block
- the winning miner is eligible for a fixed amount of the citycoin as a reward
- after 100 Stacks blocks, the winning miner may claim the citycoin at any time
- both the act of mining then claiming the citycoin are required to increase the total supply, unclaimed citycoins are never minted

## Stacking

- anyone can lock up their citycoins and earn the right to claim a portion of all STX commited by miners over a given number of reward cycles
- the STX rewards in a given reward cycle are determined by what fraction of citycoins are locked up compared to all other Stackers
- the STX rewards will be distributed 70% to citycoin holders and 30% to a custodied STX account that represents the city treasury
- the STX rewards by Stackers could then be Stacked again on the Stacks blockchain, yielding Bitcoin

## Code Requirements - Contract Modifications

In order to achieve the objectives above, the following modifications need to be made to the contract.

A set of issues and project board will be created based on the tasks listed below.

**PRs are welcome!**

- [ ] implement the SIP-010 trait via `impl-trait`
- [ ] rename token to better illustrate goals of this contract
- [ ] set up clear instructions for testing the contract, some options listed below
  - [ ] via clarity-cli (single caller, very fast)
  - [ ] via testnet (multiple callers, subject to varying block times)
- [ ] cost estimation for the contract based [on this PR in stacks-blockchain](https://github.com/blockstack/stacks-blockchain/pull/2597)
- [ ] code coverage for the contract based [on this PR in stacks-blockchain](https://github.com/blockstack/stacks-blockchain/pull/2592)
- [ ] determine optimal number of miners allowed per Stacks block
  - the list size must be defined per Clarity language requirements
  - the current size of the list is 32 miners
  - contract costs will be based on the actual size of the list at runtime
- [ ] add function to allow mining across multiple blocks
  - the current configuration would require submitting a Stacks transaction in every block
  - miners should be able to select an amount of STX and number of blocks to mine for
  - miners should be registered in the mining map based on the rate and duration chosen
- [ ] modify mining function to split rewards between Stackers and a custodied wallet address
  - custodied wallet address will be managed and secured by an Exchange
  - custodied wallet keys are only accessible to the respective city (mayor, treasurer, etc)
  - if Stacking is active:
    - 70% of the miner commits are distributed to Stackers of the citycoin
    - 30% of the miner commits are distributed to the custodied wallet for the city ("THE BAG")
  - if Stacking is not active:
    - 100% of the miner commits are distributed to the custodied wallet for the city ("THE BAG")
- [ ] modify mining function so that coinbase rewards follow a token emission schedule, similar to Bitcoin and Stacks (TBD)
  - e.g. 1000 STX/block for first 4 yrs; 500 STX/block for following 4 yrs; 250 for the 4 yrs after that; and then 125 STX/block in perpetuity after that
- [ ] add versioning system to allow for future code revisions
  - use getters around all map data and use `at-block` as a pointer
  - e.g. if 2.0 is deployed, 1.0 miners should still be able to claim rewards
  - e.g. if block is from 1.0 era, then use `at-block` to get map from old contract
- [ ] add read-only getters around all contract info
  - will serve as data source for future contracts or tools
  - will allow for recreation of experiences like [stxmining.club](https://stxmining.club) and [stacking.club](https://stacking.club)

## Code Requirements - UI/UX

In order to incentivize a fair launch, a basic UI/UX needs to be built on top of the contract.

A set of issues and project board will be created based on the tasks listed below.

**PRs are welcome!**

- [ ] the web UI enables mining of the citycoin
  - [ ] a miner can submit STX to the contract using the Stacks Web Wallet
  - [ ] a miner can choose to submit for one or multiple blocks at a given rate
  - [ ] a miner can see available citycoin rewards and claim them
  - [ ] a miner can see their mining history, stored in Gaia
- [ ] develop basic web UI that enables Stacking of the citycoin
  - [ ] a Stacker can submit citycoin to the contract using the Stacks Web Wallet
  - [ ] a Stacker can choose the number of reward cycles to participate in
  - [ ] a Stacker can see available STX rewards and claim them
  - [ ] a Stacker can see their Stacking history, stored in Gaia

## Code Quality

All code submitted should be thoroughly commented and tested where applicable.

Configurable options for the smart contract or the web UI should be listed as constants.

## Launch Requirements

- [ ] draft whitepaper created based on current product requirements document
- [ ] successful legal review of policies and regulations around a fair launch and city acquisition of custodied tokens
- [ ] contract deployed to testnet implementing and successfully demonstrating all points above
- [ ] contract code audit by an independent 3rd party
- [ ] successful deployment to mainnet :tada:

## References

- [Stacks Proof of Transfer Whitepaper](https://gaia.blockstack.org/hub/1AxyPunHHAHiEffXWESKfbvmBpGQv138Fp/stacks.pdf)
- [Citycoin Product Requirements Document](https://docs.google.com/document/d/10ZIX5K0vDfTeBSguT_rmG0Wz9CkuVax1adR_t1-z9UA/edit?usp=sharing)
- [Clarity Language Reference](https://docs.stacks.co/references/language-overview)
- [Build apps with Stacks](https://docs.stacks.co/build-apps/overview)

## Original README content

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
