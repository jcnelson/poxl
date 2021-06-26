import { assertEquals, describe, types } from "../deps.ts";
import { CoreClient } from "../src/core-client.ts";
import { it } from "../src/testutil.ts";

describe("[CityCoin Core]", () => {
  describe("set-city-wallet()", () => {
    it("throws ERR_UNAUTHORIZED when called by non-city wallet", (chain, accounts, clients) => {
      // arrange
      const wallet = accounts.get("wallet_1")!;

      // act
      const receipt = chain.mineBlock([
        clients.core.setCityWallet(wallet, wallet),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_UNAUTHORIZED);
    });

    it("successfully change city walled when called by current city wallet", (chain, accounts, clients) => {
      // arrange
      const cityWallet = accounts.get("wallet_1")!;
      const newCityWallet = accounts.get("wallet_2")!;
      chain.mineBlock([clients.core.unsafeSetCityWallet(cityWallet)]);

      // act
      const receipt = chain.mineBlock([
        clients.core.setCityWallet(newCityWallet, cityWallet),
      ]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
      clients.core
        .getCityWallet()
        .result.expectPrincipal(newCityWallet.address);
    });
  });

  describe("add-mining-candidate()", () => {
    it("throws ERR_UNAUTHORIZED when called by non-city wallet", (chain, accounts, clients) => {
      // arrange
      const wallet = accounts.get("wallet_1")!;

      // act
      const receipt = chain.mineBlock([
        clients.core.addMiningCandidate(
          clients.citycoin.getContractAddress(),
          wallet
        ),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_UNAUTHORIZED);
    });

    it("successfully saves contract as mining candidate when called by city wallet", (chain, accounts, clients) => {
      // arrange
      const cityWallet = accounts.get("wallet_1")!;
      const miningContractAddress = clients.citycoin.getContractAddress();
      chain.mineBlock([clients.core.unsafeSetCityWallet(cityWallet)]);

      // act
      const receipt = chain.mineBlock([
        clients.core.addMiningCandidate(miningContractAddress, cityWallet),
      ]).receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
      const miningCandidate = clients.core
        .getMiningCandidate(miningContractAddress)
        .result.expectSome()
        .expectTuple();

      assertEquals(miningCandidate, { votes: types.uint(0) });
    });

    it("throws ERR_CANDIDATE_ALREADY_EXISTS when trying to add the same contract again", (chain, accounts, clients) => {
      // arrange
      const cityWallet = accounts.get("wallet_1")!;
      const miningContractAddress = clients.citycoin.getContractAddress();
      chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        clients.core.addMiningCandidate(miningContractAddress, cityWallet),
      ]);

      // act
      const receipt = chain.mineBlock([
        clients.core.addMiningCandidate(miningContractAddress, cityWallet),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_CANDIDATE_ALREADY_EXISTS);
    });
  });
});
