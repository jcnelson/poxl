import { Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.10.0/index.ts';
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
  MinedBlock,
  ErrCode,
  FIRST_STACKING_BLOCK,
  REWARD_CYCLE_LENGTH,
  MINING_ACTIVATION_DELAY,
  MINING_HALVING_BLOCKS,
  SPLIT_STACKER_PERCENTAGE,
  SPLIT_CITY_PERCENTAGE
} from "../src/citycoin-client.ts"

describe('[CityCoin]', () => {
  let chain: Chain;
  let accounts: Map<string, Account>;
  let client: CityCoinClient;
  let deployer: Account;
  let wallet_1: Account;
  let wallet_2: Account;
  let wallet_3: Account;
  let wallet_4: Account;
  let wallet_5: Account;
  let wallet_6: Account;

  function setupCleanEnv() {
    (Deno as any).core.ops();
    let transactions: Array<Tx> = [];
    let result = (Deno as any).core.jsonOpSync("setup_chain", {
      name: 'citycoin',
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
    wallet_4 = accounts.get('wallet_4')!;
    wallet_5 = accounts.get('wallet_5')!;
    wallet_6 = accounts.get('wallet_6')!;

    client = new CityCoinClient(chain, deployer);
  }

  describe("SIP-010:", () => {
    setupCleanEnv();

    describe("transfer()", () => {
      beforeEach(() => {
        setupCleanEnv();
      })

      it("succeeds with no memo supplied", () => {
        const from = wallet_1;
        const to = wallet_2;
        const amount = 100;

        chain.mineBlock([
          client.ftMint(amount, wallet_1)
        ]);

        const block = chain.mineBlock([
          client.transfer(amount, from, to, from)
        ]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectOk();
        block.receipts[0].events.expectFungibleTokenTransferEvent(
          amount,
          from.address,
          to.address,
          'citycoins'
        );
      });

      it("succeeds with memo supplied", () => {
        const from = wallet_1;
        const to = wallet_2;
        const amount = 100;
        const memo = new TextEncoder().encode("MiamiCoin is the first CityCoin");

        chain.mineBlock([
          client.ftMint(amount, wallet_1)
        ]);

        const block = chain.mineBlock([
          client.transfer(amount, from, to, from, memo)
        ]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectOk();

        const expectedEvent = {
          type: "contract_event", 
          contract_event: {
            contract_identifier: client.getContractAddress(),
            topic: "print",
            value: types.some(types.buff(memo))
          }
        }

        const receipt = block.receipts[0];
        assertEquals(receipt.events.length, 2);
        assertEquals(receipt.events[0], expectedEvent);
        receipt.events.expectFungibleTokenTransferEvent(
          amount,
          from.address,
          to.address,
          'citycoins'
        );
      });

      it("fails with u1 when sender does not have enough funds", () => {
        const from = wallet_1;
        const to = wallet_2;

        const block = chain.mineBlock([
          client.transfer(100, from, to, from)
        ]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectErr().expectUint(1);
      });

      it("fails with u2 when sender and recipient are the same", () => {
        const from = wallet_1;
        const to = wallet_1;

        chain.mineBlock([
          client.ftMint(100, from)
        ])

        const block = chain.mineBlock([
          client.transfer(100, from, to, from)
        ]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectErr().expectUint(2);
      });

      it("fails with u3 when token sender is different than transaction sender", () => {
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
      it("returns 'citycoins'", () => {
        const result = client.getName().result;

        result.expectOk().expectAscii("citycoins");
      });
    });

    describe("get-symbol()", () => {
      it("returns 'CYCN'", () => {
        const result = client.getSymbol().result;

        result.expectOk().expectAscii("CYCN");
      });
    });

    describe("get-decimals()", () => {
      it("returns 0", () => {
        const result = client.getDecimals().result;

        result.expectOk().expectUint(0);
      });
    });

    describe("get-balance()", () => {
      it("returns 0 when no tokens are minted", () => {
        const result = client.getBalance(wallet_1).result;

        result.expectOk().expectUint(0);
      });

      it("returns 100 after 100 tokens are minted to a wallet", () => {
        chain.mineBlock([
          client.ftMint(100, wallet_1)
        ]);

        const result = client.getBalance(wallet_1).result;

        result.expectOk().expectUint(100);
      });
    });

    describe("get-total-supply()", () => {
      beforeEach(() => {
        setupCleanEnv();
      })

      it("returns 0 when no tokens are minted", () => {
        const result = client.getTotalSupply().result;

        result.expectOk().expectUint(0);
      });

      it("returns 100 after 100 tokens are minted", () => {
        chain.mineBlock([
          client.ftMint(100, wallet_1)
        ]);

        const result = client.getTotalSupply().result;

        result.expectOk().expectUint(100);
      });

      it("returns 250000 after a miner wins a block", () => {
        // activate mining
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);

        // advance chain to block where mining is active
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        // mine a block
        const block = chain.mineBlock([
          client.mineTokens(100, wallet_1)
        ]);

        // advance chain past miner reward window
        chain.mineEmptyBlock(101);

        // claim tokens so they are minted
        chain.mineBlock([
          client.claimTokenReward(block.height - 1, wallet_1)
        ]);

        const result = client.getTotalSupply().result;

        result.expectOk().expectUint(250000);
      });

    });

    describe("get-token-uri()", () => {
      it("returns correct uri", () => {
        const result = client.getTokenUri().result;
        const tokenUri = "https://cdn.citycoins.co/metadata/citycoin.json";

        console.log(`\n  URI: ${tokenUri}`)
        result.expectOk().expectSome().expectUtf8(tokenUri);
      });
    });
  });

  describe("Read Only:", () => {
    setupCleanEnv();

    describe("get-total-supply-ustx()", () => {
      beforeEach(() => {
        setupCleanEnv();
      })

      it("returns 0 if nobody mined", () => {
        const result = client.getTotalSupplyUstx().result;

        result.expectOk().expectUint(0);
      });

      it("returns 0 if someone mined but stackers are not stacking", () => {
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);

        // skip mining activation delay period
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY)

        chain.mineBlock([
          client.mineTokens(100, wallet_1)
        ]);

        const result = client.getTotalSupplyUstx().result;

        result.expectOk().expectUint(0);
      });

      // returns 70% of commitment when stackers are stacking
      it("returns 100 * SPLIT_STACKER_PERCENTAGE if someone mined and stackers are stacking", () => {
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        const startStacksHeight = MINING_ACTIVATION_DELAY + 5;

        chain.mineBlock([
          client.ftMint(100, wallet_1),
          client.stackTokens(100, startStacksHeight, 1, wallet_1)
        ]);

        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH + 1)

        chain.mineBlock([
          client.mineTokens(100, wallet_1)
        ]);

        const result = client.getTotalSupplyUstx().result;

        result.expectOk().expectUint(100 * SPLIT_STACKER_PERCENTAGE);
      });
    });

    describe("get-coinbase-amount()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("returns u0 if mining is not active", () => {
        // pass a non-existent block height
        // simulates transaction if mining not active
        const result = client.getCoinbaseAmount(1).result;
        
        result.expectUint(0);
      });

      it("returns correct coinbase amount based on Stacks block height", () => {
        // activate mining
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);

        // advance chain to block where mining is active
        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        const startHeight = block.block_height - 1;

        const testData = [
          {blockHeight: startHeight - 1, reward: 0},          // prior to mining activation (no reward)
          {blockHeight: startHeight, reward: 250000},         // at mining activation (bonus reward)
          {blockHeight: startHeight + 1, reward: 250000},     // first block after mining activation block (bonus reward)
          {blockHeight: startHeight + 10000, reward: 250000}, // 1000th block after mining activation block (last bonus reward)
          {blockHeight: startHeight + 10001, reward: 100000}, // 1001st block after mining activation block (first standard reward)
          {blockHeight: startHeight + MINING_HALVING_BLOCKS, reward: 100000},              // 1st halving
          {blockHeight: startHeight + MINING_HALVING_BLOCKS + 1, reward: 50000},           // after 1st halving
          {blockHeight: startHeight + (MINING_HALVING_BLOCKS * 2), reward: 50000},         // 2nd halving
          {blockHeight: startHeight + (MINING_HALVING_BLOCKS * 2) + 1, reward: 25000},     // after 2nd halving
          {blockHeight: startHeight + (MINING_HALVING_BLOCKS * 3), reward: 25000},         // 3rd halving
          {blockHeight: startHeight + (MINING_HALVING_BLOCKS * 3) + 1, reward: 12500},     // after 3rd halving
          {blockHeight: startHeight + (MINING_HALVING_BLOCKS * 4), reward: 12500},         // 4th halving
          {blockHeight: startHeight + (MINING_HALVING_BLOCKS * 4) + 1, reward: 6250},      // after 4th halving
          {blockHeight: startHeight + (MINING_HALVING_BLOCKS * 5), reward: 6250},          // 5th halving
          {blockHeight: startHeight + (MINING_HALVING_BLOCKS * 5) + 1, reward: 3125},      // after 5th halving
          {blockHeight: startHeight + (MINING_HALVING_BLOCKS * 5) + 1234, reward: 3125},   // after 5th halving
        ]

        console.log(`\n  mining activated at block ${startHeight}`)

        testData.forEach(t => {
          let result = client.getCoinbaseAmount(t.blockHeight).result;
          
          try {
            result.expectUint(t.reward);
            console.log(`  success at block ${t.blockHeight} with reward ${t.reward}`)
          } catch (error) {
            throw new Error(`Failed to return correct coinbase amount at block ${t.blockHeight}\n${error}`);
          }
        });

      });
    });

    describe("get-block-commit-total()", () => {
      setupCleanEnv();

      it("returns 0 when miners list is empty", () => {
        const result = client.getBlockCommitTotal(1).result;
        result.expectUint(0);
      })

      it("returns 100 when two miners commit 30 and 70", () => {
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);
        
        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        
        chain.mineBlock([
          client.mineTokens(30, wallet_1),
          client.mineTokens(70, wallet_2)
        ]);

        const result = client.getBlockCommitTotal(block.block_height).result;

        result.expectUint(100);
      });
    });

    describe("get-block-commit-to-stackers()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("returns 0 when miners list is empty", () => {
        const result = client.getBlockCommitToStackers(1).result;
        result.expectUint(0);
      })

      it("returns 0 when no stackers are stacking", () => {
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);
        
        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        
        chain.mineBlock([
          client.mineTokens(30, wallet_1),
          client.mineTokens(70, wallet_2)
        ]);

        const result = client.getBlockCommitToStackers(block.block_height).result;

        result.expectUint(0);
      });

      it("returns 100 * SPLIT_STACKER_PERCENTAGE when stackers are stacking", () => {

        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);

        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        // stack in cycle 1 while cycle 0 is active
        chain.mineBlock([
          client.ftMint(100, wallet_2),
          client.stackTokens(100, MINING_ACTIVATION_DELAY + 5, 1, wallet_2)
        ]);

        // progress into reward cycle 1
        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        // mine during cycle 1, which will be split
        const block = chain.mineBlock([
          client.mineTokens(30, wallet_1),
          client.mineTokens(70, wallet_2)
        ]);

        // check that split stacker commit was stored correctly in map
        const result = client.getBlockCommitToStackers(block.height - 1).result;

        result.expectUint(100 * SPLIT_STACKER_PERCENTAGE);
      });

    });

    describe("get-block-commit-to-city()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("returns 0 when miners list is empty", () => {
        const result = client.getBlockCommitToCity(1).result;
        result.expectUint(0);
      })

      it("returns 100 when no stackers are stacking", () => {
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);
        
        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        
        chain.mineBlock([
          client.mineTokens(30, wallet_1),
          client.mineTokens(70, wallet_2)
        ]);

        const result = client.getBlockCommitToCity(block.block_height).result;

        result.expectUint(100);
      });

      it("returns 100 * SPLIT_CITY_PERCENTAGE when stackers are stacking", () => {

        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);

        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        // stack in cycle 1 while cycle 0 is active
        chain.mineBlock([
          client.ftMint(100, wallet_2),
          client.stackTokens(100, MINING_ACTIVATION_DELAY + 5, 1, wallet_2)
        ]);

        // progress into reward cycle 1
        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        // mine during cycle 1, which will be split
        const block = chain.mineBlock([
          client.mineTokens(30, wallet_1),
          client.mineTokens(70, wallet_2)
        ]);

        // check that split stacker commit was stored correctly in map
        const result = client.getBlockCommitToCity(block.height - 1).result;

        result.expectUint(100 * SPLIT_CITY_PERCENTAGE);
      });

    });

    describe("get-block-winner()", () => {
      it("selects the correct winner", () => {
        // TODO: review this test in more detail
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);
        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        const miners = new MinersList();
        miners.push(
          { miner: wallet_1, minerId: 1, amountUstx: 1 },
          { miner: wallet_2, minerId: 2, amountUstx: 2 },
          { miner: wallet_3, minerId: 3, amountUstx: 3 },
        );
        
        chain.mineBlock([
          client.mineTokens(miners[0].amountUstx, miners[0].miner),
          client.mineTokens(miners[1].amountUstx, miners[1].miner),
          client.mineTokens(miners[2].amountUstx, miners[2].miner),
        ]);

        chain.mineEmptyBlock(500)

        const known_rnd_winners = [0, 1, 1, 2, 2, 2, 0, 1, 1, 2, 2, 2, 0]

        known_rnd_winners.forEach((e, i) => {
          let result = client.getBlockWinner(block.block_height, i).result;
          let winner = result.expectSome().expectTuple();
          let expectedWinner = miners.getFormatted(e)

          assertEquals(winner, expectedWinner);
        });
      });

      it("returns no winner if there are no miners", () => {
        const result = client.getBlockWinner(200, 0).result;

        result.expectNone();
      });
    });

    describe("has-mined()", () => {
      beforeEach(() => {
        setupCleanEnv();
      })
  
      it("returns true if miner mined in selected block", () => {
        // activate mining
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);

        // advance chain to block where mining is active
        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        const blockHeight = block.block_height;
        
        chain.mineBlock([
          client.mineTokens(200, wallet_1)
        ]);
        
        const result = client.hasMined(wallet_1, blockHeight).result;

        result.expectBool(true);
      })

      it("returns false if miner didn't mine in selected block", () => {
        const result = client.hasMined(wallet_2, 800).result;

        result.expectBool(false);
      });
    });

    describe("can-claim-tokens()", () => {
      beforeEach(() => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);
      })

      const miners = new MinersList();
      miners.push(
        { miner: wallet_1, minerId: 1, amountUstx: 1 },
        { miner: wallet_2, minerId: 2, amountUstx: 2 },
        { miner: wallet_3, minerId: 3, amountUstx: 3 },
      );

      let txs = new Array(); 
      miners.forEach((r) => {
        txs.push(client.mineTokens(r.amountUstx, r.miner));
      });
      
      const claimedBlock = new MinedBlock(3, 1, 1, true);
      const unclaimedBlock = new MinedBlock(3, 1, 1, false);
      const tokenRewardMaturity = 100;

      it("returns true if miners can claim", () => {
        // TODO: how to expand description here?
        let block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        chain.mineBlock(txs);

        const claimerStacksBlockHeight = block.block_height;
        const currentStacksBlock = block.block_height + tokenRewardMaturity + 1;

        const results = [
          client.canClaimTokens(wallet_1, claimerStacksBlockHeight, 0, unclaimedBlock, currentStacksBlock).result,
          client.canClaimTokens(wallet_2, claimerStacksBlockHeight, 1, unclaimedBlock, currentStacksBlock).result,
          client.canClaimTokens(wallet_2, claimerStacksBlockHeight, 2, unclaimedBlock, currentStacksBlock).result,
          client.canClaimTokens(wallet_3, claimerStacksBlockHeight, 3, unclaimedBlock, currentStacksBlock).result,
          client.canClaimTokens(wallet_3, claimerStacksBlockHeight, 4, unclaimedBlock, currentStacksBlock).result,
          client.canClaimTokens(wallet_3, claimerStacksBlockHeight, 5, unclaimedBlock, currentStacksBlock).result,
          client.canClaimTokens(wallet_1, claimerStacksBlockHeight, 6, unclaimedBlock, currentStacksBlock).result,
        ];

        results.forEach((result) => {
          result.expectOk().expectBool(true);
        });
      });

      it("throws ERR_MINER_ID_NOT_FOUND if miners ID not found", () => {
        let block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        chain.mineBlock(txs);

        const claimerStacksBlockHeight = block.block_height;
        const currentStacksBlock = block.block_height + tokenRewardMaturity + 1;

        const results = [
          client.canClaimTokens(wallet_4, claimerStacksBlockHeight, 0, unclaimedBlock, currentStacksBlock).result,
          client.canClaimTokens(wallet_5, claimerStacksBlockHeight, 1, unclaimedBlock, currentStacksBlock).result,
          client.canClaimTokens(wallet_6, claimerStacksBlockHeight, 2, unclaimedBlock, currentStacksBlock).result,
        ]

        results.forEach((result) => {
          result.expectErr().expectUint(ErrCode.ERR_MINER_ID_NOT_FOUND);
        });
      });

      it("throws ERR_IMMATURE_TOKEN_REWARD if maturity window has not passed", () => {
        const result = client.canClaimTokens(wallet_1, 0, 0, unclaimedBlock, tokenRewardMaturity).result;

        result.expectErr().expectUint(ErrCode.ERR_IMMATURE_TOKEN_REWARD);
      });

      it("throws ERR_ALREADY_CLAIMED if miner already claimed", () => {
        const currentStacksBlock = tokenRewardMaturity + 1;
        const result = client.canClaimTokens(wallet_1, 0, 0, claimedBlock, currentStacksBlock).result;

        result.expectErr().expectUint(ErrCode.ERR_ALREADY_CLAIMED);
      });
    });

    describe("can-mine-tokens()", () => {
      it("returns true if miner can mine", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3),
          client.generateMinerId(wallet_3)
        ]);
        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        const minerId = client.getMinerIdNum(wallet_3);
        const result = client.canMineTokens(wallet_3, minerId, block.block_height, 10).result;

        result.expectOk().expectBool(true);
      });

      it("throws ERR_STACKING_NOT_AVAILABLE error if there is no active reward cycle", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.generateMinerId(wallet_3)
        ]);
        const minerId = client.getMinerIdNum(wallet_3);

        const result = client.canMineTokens(wallet_3, minerId, 0, 10).result;

        result.expectErr().expectUint(ErrCode.ERR_STACKING_NOT_AVAILABLE);
      });

      it("throws ERR_ALREADY_MINED error if miner already mined in this block", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3),
          client.generateMinerId(wallet_1)
        ]);
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        const block = chain.mineBlock([client.mineTokens(200, wallet_1)]);
        const minerId = client.getMinerIdNum(wallet_1);

        const result = client.canMineTokens(wallet_1, minerId, block.height-1, 10).result;

        result.expectErr().expectUint(ErrCode.ERR_ALREADY_MINED);
      });

      it("throws ERR_CANNOT_MINE error if miner commits 0 uSTX", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3),
          client.generateMinerId(wallet_3)
        ]);
        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        const result = client.canMineTokens(wallet_3, 1, block.block_height, 0).result;

        result.expectErr().expectUint(ErrCode.ERR_CANNOT_MINE);
      });

      it("throws ERR_INSUFFICIENT_BALANCE error if miner commits more uSTX than they have", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3),
          client.generateMinerId(wallet_3)
        ]);
        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        const minerId = client.getMinerId(wallet_3).result;
      
        const result = client.canMineTokens(wallet_3, 1, block.block_height, wallet_3.balance + 1).result;

        result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_BALANCE);
      });

      it("throws ERR_TOO_SMALL_COMMITMENT error if miners list is full and commits less than least-commitment in block", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1),
          client.generateMinerId(wallet_1)
        ]);
        
        const minerId = client.getMinerIdNum(wallet_1);
        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        // fill miners list with 128 fake miners with commitment as low as 2uSTX
        chain.mineBlock([
          Tx.contractCall("citycoin", "setup-32-miners-1", [], deployer.address),
          Tx.contractCall("citycoin", "setup-32-miners-2", [], deployer.address),
          Tx.contractCall("citycoin", "setup-32-miners-3", [], deployer.address),
          Tx.contractCall("citycoin", "setup-32-miners-4", [], deployer.address),
        ]); 
        
        const result = client.canMineTokens(wallet_1, minerId, block.block_height, 1).result;
        
        result.expectErr().expectUint(ErrCode.ERR_TOO_SMALL_COMMITMENT)
      });
    });

    describe("can-stack-tokens()", () => {
      it("returns true if stacker can stack", () => {
        setupCleanEnv();

        chain.mineBlock([
          client.ftMint(100, wallet_1),
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);
        
        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        const nowStacksHeight = block.block_height;
        const startStacksHeight = block.block_height + 5;

        const result = client.canStackTokens(wallet_1, 100, nowStacksHeight, startStacksHeight, 1).result;

        result.expectOk().expectBool(true);

      });

      it("throws ERR_CANNOT_STACK error if nowStacksHeight > startStacksHeight", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);

        const nowStacksHeight = MINING_ACTIVATION_DELAY + 5;
        const startStacksHeight = MINING_ACTIVATION_DELAY + 3;

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

      it("throws ERR_CANNOT_STACK error if amountToken = 0", () => {
        const nowStacksHeight = 502;
        const startStacksHeight = 510;
        const amountToken = 0;

        const result = client.canStackTokens(wallet_1, amountToken, nowStacksHeight, startStacksHeight, 1).result;

        result.expectErr().expectUint(ErrCode.ERR_CANNOT_STACK);
      });

      it("throws ERR_INSUFFICIENT_BALANCE if stacker doesn't have enough tokens", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);

        const nowStacksHeight = MINING_ACTIVATION_DELAY + 5;
        const startStacksHeight = MINING_ACTIVATION_DELAY + 6;
        const amountToken = 100000;

        const result = client.canStackTokens(wallet_1, amountToken, nowStacksHeight, startStacksHeight, 1).result;

        result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_BALANCE);
      });
    });

    describe("get-entitled-stacking-reward()", () => {

      it("returns u0 if before first reward cycle", () => {
        setupCleanEnv();
        const stacker = wallet_1;
        const targetRewardCycle = 0;
        const currentBlockHeight = 0;

        const result = client.getEntitledStackingReward(stacker, targetRewardCycle, currentBlockHeight).result;

        result.expectUint(0);
      });

      it("returns u0 if block height is in same reward cycle stacker stacked in", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        const stacker = wallet_1;
        const miner = wallet_2;
        const minerCommitment = 1000;
        const targetRewardCycle = 1;

        // add tokens and stack them at the next cycle
        chain.mineBlock([
          client.ftMint(5000, stacker),
          client.stackTokens(5000, 105, targetRewardCycle, stacker),
        ]);

        // move chain forward to jump into 1st stacking cycle (skip mining activation delay period)
        const block = chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        // mine some tokens
        chain.mineBlock([
          client.mineTokens(minerCommitment, miner)
        ]);

        const result = client.getEntitledStackingReward(stacker, targetRewardCycle, block.block_height).result;

        result.expectUint(0);
      });

      it("returns u0 if stacker did not contribute to this reward cycle", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        const stacker = wallet_1;
        const miner = wallet_2;
        const nonStacker = wallet_3;
        const minerCommitment = 1000;
        const targetRewardCycle = 1;

        // add tokens and stack them at the next cycle
        chain.mineBlock([
          client.ftMint(5000, stacker),
          client.stackTokens(5000, 105, targetRewardCycle, stacker),
        ]);

        // move chain forward to jump into 1st stacking cycle (skip mining activation delay period)
        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        // mine some tokens
        chain.mineBlock([
          client.mineTokens(minerCommitment, miner)
        ]);

        // move chain forward to jump into 2nd stacking cycle
        const block = chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        const result = client.getEntitledStackingReward(nonStacker, targetRewardCycle, block.block_height).result;

        result.expectUint(0);
      });

      it("returns correct value if miners committed 1000 uSTX and there is only one stacker", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        const stacker = wallet_1;
        const miner = wallet_2;
        const minerCommitment = 1000;
        const targetRewardCycle = 1;

        // add tokens and stack them at the next cycle
        chain.mineBlock([
          client.ftMint(5000, stacker),
          client.stackTokens(5000, MINING_ACTIVATION_DELAY + 5, targetRewardCycle, stacker),
        ]);

        // move chain forward to jump into 1st stacking cycle (skip mining activation delay period)
        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        // mine some tokens
        chain.mineBlock([
          client.mineTokens(minerCommitment, miner)
        ]);

        // move chain forward to jump into 2nd stacking cycle
        const block = chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        const result = client.getEntitledStackingReward(stacker, targetRewardCycle, block.block_height).result;

        result.expectUint(minerCommitment * SPLIT_STACKER_PERCENTAGE);
      });

      it("returns correct value if miners committed 1000 uSTX and there are two stackers with equal stacking commitments", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        const stackerOne = wallet_1;
        const stackerOneStacked = 5000;
        const stackerTwo = wallet_3;
        const stackerTwoStacked = 5000;
        const miner = wallet_2;
        const minerCommitment = 1000;
        const targetRewardCycle = 1;

        // add tokens and stack them at the next cycle
        chain.mineBlock([
          client.ftMint(stackerOneStacked, stackerOne),
          client.ftMint(stackerTwoStacked, stackerTwo),
          client.stackTokens(stackerOneStacked, MINING_ACTIVATION_DELAY + 5, targetRewardCycle, stackerOne),
          client.stackTokens(stackerTwoStacked, MINING_ACTIVATION_DELAY + 5, targetRewardCycle, stackerTwo)
        ]);

        // move chain forward to jump into 1st stacking cycle (skip mining activation delay period)
        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        // mine some tokens
        chain.mineBlock([
          client.mineTokens(minerCommitment, miner)
        ]);

        // move chain forward to jump into 2nd stacking cycle
        const block = chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        const resultOne = client.getEntitledStackingReward(stackerOne, targetRewardCycle, block.block_height).result;
        const resultTwo = client.getEntitledStackingReward(stackerTwo, targetRewardCycle, block.block_height).result;

        // (total-ustx * this-stackers-tokens) / total-tokens-stacked
        const resultOneAmt = ((minerCommitment * SPLIT_STACKER_PERCENTAGE * stackerOneStacked) / (stackerOneStacked + stackerTwoStacked));
        const resultTwoAmt = ((minerCommitment * SPLIT_STACKER_PERCENTAGE * stackerTwoStacked) / (stackerOneStacked + stackerTwoStacked));

        resultOne.expectUint(resultOneAmt);
        resultTwo.expectUint(resultTwoAmt);
      });

      it("returns correct value if miners committed 1000 uSTX and there are two stackers with unequal stacking commitments", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        const stackerOne = wallet_1;
        const stackerOneStacked = 2500;
        const stackerTwo = wallet_3;
        const stackerTwoStacked = 7500;
        const miner = wallet_2;
        const minerCommitment = 1000;
        const targetRewardCycle = 1;

        // add tokens and stack them at the next cycle
        chain.mineBlock([
          client.ftMint(stackerOneStacked, stackerOne),
          client.ftMint(stackerTwoStacked, stackerTwo),
          client.stackTokens(stackerOneStacked, MINING_ACTIVATION_DELAY + 5, targetRewardCycle, stackerOne),
          client.stackTokens(stackerTwoStacked, MINING_ACTIVATION_DELAY + 5, targetRewardCycle, stackerTwo)
        ]);

        // move chain forward to jump into 1st stacking cycle (skip mining activation delay period)
        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        // mine some tokens
        chain.mineBlock([
          client.mineTokens(minerCommitment, miner)
        ]);

        // move chain forward to jump into 2nd stacking cycle
        const block = chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        const resultOne = client.getEntitledStackingReward(stackerOne, targetRewardCycle, block.block_height).result;
        const resultTwo = client.getEntitledStackingReward(stackerTwo, targetRewardCycle, block.block_height).result;

        // (total-ustx * this-stackers-tokens) / total-tokens-stacked
        const resultOneAmt = ((minerCommitment * SPLIT_STACKER_PERCENTAGE * stackerOneStacked) / (stackerOneStacked + stackerTwoStacked));
        const resultTwoAmt = ((minerCommitment * SPLIT_STACKER_PERCENTAGE * stackerTwoStacked) / (stackerOneStacked + stackerTwoStacked));

        resultOne.expectUint(resultOneAmt);
        resultTwo.expectUint(resultTwoAmt);
      });
    });

    describe("get-reward-cycle()", () => {
      it("returns None if stacksBlockHeight is equal 0", () => {
        const result = client.getRewardCycle(0).result;

        result.expectNone()
      });

      it("returns Some with correct value when stacksBlockHeight > MINING_ACTIVATION_DELAY", () => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);

        // starts after MINING_ACTIVATION_DELAY
        const blockHeights = [151, 155, 499, 500, 501, 1001, 1501, 1999, 2000, 2001];

        console.log("\n  formula: (stacksBlockHeight - FIRST_STACKING_BLOCK) / REWARD_CYCLE_LENGTH)")

        blockHeights.forEach((stacksBlockHeight) => {
          const expectedValue = Math.floor((stacksBlockHeight - FIRST_STACKING_BLOCK) / REWARD_CYCLE_LENGTH);

          const result = client.getRewardCycle(stacksBlockHeight).result;

          console.log(`  success at block ${stacksBlockHeight} with reward cycle ${result}`)

          result.expectSome().expectUint(expectedValue);
        });
      });
    });

    describe("get-first-block-height-in-reward-cycle()", () => {
      it("returns correct value", () => {
        const rewardCycles = [0, 1, 2, 3, 5, 15, 24, 44, 890];

        console.log("\n  formula: FIRST_STACKING_BLOCK + (REWARD_CYCLE_LENGTH * rewardCycle)")

        rewardCycles.forEach((rewardCycle) => {
          const expectedValue = FIRST_STACKING_BLOCK + (REWARD_CYCLE_LENGTH * rewardCycle);

          const result = client.getFirstBlockHeightInRewardCycle(rewardCycle).result;

          console.log(`  success at reward cycle ${rewardCycle} with block height ${result}`)

          result.expectUint(expectedValue);
        });
      });
    });

    describe("get-pox-lite-info()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("throws ERR_STACKING_NOT_AVAILABLE if stacking is not active", () => {
        const result = client.getPoxLiteInfo().result;

        result.expectErr().expectUint(ErrCode.ERR_STACKING_NOT_AVAILABLE);
      });

      it("returns statistics if stacking is active", () => {
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);

        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        // stack in cycle 1 while cycle 0 is active
        chain.mineBlock([
          client.ftMint(100, wallet_2),
          client.stackTokens(100, 105, 1, wallet_2)
        ]);

        // progress into reward cycle 1
        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        const result = client.getPoxLiteInfo().result;

        console.log(`\n  success returned: ${result}`)

        result.expectOk();
      });

    });

    describe("get-miner-id()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("returns none if no miners are registered", () => {
        const result = client.getMinerId(wallet_1).result;

        result.expectNone();
      });

      it("returns u1 if one miner registered", () => {
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);

        const result = client.getMinerId(wallet_1).result;

        result.expectSome().expectUint(1);
      });
    });

    describe("get-mining-activation-status()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("returns false when mining activation threshold has not been reached", () => {
        const result = client.getMiningActivationStatus().result;

        result.expectBool(false);
      });

      it("returns true when mining activation threshold has been reached.", () => {
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);

        const result = client.getMiningActivationStatus().result;

        result.expectBool(true);
      });
    });

    describe("get-registered-miners-threshold()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("returns 20 by default", () => {
        const result = client.getRegisteredMinersThreshold().result;

        result.expectUint(20);
      });

      it("returns value set by test add-on function", () => {
        const threshold = 5;
        
        chain.mineBlock([
          client.setMiningActivationThreshold(threshold)
        ]);

        const result = client.getRegisteredMinersThreshold().result;

        result.expectUint(threshold);
      });
    });

    describe("get-registered-miners-nonce()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("returns 0 when no miner registered", () => {
        const result = client.getRegisteredMinersNonce().result;

        result.expectUint(0);
      });

      it("returns 3 when 3 miners registered", () => {
        chain.mineBlock([
          client.registerMiner(wallet_1),
          client.registerMiner(wallet_2),
          client.registerMiner(wallet_3)
        ]);
        
        const result = client.getRegisteredMinersNonce().result;
        result.expectUint(3);
      });

      it("returns 3 when 1 miner registered and 2 other mined block", () => {
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);

        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        chain.mineBlock([
          client.mineTokens(200, wallet_2),
          client.mineTokens(250, wallet_3)
        ]);

        const result = client.getRegisteredMinersNonce().result;
        result.expectUint(3);
      });
    });

    describe("get-miners-at-block()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });
      
      it("returns empty list when no miners mined specific block", () => {
        const result = client.getMinersAtBlock(10).result;

        assertEquals(result.expectList().length, 0);
      });

      it("returns list with 3 miners when 3 miners mined block", () => {
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);

        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        chain.mineBlock([
          client.mineTokens(100, wallet_1),
          client.mineTokens(200, wallet_2),
          client.mineTokens(300, wallet_3)
        ]);

        const result = client.getMinersAtBlock(block.block_height).result;
        const minersList = result.expectList();

        assertEquals(minersList.length, 3);
        // TODO: think about validating content of this list.
      });
    });

    describe("get-stacked-in-cycle()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("returns 0 when miner didn't stack in a cycle", () => {
        const result = client.getStackedInCycle(wallet_1, 100).result;

        result.expectUint(0);
      });

      it("returns 200 when miner stacked 200 tokens in cycle", () => {
        const amount = 200;

        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1),
          client.ftMint(amount, wallet_1)
        ]);

        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        chain.mineBlock([
          client.stackTokens(amount, MINING_ACTIVATION_DELAY + 5, 1, wallet_1)
        ]);

        const result = client.getStackedInCycle(wallet_1, 1).result;

        result.expectUint(amount);
      });
    });

    describe("get-tokens-per-cycle()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("returns 0 tokens and 0 ustx", () => {
        const result = client.getTokensPerCycle(1).result;

        const expectedTuple = {
          "total-tokens": types.uint(0),
          "total-ustx": types.uint(0)
        };

        const tuple = result.expectTuple();

        assertEquals(tuple, expectedTuple);
      });

      it("returns number of stacked tokens and committed uSTX", () => {
        const tokensAmount = 100;
        const ustxAmount = 1000;

        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1),
          client.ftMint(tokensAmount, wallet_1)
        ]);

        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        chain.mineBlock([
          client.stackTokens(tokensAmount, MINING_ACTIVATION_DELAY + 5, 1, wallet_1),
        ]);

        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);
        chain.mineBlock([
          client.mineTokens(ustxAmount, wallet_1)          
        ]);        

        const expectedTuple = {
          "total-tokens": types.uint(tokensAmount),
          "total-ustx": types.uint(ustxAmount * SPLIT_STACKER_PERCENTAGE)
        };

        const result = client.getTokensPerCycle(1).result;
        const tuple = result.expectTuple();

        assertEquals(tuple, expectedTuple);
      });
    });

    describe("find-least-commitment()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("returns default tuple", () => {
        //stacks-block-height: stacks-block-height, least-commitment-idx: u0, least-commitment-ustx: u0
        const blockHeight = 10;

        const expectedTuple = {
          "stacks-block-height": types.uint(blockHeight),
          "least-commitment-idx": types.uint(0),
          "least-commitment-ustx": types.uint(0)
        };
        
        const result = client.findLeastCommitment(blockHeight).result;
        const tuple = result.expectTuple();

        assertEquals(tuple, expectedTuple);
      });

      it("returns miner if only one mined a block", () => {
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);

        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        const blockHeight = block.block_height;

        chain.mineBlock([
          client.mineTokens(100, wallet_1),
        ]);

        const expectedTuple = {
          "stacks-block-height": types.uint(blockHeight),
          "least-commitment-idx": types.uint(1),
          "least-commitment-ustx": types.uint(100)
        };
        
        const result = client.findLeastCommitment(blockHeight).result;
        const tuple = result.expectTuple();

        assertEquals(tuple, expectedTuple);
      });

      it("returns miner with smallest commitment at specific block", () => {
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);

        const block = chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        const blockHeight = block.block_height;

        chain.mineBlock([
          client.mineTokens(100, wallet_1),
          client.mineTokens(1, wallet_2),
          client.mineTokens(2000, wallet_3),
        ]);

        const expectedTuple = {
          "stacks-block-height": types.uint(blockHeight),
          "least-commitment-idx": types.uint(2),
          "least-commitment-ustx": types.uint(1)
        };
        
        const result = client.findLeastCommitment(blockHeight).result;
        const tuple = result.expectTuple();

        assertEquals(tuple, expectedTuple);
      });
    });
  });

  describe("Public:", () => {
    describe("stack-tokens()", () => {
      beforeEach(() => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);
      });

      it("throws ERR_STACKING_NOT_AVAILABLE error", () => {
        const block = chain.mineBlock([
          client.stackTokens(100, 0, 1, wallet_1)
        ]);

        block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_STACKING_NOT_AVAILABLE);
        assertEquals(block.receipts[0].events.length, 0);
      });

      it("throws ERR_INSUFFICIENT_BALANCE error", () => {
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);

        const startStacksHeight = MINING_ACTIVATION_DELAY + 5;

        const block = chain.mineBlock([
          client.stackTokens(100, startStacksHeight, 1, wallet_1)
        ]);

        block.receipts[0].result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_BALANCE);
        assertEquals(block.receipts[0].events.length, 0);
      });

      it("succeeds and causes one ft_transfer_event", () => {
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        const startStacksHeight = MINING_ACTIVATION_DELAY + 5;

        const block = chain.mineBlock([
          client.ftMint(100, wallet_1),
          client.stackTokens(100, startStacksHeight, 1, wallet_1)
        ]);

        // check return value
        block.receipts[1].result.expectOk().expectBool(true);

        // check number of events 
        assertEquals(block.receipts[0].events.length, 1);

        // check events
        block.receipts[1].events.expectFungibleTokenTransferEvent(
          100,
          wallet_1.address,
          client.getContractAddress(),
          "citycoins"
        );

      });

      it("succeeds when called multiple times", () => {
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
        const startStacksHeight = MINING_ACTIVATION_DELAY + 5;

        chain.mineBlock([
          client.ftMint(1000, wallet_1),
          client.stackTokens(100, startStacksHeight, 1, wallet_1)
        ]);

        const block = chain.mineBlock([
          client.stackTokens(100, startStacksHeight, 1, wallet_1)
        ]);
        const result = client.getStackedInCycle(wallet_1, 1).result;

        // check number of events 
        assertEquals(block.receipts[0].events.length, 1);

        // check events
        block.receipts[0].events.expectFungibleTokenTransferEvent(
          100,
          wallet_1.address,
          client.getContractAddress(),
          "citycoins"
        );

        // check total amount of tokens stacked in cycle
        result.expectUint(200);
      })
    });

    describe("mine-tokens()", () => {
      beforeEach(() => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
      });

      it("throws ERR_CANNOT_MINE error when miner wants to commit 0 ustx", () => {
        const block = chain.mineBlock([
          client.mineTokens(0, wallet_1)
        ]);

        const receipt = block.receipts[0];

        receipt.result.expectErr().expectUint(ErrCode.ERR_CANNOT_MINE);

        assertEquals(receipt.events.length, 0)
      });

      it("throws ERR_INSUFFICIENT_BALANCE error when miner wants to commit more than they have", () => {
        const block = chain.mineBlock([
          client.mineTokens(wallet_1.balance + 1, wallet_1)
        ]);

        const receipt = block.receipts[0];

        receipt.result.expectErr().expectUint(ErrCode.ERR_INSUFFICIENT_BALANCE);

        assertEquals(receipt.events.length, 0)
      })

      it("throws ERR_ALREADY_MINED error when miner wants mine twice at the same block", () => {
        const block = chain.mineBlock([
          client.mineTokens(10, wallet_1),
          client.mineTokens(10, wallet_1),
        ]);

        const receipt_err = block.receipts[1];

        receipt_err.result.expectErr().expectUint(ErrCode.ERR_ALREADY_MINED);
        assertEquals(receipt_err.events.length, 0)
      })

      it("succeeds and causes one stx_transfer_event to city-wallet if no stackers stacking", () => {
        const amount = 20000;

        chain.mineBlock([
          client.setCityWalletUnsafe(wallet_6)
        ])

        const block = chain.mineBlock([
          client.mineTokens(amount, wallet_1)
        ]);

        // check return value
        block.receipts[0].result.expectOk().expectBool(true);

        // check number of events
        assertEquals(block.receipts[0].events.length, 1)

        // check event details
        block.receipts[0].events.expectSTXTransferEvent(
          amount,
          wallet_1.address,
          wallet_6.address
        );
      });

      // modified to two events since 70% to stackers, 30% to city
      it("succeeds and causes two stx_transfer_events if stackers are stacking, one to stackers, one to city", () => {      

        const amount = 20000;
        const startStacksHeight = MINING_ACTIVATION_DELAY + 5;

        chain.mineBlock([
          client.setCityWalletUnsafe(wallet_6)
        ])

        chain.mineBlock([
          client.ftMint(100, wallet_1),
          client.stackTokens(100, startStacksHeight, 1, wallet_1)
        ]);

        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH + 1)

        const block = chain.mineBlock([
          client.mineTokens(amount, wallet_1)
        ]);

        // check return value
        block.receipts[0].result.expectOk().expectBool(true);

        // check number of events
        assertEquals(block.receipts[0].events.length, 2)

        // check event details
        const events = block.receipts[0].events;
        events.expectSTXTransferEvent(
          amount * SPLIT_STACKER_PERCENTAGE,
          wallet_1.address,
          client.getContractAddress()
        );
        events.expectSTXTransferEvent(
          amount * SPLIT_CITY_PERCENTAGE,
          wallet_1.address,
          wallet_6.address
        );
      });

      it("emits print event with memo if supplied", () => {
        chain.mineBlock([
          client.setCityWalletUnsafe(wallet_6)
        ]);

        const memo = new TextEncoder().encode("hello world");

        const block = chain.mineBlock([
          client.mineTokens(200, wallet_1, memo)
        ]);

        const expectedEvent = {
          type: "contract_event", 
          contract_event: {
            contract_identifier: client.getContractAddress(),
            topic: "print",
            value: types.some(types.buff(memo))
          }
        }

        const receipt = block.receipts[0];
        assertEquals(receipt.events.length, 2);
        assertEquals(receipt.events[0], expectedEvent);
      });
    });

    describe("claim-stacking-reward()", () => {
      beforeEach(() => {
        setupCleanEnv();
        chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_3)
        ]);
        chain.mineEmptyBlock(MINING_ACTIVATION_DELAY);
      });

      it("throws ERR_NOTHING_TO_REDEEM error when stacker didn't stack at all", () => {
        const block = chain.mineBlock([
          client.claimStackingReward(0, wallet_1)
        ]);

        const receipt = block.receipts[0];

        receipt.result.expectErr().expectUint(ErrCode.ERR_NOTHING_TO_REDEEM);
        assertEquals(receipt.events.length, 0);
      });

      it("throws ERR_NOTHING_TO_REDEEM error, when stacker want to redeem same reward second time", () => {
        const miner = wallet_1;
        const stacker = wallet_2;

        // add tokens and stack them at the next cycle
        chain.mineBlock([
          client.ftMint(5000, stacker),
          client.stackTokens(5000, 5, 1, stacker),
        ]);

        // advance chain forward to jump into 1st stacking cycle
        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        // mine some tokens
        chain.mineBlock([
          client.mineTokens(50000, miner),
        ]);

        // advance chain forward to jump into 2nd stacking cycle
        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        // claim first time
        chain.mineBlock([
          client.claimStackingReward(1, stacker),
        ]);

        // try to claim second time
        const block = chain.mineBlock([
          client.claimStackingReward(1, stacker),
        ]);

        const receipt = block.receipts[0];

        receipt.result.expectErr().expectUint(ErrCode.ERR_NOTHING_TO_REDEEM);
        assertEquals(receipt.events.length, 0);
      });


      it("succeeds and causes one stx_transfer_event event and one ft_transfer event", () => {
        const miner_1 = wallet_1;
        const miner_2 = wallet_2
        const stacker = wallet_3;
        const minerCommitment = 2000;
        const stackedAmount = 5000;

        // add tokens and stack them at the next cycle
        chain.mineBlock([
          client.ftMint(stackedAmount, stacker),
          client.stackTokens(stackedAmount, MINING_ACTIVATION_DELAY + 5, 1, stacker),
        ]);

        // advance chain forward to jump into 1st stacking cycle
        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        // mine some tokens
        chain.mineBlock([
          client.mineTokens(minerCommitment, miner_1),
          client.mineTokens(minerCommitment, miner_2)
        ]);

        // advance chain forward to jump into 2nd stacking cycle
        chain.mineEmptyBlock(REWARD_CYCLE_LENGTH);

        const block = chain.mineBlock([
          client.claimStackingReward(1, stacker)
        ]);

        const receipt = block.receipts[0];

        // check return value
        receipt.result.expectOk().expectBool(true);

        // check events count
        assertEquals(receipt.events.length, 2);

        // check stx_transfer_event details
        receipt.events.expectSTXTransferEvent(
          minerCommitment * 2 * SPLIT_STACKER_PERCENTAGE,
          client.getContractAddress(),
          stacker.address
        );

        // check ft_transfer_event details
        receipt.events.expectFungibleTokenTransferEvent(
          stackedAmount,
          client.getContractAddress(),
          stacker.address,
          'citycoins'
        );
      })
    });

    describe("register-miner()", () => {
      it("succeeds with (ok true)", () => {
        setupCleanEnv();

        const block = chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1)
        ]);

        const receipt = block.receipts[0];

        receipt.result.expectOk().expectBool(true);
        assertEquals(receipt.events.length, 0);
      });

      it("emits print event with memo if supplied", () => {
        setupCleanEnv();

        const memo = new TextEncoder().encode("hello world")

        const block = chain.mineBlock([
          client.registerMiner(wallet_1, memo)
        ]);

        const expectedEvent = {
          type: "contract_event", 
          contract_event: {
            contract_identifier: client.getContractAddress(),
            topic: "print",
            value: types.some(types.buff(memo))
          }
        }

        const receipt = block.receipts[0];
        assertEquals(receipt.events[0], expectedEvent);
      });

      it("doesn't emit any events if memo is not supplied", () => {
        setupCleanEnv();
        
        const block = chain.mineBlock([
          client.registerMiner(wallet_1)
        ]);

        const events = block.receipts[0].events;

        assertEquals(events.length, 0);
      });

      it("throws ERR_MINER_ALREADY_REGISTERED error when miner wants to register second time", () => {
        setupCleanEnv();

        const block = chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1),
          client.registerMiner(wallet_1)
        ]);

        const receipt = block.receipts[2];

        receipt.result.expectErr().expectUint(ErrCode.ERR_MINER_ALREADY_REGISTERED);
        assertEquals(receipt.events.length, 0);
      });

      it("throws ERR_MINING_ACTIVATION_THRESHOLD_REACHED error when miner wants to register after reaching activation threshold", () => {
        setupCleanEnv();

        const block = chain.mineBlock([
          client.setMiningActivationThreshold(1),
          client.registerMiner(wallet_1),
          client.registerMiner(wallet_2)
        ]);

        const receipt = block.receipts[2];

        receipt.result.expectErr().expectUint(ErrCode.ERR_MINING_ACTIVATION_THRESHOLD_REACHED);
        assertEquals(receipt.events.length, 0);
      });
    });

    describe('set-token-uri', () => {
      it("fails with ERR_UNAUTHORIZED when called by someone who is not contract owner", () => {
        const block = chain.mineBlock([
          client.setTokenUri(wallet_3, "http://something-something.com")
        ]);

        const receipt = block.receipts[0];

        receipt.result.expectErr().expectUint(ErrCode.ERR_UNAUTHORIZED);
      });

      it("changes token uri to none if no new value is provided", () => {
        const block = chain.mineBlock([
          client.setTokenUri(deployer)
        ]);

        const receipt = block.receipts[0];
        receipt.result.expectOk().expectBool(true);

        const result = client.getTokenUri().result;
        result.expectOk().expectNone();
      });

      it("changes token uri to new value if provided", () => {
        const newUri = "http://something-something.com"
        const block = chain.mineBlock([
          client.setTokenUri(deployer, newUri)
        ]);

        const receipt = block.receipts[0];
        receipt.result.expectOk().expectBool(true);

        const result = client.getTokenUri().result;
        result.expectOk().expectSome().expectUtf8(newUri);
      });
    });

    describe("set-city-wallet", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("throws ERR_UNAUTHORIZED error when called by non city wallet", () => {
        const cityWallet = wallet_1;
        const newCityWallet = wallet_3;
        
        chain.mineBlock([
          client.setCityWalletUnsafe(cityWallet)
        ]);

        const block = chain.mineBlock([
          client.setCityWallet(newCityWallet, newCityWallet)
        ]);

        const result = block.receipts[0].result;

        result.expectErr().expectUint(ErrCode.ERR_UNAUTHORIZED);
      });

      it("throws ERR_UNAUTHORIZED error when called via contract-call", () => {
        const cityWallet = wallet_1;
        
        chain.mineBlock([
          client.setCityWalletUnsafe(cityWallet)
        ]);
      
        const block = chain.mineBlock([
          Tx.contractCall(
            'malicious',
            'attack',
            [],
            wallet_1.address
          )
        ]);
      
        const result = block.receipts[0].result;
      
        result.expectErr().expectUint(ErrCode.ERR_UNAUTHORIZED);
      })

      it("succeeds and sets new city wallet, when called by previous city wallet", () => {
        const cityWallet = wallet_1;
        const newCityWallet = wallet_3;

        chain.mineBlock([
          client.setCityWalletUnsafe(cityWallet)
        ]);

        const block = chain.mineBlock([
          client.setCityWallet(newCityWallet, cityWallet)
        ]);

        const blockResult = block.receipts[0].result;
        blockResult.expectOk().expectBool(true);

        const result = client.getCityWallet().result;
        result.expectPrincipal(newCityWallet.address);
      });

      it("succeeds and sets new city wallet, when called by contract that was a previous city wallet", () => {
        const cityWallet: Account = {
          name: 'city_wallet',
          address: 'ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.city_wallet',
          balance: 0,
          mnemonic: 'unknown',
          derivation: 'unknown'
        };
        const newCityWallet = wallet_3;

        
        chain.mineBlock([
          client.setCityWalletUnsafe(cityWallet)
        ]);

        client.getCityWallet().result.expectPrincipal('ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE.city_wallet');

        const block = chain.mineBlock([
          Tx.contractCall(
            'city_wallet', 
            'set-city-wallet',
            [
              types.principal(newCityWallet.address)
            ],
            deployer.address
            )
        ]);

        const receipt = block.receipts[0];
        receipt.result.expectOk().expectBool(true);
      })
    });
  });
});
