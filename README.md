# poxl

A PoX-Lite Stackable Token (POXL).

**This code is for educational and demonstration purposes only.  IT HAS NOT BEEN
AUDITED.**

## How to Use

Tokens are minted through a mining process.  Anyone can call the `(mine-tokens)`
public function to commit STX to the contract in a bid to win the current Stacks
block's POXL reward.  A batch of POXL tokens are only minted if at least one
miner attempts to do so.

The POXL token is mined in a two-phase process.  First, miners commit STX to the
contract in a bid to "win" the current Stacks block's POXLs (the POXL coinbase
is set at 500.000000 POXLs in perpetuity).  Second, after the token maturity
window passes (100 Stacks blocks), miners check to see if the VRF seed at
the end of this window selected them to receive the POXLs.  If so, then the
winning miner may claim the POXLs at any time.

Like STX, these tokens can be Stacked to produce a STX yield.  The POXL holder
calls `(stack-tokens)` to lock up their POXLs and earn the right to claim a 
portion of all STX committed by miners over a given number of reward cycles.
This portion is determined on a reawrd cycle basis by what fraction of the
locked POXLs the Stacker has locked versus all other Stackers.

This contract confirms to the draft version of [SIP
010](https://github.com/stacksgov/sips/pull/5/) for token transfers, making
it possible to trade POXLs via a standard API.

## How to Develop

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
