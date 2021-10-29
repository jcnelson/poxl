import { assertEquals, describe, Tx, types, run } from "../deps.ts";
import { TestUtilsClient } from "../src/test-utils-client.ts";
import { it } from "../src/testutil.ts";

describe("[CityCoin Test Utils]", () => {
  describe("test-wallet-attack()", () => {
    it("throws ERR_UNAUTHORIZED when changing city wallet to a new address", (chain, accounts, clients) => {
      //arrange
      const sender = accounts.get("wallet_1")!;

      // act
      const block = chain.mineBlock([
        clients.testUtils.testWalletAttack(sender),
      ]);

      // assert
      block.receipts[0].result.expectErr().expectUint(1000);
    });
  });
  describe("test-wallet-attack-as-contract()", () => {
    it("throws ERR_UNAUTHORIZED when changing city wallet to a new address as a contract", (chain, accounts, clients) => {
      //arrange
      const sender = accounts.get("wallet_1")!;

      // act
      const block = chain.mineBlock([
        clients.testUtils.testWalletAttackAsContract(sender),
      ]);

      // assert
      block.receipts[0].result.expectErr().expectUint(1000);
    });
  });
});

run();