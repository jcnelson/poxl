import { describe, assertEquals, types } from "../deps.ts";
import { it } from "../src/testutil.ts";

import { TokenClient } from "../src/token-client.ts";

describe("[CityCoin Token]", () => {
  describe("SIP-010:", () => {
    describe("transfer()", () => {
      it("succeeds with no memo supplied", (chain, accounts, clients) => {
        const from = accounts.get("wallet_1")!;
        const to = accounts.get("wallet_2")!;
        const amount = 100;

        chain.mineBlock([clients.token.ftMint(amount, from)]);

        const block = chain.mineBlock([
          clients.token.transfer(amount, from, to, from),
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

      it("succeeds with memo supplied", (chain, accounts, clients) => {
        const from = accounts.get("wallet_1")!;
        const to = accounts.get("wallet_2")!;
        const amount = 100;
        const memo = new TextEncoder().encode(
          "MiamiCoin is the first CityCoin"
        );

        chain.mineBlock([clients.token.ftMint(amount, from)]);

        const block = chain.mineBlock([
          clients.token.transfer(amount, from, to, from, memo),
        ]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectOk();

        const expectedEvent = {
          type: "contract_event",
          contract_event: {
            contract_identifier: clients.token.getContractAddress(),
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

      it("fails with u1 when sender does not have enough funds", (chain, accounts, clients) => {
        const from = accounts.get("wallet_1")!;
        const to = accounts.get("wallet_2")!;

        const block = chain.mineBlock([
          clients.token.transfer(100, from, to, from),
        ]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectErr().expectUint(1);
      });

      // TODO: remove
      it("fails with u2 when sender and recipient are the same", (chain, accounts, clients) => {
        const from = accounts.get("wallet_1")!;
        const to = accounts.get("wallet_1")!;

        chain.mineBlock([clients.token.ftMint(100, from)]);

        const block = chain.mineBlock([
          clients.token.transfer(100, from, to, from),
        ]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectErr().expectUint(2);
      });

      it("fails with u3 when token sender is different than transaction sender", (chain, accounts, clients) => {
        const from = accounts.get("wallet_1")!;
        const to = accounts.get("wallet_2")!;

        const block = chain.mineBlock([
          clients.token.transfer(10, from, to, to),
        ]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result.expectErr().expectUint(3);
      });
    });

    describe("get-name()", () => {
      it("returns 'citycoins'", (chain, accounts, clients) => {
        const result = clients.token.getName().result;

        result.expectOk().expectAscii("citycoins");
      });
    });

    describe("get-symbol()", () => {
      it("returns 'CYCN'", (chain, accounts, clients) => {
        const result = clients.token.getSymbol().result;

        result.expectOk().expectAscii("CYCN");
      });
    });

    describe("get-decimals()", () => {
      it("returns 0", (chain, accounts, clients) => {
        const result = clients.token.getDecimals().result;

        result.expectOk().expectUint(0);
      });
    });

    describe("get-balance()", () => {
      it("returns 0 when no tokens are minted", (chain, accounts, clients) => {
        const wallet_1 = accounts.get("wallet_1")!;
        const result = clients.token.getBalance(wallet_1).result;

        result.expectOk().expectUint(0);
      });

      it("returns 100 after 100 tokens are minted to a wallet", (chain, accounts, clients) => {
        const wallet_1 = accounts.get("wallet_1")!;
        chain.mineBlock([clients.token.ftMint(100, wallet_1)]);

        const result = clients.token.getBalance(wallet_1).result;

        result.expectOk().expectUint(100);
      });
    });

    describe("get-total-supply()", () => {
      it("returns 0 when no tokens are minted", (chain, accounts, clients) => {
        const result = clients.token.getTotalSupply().result;

        result.expectOk().expectUint(0);
      });

      it("returns 100 after 100 tokens are minted", (chain, accounts, clients) => {
        const wallet_1 = accounts.get("wallet_1")!;
        chain.mineBlock([clients.token.ftMint(100, wallet_1)]);

        const result = clients.token.getTotalSupply().result;

        result.expectOk().expectUint(100);
      });
    });

    describe("get-token-uri()", () => {
      it("returns correct uri", (chain, accounts, clients) => {
        const result = clients.token.getTokenUri().result;
        const tokenUri = "https://cdn.citycoins.co/metadata/citycoin.json";

        console.log(`\n  URI: ${tokenUri}`);
        result.expectOk().expectSome().expectUtf8(tokenUri);
      });
    });
  });

  describe("set-token-uri()", () => {
    it("fails with ERR_UNAUTHORIZED when called by someone who is not core contract", (chain, accounts, clients) => {
      const wallet_2 = accounts.get("wallet_2")!;
      const block = chain.mineBlock([
        clients.token.setTokenUri(wallet_2, "http://something-something.com"),
      ]);

      const receipt = block.receipts[0];

      receipt.result
        .expectErr()
        .expectUint(TokenClient.ErrCode.ERR_UNAUTHORIZED);
    });

    it("changes token uri to none if no new value is provided", (chain, accounts, clients) => {
      const deployer = accounts.get("deployer")!;
      chain.mineBlock([clients.token.setTrustedCaller(deployer)]);

      const block = chain.mineBlock([clients.token.setTokenUri(deployer)]);

      const receipt = block.receipts[0];
      receipt.result.expectOk().expectBool(true);

      const result = clients.token.getTokenUri().result;
      result.expectOk().expectNone();
    });

    it("changes token uri to new value if provided", (chain, accounts, clients) => {
      const deployer = accounts.get("deployer")!;
      const newUri = "http://something-something.com";
      chain.mineBlock([clients.token.setTrustedCaller(deployer)]);

      const block = chain.mineBlock([
        clients.token.setTokenUri(deployer, newUri),
      ]);

      const receipt = block.receipts[0];
      receipt.result.expectOk().expectBool(true);

      const result = clients.token.getTokenUri().result;
      result.expectOk().expectSome().expectUtf8(newUri);
    });
  });

  describe("mint()", () => {
    it("fails with ERR_UNAUTHORIZED when called by someone who is not a trusted caller", (chain, accounts, clients) => {
      const wallet_2 = accounts.get("wallet_2")!;
      let block = chain.mineBlock([
        clients.token.mint(200, wallet_2, wallet_2),
      ]);

      let receipt = block.receipts[0];

      receipt.result
        .expectErr()
        .expectUint(TokenClient.ErrCode.ERR_UNAUTHORIZED);
    });

    it("succeeds when called by trusted caller and mints requested amount of tokens", (chain, accounts, clients) => {
      const wallet_2 = accounts.get("wallet_2")!;
      const amount = 200;
      const recipient = accounts.get("wallet_3")!;

      chain.mineBlock([clients.token.setTrustedCaller(wallet_2)]);

      let block = chain.mineBlock([
        clients.token.mint(amount, recipient, wallet_2),
      ]);

      let receipt = block.receipts[0];
      receipt.result.expectOk().expectBool(true);

      receipt.events.expectFungibleTokenMintEvent(
        amount,
        recipient.address,
        "citycoins"
      );
    });
  });
});
