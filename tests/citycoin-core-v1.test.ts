import { assertEquals, describe, Tx, types } from "../deps.ts";
import { CoreClient } from "../src/core-client.ts";
import { it } from "../src/testutil.ts";

describe("[CityCoin Core]", () => {
  describe("Read Only:", () => {
    describe("get-city-wallet()", () => {
      it("returns current city wallet variable", (chain, accounts, clients) => {
        // arrange
        const cityWallet = accounts.get("city_wallet")!;
        const result = clients.core.getCityWallet().result;

        // assert
        result.expectPrincipal(cityWallet.address);
      });
    });
    describe("get-activation-block()", () => {
      it("throws ERR_CONTRACT_NOT_ACTIVATED if called before contract is activated", (chain, accounts, clients) => {
        // act
        const result = clients.core.getActivationBlock().result;

        // assert
        result
          .expectErr()
          .expectUint(CoreClient.ErrCode.ERR_CONTRACT_NOT_ACTIVATED);
      });
      it("succeeds and returns activation height", (chain, accounts, clients) => {
        // arrange
        const user = accounts.get("wallet_4")!;
        const block = chain.mineBlock([
          clients.core.unsafeSetActivationThreshold(1),
          clients.core.registerUser(user),
        ]);
        const activationBlockHeight =
          block.height + CoreClient.ACTIVATION_DELAY - 1;

        // act
        const result = clients.core.getActivationBlock().result;

        // assert
        result.expectOk().expectUint(activationBlockHeight);
      });
    });
  });
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
      const cityWallet = accounts.get("city_wallet")!;
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

  describe("mine-tokens()", () => {
    it("throws ERR_CONTRACT_NOT_ACTIVATED while trying to mine before reaching activation threshold", (chain, accounts, clients) => {
      // arrange
      const miner = accounts.get("wallet_2")!;
      const amountUstx = 200;

      // act
      const receipt = chain.mineBlock([
        clients.core.mineTokens(amountUstx, miner),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_CONTRACT_NOT_ACTIVATED);
    });

    it("throws ERR_INSUFFICIENT_COMMITMENT while trying to mine with 0 commitment", (chain, accounts, clients) => {
      // arrange
      const miner = accounts.get("wallet_2")!;
      const amountUstx = 0;
      chain.mineBlock([
        clients.core.unsafeSetActivationThreshold(1),
        clients.core.registerUser(miner),
      ]);

      // act
      const receipt = chain.mineBlock([
        clients.core.mineTokens(amountUstx, miner),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_INSUFFICIENT_COMMITMENT);
    });

    it("throws ERR_INSUFFICIENT_BALANCE while trying to mine with commitment larger than current balance", (chain, accounts, clients) => {
      // arrange
      const miner = accounts.get("wallet_2")!;
      const amountUstx = miner.balance + 1;
      chain.mineBlock([
        clients.core.unsafeSetActivationThreshold(1),
        clients.core.registerUser(miner),
      ]);

      // act
      const receipt = chain.mineBlock([
        clients.core.mineTokens(amountUstx, miner),
      ]).receipts[0];

      // assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_INSUFFICIENT_BALANCE);
    });

    it("throws ERR_STACKING_NOT_AVAILABLE while trying to mine before activation period end", (chain, accounts, clients) => {
      // arrange
      const miner = accounts.get("wallet_2")!;
      const amountUstx = 200;
      chain.mineBlock([
        clients.core.unsafeSetActivationThreshold(1),
        clients.core.registerUser(miner),
      ]);

      // act
      const receipt = chain.mineBlock([
        clients.core.mineTokens(amountUstx, miner),
      ]).receipts[0];

      //assert
      receipt.result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_STACKING_NOT_AVAILABLE);
    });

    it("succeeds and cause one stx_transfer_event to city-wallet during first cycle", (chain, accounts, clients) => {
      // arrange
      const cityWallet = accounts.get("city_wallet")!;
      const miner = accounts.get("wallet_2")!;
      const amountUstx = 200;
      const block = chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        clients.core.unsafeSetActivationThreshold(1),
        clients.core.registerUser(miner),
      ]);
      chain.mineEmptyBlockUntil(block.height + CoreClient.ACTIVATION_DELAY - 1);

      // act
      const receipt = chain.mineBlock([
        clients.core.mineTokens(amountUstx, miner),
      ]).receipts[0];

      //assert
      receipt.result.expectOk().expectBool(true);
      assertEquals(receipt.events.length, 1);
      receipt.events.expectSTXTransferEvent(
        amountUstx,
        miner.address,
        cityWallet.address
      );
    });

    it("succeeds and cause one stx_transfer event to city-wallet and one to stacker while mining in cycle with stackers", (chain, accounts, clients) => {
      // arrange
      const cityWallet = accounts.get("city_wallet")!;
      const miner = accounts.get("wallet_2")!;
      const amountUstx = 200;
      const amountTokens = 500;
      const block = chain.mineBlock([
        clients.core.unsafeSetCityWallet(cityWallet),
        clients.token.ftMint(amountTokens, miner),
        clients.core.unsafeSetActivationThreshold(1),
        clients.core.registerUser(miner),
      ]);

      const activationBlockHeight =
        block.height + CoreClient.ACTIVATION_DELAY - 1;
      const cycle1FirstBlockHeight =
        activationBlockHeight + CoreClient.REWARD_CYCLE_LENGTH;

      chain.mineEmptyBlockUntil(activationBlockHeight);
      chain.mineBlock([clients.core.stackTokens(amountTokens, 1, miner)]);
      chain.mineEmptyBlockUntil(cycle1FirstBlockHeight);

      // act
      const receipt = chain.mineBlock([
        clients.core.mineTokens(amountUstx, miner),
      ]).receipts[0];

      //assert
      receipt.result.expectOk().expectBool(true);
      assertEquals(receipt.events.length, 2);

      receipt.events.expectSTXTransferEvent(
        amountUstx * CoreClient.SPLIT_CITY_PCT,
        miner.address,
        cityWallet.address
      );

      receipt.events.expectSTXTransferEvent(
        amountUstx * (1 - CoreClient.SPLIT_CITY_PCT),
        miner.address,
        clients.core.getContractAddress()
      );
    });

    it("succeeds and prints memo when supplied", (chain, accounts, clients) => {
      // arrange
      const miner = accounts.get("wallet_2")!;
      const amountUstx = 200;
      const memo = new TextEncoder().encode("hello world");
      const block = chain.mineBlock([
        clients.core.unsafeSetActivationThreshold(1),
        clients.core.registerUser(miner),
      ]);

      const activationBlockHeight =
        block.height + CoreClient.ACTIVATION_DELAY - 1;

      chain.mineEmptyBlockUntil(activationBlockHeight);

      // act
      const receipt = chain.mineBlock([
        clients.core.mineTokens(amountUstx, miner, memo),
      ]).receipts[0];

      //assert
      receipt.result.expectOk().expectBool(true);
      assertEquals(receipt.events.length, 2);

      const expectedEvent = {
        type: "contract_event",
        contract_event: {
          contract_identifier: clients.core.getContractAddress(),
          topic: "print",
          value: types.some(types.buff(memo)),
        },
      };

      assertEquals(receipt.events[0], expectedEvent);
    });

    it("throws ERR_USER_ALREADY_MINED while trying to mine same block 2nd time", (chain, accounts, clients) => {
      // arrange
      const miner = accounts.get("wallet_2")!;
      const amountUstx = 200;
      const memo = new TextEncoder().encode("hello world");
      const block = chain.mineBlock([
        clients.core.unsafeSetActivationThreshold(1),
        clients.core.registerUser(miner),
      ]);

      const activationBlockHeight =
        block.height + CoreClient.ACTIVATION_DELAY - 1;

      chain.mineEmptyBlockUntil(activationBlockHeight);

      // act
      const mineTokensTx = clients.core.mineTokens(amountUstx, miner, memo);
      const receipts = chain.mineBlock([mineTokensTx, mineTokensTx]).receipts;

      //assert
      receipts[0].result.expectOk().expectBool(true);
      receipts[1].result
        .expectErr()
        .expectUint(CoreClient.ErrCode.ERR_USER_ALREADY_MINED);
    });
  });
});
