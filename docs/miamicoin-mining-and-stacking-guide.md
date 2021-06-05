# MiamiCoin Mining and Stacking Guide

![MiamiCoin Logo](https://cdn.citycoins.co/logos/miamicoin_200px.png)

Introducing MiamiCoin, the first CityCoin built as a fungible token on the [Stacks blockchain](https://stacks.co).

## Stacks Web Wallet

The [Stacks Web Wallet](https://hiro.so/wallet/install-web) is required to interact with the MiamiCoin smart contract on the Stacks blockchain.

It is a browser extension available for both Chrome and Firefox, and at this time the actions below are intended to be performed from a desktop or laptop.

In addition, each of the actions below requires sending a transaction to the smart contract, with transaction fees paid in Stacks (STX).

## Activation of Mining

MiamiCoins can only be mined, and there are no MiamiCoins issued or distributed prior to the start of mining.

In order for mining to begin, 20 unique wallets are required to signal activation, after which a 150 block (~24 hour) countdown begins then anyone is eligible to mine the MiamiCoins within a given Stacks block.

## Mining MiamiCoin

Mining MiamiCoins is performed by transferring Stacks (STX) tokens into the smart contract in a given block, and is a one-way process. Miners can only participate once per block.

Once the STX tokens are sent into the contract, they are distributed in one of two ways:

- if there are people Stacking MiamiCoins, then 70% of the bid is sent to Stackers and 30% of the bid is sent to the custodied wallet for the city
- if nobody is Stacking MiamiCoins, then 100% of the bid is sent to the custodied wallet for the city

**Please note:** Right after mining is activated and during the first reward cycle (reward cycle #0), 100% of all STX sent by miners is transferred to the city. During this time, MiamiCoins can be stacked for the next reward cycle, and following this initialization Stacking will be available indefinitely.

See the [Stacking MiamiCoin](#stacking-miamicoin) section for more information.

## Winner Selection

After miners send their STX bid, a winner is selected by a Verifiable Random Function (VRF) weighted by the individual miners' bid compared to the total miners' bids sent in that block.

e.g. if Alice sends 10 STX into the contract and Bob sends 30 STX, then Alice has a 25% chance and Bob has a 75% chance to win in that block.

## Mining Strategy

You can only submit a mining bid once per block. Once that transaction confirms then the bid is locked in.

There is a maximum of 128 miners per block, however once that threshold is reached, additional miners can still submit a bid subject to the following rules:

- if the bid is lower than the lowest bid of the 128 miners, then the bid is rejected
- if the bid is higher than the lowest bid of the 128 miners, then the lowest bidder is pushed out from the list

**Please note:** Miners who has been pushed out of the list are not taking part of the winner selection and their commitment is not refundable.

## Claiming Mining Rewards

Miners must wait for a maturity window of 100 blocks (~16 hours) before they can claim their tokens in order to protect the VRF seed. After this window passes miners can claim their rewards at any time.

**Please note:** MiamiCoins are not minted until miners claim them, and therefore the total supply will only increase when miners claim their MiamiCoins.

## Stacking MiamiCoin 

Stacking MiamiCoins is performed by transferring MiamiCoins into the smart contract for a selected number of reward cycles. Reward cycles are 2,100 Stacks blocks in length, or about 2 weeks, similar to Stacking STX.

When Stacking, you must select:

- the amount of MiamiCoins you want to Stack, which will be sent to the smart contract
- the Stacks block height you want to start Stacking, which must be in the future
- the number of reward cycles you want to participate in, maximum 32

**Please note:** the block height chosen for Stacking will automatically select the *next reward cycle* to start Stacking MiamiCoins. e.g. if you select a block height in reward cycle 1 then Stacking will begin in reward cycle 2.

You cannot Stack in the currently active reward cycle.

## Claiming Stacking Rewards

While Stacking MiamiCoin is similar to Stacking STX, however there are a few key differences.

Instead of rewards being delivered automatically during the cycle, Stackers must wait for the **number of chosen reward cycles to pass** before claiming their Stacking rewards, which consist of:

- the amount of MiamiCoins they Stacked
- the Stacks (STX) sent by miners

Each Stacker receives rewards proportionate to what they stacked against the total amount of Stacked MiamiCoins for the given reward cycle.

## Issuance Schedule

Please see the [Product Requirements Document](../citycoin-prd.md#issuance-schedule) for more information on how MiamiCoins will be distributed over time.

## Block Time

Stacks blocks are 1:1 with Bitcoin blocks, and a new one is created every 10 minutes on average. All times referenced in this document operate off the the number of blocks, and any other times are estimated by this average.
