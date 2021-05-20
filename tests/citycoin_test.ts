import { Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.6.0/index.ts';
import { assertEquals, assert } from "https://deno.land/std@0.93.0/testing/asserts.ts";

import {
  afterEach,
  beforeEach,
  beforeAll,
  describe,
  it,
} from "https://deno.land/x/test_suite@v0.7.0/mod.ts";

import {
  CityCoinClient,
  MinersList,
  MinersRec,
  ErrCode,
  FIRST_STACKING_BLOCK,
  REWARD_CYCLE_LENGTH
} from "../src/citycoin-client.ts"

describe('[CityCoin]', () => {
  let chain: Chain;
  let accounts: Map<string, Account>;
  let client: CityCoinClient;
  let deployer: Account;
  let wallet_1: Account;
  let wallet_2: Account;
  let wallet_3: Account;

  function setupCleanEnv() {
    (Deno as any).core.ops();
    let transactions: Array<Tx> = [];
    let result = (Deno as any).core.jsonOpSync("setup_chain", {
      transactions: transactions,
    });

    chain = new Chain(result['session_id']);
    accounts = new Map();

    for (let account of result['accounts']) {
      accounts.set(account.name, account);
    }

    deployer = accounts.get('deployer')!;
    wallet_1 = accounts.get('wallet_1')!;
    wallet_2 = accounts.get('wallet_2')!;
    wallet_3 = accounts.get('wallet_3')!;

    client = new CityCoinClient(chain, deployer);
  }

  describe("SIP-010 api:", () => {
    setupCleanEnv();

    describe("transfer()", () => {
      it("should fail with u3 when token sender is different than transaction sender", () => {
        const from = wallet_1;
        const to = wallet_2;

        const block = chain.mineBlock([
          client.transfer(10, from, to, to)
        ]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectErr().expectUint(3);
      });
    });

    describe("get-name()", () => {
      it("should return 'citycoins'", () => {
        const result = client.getName().result;

        result.expectOk().expectAscii("citycoins");
      });
    });

    describe("get-symbol()", () => {
      it("should return 'CYCN'", () => {
        const result = client.getSymbol().result;

        result.expectOk().expectAscii("CYCN");
      });
    });

    describe("get-decimals()", () => {
      it("should return 6", () => {
        const result = client.getDecimals().result;

        result.expectOk().expectUint(6);
      });
    });

    describe("get-balance-of()", () => {
      it("should return 0", () => {
        const result = client.getBalanceOf(wallet_1).result;

        result.expectOk().expectUint(0);
      });

      it("should return 100", () => {
        chain.mineBlock([
          client.ftMint(100, wallet_1)
        ]);

        const result = client.getBalanceOf(wallet_1).result;

        result.expectOk().expectUint(100);
      });
    });

    describe("get-total-supply()", () => {
      it("should return 0", () => {
        const result = client.getTotalSupply().result;

        result.expectOk().expectUint(0);
      });

      it("should return 100", () => {
        chain.mineBlock([
          client.mineTokens(100, wallet_1)
        ]);

        const result = client.getTotalSupply().result;

        result.expectOk().expectUint(100);
      });
    });

    describe("get-token-uri()", () => {
      it("should return none", () => {
        const result = client.getTokenUri().result;

        result.expectOk().expectNone();
      });
    });
  });

  describe("Read only functions:", () => {
    setupCleanEnv();

    describe("get-block-commit-total()", () => {
      it("should return 0 when miners list is empty", () => {
        const miners = new MinersList();

        const result = client.getBlockCommitTotal(miners).result;

        result.expectUint(0);
      })

      it("should return 100", () => {
        const miners = new MinersList();
        miners.push(
          { miner: wallet_1, amountUstx: 30 },
          { miner: wallet_2, amountUstx: 70 },
        )

        const result = client.getBlockCommitTotal(miners).result;

        result.expectUint(100);
      });
    });

    describe("getBlockWinner()", () => {
      it("should select correct winer", () => {
        const miners = new MinersList();
        miners.push(
          { miner: wallet_1, amountUstx: 1 },
          { miner: wallet_2, amountUstx: 2 },
          { miner: wallet_3, amountUstx: 3 },
        );

        const known_rnd_winners = [0, 1, 1, 2, 2, 2, 0, 1, 1, 2, 2, 2, 0]

        known_rnd_winners.forEach((e, i) => {
          let result = client.getBlockWinner(i, miners).result;
          let winner = result.expectSome().expectTuple();
          let expectedWinner = miners.getFormatted(e)

          assertEquals(winner, expectedWinner);
        });
      });

      it("should return no winner if there are no miners", () => {
        const result = client.getBlockWinner(0, new MinersList()).result;

        result.expectNone();
      });
    });

    describe("has-mined-in-list()", () => {
      const miners = new MinersList();
      miners.push(
        { miner: wallet_1, amountUstx: 1 },
        { miner: wallet_2, amountUstx: 2 },
      );

      it("returns true if miner is in a list", () => {
        const result = client.hasMinedInList(wallet_2, miners).result;

        result.expectBool(true);
      })

      it("returns false if miner is not in a list", () => {
        const result = client.hasMinedInList(wallet_3, miners).result;

        result.expectBool(false);
      });
    });

    describe("can-claim-tokens()", () => {
      const miners = new MinersList();
      miners.push(
        { miner: wallet_1, amountUstx: 1 },
        { miner: wallet_2, amountUstx: 2 },
        { miner: wallet_3, amountUstx: 3 },
      );

      const claimedRec = new MinersRec(miners, true);
      const unclaimedRec = new MinersRec(miners, false);
      const tokenRewardMaturity = 100;


      it("returns true", () => {
        const currentStacksBlock = tokenRewardMaturity + 1;
        const results = [
          client.canClaimTokens(wallet_1, 0, 0, unclaimedRec, currentStacksBlock).result,
          client.canClaimTokens(wallet_2, 0, 1, unclaimedRec, currentStacksBlock).result,
          client.canClaimTokens(wallet_2, 0, 2, unclaimedRec, currentStacksBlock).result,
          client.canClaimTokens(wallet_3, 0, 3, unclaimedRec, currentStacksBlock).result,
          client.canClaimTokens(wallet_3, 0, 4, unclaimedRec, currentStacksBlock).result,
          client.canClaimTokens(wallet_3, 0, 5, unclaimedRec, currentStacksBlock).result,
          client.canClaimTokens(wallet_1, 0, 6, unclaimedRec, currentStacksBlock).result,
        ];

        results.forEach((result) => {
          result.expectOk().expectBool(true);
        });
      });

      it("throws ERR_UNAUTHORIZED error", () => {
        const currentStacksBlock = tokenRewardMaturity + 1;

        const results = [
          client.canClaimTokens(wallet_2, 0, 0, unclaimedRec, currentStacksBlock).result,
          client.canClaimTokens(wallet_1, 0, 1, unclaimedRec, currentStacksBlock).result,
          client.canClaimTokens(wallet_3, 0, 2, unclaimedRec, currentStacksBlock).result,
        ]

        results.forEach((result) => {
          result.expectErr().expectUint(ErrCode.ERR_UNAUTHORIZED);
        });
      });

      it("throws ERR_IMMATURE_TOKEN_REWARD", () => {
        const result = client.canClaimTokens(wallet_1, 0, 0, unclaimedRec, tokenRewardMaturity).result;

        result.expectErr().expectUint(ErrCode.ERR_IMMATURE_TOKEN_REWARD);
      });

      it("throws ERR_ALREADY_CLAIMED error", () => {
        const currentStacksBlock = tokenRewardMaturity + 1;
        const result = client.canClaimTokens(wallet_1, 0, 0, claimedRec, currentStacksBlock).result;

        result.expectErr().expectUint(ErrCode.ERR_ALREADY_CLAIMED);
      });
    });

    describe("can-mine-tokens()", () => {
      const miners = new MinersList();
      miners.push(
        { miner: wallet_1, amountUstx: 1 },
        { miner: wallet_2, amountUstx: 2 },
      );

      const minersFull = new MinersList();
      for (let i = 1; i <= 32; i++) {
        minersFull.push({ miner: wallet_1, amountUstx: 10 })
      }

      const minersRec = new MinersRec(miners, false);
      const minersRecFull = new MinersRec(minersFull, false);

      it("returns true", () => {
        const result = client.canMineTokens(wallet_3, 1, 10, minersRec).result;

        result.expectOk().expectBool(true);
      });

      it("throws ERR_STACKING_NOT_AVAILABLE error", () => {
        const result = client.canMineTokens(wallet_3, 0, 10, minersRec).result;

        result.expectErr().expectUint(ErrCode.ERR_STACKING_NOT_AVALIABLE);
      });

      it("throws ERR_ROUND_FULL error", () => {
        const result = client.canMineTokens(wallet_2, 1, 10, minersRecFull).result;

        result.expectErr().expectUint(ErrCode.ERR_ROUND_FULL);
      });

      it("throws ERR_ALREADY_MINED error", () => {
        const result = client.canMineTokens(wallet_1, 1, 10, minersRec).result;

        result.expectErr().expectUint(ErrCode.ERR_ALREADY_MINED);
      });

      it("throws ERR_CANNOT_MINE error", () => {
        const result = client.canMineTokens(wallet_3, 1, 0, minersRec).result;

        result.expectErr().expectUint(ErrCode.ERR_CANNOT_MINE);
      });

      it("throws ERR_INSUFFICIENT_BALANCE error", () => {
        const result = client.canMineTokens(wallet_3, 1, wallet_3.balance + 1, minersRec).result;

        result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_BALANCE);
      });
    });

    describe("can-stack-tokens()", () => {
      it("throws ERR_CANNOT_STACK error if nowStacksHeight < startStacksHeight", () => {
        const nowStacksHeight = 3;
        const startStacksHeight = 2;

        const result = client.canStackTokens(wallet_1, 100, nowStacksHeight, startStacksHeight, 1).result;

        result.expectErr().expectUint(ErrCode.ERR_CANNOT_STACK);
      });

      it("throws ERR_CANNOT_STACK error if lockPeriod=0 or lockPeriod > max-reward-cycles (32)", () => {
        const nowStacksHeight = 502;
        const startStacksHeight = 510;

        const results = [
          client.canStackTokens(wallet_1, 100, nowStacksHeight, startStacksHeight, 0).result,
          client.canStackTokens(wallet_1, 100, nowStacksHeight, startStacksHeight, 33).result,
        ]

        results.forEach((result) => {
          result.expectErr().expectUint(ErrCode.ERR_CANNOT_STACK);
        })
      });

      it("throws ERR_CANNOT_STACK error if amoutToken = 0", () => {
        const nowStacksHeight = 502;
        const startStacksHeight = 510;
        const amountToken = 0;

        const result = client.canStackTokens(wallet_1, amountToken, nowStacksHeight, startStacksHeight, 1).result;

        result.expectErr().expectUint(ErrCode.ERR_CANNOT_STACK);
      });

      it("throws ERR_INSUFFICIENT_BALANCE if stacker doesn't have enough tokens", () => {
        const nowStacksHeight = 2;
        const startStacksHeight = 3;
        const amountToken = 100000;

        const result = client.canStackTokens(wallet_1, amountToken, nowStacksHeight, startStacksHeight, 1).result;

        result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_BALANCE);
      });
    });

    describe("get-entitled-stacking-reward()", () => {
      setupCleanEnv();

      it("returns 0", () => {
        const stacker = wallet_1;
        const targetRewardCycle = 0
        const currentBlockHeight = 0;

        const result = client.getEntitledStackingReward(stacker, targetRewardCycle, currentBlockHeight).result;

        result.expectUint(0);
      });

      it("returns 1000 if miners commited only 1000ustx and there is only one stacker", () => {
        const stacker = wallet_1;
        const miner = wallet_2;
        const minerCommitment = 1000;
        const targetRewardCycle = 1;

        // add tokens and stack them at the next cycle
        chain.mineBlock([
          client.ftMint(5000, stacker),
          client.stackTokens(5000, 5, targetRewardCycle, stacker),
        ]);

        // move chain forward to jump into 1st staking cycle
        chain.mineEmptyBlock(500);

        // mine some tokes
        chain.mineBlock([
          client.mineTokens(minerCommitment, miner)
        ]);

        // move chain forward to jump into 2nd staking cycle
        const block = chain.mineEmptyBlock(500);

        const result = client.getEntitledStackingReward(stacker, targetRewardCycle, block.block_height).result;

        result.expectUint(minerCommitment);
      });
    });

    describe("get-reward-cycle()", () => {
      it("returns None if stacksBlockHeight is equal 0", () => {
        const result = client.getRewardCycle(0).result;

        result.expectNone()
      });

      it("returns Some with correct value when stacksBlockHeight > 0", () => {
        const blockHeights = [1, 5, 499, 500, 501, 1001];

        blockHeights.forEach((stacksBlockHeight) => {
          const expectedValue = Math.floor((stacksBlockHeight - FIRST_STACKING_BLOCK) / REWARD_CYCLE_LENGTH);

          const result = client.getRewardCycle(stacksBlockHeight).result;

          result.expectSome().expectUint(expectedValue);
        });
      });
    });

    describe("get-first-block-height-in-reward-cycle", () => {
      it("returns correct value", () => {
        const rewardCycles = [0, 1, 2, 3, 5, 15, 24, 44, 890];

        rewardCycles.forEach((rewardCycle) => {
          const expectedValue = FIRST_STACKING_BLOCK + (REWARD_CYCLE_LENGTH * rewardCycle);

          const result = client.getFirstBlockHeightInRewardCycle(rewardCycle).result;

          result.expectUint(expectedValue);
        });
      });
    });
  });
});