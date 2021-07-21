import { assertEquals, describe, Tx, types } from "../deps.ts";
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

  describe("register-user()", () => {
    it("successfully register new user and emits print event with memo when supplied", (chain, accounts, clients) => {
      // arrange
      const user = accounts.get("wallet_5")!;
      const memo = "hello world";

      // act
      const receipt = chain.mineBlock([clients.core.registerUser(user, memo)])
        .receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
      clients.core.getUserId(user).result.expectSome().expectUint(1);

      assertEquals(receipt.events.length, 1);

      const expectedEvent = {
        type: "contract_event",
        contract_event: {
          contract_identifier: clients.core.getContractAddress(),
          topic: "print",
          value: types.some(types.utf8(memo)),
        },
      };

      assertEquals(receipt.events[0], expectedEvent);
    });

    it("successfully register new user and do not emit any events when memo is not supplied", (chain, accounts, clients) => {
      // arrange
      const user = accounts.get("wallet_4")!;

      // act
      const receipt = chain.mineBlock([clients.core.registerUser(user)])
        .receipts[0];

      // assert
      receipt.result.expectOk().expectBool(true);
      clients.core.getUserId(user).result.expectSome().expectUint(1);

      assertEquals(receipt.events.length, 0);
    });

    it("throws ERR_USER_ALREADY_REGISTERED while trying to register user 2nd time", (chain, accounts, clients) => {
      // arrange
      const user = accounts.get("wallet_4")!;
      const registerUserTx = clients.core.registerUser(user);
      chain.mineBlock([registerUserTx]);

      // act
      const receipt = chain.mineBlock([registerUserTx]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_USER_ALREADY_REGISTERED);
    });

    it("throws ERR_ACTIVATION_THRESHOLD_REACHED error when user wants to register after reaching activation threshold", (chain, accounts, clients) => {
      // arrange
      const user1 = accounts.get("wallet_4")!;
      const user2 = accounts.get("wallet_5")!;
      chain.mineBlock([
        clients.core.unsafeSetActivationThreshold(1),
        clients.core.registerUser(user1),
      ]);

      // act
      const receipt = chain.mineBlock([clients.core.registerUser(user2)])
        .receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_ACTIVATION_THRESHOLD_REACHED);
    });
  });
});
