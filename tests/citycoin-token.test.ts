import { describe, assertEquals, types, Account } from "../deps.ts";
import { it } from "../src/testutil.ts";
import { TokenClient, SendManyRecord } from "../src/token-client.ts";

describe("[CityCoin Token]", () => {
  describe("SIP-010 FUNCTIONS", () => {
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

      it("fails with ERR_UNAUTHORIZED when token sender is different than transaction sender", (chain, accounts, clients) => {
        const from = accounts.get("wallet_1")!;
        const to = accounts.get("wallet_2")!;
        const sender = accounts.get("wallet_3")!;
        const amount = 100;

        chain.mineBlock([clients.token.ftMint(amount, from)]);

        const block = chain.mineBlock([
          clients.token.transfer(amount, from, to, sender),
        ]);

        assertEquals(block.receipts.length, 1);
        block.receipts[0].result
          .expectErr()
          .expectUint(TokenClient.ErrCode.ERR_UNAUTHORIZED);
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
});

//////////////////////////////////////////////////
// expectPrintEvent()
//////////////////////////////////////////////////

declare global {
  interface Array<T> {
    expectPrintEvent(contract_identifier: string, value: string): Object;
  }
}

Array.prototype.expectPrintEvent = function (
  contract_identifier: string,
  value: string
) {
  for (let event of this) {
    try {
      let e: any = {};
      e["contract_identifier"] =
        event.contract_event.contract_identifier.expectPrincipal(
          contract_identifier
        );

      if (event.contract_event.topic.endsWith("print")) {
        e["topic"] = event.contract_event.topic;
      } else {
        continue;
      }

      if (event.contract_event.value.endsWith(value)) {
        e["value"] = event.contract_event.value;
      } else {
        continue;
      }
      return e;
    } catch (error) {
      continue;
    }
  }
  throw new Error(`Unable to retrieve expected PrintEvent`);
};
