import {
  Chain,
  Account,
  Tx,
  types,
  assertEquals,
  beforeEach,
  describe,
  it,
} from "../deps.ts";

import { TokenClient } from "../src/token-client.ts";

describe("[CityCoin Token]", () => {
  let chain: Chain;
  let accounts: Map<string, Account>;
  let client: TokenClient;
  let deployer: Account;
  let wallet_1: Account;
  let wallet_2: Account;
  let wallet_3: Account;

  function setupCleanEnv() {
    (Deno as any).core.ops();
    let transactions: Array<Tx> = [];
    let result = JSON.parse(
      (Deno as any).core.opSync("setup_chain", {
        name: "citycoin",
        transactions: transactions,
      })
    );

    chain = new Chain(result["session_id"]);
    accounts = new Map();

    for (let account of result["accounts"]) {
      accounts.set(account.name, account);
    }

    deployer = accounts.get("deployer")!;
    wallet_1 = accounts.get("wallet_1")!;
    wallet_2 = accounts.get("wallet_2")!;
    wallet_3 = accounts.get("wallet_3")!;

    client = new TokenClient("citycoin-token", chain, deployer);
  }

  describe("SIP-010:", () => {
    setupCleanEnv();

    describe("transfer()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("succeeds with no memo supplied", () => {
        const from = wallet_1;
        const to = wallet_2;
        const amount = 100;

        chain.mineBlock([client.ftMint(amount, wallet_1)]);

        const block = chain.mineBlock([
          client.transfer(amount, from, to, from),
        ]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectOk();
        block.receipts[0].events.expectFungibleTokenTransferEvent(
          amount,
          from.address,
          to.address,
          "citycoins"
        );
      });

      it("succeeds with memo supplied", () => {
        const from = wallet_1;
        const to = wallet_2;
        const amount = 100;
        const memo = new TextEncoder().encode(
          "MiamiCoin is the first CityCoin"
        );

        chain.mineBlock([client.ftMint(amount, wallet_1)]);

        const block = chain.mineBlock([
          client.transfer(amount, from, to, from, memo),
        ]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectOk();

        const expectedEvent = {
          type: "contract_event",
          contract_event: {
            contract_identifier: client.getContractAddress(),
            topic: "print",
            value: types.some(types.buff(memo)),
          },
        };

        const receipt = block.receipts[0];
        assertEquals(receipt.events.length, 2);
        assertEquals(receipt.events[0], expectedEvent);
        receipt.events.expectFungibleTokenTransferEvent(
          amount,
          from.address,
          to.address,
          "citycoins"
        );
      });

      it("fails with u1 when sender does not have enough funds", () => {
        const from = wallet_1;
        const to = wallet_2;

        const block = chain.mineBlock([client.transfer(100, from, to, from)]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectErr().expectUint(1);
      });

      it("fails with u2 when sender and recipient are the same", () => {
        const from = wallet_1;
        const to = wallet_1;

        chain.mineBlock([client.ftMint(100, from)]);

        const block = chain.mineBlock([client.transfer(100, from, to, from)]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectErr().expectUint(2);
      });

      it("fails with u3 when token sender is different than transaction sender", () => {
        const from = wallet_1;
        const to = wallet_2;

        const block = chain.mineBlock([client.transfer(10, from, to, to)]);

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
        chain.mineBlock([client.ftMint(100, wallet_1)]);

        const result = client.getBalance(wallet_1).result;

        result.expectOk().expectUint(100);
      });
    });

    describe("get-total-supply()", () => {
      beforeEach(() => {
        setupCleanEnv();
      });

      it("returns 0 when no tokens are minted", () => {
        const result = client.getTotalSupply().result;

        result.expectOk().expectUint(0);
      });

      it("returns 100 after 100 tokens are minted", () => {
        chain.mineBlock([client.ftMint(100, wallet_1)]);

        const result = client.getTotalSupply().result;

        result.expectOk().expectUint(100);
      });
    });

    describe("get-token-uri()", () => {
      it("returns correct uri", () => {
        const result = client.getTokenUri().result;
        const tokenUri = "https://cdn.citycoins.co/metadata/citycoin.json";

        console.log(`\n  URI: ${tokenUri}`);
        result.expectOk().expectSome().expectUtf8(tokenUri);
      });
    });
  });

  // TODO: Rewrite
  // describe("set-token-uri()", () => {
  //   it("fails with ERR_UNAUTHORIZED when called by someone who is not contract owner", () => {
  //     const block = chain.mineBlock([
  //       client.setTokenUri(wallet_2, "http://something-something.com"),
  //     ]);

  //     const receipt = block.receipts[0];

  //     receipt.result
  //       .expectErr()
  //       .expectUint(TokenClient.ErrCode.ERR_UNAUTHORIZED);
  //   });

  //   it("changes token uri to none if no new value is provided", () => {
  //     const block = chain.mineBlock([client.setTokenUri(deployer)]);

  //     const receipt = block.receipts[0];
  //     receipt.result.expectOk().expectBool(true);

  //     const result = client.getTokenUri().result;
  //     result.expectOk().expectNone();
  //   });

  //   it("changes token uri to new value if provided", () => {
  //     const newUri = "http://something-something.com";
  //     const block = chain.mineBlock([client.setTokenUri(deployer, newUri)]);

  //     const receipt = block.receipts[0];
  //     receipt.result.expectOk().expectBool(true);

  //     const result = client.getTokenUri().result;
  //     result.expectOk().expectSome().expectUtf8(newUri);
  //   });
  // });

  describe("add-trusted-caller()", () => {
    beforeEach(() => {
      setupCleanEnv();
    });

    it("fails with ERR_UNAUTHORIZED when called who is not contract owner", () => {
      const block = chain.mineBlock([
        client.addTrustedCaller(wallet_2, wallet_2),
      ]);

      const receipt = block.receipts[0];

      receipt.result
        .expectErr()
        .expectUint(TokenClient.ErrCode.ERR_UNAUTHORIZED);
    });

    it("succeeds when called by contract owner", () => {
      const block = chain.mineBlock([
        client.addTrustedCaller(wallet_2, deployer),
      ]);

      const receipt = block.receipts[0];

      receipt.result.expectOk().expectBool(true);
    });
  });

  describe("remove-trusted-caller()", () => {
    beforeEach(() => {
      setupCleanEnv();
    });

    it("fails with ERR_UNAUTHORIZED when called who is not contract owner", () => {
      const block = chain.mineBlock([
        client.removeTrustedCaller(wallet_2, wallet_2),
      ]);

      const receipt = block.receipts[0];

      receipt.result
        .expectErr()
        .expectUint(TokenClient.ErrCode.ERR_UNAUTHORIZED);
    });

    it("succeeds when called by contract owner", () => {
      const block = chain.mineBlock([
        client.removeTrustedCaller(wallet_2, deployer),
      ]);

      const receipt = block.receipts[0];

      receipt.result.expectOk().expectBool(true);
    });
  });

  describe("is-trusted-caller()", () => {
    beforeEach(() => {
      setupCleanEnv();
    });

    it("returns false when asked about not trusted caller", () => {
      const result = client.isTrustedCaller(wallet_2).result;

      result.expectBool(false);
    });

    it("returns false when asked about caller that has been removed", () => {
      let block = chain.mineBlock([
        client.addTrustedCaller(wallet_2, deployer),
        client.removeTrustedCaller(wallet_2, deployer),
      ]);

      const result = client.isTrustedCaller(wallet_2).result;

      result.expectBool(false);
    });

    it("returns true when asked about trusted caller", () => {
      let block = chain.mineBlock([
        client.addTrustedCaller(wallet_2, deployer),
        client.addTrustedCaller(wallet_3, deployer),
      ]);

      const result1 = client.isTrustedCaller(wallet_2).result;
      const result2 = client.isTrustedCaller(wallet_3).result;

      result1.expectBool(true);
      result2.expectBool(true);
    });
  });

  describe("mint()", () => {
    beforeEach(() => {
      setupCleanEnv();
    });

    it("fails with ERR_UNAUTHORIZED when called by someone who is not a trusted caller", () => {
      let block = chain.mineBlock([client.mint(200, wallet_2, wallet_2)]);

      let receipt = block.receipts[0];

      receipt.result
        .expectErr()
        .expectUint(TokenClient.ErrCode.ERR_UNAUTHORIZED);
    });

    it("succeeds when called by trusted caller and mints requested amount of tokens", () => {
      const amount = 200;
      const recipient = wallet_3;

      let block = chain.mineBlock([
        client.addTrustedCaller(wallet_2, deployer),
        client.mint(amount, recipient, wallet_2),
      ]);

      let receipt = block.receipts[1];
      receipt.result.expectOk().expectBool(true);

      receipt.events.expectFungibleTokenMintEvent(
        amount,
        recipient.address,
        "citycoins"
      );
    });
  });
});
