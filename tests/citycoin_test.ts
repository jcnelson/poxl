import { Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.6.0/index.ts';
import { assertEquals } from "https://deno.land/std@0.93.0/testing/asserts.ts";

import {
  afterEach,
  beforeEach,
  beforeAll,
  describe,
  it,
} from "https://deno.land/x/test_suite@v0.7.0/mod.ts";

import { CityCoinClient } from "../src/citycoin-client.ts"

describe('[CityCoin]', () => {
  let chain: Chain;
  let accounts: Map<string, Account>;
  let client: CityCoinClient;
  let deployer: Account;
  let wallet_1: Account;
  let wallet_2: Account;

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
      it("should return 'Citycoin'", () => {
        const result = client.getName().result;

        result.expectOk().expectAscii("Citycoin");
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
        client.ftMint(100, wallet_1);

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
});